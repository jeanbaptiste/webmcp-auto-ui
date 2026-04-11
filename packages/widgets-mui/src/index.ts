// ---------------------------------------------------------------------------
// @webmcp-auto-ui/widgets-mui — Public API
// ---------------------------------------------------------------------------

export { muiServer } from './server.js';

// Mount helper (for custom composition)
export { mountReact } from './mount.js';

// Individual renderers (for custom server composition)
export { render as renderCard } from './widgets/mui-card.js';
export { render as renderDataTable } from './widgets/mui-data-table.js';
export { render as renderForm } from './widgets/mui-form.js';
export { render as renderDialog } from './widgets/mui-dialog.js';
export { render as renderStepper } from './widgets/mui-stepper.js';
export { render as renderTabs } from './widgets/mui-tabs.js';
