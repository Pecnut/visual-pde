---
layout: page
title: Survival in a harsh environment
lesson_number: 20
thumbnail: /assets/images/harsh-environment.webp
extract: Impacts of boundary conditions on survival
equation: $\pd{u}{t}=\nabla^2 u+u\left(1-\frac{u}{K}\right)$<br />with no-flux boundary conditions
categories: [biology, parabolic]
---
We'll continue studying the logistic reaction–diffusion model,

$$\pd{u}{t}=D\nabla^2 u+u\left(1-\frac{u}{K}\right),$$

but now we consider different boundary conditions.

* Load the [interactive simulation](/sim/?preset=harshEnvironment). The initial conditions leads to population growth in select areas of the domain, which eventually reach a large density and begin spreading. As the system initially has no-flux boundary conditions, the population will reach carrying capacity everywhere.

* Now change the boundary conditions to "Dirichlet", taking the constant value to be $0$. This will affect the solution near the domain edges, but not the interior, as the diffusion is small.

* Now increase the diffusion coefficient by deleting zeroes from the value of $D$. This will increase the region over which the boundary conditions affect the structure of the solution.

* One can show that the positive equilibrium exists and is globally stable if and only if
$$
D < \frac{L^2}{2\pi^2} \approx 5.066,
$$
as $L=10$ in our simulation. For diffusion coefficients larger than this value, the extinction equilibrium, $u=0$, is stable. Try simulating the system at $D=4$, and $D=6$, clicking if needed to introduce some additional population into the domain.

    **Note**: You can check the condition more precisely by looking at $D$ values closer to the boundary, but the timescale to reach equilibrium will be long, and the amplitude of $u$ will become very small.

* The analytical condition above does not depend on the carrying capacity $K$. Set $K=1000$, and simulate the system at $D=4$ and $D=6$ in this case to confirm that $K$ will not change the boundary of where the populations persists, though it will change the structure of the solution when $u>0$. Again you may need to click to introduce some population into the domain. With this value of $K$, it is easier to see the solution's behaviour near the critical diffusion threshold. The values $D=5$ and $D=5.2$ are good choices, for example.

* [This 1D interactive simulation](/sim/?preset=harsh1D) shows the core physics driving extinction by plotting the flux, given by $-Du_x$, on top of the population density. This shows that the population moves outside of the domain as the reason why the boundary conditions influence the total population.

# Global carrying capacity
An alternative model does not use a local carrying capacity, but instead limits population growth via a 'global' resource limitation. This would look like:
\begin{aligned}
     \pd{u}{t} =  D \pdd{u}{x} + r u \left[1-\frac{1}{|\Omega|}\int_{\Omega} u\, \d x \right].
    \end{aligned}
[Here is a 1D simulation comparing this global carrying capacity to an equivalent local one, both with Dirichlet boundary conditions](/sim/?preset=LocalVsGlobalCarryingCapacity). As you can see, both the transient and the long-time distribution of these models have rather different shapes, although the approximate final masses are similar. 
