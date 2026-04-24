// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveChoropleth } = await import('@nivo/geo');
  const { data: values, features, domain = [0, 1_000_000], colors = 'blues', unknownColor = '#eeeeee', projectionType = 'mercator', projectionScale = 100, projectionTranslation = [0.5, 0.5] } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveChoropleth, {
      data: values,
      features,
      margin: { top: 0, right: 0, bottom: 0, left: 0 },
      colors,
      domain,
      unknownColor,
      label: 'properties.name',
      valueFormat: '.2s',
      projectionScale,
      projectionTranslation,
      projectionRotation: [0, 0, 0],
      projectionType,
      borderWidth: 0.5,
      borderColor: '#999',
      theme: nivoTheme,
      legends: [
        {
          anchor: 'bottom-left',
          direction: 'column',
          translateX: 20,
          translateY: -60,
          itemsSpacing: 0,
          itemWidth: 94,
          itemHeight: 18,
          itemTextColor: '#666',
          symbolSize: 18,
        },
      ],
    }),
  );
}
