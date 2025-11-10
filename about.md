---
layout: about
title: About
permalink: /about/
thumbnail: /assets/images/question-marks.webp
extract: What is VisualPDE, where did it come from and who is behind it?
---

<!-- ## The idea

Communicating mathematics can be challenging. This is especially true for [partial differential equations](https://en.wikipedia.org/wiki/Partial_differential_equation) (PDEs), which are a staple of undergraduate mathematics courses and almost ubiquitous in mathematical modelling of the real world.

Many of these equations exhibit intuitive behaviours, but it can be hard to see that just by looking at the symbols. We set out to create a tool for solving this problem, aiming to allow anyone to type in their PDE and instantly visualise and interact with solutions of these equations. Crucially, we wanted people to be able to do this without needing to take a course on numerical methods, or even one on PDEs.

Read more about VisualPDE and its context in our article in the [Bulletin of Mathematical Biology](https://doi.org/10.1007/s11538-023-01218-4). -->

<!-- ## Beginnings

Through a [Durham Centre for Academic Development](https://www.durham.ac.uk/departments/centres/academic-development/) collaborative innovation grant, Alex Chudasama (a final-year undergraduate at Durham University) designed an early version based on this [reaction–diffusion simulator](https://pmneila.github.io/jsexp/grayscott/).

From this proof-of-concept, development of what became VisualPDE took off and we released the first public version in April 2023. Since then, we've kept expanding VisualPDE and its applications, from education and research to knowledge exchange and public engagement.


## VisualPDE today

Today, VisualPDE is both a simulator and a collection of examples for exploring the world of PDEs. VisualPDE has been used around the world to teach, engage and interact with mathematics and science through tens of thousands of simulations.

Some external applications of VisualPDE include:

- An interactive logo for the [Society for Mathematical Biology](https://smb.org)

- Providing figures and supporting simulations for a rigorous [study of localised pattern formation in dryland vegetation](https://arxiv.org/abs/2309.02956)

- Numerical simulation of temporal and spatiotemporal oscillations in a [model of viral cancer therapy](https://doi.org/10.1101/2023.12.19.572433)

- A [paper](https://link.springer.com/article/10.1007/s11538-023-01250-4) demonstrating the insufficiency of linear stability theory in understanding Turing patterns

- Exploring the principles behind the design of simple but effective robotic filaments for microscale swimming in a [multidisciplinary paper](https://doi.org/10.48550/arXiv.2402.13844) -->


## Getting started

You can [explore the examples](/explore), [create simulations](/create) and share them with a URL, or even copy the code on [GitHub](https://github.com/Pecnut/visual-pde) to design your own version of VisualPDE. Check out our detailed [documentation](/user-guide) to dive under the hood.

If you use VisualPDE in your research, we'd be grateful if you could cite our article about the context, design, and applications of VisualPDE in the [Bulletin of Mathematical Biology](https://doi.org/10.1007/s11538-023-01218-4).

## Is it free?
Everyone is free to use VisualPDE. For specifics of industrial use, see our [licence](https://github.com/Pecnut/visual-pde/blob/main/LICENSE.md).

## VisualPDE in the wild

VisualPDE is used around the world to teach, engage and interact with mathematics and science. Here are some examples of VisualPDE in action:
- <span id="citing-articles">20+</span> citing articles on [Semantic Scholar](https://www.semanticscholar.org/paper/1e2228a2a63cb025c65bcba930f9118e4d26c081)
- An interactive logo for the [Society for Mathematical Biology](https://smb.org)
- A simulation-rich [blog post](https://blogs.comphy-lab.org/Blog/2025-visual-pdes) by Vatsal Sanjay summarising VisualPDE
- A *Plus* magazine [article](https://plus.maths.org/content/playing-visualpde) and [podcast](https://plusmathsorg.podbean.com/e/playing-with-visualpde/) on using VisualPDE to explore research in virus transmission
- A *Teaching and Learning Mathematics Online* [webinar](https://www.youtube.com/watch?v=tJ_LBR4OQXc) exploring VisualPDE

## The team

VisualPDE is a team effort, written and maintained by [Benjamin Walker](https://benjaminwalker.info/), [Adam Townsend](https://adamtownsend.com/) and [Andrew Krause](https://www.andrewkrause.org/).

<script type="text/javascript">
    async function fetchCitingArticlesCount() {
        const response = await fetch('https://api.semanticscholar.org/graph/v1/paper/10.1007/s11538-023-01218-4?fields=citationCount');
        const data = await response.json();
        if (!response.ok) {
            console.error('Error fetching citation count:', data);
            return 'N/A';
        }
        return data.citationCount;
    }
    
    fetchCitingArticlesCount().then(count => {
        if (count === 'N/A') return;
        document.getElementById('citing-articles').textContent = count;
    });
</script>