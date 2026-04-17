/**
 * export-widget.ts — contextual export utility for widgets
 * Determines the best export format based on widget type and triggers a file download.
 */

import { toPng } from 'html-to-image';

const TARGET_PNG_WIDTH = 2048;

// ── helpers ──────────────────────────────────────────────────────────────────

function timestamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
}

function filename(type: string, ext: string): string {
  return `${type}_${timestamp()}.${ext}`;
}

/**
 * Download a file. Accepts either a data: URL or plain text content.
 */
function downloadFile(content: string, name: string, mimeType = 'text/plain'): void {
  const a = document.createElement('a');
  if (content.startsWith('data:')) {
    a.href = content;
  } else {
    const blob = new Blob([content], { type: mimeType });
    a.href = URL.createObjectURL(blob);
  }
  a.download = name;
  a.click();
}

// ── CSV ───────────────────────────────────────────────────────────────────────

/** Escape a cell value for CSV (RFC 4180). */
function csvCell(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function csvRow(cells: unknown[]): string {
  return cells.map(csvCell).join(',');
}

function exportCsv(type: string, data: Record<string, unknown>): void {
  let lines: string[] = [];

  if (type === 'data-table') {
    const columns = (data.columns as string[] | undefined) ?? [];
    const rows = (data.rows as (Record<string, unknown> | unknown[])[]) ?? [];
    lines.push(csvRow(columns));
    for (const row of rows) {
      if (Array.isArray(row)) {
        lines.push(csvRow(row));
      } else {
        lines.push(csvRow(columns.map((c) => (row as Record<string, unknown>)[c])));
      }
    }
  } else if (type === 'grid-data') {
    const headers = (data.headers as string[] | undefined) ?? [];
    const rows = (data.rows as unknown[][] | undefined) ?? [];
    lines.push(csvRow(headers));
    for (const row of rows) lines.push(csvRow(row));
  } else if (type === 'kv') {
    lines.push(csvRow(['key', 'value']));
    const items = (data.items as { key: unknown; value: unknown }[] | undefined) ?? [];
    for (const item of items) lines.push(csvRow([item.key, item.value]));
  } else if (type === 'list') {
    lines.push(csvRow(['value']));
    const items = (data.items as unknown[] | undefined) ?? [];
    for (const item of items) {
      if (typeof item === 'object' && item !== null && 'label' in item) {
        lines.push(csvRow([(item as { label: unknown }).label]));
      } else {
        lines.push(csvRow([item]));
      }
    }
  }

  downloadFile(lines.join('\r\n'), filename(type, 'csv'), 'text/csv;charset=utf-8');
}

// ── PNG via html-to-image ─────────────────────────────────────────────────────

async function exportPng(type: string, containerEl: HTMLElement): Promise<void> {
  const name = filename(type, 'png');
  // Use scroll dimensions to capture the FULL content, not just the visible viewport.
  // Widgets like data-table can overflow horizontally; clientWidth would crop them.
  const scrollW = Math.max(containerEl.scrollWidth, containerEl.clientWidth, 1);
  const scrollH = Math.max(containerEl.scrollHeight, containerEl.clientHeight, 1);
  const pixelRatio = TARGET_PNG_WIDTH / scrollW;

  try {
    const dataUrl = await toPng(containerEl, {
      pixelRatio,
      width: scrollW,
      height: scrollH,
      cacheBust: true,
      style: {
        // Force children visibility inside the cloned node so overflow content renders
        overflow: 'visible',
      },
    });
    downloadFile(dataUrl, name);
  } catch (err) {
    console.error('[exportWidget] PNG export failed for type', type, err);
    alert(`Export PNG impossible : ${err instanceof Error ? err.message : String(err)}`);
  }
}

// ── Markdown ──────────────────────────────────────────────────────────────────

function exportMarkdown(type: string, data: Record<string, unknown>): void {
  let content = '';

  if (type === 'text') {
    content = String((data.content ?? data.text) ?? '');
  } else if (type === 'code') {
    const lang = String(data.language ?? '');
    const code = String(data.code ?? data.content ?? '');
    content = `\`\`\`${lang}\n${code}\n\`\`\``;
  } else if (type === 'log') {
    const entries = (data.entries as unknown[] | undefined) ?? [];
    content = entries.map((e) => (typeof e === 'object' ? JSON.stringify(e) : String(e))).join('\n');
  }

  downloadFile(content, filename(type, 'md'), 'text/markdown;charset=utf-8');
}

// ── JSON ──────────────────────────────────────────────────────────────────────

function exportJson(type: string, data: Record<string, unknown>): void {
  const content = JSON.stringify(data, null, 2);
  downloadFile(content, filename(type, 'json'), 'application/json');
}

// ── HTML (js-sandbox) ─────────────────────────────────────────────────────────

function exportHtml(type: string, data: Record<string, unknown>, containerEl?: HTMLElement): void {
  // Try to grab the iframe srcdoc/src first
  const iframeEl = containerEl?.querySelector('iframe');
  let content = '';
  if (iframeEl) {
    try {
      content = iframeEl.contentDocument?.documentElement?.outerHTML ?? '';
    } catch {
      // cross-origin — fall back to data
    }
  }
  if (!content) {
    content = String(data.html ?? data.source ?? data.content ?? '');
  }
  downloadFile(content, filename(type, 'html'), 'text/html;charset=utf-8');
}

// ── Gallery / Carousel (JSON of image URLs) ──────────────────────────────────

function exportImageUrls(type: string, data: Record<string, unknown>): void {
  const items = (data.items as unknown[] | undefined) ?? (data.images as unknown[] | undefined) ?? [];
  const urls = items.map((item) => {
    if (typeof item === 'string') return item;
    if (typeof item === 'object' && item !== null) {
      return (item as Record<string, unknown>).url ?? (item as Record<string, unknown>).src ?? item;
    }
    return item;
  });
  const content = JSON.stringify({ type, urls }, null, 2);
  downloadFile(content, filename(type, 'json'), 'application/json');
}

// ── Export Format types ───────────────────────────────────────────────────────

export interface ExportFormat {
  id: string;       // 'csv', 'png', 'json', 'md', 'html'
  label: string;    // 'CSV', 'PNG', 'JSON', 'Markdown', 'HTML'
  icon: string;     // emoji or unicode
}

const CSV_FMT:  ExportFormat = { id: 'csv',  label: 'CSV',      icon: '📊' };
const PNG_FMT:  ExportFormat = { id: 'png',  label: 'PNG',      icon: '📷' };
const JSON_FMT: ExportFormat = { id: 'json', label: 'JSON',     icon: '📋' };
const MD_FMT:   ExportFormat = { id: 'md',   label: 'Markdown', icon: '📝' };
const HTML_FMT: ExportFormat = { id: 'html', label: 'HTML',     icon: '🌐' };

/**
 * Return the list of export formats available for a given widget type.
 */
export function getExportFormats(type: string, containerEl?: HTMLElement): ExportFormat[] {
  const base: ExportFormat[] = [PNG_FMT, JSON_FMT];
  switch (type) {
    case 'data-table':
    case 'grid-data':
    case 'kv':
    case 'list':
      return [CSV_FMT, ...base];
    case 'text':
    case 'code':
    case 'log':
      return [MD_FMT, ...base];
    case 'js-sandbox':
      return [HTML_FMT, ...base];
    default:
      return base;
  }
}

/**
 * Export a widget in a specific format chosen by the user.
 */
export async function exportWidgetAs(
  format: string,
  type: string,
  data: Record<string, unknown>,
  containerEl?: HTMLElement
): Promise<void> {
  switch (format) {
    case 'csv':
      exportCsv(type, data);
      break;
    case 'png':
      if (containerEl) await exportPng(type, containerEl);
      else console.warn('[exportWidgetAs] containerEl required for PNG export');
      break;
    case 'md':
      exportMarkdown(type, data);
      break;
    case 'html':
      exportHtml(type, data, containerEl);
      break;
    case 'json':
    default:
      exportJson(type, data);
      break;
  }
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Export a widget's data in the most appropriate format for its type.
 * @deprecated Use getExportFormats() + exportWidgetAs() for format selection modal.
 *
 * @param type       Widget type identifier (e.g. "data-table", "chart", "text")
 * @param data       The widget's data object
 * @param containerEl Optional DOM container — required for PNG exports
 */
export async function exportWidget(
  type: string,
  data: Record<string, unknown>,
  containerEl?: HTMLElement
): Promise<void> {
  switch (type) {
    // ── CSV ──
    case 'data-table':
    case 'grid-data':
    case 'kv':
    case 'list':
      exportCsv(type, data);
      break;

    // ── PNG ──
    case 'chart':
    case 'chart-rich':
    case 'sankey':
    case 'd3':
    case 'hemicycle':
    case 'map':
      if (containerEl) {
        await exportPng(type, containerEl);
      } else {
        console.warn('[exportWidget] containerEl required for PNG export of type:', type);
      }
      break;

    // ── Markdown ──
    case 'text':
    case 'code':
    case 'log':
      exportMarkdown(type, data);
      break;

    // ── HTML ──
    case 'js-sandbox':
      exportHtml(type, data, containerEl);
      break;

    // ── Image URL lists ──
    case 'gallery':
    case 'carousel':
      exportImageUrls(type, data);
      break;

    // ── JSON (everything else) ──
    case 'json-viewer':
    case 'profile':
    case 'stat-card':
    case 'stat':
    case 'tags':
    case 'alert':
    case 'actions':
    case 'cards':
    case 'timeline':
    case 'trombinoscope':
    default:
      exportJson(type, data);
      break;
  }
}
