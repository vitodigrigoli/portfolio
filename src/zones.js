import * as THREE from 'three';
import { CONTENT, PROJECTS } from './data.js';
import { makeTextPlane } from './textTexture.js';

// Builds the four discoverable sites and handles proximity → info panel.
export class Zones {
  constructor(scene, world) {
    this.scene = scene;
    this.world = world;
    this.triggers = [];   // {x, z, r, content}
    this.billboards = []; // text planes that face the camera
    this.bobbers = [];    // {obj, baseY, speed, phase}
    this.active = null;

    this.panel = document.getElementById('panel');
    this.panelTag = document.getElementById('panel-tag');
    this.panelTitle = document.getElementById('panel-title');
    this.panelBody = document.getElementById('panel-body');
    this.panelLinks = document.getElementById('panel-links');
    document.getElementById('panel-close').addEventListener('click', () => {
      this.#hidePanel();
      this.active = '__dismissed__'; // don't reopen until the player leaves
    });

    this.#aboutSite();
    this.#skillsSite();
    this.#projectsSite();
    this.#contactSite();
  }

  #addSign(text, x, y, z, opts = {}) {
    const sign = makeTextPlane(text, {
      size: opts.size ?? 1.7,
      bg: opts.bg ?? 'rgba(22, 38, 61, 0.85)',
      color: opts.color ?? '#fdf6ec',
    });
    sign.position.set(x, y, z);
    this.scene.add(sign);
    this.billboards.push(sign);
    return sign;
  }

  /* ---------- About: Vito's house ---------- */

  #aboutSite() {
    const X = -38, Z = -18; // Palermo side

    const g = new THREE.Group();

    const wall = new THREE.MeshStandardMaterial({ color: 0xfaf3e3, roughness: 1 });
    const roofM = new THREE.MeshStandardMaterial({ color: 0xc4593a, roughness: 0.9, flatShading: true });
    const trim = new THREE.MeshStandardMaterial({ color: 0x3f7d8c, roughness: 0.8 });

    const body = new THREE.Mesh(new THREE.BoxGeometry(7.5, 4.2, 5.5), wall);
    body.position.y = 2.1;
    g.add(body);

    const roofGeo = new THREE.CylinderGeometry(0.02, 4.6, 8.4, 4);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.scale(1, 1, 0.55);
    const roof = new THREE.Mesh(roofGeo, roofM);
    roof.position.y = 5.3;
    g.add(roof);

    const door = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.15), trim);
    door.position.set(0.6, 1.05, 2.83);
    g.add(door);
    for (const wx of [-2.2, 2.6]) {
      const win = new THREE.Mesh(new THREE.BoxGeometry(1.1, 1.1, 0.12), trim);
      win.position.set(wx, 2.5, 2.83);
      g.add(win);
    }

    // pergola with a desk — the "home office"
    const woodM = new THREE.MeshStandardMaterial({ color: 0x8a6a4a, roughness: 1 });
    for (const px of [-1.6, 1.6]) {
      for (const pz of [0.6, 3.4]) {
        const post = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 2.6, 6), woodM);
        post.position.set(X * 0 + px - 6.2, 1.3, pz + 1.4);
        g.add(post);
      }
    }
    const canopy = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.16, 4), new THREE.MeshStandardMaterial({ color: 0x7d955c, roughness: 1 }));
    canopy.position.set(-6.2, 2.7, 3.4);
    g.add(canopy);
    const desk = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 0.9), woodM);
    desk.position.set(-6.2, 0.95, 3.3);
    g.add(desk);
    const screen = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.6, 0.06), new THREE.MeshStandardMaterial({
      color: 0x222831, emissive: 0x4ecdc4, emissiveIntensity: 0.7, roughness: 0.4,
    }));
    screen.position.set(-6.2, 1.4, 3.1);
    screen.rotation.x = -0.1;
    g.add(screen);

    g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    g.position.set(X, 0, Z);
    g.rotation.y = 0.6;
    this.scene.add(g);

    this.world.addCollider(X, Z, 5.6);
    this.world.addCollider(X - 5.3, Z + 3.6, 2.6); // pergola
    this.#addSign('ABOUT', X, 8.2, Z);
    this.triggers.push({ x: X, z: Z, r: 12, content: CONTENT.about });
  }

  /* ---------- Skills: standing-stone circle ---------- */

  #skillsSite() {
    const X = -34, Z = 24; // Agrigento side — the Valley of the Temples

    const skills = [
      'WordPress', 'WooCommerce', 'PrestaShop', 'Flutter',
      'Supabase', 'Three.js', 'PHP', 'React', 'Linux',
    ];
    const stoneM = new THREE.MeshStandardMaterial({ color: 0xd9c09a, roughness: 1, flatShading: true });

    // one Doric column per skill, ringed around the temple
    skills.forEach((skill, i) => {
      const a = (i / skills.length) * Math.PI * 2;
      const r = 9.5;
      const sx = X + Math.cos(a) * r;
      const sz = Z + Math.sin(a) * r;

      const col = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.3, 1.4), stoneM);
      base.position.y = 0.15;
      col.add(base);
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.55, 3.0, 9), stoneM);
      shaft.position.y = 1.8;
      col.add(shaft);
      const capital = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.45, 0.24, 9), stoneM);
      capital.position.y = 3.42;
      col.add(capital);
      const abacus = new THREE.Mesh(new THREE.BoxGeometry(1.15, 0.22, 1.15), stoneM);
      abacus.position.y = 3.65;
      col.add(abacus);
      col.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      col.position.set(sx, 0, sz);
      this.scene.add(col);
      this.world.addCollider(sx, sz, 1.1);

      const label = makeTextPlane(skill, { size: 0.62, color: '#2b1d12', bg: 'rgba(253,246,236,0.92)' });
      label.position.set(sx, 4.5, sz);
      this.scene.add(label);
      this.billboards.push(label);
      this.bobbers.push({ obj: label, baseY: 4.5, speed: 1.4, phase: i });
    });

    // small Doric temple in the middle — Concordia style
    const temple = new THREE.Group();
    const steps = [[8.2, 6.2, 0.18], [7.4, 5.4, 0.5], [6.6, 4.6, 0.85]];
    for (const [w, d, y] of steps) {
      const s = new THREE.Mesh(new THREE.BoxGeometry(w, 0.35, d), stoneM);
      s.position.y = y;
      temple.add(s);
    }
    for (const cx of [-2.5, 0, 2.5]) {
      for (const cz of [-1.55, 1.55]) {
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.42, 2.5, 8), stoneM);
        shaft.position.set(cx, 2.3, cz);
        temple.add(shaft);
      }
    }
    const architrave = new THREE.Mesh(new THREE.BoxGeometry(6.6, 0.45, 4.4), stoneM);
    architrave.position.y = 3.78;
    temple.add(architrave);
    const roofGeo = new THREE.CylinderGeometry(0.02, 2.4, 7.2, 4, 1);
    roofGeo.rotateY(Math.PI / 4);
    roofGeo.rotateZ(Math.PI / 2);
    roofGeo.scale(1, 1, 0.42);
    const roof = new THREE.Mesh(roofGeo, stoneM);
    roof.position.y = 4.5;
    temple.add(roof);
    temple.traverse((o) => { if (o.isMesh) o.castShadow = true; });
    temple.position.set(X, 0, Z);
    temple.rotation.y = 0.35;
    this.scene.add(temple);
    this.world.addCollider(X, Z, 4.6);

    this.#addSign('SKILLS', X, 9, Z);
    this.triggers.push({ x: X, z: Z, r: 14, content: CONTENT.skills });
  }

  /* ---------- Projects: the harbor district ---------- */

  #projectsSite() {
    // the four projects stand on the orchestra of a Greek theater (Siracusa)
    const district = [
      { p: PROJECTS[0], x: 30, z: 22 },   // Congresso ANFI
      { p: PROJECTS[1], x: 44, z: 20 },   // GeForge
      { p: PROJECTS[2], x: 48, z: 32 },   // Artieri 1895
      { p: PROJECTS[3], x: 32, z: 36 },   // Dottor Diego Tona
    ];

    this.#addSign('PROJECTS', 38, 10.5, 27, { size: 2 });
    this.#theaterCavea(38, 27);

    for (const { p, x, z } of district) {
      const g = new THREE.Group();
      const accent = new THREE.MeshStandardMaterial({
        color: p.color, roughness: 0.5, emissive: p.color, emissiveIntensity: 0.18,
      });

      if (p.id === 'anfi') {
        // a giant phone monolith — the congress PWA — with a medical cross
        const phone = new THREE.Mesh(
          new THREE.BoxGeometry(2.2, 4.2, 0.5),
          new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.4 })
        );
        phone.position.y = 2.4;
        g.add(phone);
        const scr = new THREE.Mesh(new THREE.BoxGeometry(1.85, 3.6, 0.1), accent);
        scr.position.set(0, 2.4, 0.26);
        g.add(scr);
        const crossM = new THREE.MeshStandardMaterial({
          color: 0xfdf6ec, emissive: 0xfdf6ec, emissiveIntensity: 0.5, roughness: 0.4,
        });
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.32, 1.1, 0.06), crossM);
        crossV.position.set(0, 2.7, 0.33);
        g.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.32, 0.06), crossM);
        crossH.position.set(0, 2.7, 0.33);
        g.add(crossH);
        // a little podium with mic in front — congress vibes
        const podium = new THREE.Mesh(new THREE.BoxGeometry(0.7, 1.1, 0.5), new THREE.MeshStandardMaterial({ color: 0x8c6f56, roughness: 0.9 }));
        podium.position.set(0, 0.55, 1.6);
        g.add(podium);
        const mic = new THREE.Mesh(new THREE.SphereGeometry(0.07, 8, 6), new THREE.MeshStandardMaterial({ color: 0x2b2b30 }));
        mic.position.set(0, 1.25, 1.55);
        g.add(mic);
      } else if (p.id === 'geforge') {
        // the forge: workshop with chimney and a glowing anvil ember
        const shop = new THREE.Mesh(
          new THREE.BoxGeometry(4.6, 3, 3.6),
          new THREE.MeshStandardMaterial({ color: 0x8c6f56, roughness: 1 })
        );
        shop.position.y = 1.5;
        g.add(shop);
        const roofGeo = new THREE.CylinderGeometry(0.02, 2.9, 5.3, 4);
        roofGeo.rotateY(Math.PI / 4);
        roofGeo.rotateZ(Math.PI / 2);
        roofGeo.scale(1, 1, 0.55);
        const roof = new THREE.Mesh(roofGeo, new THREE.MeshStandardMaterial({ color: 0x55403a, roughness: 1, flatShading: true }));
        roof.position.y = 3.8;
        g.add(roof);
        const chimney = new THREE.Mesh(new THREE.BoxGeometry(0.8, 2.2, 0.8), new THREE.MeshStandardMaterial({ color: 0x6e5a50, roughness: 1 }));
        chimney.position.set(1.4, 4.4, -0.8);
        g.add(chimney);
        const ember = new THREE.Mesh(new THREE.BoxGeometry(1.2, 0.7, 0.8), accent);
        ember.position.set(0, 0.36, 2.4);
        g.add(ember);
      } else if (p.id === 'artieri') {
        // artisan atelier stall: striped awning over alabaster vessels
        const woodM = new THREE.MeshStandardMaterial({ color: 0x9a7a52, roughness: 1 });
        const alabaster = new THREE.MeshStandardMaterial({ color: 0xf0e6d6, roughness: 0.35 });
        const counter = new THREE.Mesh(new THREE.BoxGeometry(4, 1.1, 1.6), woodM);
        counter.position.y = 0.55;
        g.add(counter);
        for (const px of [-1.8, 1.8]) {
          const post = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 3, 6), woodM);
          post.position.set(px, 1.5, -0.6);
          g.add(post);
        }
        // striped awning from thin boxes
        for (let i = 0; i < 6; i++) {
          const stripe = new THREE.Mesh(
            new THREE.BoxGeometry(0.68, 0.06, 2.2),
            i % 2 ? accent : new THREE.MeshStandardMaterial({ color: 0xfdf6ec, roughness: 0.9 })
          );
          stripe.position.set(-1.7 + i * 0.68, 3.05, 0.1);
          stripe.rotation.x = 0.32;
          g.add(stripe);
        }
        // alabaster vases and bowls on the counter
        for (let i = 0; i < 4; i++) {
          const vase = new THREE.Mesh(
            new THREE.CylinderGeometry(0.12 + (i % 2) * 0.08, 0.2, 0.45 + (i % 3) * 0.18, 9),
            alabaster
          );
          vase.position.set(-1.3 + i * 0.85, 1.35, 0.25);
          g.add(vase);
        }
        const bowl = new THREE.Mesh(new THREE.SphereGeometry(0.26, 9, 6, 0, Math.PI * 2, 0, Math.PI / 2), alabaster);
        bowl.rotation.x = Math.PI;
        bowl.position.set(0.35, 1.3, -0.2);
        g.add(bowl);
      } else {
        // tona: a little wellness studio with a glowing cross sign
        const studio = new THREE.Mesh(
          new THREE.BoxGeometry(3.6, 2.8, 3),
          new THREE.MeshStandardMaterial({ color: 0xf6efe2, roughness: 0.9 })
        );
        studio.position.y = 1.4;
        g.add(studio);
        const roof = new THREE.Mesh(
          new THREE.BoxGeometry(3.9, 0.18, 3.3),
          new THREE.MeshStandardMaterial({ color: 0x4a6a78, roughness: 0.8 })
        );
        roof.position.y = 2.9;
        g.add(roof);
        const door = new THREE.Mesh(
          new THREE.BoxGeometry(0.9, 1.7, 0.1),
          new THREE.MeshStandardMaterial({ color: 0x4a6a78, roughness: 0.8 })
        );
        door.position.set(0, 0.85, 1.53);
        g.add(door);
        // glowing cross above the door
        const crossV = new THREE.Mesh(new THREE.BoxGeometry(0.3, 1.0, 0.14), accent);
        crossV.position.set(0, 3.7, 1.2);
        g.add(crossV);
        const crossH = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.3, 0.14), accent);
        crossH.position.set(0, 3.7, 1.2);
        g.add(crossH);
        // a pair of dumbbells outside — coaching side of the practice
        const barM = new THREE.MeshStandardMaterial({ color: 0x3a3f4c, roughness: 0.35, metalness: 0.5 });
        const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1.4, 8), barM);
        bar.rotation.z = Math.PI / 2;
        bar.position.set(1.6, 0.35, 2.2);
        g.add(bar);
        for (const bx of [0.98, 2.22]) {
          const plate = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.22, 10), barM);
          plate.rotation.z = Math.PI / 2;
          plate.position.set(bx, 0.35, 2.2);
          g.add(plate);
        }
      }

      g.traverse((o) => { if (o.isMesh) o.castShadow = true; });
      g.position.set(x, 0, z);
      g.lookAt(0, 0, 0);
      this.scene.add(g);
      this.world.addCollider(x, z, 3.4);

      const label = makeTextPlane(p.short, {
        size: 0.85,
        bg: `rgba(22, 38, 61, 0.85)`,
      });
      label.position.set(x, 5.6, z);
      this.scene.add(label);
      this.billboards.push(label);
      this.bobbers.push({ obj: label, baseY: 5.6, speed: 1.6, phase: x });

      this.triggers.push({ x, z, r: 7.5, content: p });
    }
  }

  // semicircular stepped seating (cavea) around the projects, opening
  // toward the piazza so the path leads straight onto the orchestra
  #theaterCavea(cx, cz) {
    const stoneM = new THREE.MeshStandardMaterial({ color: 0xd9c09a, roughness: 1, flatShading: true });
    const openDir = Math.atan2(-cz, -cx); // toward the island center
    const arc = Math.PI * 2 * (240 / 360); // 240° of seats, 120° opening
    const group = new THREE.Group();

    for (let row = 0; row < 4; row++) {
      const r = 15 + row * 2.4;
      const h = 0.85 + row * 0.62;
      const count = 16 + row * 3;
      for (let i = 0; i < count; i++) {
        const phi = openDir + Math.PI - arc / 2 + (i + 0.5) * (arc / count);
        const w = (arc * r) / count + 0.15;
        const seat = new THREE.Mesh(new THREE.BoxGeometry(w, h, 2.3), stoneM);
        seat.position.set(cx + Math.cos(phi) * r, h / 2, cz + Math.sin(phi) * r);
        seat.rotation.y = -(phi + Math.PI / 2);
        seat.castShadow = true;
        group.add(seat);
        // colliders only on the outermost row, spaced out
        if (row === 3 && i % 2 === 0) {
          this.world.addCollider(seat.position.x, seat.position.z, 2.4);
        }
      }
    }
    // inner row needs colliders too so the vehicle can't clip through seats
    for (let i = 0; i < 14; i++) {
      const phi = openDir + Math.PI - arc / 2 + (i + 0.5) * (arc / 14);
      this.world.addCollider(cx + Math.cos(phi) * 15, cz + Math.sin(phi) * 15, 2.2);
    }
    this.scene.add(group);
  }

  /* ---------- Contact: the lighthouse pier ---------- */

  #contactSite() {
    const X = -84, Z = 6; // Capo Boeo, the west tip — a real lighthouse spot

    const g = new THREE.Group();

    const white = new THREE.MeshStandardMaterial({ color: 0xfaf3e3, roughness: 0.9 });
    const red = new THREE.MeshStandardMaterial({ color: 0xc4453a, roughness: 0.9 });

    // striped tower
    for (let i = 0; i < 5; i++) {
      const r0 = 1.9 - i * 0.22;
      const seg = new THREE.Mesh(
        new THREE.CylinderGeometry(r0 - 0.11, r0, 2.2, 14),
        i % 2 ? red : white
      );
      seg.position.y = 1.1 + i * 2.2;
      seg.castShadow = true;
      g.add(seg);
    }
    // lamp room
    const cage = new THREE.Mesh(
      new THREE.CylinderGeometry(1.05, 1.05, 1.5, 10),
      new THREE.MeshStandardMaterial({ color: 0x2b2f3a, roughness: 0.5 })
    );
    cage.position.y = 11.7;
    g.add(cage);
    const lamp = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 12, 8),
      new THREE.MeshStandardMaterial({
        color: 0xfff3c4, emissive: 0xffd76a, emissiveIntensity: 1.6, roughness: 0.2,
      })
    );
    lamp.position.y = 11.7;
    g.add(lamp);
    const cap = new THREE.Mesh(new THREE.ConeGeometry(1.3, 1, 10), red);
    cap.position.y = 13;
    g.add(cap);

    // rotating beam
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(0.12, 2.4, 26, 10, 1, true),
      new THREE.MeshBasicMaterial({
        color: 0xffe9a8, transparent: true, opacity: 0.16,
        side: THREE.DoubleSide, depthWrite: false,
      })
    );
    beam.rotation.z = Math.PI / 2;
    const beamPivot = new THREE.Group();
    beamPivot.add(beam);
    beam.position.x = 13;
    beamPivot.position.y = 11.7;
    g.add(beamPivot);
    this.beamPivot = beamPivot;

    // mailbox at the base
    const box = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.55, 0.5), red);
    box.position.set(2.6, 1.15, 1.2);
    const post = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 1, 6), new THREE.MeshStandardMaterial({ color: 0x6e5440 }));
    post.position.set(2.6, 0.5, 1.2);
    g.add(box, post);

    g.position.set(X, 0, Z);
    this.scene.add(g);
    this.world.addCollider(X, Z, 2.6);

    this.#addSign('CONTACT', X, 16, Z);
    this.triggers.push({ x: X, z: Z, r: 11, content: CONTENT.contact });
  }

  /* ---------- runtime ---------- */

  update(t, dt, vehiclePos, camera) {
    // billboards face the camera
    for (const b of this.billboards) b.quaternion.copy(camera.quaternion);

    // gentle bobbing / spinning
    for (const bo of this.bobbers) {
      const y = bo.baseY + Math.sin(t * bo.speed + bo.phase) * 0.25;
      bo.obj.position.y = y;
      if (bo.spin) bo.obj.rotation.y = t * 0.8;
    }

    if (this.beamPivot) this.beamPivot.rotation.y = t * 0.7;

    // proximity triggers
    let hit = null;
    for (const tr of this.triggers) {
      if (Math.hypot(vehiclePos.x - tr.x, vehiclePos.z - tr.z) < tr.r) { hit = tr; break; }
    }

    if (hit) {
      if (this.active !== hit && this.active !== '__dismissed__') {
        this.active = hit;
        this.#showPanel(hit.content);
      }
    } else if (this.active) {
      if (this.active !== '__dismissed__') this.#hidePanel();
      this.active = null;
    }
  }

  #showPanel(c) {
    this.panelTag.textContent = c.tag;
    this.panelTitle.textContent = c.title;
    this.panelBody.innerHTML = c.body;
    this.panelLinks.innerHTML = (c.links || [])
      .map((l) => `<a href="${l.href}" target="_blank" rel="noopener" class="${l.alt ? 'alt' : ''}">${l.label}</a>`)
      .join('');
    this.panel.classList.remove('hidden');
    requestAnimationFrame(() => this.panel.classList.add('show'));
  }

  #hidePanel() {
    this.panel.classList.remove('show');
  }
}
