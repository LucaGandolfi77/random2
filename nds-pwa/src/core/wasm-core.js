/* ===== WebAssembly core scaffold (NOT BUNDLED) =====
 *
 * This file is the integration seam for a real emulator core (e.g. a
 * melonDS / DeSmuME build compiled with Emscripten). It is deliberately inert:
 * no WASM binary or BIOS ships with Pocket DS. To make a real core work:
 *
 *   1. Build the core to WASM with an Emscripten/WebIDL bridge that exposes:
 *        init(bios9, bios7, firmware, rom) -> bool
 *        runFrame(buttons:int, touchX:int, touchY:int, touchDown:int) -> void
 *        copyFrame(screen:0|1, ptr) -> void        // RGBA, 256*192*4 bytes
 *        saveState() / loadState(ptr,len) -> int
 *        saveRAM(ptr,len) -> int / readRAM() -> ptr
 *   2. Drop the .wasm (and JS glue) into  nds-pwa/core/  .
 *   3. Replace the stub `bridge` below with the real module.
 *   4. In src/main.js, choose 'wasm' instead of 'demo' when the file is present.
 *
 * Because every other module only depends on the EmulatorCore contract, no UI,
 * input, storage or styling code needs to change.
 */
import { EmulatorCore, registerCore } from './core-api.js';
import { SCREEN_W, SCREEN_H, BUTTONS, BUTTON_NAMES } from '../config.js';

async function loadWasmModule(url) {
    if (typeof WebAssembly.instantiateStreaming === 'function') {
        try {
            const res = await fetch(url);
            return await WebAssembly.instantiateStreaming(res, { env: {} });
        } catch (_) { /* fall through to arrayBuffer path */ }
    }
    const res = await fetch(url);
    const bytes = await res.arrayBuffer();
    return WebAssembly.instantiate(bytes, { env: {} });
}

class WasmCore extends EmulatorCore {
    static id = 'wasm';
    static label = 'WASM core (not bundled)';
    static description = 'Drop-in seam for a real melonDS-class WebAssembly core.';
    static requiredFiles = ['arm9', 'arm7', 'rom'];

    constructor(opts) {
        super(opts);
        this.bridge = null;
        this.frameA = null;
        this.frameB = null;
        this.error = null;
    }

    async init(payload = {}) {
        const { files = {} } = payload;
        if (!files.arm9 || !files.arm7 || !files.rom) {
            throw new Error('A WASM core requires ARM9 BIOS, ARM7 BIOS and a ROM.');
        }
        // --- Replace this block with the real bridge initialization ---
        // this.bridge = await loadWasmModule('./core/nds-core.wasm');
        // const ok = this.bridge.instance.exports.init(
        //     new Uint8Array(files.arm9),
        //     new Uint8Array(files.arm7),
        //     files.fw ? new Uint8Array(files.fw) : null,
        //     new Uint8Array(files.rom),
        // );
        // if (!ok) throw new Error('Core rejected the BIOS / ROM files.');
        this.error = 'No WASM core binary is bundled with Pocket DS. See src/core/wasm-core.js.';
        this.onStatus('WASM core unavailable');
        throw new Error(this.error);
        // -------------------------------------------------------------
    }

    tick(now, input) {
        if (!this.running || !this.bridge) return;
        // const ex = this.bridge.instance.exports;
        // let mask = 0;
        // for (const name of BUTTON_NAMES) if (input.buttons & BUTTONS[name]) mask |= BUTTONS[name];
        // const t = input.touch || { x: 0, y: 0, down: false };
        // ex.runFrame(mask, Math.round(t.x), Math.round(t.y), t.down ? 1 : 0);
        // this.presentFrame(ex);
    }

    presentFrame(/* ex */) {
        // const ptr0 = ex.getFramePtr(0), ptr1 = ex.getFramePtr(1);
        // const mem = new Uint8ClampedArray(ex.memory.buffer);
        // for (const [ctx, ptr] of [[this.contexts.top, ptr0], [this.contexts.bottom, ptr1]]) {
        //     if (!ctx) continue;
        //     const img = new ImageData(mem.slice(ptr, ptr + SCREEN_W*SCREEN_H*4), SCREEN_W, SCREEN_H);
        //     ctx.putImageData(img, 0, 0);
        // }
    }

    getState() { return null; }
    setState() { return false; }
    getSaveRAM() { return null; }
    setSaveRAM() { return false; }
}

registerCore(WasmCore);
export default WasmCore;
