---
layout: page
title: Inhomogeneous wave equation
lesson_number: 40
thumbnail: /assets/images/InhomWaveEquation.webp
extract: Waves through a complex medium
equation: $\pdd{u}{t}= \vnabla\cdot(f(x,y)\vnabla u) $
categories: [linear, waves, hyperbolic]
---
We now consider an inhomogeneous [wave equation](https://en.wikipedia.org/wiki/Heat_equation),

$$\pdd{u}{t}=\vnabla\cdot(f(x,y)\vnabla u),$$

with homogeneous Neumann (aka no-flux) boundary conditions. This equation can be solved numerically as long as $f(x,y)>0$ for all $x,y$ in the domain.

* Load the [interactive simulation](/sim/?preset=inhomogWaveEquation), which uses the example

    $$f(x,y) = D\left[1+E\sin\left(\frac{m\pi x}{L_x}\right)\right]\left[1+E\sin\left(\frac{n\pi y}{L_y}\right)\right].$$

    Importantly, we need $\lvert E\rvert<1$ to ensure the solution makes sense.

* You can change the values of $m$ and $n$ to observe different patterns of regions where waves propagate at different speeds. In particular, using the the function $f(x,y)$ above will lead to corners inside of the domain with very slow wave speeds, and these will become visually apparent quickly.

* Unlike in the [homogeneous case](/basic-pdes/wave-equation), we by default plot $u$ here, but you can change this to $v$ by clicking {{ layout.views }}.

# Damped waves and inhomogeneous boundaries

We next consider the damped wave equation,

$$\pdd{u}{t} +d\pd{u}{t}=D\nabla^2 u,$$

with inhomogeneous Dirichlet boundary conditions,

$$u|_{\partial \Omega} = \cos\left(\frac{m \pi x}{100}\right)\cos\left(\frac{m \pi y}{100}\right),$$

on a square domain. 

* Load this [damped simulation](/sim/?preset=dampedWaveEquation), where initially $d=0$. 
* Try increasing the damping $d$ to, for example, $d=0.01$ to observe how this changes the wave propagation into the domain from the boundaries.
* What happens when you play with the frequency, $m$?

# Adding obstacles

We can also add boundaries for waves to interact with by creating internal boundaries in the domain.

* Load this [interactive simulation with internal boundaries](/sim/?preset=wavesAddedGeometry).

* Click to paint a small circular obstruction which will deflect the initial wave; dragging across the screen allows you to remove larger parts of the domain.

* [This interactive simulation with oscillating waves](/sim/?preset=wavesGeometryOscillatingSponge) is a similar setup, but with waves generated on the right, and a sponge layer absorbing them on the left.
