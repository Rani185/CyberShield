import React from 'react';

/**
 * Generic data table.
 *
 * Props:
 *  - columns  Array<{ key, label, render?, className? }>
 *  - data     Array<object>
 *  - onRowClick (row) => void   (optional)
 *  - keyField  string  — field to use as React key (default: 'id')
 *  - emptyMessage string
 */
export default function Table({
  columns = [],
  data = [],
  onRowClick,
  keyField = 'id',
  emptyMessage = 'No data available',
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={`table-header text-left first:pl-4 ${col.className || ''}`}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="text-center py-12 text-text-muted text-sm"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row) => (
              <tr
                key={row[keyField]}
                onClick={() => onRowClick && onRowClick(row)}
                className={`border-b border-subtle hover:bg-subtle/30 transition-colors duration-100 ${
                  onRowClick ? 'cursor-pointer' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className={`px-4 py-3 text-text-primary ${col.className || ''}`}
                  >
                    {col.render ? col.render(row[col.key], row) : row[col.key] ?? '—'}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
