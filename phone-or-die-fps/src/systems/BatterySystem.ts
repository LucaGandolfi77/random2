import { CONFIG } from '../game/GameConfig';
import type { GameState } from '../game/GameState';

export class BatterySystem {
  wasLow = false;

  update(dt: number, state: GameState, phoneOpen: boolean, inCall: boolean): boolean {
    if (state.phase !== 'playing') return false;
    const b = CONFIG.battery;
    let drain = b.idleDrain;
    if (phoneOpen) drain += b.phoneDrain;
    if (inCall) drain += b.callDrain;
    if (state.flashlightOn) drain += b.flashlightDrain;
    drain *= state.difficultyFactor.battery;
    state.battery = Math.max(0, state.battery - drain * dt);
    const low = state.battery <= b.critical;
    const justWentLow = low && !this.wasLow;
    this.wasLow = low;
    return justWentLow;
  }

  charge(state: GameState, seconds: number) {
    state.battery = Math.min(100, state.battery + CONFIG.battery.chargerRate * seconds);
  }

  usePowerBank(state: GameState): boolean {
    if (state.slots.powerBank) return false;
    state.slots.powerBank = true;
    state.battery = Math.min(100, state.battery + CONFIG.battery.powerBank);
    return true;
  }

  get critical() { return CONFIG.battery.critical; }
}
