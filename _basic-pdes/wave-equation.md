---
layout: page
title: Wave equation
lesson_number: 2
thumbnail: /assets/images/waveEquation.webp
extract: Play with waves and vibrations
equation: $\pdd{u}{t}=D \nabla^2 u$
categories: [linear, waves, hyperbolic]
---
Let's next look at the [wave equation](https://en.wikipedia.org/wiki/Wave_equation),

$$\pdd{u}{t}=D \nabla^2 u,$$

on a rectangular 2D domain with homogeneous Neumann (aka no-flux) boundary conditions,

$$\pd{u}{x}(0,y,t) = \pd{u}{x}(L_x,y,t) = \pd{u}{y}(x,0,t) = \pd{u}{y}(x,L_y,t) = 0.$$

1. Load the [interactive simulation](/sim/?preset=waveEquation), which has been set up for this tutorial.

1. Click on the screen to visualise a disturbance in the medium which will then propagate in all directions. 

1. Now press {{ layout.pause }}, paint some initial data, and then press {{ layout.play }} to set it in motion.

1. Press {{ layout.erase }} to clear the screen. 

### Playing with the diffusion coefficient, $D$

What does changing the diffusion coefficient, $D$, do? 

1. Change its value by clicking <span class='click_sequence'>{{ layout.equations }} → **Parameters and notation** → **Parameters**</span> and editing the value of $D$: try increasing it by a factor of 10 or even 100. 

1. Now click again on the screen and see how fast the disturbance spreads out throughout the domain. 

Explore how the speed depends on the diffusion coefficient.

## Numerical notes

The VisualPDE solver only works for systems of first-order (in time) equations. So in fact what is being simulated is the system

$$\begin{aligned}\pd{u}{t}&=v+CD\nabla^2 u,\\
 \pd{v}{t} &= D \nabla^2 u,
 \end{aligned}$$

which becomes the wave equation when $C=0$. Note that the term in the second equation is a kind of *cross-diffusion*, with $u$ diffusing into $v$.

The parameter $C$ is used to prevent spurious oscillations due to the equation being [hyperbolic](https://en.wikipedia.org/wiki/Hyperbolic_partial_differential_equation). Try varying the value of $C$ to observe how it changes the solution structure.

## Standing wave solutions

If we take initial conditions of 

$$\begin{aligned}u(x,y,0) &= \cos\left(\frac{n \pi x}{L_x}\right)\cos\left(\frac{m \pi y}{L_y}\right),\\ 
\pd{u}{t}(x,y,0)&=0,\end{aligned}$$ 

with Neumann boundary conditions, we can find a standing wave solution of the form

$$
u(x,y,t) = \cos\left(D\pi\sqrt{\frac{n^2}{L_x^2}+\frac{m^2}{L_y^2}}\,t\right)\cos\left(\frac{n \pi x}{L_x}\right)\cos\left(\frac{m \pi y}{L_y}\right),
$$

which oscillates in time and space. 

You can play with such an initial condition in this [initialised simulation](/sim/?preset=waveEquationICs), changing $n$ and $m$ in <span class='click_sequence'>{{ layout.equations }} → **Parameters and notation** → **Parameters**</span> and restarting the simulation by pressing {{ layout.erase }} to see how these parameters influence the solution. 

The damping factor $C$ is also set to zero in this case. If you increase its value, the solution amplitude will decay over time. 

If you change the boundary conditions to Dirichlet (and set $C=0.01$), the simulation will exhibit some fascinatingly symmetric oscillations.


## 1D and 2D waves

In a 1D domain, [d'Alembert's solution](https://mathworld.wolfram.com/dAlembertsSolution.html) to the wave equation can be used to show that an initial disturbance in $u$ (and not $\partial u/\partial t$) will cause rightward and leftward moving waves.

* See this in a [1D simulation](/sim/?preset=waveEquation1D). 

In principle the same concept works for higher dimensions, though reflections from boundary conditions can lead to more complicated behaviour, as seen in this [2D simulation](/sim/?preset=waveEquation3D) plotted as a surface.

