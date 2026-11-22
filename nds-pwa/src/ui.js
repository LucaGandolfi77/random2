/* ===== UI helpers: toasts, overlays, status readouts ===== */
const $ = (id) => document.getElementById(id);

let toastTimer = 0;

export function toast(message, ms = 2200) {
    const el = $('toast');
    if (!el) return;
    el.textContent = message;
    el.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.remove('show'), ms);
}

export function openOverlay(id) {
    const el = $(id);
    if (el) el.classList.remove('hidden');
}

export function closeOverlay(id) {
    const el = $(id);
    if (el) el.classList.add('hidden');
}

export function anyOverlayOpen() {
    return [...document.querySelectorAll('.overlay')].some((el) => !el.classList.contains('hidden'));
}

export function bindOverlayClosers() {
    document.querySelectorAll('[data-close]').forEach((btn) => {
        btn.addEventListener('click', () => closeOverlay(btn.dataset.close));
    });
    document.querySelectorAll('.overlay').forEach((ov) => {
        ov.addEventListener('pointerdown', (e) => {
            if (e.target === ov) closeOverlay(ov.id);
        });
    });
    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeOverlay('onboarding');
    });
}

export function setStatus(text, kind = 'on') {
    const t = $('status-text');
    const dot = $('status-dot');
    if (t) t.textContent = text;
    if (dot) dot.className = 'dot ' + (kind || '');
}

export function setBadge(text, kind = '') {
    const el = $('core-badge');
    if (!el) return;
    el.textContent = text;
    el.className = 'badge ' + kind;
}

export function setRomName(name) {
    const el = $('rom-name');
    if (el) el.textContent = name || 'No ROM';
}

export function setFps(value) {
    const el = $('fps');
    if (el) el.textContent = value ? `${value} FPS` : '-- FPS';
}

export function setIdle(isIdle) {
    const overlay = $('idle-overlay');
    const led = $('power-led');
    if (overlay) overlay.classList.toggle('hidden', !isIdle);
    if (led) led.classList.toggle('on', !isIdle);
}

export function setFileStatus(key, label, loaded) {
    const el = $(`st-${key}`);
    if (!el) return;
    el.textContent = label;
    const row = el.closest('.file-row');
    if (row) row.classList.toggle('loaded', !!loaded);
}

export function updateBootButton(files) {
    const btn = $('btn-boot');
    if (!btn) return;
    btn.disabled = !(files.arm9 && files.arm7 && files.rom);
}

export function setPauseLabel(running) {
    const btn = $('btn-pause');
    if (btn) btn.textContent = running ? 'Pause' : 'Resume';
}

export function renderStates(states, handlers) {
    const list = $('state-list');
    if (!list) return;
    list.innerHTML = '';
    if (!states.length) {
        const p = document.createElement('p');
        p.className = 'lede';
        p.textContent = 'No save states yet.';
        list.appendChild(p);
        return;
    }
    for (const s of states) {
        const row = document.createElement('div');
        row.className = 'state-item';

        const name = document.createElement('span');
        name.className = 'state-name';
        name.textContent = String(s.key);

        const meta = document.createElement('span');
        meta.className = 'state-meta';
        meta.textContent = new Date(s.meta?.savedAt || Date.now()).toLocaleString();

        const load = document.createElement('button');
        load.className = 'mini-btn';
        load.type = 'button';
        load.textContent = 'Load';
        load.addEventListener('click', () => handlers.onLoad(s.key));

        const del = document.createElement('button');
        del.className = 'mini-btn';
        del.type = 'button';
        del.textContent = '✕';
        del.addEventListener('click', () => handlers.onDelete(s.key));

        row.append(name, meta, load, del);
        list.appendChild(row);
    }
}

export function showInstallPrompt(deferredPrompt, onDone) {
    const box = $('install-prompt');
    if (!box) return;
    box.classList.remove('hidden');
    document.body.classList.add('has-install');
    const install = $('btn-install');
    const later = $('btn-install-later');

    const cleanup = () => {
        box.classList.add('hidden');
        document.body.classList.remove('has-install');
        install.onclick = null;
        later.onclick = null;
    };
    later.onclick = cleanup;
    install.onclick = async () => {
        cleanup();
        if (!deferredPrompt) {
            toast('On iPhone: Share → Add to Home Screen');
            return;
        }
        deferredPrompt.prompt();
        try { await deferredPrompt.userChoice; } catch (_) {}
        onDone?.();
    };
}
