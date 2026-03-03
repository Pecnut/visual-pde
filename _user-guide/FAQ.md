---
layout: page
title: FAQs
lesson_number: 15
thumbnail: /assets/images/question-marks.webp
extract: Unsure about something? Help is at hand
---

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
      autocorrect="off"
      spellcheck="false"
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

## Sharing and citing <a class="anchor" id='sharing'>

### How do I cite VisualPDE in my article?
The VisualPDE paper is out! You can find it [online](https://doi.org/10.1007/s11538-023-01218-4) for free and cite it as 

Walker, B.J., Townsend, A.K., Chudasama, A.K. et al. VisualPDE: Rapid interactive simulations of partial differential equations. Bulletin of Mathematical Biology 85, 113 (2023).

### Am I allowed to make and share content using VisualPDE.com?
Yes! We would love to see you making and sharing content using VisualPDE. We ask that any content you create somehow points back to [VisualPDE.com](https://visualpde.com) – a great way to do this is to share a link directly to your simulation! Feel free to use VisualPDE in articles, images, videos, scientific works, social media posts, etc.

### I want to share my cool simulation – how do I do this? <a class="anchor" id="linkSharing">
VisualPDE is designed for sharing. Whether you've fallen in love with one of our examples or you've crafted your own using the VisualPDE interface, you can share the current simulation using a link. Simply open the share sheet by clicking {{ layout.share }} and click 'Copy link' to put a URL on your clipboard that you can share anywhere by pasting! It's that easy!

These links used to be quite long, but now we try to give you a shortened link that works a bit like [tinyURL.com](https://tinyurl.com/app). If you see the 'mini' tag appear next to 'Copy link', you're going to get one of our mini links! Perfect for sharing!

### How do I take a pretty screenshot or video without all the user interface showing up?
Screenshots and videos are simple in VisualPDE. Simply open the share sheet by clicking {{ layout.share }} and click 'Save image' to download a screenshot to your device, or 'Record clip' to begin a recording that will download to your device when done (we recommend Chrome or Firefox for this). Recordings can be up to 60s long and will stop before then if you pause the simulation or click {{ layout.stop_recording }}

### How do I make my videos compatible with social media and messaging apps?<a class="anchor" id='videoHelp'>
Different services accept different types of video, so compatibility is hard. Even worse, different browsers can only create certain types of video, so universal video compatibility is essentially impossible for us at VisualPDE. Fortunately, there are simple ways to convert video so that it is compatible with your favourite services.

If you want a quick solution, <a href="https://ffmpeg-online.vercel.app/?inputOptions=-i&output=VisualPDERecording.mp4&outputOptions=" target="_blank">ffmpeg-online</a> will do this for you. Just drag and drop your video, ignore the rest of the boxes and hit the run button to generate a compatible video file. Even better: your video never leaves your device.

If you prefer a command line solution, then [``ffmpeg``](https://www.ffmpeg.org) is once again your friend. If you have ``ffmpeg`` installed, running ``ffmpeg -i FILENAME output.mp4`` will almost certainly save a compatible copy of your video (``FILENAME``) as ``output.mp4``. Don't just take our word for it - try it out!

### Can I embed VisualPDE in my own site?
Yes you can! Clicking {{ layout.share }} and then 'Embed' will put an [iframe](https://developer.mozilla.org/en-US/docs/Web/HTML/Element/iframe) element on your clipboard that points to the current simulation. You can specify the complexity of the user interface that you want to be visible, selecting from the full experience, the minimal interface used in our [Visual Stories](/visual-stories), or no user interface at all. If you do this, we'd love to hear from you at [hello@visualpde.com](mailto:hello@visualpde.com) so we can check out your site and your simulation!

In principle, you can have as many embedded simulations on your site as you want. In practice, having lots of simulations running at once might cause stuttering on some devices. You can mitigate this by pausing simulations (VisualPDE consumes very few resources when paused) or by only showing a limited number of simulations onscreen at any one time (simulations that are out of view are automatically paused by your browser). You can also make your simulations less computationally demanding by reducing the number of timesteps per frame or the domain size.

---

## Errors <a class="anchor" id='errors'>
Sometimes, mistakes happen. If something has gone wrong, VisualPDE will try its best to describe the error in a helpful way via a pop-up. We try to display a helpful error message to help you identify the problem. More cryptic messages are listed below.

### Undeclared identifier <a class="anchor" id='undeclared'>
```
Unknown symbol: 'k'
```

Here, the quantity 'k' has been used somewhere in one of the many free-text inputs in VisualPDE, but it hasn't been defined. The most common cause of this is using a parameter in the **Definitions** tab without defining it in the **Parameters** tab. Check your definitions and parameters to resolve this. Be careful to define parameters as constant numbers or in terms of other parameters – dependence on space, time, or species is not (yet) supported!

### Cyclic variables/parameters detected <a class="anchor" id='cyclic'>
```
Cyclic variables/parameters detected. Please check the definition(s) of a,b.
```

This error arises when the definitions of your variables or parameters mean that they depend on each other in a cyclic way that can't be resolved. For example, imagine parameters $a$ and $b$ are defined as

$$\begin{align}a &= b,\\ b &= a+1.\end{align}$$

There is no solution to this system of equations, so check your definitions and try again.

### My error looks nothing like any of these
Sometimes, errors won't look anything like these examples. If this is the case and the error message doesn't help you in resolving it, please follows the steps outlined [below](#error) and help make VisualPDE as stable as possible!

NOTE: VisualPDE sometimes won't warn you about multiple errors that involve the same error message (we're working on it). So, if you fix an error involving 'k', you might not be warned about later errors involving 'k' in the same session. Reloading the page (making sure to have copied your configuration URL first!) is a good way of getting around this for now.

### The buttons don't work, but I want to keep playing!
Very rarely, the simulation and the user interface may become unresponsive. If this happens: 
1. Click {{ layout.help }} to bring up the documentation to try to solve your problem.
1. Reload the page. Sadly, this won't preserve the configuration beyond that specified in the URL.
If the issue is persistent and you're confident that you've followed all the steps outlined in this guide, please report your issue as described [below](#error). 

### How do I report an issue? <a class="anchor" id='error'>
Sometimes, something might go wrong (e.g. a part of the user interface is doing something strange, or the simulations are not working on your device). If you encounter an issue that can't be resolved using the [documentation](/user-guide), we'd love to hear from you at [bugs@visualpde.com](mailto:bugs@visualpde.com).

If you can, it will help us a lot if you could click <span class='click_sequence'>{{ layout.settings }} → **Misc.** → **Debug** → **Copy debug**</span> and paste the contents into your email. This will contain information about your current configuration that will help us resolve the problem.

---

## Beyond VisualPDE.com <a class="anchor" id='extending'>

### I want to use VisualPDE in my teaching/research/outreach – what do I do?
VisualPDE is designed for customising and sharing. If you're new to the site, we recommend that you check out our [creator resources](/create) to get an idea of how to craft your own simulation, and make use of [link sharing](#linkSharing) to permanently save customised simulations.

For instance, a popular way to create custom teaching materials is to simply include links to customised VisualPDE simulations in more traditional teaching materials, similar to the [examples](/explore) on the site.

If you want to do more than this allows, we'd love to hear from you at [hello@visualpde.com](mailto:hello@visualpde.com) so that we can help bring VisualPDE into your teaching, research, or outreach activities.

### I want to use VisualPDE for my business - can I?
Almost certainly! However, we want to make sure that we do knowledge exchange properly, so do get in touch with us at [hello@visualpde.com](mailto:hello@visualpde.com) so that we can make sure you'll get the best out of VisualPDE.

### I've got a feature request – who do I contact?
We're always looking to improve VisualPDE and would love to hear from you at [hello@visualpde.com](mailto:hello@visualpde.com) if you think we can improve something about the experience. If you'd like to suggest a brand new PDE for the website, we're looking for examples that are qualitatively different to what is already on the site. That being said, if you've found a cool parameter set for a system that we haven't noted already, do let us know!

If you can't seem to cast your PDE in a form that VisualPDE can solve, we encourage you to look at the [library of examples](/explore) to see how various types of PDE can be thrown into VisualPDE, which might provide some inspiration. If you still can't get VisualPDE to solve your system but you think it should/could be possible, we'd love to hear from you.

### Can I modify the source code of VisualPDE and host my own version?
In short: yes! We've made VisualPDE open source for a reason and want to see as many people using it as possible. If you want to ship your own version of the source code, we ask that you follow the licences found in our [repository](https://github.com/Pecnut/visual-pde) and provide due credit to [VisualPDE.com](https://visualpde.com). If you're in any doubt about your specific case, do send us an email at [hello@visualpde.com](mailto:hello@visualpde.com) and we'll happily chat with you! We're all about making VisualPDE accessible to as many people as possible.