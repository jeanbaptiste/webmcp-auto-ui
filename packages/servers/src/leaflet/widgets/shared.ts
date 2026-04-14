// @ts-nocheck
// ---------------------------------------------------------------------------
// Shared helpers for Leaflet widgets — CSS injection + map factory
// ---------------------------------------------------------------------------

let cssInjected = false;

export async function ensureLeafletCSS() {
  if (cssInjected) return;
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'https://unpkg.com/leaflet@1/dist/leaflet.css';
  document.head.appendChild(link);
  cssInjected = true;
}

export async function loadScript(url: string, globalName?: string): Promise<void> {
  if (globalName && (window as any)[globalName]) return;
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = url;
    script.onload = () => resolve();
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

export async function createMap(container: HTMLElement, options?: any) {
  await ensureLeafletCSS();
  const L = (await import('leaflet')).default ?? await import('leaflet');
  container.style.height = container.style.height || '400px';
  const map = L.map(container, { ...options });
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap'
  }).addTo(map);
  return { L, map };
}
