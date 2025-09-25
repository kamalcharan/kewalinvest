// frontend/src/components/Import/SessionMetrics.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ImportSession } from '../../types/import.types';

interface SessionMetricsProps {
  session: ImportSession | null;
}

const SessionMetrics: React.FC<SessionMetricsProps> = ({ session }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!session) {
    return (
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {[1, 2, 3, 4].map(i => (
          <div
            key={i}
            style={{
              padding: '20px',
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              border: `1px solid ${colors.utility.primaryText}10`,
              opacity: 0.5
            }}
          >
            <div style={{
              height: '24px',
              width: '60%',
              backgroundColor: colors.utility.primaryText + '10',
              borderRadius: '4px',
              marginBottom: '8px'
            }} />
            <div style={{
              height: '32px',
              width: '40%',
              backgroundColor: colors.utility.primaryText + '10',
              borderRadius: '4px'
            }} />
          </div>
        ))}
      </div>
    );
  }

  const getSuccessRate = (): number => {
    if (session.total_records === 0) return 0;
    return Math.round((session.successful_records / session.total_records) * 100);
  };

  const getProcessingDuration = (): string => {
    if (!session.processing_started_at || !session.processing_completed_at) {
      return 'N/A';
    }
    const start = new Date(session.processing_started_at).getTime();
    const end = new Date(session.processing_completed_at).getTime();
    const duration = end - start;
    
    if (duration < 60000) {
      return `${Math.round(duration / 1000)}s`;
    } else if (duration < 3600000) {
      return `${Math.round(duration / 60000)}m`;
    } else {
      return `${Math.round(duration / 3600000)}h`;
    }
  };

  const metrics = [
    {
      label: 'Total Records',
      value: session.total_records.toLocaleString(),
      icon: '📊',
      color: colors.utility.primaryText,
      bgColor: colors.utility.secondaryBackground,
      borderColor: colors.utility.primaryText + '20'
    },
    {
      label: 'Successful',
      value: session.successful_records.toLocaleString(),
      percentage: session.total_records > 0 
        ? `${Math.round((session.successful_records / session.total_records) * 100)}%`
        : '0%',
      icon: '✅',
      color: colors.semantic.success,
      bgColor: colors.semantic.success + '10',
      borderColor: colors.semantic.success + '30'
    },
    {
      label: 'Failed',
      value: session.failed_records.toLocaleString(),
      percentage: session.total_records > 0
        ? `${Math.round((session.failed_records / session.total_records) * 100)}%`
        : '0%',
      icon: '❌',
      color: colors.semantic.error,
      bgColor: colors.semantic.error + '10',
      borderColor: colors.semantic.error + '30'
    },
    {
      label: 'Duplicates',
      value: session.duplicate_records.toLocaleString(),
      percentage: session.total_records > 0
        ? `${Math.round((session.duplicate_records / session.total_records) * 100)}%`
        : '0%',
      icon: '⚠️',
      color: colors.semantic.warning,
      bgColor: colors.semantic.warning + '10',
      borderColor: colors.semantic.warning + '30'
    }
  ];

  return (
    <div>
      {/* Session Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: '12px 16px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '8px',
        marginBottom: '20px',
        border: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '24px'
        }}>
          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Session ID:
            </span>
            <span style={{
              fontSize: '14px',
              fontWeight: '600',
              color: colors.brand.primary,
              marginLeft: '8px'
            }}>
              #{session.id}
            </span>
          </div>
          
          {session.session_name && (
            <div>
              <span style={{
                fontSize: '12px',
                color: colors.utility.secondaryText
              }}>
                Name:
              </span>
              <span style={{
                fontSize: '14px',
                color: colors.utility.primaryText,
                marginLeft: '8px'
              }}>
                {session.session_name}
              </span>
            </div>
          )}

          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Status:
            </span>
            <span style={{
              display: 'inline-block',
              marginLeft: '8px',
              padding: '2px 8px',
              borderRadius: '4px',
              fontSize: '11px',
              fontWeight: '600',
              backgroundColor: session.status === 'completed' 
                ? colors.semantic.success + '20'
                : session.status === 'failed'
                  ? colors.semantic.error + '20'
                  : session.status === 'processing'
                    ? colors.semantic.info + '20'
                    : colors.semantic.warning + '20',
              color: session.status === 'completed'
                ? colors.semantic.success
                : session.status === 'failed'
                  ? colors.semantic.error
                  : session.status === 'processing'
                    ? colors.semantic.info
                    : colors.semantic.warning,
              textTransform: 'uppercase'
            }}>
              {session.status}
            </span>
          </div>

          <div>
            <span style={{
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Duration:
            </span>
            <span style={{
              fontSize: '14px',
              color: colors.utility.primaryText,
              marginLeft: '8px'
            }}>
              {getProcessingDuration()}
            </span>
          </div>
        </div>

        <div style={{
          fontSize: '24px',
          fontWeight: '700',
          color: getSuccessRate() > 80 
            ? colors.semantic.success
            : getSuccessRate() > 50
              ? colors.semantic.warning
              : colors.semantic.error
        }}>
          {getSuccessRate()}%
          <div style={{
            fontSize: '10px',
            fontWeight: '400',
            color: colors.utility.secondaryText
          }}>
            Success Rate
          </div>
        </div>
      </div>

      {/* Metric Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {metrics.map((metric, index) => (
          <div
            key={index}
            style={{
              padding: '20px',
              backgroundColor: metric.bgColor,
              borderRadius: '12px',
              border: `1px solid ${metric.borderColor}`,
              position: 'relative',
              overflow: 'hidden'
            }}
          >
            {/* Background Pattern */}
            <div style={{
              position: 'absolute',
              top: '-20px',
              right: '-20px',
              fontSize: '80px',
              opacity: 0.1,
              transform: 'rotate(-15deg)'
            }}>
              {metric.icon}
            </div>

            <div style={{
              position: 'relative',
              zIndex: 1
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '12px'
              }}>
                <span style={{
                  fontSize: '12px',
                  fontWeight: '500',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  {metric.label}
                </span>
                <span style={{
                  fontSize: '20px'
                }}>
                  {metric.icon}
                </span>
              </div>
              
              <div style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: '8px'
              }}>
                <div style={{
                  fontSize: '28px',
                  fontWeight: '700',
                  color: metric.color
                }}>
                  {metric.value}
                </div>
                {metric.percentage && (
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: metric.color,
                    opacity: 0.8
                  }}>
                    ({metric.percentage})
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default SessionMetrics;