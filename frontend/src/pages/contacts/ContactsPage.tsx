// frontend/src/pages/contacts/ContactsPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  useContacts, 
  useContactStats, 
  useBulkContactAction,
  useDeleteContact,
  useUpdateContact 
} from '../../hooks/useContacts';
import ContactSearch from '../../components/contacts/ContactSearch';
import ContactCard from '../../components/contacts/ContactCard';
import { ContactSearchParams } from '../../types/contact.types';
import { PAGINATION_DEFAULTS } from '../../constants/contact.constants';
import toastService from '../../services/toast.service';

const ContactsPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { environment } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Search and pagination state - FIXED: Default page_size to 50
  const [searchParams, setSearchParams] = useState<ContactSearchParams>({
    page: 1,
    page_size: 50, // Changed from PAGINATION_DEFAULTS.pageSize to 50
    sort_by: 'name',
    sort_order: 'asc'
  });

  // State for page input
  const [pageInputValue, setPageInputValue] = useState('1');
  const [showPageInput, setShowPageInput] = useState(false);

  // UI state
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedContactIds, setSelectedContactIds] = useState<number[]>([]);
  const [bulkActionLoading, setBulkActionLoading] = useState(false);

  // Data fetching - This will re-run when searchParams changes
  // Force new object reference to ensure React Query detects the change
  const queryParams = React.useMemo(() => ({
    ...searchParams,
    page: searchParams.page || 1,
    page_size: searchParams.page_size || 50
  }), [searchParams.page, searchParams.page_size, searchParams.sort_by, searchParams.sort_order, searchParams.search]);
  
  // Debug: Log when params change
  useEffect(() => {
    console.log('Query params changed:', queryParams);
  }, [queryParams]);
  
  const { data: contactsData, isLoading, error, refetch } = useContacts(queryParams);
  const { data: stats } = useContactStats();
  const bulkActionMutation = useBulkContactAction();
  const deleteContactMutation = useDeleteContact();
  const updateContactMutation = useUpdateContact();

  // Update page input when page changes
  useEffect(() => {
    setPageInputValue((searchParams.page || 1).toString());
  }, [searchParams.page]);

  // Handle search parameter changes
  const handleSearchParamsChange = (newParams: ContactSearchParams) => {
    setSearchParams(newParams);
    setSelectedContactIds([]);
  };

  // FIXED: Handle pagination properly
  const handlePageChange = (page: number) => {
    // Ensure page is within valid range
    if (contactsData) {
      const validPage = Math.max(1, Math.min(page, contactsData.total_pages));
      // Create completely new object to trigger re-fetch
      const newParams = {
        ...searchParams,
        page: validPage,
        page_size: searchParams.page_size || 50
      };
      setSearchParams(newParams);
      setSelectedContactIds([]);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  // Handle direct page input
  const handlePageInputSubmit = () => {
    const pageNum = parseInt(pageInputValue, 10);
    if (!isNaN(pageNum) && pageNum > 0 && contactsData && pageNum <= contactsData.total_pages) {
      handlePageChange(pageNum);
      setShowPageInput(false);
    } else {
      toastService.error(`Please enter a valid page number between 1 and ${contactsData?.total_pages || 1}`);
      setPageInputValue((searchParams.page || 1).toString());
    }
  };

  // Handle page size change
  const handlePageSizeChange = (newSize: number) => {
    const newParams = {
      ...searchParams,
      page: 1, // Reset to first page when changing page size
      page_size: newSize
    };
    setSearchParams(newParams);
    setSelectedContactIds([]);
  };

  // Handle contact selection
  const handleContactSelection = (contactId: number, selected: boolean) => {
    setSelectedContactIds(prev => {
      if (selected) {
        return [...prev, contactId];
      } else {
        return prev.filter(id => id !== contactId);
      }
    });
  };

  // Handle select all
  const handleSelectAll = () => {
    if (!contactsData?.contacts) return;
    
    const allCurrentIds = contactsData.contacts.map(c => c.id);
    const allSelected = allCurrentIds.every(id => selectedContactIds.includes(id));
    
    if (allSelected) {
      setSelectedContactIds(prev => prev.filter(id => !allCurrentIds.includes(id)));
    } else {
      setSelectedContactIds(prev => {
        const newIds = [...prev];
        allCurrentIds.forEach(id => {
          if (!newIds.includes(id)) {
            newIds.push(id);
          }
        });
        return newIds;
      });
    }
  };

  // Handle bulk actions
  const handleBulkAction = async (action: 'activate' | 'deactivate' | 'delete' | 'export') => {
    if (selectedContactIds.length === 0) {
      toastService.warning('Please select contacts to perform bulk action');
      return;
    }

    if (action === 'delete') {
      const confirmed = window.confirm(`Are you sure you want to delete ${selectedContactIds.length} selected contacts?`);
      if (!confirmed) return;
    }

    setBulkActionLoading(true);
    try {
      const result = await bulkActionMutation.mutateAsync({
        contact_ids: selectedContactIds,
        action
      });

      setSelectedContactIds([]);

      if (action === 'export' && result.export_url) {
        const link = document.createElement('a');
        link.href = result.export_url;
        link.download = `contacts_export_${Date.now()}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }

      refetch();
    } catch (error) {
      // Error handled by mutation
    } finally {
      setBulkActionLoading(false);
    }
  };

  const getSelectionStats = () => {
    if (!contactsData?.contacts) return { selected: 0, total: 0, allSelected: false };
    
    const currentPageIds = contactsData.contacts.map(c => c.id);
    const selectedOnPage = currentPageIds.filter(id => selectedContactIds.includes(id));
    
    return {
      selected: selectedContactIds.length,
      total: contactsData.total,
      selectedOnPage: selectedOnPage.length,
      totalOnPage: currentPageIds.length,
      allSelected: selectedOnPage.length === currentPageIds.length && currentPageIds.length > 0
    };
  };

  const selectionStats = getSelectionStats();

  // Handle convert to customer
  const handleConvertToCustomer = async (contactId: number) => {
    try {
      await updateContactMutation.mutateAsync({
        id: contactId,
        data: { is_customer: true }
      });
      toastService.success('Contact converted to customer successfully');
      refetch();
    } catch (error) {
      toastService.error('Failed to convert contact to customer');
    }
  };

  // Handle delete contact
  const handleDeleteContact = async (contactId: number) => {
    try {
      await deleteContactMutation.mutateAsync(contactId);
      toastService.success('Contact deleted successfully');
      refetch();
    } catch (error) {
      toastService.error('Failed to delete contact');
    }
  };

  // Icons
  const PlusIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );

  const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const CheckIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="20,6 9,17 4,12" />
    </svg>
  );

  const ChevronLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="15,18 9,12 15,6" />
    </svg>
  );

  const ChevronRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="9,18 15,12 9,6" />
    </svg>
  );

  const ChevronDoubleLeftIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="11,18 5,12 11,6" />
      <polyline points="18,18 12,12 18,6" />
    </svg>
  );

  const ChevronDoubleRightIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="13,6 19,12 13,18" />
      <polyline points="6,6 12,12 6,18" />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '24px',
        marginBottom: '24px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              width: '48px',
              height: '48px',
              borderRadius: '12px',
              backgroundColor: colors.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'white'
            }}>
              <UsersIcon />
            </div>
            
            <div>
              <h1 style={{
                margin: 0,
                fontSize: '28px',
                fontWeight: '600',
                color: colors.utility.primaryText
              }}>
                Contacts
              </h1>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: colors.utility.secondaryText
              }}>
                Manage your contact database • Environment: {environment}
              </p>
            </div>
          </div>

          <button
            onClick={() => navigate('/contacts/new')}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
            }}
          >
            <PlusIcon />
            Add Contact
          </button>
        </div>

        {/* Quick Stats */}
        {stats && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
            gap: '16px'
          }}>
            {[
              { label: 'Total Contacts', value: stats.total, color: colors.brand.primary },
              { label: 'Active', value: stats.active, color: colors.semantic.success },
              { label: 'Customers', value: stats.customers, color: colors.brand.tertiary },
              { label: 'Recent (30 days)', value: stats.recent, color: colors.semantic.info }
            ].map((stat, index) => (
              <div
                key={index}
                style={{
                  padding: '12px',
                  backgroundColor: colors.utility.primaryBackground,
                  borderRadius: '8px',
                  border: `1px solid ${colors.utility.primaryText}10`
                }}
              >
                <div style={{
                  fontSize: '20px',
                  fontWeight: '600',
                  color: stat.color,
                  marginBottom: '4px'
                }}>
                  {stat.value.toLocaleString()}
                </div>
                <div style={{
                  fontSize: '12px',
                  color: colors.utility.secondaryText
                }}>
                  {stat.label}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Search and Filters */}
      <ContactSearch
        onSearchParamsChange={handleSearchParamsChange}
        currentParams={searchParams}
        showAdvancedFilters={showAdvancedFilters}
        onToggleAdvanced={() => setShowAdvancedFilters(!showAdvancedFilters)}
      />

      {/* Bulk Actions */}
      {selectedContactIds.length > 0 && (
        <div style={{
          backgroundColor: colors.brand.primary + '10',
          border: `1px solid ${colors.brand.primary}40`,
          borderRadius: '8px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            color: colors.brand.primary
          }}>
            <CheckIcon />
            <span style={{ fontWeight: '500' }}>
              {selectionStats.selected} contact{selectionStats.selected !== 1 ? 's' : ''} selected
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              onClick={() => handleBulkAction('activate')}
              disabled={bulkActionLoading}
              style={{
                backgroundColor: colors.semantic.success,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                opacity: bulkActionLoading ? 0.6 : 1
              }}
            >
              Activate
            </button>

            <button
              onClick={() => handleBulkAction('delete')}
              disabled={bulkActionLoading}
              style={{
                backgroundColor: colors.semantic.error,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: bulkActionLoading ? 'not-allowed' : 'pointer',
                opacity: bulkActionLoading ? 0.6 : 1
              }}
            >
              Delete
            </button>

            <button
              onClick={() => setSelectedContactIds([])}
              style={{
                backgroundColor: 'transparent',
                color: colors.utility.secondaryText,
                border: `1px solid ${colors.utility.secondaryText}40`,
                borderRadius: '6px',
                padding: '6px 12px',
                fontSize: '12px',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Results Header with Page Size Selector */}
      {contactsData && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '16px',
          padding: '0 4px'
        }}>
          <h2 style={{
            margin: 0,
            fontSize: '18px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            {contactsData.total > 0 
              ? `Showing ${(((searchParams.page || 1) - 1) * (searchParams.page_size || 50)) + 1}-${Math.min((searchParams.page || 1) * (searchParams.page_size || 50), contactsData.total)} of ${contactsData.total.toLocaleString()} contacts`
              : 'No contacts found'
            }
          </h2>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            {/* Page Size Selector */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span style={{ fontSize: '14px', color: colors.utility.secondaryText }}>Show:</span>
              <select
                value={searchParams.page_size || 50}
                onChange={(e) => handlePageSizeChange(parseInt(e.target.value))}
                style={{
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `1px solid ${colors.utility.primaryText}20`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <option value="10">10</option>
                <option value="25">25</option>
                <option value="50">50</option>
                <option value="100">100</option>
                <option value="200">200</option>
              </select>
            </div>

            {contactsData.contacts.length > 0 && (
              <button
                onClick={handleSelectAll}
                style={{
                  backgroundColor: 'transparent',
                  color: colors.brand.primary,
                  border: `1px solid ${colors.brand.primary}40`,
                  borderRadius: '6px',
                  padding: '4px 8px',
                  fontSize: '12px',
                  cursor: 'pointer'
                }}
              >
                {selectionStats.allSelected ? 'Deselect All' : 'Select All'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '60px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px'
        }}>
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <div style={{
              width: '32px',
              height: '32px',
              border: `3px solid ${colors.brand.primary}20`,
              borderTop: `3px solid ${colors.brand.primary}`,
              borderRadius: '50%',
              animation: 'spin 1s linear infinite'
            }} />
            <p style={{ color: colors.utility.secondaryText }}>Loading contacts...</p>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div style={{
          padding: '40px 20px',
          backgroundColor: colors.semantic.error + '10',
          borderRadius: '12px',
          border: `1px solid ${colors.semantic.error}40`,
          textAlign: 'center'
        }}>
          <p style={{ color: colors.semantic.error, margin: '0 0 16px 0', fontSize: '16px' }}>
            Failed to load contacts
          </p>
          <button
            onClick={() => refetch()}
            style={{
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              padding: '8px 16px',
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Try Again
          </button>
        </div>
      )}

      {/* Contacts List - Single Column */}
      {contactsData && contactsData.contacts.length > 0 && (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '12px',
          marginBottom: '24px'
        }}>
          {contactsData.contacts.map((contact) => (
            <ContactCard
              key={contact.id}
              contact={contact}
              onView={() => navigate(`/contacts/${contact.id}`)}
              onEdit={() => navigate(`/contacts/${contact.id}/edit`)}
              onConvertToCustomer={() => handleConvertToCustomer(contact.id)}
              onDelete={() => handleDeleteContact(contact.id)}
              selectable={true}
              selected={selectedContactIds.includes(contact.id)}
              onSelectionChange={handleContactSelection}
            />
          ))}
        </div>
      )}

      {/* Empty State */}
      {contactsData && contactsData.contacts.length === 0 && !isLoading && (
        <div style={{
          padding: '60px 20px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          textAlign: 'center'
        }}>
          <div style={{
            width: '64px',
            height: '64px',
            backgroundColor: colors.brand.primary + '20',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px auto',
            color: colors.brand.primary
          }}>
            <UsersIcon />
          </div>
          
          <h3 style={{
            margin: '0 0 8px 0',
            fontSize: '18px',
            color: colors.utility.primaryText
          }}>
            {searchParams.search ? 'No contacts found' : 'No contacts yet'}
          </h3>
          
          <p style={{
            color: colors.utility.secondaryText,
            maxWidth: '400px',
            margin: '0 auto 20px auto'
          }}>
            {searchParams.search 
              ? 'Try adjusting your search criteria.'
              : 'Start building your contact database.'
            }
          </p>
          
          <button
            onClick={() => searchParams.search ? handleSearchParamsChange({ page: 1, page_size: 50 }) : navigate('/contacts/new')}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '12px 20px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            {searchParams.search ? 'Clear Filters' : 'Add Your First Contact'}
          </button>
        </div>
      )}

      {/* Enhanced Pagination */}
      {contactsData && contactsData.total_pages > 1 && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          padding: '20px 0'
        }}>
          {/* First Page */}
          <button
            onClick={() => handlePageChange(1)}
            disabled={(searchParams.page || 1) === 1}
            style={{
              backgroundColor: (searchParams.page || 1) !== 1 ? colors.utility.secondaryBackground : 'transparent',
              color: (searchParams.page || 1) !== 1 ? colors.utility.primaryText : colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '6px',
              padding: '8px',
              fontSize: '14px',
              cursor: (searchParams.page || 1) !== 1 ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              opacity: (searchParams.page || 1) === 1 ? 0.5 : 1
            }}
            title="First Page"
          >
            <ChevronDoubleLeftIcon />
          </button>

          {/* Previous */}
          <button
            onClick={() => handlePageChange((searchParams.page || 1) - 1)}
            disabled={!contactsData.has_prev}
            style={{
              backgroundColor: contactsData.has_prev ? colors.utility.secondaryBackground : 'transparent',
              color: contactsData.has_prev ? colors.utility.primaryText : colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: contactsData.has_prev ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <ChevronLeftIcon />
            Previous
          </button>

          {/* Page Indicator / Input */}
          {showPageInput ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <input
                type="number"
                value={pageInputValue}
                onChange={(e) => setPageInputValue(e.target.value)}
                onKeyPress={(e) => {
                  if (e.key === 'Enter') {
                    handlePageInputSubmit();
                  }
                }}
                onBlur={handlePageInputSubmit}
                min="1"
                max={contactsData.total_pages}
                style={{
                  width: '60px',
                  padding: '6px 8px',
                  backgroundColor: colors.utility.secondaryBackground,
                  color: colors.utility.primaryText,
                  border: `2px solid ${colors.brand.primary}`,
                  borderRadius: '4px',
                  fontSize: '14px',
                  textAlign: 'center'
                }}
                autoFocus
              />
              <span style={{ color: colors.utility.secondaryText, fontSize: '14px' }}>
                of {contactsData.total_pages}
              </span>
            </div>
          ) : (
            <button
              onClick={() => setShowPageInput(true)}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                border: `1px solid ${colors.utility.secondaryText}40`,
                borderRadius: '6px',
                fontSize: '14px',
                cursor: 'pointer'
              }}
            >
              Page {searchParams.page || 1} of {contactsData.total_pages}
            </button>
          )}

          {/* Next */}
          <button
            onClick={() => handlePageChange((searchParams.page || 1) + 1)}
            disabled={!contactsData.has_next}
            style={{
              backgroundColor: contactsData.has_next ? colors.utility.secondaryBackground : 'transparent',
              color: contactsData.has_next ? colors.utility.primaryText : colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '6px',
              padding: '8px 12px',
              fontSize: '14px',
              cursor: contactsData.has_next ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            Next
            <ChevronRightIcon />
          </button>

          {/* Last Page */}
          <button
            onClick={() => handlePageChange(contactsData.total_pages)}
            disabled={(searchParams.page || 1) === contactsData.total_pages}
            style={{
              backgroundColor: (searchParams.page || 1) !== contactsData.total_pages ? colors.utility.secondaryBackground : 'transparent',
              color: (searchParams.page || 1) !== contactsData.total_pages ? colors.utility.primaryText : colors.utility.secondaryText,
              border: `1px solid ${colors.utility.secondaryText}40`,
              borderRadius: '6px',
              padding: '8px',
              fontSize: '14px',
              cursor: (searchParams.page || 1) !== contactsData.total_pages ? 'pointer' : 'not-allowed',
              display: 'flex',
              alignItems: 'center',
              opacity: (searchParams.page || 1) === contactsData.total_pages ? 0.5 : 1
            }}
            title="Last Page"
          >
            <ChevronDoubleRightIcon />
          </button>
        </div>
      )}

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ContactsPage;