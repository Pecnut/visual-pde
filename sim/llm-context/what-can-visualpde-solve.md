# What can VisualPDE solve?

VisualPDE solves systems of PDEs that look like generalised reaction--diffusion equations. It can do this in 1D or 2D.

The simplest type of system is just a single PDE in a single unknown, $u$,

$$\frac{\partial u}{\partial t} = \nabla \cdot (D_u \nabla u) + f_u,$$

where $D_u$ and $f_u$ are functions of $u$, $t$, and space that you can choose. For example, if $f_u=0$ and $D_u$ is a constant, you have [the heat equation](/basic-pdes/heat-equation).

The most complicated type is a coupled system of PDEs in eight unknowns. As an illustration, for four unknowns, $u$, $v$, $w$ and $q$, the general system VisualPDE can solve is

$$\begin{aligned}
\tau_u\frac{\partial u}{\partial t} &= \nabla \cdot(D_{uu}\nabla u+D_{uv}\nabla v+D_{uw}\nabla w+D_{uq}\nabla q) + f_u,\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_v\frac{\partial v}{\partial t} \\ v\end{matrix}\right. &
\begin{aligned}
    &= \nabla \cdot(D_{vu}\nabla u+D_{vv}\nabla v+D_{vw}\nabla w+D_{vq}\nabla q) + f_v \vphantom{\displaystyle t_v\frac{\partial v}{\partial t}}, \\
    &= \nabla \cdot(D_{vu}\nabla u+D_{vw}\nabla w+D_{vq}\nabla q) + f_v,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_w\frac{\partial w}{\partial t} \\ w\end{matrix}\right. &
\begin{aligned}
    &= \nabla \cdot(D_{wu}\nabla u+D_{wv}\nabla v+D_{ww}\nabla w+D_{wq}\nabla q) + f_w \vphantom{\displaystyle t_w\frac{\partial w}{\partial t}}, \\
    &= \nabla \cdot(D_{wu}\nabla u+D_{wv}\nabla v+D_{wq}\nabla q) + f_w,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_q\frac{\partial q}{\partial t} \\ q\end{matrix}\right. &
\begin{aligned}
    &= \nabla \cdot(D_{qu}\nabla u+D_{qv}\nabla v+D_{qw}\nabla w+D_{qq}\nabla q) + f_q \vphantom{\displaystyle t_q\frac{\partial q}{\partial t}}, \\
    &= \nabla \cdot(D_{qu}\nabla u+D_{qv}\nabla v+D_{qw}\nabla w) + f_q,
\end{aligned}
\end{aligned}$$

where the diffusion coefficients ($D_{uu}$ etc.), the timescales ($\tau_u$ etc.) and the forcing/interaction/kinetic terms ($f_u$ etc.) can depend on the unknowns, space, and time.

A commonly used subset of these systems (in particular those without any algebraic equations) can be summarised succinctly in matrix form as

$$\mathbf{M} \frac{\partial \mathbf{u}}{\partial t} = \nabla\cdot(\mathbf{D}\nabla\mathbf{u}) + \mathbf{f},$$

where

* $\mathbf{u}$ is a vector of between one and eight unknowns,
* $\mathbf{M}$ is an invertible, diagonal matrix,
* $\mathbf{D}$ is a possibly non-constant matrix that may contain zeros; you might know this as a 'diffusion tensor',
* $\mathbf{f}$ is a vector of between one and eight components that contains our interaction or kinetic terms.

VisualPDE allows you to easily change the [number of components](quick-start#equations-panel) and the [boundary conditions](quick-start#boundary-conditions). You can set initial conditions just by clicking the screen.
