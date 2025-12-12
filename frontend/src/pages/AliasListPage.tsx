// frontend/src/pages/AliasListPage.tsx
// Customer Alias Management - View and manage customer aliases

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAliases, useDeleteAlias } from '../hooks/useAlias';
import { toastService } from '../services/toast.service';
import {
  Link2,
  Search,
  Users,
  Star,
  Trash2,
  Eye,
  ChevronRight,
  RefreshCw,
  Plus,
  Info
} from 'lucide-react';
import type { AliasWithMembers } from '../types/alias.types';
import { Card } from '../components/common/Card';
import ConfirmationDialog from '../components/common/ConfirmationDialog';

const AliasListPage: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [searchQuery, setSearchQuery] = useState('');
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<AliasWithMembers | null>(null);

  const { data: aliasesData, isLoading, refetch } = useAliases({
    page,
    page_size: 20,
    search: searchQuery || undefined
  });

  const deleteAliasMutation = useDeleteAlias();

  const aliases = aliasesData?.data || [];
  const pagination = aliasesData?.pagination;

  const handleDelete = async () => {
    if (!deleteTarget) return;

    try {
      await deleteAliasMutation.mutateAsync(deleteTarget.id);
      toastService.success('Alias deleted successfully');
      setDeleteTarget(null);
    } catch (error: any) {
      toastService.error(error.message || 'Failed to delete alias');
    }
  };

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    return `${value.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}
      >
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}
          >
            <Link2 size={28} color={colors.brand.primary} />
            Customer Aliases
          </h1>
          <p style={{ margin: '8px 0 0', fontSize: '14px', color: colors.utility.secondaryText }}>
            Manage combined customer profiles for aggregated views
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <button
            onClick={() => refetch()}
            style={{
              padding: '10px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '10px',
              backgroundColor: 'transparent',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
            title="Refresh"
          >
            <RefreshCw size={18} color={colors.utility.secondaryText} />
          </button>
        </div>
      </div>

      {/* Info Banner */}
      <Card style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
          <Info size={20} color={colors.brand.primary} style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <p style={{ margin: 0, fontSize: '14px', color: colors.utility.primaryText, fontWeight: '500' }}>
              How Aliases Work
            </p>
            <p style={{ margin: '4px 0 0', fontSize: '13px', color: colors.utility.secondaryText, lineHeight: '1.5' }}>
              Aliases virtually combine multiple customer records that represent the same person (created from different data sources).
              View combined networth, goals, and meetings. Create aliases from the Customers page by selecting multiple profiles.
            </p>
          </div>
        </div>
      </Card>

      {/* Search Bar */}
      <Card style={{ marginBottom: '20px', padding: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: '400px' }}>
            <Search
              size={18}
              color={colors.utility.secondaryText}
              style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
            />
            <input
              type="text"
              placeholder="Search aliases..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                fontSize: '14px',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '10px',
                backgroundColor: colors.utility.secondaryBackground,
                color: colors.utility.primaryText,
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>

          <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
            {pagination ? `${pagination.total} alias${pagination.total !== 1 ? 'es' : ''}` : ''}
          </div>
        </div>
      </Card>

      {/* Alias List */}
      {isLoading ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <RefreshCw
            size={32}
            color={colors.utility.secondaryText}
            style={{ animation: 'spin 1s linear infinite' }}
          />
          <p style={{ marginTop: '16px', color: colors.utility.secondaryText }}>Loading aliases...</p>
        </Card>
      ) : aliases.length === 0 ? (
        <Card style={{ padding: '60px 20px', textAlign: 'center' }}>
          <Link2 size={48} color={colors.utility.secondaryText} style={{ opacity: 0.5 }} />
          <p
            style={{
              marginTop: '16px',
              fontSize: '16px',
              fontWeight: '600',
              color: colors.utility.primaryText
            }}
          >
            {searchQuery ? 'No aliases found' : 'No aliases yet'}
          </p>
          <p style={{ marginTop: '8px', color: colors.utility.secondaryText, fontSize: '14px' }}>
            {searchQuery
              ? `No results for "${searchQuery}"`
              : 'Create your first alias from the Customers page'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => navigate('/customers')}
              style={{
                marginTop: '20px',
                padding: '12px 24px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: colors.brand.primary,
                color: '#FFF',
                cursor: 'pointer',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Plus size={18} />
              Go to Customers
            </button>
          )}
        </Card>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {aliases.map((alias) => (
            <Card
              key={alias.id}
              style={{
                padding: '20px',
                cursor: 'pointer',
                transition: 'all 0.15s ease'
              }}
              onClick={() => navigate(`/aliases/${alias.id}`)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                {/* Left side - Alias info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <div
                      style={{
                        width: '40px',
                        height: '40px',
                        borderRadius: '10px',
                        backgroundColor: colors.brand.primary + '15',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        flexShrink: 0
                      }}
                    >
                      <Link2 size={20} color={colors.brand.primary} />
                    </div>
                    <div style={{ minWidth: 0 }}>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: '16px',
                          fontWeight: '600',
                          color: colors.utility.primaryText,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}
                      >
                        {alias.alias_name}
                      </h3>
                      {alias.primary_customer_name && (
                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginTop: '4px',
                            fontSize: '13px',
                            color: colors.utility.secondaryText
                          }}
                        >
                          <Star size={12} color={colors.brand.primary} />
                          <span>Primary: {alias.primary_customer_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {alias.description && (
                    <p
                      style={{
                        margin: '8px 0 0 52px',
                        fontSize: '13px',
                        color: colors.utility.secondaryText,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}
                    >
                      {alias.description}
                    </p>
                  )}

                  {/* Stats Row */}
                  <div
                    style={{
                      display: 'flex',
                      gap: '24px',
                      marginTop: '12px',
                      marginLeft: '52px'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <Users size={14} color={colors.utility.secondaryText} />
                      <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                        {alias.member_count} member{alias.member_count !== 1 ? 's' : ''}
                      </span>
                    </div>
                    <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                      Created {formatDate(alias.created_at)}
                    </div>
                  </div>
                </div>

                {/* Right side - AUM and actions */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexShrink: 0 }}>
                  {/* AUM */}
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>Combined AUM</div>
                    <div
                      style={{
                        fontSize: '18px',
                        fontWeight: '700',
                        color: alias.total_aum > 0 ? colors.status.success : colors.utility.secondaryText
                      }}
                    >
                      {alias.total_aum > 0 ? formatCurrency(alias.total_aum) : '-'}
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/aliases/${alias.id}`);
                      }}
                      style={{
                        padding: '8px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="View Details"
                    >
                      <Eye size={16} color={colors.utility.secondaryText} />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(alias);
                      }}
                      style={{
                        padding: '8px',
                        border: `1px solid ${colors.status.error}30`,
                        borderRadius: '8px',
                        backgroundColor: 'transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title="Delete Alias"
                    >
                      <Trash2 size={16} color={colors.status.error} />
                    </button>
                  </div>

                  <ChevronRight size={20} color={colors.utility.secondaryText} />
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Pagination */}
      {pagination && pagination.total_pages > 1 && (
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            gap: '8px',
            marginTop: '24px'
          }}
        >
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              cursor: page === 1 ? 'not-allowed' : 'pointer',
              opacity: page === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>
          <span
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}
          >
            Page {page} of {pagination.total_pages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(pagination.total_pages, p + 1))}
            disabled={page === pagination.total_pages}
            style={{
              padding: '8px 16px',
              fontSize: '14px',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              backgroundColor: 'transparent',
              color: colors.utility.primaryText,
              cursor: page === pagination.total_pages ? 'not-allowed' : 'pointer',
              opacity: page === pagination.total_pages ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmationDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Alias"
        description={`Are you sure you want to delete the alias "${deleteTarget?.alias_name}"? This action cannot be undone. Individual customer records will not be affected.`}
        confirmText="Delete"
        cancelText="Cancel"
        type="error"
        isLoading={deleteAliasMutation.isPending}
      />

      <style>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AliasListPage;
