# Misc

## Simulator defaults

### Starting a new simulation

Starting a new simulation will start a Gray–Scott simulation with two variables, $u$ and $v$.

### Changing the default variable names

When changing <span class='click_sequence'>Equations ($f(x)$) → **Equations** → **Variables** → **Number**</span> to a higher number than the previously provided variable names cover, any additional variables will be named by default to `VARIABLE2`, `VARIABLE3`, ..., `VARIABLE8` (whichever position they fall in), regardless of how many variables there are in total.

You are advised to rename them to $v$, $w$, $q$ (for up to 4 variables) for simplicity, as other quantities are labelled according to these default names, e.g. $D_{VARIABLE2}$ corresponds to $D_v$ and so on. Variables beyond the fourth have no natural single-letter name; a common convention is `u5` through `u8`, though any valid name works.

### Default timestepping

By default, VisualPDE uses the forward Euler method with $\Delta t = 0.1$, which is likely to be too big for many problems. We recommend reducing the timestep and/or changing the timestepping scheme in this case.
