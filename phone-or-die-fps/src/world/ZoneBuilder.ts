import * as THREE from 'three';
import type { Materials } from '../renderer/ProceduralAssets';
import type { ZoneDef } from '../data/zones';
import { HouseBuilder } from './HouseBuilder';
import type { Interactable, World } from './Interactable';

/** Builds a self-contained playable area; only one zone is in the scene at a time. */
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
    if (zone.kind === 'home') return new HouseBuilder(this.materials).build();
    const outdoor = zone.kind === 'street' || zone.kind === 'park' || zone.kind === 'cemetery' || zone.kind === 'harbour' || zone.kind === 'campus';
    if (outdoor) this.outdoor(zone);
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

  private cullable<T extends THREE.Object3D>(o: T): T {
    o.userData.cullable = true;
    return o;
  }

  private box(mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, collide = true, cull = false): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    m.receiveShadow = true;
    this.group.add(m);
    if (collide) this.colliders.push(new THREE.Box3().setFromObject(m));
    return cull ? this.cullable(m) : m;
  }

  private interact(id: string, kind: Interactable['kind'], label: string, object: THREE.Object3D, data?: Interactable['data']) {
    object.userData.interactableId = id;
    this.interactables.push({ id, kind, label, object, data });
  }

  private marker(x: number, z: number, color: number, label: string, data: Interactable['data']) {
    const mat = new THREE.MeshStandardMaterial({ color: 0x0b121a, emissive: color, emissiveIntensity: 0.45, transparent: true, opacity: 0.5 });
    const m = this.cullable(new THREE.Mesh(new THREE.BoxGeometry(0.72, 1.2, 0.08), mat));
    m.position.set(x, 1.0, z);
    this.group.add(m);
    this.interact(`zone_${this.id++}`, 'zone', label, m, data);
  }

  private prop(kind: Interactable['kind'], x: number, z: number, label: string, reveal?: string, text?: string) {
    const c = kind === 'powerbank' ? 0x6fd6c4 : kind === 'charger' ? 0x7fe4ff : 0xffd9a8;
    const mat = new THREE.MeshStandardMaterial({ color: 0x111820, emissive: c, emissiveIntensity: 0.7 });
    const flat = kind === 'clue' || kind === 'photo' || kind === 'note';
    const m = this.cullable(new THREE.Mesh(new THREE.BoxGeometry(flat ? 0.35 : 0.22, flat ? 0.28 : 0.16, 0.18), mat));
    m.position.set(x, 0.95, z);
    this.group.add(m);
    this.interact(`prop_${this.id++}`, kind, label, m, { reveal, text });
  }

  private ground(color: string, w: number, d: number, y = 0) {
    const g = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshStandardMaterial({ color, roughness: 1 }));
    g.rotation.x = -Math.PI / 2;
    g.position.y = y;
    g.receiveShadow = true;
    this.group.add(g);
    return g;
  }

  private tree(x: number, z: number, h = 3) {
    const trunk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.2, h, 6), this.materials.darkWood);
    trunk.position.set(x, h / 2, z);
    this.group.add(trunk);
    const crown = this.cullable(new THREE.Mesh(new THREE.ConeGeometry(1.1, 2.4, 6), this.materials.grass));
    crown.position.set(x, h + 0.8, z);
    this.group.add(crown);
    this.colliders.push(new THREE.Box3(new THREE.Vector3(x - 0.25, 0, z - 0.25), new THREE.Vector3(x + 0.25, h, z + 0.25)));
  }

  private lamp(x: number, z: number) {
    this.cyl(this.materials.metal, x, 1.8, z, 0.07, 3.6, true);
    const bulb = this.cullable(new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), this.materials.bulb.clone()));
    bulb.position.set(x, 3.6, z);
    this.group.add(bulb);
  }

  private cyl(mat: THREE.Material, x: number, y: number, z: number, r: number, h: number, cull = false) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 8), mat);
    m.position.set(x, y, z);
    m.castShadow = true;
    this.group.add(m);
    return cull ? this.cullable(m) : m;
  }

  private outdoor(zone: ZoneDef) {
    const m = this.materials;
    const [minX, minZ, maxX, maxZ] = zone.bounds;
    const w = maxX - minX, d = maxZ - minZ;
    this.ground(zone.palette.ground, w + 8, d + 8);

    if (zone.kind === 'street') {
      const road = this.ground('#1a1f28', w, 9, 0.01);
      road.position.z = 0;
      for (const z of [-5.5, 5.5]) this.box(m.concrete, 0, 0.08, z, w, 0.16, 1.6, false);
      for (let x = minX + 4; x < maxX - 2; x += 8) this.lamp(x, 4.7);
      for (let x = minX + 3; x < maxX - 2; x += 9) {
        this.box(m.plastic, x, 0.5, -1.8, 2.6, 1.0, 1.4, true, true);
        this.box(m.glass, x, 0.95, -1.8, 2.4, 0.5, 1.5, false, true);
      }
      for (let x = minX + 2; x <= maxX - 2; x += 5) {
        this.box(m.concrete, x, 2.1, -8.3, 4.6, 4.2, 1.2);
        const win = this.cullable(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 0.8), new THREE.MeshStandardMaterial({ color: 0x1a2230, emissive: 0x3a2a18, emissiveIntensity: 0.4 })));
        win.position.set(x, 2.5, -7.68);
        this.group.add(win);
      }
      for (let x = minX + 6; x < maxX - 4; x += 12) this.box(m.concrete, 0.03, 0.02, x, 0.16, 0.02, 3, false, true);
    } else if (zone.kind === 'park') {
      const lake = new THREE.Mesh(new THREE.CircleGeometry(11, 24), new THREE.MeshStandardMaterial({ color: 0x1e4050, roughness: 0.3, metalness: 0.2 }));
      lake.rotation.x = -Math.PI / 2;
      lake.position.set(0, 0.03, -12);
      lake.receiveShadow = true;
      this.group.add(lake);
      for (const [x, z] of [[-26, -16], [26, -16], [-28, 12], [28, 12], [-14, 6], [14, 6], [-10, -18], [10, -18], [-24, -2], [24, -2]] as [number, number][]) this.tree(x, z, 3.4);
      for (let i = 0; i < 10; i++) this.box(m.darkWood, -18 + i * 4, 0.45, 6, 1.4, 0.12, 0.5, false, true);
      this.box(m.darkWood, -6, 1.2, 14, 3, 2.4, 3, false, true);
      this.lamp(-14, 0); this.lamp(16, 0);
    } else if (zone.kind === 'cemetery') {
      for (let i = 0; i < 40; i++) {
        const a = (i / 40) * Math.PI * 2;
        const x = Math.cos(a) * 22, z = Math.sin(a) * 14 - 2;
        this.box(m.concrete, x, 0.4, z, 0.7, 0.8, 0.2, false, true);
      }
      for (const [x, z] of [[-16, -10], [16, -10], [-16, 10], [16, 10]] as [number, number][]) this.box(m.concrete, x, 1.2, z, 2.4, 2.4, 2, false, true);
      this.box(m.concrete, 0, 0.6, -8, 2.6, 1.2, 0.8, false, true);
      for (const [x, z] of [[-20, 4], [20, -6], [-24, -12], [24, 12]] as [number, number][]) this.tree(x, z, 2.6);
    } else if (zone.kind === 'harbour') {
      const water = new THREE.Mesh(new THREE.PlaneGeometry(w + 30, 26), new THREE.MeshStandardMaterial({ color: 0x122636, roughness: 0.25, metalness: 0.3 }));
      water.rotation.x = -Math.PI / 2;
      water.position.set(0, 0.02, -20);
      this.group.add(water);
      for (let x = minX + 3; x < maxX - 2; x += 7) {
        this.box(m.darkWood, x, 0.3, -12, 5.5, 0.6, 2.2, false, true);
        this.cyl(m.metal, x, 1.1, -13, 0.1, 2.2, true);
      }
      for (const [x, z] of [[-20, -14], [8, -15], [24, -13], [-12, 4], [12, 2]] as [number, number][]) {
        this.box(m.plastic, x, 0.7, z, 4.5, 1.4, 1.8, false, true);
        this.box(m.darkWood, x, 1.6, z, 0.7, 2, 0.7, false, true);
      }
      for (let x = minX + 4; x < maxX - 2; x += 10) this.lamp(x, 6);
      this.lamp(-10, 10);
      this.lamp(10, 10);
    } else if (zone.kind === 'campus') {
      for (const x of [-26, -12, 4, 20]) {
        this.box(m.concrete, x, 2.2, -12, 11, 4.4, 3, false);
        for (let i = 0; i < 4; i++) this.box(m.glass, x - 3.5 + i * 2.3, 2.2, -10.45, 1.5, 1.4, 0.1, false, true);
      }
      const field = new THREE.Mesh(new THREE.PlaneGeometry(30, 16), new THREE.MeshStandardMaterial({ color: 0x2c5038, roughness: 1 }));
      field.rotation.x = -Math.PI / 2;
      field.position.set(0, 0.03, 6);
      this.group.add(field);
      for (const [x, z] of [[-30, 12], [30, 12], [-30, -4], [30, -4]] as [number, number][]) this.tree(x, z, 3.2);
      this.lamp(-14, 14); this.lamp(14, 14);
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

    const h = 2.9, t = 0.18;
    const exitX = zone.exits[0]?.at[0] ?? 0;
    const gapL = exitX - 0.75, gapR = exitX + 0.75;
    this.box(m.wall, minX + (gapL - minX) / 2, h / 2, minZ, gapL - minX, h, t);
    this.box(m.wall, (gapR + maxX) / 2, h / 2, minZ, maxX - gapR, h, t);
    this.box(m.wall, minX, h / 2, cz, t, h, d);
    this.box(m.wall, maxX, h / 2, cz, t, h, d);
    this.box(m.wall, cx, h / 2, maxZ, w, h, t);

    // an internal divider with a doorway makes the larger interiors feel like rooms
    const dividerX = cx + Math.min(4, w / 5);
    this.box(m.wall, dividerX, h / 2, cz - d / 4, t, h, d / 2);
    this.box(m.wall, dividerX, h / 2, cz + d / 3, t, h, d / 3);

    this.box(m.darkWood, cx, 0.38, cz + 2, 2.6, 0.12, 1.3, false);
    this.box(m.fabricBlue, cx - 4, 0.42, cz + 1, 2, 0.84, 1, false);
    this.box(m.darkWood, cx + 4, 0.6, cz - 2, 1.6, 1.2, 0.6, false);
    this.box(m.paper, minX + 0.6, 1.6, cz, 0.08, 0.7, 1.4, false);

    if (zone.kind === 'bar') {
      this.box(m.darkWood, cx, 0.55, minZ + 1.6, 7, 1.1, 0.8, false);
      for (const x of [-5, 5]) this.cyl(m.metal, x, 0.6, cz + 3, 0.35, 1.2);
    } else if (zone.kind === 'shop' || zone.kind === 'mall') {
      for (let x = minX + 4; x < maxX - 3; x += 6) this.box(m.darkWood, x, 0.8, cz - 2, 2.2, 1.6, 0.8, false, true);
    } else if (zone.kind === 'hospital') {
      for (const z of [cz - 3, cz + 1, cz + 5]) {
        this.box(m.paper, cx - 4, 0.35, z, 1.6, 0.7, 2.4, false, true);
        this.box(m.paper, cx + 4, 0.35, z, 1.6, 0.7, 2.4, false, true);
      }
    } else if (zone.kind === 'metro') {
      this.box(m.metal, cx, 0.15, cz - 3, w - 4, 0.3, 0.5, false, true);
      this.box(m.metal, cx, 0.15, cz + 3, w - 4, 0.3, 0.5, false, true);
    }

    // decorative details: rug, framed pictures, plants and a ceiling lamp
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(3.4, 2.2), new THREE.MeshStandardMaterial({ color: zone.palette.accent, roughness: 1, transparent: true, opacity: 0.22 }));
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(cx, 0.04, cz + 1.8);
    this.group.add(rug);
    for (const px of [minX + 2.5, maxX - 2.5]) {
      const frame = this.box(m.darkWood, px, 1.85, maxZ - 0.22, 0.7, 0.55, 0.05, false, true);
      frame.material = new THREE.MeshStandardMaterial({ color: 0x2a2f3d, roughness: 0.7 });
      const art = new THREE.Mesh(new THREE.PlaneGeometry(0.55, 0.4), new THREE.MeshStandardMaterial({ color: zone.palette.accent, roughness: 0.9 }));
      art.position.set(px, 1.85, maxZ - 0.19);
      this.group.add(art);
    }
    for (const px of [minX + 1.6, maxX - 1.6]) {
      this.cyl(m.darkWood, px, 0.22, minZ + 1.6, 0.12, 0.44);
      const leaves = this.cullable(new THREE.Mesh(new THREE.ConeGeometry(0.34, 0.8, 7), m.grass));
      leaves.position.set(px, 0.75, minZ + 1.6);
      this.group.add(leaves);
    }
    const shade = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.3, 12, 1, true), new THREE.MeshStandardMaterial({ color: zone.palette.accent, side: THREE.DoubleSide, roughness: 0.5, transparent: true, opacity: 0.8 }));
    shade.rotation.x = Math.PI;
    shade.position.set(cx, 2.62, cz);
    this.group.add(shade);

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
    for (const e of zone.exits) this.link(center, this.addNode(e.at[0], e.at[1]));
    for (const s of zone.shadowSpawns) this.link(center, this.addNode(s[0], s[1]));
    this.link(center, this.addNode(zone.spawn[0], zone.spawn[1]));
    this.rooms.push({ name: zone.name, center: new THREE.Vector3(0, 1.3, 0), radius: (zone.bounds[2] - zone.bounds[0]) / 2 });
  }

  private navInterior(zone: ZoneDef) {
    const center = this.addNode(0, 0);
    for (const e of zone.exits) this.link(center, this.addNode(e.at[0], e.at[1]));
    for (const p of zone.props) this.link(center, this.addNode(p.at[0], p.at[1]));
    this.link(center, this.addNode(zone.spawn[0], zone.spawn[1]));
    this.rooms.push({ name: zone.name, center: new THREE.Vector3(0, 1.3, 0), radius: (zone.bounds[2] - zone.bounds[0]) / 2 });
  }
}
