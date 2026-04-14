// @ts-nocheck
// ---------------------------------------------------------------------------
// Cluster Map — clustered point markers
// ---------------------------------------------------------------------------

import { createMapboxMap } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const d = data as any;
  const { map } = await createMapboxMap(container, d);

  map.on('load', () => {
    const points = d.points || [];
    const geojson = {
      type: 'FeatureCollection',
      features: points.map((p: any) => ({
        type: 'Feature',
        geometry: { type: 'Point', coordinates: p.coordinates || [p.lng || p.lon, p.lat] },
        properties: { label: p.label || p.name || '' },
      })),
    };

    map.addSource('clusters', {
      type: 'geojson',
      data: geojson,
      cluster: true,
      clusterMaxZoom: d.clusterMaxZoom ?? 14,
      clusterRadius: d.clusterRadius ?? 50,
    });

    map.addLayer({
      id: 'cluster-circles',
      type: 'circle',
      source: 'clusters',
      filter: ['has', 'point_count'],
      paint: {
        'circle-color': [
          'step', ['get', 'point_count'],
          d.colorSmall || '#51bbd6', 10,
          d.colorMedium || '#f1f075', 30,
          d.colorLarge || '#f28cb1',
        ],
        'circle-radius': ['step', ['get', 'point_count'], 20, 10, 30, 30, 40],
      },
    });

    map.addLayer({
      id: 'cluster-count',
      type: 'symbol',
      source: 'clusters',
      filter: ['has', 'point_count'],
      layout: {
        'text-field': '{point_count_abbreviated}',
        'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
        'text-size': 12,
      },
    });

    map.addLayer({
      id: 'unclustered-point',
      type: 'circle',
      source: 'clusters',
      filter: ['!', ['has', 'point_count']],
      paint: {
        'circle-color': d.pointColor || '#6366f1',
        'circle-radius': 6,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#fff',
      },
    });

    // Zoom on cluster click
    map.on('click', 'cluster-circles', (e) => {
      const features = map.queryRenderedFeatures(e.point, { layers: ['cluster-circles'] });
      const clusterId = features[0].properties.cluster_id;
      map.getSource('clusters').getClusterExpansionZoom(clusterId, (err, zoom) => {
        if (!err) map.easeTo({ center: features[0].geometry.coordinates, zoom });
      });
    });

    if (points.length >= 2) {
      const lngs = points.map((p: any) => (p.coordinates || [p.lng || p.lon])[0]);
      const lats = points.map((p: any) => (p.coordinates || [0, p.lat])[1]);
      map.fitBounds([[Math.min(...lngs), Math.min(...lats)], [Math.max(...lngs), Math.max(...lats)]], { padding: 50 });
    }
  });

  return () => { map.remove(); };
}
