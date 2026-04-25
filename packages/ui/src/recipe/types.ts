export interface RecipeBlockAction {
  /** Glyph or HTML entity. Examples: '▶', '+', '⧉', '✓' */
  icon: string;
  /** Tooltip text. Defaults to icon. */
  label?: string;
  /** Visual variant. */
  variant?: 'default' | 'success' | 'error';
  /** Click handler. Receives the (possibly edited) code + lang. */
  onclick: (code: string, lang: string) => void;
}
