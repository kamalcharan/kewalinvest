// frontend/src/components/Import/SessionsSidebar.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { apiService } from '../../services/api.service';
import { FileImportType, ImportSession } from '../../types/import.types';

// Extended interface for sessions that might have additional fields from API
interface ExtendedImportSession extends ImportSession {
  original_filename?: string;
}

interface SessionsSidebarProps {
  selectedType: FileImportType | null;
  selectedSessionId: number | null;
  onSessionSelect: (session: ExtendedImportSession) => void;
}

// API Response type - flexible to handle different structures
interface SessionsResponse {
  success: boolean;
  data: ExtendedImportSession[] | { sessions?: ExtendedImportSession[]; data?: ExtendedImportSession[]; [key: string]: any };
  message?: string;
}

const SessionsSidebar: React.FC<SessionsSidebarProps> = ({ 
  selectedType, 
  selectedSessionId,
  onSessionSelect 
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [sessions, setSessions] = useState<ExtendedImportSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSessions();
  }, [selectedType]);

  const fetchSessions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      if (!selectedType) {
        setSessions([]);
        setLoading(false);
        return;
      }
      
      // Fetch all sessions and filter by type
      const response = await apiService.get<SessionsResponse>('/import/sessions');
      
      if (response && response.data) {
        // Check if data is an array or has a nested structure
        let sessionsArray: ExtendedImportSession[] = [];
        
        if (Array.isArray(response.data)) {
          sessionsArray = response.data;
        } else if (response.data.sessions && Array.isArray(response.data.sessions)) {
          // If sessions are nested under a 'sessions' property
          sessionsArray = response.data.sessions;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          // If sessions are nested under another 'data' property
          sessionsArray = response.data.data;
        } else {
          console.error('Unexpected response structure:', response.data);
          setSessions([]);
          return;
        }
        
        // Filter sessions by selected import type
        // Handle both old format (customer_import) and new format (CustomerData)
        const filteredSessions = sessionsArray.filter(session => {
          const sessionType = session.import_type as string; // Cast to string for comparison
          // Match exact type or legacy format conversions
          return sessionType === selectedType || 
                 sessionType === `${selectedType.replace('Data', '').toLowerCase()}_import` ||
                 (selectedType === 'CustomerData' && sessionType === 'customer_import') ||
                 (selectedType === 'SchemeData' && sessionType === 'scheme_import') ||
                 (selectedType === 'TransactionData' && sessionType === 'transaction_import');
        });
        
        // Sort by created_at descending (newest first)
        filteredSessions.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
        
        setSessions(filteredSessions);
        
        // Auto-select first session if none selected
        if (filteredSessions.length > 0 && !selectedSessionId) {
          onSessionSelect(filteredSessions[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
      setError('Failed to load sessions');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    const statusColors: Record<string, string> = {
      'completed': colors.semantic.success,
      'completed_with_errors': colors.semantic.warning,
      'processing': colors.semantic.info,
      'failed': colors.semantic.error,
      'cancelled': colors.utility.secondaryText,
      'staged': colors.brand.primary,
      'pending': colors.utility.secondaryText
    };
    return statusColors[status] || colors.utility.secondaryText;
  };

  const getSuccessRate = (session: ImportSession): number => {
    if (session.total_records === 0) return 0;
    return Math.round((session.successful_records / session.total_records) * 100);
  };

  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else if (date.toDateString() === yesterday.toDateString()) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: '2-digit', 
        minute: '2-digit' 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    }
  };

  return (
    <div style={{
      width: '320px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      border: `1px solid ${colors.utility.primaryText}10`,
      display: 'flex',
      flexDirection: 'column',
      height: 'calc(100vh - 240px)', // Adjust based on your layout
      position: 'sticky',
      top: '24px'
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <h3 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: colors.utility.primaryText
          }}>
            Import Sessions
          </h3>
          <button
            onClick={fetchSessions}
            style={{
              padding: '4px 8px',
              backgroundColor: 'transparent',
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '4px',
              color: colors.utility.secondaryText,
              fontSize: '11px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Refresh
          </button>
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '4px'
        }}>
          {sessions.length} sessions found
        </div>
      </div>

      {/* Sessions List */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '8px'
      }}>
        {loading ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            Loading sessions...
          </div>
        ) : error ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: colors.semantic.error
          }}>
            {error}
          </div>
        ) : sessions.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            No sessions found for this import type
          </div>
        ) : (
          sessions.map((session: ExtendedImportSession) => (
            <div
              key={session.id}
              onClick={() => onSessionSelect(session)}
              style={{
                padding: '12px',
                marginBottom: '8px',
                backgroundColor: selectedSessionId === session.id 
                  ? colors.brand.primary + '15'
                  : colors.utility.primaryBackground,
                border: `1px solid ${
                  selectedSessionId === session.id 
                    ? colors.brand.primary
                    : colors.utility.primaryText + '10'
                }`,
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (selectedSessionId !== session.id) {
                  e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground + '80';
                }
              }}
              onMouseLeave={(e) => {
                if (selectedSessionId !== session.id) {
                  e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
                }
              }}
            >
              {/* Session Header */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '8px'
              }}>
                <div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '2px'
                  }}>
                    Session #{session.id}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText
                  }}>
                    {formatDate(session.created_at)}
                  </div>
                </div>
                <span style={{
                  padding: '2px 6px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: '600',
                  backgroundColor: getStatusColor(session.status) + '20',
                  color: getStatusColor(session.status),
                  textTransform: 'uppercase'
                }}>
                  {session.status.replace(/_/g, ' ')}
                </span>
              </div>

              {/* File Name */}
              {session.original_filename && (
                <div style={{
                  fontSize: '11px',
                  color: colors.utility.secondaryText,
                  marginBottom: '8px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}>
                  📄 {session.original_filename}
                </div>
              )}

              {/* Progress Bar */}
              <div style={{
                marginBottom: '6px'
              }}>
                <div style={{
                  height: '4px',
                  backgroundColor: colors.utility.primaryText + '10',
                  borderRadius: '2px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    height: '100%',
                    width: `${getSuccessRate(session)}%`,
                    backgroundColor: getSuccessRate(session) > 80 
                      ? colors.semantic.success
                      : getSuccessRate(session) > 50
                        ? colors.semantic.warning
                        : colors.semantic.error,
                    transition: 'width 0.3s'
                  }} />
                </div>
              </div>

              {/* Stats */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                fontSize: '10px',
                color: colors.utility.secondaryText
              }}>
                <span>Total: {session.total_records.toLocaleString()}</span>
                <span style={{ color: colors.semantic.success }}>
                  ✓ {session.successful_records}
                </span>
                <span style={{ color: colors.semantic.error }}>
                  ✗ {session.failed_records}
                </span>
                <span style={{ color: colors.semantic.warning }}>
                  ⚠ {session.duplicate_records}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default SessionsSidebar;