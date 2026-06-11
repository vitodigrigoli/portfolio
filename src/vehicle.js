import * as THREE from 'three';
import { coastRadius } from './sicily.js';

// A classic Piaggio Vespa in Rosso Corsa red, with arcade physics.
// Kinematic model: heading + signed speed, circle collisions resolved by
// push-out, drivable area clamped to the Sicilian coastline.
export class Vehicle {
  constructor(scene, colliders) {
    this.colliders = colliders;          // [{x, z, r}]
    this.position = new THREE.Vector3(0, 0, 8);
    this.heading = Math.PI;              // facing the camera spawn-side
    this.speed = 0;
    this.radius = 1.0;

    this.maxSpeed = 18;
    this.maxReverse = -6;
    this.accel = 24;
    this.brake = 36;
    this.drag = 8;
    this.steerSpeed = 2.4;

    this.steerVisual = 0;
    this.wheelSpin = 0;

    this.group = new THREE.Group();
    this.#buildMesh();
    this.group.position.copy(this.position);
    scene.add(this.group);
  }

  #buildMesh() {
    const paint = new THREE.MeshStandardMaterial({ color: 0xc6342b, roughness: 0.45 });
    const cream = new THREE.MeshStandardMaterial({ color: 0xfdf2dd, roughness: 0.7 });
    const dark = new THREE.MeshStandardMaterial({ color: 0x2b2b30, roughness: 0.85 });
    const chrome = new THREE.MeshStandardMaterial({ color: 0xd8d8d2, roughness: 0.25, metalness: 0.7 });
    const leather = new THREE.MeshStandardMaterial({ color: 0x5a4633, roughness: 0.9 });

    // everything leans together in turns
    const lean = new THREE.Group();
    this.group.add(lean);
    this.body = lean;

    const wheelGeo = new THREE.CylinderGeometry(0.34, 0.34, 0.16, 14);
    wheelGeo.rotateZ(Math.PI / 2);
    const hubGeo = new THREE.CylinderGeometry(0.17, 0.17, 0.18, 10);
    hubGeo.rotateZ(Math.PI / 2);

    const mkWheel = () => {
      const w = new THREE.Group();
      w.add(new THREE.Mesh(wheelGeo, dark), new THREE.Mesh(hubGeo, cream));
      return w;
    };

    /* --- front end: pivots as one piece around the steering axis --- */
    const steer = new THREE.Group();
    steer.position.set(0, 0, -1.0);
    lean.add(steer);
    this.steerGroup = steer;

    this.frontWheel = mkWheel();
    this.frontWheel.position.set(0, 0.34, 0);
    steer.add(this.frontWheel);

    // front fender hugging the wheel
    const fender = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), paint);
    fender.scale.set(0.78, 1.05, 1.25);
    fender.position.set(0, 0.46, 0);
    steer.add(fender);

    // fork column up to the handlebar
    const column = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 1.0, 8), paint);
    column.position.set(0, 0.95, 0.07);
    column.rotation.x = 0.14;
    steer.add(column);

    // handlebar with grips
    const bar = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.8, 8), chrome);
    bar.rotation.z = Math.PI / 2;
    bar.position.set(0, 1.46, 0.12);
    steer.add(bar);
    for (const gx of [-0.38, 0.38]) {
      const grip = new THREE.Mesh(new THREE.CylinderGeometry(0.065, 0.065, 0.18, 8), dark);
      grip.rotation.z = Math.PI / 2;
      grip.position.set(gx, 1.46, 0.12);
      steer.add(grip);
    }

    // round headlight
    const headlight = new THREE.Mesh(new THREE.SphereGeometry(0.16, 10, 8), cream);
    headlight.scale.set(1, 1, 0.7);
    headlight.position.set(0, 1.32, -0.06);
    steer.add(headlight);

    // little round mirror
    const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.3, 6), chrome);
    stalk.position.set(-0.3, 1.65, 0.12);
    stalk.rotation.z = 0.4;
    steer.add(stalk);
    const mirror = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.09, 0.02, 10), chrome);
    mirror.rotation.x = Math.PI / 2;
    mirror.position.set(-0.37, 1.8, 0.12);
    steer.add(mirror);

    /* --- the body --- */

    // leg shield — the Vespa's signature curved front apron
    const shield = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.55, 1.05, 12, 1, true, Math.PI * 0.62, Math.PI * 0.76), paint);
    shield.position.set(0, 0.85, -0.62);
    shield.rotation.x = -0.1;
    shield.material.side = THREE.DoubleSide;
    lean.add(shield);

    // floorboard
    const floor = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.1, 1.0), paint);
    floor.position.set(0, 0.3, -0.05);
    lean.add(floor);

    // central spine up to the seat
    const spine = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.5, 0.8), paint);
    spine.position.set(0, 0.55, 0.45);
    spine.rotation.x = -0.5;
    lean.add(spine);

    // rear body — the bulbous cowls
    const tail = new THREE.Mesh(new THREE.SphereGeometry(0.5, 12, 10), paint);
    tail.scale.set(0.95, 0.78, 1.5);
    tail.position.set(0, 0.78, 0.78);
    lean.add(tail);
    for (const cx of [-0.3, 0.3]) {
      const cowl = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), paint);
      cowl.scale.set(0.7, 0.72, 1.15);
      cowl.position.set(cx, 0.66, 0.82);
      lean.add(cowl);
    }

    // saddle
    const seat = new THREE.Mesh(new THREE.SphereGeometry(0.34, 10, 8), leather);
    seat.scale.set(0.95, 0.42, 1.5);
    seat.position.set(0, 1.12, 0.45);
    lean.add(seat);

    // rear rack with a lemon crate and a helmet — andiamo
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.04, 0.45), chrome);
    rack.position.set(0, 1.06, 1.28);
    lean.add(rack);
    const crate = new THREE.Mesh(
      new THREE.BoxGeometry(0.42, 0.26, 0.4),
      new THREE.MeshStandardMaterial({ color: 0xb98a4e, roughness: 0.9 })
    );
    crate.position.set(0, 1.21, 1.28);
    lean.add(crate);
    const lemons = new THREE.Mesh(
      new THREE.SphereGeometry(0.2, 8, 6),
      new THREE.MeshStandardMaterial({ color: 0xf7d633, roughness: 0.6 })
    );
    lemons.scale.set(1, 0.5, 1);
    lemons.position.set(0, 1.36, 1.28);
    lean.add(lemons);
    const helmet = new THREE.Mesh(new THREE.SphereGeometry(0.2, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2), cream);
    helmet.position.set(0, 1.14, 0.85);
    lean.add(helmet);

    // taillight
    const tailLight = new THREE.Mesh(
      new THREE.BoxGeometry(0.12, 0.1, 0.06),
      new THREE.MeshStandardMaterial({ color: 0xc23b3b, emissive: 0x801818, roughness: 0.4 })
    );
    tailLight.position.set(0, 0.92, 1.5);
    lean.add(tailLight);

    // engine hint under the cowl
    const engine = new THREE.Mesh(new THREE.BoxGeometry(0.45, 0.35, 0.5), dark);
    engine.position.set(0.05, 0.4, 0.8);
    lean.add(engine);

    // rear wheel
    this.rearWheel = mkWheel();
    this.rearWheel.position.set(0, 0.34, 0.95);
    lean.add(this.rearWheel);

    // kickstand-ish stub for silhouette
    const stand = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.3, 6), dark);
    stand.position.set(-0.2, 0.18, 0.6);
    stand.rotation.z = 0.5;
    lean.add(stand);

    this.group.traverse((o) => { if (o.isMesh) o.castShadow = true; });
  }

  reset() {
    this.position.set(0, 0, 8);
    this.heading = Math.PI;
    this.speed = 0;
  }

  update(dt, controls) {
    const throttle = THREE.MathUtils.clamp(controls.throttle, -1, 1);
    const steer = THREE.MathUtils.clamp(controls.steer, -1, 1);

    // longitudinal
    if (throttle > 0.05) {
      this.speed += this.accel * throttle * dt;
    } else if (throttle < -0.05) {
      // braking if moving forward, reversing otherwise
      this.speed += (this.speed > 0.5 ? -this.brake : this.accel * throttle) * dt;
    } else {
      // coast
      const dragForce = this.drag * dt;
      if (Math.abs(this.speed) < dragForce) this.speed = 0;
      else this.speed -= Math.sign(this.speed) * dragForce;
    }
    this.speed = THREE.MathUtils.clamp(this.speed, this.maxReverse, this.maxSpeed);

    // steering scales with speed (no spinning in place), flips in reverse
    const speedFactor = THREE.MathUtils.clamp(Math.abs(this.speed) / 6, 0, 1);
    this.heading -= steer * this.steerSpeed * speedFactor * Math.sign(this.speed) * dt;

    // integrate
    this.position.x += Math.sin(this.heading) * this.speed * dt;
    this.position.z += Math.cos(this.heading) * this.speed * dt;

    this.#resolveCollisions();

    // coastline clamp — stop where the beach starts sloping into the sea
    // (terrain is flat up to 12 units inland of the coast, then drops)
    const dist = Math.hypot(this.position.x, this.position.z);
    const rMax = coastRadius(this.position.x, this.position.z) - 13;
    if (dist > rMax) {
      const s = rMax / dist;
      this.position.x *= s;
      this.position.z *= s;
      this.speed *= 0.6;
    }

    // visuals — the mesh front is at local -z, while motion maps to local +z,
    // so the visual group is turned half a revolution relative to the heading
    this.group.position.copy(this.position);
    this.group.rotation.y = this.heading + Math.PI;

    this.steerVisual = THREE.MathUtils.lerp(this.steerVisual, -steer * 0.55, 10 * dt);
    this.steerGroup.rotation.y = this.steerVisual;

    this.wheelSpin -= (this.speed / 0.34) * dt;
    this.frontWheel.children.forEach((c) => (c.rotation.x = this.wheelSpin));
    this.rearWheel.children.forEach((c) => (c.rotation.x = this.wheelSpin));

    // scooters lean into turns — the whole bike, not just the body
    const targetRoll = -steer * speedFactor * Math.sign(this.speed) * 0.22;
    const targetPitch = throttle * 0.03;
    this.body.rotation.z = THREE.MathUtils.lerp(this.body.rotation.z, targetRoll, 6 * dt);
    this.body.rotation.x = THREE.MathUtils.lerp(this.body.rotation.x, targetPitch, 6 * dt);

    // idle putter
    this.body.position.y = Math.sin(performance.now() * 0.025) * 0.01 * (1 + Math.abs(this.speed) * 0.15);
  }

  #resolveCollisions() {
    for (const c of this.colliders) {
      const dx = this.position.x - c.x;
      const dz = this.position.z - c.z;
      const dist = Math.hypot(dx, dz);
      const minDist = c.r + this.radius;
      if (dist < minDist && dist > 0.0001) {
        const push = (minDist - dist);
        this.position.x += (dx / dist) * push;
        this.position.z += (dz / dist) * push;
        this.speed *= 0.82; // scrub speed on impact
      }
    }
  }
}
