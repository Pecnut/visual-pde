---
layout: page
title: What can VisualPDE solve?
lesson_number: 30
thumbnail: /assets/images/squirrel-question.webp
extract: A brief intro to the systems we simulate
---

VisualPDE solves systems of PDEs that look like generalised reaction--diffusion equations. It can do this in 1D or 2D.

The simplest type of system is just a single PDE in a single unknown, $u$,

$$\pd{u}{t} = \vnabla \cdot (D_u \vnabla u) + f_u,$$

where $D_u$ and $f_u$ are functions of $u$, $t$, and space that you can choose. For example, if $f_u=0$ and $D_u$ is a constant, you have [the heat equation](/basic-pdes/heat-equation).

The most complicated type is a coupled system of PDEs in eight unknowns. As an illustration, for four unknowns, $u$, $v$, $w$ and $q$, the general system VisualPDE can solve is

$$\begin{aligned}
\tau_u\pd{u}{t} &= \vnabla \cdot(D_{uu}\vnabla u+D_{uv}\vnabla v+D_{uw}\vnabla w+D_{uq}\vnabla q) + f_u,\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_v\pd{v}{t} \\ v\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{vu}\vnabla u+D_{vv}\vnabla v+D_{vw}\vnabla w+D_{vq}\vnabla q) + f_v \vphantom{\displaystyle t_v\pd{v}{t}}, \\
    &= \vnabla \cdot(D_{vu}\vnabla u+D_{vw}\vnabla w+D_{vq}\vnabla q) + f_v,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_w\pd{w}{t} \\ w\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{wu}\vnabla u+D_{wv}\vnabla v+D_{ww}\vnabla w+D_{wq}\vnabla q) + f_w \vphantom{\displaystyle t_w\pd{w}{t}}, \\
    &= \vnabla \cdot(D_{wu}\vnabla u+D_{wv}\vnabla v+D_{wq}\vnabla q) + f_w,
\end{aligned}\\
\text{one of}\left\{\begin{matrix}\displaystyle \tau_q\pd{q}{t} \\ q\end{matrix}\right. &
\begin{aligned}
    &= \vnabla \cdot(D_{qu}\vnabla u+D_{qv}\vnabla v+D_{qw}\vnabla w+D_{qq}\vnabla q) + f_q \vphantom{\displaystyle t_q\pd{q}{t}}, \\
    &= \vnabla \cdot(D_{qu}\vnabla u+D_{qv}\vnabla v+D_{qw}\vnabla w) + f_q,
\end{aligned}
\end{aligned}$$

where the diffusion coefficients ($D_{uu}$ etc.), the timescales ($\tau_u$ etc.) and the forcing/interaction/kinetic terms ($f_u$ etc.) can depend on the unknowns, space, and time. 

A commonly used subset of these systems (in particular those without any algebraic equations) can be summarised succinctly in matrix form as

$$\m{M} \pd{\v{u}}{t} = \vnabla\cdot(\m{D}\vnabla\v{u}) + \v{f},$$

where

* $\v{u}$ is a vector of between one and eight unknowns,
* $\m{M}$ is an invertible, diagonal matrix,
* $\m{D}$ is a possibly non-constant matrix that may contain zeros; you might know this as a 'diffusion tensor',
* $\v{f}$ is a vector of between one and eight components that contains our interaction or kinetic terms.

VisualPDE allows you to easily change the [number of components](quick-start#equations-panel) and the [boundary conditions](quick-start#boundary-conditions). You can set initial conditions just by clicking the screen.

