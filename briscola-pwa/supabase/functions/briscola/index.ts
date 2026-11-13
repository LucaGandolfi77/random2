import { createClient } from 'jsr:@supabase/supabase-js@2';
import {
  newGame,
  publicState,
  playCard,
  sanitizeName,
  type BriscolaState,
  type Card,
  type PublicGameState,
  type Seat
} from './engine.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

const fail = (error: string, status = 400) => json({ error }, status);

const SUPABASE_URL = Deno.env.get('SUPABASE_URL') ?? '';
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY') ?? '';

const admin = createClient(SUPABASE_URL, SERVICE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false }
});

const waitingState = (hostName: string, message: string, guestName?: string | null): PublicGameState => ({
  phase: 'waiting',
  deckCount: 0,
  handCounts: { host: 0, guest: 0 },
  table: {},
  trump: null,
  turn: 'host',
  leader: 'host',
  scores: { host: 0, guest: 0 },
  capturedCounts: { host: 0, guest: 0 },
  round: 0,
  winner: null,
  lastTrick: null,
  log: [],
  hostName,
  guestName: guestName ?? '',
  updatedAt: Date.now(),
  message
});

interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  host_name: string;
  guest_name: string | null;
  status: 'waiting' | 'playing' | 'finished';
  public_state: PublicGameState;
  version: number;
}

const codeAlphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

const makeCode = (): string =>
  Array.from({ length: 5 }, () => codeAlphabet[Math.floor(Math.random() * codeAlphabet.length)]).join('');

const readRoom = async (roomId: string): Promise<RoomRow | null> => {
  const { data, error } = await admin.from('rooms').select('*').eq('id', roomId).maybeSingle();
  if (error) throw new Error(error.message);
  return (data as RoomRow | null) ?? null;
};

const readState = async (roomId: string): Promise<BriscolaState> => {
  const { data, error } = await admin
    .from('room_secrets')
    .select('state')
    .eq('room_id', roomId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.state) throw new Error('Stato della partita non trovato.');
  return data.state as BriscolaState;
};

const readHand = async (roomId: string, userId: string): Promise<Card[]> => {
  const { data, error } = await admin
    .from('room_hands')
    .select('cards')
    .eq('room_id', roomId)
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw new Error(error.message);
  return (data?.cards as Card[] | undefined) ?? [];
};

const syncHands = async (roomId: string, state: BriscolaState, hostId: string, guestId: string) => {
  const rows = [
    { room_id: roomId, user_id: hostId, cards: state.hands.host, updated_at: new Date().toISOString() },
    { room_id: roomId, user_id: guestId, cards: state.hands.guest, updated_at: new Date().toISOString() }
  ];
  const { error } = await admin.from('room_hands').upsert(rows, { onConflict: 'room_id,user_id' });
  if (error) throw new Error(error.message);
};

const roomResponse = async (room: RoomRow, userId: string) => ({
  room,
  hand: await readHand(room.id, userId),
  userId
});

const seatFor = (room: RoomRow, userId: string): Seat => (room.host_id === userId ? 'host' : 'guest');

Deno.serve(async (request) => {
  if (request.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  if (request.method !== 'POST') return fail('Metodo non consentito.', 405);

  try {
    const authHeader = request.headers.get('Authorization');
    if (!authHeader) return fail('Autenticazione richiesta.', 401);
    const userClient = createClient(SUPABASE_URL, ANON_KEY, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false, autoRefreshToken: false }
    });
    const {
      data: { user },
      error: authError
    } = await userClient.auth.getUser();
    if (authError || !user) return fail('Sessione non valida. Ricarica la pagina.', 401);

    const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
    const action = String(body.action ?? '');

    if (action === 'create') {
      const hostName = sanitizeName(String(body.name ?? 'Ospite'));
      for (let attempt = 0; attempt < 6; attempt++) {
        const code = makeCode();
        const publicWaiting = waitingState(hostName, 'In attesa di un avversario.');
        const { data, error } = await admin
          .from('rooms')
          .insert({
            code,
            host_id: user.id,
            host_name: hostName,
            status: 'waiting',
            public_state: publicWaiting
          })
          .select()
          .single();
        if (!error) {
          return json(await roomResponse(data as RoomRow, user.id));
        }
        if (error.code !== '23505') throw new Error(error.message);
      }
      return fail('Non riesco a generare un codice stanza. Riprova.', 503);
    }

    if (action === 'join') {
      const code = String(body.code ?? '').toUpperCase().trim();
      const guestName = sanitizeName(String(body.name ?? 'Ospite'));
      if (!code) return fail('Inserisci il codice stanza.');
      const { data, error } = await admin
        .from('rooms')
        .select('*')
        .eq('code', code)
        .maybeSingle();
      if (error) throw new Error(error.message);
      const room = data as RoomRow | null;
      if (!room) return fail('Stanza non trovata.', 404);
      if (room.host_id === user.id) return json(await roomResponse(room, user.id));
      if (room.status !== 'waiting') return fail('La partita è già iniziata.', 409);
      if (room.guest_id) return fail('La stanza è già completa.', 409);

      const { data: updated, error: updateError } = await admin
        .from('rooms')
        .update({
          guest_id: user.id,
          guest_name: guestName,
          version: room.version + 1,
          updated_at: new Date().toISOString(),
          public_state: waitingState(room.host_name, 'Avversario collegato. Pronto a iniziare.', guestName)
        })
        .eq('id', room.id)
        .is('guest_id', null)
        .eq('status', 'waiting')
        .select()
        .single();
      if (updateError) return fail('Qualcuno è arrivato prima di te.', 409);
      return json(await roomResponse(updated as RoomRow, user.id));
    }

    if (action === 'start') {
      const room = await readRoom(String(body.roomId ?? ''));
      if (!room) return fail('Stanza non trovata.', 404);
      if (room.host_id !== user.id) return fail('Solo chi crea la stanza può iniziare.', 403);
      if (room.status !== 'waiting') return fail('La partita è già iniziata.', 409);
      if (!room.guest_id || !room.guest_name) return fail('Manca ancora un avversario.', 409);

      const state = newGame(room.host_name, room.guest_name);
      const publicGame = publicState(state, room.host_name, room.guest_name);
      // Write the private state and both hands before the public room update:
      // the room update is what wakes realtime clients, so everything they read
      // afterwards is already consistent.
      const { error: secretError } = await admin
        .from('room_secrets')
        .upsert({ room_id: room.id, state }, { onConflict: 'room_id' });
      if (secretError) throw new Error(secretError.message);
      await syncHands(room.id, state, room.host_id, room.guest_id);
      const { data: updated, error: updateError } = await admin
        .from('rooms')
        .update({
          status: 'playing',
          public_state: publicGame,
          version: room.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)
        .eq('version', room.version)
        .select()
        .single();
      if (updateError) return fail('La stanza è cambiata. Ricarica.', 409);
      return json(await roomResponse(updated as RoomRow, user.id));
    }

    if (action === 'play') {
      const room = await readRoom(String(body.roomId ?? ''));
      if (!room) return fail('Stanza non trovata.', 404);
      if (room.status !== 'playing') return fail('La partita non è in corso.', 409);
      if (room.host_id !== user.id && room.guest_id !== user.id) return fail('Non fai parte di questa stanza.', 403);
      const seat = seatFor(room, user.id);
      const previous = await readState(room.id);
      const result = playCard(
        previous,
        seat,
        String(body.cardId ?? ''),
        room.host_name,
        room.guest_name ?? 'Avversario'
      );
      if (!result.ok) return fail(result.error ?? 'Mossa non valida.');
      const nextPublic = publicState(
        result.state,
        room.host_name,
        room.guest_name ?? 'Avversario',
        result.state.phase === 'finished'
          ? result.state.winner === null
            ? 'Pareggio.'
            : `Vince ${result.state.winner === 'host' ? room.host_name : room.guest_name}.`
          : undefined
      );
      const status = result.state.phase === 'finished' ? 'finished' : 'playing';
      // Private state and hands first; the public update below is the realtime
      // trigger and must be the last write of the move.
      const { error: secretError } = await admin
        .from('room_secrets')
        .update({ state: result.state })
        .eq('room_id', room.id);
      if (secretError) throw new Error(secretError.message);
      await syncHands(room.id, result.state, room.host_id, room.guest_id!);
      const { data: updated, error: updateError } = await admin
        .from('rooms')
        .update({
          status,
          public_state: nextPublic,
          version: room.version + 1,
          updated_at: new Date().toISOString()
        })
        .eq('id', room.id)
        .eq('version', room.version)
        .select()
        .single();
      if (updateError) return fail('Mossa in conflitto con un altro aggiornamento. Riprova.', 409);
      return json(await roomResponse(updated as RoomRow, user.id));
    }

    if (action === 'leave') {
      const room = await readRoom(String(body.roomId ?? ''));
      if (!room) return json({ left: true });
      if (room.host_id !== user.id && room.guest_id !== user.id) return fail('Non fai parte di questa stanza.', 403);
      if (room.status === 'waiting') {
        if (room.host_id === user.id) {
          await admin.from('rooms').delete().eq('id', room.id);
          return json({ left: true });
        }
        await admin
          .from('rooms')
          .update({
            guest_id: null,
            guest_name: null,
            version: room.version + 1,
            updated_at: new Date().toISOString(),
            public_state: waitingState(room.host_name, 'In attesa di un avversario.')
          })
          .eq('id', room.id);
        return json({ left: true });
      }
      if (room.status === 'playing') {
        const state = await readState(room.id);
        const seat = seatFor(room, user.id);
        const winner: Seat = seat === 'host' ? 'guest' : 'host';
        const abandoned = publicState(
          { ...state, phase: 'finished', winner },
          room.host_name,
          room.guest_name ?? 'Avversario',
          'L’avversario ha lasciato la partita.'
        );
        await admin
          .from('rooms')
          .update({
            status: 'finished',
            public_state: abandoned,
            version: room.version + 1,
            updated_at: new Date().toISOString()
          })
          .eq('id', room.id);
      }
      return json({ left: true });
    }

    if (action === 'state') {
      const room = await readRoom(String(body.roomId ?? ''));
      if (!room) return fail('Stanza non trovata.', 404);
      if (room.host_id !== user.id && room.guest_id !== user.id) return fail('Non fai parte di questa stanza.', 403);
      return json(await roomResponse(room, user.id));
    }

    return fail('Azione sconosciuta.', 404);
  } catch (error) {
    console.error('briscola function error', error);
    return fail(error instanceof Error ? error.message : 'Errore interno.', 500);
  }
});
