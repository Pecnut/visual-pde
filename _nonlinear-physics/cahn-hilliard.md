---
layout: page
title: Cahn–Hilliard equation
lesson_number: 30
thumbnail: /assets/images/CahnHilliard.webp
extract: Phase separation
equation: $\pd{u}{t}=\nabla^2 (F(u)-g\nabla^2u)+f(u)$
categories: [patterns, parabolic]
---

We now study the [Cahn–Hilliard equation](https://en.wikipedia.org/wiki/Cahn%E2%80%93Hilliard_equation) with an extra reaction term,

$$\pd{u}{t} = \nabla^2 (r\left[u^3-u\right]-\epsilon\nabla^2u),$$

with periodic boundary conditions.

- Load the [interactive simulation](/sim/?preset=CahnHilliard)

- Observe the coarsening process as described in this [2001 article](https://people.maths.ox.ac.uk/trefethen/pdectb/cahn2.pdf) from an initially random configuration. 

- Vary the lengthscale of the interfaces between regions by changing the value of $\epsilon$, and vary the parameter $r$ to control the influence of a double-well potential on the states attained by $u$.

- For small $\epsilon$ and large $r$, you can see artefacts of the square grid used in the simulation. Increasing $\epsilon$ will make the interfaces wider than the grid resolution and reduce these artefacts.

There are lots of things that you can do with this equation. For instance, you can extend it to a 'non-reciprocal' Cahn–Hilliard system as in [Brauns and Marchetti](https://doi.org/10.1103/PhysRevX.14.021014), which exhibits pretty patterns that you can play with in this [interactive simulation](/sim/?preset=CahnHilliardNonreciprocal). Thanks to Lloyd Fung for pointing out this example!

