import * as THREE from 'three';

/**
 * Optional GLB pipeline for original fighter art. The shipping roster uses the
 * procedural low-poly builders, but this loader is the drop-in path for future
 * hand-authored GLB assets. It normalizes the model to the gameplay height and
 * exposes clips for the animation controller.
 *
 * Usage in a future renderer branch:
 *   const asset = await loadFighterAsset('/assets/characters/nero.glb', 1.85);
 *   scene.add(asset.root);
 *   asset.mixer.clipAction(asset.clips[0]).play();
 *
 * No external models are included with this build. Any added GLB must carry an
 * explicit license compatible with redistribution.
 */
export interface LoadedFighterAsset {
  root: THREE.Group;
  clips: THREE.AnimationClip[];
  mixer: THREE.AnimationMixer;
  dispose(): void;
}

export async function loadFighterAsset(url: string, targetHeight: number): Promise<LoadedFighterAsset> {
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  const loader = new GLTFLoader();
  const gltf = await loader.loadAsync(url);
  const root = new THREE.Group();
  const model = gltf.scene;
  const bounds = new THREE.Box3().setFromObject(model);
  const size = new THREE.Vector3();
  bounds.getSize(size);
  const scale = size.y > 0.0001 ? targetHeight / size.y : 1;
  model.scale.setScalar(scale);
  const scaledBounds = new THREE.Box3().setFromObject(model);
  model.position.y -= scaledBounds.min.y;
  model.position.x -= (scaledBounds.min.x + scaledBounds.max.x) / 2;
  model.traverse((object) => {
    const mesh = object as THREE.Mesh;
    if (mesh.isMesh) {
      mesh.castShadow = true;
      mesh.receiveShadow = false;
    }
  });
  root.add(model);
  const mixer = new THREE.AnimationMixer(model);
  const clips = gltf.animations;
  return {
    root,
    clips,
    mixer,
    dispose: () => {
      mixer.stopAllAction();
      mixer.uncacheRoot(model);
      root.traverse((object) => {
        const mesh = object as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        if (mesh.material) {
          const materialList = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
          for (const material of materialList) material.dispose();
        }
      });
      root.removeFromParent();
    },
  };
}
