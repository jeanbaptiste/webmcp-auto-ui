// @ts-nocheck
export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const { Chart, registerables } = await import('chart.js');
  Chart.register(...registerables);
  container.style.height = container.style.height || "100%";
  container.style.minHeight = container.style.minHeight || "400px";
  container.style.position = "relative";
  const canvas = document.createElement('canvas');
  canvas.style.width = "100%";
  canvas.style.height = "100%";
  container.appendChild(canvas);
  const chart = new Chart(canvas, {
    type: 'line',
    data: {
      labels: data.labels as string[],
      datasets: (data.datasets as any[]) || [{ data: data.values, label: data.label || 'Data', tension: 0.3 }],
    },
    options: { responsive: true, maintainAspectRatio: false, ...(data.options as any) },
  });
  return () => { chart.destroy(); canvas.remove(); };
}
