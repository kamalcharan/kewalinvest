// frontend/src/components/visualizations/chartViewer/table/DataTable.tsx
// Table view for chart data with pagination

import React, { useState, useMemo } from 'react';
import TablePagination from './TablePagination';
import type { DataTableProps } from '../../../../types/chartViewer.types';
import { formatPrice, formatPercentage, formatTooltipLabel } from '../../../../utils/formatters';

const DataTable: React.FC<DataTableProps> = ({
  data,
  colors,
  viewMode,
  pageSize = 50
}) => {
  const [currentPage, setCurrentPage] = useState(1);

  // Calculate pagination
  const totalPages = Math.ceil(data.length / pageSize);
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = startIndex + pageSize;
  const paginatedData = useMemo(
    () => data.slice(startIndex, endIndex),
    [data, startIndex, endIndex]
  );

  // Reset to page 1 if data changes
  React.useEffect(() => {
    if (currentPage > totalPages && totalPages > 0) {
      setCurrentPage(1);
    }
  }, [data.length, currentPage, totalPages]);

  // Format value based on view mode
  const formatValue = (value: number, returnValue?: number) => {
    if (viewMode === 'returns' && returnValue !== undefined) {
      return formatPercentage(returnValue, 4);
    }
    return formatPrice(value, 4);
  };

  // Get value color for styling
  const getValueColor = (value: number, returnValue?: number) => {
    const displayValue = viewMode === 'returns' && returnValue !== undefined ? returnValue : value;
    
    if (displayValue > 0) return colors.semantic.success;
    if (displayValue < 0) return colors.semantic.error;
    return colors.utility.primaryText;
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        minHeight: '400px',
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '8px',
        overflow: 'hidden'
      }}
    >
      {/* Table Container */}
      <div style={{ flex: 1, overflow: 'auto' }}>
        <table
          style={{
            width: '100%',
            borderCollapse: 'collapse',
            fontSize: '13px'
          }}
        >
          <thead>
            <tr
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderBottom: `2px solid ${colors.utility.primaryText}10`,
                position: 'sticky',
                top: 0,
                zIndex: 1
              }}
            >
              <th
                style={{
                  padding: '14px 20px',
                  textAlign: 'left',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                Date
              </th>
              <th
                style={{
                  padding: '14px 20px',
                  textAlign: 'right',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  fontSize: '13px',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}
              >
                {viewMode === 'returns' ? 'Return %' : 'Value'}
              </th>
              {viewMode === 'price' && (
                <>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Open
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    High
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Low
                  </th>
                  <th
                    style={{
                      padding: '14px 20px',
                      textAlign: 'right',
                      fontWeight: '600',
                      color: colors.utility.primaryText,
                      fontSize: '13px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}
                  >
                    Volume
                  </th>
                </>
              )}
            </tr>
          </thead>
          <tbody>
            {paginatedData.map((row, index) => (
              <tr
                key={`${row.rawDate}-${index}`}
                style={{
                  borderBottom: `1px solid ${colors.utility.primaryText}05`,
                  backgroundColor: index % 2 === 0 
                    ? 'transparent' 
                    : colors.utility.primaryText + '03',
                  transition: 'background-color 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryText + '08';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = index % 2 === 0 
                    ? 'transparent' 
                    : colors.utility.primaryText + '03';
                }}
              >
                {/* Date Column */}
                <td
                  style={{
                    padding: '12px 20px',
                    color: colors.utility.primaryText,
                    fontWeight: '500'
                  }}
                >
                  {formatTooltipLabel(row.date)}
                </td>

                {/* Value Column */}
                <td
                  style={{
                    padding: '12px 20px',
                    textAlign: 'right',
                    color: getValueColor(row.value, row.returnValue),
                    fontWeight: '600',
                    fontFamily: 'monospace',
                    fontSize: '14px'
                  }}
                >
                  {formatValue(row.value, row.returnValue)}
                </td>

                {/* OHLC Columns (Price mode only) */}
                {viewMode === 'price' && (
                  <>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontFamily: 'monospace'
                      }}
                    >
                      {row.open != null && !isNaN(Number(row.open))
                        ? formatPrice(row.open, 2)
                        : '--'}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: colors.semantic.success,
                        fontWeight: '500',
                        fontFamily: 'monospace'
                      }}
                    >
                      {row.high != null && !isNaN(Number(row.high))
                        ? formatPrice(row.high, 2)
                        : '--'}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: colors.semantic.error,
                        fontWeight: '500',
                        fontFamily: 'monospace'
                      }}
                    >
                      {row.low != null && !isNaN(Number(row.low))
                        ? formatPrice(row.low, 2)
                        : '--'}
                    </td>
                    <td
                      style={{
                        padding: '12px 20px',
                        textAlign: 'right',
                        color: colors.utility.secondaryText,
                        fontFamily: 'monospace'
                      }}
                    >
                      {row.volume != null && !isNaN(Number(row.volume))
                        ? `${(Number(row.volume) / 1000000).toFixed(2)}M`
                        : '--'}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>

        {/* Empty State */}
        {paginatedData.length === 0 && (
          <div
            style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}
          >
            <div style={{ fontSize: '48px', marginBottom: '12px', opacity: 0.5 }}>
              📭
            </div>
            <p
              style={{
                fontSize: '14px',
                fontWeight: '500',
                margin: '0 0 4px 0',
                color: colors.utility.primaryText
              }}
            >
              No Data Available
            </p>
            <p style={{ fontSize: '12px', margin: 0 }}>
              Try adjusting your filters
            </p>
          </div>
        )}
      </div>

      {/* Pagination */}
      {data.length > pageSize && (
        <TablePagination
          currentPage={currentPage}
          totalPages={totalPages}
          totalRecords={data.length}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          colors={colors}
        />
      )}
    </div>
  );
};

export default DataTable;