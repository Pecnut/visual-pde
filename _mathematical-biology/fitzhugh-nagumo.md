---
layout: page
title: FitzHugh–Nagumo and excitability
lesson_number: 80
thumbnail: /assets/images/FitzHugh-Nagumo.webp
extract: Patterns, spiral waves, and chaos
equation: $\pd{u}{t}=\nabla^2 u +u-u^3-v,$ $\pd{v}{t}=D\nabla^2v+ \varepsilon_v(u-a_v v-a_z)$
categories: [biology, patterns, parabolic]
---
Here we look at the  [FitzHugh–Nagumo model](https://en.wikipedia.org/wiki/FitzHugh%E2%80%93Nagumo_model), given by 

$$\begin{aligned}\pd{u}{t}&=\nabla^2 u +u-u^3-v,\\ \pd{v}{t}&=D\nabla^2v+ \varepsilon_v(u-a_v v-a_z),\end{aligned}$$

where we take $D>1$.

* Load the [FitzHugh–Nagumo simulation](/sim/?preset=FitzHugh-Nagumo) 

* Click in the domain to initiate a pattern-forming instability, which will form roughly concentric rings as it expands.

* This system has many different kinds of solutions which are stable over long time periods. To see this, change the initial condition, under <span class='click_sequence'>{{ layout.equations }} → **Initial conditions**</span> so that $u\|_{t=0}$ has the value '**RAND**'.  Then press {{ layout.restart }} to restart the simulation. It should now exhibit patterns which are much more spot-like.

* Another fun behaviour can be seen in [this spiral wave simulation](/sim/?preset=FitzHugh-NagumoSpirals).

# Turing–Hopf bifurcations

We now vary the parameters from the previous simulation so that it supports both pattern formation, but also oscillations. These oscillations come from steady states undergoing [Hopf bifurcations](https://en.wikipedia.org/wiki/Hopf_bifurcation). In such regimes, one can often find a range of complex spatial, temporal, and spatiotemporal behaviours, many of which can be simultaneously stable for different initial conditions. 

To illustrate this, we consider the initial conditions

$$
u(x,y,0) = \cos\left(\frac{m \pi x}{L}\right)\cos\left(\frac{m \pi y}{L}\right), \quad v(x,y,0)=0,
$$

for some integer $m$ and domain length $L=280$. 

* Load the [Turing-Hopf simulation](/sim/?preset=FitzHugh-Nagumo-Hopf)

* This simulation can display long-time solutions that exhibit all three kinds of behaviour, depending on the values of $m$, $D$, and the other parameters. Try $m=4$, $m=3$ and $m=6$ for example.

# Action potentials and travelling waves

This model is often considered in the context of action potentials, which are nerve impulses that travel along neurons. We look at this model with an alternative parametrisation

$$\begin{aligned}\pd{v}{t}&=D\nabla^2 v +v(v-a)(1-v) - w,\\ \pd{w}{t}&=\varepsilon(\gamma v - w),\end{aligned}$$

where we've used $v$ and $w$ to follow the convention that $v$ represents the electrical voltage across the neuron. Here, $D$ and $\varepsilon$ are typically small positive constants.

1. Load the [interactive simulation](/sim/?preset=FNWaves).

1. Try clicking briefly. Small disturbances simply decay back to equilibrium.

1. Now try clicking for longer to see large-amplitude travelling waves emerge, which model nerve impulses down neurons. This is an example of a threshold phenomenon, which occurs generically in so-called excitable systems.

1. Try exploring this model in 2D by changing the domain via <span class='click_sequence'>{{ layout.settings }} → **Domain** → **Dimension**</span> to see waves spread out radially.

# Three-species variant

A three-species variant of the FitzHugh–Nagumo model is 

$$\begin{aligned}\pd{u}{t}&=\nabla^2 u +u-u^3-v,\\ \pd{v}{t}&=D_v\nabla^2v+ \varepsilon_v(u-a_v v-a_w w-a_z),\\ \pd{w}{t}&=D_w\nabla^2w+ \varepsilon_w(u-w).\end{aligned}$$

* Load the [three-species simulation](/sim/?preset=FitzHugh-Nagumo-3) 

* The simulation demonstrates the dynamics of this system in a regime which has both homogeneous limit cycles and pattern formation competing against one another.

* The initial pattern formed in this simulation will eventually be destroyed by the oscillations. You can increase the value of $a_v$ to stabilise the pattern for longer, and if $a_v \geq 0.3$, the pattern will eventually overtake the oscillations and fill the entire domain.
