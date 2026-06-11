import * as THREE from 'three';
import { coastRadius, inlandDepth } from './sicily.js';

// The island itself — shaped like Sicily: terrain, sea, sky, Mount Etna on
// the east coast, olive groves, village houses, rocks, clouds. Registers
// static circle colliders for the vehicle.

const rand = (() => {
  // deterministic PRNG so the island looks the same on every visit
  let s = 1737;
  return () => {
    s = (s * 16807) % 2147483647;
    return (s - 1) / 2147483646;
  };
})();

function noise2(x, z) {
  // cheap value noise via hashed lattice
  const h = (ix, iz) => {
    let n = ix * 374761393 + iz * 668265263;
    n = (n ^ (n >> 13)) * 1274126177;
    return ((n ^ (n >> 16)) >>> 0) / 4294967295;
  };
  const ix = Math.floor(x), iz = Math.floor(z);
  const fx = x - ix, fz = z - iz;
  const sx = fx * fx * (3 - 2 * fx), sz = fz * fz * (3 - 2 * fz);
  return THREE.MathUtils.lerp(
    THREE.MathUtils.lerp(h(ix, iz), h(ix + 1, iz), sx),
    THREE.MathUtils.lerp(h(ix, iz + 1), h(ix + 1, iz + 1), sx),
    sz
  );
}

// landmark sites (kept clear of vegetation): real Sicilian monuments in
// roughly their real positions on the island
const MONUMENTS = [
  { x: -20, z: -30, r: 12 },  // Duomo di Cefalù
  { x: -60, z: -2, r: 12 },   // Teatro Massimo (Palermo)
  { x: 66, z: -30, r: 10 },   // Campanile del Duomo (Messina)
  { x: 62, z: 2, r: 10 },     // U Liotru (Catania)
  { x: -14, z: 40, r: 16 },   // Scala dei Turchi (Realmonte)
  { x: -66, z: 18, r: 12 },   // Saline di Trapani
];

export class World {
  constructor(scene) {
    this.scene = scene;
    this.colliders = [];
    this.animated = []; // {update(t, dt)}

    this.#sky();
    this.#lights();
    this.#terrain();
    this.#sea();
    this.#etna();
    this.#piazza();
    this.#paths();
    this.#oliveGrove();
    this.#pricklyPears();
    this.#monuments();
    this.#rocks();
    this.#clouds();
  }

  addCollider(x, z, r) {
    this.colliders.push({ x, z, r });
  }

  update(t, dt) {
    for (const a of this.animated) a(t, dt);
  }

  /* ---------- sky & light ---------- */

  #sky() {
    // golden-hour gradient dome
    const canvas = document.createElement('canvas');
    canvas.width = 2;
    canvas.height = 256;
    const ctx = canvas.getContext('2d');
    const grad = ctx.createLinearGradient(0, 0, 0, 256);
    grad.addColorStop(0.0, '#2c5d8f');
    grad.addColorStop(0.45, '#7fb2d9');
    grad.addColorStop(0.72, '#f5c97b');
    grad.addColorStop(1.0, '#f0975a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 2, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;

    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(900, 24, 12),
      new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false })
    );
    this.scene.add(dome);

    this.scene.fog = new THREE.Fog(0xf0b27a, 160, 800);

    // low sun disc on the horizon
    const sun = new THREE.Mesh(
      new THREE.CircleGeometry(38, 32),
      new THREE.MeshBasicMaterial({ color: 0xffe9b8, fog: false })
    );
    sun.position.set(-380, 60, -680);
    sun.lookAt(0, 40, 0);
    this.scene.add(sun);
  }

  #lights() {
    const hemi = new THREE.HemisphereLight(0xbfd9ee, 0xc98850, 0.85);
    this.scene.add(hemi);

    const sun = new THREE.DirectionalLight(0xffdfae, 1.9);
    sun.position.set(-90, 110, -140);
    sun.castShadow = true;
    sun.shadow.mapSize.set(2048, 2048);
    sun.shadow.camera.left = -130;
    sun.shadow.camera.right = 130;
    sun.shadow.camera.top = 130;
    sun.shadow.camera.bottom = -130;
    sun.shadow.camera.near = 30;
    sun.shadow.camera.far = 400;
    sun.shadow.bias = -0.0008;
    this.scene.add(sun);
  }

  /* ---------- ground & water ---------- */

  #terrain() {
    // big plane sculpted into the shape of Sicily via the coast lookup
    const ringGeo = new THREE.PlaneGeometry(260, 260, 130, 130);
    ringGeo.rotateX(-Math.PI / 2);

    const pos = ringGeo.attributes.position;
    const colors = new Float32Array(pos.count * 3);
    const grass = new THREE.Color(0x8fae5a);
    const grassDry = new THREE.Color(0xb3a558);
    const sand = new THREE.Color(0xe8cf9b);
    const tmp = new THREE.Color();

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getZ(i);
      const s = inlandDepth(x, z); // positive = inland

      let y;
      if (s < 12) {
        // beach sloping into the sea, continuing down past the waterline
        y = Math.max(-((12 - s) / 12) * 2.5, -6);
      } else {
        // gentle inland undulation
        y = (noise2(x * 0.05 + 40, z * 0.05 + 40) - 0.5) * 0.55;
        const d = Math.hypot(x, z);
        if (d < 14) y *= d / 14; // flat piazza
      }
      pos.setY(i, y);

      const n = noise2(x * 0.12, z * 0.12);
      if (s < 16) tmp.copy(sand);
      else tmp.lerpColors(grass, grassDry, n * 0.85);
      colors[i * 3] = tmp.r;
      colors[i * 3 + 1] = tmp.g;
      colors[i * 3 + 2] = tmp.b;
    }
    ringGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    ringGeo.computeVertexNormals();

    const ground = new THREE.Mesh(
      ringGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1 })
    );
    ground.receiveShadow = true;
    this.scene.add(ground);
  }

  #sea() {
    const geo = new THREE.PlaneGeometry(1400, 1400, 48, 48);
    geo.rotateX(-Math.PI / 2);
    const mat = new THREE.MeshStandardMaterial({
      color: 0x2387ab,
      roughness: 0.35,
      metalness: 0.1,
      transparent: true,
      opacity: 0.94,
    });
    const sea = new THREE.Mesh(geo, mat);
    sea.position.y = -1.1;
    this.scene.add(sea);

    const pos = geo.attributes.position;
    const base = pos.array.slice();
    this.animated.push((t) => {
      for (let i = 0; i < pos.count; i++) {
        const x = base[i * 3];
        const z = base[i * 3 + 2];
        pos.setY(i, Math.sin(x * 0.045 + t * 0.9) * 0.35 + Math.cos(z * 0.05 + t * 0.7) * 0.3);
      }
      pos.needsUpdate = true;
    });

    // foam strip hugging the Sicilian shoreline
    const SEG = 256;
    const fpos = new Float32Array((SEG + 1) * 2 * 3);
    const findex = [];
    for (let i = 0; i <= SEG; i++) {
      const a = (i / SEG) * Math.PI * 2 - Math.PI;
      const dx = Math.cos(a), dz = Math.sin(a);
      const r = coastRadius(dx, dz);
      fpos.set([dx * (r - 2.5), 0, dz * (r - 2.5)], i * 6);
      fpos.set([dx * (r + 3.5), 0, dz * (r + 3.5)], i * 6 + 3);
      if (i < SEG) {
        const k = i * 2;
        findex.push(k, k + 1, k + 2, k + 1, k + 3, k + 2);
      }
    }
    const foamGeo = new THREE.BufferGeometry();
    foamGeo.setAttribute('position', new THREE.BufferAttribute(fpos, 3));
    foamGeo.setIndex(findex);
    const foam = new THREE.Mesh(
      foamGeo,
      new THREE.MeshBasicMaterial({
        color: 0xfdf6ec, transparent: true, opacity: 0.4, side: THREE.DoubleSide,
      })
    );
    foam.position.y = -0.55;
    this.scene.add(foam);
    this.animated.push((t) => {
      const s = 1 + Math.sin(t * 0.8) * 0.012;
      foam.scale.set(s, s, 1);
      foam.material.opacity = 0.28 + Math.sin(t * 0.8) * 0.12;
    });
  }

  /* ---------- landmarks ---------- */

  #etna() {
    // Mount Etna where it belongs — on the island's east side, smoking away
    const etna = new THREE.Group();
    const R = 26, H = 34;

    const coneGeo = new THREE.ConeGeometry(R, H, 10, 5);
    const cpos = coneGeo.attributes.position;
    const ccol = new Float32Array(cpos.count * 3);
    const rock = new THREE.Color(0x6e5a64);
    const scrub = new THREE.Color(0x84855c);
    const snow = new THREE.Color(0xf2ece4);
    const tmpc = new THREE.Color();
    for (let i = 0; i < cpos.count; i++) {
      // jitter the silhouette so it reads volcanic, not geometric
      const y = cpos.getY(i);
      const f = (y + H / 2) / H;
      cpos.setX(i, cpos.getX(i) * (1 + (noise2(i * 0.7, y) - 0.5) * 0.18));
      cpos.setZ(i, cpos.getZ(i) * (1 + (noise2(y, i * 0.7) - 0.5) * 0.18));
      tmpc.copy(scrub).lerp(rock, THREE.MathUtils.smoothstep(f, 0.15, 0.55));
      tmpc.lerp(snow, THREE.MathUtils.smoothstep(f, 0.78, 0.96));
      ccol[i * 3] = tmpc.r; ccol[i * 3 + 1] = tmpc.g; ccol[i * 3 + 2] = tmpc.b;
    }
    coneGeo.setAttribute('color', new THREE.BufferAttribute(ccol, 3));
    coneGeo.computeVertexNormals();
    const cone = new THREE.Mesh(
      coneGeo,
      new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true })
    );
    cone.position.y = H / 2 - 1.5;
    cone.castShadow = true;
    etna.add(cone);

    // smoke puffs drifting from the crater
    const puffMat = new THREE.MeshBasicMaterial({
      color: 0xd8d3cf, transparent: true, opacity: 0.55,
    });
    const puffGeo = new THREE.IcosahedronGeometry(2.2, 1);
    const puffs = [];
    for (let i = 0; i < 7; i++) {
      const p = new THREE.Mesh(puffGeo, puffMat.clone());
      p.userData.seed = i / 7;
      etna.add(p);
      puffs.push(p);
    }
    this.animated.push((t) => {
      for (const p of puffs) {
        const f = (t * 0.06 + p.userData.seed) % 1;
        p.position.set(
          Math.sin(f * 9 + p.userData.seed * 20) * 2.5 + f * 9,
          H - 2 + f * 22,
          Math.cos(f * 7) * 2
        );
        const s = 0.5 + f * 1.9;
        p.scale.set(s, s * 0.8, s);
        p.material.opacity = 0.5 * (1 - f) + 0.06;
      }
    });

    etna.position.set(52, 0, -18);
    this.scene.add(etna);
    this.addCollider(52, -18, R + 1);
  }

  #piazza() {
    // paved circle at spawn with a traditional painted Sicilian cart
    const pave = new THREE.Mesh(
      new THREE.CircleGeometry(13, 40),
      new THREE.MeshStandardMaterial({ color: 0xd9c4a3, roughness: 0.95 })
    );
    pave.rotation.x = -Math.PI / 2;
    pave.position.y = 0.03;
    pave.receiveShadow = true;
    this.scene.add(pave);

    const yellow = new THREE.MeshStandardMaterial({ color: 0xf2b134, roughness: 0.6 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc6342b, roughness: 0.6 });
    const blue = new THREE.MeshStandardMaterial({ color: 0x2f6f9e, roughness: 0.6 });
    const wood = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });

    const cart = new THREE.Group();

    // bed with painted panels
    const bed = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.5, 1.35), yellow);
    bed.position.y = 1.62;
    cart.add(bed);
    for (const pz of [-0.71, 0.71]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(2.2, 0.36, 0.05), red);
      panel.position.set(0, 1.66, pz);
      cart.add(panel);
    }
    for (const px of [-1.23, 1.23]) {
      const panel = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.36, 1.15), blue);
      panel.position.set(px, 1.66, 0);
      cart.add(panel);
    }

    // big spoked wheels
    const axle = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 3.0, 8), wood);
    axle.rotation.z = Math.PI / 2;
    axle.position.y = 1.05;
    cart.add(axle);
    for (const wx of [-1.34, 1.34]) {
      const wheel = new THREE.Group();
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.11, 8, 14), red);
      wheel.add(rim);
      for (let s = 0; s < 6; s++) {
        const spoke = new THREE.Mesh(new THREE.BoxGeometry(0.09, 1.8, 0.07), yellow);
        spoke.rotation.z = (s / 6) * Math.PI;
        wheel.add(spoke);
      }
      const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.2, 8), blue);
      hub.rotation.z = Math.PI / 2;
      wheel.add(hub);
      wheel.rotation.y = Math.PI / 2;
      wheel.position.set(wx, 1.05, 0);
      cart.add(wheel);
    }

    // shafts resting forward
    for (const px of [-0.5, 0.5]) {
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 2.0, 6), red);
      shaft.position.set(px, 1.15, -1.95);
      shaft.rotation.x = 1.12;
      cart.add(shaft);
    }

    // cargo: crates of lemons, of course
    const crate = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.45, 0.8), wood);
    crate.position.set(-0.5, 2.1, 0);
    cart.add(crate);
    const lemons = new THREE.Mesh(new THREE.SphereGeometry(0.4, 8, 6), new THREE.MeshStandardMaterial({ color: 0xf7d633, roughness: 0.6 }));
    lemons.scale.set(1, 0.55, 1);
    lemons.position.set(-0.5, 2.36, 0);
    cart.add(lemons);
    const crate2 = crate.clone();
    crate2.position.set(0.55, 2.1, 0.1);
    crate2.rotation.y = 0.35;
    cart.add(crate2);

    cart.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    cart.position.set(0, 0, -4);
    cart.rotation.y = 0.5;
    this.scene.add(cart);
    this.addCollider(0, -4, 2.8);
  }

  #paths() {
    // dirt paths radiating from the piazza toward each zone
    const mat = new THREE.MeshStandardMaterial({ color: 0xcdb389, roughness: 1 });
    const dot = new THREE.CircleGeometry(1.5, 10);
    const targets = [
      { x: -38, z: -18 },  // about (Palermo side)
      { x: -34, z: 24 },   // skills (Agrigento side)
      { x: 38, z: 27 },    // projects (Siracusa side)
      { x: -84, z: 6 },    // contact (Capo Boeo, west tip)
    ];
    const meshes = [];
    for (const t of targets) {
      const dist = Math.hypot(t.x, t.z);
      const steps = Math.floor(dist / 4.2);
      for (let i = 3; i <= steps; i++) {
        const f = i / steps;
        const m = new THREE.Mesh(dot, mat);
        m.rotation.x = -Math.PI / 2;
        m.rotation.z = rand() * Math.PI;
        const wobble = (rand() - 0.5) * 2.2;
        m.position.set(
          t.x * f + wobble, 0.02 + f * 0.001,
          t.z * f + wobble
        );
        const s = 0.7 + rand() * 0.5;
        m.scale.set(s, s * (0.7 + rand() * 0.4), 1);
        meshes.push(m);
      }
    }
    const group = new THREE.Group();
    group.add(...meshes);
    this.scene.add(group);
  }

  /* ---------- vegetation & props ---------- */

  #oliveGrove() {
    const trunkGeo = new THREE.CylinderGeometry(0.22, 0.38, 2.4, 6);
    const blobGeo = new THREE.IcosahedronGeometry(1.25, 0);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x6e5440, roughness: 1 });
    const leafMat = new THREE.MeshStandardMaterial({ color: 0x7d955c, roughness: 1, flatShading: true });

    const spots = [];
    let guard = 0;
    while (spots.length < 46 && guard++ < 1600) {
      const a = rand() * Math.PI * 2;
      const rMax = coastRadius(Math.cos(a), Math.sin(a)) - 16;
      const r = 16 + rand() * Math.max(rMax - 16, 0);
      const x = Math.cos(a) * r;
      const z = Math.sin(a) * r;
      // keep clear of zone sites, Etna, monuments and other trees
      const blocked =
        Math.hypot(x + 38, z + 18) < 14 ||   // about
        Math.hypot(x + 34, z - 24) < 16 ||   // skills
        Math.hypot(x - 38, z - 27) < 27 ||   // projects (theater)
        Math.hypot(x + 84, z - 6) < 14 ||    // contact
        Math.hypot(x - 52, z + 18) < 31 ||   // etna
        MONUMENTS.some((m) => Math.hypot(x - m.x, z - m.z) < m.r) ||
        spots.some((s) => Math.hypot(s.x - x, s.z - z) < 7);
      if (!blocked) spots.push({ x, z });
    }

    const trunks = new THREE.InstancedMesh(trunkGeo, trunkMat, spots.length);
    const blobs = new THREE.InstancedMesh(blobGeo, leafMat, spots.length * 3);
    trunks.castShadow = blobs.castShadow = true;

    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    let bi = 0;
    spots.forEach((s, i) => {
      const h = 0.85 + rand() * 0.5;
      e.set((rand() - 0.5) * 0.16, rand() * Math.PI, (rand() - 0.5) * 0.16);
      m.compose(
        new THREE.Vector3(s.x, 1.1 * h, s.z),
        q.setFromEuler(e),
        new THREE.Vector3(h, h, h)
      );
      trunks.setMatrixAt(i, m);

      for (let b = 0; b < 3; b++) {
        const bs = (0.8 + rand() * 0.7) * h;
        e.set(rand() * 2, rand() * 2, rand() * 2);
        m.compose(
          new THREE.Vector3(
            s.x + (rand() - 0.5) * 1.6 * h,
            2.6 * h + (rand() - 0.5) * 0.9,
            s.z + (rand() - 0.5) * 1.6 * h
          ),
          q.setFromEuler(e),
          new THREE.Vector3(bs, bs * 0.82, bs)
        );
        blobs.setMatrixAt(bi++, m);
      }
      this.addCollider(s.x, s.z, 0.9);
    });
    this.scene.add(trunks, blobs);
  }

  #pricklyPears() {
    // fichi d'india — flat green pads with little red fruits
    const padGeo = new THREE.SphereGeometry(0.55, 8, 6);
    padGeo.scale(1, 1.25, 0.32);
    const padMat = new THREE.MeshStandardMaterial({ color: 0x5d8a4a, roughness: 1, flatShading: true });
    const fruitGeo = new THREE.SphereGeometry(0.14, 6, 5);
    const fruitMat = new THREE.MeshStandardMaterial({ color: 0xc23b4e, roughness: 0.7 });

    for (let i = 0; i < 12; i++) {
      const a = rand() * Math.PI * 2;
      const rMax = coastRadius(Math.cos(a), Math.sin(a)) - 16;
      const r = 20 + rand() * Math.max(rMax - 20, 0);
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      if (Math.hypot(x - 38, z - 27) < 27 || Math.hypot(x + 38, z + 18) < 12 ||
          Math.hypot(x - 52, z + 18) < 30 ||
          MONUMENTS.some((m) => Math.hypot(x - m.x, z - m.z) < m.r)) continue;

      const plant = new THREE.Group();
      const pads = 3 + Math.floor(rand() * 3);
      for (let p = 0; p < pads; p++) {
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set((rand() - 0.5) * 0.9, 0.5 + p * 0.42, (rand() - 0.5) * 0.4);
        pad.rotation.y = (rand() - 0.5) * 1.2;
        pad.rotation.z = (rand() - 0.5) * 0.5;
        pad.castShadow = true;
        plant.add(pad);
        if (rand() > 0.45) {
          const fruit = new THREE.Mesh(fruitGeo, fruitMat);
          fruit.position.copy(pad.position).add(
            new THREE.Vector3((rand() - 0.5) * 0.5, 0.62, 0.1)
          );
          plant.add(fruit);
        }
      }
      plant.position.set(x, 0, z);
      this.scene.add(plant);
      this.addCollider(x, z, 0.8);
    }
  }

  // prism roof helper (the 4-segment-cylinder trick)
  #roofGeo(width, depth, squash = 0.55) {
    const geo = new THREE.CylinderGeometry(0.02, depth, width, 4, 1);
    geo.rotateY(Math.PI / 4);
    geo.rotateZ(Math.PI / 2);
    geo.scale(1, 1, squash);
    return geo;
  }

  #monuments() {
    const sandstone = new THREE.MeshStandardMaterial({ color: 0xd9c09a, roughness: 1, flatShading: true });
    const cream = new THREE.MeshStandardMaterial({ color: 0xf0e8d8, roughness: 0.9 });
    const terracotta = new THREE.MeshStandardMaterial({ color: 0xc4593a, roughness: 0.9, flatShading: true });
    const dark = new THREE.MeshStandardMaterial({ color: 0x3c3c44, roughness: 0.85 });

    const place = (group, { x, z, r }, ry = 0) => {
      group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      group.position.set(x, 0, z);
      group.rotation.y = ry;
      this.scene.add(group);
      this.addCollider(x, z, r * 0.55);
    };

    /* --- Duomo di Cefalù: Norman facade with twin towers --- */
    {
      const g = new THREE.Group();
      const facade = new THREE.Mesh(new THREE.BoxGeometry(4.6, 4.2, 1.1), sandstone);
      facade.position.y = 2.1;
      g.add(facade);
      const nave = new THREE.Mesh(new THREE.BoxGeometry(4.2, 3, 5), sandstone);
      nave.position.set(0, 1.5, -3);
      g.add(nave);
      const naveRoof = new THREE.Mesh(this.#roofGeo(5.4, 3.2), terracotta);
      naveRoof.rotation.y = Math.PI / 2;
      naveRoof.position.set(0, 3.6, -3);
      g.add(naveRoof);
      for (const tx of [-2.9, 2.9]) {
        const tower = new THREE.Mesh(new THREE.BoxGeometry(1.5, 6.4, 1.5), sandstone);
        tower.position.set(tx, 3.2, 0);
        g.add(tower);
        const cap = new THREE.Mesh(new THREE.ConeGeometry(1.15, 1.5, 4), terracotta);
        cap.rotation.y = Math.PI / 4;
        cap.position.set(tx, 7.15, 0);
        g.add(cap);
      }
      const rose = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.55, 0.1, 12), cream);
      rose.rotation.x = Math.PI / 2;
      rose.position.set(0, 3.1, 0.6);
      g.add(rose);
      const portal = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.9, 0.15), dark);
      portal.position.set(0, 0.95, 0.6);
      g.add(portal);
      place(g, MONUMENTS[0], 0.45);
    }

    /* --- Teatro Massimo (Palermo): dome + columned porch --- */
    {
      const g = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(7, 2.4, 5.6), cream);
      base.position.set(0, 1.2, -1);
      g.add(base);
      const drum = new THREE.Mesh(new THREE.CylinderGeometry(2.4, 2.6, 1.4, 12), cream);
      drum.position.set(0, 3.1, -1.4);
      g.add(drum);
      const dome = new THREE.Mesh(
        new THREE.SphereGeometry(2.4, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2),
        new THREE.MeshStandardMaterial({ color: 0x9a6b50, roughness: 0.7, flatShading: true })
      );
      dome.position.set(0, 3.8, -1.4);
      g.add(dome);
      // steps + porch
      const step1 = new THREE.Mesh(new THREE.BoxGeometry(5.8, 0.35, 1.8), cream);
      step1.position.set(0, 0.18, 2.6);
      g.add(step1);
      const step2 = new THREE.Mesh(new THREE.BoxGeometry(5.2, 0.35, 1.3), cream);
      step2.position.set(0, 0.5, 2.5);
      g.add(step2);
      for (let i = 0; i < 6; i++) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.17, 0.2, 2.6, 8), cream);
        col.position.set(-2 + i * 0.8, 1.95, 2.7);
        g.add(col);
      }
      const pediment = new THREE.Mesh(this.#roofGeo(5.4, 1.3, 0.45), cream);
      pediment.position.set(0, 3.6, 2.7);
      g.add(pediment);
      place(g, MONUMENTS[1], 1.9);
    }

    /* --- Campanile del Duomo di Messina: clock tower --- */
    {
      const g = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.BoxGeometry(2.3, 8.6, 2.3), sandstone);
      tower.position.y = 4.3;
      g.add(tower);
      const clock = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 0.1, 14), cream);
      clock.rotation.x = Math.PI / 2;
      clock.position.set(0, 6.6, 1.2);
      g.add(clock);
      const handH = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.45, 0.04), dark);
      handH.position.set(0, 6.75, 1.27);
      g.add(handH);
      const handM = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.08, 0.04), dark);
      handM.position.set(0.15, 6.6, 1.27);
      g.add(handM);
      const belfry = new THREE.Mesh(new THREE.BoxGeometry(1.9, 1.3, 1.9), cream);
      belfry.position.y = 9.2;
      g.add(belfry);
      const spire = new THREE.Mesh(
        new THREE.ConeGeometry(1.2, 1.7, 4),
        new THREE.MeshStandardMaterial({ color: 0xd9b54a, roughness: 0.45, metalness: 0.3 })
      );
      spire.rotation.y = Math.PI / 4;
      spire.position.y = 10.7;
      g.add(spire);
      place(g, MONUMENTS[2], -0.9);
    }

    /* --- U Liotru (Catania): the lava elephant with its obelisk --- */
    {
      const g = new THREE.Group();
      const lava = new THREE.MeshStandardMaterial({ color: 0x33333a, roughness: 0.9, flatShading: true });
      const pedestal = new THREE.Mesh(new THREE.BoxGeometry(2.8, 1.1, 1.8), cream);
      pedestal.position.y = 0.55;
      g.add(pedestal);
      const body = new THREE.Mesh(new THREE.SphereGeometry(1, 10, 8), lava);
      body.scale.set(1.25, 0.85, 0.8);
      body.position.y = 2.1;
      g.add(body);
      const head = new THREE.Mesh(new THREE.SphereGeometry(0.55, 9, 7), lava);
      head.position.set(1.35, 2.4, 0);
      g.add(head);
      const trunk1 = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.16, 0.8, 7), lava);
      trunk1.position.set(1.85, 2.05, 0);
      trunk1.rotation.z = 0.5;
      g.add(trunk1);
      const trunk2 = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.13, 0.6, 7), lava);
      trunk2.position.set(2.15, 1.6, 0);
      trunk2.rotation.z = 0.15;
      g.add(trunk2);
      for (const ez of [-0.45, 0.45]) {
        const ear = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.55, 0.08), lava);
        ear.position.set(1.15, 2.6, ez);
        ear.rotation.y = ez * 0.8;
        g.add(ear);
      }
      for (const [lx, lz] of [[-0.6, -0.4], [-0.6, 0.4], [0.6, -0.4], [0.6, 0.4]]) {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.24, 1.0, 7), lava);
        leg.position.set(lx, 1.45, lz);
        g.add(leg);
      }
      const obelisk = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.32, 2.6, 4), sandstone);
      obelisk.position.y = 4.1;
      g.add(obelisk);
      const tip = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.4, 4), sandstone);
      tip.position.y = 5.5;
      g.add(tip);
      place(g, MONUMENTS[3], -0.5);
    }

    /* --- Scala dei Turchi: white stepped cliff into the sea --- */
    {
      const g = new THREE.Group();
      const marl = new THREE.MeshStandardMaterial({ color: 0xf2efe6, roughness: 0.8, flatShading: true });
      for (let i = 0; i < 5; i++) {
        const slab = new THREE.Mesh(
          new THREE.BoxGeometry(11 - i * 1.4, 2.4 - i * 0.35, 2.6),
          marl
        );
        slab.position.set((rand() - 0.5) * 0.8, 1.0 - i * 0.62, i * 1.9);
        slab.rotation.y = (rand() - 0.5) * 0.14;
        g.add(slab);
      }
      const m = MONUMENTS[4];
      g.position.set(m.x, -0.3, m.z);
      // steps descend seaward (radially outward)
      g.lookAt(m.x * 1.8, -2.4, m.z * 1.8);
      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      this.scene.add(g);
      this.addCollider(m.x, m.z, 5);
      this.addCollider(m.x + 2, m.z + 4, 4);
    }

    /* --- Saline di Trapani: windmill + salt cones --- */
    {
      const g = new THREE.Group();
      const tower = new THREE.Mesh(new THREE.CylinderGeometry(1.25, 1.6, 4.4, 10), cream);
      tower.position.y = 2.2;
      g.add(tower);
      const roof = new THREE.Mesh(new THREE.ConeGeometry(1.5, 1.3, 10), terracotta);
      roof.position.y = 5.05;
      g.add(roof);
      const blades = new THREE.Group();
      for (let i = 0; i < 4; i++) {
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.36, 2.0, 0.06), new THREE.MeshStandardMaterial({ color: 0xd9cbb0, roughness: 0.9 }));
        blade.position.y = 1.1;
        const arm = new THREE.Group();
        arm.add(blade);
        arm.rotation.z = (i / 4) * Math.PI * 2;
        blades.add(arm);
      }
      blades.position.set(0, 4.1, 1.5);
      g.add(blades);
      this.animated.push((t) => { blades.rotation.z = t * 0.45; });
      for (const [sx, sz] of [[-2.8, 1.4], [-3.8, -0.6], [2.9, 0.8]]) {
        const salt = new THREE.Mesh(new THREE.ConeGeometry(1.1, 1.5, 8), new THREE.MeshStandardMaterial({ color: 0xf6f3ea, roughness: 0.7, flatShading: true }));
        salt.position.set(sx, 0.75, sz);
        g.add(salt);
      }
      place(g, MONUMENTS[5], 2.3);
    }
  }

  #rocks() {
    const geo = new THREE.DodecahedronGeometry(1, 0);
    const mat = new THREE.MeshStandardMaterial({ color: 0xb0a28e, roughness: 1, flatShading: true });
    const count = 22;
    const rocks = new THREE.InstancedMesh(geo, mat, count);
    rocks.castShadow = true;
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    for (let i = 0; i < count; i++) {
      const a = rand() * Math.PI * 2;
      const rc = coastRadius(Math.cos(a), Math.sin(a));
      const r = rc - 14 + rand() * 16;
      const s = 0.4 + rand() * 1.3;
      const x = Math.cos(a) * r, z = Math.sin(a) * r;
      const depth = inlandDepth(x, z);
      const groundY = depth < 12 ? Math.max(-((12 - depth) / 12) * 2.5, -6) : 0;
      e.set(rand() * 3, rand() * 3, rand() * 3);
      m.compose(
        new THREE.Vector3(x, groundY + s * 0.3, z),
        q.setFromEuler(e),
        new THREE.Vector3(s, s * 0.8, s)
      );
      rocks.setMatrixAt(i, m);
      if (s > 0.9 && depth > 4) this.addCollider(x, z, s);
    }
    this.scene.add(rocks);
  }

  #clouds() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xfdf4e3, roughness: 1, flatShading: true });
    const blob = new THREE.IcosahedronGeometry(1, 0);
    const clouds = [];
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group();
      const n = 3 + Math.floor(rand() * 3);
      for (let b = 0; b < n; b++) {
        const piece = new THREE.Mesh(blob, mat);
        const s = 3 + rand() * 5;
        piece.scale.set(s * 1.6, s * 0.55, s);
        piece.position.set(b * 4.5 - n * 2, (rand() - 0.5) * 1.5, (rand() - 0.5) * 3);
        cloud.add(piece);
      }
      const a = rand() * Math.PI * 2;
      const r = 120 + rand() * 160;
      cloud.position.set(Math.cos(a) * r, 55 + rand() * 35, Math.sin(a) * r);
      cloud.userData.speed = 0.6 + rand() * 0.8;
      this.scene.add(cloud);
      clouds.push(cloud);
    }
    this.animated.push((t, dt) => {
      for (const c of clouds) {
        c.position.x += c.userData.speed * dt;
        if (c.position.x > 320) c.position.x = -320;
      }
    });
  }
}
