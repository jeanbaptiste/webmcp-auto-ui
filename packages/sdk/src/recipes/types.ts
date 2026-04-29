/**
 * Shared types for the RecipeModal code-block execution feature.
 */

export interface RecipeData {
  id?: string;
  name?: string;
  description?: string;
  when?: string;
  components_used?: string[];
  servers?: string[];
  serverName?: string;
  layout?: { type: string; columns?: number; arrangement?: string };
  body?: string;
}

export type SegmentType = 'markdown' | 'code';

export interface ParsedSegment {
  type: SegmentType;
  content: string;
  /** Language tag for code segments (e.g. "js", "python"). Undefined for markdown. */
  lang?: string;
}

export type RunStatus = 'idle' | 'running' | 'done' | 'error';

export interface RunLog {
  /** Offset in ms since run start. */
  t: number;
  msg: string;
}

export interface RunStats {
  durationMs?: number;
  tokens?: number;
}

export interface RunResult {
  status: RunStatus;
  startedAt?: number;
  durationMs?: number;
  tokens?: number;
  output?: unknown;
  error?: string;
  logs: RunLog[];
  /**
   * Set when the executed snippet was a `*widget_display({name, params})`
   * call. The runner does not call the MCP tool in that case — instead it
   * exposes the parsed widget to the host so it can be mounted live.
   */
  widget?: { name: string; params: Record<string, unknown> };
  /**
   * Set when the executed JS snippet called `widget(name, params)` one or
   * more times via the in-sandbox helper. Each call is captured in order
   * so the host can mount them stacked in the same run panel.
   */
  widgets?: Array<{ name: string; params: Record<string, unknown> }>;
}

export interface RunTab {
  id: string;
  label: string;
  lang: string;
  code: string;
  result: RunResult;
}
