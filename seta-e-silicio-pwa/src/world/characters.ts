import * as THREE from "three";
import type { CharacterId } from "../data/types";

const mat = (color: number, roughness = 0.85, metalness = 0) =>
  new THREE.MeshStandardMaterial({ color, roughness, metalness, flatShading: true });

const glow = (color: number, intensity = 1.2) =>
  new THREE.MeshStandardMaterial({
    color,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.3,
    metalness: 0.1,
    flatShading: true
  });

function addMesh(
  parent: THREE.Object3D,
  geometry: THREE.BufferGeometry,
  material: THREE.Material,
  x = 0,
  y = 0,
  z = 0
): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(x, y, z);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function addFace(head: THREE.Object3D, y = 0.04, z = 0.165): void {
  const eye = new THREE.MeshStandardMaterial({ color: 0x201715, roughness: 0.8 });
  addMesh(head, new THREE.BoxGeometry(0.028, 0.022, 0.018), eye, -0.058, y, z);
  addMesh(head, new THREE.BoxGeometry(0.028, 0.022, 0.018), eye, 0.058, y, z);
  addMesh(head, new THREE.BoxGeometry(0.055, 0.012, 0.012), eye, 0, y - 0.055, z);
}

export class CharacterRig {
  readonly group = new THREE.Group();
  readonly head: THREE.Group;
  readonly body: THREE.Group;
  readonly leftArm: THREE.Group;
  readonly rightArm: THREE.Group;
  readonly leftLeg: THREE.Group;
  readonly rightLeg: THREE.Group;
  readonly id: CharacterId;
  private readonly phase: number;
  private readonly baseY: number;

  constructor(id: CharacterId) {
    this.id = id;
    this.phase = Math.random() * Math.PI * 2;
    this.baseY = 0;
    this.group.name = `character-${id}`;

    const torso = new THREE.Group();
    this.group.add(torso);
    this.body = torso;

    this.head = new THREE.Group();
    this.head.position.y = 1.46;
    this.group.add(this.head);

    this.leftArm = new THREE.Group();
    this.leftArm.position.set(-0.3, 1.26, 0);
    this.group.add(this.leftArm);
    this.rightArm = new THREE.Group();
    this.rightArm.position.set(0.3, 1.26, 0);
    this.group.add(this.rightArm);

    this.leftLeg = new THREE.Group();
    this.leftLeg.position.set(-0.12, 0.78, 0);
    this.group.add(this.leftLeg);
    this.rightLeg = new THREE.Group();
    this.rightLeg.position.set(0.12, 0.78, 0);
    this.group.add(this.rightLeg);

    const skin = mat(0xe8c6a6);
    const hair = mat(0x191c20);

    switch (id) {
      case "mei": {
        addMesh(torso, new THREE.CylinderGeometry(0.24, 0.31, 0.62, 6), mat(0x2f6f6b), 0, 1.06, 0);
        addMesh(torso, new THREE.BoxGeometry(0.46, 0.5, 0.28), mat(0x397f78), 0, 1.1, 0);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.19, 0), skin, 0, 0.05, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.2, 8, 6), hair, 0, 0.14, -0.01);
        const ponytail = addMesh(this.head, new THREE.CylinderGeometry(0.08, 0.12, 0.44, 6), hair, 0.02, -0.1, 0.19);
        ponytail.rotation.x = 0.35;
        addMesh(this.head, new THREE.BoxGeometry(0.12, 0.03, 0.04), glow(0xf2c15e, 0.4), 0, 0.08, 0.18);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.07, 0.09, 0.6, 6), mat(0x2f6f6b), 0, -0.26, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.07, 0.09, 0.6, 6), mat(0x2f6f6b), 0, -0.26, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.08, 0.1, 0.74, 6), mat(0x273b4a), 0, -0.35, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.08, 0.1, 0.74, 6), mat(0x273b4a), 0, -0.35, 0);
        addFace(this.head);
        break;
      }
      case "nainai": {
        addMesh(torso, new THREE.CylinderGeometry(0.26, 0.34, 0.64, 6), mat(0x355b72), 0, 1.02, 0);
        addMesh(torso, new THREE.BoxGeometry(0.5, 0.54, 0.3), mat(0x2f4f63), 0, 1.07, 0);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.17, 0), skin, 0, 0.03, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.18, 8, 6), mat(0xd8d5cc), 0, 0.12, -0.02);
        const bun = addMesh(this.head, new THREE.SphereGeometry(0.11, 8, 6), mat(0xe4e0d6), 0.02, 0.26, -0.08);
        bun.scale.set(1, 0.8, 1);
        addMesh(this.head, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), mat(0xc7a66a), 0.12, 0.22, -0.05);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.065, 0.085, 0.56, 6), mat(0x355b72), 0, -0.25, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.065, 0.085, 0.56, 6), mat(0x355b72), 0, -0.25, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x26323b), 0, -0.32, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x26323b), 0, -0.32, 0);
        addFace(this.head, 0.03, 0.16);
        break;
      }
      case "hao7": {
        addMesh(torso, new THREE.CylinderGeometry(0.22, 0.28, 0.66, 8), mat(0xd7e2e6, 0.35, 0.4), 0, 1.08, 0);
        addMesh(torso, new THREE.BoxGeometry(0.38, 0.24, 0.26), mat(0xb9c8ce, 0.4, 0.3), 0, 1.2, 0.02);
        const ring = addMesh(torso, new THREE.TorusGeometry(0.12, 0.025, 6, 16), glow(0x66e0d0, 2), 0, 1.16, 0.18);
        ring.rotation.x = 0.05;
        addMesh(this.head, new THREE.SphereGeometry(0.19, 10, 8), mat(0xdce9ed, 0.3, 0.3), 0, 0.08, 0);
        addMesh(this.head, new THREE.BoxGeometry(0.26, 0.09, 0.06), glow(0x66e0d0, 2.2), 0, 0.1, 0.17);
        addMesh(this.head, new THREE.CylinderGeometry(0.012, 0.012, 0.3, 5), mat(0xb9c8ce), 0, 0.32, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.035, 6, 4), glow(0xf2c15e, 2), 0, 0.5, 0);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), mat(0xc8d6da, 0.35, 0.4), 0, -0.26, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.06, 0.08, 0.6, 6), mat(0xc8d6da, 0.35, 0.4), 0, -0.26, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.07, 0.09, 0.7, 6), mat(0xaebfc4, 0.35, 0.4), 0, -0.33, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.07, 0.09, 0.7, 6), mat(0xaebfc4, 0.35, 0.4), 0, -0.33, 0);
        break;
      }
      case "chen": {
        addMesh(torso, new THREE.CylinderGeometry(0.27, 0.35, 0.62, 6), mat(0x6f6554), 0, 1.03, 0);
        addMesh(torso, new THREE.BoxGeometry(0.52, 0.56, 0.3), mat(0x7d735f), 0, 1.08, 0);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.18, 0), skin, 0, 0.04, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.18, 8, 6), mat(0xd8d4c7), 0, 0.14, -0.02);
        addMesh(this.head, new THREE.ConeGeometry(0.1, 0.34, 6), mat(0xe6e1d3), 0, -0.14, 0.13).rotation.x = 0.18;
        addMesh(this.head, new THREE.BoxGeometry(0.12, 0.025, 0.04), glow(0xf1d79a, 0.3), 0, 0.04, 0.17);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.07, 0.09, 0.58, 6), mat(0x6f6554), 0, -0.25, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.07, 0.09, 0.58, 6), mat(0x6f6554), 0, -0.25, 0);
        const exo = addMesh(this.rightArm, new THREE.TorusGeometry(0.1, 0.025, 5, 12), mat(0xc9a26b, 0.4, 0.5), 0, -0.2, 0);
        exo.rotation.y = Math.PI / 2;
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.66, 6), mat(0x3c3933), 0, -0.31, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.66, 6), mat(0x3c3933), 0, -0.31, 0);
        addFace(this.head, 0.02, 0.16);
        break;
      }
      case "feng": {
        addMesh(torso, new THREE.CylinderGeometry(0.23, 0.3, 0.6, 6), mat(0xd9b53d), 0, 1.03, 0);
        addMesh(torso, new THREE.BoxGeometry(0.46, 0.5, 0.28), mat(0xe3c04f), 0, 1.08, 0);
        addMesh(torso, new THREE.BoxGeometry(0.34, 0.18, 0.12), mat(0x2f3a44), 0, 1.18, 0.19);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.18, 0), skin, 0, 0.05, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.19, 8, 6), hair, 0, 0.14, -0.02);
        addMesh(this.head, new THREE.BoxGeometry(0.14, 0.03, 0.04), glow(0x6bd0c4, 0.6), 0, 0.06, 0.17);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.065, 0.085, 0.56, 6), mat(0xd9b53d), 0, -0.25, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.065, 0.085, 0.56, 6), mat(0xd9b53d), 0, -0.25, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x2d3942), 0, -0.32, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x2d3942), 0, -0.32, 0);
        addFace(this.head, 0.04, 0.17);
        break;
      }
      case "shen": {
        addMesh(torso, new THREE.CylinderGeometry(0.24, 0.31, 0.64, 6), mat(0xe6ece7), 0, 1.04, 0);
        addMesh(torso, new THREE.BoxGeometry(0.48, 0.54, 0.3), mat(0xe8f0eb), 0, 1.08, 0);
        addMesh(torso, new THREE.BoxGeometry(0.18, 0.26, 0.02), mat(0x73b7a8), 0, 1.1, 0.17);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.18, 0), skin, 0, 0.04, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.19, 8, 6), hair, 0, 0.14, -0.02);
        addMesh(this.head, new THREE.BoxGeometry(0.24, 0.03, 0.05), glow(0x73b7a8, 0.5), 0, 0.06, 0.17);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.065, 0.085, 0.58, 6), mat(0xe6ece7), 0, -0.25, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.065, 0.085, 0.58, 6), mat(0xe6ece7), 0, -0.25, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x3c4f55), 0, -0.32, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x3c4f55), 0, -0.32, 0);
        addFace(this.head, 0.03, 0.16);
        break;
      }
      case "zhou": {
        addMesh(torso, new THREE.CylinderGeometry(0.25, 0.33, 0.64, 6), mat(0x39465a), 0, 1.04, 0);
        addMesh(torso, new THREE.BoxGeometry(0.5, 0.56, 0.3), mat(0x43546a), 0, 1.08, 0);
        addMesh(torso, new THREE.BoxGeometry(0.16, 0.34, 0.02), mat(0xb8c9ff), 0, 1.1, 0.17);
        addMesh(this.head, new THREE.DodecahedronGeometry(0.18, 0), skin, 0, 0.04, 0);
        addMesh(this.head, new THREE.SphereGeometry(0.19, 8, 6), mat(0x2b2f36), 0, 0.14, -0.02);
        addMesh(this.head, new THREE.BoxGeometry(0.24, 0.03, 0.05), glow(0xb8c9ff, 0.5), 0, 0.06, 0.17);
        addMesh(this.leftArm, new THREE.CylinderGeometry(0.07, 0.09, 0.58, 6), mat(0x39465a), 0, -0.25, 0);
        addMesh(this.rightArm, new THREE.CylinderGeometry(0.07, 0.09, 0.58, 6), mat(0x39465a), 0, -0.25, 0);
        addMesh(this.leftLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x252c35), 0, -0.32, 0);
        addMesh(this.rightLeg, new THREE.CylinderGeometry(0.075, 0.095, 0.68, 6), mat(0x252c35), 0, -0.32, 0);
        addFace(this.head, 0.03, 0.16);
        break;
      }
      case "narrator":
        break;
    }

    this.group.scale.setScalar(id === "nainai" ? 0.94 : id === "hao7" ? 1.04 : 1);
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.castShadow = true;
        child.receiveShadow = true;
      }
    });
  }

  setPosition(x: number, z: number): void {
    this.group.position.set(x, this.baseY, z);
  }

  setRotation(y: number): void {
    this.group.rotation.y = y;
  }

  update(dt: number, moving: boolean, time: number): void {
    const swing = moving ? Math.sin(time * 9 + this.phase) * 0.55 : Math.sin(time * 1.6 + this.phase) * 0.04;
    const counter = moving ? -swing : -swing * 0.5;
    this.leftLeg.rotation.x = swing;
    this.rightLeg.rotation.x = counter;
    this.leftArm.rotation.x = counter * 0.7;
    this.rightArm.rotation.x = swing * 0.7;
    this.body.position.y = Math.sin(time * 1.8 + this.phase) * (moving ? 0.015 : 0.008);
    this.head.rotation.y = Math.sin(time * 0.55 + this.phase) * 0.08;
    this.group.position.y = this.baseY + (moving ? Math.abs(Math.sin(time * 9 + this.phase)) * 0.025 : 0);
    if (dt < 0) return;
  }

  lookAt(targetX: number, targetZ: number): void {
    const dx = targetX - this.group.position.x;
    const dz = targetZ - this.group.position.z;
    if (Math.abs(dx) + Math.abs(dz) > 0.001) {
      this.group.rotation.y = Math.atan2(dx, dz);
    }
  }

  dispose(): void {
    this.group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const material = child.material;
        if (Array.isArray(material)) material.forEach((entry) => entry.dispose());
        else material.dispose();
      }
    });
  }
}

export function createCharacter(id: CharacterId): CharacterRig {
  return new CharacterRig(id);
}
