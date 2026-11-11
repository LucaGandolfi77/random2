import * as THREE from 'three';

/**
 * Il barista non si vede: esiste solo come voce dietro la serranda.
 * Questa presenza è una sagoma scura con una lama di luce calda.
 */
export function createBaristaPresence(): THREE.Group {
  const group = new THREE.Group();
  group.name = 'barista-presence';

  const silhouetteMaterial = new THREE.MeshBasicMaterial({
    color: 0x090806,
    transparent: true,
    opacity: 0.88,
  });
  const head = new THREE.Mesh(new THREE.CircleGeometry(0.13, 7), silhouetteMaterial);
  head.position.set(0, 1.62, 0.02);
  const body = new THREE.Mesh(new THREE.CircleGeometry(0.29, 7), silhouetteMaterial);
  body.scale.set(0.82, 1.25, 1);
  body.position.set(0, 1.18, 0.02);
  group.add(head, body);

  const slitMaterial = new THREE.MeshBasicMaterial({
    color: 0xf0b06d,
    transparent: true,
    opacity: 0.75,
  });
  const slit = new THREE.Mesh(new THREE.PlaneGeometry(1.4, 0.025), slitMaterial);
  slit.position.set(0, 1.32, 0.035);
  group.add(slit);

  return group;
}
