// @ts-nocheck
// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mui — React mount helper
// Renders a React/MUI component inside a vanilla HTMLElement container.
// ---------------------------------------------------------------------------

import React from 'react';
import { createRoot } from 'react-dom/client';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';

const darkTheme = createTheme({ palette: { mode: 'dark' } });

/**
 * Mount a React component into a vanilla DOM container with MUI dark theme.
 * Returns a cleanup function that unmounts the React tree.
 */
export function mountReact(
  container: HTMLElement,
  Component: React.ComponentType<any>,
  props: Record<string, unknown>,
): () => void {
  const root = createRoot(container);
  root.render(
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Component {...props} />
    </ThemeProvider>,
  );
  return () => root.unmount();
}
