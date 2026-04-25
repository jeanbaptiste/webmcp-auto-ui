// @ts-nocheck
import { createViewer } from './shared.js';

export async function render(container: HTMLElement, params: any): Promise<() => void> {
  const { Cesium, viewer, cleanup } = await createViewer(container, {
    ...(params?.viewerOptions ?? {}),
    animation: true,
    timeline: true,
  });

  try {
    const start = params?.start ? Cesium.JulianDate.fromIso8601(String(params.start)) : Cesium.JulianDate.now();
    const stop = params?.stop
      ? Cesium.JulianDate.fromIso8601(String(params.stop))
      : Cesium.JulianDate.addDays(start, Number(params?.durationDays ?? 1), new Cesium.JulianDate());

    viewer.clock.startTime = start.clone();
    viewer.clock.stopTime = stop.clone();
    viewer.clock.currentTime = start.clone();
    viewer.clock.clockRange = Cesium.ClockRange.LOOP_STOP;
    viewer.clock.multiplier = Number(params?.multiplier ?? 60);
    viewer.clock.shouldAnimate = Boolean(params?.shouldAnimate ?? true);
    if (viewer.timeline) viewer.timeline.zoomTo(start, stop);
  } catch {
    // ignore
  }

  return cleanup;
}
