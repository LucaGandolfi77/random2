import { clamp } from './utils.js';
import { addPhoto } from './photo-store.js';

export const PHOTO_FILTERS = {
  natural: { label: 'Naturale', css: 'none' },
  warm: { label: 'Caldo', css: 'sepia(0.28) saturate(1.18) contrast(1.03)' },
  mono: { label: 'Bianco e nero', css: 'grayscale(1) contrast(1.12)' },
  vintage: { label: 'Vintage', css: 'sepia(0.55) saturate(0.85) contrast(0.95) brightness(1.04)' },
  fidenza: { label: 'Fidenza', css: 'saturate(1.25) contrast(1.06) sepia(0.12)' }
};

export class PhotoMode {
  constructor({ canvas, renderer, scene, camera, player, vehicles, input, world, onEnter, onExit, onCapture, getSeason }) {
    this.canvas = canvas;
    this.renderer = renderer;
    this.scene = scene;
    this.camera = camera;
    this.player = player;
    this.vehicles = vehicles;
    this.input = input;
    this.world = world;
    this.onEnter = onEnter;
    this.onExit = onExit;
    this.onCapture = onCapture;
    this.getSeason = getSeason;
    this.active = false;
    this.saved = null;
    this.filter = 'natural';
    this.frame = 'none';
    this.touchMove = { x: 0, y: 0 };
    this.showGrid = false;
    this.showPlayer = true;
    this.showVehicles = true;
    this.position = null;
    this.yaw = 0;
    this.pitch = 0;
    this.fov = 60;
  }

  get filterCss() { return PHOTO_FILTERS[this.filter]?.css || 'none'; }

  enter() {
    if (this.active) return;
    this.saved = {
      position: this.camera.position.clone(),
      quaternion: this.camera.quaternion.clone(),
      fov: this.camera.fov,
      playerControl: this.player.controlEnabled,
      playerVisible: this.player.mesh.visible,
      vehicles: this.vehicles.vehicles.map(v => ({ v, visible: v.mesh.visible }))
    };
    this.active = true;
    this.player.controlEnabled = false;
    this.position = this.camera.position.clone();
    this.yaw = this.player.cameraYaw;
    this.pitch = clamp(-this.player.cameraPitch, -1.15, 1.15);
    this.fov = this.camera.fov;
    this.camera.fov = this.fov;
    this.camera.updateProjectionMatrix();
    this.canvas.style.filter = this.filterCss;
    this.onEnter?.();
    this._applyVisibility();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    this.canvas.style.filter = 'none';
    if (this.saved) {
      this.camera.position.copy(this.saved.position);
      this.camera.quaternion.copy(this.saved.quaternion);
      this.camera.fov = this.saved.fov;
      this.camera.updateProjectionMatrix();
      this.player.controlEnabled = this.saved.playerControl;
      this.player.mesh.visible = this.saved.playerVisible;
      for (const item of this.saved.vehicles) item.v.mesh.visible = item.visible;
    }
    this.onExit?.();
  }

  _applyVisibility() {
    this.player.mesh.visible = this.showPlayer;
    for (const v of this.vehicles.vehicles) v.mesh.visible = this.showVehicles;
  }

  setFilter(id) {
    if (!PHOTO_FILTERS[id]) return;
    this.filter = id;
    this.canvas.style.filter = this.filterCss;
  }

  setFrame(id) { this.frame = id || 'none'; }

  setGrid(on) { this.showGrid = !!on; }
  setPlayerVisible(on) { this.showPlayer = !!on; this._applyVisibility(); }
  setVehiclesVisible(on) { this.showVehicles = !!on; this._applyVisibility(); }
  togglePlayer() { this.setPlayerVisible(!this.showPlayer); }
  toggleVehicles() { this.setVehiclesVisible(!this.showVehicles); }

  update(dt) {
    if (!this.active) return;
    const look = this.input.consumeLook();
    if (look.dx || look.dy) {
      this.yaw += look.dx * 0.0022;
      this.pitch = clamp(this.pitch - look.dy * 0.0017, -1.2, 1.2);
    }
    const touch = this.touchMove || { x: 0, y: 0 };
    const forward = (this.input.isDown('KeyW') || this.input.isDown('ArrowUp') ? 1 : 0) - (this.input.isDown('KeyS') || this.input.isDown('ArrowDown') ? 1 : 0) - touch.y;
    const strafe = (this.input.isDown('KeyD') || this.input.isDown('ArrowRight') ? 1 : 0) - (this.input.isDown('KeyA') || this.input.isDown('ArrowLeft') ? 1 : 0) + touch.x;
    const upDown = (this.input.isDown('KeyE') ? 1 : 0) - (this.input.isDown('KeyQ') ? 1 : 0);
    const speed = (this.input.isDown('ShiftLeft') || this.input.isDown('ShiftRight') ? 22 : 8) * dt;
    const cy = Math.cos(this.yaw), sy = Math.sin(this.yaw);
    this.position.x += (sy * forward + cy * strafe) * speed;
    this.position.z += (cy * forward - sy * strafe) * speed;
    this.position.y += upDown * speed;
    this.position.x = clamp(this.position.x, -1650, 1930);
    this.position.z = clamp(this.position.z, -1730, 1830);
    this.position.y = clamp(this.position.y, 0.8, 120);
    this.camera.position.copy(this.position);
    const cp = Math.cos(this.pitch);
    this.camera.lookAt(
      this.position.x + Math.sin(this.yaw) * cp,
      this.position.y + Math.sin(this.pitch),
      this.position.z + Math.cos(this.yaw) * cp
    );
    if (this.input.consume('BracketLeft')) { this.camera.fov = clamp(this.camera.fov - 3, 25, 90); this.camera.updateProjectionMatrix(); }
    if (this.input.consume('BracketRight')) { this.camera.fov = clamp(this.camera.fov + 3, 25, 90); this.camera.updateProjectionMatrix(); }
  }

  _drawFrame(ctx, canvas, place) {
    if (!this.frame || this.frame === 'none') return;
    const w = canvas.width;
    const h = canvas.height;
    const border = Math.max(10, Math.round(Math.min(w, h) * 0.035));
    const band = Math.round(border * 2.9);
    const dark = this.frame === 'fidenza';
    const paper = dark ? '#1b241e' : '#f8f0e2';
    const ink = dark ? '#f4ebda' : '#1b241e';
    const accent = dark ? '#e7b95a' : '#9a4a34';
    ctx.save();
    ctx.filter = 'none';
    ctx.fillStyle = paper;
    ctx.fillRect(0, 0, w, border);
    ctx.fillRect(0, h - border, w, border);
    ctx.fillRect(0, 0, border, h);
    ctx.fillRect(w - border, 0, border, h);
    ctx.fillRect(0, h - band, w, band - border);
    if (dark) {
      ctx.strokeStyle = accent;
      ctx.lineWidth = Math.max(2, border * 0.16);
      ctx.strokeRect(border * 0.7, border * 0.7, w - border * 1.4, h - border * 1.4);
    }
    const label = `FIDENZA DA GIOCARE · ${place}`;
    const season = ({ spring: 'Primavera', summer: 'Estate', autumn: 'Autunno', winter: 'Inverno' })[this.getSeason?.()] || '';
    const date = new Intl.DateTimeFormat('it-IT', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date());
    ctx.fillStyle = ink;
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    ctx.font = `700 ${Math.max(13, Math.round(w * 0.022))}px Anton, "Arial Narrow", sans-serif`;
    ctx.fillText(label.toUpperCase(), border * 1.35, h - band * 0.62);
    ctx.fillStyle = accent;
    ctx.font = `600 ${Math.max(10, Math.round(w * 0.013))}px Oswald, "Trebuchet MS", sans-serif`;
    ctx.fillText(`${date}${season ? ' · ' + season : ''}`, border * 1.35, h - band * 0.3);
    ctx.textAlign = 'right';
    ctx.fillStyle = dark ? accent : '#6b6254';
    ctx.fillText('FIDENZA · EMILIA-ROMAGNA', w - border * 1.35, h - band * 0.46);
    ctx.restore();
  }

  async capture() {
    if (!this.active) return null;
    this.renderer.render(this.scene, this.camera);
    const src = this.canvas;
    const out = document.createElement('canvas');
    out.width = src.width;
    out.height = src.height;
    const ctx = out.getContext('2d');
    ctx.filter = this.filterCss;
    ctx.drawImage(src, 0, 0);

    let place = 'Fidenza';
    let best = Infinity;
    for (const p of this.world.places || []) {
      const d = Math.hypot(p.x - this.position.x, p.z - this.position.z);
      if (d < best) { best = d; place = p.short || p.name; }
    }
    if (best > 180) place = 'Fidenza';
    this._drawFrame(ctx, out, place);
    const dataUrl = out.toDataURL('image/jpeg', 0.9);

    const tw = Math.min(420, out.width);
    const th = Math.max(1, Math.round(out.height * tw / out.width));
    const thumbCanvas = document.createElement('canvas');
    thumbCanvas.width = tw;
    thumbCanvas.height = th;
    const thumbCtx = thumbCanvas.getContext('2d');
    thumbCtx.drawImage(out, 0, 0, tw, th);
    const thumb = thumbCanvas.toDataURL('image/jpeg', 0.74);

    const photo = {
      id: `photo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      dataUrl,
      thumb,
      place,
      season: this.getSeason?.() || '',
      filter: this.filter,
      frame: this.frame,
      width: out.width,
      height: out.height,
      camera: { x: +this.position.x.toFixed(1), y: +this.position.y.toFixed(1), z: +this.position.z.toFixed(1), yaw: +this.yaw.toFixed(2), pitch: +this.pitch.toFixed(2) }
    };
    let saved = photo;
    try {
      saved = await addPhoto(photo);
    } catch (err) {
      console.warn('Foto non salvata in galleria', err);
    }
    this.onCapture?.(saved);
    return saved;
  }
}
