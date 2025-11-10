---
layout: page
title: Schrödinger equation
lesson_number: 50
thumbnail: /assets/images/SchrodingerEquation.webp
extract: Interactive quantum mechanics
equation: $\i\hbar\pd{\psi}{t}=-\frac{\hbar}{2m}\nabla^2 \psi+V(x,t)\psi$
categories: [linear, integrable, parabolic]
---
We now consider the [Schrödinger equation](https://en.wikipedia.org/wiki/Schrödinger_equation),

$$\i\hbar\pd{\psi}{t}=-\nabla^2 \psi+V(x,t)\psi,$$

with homogeneous Dirichlet boundary conditions. We will first consider a variant of this equation with *artificial diffusion*, as in [the wave equation](/basic_pdes/wave-equation) shown before, which takes the form

$$\pd{\psi}{t}=\i D\nabla^2 \psi+DC\nabla^2 \psi,$$

where $D,C>0$ are positive constants. We use the initial condition 

$$\psi(x,y,0) = \sin(m\pi x)\sin(n\pi y),$$ 

as this corresponds to a given energy state of the system.

* Load the [interactive simulation](/sim/?preset=stabilizedSchrodingerEquation). 

* You can change the initial eigenfunction frequency by modifying $n$ and $m$, and then pressing 'R' to restart the simulation.

* By default, the solution plotted is the density $$\lvert \psi\rvert^2 = \Re(\psi)^2+\Im(\psi)^2 = u^2+v^2$$, which will be (approximately) stationary for long periods of time. You can plot only the real or imaginary part under the Views pane by clicking {{ layout.views }}, and see how these solutions now oscillate in both space and time. Increasing the values of $n$ and $m$ will increase the speed at which this oscillation occurs, as such an initial condition will correspond to higher energy states.

## Particle in a 1D potential well

We can consider an analogue of a particle in a potential well by putting a [Gaussian wave packet](https://en.wikipedia.org/wiki/Wave_packet#Gaussian_wave_packets_in_quantum_mechanics) inside a quadratic potential. 

For short times, such a wave packet acts like a particle bouncing between the two walls of the potential with some fixed energy, as you can see in this [1D simulation](/sim/?preset=stabilizedSchrodinger1D). The potential is drawn in as a black overlay. We can also explore the case of [a particle tunneling through a barrier](/sim/?preset=quantumTunneling).

The total probability, shown in the bottom corner, is approximately conserved here as we have set $C=1$ and taken a sufficiently small simulation step, consistent with [more sophisticated simulation techniques](http://www.astro.utoronto.ca/~mahajan/notebooks/quantum_tunnelling.html). We do observe some grid-level dispersion effects as the wavefunction interacts with a barrier or itself, but these are essentially numerical artifacts for short times, leading to problems only over longer simulation timescales.

## Heterogeneous potentials

We can also choose a potential $V(x,y)$ in 2D which has the effect of localising some features of the solution. As an example, we consider 

$$\begin{aligned}V(x,y) &= \sin(n \pi x)\sin(m\pi y),\\ \psi(x,y,0) &= (\sin(\pi x)\sin(\pi y))^{10},
\end{aligned}$$

which can be played with in this [heterogeneous simulation](/sim/?preset=stabilizedSchrodingerEquationPotential). 

As the solution evolves, one can observe *tunnelling* from local potential wells where the solution is highly concentrated, out to potential wells further away from the localised initial condition. 

Note that here the colour scale is constantly changing to observe the maximal and minimal values of $\lvert \psi \rvert$, as these vary substantially during an oscillation.

## Numerical notes

The solver only works for real systems of equations. So in fact what is being simulated is the system

$$\begin{aligned}\pd{u}{t}&=-D\nabla^2 v+CD\nabla^2 u+V(x,y) v,\\ 
\pd{v}{t} &= D\nabla^2 u+CD\nabla^2 v-V(x,y)u,
\end{aligned}$$

which is a (nondimensionalised) Schrödinger equation for $C=0$. The parameter $C$ is used to prevent spurious oscillations. Of course, even with this artificial parameter $C$, our numerical method does not preserve probability, given by

$$
\int_0^L \int_0^L |\psi|^2 \d x \, \d y = \int_0^L \int_0^L (u^2+v^2) \, \d x \, \d y = 1,
$$

as can be seen in the 1D example above. See the discussion at the bottom of [Validating VisualPDE](/numerical-methods/validating-VisualPDE) for more details about the sensitivity to timestepping accuracy.
