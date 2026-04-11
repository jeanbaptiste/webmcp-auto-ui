---
widget: mui-stepper
description: Material UI stepper for multi-step workflows and progress tracking
group: mui
schema:
  type: object
  required:
    - steps
    - activeStep
  properties:
    steps:
      type: array
      description: Step definitions
      items:
        type: object
        required:
          - label
        properties:
          label:
            type: string
            description: Step label
          description:
            type: string
            description: Optional step description (enables vertical layout)
          completed:
            type: boolean
            description: Whether this step is completed
    activeStep:
      type: number
      description: Zero-based index of the currently active step
---

## When to use
For multi-step workflows, wizards, or progress indicators. Displays as horizontal steps by default; switches to vertical layout when any step has a description.

## How
1. Call `mui_webmcp_widget_display('mui-stepper', {activeStep: 1, steps: [{label: "Select plan", completed: true}, {label: "Payment info"}, {label: "Confirm"}]})`

## Common errors
- `steps` and `activeStep` are both required
- `activeStep` is zero-based (0 = first step)
- Steps with `description` trigger vertical orientation
