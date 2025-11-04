// frontend/src/pages/customers/CustomerViewPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Maximize2, Minimize2 } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import {
  toggleFullscreen,
  isFullscreen,
  onFullscreenChange,
  isFullscreenSupported
} from '../../utils/fullscreenUtils';
import ChartExport from '../../components/visualizations/chartViewer/export/ChartExport';
import { useCustomer } from '../../hooks/useCustomers';
import { usePortfolioData } from '../../hooks/usePortfolioData';
import { useCustomerJTBDs } from '../../hooks/useJTBD';
import { useCustomerGoals, useGoalSummary, useRecalculateGoal } from '../../hooks/useGoals';
import { TransactionService } from '../../services/transaction.service';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { MarketService } from '../../services/market.service';
import { TransactionWithDetails } from '../../types/transaction.types';
import { calculatePortfolioMoM, getMoMColor, getMoMArrow } from '../../utils/dataTransformers';
import PortfolioSummaryWidget from '../../components/portfolio/PortfolioSummaryWidget';
import PortfolioDonutChart from '../../components/visualizations/PortfolioDonutChart';
import PerformanceSparkline from '../../components/visualizations/PerformanceSparkline';
import JTBDList from '../../components/jtbd/JTBDList';
import JTBDSetupModal from '../../components/jtbd/JTBDSetupModal';
import TransactionTable from '../../components/transactions/TransactionTable';
import CustomerPortfolioGapAlert from '../../components/customers/CustomerPortfolioGapAlert';
import FamilyMembersPopover from '../../components/customers/FamilyMembersPopover';
import { CustomerViewHeader } from '../../components/customers/CustomerViewHeader';
import { CustomerMetricsBar } from '../../components/customers/CustomerMetricsBar';
import { MonthlyTrackingTabs } from '../../components/monthly-tracking/MonthlyTrackingTabs';
import GoalCard from '../../components/goals/GoalCard';
import GoalSetupModal from '../../components/goals/GoalSetupModal';
import GoalDetailsModal from '../../components/goals/GoalDetailsModal';
import { GoalProgressTracker } from '../../components/goals/GoalProgressTracker';
import { GoalWatchlistPanel } from '../../components/goals/GoalWatchlistPanel';
import { AssetAllocationUtilization } from '../../components/goals/AssetAllocationUtilization';
import type { MarketIndex } from '../../types/market.types';

const CustomerViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const customerId = id ? parseInt(id) : null;
  
  const initialTab = (searchParams.get('tab') as 'overview' | 'portfolio' | 'goals' | 'transactions') || 'overview';
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'goals' | 'transactions'>(initialTab);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [showJTBDSetupModal, setShowJTBDSetupModal] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'family'>('individual');
  const [selectedSchemeForTracking, setSelectedSchemeForTracking] = useState<string | null>(null);

  // Goal modal states
  const [showGoalSetupModal, setShowGoalSetupModal] = useState(false);
  const [showGoalDetailsModal, setShowGoalDetailsModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);

  // Index comparison state - FIXED: Changed to date-aware format
  const [defaultComparisonIndex, setDefaultComparisonIndex] = useState<MarketIndex | null>(null);
  const [comparisonIndexData, setComparisonIndexData] = useState<Array<{date: string, value: number}>>([]);
  const [isLoadingIndexComparison, setIsLoadingIndexComparison] = useState(false);
  const [showComparison, setShowComparison] = useState(true);
  const [isFullscreenMode, setIsFullscreenMode] = useState(false);

  // Chart element ID for export and fullscreen
  const performanceChartId = `performance-chart-${customerId}`;

  const [transactions, setTransactions] = useState<TransactionWithDetails[]>([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [transactionsError, setTransactionsError] = useState<string | null>(null);
  const [transactionsPagination, setTransactionsPagination] = useState({
    page: 1,
    page_size: 20,
    total: 0,
    total_pages: 1
  });

  const { data: customer, isLoading: customerLoading, error: customerError } = useCustomer(customerId || 0);
  const { portfolio, isLoading: portfolioLoading, error: portfolioError, refetch: refetchPortfolio } = usePortfolioData({
    customerId: customerId || undefined,
    autoFetch: !!customerId
  });
  
  const { data: jtbds, isLoading: jtbdLoading } = useCustomerJTBDs(customerId || undefined);

  // Load goals data
  const { data: goals = [], isLoading: goalsLoading, refetch: refetchGoals } = useCustomerGoals(customerId || 0);
  const { data: goalSummary, isLoading: goalSummaryLoading } = useGoalSummary(customerId || 0);
  const recalculateGoalMutation = useRecalculateGoal();

  const isLoading = customerLoading || portfolioLoading;

  const fetchTransactions = async (page: number = 1) => {
    if (!customerId) return;
    
    try {
      setTransactionsLoading(true);
      setTransactionsError(null);
      
      const response = await TransactionService.getTransactions({
        customer_id: customerId,
        page: page,
        page_size: 20,
        sort_by: 'txn_date',
        sort_order: 'desc'
      });
      
      if (response.success && response.data) {
        setTransactions(response.data.transactions);
        setTransactionsPagination(response.data.pagination);
      } else {
        setTransactionsError(response.error || 'Failed to load transactions');
      }
    } catch (error: any) {
      console.error('Error fetching transactions:', error);
      setTransactionsError(error.message || 'Failed to load transactions');
    } finally {
      setTransactionsLoading(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'transactions' && customerId) {
      fetchTransactions();
    }
  }, [activeTab, customerId]);

  // Auto-select first scheme for monthly tracking
  useEffect(() => {
    if (portfolio?.holdings && portfolio.holdings.length > 0 && !selectedSchemeForTracking) {
      setSelectedSchemeForTracking(portfolio.holdings[0].scheme_code);
    }
  }, [portfolio]);

  // FIXED: Load default comparison index and its data using new API method
  useEffect(() => {
    const loadDefaultIndexComparison = async () => {
      if (!portfolio?.performance || portfolio.performance.length === 0) {
        return;
      }

      try {
        setIsLoadingIndexComparison(true);

        // Get user's default comparison index preference
        const prefResponse = await UserPreferencesService.getDefaultComparisonIndex();
        if (!prefResponse.success || !prefResponse.data?.default_comparison_index_id) {
          // No default index set
          setDefaultComparisonIndex(null);
          setComparisonIndexData([]);
          return;
        }

        const indexId = prefResponse.data.default_comparison_index_id;

        // Fetch index details
        const indexResponse = await MarketService.getIndexById(indexId);
        if (!indexResponse.success || !indexResponse.data) {
          console.error('Failed to fetch index details');
          return;
        }

        setDefaultComparisonIndex(indexResponse.data);

        // Get date range from portfolio performance
        const performanceDates = portfolio.performance.map(p => p.date);
        const startDate = performanceDates[0];
        const endDate = performanceDates[performanceDates.length - 1];

        // FIXED: Use the new method that returns monthly data with dates
        const monthlyDataResponse = await MarketService.getIndexMonthlyDataForComparison(
          indexId,
          startDate,
          endDate
        );

        if (monthlyDataResponse.success && monthlyDataResponse.data) {
          // Data is already in {date, value} format
          setComparisonIndexData(monthlyDataResponse.data);
        }
      } catch (error) {
        console.error('Error loading index comparison:', error);
      } finally {
        setIsLoadingIndexComparison(false);
      }
    };

    loadDefaultIndexComparison();
  }, [portfolio?.performance]);

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreenMode(isFullscreen());
    };

    const cleanup = onFullscreenChange(handleFullscreenChange);

    return cleanup;
  }, []);

  useEffect(() => {
    setSearchParams({ tab: activeTab });
  }, [activeTab, setSearchParams]);

  useEffect(() => {
    console.group('CustomerViewPage Debug Info');
    console.log('🔍 URL Param ID:', id);
    console.log('🔢 Parsed Customer ID:', customerId);
    console.log('👤 Customer Data:', customer);
    console.log('💼 Portfolio Data:', portfolio);
    console.log('🎯 JTBD Data:', jtbds);
    console.log('⏳ Loading States:', { customerLoading, portfolioLoading, jtbdLoading, isLoading });
    console.log('❌ Errors:', { customerError, portfolioError });
    console.groupEnd();
  }, [id, customerId, customer, portfolio, jtbds, customerLoading, portfolioLoading, jtbdLoading, customerError, portfolioError]);

  // Calculate MoM changes for portfolio performance
  const portfolioWithMoM = useMemo(() => {
    if (!portfolio?.performance || portfolio.performance.length === 0) return [];
    return calculatePortfolioMoM(portfolio.performance);
  }, [portfolio?.performance]);

  // Get latest MoM change for badge
  const latestMoM = useMemo(() => {
    if (portfolioWithMoM.length < 2) return null;
    return portfolioWithMoM[portfolioWithMoM.length - 1].mom_change_percentage;
  }, [portfolioWithMoM]);

  const formatCurrency = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '₹0';
    }
    if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)}Cr`;
    if (value >= 100000) return `₹${(value / 100000).toFixed(2)}L`;
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatPercentage = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return '0.0%';
    }
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(1)}%`;
  };

  const getValueColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined || isNaN(value)) {
      return colors.utility.secondaryText;
    }
    if (value > 0) return '#10B981';
    if (value < 0) return '#EF4444';
    return colors.utility.secondaryText;
  };

  const ArrowLeftIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12,19 5,12 12,5" />
    </svg>
  );

  const DownloadIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  );

  const TrendUpIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,6 13.5,15.5 8.5,10.5 1,18" />
      <polyline points="17,6 23,6 23,12" />
    </svg>
  );

  const TrendDownIcon = () => (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23,18 13.5,8.5 8.5,13.5 1,6" />
      <polyline points="17,18 23,18 23,12" />
    </svg>
  );

  const StarIcon = () => (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2">
      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
    </svg>
  );

  const AlertIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );

  const PackageIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <line x1="16.5" y1="9.4" x2="7.5" y2="4.21" />
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z" />
      <polyline points="3.27 6.96 12 12.01 20.73 6.96" />
      <line x1="12" y1="22.08" x2="12" y2="12" />
    </svg>
  );

  const FileTextIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14,2 14,8 20,8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10,9 9,9 8,9" />
    </svg>
  );

  const PieChartIcon = () => (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M21.21 15.89A10 10 0 1 1 8 2.83" />
      <path d="M22 12A10 10 0 0 0 12 2v10z" />
    </svg>
  );

  const LoadingState = () => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: '20px'
    }}>
      <div style={{
        width: '60px',
        height: '60px',
        border: `4px solid ${colors.brand.primary}20`,
        borderTop: `4px solid ${colors.brand.primary}`,
        borderRadius: '50%',
        animation: 'spin 1s linear infinite'
      }} />
      <div style={{
        fontSize: '16px',
        color: colors.utility.primaryText,
        fontWeight: '500'
      }}>
        Loading customer data...
      </div>
      <div style={{
        fontSize: '13px',
        color: colors.utility.secondaryText
      }}>
        Customer ID: {customerId}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

  const ErrorState = ({ message, details }: { message: string; details?: string }) => (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '24px'
    }}>
      <div style={{
        maxWidth: '500px',
        width: '100%',
        backgroundColor: colors.utility.secondaryBackground,
        borderRadius: '12px',
        padding: '32px',
        textAlign: 'center',
        border: `1px solid ${colors.semantic.error}30`
      }}>
        <div style={{
          color: colors.semantic.error,
          marginBottom: '16px',
          display: 'flex',
          justifyContent: 'center'
        }}>
          <AlertIcon />
        </div>
        <h2 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: colors.utility.primaryText,
          marginBottom: '8px'
        }}>
          {message}
        </h2>
        {details && (
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            marginBottom: '24px'
          }}>
            {details}
          </p>
        )}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'center'
        }}>
          <button
            onClick={() => navigate('/customers')}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.brand.primary,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Back to Customers
          </button>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: '10px 20px',
              backgroundColor: colors.utility.secondaryBackground,
              color: colors.utility.primaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500'
            }}
          >
            Retry
          </button>
        </div>
      </div>
    </div>
  );

  const EmptyState = ({ 
    icon, 
    title, 
    description, 
    actionLabel, 
    onAction 
  }: { 
    icon: React.ReactNode; 
    title: string; 
    description: string; 
    actionLabel?: string; 
    onAction?: () => void;
  }) => (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '60px 24px',
      textAlign: 'center'
    }}>
      <div style={{
        color: colors.brand.primary,
        marginBottom: '20px',
        opacity: 0.6,
        display: 'flex',
        justifyContent: 'center'
      }}>
        {icon}
      </div>
      <h3 style={{
        fontSize: '18px',
        fontWeight: '600',
        color: colors.utility.primaryText,
        marginBottom: '8px'
      }}>
        {title}
      </h3>
      <p style={{
        fontSize: '14px',
        color: colors.utility.secondaryText,
        marginBottom: actionLabel ? '24px' : '0',
        lineHeight: '1.6',
        maxWidth: '500px',
        margin: '0 auto'
      }}>
        {description}
      </p>
      {actionLabel && onAction && (
        <button
          onClick={onAction}
          style={{
            marginTop: '24px',
            padding: '12px 24px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: '14px',
            fontWeight: '500',
            transition: 'transform 0.2s ease'
          }}
          onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
          onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          {actionLabel}
        </button>
      )}
    </div>
  );

  // Fullscreen handler
  const handleFullscreenToggle = async () => {
    try {
      await toggleFullscreen(performanceChartId);
    } catch (error: any) {
      console.error('Fullscreen toggle failed:', error);
    }
  };

  if (!customerId) {
    return <ErrorState 
      message="Invalid Customer ID" 
      details="The customer ID in the URL is invalid or missing." 
    />;
  }

  if (isLoading) {
    return <LoadingState />;
  }

  if (customerError) {
    return <ErrorState 
      message="Failed to Load Customer" 
      details={`Error fetching customer #${customerId}. Please try again.`}
    />;
  }

  if (!customer) {
    return <ErrorState 
      message="Customer Not Found" 
      details={`No customer found with ID: ${customerId}`}
    />;
  }

  const profitLoss = portfolio?.summary.total_returns ?? 0;
  const dayChangePercentage = portfolio?.summary.day_change_percentage ?? 0;
  const returnPercentage = portfolio?.summary.return_percentage ?? 0;
  
  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <CustomerViewHeader
        customer={customer}
        portfolio={portfolio}
        customerId={customer.id}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Key Metrics Bar */}
      {portfolio && (
        <CustomerMetricsBar
          portfolio={portfolio}
          jtbds={jtbds}
        />
      )}

      {/* Tabs */}
      <div style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex' }}>
          {['overview', 'portfolio', 'goals', 'transactions'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab as any)}
              style={{
                padding: '16px 24px',
                backgroundColor: 'transparent',
                border: 'none',
                borderBottom: activeTab === tab ? `3px solid ${colors.brand.primary}` : '3px solid transparent',
                color: activeTab === tab ? colors.brand.primary : colors.utility.secondaryText,
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                transition: 'all 0.2s ease'
              }}
            >
              {tab === 'goals' ? 'Goals & Actions' : tab}
            </button>
          ))}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <>
            {!portfolio ? (
              <EmptyState
                icon={<PackageIcon />}
                title="Portfolio Data Not Available"
                description="Portfolio data will appear once transactions are imported for this customer."
                actionLabel="Import Transactions"
                onAction={() => navigate('/import')}
              />
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Portfolio Performance Chart */}
                  <div
                    id={performanceChartId}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      padding: '24px',
                      position: 'relative'
                    }}
                  >
                    {/* MoM Badge - Top Right Corner */}
                    {latestMoM !== null && portfolioWithMoM.length > 1 && (
                      <div
                        style={{
                          position: 'absolute',
                          top: '20px',
                          right: '20px',
                          zIndex: 10,
                          padding: '8px 16px',
                          borderRadius: '8px',
                          backgroundColor: latestMoM >= 0
                            ? colors.semantic.success + '20'
                            : colors.semantic.error + '20',
                          border: `1px solid ${latestMoM >= 0 ? colors.semantic.success : colors.semantic.error}40`,
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          fontSize: '13px',
                          fontWeight: '600',
                          boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
                        }}
                      >
                        <span style={{ fontSize: '14px' }}>
                          {latestMoM >= 0 ? '📈' : '📉'}
                        </span>
                        <span style={{
                          color: latestMoM >= 0 ? colors.semantic.success : colors.semantic.error
                        }}>
                          {getMoMArrow(latestMoM)} {Math.abs(latestMoM).toFixed(2)}%
                        </span>
                        <span style={{
                          fontSize: '11px',
                          color: colors.utility.secondaryText
                        }}>
                          vs last month
                        </span>
                      </div>
                    )}

                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
                        Portfolio Performance
                      </h3>
                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                        {/* FIXED: Proper comparison toggle with state check */}
                        {!isLoadingIndexComparison && defaultComparisonIndex && comparisonIndexData.length > 0 && (
                          <button
                            onClick={() => setShowComparison(!showComparison)}
                            title={showComparison ? 'Hide index comparison' : 'Show index comparison'}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: showComparison ? colors.brand.primary + '20' : 'transparent',
                              color: showComparison ? colors.brand.primary : colors.utility.secondaryText,
                              border: `1px solid ${showComparison ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {showComparison ? <Eye size={14} /> : <EyeOff size={14} />}
                            {showComparison ? 'Hide' : 'Show'} {defaultComparisonIndex.index_name}
                          </button>
                        )}

                        {/* Fullscreen Button */}
                        {isFullscreenSupported() && (
                          <button
                            onClick={handleFullscreenToggle}
                            title={isFullscreenMode ? 'Exit Fullscreen (ESC)' : 'Enter Fullscreen'}
                            style={{
                              padding: '6px 12px',
                              backgroundColor: colors.utility.primaryBackground,
                              color: colors.utility.primaryText,
                              border: `1px solid ${colors.utility.primaryText}20`,
                              borderRadius: '6px',
                              fontSize: '12px',
                              fontWeight: '500',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {isFullscreenMode ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
                            {isFullscreenMode ? 'Exit' : 'Fullscreen'}
                          </button>
                        )}

                        {/* Export Button */}
                        <ChartExport
                          elementId={performanceChartId}
                          indexName={customer?.name || 'Portfolio'}
                          colors={colors}
                        />
                      </div>
                    </div>
                    
                    <div style={{ height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {portfolio.performance && portfolio.performance.length > 1 ? (
                        <div style={{ width: '100%', height: '100%' }}>
                          {/* FIXED: Proper props with comparison data */}
                          <PerformanceSparkline
  performanceData={portfolioWithMoM}
  data={portfolio.performance.map(p => p.current_value ?? 0)}
  width={600}
  height={250}
  showArea={true}
  showDots={true}
  interactive={true}
  timeframe={selectedTimeframe}
  showTimelineMarkers={true}
  timelineMarkerSize={5}
  showComparison={showComparison && !isLoadingIndexComparison && comparisonIndexData.length > 0}
comparisonData={comparisonIndexData}
  comparisonIndexName={defaultComparisonIndex?.index_name}
/>
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            textAlign: 'center',
                            marginTop: '12px'
                          }}>
                            Showing {portfolio.performance.length} data point{portfolio.performance.length !== 1 ? 's' : ''} ({selectedTimeframe})
                            {showComparison && defaultComparisonIndex && comparisonIndexData.length > 0 && (
                              <span style={{ marginLeft: '8px', color: '#FCD34D' }}>
                                • Compared with {defaultComparisonIndex.index_name}
                              </span>
                            )}
                          </div>
                        </div>
                      ) : (
                        <div style={{ textAlign: 'center' }}>
                          <div style={{ 
                            fontSize: '48px', 
                            fontWeight: '700', 
                            color: colors.brand.primary,
                            marginBottom: '12px'
                          }}>
                            {formatCurrency(portfolio.summary.current_value)}
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            color: colors.utility.secondaryText,
                            marginBottom: '8px'
                          }}>
                            Current Portfolio Value
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: colors.utility.secondaryText,
                            fontStyle: 'italic'
                          }}>
                            Historical performance data will appear as more transactions are recorded
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick JTBD Summary */}
                  {jtbds && jtbds.length > 0 && (
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      padding: '20px'
                    }}>
                      <h3 style={{ 
                        fontSize: '16px', 
                        fontWeight: '600', 
                        color: colors.utility.primaryText, 
                        margin: '0 0 16px 0'
                      }}>
                        Upcoming Actions
                      </h3>
                      <div style={{ fontSize: '14px', color: colors.utility.secondaryText }}>
                        {jtbds.filter(j => j.is_active).length} active alerts configured. 
                        <button
                          onClick={() => setActiveTab('goals')}
                          style={{
                            marginLeft: '8px',
                            padding: '4px 12px',
                            backgroundColor: colors.brand.primary,
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500'
                          }}
                        >
                          View All
                        </button>
                      </div>
                    </div>
                  )}
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Asset Allocation */}
                  <div style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: colors.utility.primaryText, 
                      margin: 0,
                      marginBottom: '20px'
                    }}>
                      Asset Allocation
                    </h3>
                    {portfolio.allocation && portfolio.allocation.length > 0 ? (
                      <PortfolioDonutChart
                        allocation={portfolio.allocation}
                        size={240}
                        strokeWidth={35}
                        showLegend={true}
                        totalValue={portfolio.summary.current_value}
                      />
                    ) : (
                      <div style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 20px',
                        textAlign: 'center'
                      }}>
                        <div style={{
                          color: colors.brand.primary,
                          marginBottom: '16px',
                          opacity: 0.4
                        }}>
                          <PieChartIcon />
                        </div>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: colors.utility.primaryText,
                          marginBottom: '6px'
                        }}>
                          No Asset Allocation Data
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: colors.utility.secondaryText,
                          lineHeight: '1.5'
                        }}>
                          Asset distribution will appear once portfolio holdings are available
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Top Holdings */}
                  {portfolio.holdings && portfolio.holdings.length > 0 && (
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      padding: '24px'
                    }}>
                      <h3 style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: colors.utility.primaryText, 
                        margin: 0,
                        marginBottom: '20px'
                      }}>
                        Top Holdings
                      </h3>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {portfolio.holdings.slice(0, 4).map((holding, idx) => (
                          <div key={idx} style={{
                            padding: '12px',
                            backgroundColor: colors.utility.primaryBackground,
                            borderRadius: '8px'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                              <div style={{ fontSize: '13px', fontWeight: '500', color: colors.utility.primaryText }}>
                                {holding.fund_name || holding.scheme_name} ({holding.scheme_code})
                              </div>
                              <div style={{ fontSize: '13px', fontWeight: '600', color: getValueColor(holding.return_percentage) }}>
                                {formatPercentage(holding.return_percentage)}
                              </div>
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                                Value: {formatCurrency(holding.current_value)}
                              </div>
                              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                                {(holding.allocation_percentage ?? 0).toFixed(1)}%
                              </div>
                            </div>
                            <div style={{
                              width: '100%',
                              height: '4px',
                              backgroundColor: colors.utility.primaryText + '20',
                              borderRadius: '2px',
                              overflow: 'hidden'
                            }}>
                              <div style={{
                                width: `${holding.allocation_percentage ?? 0}%`,
                                height: '100%',
                                backgroundColor: colors.brand.primary
                              }} />
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Portfolio Tab */}
        {activeTab === 'portfolio' && (
          <>
            {!portfolio ? (
              <EmptyState
                icon={<PackageIcon />}
                title="No Active Investments Found"
                description="Portfolio holdings will appear once transactions are imported for this customer."
                actionLabel="Import Transactions"
                onAction={() => navigate('/import')}
              />
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                <CustomerPortfolioGapAlert 
                  customerId={customerId}
                  onRefresh={() => refetchPortfolio()}
                />
                
                <PortfolioSummaryWidget portfolio={portfolio} compact={false} showSparkline={true} />
                
                {portfolio.holdings && portfolio.holdings.length > 0 && (
                  <div style={{
                    backgroundColor: colors.utility.secondaryBackground,
                    borderRadius: '12px',
                    padding: '24px'
                  }}>
                    <h3 style={{ 
                      fontSize: '18px', 
                      fontWeight: '600', 
                      color: colors.utility.primaryText, 
                      margin: 0,
                      marginBottom: '20px'
                    }}>
                      Fund-wise Performance
                    </h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead>
                        <tr style={{ borderBottom: `1px solid ${colors.utility.primaryText}20` }}>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '12px', color: colors.utility.secondaryText }}>FUND NAME</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>INVESTED</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>CURRENT VALUE</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>RETURNS</th>
                          <th style={{ padding: '12px', textAlign: 'right', fontSize: '12px', color: colors.utility.secondaryText }}>ALLOCATION</th>
                        </tr>
                      </thead>
                      <tbody>
                        {portfolio.holdings.map((holding, idx) => {
                          const isSmallReturn = Math.abs(holding.return_percentage) < 0.1;
                          
                          return (
                            <tr key={idx} style={{ borderBottom: `1px solid ${colors.utility.primaryText}10` }}>
                              <td style={{ padding: '12px', fontSize: '13px', color: colors.utility.primaryText }}>
                                {holding.fund_name || holding.scheme_name} ({holding.scheme_code})
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                                {formatCurrency(holding.total_invested)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                                {formatCurrency(holding.current_value)}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right' }}>
                                {isSmallReturn ? (
                                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                                    <div style={{ 
                                      fontSize: '13px', 
                                      fontWeight: '600', 
                                      color: getValueColor(holding.return_percentage) 
                                    }}>
                                      {formatPercentage(holding.return_percentage)}
                                    </div>
                                    <div style={{ 
                                      fontSize: '10px', 
                                      color: colors.utility.secondaryText,
                                      fontStyle: 'italic'
                                    }}>
                                      (₹{holding.total_returns.toFixed(2)})
                                    </div>
                                  </div>
                                ) : (
                                  <div style={{ 
                                    fontSize: '13px', 
                                    fontWeight: '600', 
                                    color: getValueColor(holding.return_percentage) 
                                  }}>
                                    {formatPercentage(holding.return_percentage)}
                                  </div>
                                )}
                              </td>
                              <td style={{ padding: '12px', textAlign: 'right', fontSize: '13px', color: colors.utility.primaryText }}>
                                {(holding.allocation_percentage ?? 0).toFixed(1)}%
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {/* Monthly Tracking Section */}
                {portfolio.holdings && portfolio.holdings.length > 0 && selectedSchemeForTracking && (
                  <div>
                    {/* Scheme Selector for Monthly Tracking */}
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '12px',
                      padding: '16px 24px',
                      marginBottom: '16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <label style={{
                        fontSize: '14px',
                        fontWeight: 600,
                        color: colors.utility.primaryText,
                        whiteSpace: 'nowrap'
                      }}>
                        Monthly Tracking for:
                      </label>
                      <select
                        value={selectedSchemeForTracking}
                        onChange={(e) => setSelectedSchemeForTracking(e.target.value)}
                        style={{
                          flex: 1,
                          padding: '10px 14px',
                          fontSize: '14px',
                          color: colors.utility.primaryText,
                          backgroundColor: colors.utility.primaryBackground,
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '6px',
                          cursor: 'pointer',
                          outline: 'none'
                        }}
                      >
                        {portfolio.holdings.map((holding) => (
                          <option key={holding.scheme_code} value={holding.scheme_code}>
                            {holding.fund_name || holding.scheme_name} ({holding.scheme_code})
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Monthly Tracking Tabs */}
                    <MonthlyTrackingTabs
                      customerId={customerId}
                      schemeCode={selectedSchemeForTracking}
                      months={12}
                    />
                  </div>
                )}
              </div>
            )}
          </>
        )}

        {/* Goals & Actions Tab */}
        {activeTab === 'goals' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Header with Action Button */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{
                  fontSize: '24px',
                  fontWeight: '700',
                  color: colors.utility.primaryText,
                  margin: '0 0 8px 0'
                }}>
                  Goals & Tracking
                </h2>
                {goalSummary && (
                  <p style={{
                    fontSize: '14px',
                    color: colors.utility.secondaryText,
                    margin: 0
                  }}>
                    {goals.length} active goal{goals.length !== 1 ? 's' : ''} •
                    {goalSummary.goals_on_track} on track •
                    {goalSummary.goals_behind} behind
                  </p>
                )}
              </div>
              <button
                onClick={() => setShowGoalSetupModal(true)}
                style={{
                  padding: '12px 24px',
                  backgroundColor: colors.brand.primary,
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <span style={{ fontSize: '18px' }}>+</span>
                Create New Goal
              </button>
            </div>

            {goalsLoading ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                color: colors.utility.secondaryText
              }}>
                Loading goals...
              </div>
            ) : goals.length === 0 ? (
              <div style={{
                padding: '60px 40px',
                textAlign: 'center',
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                border: `2px dashed ${colors.utility.primaryText}20`
              }}>
                <div style={{ fontSize: '48px', marginBottom: '16px' }}>🎯</div>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '8px'
                }}>
                  No Goals Set
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: colors.utility.secondaryText,
                  marginBottom: '24px'
                }}>
                  Create your first investment goal to start tracking progress
                </p>
                <button
                  onClick={() => setShowGoalSetupModal(true)}
                  style={{
                    padding: '12px 24px',
                    backgroundColor: colors.brand.primary,
                    color: 'white',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer'
                  }}
                >
                  Create First Goal
                </button>
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                {/* Left Column - Goals List */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Active Goals */}
                  {goals.filter(g => g.is_active).map(goal => (
                    <GoalCard
                      key={goal.id}
                      goal={goal}
                      onEdit={(goalId: number) => {
                        setSelectedGoalId(goalId);
                        setShowGoalDetailsModal(true);
                      }}
                      onRecalculate={(goalId: number) => {
                        recalculateGoalMutation.mutate(goalId);
                      }}
                    />
                  ))}
                </div>

                {/* Right Column - Tracking Panels */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Progress Tracker */}
                  <GoalProgressTracker
                    customerId={customerId!}
                    onWatchlistChange={() => refetchGoals()}
                  />

                  {/* Watchlist Panel */}
                  <GoalWatchlistPanel customerId={customerId!} />

                  {/* Asset Allocation Utilization */}
                  <AssetAllocationUtilization customerId={customerId!} />
                </div>
              </div>
            )}

            {/* Legacy JTBD Section */}
            {jtbds && jtbds.length > 0 && (
              <div style={{ marginTop: '24px' }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '16px'
                }}>
                  Alerts & Reminders
                </h3>
                <JTBDList
                  customerId={customerId}
                  onSetupNew={() => setShowJTBDSetupModal(true)}
                  onEdit={(jtbdId) => {
                    console.log('Edit JTBD:', jtbdId);
                  }}
                  showFilters={true}
                />
              </div>
            )}
          </div>
        )}

        {/* Transactions Tab */}
        {activeTab === 'transactions' && (
          <>
            {transactionsError ? (
              <div style={{
                padding: '40px',
                textAlign: 'center',
                backgroundColor: colors.semantic.error + '10',
                borderRadius: '12px',
                color: colors.semantic.error
              }}>
                <p style={{ marginBottom: '16px' }}>{transactionsError}</p>
                <button
                  onClick={() => fetchTransactions(1)}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: colors.semantic.error,
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Retry
                </button>
              </div>
            ) : transactions.length === 0 && !transactionsLoading ? (
              <EmptyState
                icon={<FileTextIcon />}
                title="No Transactions Found"
                description={`No transaction history available for ${customer.name}. Transactions will appear here once imported.`}
              />
            ) : (
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '20px'
                }}>
                  <h3 style={{
                    fontSize: '18px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    margin: 0
                  }}>
                    Transaction History
                  </h3>
                  <div style={{
                    fontSize: '14px',
                    color: colors.utility.secondaryText
                  }}>
                    {transactionsPagination.total} transaction{transactionsPagination.total !== 1 ? 's' : ''}
                  </div>
                </div>

                <TransactionTable
                  transactions={transactions}
                  loading={transactionsLoading}
                  onRowClick={(transaction) => {
                    navigate(`/transactions/${transaction.id}`);
                  }}
                  onDelete={async (transactionId) => {
                    try {
                      await TransactionService.deleteTransaction(transactionId);
                      fetchTransactions(transactionsPagination.page);
                      refetchPortfolio();
                    } catch (error) {
                      console.error('Failed to delete transaction:', error);
                    }
                  }}
                  onTogglePortfolioFlag={async (transactionId, currentFlag) => {
                    try {
                      await TransactionService.updatePortfolioFlag(transactionId, !currentFlag);
                      fetchTransactions(transactionsPagination.page);
                      refetchPortfolio();
                    } catch (error) {
                      console.error('Failed to toggle portfolio flag:', error);
                    }
                  }}
                  pagination={transactionsPagination}
                  onPageChange={(newPage) => fetchTransactions(newPage)}
                  onSortChange={(sortBy, sortOrder) => {
                    console.log('Sort by:', sortBy, sortOrder);
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>

      {/* JTBD Setup Modal */}
      {showJTBDSetupModal && (
        <JTBDSetupModal
          customerId={customerId}
          onClose={() => setShowJTBDSetupModal(false)}
          onSuccess={() => {
            setShowJTBDSetupModal(false);
          }}
        />
      )}

      {/* Goal Modals */}
      {showGoalSetupModal && (
        <GoalSetupModal
          customerId={customerId!}
          onClose={() => setShowGoalSetupModal(false)}
          onSuccess={() => {
            setShowGoalSetupModal(false);
            refetchGoals();
          }}
        />
      )}

      {showGoalDetailsModal && selectedGoalId && (
        <GoalDetailsModal
          goalId={selectedGoalId}
          onClose={() => {
            setShowGoalDetailsModal(false);
            setSelectedGoalId(null);
            refetchGoals();
          }}
        />
      )}

    </div>
  );
};

export default CustomerViewPage;