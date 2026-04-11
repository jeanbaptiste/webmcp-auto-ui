// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-card — Material UI Card widget
// ---------------------------------------------------------------------------

import React from 'react';
import Card from '@mui/material/Card';
import CardMedia from '@mui/material/CardMedia';
import CardContent from '@mui/material/CardContent';
import CardActions from '@mui/material/CardActions';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import { mountReact } from '../mount.js';

interface Action {
  label: string;
  variant?: 'text' | 'outlined' | 'contained';
}

interface MuiCardProps {
  title: string;
  subtitle?: string;
  content: string;
  image?: string;
  actions?: Action[];
}

function MuiCard({ title, subtitle, content, image, actions }: MuiCardProps) {
  return (
    <Card sx={{ maxWidth: 480 }}>
      {image && (
        <CardMedia component="img" height="200" image={image} alt={title} />
      )}
      <CardContent>
        <Typography gutterBottom variant="h5" component="div">
          {title}
        </Typography>
        {subtitle && (
          <Typography variant="subtitle1" color="text.secondary">
            {subtitle}
          </Typography>
        )}
        <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
          {content}
        </Typography>
      </CardContent>
      {actions && actions.length > 0 && (
        <CardActions>
          {actions.map((a, i) => (
            <Button key={i} size="small" variant={a.variant ?? 'text'}>
              {a.label}
            </Button>
          ))}
        </CardActions>
      )}
    </Card>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiCard, data);
}
