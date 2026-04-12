// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);
  const canvas = document.createElement('canvas');
  container.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'bar',
    data: {
      labels: data.labels as string[],
      datasets: (data.datasets as any[]) || [{ data: data.values, label: data.label || 'Data' }],
    },
    options: { responsive: true, maintainAspectRatio: true, ...(data.options as any) },
  });
  return () => { chart.destroy(); canvas.remove(); };
}
