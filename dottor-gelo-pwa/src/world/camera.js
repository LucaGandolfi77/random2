import * as THREE from 'three';
import { clamp, easeOutCubic } from '../core/utils.js';

/*
 * A fixed isometric orthographic camera: the lab is readable at a glance,
 * the minimap always matches, and panning is a translation of the target.
 */
export class LabCamera {
  constructor() {
    this.camera = new THREE.OrthographicCamera(-7, 7, 7, -7, 0.1, 120);
    this.target = new THREE.Vector3(0, 0.5, 1.1);
    this.offset = new THREE.Vector3(10, 12.5, 10);
    this.zoom = 1;
    this.baseView = 10.2;
    this.minZoom = 0.58;
    this.maxZoom = 2.1;
    this.bounds = { minX: -4.8, maxX: 4.8, minZ: -4.8, maxZ: 5.6 };
    this.tween = null;
    this.w = 1;
    this.h = 1;
    this.raycaster = new THREE.Raycaster();
    this._apply();
  }

  setViewport(w, h) {
    this.w = Math.max(1, w);
    this.h = Math.max(1, h);
    const aspect = this.w / this.h;
    const view = this.baseView * (aspect < 0.82 ? 1.12 : aspect > 1.6 ? 0.88 : 1);
    const halfH = view / 2;
    const halfW = halfH * aspect;
    this.camera.left = -halfW;
    this.camera.right = halfW;
    this.camera.top = halfH;
    this.camera.bottom = -halfH;
    this.camera.updateProjectionMatrix();
    this._apply();
  }

  _apply() {
    this.target.x = clamp(this.target.x, this.bounds.minX, this.bounds.maxX);
    this.target.z = clamp(this.target.z, this.bounds.minZ, this.bounds.maxZ);
    this.camera.position.copy(this.target).add(this.offset);
    this.camera.lookAt(this.target);
    this.camera.zoom = this.zoom;
    this.camera.updateProjectionMatrix();
  }

  pan(dx, dy) {
    const wpp = (this.camera.top - this.camera.bottom) / (this.h * this.zoom);
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(this.camera.quaternion);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(this.camera.quaternion);
    const rx = right.x, rz = right.z;
    const ux = up.x, uz = up.z;
    const rLen = Math.hypot(rx, rz) || 1;
    const uLen = Math.hypot(ux, uz) || 1;
    this.target.x -= (dx * wpp * rx) / rLen;
    this.target.z -= (dx * wpp * rz) / rLen;
    this.target.x -= (dy * wpp * ux) / uLen;
    this.target.z -= (dy * wpp * uz) / uLen;
    this.tween = null;
    this._apply();
  }

  zoomBy(factor) {
    this.zoom = clamp(this.zoom * factor, this.minZoom, this.maxZoom);
    this._apply();
  }

  focus(pos, zoom = 1.35, immediate = false) {
    const to = new THREE.Vector3(pos.x, 0.55, pos.z);
    if (immediate) {
      this.target.copy(to);
      this.zoom = clamp(zoom, this.minZoom, this.maxZoom);
      this.tween = null;
      this._apply();
      return;
    }
    this.tween = {
      from: this.target.clone(),
      to,
      fromZoom: this.zoom,
      toZoom: clamp(zoom, this.minZoom, this.maxZoom),
      t: 0,
      duration: 0.7,
    };
  }

  reset(immediate = false) {
    this.focus({ x: 0, z: 1.1 }, 1, immediate);
  }

  update(dt) {
    if (!this.tween) return;
    const tw = this.tween;
    tw.t += dt;
    const k = clamp(tw.t / tw.duration, 0, 1);
    const e = easeOutCubic(k);
    this.target.lerpVectors(tw.from, tw.to, e);
    this.zoom = tw.fromZoom + (tw.toZoom - tw.fromZoom) * e;
    if (k >= 1) this.tween = null;
    this._apply();
  }

  screenRay(clientX, clientY) {
    const rect = this.camera.userData?.canvasRect || { left: 0, top: 0, width: this.w, height: this.h };
    const x = ((clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera({ x, y }, this.camera);
    return this.raycaster;
  }

  viewBounds() {
    const halfH = (this.camera.top - this.camera.bottom) / (2 * this.zoom);
    const halfW = (this.camera.right - this.camera.left) / (2 * this.zoom);
    return {
      minX: this.target.x - halfW * 0.62,
      maxX: this.target.x + halfW * 0.62,
      minZ: this.target.z - halfH * 0.72,
      maxZ: this.target.z + halfH * 0.72,
    };
  }
}
