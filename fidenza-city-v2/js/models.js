import * as THREE from 'three';

const mat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, ...opts });
const flat = (color, opts = {}) => new THREE.MeshLambertMaterial({ color, flatShading: true, ...opts });

function box(w, h, d, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function cyl(rt, rb, h, color, x = 0, y = 0, z = 0, seg = 10, opts = {}) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

function sphere(r, color, x = 0, y = 0, z = 0, opts = {}) {
  const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat(color, opts));
  m.position.set(x, y, z);
  m.castShadow = true;
  return m;
}

function wheel(r, width, color = '#242424') {
  const pivot = new THREE.Group();
  pivot.userData.wheel = true;
  pivot.userData.radius = r;
  const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, width, 12), mat(color));
  m.rotation.z = Math.PI / 2;
  m.castShadow = true;
  pivot.add(m);
  return pivot;
}

export function makeCar({ color = '#c2684b', taxi = false, ambulance = false, parked = false } = {}) {
  const g = new THREE.Group();
  const bodyColor = ambulance ? '#f1ede2' : color;
  const body = box(1.8, 0.58, 4.05, bodyColor, 0, 0.62, 0);
  g.add(body);
  const hood = box(1.72, 0.18, 1.1, ambulance ? '#f1ede2' : bodyColor, 0, 0.95, 1.45);
  g.add(hood);
  const cabin = box(1.62, 0.62, 1.95, '#d9e2e0', 0, 1.18, -0.15);
  cabin.material = new THREE.MeshLambertMaterial({ color: '#c9d8d9', transparent: true, opacity: 0.92 });
  g.add(cabin);
  const roof = box(1.6, 0.16, 1.7, bodyColor, 0, 1.53, -0.15);
  g.add(roof);
  // finestrini
  g.add(box(1.64, 0.42, 0.04, '#2e3b40', 0, 1.22, 0.83));
  g.add(box(1.64, 0.42, 0.04, '#2e3b40', 0, 1.22, -1.13));
  g.add(box(0.04, 0.42, 1.3, '#2e3b40', 0.82, 1.22, -0.15));
  g.add(box(0.04, 0.42, 1.3, '#2e3b40', -0.82, 1.22, -0.15));
  // ruote
  for (const x of [-0.88, 0.88]) {
    for (const z of [-1.3, 1.3]) {
      const w = wheel(0.34, 0.2);
      w.position.set(x, 0.36, z);
      g.add(w);
    }
  }
  // fari
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff2bd' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#b33b2b' });
  for (const x of [-0.58, 0.58]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.18, 0.05), headMat);
    h.position.set(x, 0.72, 2.05);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.24, 0.14, 0.05), tailMat);
    t.position.set(x, 0.7, -2.05);
    g.add(t);
  }
  if (taxi) {
    const sign = box(0.7, 0.22, 0.3, '#f4d47c', 0, 1.72, -0.1);
    g.add(sign);
    g.add(box(0.55, 0.09, 0.02, '#1b241e', 0, 1.82, 0.06));
  }
  if (ambulance) {
    g.add(box(1.84, 0.22, 4.08, '#c94a3c', 0, 1.0, 0));
    const crossMat = new THREE.MeshBasicMaterial({ color: '#c94a3c' });
    const c1 = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.18, 0.03), crossMat);
    c1.position.set(0, 1.18, 0.84);
    g.add(c1);
    const c2 = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.5, 0.03), crossMat);
    c2.position.set(0, 1.18, 0.84);
    g.add(c2);
    const light = new THREE.Mesh(new THREE.SphereGeometry(0.12, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff5a4e' }));
    light.position.set(0, 1.68, 0);
    g.add(light);
    g.userData.emergencyLight = light;
  }
  g.userData.type = 'car';
  g.userData.wheels = g.children.filter(c => c.userData.wheel);
  if (parked) g.userData.parked = true;
  return g;
}

export function makeBus({ color = '#e8ddc4', accent = '#2f6b4f' } = {}) {
  const g = new THREE.Group();
  const body = box(2.45, 2.15, 9.2, color, 0, 1.35, 0);
  g.add(body);
  g.add(box(2.5, 0.32, 9.25, accent, 0, 2.46, 0));
  g.add(box(2.5, 0.22, 9.25, accent, 0, 0.28, 0));
  // Finestrini laterali
  for (const side of [-1.24, 1.24]) {
    g.add(box(0.03, 0.72, 6.7, '#2e3b40', side, 1.78, -0.35));
    g.add(box(0.03, 0.42, 1.2, '#2e3b40', side, 1.58, 3.55));
  }
  // Parabrezza e lunotto
  g.add(box(2.2, 1.02, 0.04, '#2e3b40', 0, 1.82, 4.62));
  g.add(box(2.05, 0.7, 0.04, '#2e3b40', 0, 1.9, -4.62));
  // Porte
  for (const z of [2.55, -2.4]) {
    g.add(box(0.05, 1.7, 0.92, '#d9e2e0', 1.26, 1.2, z));
    g.add(box(0.05, 1.7, 0.92, '#d9e2e0', -1.26, 1.2, z));
  }
  // Ruote
  for (const x of [-1.18, 1.18]) {
    for (const z of [-2.8, 2.8]) {
      const w = wheel(0.46, 0.26);
      w.position.set(x, 0.48, z);
      g.add(w);
    }
  }
  // Fari
  const headMat = new THREE.MeshBasicMaterial({ color: '#fff2bd' });
  const tailMat = new THREE.MeshBasicMaterial({ color: '#b33b2b' });
  for (const x of [-0.82, 0.82]) {
    const h = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.2, 0.05), headMat);
    h.position.set(x, 0.86, 4.63);
    g.add(h);
    const t = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.18, 0.05), tailMat);
    t.position.set(x, 0.86, -4.63);
    g.add(t);
  }
  const sign = box(1.45, 0.34, 0.05, accent, 0, 2.2, 4.64);
  g.add(sign);
  g.userData.type = 'bus';
  g.userData.wheels = g.children.filter(c => c.userData.wheel);
  return g;
}

export function makeTrain({ color = '#e9e4d8', accent = '#8f3e34' } = {}) {
  const g = new THREE.Group();
  const cars = 3;
  for (let i = 0; i < cars; i++) {
    const z = (i - (cars - 1) / 2) * 10.6;
    const body = box(2.8, 2.5, 9.6, color, 0, 1.7, z);
    g.add(body);
    g.add(box(2.86, 0.26, 9.7, accent, 0, 2.92, z));
    g.add(box(2.86, 0.2, 9.7, '#5a5f59', 0, 0.48, z));
    // finestrini
    for (const side of [-1.42, 1.42]) {
      for (let w = -3.3; w <= 3.3; w += 1.65) {
        g.add(box(0.03, 0.68, 1.1, '#2e3b40', side, 1.95, z + w));
      }
    }
    g.add(box(2.34, 0.86, 0.04, '#2e3b40', 0, 1.95, z + 4.82));
    g.add(box(2.34, 0.86, 0.04, '#2e3b40', 0, 1.95, z - 4.82));
    // carrelli
    for (const wz of [z - 3.1, z + 3.1]) {
      for (const wx of [-1.25, 1.25]) {
        const w = wheel(0.38, 0.2, '#202321');
        w.position.set(wx, 0.5, wz);
        g.add(w);
      }
    }
    if (i === cars - 1) {
      const nose = box(2.7, 1.5, 0.5, accent, 0, 1.55, z + 4.9);
      g.add(nose);
      const lightMat = new THREE.MeshBasicMaterial({ color: '#fff2bd' });
      for (const x of [-0.82, 0.82]) {
        const light = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.22, 0.05), lightMat);
        light.position.set(x, 1.2, z + 5.18);
        g.add(light);
      }
    }
  }
  g.userData.type = 'train';
  g.userData.wheels = g.children.filter(c => c.userData.wheel);
  return g;
}

export function makeVespa({ color = '#4f8fa8' } = {}) {
  const g = new THREE.Group();
  const frame = box(0.42, 0.24, 1.25, color, 0, 0.62, 0);
  g.add(frame);
  g.add(box(0.52, 0.12, 0.6, '#2b332f', 0, 0.76, -0.2));
  g.add(box(0.46, 0.72, 0.12, color, 0, 1.02, 0.55));
  g.add(box(0.54, 0.2, 0.28, color, 0, 1.35, 0.55));
  g.add(box(0.62, 0.06, 0.06, '#2b332f', 0, 1.46, 0.55));
  g.add(box(0.3, 0.08, 0.08, '#2b332f', 0, 1.46, 0.42));
  const front = wheel(0.3, 0.12);
  front.position.set(0, 0.32, 0.68);
  g.add(front);
  const back = wheel(0.3, 0.12);
  back.position.set(0, 0.32, -0.62);
  g.add(back);
  const light = new THREE.Mesh(new THREE.SphereGeometry(0.11, 8, 6), new THREE.MeshBasicMaterial({ color: '#fff2bd' }));
  light.position.set(0, 1.02, 0.66);
  g.add(light);
  g.add(box(0.22, 0.12, 0.05, '#b33b2b', 0, 0.72, -1.02));
  g.userData.type = 'vespa';
  g.userData.wheels = [front, back];
  return g;
}

function bikeWheel(r = 0.34) {
  const pivot = new THREE.Group();
  pivot.userData.wheel = true;
  pivot.userData.radius = r;
  const tire = new THREE.Mesh(new THREE.TorusGeometry(r, 0.035, 6, 16), mat('#242424'));
  tire.rotation.y = Math.PI / 2;
  tire.castShadow = true;
  pivot.add(tire);
  const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.09, 8), mat('#d7d2c7'));
  hub.rotation.z = Math.PI / 2;
  pivot.add(hub);
  for (let i = 0; i < 3; i++) {
    const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.012, r * 1.55, 0.012), mat('#d7d2c7'));
    spoke.rotation.x = i * Math.PI / 3;
    pivot.add(spoke);
  }
  return pivot;
}

export function makeBicycle({ color = '#4f8fa8' } = {}) {
  const g = new THREE.Group();
  const front = bikeWheel();
  front.position.set(0, 0.36, 0.58);
  const back = bikeWheel();
  back.position.set(0, 0.36, -0.58);
  g.add(front, back);

  const frameMat = new THREE.MeshLambertMaterial({ color });
  const tube = (w, h, d, x, y, z, rz = 0) => {
    const m = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), frameMat);
    m.position.set(x, y, z);
    m.rotation.z = rz;
    m.castShadow = true;
    g.add(m);
    return m;
  };
  tube(0.055, 0.055, 1.05, 0, 0.64, 0);
  tube(0.055, 0.55, 0.055, 0, 0.62, -0.22, -0.18);
  tube(0.055, 0.58, 0.055, 0, 0.65, 0.38, 0.2);
  tube(0.055, 0.48, 0.055, 0, 0.55, 0.12);
  tube(0.28, 0.06, 0.14, 0, 0.9, -0.25);
  tube(0.5, 0.055, 0.055, 0, 0.98, 0.45);
  tube(0.1, 0.08, 0.3, 0, 0.47, 0.05);
  const lamp = new THREE.Mesh(new THREE.SphereGeometry(0.07, 7, 5), new THREE.MeshBasicMaterial({ color: '#fff2bd' }));
  lamp.position.set(0, 0.72, 0.55);
  g.add(lamp);
  g.userData.type = 'bicycle';
  g.userData.wheels = [front, back];
  return g;
}

export function makePerson({ shirt = '#c2684b', pants = '#2f4a3c', skin = '#d8aa85', hair = '#3a2a20' } = {}) {
  const group = new THREE.Group();
  const torso = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.7, 8), mat(shirt));
  torso.position.y = 1.1;
  torso.castShadow = true;
  group.add(torso);
  const head = sphere(0.19, skin, 0, 1.63, 0);
  group.add(head);
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.2, 8, 6, 0, Math.PI * 2, 0, Math.PI / 2), mat(hair));
  cap.position.y = 1.66;
  group.add(cap);
  const armL = box(0.1, 0.62, 0.1, shirt, 0.29, 1.05, 0);
  const armR = box(0.1, 0.62, 0.1, shirt, -0.29, 1.05, 0);
  const legL = box(0.13, 0.7, 0.13, pants, 0.12, 0.45, 0);
  const legR = box(0.13, 0.7, 0.13, pants, -0.12, 0.45, 0);
  group.add(armL, armR, legL, legR);
  group.userData.limbs = { armL, armR, legL, legR };
  group.userData.phase = Math.random() * Math.PI * 2;
  group.userData.person = true;
  group.userData.height = 1.75;
  return group;
}

export function makeBench() {
  const g = new THREE.Group();
  const wood = '#8b6848';
  const metal = '#3d443f';
  g.add(box(1.7, 0.12, 0.5, wood, 0, 0.45, 0));
  g.add(box(1.7, 0.5, 0.1, wood, 0, 0.68, -0.22));
  g.add(box(0.08, 0.45, 0.45, metal, -0.65, 0.22, 0));
  g.add(box(0.08, 0.45, 0.45, metal, 0.65, 0.22, 0));
  return g;
}

export function makeLampPost() {
  const g = new THREE.Group();
  g.add(cyl(0.07, 0.1, 4.4, '#2f3632', 0, 2.2, 0, 8));
  g.add(box(0.9, 0.08, 0.08, '#2f3632', 0.4, 4.4, 0));
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.18, 8, 6), new THREE.MeshBasicMaterial({ color: '#ffe6a6' }));
  bulb.position.set(0.78, 4.32, 0);
  g.add(bulb);
  g.userData.bulb = bulb;
  return g;
}

export function makeTreeGeometry() {
  const trunk = new THREE.CylinderGeometry(0.16, 0.24, 1.8, 6);
  trunk.translate(0, 0.9, 0);
  const foliage = new THREE.IcosahedronGeometry(1.15, 0);
  foliage.translate(0, 2.4, 0);
  return { trunk, foliage };
}
