// frontend/src/components/monthly-tracking/MonthlyDataTable.tsx
// Reusable table component for monthly tracking data

import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface ColumnDefinition {
  header: string;
  accessor: string;
  formatter?: (value: any, row: any) => string | React.ReactNode;
  align?: 'left' | 'right' | 'center';
  width?: string;
}

interface MonthlyDataTableProps {
  data: any[];
  columns: ColumnDefinition[];
  title?: string;
  summary?: Array<{
    label: string;
    value: string | number;
    formatter?: (value: any) => string | React.ReactNode;
  }>;
}

export const MonthlyDataTable: React.FC<MonthlyDataTableProps> = ({
  data,
  columns,
  title,
  summary,
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (data.length === 0) {
    return (
      <div
        style={{
          padding: '40px',
          textAlign: 'center',
          color: colors.utility.secondaryText,
          backgroundColor: isDarkMode
            ? colors.utility.secondaryBackground
            : colors.utility.secondaryBackground,
          borderRadius: '8px',
          border: `1px solid ${colors.utility.secondaryText}20`,
        }}
      >
        No data available for the selected period
      </div>
    );
  }

  return (
    <div
      style={{
        backgroundColor: isDarkMode
          ? colors.utility.secondaryBackground
          : colors.utility.secondaryBackground,
        borderRadius: '8px',
        border: `1px solid ${colors.utility.secondaryText}20`,
        overflow: 'hidden',
      }}
    >
      {title && (
        <div
          style={{
            padding: '16px 20px',
            borderBottom: `1px solid ${colors.utility.secondaryText}20`,
          }}
        >
          <h3
            style={{
              margin: 0,
              fontSize: '16px',
              fontWeight: 600,
              color: colors.utility.primaryText,
            }}
          >
            {title}
          </h3>
        </div>
      )}

      {/* Table */}
      <div style={{ overflowX: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: isDarkMode
                  ? colors.utility.primaryBackground
                  : colors.utility.primaryBackground,
              }}
            >
              {columns.map((col, i) => (
                <th
                  key={i}
                  style={{
                    padding: '12px 16px',
                    textAlign: col.align || 'left',
                    fontSize: '13px',
                    fontWeight: 600,
                    color: colors.utility.secondaryText,
                    borderBottom: `2px solid ${colors.utility.secondaryText}20`,
                    width: col.width,
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIndex) => (
              <tr
                key={rowIndex}
                style={{
                  backgroundColor:
                    rowIndex % 2 === 0
                      ? 'transparent'
                      : isDarkMode
                      ? `${colors.utility.secondaryText}05`
                      : `${colors.utility.secondaryText}08`,
                  transition: 'background-color 0.2s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isDarkMode
                    ? `${colors.utility.secondaryText}10`
                    : `${colors.utility.secondaryText}15`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor =
                    rowIndex % 2 === 0
                      ? 'transparent'
                      : isDarkMode
                      ? `${colors.utility.secondaryText}05`
                      : `${colors.utility.secondaryText}08`;
                }}
              >
                {columns.map((col, colIndex) => {
                  const value = row[col.accessor];
                  const formattedValue = col.formatter
                    ? col.formatter(value, row)
                    : value;

                  return (
                    <td
                      key={colIndex}
                      style={{
                        padding: '12px 16px',
                        textAlign: col.align || 'left',
                        fontSize: '14px',
                        color: colors.utility.primaryText,
                        borderBottom: `1px solid ${colors.utility.secondaryText}10`,
                      }}
                    >
                      {formattedValue}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Summary Section */}
      {summary && summary.length > 0 && (
        <div
          style={{
            padding: '16px 20px',
            borderTop: `2px solid ${colors.utility.secondaryText}20`,
            backgroundColor: isDarkMode
              ? colors.utility.primaryBackground
              : colors.utility.primaryBackground,
          }}
        >
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px',
            }}
          >
            {summary.map((item, i) => (
              <div key={i}>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginBottom: '4px',
                  }}
                >
                  {item.label}
                </div>
                <div
                  style={{
                    fontSize: '16px',
                    fontWeight: 600,
                    color: colors.utility.primaryText,
                  }}
                >
                  {item.formatter
                    ? item.formatter(item.value)
                    : item.value}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
