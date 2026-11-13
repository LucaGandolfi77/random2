import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { OnlineRoomScreen } from '@/screens/OnlineRoomScreen';
import { newGame, publicState } from '@/game/engine';
import type { OnlineRoomSnapshot } from '@/online/supabase';

const roomBase = {
  id: 'room-1',
  code: '7K4PX',
  host_id: 'user-host',
  guest_id: null,
  host_name: 'Luca',
  guest_name: null,
  status: 'waiting' as const,
  public_state: {
    phase: 'waiting' as const,
    deckCount: 0,
    handCounts: { host: 0, guest: 0 },
    table: {},
    trump: null,
    turn: 'host' as const,
    leader: 'host' as const,
    scores: { host: 0, guest: 0 },
    capturedCounts: { host: 0, guest: 0 },
    round: 0,
    winner: null,
    lastTrick: null,
    log: [],
    hostName: 'Luca',
    guestName: '',
    updatedAt: 1,
    message: 'In attesa di un avversario.'
  },
  version: 1,
  created_at: '2026-11-12T00:00:00Z',
  updated_at: '2026-11-12T00:00:00Z'
} satisfies OnlineRoomSnapshot['room'];

const waiting: OnlineRoomSnapshot = { room: roomBase, hand: [], userId: 'user-host' };

describe('online room UI', () => {
  it('renders the waiting room and the invite code', () => {
    const html = renderToStaticMarkup(
      <OnlineRoomScreen
        snapshot={waiting}
        busy={false}
        error={null}
        status="Sincronizzato"
        onStart={() => undefined}
        onPlay={() => undefined}
        onLeave={() => undefined}
        onRefresh={() => undefined}
      />
    );
    expect(html).toContain('7K4PX');
    expect(html).toContain('In attesa');
    expect(html).toContain('Copia invito');
  });

  it('renders a playing table without exposing the opponent hand', () => {
    const state = newGame('Luca', 'Marta', () => 0.4);
    const playing: OnlineRoomSnapshot = {
      room: {
        ...roomBase,
        guest_id: 'user-guest',
        guest_name: 'Marta',
        status: 'playing',
        public_state: publicState(state, 'Luca', 'Marta')
      },
      hand: state.hands.guest,
      userId: 'user-guest'
    };
    const html = renderToStaticMarkup(
      <OnlineRoomScreen
        snapshot={playing}
        busy={false}
        error={null}
        status="Sincronizzato"
        onStart={() => undefined}
        onPlay={() => undefined}
        onLeave={() => undefined}
        onRefresh={() => undefined}
      />
    );
    expect(html).toContain('Marta');
    expect(html).toContain('Luca');
    expect(html).toContain('carte');
    expect(html).toContain('Briscola');
    expect(html).toContain('Tocca a');
  });
});
