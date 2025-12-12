// frontend/src/components/Import/SessionDetails.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { ImportSession } from '../../types/import.types';
import SessionMetrics from './SessionMetrics';
import SessionRecordsTable from './SessionRecordsTable';

interface SessionDetailsProps {
  session: ImportSession | null;
  onRefreshSessions?: () => void;
}

const SessionDetails: React.FC<SessionDetailsProps> = ({ session, onRefreshSessions }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  if (!session) {
    return (
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '400px',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        border: `1px solid ${colors.utility.primaryText}10`,
        padding: '40px'
      }}>
        <div style={{
          fontSize: '72px',
          marginBottom: '24px',
          opacity: 0.3
        }}>
          📊
        </div>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          No Session Selected
        </h3>
        <p style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          textAlign: 'center',
          maxWidth: '400px'
        }}>
          Select an import type above, then choose a session from the sidebar to view detailed metrics and records.
        </p>
      </div>
    );
  }

  return (
    <div style={{
      flex: 1,
      display: 'flex',
      flexDirection: 'column',
      gap: '24px'
    }}>
      {/* Session Metrics */}
      <SessionMetrics session={session} onStagingDeleted={onRefreshSessions} />

      {/* Session Records Table with Edit+Reprocess */}
      <SessionRecordsTable session={session} onRecordUpdated={onRefreshSessions} />
    </div>
  );
};

export default SessionDetails;
