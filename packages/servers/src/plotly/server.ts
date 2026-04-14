// @ts-nocheck
// ---------------------------------------------------------------------------
// Plotly.js visualization server — 50 widgets
// Scientific charts, 3D, maps, statistical, financial, hierarchical
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

// Recipes
import scatterRecipe from './recipes/scatter.md?raw';
import scatterglRecipe from './recipes/scattergl.md?raw';
import barRecipe from './recipes/bar.md?raw';
import pieRecipe from './recipes/pie.md?raw';
import heatmapRecipe from './recipes/heatmap.md?raw';
import heatmapglRecipe from './recipes/heatmapgl.md?raw';
import contourRecipe from './recipes/contour.md?raw';
import imageRecipe from './recipes/image.md?raw';
import tableRecipe from './recipes/table.md?raw';
import boxRecipe from './recipes/box.md?raw';
import violinRecipe from './recipes/violin.md?raw';
import histogramRecipe from './recipes/histogram.md?raw';
import histogram2dRecipe from './recipes/histogram2d.md?raw';
import histogram2dcontourRecipe from './recipes/histogram2dcontour.md?raw';
import ohlcRecipe from './recipes/ohlc.md?raw';
import candlestickRecipe from './recipes/candlestick.md?raw';
import waterfallRecipe from './recipes/waterfall.md?raw';
import funnelRecipe from './recipes/funnel.md?raw';
import funnelareaRecipe from './recipes/funnelarea.md?raw';
import indicatorRecipe from './recipes/indicator.md?raw';
import scatter3dRecipe from './recipes/scatter3d.md?raw';
import surfaceRecipe from './recipes/surface.md?raw';
import mesh3dRecipe from './recipes/mesh3d.md?raw';
import coneRecipe from './recipes/cone.md?raw';
import streamtubeRecipe from './recipes/streamtube.md?raw';
import volumeRecipe from './recipes/volume.md?raw';
import isosurfaceRecipe from './recipes/isosurface.md?raw';
import scattergeoRecipe from './recipes/scattergeo.md?raw';
import choroplethRecipe from './recipes/choropleth.md?raw';
import scattermapRecipe from './recipes/scattermap.md?raw';
import scattermapboxRecipe from './recipes/scattermapbox.md?raw';
import choroplethmapRecipe from './recipes/choroplethmap.md?raw';
import choroplethmapboxRecipe from './recipes/choroplethmapbox.md?raw';
import densitymapRecipe from './recipes/densitymap.md?raw';
import densitymapboxRecipe from './recipes/densitymapbox.md?raw';
import scatterpolarRecipe from './recipes/scatterpolar.md?raw';
import scatterpolarglRecipe from './recipes/scatterpolargl.md?raw';
import barpolarRecipe from './recipes/barpolar.md?raw';
import scatterternaryRecipe from './recipes/scatterternary.md?raw';
import scattersmithRecipe from './recipes/scattersmith.md?raw';
import sunburstRecipe from './recipes/sunburst.md?raw';
import treemapRecipe from './recipes/treemap.md?raw';
import icicleRecipe from './recipes/icicle.md?raw';
import sankeyRecipe from './recipes/sankey.md?raw';
import splomRecipe from './recipes/splom.md?raw';
import parcoordsRecipe from './recipes/parcoords.md?raw';
import parcatsRecipe from './recipes/parcats.md?raw';
import carpetRecipe from './recipes/carpet.md?raw';
import scattercarpetRecipe from './recipes/scattercarpet.md?raw';
import contourcarpetRecipe from './recipes/contourcarpet.md?raw';

// Renderers
import { render as renderScatter } from './widgets/scatter.js';
import { render as renderScattergl } from './widgets/scattergl.js';
import { render as renderBar } from './widgets/bar.js';
import { render as renderPie } from './widgets/pie.js';
import { render as renderHeatmap } from './widgets/heatmap.js';
import { render as renderHeatmapgl } from './widgets/heatmapgl.js';
import { render as renderContour } from './widgets/contour.js';
import { render as renderImage } from './widgets/image.js';
import { render as renderTable } from './widgets/table.js';
import { render as renderBox } from './widgets/box.js';
import { render as renderViolin } from './widgets/violin.js';
import { render as renderHistogram } from './widgets/histogram.js';
import { render as renderHistogram2d } from './widgets/histogram2d.js';
import { render as renderHistogram2dcontour } from './widgets/histogram2dcontour.js';
import { render as renderOhlc } from './widgets/ohlc.js';
import { render as renderCandlestick } from './widgets/candlestick.js';
import { render as renderWaterfall } from './widgets/waterfall.js';
import { render as renderFunnel } from './widgets/funnel.js';
import { render as renderFunnelarea } from './widgets/funnelarea.js';
import { render as renderIndicator } from './widgets/indicator.js';
import { render as renderScatter3d } from './widgets/scatter3d.js';
import { render as renderSurface } from './widgets/surface.js';
import { render as renderMesh3d } from './widgets/mesh3d.js';
import { render as renderCone } from './widgets/cone.js';
import { render as renderStreamtube } from './widgets/streamtube.js';
import { render as renderVolume } from './widgets/volume.js';
import { render as renderIsosurface } from './widgets/isosurface.js';
import { render as renderScattergeo } from './widgets/scattergeo.js';
import { render as renderChoropleth } from './widgets/choropleth.js';
import { render as renderScattermap } from './widgets/scattermap.js';
import { render as renderScattermapbox } from './widgets/scattermapbox.js';
import { render as renderChoroplethmap } from './widgets/choroplethmap.js';
import { render as renderChoroplethmapbox } from './widgets/choroplethmapbox.js';
import { render as renderDensitymap } from './widgets/densitymap.js';
import { render as renderDensitymapbox } from './widgets/densitymapbox.js';
import { render as renderScatterpolar } from './widgets/scatterpolar.js';
import { render as renderScatterpolargl } from './widgets/scatterpolargl.js';
import { render as renderBarpolar } from './widgets/barpolar.js';
import { render as renderScatterternary } from './widgets/scatterternary.js';
import { render as renderScattersmith } from './widgets/scattersmith.js';
import { render as renderSunburst } from './widgets/sunburst.js';
import { render as renderTreemap } from './widgets/treemap.js';
import { render as renderIcicle } from './widgets/icicle.js';
import { render as renderSankey } from './widgets/sankey.js';
import { render as renderSplom } from './widgets/splom.js';
import { render as renderParcoords } from './widgets/parcoords.js';
import { render as renderParcats } from './widgets/parcats.js';
import { render as renderCarpet } from './widgets/carpet.js';
import { render as renderScattercarpet } from './widgets/scattercarpet.js';
import { render as renderContourcarpet } from './widgets/contourcarpet.js';

// ---------------------------------------------------------------------------
// Server
// ---------------------------------------------------------------------------

const plotlyServer = createWebMcpServer('plotly', {
  description:
    'Scientific charts with Plotly.js — scatter, bar, pie, heatmap, 3D, maps, statistical, financial, hierarchical (50 widgets)',
});

const widgets: Array<[string, unknown]> = [
  [scatterRecipe, renderScatter],
  [scatterglRecipe, renderScattergl],
  [barRecipe, renderBar],
  [pieRecipe, renderPie],
  [heatmapRecipe, renderHeatmap],
  [heatmapglRecipe, renderHeatmapgl],
  [contourRecipe, renderContour],
  [imageRecipe, renderImage],
  [tableRecipe, renderTable],
  [boxRecipe, renderBox],
  [violinRecipe, renderViolin],
  [histogramRecipe, renderHistogram],
  [histogram2dRecipe, renderHistogram2d],
  [histogram2dcontourRecipe, renderHistogram2dcontour],
  [ohlcRecipe, renderOhlc],
  [candlestickRecipe, renderCandlestick],
  [waterfallRecipe, renderWaterfall],
  [funnelRecipe, renderFunnel],
  [funnelareaRecipe, renderFunnelarea],
  [indicatorRecipe, renderIndicator],
  [scatter3dRecipe, renderScatter3d],
  [surfaceRecipe, renderSurface],
  [mesh3dRecipe, renderMesh3d],
  [coneRecipe, renderCone],
  [streamtubeRecipe, renderStreamtube],
  [volumeRecipe, renderVolume],
  [isosurfaceRecipe, renderIsosurface],
  [scattergeoRecipe, renderScattergeo],
  [choroplethRecipe, renderChoropleth],
  [scattermapRecipe, renderScattermap],
  [scattermapboxRecipe, renderScattermapbox],
  [choroplethmapRecipe, renderChoroplethmap],
  [choroplethmapboxRecipe, renderChoroplethmapbox],
  [densitymapRecipe, renderDensitymap],
  [densitymapboxRecipe, renderDensitymapbox],
  [scatterpolarRecipe, renderScatterpolar],
  [scatterpolarglRecipe, renderScatterpolargl],
  [barpolarRecipe, renderBarpolar],
  [scatterternaryRecipe, renderScatterternary],
  [scattersmithRecipe, renderScattersmith],
  [sunburstRecipe, renderSunburst],
  [treemapRecipe, renderTreemap],
  [icicleRecipe, renderIcicle],
  [sankeyRecipe, renderSankey],
  [splomRecipe, renderSplom],
  [parcoordsRecipe, renderParcoords],
  [parcatsRecipe, renderParcats],
  [carpetRecipe, renderCarpet],
  [scattercarpetRecipe, renderScattercarpet],
  [contourcarpetRecipe, renderContourcarpet],
];

for (const [recipe, renderer] of widgets) {
  plotlyServer.registerWidget(recipe as string, renderer);
}

export { plotlyServer };
