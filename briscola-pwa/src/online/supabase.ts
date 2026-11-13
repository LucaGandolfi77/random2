import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js';
import type { Card, PublicGameState, Seat } from '@/game/engine';

const url = import.meta.env.VITE_SUPABASE_URL?.trim() ?? '';
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY?.trim() ?? '';

export const onlineConfigured = Boolean(url && anonKey);

export interface RoomRow {
  id: string;
  code: string;
  host_id: string;
  guest_id: string | null;
  host_name: string;
  guest_name: string | null;
  status: 'waiting' | 'playing' | 'finished';
  public_state: PublicGameState;
  version: number;
  created_at: string;
  updated_at: string;
}

export interface OnlineRoomSnapshot {
  room: RoomRow;
  hand: Card[];
  userId: string;
}

let client: SupabaseClient | null = null;

export const getSupabase = (): SupabaseClient | null => {
  if (!onlineConfigured) return null;
  if (!client) {
    client = createClient(url, anonKey, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false
      }
    });
  }
  return client;
};

const parseFunctionError = async (error: unknown): Promise<string> => {
  const candidate = error as { message?: string; context?: Response };
  if (candidate.context) {
    try {
      const body = (await candidate.context.clone().json()) as { error?: string };
      if (body?.error) return body.error;
    } catch {
      // Fall through to the generic message.
    }
  }
  return candidate.message ?? 'Errore di connessione al server.';
};

export const ensureUser = async (): Promise<User> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Online non configurato.');
  const { data } = await supabase.auth.getSession();
  if (data.session?.user) return data.session.user;
  const { data: authData, error } = await supabase.auth.signInAnonymously();
  if (error || !authData.user) {
    throw new Error(
      error?.message ??
        'Accesso anonimo non disponibile. Abilita Anonymous Sign-Ins nel progetto Supabase.'
    );
  }
  return authData.user;
};

const call = async <T>(body: Record<string, unknown>): Promise<T> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Online non configurato.');
  const { data, error } = await supabase.functions.invoke('briscola', { body });
  if (error) throw new Error(await parseFunctionError(error));
  if (data?.error) throw new Error(String(data.error));
  return data as T;
};

export const createRoom = async (name: string): Promise<OnlineRoomSnapshot> => {
  await ensureUser();
  return call<OnlineRoomSnapshot>({ action: 'create', name });
};

export const joinRoom = async (code: string, name: string): Promise<OnlineRoomSnapshot> => {
  await ensureUser();
  return call<OnlineRoomSnapshot>({ action: 'join', code: code.trim().toUpperCase(), name });
};

export const startRoom = async (roomId: string): Promise<OnlineRoomSnapshot> => {
  await ensureUser();
  return call<OnlineRoomSnapshot>({ action: 'start', roomId });
};

export const playOnlineCard = async (roomId: string, cardId: string): Promise<OnlineRoomSnapshot> => {
  await ensureUser();
  return call<OnlineRoomSnapshot>({ action: 'play', roomId, cardId });
};

export const leaveRoom = async (roomId: string): Promise<void> => {
  await ensureUser();
  await call({ action: 'leave', roomId });
};

export const loadRoom = async (roomId: string): Promise<OnlineRoomSnapshot> => {
  const supabase = getSupabase();
  if (!supabase) throw new Error('Online non configurato.');
  const user = await ensureUser();
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('*')
    .eq('id', roomId)
    .maybeSingle();
  if (roomError) throw new Error(roomError.message);
  if (!room) throw new Error('Stanza non trovata o non più accessibile.');
  const { data: handRow, error: handError } = await supabase
    .from('room_hands')
    .select('cards')
    .eq('room_id', roomId)
    .eq('user_id', user.id)
    .maybeSingle();
  if (handError) throw new Error(handError.message);
  return {
    room: room as RoomRow,
    hand: (handRow?.cards as Card[] | undefined) ?? [],
    userId: user.id
  };
};

export const subscribeToRoom = (roomId: string, onChange: () => void): (() => void) => {
  const supabase = getSupabase();
  if (!supabase) return () => undefined;
  const channel = supabase
    .channel(`briscola-room-${roomId}`)
    .on(
      'postgres_changes',
      { event: 'UPDATE', schema: 'public', table: 'rooms', filter: `id=eq.${roomId}` },
      () => onChange()
    )
    .subscribe();
  return () => {
    void supabase.removeChannel(channel);
  };
};

export const seatForUser = (room: RoomRow, userId: string): Seat =>
  room.host_id === userId ? 'host' : 'guest';
