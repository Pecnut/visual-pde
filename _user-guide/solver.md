---
layout: page
title: The VisualPDE solver
lesson_number: 40
thumbnail: /assets/images/UnderTheHood.webp
extract: Under the hood of VisualPDE
---

VisualPDE aims to be a plug-and-play, browser-based solver and visualiser for a range of PDE systems, with as few barriers to entry as possible. Underneath what we hope is a polished exterior, we've made a number of somewhat technical choices to enable interactive and reliable solution across as many devices as we can support. To explain these choices, and because we like knowing what's going on inside any software we use, we've compiled a short summary of how VisualPDE works under the hood. This is accompanied by a more detailed account in an [open access article](https://doi.org/10.1007/s11538-023-01218-4).

We are always looking for ways to improve and extend VisualPDE, especially ways of reaching a broader audience and new communities. If you have any questions or suggestions about anything related to VisualPDE, we'd love to hear from you at [hello@visualpde.com](mailto:hello@visualpde.com)!

<form id="pageSearchForm"
onSubmit="page_search(document.getElementById('pageSearchInput').value); return false;"
>
<p>
    <div id="pageSearchBar">
    <input
      type="text"
      id="pageSearchInput"
      name="q"
      maxlength="255"
      value=""
      placeholder="Search this page"
      autocomplete="off"
      autocorrect="off"
      spellcheck="false"
      onfocus="document.getElementById('pageSearchForm').onsubmit();window.gtag?.('event', 'page_search');"
      oninput="document.getElementById('pageSearchForm').onsubmit();"
      />
      <div id="pageSearchResults" tabindex="0">
        <ul></ul>
      </div>
    </div>
  </p>
</form>

<div id="toc"></div>

### The equations <a class="anchor" id='equations'>

VisualPDE can solve a variety of PDE systems posed in 1D or 2D space, many of which are straightforward extensions of the two-species reaction–diffusion system,

$$
\begin{aligned}
    \pd{u}{t} &= \vnabla \cdot(D_u\vnabla u) + f_u,\\
    \pd{v}{t} &= \vnabla \cdot(D_v\vnabla v) + f_v.
\end{aligned}
$$

Here, $u$ and $v$ are the scalar unknowns that we solve for, $t$ is time, and the divergence and gradient operators are the usual spatial operators in a 2D Euclidean domain. In general, the interaction/kinetic terms ($f_u$ and $f_v$) and the diffusion coefficients ($D_u$ and $D_v$) can each be functions of time, space, and the unknowns, though we often don't explicitly write these potential dependencies. See this [help page](what-can-visualpde-solve) for a comprehensive summary of the types of PDEs that VisualPDE can solve.

### The domain <a class="anchor" id='domain'>

A PDE problem is not well-posed without specifying a domain (or [boundary conditions](#boundary-conditions)). We typically determine the domain $\domain$ from the size of your device, fixing the largest side to be of length $L$. You can demand a square domain with aspect ratio 1:1 by toggling <span class='click_sequence'>{{ layout.settings }} → **Domain** → **Fill screen**</span>

However, not all domains are rectangular. To accommodate this, VisualPDE allows you to specify an arbitrary domain via a [level set](https://en.wikipedia.org/wiki/Level-set_method) or [indicator function](https://en.wikipedia.org/wiki/Indicator_function) approach, under <span class='click_sequence'>{{ layout.settings }} → **Domain** → **Implicit**</span> To make this work in practice, VisualPDE uses this user-specified function to determine which parts of $\domain$ to include in the simulation, though this prevents you from specifying boundary conditions that include derivatives (computing normals to user-specified curves is not something we wanted to think about). You can specify a boolean (e.g. $x<0.5$) or a simple expression (e.g. $x-0.5$), where (strict) positivity identifies the interior of the domain. You can even use images in this expression, allowing you to define complicated domains with ease.

### Spatial discretisation <a class="anchor" id='spatial-discretisation'>

We take $\domain$ and divide it into a square grid with a user-configurable spacing. Be warned: the only limit to this spacing is your imagination/hardware, so taking a spatial step of $\dx=10^{-9}$ is unlikely to be a good idea... We use this grid in a [finite difference](https://en.wikipedia.org/wiki/Finite_difference_method) scheme to approximate the spatial operators in our system.

If $D_u$ and $D_v$ were simply constants, as they were when we began the development of VisualPDE, a standard [central differences](https://en.wikipedia.org/wiki/Discrete_Laplace_operator) discretisation of the resulting Laplacian $\nabla^2$ would suffice. However, as these coefficients generally vary in space, we employ a similar but necessarily more complex scheme. Explicitly, using $\vnabla \cdot(D_u\vnabla u)$ as an example and limiting ourselves to 1D for brevity, we approximate

$$\textstyle \vnabla \cdot(D_u\vnabla u) \approx \frac{D_u(x-\dx)[u(x-\dx) - u(x)] + D_u(x)[u(x-\dx) - 2u(x) + u(x+\dx)] + D_u(x+\dx)[u(x+\dx) - u(x)]}{2\,\dx^2}$$

at a point $x$, where we've omitted any dependence of any quantities on anything other than space. Notably, this is just a standard central differences scheme if $D_u$ is constant. Adding the above to itself with $x$ replaced with $y$ gives the 2D discretisation, and adding in additional terms is simple by linearity.

### Timestepping <a class="anchor" id='timestepping'>

With space discretised as above, we are faced with a large system of coupled ordinary differential equations to solve, which represent the evolution of the unknowns at each discrete gridpoint of the spatial domain. VisualPDE implements four popular schemes for timestepping: [Forward Euler](https://en.wikipedia.org/wiki/Euler_method), two-step [Adams-Bashforth](https://en.wikipedia.org/wiki/Linear_multistep_method#Two-step_Adams–Bashforth), the [Midpoint Method](https://en.wikipedia.org/wiki/Midpoint_method) and the four-step [Runge-Kutta](https://en.wikipedia.org/wiki/Runge–Kutta_methods) method (commonly known as 'RK4'). These solvers each have their strengths, with Forward Euler being the least computationally demanding while RK4 offers superior accuracy and stability at the cost of doing more calculations each timestep. The following Forward Euler scheme is the default in many of the examples on the site:

$$ \pd{u}{t} \approx \frac{u(t+\dt) - u(t)}{\dt}$$

for timestep $\dt$. This approach is far from state-of-the-art, but it is straightforward and intuitive to implement on massively parallel computing hardware (more on that [later](#browser)).

In practice, its simplicity can lead to some problems, with [numerical instability](https://en.wikipedia.org/wiki/Euler_method#Numerical_stability) being perhaps the most pathological. Loosely speaking, the interaction between the forward Euler scheme and our spatial discretisation can lead to numerical artefacts ruining the solution, which typically occur when the ratio $D \, \dt / \dx^2$ is too small, where $D$ is any of the diffusion coefficients in the problem. Both the Midpoint Method and RK4 improve upon the stability of Forward Euler, whilst the Adams-Bashforth scheme is generally less stable but more accurate than Forward Euler.

VisualPDE will try to tell you when it's fallen foul of stability issues (we periodically check for 'NaN' or $\pm\infty$ in the solution), at which point you might want to try reducing $\dt$, trying out a different solver, reducing the diffusion coefficients in your problem, or increasing $\dx$ (we recommend trying each of these things in this order). If you want to experience this for yourself for Forward Euler, try clicking in [this](/sim/?preset=unstableHeatEquation) simulation. It turns out that only RK4 will make this simulation stable due to the relative size of the diffusion coefficient, timestep $\dt$ and spatial step $\dx$, which you can see for yourself by switching the timestepping scheme.

Despite each of our solvers having their limitations, these schemes have enabled VisualPDE to efficiently solve every system that we've thrown at it, though some tuning of the timestep can be necessary in extreme cases. If you have any tips for implementing alternative schemes (especially anything implicit), we'd love to hear from you!

### Boundary conditions <a class="anchor" id='boundary-conditions'>

VisualPDE implements four types of boundary condition: periodic, [Dirichlet](https://en.wikipedia.org/wiki/Dirichlet_boundary_condition), [Neumann](https://en.wikipedia.org/wiki/Neumann_boundary_condition), and [Robin](https://en.wikipedia.org/wiki/Robin_boundary_condition). As each of these are slightly different in character, we briefly describe the general form of each condition that can be used in VisualPDE, along with notes on how this is enforced in the simulation. We pose these conditions as if they correspond to the scalar [heat equation](/\_basic-pdes/heat-equation) in 2D.

#### Periodic

Periodic boundary conditions, where $u(x+L_x,y)=u(x,y)$ etc, are the simplest to implement. If our spatial discretisation is attempting to sample a function outside of $\domain$, we simply map its argument back to $\domain$ by shifting by $L_x$ or $L_y$.

#### Dirichlet

Dirichlet boundary conditions take the form $u\onboundary = a(x,y,t)$ for a user-specified function $a$. These are easy to enforce, as we simply override our usual timestepping for any nodes on the boundary of the domain. If the user has chosen to use an implicitly defined domain, we assign $a(x,y,t)$ to all points outside of $\domain$.

#### Neumann

Neumann boundary conditions are specified as $\pd{u}{n}\onboundary = a(x,y,t)$ for a user-specified function $a$, where $\pd{u}{n}$ denotes a derivative in the direction of the (outward-pointing) normal to the boundary. Implementing a Neumann boundary condition is done via so-called **ghost nodes** in our discretisation. For instance, enforcing $\pd{u}{n}\onboundary = 0$ at the left-most $x$ boundary of a rectangular domain is achieved in practice by taking

$$\textstyle u(x-\dx,y) = u(x+\dx,y)$$

in the [finite difference operator](#spatial-discretisation) described above.

#### Robin

Robin boundary conditions are a natural combination of Dirichlet and Neumann conditions, which we pose in the form of a generalised Neumann condition $\pd{u}{n}\onboundary = a(u,x,y,t)$, where the right-hand side can now depend on $u$ (and any other unknown in multi-species systems). These conditions are also implemented with ghost nodes. For example, enforcing $\pd{u}{n}\onboundary = u\onboundary$ at the leftmost $x$ boundary of a rectangular domain is achieved in practice by taking

$$\textstyle u(x-\dx,y) = u(x+\dx,y) + 2 u(x,y)\,\dx$$

in the [finite difference operator](#spatial-discretisation) described above, approximating the derivative at the boundary with a simple central difference.

#### Combined

VisualPDE also allows you to specify different boundary conditions on different parts of the boundary. Doing this requires some special syntax, as detailed in the [advanced documentation](/user-guide/advanced-options#boundary-conditions).

### Doing this in your browser, quickly <a class="anchor" id='browser'>

Solving PDEs is hard. To solve them in real time in your browser, VisualPDE gives all the hard work to the graphics chip (GPU) on your device, making use of [WebGL](https://en.wikipedia.org/wiki/WebGL) and a low-level shader language called [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language).

Every time your browser requests a frame from VisualPDE (which might be up to 60 times per second), some [JavaScript](https://en.wikipedia.org/wiki/JavaScript) organises the solving of the discretised equations, displaying the solution, and incorporating anything you've drawn, which all happen on the GPU. Each frame, we typically perform hundreds of timesteps to give you a smooth experience, mitigating many of the limitations of our [timestepping schemes](#timestepping). If you're interested in the finest details of the implementation, the source code for the entire site is freely available to view, reuse, and repurpose on [GitHub](https://github.com/Pecnut/visual-pde).

### Accuracy and precision

VisualPDE hopes to be as accurate as possible whilst providing a responsive, visual, portable platform for solving PDEs. In most systems, the timestep, timestepping scheme and spatial discretisation will be the main source of any errors, as you'd expect from finite-difference discretisations of PDEs. Naturally, smaller timesteps, higher order timestepping schemes and refined spatial discretisations will often improve the accuracy of the solution, but each will incur additional computational costs. With VisualPDE, you can choose the balance that works best for you (and potentially your audience).

A more subtle limit on the accuracy of VisualPDE is our use of single-precision arithmetic, something we've inherited from the libraries we use and the capabilities of modern hardware. We'll be moving to double-precision computation as soon as we can to maximise the accuracy of VisualPDE. In the meantime, rest assured that single-precision arithmetic is sufficient for capturing a wide range of phenomena, including those explored in our examples, but keep this caveat in mind when seeking to find precise quantitative answers to PDE problems.
