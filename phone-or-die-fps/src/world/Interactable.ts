import * as THREE from 'three';

export type InteractKind =
  | 'door' | 'window' | 'curtain' | 'switch' | 'charger' | 'powerbank'
  | 'flashlight' | 'photo' | 'tv' | 'laptop' | 'drawer' | 'medicine'
  | 'security' | 'key' | 'note' | 'outlet';

export interface DoorData {
  pivot: THREE.Group;
  open: boolean;
  locked: boolean;
  collider: THREE.Box3;
  closedCenter: THREE.Vector3;
  baseAngle: number;
}

export interface Interactable {
  id: string;
  kind: InteractKind;
  label: string;
  object: THREE.Object3D;
  used?: boolean;
  data?: Partial<DoorData> & Record<string, unknown>;
}

export interface RoomInfo {
  name: string;
  center: THREE.Vector3;
  radius: number;
}

export interface World {
  group: THREE.Group;
  colliders: THREE.Box3[];
  interactables: Interactable[];
  navNodes: THREE.Vector3[];
  navEdges: number[][];
  rooms: RoomInfo[];
  bounds: THREE.Box3;
  shadowsSpawn: THREE.Vector3[];
}
