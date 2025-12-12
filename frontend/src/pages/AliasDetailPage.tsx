// frontend/src/pages/AliasDetailPage.tsx
// Detailed view of a customer alias with aggregated portfolio, goals, and meetings

import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import {
  useAlias,
  useAliasPortfolio,
  useAliasAssetAllocation,
  useAliasGoals,
  useAliasMeetings,
  useUpdateAlias,
  useRemoveAliasMembers
} from '../hooks/useAlias';
import { toastService } from '../services/toast.service';
import {
  Link2,
  ArrowLeft,
  Star,
  Users,
  TrendingUp,
  Target,
  Calendar,
  Briefcase,
  Edit2,
  UserMinus,
  UserPlus,
  ExternalLink,
  RefreshCw,
  CheckCircle,
  AlertTriangle,
  Clock
} from 'lucide-react';
import { EditAliasModal } from '../components/alias/EditAliasModal';
import { AddMembersModal } from '../components/alias/AddMembersModal';

const AliasDetailPage: React.FC = () => {
  const { aliasId } = useParams<{ aliasId: string }>();
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [activeTab, setActiveTab] = useState<'portfolio' | 'goals' | 'meetings'>('portfolio');
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAddMembersModal, setShowAddMembersModal] = useState(false);

  const { data: alias, isLoading: aliasLoading, refetch: refetchAlias } = useAlias(aliasId ? parseInt(aliasId) : null);
  const { data: portfolio, isLoading: portfolioLoading } = useAliasPortfolio(aliasId ? parseInt(aliasId) : null);
  const { data: assetAllocation } = useAliasAssetAllocation(aliasId ? parseInt(aliasId) : null);
  const { data: goals } = useAliasGoals(aliasId ? parseInt(aliasId) : null);
  const { data: meetings } = useAliasMeetings(aliasId ? parseInt(aliasId) : null);

  const updateAliasMutation = useUpdateAlias();
  const removeMembers = useRemoveAliasMembers();

  const formatCurrency = (value: number) => {
    if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
    if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
    return `${value.toLocaleString('en-IN')}`;
  };

  const formatPercent = (value: number) => {
    return `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`;
  };

  const handleSetPrimary = async (customerId: number) => {
    if (!aliasId) return;
    try {
      await updateAliasMutation.mutateAsync({
        aliasId: parseInt(aliasId),
        request: { primary_customer_id: customerId }
      });
      toastService.success('Primary customer updated');
    } catch (error: any) {
      toastService.error(error.message || 'Failed to update primary customer');
    }
  };

  const handleRemoveMember = async (customerId: number, customerName: string) => {
    if (!aliasId || !alias) return;

    if (alias.member_count <= 2) {
      toastService.error('Cannot remove member. Alias must have at least 2 members.');
      return;
    }

    try {
      await removeMembers.mutateAsync({
        aliasId: parseInt(aliasId),
        customerIds: [customerId]
      });
      toastService.success(`${customerName} removed from alias`);
    } catch (error: any) {
      toastService.error(error.message || 'Failed to remove member');
    }
  };

  if (aliasLoading) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <RefreshCw
          size={32}
          color={colors.utility.secondaryText}
          style={{ animation: 'spin 1s linear infinite' }}
        />
        <p style={{ marginTop: '16px', color: colors.utility.secondaryText }}>Loading alias...</p>
        <style>{`
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!alias) {
    return (
      <div style={{ padding: '24px', textAlign: 'center' }}>
        <Link2 size={48} color={colors.utility.secondaryText} style={{ opacity: 0.5 }} />
        <p style={{ marginTop: '16px', fontSize: '16px', color: colors.utility.primaryText }}>
          Alias not found
        </p>
        <button
          onClick={() => navigate('/aliases')}
          style={{
            marginTop: '16px',
            padding: '10px 20px',
            fontSize: '14px',
            border: 'none',
            borderRadius: '8px',
            backgroundColor: colors.brand.primary,
            color: '#FFF',
            cursor: 'pointer'
          }}
        >
          Back to Aliases
        </button>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', maxWidth: '1400px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <button
          onClick={() => navigate('/aliases')}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 0',
            border: 'none',
            background: 'none',
            color: colors.utility.secondaryText,
            cursor: 'pointer',
            fontSize: '14px',
            marginBottom: '16px'
          }}
        >
          <ArrowLeft size={18} />
          Back to Aliases
        </button>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '14px',
                backgroundColor: colors.brand.primary + '15',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Link2 size={28} color={colors.brand.primary} />
            </div>
            <div>
              <h1
                style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: '700',
                  color: colors.utility.primaryText
                }}
              >
                {alias.alias_name}
              </h1>
              {alias.description && (
                <p style={{ margin: '4px 0 0', fontSize: '14px', color: colors.utility.secondaryText }}>
                  {alias.description}
                </p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowEditModal(true)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                border: `1px solid ${colors.utility.primaryText}20`,
                borderRadius: '10px',
                backgroundColor: 'transparent',
                color: colors.utility.primaryText,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Edit2 size={16} />
              Edit
            </button>
            <button
              onClick={() => setShowAddMembersModal(true)}
              style={{
                padding: '10px 16px',
                fontSize: '14px',
                fontWeight: '600',
                border: 'none',
                borderRadius: '10px',
                backgroundColor: colors.semantic.success,
                color: '#FFF',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <UserPlus size={16} />
              Add Members
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}
      >
        {/* Combined AUM */}
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Briefcase size={20} color={colors.brand.primary} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Combined AUM</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {portfolio ? formatCurrency(portfolio.total_current_value) : '-'}
          </div>
          {portfolio && portfolio.total_return_percentage !== 0 && (
            <div
              style={{
                marginTop: '4px',
                fontSize: '13px',
                color: portfolio.total_return_percentage >= 0 ? colors.semantic.success : colors.semantic.error
              }}
            >
              {formatPercent(portfolio.total_return_percentage)} returns
            </div>
          )}
        </div>

        {/* Members */}
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Users size={20} color={colors.semantic.info} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Members</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {alias.member_count}
          </div>
          <div style={{ marginTop: '4px', fontSize: '13px', color: colors.utility.secondaryText }}>
            customer profiles
          </div>
        </div>

        {/* Goals */}
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Target size={20} color={colors.semantic.warning} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Goals</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {goals?.total_goals || 0}
          </div>
          {goals && goals.total_goals > 0 && (
            <div style={{ marginTop: '4px', fontSize: '13px', color: colors.semantic.success }}>
              {goals.on_track_count} on track
            </div>
          )}
        </div>

        {/* Meetings */}
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
            <Calendar size={20} color={colors.semantic.success} />
            <span style={{ fontSize: '13px', color: colors.utility.secondaryText }}>Meetings</span>
          </div>
          <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
            {meetings?.total_meetings || 0}
          </div>
          {meetings && meetings.upcoming_count > 0 && (
            <div style={{ marginTop: '4px', fontSize: '13px', color: colors.semantic.info }}>
              {meetings.upcoming_count} upcoming
            </div>
          )}
        </div>
      </div>

      {/* Members Section */}
      <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, marginBottom: '24px', padding: '20px' }}>
        <h2
          style={{
            margin: '0 0 16px',
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
        >
          <Users size={18} />
          Combined Profiles ({alias.member_count})
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {alias.members?.map((member) => (
            <div
              key={member.customer_id}
              style={{
                padding: '16px',
                borderRadius: '10px',
                border: `1px solid ${member.is_primary ? colors.brand.primary + '40' : colors.utility.primaryText + '15'}`,
                backgroundColor: member.is_primary ? colors.brand.primary + '08' : 'transparent',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {member.is_primary && (
                  <Star size={16} color={colors.brand.primary} fill={colors.brand.primary} />
                )}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                      {member.name}
                    </span>
                    {member.is_primary && (
                      <span
                        style={{
                          padding: '2px 8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '4px',
                          backgroundColor: colors.brand.primary + '20',
                          color: colors.brand.primary
                        }}
                      >
                        PRIMARY
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    {member.iwell_code && <span>{member.iwell_code}</span>}
                    {member.email && member.iwell_code && <span> | </span>}
                    {member.email && <span>{member.email}</span>}
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {member.current_value !== undefined && member.current_value > 0 && (
                  <span style={{ fontSize: '14px', fontWeight: '600', color: colors.semantic.success }}>
                    {formatCurrency(member.current_value)}
                  </span>
                )}

                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    onClick={() => navigate(`/customers/${member.customer_id}`)}
                    style={{
                      padding: '6px 12px',
                      fontSize: '12px',
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '6px',
                      backgroundColor: 'transparent',
                      color: colors.utility.primaryText,
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                    title="View Customer"
                  >
                    <ExternalLink size={12} />
                    View
                  </button>

                  {!member.is_primary && (
                    <>
                      <button
                        onClick={() => handleSetPrimary(member.customer_id)}
                        disabled={updateAliasMutation.isPending}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: `1px solid ${colors.brand.primary}40`,
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: colors.brand.primary,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Set as Primary"
                      >
                        <Star size={12} />
                        Set Primary
                      </button>
                      <button
                        onClick={() => handleRemoveMember(member.customer_id, member.name)}
                        disabled={removeMembers.isPending}
                        style={{
                          padding: '6px 12px',
                          fontSize: '12px',
                          border: `1px solid ${colors.semantic.error}40`,
                          borderRadius: '6px',
                          backgroundColor: 'transparent',
                          color: colors.semantic.error,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '4px'
                        }}
                        title="Remove from Alias"
                      >
                        <UserMinus size={12} />
                        Remove
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Tabs */}
      <div
        style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '16px',
          borderBottom: `1px solid ${colors.utility.primaryText}15`,
          paddingBottom: '8px'
        }}
      >
        {[
          { id: 'portfolio', label: 'Portfolio', icon: TrendingUp },
          { id: 'goals', label: 'Goals', icon: Target },
          { id: 'meetings', label: 'Meetings', icon: Calendar }
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            style={{
              padding: '10px 20px',
              fontSize: '14px',
              fontWeight: activeTab === tab.id ? '600' : '500',
              border: 'none',
              borderRadius: '8px',
              backgroundColor: activeTab === tab.id ? colors.brand.primary + '15' : 'transparent',
              color: activeTab === tab.id ? colors.brand.primary : colors.utility.secondaryText,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'portfolio' && (
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
            Combined Portfolio by Member
          </h3>

          {portfolioLoading ? (
            <div style={{ textAlign: 'center', padding: '40px' }}>
              <RefreshCw size={24} color={colors.utility.secondaryText} style={{ animation: 'spin 1s linear infinite' }} />
            </div>
          ) : portfolio?.members && portfolio.members.length > 0 ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {portfolio.members.map((member) => (
                <div
                  key={member.customer_id}
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: colors.utility.secondaryBackground,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {member.name}
                      </span>
                      {member.is_primary && <Star size={14} color={colors.brand.primary} fill={colors.brand.primary} />}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                      {member.scheme_count} schemes | {member.portfolio_percentage.toFixed(1)}% of total
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                      {formatCurrency(member.current_value)}
                    </div>
                    <div
                      style={{
                        fontSize: '12px',
                        color: member.return_percentage >= 0 ? colors.semantic.success : colors.semantic.error
                      }}
                    >
                      {formatPercent(member.return_percentage)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p style={{ color: colors.utility.secondaryText, textAlign: 'center', padding: '40px' }}>
              No portfolio data available
            </p>
          )}

          {/* Asset Allocation */}
          {assetAllocation && assetAllocation.allocations.length > 0 && (
            <>
              <h3 style={{ margin: '24px 0 16px', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                Asset Allocation
              </h3>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px' }}>
                {assetAllocation.allocations.map((alloc) => (
                  <div
                    key={alloc.category}
                    style={{
                      padding: '12px 16px',
                      borderRadius: '8px',
                      backgroundColor: colors.utility.secondaryBackground,
                      minWidth: '140px'
                    }}
                  >
                    <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>{alloc.category}</div>
                    <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText, marginTop: '4px' }}>
                      {formatCurrency(alloc.value)}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.brand.primary, marginTop: '2px' }}>
                      {alloc.percentage.toFixed(1)}%
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {activeTab === 'goals' && (
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
            Combined Goals Summary
          </h3>

          {goals && goals.total_goals > 0 ? (
            <>
              {/* Goal Status Summary */}
              <div style={{ display: 'flex', gap: '16px', marginBottom: '20px', flexWrap: 'wrap' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <CheckCircle size={16} color={colors.semantic.success} />
                  <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                    {goals.on_track_count} On Track
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <AlertTriangle size={16} color={colors.semantic.warning} />
                  <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                    {goals.behind_count} Behind
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <TrendingUp size={16} color={colors.semantic.info} />
                  <span style={{ fontSize: '14px', color: colors.utility.primaryText }}>
                    {goals.ahead_count} Ahead
                  </span>
                </div>
              </div>

              {/* Goals by Member */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {goals.goals_by_member.map((member) => (
                  <div
                    key={member.customer_id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: colors.utility.secondaryBackground,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {member.name}
                      </span>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {member.goal_count} goal{member.goal_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        Target: {formatCurrency(member.total_target)}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.semantic.success }}>
                        Current: {formatCurrency(member.current_value)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: colors.utility.secondaryText, textAlign: 'center', padding: '40px' }}>
              No goals configured for these customers
            </p>
          )}
        </div>
      )}

      {activeTab === 'meetings' && (
        <div style={{ backgroundColor: colors.utility.secondaryBackground, borderRadius: '12px', border: `1px solid ${colors.utility.primaryText}10`, padding: '20px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
            Combined Meetings Summary
          </h3>

          {meetings && meetings.total_meetings > 0 ? (
            <>
              {/* Next Meeting */}
              {meetings.next_meeting && (
                <div
                  style={{
                    padding: '16px',
                    borderRadius: '10px',
                    backgroundColor: colors.semantic.info + '10',
                    border: `1px solid ${colors.semantic.info}30`,
                    marginBottom: '20px'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                    <Clock size={16} color={colors.semantic.info} />
                    <span style={{ fontSize: '13px', fontWeight: '600', color: colors.semantic.info }}>
                      Next Meeting
                    </span>
                  </div>
                  <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {meetings.next_meeting.customer_name}
                  </div>
                  <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                    {new Date(meetings.next_meeting.meeting_date).toLocaleDateString('en-IN', {
                      weekday: 'long',
                      day: '2-digit',
                      month: 'short',
                      year: 'numeric'
                    })} | {meetings.next_meeting.meeting_type}
                  </div>
                </div>
              )}

              {/* Meetings by Member */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {meetings.meetings_by_member.map((member) => (
                  <div
                    key={member.customer_id}
                    style={{
                      padding: '16px',
                      borderRadius: '10px',
                      backgroundColor: colors.utility.secondaryBackground,
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center'
                    }}
                  >
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {member.name}
                      </span>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
                        {member.meeting_count} meeting{member.meeting_count !== 1 ? 's' : ''}
                      </div>
                    </div>
                    {member.last_meeting_date && (
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                        Last: {new Date(member.last_meeting_date).toLocaleDateString('en-IN', {
                          day: '2-digit',
                          month: 'short'
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: colors.utility.secondaryText, textAlign: 'center', padding: '40px' }}>
              No meetings scheduled for these customers
            </p>
          )}
        </div>
      )}

      {/* Edit Alias Modal */}
      <EditAliasModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        alias={alias}
        onSuccess={() => refetchAlias()}
      />

      {/* Add Members Modal */}
      <AddMembersModal
        isOpen={showAddMembersModal}
        onClose={() => setShowAddMembersModal(false)}
        aliasId={parseInt(aliasId!)}
        existingMemberIds={alias.members?.map(m => m.customer_id) || []}
        onSuccess={() => refetchAlias()}
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

export default AliasDetailPage;
