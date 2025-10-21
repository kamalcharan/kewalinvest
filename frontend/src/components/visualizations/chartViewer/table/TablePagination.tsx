// frontend/src/components/visualizations/chartViewer/table/TablePagination.tsx
// Pagination controls for data table

import React from 'react';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react';
import type { TablePaginationProps } from '../../../../types/chartViewer.types';

const TablePagination: React.FC<TablePaginationProps> = ({
  currentPage,
  totalPages,
  totalRecords,
  pageSize,
  onPageChange,
  colors
}) => {
  const startRecord = (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalRecords);

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      onPageChange(page);
    }
  };

  // Navigation button component
  const NavButton = ({
    onClick,
    disabled,
    icon,
    label
  }: {
    onClick: () => void;
    disabled: boolean;
    icon: React.ReactNode;
    label: string;
  }) => (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      title={label}
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '6px 10px',
        backgroundColor: disabled 
          ? colors.utility.primaryBackground 
          : colors.brand.primary,
        color: disabled 
          ? colors.utility.secondaryText 
          : 'white',
        border: 'none',
        borderRadius: '4px',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontSize: '12px',
        fontWeight: '500',
        transition: 'all 0.2s ease',
        opacity: disabled ? 0.5 : 1,
        minWidth: '36px',
        minHeight: '32px'
      }}
      onMouseEnter={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.brand.secondary;
        }
      }}
      onMouseLeave={(e) => {
        if (!disabled) {
          e.currentTarget.style.backgroundColor = colors.brand.primary;
        }
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 20px',
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.secondaryBackground,
        flexWrap: 'wrap',
        gap: '12px'
      }}
    >
      {/* Record Info */}
      <div
        style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          fontWeight: '500'
        }}
      >
        Showing {startRecord.toLocaleString()} to {endRecord.toLocaleString()} of{' '}
        {totalRecords.toLocaleString()} records
      </div>

      {/* Navigation Controls */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}
      >
        {/* First Page */}
        <NavButton
          onClick={() => handlePageChange(1)}
          disabled={currentPage === 1}
          icon={<ChevronsLeft size={16} />}
          label="First page"
        />

        {/* Previous Page */}
        <NavButton
          onClick={() => handlePageChange(currentPage - 1)}
          disabled={currentPage === 1}
          icon={<ChevronLeft size={16} />}
          label="Previous page"
        />

        {/* Page Numbers */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            margin: '0 8px'
          }}
        >
          {/* Show page numbers with ellipsis for large page counts */}
          {totalPages <= 7 ? (
            // Show all pages if 7 or fewer
            Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => handlePageChange(page)}
                aria-label={`Go to page ${page}`}
                aria-current={currentPage === page ? 'page' : undefined}
                style={{
                  padding: '6px 12px',
                  backgroundColor: currentPage === page 
                    ? colors.brand.primary 
                    : colors.utility.primaryBackground,
                  color: currentPage === page 
                    ? 'white' 
                    : colors.utility.primaryText,
                  border: `1px solid ${
                    currentPage === page 
                      ? colors.brand.primary 
                      : colors.utility.primaryText + '20'
                  }`,
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: '12px',
                  fontWeight: currentPage === page ? '600' : '500',
                  transition: 'all 0.2s ease',
                  minWidth: '36px',
                  minHeight: '32px'
                }}
                onMouseEnter={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
                    e.currentTarget.style.borderColor = colors.brand.primary;
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentPage !== page) {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                    e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                  }
                }}
              >
                {page}
              </button>
            ))
          ) : (
            // Show pages with ellipsis for many pages
            <>
              {currentPage > 3 && (
                <>
                  <PageButton page={1} currentPage={currentPage} handlePageChange={handlePageChange} colors={colors} />
                  <span style={{ color: colors.utility.secondaryText, padding: '0 4px' }}>...</span>
                </>
              )}
              
              {Array.from({ length: 5 }, (_, i) => {
                let page: number;
                if (currentPage <= 3) {
                  page = i + 1;
                } else if (currentPage >= totalPages - 2) {
                  page = totalPages - 4 + i;
                } else {
                  page = currentPage - 2 + i;
                }
                return page;
              })
                .filter(page => page > 0 && page <= totalPages)
                .map(page => (
                  <PageButton
                    key={page}
                    page={page}
                    currentPage={currentPage}
                    handlePageChange={handlePageChange}
                    colors={colors}
                  />
                ))}

              {currentPage < totalPages - 2 && (
                <>
                  <span style={{ color: colors.utility.secondaryText, padding: '0 4px' }}>...</span>
                  <PageButton page={totalPages} currentPage={currentPage} handlePageChange={handlePageChange} colors={colors} />
                </>
              )}
            </>
          )}
        </div>

        {/* Next Page */}
        <NavButton
          onClick={() => handlePageChange(currentPage + 1)}
          disabled={currentPage >= totalPages}
          icon={<ChevronRight size={16} />}
          label="Next page"
        />

        {/* Last Page */}
        <NavButton
          onClick={() => handlePageChange(totalPages)}
          disabled={currentPage >= totalPages}
          icon={<ChevronsRight size={16} />}
          label="Last page"
        />
      </div>

      {/* Page Info */}
      <div
        style={{
          fontSize: '12px',
          color: colors.utility.primaryText,
          fontWeight: '600',
          minWidth: '100px',
          textAlign: 'right'
        }}
      >
        Page {currentPage} of {totalPages}
      </div>
    </div>
  );
};

// Page number button component
const PageButton = ({
  page,
  currentPage,
  handlePageChange,
  colors
}: {
  page: number;
  currentPage: number;
  handlePageChange: (page: number) => void;
  colors: any;
}) => (
  <button
    onClick={() => handlePageChange(page)}
    aria-label={`Go to page ${page}`}
    aria-current={currentPage === page ? 'page' : undefined}
    style={{
      padding: '6px 12px',
      backgroundColor: currentPage === page 
        ? colors.brand.primary 
        : colors.utility.primaryBackground,
      color: currentPage === page 
        ? 'white' 
        : colors.utility.primaryText,
      border: `1px solid ${
        currentPage === page 
          ? colors.brand.primary 
          : colors.utility.primaryText + '20'
      }`,
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '12px',
      fontWeight: currentPage === page ? '600' : '500',
      transition: 'all 0.2s ease',
      minWidth: '36px',
      minHeight: '32px'
    }}
    onMouseEnter={(e) => {
      if (currentPage !== page) {
        e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
        e.currentTarget.style.borderColor = colors.brand.primary;
      }
    }}
    onMouseLeave={(e) => {
      if (currentPage !== page) {
        e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
        e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
      }
    }}
  >
    {page}
  </button>
);

export default TablePagination;