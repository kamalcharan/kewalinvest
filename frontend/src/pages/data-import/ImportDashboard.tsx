// frontend/src/pages/data-import/ImportDashboard.tsx
import React, { useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { FileImportType, ImportSession } from '../../types/import.types';
import ImportTypeRadioSelector from '../../components/Import/ImportTypeRadioSelector';
import SessionsSidebar from '../../components/Import/SessionsSidebar';
import SessionDetails from '../../components/Import/SessionDetails';

// Extended interface to handle API fields that might not be in base type
interface ExtendedImportSession extends ImportSession {
  original_filename?: string;
}

const ImportDashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const [selectedType, setSelectedType] = useState<FileImportType | null>('CustomerData');
  const [selectedSession, setSelectedSession] = useState<ExtendedImportSession | null>(null);

  const handleTypeChange = (type: FileImportType) => {
    setSelectedType(type);
    // Reset selected session when type changes
    setSelectedSession(null);
  };

  const handleSessionSelect = (session: ExtendedImportSession) => {
    setSelectedSession(session);
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Page Header */}
      <div style={{
        padding: '24px 24px 0 24px'
      }}>
        <div style={{
          marginBottom: '20px'
        }}>
          <h1 style={{
            fontSize: '24px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            marginBottom: '4px'
          }}>
            Import Dashboard
          </h1>
          <p style={{
            fontSize: '13px',
            color: colors.utility.secondaryText
          }}>
            View and manage your data import sessions
          </p>
        </div>

        {/* Import Type Selector */}
        <ImportTypeRadioSelector 
          selectedType={selectedType}
          onTypeChange={handleTypeChange}
        />
      </div>

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        gap: '24px',
        padding: '0 24px 24px 24px',
        overflow: 'hidden'
      }}>
        {/* Sessions Sidebar */}
        {selectedType && (
          <SessionsSidebar
            selectedType={selectedType}
            selectedSessionId={selectedSession?.id || null}
            onSessionSelect={handleSessionSelect}
          />
        )}

        {/* Session Details (Metrics + Records Table) */}
        <div style={{
          flex: 1,
          overflowY: 'auto',
          paddingRight: '4px' // Small padding for scrollbar
        }}>
          <SessionDetails session={selectedSession} />
        </div>
      </div>

      {/* Optional: Action Buttons */}
      <div style={{
        padding: '16px 24px',
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        backgroundColor: colors.utility.secondaryBackground,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText
        }}>
          {selectedSession ? (
            <>
              Session #{selectedSession.id} • 
              Created: {new Date(selectedSession.created_at).toLocaleDateString()} • 
              Type: {selectedType}
            </>
          ) : (
            'No session selected'
          )}
        </div>

        <div style={{
          display: 'flex',
          gap: '12px'
        }}>
          {selectedSession && selectedSession.failed_records > 0 && (
            <button
              onClick={() => {
                // Handle reprocess
                console.log('Reprocess failed records');
              }}
              style={{
                padding: '8px 16px',
                backgroundColor: colors.semantic.warning,
                color: 'white',
                border: 'none',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>🔄</span>
              Reprocess {selectedSession.failed_records} Failed Records
            </button>
          )}
          
          <button
            onClick={() => {
              // Navigate to new import
              window.location.href = `/data-import/type-selection?type=${selectedType}`;
            }}
            style={{
              padding: '8px 16px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              fontSize: '12px',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span>+</span>
            New Import
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDashboard;