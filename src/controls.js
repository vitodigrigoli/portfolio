// Unified input: keyboard (WASD/arrows) + touch joystick.
// Exposes throttle [-1, 1] and steer [-1, 1] read by the vehicle each frame.
export class Controls {
  constructor() {
    this.keys = new Set();
    this.joy = { active: false, x: 0, y: 0 };
    this.isTouch = window.matchMedia('(pointer: coarse)').matches;

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
    });
    window.addEventListener('keyup', (e) => this.keys.delete(e.code));
    window.addEventListener('blur', () => this.keys.clear());

    if (this.isTouch) this.#setupJoystick();
  }

  #setupJoystick() {
    const zone = document.getElementById('joystick');
    const knob = document.getElementById('joystick-knob');
    zone.classList.remove('hidden');

    const radius = 62;
    let pointerId = null;

    const move = (clientX, clientY) => {
      const rect = zone.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const len = Math.hypot(dx, dy);
      if (len > radius) { dx = (dx / len) * radius; dy = (dy / len) * radius; }
      this.joy.x = dx / radius;
      this.joy.y = -dy / radius; // up = forward
      knob.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    };

    const release = () => {
      pointerId = null;
      this.joy.active = false;
      this.joy.x = 0;
      this.joy.y = 0;
      knob.style.transform = 'translate(-50%, -50%)';
    };

    zone.addEventListener('pointerdown', (e) => {
      pointerId = e.pointerId;
      this.joy.active = true;
      zone.setPointerCapture(e.pointerId);
      move(e.clientX, e.clientY);
    });
    zone.addEventListener('pointermove', (e) => {
      if (e.pointerId === pointerId) move(e.clientX, e.clientY);
    });
    zone.addEventListener('pointerup', release);
    zone.addEventListener('pointercancel', release);
  }

  get throttle() {
    if (this.joy.active) return this.joy.y;
    let t = 0;
    if (this.keys.has('KeyW') || this.keys.has('ArrowUp')) t += 1;
    if (this.keys.has('KeyS') || this.keys.has('ArrowDown')) t -= 1;
    return t;
  }

  get steer() {
    if (this.joy.active) return this.joy.x;
    let s = 0;
    if (this.keys.has('KeyA') || this.keys.has('ArrowLeft')) s -= 1;
    if (this.keys.has('KeyD') || this.keys.has('ArrowRight')) s += 1;
    return s;
  }
}
