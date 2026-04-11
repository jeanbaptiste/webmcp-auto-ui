// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-tabs — Material UI Tabs widget
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import Box from '@mui/material/Box';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Typography from '@mui/material/Typography';
import { mountReact } from '../mount.js';

interface TabDef {
  label: string;
  content: string;
}

interface MuiTabsProps {
  tabs: TabDef[];
}

function TabPanel({ children, value, index }: { children: React.ReactNode; value: number; index: number }) {
  if (value !== index) return null;
  return (
    <Box sx={{ p: 2 }}>
      {children}
    </Box>
  );
}

function MuiTabs({ tabs }: MuiTabsProps) {
  const [value, setValue] = useState(0);

  return (
    <Box sx={{ width: '100%' }}>
      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs value={value} onChange={(_, v) => setValue(v)}>
          {tabs.map((tab, i) => (
            <Tab key={i} label={tab.label} />
          ))}
        </Tabs>
      </Box>
      {tabs.map((tab, i) => (
        <TabPanel key={i} value={value} index={i}>
          <span>{tab.content}</span>
        </TabPanel>
      ))}
    </Box>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiTabs, data);
}
