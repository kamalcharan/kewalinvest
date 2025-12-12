// frontend/src/pages/Dashboard.tsx
// Main Dashboard - Executive view for IFA/RIA managing multiple client portfolios
// Redesigned based on practical data sources - Now with LIVE API data

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import apiService from '../services/api.service';
import { useCustomerStats } from '../hooks/useCustomers';
import { usePortfolioMetrics } from '../hooks/usePortfolioData';
import {
  TrendingUp,
  TrendingDown,
  Users,
  Target,
  Bell,
  Briefcase,
  Calendar,
  Clock,
  ChevronRight,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Download,
  FileText,
  Video,
  Phone,
  MapPin,
  Banknote,
  Info
} from 'lucide-react';

// Types for dashboard data
interface DashboardData {
  summary: {
    totalAUM: number;
    aumChange: number;
    totalCustomers: number;
    activeCustomers: number;
    pendingActions: number;
    criticalAlerts: number;
  };
  goalsSummary: {
    totalGoals: number;
    onTrack: number;
    needsAttention: number;
    offTrack: number;
    lastCalculatedAt: string | null;
    totalTargetValue: number;
    currentValue: number;
  };
  downloadStatus: {
    navDownloads: { success: number; failed: number; pending: number; lastRun: string | null };
    marketDownloads: { success: number; failed: number; pending: number; lastRun: string | null };
    snapshotStatus: { success: boolean; lastRun: string | null; customersProcessed: number };
  };
  upcomingActions: Array<{
    id: number;
    customerId: number;
    customerName: string;
    type: 'sip_due' | 'redemption' | 'birthday' | 'anniversary' | 'goal_review';
    title: string;
    description: string;
    amount?: number;
    dueDate: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
  }>;
  plannedWithdrawals: Array<{
    id: number;
    customerId: number;
    customerName: string;
    goalName: string;
    goalType: string;
    amount: number;
    withdrawalDate: string;
    frequency: 'one_time' | 'monthly' | 'quarterly' | 'yearly';
  }>;
  meetings: {
    today: Array<{
      id: number;
      customerId: number;
      customerName: string;
      title: string;
      time: string;
      type: 'video' | 'in_person' | 'phone';
    }>;
    upcoming: Array<{
      id: number;
      customerId: number;
      customerName: string;
      title: string;
      date: string;
      time: string;
      type: 'video' | 'in_person' | 'phone';
    }>;
  };
  reportGeneration: {
    totalCustomers: number;
    totalFamilies: number;
    overdue: Array<{
      id: number;
      customerId: number;
      customerName: string;
      familyName?: string;
      lastGeneratedAt: string;
      frequency: '3_months' | '6_months';
      daysOverdue: number;
    }>;
    dueIn15Days: Array<{
      id: number;
      customerId: number;
      customerName: string;
      familyName?: string;
      dueDate: string;
      frequency: '3_months' | '6_months';
    }>;
    recentlyGenerated: Array<{
      id: number;
      customerName: string;
      familyName?: string;
      generatedAt: string;
    }>;
  };
  recentTransactions: Array<{
    id: number;
    customerName: string;
    type: 'Purchase' | 'SIP' | 'Redemption' | 'Switch';
    schemeName: string;
    amount: number;
    date: string;
  }>;
}

// Initial empty data
const getEmptyData = (): DashboardData => ({
  summary: {
    totalAUM: 0,
    aumChange: 0,
    totalCustomers: 0,
    activeCustomers: 0,
    pendingActions: 0,
    criticalAlerts: 0
  },
  goalsSummary: {
    totalGoals: 0,
    onTrack: 0,
    needsAttention: 0,
    offTrack: 0,
    lastCalculatedAt: null,
    totalTargetValue: 0,
    currentValue: 0
  },
  downloadStatus: {
    navDownloads: { success: 0, failed: 0, pending: 0, lastRun: null },
    marketDownloads: { success: 0, failed: 0, pending: 0, lastRun: null },
    snapshotStatus: { success: false, lastRun: null, customersProcessed: 0 }
  },
  upcomingActions: [],
  plannedWithdrawals: [],
  meetings: {
    today: [],
    upcoming: []
  },
  reportGeneration: {
    totalCustomers: 0,
    totalFamilies: 0,
    overdue: [],
    dueIn15Days: [],
    recentlyGenerated: []
  },
  recentTransactions: []
});

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [data, setData] = useState<DashboardData>(getEmptyData());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  // Use customer stats hook - same as CustomerDashboardPage
  const { data: customerStats, refetch: refetchCustomerStats } = useCustomerStats();

  // Use portfolio metrics hook - same as CustomerDashboardPage for AUM
  const { metrics: portfolioMetrics, isLoading: metricsLoading } = usePortfolioMetrics();

  // Fetch dashboard data from API
  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      // Fetch all dashboard data from the consolidated endpoint
      const response = await apiService.get('/dashboard') as { data: { success: boolean; data: any } };

      if (response.data.success) {
        const apiData = response.data.data;

        // Transform API response to match component's data structure
        setData(prev => ({
          ...prev,
          summary: {
            totalAUM: apiData.summary?.totalAUM || 0,
            aumChange: apiData.summary?.aumChange || 0,
            totalCustomers: apiData.summary?.totalCustomers || 0,
            activeCustomers: apiData.summary?.activeCustomers || 0,
            pendingActions: apiData.pendingActions?.totalCount || 0,
            criticalAlerts: apiData.pendingActions?.criticalCount || 0
          },
          goalsSummary: {
            totalGoals: apiData.goalsSummary?.totalGoals || 0,
            onTrack: apiData.goalsSummary?.onTrack || 0,
            needsAttention: apiData.goalsSummary?.needsAttention || 0,
            offTrack: apiData.goalsSummary?.offTrack || 0,
            lastCalculatedAt: apiData.goalsSummary?.lastCalculatedAt || null,
            totalTargetValue: apiData.goalsSummary?.totalTargetValue || 0,
            currentValue: apiData.goalsSummary?.currentValue || 0
          },
          downloadStatus: {
            navDownloads: apiData.downloadStatus?.navDownloads || { success: 0, failed: 0, pending: 0, lastRun: null },
            marketDownloads: apiData.downloadStatus?.marketDownloads || { success: 0, failed: 0, pending: 0, lastRun: null },
            snapshotStatus: prev.downloadStatus.snapshotStatus // Keep placeholder for now
          },
          upcomingActions: (apiData.pendingActions?.actions || []).map((action: any) => ({
            id: action.id,
            customerId: action.customerId,
            customerName: action.customerName,
            type: action.type || 'task',
            title: action.title,
            description: action.description || '',
            amount: action.amount,
            dueDate: action.dueDate,
            priority: action.priority || 'medium'
          })),
          recentTransactions: (apiData.recentTransactions || []).map((txn: any) => ({
            id: txn.id,
            customerName: txn.customerName,
            type: txn.type || 'Purchase',
            schemeName: txn.schemeName || 'Unknown',
            amount: txn.amount || 0,
            date: txn.date
          }))
        }));

        setLastUpdated(new Date());
      }
    } catch (err: any) {
      console.error('Error fetching dashboard data:', err);
      setError(err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch data on component mount
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refreshData = () => {
    fetchDashboardData();
    refetchCustomerStats();
  };

  // Format currency
  const formatCurrency = (value: number, compact = false) => {
    if (compact) {
      if (value >= 10000000) return `₹${(value / 10000000).toFixed(2)} Cr`;
      if (value >= 100000) return `₹${(value / 100000).toFixed(2)} L`;
      if (value >= 1000) return `₹${(value / 1000).toFixed(1)} K`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
  };

  // Format date
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  };

  // Format relative date
  const formatRelativeDate = (dateStr: string | null) => {
    if (!dateStr) return 'Never';
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffHours < 1) return 'Just now';
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays === 1) return 'Yesterday';
    return `${diffDays} days ago`;
  };

  // Get priority color
  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return colors.semantic.error;
      case 'high': return '#F97316';
      case 'medium': return '#F59E0B';
      case 'low': return '#10B981';
      default: return colors.utility.secondaryText;
    }
  };

  // Get action type icon
  const getActionIcon = (type: string) => {
    switch (type) {
      case 'sip_due': return '💰';
      case 'redemption': return '📤';
      case 'birthday': return '🎂';
      case 'anniversary': return '💑';
      case 'goal_review': return '🎯';
      default: return '📋';
    }
  };

  // Get meeting type icon
  const getMeetingIcon = (type: string) => {
    switch (type) {
      case 'video': return <Video size={14} />;
      case 'in_person': return <MapPin size={14} />;
      case 'phone': return <Phone size={14} />;
      default: return <Calendar size={14} />;
    }
  };

  // Card component
  const Card: React.FC<{ children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }> = ({ children, style, onClick }) => (
    <div
      onClick={onClick}
      style={{
        backgroundColor: isDarkMode ? colors.utility.primaryBackground : '#FFFFFF',
        borderRadius: '12px',
        border: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}`,
        boxShadow: isDarkMode ? 'none' : '0 1px 3px rgba(0,0,0,0.08)',
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'all 0.2s',
        ...style
      }}
    >
      {children}
    </div>
  );

  // Section Header
  const SectionHeader: React.FC<{ title: string; icon?: React.ReactNode; action?: { label: string; onClick: () => void } }> = ({ title, icon, action }) => (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '16px'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        {icon && <span style={{ color: colors.utility.secondaryText }}>{icon}</span>}
        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
          {title}
        </h3>
      </div>
      {action && (
        <button
          onClick={action.onClick}
          style={{
            fontSize: '12px',
            color: colors.brand.primary,
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '4px'
          }}
        >
          {action.label} <ChevronRight size={14} />
        </button>
      )}
    </div>
  );

  // Loading skeleton component
  const LoadingSkeleton = () => (
    <div style={{
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto'
    }}>
      <div style={{ marginBottom: '24px' }}>
        <div style={{ width: '300px', height: '32px', backgroundColor: isDarkMode ? '#333' : '#E2E8F0', borderRadius: '8px', marginBottom: '8px' }} />
        <div style={{ width: '200px', height: '16px', backgroundColor: isDarkMode ? '#333' : '#E2E8F0', borderRadius: '4px' }} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px', marginBottom: '24px' }}>
        {[1, 2, 3, 4].map(i => (
          <div key={i} style={{ height: '120px', backgroundColor: isDarkMode ? '#1a1a1a' : '#F8FAFC', borderRadius: '12px' }} />
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 380px', gap: '20px' }}>
        {[1, 2, 3, 4, 5].map(i => (
          <div key={i} style={{ height: '200px', backgroundColor: isDarkMode ? '#1a1a1a' : '#F8FAFC', borderRadius: '12px' }} />
        ))}
      </div>
    </div>
  );

  // Show loading state
  if (loading && data.summary.totalCustomers === 0) {
    return <LoadingSkeleton />;
  }

  // Show error state
  if (error && data.summary.totalCustomers === 0) {
    return (
      <div style={{
        padding: '24px',
        maxWidth: '1600px',
        margin: '0 auto',
        minHeight: 'calc(100vh - 64px)',
        backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC'
      }}>
        <Card>
          <div style={{ padding: '40px', textAlign: 'center' }}>
            <AlertTriangle size={48} style={{ color: colors.semantic.error, marginBottom: '16px' }} />
            <h2 style={{ fontSize: '18px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
              Failed to load dashboard
            </h2>
            <p style={{ fontSize: '14px', color: colors.utility.secondaryText, marginBottom: '16px' }}>
              {error}
            </p>
            <button
              onClick={refreshData}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '10px 20px',
                backgroundColor: colors.brand.primary,
                color: '#FFF',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              <RefreshCw size={16} />
              Try Again
            </button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto',
      minHeight: 'calc(100vh - 64px)',
      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '24px'
      }}>
        <div>
          <h1 style={{
            fontSize: '28px',
            fontWeight: '700',
            color: colors.utility.primaryText,
            margin: '0 0 4px 0'
          }}>
            Good {new Date().getHours() < 12 ? 'Morning' : new Date().getHours() < 17 ? 'Afternoon' : 'Evening'}, {user?.tenant?.tenant_name || 'Advisor'}
          </h1>
          <p style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            margin: 0
          }}>
            {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
          </span>
          <button
            onClick={refreshData}
            disabled={loading}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '8px 16px',
              backgroundColor: colors.brand.primary,
              color: '#FFF',
              border: 'none',
              borderRadius: '8px',
              fontSize: '13px',
              fontWeight: '600',
              cursor: loading ? 'not-allowed' : 'pointer',
              opacity: loading ? 0.7 : 1
            }}
          >
            <RefreshCw size={14} style={loading ? { animation: 'spin 1s linear infinite' } : {}} />
            {loading ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>

      {/* Executive Summary Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gap: '16px',
        marginBottom: '24px'
      }}>
        {/* AUM Card */}
        <Card>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>Total AUM</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
                {metricsLoading ? '...' : formatCurrency(portfolioMetrics.totalAUM || data.summary.totalAUM, true)}
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginTop: '8px',
                fontSize: '13px',
                fontWeight: '600',
                color: data.summary.aumChange >= 0 ? '#10B981' : colors.semantic.error
              }}>
                {data.summary.aumChange >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
                {data.summary.aumChange >= 0 ? '+' : ''}{data.summary.aumChange}% MTD
              </div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: colors.brand.primary + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.brand.primary
            }}>
              <Briefcase size={24} />
            </div>
          </div>
        </Card>

        {/* Customers Card */}
        <Card onClick={() => navigate('/customers')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>Active Customers</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
                {customerStats?.active ?? data.summary.activeCustomers}
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '8px' }}>
                of {customerStats?.total ?? data.summary.totalCustomers} total
              </div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: '#8B5CF615',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#8B5CF6'
            }}>
              <Users size={24} />
            </div>
          </div>
        </Card>

        {/* Pending Actions Card */}
        <Card onClick={() => navigate('/cruise-control')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>Pending Actions</div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
                {data.summary.pendingActions}
              </div>
              <div style={{
                display: 'flex', alignItems: 'center', gap: '4px',
                marginTop: '8px', fontSize: '12px', color: colors.semantic.error
              }}>
                <AlertTriangle size={12} />
                {data.summary.criticalAlerts} critical
              </div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: colors.semantic.error + '15',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: colors.semantic.error
            }}>
              <Bell size={24} />
            </div>
          </div>
        </Card>

        {/* Downloads Status Card */}
        <Card onClick={() => navigate('/cruise-control')} style={{ cursor: 'pointer' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>Yesterday Downloads</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <CheckCircle size={16} style={{ color: '#10B981' }} />
                  <span style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>
                    {data.downloadStatus.navDownloads.success + data.downloadStatus.marketDownloads.success}
                  </span>
                </div>
                {(data.downloadStatus.navDownloads.failed + data.downloadStatus.marketDownloads.failed) > 0 && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <XCircle size={16} style={{ color: colors.semantic.error }} />
                    <span style={{ fontSize: '18px', fontWeight: '700', color: colors.semantic.error }}>
                      {data.downloadStatus.navDownloads.failed + data.downloadStatus.marketDownloads.failed}
                    </span>
                  </div>
                )}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '8px' }}>
                Last run: {formatRelativeDate(data.downloadStatus.navDownloads.lastRun)}
              </div>
            </div>
            <div style={{
              width: '48px', height: '48px', borderRadius: '12px',
              backgroundColor: '#10B98115',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#10B981'
            }}>
              <Download size={24} />
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 380px',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Goals Overview */}
        <Card>
          <SectionHeader
            title="Goals Overview"
            icon={<Target size={18} />}
            action={{ label: 'View All', onClick: () => navigate('/customers') }}
          />

          {data.goalsSummary.totalGoals === 0 ? (
            /* Empty State for Goals */
            <div style={{
              padding: '24px 16px',
              textAlign: 'center',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
              borderRadius: '8px'
            }}>
              <Target size={40} style={{ color: colors.utility.secondaryText, opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                No Goals Created Yet
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '16px', lineHeight: '1.5' }}>
                Goals help track customer financial targets like retirement, education, or home purchase.
                Create goals for your customers to see progress tracking here.
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                color: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                <Info size={14} />
                Go to Customer → Goals tab to create goals
              </div>
            </div>
          ) : (
            <>
              {/* Goal Progress Bar */}
              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginBottom: '8px',
                  fontSize: '13px'
                }}>
                  <span style={{ color: colors.utility.secondaryText }}>Overall Progress</span>
                  <span style={{ fontWeight: '600', color: colors.utility.primaryText }}>
                    {data.goalsSummary.totalTargetValue > 0
                      ? ((data.goalsSummary.currentValue / data.goalsSummary.totalTargetValue) * 100).toFixed(1)
                      : 0}%
                  </span>
                </div>
                <div style={{
                  height: '10px',
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E2E8F0',
                  borderRadius: '5px',
                  overflow: 'hidden'
                }}>
                  <div style={{
                    width: `${data.goalsSummary.totalTargetValue > 0
                      ? (data.goalsSummary.currentValue / data.goalsSummary.totalTargetValue) * 100
                      : 0}%`,
                    height: '100%',
                    backgroundColor: colors.brand.primary,
                    borderRadius: '5px'
                  }} />
                </div>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  marginTop: '6px',
                  fontSize: '11px',
                  color: colors.utility.secondaryText
                }}>
                  <span>{formatCurrency(data.goalsSummary.currentValue, true)}</span>
                  <span>{formatCurrency(data.goalsSummary.totalTargetValue, true)}</span>
                </div>
              </div>

              {/* Goal Stats */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: '12px',
                marginBottom: '12px'
              }}>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#10B98115',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                    {data.goalsSummary.onTrack}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>On Track</div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: '#F59E0B15',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: '#F59E0B' }}>
                    {data.goalsSummary.needsAttention}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Needs Attention</div>
                </div>
                <div style={{
                  padding: '12px',
                  backgroundColor: colors.semantic.error + '15',
                  borderRadius: '8px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.error }}>
                    {data.goalsSummary.offTrack}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Off Track</div>
                </div>
              </div>

              <div style={{
                fontSize: '11px',
                color: colors.utility.secondaryText,
                textAlign: 'center',
                padding: '8px',
                backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                borderRadius: '6px'
              }}>
                {data.goalsSummary.totalGoals} goals • Last calculated: {formatRelativeDate(data.goalsSummary.lastCalculatedAt)}
              </div>
            </>
          )}
        </Card>

        {/* Today's Meetings */}
        <Card>
          <SectionHeader
            title="Today's Meetings"
            icon={<Calendar size={18} />}
            action={{ label: 'Add Meeting', onClick: () => navigate('/customers') }}
          />

          {data.meetings.today.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: colors.utility.secondaryText
            }}>
              <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div style={{ marginBottom: '8px' }}>No meetings scheduled for today</div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                Go to a customer page to schedule a meeting
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.meetings.today.map((meeting) => (
                <div
                  key={meeting.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/customers/${meeting.customerId}`)}
                >
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '8px',
                    backgroundColor: colors.brand.primary + '15',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: colors.brand.primary
                  }}>
                    {getMeetingIcon(meeting.type)}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: colors.utility.primaryText }}>
                      {meeting.title}
                    </div>
                    <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                      {meeting.customerName}
                    </div>
                  </div>
                  <div style={{
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.brand.primary
                  }}>
                    {meeting.time}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Upcoming This Week */}
          {data.meetings.upcoming.length > 0 && (
            <div style={{ marginTop: '16px' }}>
              <div style={{
                fontSize: '12px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                marginBottom: '8px'
              }}>
                UPCOMING THIS WEEK
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.meetings.upcoming.slice(0, 3).map((meeting) => (
                  <div
                    key={meeting.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 12px',
                      fontSize: '12px',
                      borderLeft: `2px solid ${colors.brand.primary}40`,
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/customers/${meeting.customerId}`)}
                  >
                    <span style={{ color: colors.utility.primaryText }}>{meeting.customerName}</span>
                    <span style={{ color: colors.utility.secondaryText }}>{formatDate(meeting.date)} • {meeting.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Action Required */}
        <Card style={{ gridRow: 'span 2' }}>
          <SectionHeader
            title="Action Required"
            icon={<Bell size={18} />}
            action={{ label: 'View All', onClick: () => navigate('/jtbd/dashboard') }}
          />

          {data.upcomingActions.length === 0 ? (
            /* Empty State for Actions */
            <div style={{
              padding: '40px 16px',
              textAlign: 'center',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
              borderRadius: '8px'
            }}>
              <Bell size={40} style={{ color: colors.utility.secondaryText, opacity: 0.5, marginBottom: '12px' }} />
              <div style={{ fontSize: '14px', fontWeight: '600', color: colors.utility.primaryText, marginBottom: '8px' }}>
                No Pending Actions
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '16px', lineHeight: '1.5' }}>
                Actions appear here from JTBD (Jobs To Be Done) like SIP reminders, goal reviews, birthdays, and anniversaries.
              </div>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                fontSize: '11px',
                color: colors.brand.primary,
                backgroundColor: colors.brand.primary + '10',
                padding: '8px 12px',
                borderRadius: '6px'
              }}>
                <Info size={14} />
                Set up JTBD for customers to track important dates
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {data.upcomingActions.slice(0, 6).map((action) => (
                <div
                  key={action.id}
                  style={{
                    padding: '12px',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                    borderRadius: '8px',
                    borderLeft: `3px solid ${getPriorityColor(action.priority)}`,
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/customers/${action.customerId}`)}
                >
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    marginBottom: '4px'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                      fontWeight: '600',
                      fontSize: '13px',
                      color: colors.utility.primaryText
                    }}>
                      <span>{getActionIcon(action.type)}</span>
                      {action.customerName}
                    </div>
                    <span style={{
                      fontSize: '10px',
                      padding: '2px 6px',
                      borderRadius: '4px',
                      backgroundColor: getPriorityColor(action.priority) + '20',
                      color: getPriorityColor(action.priority),
                      fontWeight: '600',
                      textTransform: 'uppercase'
                    }}>
                      {action.priority}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                    {action.title}
                    {action.amount && ` • ${formatCurrency(action.amount)}`}
                  </div>
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginTop: '4px'
                  }}>
                    {action.description} • Due: {formatDate(action.dueDate)}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Planned Withdrawals from Goals */}
        <Card>
          <SectionHeader
            title="Planned Withdrawals (Next 3 Months)"
            icon={<Banknote size={18} />}
          />

          {data.plannedWithdrawals.length === 0 ? (
            <div style={{
              padding: '24px',
              textAlign: 'center',
              color: colors.utility.secondaryText
            }}>
              No withdrawals planned
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {data.plannedWithdrawals.slice(0, 4).map((withdrawal) => (
                <div
                  key={withdrawal.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                    borderRadius: '8px',
                    cursor: 'pointer'
                  }}
                  onClick={() => navigate(`/customers/${withdrawal.customerId}`)}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '13px', color: colors.utility.primaryText }}>
                      {withdrawal.customerName}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {withdrawal.goalName}
                      {withdrawal.frequency !== 'one_time' && (
                        <span style={{
                          marginLeft: '6px',
                          fontSize: '10px',
                          padding: '1px 4px',
                          backgroundColor: colors.brand.primary + '15',
                          color: colors.brand.primary,
                          borderRadius: '3px'
                        }}>
                          {withdrawal.frequency}
                        </span>
                      )}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: '600', fontSize: '13px', color: '#F97316' }}>
                      {formatCurrency(withdrawal.amount, true)}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {formatDate(withdrawal.withdrawalDate)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* Report Generation Status */}
        <Card>
          <SectionHeader
            title="Portfolio Reports"
            icon={<FileText size={18} />}
          />

          {/* Summary Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '10px',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '12px',
              backgroundColor: colors.semantic.error + '10',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.semantic.error}`
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: colors.semantic.error }}>
                {data.reportGeneration.overdue.length}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Overdue (Ageing)</div>
            </div>
            <div style={{
              padding: '12px',
              backgroundColor: '#F59E0B10',
              borderRadius: '8px',
              borderLeft: '3px solid #F59E0B'
            }}>
              <div style={{ fontSize: '20px', fontWeight: '700', color: '#F59E0B' }}>
                {data.reportGeneration.dueIn15Days.length}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Due in 15 Days</div>
            </div>
          </div>

          {/* Overdue Reports */}
          {data.reportGeneration.overdue.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: colors.semantic.error,
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                Overdue Reports
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.reportGeneration.overdue.slice(0, 3).map((report) => (
                  <div
                    key={report.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: colors.semantic.error + '08',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/customers/${report.customerId}`)}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.primaryText }}>
                        {report.customerName}
                      </div>
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                        {report.familyName || 'Individual'} • {report.frequency === '3_months' ? 'Quarterly' : 'Half-yearly'}
                      </div>
                    </div>
                    <div style={{
                      fontSize: '11px',
                      fontWeight: '600',
                      color: colors.semantic.error,
                      padding: '2px 6px',
                      backgroundColor: colors.semantic.error + '15',
                      borderRadius: '4px'
                    }}>
                      {report.daysOverdue}d overdue
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Due in 15 Days */}
          {data.reportGeneration.dueIn15Days.length > 0 && (
            <div>
              <div style={{
                fontSize: '11px',
                fontWeight: '600',
                color: '#F59E0B',
                marginBottom: '8px',
                textTransform: 'uppercase'
              }}>
                Due Soon
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {data.reportGeneration.dueIn15Days.slice(0, 3).map((report) => (
                  <div
                    key={report.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '8px 10px',
                      backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                    onClick={() => navigate(`/customers/${report.customerId}`)}
                  >
                    <div>
                      <div style={{ fontSize: '12px', fontWeight: '500', color: colors.utility.primaryText }}>
                        {report.customerName}
                      </div>
                      <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>
                        {report.familyName || 'Individual'} • {report.frequency === '3_months' ? 'Quarterly' : 'Half-yearly'}
                      </div>
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {formatDate(report.dueDate)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Recently Generated Summary */}
          {data.reportGeneration.recentlyGenerated.length > 0 && (
            <div style={{
              marginTop: '12px',
              padding: '8px 10px',
              backgroundColor: '#10B98110',
              borderRadius: '6px',
              fontSize: '11px',
              color: colors.utility.secondaryText,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              <CheckCircle size={12} style={{ color: '#10B981' }} />
              {data.reportGeneration.recentlyGenerated.length} reports generated this week
            </div>
          )}
        </Card>
      </div>

      {/* Bottom Section - Recent Transactions */}
      <Card>
        <SectionHeader
          title="Recent Transactions"
          icon={<Clock size={18} />}
          action={{ label: 'View All', onClick: () => navigate('/transactions') }}
        />

        {data.recentTransactions.length === 0 ? (
          <div style={{
            padding: '32px',
            textAlign: 'center',
            color: colors.utility.secondaryText
          }}>
            <Clock size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
            <div style={{ fontSize: '13px' }}>No recent transactions</div>
            <div style={{ fontSize: '11px', marginTop: '4px' }}>
              Transactions will appear here once you import customer data
            </div>
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}` }}>
                <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Customer</th>
                <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Type</th>
                <th style={{ padding: '10px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Scheme</th>
                <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Amount</th>
                <th style={{ padding: '10px 0', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((txn) => (
                <tr
                  key={txn.id}
                  style={{
                    borderBottom: `1px solid ${isDarkMode ? colors.utility.primaryText + '05' : '#F1F5F9'}`,
                    cursor: 'pointer'
                  }}
                >
                  <td style={{ padding: '12px 0', fontSize: '13px', color: colors.utility.primaryText }}>
                    {txn.customerName}
                  </td>
                  <td style={{ padding: '12px 0' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '3px 8px',
                      borderRadius: '4px',
                      backgroundColor: txn.type === 'Redemption' ? colors.semantic.error + '15' : '#10B98115',
                      color: txn.type === 'Redemption' ? colors.semantic.error : '#10B981',
                      fontWeight: '500'
                    }}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{
                    padding: '12px 0',
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    maxWidth: '250px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {txn.schemeName}
                  </td>
                  <td style={{
                    padding: '12px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    textAlign: 'right'
                  }}>
                    {formatCurrency(txn.amount)}
                  </td>
                  <td style={{
                    padding: '12px 0',
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    textAlign: 'right'
                  }}>
                    {formatDate(txn.date)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </Card>
    </div>
  );
};

export default Dashboard;
