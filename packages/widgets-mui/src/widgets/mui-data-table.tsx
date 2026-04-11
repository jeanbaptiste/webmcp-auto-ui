// @ts-nocheck
// ---------------------------------------------------------------------------
// mui-data-table — Material UI DataTable widget with pagination
// ---------------------------------------------------------------------------

import React, { useState } from 'react';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TablePagination from '@mui/material/TablePagination';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import { mountReact } from '../mount.js';

interface Column {
  field: string;
  header: string;
  width?: number;
}

interface MuiDataTableProps {
  title?: string;
  columns: Column[];
  rows: Record<string, unknown>[];
}

function MuiDataTable({ title, columns, rows }: MuiDataTableProps) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const paginatedRows = rows.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  return (
    <Paper sx={{ width: '100%', overflow: 'hidden' }}>
      {title && (
        <Typography variant="h6" sx={{ p: 2 }}>
          {title}
        </Typography>
      )}
      <TableContainer sx={{ maxHeight: 480 }}>
        <Table stickyHeader size="small">
          <TableHead>
            <TableRow>
              {columns.map((col) => (
                <TableCell
                  key={col.field}
                  sx={{ fontWeight: 'bold', ...(col.width ? { width: col.width } : {}) }}
                >
                  {col.header}
                </TableCell>
              ))}
            </TableRow>
          </TableHead>
          <TableBody>
            {paginatedRows.map((row, idx) => (
              <TableRow hover key={idx}>
                {columns.map((col) => (
                  <TableCell key={col.field}>
                    {String(row[col.field] ?? '')}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <TablePagination
        component="div"
        count={rows.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={(_, p) => setPage(p)}
        onRowsPerPageChange={(e) => {
          setRowsPerPage(parseInt(e.target.value, 10));
          setPage(0);
        }}
        rowsPerPageOptions={[5, 10, 25, 50]}
      />
    </Paper>
  );
}

export function render(container: HTMLElement, data: Record<string, unknown>): () => void {
  return mountReact(container, MuiDataTable, data);
}
