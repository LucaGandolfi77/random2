import * as THREE from 'three';
import type { HazardPhase } from '../../core/engine/Simulation';
import type { PlatformState } from '../../physics/platforms';
import type { StageDefinition } from '../../stages/types';

function material(color: number, roughness = 0.75, metalness = 0.1): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });
}

function neon(color: number, intensity = 1.8): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.35,
    metalness: 0.2,
  });
}

function makeBox(
  w: number,
  h: number,
  d: number,
  mat: THREE.Material,
  x = 0,
  y = 0,
  z = 0,
): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
  mesh.position.set(x, y, z);
  mesh.receiveShadow = true;
  mesh.castShadow = false;
  return mesh;
}

function makeCylinder(
  radiusTop: number,
  radiusBottom: number,
  height: number,
  mat: THREE.Material,
  segments = 16,
): THREE.Mesh {
  return new THREE.Mesh(new THREE.CylinderGeometry(radiusTop, radiusBottom, height, segments), mat);
}

function createTextTexture(title: string, subtitle: string, accent: string, background: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 1024;
  canvas.height = 256;
  const context = canvas.getContext('2d');
  if (context) {
    context.fillStyle = background;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.strokeStyle = accent;
    context.lineWidth = 6;
    context.strokeRect(10, 10, canvas.width - 20, canvas.height - 20);
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.shadowColor = accent;
    context.shadowBlur = 30;
    context.fillStyle = '#f7f5ff';
    context.font = '900 92px "Arial Black", "Helvetica Neue", sans-serif';
    context.fillText(title, canvas.width / 2, 108);
    context.shadowBlur = 12;
    context.fillStyle = accent;
    context.font = '700 38px "Helvetica Neue", Arial, sans-serif';
    context.fillText(subtitle, canvas.width / 2, 196);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}

function createGradientTexture(skyTop: number, skyBottom: number): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 32;
  canvas.height = 512;
  const context = canvas.getContext('2d');
  if (context) {
    const gradient = context.createLinearGradient(0, 0, 0, canvas.height);
    gradient.addColorStop(0, `#${skyTop.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(0.65, `#${skyBottom.toString(16).padStart(6, '0')}`);
    gradient.addColorStop(1, '#05010a');
    context.fillStyle = gradient;
    context.fillRect(0, 0, canvas.width, canvas.height);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

interface Animated {
  object: THREE.Object3D;
  update: (time: number, dt: number) => void;
}

export class StageView {
  readonly group = new THREE.Group();
  readonly stage: StageDefinition;
  readonly lights: THREE.Light[] = [];
  private readonly platformGroups = new Map<string, THREE.Group>();
  private readonly animated: Animated[] = [];
  private readonly hazardRing: THREE.Mesh;
  private readonly hazardBeam: THREE.Mesh;
  private readonly hazardLight: THREE.PointLight;
  private particles!: THREE.Points;
  private particleBase!: Float32Array;
  private particleSpeeds!: Float32Array;
  private elapsed = 0;

  constructor(stage: StageDefinition) {
    this.stage = stage;
    const theme = stage.theme;

    this.group.add(new THREE.AmbientLight(0xffffff, 0.35));
    const hemi = new THREE.HemisphereLight(theme.accent2, theme.floor, 0.75);
    this.group.add(hemi);
    this.lights.push(hemi);

    const key = new THREE.DirectionalLight(0xfff3e6, 2.2);
    key.position.set(6, 14, 12);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -16;
    key.shadow.camera.right = 16;
    key.shadow.camera.top = 15;
    key.shadow.camera.bottom = -8;
    key.shadow.camera.near = 1;
    key.shadow.camera.far = 40;
    key.shadow.bias = -0.0008;
    this.group.add(key);
    this.lights.push(key);

    const fill = new THREE.DirectionalLight(0xd9ecff, 0.9);
    fill.position.set(0, 6, 18);
    this.group.add(fill);
    this.lights.push(fill);

    const accentLight = new THREE.PointLight(theme.accent, 45, 35, 2);
    accentLight.position.set(-7, 4.5, 5);
    this.group.add(accentLight);
    this.lights.push(accentLight);
    const accentLight2 = new THREE.PointLight(theme.accent2, 35, 30, 2);
    accentLight2.position.set(7, 5.5, 4);
    this.group.add(accentLight2);
    this.lights.push(accentLight2);

    const backdrop = new THREE.Mesh(
      new THREE.PlaneGeometry(80, 45),
      new THREE.MeshBasicMaterial({ map: createGradientTexture(theme.skyTop, theme.skyBottom), depthWrite: false }),
    );
    backdrop.position.set(0, 8, -28);
    this.group.add(backdrop);

    const haze = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 18),
      new THREE.MeshBasicMaterial({
        color: theme.accent,
        transparent: true,
        opacity: 0.045,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
      }),
    );
    haze.position.set(0, 3, -12);
    this.group.add(haze);

    this.buildPlatforms();
    this.buildCrowd();
    this.buildStageDecor();
    this.buildParticles();

    const hazard = stage.hazard;
    const ringMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4d3d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hazardRing = new THREE.Mesh(
      new THREE.RingGeometry(hazard ? Math.max(0.9, hazard.radius - 0.35) : 2, hazard?.radius ?? 3, 48),
      ringMaterial,
    );
    this.hazardRing.rotation.x = -Math.PI / 2;
    this.hazardRing.position.set(hazard?.x ?? 0, (hazard?.y ?? 0) + 0.06, 0.4);
    this.group.add(this.hazardRing);

    const beamMaterial = new THREE.MeshBasicMaterial({
      color: 0xff4d3d,
      transparent: true,
      opacity: 0,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    this.hazardBeam = new THREE.Mesh(
      new THREE.CylinderGeometry(hazard?.radius ?? 3, (hazard?.radius ?? 3) * 0.35, 9, 28, 1, true),
      beamMaterial,
    );
    this.hazardBeam.position.set(hazard?.x ?? 0, (hazard?.y ?? 0) + 4.5, 0);
    this.group.add(this.hazardBeam);
    this.hazardLight = new THREE.PointLight(0xff4d3d, 0, 24, 2);
    this.hazardLight.position.set(hazard?.x ?? 0, (hazard?.y ?? 0) + 2, 1);
    this.group.add(this.hazardLight);
  }

  private buildPlatforms(): void {
    const theme = this.stage.theme;
    const platformMaterial = material(theme.floor, 0.68, 0.18);
    const platformTop = material(new THREE.Color(theme.floor).offsetHSL(0, 0, 0.07).getHex(), 0.6, 0.2);
    const edgeMaterial = neon(theme.floorEdge, 1.6);
    for (const platform of this.stage.platforms) {
      const group = new THREE.Group();
      const depth = platform.style === 'main' ? 2.6 : 1.5;
      const body = makeBox(platform.width, platform.height, depth, platformMaterial);
      body.position.y = -platform.height / 2;
      body.receiveShadow = true;
      group.add(body);
      const top = makeBox(platform.width - 0.08, 0.06, depth - 0.08, platformTop);
      top.position.y = 0.01;
      group.add(top);
      const frontEdge = makeBox(platform.width, 0.075, 0.09, edgeMaterial);
      frontEdge.position.set(0, -0.015, depth / 2 + 0.02);
      group.add(frontEdge);
      const backEdge = frontEdge.clone();
      backEdge.position.z = -depth / 2 - 0.02;
      group.add(backEdge);
      for (const side of [-1, 1]) {
        const sideEdge = makeBox(0.07, 0.055, depth, edgeMaterial);
        sideEdge.position.set(side * (platform.width / 2), -0.015, 0);
        group.add(sideEdge);
      }
      if (platform.style === 'moving') {
        const glow = makeBox(platform.width * 0.65, 0.025, 0.2, neon(theme.accent2, 2.4));
        glow.position.set(0, -0.05, depth / 2 + 0.06);
        group.add(glow);
      }
      group.position.set(platform.x, platform.y, 0);
      this.group.add(group);
      this.platformGroups.set(platform.id, group);
    }
  }

  private buildCrowd(): void {
    const crowd = new THREE.Group();
    const bodyMaterial = material(0x09070f, 0.9);
    const headGeometry = new THREE.SphereGeometry(0.18, 8, 6);
    for (let i = 0; i < 30; i++) {
      const x = -12 + i * 0.83;
      const z = -6.5 - (i % 3) * 0.8;
      const y = -1.0 - (i % 4) * 0.15;
      const body = makeBox(0.45, 0.7, 0.3, bodyMaterial, x, y, z);
      crowd.add(body);
      const head = new THREE.Mesh(headGeometry, bodyMaterial);
      head.position.set(x, y + 0.42, z);
      crowd.add(head);
      if (i % 5 === 0) {
        const light = new THREE.Mesh(new THREE.SphereGeometry(0.03, 6, 4), neon(this.stage.theme.accent, 2));
        light.position.set(x + 0.1, y + 0.5, z + 0.2);
        crowd.add(light);
      }
    }
    this.group.add(crowd);
    this.animated.push({
      object: crowd,
      update: (time) => {
        crowd.children.forEach((child, index) => {
          if (child instanceof THREE.Mesh && child.geometry instanceof THREE.SphereGeometry) {
            child.position.y = -1.0 - ((index % 4) * 0.15) + Math.sin(time * 2.4 + index) * 0.035;
          }
        });
      },
    });
  }

  private buildStageDecor(): void {
    if (this.stage.id === 'last-festival') this.buildFestival();
    else if (this.stage.id === 'metro-0317') this.buildMetro();
    else this.buildClub();
  }

  private buildFestival(): void {
    const theme = this.stage.theme;
    const dark = material(0x10081c, 0.85);
    const wall = makeBox(25, 8.5, 0.5, dark, 0, 3.8, -5.5);
    this.group.add(wall);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 4),
      new THREE.MeshBasicMaterial({
        map: createTextTexture('THE LAST FESTIVAL', 'MAIN STAGE // 22:40', '#ff2d95', '#0c0216'),
        transparent: false,
      }),
    );
    sign.position.set(0, 6.5, -5.2);
    this.group.add(sign);

    for (let row = 0; row < 3; row++) {
      for (let col = 0; col < 14; col++) {
        const lit = neon(col % 3 === 0 ? theme.accent : theme.accent2, 1.4);
        const panel = makeBox(0.65, 0.28, 0.15, lit, -5.5 + col * 0.85, 1.8 + row * 0.65, -5.15);
        panel.castShadow = false;
        this.group.add(panel);
        if ((row + col) % 6 === 0) {
          this.animated.push({
            object: panel,
            update: (time) => {
              const mat = panel.material as THREE.MeshStandardMaterial;
              mat.emissiveIntensity = 0.6 + Math.abs(Math.sin(time * 3 + col)) * 2.2;
            },
          });
        }
      }
    }

    const trussMaterial = material(0x30303a, 0.4, 0.7);
    for (const x of [-9, -8.2, 8.2, 9]) {
      const tower = makeBox(0.18, 9, 0.18, trussMaterial, x, 4.2, -2.2);
      this.group.add(tower);
    }
    const beam = makeBox(18.4, 0.18, 0.18, trussMaterial, 0, 8.6, -2.2);
    this.group.add(beam);

    const beamColors = [theme.accent, theme.accent2, 0xffd319, 0xff8c42];
    let beamIndex = 0;
    for (const x of [-7, -3.5, 0, 3.5, 7]) {
      const color = beamColors[beamIndex++ % beamColors.length];
      const coneMaterial = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: 0.16,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      });
      const cone = new THREE.Mesh(new THREE.ConeGeometry(1.2, 8, 20, 1, true), coneMaterial);
      cone.position.set(x, 4.6, -1.6);
      this.group.add(cone);
      const spot = new THREE.PointLight(color, 18, 18, 2);
      spot.position.set(x, 3.2, 1);
      this.group.add(spot);
      const phase = x * 0.7;
      this.animated.push({
        object: cone,
        update: (time) => {
          cone.rotation.z = Math.sin(time * 0.7 + phase) * 0.28;
          cone.position.x = x + Math.sin(time * 0.55 + phase) * 1.1;
          spot.position.x = cone.position.x;
          (cone.material as THREE.MeshBasicMaterial).opacity = 0.1 + Math.abs(Math.sin(time * 2.2 + phase)) * 0.12;
        },
      });
    }

    for (const side of [-1, 1]) {
      const stack = new THREE.Group();
      const cabinet = makeBox(1.4, 2.3, 1.1, dark);
      cabinet.position.y = 1.15;
      stack.add(cabinet);
      for (let i = 0; i < 3; i++) {
        const cone = makeCylinder(0.28, 0.34, 0.09, neon(theme.accent2, 0.9), 18);
        cone.rotation.x = Math.PI / 2;
        cone.position.set(0, 0.55 + i * 0.62, 0.58);
        stack.add(cone);
      }
      stack.position.set(side * 10.4, 0, -2.4);
      stack.rotation.y = side * -0.24;
      this.group.add(stack);
      const pulse = new THREE.PointLight(theme.accent2, 14, 10, 2);
      pulse.position.set(side * 10, 1.6, -1.5);
      this.group.add(pulse);
      this.animated.push({
        object: pulse,
        update: (time) => {
          pulse.intensity = 6 + Math.abs(Math.sin(time * 4 + side)) * 18;
        },
      });
    }

    const bannerMaterial = new THREE.MeshBasicMaterial({
      map: createTextTexture('HYPE BRAWL', 'EVERYONE WANTS THE SPOTLIGHT', '#39f6ff', '#07020f'),
    });
    const banner = new THREE.Mesh(new THREE.PlaneGeometry(7, 1.75), bannerMaterial);
    banner.position.set(-9.7, 6.6, 0.8);
    banner.rotation.y = 0.7;
    this.group.add(banner);
  }

  private buildMetro(): void {
    const theme = this.stage.theme;
    const dark = material(0x0a1420, 0.8, 0.3);
    const metal = material(0x2a3c50, 0.35, 0.75);
    const neonMaterial = neon(theme.accent, 2.2);

    const wall = makeBox(24, 7.5, 0.4, dark, 0, 3.2, -6);
    this.group.add(wall);
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.25),
      new THREE.MeshBasicMaterial({
        map: createTextTexture('METRO 03:17', 'NIGHT SERVICE // PLATFORM 4', '#39f6ff', '#030812'),
      }),
    );
    sign.position.set(0, 6.0, -5.7);
    this.group.add(sign);

    for (let i = 0; i < 5; i++) {
      const x = -10 + i * 5;
      const arch = new THREE.Group();
      const left = makeBox(0.4, 6, 0.4, metal, -2.2, 3, 0);
      const right = makeBox(0.4, 6, 0.4, metal, 2.2, 3, 0);
      const top = makeBox(4.8, 0.35, 0.4, metal, 0, 6, 0);
      arch.add(left, right, top);
      const strip = makeBox(3.8, 0.06, 0.08, neonMaterial, 0, 5.75, 0.22);
      arch.add(strip);
      arch.position.set(x, 0, -4.6);
      this.group.add(arch);
    }

    const train = new THREE.Group();
    const trainBody = makeBox(11, 1.8, 0.6, material(0x17283a, 0.5, 0.5), 0, 1.2, 0);
    train.add(trainBody);
    for (let i = 0; i < 8; i++) {
      const window = makeBox(0.9, 0.5, 0.08, neon(i % 2 === 0 ? 0x9be7ff : 0xffd319, 1.6), -4.4 + i * 1.25, 1.45, 0.35);
      train.add(window);
    }
    const trainStrip = makeBox(10.8, 0.08, 0.1, neon(theme.accent2, 1.4), 0, 0.45, 0.36);
    train.add(trainStrip);
    train.position.set(-18, 0, -10);
    this.group.add(train);
    this.animated.push({
      object: train,
      update: (time) => {
        const cycle = (time * 2.4) % 44;
        train.position.x = -22 + cycle;
        train.visible = cycle < 30;
      },
    });

    for (const x of [-8.5, 8.5]) {
      const column = makeCylinder(0.2, 0.24, 7.5, metal, 10);
      column.position.set(x, 3.4, -2.8);
      this.group.add(column);
      const lightBar = makeBox(0.1, 5.5, 0.1, neonMaterial, x, 3.5, -2.6);
      this.group.add(lightBar);
    }

    for (let i = 0; i < 12; i++) {
      const light = makeBox(0.35, 0.06, 0.08, neonMaterial, -10 + i * 1.8, 7.0, -5.6);
      this.group.add(light);
      this.animated.push({
        object: light,
        update: (time) => {
          const mat = light.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.5 + Math.abs(Math.sin(time * 1.7 + i)) * 2;
        },
      });
    }

    const railMaterial = neon(theme.accent2, 0.8);
    for (const side of [-1, 1]) {
      const rail = makeBox(24, 0.05, 0.08, railMaterial, 0, -1.35, -7.4);
      this.group.add(rail);
      rail.position.x = side * 0;
    }

    const fogLight = new THREE.PointLight(theme.accent, 24, 26, 2);
    fogLight.position.set(0, 4, -3);
    this.group.add(fogLight);
    this.animated.push({
      object: fogLight,
      update: (time) => {
        fogLight.intensity = 16 + Math.sin(time * 1.3) * 6;
      },
    });
  }

  private buildClub(): void {
    const theme = this.stage.theme;
    const dark = material(0x12061f, 0.8);
    const metal = material(0x333044, 0.3, 0.8);
    const accent = neon(theme.accent, 2.2);
    const accent2 = neon(theme.accent2, 2.2);

    this.group.add(makeBox(24, 7.5, 0.4, dark, 0, 3.2, -6));
    const sign = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 3.25),
      new THREE.MeshBasicMaterial({
        map: createTextTexture('CLUB VERTICALE', 'FLOOR 9 // NO LAST CALL', '#9d4edd', '#080111'),
      }),
    );
    sign.position.set(0, 6.0, -5.7);
    this.group.add(sign);

    const disco = new THREE.Group();
    const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(0.85, 1), material(0xd9e6ff, 0.15, 0.95));
    disco.add(ball);
    const cable = makeCylinder(0.02, 0.02, 4.2, metal, 6);
    cable.position.y = 2.9;
    disco.add(cable);
    disco.position.set(0, 6.1, -3.5);
    this.group.add(disco);
    this.animated.push({
      object: disco,
      update: (time) => {
        ball.rotation.y = time * 0.6;
        ball.rotation.x = time * 0.22;
      },
    });

    const discoLight = new THREE.PointLight(0xffffff, 30, 24, 2);
    discoLight.position.set(0, 7, -1);
    this.group.add(discoLight);

    const laserGroup = new THREE.Group();
    for (let i = 0; i < 7; i++) {
      const color = i % 2 === 0 ? theme.accent : theme.accent2;
      const laser = makeBox(0.035, 0.035, 11, neon(color, 2.6));
      laser.rotation.y = (i / 7) * Math.PI;
      laser.position.set(0, 5.8, -2.5);
      laserGroup.add(laser);
    }
    this.group.add(laserGroup);
    this.animated.push({
      object: laserGroup,
      update: (time) => {
        laserGroup.rotation.y = time * 0.35;
        laserGroup.rotation.z = Math.sin(time * 0.5) * 0.12;
      },
    });

    for (let i = 0; i < 12; i++) {
      const tile = makeBox(1.1, 0.02, 1.1, neon(i % 2 === 0 ? theme.accent : theme.accent2, 0.7), -6 + (i % 4) * 3.2, 0.28, -4.2 - Math.floor(i / 4) * 1.2);
      this.group.add(tile);
      this.animated.push({
        object: tile,
        update: (time) => {
          const mat = tile.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.2 + Math.abs(Math.sin(time * 2 + i * 0.7)) * 1.6;
        },
      });
    }

    for (const side of [-1, 1]) {
      const speaker = makeBox(1.4, 2.8, 1, dark);
      speaker.position.set(side * 10.5, 1.4, -2.3);
      this.group.add(speaker);
      const ring = makeCylinder(0.5, 0.5, 0.06, accent, 24);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(side * 10.5, 1.7, -1.75);
      this.group.add(ring);
      const light = new THREE.PointLight(theme.accent, 20, 16, 2);
      light.position.set(side * 9.5, 2.4, 0);
      this.group.add(light);
      this.animated.push({
        object: light,
        update: (time) => {
          light.intensity = 8 + Math.abs(Math.sin(time * 3 + side)) * 20;
        },
      });
    }

    for (let i = 0; i < 5; i++) {
      const barLight = makeBox(1.8, 0.12, 0.12, i % 2 === 0 ? accent : accent2, -5 + i * 2.5, 4.6, -5.6);
      this.group.add(barLight);
      this.animated.push({
        object: barLight,
        update: (time) => {
          const mat = barLight.material as THREE.MeshStandardMaterial;
          mat.emissiveIntensity = 0.8 + Math.abs(Math.sin(time * 4 + i)) * 2;
        },
      });
    }
  }

  private buildParticles(): void {
    const count = 180;
    const positions = new Float32Array(count * 3);
    const speeds = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      positions[i * 3] = Math.sin(i * 12.9898) * 14;
      positions[i * 3 + 1] = 1 + ((i * 7.13) % 9);
      positions[i * 3 + 2] = -9 + ((i * 3.71) % 7);
      speeds[i] = 0.1 + ((i * 4.37) % 1) * 0.5;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    this.particleBase = positions.slice();
    this.particleSpeeds = speeds;
    const material = new THREE.PointsMaterial({
      color: this.stage.theme.accent2,
      size: 0.08,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.particles = new THREE.Points(geometry, material);
    this.group.add(this.particles);
  }

  update(platforms: readonly PlatformState[], hazardPhase: HazardPhase, time: number, dt: number): void {
    this.elapsed += dt;
    for (const platform of platforms) {
      const group = this.platformGroups.get(platform.id);
      if (!group) continue;
      group.position.set(platform.curX, platform.curY, 0);
    }

    for (const animated of this.animated) animated.update(time, dt);

    const positions = this.particles.geometry.getAttribute('position') as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const baseY = this.particleBase[i * 3 + 1];
      positions.setY(i, baseY + ((time * this.particleSpeeds[i]) % 9));
      positions.setX(i, this.particleBase[i * 3] + Math.sin(time * 0.3 + i) * 0.4);
    }
    positions.needsUpdate = true;

    const hazard = this.stage.hazard;
    const ringMaterial = this.hazardRing.material as THREE.MeshBasicMaterial;
    const beamMaterial = this.hazardBeam.material as THREE.MeshBasicMaterial;
    if (!hazard || hazardPhase === 'idle') {
      ringMaterial.opacity = 0;
      beamMaterial.opacity = 0;
      this.hazardLight.intensity = 0;
    } else if (hazardPhase === 'warning') {
      const pulse = 0.25 + Math.abs(Math.sin(time * 9)) * 0.45;
      ringMaterial.opacity = pulse;
      ringMaterial.color.setHex(0xffb703);
      beamMaterial.opacity = pulse * 0.1;
      beamMaterial.color.setHex(0xffb703);
      this.hazardLight.color.setHex(0xffb703);
      this.hazardLight.intensity = 4 + pulse * 12;
    } else {
      const pulse = 0.5 + Math.abs(Math.sin(time * 20)) * 0.4;
      ringMaterial.opacity = pulse;
      ringMaterial.color.setHex(0xff2d3d);
      beamMaterial.opacity = 0.18 + pulse * 0.22;
      beamMaterial.color.setHex(0xff2d3d);
      this.hazardLight.color.setHex(0xff2d3d);
      this.hazardLight.intensity = 20 + pulse * 30;
    }
  }

  dispose(): void {
    const materials = new Set<THREE.Material>();
    const geometries = new Set<THREE.BufferGeometry>();
    const textures = new Set<THREE.Texture>();
    this.group.traverse((object) => {
      const mesh = object as THREE.Mesh;
      if (mesh.geometry) geometries.add(mesh.geometry);
      if (mesh.material) {
        const list = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        for (const entry of list) {
          materials.add(entry);
          const withMap = entry as THREE.MeshStandardMaterial;
          if (withMap.map) textures.add(withMap.map);
        }
      }
    });
    this.group.removeFromParent();
    for (const geometry of geometries) geometry.dispose();
    for (const material of materials) material.dispose();
    for (const texture of textures) texture.dispose();
  }
}
