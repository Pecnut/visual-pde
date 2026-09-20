---
layout: page
title: Flowing bacteria
lesson_number: 160
thumbnail: /assets/images/bacteriaInFlow.webp
extract: A toy model of decay and advection in rivers
categories: [biology, parabolic]
---

Modelling the concentration of bacteria in a river is a complex, multifaceted problem. This example lets us explore a toy model that manages to capture some of the key ideas by ignoring much of the real-world complexity.

We limit ourselves to a single reach (i.e. a stretch of river without anything remarkable along it), and specify an inlet concentration of bacteria at the upstream (left) edge of the domain. 

Clicking in the simulation below will instantly add bacteria to any point in the river, which will then be carried downstream (right) by the flow. Bacteria decay over time at a constant rate, mimicking UV exposure (though this varies with the time and season in real life).

We can adjust the inlet concentration, the decay rate of the bacteria, or the flow rate with the sliders below.

<p style="text-align:center;margin-bottom:0;"><vpde-slider
    iframe="simA"
    name="c0"
    label="Inlet concentration"
    label-position="above"
    min-label="Low"
    max-label="High"
    min="0"
    max="1"
    value="0.77"
    step="0.01"
></vpde-slider></p>
<p style="text-align:center;margin-bottom:0;"><vpde-slider
    iframe="simA"
    name="k"
    label="Decay rate"
    label-position="above"
    min-label="Low"
    max-label="High"
    min="0"
    max="0.1"
    value="0.006"
    step="0.001"
></vpde-slider></p>
<p style="text-align:center;margin-bottom:0;"><vpde-slider
    iframe="simA"
    name="u"
    label="Flow speed"
    label-position="above"
    min-label="Low"
    max-label="High"
    min="0.1"
    max="2"
    value="0.6"
    step="0.01"
></vpde-slider></p>

<iframe id="simA" class="sim" style="margin-left:auto;margin-right:auto" src="/sim/?preset=bacteriaInAReach&story&reset_only" frameborder="0" loading="lazy"></iframe>

Phrased mathematically, we are solving an advection–reaction equation for the concentration $C$ of bacteria, given by

$$\pd{C}{t}= - u\pd{C}{x} - kC,$$

where $u$ is the flow speed, $k$ is the decay rate, and $x$ is the distance along the river.

To play with the details of this model, try out the [full-screen simulation](/sim/?preset=bacteriaInAReach). In that simulation, sliders can be found by clicking <span class='click_sequence'>{{ layout.equations }} → **Parameters and notation** → **Parameters**</span>
