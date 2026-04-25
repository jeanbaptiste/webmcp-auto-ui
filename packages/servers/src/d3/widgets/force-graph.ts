// @ts-nocheck
import { loadD3 } from './_d3.js';
// ---------------------------------------------------------------------------
// Force-directed graph widget — nodes and links with physics simulation
// ---------------------------------------------------------------------------

export async function render(
  container: HTMLElement,
  data: Record<string, unknown>,
): Promise<void | (() => void)> {
  const d3 = await loadD3();
  const { nodes, links, title, colorScheme } = data as any;

  container.style.position = 'relative';

  const colors = d3.scaleOrdinal(
    (d3 as any)[`scheme${colorScheme ?? 'Tableau10'}`] ?? d3.schemeTableau10,
  );

  const tooltip = d3
    .select(container)
    .append('div')
    .style('position', 'absolute')
    .style('pointer-events', 'none')
    .style('background', 'rgba(0,0,0,0.8)')
    .style('color', '#fff')
    .style('padding', '4px 8px')
    .style('border-radius', '4px')
    .style('font-size', '12px')
    .style('opacity', '0');

  let activeSimulation: any = null;
  let lastW = 0;
  let lastH = 0;

  const draw = (width: number, height: number) => {
    if (activeSimulation) {
      activeSimulation.stop();
      activeSimulation = null;
    }
    d3.select(container).selectAll('svg').remove();

    const simLinks = links.map((d) => ({ ...d }));

    // Degree-based sizing: hubs (many connections) are larger than leaves.
    // Explicit `radius` on a node always wins.
    const degree = new Map<string, number>();
    for (const l of simLinks) {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      degree.set(s, (degree.get(s) ?? 0) + 1);
      degree.set(t, (degree.get(t) ?? 0) + 1);
    }
    const maxDeg = Math.max(1, ...degree.values());
    const simNodes = nodes.map((d) => {
      if (d.radius != null) return { ...d };
      const deg = degree.get(d.id) ?? 1;
      const r = 6 + 14 * Math.sqrt(deg / maxDeg);
      return { ...d, radius: r };
    });

    const simulation = d3
      .forceSimulation(simNodes)
      .force(
        'link',
        d3.forceLink(simLinks).id((d) => d.id).distance(60),
      )
      .force('charge', d3.forceManyBody().strength(-80))
      .force('x', d3.forceX(width / 2).strength(0.05))
      .force('y', d3.forceY(height / 2).strength(0.05))
      .force(
        'collide',
        d3.forceCollide().radius((d) => {
          const label = String(d.label ?? d.id ?? '');
          return (d.radius ?? 8) + 12 + label.length * 3.5;
        }),
      )
      .alphaDecay(0.05);

    activeSimulation = simulation;

    const svg = d3
      .select(container)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('width', '100%')
      .style('height', '100%')
      .style('display', 'block')
      .style('font', '10px sans-serif');

    if (title) {
      svg
        .append('text')
        .attr('x', width / 2)
        .attr('y', 20)
        .attr('text-anchor', 'middle')
        .style('font-size', '14px')
        .style('font-weight', 'bold')
        .text(title);
    }

    // All zoomable/pannable content lives inside this group.
    const g = svg.append('g');

    const zoom = d3
      .zoom()
      .scaleExtent([0.1, 8])
      .on('zoom', (event) => g.attr('transform', event.transform));

    svg.call(zoom).style('cursor', 'grab');
    svg.on('mousedown', () => svg.style('cursor', 'grabbing'));
    svg.on('mouseup', () => svg.style('cursor', 'grab'));

    const link = g
      .append('g')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .selectAll('line')
      .data(simLinks)
      .join('line')
      .attr('stroke-width', (d) => Math.sqrt(d.value ?? 1));

    const node = g
      .append('g')
      .selectAll('circle')
      .data(simNodes)
      .join('circle')
      .attr('r', (d) => d.radius ?? 8)
      .attr('fill', (d) => colors(String(d.group ?? 0)))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1.5)
      .style('cursor', 'grab');

    node.call(
      d3.drag()
        .on('start', (event, d) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event, d) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event, d) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }),
    );

    const label = g
      .append('g')
      .selectAll('text')
      .data(simNodes)
      .join('text')
      .text((d) => String(d.label ?? d.id ?? ''))
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', '0.35em');

    node
      .on('mouseenter', function (event, d) {
        d3.select(this).attr('r', (d.radius ?? 8) + 3);
        const groupStr = d.group != null ? `<br/>Group: ${d.group}` : '';
        tooltip.style('opacity', '1').html(`<strong>${d.label ?? d.id}</strong>${groupStr}`);
      })
      .on('mousemove', function (event) {
        const rect = container.getBoundingClientRect();
        tooltip
          .style('left', `${event.clientX - rect.left + 10}px`)
          .style('top', `${event.clientY - rect.top - 10}px`);
      })
      .on('mouseleave', function (_, d) {
        d3.select(this).attr('r', d.radius ?? 8);
        tooltip.style('opacity', '0');
      });

    simulation.on('tick', () => {
      link
        .attr('x1', (d) => d.source.x)
        .attr('y1', (d) => d.source.y)
        .attr('x2', (d) => d.target.x)
        .attr('y2', (d) => d.target.y);
      node.attr('cx', (d) => d.x).attr('cy', (d) => d.y);
      label.attr('x', (d) => d.x).attr('y', (d) => d.y);
    });

    // Once the simulation settles, fit the viewport to the graph bbox.
    simulation.on('end', () => {
      const pad = 40;
      const xs = simNodes.map((d) => d.x);
      const ys = simNodes.map((d) => d.y);
      const minX = Math.min(...xs) - pad;
      const maxX = Math.max(...xs) + pad;
      const minY = Math.min(...ys) - pad;
      const maxY = Math.max(...ys) + pad;
      const bw = maxX - minX;
      const bh = maxY - minY;
      if (bw <= 0 || bh <= 0) return;
      const scale = Math.min(width / bw, height / bh, 1);
      const tx = (width - bw * scale) / 2 - minX * scale;
      const ty = (height - bh * scale) / 2 - minY * scale;
      svg
        .transition()
        .duration(500)
        .call(zoom.transform as any, d3.zoomIdentity.translate(tx, ty).scale(scale));
    });

    svg.style('opacity', '0').transition().duration(400).style('opacity', '1');
  };

  const getSize = (): [number, number] => [
    container.clientWidth || 500,
    container.clientHeight || 400,
  ];

  const [w0, h0] = getSize();
  lastW = w0;
  lastH = h0;
  draw(w0, h0);

  // Only redraw when the container size changes by a meaningful amount,
  // and throttle so we don't thrash the simulation on every resize frame.
  let resizeTimer: any = null;
  const ro = new ResizeObserver(() => {
    const [w, h] = getSize();
    if (Math.abs(w - lastW) < 8 && Math.abs(h - lastH) < 8) return;
    if (resizeTimer) clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      lastW = w;
      lastH = h;
      draw(w, h);
    }, 200);
  });
  ro.observe(container);

  return () => {
    ro.disconnect();
    if (resizeTimer) clearTimeout(resizeTimer);
    if (activeSimulation) activeSimulation.stop();
    tooltip.remove();
    d3.select(container).selectAll('svg').remove();
  };
}
