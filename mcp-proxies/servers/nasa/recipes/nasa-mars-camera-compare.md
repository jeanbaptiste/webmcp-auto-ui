---
id: nasa-mars-camera-compare
name: Compare Mars rover cameras side by side
description: Multi-camera gallery, productivity chart and didactic camera cards
when: the user asks to compare cameras of a rover, the role of each camera, or differences between FHAZ, MAST, NAVCAM, etc.
servers: [nasa]
tools_used: [nasa_mars_rover]
data_type: comparative imagery by camera
components_used: [gallery, chart, cards]
layout:
  type: stack
  arrangement: productivity chart on top, side-by-side gallery, descriptive cards below
---

## When to use

The user wants to understand the rover's camera kit:
- "Compare cameras of Perseverance"
- "Difference between FHAZ and MAST"
- "All cameras of Curiosity for sol 800"
- "What is each camera on Mars rovers used for?"

The recipe issues parallel calls per camera, then juxtaposes them so the user grasps roles at a glance.

## How to use

```js
const rover = 'perseverance';
const sol   = 800;
const cams  = ['FHAZ', 'RHAZ', 'NAVCAM_LEFT', 'MCZ_LEFT'];

// 1. One call per camera (parallel)
const results = await Promise.all(
  cams.map(cam => call('nasa_mars_rover', { rover, sol, camera: cam }).catch(() => null))
);

// 2. Productivity chart (count per camera)
await widget('chart', {
  type: 'bar',
  data: cams.map((c, i) => ({ label: c, value: (results[i]?.photos ?? []).length }))
});

// 3. Side-by-side gallery (one row per camera)
const flat = [];
cams.forEach((c, i) => {
  for (const p of (results[i]?.photos ?? []).slice(0, 6)) {
    if (p?.img_src) flat.push({ src: p.img_src, alt: c, caption: c });
  }
});
await widget('gallery', { images: flat });

// 4. Didactic cards: role of each camera
const ROLES = {
  FHAZ: 'Front Hazard Avoidance — drive safety, pair stereo',
  RHAZ: 'Rear Hazard Avoidance — backup driving, deployments',
  NAVCAM_LEFT: 'Navigation Camera — wide context for path planning',
  MCZ_LEFT: 'Mastcam-Z — zoomable science imaging in colour'
};
await widget('cards', {
  items: cams.map((c, i) => ({
    title: c,
    subtitle: `${(results[i]?.photos ?? []).length} photos`,
    description: ROLES[c] ?? '—',
    image: results[i]?.photos?.[0]?.img_src
  }))
});
```

## Examples

### Curiosity engineering vs science cameras
```js
const cams = ['FHAZ', 'NAVCAM', 'MAST', 'CHEMCAM'];
const results = await Promise.all(cams.map(c =>
  call('nasa_mars_rover', { rover: 'curiosity', sol: 1500, camera: c }).catch(() => null)
));
await widget('chart', { type: 'bar', data: cams.map((c, i) => ({ label: c, value: (results[i]?.photos ?? []).length })) });
await widget('cards', { items: cams.map((c, i) => ({ title: c, subtitle: (results[i]?.photos ?? []).length + ' photos' })) });
```

### Perseverance front vs rear hazard
```js
const front = await call('nasa_mars_rover', { rover: 'perseverance', sol: 600, camera: 'FRONT_HAZCAM_LEFT_A' }).catch(() => null);
const rear  = await call('nasa_mars_rover', { rover: 'perseverance', sol: 600, camera: 'REAR_HAZCAM_LEFT' }).catch(() => null);
await widget('gallery', { images: [
  ...((front?.photos ?? []).slice(0, 3).filter(p => p?.img_src).map(p => ({ src: p.img_src, caption: 'FRONT' }))),
  ...((rear?.photos ?? []).slice(0, 3).filter(p => p?.img_src).map(p => ({ src: p.img_src, caption: 'REAR' })))
]});
```

## Common mistakes

- Camera names differ between rovers — Curiosity uses `FHAZ`, Perseverance uses `FRONT_HAZCAM_LEFT_A`. Verify the manifest first
- Asking the LLM to "guess" the camera list — keep an explicit array in the recipe
- Not using `Promise.all` — sequential calls turn 4 cameras into a 10-second round trip
- Slicing all cameras to the same number — some return zero photos that day, check before slicing
- Skipping the cards — without role descriptions the comparison is purely visual and not pedagogical
