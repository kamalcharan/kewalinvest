// frontend/src/components/cruiseControl/DataCleanupSection.tsx
// Tenant self-service data cleanup with animated progress modal

import React, { useState, useEffect } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { Trash2, AlertTriangle, CheckCircle, XCircle, Loader } from 'lucide-react';
import apiService from '../../services/api.service';
import { API_ENDPOINTS } from '../../services/serviceURLs';
import toastService from '../../services/toast.service';

interface CleanupPreview {
  transactions: number;
  importSessions: number;
  importStagingRecords: number;
  fileUploads: number;
  portfolioEntries: number;
  monthlySnapshots: number;
  goals: number;
  goalAlerts: number;
  goalProgressSnapshots: number;
  goalInvestmentAllocations: number;
  jtbdExecutions: number;
  customerAssetAssignments: number;
  totalRecords: number;
}

interface DeletionStep {
  id: string;
  label: string;
  count: number;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
}

export const DataCleanupSection: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const { environment } = useAuth() as any;
  const isLive = environment === 'live';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [preview, setPreview] = useState<CleanupPreview | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [deletionSteps, setDeletionSteps] = useState<DeletionStep[]>([]);
  const [_currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [deletionComplete, setDeletionComplete] = useState(false);
  const [deletionError, setDeletionError] = useState<string | null>(null);

  // Fetch preview when modal opens
  useEffect(() => {
    if (isModalOpen && !preview) {
      fetchPreview();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isModalOpen]);

  const fetchPreview = async () => {
    setIsLoadingPreview(true);
    try {
      const response = await apiService.get(`${API_ENDPOINTS.CRUISE_CONTROL.DATA_CLEANUP.PREVIEW}?is_live=${isLive}`) as any;
      if (response.success) {
        setPreview(response.data);
        // Initialize deletion steps
        initializeDeletionSteps(response.data);
      } else {
        toastService.error('Failed to load cleanup preview');
      }
    } catch (error: any) {
      console.error('Error fetching preview:', error);
      toastService.error('Failed to load cleanup preview');
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const initializeDeletionSteps = (data: CleanupPreview) => {
    const steps: DeletionStep[] = [
      { id: 'goalAllocations', label: 'Goal Investment Allocations', count: data.goalInvestmentAllocations, status: 'pending' as const },
      { id: 'goalProgress', label: 'Goal Progress Snapshots', count: data.goalProgressSnapshots, status: 'pending' as const },
      { id: 'goalAlerts', label: 'Goal Alerts', count: data.goalAlerts, status: 'pending' as const },
      { id: 'jtbdExecutions', label: 'JTBD Executions', count: data.jtbdExecutions, status: 'pending' as const },
      { id: 'goals', label: 'Goals & Configurations', count: data.goals, status: 'pending' as const },
      { id: 'assetAssignments', label: 'Asset Assignments', count: data.customerAssetAssignments, status: 'pending' as const },
      { id: 'snapshots', label: 'Monthly Snapshots', count: data.monthlySnapshots, status: 'pending' as const },
      { id: 'portfolio', label: 'Portfolio Entries', count: data.portfolioEntries, status: 'pending' as const },
      { id: 'transactions', label: 'Transactions', count: data.transactions, status: 'pending' as const },
      { id: 'staging', label: 'Import Staging Data', count: data.importStagingRecords, status: 'pending' as const },
      { id: 'sessions', label: 'Import Sessions', count: data.importSessions, status: 'pending' as const },
      { id: 'files', label: 'File Uploads', count: data.fileUploads, status: 'pending' as const },
    ].filter(step => step.count > 0); // Only show steps with data

    setDeletionSteps(steps);
  };

  const handleOpenModal = () => {
    setIsModalOpen(true);
    setConfirmationText('');
    setIsDeleting(false);
    setDeletionComplete(false);
    setDeletionError(null);
    setCurrentStepIndex(-1);
    setPreview(null);
  };

  const handleCloseModal = () => {
    if (isDeleting) return; // Prevent closing during deletion
    setIsModalOpen(false);
    setConfirmationText('');
    setPreview(null);
    setDeletionSteps([]);
  };

  const simulateStepProgress = async () => {
    // This simulates the visual progress while the actual deletion happens
    for (let i = 0; i < deletionSteps.length; i++) {
      setCurrentStepIndex(i);

      // Update step to in_progress
      setDeletionSteps(prev => prev.map((step, idx) =>
        idx === i ? { ...step, status: 'in_progress' } : step
      ));

      // Wait for visual effect (600ms per step)
      await new Promise(resolve => setTimeout(resolve, 600));

      // Update step to completed
      setDeletionSteps(prev => prev.map((step, idx) =>
        idx === i ? { ...step, status: 'completed' } : step
      ));

      // Small pause between steps
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  };

  const handleExecuteCleanup = async () => {
    if (confirmationText !== 'DELETE') {
      toastService.error('Please type DELETE to confirm');
      return;
    }

    setIsDeleting(true);
    setDeletionError(null);

    try {
      // Start the visual simulation
      const simulationPromise = simulateStepProgress();

      // Execute the actual cleanup
      const response = await apiService.post(`${API_ENDPOINTS.CRUISE_CONTROL.DATA_CLEANUP.EXECUTE}?is_live=${isLive}`, {
        confirmationText: 'DELETE'
      }) as any;

      // Wait for simulation to complete
      await simulationPromise;

      if (response.success) {
        setDeletionComplete(true);
        toastService.success(`Successfully deleted ${response.data.deletedCounts.totalRecords} records`);
      } else {
        throw new Error(response.error || 'Cleanup failed');
      }
    } catch (error: any) {
      console.error('Cleanup error:', error);
      setDeletionError(error.message || 'An error occurred during cleanup');

      // Mark remaining steps as error
      setDeletionSteps(prev => prev.map(step =>
        step.status === 'pending' || step.status === 'in_progress'
          ? { ...step, status: 'error' }
          : step
      ));

      toastService.error('Data cleanup failed');
    } finally {
      setIsDeleting(false);
    }
  };

  const formatNumber = (num: number): string => {
    return num.toLocaleString();
  };

  const getStepIcon = (status: DeletionStep['status']) => {
    switch (status) {
      case 'pending':
        return <div style={{ width: 20, height: 20, borderRadius: '50%', border: `2px solid ${colors.utility.secondaryText}40` }} />;
      case 'in_progress':
        return <Loader size={20} style={{ color: colors.brand.primary, animation: 'spin 1s linear infinite' }} />;
      case 'completed':
        return <CheckCircle size={20} style={{ color: colors.semantic.success }} />;
      case 'error':
        return <XCircle size={20} style={{ color: colors.semantic.error }} />;
    }
  };

  return (
    <>
      {/* Section Card */}
      <div style={{
        marginTop: '24px',
        padding: '24px',
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : 'white',
        borderRadius: '12px',
        border: `1px solid ${colors.semantic.error}30`
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <h3 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Trash2 size={20} style={{ color: colors.semantic.error }} />
              Data Cleanup
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: 0,
              maxWidth: '500px'
            }}>
              Permanently delete all transaction data, import history, portfolios, snapshots, and goals.
              This action cannot be undone.
            </p>
          </div>

          <button
            onClick={handleOpenModal}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              transition: 'opacity 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.opacity = '0.9'}
            onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
          >
            <Trash2 size={16} />
            Delete All Data
          </button>
        </div>
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          animation: 'fadeIn 0.2s ease-out'
        }}>
          <div style={{
            backgroundColor: colors.utility.primaryBackground,
            borderRadius: '16px',
            padding: '32px',
            maxWidth: '520px',
            width: '90%',
            maxHeight: '85vh',
            overflow: 'auto',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.4)',
            border: `2px solid ${colors.semantic.error}50`,
            animation: 'slideUp 0.3s ease-out'
          }}>
            {/* Modal Header */}
            <div style={{ textAlign: 'center', marginBottom: '24px' }}>
              <div style={{
                width: '64px',
                height: '64px',
                borderRadius: '50%',
                backgroundColor: `${colors.semantic.error}15`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px'
              }}>
                {deletionComplete ? (
                  <CheckCircle size={32} style={{ color: colors.semantic.success }} />
                ) : deletionError ? (
                  <XCircle size={32} style={{ color: colors.semantic.error }} />
                ) : (
                  <AlertTriangle size={32} style={{ color: colors.semantic.error }} />
                )}
              </div>

              <h2 style={{
                fontSize: '22px',
                fontWeight: '700',
                color: colors.utility.primaryText,
                margin: '0 0 8px 0'
              }}>
                {deletionComplete
                  ? 'Cleanup Complete!'
                  : deletionError
                    ? 'Cleanup Failed'
                    : isDeleting
                      ? 'Deleting Data...'
                      : 'Confirm Data Cleanup'}
              </h2>

              {!isDeleting && !deletionComplete && !deletionError && (
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  margin: 0
                }}>
                  This will permanently delete all your data
                </p>
              )}
            </div>

            {/* Loading Preview */}
            {isLoadingPreview && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Loader size={32} style={{ color: colors.brand.primary, animation: 'spin 1s linear infinite' }} />
                <p style={{ color: colors.utility.secondaryText, marginTop: '12px' }}>
                  Loading data summary...
                </p>
              </div>
            )}

            {/* Preview Counts (before deletion) */}
            {preview && !isDeleting && !deletionComplete && !deletionError && (
              <>
                <div style={{
                  backgroundColor: `${colors.semantic.error}08`,
                  borderRadius: '12px',
                  padding: '20px',
                  marginBottom: '24px'
                }}>
                  <p style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '16px'
                  }}>
                    The following data will be permanently deleted:
                  </p>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {preview.transactions > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Transactions</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.transactions)}</span>
                      </div>
                    )}
                    {preview.importSessions > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Import Sessions</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.importSessions)}</span>
                      </div>
                    )}
                    {preview.portfolioEntries > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Portfolio Entries</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.portfolioEntries)}</span>
                      </div>
                    )}
                    {preview.monthlySnapshots > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Snapshots</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.monthlySnapshots)}</span>
                      </div>
                    )}
                    {preview.goals > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Goals/Alerts</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.goals + preview.goalAlerts)}</span>
                      </div>
                    )}
                    {preview.customerAssetAssignments > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: colors.utility.secondaryText, fontSize: '13px' }}>Asset Plans</span>
                        <span style={{ color: colors.utility.primaryText, fontWeight: '600', fontSize: '13px' }}>{formatNumber(preview.customerAssetAssignments)}</span>
                      </div>
                    )}
                  </div>

                  <div style={{
                    marginTop: '16px',
                    paddingTop: '16px',
                    borderTop: `1px solid ${colors.utility.primaryText}15`,
                    display: 'flex',
                    justifyContent: 'space-between'
                  }}>
                    <span style={{ color: colors.utility.primaryText, fontWeight: '700', fontSize: '14px' }}>Total Records</span>
                    <span style={{ color: colors.semantic.error, fontWeight: '700', fontSize: '14px' }}>{formatNumber(preview.totalRecords)}</span>
                  </div>
                </div>

                {/* Confirmation Input */}
                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    marginBottom: '8px'
                  }}>
                    Type <span style={{ color: colors.semantic.error, fontFamily: 'monospace' }}>DELETE</span> to confirm:
                  </label>
                  <input
                    type="text"
                    value={confirmationText}
                    onChange={(e) => setConfirmationText(e.target.value.toUpperCase())}
                    placeholder="Type DELETE"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '16px',
                      fontFamily: 'monospace',
                      border: `2px solid ${confirmationText === 'DELETE' ? colors.semantic.success : colors.utility.primaryText}30`,
                      borderRadius: '8px',
                      backgroundColor: colors.utility.secondaryBackground,
                      color: colors.utility.primaryText,
                      outline: 'none',
                      transition: 'border-color 0.2s'
                    }}
                  />
                </div>
              </>
            )}

            {/* Deletion Progress Steps */}
            {(isDeleting || deletionComplete || deletionError) && deletionSteps.length > 0 && (
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                {deletionSteps.map((step, index) => (
                  <div
                    key={step.id}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px',
                      padding: '10px 0',
                      borderBottom: index < deletionSteps.length - 1 ? `1px solid ${colors.utility.primaryText}10` : 'none',
                      opacity: step.status === 'pending' ? 0.5 : 1,
                      transition: 'opacity 0.3s ease'
                    }}
                  >
                    {getStepIcon(step.status)}
                    <div style={{ flex: 1 }}>
                      <span style={{
                        fontSize: '14px',
                        color: step.status === 'in_progress' ? colors.brand.primary : colors.utility.primaryText,
                        fontWeight: step.status === 'in_progress' ? '600' : '400'
                      }}>
                        {step.label}
                      </span>
                    </div>
                    <span style={{
                      fontSize: '13px',
                      color: step.status === 'completed' ? colors.semantic.success : colors.utility.secondaryText,
                      fontWeight: '500',
                      fontFamily: 'monospace'
                    }}>
                      {step.status === 'completed' ? `${formatNumber(step.count)} deleted` : formatNumber(step.count)}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Error Message */}
            {deletionError && (
              <div style={{
                backgroundColor: `${colors.semantic.error}10`,
                borderRadius: '8px',
                padding: '12px 16px',
                marginBottom: '24px',
                color: colors.semantic.error,
                fontSize: '14px'
              }}>
                {deletionError}
              </div>
            )}

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              {!isDeleting && !deletionComplete && (
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: colors.utility.secondaryBackground,
                    color: colors.utility.primaryText,
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Cancel
                </button>
              )}

              {!isDeleting && !deletionComplete && !deletionError && preview && (
                <button
                  onClick={handleExecuteCleanup}
                  disabled={confirmationText !== 'DELETE' || preview.totalRecords === 0}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: confirmationText === 'DELETE' && preview.totalRecords > 0
                      ? colors.semantic.error
                      : colors.utility.secondaryText,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: confirmationText === 'DELETE' && preview.totalRecords > 0 ? 'pointer' : 'not-allowed',
                    fontSize: '14px',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    opacity: confirmationText === 'DELETE' && preview.totalRecords > 0 ? 1 : 0.5
                  }}
                >
                  <Trash2 size={16} />
                  Permanently Delete
                </button>
              )}

              {(deletionComplete || deletionError) && (
                <button
                  onClick={handleCloseModal}
                  style={{
                    padding: '12px 32px',
                    backgroundColor: colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    fontSize: '14px',
                    fontWeight: '600'
                  }}
                >
                  Close
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CSS Animations */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default DataCleanupSection;
