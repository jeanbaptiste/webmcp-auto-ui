// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-form — Material UI Form widget
// ---------------------------------------------------------------------------

import React, { useState, useCallback } from 'react';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import FormControlLabel from '@mui/material/FormControlLabel';
import Checkbox from '@mui/material/Checkbox';
import Typography from '@mui/material/Typography';
import { mountReact } from '../mount.js';

interface FieldDef {
  name: string;
  type: 'text' | 'number' | 'select' | 'checkbox';
  label: string;
  options?: string[];
  value?: unknown;
}

interface MuiFormProps {
  title?: string;
  fields: FieldDef[];
}

function MuiForm({ title, fields }: MuiFormProps) {
  const [values, setValues] = useState<Record<string, unknown>>(() => {
    const init: Record<string, unknown> = {};
    for (const f of fields) {
      init[f.name] = f.value ?? (f.type === 'checkbox' ? false : '');
    }
    return init;
  });

  const handleChange = useCallback((name: string, val: unknown) => {
    setValues((prev) => ({ ...prev, [name]: val }));
  }, []);

  return (
    <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2, maxWidth: 480 }}>
      {title && (
        <Typography variant="h6">{title}</Typography>
      )}
      {fields.map((f) => {
        switch (f.type) {
          case 'checkbox':
            return (
              <FormControlLabel
                key={f.name}
                control={
                  <Checkbox
                    checked={!!values[f.name]}
                    onChange={(e) => handleChange(f.name, e.target.checked)}
                  />
                }
                label={f.label}
              />
            );
          case 'select':
            return (
              <TextField
                key={f.name}
                select
                label={f.label}
                value={values[f.name] ?? ''}
                onChange={(e) => handleChange(f.name, e.target.value)}
                size="small"
                fullWidth
              >
                {(f.options ?? []).map((opt) => (
                  <MenuItem key={opt} value={opt}>
                    {opt}
                  </MenuItem>
                ))}
              </TextField>
            );
          case 'number':
            return (
              <TextField
                key={f.name}
                type="number"
                label={f.label}
                value={values[f.name] ?? ''}
                onChange={(e) => handleChange(f.name, Number(e.target.value))}
                size="small"
                fullWidth
              />
            );
          default:
            return (
              <TextField
                key={f.name}
                label={f.label}
                value={values[f.name] ?? ''}
                onChange={(e) => handleChange(f.name, e.target.value)}
                size="small"
                fullWidth
              />
            );
        }
      })}
    </Box>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiForm, data);
}
