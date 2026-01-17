---
layout: page
title: Logistic travelling waves
lesson_number: 10
thumbnail: /assets/images/travelling-waves.webp
extract: Classic models of invasion
equation: $\pd{u}{t}=\nabla^2 u+ru\left(1-\frac{u}{K}\right)$<br />with periodic boundary conditions
categories: [biology, waves, parabolic]
---
Here we'll consider a classical reaction–diffusion equation, with a logistic nonlinearity. This is often referred to as the [Fisher–KPP equation](https://en.wikipedia.org/wiki/Fisher%27s_equation),

$$\pd{u}{t}=\nabla^2 u+ru\left(1-\frac{u}{K}\right),$$

with periodic boundary conditions.

1. Load the [interactive simulation](/sim/?preset=travellingWave).

1. Click within the box to visualise a 'line' of a population, which will then spread out as a planar wave.

1. Explore different parameters in this model, namely $D$, $r$, and $K$.

1. Does the wave speed, $c$, approximately follow the scaling law derived via linearisation of the wavefront (that is, $c \propto \sqrt{rD}$)? One interesting experiment to try is to see what happens if you simultaneously decrease $r$ and increase $D$ (or vice versa). This should have (approximately) the same effective wave speed, but the profile will be different as you have effectively changed the time and space scales in opposite directions.

1. Does the value of the carrying capacity, $K$, matter for the speed of the wave? Or the profile?

1. Next change the brush type to a circle and explore how circular waves travel. These are similar to the planar (effectively 1D) waves above, but their speed will be slightly different as the curvature of these wave fronts will influence their speed.

1. You can also explore this kind of wave in a [1D model](/sim/?preset=travellingWave1D). You can press {{ layout.erase }} to reset the simulation as you change parameters.

# Competitive exclusion

Travelling waves also occur in multispecies models. A model of two competing populations (red and grey squirrels) can be written as,

$$\begin{aligned}\pd{R}{t}&=D\nabla^2 R+R(1-c_{RR}R-c_{RG}G),\\ \pd{G}{t}&=D\nabla^2 G+ G(1-c_{GR}R-c_{GG}G),\end{aligned}$$

where $D$ is a diffusion coefficient,  $c_{RG}, c_{GR}$ are [interspecific](https://en.wikipedia.org/wiki/Interspecific_competition), and $c_{RR},c_{GG}$ are [intraspecific](https://en.wikipedia.org/wiki/Intraspecific_competition) competition coefficients.

[Competitive exclusion](https://en.wikipedia.org/wiki/Competitive_exclusion_principle) can lead to one of the species being driven to extinction by the other.

* This [squirrel simulation](/sim/?preset=RedGreyInvasionUK) explores the grey squirrels driving the red to extinction across a map of the United Kingdom.

# Epidemic waves

As another example of logistic travelling waves, we can consider the [SIS model](https://en.wikipedia.org/wiki/Compartmental_models_in_epidemiology#Variations_on_the_basic_SIR_model) of infection given by

$$\begin{aligned}\diff{S}{t}&=d I - b S I,\\ \diff{I}{t}&=b S I - d I,\end{aligned}$$

where $S$ is the number of susceptible individuals, $I$ the number of infected individuals, $d$ a recovery rate, and $b$ an infection rate.

Since this system is mass conserving (that is, $N=S + I$ must be a constant), we can rewrite this model purely in terms of the proportion of infected individuals $p = I/N$ to get

$$\pd{p}{t}=\nabla^2 p+\beta p(1-p)-\delta p,$$

where we have rescaled the infection and recovery rates and added a diffusion term to model spatial movement of infected individuals.

As long as $R_0 = \beta/\delta > 1$, this model will have the same travelling-wave behaviour as the Fisher–KPP equation above, where $p=0$ is an unstable steady state, and $p=(\beta - \delta)/\beta$ is a stable endemic equilibrium.

* Visualise an epidemiological [travelling wave across the USA](/sim/?preset=SpanishFluWave) to see how this plays out in time and space.

# Tails matter

The classical analysis for these kinds of travelling waves involves linearising the system to get the wavespeed $c \propto \sqrt{rD}$ as a minimal speed, and further theoretical work has shown that this travelling wave solution is the long-time solution in an infinite domain if the initial data satisfy $u=0$ for all $x>L$ for some finite $L$. For other initial data, the precise structure of the tail (that is, how the solution decays away from the wavefront) can lead to different, variable wavespeeds as in this [1D model](/sim/?preset=travellingWave1DTails). The red solution is with exponential $u(x,0) = \e^{-ax}$ initial data and the blue one with algebraic $u(x,0) = 1-x^{-a}$. While the initial profile is nearly identical visually, the wavespeeds evolve to different values as the simulation progresses. They will also depend in nontrivial ways on the parameter $a$.





