// frontend/src/pages/data-import/ImportDataPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { FileImportType, ImportState, ImportStepData } from '../../types/import.types';
import { API_ENDPOINTS } from '../../services/serviceURLs';

// Import step components
import ImportTypeSelection from '../../components/ETL/ImportTypeSelection';
import FileUploadComponent from '../../components/ETL/FileUploadComponent';
import HeaderPreview from '../../components/ETL/HeaderPreview';
import FieldMappingComponent from '../../components/ETL/FieldMapping';
import ProcessingStatus from '../../components/ETL/ProcessingStatus';
import ImportResults from '../../components/ETL/ImportResults';

// Define FieldMapping interface locally to avoid conflicts
interface FieldMappingData {
  sourceField: string;
  targetField: string;
  isRequired: boolean;
  transformation?: string;
  isActive: boolean;
}

interface ImportDataPageProps {
  step?: string;
}

const ImportDataPage: React.FC<ImportDataPageProps> = ({ step: propStep }) => {
  const { step: paramStep, sessionId } = useParams<{ step: string; sessionId: string }>();
  const navigate = useNavigate();
  const { tenantId, environment } = useAuth();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Determine current step from props or params
  const currentStepParam = propStep || paramStep || 'type-selection';

  // Initialize import state
  const [importState, setImportState] = useState<ImportState>({
    currentStep: 1,
    steps: [
      { step: 1, completed: false, data: null },
      { step: 2, completed: false, data: null },
      { step: 3, completed: false, data: null },
      { step: 4, completed: false, data: null },
      { step: 5, completed: false, data: null },
      { step: 6, completed: false, data: null },
    ]
  });

  // Map URL params to step numbers
  const stepMapping = {
    'type-selection': 1,
    'upload': 2,
    'preview': 3,
    'mapping': 4,
    'processing': 5,
    'results': 6
  };

  // Step configurations
  const stepConfig = [
    { number: 1, title: 'Select Type', description: 'Choose data import type' },
    { number: 2, title: 'Upload File', description: 'Upload CSV or Excel file' },
    { number: 3, title: 'Preview Headers', description: 'Review detected columns' },
    { number: 4, title: 'Map Fields', description: 'Map columns to database fields' },
    { number: 5, title: 'Process', description: 'Import data processing' },
    { number: 6, title: 'Results', description: 'View import results' }
  ];

  // Update current step based on URL
  useEffect(() => {
    const stepNumber = stepMapping[currentStepParam as keyof typeof stepMapping] || 1;
    setImportState((prev: ImportState) => ({
      ...prev,
      currentStep: stepNumber
    }));
  }, [currentStepParam]);

  // Navigation helpers
  const goToStep = (stepNumber: number) => {
    const stepNames = ['type-selection', 'upload', 'preview', 'mapping', 'processing', 'results'];
    const stepName = stepNames[stepNumber - 1];
    
    if (stepNumber === 6 && sessionId) {
      navigate(`/data-import/results/${sessionId}`);
    } else {
      navigate(`/data-import/${stepName}`);
    }
  };

  const nextStep = () => {
    if (importState.currentStep < 6) {
      goToStep(importState.currentStep + 1);
    }
  };

  const prevStep = () => {
    if (importState.currentStep > 1) {
      goToStep(importState.currentStep - 1);
    }
  };

  // Step completion handler
  const completeStep = (stepNumber: number, data?: any) => {
    setImportState((prev: ImportState) => ({
      ...prev,
      steps: prev.steps.map((step: ImportStepData) => 
        step.step === stepNumber 
          ? { ...step, completed: true, data }
          : step
      )
    }));
  };

  // Handle type selection
  const handleTypeSelection = (importType: FileImportType) => {
    console.log('Type selected:', importType);
    setImportState((prev: ImportState) => ({
      ...prev,
      selectedImportType: importType
    }));
    completeStep(1, { importType });
    nextStep();
  };

  // Handle file upload
  const handleFileUploaded = (fileInfo: any) => {
    setImportState((prev: ImportState) => ({
      ...prev,
      uploadedFile: fileInfo
    }));
    completeStep(2, { fileInfo });
    nextStep();
  };

  // Handle file upload error
  const handleFileUploadError = (error: string) => {
    console.error('File upload error:', error);
    // You can add toast notification here
  };

  // Handle headers confirmed
  const handleHeadersConfirmed = (headerData: any) => {
    setImportState((prev: ImportState) => ({
      ...prev,
      detectedHeaders: headerData
    }));
    completeStep(3, { headerData });
    nextStep();
  };

  // Handle header preview error
  const handleHeaderPreviewError = (error: string) => {
    console.error('Header preview error:', error);
    // You can add toast notification here
  };

  // Handle mapping confirmed - FIXED VERSION
  // In handleMappingConfirmed function, add these logs:
const handleMappingConfirmed = async (mappings: FieldMappingData[]) => {
  try {
    console.log('Starting mapping confirmation...');
    console.log('File ID:', importState.uploadedFile?.id);
    console.log('Mappings:', mappings);
    
    // Create import session with the field mappings
    const token = localStorage.getItem('access_token');
    const response = await fetch(API_ENDPOINTS.IMPORT.PROCESS, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Tenant-ID': String(tenantId),
        'X-Environment': environment || 'test'
      },
      body: JSON.stringify({
        fileId: importState.uploadedFile?.id,
        mappings: mappings,
        sessionName: `${importState.selectedImportType}_Import_${new Date().toISOString().split('T')[0]}`
      })
    });

    console.log('Response status:', response.status);
    const result = await response.json();
    console.log('Response data:', result);

    if (result.success) {
      console.log('Session created successfully:', result.data);
      setImportState((prev: ImportState) => {
        const newState = {
          ...prev,
          fieldMappings: mappings,
          importSession: result.data
        };
        console.log('New import state:', newState);
        return newState;
      });
      completeStep(4, { mappings, sessionId: result.data.sessionId });
      nextStep();
    } else {
      console.error('Failed to create session:', result.error);
      handleMappingError(result.error || 'Failed to start processing');
    }
  } catch (error: any) {
    console.error('Error in handleMappingConfirmed:', error);
    handleMappingError('Network error while starting processing');
  }
};

  // Handle mapping error
  const handleMappingError = (error: string) => {
    console.error('Mapping error:', error);
    // You can add toast notification here
  };

  // Handle processing complete
  const handleProcessingComplete = (results: any) => {
    setImportState((prev: ImportState) => ({
      ...prev,
      processingResults: results
    }));
    completeStep(5, { results });
    nextStep();
  };

  // Handle processing error
  const handleProcessingError = (error: string) => {
    console.error('Processing error:', error);
    // You can add toast notification here
  };

  // Handle processing cancel
  const handleProcessingCancel = () => {
    console.log('Processing cancelled');
    // Navigate back to mapping step
    goToStep(4);
  };

  // Handle import results error
  const handleImportResultsError = (error: string) => {
    console.error('Import results error:', error);
    // You can add toast notification here
  };

  // Step progress component
  const StepProgress = () => (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '32px',
      padding: '0 8px'
    }}>
      {stepConfig.map((step, index) => {
        const isActive = step.number === importState.currentStep;
        const isCompleted = importState.steps[index].completed;
        const isClickable = step.number <= importState.currentStep || isCompleted;
        
        return (
          <React.Fragment key={step.number}>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                cursor: isClickable ? 'pointer' : 'default',
                opacity: isClickable ? 1 : 0.5
              }}
              onClick={() => isClickable && goToStep(step.number)}
            >
              <div style={{
                width: '40px',
                height: '40px',
                borderRadius: '50%',
                backgroundColor: isActive 
                  ? colors.brand.primary 
                  : isCompleted 
                    ? colors.semantic.success 
                    : colors.utility.secondaryBackground,
                color: isActive || isCompleted ? 'white' : colors.utility.secondaryText,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: '600',
                fontSize: '14px',
                border: `2px solid ${isActive 
                  ? colors.brand.primary 
                  : isCompleted 
                    ? colors.semantic.success 
                    : colors.utility.primaryText + '20'}`,
                marginBottom: '8px'
              }}>
                {isCompleted ? '✓' : step.number}
              </div>
              
              <div style={{
                textAlign: 'center',
                maxWidth: '100px'
              }}>
                <div style={{
                  fontSize: '12px',
                  fontWeight: '600',
                  color: isActive ? colors.brand.primary : colors.utility.primaryText,
                  marginBottom: '2px'
                }}>
                  {step.title}
                </div>
                <div style={{
                  fontSize: '10px',
                  color: colors.utility.secondaryText,
                  lineHeight: '1.2'
                }}>
                  {step.description}
                </div>
              </div>
            </div>
            
            {index < stepConfig.length - 1 && (
              <div style={{
                flex: 1,
                height: '2px',
                backgroundColor: importState.steps[index].completed 
                  ? colors.semantic.success 
                  : colors.utility.primaryText + '20',
                margin: '0 16px',
                marginTop: '-20px'
              }} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );

  // Render current step content
  const renderStepContent = () => {
    switch (importState.currentStep) {
      case 1:
        return (
          <ImportTypeSelection
            onTypeSelect={handleTypeSelection}
            selectedType={importState.selectedImportType}
          />
        );
      
      case 2:
        if (!importState.selectedImportType) {
          return (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <p>Please select an import type first</p>
              <button 
                onClick={() => goToStep(1)}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                Go Back to Type Selection
              </button>
            </div>
          );
        }

        return (
          <FileUploadComponent
            importType={importState.selectedImportType}
            onFileUploaded={handleFileUploaded}
            onError={handleFileUploadError}
          />
        );
      
      case 3:
        if (!importState.uploadedFile) {
          return (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <p>Please upload a file first</p>
              <button 
                onClick={() => goToStep(2)}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                Go Back to File Upload
              </button>
            </div>
          );
        }

        return (
          <HeaderPreview
            fileId={importState.uploadedFile.id}
            fileName={importState.uploadedFile.original_filename}
            onHeadersConfirmed={handleHeadersConfirmed}
            onError={handleHeaderPreviewError}
          />
        );
      
      case 4:
        if (!importState.detectedHeaders || !importState.selectedImportType) {
          return (
            <div style={{
              textAlign: 'center',
              padding: '60px 20px',
              color: colors.utility.secondaryText
            }}>
              <p>Please complete header preview first</p>
              <button 
                onClick={() => goToStep(3)}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                Go Back to Header Preview
              </button>
            </div>
          );
        }

        return (
          <FieldMappingComponent
            importType={importState.selectedImportType}
            sourceHeaders={importState.detectedHeaders.headers}
            fileName={importState.uploadedFile?.original_filename || 'Unknown File'}
            onMappingConfirmed={handleMappingConfirmed}
            onError={handleMappingError}
          />
        );
      
      case 5:
        if (!importState.importSession) {
          return (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px', 
              color: colors.utility.secondaryText 
            }}>
              <p>Please complete field mapping first</p>
              <button 
                onClick={() => goToStep(4)}
                style={{
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  padding: '12px 24px',
                  marginTop: '16px',
                  cursor: 'pointer'
                }}
              >
                Go Back to Mapping
              </button>
            </div>
          );
        }

        return (
          <ProcessingStatus
            sessionId={importState.importSession.id}
            sessionName={importState.importSession.session_name}
            onProcessingComplete={handleProcessingComplete}
            onError={handleProcessingError}
            onCancel={handleProcessingCancel}
          />
        );
      
      case 6:
        return (
          <ImportResults
            sessionId={sessionId ? parseInt(sessionId) : (importState.importSession?.id || 0)}
            onStartNewImport={() => goToStep(1)}
            onError={handleImportResultsError}
          />
        );
      
      default:
        return null;
    }
  };

  return (
    <div style={{
      backgroundColor: colors.utility.primaryBackground,
      minHeight: '100vh',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '1200px',
        margin: '0 auto'
      }}>
        {/* Page Header */}
        <div style={{
          marginBottom: '32px'
        }}>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            marginBottom: '8px'
          }}>
            Data Import
          </h1>
          <p style={{
            fontSize: '16px',
            color: colors.utility.secondaryText
          }}>
            Import customer data and transaction information
          </p>
        </div>

        {/* Step Progress */}
        <StepProgress />

        {/* Main Content */}
        <div style={{
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '12px',
          border: `1px solid ${colors.utility.primaryText}10`,
          minHeight: '500px'
        }}>
          {renderStepContent()}
        </div>

        {/* Navigation Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '24px',
          padding: '16px 0'
        }}>
          <button
            onClick={prevStep}
            disabled={importState.currentStep === 1}
            style={{
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.primaryText}30`,
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: importState.currentStep === 1 ? 'not-allowed' : 'pointer',
              opacity: importState.currentStep === 1 ? 0.5 : 1
            }}
          >
            Previous
          </button>

          <div style={{
            fontSize: '14px',
            color: colors.utility.secondaryText
          }}>
            Step {importState.currentStep} of {stepConfig.length}
          </div>

          <button
            onClick={nextStep}
            disabled={importState.currentStep === 6}
            style={{
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              padding: '10px 20px',
              cursor: importState.currentStep === 6 ? 'not-allowed' : 'pointer',
              opacity: importState.currentStep === 6 ? 0.5 : 1
            }}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImportDataPage;