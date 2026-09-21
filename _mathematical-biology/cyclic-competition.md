---
layout: page
title: Cyclic competition models
lesson_number: 110
thumbnail: /assets/images/rock-paper-scissors.webp
extract: Rock, paper, scissors – spiral waves!
equation: $\pd{u}{t}=D_u\nabla^2 u+u(1-u-av-bw)$ $\pd{v}{t}=D_v\nabla^2 v+v(1-bu-v-aw)$ $\pd{w}{t}=D_w\nabla^2 w+w(1-au-bv-w)$
categories: [biology, waves, chaos, parabolic]
---

We now consider an example of a reaction–diffusion system based on the following reaction kinetics:

$$\begin{aligned}\pd{u}{t}&=D_u\nabla^2 u+u(1-u-av-bw),\\ \pd{v}{t}&=D_v\nabla^2 v+v(1-bu-v-aw),\\ \pd{w}{t}&=D_w\nabla^2 w+w(1-au-bv-w).\end{aligned}$$

These are an example of a [generalised Lotka–Volterra](https://stefanoallesina.github.io/Sao_Paulo_School/intro.html) system. If we set $a < 1 < b$, then each population outcompetes another, and hence their relative fitness forms a cycle. This kind of model is also known as a spatial rock-paper-scissors game.

To make things more interesting, we will allow the species to diffuse at different rates.

* Load the [interactive simulation](/sim/?preset=cyclicCompetition)

* This begins with an initially structured population that eventually devolves into a complex spatiotemporal motion, with spiral waves a dominant feature.

* This system exhibits a wide range of behaviours. One of the most interesting is that if you allow spiral waves to form, and then set all diffusion coefficients to be equal (e.g. by changing $D_u$ to $0.5$), the system will still admit spiral waves despite not having a Turing-like instability.

* Wave-induced spatiotemporal chaos can even occur without a Turing-like instability; see this [wave simulation](/sim/?preset=cyclicCompetitionWave) for an example.

## Rock-paper-scissors-lizard-Spock

A five-component variant of this model is given by,

$$\begin{aligned}
      \pd{a}{t} &= D \nabla^2 a + a \left(1-\rho-r \left[b+d\right]+s \left[c+e\right]\right),\\
      \pd{b}{t} &= D \nabla^2 b + b \left(1-\rho-r \left[c+e\right]+s \left[d+a\right]\right),\\
      \pd{c}{t} &= D \nabla^2 c + c \left(1-\rho-r \left[d+a\right]+s \left[e+b\right]\right),\\
      \pd{d}{t} &= D \nabla^2 d + d \left(1-\rho-r \left[e+b\right]+s \left[a+c\right]\right),\\
      \pd{e}{t} &= D \nabla^2 e + e \left(1-\rho-r \left[a+c\right]+s \left[b+d\right]\right),\\
     \rho &= a+b+c+d+e,
\end{aligned}$$

where $\rho$ is the total density, and the parameters $r$ and $s$ are related to removal and replacement rates of the populations, generalising the cyclic structure from the above model. This example is based on [Section 4 of this paper](https://arxiv.org/pdf/2010.05224), which has further details (though a slightly different parameterization and notation).

Explore an [interactive simulation of this model](/sim/?preset=rockpaperscissorslizardspock). By default, the first species $a$ is plotted, but you can cycle through each species (and plot the total density $\rho$) by clicking {{ layout.views }}. 

The initial perturbation leads to broad regions of plateau-like waves, which eventually break up into disorganized spiral waves. Interestingly, different regions come into and out of existence over time, suggesting pattern formation that selects multiple distinct lengthscales that is emergent from the increased number of species interacting. 

As a technical aside: this simulation also has equal diffusion coefficients, suggesting a rather more complicated mechanism of these patterns.
