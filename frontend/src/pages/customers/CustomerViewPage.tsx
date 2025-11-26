// frontend/src/pages/customers/CustomerViewPage.tsx

import React, { useState, useEffect, useMemo } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { Eye, EyeOff, Maximize2, Minimize2, BarChart3, TrendingUp, Target, CheckSquare, DollarSign, Package } from 'lucide-react';
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
import { useCustomerGoals, useGoalSummary, useRecalculateGoal, useAddToWatchlist, useRemoveFromWatchlist } from '../../hooks/useGoals';
import { TransactionService } from '../../services/transaction.service';
import { UserPreferencesService } from '../../services/userPreferences.service';
import { MarketService } from '../../services/market.service';
import { TransactionWithDetails } from '../../types/transaction.types';
import { calculatePortfolioMoM, getMoMArrow } from '../../utils/dataTransformers';
import PortfolioDonutChart from '../../components/visualizations/PortfolioDonutChart';
import PerformanceSparkline from '../../components/visualizations/PerformanceSparkline';
import PerformanceComparisonChart from '../../components/visualizations/PerformanceComparisonChart';
import JTBDList from '../../components/jtbd/JTBDList';
import JTBDSetupModal from '../../components/jtbd/JTBDSetupModal';
import TransactionTable from '../../components/transactions/TransactionTable';
import CustomerPortfolioGapAlert from '../../components/customers/CustomerPortfolioGapAlert';
import { CustomerViewHeader } from '../../components/customers/CustomerViewHeader';
import { IndexSelector } from '../../components/performance/IndexSelector';
import { CustomerMetricsBar } from '../../components/customers/CustomerMetricsBar';
import { PortfolioSnapshotsTable } from '../../components/portfolio/PortfolioSnapshotsTable';
import { NetworthProjectionChart } from '../../components/portfolio/NetworthProjectionChart';
import { PortfolioAllocationSummary } from '../../components/portfolio/PortfolioAllocationSummary';
import { SchemeCard } from '../../components/common/SchemeCard';
import GoalCard from '../../components/goals/GoalCard';
import { AssetAllocationUtilization } from '../../components/goals/AssetAllocationUtilization';
import GoalRecalculationModal from '../../components/goals/GoalRecalculationModal';
import { GoalQuickActions } from '../../components/goals/GoalQuickActions';
import { CreateMeetingModal } from '../../components/meetings/CreateMeetingModal';
import { JTBDExecutionTimeline } from '../../components/jtbd/JTBDExecutionTimeline';
import { FamilyPortfolioView } from '../../components/family/FamilyPortfolioView';
import { CustomerAssetManager } from '../../components/assets/CustomerAssetManager';
import type { MarketIndex } from '../../types/market.types';

const CustomerViewPage: React.FC = () => {
  const navigate = useNavigate();
  const { customerId: id } = useParams<{ customerId: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const customerId = id ? parseInt(id) : null;
  
  const initialTab = (searchParams.get('tab') as 'overview' | 'portfolio' | 'goals' | 'assets' | 'jobs' | 'transactions') || 'overview';
  const initialView = (searchParams.get('view') as 'individual' | 'family') || 'individual';
  const [activeTab, setActiveTab] = useState<'overview' | 'portfolio' | 'goals' | 'assets' | 'jobs' | 'transactions'>(initialTab);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'1M' | '3M' | '6M' | '1Y' | 'ALL'>('1Y');
  const [showJTBDSetupModal, setShowJTBDSetupModal] = useState(false);
  const [viewMode, setViewMode] = useState<'individual' | 'family'>(initialView);

  // Goal modal states
  const [showGoalRecalculationModal, setShowGoalRecalculationModal] = useState(false);
  const [selectedGoalId, setSelectedGoalId] = useState<number | null>(null);
  const [recalculationResult, setRecalculationResult] = useState<{ previousCorpus?: number; newCorpus?: number; error?: boolean } | null>(null);

  // Meeting modal state
  const [showMeetingModal, setShowMeetingModal] = useState(false);

  // Goal mutation hooks
  const recalculateGoalMutation = useRecalculateGoal();
  const addToWatchlistMutation = useAddToWatchlist();
  const removeFromWatchlistMutation = useRemoveFromWatchlist();

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

        if (monthlyDataResponse.success && monthlyDataResponse.data && monthlyDataResponse.data.length > 0) {
          // Data is already in {date, value} format
          setComparisonIndexData(monthlyDataResponse.data);
          setShowComparison(true); // Enable comparison when data is loaded
        }
      } catch (error) {
        console.error('Error loading index comparison:', error);
      } finally {
        setIsLoadingIndexComparison(false);
      }
    };

    loadDefaultIndexComparison();
  }, [portfolio?.performance]);

  // Handler for when user selects a different comparison index
  const handleIndexSelect = async (index: MarketIndex | null) => {
    if (!index) {
      setDefaultComparisonIndex(null);
      setComparisonIndexData([]);
      setShowComparison(false);
      return;
    }

    if (!portfolio?.performance || portfolio.performance.length === 0) {
      return;
    }

    try {
      setIsLoadingIndexComparison(true);
      setDefaultComparisonIndex(index);

      // Get date range from portfolio performance
      const performanceDates = portfolio.performance.map(p => p.date);
      const startDate = performanceDates[0];
      const endDate = performanceDates[performanceDates.length - 1];

      // Fetch index monthly data for comparison
      const monthlyDataResponse = await MarketService.getIndexMonthlyDataForComparison(
        index.id,
        startDate,
        endDate
      );

      if (monthlyDataResponse.success && monthlyDataResponse.data) {
        setComparisonIndexData(monthlyDataResponse.data);
        setShowComparison(true);
      }
    } catch (error) {
      console.error('Error loading index comparison:', error);
    } finally {
      setIsLoadingIndexComparison(false);
    }
  };

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

  // Get latest MoM data for badge (returns-based MoM and investment detection)
  const latestMoMData = useMemo(() => {
    if (portfolioWithMoM.length < 2) return null;
    const latest = portfolioWithMoM[portfolioWithMoM.length - 1];
    return {
      // Use returns_mom_percentage for true market growth (excludes new investments)
      returnsMoM: latest.returns_mom_percentage,
      // Portfolio value MoM (for reference, includes new investments)
      valueMoM: latest.mom_change_percentage,
      // Flag for significant new investment (>10% of portfolio)
      isSignificantInvestment: latest.is_significant_investment,
      // Investment change amount
      investmentChange: latest.investment_change
    };
  }, [portfolioWithMoM]);

  // For backward compatibility - use returns MoM for the badge
  const latestMoM = latestMoMData?.returnsMoM ?? null;

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

  // Watchlist toggle handler
  const handleWatchlistToggle = async (goalId: number, isInWatchlist: boolean) => {
    if (!customerId) return;

    try {
      if (isInWatchlist) {
        // Remove from watchlist
        await removeFromWatchlistMutation.mutateAsync({
          goalId,
          customerId
        });
      } else {
        // Add to watchlist - with a default reason
        await addToWatchlistMutation.mutateAsync({
          goalId,
          customerId,
          reason: 'Manual watchlist addition by user'
        });
      }
      // Query invalidation in the hooks will automatically refetch
    } catch (error: any) {
      console.error('Watchlist toggle failed:', error);
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

  return (
    <div style={{ minHeight: '100vh', backgroundColor: colors.utility.primaryBackground }}>
      {/* Header */}
      <CustomerViewHeader
        customer={customer}
        portfolio={portfolio}
        customerId={customer.id}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
        onNewGoal={() => navigate(`/customers/${customerId}/goals/new`)}
        onMeeting={() => setShowMeetingModal(true)}
        onNewAlert={() => setShowJTBDSetupModal(true)}
      />

      {/* Key Metrics Bar */}
      {portfolio && (() => {
        // Debug: Calculate familyHeadIwellcode
        const derivedFamilyHeadIwellcode = viewMode === 'family' && customer
          ? (customer.is_family_head
              ? customer.iwell_code
              : customer.family_head_iwell_code || undefined)
          : undefined;

        console.log('[CustomerViewPage] MetricsBar props:', {
          viewMode,
          customerExists: !!customer,
          is_family_head: customer?.is_family_head,
          iwell_code: customer?.iwell_code,
          family_head_iwell_code: customer?.family_head_iwell_code,
          family_code: customer?.family_code,
          derivedFamilyHeadIwellcode
        });

        return (
          <CustomerMetricsBar
            portfolio={portfolio}
            jtbds={jtbds}
            customerId={customerId || undefined}
            viewMode={viewMode}
            familyHeadIwellcode={derivedFamilyHeadIwellcode}
          />
        );
      })()}

      {/* Tabs - Only show Overview in family view */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{ maxWidth: '1400px', margin: '0 auto', display: 'flex', padding: '0 24px' }}>
          {[
            { key: 'overview', label: 'Portfolio Overview', icon: BarChart3, showInFamily: true },
            { key: 'portfolio', label: 'Portfolio Snapshots', icon: TrendingUp, showInFamily: false },
            { key: 'goals', label: 'Goals Management', icon: Target, showInFamily: false },
            { key: 'assets', label: 'Asset Types', icon: Package, showInFamily: false },
            { key: 'jobs', label: 'Jobs To Do', icon: CheckSquare, showInFamily: false },
            { key: 'transactions', label: 'Transactions', icon: DollarSign, showInFamily: false }
          ]
          .filter(tab => viewMode === 'individual' || tab.showInFamily)
          .map(tab => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                style={{
                  padding: '16px 20px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  borderBottom: isActive ? `4px solid ${colors.brand.primary}` : '4px solid transparent',
                  color: isActive ? colors.brand.primary : colors.utility.secondaryText,
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  letterSpacing: '0.3px',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = colors.utility.primaryText + '08';
                    e.currentTarget.style.color = colors.utility.primaryText;
                  }
                }}
                onMouseLeave={(e) => {
                  if (!isActive) {
                    e.currentTarget.style.backgroundColor = 'transparent';
                    e.currentTarget.style.color = colors.utility.secondaryText;
                  }
                }}
              >
                <Icon size={18} />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Content Area */}
      <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '24px' }}>
        {/* Family View */}
        {viewMode === 'family' && customer.family_code ? (
          <FamilyPortfolioView
            familyHeadIwellCode={(customer.is_family_head ? customer.iwell_code : customer.family_head_iwell_code || customer.iwell_code)!}
            familyCode={customer.family_code}
            onMemberClick={(memberId: number) => navigate(`/customers/${memberId}`)}
          />
        ) : (
          <>
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
              <>
                {/* Networth Projection Chart - FULL WIDTH AT TOP */}
                {customerId && customerId > 0 && (() => {
                  // Map goals to GoalMarker format - support ALL goal types
                  const goalMarkers = (goals || [])
                    .filter(g => g.is_active && g.config_data)
                    .map(g => {
                      const cfg = g.config_data as any;
                      // Get target date: from target_date or projected_achievement_date
                      const targetDate = cfg.target_date || cfg.projected_achievement_date || '';
                      // Get target amount: from target_amount or projected_corpus
                      const targetAmount = cfg.target_amount || cfg.projected_corpus || 0;

                      // Only include if we have both a date and an amount
                      if (!targetDate || !targetAmount) return null;

                      return {
                        id: g.id,
                        name: g.title,
                        targetAmount: targetAmount,
                        targetDate: targetDate
                      };
                    })
                    .filter((g): g is NonNullable<typeof g> => g !== null);

                  // Extract all withdrawals from goals
                  const withdrawalMarkers = (goals || [])
                    .filter(g => g.is_active && g.config_data?.withdrawals && g.config_data.withdrawals.length > 0)
                    .flatMap(g => {
                      const withdrawals = (g.config_data as any).withdrawals || [];
                      return withdrawals.map((w: any, idx: number) => ({
                        id: parseInt(String(w.id).replace(/\D/g, '')) || (g.id * 100 + idx),
                        name: w.reason || `Withdrawal from ${g.title}`,
                        amount: w.amount || 0,
                        date: w.withdrawal_date || ''
                      }));
                    });

                  return (
                    <div style={{ marginBottom: '24px' }}>
                      <NetworthProjectionChart
                        customerId={customerId}
                        height={320}
                        goals={goalMarkers}
                        withdrawals={withdrawalMarkers}
                      />
                    </div>
                  );
                })()}

                <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                  {/* Portfolio Performance Chart */}
                  <div
                    id={performanceChartId}
                    style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: isFullscreenMode ? '0' : '12px',
                      padding: '24px',
                      position: 'relative',
                      ...(isFullscreenMode && {
                        display: 'flex',
                        flexDirection: 'column',
                        height: '100vh',
                        width: '100vw'
                      })
                    }}
                  >
                    {/* Header Row - Title, MoM Badge, and Action Buttons */}
                    <div style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      marginBottom: '20px',
                      flexWrap: 'wrap',
                      gap: '12px'
                    }}>
                      <h3 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, margin: 0 }}>
                        Portfolio Performance - MF
                      </h3>

                      <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                        {/* MoM Badge - Shows returns-based MoM (true market growth) */}
                        {latestMoMData && portfolioWithMoM.length > 1 && (
                          <>
                            {/* Returns MoM Badge */}
                            {latestMoM !== null && (
                              <div
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: latestMoM >= 0
                                    ? colors.semantic.success + '20'
                                    : colors.semantic.error + '20',
                                  border: `1px solid ${latestMoM >= 0 ? colors.semantic.success : colors.semantic.error}40`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: '600'
                                }}
                              >
                                <span style={{ fontSize: '12px' }}>
                                  {latestMoM >= 0 ? '📈' : '📉'}
                                </span>
                                <span style={{
                                  color: latestMoM >= 0 ? colors.semantic.success : colors.semantic.error
                                }}>
                                  {getMoMArrow(latestMoM)} {Math.abs(latestMoM).toFixed(2)}%
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  color: colors.utility.secondaryText
                                }}>
                                  returns MoM
                                </span>
                              </div>
                            )}
                            {/* New Investment Badge - shown when significant new investment detected */}
                            {latestMoMData.isSignificantInvestment && latestMoMData.investmentChange && (
                              <div
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '8px',
                                  backgroundColor: colors.brand.primary + '15',
                                  border: `1px solid ${colors.brand.primary}30`,
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '6px',
                                  fontSize: '12px',
                                  fontWeight: '500'
                                }}
                              >
                                <span style={{ fontSize: '12px' }}>💰</span>
                                <span style={{ color: colors.brand.primary }}>
                                  +{formatCurrency(latestMoMData.investmentChange)}
                                </span>
                                <span style={{
                                  fontSize: '10px',
                                  color: colors.utility.secondaryText
                                }}>
                                  new investment
                                </span>
                              </div>
                            )}
                          </>
                        )}
                        {/* Index Selector for comparison */}
                        <div style={{ minWidth: '180px' }}>
                          <IndexSelector
                            selectedIndexId={defaultComparisonIndex?.id || null}
                            onIndexSelect={handleIndexSelect}
                            disabled={isLoadingIndexComparison}
                            placeholder="Compare with index..."
                          />
                        </div>

                        {/* Toggle visibility when index is selected */}
                        {defaultComparisonIndex && comparisonIndexData.length > 0 && (
                          <button
                            onClick={() => setShowComparison(!showComparison)}
                            title={showComparison ? 'Hide comparison' : 'Show comparison'}
                            style={{
                              padding: '6px 10px',
                              backgroundColor: showComparison ? colors.brand.primary + '20' : 'transparent',
                              color: showComparison ? colors.brand.primary : colors.utility.secondaryText,
                              border: `1px solid ${showComparison ? colors.brand.primary : colors.utility.primaryText + '20'}`,
                              borderRadius: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              transition: 'all 0.2s ease'
                            }}
                          >
                            {showComparison ? <Eye size={14} /> : <EyeOff size={14} />}
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
                    
                    <div style={{
                      height: isFullscreenMode ? 'auto' : '300px',
                      flex: isFullscreenMode ? 1 : 'none',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      minHeight: isFullscreenMode ? '400px' : 'auto'
                    }}>
                      {portfolioWithMoM && portfolioWithMoM.length > 1 ? (
                        <div style={{ width: '100%', height: '100%' }}>
                          {/* NEW: Recharts-based comparison chart with % normalization */}
                          <PerformanceComparisonChart
                            data={portfolioWithMoM.map(p => ({
                              date: p.date,
                              value: p.current_value ?? 0,
                              invested: p.invested,
                              returns: p.returns,
                              returnPercentage: p.return_percentage,
                              momChangePercentage: p.returns_mom_percentage, // Use returns-based MoM
                              isSignificantInvestment: p.is_significant_investment
                            }))}
                            comparisonData={comparisonIndexData}
                            comparisonName={defaultComparisonIndex?.index_name || 'Index'}
                            showComparison={showComparison && !isLoadingIndexComparison && comparisonIndexData.length > 0}
                            viewMode="percentage"
                            height={isFullscreenMode ? window.innerHeight - 200 : 280}
                            primaryLabel="Portfolio"
                          />
                          <div style={{
                            fontSize: '12px',
                            color: colors.utility.secondaryText,
                            textAlign: 'center',
                            marginTop: '8px'
                          }}>
                            Showing cumulative % returns from start ({portfolioWithMoM.length} months)
                            {showComparison && defaultComparisonIndex && comparisonIndexData.length > 0 && (
                              <span style={{ marginLeft: '8px', color: '#FCD34D' }}>
                                • vs {defaultComparisonIndex.index_name}
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


                  {/* Fund-wise Performance */}
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
                    <PortfolioDonutChart
                      customerId={customerId!}
                      size={240}
                      strokeWidth={35}
                      showLegend={true}
                    />
                  </div>

                  {/* Portfolio Goal Allocation Summary */}
                  {portfolio.holdings && portfolio.holdings.length > 0 && (() => {
                    // Calculate portfolio-level allocation
                    const totalPortfolioValue = portfolio.holdings.reduce((sum, h) => sum + (h.current_value || 0), 0);
                    const totalAllocatedValue = portfolio.holdings.reduce((sum, h) => {
                      const allocation = h.allocation || 0;
                      return sum + ((h.current_value || 0) * allocation / 100);
                    }, 0);
                    const totalAllocatedPercentage = totalPortfolioValue > 0 ? (totalAllocatedValue / totalPortfolioValue) * 100 : 0;

                    // Count unique schemes with allocations
                    const allocatedSchemesCount = portfolio.holdings.filter(h => (h.allocation || 0) > 0).length;

                    return (
                      <PortfolioAllocationSummary
                        totalPortfolioValue={totalPortfolioValue}
                        allocatedValue={totalAllocatedValue}
                        allocatedPercentage={totalAllocatedPercentage}
                        goalsCount={goals?.length || 0}
                        schemesCount={allocatedSchemesCount}
                      />
                    );
                  })()}

                  {/* Holdings */}
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
                        Holdings ({portfolio.holdings.length})
                      </h3>
                      <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
                        gap: '12px',
                        maxHeight: '600px',
                        overflowY: 'auto',
                        padding: '4px'
                      }}>
                        {portfolio.holdings.map((holding, idx) => (
                          <SchemeCard
                            key={idx}
                            scheme={{
                              scheme_code: holding.scheme_code,
                              scheme_name: holding.scheme_name,
                              fund_name: holding.fund_name,
                              category: holding.category,
                              sub_category: holding.sub_category,
                              current_value: holding.current_value,
                              allocation: holding.allocation,
                              return_percentage: holding.return_percentage
                            }}
                            showAllocation={true}
                            showValue={true}
                            showReturn={true}
                            showCategory={true}
                            compact={true}
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              </>
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

                {/* Portfolio Snapshots Table - All Schemes Monthly View */}
                <PortfolioSnapshotsTable
                  customerId={customerId}
                  months={12}
                />
              </div>
            )}
          </>
        )}

        {/* Goals & Actions Tab */}
        {activeTab === 'goals' && (
          <div style={{ padding: '24px 32px' }}>
            {/* 2-Column Layout: Goals on Left | Metrics + Quick Actions on Right */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 420px', gap: '24px' }}>
              {/* Left Column - Goals List */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
                {/* Header */}
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
                      onClick={() => navigate(`/customers/${customerId}/goals/new`)}
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
                  <>
                    {/* Comprehensive Goal Cards */}
                    {goals.filter(g => g.is_active).map(goal => (
                      <GoalCard
                        key={goal.id}
                        goal={goal}
                        onRecalculate={async (goalId: number) => {
                          setSelectedGoalId(goalId);
                          setShowGoalRecalculationModal(true);
                          setRecalculationResult(null);

                          try {
                            const result = await recalculateGoalMutation.mutateAsync(goalId);
                            setRecalculationResult({
                              previousCorpus: result.current_value,
                              newCorpus: result.projected_corpus,
                              error: false
                            });
                            refetchGoals();
                          } catch (error) {
                            setRecalculationResult({ error: true });
                          }
                        }}
                        onToggleWatchlist={handleWatchlistToggle}
                        showAllocations={true}
                      />
                    ))}

                    {/* Asset Allocation Utilization */}
                    <AssetAllocationUtilization customerId={customerId!} />
                  </>
                )}

                {/* Alerts & Reminders Section - excluding goals */}
                {jtbds && jtbds.filter(j => j.jtbd_type !== 'goal_tracking').length > 0 && (
                  <div>
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

              {/* Right Column - Metrics (2x2 Grid) + Quick Actions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                {/* Goal Metrics - Compact 2x2 Grid */}
                {goalSummary && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {/* Card 1: Active Goals */}
                    <div style={{
                      background: `linear-gradient(135deg, ${colors.brand.primary} 0%, ${colors.brand.secondary} 100%)`,
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      color: 'white'
                    }}>
                      <div style={{ fontSize: '11px', opacity: 0.9, marginBottom: '6px' }}>Active Goals</div>
                      <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '6px' }}>
                        {goalSummary.total_goals}
                      </div>
                      <div style={{ fontSize: '10px', opacity: 0.85 }}>
                        {goalSummary.goals_on_track} On Track • {goalSummary.goals_behind} Behind
                      </div>
                    </div>

                    {/* Card 2: Total Target */}
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>
                        Total Target
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText }}>
                        {formatCurrency(goalSummary.total_target_corpus)}
                      </div>
                    </div>

                    {/* Card 3: Current Value */}
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>
                        Current Value
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText, marginBottom: '4px' }}>
                        {formatCurrency(goalSummary.total_current_value)}
                      </div>
                      <div style={{ fontSize: '10px', color: colors.semantic.success }}>
                        {goalSummary.total_target_corpus > 0
                          ? formatPercentage((goalSummary.total_current_value / goalSummary.total_target_corpus) * 100)
                          : '0%'} of target
                      </div>
                    </div>

                    {/* Card 4: Goal SIPs */}
                    <div style={{
                      backgroundColor: colors.utility.secondaryBackground,
                      borderRadius: '10px',
                      padding: '16px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)',
                      border: `1px solid ${colors.utility.primaryText}10`
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '6px' }}>
                        Goal SIPs
                      </div>
                      <div style={{ fontSize: '20px', fontWeight: '700', color: colors.utility.primaryText }}>
                        {formatCurrency(goals.reduce((sum, goal) => {
                          const config = goal.config_data;
                          if ('monthly_contribution' in config && config.monthly_contribution) {
                            return sum + config.monthly_contribution;
                          }
                          return sum;
                        }, 0))}
                      </div>
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                        per month
                      </div>
                    </div>
                  </div>
                )}

                {/* Quick Actions */}
                <GoalQuickActions onCreateGoal={() => navigate(`/customers/${customerId}/goals/new`)} />
              </div>
            </div>
          </div>
        )}

        {/* Jobs to Do Tab */}
        {activeTab === 'jobs' && customerId && (
          <JTBDExecutionTimeline customerId={customerId} />
        )}

        {/* Assets Tab */}
        {activeTab === 'assets' && customerId && (
          <div style={{
            backgroundColor: colors.utility.primaryText + '08',
            borderRadius: '12px',
            padding: '24px'
          }}>
            <CustomerAssetManager customerId={customerId} />
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
                backgroundColor: colors.utility.primaryText + '08',
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
        </>
        )}
      </div>

      {/* JTBD Setup Modal - Hide portfolio_alert and goal_tracking when opened from New Alert button */}
      {showJTBDSetupModal && (
        <JTBDSetupModal
          customerId={customerId}
          customerName={customer.name}
          onClose={() => setShowJTBDSetupModal(false)}
          onSuccess={() => {
            setShowJTBDSetupModal(false);
          }}
          hideTypes={['portfolio_alert', 'goal_tracking']}
        />
      )}

      {/* Goal Modals */}
      {showGoalRecalculationModal && selectedGoalId && (
        <GoalRecalculationModal
          goalId={selectedGoalId}
          isRecalculating={recalculateGoalMutation.isPending}
          onClose={() => {
            setShowGoalRecalculationModal(false);
            setSelectedGoalId(null);
            setRecalculationResult(null);
          }}
          previousCorpus={recalculationResult?.previousCorpus}
          newCorpus={recalculationResult?.newCorpus}
          error={recalculationResult?.error}
        />
      )}

      {/* Meeting Modal */}
      {showMeetingModal && (
        <CreateMeetingModal
          customerId={customerId!}
          isOpen={showMeetingModal}
          onClose={() => setShowMeetingModal(false)}
          onSuccess={() => setShowMeetingModal(false)}
        />
      )}
    </div>
  );
};

export default CustomerViewPage;