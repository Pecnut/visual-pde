# What can VisualPDE solve?

VisualPDE solves systems of PDEs that look like generalised reaction--diffusion equations. It can do this in 1D or 2D.

The simplest type of system is just a single PDE in a single unknown, $u$,

$$\frac{du}{dt} = \nabla \cdot (D_u \nabla u) + f_u,$$

where $D_u$ and $f_u$ are functions of $u$, $t$, and space that you can choose. For example, if $f_u=0$ and $D_u$ is a constant, you have [the heat equation](/basic-pdes/heat-equation). 

VisualPDE supports systems of up to 8 coupled unknowns; the same pattern below, illustrated for four unknowns $u$, $v$, $w$ and $q$, extends directly to further variables:

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

where the diffusion coefficients ($D_{uu}$ etc.), the timescales ($t_u$ etc.) and the interaction/kinetic terms ($f$, $g$, $h$, $j$) can depend on the unknowns, space, and time. In matrix form, we can summarise this by saying we solve systems of the form

$$M \frac{du}{dt} = \nabla\cdot(D\nabla u) + f,$$

where

* $u$ is a vector of between one and eight unknowns,
* $M$ is a diagonal matrix with potentially some zeros on the diagonal; you might know this as a 'mass matrix',
* $D$ is a possibly non-constant matrix that may contain zeros; you might know this as a 'diffusion tensor',
* $f$ is a vector of components (one per unknown) that contains our interaction or kinetic terms.

VisualPDE allows you to easily change the [number of components](quick-start#equations-panel) and the [boundary conditions](quick-start#boundary-conditions). You can set initial conditions just by clicking the screen.

