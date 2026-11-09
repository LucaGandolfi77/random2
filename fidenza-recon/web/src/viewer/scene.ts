import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { GLTFExporter } from 'three/examples/jsm/exporters/GLTFExporter.js';
import type { Building, CityData } from '../types';
import { flatFootprintGeometry } from '../city/roof';
import { canvasLabel, formatNumber } from '../utils';

export interface ViewerStatsElements {
  fps: HTMLElement;
  calls: HTMLElement;
  triangles: HTMLElement;
  buildings: HTMLElement;
  windows: HTMLElement;
  height: HTMLElement;
}

export class Viewer {
  readonly scene = new THREE.Scene();
  readonly camera: THREE.PerspectiveCamera;
  readonly renderer: THREE.WebGLRenderer;
  readonly controls: OrbitControls;
  readonly buildingRoot = new THREE.Group();
  readonly cityRoot = new THREE.Group();
  private readonly container: HTMLElement;
  private readonly sun: THREE.DirectionalLight;
  private readonly sky: THREE.Mesh;
  private readonly labelGroup = new THREE.Group();
  private readonly footprintGroup = new THREE.Group();
  private readonly confidenceGroup = new THREE.Group();
  private readonly raycaster = new THREE.Raycaster();
  private readonly pointer = new THREE.Vector2();
  private pointerDown = new THREE.Vector2();
  private selectionHandler: ((building: Building | null) => void) | null = null;
  private city: CityData | null = null;
  private detailGroup: THREE.Group | null = null;
  private lastTime = performance.now();
  private frames = 0;
  private fpsWindow = 0;
  private statsElements: ViewerStatsElements | null = null;
  private readonly centre = new THREE.Vector3();

  constructor(container: HTMLElement) {
    this.container = container;
    this.camera = new THREE.PerspectiveCamera(52, 1, 0.1, 3000);
    this.camera.position.set(42, 18, 58);
    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 0.98;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.shadowMap.autoUpdate = false;
    this.renderer.shadowMap.needsUpdate = true;
    this.renderer.domElement.className = 'city-canvas';
    container.appendChild(this.renderer.domElement);

    this.controls = new OrbitControls(this.camera, this.renderer.domElement);
    this.controls.enableDamping = true;
    this.controls.dampingFactor = 0.08;
    this.controls.minDistance = 4;
    this.controls.maxDistance = 900;
    this.controls.maxPolarAngle = Math.PI * 0.495;
    this.controls.target.set(0, 9, 0);
    this.controls.screenSpacePanning = false;

    const pmrem = new THREE.PMREMGenerator(this.renderer);
    const environment = new RoomEnvironment();
    this.scene.environment = pmrem.fromScene(environment, 0.04).texture;
    this.scene.environmentIntensity = 0.22;
    environment.dispose();
    pmrem.dispose();

    this.scene.fog = new THREE.Fog(0xd3dcdf, 220, 1400);
    this.scene.background = new THREE.Color(0xd3dcdf);

    const skyGeometry = new THREE.SphereGeometry(2000, 32, 18);
    const skyMaterial = new THREE.ShaderMaterial({
      side: THREE.BackSide,
      depthWrite: false,
      uniforms: {
        top: { value: new THREE.Color('#7fa6c0') },
        bottom: { value: new THREE.Color('#e4e9e8') },
      },
      vertexShader: `
        varying vec3 vWorld;
        void main() {
          vec4 world = modelMatrix * vec4(position, 1.0);
          vWorld = world.xyz;
          gl_Position = projectionMatrix * viewMatrix * world;
        }
      `,
      fragmentShader: `
        uniform vec3 top;
        uniform vec3 bottom;
        varying vec3 vWorld;
        void main() {
          float h = clamp(normalize(vWorld).y * 1.6, 0.0, 1.0);
          vec3 colour = mix(bottom, top, pow(h, 0.75));
          gl_FragColor = vec4(colour, 1.0);
        }
      `,
    });
    this.sky = new THREE.Mesh(skyGeometry, skyMaterial);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);

    const hemisphere = new THREE.HemisphereLight(0xdbe6ea, 0x8a7b66, 0.95);
    this.scene.add(hemisphere);
    this.sun = new THREE.DirectionalLight(0xfff0d8, 1.55);
    this.sun.position.set(120, 170, 80);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -190;
    this.sun.shadow.camera.right = 190;
    this.sun.shadow.camera.top = 190;
    this.sun.shadow.camera.bottom = -190;
    this.sun.shadow.camera.near = 20;
    this.sun.shadow.camera.far = 480;
    this.sun.shadow.bias = -0.0005;
    this.sun.shadow.normalBias = 0.03;
    this.scene.add(this.sun);
    const sunTarget = new THREE.Object3D();
    sunTarget.position.set(0, 0, 0);
    this.scene.add(sunTarget);
    this.sun.target = sunTarget;

    this.scene.add(this.cityRoot);
    this.scene.add(this.labelGroup);
    this.scene.add(this.footprintGroup);
    this.scene.add(this.confidenceGroup);
    this.cityRoot.add(this.buildingRoot);
    this.footprintGroup.visible = false;
    this.confidenceGroup.visible = false;

    window.addEventListener('resize', () => this.resize());
    this.renderer.domElement.addEventListener('pointerdown', (event) => {
      this.pointerDown.set(event.clientX, event.clientY);
    });
    this.renderer.domElement.addEventListener('pointerup', (event) => {
      const moved = this.pointerDown.distanceTo(new THREE.Vector2(event.clientX, event.clientY));
      if (moved > 5) return;
      this.pick(event);
    });
    this.renderer.domElement.addEventListener('pointermove', (event) => {
      this.pointer.set(
        (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
        -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1,
      );
      this.raycaster.setFromCamera(this.pointer, this.camera);
      const hit = this.raycaster.intersectObjects(this.buildingRoot.children, true)[0];
      this.renderer.domElement.style.cursor = hit ? 'pointer' : 'grab';
    });
    this.resize();
    this.animate();
  }

  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    this.camera.aspect = width / Math.max(1, height);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  requestShadowUpdate(): void {
    this.renderer.shadowMap.needsUpdate = true;
  }

  setStatsElements(elements: ViewerStatsElements): void {
    this.statsElements = elements;
  }

  load(city: CityData): void {
    this.city = city;
    const [minX, minZ, maxX, maxZ] = city.meta.bbox_local;
    this.centre.set((minX + maxX) / 2, 0, (minZ + maxZ) / 2);
    this.controls.target.set(0, Math.min(12, city.stats.height_confidence_median > 0 ? 10 : 8), 0);
    this.camera.position.set(46, 19, 62);
    this.controls.update();

    for (const building of city.buildings) {
      if (!building.name && !building.landmark) continue;
      const sprite = new THREE.Sprite(
        new THREE.SpriteMaterial({
          map: canvasLabel(
            building.name ?? building.style_label ?? building.osm_id,
            'rgba(18,24,28,0.86)',
            '#f4efe4',
          ),
          depthTest: true,
          transparent: true,
        }),
      );
      sprite.position.set(
        building.centroid_local[0],
        building.base_y + building.height_m + 4.5,
        building.centroid_local[1],
      );
      const scale = Math.min(10, 5 + (building.name?.length ?? 0) * 0.22);
      sprite.scale.set(scale, scale / 5, 1);
      sprite.userData.building = building;
      this.labelGroup.add(sprite);
    }
    this.labelGroup.visible = city.stats.landmarks > 0;

    const footprintMaterial = new THREE.MeshBasicMaterial({
      color: 0x5ef2a0,
      transparent: true,
      opacity: 0.22,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    for (const building of city.buildings) {
      const mesh = new THREE.Mesh(flatFootprintGeometry(building, 0.16), footprintMaterial);
      mesh.renderOrder = 2;
      this.footprintGroup.add(mesh);
      const confidence = building.height_confidence ?? 0;
      const colour =
        confidence > 0.65 ? new THREE.Color('#4fd18b') : confidence > 0.45 ? new THREE.Color('#e7c45a') : new THREE.Color('#d75c4b');
      const confidenceMaterial = new THREE.MeshBasicMaterial({
        color: colour,
        transparent: true,
        opacity: 0.55,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const confidenceMesh = new THREE.Mesh(flatFootprintGeometry(building, 0.18), confidenceMaterial);
      confidenceMesh.renderOrder = 3;
      this.confidenceGroup.add(confidenceMesh);
    }
    this.footprintGroup.visible = false;
    this.confidenceGroup.visible = false;
  }

  setDetailGroup(group: THREE.Group): void {
    this.detailGroup = group;
    this.cityRoot.add(group);
  }

  setSelectionHandler(handler: (building: Building | null) => void): void {
    this.selectionHandler = handler;
  }

  private pick(event: PointerEvent): void {
    this.pointer.set(
      (event.clientX / this.renderer.domElement.clientWidth) * 2 - 1,
      -(event.clientY / this.renderer.domElement.clientHeight) * 2 + 1,
    );
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const hits = this.raycaster.intersectObjects(this.buildingRoot.children, true);
    for (const hit of hits) {
      let object: THREE.Object3D | null = hit.object;
      while (object) {
        if (object.userData.building) {
          this.selectionHandler?.(object.userData.building as Building);
          return;
        }
        object = object.parent;
      }
    }
    this.selectionHandler?.(null);
  }

  setFootprints(visible: boolean): void {
    this.footprintGroup.visible = visible;
  }

  setConfidence(visible: boolean): void {
    this.confidenceGroup.visible = visible;
  }

  setLabels(visible: boolean): void {
    this.labelGroup.visible = visible;
  }

  setDetailVisibility(visible: boolean): void {
    if (this.detailGroup) this.detailGroup.visible = visible;
  }

  private pointInRing(x: number, z: number, ring: [number, number][]): boolean {
    let inside = false;
    for (let index = 0, previous = ring.length - 1; index < ring.length; previous = index, index += 1) {
      const [xi, zi] = ring[index];
      const [xj, zj] = ring[previous];
      if ((zi > z) !== (zj > z) && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
        inside = !inside;
      }
    }
    return inside;
  }

  private isBlocked(x: number, y: number, z: number, skipId: string): boolean {
    if (!this.city) return false;
    for (const building of this.city.buildings) {
      if (building.osm_id === skipId) continue;
      if (
        y >= building.base_y - 0.5 &&
        y <= building.base_y + building.height_m + 0.5 &&
        this.pointInRing(x, z, building.footprint)
      ) {
        return true;
      }
    }
    return false;
  }

  private lineOfSightClear(from: THREE.Vector3, to: THREE.Vector3, skipId: string): boolean {
    for (let step = 1; step <= 12; step += 1) {
      const t = step / 13;
      const x = from.x + (to.x - from.x) * t;
      const y = from.y + (to.y - from.y) * t;
      const z = from.z + (to.z - from.z) * t;
      if (this.isBlocked(x, y, z, skipId)) return false;
    }
    return true;
  }

  private gateCamera(building: Building, target: THREE.Vector3): THREE.Vector3 | null {
    if (!this.city) return null;
    const point = new THREE.Vector2(building.centroid_local[0], building.centroid_local[1]);
    const candidates: { position: THREE.Vector3; error: number }[] = [];
    for (const road of this.city.roads) {
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const a = road.points[index];
        const b = road.points[index + 1];
        const ab = new THREE.Vector2(b[0] - a[0], b[2] - a[2]);
        const ap = new THREE.Vector2(point.x - a[0], point.y - a[2]);
        const length = ab.length();
        if (length < 4) continue;
        const t = Math.max(0, Math.min(1, ap.dot(ab) / ab.lengthSq()));
        const closest = new THREE.Vector2(a[0] + ab.x * t, a[2] + ab.y * t);
        const distanceToRoad = closest.distanceTo(point);
        if (distanceToRoad > 22) continue;
        const direction = ab.clone().normalize();
        for (const sign of [-1, 1]) {
          const metres = 20;
          const t2 = Math.max(0, Math.min(1, t + (sign * metres) / length));
          const travelled = Math.abs(t2 - t) * length;
          const x = a[0] + ab.x * t2;
          const z = a[2] + ab.y * t2;
          const y = a[1] + (b[1] - a[1]) * t2 + 2.2;
          const position = new THREE.Vector3(x, y, z);
          const error =
            Math.abs(travelled - 20)
            + distanceToRoad * 0.5
            + Math.hypot(x - building.centroid_local[0], z - building.centroid_local[1]) * 0.02;
          candidates.push({ position, error });
        }
        void direction;
      }
    }
    candidates.sort((a, b) => a.error - b.error);
    for (const candidate of candidates) {
      const { position } = candidate;
      if (
        !this.isBlocked(position.x, position.y, position.z, building.osm_id) &&
        this.lineOfSightClear(position, target, building.osm_id)
      ) {
        return position;
      }
    }
    return null;
  }

  focusBuilding(building: Building): void {
    const side =
      building.sides.find((candidate) => candidate.main_facade) ??
      building.sides.find((candidate) => candidate.street_facing) ??
      building.sides[0];
    const normal = side
      ? new THREE.Vector3(side.normal[0], 0, side.normal[1]).normalize()
      : new THREE.Vector3(1, 0, 0);
    const tangent = new THREE.Vector3(-normal.z, 0, normal.x);
    const landmark = building.landmark || building.tier === 'A';
    const target = new THREE.Vector3(
      building.centroid_local[0],
      building.base_y + building.height_m * (landmark ? 0.44 : 0.45),
      building.centroid_local[1],
    );
    const lift = landmark
      ? Math.max(18, building.height_m * 0.85)
      : Math.min(14, building.height_m * 0.55);
    const distances = landmark ? [64, 56, 48, 40, 72, 32] : [Math.max(18, building.height_m * 2.1)];
    const offsets = [0, 0.22, -0.22];
    let chosen: THREE.Vector3 | null = null;
    for (const distance of distances) {
      for (const offset of offsets) {
        const candidate = target
          .clone()
          .addScaledVector(normal, distance)
          .addScaledVector(tangent, distance * offset);
        candidate.y = target.y + lift;
        if (
          !this.isBlocked(candidate.x, candidate.y, candidate.z, building.osm_id) &&
          this.lineOfSightClear(candidate, target, building.osm_id)
        ) {
          chosen = candidate;
          break;
        }
      }
      if (chosen) break;
    }
    if (building.archetype === 'city_gate') {
      const gate = this.gateCamera(building, target);
      if (gate) {
        chosen = gate;
      } else {
        let aerial: THREE.Vector3 | null = null;
        for (const vertical of [18, 26, 36]) {
          const candidate = target
            .clone()
            .addScaledVector(normal, 18)
            .addScaledVector(tangent, 12);
          candidate.y = target.y + vertical;
          aerial = candidate;
          if (
            !this.isBlocked(candidate.x, candidate.y, candidate.z, building.osm_id) &&
            this.lineOfSightClear(candidate, target, building.osm_id)
          ) {
            break;
          }
        }
        chosen = aerial;
      }
    }
    if (!chosen) {
      chosen = target.clone().addScaledVector(normal, distances[0]);
      chosen.y = target.y + lift;
    }
    this.camera.position.copy(chosen);
    this.controls.target.copy(target);
    this.controls.update();
  }

  setOverview(city: CityData): void {
    const [minX, minZ, maxX, maxZ] = city.meta.bbox_local;
    const centreX = (minX + maxX) / 2;
    const centreZ = (minZ + maxZ) / 2;
    this.camera.position.set(centreX + 120, 150, centreZ + 150);
    this.controls.target.set(centreX, 8, centreZ);
    this.controls.update();
  }

  setStreetView(): void {
    if (!this.city) return;
    const [minX, minZ, maxX, maxZ] = this.city.meta.pilot_bbox_local;
    const inside = (x: number, z: number): boolean =>
      x >= minX && x <= maxX && z >= minZ && z <= maxZ;
    const candidates: {
      midpoint: THREE.Vector3;
      direction: THREE.Vector3;
      score: number;
    }[] = [];
    for (const road of this.city.roads) {
      if (!road.name || road.points.length < 2 || road.width_m < 5) continue;
      for (let index = 0; index < road.points.length - 1; index += 1) {
        const point = road.points[index];
        const next = road.points[index + 1];
        if (!inside(point[0], point[2]) || !inside(next[0], next[2])) continue;
        const direction = new THREE.Vector3(
          next[0] - point[0],
          0,
          next[2] - point[2],
        );
        const length = direction.length();
        if (length < 4) continue;
        direction.normalize();
        const midpoint = new THREE.Vector3(
          (point[0] + next[0]) / 2,
          (point[1] + next[1]) / 2,
          (point[2] + next[2]) / 2,
        );
        const score =
          Math.hypot(midpoint.x, midpoint.z) +
          (8 - Math.min(8, road.width_m)) * 3 -
          length * 0.15;
        candidates.push({ midpoint, direction, score });
      }
    }
    candidates.sort((a, b) => a.score - b.score);
    for (const candidate of candidates) {
      const eye = candidate.midpoint.clone();
      eye.y += 1.7;
      if (this.isBlocked(eye.x, eye.y, eye.z, '')) continue;
      this.camera.position.copy(eye);
      this.controls.target.set(
        eye.x + candidate.direction.x * 30,
        eye.y + 0.6,
        eye.z + candidate.direction.z * 30,
      );
      this.controls.update();
      return;
    }
  }

  async exportGLB(): Promise<Blob> {
    const exporter = new GLTFExporter();
    const payload = await new Promise<ArrayBuffer>((resolve, reject) => {
      exporter.parse(
        this.cityRoot,
        (result) => {
          if (result instanceof ArrayBuffer) resolve(result);
          else reject(new Error('Unexpected GLB output'));
        },
        (error) => reject(error),
        { binary: true, onlyVisible: true, maxTextureSize: 2048 },
      );
    });
    return new Blob([payload], { type: 'model/gltf-binary' });
  }

  private animate = (): void => {
    requestAnimationFrame(this.animate);
    const now = performance.now();
    const delta = now - this.lastTime;
    this.lastTime = now;
    this.frames += 1;
    this.fpsWindow += delta;
    if (this.detailGroup) {
      const distance = this.camera.position.distanceTo(new THREE.Vector3(this.centre.x, 0, this.centre.z));
      this.detailGroup.visible = distance < 420;
    }
    this.controls.update();
    this.renderer.render(this.scene, this.camera);
    if (this.fpsWindow > 500 && this.statsElements) {
      const fps = (this.frames * 1000) / this.fpsWindow;
      this.statsElements.fps.textContent = formatNumber(fps, 0);
      this.statsElements.calls.textContent = String(this.renderer.info.render.calls);
      this.statsElements.triangles.textContent = formatNumber(this.renderer.info.render.triangles / 1000, 0) + 'k';
      this.frames = 0;
      this.fpsWindow = 0;
    }
  };
}
