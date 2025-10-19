// frontend/src/pages/nav/SchemeDashboardPage.tsx
// Extensible scheme dashboard - container for multiple components

import React, { useMemo, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useBookmarks } from '../../hooks/useNavData';
import { NavDataViewer } from '../../components/nav/NavDataViewer';
import { FrontendErrorLogger } from '../../services/errorLogger.service';

const SchemeDashboardPage: React.FC = () => {
  const { schemeId } = useParams<{ schemeId: string }>();
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const { bookmarks, isLoading } = useBookmarks();

  // Find bookmark for this scheme
  const bookmark = useMemo(() => {
    if (!schemeId) return null;
    return bookmarks.find(b => b.scheme_id === parseInt(schemeId));
  }, [bookmarks, schemeId]);

  useEffect(() => {
    FrontendErrorLogger.info('SchemeDashboardPage mounted', 'SchemeDashboardPage', { schemeId });
  }, [schemeId]);

  const handleBack = () => navigate(-1);

  // Loading
  if (isLoading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center', color: colors.utility.secondaryText }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: `4px solid ${colors.utility.secondaryBackground}`,
            borderTop: `4px solid ${colors.brand.primary}`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }} />
          Loading scheme dashboard...
        </div>
        <style>{`@keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  // Scheme not found
  if (!bookmark) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: colors.utility.primaryBackground,
        padding: '24px'
      }}>
        <div style={{
          maxWidth: '1400px',
          margin: '0 auto',
          padding: '40px',
          textAlign: 'center',
          backgroundColor: colors.semantic.warning + '10',
          borderRadius: '12px'
        }}>
          <div style={{ fontSize: '64px', marginBottom: '16px' }}>🔍</div>
          <h3 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Scheme Not Found
          </h3>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '20px'
          }}>
            The scheme you're looking for is not bookmarked or doesn't exist.
          </p>
          <button
            onClick={handleBack}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            ← Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1400px',
        margin: '0 auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px'
        }}>
          <button
            onClick={handleBack}
            style={{
              padding: '8px 12px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            ← Back
          </button>
          
          <div>
            <h1 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: colors.utility.primaryText,
              margin: '0 0 4px 0'
            }}>
              {bookmark.scheme_name}
            </h1>
            <p style={{
              fontSize: '13px',
              color: colors.utility.secondaryText,
              margin: 0
            }}>
              {bookmark.scheme_code} • {bookmark.amc_name}
            </p>
          </div>
        </div>

        {/* NAV Data Viewer Section */}
        <NavDataViewer bookmark={bookmark} />

        {/* 
          TODO: Add more sections here as needed:
          - Holdings breakdown
          - Performance metrics
          - Risk analysis
          - Comparison charts
          - etc.
        */}
        
        {/* Example placeholder for future sections */}
        {/* 
        <div style={{ marginTop: '24px' }}>
          <HoldingsBreakdown bookmark={bookmark} />
        </div>
        
        <div style={{ marginTop: '24px' }}>
          <PerformanceMetrics bookmark={bookmark} />
        </div>
        */}
      </div>
    </div>
  );
};

export default SchemeDashboardPage;