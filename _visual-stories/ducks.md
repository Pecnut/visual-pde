---
layout: page
title: Ocean spills
lesson_number: 50
thumbnail: /assets/images/Ducks.webp
extract: Ducks, advection and ocean flows
equation:
categories: [visual stories]
---

On 10 January 1992, during a storm, a container full of bath toys fell off a ship travelling across the Pacific ocean. The container opened and the 28,000 toys, including yellow rubber ducks, were released.

Over the next few months and years, the toys began to wash up on coastlines around the world, arriving in Alaska after about 10 months and Britain and Ireland around 15 years later. It is estimated that some travelled almost 30,000 km, carried by the ocean currents. This story has captured many imaginations over the years (including ours) and led to documentaries, scientific papers, news articles, children's books and more. You can read more about it on [Wikipedia](https://en.wikipedia.org/wiki/Friendly_Floatees_spill).

In this Visual Story, we'll discuss the mathematics behind ocean modelling and present a simple model of the duck spillage. As with all our Visual Stories, the predictions of this model won't match up perfectly with reality, but should give us some intuition for the complex process of ocean transport.

# Tracing ducks

We'll model the ducks as 'tracer particles' in the ocean. The term 'tracer particles' refers to small objects that move with a fluid without really changing how it behaves. They are very common: examples include leaves on the surface of a river and, fortunately, rubber ducks in the ocean. Our simulations will try to track the amount of these particles in different parts of the ocean.

<video autoplay loop playsinline muted disableRemotePlayback width="80%" style="display:block;margin:0 auto;"><source src='/assets/ani/ocean_flow.mp4' type='video/mp4'><p>Magnitude of east-west flow in the world's oceans.</p></video><br>

To do this, we'll need to know how water moves around in the ocean. Determining the fluid flow, however, is a difficult and time-consuming process that requires running large numerical simulations and cutting-edge science. We'll cheat and use existing simulations from [NASA](https://podaac.jpl.nasa.gov)[^1], which take into account factors including the Earth's rotation, the temperature of the water, and the phase of the moon (really). The video above shows the east–west flow velocity for 2023 from one of these simulations (eastward in red, westward in blue).

We've taken this data and put it into the VisualPDE simulation below, along with a map of the world. You can click to add some ducks to the oceans, or watch as the ducks from the original spill spread across the ocean. Adjust the slider below the simulation to change the month of the year (which alters the flow) and see how that impacts the duck spill.

<iframe class="sim" id="simA" src="/sim/?preset=ducks&story&sf=1&reset_only&nomathjax" style="width:100%;max-width:100%;aspect-ratio:2/1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simA"
    name="m"
    label="Month"
    min="1"
    max="12"
    value="1"
    step="1"
    min-label="January"
    max-label="December"
></vpde-slider></p>

# Strategic spillage

An interesting question comes to mind: what if the ducks had been released elsewhere in the world? To explore this, we've set up another simulation down the page, but now clicking moves the source of ducks around. We've also added a slider that lets you control the amount of ducks being released[^2].

There's so much to find in these simulations, so here is some food for thought to guide your own exploration:

1. Do the ducks spread out faster when released at particular points?
1. Where is a good place to release the ducks such that they're washed up around your favourite coastal location (e.g. the UK)?
1. Are there any regions of the ocean that seem to collect ducks? Where are they, and why?

<iframe class="sim" id="simB" src="/sim/?preset=ducksSource&story&sf=1&reset_only&nomathjax" style="width:100%;max-width:100%;aspect-ratio:2/1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simB"
    name="m"
    label="Month"
    min="1"
    max="12"
    value="1"
    step="1"
    min-label="January"
    max-label="December"
></vpde-slider></p>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simB"
    name="S"
    label="Ducks"
    min="0"
    max="1"
    value="1"
    step="0.01"
    min-label="None"
    max-label="Lots"
></vpde-slider></p>

# Looking for more?

Did we whet your appetite for ducks? Check out the fullscreen, [fully customisable simulation](/sim/?preset=ducks) to play with more ducks and more parameters.

Enjoyed this Visual Story? We'd love to hear your feedback at [hello@visualpde.com](mailto:hello@visualpde.com).

Looking for more VisualPDE? Try out our other [Visual Stories](/visual-stories) or some mathematically flavoured content from the [VisualPDE library](/explore).

This Story was written in collaboration with [Dr Matthew Crowe](https://mncrowe.github.io/).

### Footnotes

[^1]: The ocean simulation data was obtained from the [NASA ECCO2 dataset](https://ecco.jpl.nasa.gov/drive/files/ECCO2/cube92_latlon_quart_90S90N) (requires login).
[^2]: Here, the amount of ducks released is technically unlimited, but that's a limitation of our model rather than a reflection of the number of ducks in the ocean.

<script type='text/javascript'>
    run_only_one_sim(['simA', 'simB'])
</script>