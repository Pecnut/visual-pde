---
layout: page
title: Water quality v2
lesson_number: 110
thumbnail: /assets/images/bacteriaInFlow.webp
extract: Transport along rivers
equation:
---

<script src="/sim/scripts/charts.umd.min.js"></script>
<script src="/assets/js/vpde-charts.js"></script>

<style>
.active {
    background-color: #4CAF50;
    color: white;
}
button {
    background-color: #e7e7e7;
    color: black;
    border: none;
    border-radius: 5px;
    padding: 10px 24px;
    cursor: pointer;
}
</style>

Adjust the slider to control how much investment is made in water treatment upstream. Higher investment reduces the concentration of bacteria entering the river, improving water quality downstream. Lower investment leads to higher bacteria levels, which could pose risks to bathers' health.

<p style="text-align:center;margin-bottom:0;"><vpde-slider
    iframe="simA"
    name="c0"
    label="Investment in treatment"
    label-position="above"
    min="0"
    max="0.8"
    value="0.4"
    step="0.01"
    min-label="Low"
    max-label="High"
></vpde-slider></p>
<iframe class="sim" id="simA" src="/sim/?preset=bacteriaInAReach2DIllustrated&story&reset_only&colourbar=true" frameborder="0" loading="lazy" style="aspect-ratio:1.5/1"></iframe>

<div style="text-align:center">
<vpde-select
      iframe="simA"
      display-names="Summer; Winter"
      parameters="k=0.006; k=0.001"
></vpde-select>
</div>
Adjust the season via the dropdown menu above. In summer, longer days and sunnier conditions lead to faster bacterial decay rates, improving water quality downstream. In winter, lower temperatures slow decay, resulting in higher bacteria levels overall.

<div style="text-align:center;margin:20px 0;">
<button onclick="customHandler.call(this)" style="padding:10px 20px; font-size:16px;">
    Storm surge
</button>
</div>

<!-- A hidden select element for triggering storm surge -->
<vpde-select
      id="stormSurgeSelect"
      iframe="simA"
      style="display:none;"
      display-names="Normal; Storm"
      parameters="u=1, c1=0; u=1.2, c1=1"
></vpde-select>

<script>
let storm = false;
function customHandler() {
    storm = !storm;
    this.classList.toggle('active', storm);
    const iframe = document.getElementById('simA');
    // Post a message to the iframe to trigger the storm surge event by changing a parameter.
    const select = document.getElementById('stormSurgeSelect').select;
    if (storm) {
        // Activate storm surge
        select.selectedIndex = 1;
    } else {
        // Deactivate storm surge
        select.selectedIndex = 0;
    }
    // Trigger the change event
    const event = new Event('change');
    select.dispatchEvent(event);
}
</script>

Toggle the "Storm surge" button above to simulate continuous heavy rainfall. This increases the flow rate in the river, flushing bacteria downstream more quickly. The higher flow can temporarily improve water quality at certain points, but may also spread contamination further downstream. Importantly, very heavy rains can overwhelm storm overflow tanks, leading to untreated discharges into the river.
