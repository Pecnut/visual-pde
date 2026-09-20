---
layout: page
title: Virus transmission
lesson_number: 20
thumbnail: /assets/images/VirusTransmission.webp
extract: Visualising airborne infections
equation:
categories: [visual stories]
---

Since the Covid-19 pandemic began, airborne viruses have formed a large part of scientific study. In this short Story, we're going to explore one aspect of this work: the effects of airflow.

Before we begin, it's worth noting that the results of the simulations in this Story aren't meant to match up perfectly with reality, so we'll focus on qualitative features rather than on particular values. At the end of our exploration we'll point you towards the full science behind this Story, which includes discussions of the assumptions behind the mathematical model that inspired our Story.

Suppose that lots of people are sitting in a sealed room and one of them is infectious. We'll assume that the infectious person is constantly producing virus-laden particles that spread out around them and lose their potency over time. The simulation below shows what this might look like. The colour corresponds to the concentration or amount of the virus in the air. 

<iframe class="sim" src="/sim/?preset=CovidInAStillRoom&story&nomathjax&sf=1" frameborder="0" loading="lazy"></iframe>

With VisualPDE, we're not just limited to watching a simulation: we can interact with it too. Clicking in the room will introduce some viral particles to the air, as if someone with an infection had coughed (coughing is actually a lot more complicated and is the focus of lots of [research](https://doi.org/10.1146/annurev-fluid-060220-113712)). Try clicking to see what difference a cough can make.

Though each cough introduces some virus to the room, it looks like it quickly decays away until we can't even tell it was there. So, does this mean we shouldn't be worried about a cough?

# Catching the virus
To explore this further, let's look at the probability (or chance) of getting an infection, which is related but not equal to the virus concentration. Specifically, we'll look at the chance of catching the virus assuming that you'd been in the same location for the duration of the simulation. With VisualPDE, we can do this by switching to the Probability View by pressing {{ layout.views }} and choosing 'Probability'.

Here, the probability of being infected is large close to where we know the source of the infection is, right in the middle of the room. If you clicked in the room to simulate a cough, you should also see some high probabilities elsewhere. This shows that, even though the viral particles seem to disperse quickly after a cough, they make a significant difference to the probability of catching an infection near to the cougher.

As you might expect, the probability of being infected increases with the amount of time that you're exposed to the virus. This time-dependent effect is especially visible when you click to cough while using the Probability View. To reset the simulation and see this clearly, press {{ layout.erase }}. What do you think will happen if you cough multiple times in the same spot? Test out your prediction with VisualPDE!

# Recirculation
It's fairly rare for air to stay still. Let's see what effect the movement of air can have on the distribution of a virus and the chance of infection. In the simulation below, we've added in the effects of the air being blown from left to right, mimicking an air conditioner, with anything that reaches the right-hand side of the room being blown back over everyone's heads before being recycled back into the left-hand side.

<iframe class="sim" id="simA" src="/sim/?preset=CovidInARoom&story&nomathjax&sf=1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simA"
    name="V"
    label="Airflow"
    min="-40"
    max="40"
    value="40"
    step="1"
    min-label="Left"
    max-label="Right"
></vpde-slider></p>

With this new air movement, it now looks like standing downwind of the infected person is a bad idea: particles carrying the virus are swept from left to right by the air current, and the probability of being infected is much higher on the right of the infected person. Eventually, the recirculation of the air means that viral particles reach even the left-hand side of the room, leading to a large zone in the room where the probability of infection is high. 

Remember, you can swap between Views to see the effects on both probability and concentration. Try clicking while viewing the concentration to really see how the air drives the spread of the virus in one direction then blows it back from right to left, recirculating the virus over the room. This is in stark contrast to the behaviour of a cough in the earlier flow-free room. Explore further by changing the direction of airflow using the slider beneath the simulation.

# A meandering infection
People don't always stay still in the middle of rooms. Unsurprisingly, the movement of an infected individual can have a big impact on the spread of a virus. In the next simulation, we've set it up so that the source of the infection moves around the room, as if they were a waiter going between tables in a restaurant, perhaps. We've also turned off the air conditioner, so that the air in the room is still.

<iframe class="sim" src="/sim/?preset=CovidInAStillRoomCircling&story&nomathjax&sf=1" frameborder="0" loading="lazy"></iframe>

The Probability View shows the build-up of a ring of likely infections as the infectious person circles the room. A quick look at the Concentration View shows their circular path, leaving a trail of viral particles behind them.

In this scenario, what do you think happens if we turn on the air conditioner? The next simulation does just this. Start the simulation by pressing {{ layout.play }}

<iframe class="sim" id="simD" src="/sim/?preset=CovidInARoomCircling&story&nomathjax&sf=1" frameborder="0" loading="lazy"></iframe>
<p style="text-align:center;margin-top:0;"><vpde-slider
    iframe="simD"
    name="V"
    label="Airflow"
    min="-40"
    max="40"
    value="40"
    step="1"
    min-label="Left"
    max-label="Right"
></vpde-slider></p>

Now, instead of a nice clean ring of likely infections, we immediately see that people on the downwind side of the room are much more likely to be infected – people that had a lower chance of infection in a room with no air circulation. If we keep watching, we can see this effect increasing and increasing. Eventually, even those that seemed to be far upwind of the source of infection have some chance of being infected, as the recirculating air slowly carries the virus with it across the room, just like it did in our earlier example.

Finally, we can look at the Concentration View to see how the airflow is breaking not only the left–right symmetry of the room, but also the up–down symmetry. What do you think would happen if we reverse the direction that the waiter is circling the room? How would the picture change? Try changing the speed and direction of the airflow by dragging the slider found below the simulation to further explore the impact of flow.

# Epilogue
The story of airborne infections is far from over, but our viral Visual Story has reached its end. Using nothing more than your browser and your curiosity, we've explored how airflow might alter the spread of an airborne virus, witnessed the transient and long-term effects that a simple cough can have, and seen the potentially superspreading effects of a wandering waiter.

As with all our Stories, it is worth remembering the limitations of what we've learned. Our approach has knowingly ignored lots of factors that could be very important, including the potentially vast differences that can exists between different viruses and between different environments. So, while we've hopefully gained lots of intuition, we would do well to take our conclusions with a healthy pinch of salt.

# Looking for more?
Not quite had enough of exploring airborne infections? You can play around with the speed of the air by opening our [customisable simulation](/sim/?preset=CovidInARoomCircling&runningOnLoad=true&activeViewInd=1) and moving the top-most slider that can be found under <span class='click_sequence'>{{ layout.equations }} → **Parameters and notation** → **Parameters**</span> and beneath the label beginning with 'V'. Try exploring how the air speed impacts the spread of the virus.

For the science behind this Story, we recommend that you check out the [research](https://doi.org/10.1098/rspa.2021.0383) of Zechariah Lau, [Ian Griffiths](https://people.maths.ox.ac.uk/griffit4/) (University of Oxford), [Aaron English](https://twitter.com/aaronenglish001) (University of Parma), and [Katerina Kaouri](https://profiles.cardiff.ac.uk/staff/kaourik) (Cardiff University) on modelling the Covid-19 pandemic, which forms a basis for the mathematical models that we've just explored with VisualPDE. During the pandemic, they used similar models to provide recommendations to policymakers. We recommend checking out their [airborne virus risk calculator](https://people.maths.ox.ac.uk/griffit4/Airborne_Transmission/index.html), which inspired this Visual Story.

Enjoyed this Visual Story? We'd love to hear your feedback at [hello@visualpde.com](mailto:hello@visualpde.com).

Looking for more VisualPDE? Try out our other [Visual Stories](/visual-stories) or some mathematically flavoured content from the [VisualPDE library](/explore).



