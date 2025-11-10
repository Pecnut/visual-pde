---
layout: demo_custom
lesson_number: 200
title: Wildfires
thumbnail: /assets/images/Wildfires.webp
---

<!-- Simulation -->
<iframe id="sim" class="sim" src="/sim/?preset=forestFires3D&story&lite&no_ui&noop" frameborder="0" loading="lazy"></iframe>

<!-- Sliders -->
<div style="display:flex;flex-direction:column;row-gap:10dvh;">
<a class="site-title" rel="author" href="{{ "/demos" | relative_url }}">
        <img
            class="light-mode-img"
            src="/assets/images/logo.webp"
            alt="Heart-shaped logo"
        /><img
            class="dark-mode-img"
            src="/assets/images/logo-dark.webp"
            alt="Heart-shaped logo"
        />VisualPDE</a>
<div>
    <h1>Understanding wildfires</h1>
    <h3>Click to ignite a fire.<br>Adjust the direction and speed of the wind</h3>
    <p><vpde-reset iframe="sim"></vpde-reset></p>
</div>
<p style="text-align:center;margin-top:0;display:none;"><vpde-slider
    iframe="sim"
    name="theta"
    label=""
    min="0"
    max="6.2832"
    value="1.5707963268"
    step="0.001"
    id="wind"
></vpde-slider></p>
<div>
<div class="knob-container no-select">
  <div class="knob" attached-slider="wind"></div>
  <div style="position:absolute; left:calc(50% - 2px); top:-10px; transform:translateX(-50%); font-size:14px;">N</div>
  <div style="position:absolute; left:calc(50% - 2px); bottom:-4px; transform:translateX(-50%); font-size:14px;">S</div>
  <div style="position:absolute; left:-8px; top:50%; transform:translateY(-50%); font-size:14px;">W</div>
  <div style="position:absolute; right:4px; top:50%; transform:translateY(-50%); font-size:14px;">E</div>
</div>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="sim"
    name="V"
    label="Wind speed"
    min-label="None"
    max-label="High"
    min="0"
    max="0.003"
    value="0.0015"
    step="0.00001"
></vpde-slider></p>
</div>
</div>

<style>

  iframe.sim {
    margin-bottom: 20px;
  }

.knob-container {
  position: relative;
  width: 110px;
  height: 110px;
  margin: 20px auto 40px auto;
  border-radius: 16px;
  padding: 10px;
}

.knob {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  background: radial-gradient(circle at 60% 40%, #f1f5f9 0%, #cbd5e1 100%);
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  position: relative;
  border: 2px solid #94a3b8;
  transition: box-shadow 0.2s;
}

.knob:hover, .knob:active {
  border-color: #64748b;
}

.knob::after {
  content: '';
  position: absolute;
  width: 6px;
  height: 44px;
  background: var(--slider-fill-color);
  top: 12px;
  left: 50%;
  transform: translateX(-50%);
  border-radius: 3px;
  box-shadow: 0 2px 6px rgba(56,189,248,0.15);
}

.knob::before {
  content: '';
  position: absolute;
  top: 6px;
  left: 50%;
  transform: translateX(-50%);
  border-style: solid;
  border-width: 0 8px 14px 8px;
  border-color: transparent transparent var(--slider-fill-color) transparent;
  width: 0;
  height: 0;
  pointer-events: none;
}

</style>

<script>
const knobs = document.getElementsByClassName('knob');

const min = 0;
const max = 6.2832;
let value = 0;
let dragging = false;
let activeKnob = null;

function setValueFromAngle(knob,angle) {
  // Map angle (0–360) to min–max
  const angleDeg = angle / (2*Math.PI) * 360;
  const newValue = (angle / (2*Math.PI)) * (max - min) + min;
  value = ((newValue - min + (max - min + 1)) % (max - min + 1)) + min; // Wrap around
  const sliderId = knob.getAttribute('attached-slider');
  const slider = document.getElementById(sliderId);
  slider.setValue(value);
  knob.style.transform = `rotate(${-angleDeg+90}deg)`;
}

function getAngle(cx, cy, ex, ey) {
  const dx = ex - cx;
  const dy = cy - ey;
  let theta = Math.atan2(dy, dx)
  if (theta < 0) theta += 2*Math.PI;
  return theta;
}

function activateKnob(knob,e) {
  if (!dragging) return;
  const rect = knob.getBoundingClientRect();
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const angle = getAngle(cx, cy, e.clientX, e.clientY);
  setValueFromAngle(knob,angle);
}

// For knob in knobs:
for (let i = 0; i < knobs.length; i++) {
  const knob = knobs[i];
  knob.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      dragging = true;
      activeKnob = knob;
      activateKnob(knob,e);
  });
}
document.addEventListener('pointerup', () => {
  dragging = false;
  activeKnob = null;
});

document.addEventListener('pointermove', (e) => {
  if (activeKnob) {
    activateKnob(activeKnob,e);
  }
});
</script>