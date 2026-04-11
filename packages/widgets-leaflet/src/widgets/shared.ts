// ---------------------------------------------------------------------------
// Shared utilities for Leaflet widgets
// ---------------------------------------------------------------------------

export const TILE_URL = 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png';
export const TILE_ATTR =
  '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

/**
 * Inject Leaflet CSS into the container via a <style> element.
 * Idempotent — skips if already injected in the same container.
 */
export function injectLeafletCSS(container: HTMLElement): void {
  if (container.querySelector('style[data-leaflet-css]')) return;
  const style = document.createElement('style');
  style.setAttribute('data-leaflet-css', '1');
  style.textContent = LEAFLET_CSS;
  container.prepend(style);
}

/**
 * Ensure container has a height. Sets min-height:400px if none set.
 */
export function ensureHeight(
  container: HTMLElement,
  heightOverride?: string,
): void {
  if (heightOverride) {
    container.style.height = heightOverride;
  } else if (!container.style.height && !container.style.minHeight) {
    container.style.minHeight = '400px';
  }
}

// ---------------------------------------------------------------------------
// Leaflet CSS v1.9.4 — minimal subset for map + markers + popups + tooltips
// Full CSS inlined to avoid external <link> requests.
// ---------------------------------------------------------------------------

const LEAFLET_CSS = `
/* === Map container === */
.leaflet-container {
  width: 100%; height: 100%;
  font-family: system-ui, sans-serif; font-size: 12px;
  -webkit-tap-highlight-color: transparent;
  background: #ddd;
  outline-offset: 1px;
}
.leaflet-container a { color: #0078a8; }

/* === Tile layer === */
.leaflet-tile-pane { z-index: 200; }
.leaflet-overlay-pane { z-index: 400; }
.leaflet-shadow-pane { z-index: 500; }
.leaflet-marker-pane { z-index: 600; }
.leaflet-tooltip-pane { z-index: 650; }
.leaflet-popup-pane { z-index: 700; }
.leaflet-map-pane { z-index: 100; }

.leaflet-tile {
  filter: inherit;
  visibility: hidden;
}
.leaflet-tile-loaded { visibility: inherit; }
.leaflet-tile-container { pointer-events: none; }

.leaflet-zoom-box {
  border: 2px dotted #38f;
  background: rgba(255,255,255,0.5);
}

/* === Controls === */
.leaflet-control { position: relative; z-index: 800; pointer-events: visiblePainted; }
.leaflet-top, .leaflet-bottom { position: absolute; z-index: 1000; pointer-events: none; }
.leaflet-top { top: 0; }
.leaflet-right { right: 0; }
.leaflet-bottom { bottom: 0; }
.leaflet-left { left: 0; }
.leaflet-top .leaflet-control { margin-top: 10px; }
.leaflet-top .leaflet-control:first-child { margin-top: 0; }
.leaflet-bottom .leaflet-control { margin-bottom: 10px; }
.leaflet-left .leaflet-control { margin-left: 10px; }
.leaflet-right .leaflet-control { margin-right: 10px; }

/* Zoom control */
.leaflet-control-zoom a,
.leaflet-control-layers-toggle {
  background-color: #fff;
  border-bottom: 1px solid #ccc;
  width: 26px; height: 26px; line-height: 26px;
  display: block; text-align: center;
  text-decoration: none; color: #333;
  pointer-events: auto;
}
.leaflet-control-zoom a:hover { background-color: #f4f4f4; }
.leaflet-control-zoom { border-radius: 4px; box-shadow: 0 1px 5px rgba(0,0,0,0.4); }
.leaflet-control-zoom a:first-child { border-radius: 4px 4px 0 0; }
.leaflet-control-zoom a:last-child { border-radius: 0 0 4px 4px; border-bottom: 0; }
.leaflet-control-zoom-in, .leaflet-control-zoom-out { font: bold 18px 'Lucida Console', Monaco, monospace; }

/* Attribution */
.leaflet-control-attribution {
  background: #fff; background: rgba(255,255,255,0.8);
  margin: 0; padding: 0 5px;
  pointer-events: auto;
}
.leaflet-control-attribution a { text-decoration: none; }

/* === Markers === */
.leaflet-marker-icon,
.leaflet-marker-shadow {
  display: block;
  pointer-events: none;
}
.leaflet-marker-icon { pointer-events: auto; }
.leaflet-default-icon-path {
  background-image: url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABkAAAApCAYAAADAk4LOAAAFgUlEQVR4Aa1XA5BjWRTN2oW17d3YassavnGadr5pVuuuj/cRnX4/OidBcoAoEToCAAgWgCGAQB80AEIHqCk3rTLzOqvB/4E/v3x/f58/95z5fN/3OXeLLtbGLzE2kQMAYCEIIEgLkAKIACqhKB1ACwGoRQABJGFMAhPOFx4A4Gfph1DoYB+LzGBRqHCAGqBhEKABACM+FMFMAbpAHIKqmARUwBIBNC2QkQVINIUAEE3QAgAh8mGAUAsCEA0FtAi4qAq3gDgSCCGyNYKVCjCVHEcIEE9FxEMBlDGBBByckZIHCCKAHECHRi4hngIiNBEAqAQMhPkHBJSFohzkrIgMiIDEEBIBbB2mI7BAbPFP4Gi2mkDNA3WvxBEdOQGtHABBgfRhf4AiAgfiB2AIXELoBIBARlEoA2BAEgsDjiYhaAiD6QwAQ4AHwIGgGMIBEDkNxgFwITwOA44DHwIFgPBgIYHwIEggK4AVgPwI+A44DHwO4A4EDwIFsEAYHMQIJ8PAAdzxRicEiIEFjxMHMSBHifl2cIpf5CGQ/7gWg46AH5I2wjbAbwrMA/AOAL5I2wjbAbw8ADOB+BAuBPBMK0BYCMlF4yA4+AJ5I4FjmAbwIKZNYA/kbACOBIYFDAD0DvgCAKYAcCxAiB2AOJLNQB5I4Fj2Ibw8MAfAAB5FICFXgbwCGACAIIA7gDgRfICuCPAH5AhkBUAPwKQAvgRwI+AJ5B4FjmIbQwPD/xh4EbACCFGAVgPwK8AfAi4EcCPAH5A4ljmIbQJAPkACGBYBOA54AHyCeCOAI4EfAjkh3BHDoBRgN4B+BEgDOB+BAuBPAO4I4EfAfkBHBHDo+gR8A/B1gPwK+AJ5I4FjmAbQ8PB/4HcACCFWAfgRwI8AfkDiWOYhtBQAuAIAcgC+AOBHwI9AflDiWOYhtDQ8P/AHcASCBcAQBrAc8CdAJ4I4EjA/0B+WOZY5iG0FYC4ADkCwJ4EcCTwR0BHJH2IOHI4kIOA7gCQQNAPwI4EngSeCOBI4A/kj7ENIKQFwBHAE8CdAJ4I6ADki2UDKB1A/gCAPAjQBzAfgjgR+RPBHQEcOj5BHwB/A1QPwI4EckfSxzENod+B3AEkgRwJYE8CT0DuCPgn4D8sdSxzENoJwBxBHDkADwJYE/gjoCOHB/BHwD8HVgfwRwI+A/LHMscxDaBdAcSRw5AA8CeCPgI5AjhwfwR8A/B2gfwRwI/IHMscxDaCdAcQRQ5AE8CSAP4I6AjkjwR+RPJHDo+Qh8A/B1gPwI4EfkD2WOZY5iG0M4C4cjhyeB4E8ERAP4I6Ajkj+CPBI4cHiGPgH8Orh+BHwH5Y5ljmYbQcAJxBHDkADwJ4E+AjkCOHB7BHwD8HVgfwRwJ/IHMscxDaCcAcSRw5PA8CTwR0BHDo+QR8A/B1gP4I4EfkDmWOYhtBOAOII4cngeBO4I6Ajk2PER8gjY5sD6COBHwH9Y5ljmIbQDADiCOHIAngTwR0BHDo+QR8c2B9ZHAH5Y5ljmIbQTgDiCOHIAngTwR0BHDo+QR8A/B1YH8EcCPyBzLHMQ2gXAHEEcOTwPAk8EdARw5PYI+AbQ6sj+COBH5A5ljmIbQ7gDiCOHJ4HgTwR0BHDk/gj4BtDq+PBI4E/kDmWOYhtDs8P/GHgBsAKIUYBeA/Ar4A8CLgRwI/AvkBiWOYhtAk8+QIIYFgE4DngAfIJ4I4AjgR8B+QIZIdADcCkAL4EcCPgCeQOBY5im0AAFYAMFPAF8AOBHwI5A4FjmAbQJAPkACGBYBOA54AHyCeCOAI4EfAjkh3BHDoBRgN4B+BEgDOB+BAuBPAO4I4EfAfkBHBHDoA=);
}
.leaflet-default-icon-path { /* icon handled below */ }

/* === Popup === */
.leaflet-popup {
  position: absolute; text-align: center;
  margin-bottom: 20px;
}
.leaflet-popup-content-wrapper {
  padding: 1px; text-align: left;
  border-radius: 8px;
  background: white;
  box-shadow: 0 3px 14px rgba(0,0,0,0.3);
}
.leaflet-popup-content {
  margin: 10px 14px; line-height: 1.3;
  font-size: 13px;
}
.leaflet-popup-tip-container {
  width: 40px; height: 20px;
  position: absolute; left: 50%;
  margin-top: -1px; margin-left: -20px;
  overflow: hidden; pointer-events: none;
}
.leaflet-popup-tip {
  background: white;
  box-shadow: 0 3px 14px rgba(0,0,0,0.3);
  width: 17px; height: 17px;
  padding: 1px; margin: -10px auto 0;
  transform: rotate(45deg);
}
.leaflet-popup-close-button {
  position: absolute; top: 0; right: 0;
  border: none; text-align: center;
  width: 24px; height: 24px; font: 16px/24px Tahoma, Verdana, sans-serif;
  color: #757575; text-decoration: none;
  background: transparent; cursor: pointer;
}
.leaflet-popup-close-button:hover { color: #333; }

/* === Tooltip === */
.leaflet-tooltip {
  position: absolute;
  padding: 4px 8px;
  background-color: #fff;
  border: 1px solid #ccc;
  border-radius: 3px;
  color: #333;
  white-space: nowrap;
  box-shadow: 0 1px 3px rgba(0,0,0,0.3);
  pointer-events: none;
}
.leaflet-tooltip-top:before,
.leaflet-tooltip-bottom:before,
.leaflet-tooltip-left:before,
.leaflet-tooltip-right:before {
  position: absolute; content: '';
  pointer-events: none;
  border: 6px solid transparent;
}
.leaflet-tooltip-bottom { margin-top: 6px; }
.leaflet-tooltip-top { margin-top: -6px; }
.leaflet-tooltip-bottom:before {
  left: 50%; margin-left: -6px; top: 0; margin-top: -12px;
  border-bottom-color: #fff;
}
.leaflet-tooltip-top:before {
  left: 50%; margin-left: -6px; bottom: 0; margin-bottom: -12px;
  border-top-color: #fff;
}
.leaflet-tooltip-left { margin-left: -6px; }
.leaflet-tooltip-right { margin-left: 6px; }
.leaflet-tooltip-left:before {
  right: 0; margin-right: -12px; top: 50%; margin-top: -6px;
  border-left-color: #fff;
}
.leaflet-tooltip-right:before {
  left: 0; margin-left: -12px; top: 50%; margin-top: -6px;
  border-right-color: #fff;
}

/* === Panes, fade, zoom animations === */
.leaflet-pane { position: absolute; top: 0; left: 0; }
.leaflet-map-pane canvas { position: absolute; }
.leaflet-zoom-animated { transform-origin: 0 0; }
.leaflet-fade-anim .leaflet-popup { opacity: 1; transition: opacity 0.2s linear; }
.leaflet-fade-anim .leaflet-map-pane .leaflet-popup { opacity: 0; }
.leaflet-zoom-anim .leaflet-zoom-animated { transition: transform 0.25s cubic-bezier(0,0,0.25,1); }

/* === Grab cursor === */
.leaflet-grab { cursor: grab; }
.leaflet-dragging .leaflet-grab { cursor: grabbing; }
.leaflet-dragging .leaflet-marker-draggable { cursor: grabbing; }

/* === Image / video overlay === */
.leaflet-image-layer, .leaflet-pane > svg, video {
  max-width: none !important; max-height: none !important;
}
.leaflet-container img.leaflet-image-layer { pointer-events: auto; }

/* === Interactive layer === */
.leaflet-interactive { cursor: pointer; }
`;
