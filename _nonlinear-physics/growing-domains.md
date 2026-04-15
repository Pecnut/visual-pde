---
layout: page
title: Growing domains 
lesson_number: 50
thumbnail: /assets/images/Kymograph.webp
extract: Reaction–diffusion patterning on expanding domains
equation: $\pd{u}{t}=\nabla^2 u+u^2v - (a+b)u,$ $\pd{v}{t}=D\nabla^2v -u^2v + a(1 - v)$
categories: [patterns, parabolic]
---
We consider the [Gray-Scott](/nonlinear-physics/gray-scott) system on uniformly growing domains. For an overview of some of the dynamics in such systems, and an introduction to the literature, see this SIAM [dynamical systems gallery](https://dsweb.siam.org/Media-Gallery/pattern-formation-on-evolving-domains).


* Check out this [interactive simulation on a linearly growing domain](/sim/?preset=KymographLinearGrowth). By default, the simulation shows a kymograph or space-time plot of the solution $u$ in time and space. You can press {{ layout.views }} to change instead to a 1D plot of the density of $u$ as a function of $x$.

* There is also an [interactive simulation on an exponentially growing domain](/sim/?preset=KymographExponentialGrowth). These simulations are made using a field $m$ to store the 1D solution in snapshots of $y$, so that the $y$ axis in the kymograph represents the time coordinate. Playing with the domain indicator function, as well as the Overlay submenu under {{ layout.views }} allows you to design your own kymographs for growing or static domains.

Check out this [2D growing simulation](/sim/?preset=SchnakenbergGrowingDisk) for a crude implementation of the  [Schnakenberg](/mathematical-biology/schnakenberg) system on a growing domain with Dirichlet boundary conditions.
