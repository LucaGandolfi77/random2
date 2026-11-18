import * as THREE from 'three';
import { CONFIG } from '../game/GameConfig';
import type { Interactable, World } from '../world/Interactable';

export class InteractionSystem {
  hovered: Interactable | null = null;
  private ray = new THREE.Raycaster();
  private objects: THREE.Object3D[];

  constructor(private camera: THREE.PerspectiveCamera, private world: World) {
    this.objects = world.interactables.map((i) => i.object);
  }

  update() {
    this.ray.setFromCamera(new THREE.Vector2(0, 0), this.camera);
    this.ray.far = CONFIG.interactionRange;
    const hits = this.ray.intersectObjects(this.objects, false);
    let found: Interactable | null = null;
    for (const h of hits) {
      let o: THREE.Object3D | null = h.object;
      while (o && !o.userData.interactableId) o = o.parent;
      if (!o) continue;
      found = this.world.interactables.find((i) => i.id === o!.userData.interactableId) ?? null;
      if (found) break;
    }
    this.hovered = found;
  }
}
