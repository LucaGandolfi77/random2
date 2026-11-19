import * as THREE from 'three';
import { createMaterials, photoTexture, type Materials } from '../renderer/ProceduralAssets';
import type { Interactable, RoomInfo, World } from './Interactable';

interface Opening { at: number; width: number; height?: number; bottom?: number; type?: 'door' | 'window' }

export class HouseBuilder {
  readonly materials: Materials;

  constructor(materials: Materials = createMaterials()) { this.materials = materials; }
  readonly group = new THREE.Group();
  private colliders: THREE.Box3[] = [];
  private interactables: Interactable[] = [];
  private navNodes: THREE.Vector3[] = [];
  private navEdges: number[][] = [];
  private rooms: RoomInfo[] = [];
  private shadowSpawns: THREE.Vector3[] = [];
  private doorCounter = 0;

  build(): World {
    this.floors();
    this.walls();
    this.furniture();
    this.outdoors();
    this.nav();
    this.addExit();
    return {
      group: this.group,
      colliders: this.colliders,
      interactables: this.interactables,
      navNodes: this.navNodes,
      navEdges: this.navEdges,
      rooms: this.rooms,
      bounds: new THREE.Box3(new THREE.Vector3(-8, 0, -6.5), new THREE.Vector3(8, 3.2, 6.5)),
      shadowsSpawn: this.shadowSpawns
    };
  }

  private box(mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, collide = true, cast = true): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
    m.position.set(x, y, z);
    m.castShadow = cast;
    m.receiveShadow = true;
    this.group.add(m);
    if (collide) this.colliders.push(new THREE.Box3().setFromObject(m));
    return m;
  }

  private cyl(mat: THREE.Material, x: number, y: number, z: number, r: number, h: number, seg = 12): THREE.Mesh {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, seg), mat);
    m.position.set(x, y, z);
    m.castShadow = true; m.receiveShadow = true;
    this.group.add(m);
    return m;
  }

  private interact(id: string, kind: Interactable['kind'], label: string, object: THREE.Object3D, data?: Interactable['data']) {
    object.userData.interactableId = id;
    this.interactables.push({ id, kind, label, object, data });
  }

  private floors() {
    const m = this.materials;
    const plane = (mat: THREE.Material, x: number, z: number, w: number, d: number, y = 0.02) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(x, y, z);
      mesh.receiveShadow = true;
      this.group.add(mesh);
    };
    plane(m.floorWood, -4.75, -2.5, 6.5, 7);   // living
    plane(m.tile, 4.75, -2.5, 6.5, 7);         // kitchen
    plane(m.carpet, -4.75, 3.5, 6.5, 5);        // bedroom
    plane(m.tile, 3.25, 3.5, 3.5, 5);           // bathroom
    plane(m.concrete, 6.5, 3.5, 3, 5);          // garage
    plane(m.floorWood, 0, 0, 3, 12);            // hallway
    // ceiling
    const ceil = new THREE.Mesh(new THREE.PlaneGeometry(16, 12), m.wall);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 2.9;
    this.group.add(ceil);
  }

  private wall(a: [number, number], b: [number, number], openings: Opening[] = [], height = 2.9, thick = 0.16) {
    const dx0 = b[0] - a[0], dz0 = b[1] - a[1];
    const len = Math.hypot(dx0, dz0);
    if (len < 0.01) return;
    const ux = dx0 / len, uz = dz0 / len;
    const angle = Math.atan2(-uz, ux);
    const sorted = [...openings].sort((p, q) => p.at - q.at);
    let cursor = 0;

    const piece = (from: number, to: number, y: number, h: number) => {
      if (to - from < 0.02 || h < 0.02) return;
      const cx = a[0] + ux * (from + to) / 2;
      const cz = a[1] + uz * (from + to) / 2;
      const mesh = new THREE.Mesh(new THREE.BoxGeometry(to - from, h, thick), this.materials.wall);
      mesh.position.set(cx, y, cz);
      mesh.rotation.y = angle;
      mesh.castShadow = true; mesh.receiveShadow = true;
      this.group.add(mesh);
      this.colliders.push(new THREE.Box3().setFromObject(mesh));
    };

    for (const o of sorted) {
      const start = Math.max(0, o.at - o.width / 2);
      const end = Math.min(len, o.at + o.width / 2);
      piece(cursor, start, height / 2, height);
      const bottom = o.bottom ?? 0;
      const top = height - (o.height ?? 2.15);
      if (bottom > 0.02) piece(start, end, bottom / 2, bottom);
      if (top > 0.02) piece(start, end, height - top / 2, top);

      const cx = a[0] + ux * o.at, cz = a[1] + uz * o.at;
      if (o.type === 'window') {
        const glass = new THREE.Mesh(new THREE.PlaneGeometry(o.width, o.height ?? 1.2), this.materials.glass);
        glass.position.set(cx, bottom + (o.height ?? 1.2) / 2, cz);
        glass.rotation.y = angle;
        glass.userData.glass = true;
        this.group.add(glass);
        const id = `window${this.doorCounter++}`;
        this.interact(id, 'window', 'Look outside', glass);
        this.shadowSpawns.push(new THREE.Vector3(cx + ux * 2.2, 0.2, cz + uz * 2.2));
      } else {
        this.makeDoor(cx, cz, angle, o.width, o.height ?? 2.15);
      }
      cursor = end;
    }
    piece(cursor, len, height / 2, height);
  }

  private walls() {
    const win: Opening = { at: 0, width: 1.3, bottom: 0.95, height: 1.15, type: 'window' };
    const door: Opening = { at: 0, width: 1.5, height: 2.15, type: 'door' };
    const smallDoor: Opening = { at: 0, width: 1.1, height: 2.1, type: 'door' };

    // outer shell
    this.wall([-8, -6], [8, -6], [
      { ...win, at: 2.1 }, { ...door, at: 8 }, { ...win, at: 13.8 }
    ]);
    this.wall([-8, 6], [8, 6], [
      { ...win, at: 2.4 }, { ...door, at: 8 }, { ...win, at: 13.6 }
    ]);
    this.wall([-8, -6], [-8, 6], [{ ...win, at: 3 }, { ...win, at: 9 }]);
    this.wall([8, -6], [8, 6], [{ ...win, at: 3 }, { ...win, at: 9 }]);

    // hallway walls
    this.wall([-1.5, -6], [-1.5, 6], [{ ...smallDoor, at: 3 }, { ...smallDoor, at: 9 }]);
    this.wall([1.5, -6], [1.5, 6], [{ ...smallDoor, at: 3 }, { ...smallDoor, at: 9 }]);

    // room dividers
    this.wall([-8, 1], [-1.5, 1], [{ ...smallDoor, at: 3 }]);
    this.wall([1.5, 1], [8, 1], [{ ...smallDoor, at: 1.5 }, { ...smallDoor, at: 5 }]);
    this.wall([5, 1], [5, 6], [{ ...smallDoor, at: 2.5 }]);
  }

  private makeDoor(x: number, z: number, angle: number, width: number, height: number) {
    const pivot = new THREE.Group();
    pivot.position.set(x, 0, z);
    pivot.rotation.y = angle;
    const leaf = new THREE.Mesh(new THREE.BoxGeometry(width - 0.06, height - 0.04, 0.06), this.materials.darkWood);
    leaf.position.set((width - 0.06) / 2, (height - 0.04) / 2, 0);
    leaf.castShadow = true;
    pivot.add(leaf);
    const knob = new THREE.Mesh(new THREE.SphereGeometry(0.045, 10, 8), this.materials.metal);
    knob.position.set(width - 0.16, height / 2, 0.06);
    pivot.add(knob);
    const frame = new THREE.Mesh(new THREE.BoxGeometry(width + 0.1, 0.08, 0.22), this.materials.darkWood);
    frame.position.set(0, height, 0);
    pivot.add(frame);
    this.group.add(pivot);
    const collider = new THREE.Box3().setFromObject(leaf);
    const id = `door${this.doorCounter++}`;
    const locked = this.doorCounter % 4 === 0;
    this.interact(id, 'door', locked ? 'Locked door' : 'Open / close door', leaf, {
      pivot, open: false, locked, collider,
      closedCenter: collider.getCenter(new THREE.Vector3()), baseAngle: angle
    });
  }

  private furniture() {
    const m = this.materials;
    const ph = (id: string, x: number, y: number, z: number, ry = 0) => {
      const group = new THREE.Group();
      const frame = new THREE.Mesh(new THREE.BoxGeometry(0.26, 0.32, 0.02), m.darkWood);
      group.add(frame);
      const pic = new THREE.Mesh(new THREE.PlaneGeometry(0.22, 0.27), new THREE.MeshStandardMaterial({ map: photoTexture(this.rooms.length + x), roughness: 0.8 }));
      pic.position.z = 0.011;
      group.add(pic);
      group.position.set(x, y, z); group.rotation.y = ry;
      this.group.add(group);
      this.interact(id, 'photo', 'Inspect the photograph', pic);
    };

    // ---- living room ----
    const sofa = this.box(m.fabricBlue, -6.2, 0.42, -3.6, 2.4, 0.84, 0.95, false);
    sofa.castShadow = true;
    this.box(m.fabricBlue, -6.2, 0.82, -4.05, 2.4, 0.8, 0.18, false);
    this.box(m.darkWood, -4.2, 0.36, -3.4, 1.3, 0.12, 0.75, false);
    for (const dx of [-0.55, 0.55]) for (const dz of [-0.3, 0.3]) this.cyl(m.darkWood, -4.2 + dx, 0.16, -3.4 + dz, 0.04, 0.32);
    this.box(m.plastic, -2.2, 1.25, -5.75, 1.6, 0.92, 0.1, false);
    const tvScreen = new THREE.Mesh(new THREE.PlaneGeometry(1.45, 0.78), m.screen.clone());
    tvScreen.position.set(-2.2, 1.27, -5.68);
    this.group.add(tvScreen);
    this.interact('tv', 'tv', 'Turn on the television', tvScreen);
    ph('photo_living', -7.6, 1.75, -5.88, 0);
    this.box(m.darkWood, -7.3, 0.9, -1.2, 0.9, 1.8, 0.4);
    for (let i = 0; i < 3; i++) this.box(m.paper, -7.3, 1.2 + i * 0.4, -0.98, 0.6, 0.05, 0.02, false);

    // ---- kitchen ----
    this.box(m.darkWood, 4.6, 0.45, -5.6, 5.2, 0.9, 0.6);
    this.box(m.metal, 7.3, 0.9, -3.4, 0.8, 1.8, 0.8);
    this.box(m.darkWood, 4.2, 0.36, -2.6, 1.5, 0.1, 0.9, false);
    for (const dx of [-0.6, 0.6]) for (const dz of [-0.35, 0.35]) this.cyl(m.metal, 4.2 + dx, 0.17, -2.6 + dz, 0.03, 0.34);
    const fridgeHandle = this.cyl(m.metal, 6.88, 1.1, -3.05, 0.022, 0.5);
    this.interact('fridge', 'drawer', 'Open the refrigerator', fridgeHandle);
    const charger = this.box(m.plastic, 5.4, 0.95, -5.25, 0.18, 0.12, 0.12, false);
    this.interact('charger_kitchen', 'charger', 'Use the wall charger', charger);
    this.box(m.metal, 7.6, 1.55, -1.4, 0.5, 0.06, 0.5, false);

    // ---- bedroom ----
    this.box(m.darkWood, -5.6, 0.28, 4.3, 2.0, 0.45, 2.1);
    this.box(m.fabricRed, -5.6, 0.56, 4.3, 1.9, 0.2, 2.0, false);
    this.box(m.paper, -5.6, 0.68, 3.6, 1.3, 0.12, 0.45, false);
    this.box(m.darkWood, -6.9, 0.3, 2.2, 0.55, 0.6, 0.5);
    this.box(m.darkWood, -6.9, 0.65, 2.2, 0.55, 0.1, 0.5, false);
    const lamp = this.cyl(m.metal, -7.2, 0.75, 2.2, 0.07, 0.3);
    this.interact('lamp_bed', 'switch', 'Toggle the bedside lamp', lamp);
    this.box(m.darkWood, -2.5, 0.4, 5.4, 1.5, 0.8, 0.5);
    for (let i = 0; i < 3; i++) this.box(m.paper, -2.9 + i * 0.4, 0.84, 5.4, 0.3, 0.06, 0.34, false);
    ph('photo_bed', -3.0, 1.7, 2.08, 0);
    const mirror = new THREE.Mesh(new THREE.PlaneGeometry(0.7, 1.5), new THREE.MeshStandardMaterial({ color: 0x2b3540, metalness: 0.85, roughness: 0.18 }));
    mirror.position.set(-1.75, 1.5, 5.85); mirror.rotation.y = Math.PI;
    this.group.add(mirror);
    this.interact('mirror', 'note', 'Look in the mirror', mirror);
    const pb = this.box(m.plastic, -7.5, 0.72, 4.9, 0.2, 0.12, 0.1, false);
    this.interact('powerbank', 'powerbank', 'Take the power bank', pb);

    // ---- bathroom ----
    const tub = this.box(m.paper, 2.2, 0.3, 5.1, 1.7, 0.6, 0.8, false);
    tub.material = m.tile;
    this.cyl(m.paper, 4.4, 0.4, 2.0, 0.28, 0.8);
    this.box(m.paper, 2.0, 0.85, 1.4, 1.2, 0.12, 0.5, false);
    const med = this.box(m.metal, 1.72, 1.5, 3.2, 0.12, 0.6, 0.5, false);
    this.interact('medicine', 'medicine', 'Open the medicine cabinet', med);
    this.box(m.plastic, 3.8, 1.3, 5.8, 0.3, 0.5, 0.12, false);

    // ---- garage / storage ----
    for (let i = 0; i < 4; i++) this.box(m.concrete, 5.6 + (i % 2) * 1.6, 0.3 + Math.floor(i / 2) * 0.6, 5.2, 1.2, 0.55, 0.9);
    const torch = this.cyl(m.metal, 7.4, 0.95, 4.3, 0.04, 0.3);
    torch.rotation.z = Math.PI / 2;
    this.interact('flashlight_pickup', 'flashlight', 'Take the flashlight', torch);
    const panel = this.box(m.metal, 7.85, 1.4, 1.6, 0.1, 0.5, 0.4, false);
    this.interact('security', 'security', 'Check the security panel', panel);

    // ---- hallway ----
    const hallTable = this.box(m.darkWood, 0, 0.4, 0.8, 0.7, 0.8, 0.4, false);
    this.interact('keys', 'key', 'Pick up the keys', hallTable);
    ph('photo_hall', 1.35, 1.7, -1.5, -Math.PI / 2);
    this.box(m.darkWood, -1.25, 1.6, -4.5, 0.1, 0.7, 0.5, false);

    // light switches near doors
    const sw1 = this.box(m.paper, 1.35, 1.3, -4.4, 0.03, 0.12, 0.08, false);
    this.interact('switch_living', 'switch', 'Toggle the living room light', sw1);
    const sw2 = this.box(m.paper, -1.35, 1.3, 2.4, 0.03, 0.12, 0.08, false);
    this.interact('switch_bed', 'switch', 'Toggle the bedroom light', sw2);
  }

  private outdoors() {
    const m = this.materials;
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), m.grass);
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.02;
    ground.receiveShadow = true;
    this.group.add(ground);
    // garden fence
    for (let x = -10; x <= 10; x += 1.2) this.box(m.darkWood, x, 0.55, 9.5, 0.08, 1.1, 0.08, false);
    this.box(m.darkWood, 0, 0.5, 9.5, 20, 0.08, 0.08, false);
    // trees and neighbour house silhouette
    for (const [x, z, h] of [[-12, 14, 3], [9, 16, 3.6], [-15, -8, 4], [14, -10, 3.4]] as [number, number, number][]) {
      this.cyl(m.darkWood, x, h / 2, z, 0.16, h, 8);
      const crown = new THREE.Mesh(new THREE.ConeGeometry(1.2, 3, 7), m.grass);
      crown.position.set(x, h + 0.8, z);
      this.group.add(crown);
    }
    const neighbour = this.box(m.concrete, 16, 2, -2, 7, 4, 6, false);
    neighbour.material = new THREE.MeshStandardMaterial({ color: 0x171c24, roughness: 1 });
    for (const [x, z] of [[14.6, -2], [17.4, -2]] as [number, number][]) {
      const win = new THREE.Mesh(new THREE.PlaneGeometry(0.9, 0.7), new THREE.MeshStandardMaterial({ color: 0x332a1c, emissive: 0x3a2a12, emissiveIntensity: 0.5 }));
      win.position.set(x, 2.1, z + 3.01);
      if (z === -2) win.position.z = 1.01;
      this.group.add(win);
    }
    // Larger garden: shed, greenhouse and hiding places
    const shed = this.box(m.darkWood, 10, 1.0, 8, 2.4, 2, 2.2, false);
    this.interact('garden_shed', 'clue', 'Look inside the garden shed', shed, {
      reveal: 'garden_shed', text: 'Old tools, a burned phone, and a calendar circled at 06:00.'
    });
    const greenhouse = this.box(m.glass, -10, 1.1, 8, 3, 2.2, 2.6, false);
    this.interact('garden_greenhouse', 'note', 'Inspect the greenhouse', greenhouse, {
      reveal: 'garden_greenhouse', text: 'Every plant is dead except one, growing in the shape of a handprint.'
    });
    const outlet = this.box(m.metal, 8, 0.5, 3.5, 0.3, 0.4, 0.2, false);
    this.interact('garden_outlet', 'charger', 'Use the garden outlet', outlet);
    this.box(m.concrete, -8, 0.3, 4, 1.4, 0.6, 1, false);
    this.shadowSpawns.push(
      new THREE.Vector3(-6, 0.2, 11), new THREE.Vector3(6, 0.2, 11),
      new THREE.Vector3(-11, 0.2, -9), new THREE.Vector3(11, 0.2, -9),
      new THREE.Vector3(12, 0.2, 8), new THREE.Vector3(-12, 0.2, 8)
    );
  }

  private addExit() {
    const marker = new THREE.Mesh(
      new THREE.BoxGeometry(0.9, 1.7, 0.08),
      new THREE.MeshStandardMaterial({ color: 0x14202c, emissive: 0x2a6f7a, emissiveIntensity: 0.9, transparent: true, opacity: 0.85 })
    );
    marker.position.set(0, 1.0, -5.55);
    this.group.add(marker);
    this.interact('home_exit', 'zone', 'Leave the house', marker, { target: 'street', spawn: 'home' });
  }

  private addNode(x: number, z: number, name: string, radius = 2.6) {
    const idx = this.navNodes.length;
    this.navNodes.push(new THREE.Vector3(x, 0, z));
    this.rooms.push({ name, center: new THREE.Vector3(x, 1.3, z), radius });
    return idx;
  }

  private nav() {
    const living = this.addNode(-4.75, -2.5, 'Living room', 3.3);
    const kitchen = this.addNode(4.75, -2.5, 'Kitchen', 3.3);
    const hallS = this.addNode(0, -3, 'Hallway', 1.6);
    const hallC = this.addNode(0, 0, 'Hallway', 1.6);
    const hallN = this.addNode(0, 3, 'Hallway', 1.6);
    const bedroom = this.addNode(-4.75, 3.5, 'Bedroom', 3.2);
    const bath = this.addNode(3.25, 3.5, 'Bathroom', 1.9);
    const garage = this.addNode(6.5, 3.5, 'Garage', 1.7);
    const gardenN = this.addNode(0, 9, 'Garden', 4);
    const gardenS = this.addNode(0, -9, 'Front yard', 4);
    const link = (a: number, b: number) => { this.navEdges[a].push(b); this.navEdges[b].push(a); };
    this.navNodes.forEach(() => this.navEdges.push([]));
    link(living, hallS); link(kitchen, hallS); link(hallS, hallC); link(hallC, hallN);
    link(living, bedroom); link(bedroom, hallN);
    link(kitchen, bath); link(bath, garage); link(bath, hallN); link(kitchen, garage);
    link(hallN, gardenN); link(hallS, gardenS);
  }

  get interactableCount() { return this.interactables.length; }
}
