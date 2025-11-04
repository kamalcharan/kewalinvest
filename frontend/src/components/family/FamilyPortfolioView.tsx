// frontend/src/components/family/FamilyPortfolioView.tsx

import React from 'react';
import { Users, TrendingUp, TrendingDown, Target, Calendar, PieChart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useFamilyPortfolio, useFamilyAssetAllocation, useFamilyGoals, useFamilyMeetings } from '../../hooks/useFamily';
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

  // Fetch family data
  const { data: portfolio, isLoading: portfolioLoading, error: portfolioError } = useFamilyPortfolio(familyHeadIwellCode);
  const { data: assetAllocation, isLoading: allocationLoading } = useFamilyAssetAllocation(familyHeadIwellCode);
  const { data: goals, isLoading: goalsLoading } = useFamilyGoals(familyHeadIwellCode);
  const { data: meetings, isLoading: meetingsLoading } = useFamilyMeetings(familyHeadIwellCode);

  if (portfolioLoading) {
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

  const returnColor = portfolio.total_returns >= 0 ? colors.semantic.success : colors.semantic.error;

  return (
    <div>
      {/* Family Header */}
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
              {portfolio.total_members} {portfolio.total_members === 1 ? 'Member' : 'Members'} • IWELL Code: {portfolio.family_head_iwell_code}
            </p>
          </div>
        </div>

        {/* Combined Portfolio Summary */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Invested
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
              {formatPrice(portfolio.total_invested)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Current Value
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
              {formatPrice(portfolio.total_current_value)}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '8px', textTransform: 'uppercase', fontWeight: '600' }}>
              Total Returns
            </div>
            <div style={{ fontSize: '28px', fontWeight: '700', color: returnColor, display: 'flex', alignItems: 'center', gap: '8px' }}>
              {portfolio.total_returns >= 0 ? <TrendingUp size={24} /> : <TrendingDown size={24} />}
              {formatPrice(Math.abs(portfolio.total_returns))}
            </div>
            <div style={{ fontSize: '14px', color: returnColor, marginTop: '4px' }}>
              {portfolio.total_return_percentage >= 0 ? '+' : ''}{Number(portfolio.total_return_percentage).toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px', marginBottom: '24px' }}>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Target size={20} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                Family Goals
              </h3>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {goals.total_goals}
            </div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              {goals.on_track_count} on track • {goals.behind_count} behind
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <Calendar size={20} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                Meetings
              </h3>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {meetings.upcoming_count}
            </div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              Upcoming • {meetings.completed_count} completed
            </div>
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
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
              <PieChart size={20} color={colors.brand.primary} />
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
                Asset Categories
              </h3>
            </div>
            <div style={{ fontSize: '24px', fontWeight: '700', color: colors.utility.primaryText }}>
              {assetAllocation.allocations.length}
            </div>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              Total value: {formatPrice(assetAllocation.total_value)}
            </div>
          </div>
        )}
      </div>

      {/* Family Members List */}
      <div style={{ marginBottom: '24px' }}>
        <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '16px' }}>
          Family Members Portfolio
        </h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {portfolio.members.map((member: FamilyMemberPortfolio) => (
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
                }
              }}
              onMouseLeave={(e) => {
                if (onMemberClick) {
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
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
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                    {member.portfolio_percentage.toFixed(1)}% of family portfolio
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '16px' }}>
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
            </div>
          ))}
        </div>
      </div>

      {/* Asset Allocation Breakdown */}
      {!allocationLoading && assetAllocation && assetAllocation.allocations.length > 0 && (
        <div>
          <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '16px' }}>
            Family Asset Allocation
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
