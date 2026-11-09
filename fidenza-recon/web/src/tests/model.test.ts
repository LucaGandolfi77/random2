import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { MeshBuilder, basisMatrix, hashString, mixColor, shade } from '../utils';

describe('MeshBuilder', () => {
  it('creates two triangles for a quad with an upward normal', () => {
    const builder = new MeshBuilder();
    builder.addQuad(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(0, 0, 1),
      new THREE.Vector3(1, 0, 1),
      new THREE.Vector3(1, 0, 0),
    );
    const geometry = builder.build();
    expect(geometry.getAttribute('position').count).toBe(6);
    const normals = geometry.getAttribute('normal');
    expect(normals.getY(0)).toBeGreaterThan(0.99);
  });
});

describe('geometry helpers', () => {
  it('builds a right-handed wall basis', () => {
    const matrix = basisMatrix(
      new THREE.Vector3(0, 0, 0),
      new THREE.Vector3(1, 0, 0),
      new THREE.Vector3(0, 0, 1),
    );
    const x = new THREE.Vector3().setFromMatrixColumn(matrix, 0);
    const y = new THREE.Vector3().setFromMatrixColumn(matrix, 1);
    const z = new THREE.Vector3().setFromMatrixColumn(matrix, 2);
    expect(new THREE.Vector3().crossVectors(x, y).dot(z)).toBeCloseTo(1, 5);
  });

  it('has deterministic colour helpers', () => {
    expect(shade('#808080', 0.5)).toBe('#404040');
    expect(mixColor('#000000', '#ffffff', 0.5)).toBe('#808080');
    expect(hashString('way/1')).toBe(hashString('way/1'));
    expect(hashString('way/1')).not.toBe(hashString('way/2'));
  });
});
