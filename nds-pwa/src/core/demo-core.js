/* ===== Demo core =====
 * Implements the full EmulatorCore contract so every UI path works today:
 * boot animation, ROM info, dual-screen rendering, stylus + button echo,
 * save states and save RAM. It does NOT emulate DS hardware — it says so on
 * screen. Swap it for a WASM core via core-api.js when one is available.
 */
import { EmulatorCore, registerCore } from './core-api.js';
import { SCREEN_W as W, SCREEN_H as H, BUTTONS, BUTTON_NAMES } from '../config.js';

const text = EmulatorCore.text;

function hashString(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) {
        h ^= str.charCodeAt(i);
        h = Math.imul(h, 16777619);
    }
    return h >>> 0;
}

function parseRomHeader(buf) {
    if (!buf || buf.byteLength < 0x200) return { title: '', code: '', maker: '' };
    const bytes = new Uint8Array(buf, 0, 0x200);
    const dec = new TextDecoder('ascii', { fatal: false });
    const clean = (s) => s.replace(/[\x00-\x1f\x7f]+/g, '').trim();
    const title = clean(dec.decode(bytes.subarray(0x00, 0x0c)));
    const code = clean(dec.decode(bytes.subarray(0x0c, 0x10)));
    const maker = clean(dec.decode(bytes.subarray(0x10, 0x12)));
    return { title, code, maker };
}

function roundRect(ctx, x, y, w, h, r) {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

class DemoCore extends EmulatorCore {
    static id = 'demo';
    static label = 'Demo core';
    static description = 'Boot animation + input demo. No DS hardware emulation.';
    static requiredFiles = []; // demo mode needs no files

    constructor(opts) {
        super(opts);
        this.phase = 'idle';
        this.bootStart = 0;
        this.clock = 0;
        this.frames = 0;
        this.touchTrail = [];
        this.stars = [];
        this.saveRam = new Uint8Array(128);
        this.saveRam[0] = 0x50; // 'P' marker
        this.saveRam[1] = 0x44; // 'D'
    }

    async init(payload = {}) {
        const { files = {}, demo = false } = payload;
        const header = parseRomHeader(files.rom);
        // When a ROM was picked directly, show its real header info even though
        // the core is still the demo (the badge makes that distinction clear).
        this.meta = {
            title: header.title || (demo ? 'DEMO MODE' : 'NO TITLE'),
            code: header.code || (demo ? 'PDS-DEMO' : '------'),
            maker: header.maker || (demo ? 'POCKET DS' : ''),
            demo,
        };

        const hue = hashString(this.meta.title) % 360;
        this.palette = {
            hue,
            a: `hsl(${hue} 85% 60%)`,
            b: `hsl(${(hue + 55) % 360} 80% 48%)`,
            dark: `hsl(${hue} 55% 12%)`,
        };

        this.stars = Array.from({ length: 46 }, (_, i) => ({
            x: (i * 97) % W,
            y: (i * 53) % H,
            s: 0.4 + (i % 4) * 0.35,
            v: 0.15 + (i % 5) * 0.07,
        }));

        this.phase = 'boot';
        this.bootStart = 0;
        this.clock = 0;
        this.initialized = true;
        this.onStatus(demo ? 'Demo core ready' : 'ROM loaded — booting');
        return true;
    }

    start() {
        super.start();
        if (this.phase === 'boot' && this.bootStart === 0) this.bootStart = performance.now();
        this.onStatus('Running');
    }

    pause() { super.pause(); this.onStatus('Paused'); }
    stop() { super.stop(); this.onStatus('Stopped'); }

    reset() {
        this.phase = 'boot';
        this.bootStart = performance.now();
        this.clock = 0;
        this.frames = 0;
        this.touchTrail.length = 0;
        this.onStatus('Reset');
    }

    tick(now, input) {
        if (!this.running) return;
        if (this.phase === 'boot') {
            if (!this.bootStart) this.bootStart = now;
            const t = now - this.bootStart;
            this.drawBoot(t);
            if (t > 2700) {
                this.phase = 'game';
                this.onStatus('Emulation view active');
            }
            return;
        }
        this.clock += 1 / 60;
        this.frames++;
        this.drawGameTop(now, input);
        this.drawGameBottom(now, input);
    }

    /* ---------------- boot screens ---------------- */
    drawBoot(t) {
        const top = this.contexts.top;
        const bottom = this.contexts.bottom;
        if (!top || !bottom) return;

        // black background
        top.fillStyle = '#05070a';
        top.fillRect(0, 0, W, H);
        bottom.fillStyle = '#05070a';
        bottom.fillRect(0, 0, W, H);

        if (t < 700) {
            // brief dark flash
            top.fillStyle = `rgba(80,200,255,${0.04 * Math.sin(t / 40)})`;
            top.fillRect(0, 0, W, H);
            return;
        }

        if (t < 1650) {
            // logo + warning
            const a = Math.min(1, (t - 700) / 300);
            top.globalAlpha = a;
            text(top, 'POCKET', W / 2, H / 2 - 26, { size: 30, color: '#eaf6ff', shadow: '#4cc9f0', blur: 18 });
            text(top, 'DS', W / 2, H / 2 + 12, { size: 46, color: '#4cc9f0', shadow: '#4cc9f0', blur: 22 });
            top.globalAlpha = 1;
            text(top, 'PLEASE USE WITH CARE', W / 2, H - 26, { size: 9, color: 'rgba(255,255,255,0.35)' });
            text(bottom, '●', W / 2, H / 2, { size: 40, color: '#4cc9f0', shadow: '#4cc9f0', blur: 18 });
            return;
        }

        // loading bar
        const p = Math.min(1, (t - 1650) / 1000);
        text(top, 'Loading...', W / 2, H / 2 - 30, { size: 13, color: '#dbeafe' });
        top.fillStyle = 'rgba(255,255,255,0.12)';
        roundRect(top, 46, H / 2 - 8, W - 92, 14, 7);
        top.fill();
        const grad = top.createLinearGradient(46, 0, W - 46, 0);
        grad.addColorStop(0, '#4cc9f0');
        grad.addColorStop(1, '#7bf1c0');
        top.fillStyle = grad;
        roundRect(top, 46, H / 2 - 8, (W - 92) * p, 14, 7);
        top.fill();

        text(bottom, this.meta.title, W / 2, H / 2 - 10, { size: 12, color: '#eaf6ff' });
        text(bottom, this.meta.code, W / 2, H / 2 + 12, { size: 10, color: '#7f96ab' });
        if (p >= 1) text(top, 'READY', W / 2, H / 2 + 34, { size: 10, color: '#4ade80' });
    }

    /* ---------------- game screens ---------------- */
    drawGameTop(now, input) {
        const ctx = this.contexts.top;
        if (!ctx) return;
        const p = this.palette;

        // sky gradient
        const sky = ctx.createLinearGradient(0, 0, 0, H);
        sky.addColorStop(0, p.dark);
        sky.addColorStop(0.62, `hsl(${p.hue} 45% 22%)`);
        sky.addColorStop(1, `hsl(${(p.hue + 30) % 360} 60% 32%)`);
        ctx.fillStyle = sky;
        ctx.fillRect(0, 0, W, H);

        // sun / moon
        const sx = W * 0.72, sy = 58;
        const glow = ctx.createRadialGradient(sx, sy, 2, sx, sy, 54);
        glow.addColorStop(0, 'rgba(255,255,255,0.85)');
        glow.addColorStop(0.25, 'rgba(255,255,255,0.22)');
        glow.addColorStop(1, 'rgba(255,255,255,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(sx - 60, sy - 60, 120, 120);

        // stars
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        for (const s of this.stars) {
            const y = (s.y + this.clock * s.v * 30) % H;
            ctx.globalAlpha = 0.35 + 0.45 * Math.abs(Math.sin(this.clock + s.x));
            ctx.fillRect(s.x, y, s.s, s.s);
        }
        ctx.globalAlpha = 1;

        // perspective floor grid
        const horizon = 96;
        ctx.strokeStyle = `hsla(${(p.hue + 180) % 360} 90% 70% / 0.25)`;
        ctx.lineWidth = 1;
        for (let i = -6; i <= 6; i++) {
            ctx.beginPath();
            ctx.moveTo(W / 2 + i * 8, horizon);
            ctx.lineTo(W / 2 + i * 46, H);
            ctx.stroke();
        }
        const scroll = (this.clock * 26) % 18;
        for (let i = 0; i < 8; i++) {
            const y = horizon + Math.pow((i * 18 + scroll) / 110, 2) * (H - horizon);
            if (y > H) continue;
            ctx.globalAlpha = Math.min(1, (y - horizon) / 40);
            ctx.beginPath();
            ctx.moveTo(0, y);
            ctx.lineTo(W, y);
            ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // title plate
        ctx.fillStyle = 'rgba(4,10,16,0.55)';
        roundRect(ctx, 12, 12, W - 24, 44, 8);
        ctx.fill();
        text(ctx, this.meta.title, W / 2, 28, { size: 17, color: '#f8fbff', shadow: p.a, blur: 10 });
        text(ctx, `${this.meta.code}  •  ${this.meta.maker || 'POCKET DS'}`, W / 2, 45, {
            size: 9, color: 'rgba(255,255,255,0.6)',
        });

        // honest demo badge
        ctx.fillStyle = 'rgba(251,191,36,0.16)';
        roundRect(ctx, W / 2 - 92, H - 30, 184, 18, 9);
        ctx.fill();
        text(ctx, this.meta.demo ? 'DEMO MODE — NO EMULATION' : 'DEMO CORE — NO EMULATION', W / 2, H - 21, {
            size: 9, color: '#fbbf24',
        });

        // live input telemetry
        const pressed = BUTTON_NAMES.filter((b) => input.buttons & BUTTONS[b]);
        if (pressed.length) {
            text(ctx, pressed.join('  '), W / 2, H - 43, { size: 9, color: '#7bf1c0' });
        }
    }

    drawGameBottom(now, input) {
        const ctx = this.contexts.bottom;
        if (!ctx) return;

        ctx.fillStyle = '#0d151e';
        ctx.fillRect(0, 0, W, H);

        // subtle grid
        ctx.strokeStyle = 'rgba(255,255,255,0.045)';
        for (let x = 0; x <= W; x += 16) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
        for (let y = 0; y <= H; y += 16) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

        // header
        ctx.fillStyle = 'rgba(76,201,240,0.12)';
        ctx.fillRect(0, 0, W, 22);
        text(ctx, 'TOUCH SCREEN', 8, 11, { size: 9, align: 'left', color: '#7fe3ff' });
        text(ctx, `${this.frames}`, W - 8, 11, { size: 9, align: 'right', color: 'rgba(255,255,255,0.35)' });

        // stylus trail + crosshair
        const t = input.touch;
        if (t && typeof t.x === 'number') {
            if (t.down) {
                this.touchTrail.push({ x: t.x, y: t.y, life: 1 });
                if (this.touchTrail.length > 14) this.touchTrail.shift();
            }
            for (const p of this.touchTrail) {
                p.life -= 0.06;
                if (p.life <= 0) continue;
                ctx.fillStyle = `rgba(123,241,192,${p.life * 0.5})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 3 + (1 - p.life) * 6, 0, Math.PI * 2);
                ctx.fill();
            }
            this.touchTrail = this.touchTrail.filter((p) => p.life > 0);

            const pulse = 7 + Math.sin(now / 180) * 2;
            ctx.strokeStyle = t.down ? '#7bf1c0' : 'rgba(127,227,255,0.7)';
            ctx.lineWidth = 1.5;
            ctx.beginPath(); ctx.arc(t.x, t.y, pulse, 0, Math.PI * 2); ctx.stroke();
            ctx.beginPath();
            ctx.moveTo(t.x - 12, t.y); ctx.lineTo(t.x - 5, t.y);
            ctx.moveTo(t.x + 5, t.y); ctx.lineTo(t.x + 12, t.y);
            ctx.moveTo(t.x, t.y - 12); ctx.lineTo(t.x, t.y - 5);
            ctx.moveTo(t.x, t.y + 5); ctx.lineTo(t.x, t.y + 12);
            ctx.stroke();
            text(ctx, `${String(Math.round(t.x)).padStart(3, '0')},${String(Math.round(t.y)).padStart(3, '0')}`,
                Math.min(W - 34, Math.max(34, t.x)), Math.max(34, t.y - 20),
                { size: 8, color: 'rgba(255,255,255,0.65)' });
        }

        // button state panel
        const bx = 16, by = 132, bw = W - 32, bh = 44;
        ctx.fillStyle = 'rgba(0,0,0,0.42)';
        roundRect(ctx, bx, by, bw, bh, 8);
        ctx.fill();
        const cols = 6, rows = 2;
        const cw = bw / cols, ch = bh / rows;
        BUTTON_NAMES.forEach((name, i) => {
            const col = i % cols, row = Math.floor(i / cols);
            const x = bx + col * cw + 3, y = by + row * ch + 3;
            const w = cw - 6, h = ch - 6;
            const on = !!(input.buttons & BUTTONS[name]);
            ctx.fillStyle = on ? 'rgba(76,201,240,0.9)' : 'rgba(255,255,255,0.07)';
            roundRect(ctx, x, y, w, h, 4);
            ctx.fill();
            text(ctx, name[0] + (name.length > 1 ? name[1].toLowerCase() : ''), x + w / 2, y + h / 2 + 1, {
                size: 9, color: on ? '#06131e' : 'rgba(255,255,255,0.55)',
            });
        });

        text(ctx, 'POCKET DS  //  DEMO CORE  //  STYLUS + BUTTON TEST', W / 2, 122, {
            size: 8, color: 'rgba(255,255,255,0.3)',
        });
        text(ctx, 'Swap in a WASM core to play real games', W / 2, H - 6, {
            size: 8, color: 'rgba(251,191,36,0.5)',
        });
    }

    /* ---------------- persistence stubs ---------------- */
    getState() {
        return {
            core: DemoCore.id,
            version: 1,
            phase: this.phase,
            frames: this.frames,
            clock: this.clock,
            title: this.meta.title,
            savedAt: Date.now(),
        };
    }

    setState(state) {
        if (!state || state.core !== DemoCore.id) return false;
        this.phase = state.phase === 'game' ? 'game' : 'boot';
        this.frames = state.frames || 0;
        this.clock = state.clock || 0;
        if (this.phase === 'boot') this.bootStart = performance.now();
        this.onStatus('State loaded');
        return true;
    }

    getSaveRAM() { return this.saveRam.slice(); }
    setSaveRAM(data) {
        if (!data || data.byteLength < 2) return false;
        this.saveRam = new Uint8Array(data).slice(0, 128);
        return true;
    }

    destroy() {
        super.destroy();
        this.touchTrail.length = 0;
    }
}

registerCore(DemoCore);
export default DemoCore;
