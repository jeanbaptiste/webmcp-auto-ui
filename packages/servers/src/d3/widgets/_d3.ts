// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared D3 loader for widget bundles
//
// Loads only the d3-* sub-modules actually used by the widgets in this
// directory, instead of the umbrella `d3` package (which drags ~280 KB of
// unused modules: brush, transition, time, format, dsv, etc.).
//
// The loader returns a single object that mirrors the parts of the d3 API
// actually referenced by widgets, so callers keep using `d3.scaleLinear`,
// `d3.line`, etc. (and the dynamic accessors `(d3 as any)['scheme' + name]` /
// `(d3 as any)['interpolate' + name]` keep working through the spread of
// d3-scale-chromatic).
// ---------------------------------------------------------------------------

let cachedD3: any | null = null;
let pendingD3: Promise<any> | null = null;

export async function loadD3(): Promise<any> {
  if (cachedD3) return cachedD3;
  if (pendingD3) return pendingD3;

  pendingD3 = (async () => {
    const [
      array,
      axis,
      chord,
      contour,
      delaunay,
      drag,
      force,
      geo,
      hierarchy,
      scale,
      chromatic,
      selection,
      shape,
      zoom,
    ] = await Promise.all([
      import('d3-array'),
      import('d3-axis'),
      import('d3-chord'),
      import('d3-contour'),
      import('d3-delaunay'),
      import('d3-drag'),
      import('d3-force'),
      import('d3-geo'),
      import('d3-hierarchy'),
      import('d3-scale'),
      import('d3-scale-chromatic'),
      import('d3-selection'),
      import('d3-shape'),
      import('d3-zoom'),
    ]);

    // Spread chromatic first so explicit symbols below override duplicates.
    cachedD3 = {
      ...chromatic,
      ...array,
      ...axis,
      ...chord,
      ...contour,
      ...delaunay,
      ...drag,
      ...force,
      ...geo,
      ...hierarchy,
      ...scale,
      ...selection,
      ...shape,
      ...zoom,
    };
    return cachedD3;
  })();

  return pendingD3;
}
