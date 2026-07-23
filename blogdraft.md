---
layout: page
title: Draft Blog Post
lesson_number: 999
thumbnail: /assets/images/Turing-Morphogenesis.webp
extract: Exploring the chemical basis of morphogenesis
equation:
categories: [visual stories]
---

WORK IN PROGRESS! WILL BE UPDATED SOON.

##VisualPDE: Partial differential equations solved live in your browser

Partial differential equations (PDEs) form the basis for a huge array of topics in theoretical and applied science, from quantum mechanics to designing airplanes. PDEs describe heat transport, fluid dynamics, population invasion, and a huge number of other physical, biological, and even sociological processes. But solving these equations is hard. In most applications, they are solved computationally, which typically requires sophisticated programming and an understanding of numerical methods. This is a significant barrier to entry, meaning that the solutions of the PDE – the reason we wrote it down in the first place – can be hard to understand intuitively.
Recent advancements in browser technology and graphics hardware, however, have changed the landscape (and we’re not talking about AI).
We are excited to present to you VisualPDE, a browser-based instant solver and visualiser for a range of PDE systems you can input yourself, with as few barriers to entry as possible. Originally designed for teaching and knowledge exchange, it has evolved into a platform that supports rapid prototyping, interactive demos and research-level experimentation.
And we want you to try it!

[Here’s a simulation below of the famous Gray–Scott… blah blah]
 
What can you solve?
VisualPDE solves systems of up to four PDEs in 1D or 2D space, so long as you can pose it as extensions of the two-species reaction–diffusion system

By default the domain is your device screen (your computer, your phone, your TV…) but you can switch to other shapes by uploading a picture.
You can see 60 pre-made examples on our explore gallery; you’ll see  advection–diffusion equations, wave equations, nonlinear diffusion problems, even Navier–Stokes! But the real power is in you being able to enter the system you’re most interested in. Have a play and if you can’t figure it out, get in touch.
 
#PDEs on GPUs
The great advancement in scientific computing of recent years has been to give graphics cards more to do. VisualPDE takes advantage of this by treating device screens as the pixel grids they are, and then performing finite difference methods on them. This is done through Javascript, a WebGL library and a low-level shader language called GLSL so that you can type equations into the browser, have them interpreted instantly, and then have them solved directly on the device.
Contrast this to how we normally have to solve such problems: code up the domain in Python or Matlab, write the numerical integration and timestepping schemes, then write the code to make videos. Then run the code a number of times for all the parameters you want. VisualPDE dramatically reduces the barrier to entry to just start exploring.
There are some trade-offs in this approach: your web browser can ask for an update to the solution 60 times a second, and with timesteps so small we get away with explicit timestepping schemes. Numerical analysts may be suspicious that this compromises the accuracy of the solutions. We’re also (for now) constrained to single precision arithmetic. We don’t consider VisualPDE a replacement for learning about numerical schemes, but in practice it is surprisingly good. In fact, for play, exploration and communication, we think it’s terrific.
 
#Learning PDEs through play
The seed of VisualPDE came from teaching reaction–diffusion models to undergraduate students of mathematical biology. Very often we teach analytic methods – separation of variables, eigenfunctions – which our students become proficient at but without any real intuition. But our students are used to playing with functions and shapes from their pre-university education: tools like Desmos and Geogebra are great at seeing, for example, the consequence of a quadratic function losing real roots.
With VisualPDE, we’ve been able to let our students play with PDE models directly. They can change parameters and boundary conditions live and see that patterns emerge or die out: bifurcations are now conceptionally clearer. They can quickly scan a region of parameter space and see where interesting behaviour might lie. They can change domains completely and see that (maybe) Bessel functions aren’t so scary after all.
 
#Getting involved
VisualPDE is open source and you can find the backend on GitHub, but what we’d love for you to do is to create a simulation and embed it wherever you need to show off a PDE model live. This should be great for academics and industrial partners. Websites and Google Slides are great venues. If you don’t want the interactivity, you can easily export a video or a screenshot.
Start by picking from 60 models in our explore gallery, or watch a six-minute video to create your own from scratch.  The first time you use VisualPDE, there’s a little tour you can take which shows you where you can find the useful tools.
We’re really keen to hear from users, so let us know if you have any questions or have used VisualPDE in a nice way. We know that people like the tool, but we can only develop it in the way the community wants if we actually hear from the community.
