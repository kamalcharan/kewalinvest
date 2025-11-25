// frontend/src/components/family/FamilyPortfolioView.tsx
// Enhanced Family View with Networth Charts and complete data from all asset types

import React, { useState } from 'react';
import { Users, TrendingUp, TrendingDown, Target, Calendar, PieChart, ExternalLink, Wallet } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useFamilyPortfolio, useFamilyAssetAllocation, useFamilyGoals, useFamilyMeetings } from '../../hooks/useFamily';
import { useNetworthSummary } from '../../hooks/usePortfolioData';
import { NetworthProjectionChart } from '../portfolio/NetworthProjectionChart';
import { formatPrice } from '../../utils/formatters';
import type { FamilyMemberPortfolio, FamilyAssetCategory } from '../../types/family.types';

interface FamilyPortfolioViewProps {
  familyHeadIwellCode: string;
  onMemberClick?: (customerId: number) => void;
}

export const FamilyPortfolioView: React.FC<FamilyPortfolioViewProps> = ({
  familyHeadIwellCode,
  onMemberClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Tab state for networth charts: 'family' or member's customer_id
  const [activeChartTab, setActiveChartTab] = useState<'family' | number>('family');

  // Fetch family data
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useFamilyPortfolio(familyHeadIwellCode);
  const { data: assetAllocation, isLoading: allocationLoading } = useFamilyAssetAllocation(familyHeadIwellCode);
  const { data: goals, isLoading: goalsLoading } = useFamilyGoals(familyHeadIwellCode);
  const { data: meetings, isLoading: meetingsLoading } = useFamilyMeetings(familyHeadIwellCode);

  // Fetch networth summary for accurate multi-asset totals
  const { data: networthData, isLoading: networthLoading } = useNetworthSummary(
    { familyHeadIwellcode: familyHeadIwellCode },
    { enabled: !!familyHeadIwellCode }
  );

  const isLoading = portfolioLoading || networthLoading;

  if (isLoading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px', color: colors.utility.secondaryText }}>
        Loading family portfolio...
      </div>
    );
  }

  if (portfolioError || !portfolio) {
    return (
      <div style={{
        textAlign: 'center',
        padding: '60px',
        color: colors.semantic.error,
        backgroundColor: colors.semantic.error + '10',
        borderRadius: '12px'
      }}>
        <p>Failed to load family portfolio</p>
        <p style={{ fontSize: '14px', marginTop: '8px' }}>
          {portfolioError instanceof Error ? portfolioError.message : String(portfolioError) || 'No data available'}
        </p>
      </div>
    );
  }

  // Use networth data for totals (includes ALL asset types), fallback to portfolio
  const totalNetworth = networthData?.data?.total_networth ?? portfolio.total_current_value;
  const totalInvested = networthData?.data?.total_invested ?? portfolio.total_invested;
  const totalReturns = networthData?.data?.total_returns ?? portfolio.total_returns;
  const returnPercentage = networthData?.data?.overall_return_percentage ?? portfolio.total_return_percentage;
  const assetTypeCount = networthData?.data?.asset_type_count ?? 1;

  const returnColor = totalReturns >= 0 ? colors.semantic.success : colors.semantic.error;

  // Get members for chart tabs
  const members = portfolio.members || [];

  // Get active member details for individual chart
  const activeMember = activeChartTab !== 'family'
    ? members.find(m => m.customer_id === activeChartTab)
    : null;

  return (
    <div>
      {/* Family Header with Networth Summary Cards */}
      <div
        style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '16px',
          padding: '32px',
          marginBottom: '24px',
          background: isDarkMode
            ? `linear-gradient(135deg, ${colors.brand.primary}15, ${colors.utility.secondaryBackground})`
            : `linear-gradient(135deg, ${colors.brand.primary}10, ${colors.utility.secondaryBackground})`
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '24px' }}>
          <div
            style={{
              width: '60px',
              height: '60px',
              borderRadius: '12px',
              backgroundColor: colors.brand.primary + '20',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Users size={32} color={colors.brand.primary} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {portfolio.family_head_name}'s Family
            </h2>
            <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: colors.utility.secondaryText }}>
              {portfolio.total_members} {portfolio.total_members === 1 ? 'Member' : 'Members'} • {assetTypeCount} Asset Types • IWELL: {portfolio.family_head_iwell_code}
            </p>
          </div>
        </div>

        {/* Main Summary Cards - Using Networth Data for ALL asset types */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px' }}>
          {/* Total Networth */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
              <Wallet size={18} color={colors.brand.primary} />
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, textTransform: 'uppercase', fontWeight: '600' }}>
                Total Networth
              </div>
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
              {formatPrice(totalNetworth)}
            </div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              All {assetTypeCount} asset types
            </div>
          </div>

          {/* Total Invested */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Invested
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
              {formatPrice(totalInvested)}
            </div>
          </div>

          {/* Total Profit/Loss */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Profit/Loss
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: returnColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {totalReturns >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {totalReturns >= 0 ? '+' : ''}{formatPrice(totalReturns)}
            </div>
          </div>

          {/* Return Percentage */}
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '12px',
            padding: '20px',
            border: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Overall Return
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: returnColor }}>
              {returnPercentage >= 0 ? '+' : ''}{Number(returnPercentage).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Networth Chart Section with Tabs */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '24px'
      }}>
        <h3 style={{ margin: '0 0 16px 0', fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
          Networth Projection
        </h3>

        {/* Chart Tabs: Family + Individual Members */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '20px',
          borderBottom: `1px solid ${colors.utility.primaryText}15`,
          paddingBottom: '12px',
          overflowX: 'auto'
        }}>
          {/* Family Tab */}
          <button
            onClick={() => setActiveChartTab('family')}
            style={{
              padding: '10px 20px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: activeChartTab === 'family' ? colors.brand.primary : colors.utility.primaryBackground,
              color: activeChartTab === 'family' ? '#FFFFFF' : colors.utility.secondaryText,
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              whiteSpace: 'nowrap'
            }}
          >
            <Users size={16} />
            Family Networth
          </button>

          {/* Individual Member Tabs */}
          {members.map((member) => (
            <button
              key={member.customer_id}
              onClick={() => setActiveChartTab(member.customer_id)}
              style={{
                padding: '10px 20px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: activeChartTab === member.customer_id ? colors.brand.primary : colors.utility.primaryBackground,
                color: activeChartTab === member.customer_id ? '#FFFFFF' : colors.utility.secondaryText,
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                whiteSpace: 'nowrap'
              }}
            >
              {member.name}
              {member.is_family_head && (
                <span style={{
                  fontSize: '10px',
                  padding: '2px 6px',
                  borderRadius: '4px',
                  backgroundColor: activeChartTab === member.customer_id ? 'rgba(255,255,255,0.2)' : colors.brand.primary + '20',
                  color: activeChartTab === member.customer_id ? '#FFFFFF' : colors.brand.primary
                }}>
                  HEAD
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Chart Area */}
        <div style={{ position: 'relative' }}>
          {activeChartTab === 'family' ? (
            // Family Networth Chart
            <NetworthProjectionChart
              familyHeadIwellcode={familyHeadIwellCode}
              height={350}
              showProjection={true}
            />
          ) : (
            // Individual Member Chart
            <>
              <NetworthProjectionChart
                customerId={activeChartTab as number}
                height={350}
                showProjection={true}
              />
              {/* Navigation to Individual Dashboard */}
              {activeMember && (
                <div style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  zIndex: 10
                }}>
                  <button
                    onClick={() => onMemberClick?.(activeChartTab as number)}
                    style={{
                      padding: '8px 16px',
                      borderRadius: '8px',
                      border: `1px solid ${colors.brand.primary}`,
                      backgroundColor: colors.utility.primaryBackground,
                      color: colors.brand.primary,
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px'
                    }}
                  >
                    View {activeMember.name}'s Dashboard
                    <ExternalLink size={14} />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* Quick Stats Row - Goals, Meetings, Asset Allocation */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '24px' }}>
        {/* Goals Summary */}
        {!goalsLoading && goals && (
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Target size={24} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Family Goals
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.primaryText }}>
                  {goals.total_goals}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                  Total Goals
                </div>
              </div>
              <div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: colors.semantic.success }}>
                  {goals.on_track_count} on track
                </div>
                <div style={{ fontSize: '20px', fontWeight: '600', color: colors.semantic.error }}>
                  {goals.behind_count} behind
                </div>
              </div>
            </div>
            {goals.goals_by_member && goals.goals_by_member.length > 0 && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${colors.utility.primaryText}10`, paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase' }}>
                  Goals by Member
                </div>
                {goals.goals_by_member.map((memberGoal) => (
                  <div key={memberGoal.customer_id} style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    padding: '4px 0'
                  }}>
                    <span>{memberGoal.name}</span>
                    <span style={{ fontWeight: '600' }}>{memberGoal.goal_count} goals</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Meetings Summary */}
        {!meetingsLoading && meetings && (
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <Calendar size={24} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Meetings
              </h3>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.primaryText }}>
                  {meetings.upcoming_count}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                  Upcoming
                </div>
              </div>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', color: colors.utility.secondaryText }}>
                  {meetings.completed_count}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                  Completed
                </div>
              </div>
            </div>
            {meetings.next_meeting && (
              <div style={{ marginTop: '16px', borderTop: `1px solid ${colors.utility.primaryText}10`, paddingTop: '12px' }}>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase' }}>
                  Next Meeting
                </div>
                <div style={{ fontSize: '14px', color: colors.utility.primaryText, fontWeight: '500' }}>
                  {meetings.next_meeting.customer_name}
                </div>
                <div style={{ fontSize: '13px', color: colors.utility.secondaryText }}>
                  {new Date(meetings.next_meeting.meeting_date).toLocaleDateString()} • {meetings.next_meeting.meeting_type}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Asset Allocation Summary */}
        {!allocationLoading && assetAllocation && (
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
              <PieChart size={24} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText }}>
                Asset Allocation
              </h3>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText, marginBottom: '12px' }}>
              {formatPrice(assetAllocation.total_value)}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {assetAllocation.allocations.slice(0, 4).map((allocation: FamilyAssetCategory, index: number) => (
                <div key={index} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '13px', color: colors.utility.primaryText }}>{allocation.category}</span>
                  <span style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.secondaryText }}>
                    {allocation.percentage.toFixed(1)}%
                  </span>
                </div>
              ))}
              {assetAllocation.allocations.length > 4 && (
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText, textAlign: 'center' }}>
                  +{assetAllocation.allocations.length - 4} more
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Family Members Portfolio Cards */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '16px' }}>
          Family Members Portfolio
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '16px' }}>
          {members.map((member: FamilyMemberPortfolio) => (
            <div
              key={member.customer_id}
              onClick={() => onMemberClick?.(member.customer_id)}
              style={{
                backgroundColor: colors.utility.secondaryBackground,
                border: `1px solid ${colors.utility.primaryText}10`,
                borderRadius: '12px',
                padding: '20px',
                cursor: onMemberClick ? 'pointer' : 'default',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (onMemberClick) {
                  e.currentTarget.style.boxShadow = `0 4px 12px ${colors.utility.primaryText}15`;
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.borderColor = colors.brand.primary;
                }
              }}
              onMouseLeave={(e) => {
                if (onMemberClick) {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = `${colors.utility.primaryText}10`;
                }
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                      {member.name}
                    </h4>
                    {member.is_family_head && (
                      <span
                        style={{
                          padding: '4px 10px',
                          borderRadius: '6px',
                          backgroundColor: colors.brand.primary + '20',
                          color: colors.brand.primary,
                          fontSize: '11px',
                          fontWeight: '600',
                          textTransform: 'uppercase'
                        }}
                      >
                        Family Head
                      </span>
                    )}
                  </div>
                  <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: colors.utility.secondaryText }}>
                    IWELL: {member.iwell_code} • {member.scheme_count} schemes
                  </p>
                </div>
                <div style={{
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: colors.utility.primaryBackground,
                  fontSize: '12px',
                  color: colors.utility.secondaryText,
                  fontWeight: '600'
                }}>
                  {member.portfolio_percentage.toFixed(1)}%
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
                <div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Invested
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {formatPrice(member.total_invested)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Current Value
                  </div>
                  <div style={{ fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                    {formatPrice(member.current_value)}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px', textTransform: 'uppercase' }}>
                    Returns
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: member.returns >= 0 ? colors.semantic.success : colors.semantic.error
                  }}>
                    {member.returns >= 0 ? '+' : ''}{formatPrice(member.returns)}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: member.returns >= 0 ? colors.semantic.success : colors.semantic.error
                  }}>
                    {member.return_percentage >= 0 ? '+' : ''}{Number(member.return_percentage).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* View Dashboard Link */}
              <div style={{
                marginTop: '16px',
                paddingTop: '12px',
                borderTop: `1px solid ${colors.utility.primaryText}10`,
                display: 'flex',
                justifyContent: 'flex-end'
              }}>
                <span style={{
                  fontSize: '13px',
                  color: colors.brand.primary,
                  fontWeight: '500',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  View Dashboard <ExternalLink size={14} />
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Asset Allocation Breakdown - Full Width */}
      {!allocationLoading && assetAllocation && assetAllocation.allocations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '16px' }}>
            Family Asset Allocation Detail
          </h3>
          <div
            style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '24px',
              border: `1px solid ${colors.utility.primaryText}10`
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {assetAllocation.allocations.map((allocation: FamilyAssetCategory, index: number) => (
                <div key={index}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <span style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {allocation.category}
                      </span>
                      <span style={{ fontSize: '13px', color: colors.utility.secondaryText, marginLeft: '12px' }}>
                        {allocation.scheme_count} schemes
                      </span>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText }}>
                        {formatPrice(allocation.value)}
                      </div>
                      <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                        {allocation.percentage.toFixed(1)}%
                      </div>
                    </div>
                  </div>
                  <div
                    style={{
                      height: '8px',
                      backgroundColor: colors.utility.primaryBackground,
                      borderRadius: '4px',
                      overflow: 'hidden'
                    }}
                  >
                    <div
                      style={{
                        height: '100%',
                        width: `${allocation.percentage}%`,
                        backgroundColor: colors.brand.primary,
                        transition: 'width 0.3s ease'
                      }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FamilyPortfolioView;
