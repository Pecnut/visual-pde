---
layout: page
title: Water quality in 1D
lesson_number: 110
thumbnail: /assets/images/bacteriaInFlow.webp
extract: Transport along rivers
equation:
---

<script src="/sim/scripts/charts.umd.min.js"></script>
<script src="/assets/js/vpde-charts.js"></script>

In this short demo, I've put together a range of components that illustrate various ways we might envisage a user interacting with a simple simulation of transport along a river (here written in terms of bacteria concentration, but this can be easily changed to other transported factors).

All styling and layout is incredibly basic and placeholder; I expect to spend a considerable amount of time tailoring the appearance of everything once we are happy with some content ideas.

## A very customisable simulation

The simulation below is a simple model of bacteria transport along a river. The user can change the initial concentration of bacteria at the inlet on the left, the rate at which the bacteria decay, and the speed of the flow. The simulation is interactive, and the user can change the parameters using the sliders below the simulation.

It is possible (and straightforward) to have multiple simulations (with different parameters) running side-by-side. This could allow us to illustrate differences without having a user tweak sliders - perhaps useful for some topics.

<iframe class="sim" id="simA" src="/sim/?preset=bacteriaInAReach&story&lite&sf=1&clean&probing=true" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simA"
    name="c0"
    label="Inlet concentration"
    min="0.01"
    max="1"
    value="0.5"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simA"
    name="k"
    label="Decay"
    min="0"
    max="0.02"
    value="0.001"
    step="0.0001"
    min-label="None"
    max-label="Maximum"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simA"
    name="u"
    label="Flow"
    min="0.1"
    max="2"
    value="0.62"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>

## Tracking quantities over time

We can track a range of quantities from the simulation over time in a separate chart. This could be, say, the concentration of bacteria at the outlet of the river over time (shown in the example graph below), or the total amount of bacteria in the river etc. This allows us to, for example,

1. see how quickly the bacteria are flushed out of the river, and how this changes with flow speed,
1. talk about the source apportionment problem. For instance: *we could have two side-by-side simulations with sources at different points upstream. They each generate downstream graphs, which would turn out to be the same but shifted in time. The big question to highlight here is how can we tell where the bacteria came from? It's not clear how to do this using industry-standard sensors, so we are investing in research towards high-tech measurement devices that can take into account chemical markers to identify different sources, for instance.*

<iframe class="sim" id="simE" src="/sim/?preset=bacteriaInAReachOscillatoryDecay&story&lite&sf=1&clean&probing=true&iframeID=simE" frameborder="0" loading="lazy"></iframe><vpde-chart iframe="simE" ymin="0" ymax="0.7" ylabel="Outlet"> </vpde-chart><p style="display:none"><vpde-slider
    iframe="simE"
    name="u"
    label="Flow"
    min="0.1"
    max="4"
    value="4"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>

## The science of prediction (flow rate only)

**_This is an example of a short post that invites people to play with a simple river simulation and get an idea for one aspect of the challenges faced by WW. It can be easily extended to include bacteria decay rate (potentially including day-night cycles) if a longer post is wanted. It might be the case that short and 'snappy' will be preferable._**

Rivers transport a variety of materials downstream, ranging from objects like rocks and stones down to chemicals (such as phosphorous) and bacteria. At Wessex Water, we actively monitor the amount of various materials in rivers, which allows us to provide guidance for public bathing, for instance.

A big scientific challenge we face is prediction: if we know some information about the river now, what can we say about the river after a few hours or days? Here, we've put together a simulation[^1] with [VisualPDE](https://visualpde.com) that lets us explore a key part of that challenge: flow rate.

In the box below, we're simulating the concentration of bacteria in a river from a source (left) as it is swept downstream (from left to right) by the flow. This is plotted on the vertical axis (higher is more) and also shown as colour. At any time, you can click to add bacteria to the river and watch it get carried downstream (drag to add more). ***The simulation could have 'upstream' and 'downstream' labels at the sides to make it clear to readers***

<iframe class="sim" id="simB" src="/sim/?preset=bacteriaInAReach&story&lite&sf=1&clean&colourbar=true" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simB"
    name="u"
    label="Flow"
    min="0.1"
    max="4"
    value="2"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>

You can see that the amount of bacteria is decreasing as we go further along the river. This is because (certain) bacteria decay when they are exposed to light; as the downstream bacteria have been exposed to light for longer than the upstream bacteria, those downstream have decayed more.

The slider below the simulation lets us change how fast the river is flowing. Try decreasing the flow rate to its minimum - what happens to the amount of bacteria reaching the end of the river? Try clicking to see just how slowly the river is flowing.

We can also do the opposite: try simulating a storm surge by increasing the flow rate to its maximum. Now, the concentration of bacteria downstream is almost as high as it is at the source, just because of increased river flow. In real life, storm surges can indeed lead to high levels of bacteria downstream of sources, and can contribute to recommendations against bathing for this reason.

This leads us to a key question: after a storm surge, how long does it take for bacteria levels to return to normal? This is a complicated task that depends on many factors, including the flow rate and the peak concentration reached during a surge. We work hard to try to predict this accurately, drawing from a range of modern sensors and machine learning tools. Try exploring this problem for yourself to get a glimpse of the science of river transport.

Enjoyed this Science Snapshot? Check out our other Snapshots at (link).

[^1]: It is worth noting that, although the simulation on this page uses real science and mathematics, it isn't trying to match up perfectly with reality. So, we'll focus on general principles rather than precise predictions. If you want to see the mathematics and science behind this simulation, check out the [detailed article](https://visualpde.com) on [VisualPDE.com](https://visualpde.com).

## The science of prediction (continued, including decay)

### Exploring decay rates

Earlier, we mentioned how the decay of bacteria was responsible for decreasing the concentration away from the source. Therefore, and as you might expect, this decay rate plays an important role in predicting water quality. Here's a new version of our simulation that lets us explore the role of the decay rate:

<iframe class="sim" id="simC" src="/sim/?preset=bacteriaInAReach&story&lite&sf=1&clean&colourbar=true" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simC"
    name="k"
    label="Decay"
    min="0"
    max="0.02"
    value="0.001"
    step="0.0001"
    min-label="Low"
    max-label="High"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;display:none;"><vpde-slider
    iframe="simC"
    name="u"
    label="Flow"
    min="0.1"
    max="4"
    value="2"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>

Try varying the decay rate to see just how significant an impact this quantity can have. As you'll see, it can completely change the dynamics, even leading to a river that is essentially free of bacteria.

It turns out that the problem is even more complex than this. As the decay rate depends on the amount of light, the decay rate changes throughout the day, as well as seasonally. We've put together a final simulation to showcase how daily variation can change the profile of bacteria in the river, with sliders to let you explore the effects of flow rate on this time-varying system for yourself. Try to predict what will happen, then find out by pressing play: <vpde-playpause iframe="simD"></vpde-playpause>

<iframe class="sim" id="simD" src="/sim/?preset=bacteriaInAReachOscillatoryDecay&story&lite&sf=1&clean&colourbar=true&runningOnLoad=false" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simD"
    name="u"
    label="Flow"
    min="0.1"
    max="4"
    value="2"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>

The picture is now much more complicated, making the problem of prediction even more challenging. At Wessex Water, we include the effects of hourly and seasonal variations in lots of our river modelling, and are working with leading researchers to increase the level of detail included in our predictions and modelling.

Enjoyed this Science Snapshot? Check out our other Snapshots at (link).

### Footnotes