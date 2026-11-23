import * as THREE from 'three';

/* Fidenza sits on the Po plain, so the terrain is deliberately flat. The
   city itself supplies roads, squares and green areas. */
export function createGround(scene: THREE.Scene): THREE.Mesh {
  const texture = makeGroundTexture();
  const material = new THREE.MeshLambertMaterial({ map: texture, color: 0xffffff });
  const geometry = new THREE.PlaneGeometry(2800, 3000);
  geometry.rotateX(-Math.PI / 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(200, 0, 350);
  mesh.receiveShadow = true;
  scene.add(mesh);
  return mesh;
}

function makeGroundTexture(): THREE.CanvasTexture {
  const size = 512;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D unavailable');

  ctx.fillStyle = '#cfc09c';
  ctx.fillRect(0, 0, size, size);

  let seed = 20240517;
  const random = (): number => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 0xffffffff;
  };

  for (let i = 0; i < 80; i++) {
    const radius = 18 + random() * 70;
    ctx.fillStyle = random() > 0.5 ? 'rgba(142,132,94,0.06)' : 'rgba(255,248,225,0.06)';
    ctx.beginPath();
    ctx.arc(random() * size, random() * size, radius, 0, Math.PI * 2);
    ctx.fill();
  }

  for (let i = 0; i < 10000; i++) {
    const shade = random();
    ctx.fillStyle =
      shade > 0.72
        ? 'rgba(255,250,232,0.32)'
        : shade > 0.42
          ? 'rgba(146,128,92,0.2)'
          : 'rgba(86,76,58,0.16)';
    const dot = 0.6 + random() * 1.7;
    ctx.fillRect(random() * size, random() * size, dot, dot);
  }

  for (let i = 0; i < 18; i++) {
    ctx.strokeStyle = 'rgba(112,98,72,0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    let x = random() * size;
    let y = random() * size;
    ctx.moveTo(x, y);
    for (let step = 0; step < 6; step++) {
      x += (random() - 0.5) * 30;
      y += (random() - 0.5) * 30;
      ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(300, 320);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return texture;
}
