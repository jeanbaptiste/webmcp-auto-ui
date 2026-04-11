// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-stepper — Material UI Stepper widget
// ---------------------------------------------------------------------------

import React from 'react';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import StepContent from '@mui/material/StepContent';
import Typography from '@mui/material/Typography';
import { mountReact } from '../mount.js';

interface StepDef {
  label: string;
  description?: string;
  completed?: boolean;
}

interface MuiStepperProps {
  steps: StepDef[];
  activeStep: number;
}

function MuiStepper({ steps, activeStep }: MuiStepperProps) {
  const hasDescriptions = steps.some((s) => s.description);

  if (hasDescriptions) {
    return (
      <Box sx={{ p: 2, maxWidth: 480 }}>
        <Stepper activeStep={activeStep} orientation="vertical">
          {steps.map((step, i) => (
            <Step key={i} completed={step.completed}>
              <StepLabel>{step.label}</StepLabel>
              {step.description && (
                <StepContent>
                  <Typography variant="body2" color="text.secondary">
                    {step.description}
                  </Typography>
                </StepContent>
              )}
            </Step>
          ))}
        </Stepper>
      </Box>
    );
  }

  return (
    <Box sx={{ p: 2, width: '100%' }}>
      <Stepper activeStep={activeStep}>
        {steps.map((step, i) => (
          <Step key={i} completed={step.completed}>
            <StepLabel>{step.label}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiStepper, data);
}
