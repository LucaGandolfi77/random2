import * as THREE from 'three';

export type CharacterState = 'idle' | 'walk' | 'run' | 'jump' | 'fall' | 'fly';

export interface CharacterUpdate {
  state: CharacterState;
  speed: number;
  dt: number;
}

function damp(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

function material(colour: string, roughness = 0.82): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: colour,
    roughness,
    metalness: 0.04,
  });
}

function blobShadowTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('2D canvas unavailable');
  const gradient = context.createRadialGradient(64, 64, 8, 64, 64, 62);
  gradient.addColorStop(0, 'rgba(0,0,0,0.7)');
  gradient.addColorStop(0.55, 'rgba(0,0,0,0.32)');
  gradient.addColorStop(1, 'rgba(0,0,0,0)');
  context.fillStyle = gradient;
  context.fillRect(0, 0, 128, 128);
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  return texture;
}

/**
 * Small procedural explorer. Faces +Z, so the controller can use
 * `atan2(direction.x, direction.z)` for heading.
 */
export class CharacterRig {
  readonly root = new THREE.Group();
  readonly shadow: THREE.Mesh;

  private readonly body = new THREE.Group();
  private readonly leftArm = new THREE.Group();
  private readonly rightArm = new THREE.Group();
  private readonly leftLeg = new THREE.Group();
  private readonly rightLeg = new THREE.Group();
  private phase = 0;
  private time = 0;

  constructor() {
    this.root.name = 'player-character';
    this.root.add(this.body);

    const jacket = material('#c1874b');
    const jacketDark = material('#9b6736');
    const trousers = material('#33414d');
    const boots = material('#241f1c', 0.9);
    const skin = material('#d9a77c', 0.75);
    const hair = material('#3c2d24', 0.9);
    const leather = material('#5b4632', 0.88);
    const scarf = material('#8f3d2f', 0.9);

    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.44, 0.56, 0.26), jacket);
    torso.position.y = 1.16;
    this.body.add(torso);

    const belt = new THREE.Mesh(new THREE.BoxGeometry(0.43, 0.08, 0.27), jacketDark);
    belt.position.y = 0.88;
    this.body.add(belt);

    const scarfMesh = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.09, 0.29), scarf);
    scarfMesh.position.y = 1.41;
    this.body.add(scarfMesh);

    const neck = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.07, 0.09, 8), skin);
    neck.position.y = 1.47;
    this.body.add(neck);

    const head = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 10), skin);
    head.position.y = 1.59;
    head.scale.y = 1.08;
    this.body.add(head);

    const hairMesh = new THREE.Mesh(new THREE.SphereGeometry(0.136, 10, 8), hair);
    hairMesh.position.set(0, 1.63, -0.005);
    hairMesh.scale.set(1.01, 0.72, 1.02);
    this.body.add(hairMesh);

    const backpack = new THREE.Mesh(new THREE.BoxGeometry(0.31, 0.38, 0.16), leather);
    backpack.position.set(0, 1.16, -0.2);
    this.body.add(backpack);

    for (const side of [-1, 1]) {
      const strap = new THREE.Mesh(new THREE.BoxGeometry(0.035, 0.44, 0.02), leather);
      strap.position.set(side * 0.12, 1.16, 0.135);
      this.body.add(strap);
    }

    this.leftLeg.position.set(-0.11, 0.92, 0);
    this.rightLeg.position.set(0.11, 0.92, 0);
    for (const leg of [this.leftLeg, this.rightLeg]) {
      const shin = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.84, 0.22), trousers);
      shin.position.y = -0.42;
      leg.add(shin);
      const boot = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.13, 0.29), boots);
      boot.position.set(0, -0.86, 0.035);
      leg.add(boot);
    }
    this.body.add(this.leftLeg, this.rightLeg);

    this.leftArm.position.set(-0.29, 1.36, 0);
    this.rightArm.position.set(0.29, 1.36, 0);
    for (const arm of [this.leftArm, this.rightArm]) {
      const sleeve = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.16), jacket);
      sleeve.position.y = -0.3;
      arm.add(sleeve);
      const hand = new THREE.Mesh(new THREE.SphereGeometry(0.072, 8, 6), skin);
      hand.position.y = -0.63;
      arm.add(hand);
    }
    this.body.add(this.leftArm, this.rightArm);

    this.root.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = false;
        object.receiveShadow = false;
      }
    });

    const shadowMaterial = new THREE.MeshBasicMaterial({
      map: blobShadowTexture(),
      transparent: true,
      opacity: 0.34,
      depthWrite: false,
      color: 0x000000,
      side: THREE.DoubleSide,
    });
    const shadowGeometry = new THREE.CircleGeometry(0.62, 24);
    shadowGeometry.rotateX(-Math.PI / 2);
    this.shadow = new THREE.Mesh(shadowGeometry, shadowMaterial);
    this.shadow.renderOrder = 1;
    this.shadow.name = 'player-shadow';
  }

  setVisible(visible: boolean): void {
    this.root.visible = visible;
    this.shadow.visible = visible;
  }

  update(update: CharacterUpdate): void {
    const { state, speed, dt } = update;
    this.time += dt;
    const running = state === 'run';
    const airborne = state === 'jump' || state === 'fall';
    const flying = state === 'fly';

    if (state === 'walk' || state === 'run') {
      this.phase += dt * (4.1 + Math.min(5.4, speed) * 1.15);
    } else if (this.phase !== 0) {
      this.phase += dt * 2;
    }

    const swing =
      state === 'walk' || state === 'run' ? Math.sin(this.phase) * (running ? 0.92 : 0.55) : 0;
    const leftLegTarget = airborne ? 0.32 : flying ? -0.22 : swing;
    const rightLegTarget = airborne ? -0.22 : flying ? -0.06 : -swing;
    const leftArmTarget = airborne ? -0.9 : flying ? -0.25 : -swing * 0.7;
    const rightArmTarget = airborne ? -0.9 : flying ? -0.25 : swing * 0.7;
    const leftArmOut = airborne ? -0.55 : flying ? -0.88 : 0;
    const rightArmOut = airborne ? 0.55 : flying ? 0.88 : 0;

    this.leftLeg.rotation.x = damp(this.leftLeg.rotation.x, leftLegTarget, 13, dt);
    this.rightLeg.rotation.x = damp(this.rightLeg.rotation.x, rightLegTarget, 13, dt);
    this.leftArm.rotation.x = damp(this.leftArm.rotation.x, leftArmTarget, 13, dt);
    this.rightArm.rotation.x = damp(this.rightArm.rotation.x, rightArmTarget, 13, dt);
    this.leftArm.rotation.z = damp(this.leftArm.rotation.z, leftArmOut, 10, dt);
    this.rightArm.rotation.z = damp(this.rightArm.rotation.z, rightArmOut, 10, dt);

    const bodyTiltTarget = flying ? 0.38 : airborne ? 0.1 : running ? 0.08 : 0;
    this.body.rotation.x = damp(this.body.rotation.x, bodyTiltTarget, 8, dt);

    let bob = Math.sin(this.time * 1.5) * 0.009;
    if (state === 'walk') bob = Math.abs(Math.sin(this.phase)) * 0.032;
    if (state === 'run') bob = Math.abs(Math.sin(this.phase)) * 0.055;
    if (flying) bob = Math.sin(this.time * 2.4) * 0.045;
    this.body.position.y = damp(this.body.position.y, bob, 14, dt);
  }
}
