// frontend/src/components/jtbd/dashboard/CommunicationList.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { JTBDWithCommunication } from '../../../types/jtbd.types';
import CommunicationCard from './CommunicationCard';

interface CommunicationListProps {
  alerts: JTBDWithCommunication[];
  isLoading: boolean;
  onAlertClick: (alertId: number) => void;
  onCustomerClick?: (customerId: number) => void;
}

const CommunicationList: React.FC<CommunicationListProps> = ({
  alerts,
  isLoading,
  onAlertClick,
  onCustomerClick
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

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
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '20px'
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {Array.from({ length: 5 }).map((_, index) => (
            <div
              key={index}
              style={{
                height: '120px',
                backgroundColor: colors.utility.primaryBackground,
                borderRadius: '8px',
                animation: 'pulse 1.5s ease-in-out infinite',
                opacity: 0.6
              }}
            />
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

  // Empty state
  if (!alerts || alerts.length === 0) {
    return (
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
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

  // List view
  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px'
    }}>
      {/* Header */}
      <div style={{
        marginBottom: '16px',
        paddingBottom: '12px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '600',
          color: colors.utility.primaryText
        }}>
          {alerts.length} Alert{alerts.length !== 1 ? 's' : ''} Found
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '4px'
        }}>
          Showing communication status for all alerts
        </div>
      </div>

      {/* Alert Cards */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        maxHeight: '600px',
        overflowY: 'auto',
        paddingRight: '4px'
      }}>
        {alerts.map((alert) => (
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

      {/* Scroll indicator */}
      {alerts.length > 5 && (
        <div style={{
          marginTop: '16px',
          padding: '8px',
          textAlign: 'center',
          fontSize: '11px',
          color: colors.utility.secondaryText,
          backgroundColor: colors.utility.primaryBackground,
          borderRadius: '6px'
        }}>
          💡 Scroll to see all {alerts.length} alerts
        </div>
      )}
    </div>
  );
};

export default CommunicationList;