/* ===== Emulator core contract + registry =====
 *
 * A core is anything that implements the methods below. The rest of the app
 * (screens, input, storage, UI) only ever talks to this interface, so a real
 * WebAssembly core (melonDS-class) can be dropped in without touching the UI.
 *
 * Lifecycle:  new Core(opts) -> await init(payload) -> start() -> tick()... -> stop()/destroy()
 */

export class EmulatorCore {
    static id = 'base';
    static label = 'Base core';
    static description = 'Abstract core. Do not instantiate directly.';
    /** Which user files the core needs: ['arm9', 'arm7', 'rom', ...] */
    static requiredFiles = ['arm9', 'arm7', 'rom'];

    /**
     * @param {object} opts
     * @param {{top: CanvasRenderingContext2D, bottom: CanvasRenderingContext2D}} opts.contexts
     * @param {object} opts.settings current settings snapshot
     * @param {(text:string)=>void} [opts.onStatus] status hook
     */
    constructor(opts = {}) {
        this.contexts = opts.contexts;
        this.settings = opts.settings || {};
        this.onStatus = opts.onStatus || (() => {});
        this.running = false;
        this.initialized = false;
        this.meta = { title: '', code: '', maker: '', demo: false };
    }

    /* --- required overrides --- */
    async init(/* payload */) {
        throw new Error(`${this.constructor.id}: init() not implemented`);
    }

    /** Called once per rendered frame by the emulator loop. */
    tick(/* nowMs, input */) {}

    /* --- optional overrides --- */
    start() { this.running = true; }
    pause() { this.running = false; }
    stop() { this.running = false; }
    reset() {}

    /** Serializable emulator state for save states. Return null if unsupported. */
    getState() { return null; }
    setState(/* state */) { return false; }

    /** Save RAM (game cart SRAM / EEPROM). Return null if none. */
    getSaveRAM() { return null; }
    setSaveRAM(/* data */) { return false; }

    getInfo() { return { ...this.meta }; }
    destroy() { this.running = false; this.initialized = false; }

    /** Convenience for cores that want to render text into a 2D context. */
    static text(ctx, str, x, y, opts = {}) {
        ctx.save();
        ctx.font = `${opts.weight || 700} ${opts.size || 12}px ${opts.font || 'monospace'}`;
        ctx.textAlign = opts.align || 'center';
        ctx.textBaseline = opts.baseline || 'middle';
        if (opts.color) ctx.fillStyle = opts.color;
        if (opts.shadow) {
            ctx.shadowColor = opts.shadow;
            ctx.shadowBlur = opts.blur || 6;
        }
        ctx.fillText(String(str), x, y);
        ctx.restore();
    }
}

const registry = new Map();

/** Register a core implementation. */
export function registerCore(CoreClass) {
    if (!CoreClass || !CoreClass.id) throw new Error('Core needs a static id');
    registry.set(CoreClass.id, CoreClass);
    return CoreClass;
}

/** List core metadata for UI / diagnostics. */
export function listCores() {
    return [...registry.values()].map((C) => ({
        id: C.id,
        label: C.label,
        description: C.description,
        requiredFiles: C.requiredFiles || [],
    }));
}

/** Instantiate a registered core by id. */
export function createCore(id, opts) {
    const CoreClass = registry.get(id);
    if (!CoreClass) throw new Error(`Unknown core: ${id}`);
    return new CoreClass(opts);
}
