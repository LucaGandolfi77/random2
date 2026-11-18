/**
 * Geometrie di dettaglio voxel 1 m.
 *
 * Non creano materiali: restituiscono BoxGeometry che il World inserisce nei
 * bucket per blocco. Le texture vengono assegnate dal World con UV da 1 m.
 */

import * as THREE from 'three';

export function voxelBox(w, h, d, x = 0, y = 0, z = 0, ry = 0) {
  const geo = new THREE.BoxGeometry(Math.max(0.02, w), Math.max(0.02, h), Math.max(0.02, d));
  if (ry) geo.rotateY(ry);
  geo.translate(x, y, z);
  return geo;
}

export function voxelGableEnd(width, height, thickness = 0.18) {
  const half = Math.max(0.3, width / 2);
  const shape = new THREE.Shape();
  shape.moveTo(-half, 0);
  shape.lineTo(half, 0);
  shape.lineTo(0, height);
  shape.closePath();
  const geo = new THREE.ExtrudeGeometry(shape, {
    depth: thickness,
    bevelEnabled: false,
    steps: 1,
    curveSegments: 1
  });
  geo.translate(0, 0, -thickness / 2);
  return geo;
}

/**
 * Gradoni di un tetto a due falde, con sporgenza.
 * Restituisce box allineati all'asse del tetto (rotazione `angle`).
 */
export function roofStepBoxes({
  span,
  length,
  ridgeHeight,
  baseY,
  overhang = 1,
  angle = 0,
  centerX = 0,
  centerZ = 0,
  minWidth = 0.9
}) {
  const steps = Math.max(2, Math.min(12, Math.ceil(ridgeHeight / 1)));
  const stepHeight = ridgeHeight / steps;
  const baseWidth = Math.max(2, span + overhang * 2);
  const boxes = [];
  for (let k = 0; k < steps; k++) {
    const shrink = (k / steps) * baseWidth * 0.88;
    const width = Math.max(minWidth, baseWidth - shrink);
    boxes.push({
      w: width,
      h: stepHeight,
      d: Math.max(2, length + overhang * 2),
      x: centerX,
      y: baseY + k * stepHeight + stepHeight * 0.5,
      z: centerZ,
      ry: angle
    });
  }
  return { boxes, stepHeight, steps };
}

export function roofRafterBoxes({
  span,
  length,
  baseY,
  overhang = 1,
  angle = 0,
  centerX = 0,
  centerZ = 0,
  thickness = 0.16,
  height = 0.22
}) {
  const boxes = [];
  const count = Math.max(2, Math.round((length + overhang * 2) / 2));
  for (let i = 0; i < count; i++) {
    const t = count === 1 ? 0.5 : i / (count - 1);
    const along = (t - 0.5) * (length + overhang * 2);
    const dx = Math.sin(angle) * along;
    const dz = Math.cos(angle) * along;
    // Trave perpendicolare alla gronda, leggermente inclinata.
    const geo = new THREE.BoxGeometry(span + overhang * 2, height, thickness);
    geo.rotateY(angle);
    geo.translate(centerX + dx, baseY + height / 2, centerZ + dz);
    boxes.push(geo);
  }
  return boxes;
}
