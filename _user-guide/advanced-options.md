---
layout: page
title: Complete documentation
lesson_number: 20
thumbnail: /assets/images/Brusselator.webp
extract: A glossary of all the features you can play with
---

Almost everything in VisualPDE is customisable. Here, we describe the basic functionality of every option that can be found in the menus of VisualPDE.

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

---

## Equations {{ layout.equations }} <a class="anchor" id='equations'>

VisualPDE is all about solving equations. In the Equations pane, you can view and define the problem that VisualPDE will solve for you in your browser, complete with initial and boundary conditions. More advanced settings, including variable renaming, can be found under [**Settings**](#settings).

### Edit <a class="anchor" id='edit'>

Customise all the terms in the PDEs that you would like to solve using natural syntax. See our discussion of [valid expressions](#writing-valid-expressions) for helpful examples that will guide you in posing your own PDE system. Typing in any of the fields will highlight the corresponding term in the typeset PDE above.

- #### Typeset

  Have VisualPDE typeset the specified equations, making use of all the defined diffusion coefficients, functions and parameters. Terms will not be substituted in if they are constants that are not 0 or 1. Toggle this off to see the format of the equations that VisualPDE can interpret.

- #### $D_u$, $D_v$, $D_w$, ...

  Set the diffusion coefficients of all the species in the simulation. When **Cross diffusion** is enabled, you can also set interaction terms, which are written $D_{uv}$ etc. These can be functions of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$) and any quantities defined in **Parameters**. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

  Advanced users seeking diagonal anisotropic diffusion tensors (i.e. distinct diffusion coefficients in the coordinate directions) can define two coefficients at once by separating definitions with a semicolon. For example, `1;2` sets diffusion coefficients of `1` and `2` in the $x$ and $y$ directions, respectively.

- #### $f_u$, $f_v$, $f_w$, ...

  Define the inhomogeneities in the equations. These can be functions of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$), and any quantities defined in **Parameters**. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

  Advanced users can also make careful use of `RAND`, a uniformly random value in $[0,1]$, and `RANDN`, a normally distributed random number with unit variance and zero mean. This converts the equations into [stochastic partial differential equations](https://en.wikipedia.org/wiki/Stochastic_partial_differential_equation), which should only be solved using the Forward Euler timestepping scheme. Both `RAND` and `RANDN` require manually dividing by `sqrt(dt)` in non-algebraic equations so that the scheme resembles the [Euler-Maruyama method](https://en.wikipedia.org/wiki/Euler–Maruyama_method). The solution under other timestepping schemes is undefined.

  For convenience, we define `WhiteNoise` to be a normally distributed random variable with unit variance and zero mean, scaled by $1/\sqrt{\dt\dx^N}$ where $N=1,2$ is the spatial dimension. This scales appropriately with timestep and spatial step and is suitable for direct use in PDEs, such as in our [stochastic example](/nonlinear-physics/stochastic-pdes). You can use up to 4 independent WhiteNoise terms using the syntax `WhiteNoise_1`, `WhiteNoise_2`, `WhiteNoise_3` and `WhiteNoise_4`.

### Parameters <a class="anchor" id='parameters'>

This menu contains a list of all the user-specified values that can be used throughout VisualPDE. New parameters can be defined using the empty input field at the bottom of the list of parameters. Parameters can depend on one another, but their definitions cannot be cyclic.

#### Basics

The basic syntax for defining a parameter is

```
name = value
```

which will make the quantity `name` available to the simulation. You can then freely change `value`, which will instantly propagate throughout VisualPDE. If you try to use a name that clashes with an internal variable (some of which are only found under the hood of VisualPDE), a warning will appear to inform you of this. Parameters can be removed by deleting the text that defines them. You can even choose a `name` that includes subscripts, such as `k_1u`. This will be interpreted as $k_{1u}$ automatically by VisualPDE.

#### Sliders

The more advanced syntax

```
name = value in [start,step,stop]
```

creates a slider for your variable, ranging between the `start` and `stop` values in increments of `step`. The `step` parameter can be omitted and VisualPDE will choose a step automatically. For example,

```
a = 0.5 in [0,1]
```

creates a slider that ranges between 0 and 1, with initial value 0.5 and an automatically determined step size. Parameters with sliders cannot be defined in terms of other parameters.

The configuration of a slider (value, start, step, stop) can be updated by modifying the relevant parts of the expression that defines it. Sliders can be removed by deleting `in ...` from the parameter definition, and will be removed automatically when the associated parameter is removed.

### Boundary conditions <a class="anchor" id='boundary-conditions'>

Boundary conditions can be specified for any species in the simulation. The following boundary conditions are available:

- Periodic
- [Dirichlet](https://en.wikipedia.org/wiki/Dirichlet_boundary_condition) (e.g. $u\onboundary = 0$)
- [Neumann](https://en.wikipedia.org/wiki/Neumann_boundary_condition) (e.g. $\pd{u}{n}\onboundary = 0$)
- [Robin](https://en.wikipedia.org/wiki/Robin_boundary_condition) (e.g. $(u + \pd{u}{n})\onboundary = 0$)

Boundary conditions that allow you to specify values can be functions of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$) and any quantities defined in **Parameters**. Robin boundary conditions are the only type supported that allow you to use an unknown in the specification of its own boundary condition. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

An additional option, **Mixed...**, is also available, which allows you to specify different types of boundary condition on the Left, Right, Top and Bottom sides of rectangular domains.

The easiest way to do this is using the graphical interface by clicking <span><i class="fa-solid fa-cube"></i></span> beside the boundary condition selector (unavailable during surface plots). Click the various boundaries to set the desired condition on each. These conditions can also be specified directly as a string, e.g.

```
Left: Dirichlet = 0; Right: Neumann = 1; Top: Robin = u; Bottom: Dirichlet = sin(x)
```

for the species $u$ would specify $u = 0$ on the left boundary, $\pd{u}{n} = 1$ on the right boundary, $\pd{u}{n} = u$ on the top boundary and $u = \sin(x)$ on the bottom boundary. Sides can be specified in any order and are case sensitive. Omitting any side will default to periodic boundary conditions (beware, this may have unexpected results if the matching side is not also periodic; using the graphical interface prevents this).

An additional type of condition, 'Ghost', can also be specified with Mixed boundary conditions. This advanced option pushes VisualPDE to its limits, overriding the value of the [ghost nodes](https://kyleniemeyer.github.io/ME373-book/content/bvps/finite-difference.html#using-central-differences-for-derivative-bcs) used in the spatial discretisation of the PDE, and should be used with caution. We make use of this option in our Visual Story on [virus transmission](/visual-stories/airborne-infections) to effectively double the size of the computational domain in one direction. This must be toggled on in <span class='click_sequence'>{{ layout.settings }} → **Misc.**</span>

### Initial conditions <a class="anchor" id='initial-conditions'>

Initial conditions can be specified for any species in the simulation. They can be functions of space ($x$, $y$), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$), the random quantity `RAND`, a uniformly random value in $[0,1]$, the random quantity `RANDN`, a normally-distributed random number with unit variance and zero mean, and any quantities defined in **Parameters**. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

### Advanced options <a class="anchor" id='equations_sub'>

Configure additional equation-related settings, including the number of species and the type of terms that will be included.

- #### Num. species

  Specify the number of unknowns (1, 2, 3, or 4) in the simulation.

- #### Num. algebraic

  Choose how many equations you want to be in algebraic form in systems with cross diffusion enabled. The equations will be put in algebraic form in reverse order, e.g. a 4-species system with 1 algebraic species will convert the final equation to be algebraic.

- #### Species names

  Specify custom names for the species in VisualPDE, which often default to $u$, $v$, $w$, $q$. Names can be multi-character and can include letters, numbers, and underscores, but must each be a single 'word'. For example, `T_01` is a valid name (rendered as $T_{01}$) whilst `T 01` is not. Space or commas can be used to separate names in the list. Certain names are reserved under the hood, such as `H` for the Heaviside function, but VisualPDE will warn you if you attempt to use a reserved name. VisualPDE will automatically substitute the names of old species everywhere in the simulation and interface.

- #### Cross diffusion

  Enable cross diffusion in systems with 2 or more species, enabling simulation of a wide range of systems in which a species can depend on the gradient of another.

- #### Scales

  Set per-equation timescales (multiplying any time derivatives) $\tau_u$, $\tau_v$, $\tau_w$, $\tau_q$ to enable simpler entry of some types of systems. For algebraic equations, these quantities are no longer timescales, but retain their notation and function as per-equation scale factors. They can be functions of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), their gradients ($u_x$, $u_y$, etc.), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$), and any quantities defined in **Parameters**. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

  Importantly, **timescales must be non-zero**. Setting timescales to zero will result in singularities and are equivalent to large diffusion coefficients, large timesteps, or fast kinetic terms.

---

## Views {{ layout.views }} <a class="anchor" id='views'>

There are often multiple ways to visualise a solution to a PDE. In the Views pane, you can select from and customise a range of example-specific display options, or create your own. Everything you customise will be saved in the current View. If you share your simulation via a link, your Views will be sent along too.

### New (+)

Create a new view with a placeholder name from the current view configuration.

### Rename

Edit the name of the current View, enclosing any mathematics in `$` tags. You can even use emoji.

### Delete

Delete the currently selected View. Only visible if there are at least two views.

### Expression

Choose the expression that you want to be used to colour the domain, which can be any function of the species solved for, as well as space, time, and user-defined parameters. Often, this is either $u$, $v$, $w$ or $q$. Explicitly, this can be a function of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$) and their gradients ($u_x$, $u_y$, etc.), the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$).

### Plot type

Choose from three types of plot: **line**, **plane** or **surface**. Any simulation can be viewed as any plot type.

Line plots are the default plot type for 1D domains. Cubic splines are used to interpolate between nodes of the computational domain for smooth plotting. This may lead to transient oscillations appearing near discontinuities in the solution.

Surface plots are constructed by using the chosen **Expression** as a height map, the limits of the colour axis and the **Height scale** parameter.

### Colour

Customise everything about the colours used to display the solution.

- #### Colour map

  Set the current colour map being used to convert **Expression** into a colour value. Use the dropdown to select from the available options. We have tried to cater for everyone in these options but, if you find that no colour map is available that allows you to easily distinguish between values, please let us know at [hello@visualpde.com](mailto:hello@visualpde.com) so that we can add a more appropriate map.

- #### Min/Max value

  Set the limits of the colour map that transforms **Expression** into colour. If viewing a surface plot, this also impacts the height of the surface. These can depend on any quantities defined in **Parameters**.

- #### Reverse

  Reverse the direction of the current colour map.

- #### Colour bar

  Toggle the display of the current colour bar and limits.

- #### Snap range

  Click to instantly snap **Min value** and **Max value** to the current minimum and maximum of **Expression** in the domain.

- #### Auto snap
  Toggle the automatic snapping of the colour map limits. This can be very useful if you don't know the range in which **Expression** will fall, especially if it is changing frequently.

### Contours

Toggle the rendering of contours on top of the simulation display. The number, colour, and sensitivity of these (equally spaced) contours can be configured in the **Contours** menu that appears when contours are enabled.

- ##### Colour

  Specify the colour in which contours will be rendered.

- ##### Number

  Specify the number of contour lines to plot. These are drawn at equally spaced intervals between the minimum and maximum of the current colourmap e.g. specifying one contour will draw a line at the midpoint of the colourmap.

- ##### Threshold
  Set the relative numerical threshold, between 0 and 1, within which a contour will be detected. Smaller values result in more precise, thinner contours. Larger values may be needed to detect contours in solutions that vary rapidly in space. Under the hood, VisualPDE checks if a given output pixel is within this threshold of a given contour value, with all values normalised by the range of the colourbar. If the range of the colourbar is 0, the behaviour of contours is undefined.

### Lighting

Toggle lighting effects, which adds reflections and shadows to the solution. This often adds a fluid-like character to a simulation, as can be seen in the [Visual Story on water waves](/visual-stories/ripples). We make use of the [Phong reflection model](https://en.wikipedia.org/wiki/Phong_reflection_model). Details of the filter, including its strength and the orientation of the simulated light, can be specified in the **Lighting** menu that appears when lighting is enabled. Some lighting effects may appear slightly pixellated on some devices (typically Android tablets and iPadOS devices), though increasing the grid refinement will mitigate this.

- #### Smoothness

  Configure the simulated smoothness of the surface. Low values will result in sharp shadows and reflections, whilst larger values will produce an apparently smoother surface.

- #### Ambient

  Set the level of background light, which does not contribute to reflections or shadows.

- #### Diffuse

  Set how much the light source impacts on the brightness of the surface.

- #### Specular

  Specify the intensity of specular (shiny) reflections.

- #### Precision

  Set the precision (also known as the specular exponent) of the specular reflections. Low values widely scatter light, whilst large values result in precise highlights.

- #### Inclination

  Set the angle of inclination of the light source. Setting this to 0 places the light source directly overhead.

- #### Direction
  Specify the in-plane direction of the light source, rotating any shadows and highlights.

### Overlay

Toggle the display of an overlay. The expression, colour, and threshold used in displaying the overlay can be specified in the **Overlay** menu that appears when the overlay is enabled.

- #### Colour

  Specify the colour in which overlays will be rendered.

- #### Expression

  Set an expression whose zero set defines a curve to be displayed in the domain. This can be a function of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), their gradients ($u_x$, $u_y$, etc.), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$), and any quantities defined in **Parameters**. See our discussion of [valid expressions](#writing-valid-expressions) for valid syntax and a list of available in-built functions.

- #### Threshold
  Set the relative numerical threshold, between 0 and 1, within which the zero set will be detected. Smaller values result in more precise, thinner curves. Larger values may be needed to detect curves in large spatial domains or for expressions that vary rapidly in space. Under the hood, VisualPDE checks if a given pixel is in the zero set to within this threshold.

### 3D options

When viewing surface plots, this menu will appear to allow you to customise aspects of the display.

- #### Custom surface

  Toggle the rendering of the solution on a custom, user-defined surface. The surface $z(x,y)$ is specified in **Surface $z$**, which appears when a custom surface is enabled. This definition can be a function of space ($x$, $y$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$) and their first derivatives, the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$).

- #### Height scale

  The scale factor used when plotting surfaces or lines. Changing this parameter effectively makes the vertical variation appear more/less prominent, though it does not alter the plotted colours. Must be a numerical value.

- #### View $\theta$/$\phi$

  [Euler angles](https://en.wikipedia.org/wiki/Euler_angles) specifying the current 3D viewpoint, with $\theta\in[0,\pi]$ and $\phi\in[0,2\pi]$. You can manipulate these values either by inputting new values, or see them update as you rotate the viewpoint with your pointer (click and drag). As Euler angles [don't do a perfect job](https://en.wikipedia.org/wiki/Gimbal_lock) of describing orientations, you may (rarely) find that a viewpoint loaded in from a URL isn't quite what you expected.

- #### Zoom
  The current zoom level of the 3D view. You can manipulate the value directly or, on touch devices, by 'pinching to zoom'.

### Line options

When viewing line plots, this menu will appear to allow you to customise aspects of the display.

- #### Max height

  The maximum height of the plotted line, measured in units of $L$. Changing this parameter effectively makes the vertical variation appear more/less prominent. Must be a numerical value.

- #### Thickness
  The thickness of the plotted line relative to the default. Must be a numerical value.

### Vector field

Toggle the rendering of a vector field on top of the simulation. The definition, colour, density, and size of the vectors can be fully customised. This option is often used to visualise flows or fluxes.

- #### Colour

  Specify the colour in which arrows will be rendered.

- #### $x$, $y$ component

  Specify the $x$ and $y$ components of the vector field. These components can be functions of space ($x$, $y$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$) and their first derivatives, the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$).

- #### Density

  Specify the density of the rendered arrows, normalised between 0 and 1.

- #### Scaling

  Configure how the rendered arrows will be scaled. **_Relative_** normalises arrows relative to a maximum length that you can specify. **_Auto_** normalises arrows relative to the largest computed arrow at the current instant. **_None_** renders all arrows at the same scale.

- #### Max length
  Specify the constant length by which all arrows will be normalised. Must be a mathematical expression that is not written in terms of any parameters or user-defined quantities.

### Time series<a class="anchor" id='timeseries'>

Toggle the display of a live time series graph of the simulation. This can show either the value of the **Expression** at a single (configurable) position, or the integral of the expression over the domain.

- #### Type

  Choose whether to plot a single-point sample or an integral of the configured **Expression**.

- #### Expression

  Specify the expression to be sampled or integrated. This can be a function of space ($x$, $y$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$) and their first derivatives, the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$). Boundary conditions may not be accurately reflected in computed values.

- #### $x$, $y$

  Specify the position at which to sample the **Expression**. This can be a function of time ($t$), any user-defined parameters, and the size of the domain ($L$, $L_x$, $L_y$). This can be automatically filled in using the <span><i class="fa-solid fa-crosshairs"></i></span> button.

- #### Duration

  Specify the length of the time series (in units of time). The series will be updated at regular intervals. For the best experience, this should be around 10-400 times the timestep times the number of timesteps per frame.

---

## Settings {{ layout.settings }} <a class="anchor" id='settings'>

Here you can edit a wide range of settings, from the size of the brush to the timestep of the simulation.

### Brush <a class="anchor" id='brush'>

VisualPDE allows you to interact directly with simulations via a brush by simply clicking/pressing on the domain. The brush paints values onto the discrete representation of the domain, which act like initial conditions for the rest of the simulation. Using the alternate mouse button (often the right mouse button) will negate the value of the brush. The brush can be used to create complex initial conditions, perturbations, or even to (crudely) simulate the effect of a moving boundary.

- #### Enable brush

  Enable or disable the brush. Most simulations will have the brush enabled by default.

- #### Type

  Change the shape of the brush, choosing between **Disk**, **Square**, **Horizontal line** and **Vertical line**. An additional option, **Custom**, allows you to define a custom shape in the **_Indicator_** field by typing in an expression. The brush will draw wherever the expression is positive. Expressions can be a function of space ($x$, $y$), the brush coordinates ($xB$, $yB$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$), and the images ($I_S$, $I_T$).

- #### Value

  Change the **value** that you are painting. This can be a function of space ($x$, $y$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$), the images ($I_S$, $I_T$), `RAND`, a uniformly random value in $[0,1]$, and `RANDN`, a normally-distributed random number with unit variance and zero mean. Using the alternate mouse button (often the right mouse button) will negate the value of the brush (unavailable on touch devices).

- #### Radius

  Change the brush size, measured on the same scale as the domain size. This can even be a function of space ($x$, $y$), time ($t$), any user-defined parameters, any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$).

- #### Species
  Set the **species** ($u$, $v$, $w$, $q$) you are painting.

### Domain <a class="anchor" id='domain'>

- #### Dimension

  Choose between a 1D or a 2D computational domain. Switching to 1D effectively removes the $y$ dimension from the simulation. Make sure that any expressions you've defined don't contain a $y$ after moving to 1D.

- #### Largest side

  Change the largest side $L$ of the domain. Must be a mathematical expression that is not written in terms of any other parameters or user-defined quantities. If this is not an integer multiple of the space step $\dx=\dy$, the domain will extend to $\floor{L / \dx}\dx$ in practice. This guarantees the use of a precise space step.

- #### Space step

  Set the space step $\dx=\dy$ used in discretising the domain. You may have to decrease the timestep $\dt$ in order to maintain numerical stability if you decrease the space step (as discussed in the [timestepping guide](/user-guide/solver#timestepping)). Must be a mathematical expression that is not written in terms of any other parameters or user-defined quantities.

- #### Min. $x$, $y$

  Set the minimum values of $x$ and $y$ in the simulation. This amounts to translating the simulation domain by $(x_{min}, y_{min})$. A common use of this is to centre the simulation domain at $(0,0)$ rather than $(L_x/2, L_y/2)$. Can be a function of $L_x$, $L_y$ and any of the user-defined parameters.

- #### Fill screen

  Choose between the domain filling the display (often recommended) or being forced to be square (vital for guaranteeing the shape of the domain). When selected, the largest edge of the display will correspond to the length set in **Largest side**, so that full-screen simulations can be thought of as cropped, zoomed counterparts to square simulations.

- #### Custom

  Toggle the use of a custom domain $\domain$ that is determined implicitly from a user-set expression.

- #### Ind. fun (indicator function)
  Define the domain implicitly by setting a boolean (e.g. $x<0.5$) or a simple expression (e.g. $x-0.5$), where (strict) positivity identifies the interior of the domain. This can be a function of space ($x$, $y$), time ($t$), any of the unknowns ($u$, $v$, $w$, $q$), the size of the domain ($L$, $L_x$, $L_y$) and the images ($I_S$, $I_T$). In order to allow VisualPDE to correctly apply boundary conditions, the edge of the computational domain is always counted as being outside of the custom domain.

### Timestepping <a class="anchor" id='timestepping'>

- #### Steps/frame

  Set how many timesteps will be performed every time your browser requests a frame from VisualPDE. This setting effectively allows you to speed up/slow down the simulation without altering the timestep, though large values may cause some stuttering on some devices. Must be a numerical value.

- #### Timestep

  Set the timestep $\dt$ used in the solver. You may have to increase the spatial step $\dx$ in order to maintain numerical stability if you increase the timestep (as discussed in the [solver guide](/user-guide/solver)). Must be a numerical value.

- #### Scheme

  Select one of various timestepping schemes. [Forward Euler](https://en.wikipedia.org/wiki/Euler_method) is the fastest but least accurate; the [Midpoint Method](https://en.wikipedia.org/wiki/Midpoint_method) and [Runge-Kutta 4](https://en.wikipedia.org/wiki/Runge–Kutta_methods) improve upon the accuracy and stability of Forward Euler, though are associated with increased computational cost. [Adams-Bashforth 2](https://en.wikipedia.org/wiki/Linear_multistep_method#Two-step_Adams–Bashforth) is more accurate but less stable than Forward Euler. Use of higher accuracy schemes may require a reduction of Steps/frame to reduce stuttering due to increased computational load. When solving stochastic partial differential equations, only Forward Euler is supported.

- #### Elapsed time

  Show/hide the elapsed time since the simulation was loaded/reset.

- #### Auto pause

  Set the simulation to be automatically paused when the time ($t$) passes a custom threshold (which can depend on user-defined parameters), which can be configured when this option is enabled. You can resume an auto-paused simulation by pressing {{ layout.play }}

- #### Performance mode
  Reduces the quality of the display in order to boost simulation performance. Different simulations and devices will benefit differently from this setting. On average, we see an increase of around 6fps on a Mac Mini M1 on the 'BenchmarkingFast' preset in 4K resolution.

### Images <a class="anchor" id='images'>

- #### $I_S$, $I_T$
  Define the scalar fields $I_S$ and $I_T$, which are derived from images that you can upload by clicking on the current image. Via the symbols `I_S` and `I_T` throughout VisualPDE, you can access the average RGB value of each image at each point in space, effectively treating them as greyscale. Advanced users can access the individual RGBA channels via `I_SR`, `I_SG`, etc. VisualPDE will stretch images so that they cover the domain edge-to-edge. Note that this does not respect **Implicit**. The defaults draw from images of [Sofya Kovalevskaya](https://en.wikipedia.org/wiki/Sofya_Kovalevskaya) and [Alan Turing](https://en.wikipedia.org/wiki/Alan_Turing).

### Checkpoints <a class="anchor" id='checkpoints'>

VisualPDE supports checkpoints, which allow you to save the state of a simulation at the touch of a button. This allows you to instantly return to a previous solution state - very handy if you've crafted the perfect initial condition by painting with the brush. Revert to a checkpoint by pressing {{ layout.restart }}

- #### Enable checkpoints

  Toggle the use of checkpoints. When enabled, resetting the simulation will revert to a saved checkpoint (if one exists) instead of using any initial conditions defined alongside the equations.

- #### Set

  Save the current simulation as a checkpoint.

- #### Export

  Click to export the last checkpoint as a file to your device, which can be shared and uploaded to the site and used as a checkpoint. If no checkpoint exists, one will be created. By default, the file will be called `VisualPDEState`.

- #### Import

  Import a checkpoint from a VisualPDE file. By default, these are called `VisualPDEState`.

- #### Resize
  Specify how a checkpoint should be resized to fit the current simulation domain. 'Stretch' will stretch the checkpoint so that it fills the current domain, but will not preserve the aspect ratio in general. "Crop" will crop the checkpoint whilst preserving the aspect ratio, but may result in some information not being used.

### Misc <a class="anchor" id='misc'>

- #### Background

  Set the background colour of the simulation window, which you will see often when using **Surface Plot** or **Implicit**. In implicit domains, the exterior of the domain adopts this colour.

- #### Integrate

  Display the integral of **Expression** over the domain. This integral is coarsely approximated by a simple Riemann sum, with accuracy improving with mesh refinement. This can be used to track the numerical evolution of quantities that should be conserved in a system.

- #### Interpolate

  Use this option to force the use of manual, unoptimised filtering in place of device-default interpolation of displayed colours. This toggle is not available on devices that do not support interpolation by default; in this case, manual interpolation is always enabled.

- #### Set seed

  Set the seed of the (pseudo)random number generator used to assign values to `RAND` and `RANDN` in all free-text fields in the VisualPDE interface. Note that `RAND` and `RANDN` always vary in space. A specific random seed in the form of a numerical value can be configured (default 0).

- #### Clean slate

  Load into a blank simulation, discarding everything. Useful for creating new simulations.

- #### Ghost BCs

  Toggle the availability of `ghost' boundary conditions in the GUI.

- #### Run on load

  Toggle whether or not the simulation will be running when loaded.

- #### Blend image

  Toggle whether or not an image will be blended over the simulation.

- #### Blend amount

  The degree to which the blend image should be blended into the simulation view. 0 corresponds to no blending.

- #### Dev

  Tools intended for the development and benchmarking of VisualPDE.

    ***Copy code*** will copy a verbose description of your simulation in JSON form, which is especially useful if you're extending VisualPDE with your own examples. It will base the example on the selected 'parent' preset, which can be useful if you're making multiple slightly different versions of a simulation.

    ***Copy debug*** will copy a selection of configuration information to your clipboard (handy when reporting bugs).

    ***Show stats*** will toggle the display of performance statistics in the lower left corner of the display. We use this to benchmark performance impacts of new features and optimisations.

    ***Antialias*** will toggle the use of antialiasing when displaying the simulation. Antialiasing in VisualPDE smooths out the jagged edges of displayed vector fields, though always causes a slight device-dependent performance loss. This is off by default for mobile devices, but can be overridden. Toggle requires a page reload.

    ***Mixed strings*** will toggle the visibility of verbose strings associated with mixed boundary conditions. These are off by default, but can be useful for advanced cases such as simultaneously imposing Dirichlet and Neumann conditions.

    ***Long url*** will copy a long URL that is guaranteed to not be minified.

    ***Camera*** will enable the user's camera and replace $I_S$ with the live video stream.

    ***Cam delay*** sets the delay (in milliseconds) between frames grabbed from the user's camera.

---

## Writing valid expressions <a class="anchor" id='writing-valid-expressions'>

### Standard syntax

VisualPDE aims to support standard mathematical syntax for addition `+`, subtraction `-`, multiplication `*`, and division `/`, along with the caret notation `^` for exponentiation. Parentheses `()` are also supported for bracketing terms together, and must be used when calling any special functions.

In general, whitespace around binary operators will be ignored, so that `2 * 2` is valid syntax for multiplication, for example. Quantities with subscripts, such as $L_x$ and $L_y$, are written with an underscore, e.g. `L_x` and `L_y`. Boolean expressions (e.g. `x < 0`) can be used as indicator functions by surrounding them with the function `ind` (e.g. `ind(x < 0)`).

Examples of valid syntax include

```
sin(x) * cos(3*y)
exp( -(x-L_x)^2 / 10)
1 + (x^2 + x + 1) / (y^2 + 2*y + 1)
sin(cosh(tan(2*x+1)))
```

### Advanced syntax

Some terms in VisualPDE have additional functionality when written with special syntax.

#### Images

By default, images are accessed using `I_T` and `I_S`, with individual channels available by appending R,G,B or A. When a channel is specified, you can access images using coordinates using the syntax `I_TR(x,y)`. Examples include

```
I_TR(2*x, y)
I_SB(x-t, y-t)
I_TG(x, y + sin(u))
```

#### First derivatives

First derivatives in space, accessed with `u_x`, `u_y`, ..., are computed using a central finite difference discretisation by default. By appending `f` or `b` to the subscript, such as `u_xf`, you can tell VisualPDE to use a forward or a backward difference, respectively. Forward differences sample the solution at increased $x$ (or $y$), whilst backward differences sample at decreased $x$ (or $y$). These specialised schemes can be used in [upwind schemes](https://en.wikipedia.org/wiki/Upwind_scheme) and often reduce numerical artefacts, but at the expense of typically larger numerical error.

Forward and backward differences can also be computed with second-order numerical schemes by appending `2` to the subscript, though in general this will only respect Periodic boundary conditions in the direction of the derivative. This syntax can only be used in the **Edit** section of **Equations**.

### Special functions

Throughout VisualPDE, you can make use of the special functions `sin`, `cos`, `tan`, `exp`, `log`, `sqrt`, `sinh`, `cosh`, `tanh` and `H`, where the latter is a [Heaviside function](https://en.wikipedia.org/wiki/Heaviside_step_function) smoothed over the interval $[-1,1]$ (see the [GLSL reference](https://registry.khronos.org/OpenGL-Refpages/gl4/html/smoothstep.xhtml) for details). All function arguments should be surrounded by parentheses, e.g. `sin(x)`. You can also use `min` and `max` as functions with two arguments, which return the minimum or maximum of their arguments, e.g. `min(u,1)` returns the minimum of $u$ and 1. If you wish to raise the output of a function to a power, you must enclose the function in parentheses, e.g. write `(cos(x))^2`, not `cos(x)^2`. You can also use `mod(a,b)` to compute the remainder of $a$ upon division by $b$ (see the [GLSL reference](https://registry.khronos.org/OpenGL-Refpages/gl4/html/mod.xhtml) for details).

A [bump function](https://en.m.wikipedia.org/wiki/Bump_function) with compact support can be used via the syntax `Bump(X, Y, radius)` (or `Bump(X, radius)` in 1D, with `Y` implicitly set to `L_y/2`), which localises a bump of unit maximum of the given radius at the point $(X, Y)$.

A [bivariate Gaussian function](https://en.wikipedia.org/wiki/Multivariate_normal_distribution) can be used with similar syntax to the bump function: `Gauss(X, Y, s)` is a correctly normalised Gaussian function centred at $(X,Y)$ with standard deviation `s`. The extended syntax `Gauss(X, Y, s_x, s_y)` produces a potentially asymmetric Gaussian with standard deviations `s_x` and `s_y` in the $x$ and $y$ directions, with zero correlation. Correlation can be specified via `Gauss(X, Y, s_x, s_y, r)`, where `r` is the correlation between the two directions.

### Non-local evaluation

Sometimes, you might want direct access to the values of a species at points other than `(x,y)`, such as if you wanted to implement a higher order derivative or a lattice dynamical system. You can access a species (e.g. `u`) at an arbitrary position via the syntax `u[x,y]`, where `x` and `y` can be any valid expression that points to somewhere in the domain. For instance, writing `u[x+dx,y+dy] - u[x-dx,y-dy]` will lookup nearby values of `u`, offset by the step sizes `dx` and `dy`.

The behaviour of non-local evaluations using these expressions is undefined at boundaries (so that Neumann boundary conditions may not behave as expected, for instance), unless periodic boundary conditions are used.