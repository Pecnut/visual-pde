const cacheName = "offline-cache-v1";
const cacheUrls = [
  "/sim/css",
  "/sim/css/main.css",
  "/sim/images",
  "/sim/images/ASHBi.png",
  "/sim/images/ASHBi.webp",
  "/sim/images/Alan.png",
  "/sim/images/Alan.webp",
  "/sim/images/Alan2.png",
  "/sim/images/Alan2.webp",
  "/sim/images/AperiodicTiling.webp",
  "/sim/images/BannerInitState",
  "/sim/images/Flower.png",
  "/sim/images/Flower.webp",
  "/sim/images/IMI_logo.png",
  "/sim/images/IMI_mask.png",
  "/sim/images/Oksendal.png",
  "/sim/images/Oksendal.webp",
  "/sim/images/OnceUponATime.webp",
  "/sim/images/SnapshotChemicalBasis.png",
  "/sim/images/SnapshotChemicalBasis.webp",
  "/sim/images/Sofya.png",
  "/sim/images/Sofya.webp",
  "/sim/images/USA.jpg",
  "/sim/images/USA.webp",
  "/sim/images/bmb.png",
  "/sim/images/bmb.webp",
  "/sim/images/chemicalBasisOfMorphogenesis.png",
  "/sim/images/chemicalBasisOfMorphogenesis.webp",
  "/sim/images/cursor-bump.svg",
  "/sim/images/cursor-circle.svg",
  "/sim/images/cursor-crosshairs.svg",
  "/sim/images/cursor-droplet.svg",
  "/sim/images/cursor-hline.svg",
  "/sim/images/cursor-jump.svg",
  "/sim/images/cursor-line.svg",
  "/sim/images/cursor-none.svg",
  "/sim/images/cursor-vline.svg",
  "/sim/images/gb.png",
  "/sim/images/gb.webp",
  "/sim/images/landslides.jpeg",
  "/sim/images/maskFrontA.png",
  "/sim/images/maskFrontA.webp",
  "/sim/images/maskFrontB.png",
  "/sim/images/maskFrontB.webp",
  "/sim/images/maskFrontFaceA.png",
  "/sim/images/maskFrontFaceA.webp",
  "/sim/images/maskFrontFaceB.png",
  "/sim/images/maskFrontFaceB.webp",
  "/sim/images/maze.png",
  "/sim/images/maze.webp",
  "/sim/images/oxford.png",
  "/sim/images/oxford.webp",
  "/sim/images/pumpkin.webp",
  "/sim/images/qr-code-home.png",
  "/sim/images/qr-code-home.webp",
  "/sim/images/qr-code.png",
  "/sim/images/qr-code.webp",
  "/sim/images/shell_square.png",
  "/sim/images/shell_square.webp",
  "/sim/images/smb.png",
  "/sim/images/smb.webp",
  "/sim/images/smb_mask.png",
  "/sim/images/smb_mask.webp",
  "/sim/images/stochastic-pdes.png",
  "/sim/images/stochastic-pdes.webp",
  "/sim/images/topography.png",
  "/sim/images/topography.webp",
  "/sim/images/world_flow.png",
  "/sim/images/world_map.png",
  "/sim/images/world_map.webp",
  "/sim/scripts",
  "/sim/scripts/OrbitControls.js",
  "/sim/scripts/RD",
  "/sim/scripts/RD/TEX.js",
  "/sim/scripts/RD/clear_shader.js",
  "/sim/scripts/RD/display_shaders.js",
  "/sim/scripts/RD/drawing_shaders.js",
  "/sim/scripts/RD/main.js",
  "/sim/scripts/RD/minify_preset.js",
  "/sim/scripts/RD/post_shaders.js",
  "/sim/scripts/RD/presets.js",
  "/sim/scripts/RD/simulation_shaders.js",
  "/sim/scripts/RD/tours.js",
  "/sim/scripts/RD/webpack.config.js",
  "/sim/scripts/auxiliary_GLSL_funs.js",
  "/sim/scripts/charts.umd.min.js",
  "/sim/scripts/colourmaps.js",
  "/sim/scripts/copy_shader.js",
  "/sim/scripts/dat.gui.min.js",
  "/sim/scripts/dat_gui_mods.js",
  "/sim/scripts/expr-eval.js",
  "/sim/scripts/fitty.min.js",
  "/sim/scripts/generic_shaders.js",
  "/sim/scripts/lines",
  "/sim/scripts/lines/Line2.js",
  "/sim/scripts/lines/LineGeometry.js",
  "/sim/scripts/lines/LineMaterial.js",
  "/sim/scripts/lines/LineSegments2.js",
  "/sim/scripts/lines/LineSegmentsGeometry.js",
  "/sim/scripts/lz-string.min.js",
  "/sim/scripts/rand_shader.js",
  "/sim/scripts/stats.min.js",
  "/sim/scripts/three.module.js",
  "/sim/scripts/three.module.min.js",
];

// Installing the Service Worker
self.addEventListener("install", async (event) => {
  try {
    const cache = await caches.open(cacheName);
    await cache.addAll(cacheUrls);
  } catch (error) {
    console.error("Service Worker installation failed:", error);
  }
});

// Fetching resources
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (url.pathname.endsWith(".mp4")) return false; // Skip caching for video files
  if (event.request.method !== "GET") return false;
  event.respondWith(
    (async () => {
      const cache = await caches.open(cacheName);

      try {
        const fetchResponse = await fetch(event.request);
        if (fetchResponse) {
          await cache.put(event.request, fetchResponse.clone());
          return fetchResponse;
        }
      } catch (error) {
        return cache.match(event.request.url);
      }
    })(),
  );
});
