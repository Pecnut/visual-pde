# The VisualPDE solver

VisualPDE aims to be a plug-and-play, browser-based solver and visualiser for a range of PDE systems, with as few barriers to entry as possible. Underneath what we hope is a polished exterior, we've made a number of somewhat technical choices to enable interactive and reliable solution across as many devices as we can support. To explain these choices, and because we like knowing what's going on inside any software we use, we've compiled a short summary of how VisualPDE works under the hood. This is accompanied by a more detailed account in an [open access article](https://doi.org/10.1007/s11538-023-01218-4).

We are always looking for ways to improve and extend VisualPDE, especially ways of reaching a broader audience and new communities. If you have any questions or suggestions about anything related to VisualPDE, we'd love to hear from you at [hello@visualpde.com](mailto:hello@visualpde.com)!

### The equations

VisualPDE can solve a variety of PDE systems posed in 1D or 2D space, many of which are straightforward extensions of the two-variables reaction–diffusion system,

$$
\begin{aligned}
    \frac{du}{dt} &= \nabla \cdot(D_u\nabla u) + f_u,\\
    \frac{dv}{dt} &= \nabla \cdot(D_v\nabla v) + f_v.
\end{aligned}
$$

Here, $u$ and $v$ are the scalar unknowns that we solve for, $t$ is time, and the divergence and gradient operators are the usual spatial operators in a 2D Euclidean domain. In general, the interaction/kinetic terms ($f_u$ and $f_v$) and the diffusion coefficients ($D_u$ and $D_v$) can each be functions of time, space, and the unknowns, though we often don't explicitly write these potential dependencies. See this [help page](what-can-visualpde-solve) for a comprehensive summary of the types of PDEs that VisualPDE can solve.

### The domain

A PDE problem is not well-posed without specifying a domain (or [boundary conditions](#boundary-conditions)). We typically determine the domain $\Omega$ from the size of your device, fixing the largest side to be of length $L$. You can demand a square domain with aspect ratio 1:1 by toggling <span class='click_sequence'>Settings (🔧) → **Domain** → **Fill screen**</span>

However, not all domains are rectangular. To accommodate this, VisualPDE allows you to specify an arbitrary domain via a [level set](https://en.wikipedia.org/wiki/Level-set_method) or [indicator function](https://en.wikipedia.org/wiki/Indicator_function) approach, under <span class='click_sequence'>Settings (🔧) → **Domain** → **Implicit**</span> To make this work in practice, VisualPDE uses this user-specified function to determine which parts of $\Omega$ to include in the simulation, though this prevents you from specifying boundary conditions that include derivatives (computing normals to user-specified curves is not something we wanted to think about). You can specify a boolean (e.g. $x<0.5$) or a simple expression (e.g. $x-0.5$), where (strict) positivity identifies the interior of the domain. You can even use images in this expression, allowing you to define complicated domains with ease.

### Spatial discretisation

We take $\Omega$ and divide it into a square grid with a user-configurable spacing. Be warned: the only limit to this spacing is your imagination/hardware, so taking a spatial step of $\Delta x=10^{-9}$ is unlikely to be a good idea... We use this grid in a [finite difference](https://en.wikipedia.org/wiki/Finite_difference_method) scheme to approximate the spatial operators in our system.

If $D_u$ and $D_v$ were simply constants, as they were when we began the development of VisualPDE, a standard [central differences](https://en.wikipedia.org/wiki/Discrete_Laplace_operator) discretisation of the resulting Laplacian $\nabla^2$ would suffice. However, as these coefficients generally vary in space, we employ a similar but necessarily more complex scheme. Explicitly, using $\nabla \cdot(D_u\nabla u)$ as an example and limiting ourselves to 1D for brevity, we approximate

$$\textstyle \nabla \cdot(D_u\nabla u) \approx \frac{D_u(x-\Delta x)[u(x-\Delta x) - u(x)] + D_u(x)[u(x-\Delta x) - 2u(x) + u(x+\Delta x)] + D_u(x+\Delta x)[u(x+\Delta x) - u(x)]}{2\,\Delta x^2}$$

at a point $x$, where we've omitted any dependence of any quantities on anything other than space. Notably, this is just a standard central differences scheme if $D_u$ is constant. Adding the above to itself with $x$ replaced with $y$ gives the 2D discretisation, and adding in additional terms is simple by linearity.

### Timestepping

With space discretised as above, we are faced with a large system of coupled ordinary differential equations to solve, which represent the evolution of the unknowns at each discrete gridpoint of the spatial domain. VisualPDE implements four popular schemes for timestepping: [Forward Euler](https://en.wikipedia.org/wiki/Euler_method), two-step [Adams-Bashforth](https://en.wikipedia.org/wiki/Linear_multistep_method#Two-step_Adams–Bashforth), the [Midpoint Method](https://en.wikipedia.org/wiki/Midpoint_method) and the four-step [Runge-Kutta](https://en.wikipedia.org/wiki/Runge–Kutta_methods) method (commonly known as 'RK4'). These solvers each have their strengths, with Forward Euler being the least computationally demanding while RK4 offers superior accuracy and stability at the cost of doing more calculations each timestep. The following Forward Euler scheme is the default in many of the examples on the site:

$$ \frac{du}{dt} \approx \frac{u(t+\Delta t) - u(t)}{\Delta t}$$

for timestep $\Delta t$. This approach is far from state-of-the-art, but it is straightforward and intuitive to implement on massively parallel computing hardware (more on that [later](#browser)).

In practice, its simplicity can lead to some problems, with [numerical instability](https://en.wikipedia.org/wiki/Euler_method#Numerical_stability) being perhaps the most pathological. Loosely speaking, the interaction between the forward Euler scheme and our spatial discretisation can lead to numerical artefacts ruining the solution, which typically occur when the ratio $D \, \Delta t / \Delta x^2$ is too small, where $D$ is any of the diffusion coefficients in the problem. Both the Midpoint Method and RK4 improve upon the stability of Forward Euler, whilst the Adams-Bashforth scheme is generally less stable but more accurate than Forward Euler.

VisualPDE will try to tell you when it's fallen foul of stability issues (we periodically check for 'NaN' or $\pm\infty$ in the solution), at which point you might want to try reducing $\Delta t$, trying out a different solver, reducing the diffusion coefficients in your problem, or increasing $\Delta x$ (we recommend trying each of these things in this order).
Despite each of our solvers having their limitations, these schemes have enabled VisualPDE to efficiently solve every system that we've thrown at it, though some tuning of the timestep can be necessary in extreme cases. If you have any tips for implementing alternative schemes (especially anything implicit), we'd love to hear from you!

### Boundary conditions

VisualPDE implements four types of boundary condition: periodic, [Dirichlet](https://en.wikipedia.org/wiki/Dirichlet_boundary_condition), [Neumann](https://en.wikipedia.org/wiki/Neumann_boundary_condition), and [Robin](https://en.wikipedia.org/wiki/Robin_boundary_condition). As each of these are slightly different in character, we briefly describe the general form of each condition that can be used in VisualPDE, along with notes on how this is enforced in the simulation. We pose these conditions as if they correspond to the scalar [heat equation](/\_basic-pdes/heat-equation) in 2D.

#### Periodic

Periodic boundary conditions, where $u(x+L_x,y)=u(x,y)$ etc, are the simplest to implement. If our spatial discretisation is attempting to sample a function outside of $\Omega$, we simply map its argument back to $\Omega$ by shifting by $L_x$ or $L_y$.

#### Dirichlet

Dirichlet boundary conditions take the form $u|_{\partial\Omega} = a(x,y,t)$ for a user-specified function $a$. These are easy to enforce, as we simply override our usual timestepping for any nodes on the boundary of the domain. If the user has chosen to use an implicitly defined domain, we assign $a(x,y,t)$ to all points outside of $\Omega$.

#### Neumann

Neumann boundary conditions are specified as $\frac{du}{dn}|_{\partial\Omega} = a(x,y,t)$ for a user-specified function $a$, where $\frac{du}{dn}$ denotes a derivative in the direction of the (outward-pointing) normal to the boundary. Implementing a Neumann boundary condition is done via so-called **ghost nodes** in our discretisation. For instance, enforcing $\frac{du}{dn}|_{\partial\Omega} = 0$ at the left-most $x$ boundary of a rectangular domain is achieved in practice by taking

$$\textstyle u(x-\Delta x,y) = u(x+\Delta x,y)$$

in the [finite difference operator](#spatial-discretisation) described above.

#### Robin

Robin boundary conditions are a natural combination of Dirichlet and Neumann conditions, which we pose in the form of a generalised Neumann condition $\frac{du}{dn}|_{\partial\Omega} = a(u,x,y,t)$, where the right-hand side can now depend on $u$ (and any other unknown in multi-variables systems). These conditions are also implemented with ghost nodes. For example, enforcing $\frac{du}{dn}|_{\partial\Omega} = u|_{\partial\Omega}$ at the leftmost $x$ boundary of a rectangular domain is achieved in practice by taking

$$\textstyle u(x-\Delta x,y) = u(x+\Delta x,y) + 2 u(x,y)\,\Delta x$$

in the [finite difference operator](#spatial-discretisation) described above, approximating the derivative at the boundary with a simple central difference.

#### Combined

VisualPDE also allows you to specify different boundary conditions on different parts of the boundary. Doing this requires some special syntax, as detailed in the [advanced documentation](/user-guide/advanced-options#boundary-conditions).

### Doing this in your browser, quickly

Solving PDEs is hard. To solve them in real time in your browser, VisualPDE gives all the hard work to the graphics chip (GPU) on your device, making use of [WebGL](https://en.wikipedia.org/wiki/WebGL) and a low-level shader language called [GLSL](https://en.wikipedia.org/wiki/OpenGL_Shading_Language).

Every time your browser requests a frame from VisualPDE (which might be up to 60 times per second), some [JavaScript](https://en.wikipedia.org/wiki/JavaScript) organises the solving of the discretised equations, displaying the solution, and incorporating anything you've drawn, which all happen on the GPU. Each frame, we typically perform hundreds of timesteps to give you a smooth experience, mitigating many of the limitations of our [timestepping schemes](#timestepping). If you're interested in the finest details of the implementation, the source code for the entire site is freely available to view, reuse, and repurpose on [GitHub](https://github.com/Pecnut/visual-pde).

### Many variables at once

The state of a system with up to 4 variables fits naturally into a single image: each variables is stored in one of the four colour channels (red, green, blue, alpha) of a texture, so a single GPU pass can update all of them together. VisualPDE supports systems of up to 8 variables by using a second such texture (each again holding up to 4 variables) and updating both at once via [multiple render targets](https://en.wikipedia.org/wiki/Multiple_Render_Targets), a standard GPU technique for writing to more than one image in a single pass. Cross-diffusion and reaction terms can still freely couple any variables to any other, regardless of which texture each lives in, and all four [timestepping schemes](#timestepping) are supported regardless of the number of variables.

### Accuracy and precision

VisualPDE hopes to be as accurate as possible whilst providing a responsive, visual, portable platform for solving PDEs. In most systems, the timestep, timestepping scheme and spatial discretisation will be the main source of any errors, as you'd expect from finite-difference discretisations of PDEs. Naturally, smaller timesteps, higher order timestepping schemes and refined spatial discretisations will often improve the accuracy of the solution, but each will incur additional computational costs. With VisualPDE, you can choose the balance that works best for you (and potentially your audience).

A more subtle limit on the accuracy of VisualPDE is our use of single-precision arithmetic, something we've inherited from the libraries we use and the capabilities of modern hardware. We'll be moving to double-precision computation as soon as we can to maximise the accuracy of VisualPDE. In the meantime, rest assured that single-precision arithmetic is sufficient for capturing a wide range of phenomena, including those explored in our examples, but keep this caveat in mind when seeking to find precise quantitative answers to PDE problems.
