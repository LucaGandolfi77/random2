import * as THREE from 'three';
import type { Materials } from '../renderer/ProceduralAssets';
import type { ZoneDef } from '../data/zones';
import { HouseBuilder } from './HouseBuilder';
import type { Interactable, World } from './Interactable';

/** Builds a self-contained playable area; inactive areas are removed from the scene. */
export class ZoneBuilder {
  private group = new THREE.Group();
  private colliders: THREE.Box3[] = [];
  private interactables: Interactable[] = [];
  private navNodes: THREE.Vector3[] = [];
  private navEdges: number[][] = [];
  private rooms: World['rooms'] = [];
  private id = 0;

  constructor(private materials: Materials) {}

  build(zone: ZoneDef): World {
    if (zone.kind === 'home') {
      const world = new HouseBuilder(this.materials).build();
      // Home keeps its hand-authored layout; the exit was added by HouseBuilder.
      return world;
    }
    if (zone.kind === 'street' || zone.kind === 'park' || zone.kind === 'cemetery') this.outdoor(zone);
    else this.interior(zone);
    return {
      group: this.group,
      colliders: this.colliders,
      interactables: this.interactables,
      navNodes: this.navNodes,
      navEdges: this.navEdges,
      rooms: this.rooms,
      bounds: new THREE.Box3(
        new THREE.Vector3(zone.bounds[0], 0, zone.bounds[1]),
        new THREE.Vector3(zone.bounds[2], 3.2, zone.bounds[3])
      ),
      shadowsSpawn: zone.shadowSpawns.map(([x, z]) => new THREE.Vector3(x, 0.2, z))
    };
  }

  private box(mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, collide = true): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    if (collide) this.colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  }

  private interact(id: string, kind: Interactable['kind'], label: string, object: THREE.Object3D, data?: Interactable['data']) {
    object.userData.interactableId = id;
    this.interactables.push({ id, kind, label, object, data });
  }

  private marker(x: number, z: number, color: number, label: string, data: Interactable['data']) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b121a, emissive: color, emissiveIntensity: 0.45, transparent: true, opacity: 0.5 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.2, 0.08), mat);
    m.position.set(x, 1.0, z);
    this.group.add(m);
    this.interact(`zone_${this.id++}`, 'zone', label, m, data);
  }

  private prop(kind: Interactable['kind'], x: number, z: number, label: string, reveal?: string, text?: string) {
    const c = kind === 'powerbank' ? 0x6fd6c4 : kind === 'charger' ? 0x7fe4ff : 0xffd9a8;
    const mat = new THREE.MeshStandardMaterial({ color: 0x111820, emissive: c, emissiveIntensity: 0.7 });
    const m = new THREE.Mesh(new THREE.BoxGeometry(kind === 'clue' ? 0.35 : 0.22, kind === 'clue' ? 0.28 : 0.16, 0.18), mat);
    m.position.set(x, 0.95, z);
    this.group.add(m);
    this.interact(`prop_${this.id++}`, kind, label, m, { reveal, text });
  }

  private ground(color: string, w: number, d: number) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    g.rotation.x = -Math.PI / 2;
    g.receiveShadow = true;
    this.group.add(g);
  }

  private tree(x: number, z: number, h = 3) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, h, 6), this.materials.darkWood);
    trunk.position.set(x, h / 2, z);
    this.group.add(trunk);
    const crown = new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), this.materials.grass);
    crown.position.set(x, h + 0.8, z);
    this.group.add(crown);
    this.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.25, 0, z - 0.25), new THREE.Vector3(x + 0.25, h, z + 0.25)));
  }

  private lamp(x: number, z: number) {
    this.cyl(this.materials.metal, x, 1.8, z, 0.07, 3.6);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.materials.bulb.clone());
    bulb.position.set(x, 3.6, z);
    this.group.add(bulb);
  }

  private cyl(mat: THREE.Material, x: number, y: number, z: number, r: number, h: number) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    this.group.add(m);
    return m;
  }

  private outdoor(zone: ZoneDef) {
    const isStreet = zone.kind === 'street';
    this.ground(zone.palette.ground, 50, 45);
    const m = this.materials;

    if (isStreet) {
      // road and sidewalks
      const road = new THREE.Mesh(new THREE.PlaneGeometry(44, 9), new THREE.MeshStandardMaterial({ color: 0x1a1f28, roughness: 0.95 }));
      road.rotation.x = -Math.PI / 2;
      road.position.y = 0.01;
      this.group.add(road);
      for (const z of [-5.5, 5.5]) this.box(m.concrete, 0, 0.08, z, 44, 0.16, 1.6, false);
      for (const x of [-16, -9, 9, 16]) this.lamp(x, 4.7);
      for (const x of [-16, -6, 6, 16]) {
        this.box(m.plastic, x, 0.5, -1.6, 2.6, 1.0, 1.4);
        this.box(m.glass, x, 0.95, -1.6, 2.4, 0.5, 1.5, false);
      }
      // facades with lit windows
      for (const x of [-16, -10, -5, 0, 5, 10, 16]) {
        this.box(m.concrete, x, 2.1, -8.3, 4.6, 4.2, 1.2);
        const win = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a2230, emissive: 0x3a2a18, emissiveIntensity: 0.4 }));
        win.position.set(x, 2.5, -7.68);
        this.group.add(win);
      }
    } else if (zone.kind === 'cemetery') {
      for (let i = 0; i < 22; i++) {
        const a = (i / 22) * Math.PI * 2;
        const x = Math.cos(a) * 12, z = Math.sin(a) * 8 - 1;
        this.box(m.concrete, x, 0.4, z, 0.7, 0.8, 0.2, false);
      }
      this.box(m.concrete, 0, 0.6, -3, 2.6, 1.2, 0.8, false);
      for (const [x, z] of [[-8, 2], [9, -4], [-12, -6]] as [number, number][]) this.tree(x, z, 2.4);
    } else {
      for (const [x, z] of [[-10, -4], [9, -5], [-13, 3], [12, 4], [0, -8]] as [number, number][]) this.tree(x, z, 3.2);
      for (let i = 0; i < 6; i++) {
        this.box(m.darkWood, -10 + i * 4, 0.45, -2, 1.4, 0.12, 0.5, false);
      }
      this.lamp(-6, -2);
      this.lamp(8, -2);
    }

    for (const e of zone.exits) this.marker(e.at[0], e.at[1], 0x2f8fa8, e.label, { target: e.target, spawn: e.spawn, requires: e.requires });
    for (const p of zone.props) this.prop(p.kind, p.at[0], p.at[1], p.label, p.reveal, p.text);
    this.navOutdoor(zone);
  }

  private interior(zone: ZoneDef) {
    const m = this.materials;
    const [minX, minZ, maxX, maxZ] = zone.bounds;
    const w = maxX - minX, d = maxZ - minZ;
    const cx = (minX + maxX) / 2, cz = (minZ + maxZ) / 2;

    const floor = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color: zone.palette.ground, roughness: 0.95 }));
    floor.rotation.x = -Math.PI / 2;
    floor.position.set(cx, 0.02, cz);
    floor.receiveShadow = true;
    this.group.add(floor);
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(w, d), m.wall);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.set(cx, 2.9, cz);
    this.group.add(ceil);

    // four walls, with a gap in the south wall for the exit
    const h = 2.9, t = 0.18;
    const exitX = zone.exits[0]?.at[0] ?? 0;
    const gapL = exitX - 0.75, gapR = exitX + 0.75;
    this.box(m.wall, minX + (gapL - minX) / 2, h / 2, minZ, gapL - minX, h, t);
    this.box(m.wall, (gapR + maxX) / 2, h / 2, minZ, maxX - gapR, h, t);
    this.box(m.wall, minX, h / 2, cz, t, h, d);
    this.box(m.wall, maxX, h / 2, cz, t, h, d);
    this.box(m.wall, cx, h / 2, maxZ, w, h, t);

    // simple furniture that reads as a room
    this.box(m.darkWood, cx, 0.38, cz + 1.5, 2.2, 0.12, 1.1, false);
    this.box(m.fabricBlue, cx - 2.6, 0.42, cz + 0.4, 1.6, 0.84, 0.8, false);
    this.box(m.darkWood, cx + 2.8, 0.6, cz - 1.2, 1.2, 1.2, 0.5, false);
    this.box(m.paper, minX + 0.5, 1.6, cz, 0.08, 0.7, 1.2, false);
    if (zone.kind === 'bar') {
      this.box(m.darkWood, cx, 0.55, minZ + 1.4, 5.5, 1.1, 0.7, false);
      for (const x of [-3, 3]) this.cyl(m.metal, x, 0.6, cz + 2, 0.35, 1.2);
    } else if (zone.kind === 'shop') {
      for (const x of [-4, 0, 4]) this.box(m.darkWood, x, 0.8, cz - 1, 1.5, 1.6, 0.7, false);
    }

    for (const e of zone.exits) this.marker(e.at[0], e.at[1], 0x2f8fa8, e.label, { target: e.target, spawn: e.spawn, requires: e.requires });
    for (const p of zone.props) this.prop(p.kind, p.at[0], p.at[1], p.label, p.reveal, p.text);
    this.navInterior(zone);
  }

  private addNode(x: number, z: number) {
    const i = this.navNodes.length;
    this.navNodes.push(new THREE.Vector3(x, 0, z));
    this.navEdges.push([]);
    return i;
  }

  private link(a: number, b: number) { this.navEdges[a].push(b); this.navEdges[b].push(a); }

  private navOutdoor(zone: ZoneDef) {
    const center = this.addNode(0, 0);
    const nodes = zone.exits.map((e) => this.addNode(e.at[0], e.at[1]));
    for (const n of nodes) this.link(center, n);
    const spawn = this.addNode(zone.spawn[0], zone.spawn[1]);
    this.link(center, spawn);
    this.rooms.push({ name: zone.name, center: new THREE.Vector3(0, 1.3, 0), radius: 18 });
  }

  private navInterior(zone: ZoneDef) {
    const center = this.addNode(0, 0);
    for (const e of zone.exits) this.link(center, this.addNode(e.at[0], e.at[1]));
    this.link(center, this.addNode(zone.spawn[0], zone.spawn[1]));
    this.rooms.push({ name: zone.name, center: new THREE.Vector3(0, 1.3, 0), radius: 8 });
  }
}
