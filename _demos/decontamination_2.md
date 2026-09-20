---
layout: demo_custom
lesson_number: 80
title: Chemical decontamination - how much
thumbnail: /assets/images/Decontamination.webp
---

<!-- Simulation -->
<iframe id="simD" class="sim" style="width:30%" src="/sim/?preset=DecontaminationDirichlet&story&lite&no_ui&noop&colourbar=true" frameborder="0" loading="lazy"></iframe>
<iframe id="simE" class="sim" style="width:30%" src="/sim/?preset=DecontaminationDirichlet&story&lite&no_ui&noop&view=&colourbar=true" frameborder="0" loading="lazy"></iframe>

<!-- Sliders -->
<div style="display:flex;flex-direction:column;row-gap:10dvh;">
<a class="site-title" rel="author" href="{{ "/demos" | relative_url }}">
        <img
            class="light-mode-img"
            src="/assets/images/logo-light.webp"
            alt="Heart-shaped logo"
        /><img
            class="dark-mode-img"
            src="/assets/images/logo-dark.webp"
            alt="Heart-shaped logo"
        />VisualPDE</a>
<div>
    <h1>Cleaning up chemical spills</h1>
    <h3>Adjust the slider to change the amount of<br> cleanser being added to the top</h3>
    <p><vpde-reset iframe="simD simE"></vpde-reset></p>
</div>
<p style="text-align:center;margin-bottom:0;"><vpde-slider
    iframe="simD simE"
    name="BC"
    label="Cleanser"
    label-position="above"
    min="0"
    max="5"
    value="5"
    step="0.1"
    min-label="None"
    max-label="Max"
></vpde-slider></p>
</div>
