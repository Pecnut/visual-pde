---
layout: page
title: Quick start
lesson_number: 10
thumbnail: /assets/images/start.webp
extract: Two-minute top tips
---

VisualPDE is a web-based set of tools for solving partial differential equations (PDEs) via an interactive, easy-to-use simulation. To get started, try playing with some of the [linear examples](/explore#linear), or read on for some quick tips for using the solver.

### Interacting with the simulation <a class="anchor" id='interacting'>
Clicking/pressing on the simulation draws values right onto the domain. You can customise exactly what this does under <span class='click_sequence'>{{ layout.settings }} → **Brush** </span> For example, the default settings in the [heat equation example](/basic-pdes/heat-equation) allow you to paint 'heat' of value 1 onto the domain, which acts like an initial condition for the rest of the simulation. If you have another mouse button to press, you can use it to remove 'heat'.

### The equations panel <a class="anchor" id='equations-panel'>
Pressing {{ layout.equations }} opens up the **equations panel**.

{:refdef: style="text-align: center;"}
![Equations panel](/assets/images/equations-panel.webp){: width="253px" border="1px black"}
{: refdef}

Here you can:
* See the [equation being simulated](#equations), here $\pd{u}{t} = \vnabla\cdot(D_u\vnabla u) + f_u$.
* Set the named functions in the equations, here $D_u$ and $f_u$, under **Equations**. These can be functions of any of the unknowns, space, and time (here $u$, $x$, $y$, and $t$), and of any parameters that will be defined further down the panel.
* Set the value of any extra parameters.
* Introduce any notational substitutions to make your equations easier.
* Set the [boundary conditions](#boundary-conditions).
* Set the [initial conditions](#initial-conditions).
* Set the [number and type of equations](#equations) to be solved.

### Domain shape <a class="anchor" id='domain-shape'>

The default **domain** for solving PDEs is a 2D rectangle, $\domain = [0,L_x]\times[0,L_y]$, which fits the size of your browser window or phone screen. Throughout VisualPDE, we use coordinates $x\in[0,L_x]$ and $y\in[0,L_y]$.

You can force the domain to be a square, $\domain = [0,L]\times[0,L]$, by toggling off <span class='click_sequence'>{{ layout.settings }} → **Domain** → **Fill screen**</span>

### Boundary conditions <a class="anchor" id='boundary-conditions'>

The following **boundary conditions** are available to allow you to set the value of the function, or the value of its derivative, along the boundary $\boundary$ of the domain $\domain$:

* Periodic
* [Dirichlet](https://en.wikipedia.org/wiki/Dirichlet_boundary_condition) (e.g. $u\onboundary = 0$)
* [Neumann](https://en.wikipedia.org/wiki/Neumann_boundary_condition) (e.g. $\pd{u}{n}\onboundary = 0$)
* [Robin](https://en.wikipedia.org/wiki/Robin_boundary_condition) (e.g. $(u + \pd{u}{n})\onboundary = 0$)

You can swap between boundary conditions by choosing <span class='click_sequence'>{{ layout.equations }} → **Boundary conditions**</span> and selecting from the list for each variable.

### Initial conditions <a class="anchor" id='initial-conditions'>
You can specify the values to which the unknowns ($u$, $v$, $w$) are initialised when resetting the simulation. These expressions can be functions of $x$, $y$, the special string 'RAND' that assigns a random number in [0,1] to each point in the domain, along with any user-defined parameters and the images $I_S$ and $I_T$ (see the [advanced documentation](/user-guide/advanced-options) for more details). You can also use $L$, $L_x$ and $L_y$.

### Changing the equations <a class="anchor" id='equations'>

The simplest system VisualPDE can solve is a single PDE,

$$\pd{u}{t} = \vnabla \cdot (D_u \vnabla u) + f_u,$$

where $D_u$ and $f_u$ are functions of $u$, $x$, $y$, and $t$ that you can specify.

The most complicated type is a coupled system of PDEs in eight unknowns. As an illustration, for four unknowns, $u$, $v$, $w$ and $q$, the general system VisualPDE can solve is

$$\begin{aligned}
t_u\pd{u}{t} &= \vnabla \cdot(D_{uu}\vnabla u+D_{uv}\vnabla v+D_{uw}\vnabla w+D_{uq}\vnabla q) + f_u,\\
\text{one of}\left\{\begin{matrix}\displaystyle t_v\pd{v}{t} \\ v\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{vu}\vnabla u+D_{vv}\vnabla v+D_{vw}\vnabla w+D_{vq}\vnabla q) + f_v \vphantom{\displaystyle t_v\pd{v}{t}}, \\
    &= \vnabla \cdot(D_{vu}\vnabla u+D_{vw}\vnabla w+D_{vq}\vnabla q) + f_v,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle t_w\pd{w}{t} \\ w\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{wu}\vnabla u+D_{wv}\vnabla v+D_{ww}\vnabla w+D_{wq}\vnabla q) + f_w \vphantom{\displaystyle t_w\pd{w}{t}}, \\
    &= \vnabla \cdot(D_{wu}\vnabla u+D_{wv}\vnabla v+D_{wq}\vnabla q) + f_w,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle t_q\pd{q}{t} \\ q\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{qu}\vnabla u+D_{qv}\vnabla v+D_{qw}\vnabla w+D_{qq}\vnabla q) + f_q \vphantom{\displaystyle t_q\pd{q}{t}}, \\
    &= \vnabla \cdot(D_{qu}\vnabla u+D_{qv}\vnabla v+D_{qw}\vnabla w) + f_q,
\end{aligned}
\end{aligned}$$

where $D_{uu}, \dots,  D_{qq}$, $f_u, \dots, f_q$ and $t_u, \dots, t_q$ are functions of $u$, $v$, $w$, $q$, $x$, $y$ and $t$ that you can specify.

* You can change the number of unknowns by choosing <span class='click_sequence'>{{ layout.equations }} → **Equations** → **Variables** → **Number**</span>
* In systems of multiple unknowns, you can include terms representing cross-diffusion (e.g. $D_{uv}$, $D_{vu}$) by toggling <span class='click_sequence'>{{ layout.equations }} → **Equations** → **Diffusion coefficients** →  **Cross diffusion**</span>
* In systems of multiple unknowns, you can choose between a differential or algebraic equation for some of the variables (e.g. '$\partial w/\partial t=$' or '$w=$') by setting <span class='click_sequence'>{{ layout.equations }} → **Equations** → **Variables** → **No. algebraic**</span>

### More VisualPDE
For a comprehensive list of all the options that you can set in VisualPDE, check out the [Advanced documentation](/user-guide/advanced-options), or discover what VisualPDE can solve in our brief [summary](/user-guide/what-can-visualpde-solve).
