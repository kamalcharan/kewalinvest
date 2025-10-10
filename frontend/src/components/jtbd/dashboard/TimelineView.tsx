// frontend/src/components/jtbd/dashboard/TimelineView.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { JTBDWithCommunication } from '../../../types/jtbd.types';
import { groupAlertsByTimeBucket } from '../../../utils/jtbd.helpers';
import CommunicationCard from './CommunicationCard';

interface TimelineViewProps {
  alerts: JTBDWithCommunication[];
  isLoading: boolean;
  onAlertClick: (alertId: number) => void;
  onCustomerClick?: (customerId: number) => void;
}

const TimelineView: React.FC<TimelineViewProps> = ({
  alerts,
  isLoading,
  onAlertClick,
  onCustomerClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Group alerts by time buckets
  const groupedAlerts = groupAlertsByTimeBucket(alerts);

  // Icons
  const SearchIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  );

  // Loading state
  if (isLoading) {
    return (
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Skeleton for sections */}
          {Array.from({ length: 3 }).map((_, sectionIdx) => (
            <div key={sectionIdx}>
              {/* Section header skeleton */}
              <div
                style={{
                  height: '40px',
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                  marginBottom: '12px',
                  opacity: 0.6,
                  animation: 'pulse 1.5s ease-in-out infinite'
                }}
              />
              {/* Cards skeleton */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                gap: '12px'
              }}>
                {Array.from({ length: 3 }).map((_, cardIdx) => (
                  <div
                    key={cardIdx}
                    style={{
                      height: '120px',
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '8px',
                      animation: 'pulse 1.5s ease-in-out infinite',
                      opacity: 0.6
                    }}
                  />
                ))}
              </div>
            </div>
          ))}
        </div>
        <style>{`
          @keyframes pulse {
            0%, 100% { opacity: 0.4; }
            50% { opacity: 0.6; }
          }
        `}</style>
      </div>
    );
  }

  // Empty state (no alerts at all)
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '12px',
        padding: '60px 20px',
        textAlign: 'center'
      }}>
        <div style={{
          color: colors.utility.secondaryText,
          marginBottom: '16px',
          opacity: 0.6,
          display: 'flex',
          justifyContent: 'center'
        }}>
          <SearchIcon />
        </div>
        <h3 style={{
          fontSize: '18px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          No Alerts Found
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          lineHeight: '1.6'
        }}>
          No alerts match the selected filters. Try adjusting your filter criteria.
        </p>
      </div>
    );
  }

  // Timeline view
  return (
    <div style={{
      backgroundColor: colors.utility.primaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} organized by timeline
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '4px'
        }}>
          Grouped by urgency and due date
        </div>
      </div>

      {/* Timeline sections */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
        {groupedAlerts.map((group) => (
          <div key={group.bucket}>
            {/* Section Header */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                paddingBottom: '12px',
                borderBottom: `2px solid ${group.color}40`
              }}
            >
              {/* Icon */}
              <div
                style={{
                  fontSize: '24px',
                  lineHeight: 1
                }}
              >
                {group.icon}
              </div>

              {/* Label */}
              <div
                style={{
                  fontSize: '16px',
                  fontWeight: '700',
                  color: group.color,
                  letterSpacing: '0.5px',
                  flex: 1
                }}
              >
                {group.label}
              </div>

              {/* Count badge */}
              <div
                style={{
                  padding: '4px 12px',
                  backgroundColor: group.color + '20',
                  border: `2px solid ${group.color}`,
                  borderRadius: '20px',
                  fontSize: '13px',
                  fontWeight: '700',
                  color: group.color
                }}
              >
                {group.count} {group.count === 1 ? 'alert' : 'alerts'}
              </div>
            </div>

            {/* Cards Grid - 3 columns OR Empty State */}
            {group.count > 0 ? (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))',
                  gap: '12px'
                }}
              >
                {group.alerts.map((alert) => (
                  <CommunicationCard
                    key={alert.id}
                    alert={alert}
                    onViewCustomer={(customerId) => {
                      if (onCustomerClick) {
                        onCustomerClick(customerId);
                      } else {
                        console.log('View customer:', customerId);
                      }
                    }}
                    onViewDetails={onAlertClick}
                    compact={false}
                  />
                ))}
              </div>
            ) : (
              // Empty state for this bucket
              <div
                style={{
                  padding: '40px 20px',
                  textAlign: 'center',
                  backgroundColor: colors.utility.secondaryBackground,
                  borderRadius: '8px',
                  border: `2px dashed ${group.color}40`
                }}
              >
                <div style={{ fontSize: '32px', marginBottom: '8px' }}>✓</div>
                <div
                  style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '4px'
                  }}
                >
                  No {group.label.toLowerCase()} alerts
                </div>
                <div
                  style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText
                  }}
                >
                  All clear for this time period
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Scroll indicator for many sections */}
      {groupedAlerts.length > 3 && (
        <div style={{
          marginTop: '24px',
          padding: '12px',
          textAlign: 'center',
          fontSize: '11px',
          color: colors.utility.secondaryText,
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '6px'
        }}>
          💡 {groupedAlerts.length} time sections • Scroll to see all alerts
        </div>
      )}
    </div>
  );
};

export default TimelineView;