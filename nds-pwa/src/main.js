/* ===== Pocket DS — application entry point ===== */
import { FILE_KEYS } from './config.js';
import { parseRomHeader, validateRom } from './loader.js';
import './core/demo-core.js';   // registers the demo core (side effect)
import './core/wasm-core.js';   // registers the WASM integration seam
import { createCore } from './core/core-api.js';
import { Emulator } from './emulator.js';
import { InputManager } from './input.js';
import { getContexts, clearScreens, applySettings, resolveLayout } from './screens.js';
import {
    loadSettings, saveSettings, loadAllFiles, saveFile, deleteAllFiles,
    saveState, listStates, loadState, deleteState, saveRam, loadRam,
} from './storage.js';
import { AudioBus } from './audio.js';
import {
    toast, openOverlay, closeOverlay, bindOverlayClosers,
    setStatus, setBadge, setRomName, setFps, setIdle,
    setFileStatus, updateBootButton, setPauseLabel, renderStates, showInstallPrompt,
} from './ui.js';

const $ = (id) => document.getElementById(id);

/* ---------- state ---------- */
let settings = loadSettings();
const files = { arm9: null, arm7: null, fw: null, rom: null };
let romTitle = '';
let core = null;
let emulator = null;
let input = null;
let audio = null;
let deferredPrompt = null;

/* ---------- boot ---------- */
async function main() {
    bindOverlayClosers();

    const topCanvas = $('screen-top');
    const bottomCanvas = $('screen-bottom');
    const consoleEl = $('console');
    const hintEl = $('touch-hint');
    const contexts = getContexts(topCanvas, bottomCanvas);

    applySettings(settings, consoleEl, hintEl);
    clearScreens(contexts);

    audio = new AudioBus(settings.volume);
    input = new InputManager({
        bottomCanvas,
        onPress: () => audio.click(),
    });

    emulator = new Emulator({
        getInput: () => input.getInput(),
        getSettings: () => settings,
        onFps: setFps,
        onStatus: (t) => setStatus(t),
    });

    core = createCore('demo', {
        contexts,
        settings,
        onStatus: (t) => setStatus(t),
    });
    emulator.setCore(core);
    setIdle(true);
    setBadge('NO ROM');

    bindFileInputs();
    bindControls();
    bindSettings();

    // A shared demo link needs no files or storage, so it boots immediately.
    const params = new URLSearchParams(location.search);
    if (params.has('demo')) {
        await boot(true);
    } else {
        await restoreFiles();
        openOverlay('onboarding');
    }

    // Unlock audio on first interaction (iOS requirement).
    window.addEventListener('pointerdown', () => audio.unlock(), { once: true });

    // Re-resolve auto layout on rotation.
    window.addEventListener('resize', () => {
        if (settings.layout === 'auto') applySettings(settings, consoleEl, hintEl);
    });
    window.addEventListener('orientationchange', () => {
        setTimeout(() => applySettings(settings, consoleEl, hintEl), 120);
    });

    // Persist save RAM when the app is backgrounded (important on iOS).
    const background = () => { if (document.visibilityState === 'hidden') persistRam(); };
    document.addEventListener('visibilitychange', background);
    window.addEventListener('pagehide', persistRam);

    registerServiceWorker();
}

/* ---------- file loading ---------- */
function bindFileInputs() {
    const map = {
        arm9: 'file-arm9', arm7: 'file-arm7', fw: 'file-fw', rom: 'file-rom',
    };
    for (const [key, elId] of Object.entries(map)) {
        const el = $(elId);
        if (!el) continue;
        el.addEventListener('change', async () => {
            const file = el.files && el.files[0];
            if (file) await storeFile(key, file);
        });
    }

    // Quick ROM picker (toolbar / idle screen) — no BIOS needed to open a ROM.
    $('file-rom-quick')?.addEventListener('change', async (e) => {
        const file = e.target.files && e.target.files[0];
        if (file) await handleRomFile(file, { autoBoot: true });
        e.target.value = ''; // allow re-picking the same file
    });

    // Drag & drop a .nds anywhere onto the app.
    window.addEventListener('dragover', (e) => { e.preventDefault(); });
    window.addEventListener('drop', (e) => {
        e.preventDefault();
        const file = [...(e.dataTransfer?.files || [])].find((f) => /\.nds$/i.test(f.name));
        if (file) handleRomFile(file, { autoBoot: true });
        else toast('Drop a .nds ROM file');
    });
}

/** Store a picked file and refresh the UI. */
async function storeFile(key, file) {
    const buf = await file.arrayBuffer();
    const ok = await saveFile(FILE_KEYS[key], buf);
    if (!ok) { toast('Could not store file on this device'); return false; }
    files[key] = buf;
    setFileStatus(key, file.name, true);
    let message = `${file.name} loaded`;
    if (key === 'rom') {
        const check = validateRom(buf);
        romTitle = check.header.title || file.name;
        setRomName(romTitle);
        if (check.warnings.length) message += ` — ${check.warnings[0]}`;
    }
    updateBootButton(files);
    audio.confirm();
    toast(message, 3200);
    return true;
}

/** Load a ROM directly and optionally boot it right away. */
async function handleRomFile(file, { autoBoot = false } = {}) {
    if (!/\.nds$/i.test(file.name)) {
        toast('Please choose a .nds ROM file');
        return;
    }
    const ok = await storeFile('rom', file);
    if (!ok || !autoBoot) return;
    // BIOS files are optional for the demo core; boot straight into it.
    const hasBios = !!(files.arm9 && files.arm7);
    await boot(!hasBios);
}

async function restoreFiles() {
    const stored = await loadAllFiles();
    files.arm9 = stored['arm9bios.bin'];
    files.arm7 = stored['arm7bios.bin'];
    files.fw = stored['firmware.bin'];
    files.rom = stored['game.nds'];

    for (const key of ['arm9', 'arm7', 'fw', 'rom']) {
        if (files[key]) setFileStatus(key, 'saved on device', true);
    }
    if (files.rom) {
        romTitle = parseRomHeader(files.rom).title || 'Saved ROM';
        setRomName(romTitle);
    }
    updateBootButton(files);
}

/* ---------- boot / control ---------- */
async function boot(demo = false) {
    try {
        setStatus(demo ? 'Starting demo core' : 'Booting ROM', 'warn');
        await core.init({ files, demo });

        if (!demo) {
            const sram = await loadRam();
            if (sram) core.setSaveRAM(sram);
        }

        emulator.setCore(core);
        emulator.start();

        const info = core.getInfo();
        setIdle(false);
        closeOverlay('onboarding');
        setBadge(demo ? 'DEMO' : 'ROM', demo ? 'demo' : 'ready');
        setRomName(info.title || (demo ? 'DEMO MODE' : romTitle));
        setPauseLabel(true);
        audio.confirm();
    } catch (err) {
        console.error(err);
        toast(err.message || 'Boot failed');
        setStatus('Boot failed', 'warn');
    }
}

async function persistRam() {
    if (!core || !core.initialized) return;
    try {
        const data = core.getSaveRAM();
        if (data) await saveRam(data);
    } catch (_) {}
}

function bindControls() {
    $('btn-boot')?.addEventListener('click', () => boot(false));
    $('btn-demo')?.addEventListener('click', () => boot(true));
    $('btn-idle-quick')?.addEventListener('click', () => $('file-rom-quick')?.click());
    $('btn-open-rom')?.addEventListener('click', () => $('file-rom-quick')?.click());
    $('btn-idle-load')?.addEventListener('click', () => openOverlay('onboarding'));
    $('btn-menu')?.addEventListener('click', () => openOverlay('onboarding'));
    $('btn-settings')?.addEventListener('click', () => { syncSettingsUI(); openOverlay('settings-panel'); });
    $('btn-help')?.addEventListener('click', () => openOverlay('help-panel'));

    $('btn-pause')?.addEventListener('click', () => {
        if (emulator.running) {
            persistRam();
            emulator.pause();
            setPauseLabel(false);
            setStatus('Paused', 'warn');
        } else {
            emulator.resume();
            setPauseLabel(true);
            setStatus('Running');
        }
    });

    $('btn-reset')?.addEventListener('click', () => {
        if (!core.initialized) return toast('No game running');
        persistRam();
        core.reset();
        emulator.resume();
        setPauseLabel(true);
        audio.click();
    });

    $('btn-states')?.addEventListener('click', async () => {
        await refreshStates();
        openOverlay('states-panel');
    });

    $('btn-new-state')?.addEventListener('click', async () => {
        if (!core.initialized) return toast('No game running');
        const state = core.getState();
        if (!state) return toast('This core does not support save states');
        await persistRam();
        const slot = 'slot-' + Date.now();
        const ok = await saveState(slot, state, { title: core.getInfo().title });
        toast(ok ? `Saved ${slot}` : 'Save failed');
        if (ok) audio.confirm();
        await refreshStates();
    });
}

async function refreshStates() {
    const states = await listStates();
    renderStates(states, {
        onLoad: async (slot) => {
            const data = await loadState(slot);
            if (!data) return toast('State not found');
            if (!core.initialized) return toast('No game running');
            core.setState(data);
            if (!emulator.running) { emulator.resume(); setPauseLabel(true); }
            toast(`Loaded ${slot}`);
            audio.confirm();
        },
        onDelete: async (slot) => {
            await deleteState(slot);
            toast(`Deleted ${slot}`);
            await refreshStates();
        },
    });
}

/* ---------- settings ---------- */
function syncSettingsUI() {
    $('set-skin').value = settings.skin;
    $('set-layout').value = settings.layout;
    $('set-scale').value = settings.scale;
    $('set-scale-out').textContent = `${settings.scale}%`;
    $('set-skip').value = String(settings.frameSkip);
    $('set-volume').value = settings.volume;
    $('set-volume-out').textContent = `${settings.volume}%`;
    $('set-scanlines').checked = settings.scanlines !== false;
    $('set-hints').checked = settings.hints !== false;
}

function bindSettings() {
    syncSettingsUI();
    const commit = () => {
        saveSettings(settings);
        applySettings(settings, $('console'), $('touch-hint'));
    };

    $('set-skin').addEventListener('change', (e) => { settings.skin = e.target.value; commit(); });
    $('set-layout').addEventListener('change', (e) => { settings.layout = e.target.value; commit(); });
    $('set-scale').addEventListener('input', (e) => {
        settings.scale = Number(e.target.value);
        $('set-scale-out').textContent = `${settings.scale}%`;
        commit();
    });
    $('set-skip').addEventListener('change', (e) => { settings.frameSkip = Number(e.target.value); commit(); });
    $('set-volume').addEventListener('input', (e) => {
        settings.volume = Number(e.target.value);
        $('set-volume-out').textContent = `${settings.volume}%`;
        audio.setVolume(settings.volume);
        commit();
    });
    $('set-scanlines').addEventListener('change', (e) => { settings.scanlines = e.target.checked; commit(); });
    $('set-hints').addEventListener('change', (e) => { settings.hints = e.target.checked; commit(); });

    $('btn-clear-files')?.addEventListener('click', async () => {
        await deleteAllFiles();
        for (const key of ['arm9', 'arm7', 'fw', 'rom']) {
            files[key] = null;
            setFileStatus(key, 'not loaded', false);
        }
        romTitle = '';
        setRomName('');
        updateBootButton(files);
        toast('Loaded files cleared');
    });
}

/* ---------- PWA ---------- */
function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js').catch((err) => {
            console.warn('Service worker registration failed', err);
        });
    }
    window.addEventListener('beforeinstallprompt', (e) => {
        e.preventDefault();
        deferredPrompt = e;
        showInstallPrompt(e, () => { deferredPrompt = null; });
    });
}

main().catch((err) => {
    console.error('Pocket DS failed to start', err);
    setStatus('Startup error', 'warn');
    toast('App failed to start — see console');
});
