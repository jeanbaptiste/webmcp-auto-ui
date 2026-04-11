// @ts-nocheck
// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mui — WebMCP Server
// Material UI widgets rendered via React in vanilla containers
// ---------------------------------------------------------------------------

import { createWebMcpServer } from '@webmcp-auto-ui/core';

import cardRecipe from './recipes/mui-card.md?raw';
import dataTableRecipe from './recipes/mui-data-table.md?raw';
import formRecipe from './recipes/mui-form.md?raw';
import dialogRecipe from './recipes/mui-dialog.md?raw';
import stepperRecipe from './recipes/mui-stepper.md?raw';
import tabsRecipe from './recipes/mui-tabs.md?raw';

import { render as renderCard } from './widgets/mui-card.js';
import { render as renderDataTable } from './widgets/mui-data-table.js';
import { render as renderForm } from './widgets/mui-form.js';
import { render as renderDialog } from './widgets/mui-dialog.js';
import { render as renderStepper } from './widgets/mui-stepper.js';
import { render as renderTabs } from './widgets/mui-tabs.js';

export const muiServer = createWebMcpServer('mui', {
  description:
    'Material UI widgets (card, data table, form, dialog, stepper, tabs) — React components with dark theme',
});

muiServer.registerWidget(cardRecipe, renderCard);
muiServer.registerWidget(dataTableRecipe, renderDataTable);
muiServer.registerWidget(formRecipe, renderForm);
muiServer.registerWidget(dialogRecipe, renderDialog);
muiServer.registerWidget(stepperRecipe, renderStepper);
muiServer.registerWidget(tabsRecipe, renderTabs);
