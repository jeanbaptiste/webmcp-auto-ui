---
widget: skybox-panorama
description: Procedural sky environment with gradient and stars. Backgrounds, atmosphere.
group: threejs
schema:
  type: object
  properties:
    title:
      type: string
    topColor:
      type: string
    bottomColor:
      type: string
    horizonColor:
      type: string
    starCount:
      type: number
    showGround:
      type: boolean
    autoRotate:
      type: boolean
---

## When to use

Create atmospheric sky backgrounds, day/night scenes, space environments.

## How

```
threejs_webmcp_widget_display({name: "skybox-panorama", params: {
  title: "Sunset Sky",
  topColor: "#000022",
  horizonColor: "#ff6600",
  bottomColor: "#001144",
  starCount: 300
}})
```

## Example
```
threejs_webmcp_widget_display({name: "skybox-panorama", params: { title: "Night Sky", topColor: "#000011", horizonColor: "#112244", bottomColor: "#001122", starCount: 500, showGround: true, autoRotate: true }})
```
