# Quick start

VisualPDE is a web-based set of tools for solving partial differential equations (PDEs) via an interactive, easy-to-use simulation. To get started, try playing with some of the [linear examples](/explore#linear), or read on for some quick tips for using the solver.

### Interacting with the simulation
Clicking/pressing on the simulation draws values right onto the domain. You can customise exactly what this does under <span class='click_sequence'>Settings (🔧) → **Brush** </span> For example, the default settings in the [heat equation example](/basic-pdes/heat-equation) allow you to paint 'heat' of value 1 onto the domain, which acts like an initial condition for the rest of the simulation. If you have another mouse button to press, you can use it to remove 'heat'.

### The equations panel
Pressing Equations ($f(x)$) opens up the **equations panel**.

Here you can:
* See the [equation being simulated](#equations), here $\frac{du}{dt} = \nabla\cdot(D_u\nabla u) + f_u$.
* Set the named functions in the equations, here $D_u$ and $f_u$, under **Definitions**. These can be functions of any of the unknowns, space, and time (here $u$, $x$, $y$, and $t$), and of any parameters that will be defined further down the panel.
* Set the value of any extra parameters.
* Set the [boundary conditions](#boundary-conditions).
* Set the [initial conditions](#initial-conditions).
* Set the [number and type of equations](#changing-the-equations-) to be solved.

### Domain shape

The default **domain** for solving PDEs is a 2D rectangle, $\Omega = [0,L_x]\times[0,L_y]$, which fits the size of your browser window or phone screen. Throughout VisualPDE, we use coordinates $x\in[0,L_x]$ and $y\in[0,L_y]$.

You can force the domain to be a square, $\Omega = [0,L]\times[0,L]$, by toggling off <span class='click_sequence'>Settings (🔧) → **Domain** → **Fill screen**</span>

### Boundary conditions

The following **boundary conditions** are available to allow you to set the value of the function, or the value of its derivative, along the boundary $\partial\Omega$ of the domain $\Omega$:

* Periodic
* [Dirichlet](https://en.wikipedia.org/wiki/Dirichlet_boundary_condition) (e.g. $u|_{\partial\Omega} = 0$)
* [Neumann](https://en.wikipedia.org/wiki/Neumann_boundary_condition) (e.g. $\frac{du}{dn}|_{\partial\Omega} = 0$)
* [Robin](https://en.wikipedia.org/wiki/Robin_boundary_condition) (e.g. $(u + \frac{du}{dn})|_{\partial\Omega} = 0$)

You can swap between boundary conditions by choosing <span class='click_sequence'>Equations ($f(x)$) → **Boundary conditions**</span> and selecting from the list for each variable.

### Initial conditions
You can specify the values to which the unknowns are initialised when resetting the simulation. These expressions can be functions of $x$, $y$, the special string 'RAND' that assigns a random number in [0,1] to each point in the domain, along with any user-defined parameters and the images $I_S$ and $I_T$ (see the [advanced documentation](/user-guide/advanced-options) for more details). You can also use $L$, $L_x$ and $L_y$.

### Changing the equations

The simplest system VisualPDE can solve is a single PDE,

$$\frac{du}{dt} = \nabla \cdot (D_u \nabla u) + f_u,$$

where $D_u$ and $f_u$ are functions of $u$, $x$, $y$, and $t$ that you can specify.

VisualPDE supports systems of up to 8 coupled unknowns; the same pattern illustrated below for four unknowns, $u$, $v$, $w$ and $q$, extends directly to further variables (named $u5$ through $u8$ by default, since there's no natural fifth letter):

$$\begin{aligned}
t_u\frac{du}{dt} &= \nabla \cdot(D_{uu}\nabla u+D_{uv}\nabla v+D_{uw}\nabla w+D_{uq}\nabla q) + f_u,\\
\text{one of}\left\{\begin{matrix}\displaystyle t_v\frac{dv}{dt} \\ v\end{matrix}\right. & 
\begin{aligned}
    &= \nabla \cdot(D_{vu}\nabla u+D_{vv}\nabla v+D_{vw}\nabla w+D_{vq}\nabla q) + f_v \vphantom{\displaystyle t_v\frac{dv}{dt}}, \\
    &= \nabla \cdot(D_{vu}\nabla u+D_{vw}\nabla w+D_{vq}\nabla q) + f_v,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle t_w\frac{dw}{dt} \\ w\end{matrix}\right. & 
\begin{aligned}
    &= \nabla \cdot(D_{wu}\nabla u+D_{wv}\nabla v+D_{ww}\nabla w+D_{wq}\nabla q) + f_w \vphantom{\displaystyle t_w\frac{dw}{dt}}, \\
    &= \nabla \cdot(D_{wu}\nabla u+D_{wv}\nabla v+D_{wq}\nabla q) + f_w,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle t_q\frac{dq}{dt} \\ q\end{matrix}\right. & 
\begin{aligned}
    &= \nabla \cdot(D_{qu}\nabla u+D_{qv}\nabla v+D_{qw}\nabla w+D_{qq}\nabla q) + f_q \vphantom{\displaystyle t_q\frac{dq}{dt}}, \\
    &= \nabla \cdot(D_{qu}\nabla u+D_{qv}\nabla v+D_{qw}\nabla w) + f_q,
\end{aligned}
\end{aligned}$$

where $D_{uu}, \dots,  D_{qq}$, $f_u, \dots, f_q$ and $t_u, \dots, t_q$ are functions of $u$, $v$, $w$, $q$, $x$, $y$ and $t$ that you can specify.

* You can change the number of unknowns (from 1 to 8) by choosing <span class='click_sequence'>Equations ($f(x)$) → **Advanced options** → **\# variables**</span>
* In systems of multiple unknowns, you can include terms representing cross-diffusion (e.g. $D_{uv}$, $D_{vu}$) by toggling <span class='click_sequence'>Equations ($f(x)$) → **Advanced options** → **Cross diffusion**</span>
* In systems of multiple unknowns, you can choose between a differential or algebraic equation for some of the variables (e.g. '$\partial w/\partial t=$' or '$w=$') by setting <span class='click_sequence'>Equations ($f(x)$) → **Advanced options** → **\# algebraic**</span>. variables are converted to algebraic form in reverse order, e.g. setting this to 1 converts only the last variables to algebraic form.

### More VisualPDE
For a comprehensive list of all the options that you can set in VisualPDE, check out the [Advanced documentation](/user-guide/advanced-options), or discover what VisualPDE can solve in our brief [summary](/user-guide/what-can-visualpde-solve).
