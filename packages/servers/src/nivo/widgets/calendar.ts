// @ts-nocheck
import { createElement } from 'react';
import { mountReact, nivoTheme } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<() => void> {
  const { ResponsiveCalendar } = await import('@nivo/calendar');
  const { data: days, from, to, emptyColor = '#eeeeee', colors = ['#b4e1f5', '#6eb1d0', '#3578a5', '#1e4b73'] } = data as any;
  return mountReact(
    container,
    createElement(ResponsiveCalendar, {
      data: days,
      from,
      to,
      emptyColor,
      colors,
      theme: nivoTheme,
      margin: { top: 30, right: 30, bottom: 30, left: 30 },
      yearSpacing: 36,
      monthBorderColor: '#ffffff',
      dayBorderWidth: 1,
      dayBorderColor: '#ffffff',
      legends: [
        {
          anchor: 'bottom-right',
          direction: 'row',
          translateY: 36,
          itemCount: 4,
          itemWidth: 42,
          itemHeight: 36,
          itemDirection: 'right-to-left',
        },
      ],
    }),
  );
}
