---
layout: page
title: Flame fronts
lesson_number: 60
thumbnail: /assets/images/Wildfires.webp
extract: Modelling the dynamics of wildfires 
equation:
categories: [visual stories]
---

Over the past couple of years, you’ve probably heard about (and maybe even experienced) the growing danger of wildfires. They’re a natural hazard to many ecosystems with enough biomass to burn, and vulnerability is likely to rise, especially in areas not adapted to such disturbances, thanks to climate change.

No single factor causes a wildfire; it’s the combination of multiple drivers in an ecosystem where, once a certain threshold is crossed, conditions escalate dramatically. Understanding the complexities of wildfire dynamics is key for sustainable ecosystem management in a changing world.

In this Visual Story, we’ll explore some of the underlying dynamics of fire spread and see how they might be influenced by changes in vegetation structure and atmospheric conditions. As with many biological systems, we’ll take a set of complex, interacting processes and simplify them so we can draw some insights about how the real world behaves. At the end, we’ll point you towards further resources, including discussions of the assumptions behind the mathematical model that inspired this work.

# Catching fire

Fire spreads through a combination of temperature diffusion, natural and wind-driven convection, and chemical reactions in the burning environment. To start, imagine it’s a
completely still day in a flat field with no wind at all. Vegetation is bountiful in the top and scarce on the bottom, which we’ll represent as a 'mass fraction'. In the simulation below, you can set an ignition point anywhere on the screen and watch how the fire spreads over time, and how it depends on the amount of vegetation. On the left,
colours show temperature; on the right, they show vegetation mass fraction (greener = more vegetation). To reset the simulation, click <span><vpde-reset iframe="simA"></vpde-reset></span>

<iframe class="sim" id="simA" src="/sim/?preset=forestFiresSplitscreen&story&sf=1&reset_only&nomathjax&initCond_2=0.2%2b0.8*ind(y<0.5*L_y)" style="width:100%;max-width:100%;aspect-ratio:2/1" frameborder="0" loading="lazy"></iframe>

# Convection and slopes

Heat naturally rises, which results in fires on sloped terrain travelling uphill faster than downhill — a positive feedback loop of 'radiative heat flux'. Rising heat dries and preheats vegetation above the flames, then the heat rising ahead of it accelerates its spread. In the simulation below, we’ll look at the effects of slopes via an undulating elevation profile. Try setting another ignition point to see how hills and valleys affect the burn pattern.

<iframe class="sim" id="simB" src="/sim/?preset=forestFires3D&story&sf=1&reset_only&nomathjax" style="width:70%;max-width:70%;aspect-ratio:1" frameborder="0" loading="lazy"></iframe>

# Windswept

Wind can dramatically influence the direction, speed, and shape of wildfire spread. Around the world, dangerous, fast-moving wildfires often result from a combination of built-up dry vegetation (e.g. from last year’s growth) and fast wind speeds in just the right direction to push the flames uphill. Strong winds feed fresh oxygen into the fire (the same effect as when you’re having a campfire and you need to blow into the flames to get it going). They carry embers far ahead of the main front, sparking new ignitions (spot fires) and, when the fire gets large enough, it starts to produce its own wind convection. These factors make control efforts incredibly difficult, sometimes impossible.

In the simulation below, you can adjust wind direction and speed to see how it affects the burn pattern. Try varying the wind direction whilst the fire is spreading (click to ignite a fire). To reset the simulation, click <span><vpde-reset iframe="simC"></vpde-reset></span>

<iframe class="sim" id="simC" src="/sim/?preset=forestFiresSplitscreen&story&sf=1&reset_only&nomathjax&initCond_2=1" style="width:100%;max-width:100%;aspect-ratio:2/1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;display:none;"><vpde-slider
    iframe="simC"
    name="theta"
    label=""
    min="0"
    max="6.2832"
    value="1.5707963268"
    step="0.001"
    id="windC"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simC"
    name="V"
    label="Wind speed"
    min-label="None"
    max-label="High"
    min="0"
    max="0.003"
    value="0.0015"
    step="0.00001"
></vpde-slider></p>
<div class="knob-container no-select" style="position: relative;">
  <div class="knob" attached-slider="windC"></div>
  <div style="position:absolute; left:calc(50% - 2px); top:-10px; transform:translateX(-50%); font-size:14px;">N</div>
  <div style="position:absolute; left:calc(50% - 2px); bottom:-4px; transform:translateX(-50%); font-size:14px;">S</div>
  <div style="position:absolute; left:-8px; top:50%; transform:translateY(-50%); font-size:14px;">W</div>
  <div style="position:absolute; right:4px; top:50%; transform:translateY(-50%); font-size:14px;">E</div>
</div>

# A real-world example

Let’s move to a real-world example: Saddleworth Moor in Greater Manchester, which has faced increasing wildfire problems in recent years. The moor is dominated by acid grassland, heather, and heathland grasses — a perfect case for this model, since we can simplify things by focusing on a single vegetation type. 

In the simulation below, we use the real elevation profile of the area, but remove vegetation where roads, waterways, or urban/suburban land occur. As before, click anywhere to ignite a fire and explore how it spreads under different wind conditions.

<iframe class="sim" id="simD" src="/sim/?preset=forestFires3D&story&sf=1&reset_only&nomathjax" style="width:70%;max-width:70%;aspect-ratio:1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;display:none;"><vpde-slider
    iframe="simD"
    name="theta"
    label=""
    min="0"
    max="6.2832"
    value="1.5707963268"
    step="0.001"
    id="windD"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simD"
    name="V"
    label="Wind speed"
    min-label="None"
    max-label="High"
    min="0"
    max="0.003"
    value="0.0015"
    step="0.00001"
></vpde-slider></p>
<div class="knob-container no-select">
  <div class="knob" attached-slider="windD"></div>
  <div style="position:absolute; left:calc(50% - 2px); top:-10px; transform:translateX(-50%); font-size:14px;">N</div>
  <div style="position:absolute; left:calc(50% - 2px); bottom:-4px; transform:translateX(-50%); font-size:14px;">S</div>
  <div style="position:absolute; left:-8px; top:50%; transform:translateY(-50%); font-size:14px;">W</div>
  <div style="position:absolute; right:4px; top:50%; transform:translateY(-50%); font-size:14px;">E</div>
</div>

An important takeaway from this story is that we’re only looking at a small slice of the many factors that influence wildfire spread. Even so, the model is already fairly complex for a mathematical simulation. Other important influences include chemical activation energies, reaction heats, ignition temperatures, and vegetation properties such as species and moisture content — all active areas of research. 

# Looking for more?

If you want to dig deeper, [this fullscreen simulation](/sim/?preset=forestFires3D) lets you experiment with some of these extra parameters and see how they alter the landscape.


Enjoyed this Visual Story? We'd love to hear your feedback at [hello@visualpde.com](mailto:hello@visualpde.com).

Looking for more VisualPDE? Try out our other [Visual Stories](/visual-stories) or some mathematically flavoured content from the [VisualPDE library](/explore).

This Story was written in collaboration with [Axa Laaperi](https://research.ncl.ac.uk/one-planet/ourresearchers/cohort5/axa-marialaaperi.html).

## References and further reading

1. M. Asensio and L. Ferragut, "[On a wildland fire model with radiation](https://doi.org/10.1002/nme.420)", International
Journal for Numerical Methods in Engineering, vol. 54, pp. 137–157, 5 2002.

1. P. Andrews, "[The Rothermel surface fire spread model and associated developments: A
comprehensive explanation](https://doi.org/10.2737/RMRS-GTR-371)", 1972.

1.  I. Glassman, R. Yetter, and N. Glumac, "[Combustion](https://books.google.co.uk/books/about/Combustion.html?id=lLJZAwAAQBAJ)", Boston: Academic Press, fifth edition ed., 2015.

1.  A. Collin, D. Bernardin, and O. S´ ero-Guillaume, "[A physical-based cellular automaton model for forest-fire propagation](https://doi.org/10.1080/00102202.2010.508476)", Combustion Science and Technology, vol. 183, no. 4, pp. 347–369, 2011.

1.  G. Clay, C. Belcher, S. Doerr, A. Elliott, M. Hardiman, N. Kettridge, G. Millin-Chalabi, J. Morison, C. Santin, and T. Smith, "Toward a UK fire danger rating system: Understanding fuels, fire behaviour, and impacts", 4-8 May 2020.

<script type='text/javascript'>
    run_only_one_sim(['simA', 'simB', 'simC', 'simD']);
</script>

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
