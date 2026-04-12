// @ts-nocheck
import { createRoughSVG, COLORS, addText } from './shared.js';

export async function render(container: HTMLElement, data: Record<string, unknown>): Promise<void | (() => void)> {
  const root = data.root as { label: string; children?: any[] };
  const title = data.title as string | undefined;
  const w = 500, h = 450;
  const margin = { top: title ? 50 : 20, right: 20, bottom: 20, left: 20 };
  const { svg, rc } = await createRoughSVG(container, w, h);

  if (title) addText(svg, w / 2, 28, title, { fontSize: 16 });

  if (!root) return () => { svg.remove(); };

  // flatten tree with positions
  type TreeNode = { label: string; children?: TreeNode[]; x?: number; y?: number; depth?: number };
  const allNodes: TreeNode[] = [];

  function layout(node: TreeNode, depth: number, xMin: number, xMax: number) {
    node.depth = depth;
    node.x = (xMin + xMax) / 2;
    node.y = margin.top + depth * 70 + 30;
    allNodes.push(node);
    if (node.children && node.children.length > 0) {
      const childW = (xMax - xMin) / node.children.length;
      node.children.forEach((child, i) => {
        layout(child, depth + 1, xMin + i * childW, xMin + (i + 1) * childW);
      });
    }
  }

  layout(root as TreeNode, 0, margin.left, w - margin.right);

  // draw edges
  function drawEdges(node: TreeNode) {
    if (node.children) {
      node.children.forEach(child => {
        svg.appendChild(rc.line(node.x!, node.y! + 12, child.x!, child.y! - 12, {
          stroke: '#999', strokeWidth: 1, roughness: 1.2,
        }));
        drawEdges(child);
      });
    }
  }
  drawEdges(root as TreeNode);

  // draw nodes
  allNodes.forEach((node, i) => {
    svg.appendChild(rc.circle(node.x!, node.y!, 24, {
      fill: COLORS[node.depth! % COLORS.length], fillStyle: 'hachure', fillWeight: 2, roughness: 1.5,
    }));
    addText(svg, node.x!, node.y! + 4, node.label, { fontSize: 9 });
  });

  return () => { svg.remove(); };
}
