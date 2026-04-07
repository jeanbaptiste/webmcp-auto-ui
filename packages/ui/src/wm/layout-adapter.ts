/**
 * Layout adapter — global singleton that lets external code (agent tools)
 * trigger move/resize/style operations on whatever layout is currently active.
 *
 * The active layout component (e.g. FlexGrid) registers its callbacks on mount
 * and unregisters on destroy. Tools call through this adapter without knowing
 * which layout implementation is in use.
 */

type MoveCallback   = (id: string, x: number, y: number) => void;
type ResizeCallback = (id: string, w: number, h: number) => void;
type StyleCallback  = (id: string, styles: Record<string, string>) => void;

let _move:   MoveCallback   | null = null;
let _resize: ResizeCallback | null = null;
let _style:  StyleCallback  | null = null;

export const layoutAdapter = {
  register(cbs: { move?: MoveCallback; resize?: ResizeCallback; style?: StyleCallback }) {
    if (cbs.move)   _move   = cbs.move;
    if (cbs.resize) _resize = cbs.resize;
    if (cbs.style)  _style  = cbs.style;
  },
  unregister() { _move = null; _resize = null; _style = null; },
  move  (id: string, x: number, y: number)          { _move?.(id, x, y); },
  resize(id: string, w: number, h: number)           { _resize?.(id, w, h); },
  style (id: string, styles: Record<string, string>) { _style?.(id, styles); },
};
