// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-dialog — Material UI Dialog widget
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import { mountReact } from '../mount.js';

interface Action {
  label: string;
  variant?: 'text' | 'outlined' | 'contained';
}

interface MuiDialogProps {
  title: string;
  content: string;
  open?: boolean;
  actions?: Action[];
}

function MuiDialog({ title, content, open: initialOpen = true, actions }: MuiDialogProps) {
  const [open, setOpen] = useState(initialOpen);

  return (
    <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <DialogContentText>{content}</DialogContentText>
      </DialogContent>
      {actions && actions.length > 0 && (
        <DialogActions>
          {actions.map((a, i) => (
            <Button
              key={i}
              variant={a.variant ?? 'text'}
              onClick={() => setOpen(false)}
            >
              {a.label}
            </Button>
          ))}
        </DialogActions>
      )}
    </Dialog>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiDialog, data);
}
