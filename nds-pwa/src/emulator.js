/* ===== Emulator loop =====
 * Drives the active core at ~60 Hz, measures FPS and applies frame skip.
 * The core receives a normalized input snapshot every tick.
 */
export class Emulator {
    constructor(opts = {}) {
        this.core = null;
        this.getInput = opts.getInput || (() => ({ buttons: 0, touch: { x: 0, y: 0, down: false } }));
        this.getSettings = opts.getSettings || (() => ({}));
        this.onFps = opts.onFps || (() => {});
        this.onStatus = opts.onStatus || (() => {});

        this.raf = 0;
        this.running = false;
        this.frame = 0;
        this.fpsFrames = 0;
        this.fpsStart = 0;
        this.fps = 0;
        this.lastNow = 0;
        this._loop = this._loop.bind(this);
    }

    setCore(core) {
        this.stop();
        this.core = core;
        this.frame = 0;
    }

    start() {
        if (!this.core || this.running) return;
        this.running = true;
        this.core.start();
        this.fpsStart = performance.now();
        this.fpsFrames = 0;
        this.raf = requestAnimationFrame(this._loop);
    }

    pause() {
        if (!this.running) return;
        this.running = false;
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (this.core) this.core.pause();
    }

    resume() { this.start(); }

    stop() {
        this.running = false;
        cancelAnimationFrame(this.raf);
        this.raf = 0;
        if (this.core) this.core.stop();
        this.onFps(0);
    }

    _loop(now) {
        if (!this.running) return;
        this.raf = requestAnimationFrame(this._loop);

        const skip = this.getSettings().frameSkip | 0;
        if (skip > 0 && this.frame % (skip + 1) !== 0) {
            this.frame++;
            return;
        }

        const input = this.getInput();
        try {
            this.core.tick(now, input);
        } catch (err) {
            console.error('Pocket DS: core tick failed', err);
            this.onStatus('Core error — see console');
            this.stop();
            return;
        }

        this.frame++;
        this.fpsFrames++;
        if (now - this.fpsStart >= 500) {
            this.fps = Math.round((this.fpsFrames * 1000) / (now - this.fpsStart));
            this.onFps(this.fps);
            this.fpsStart = now;
            this.fpsFrames = 0;
        }
    }
}
