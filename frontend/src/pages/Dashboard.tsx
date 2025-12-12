// frontend/src/pages/Dashboard.tsx
// Main Dashboard - Executive view for IFA/RIA managing multiple client portfolios
// Redesigned based on practical data sources

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
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
  Banknote
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
  reportStatus: Array<{
    id: number;
    reportName: string;
    status: 'pending' | 'generating' | 'completed' | 'failed';
    scheduledFor: string;
    customersIncluded: number;
  }>;
  recentTransactions: Array<{
    id: number;
    customerName: string;
    type: 'Purchase' | 'SIP' | 'Redemption' | 'Switch';
    schemeName: string;
    amount: number;
    date: string;
  }>;
}

// Dummy data generator - In production, this would come from APIs
const getDummyData = (): DashboardData => ({
  summary: {
    totalAUM: 45672345.67,
    aumChange: 3.2,
    totalCustomers: 127,
    activeCustomers: 112,
    pendingActions: 23,
    criticalAlerts: 3
  },
  goalsSummary: {
    totalGoals: 156,
    onTrack: 124,
    needsAttention: 25,
    offTrack: 7,
    lastCalculatedAt: '2024-12-12T06:00:00Z',
    totalTargetValue: 234567890,
    currentValue: 187654321
  },
  downloadStatus: {
    navDownloads: { success: 45, failed: 2, pending: 3, lastRun: '2024-12-12T22:00:00Z' },
    marketDownloads: { success: 8, failed: 0, pending: 0, lastRun: '2024-12-12T22:30:00Z' },
    snapshotStatus: { success: true, lastRun: '2024-12-12T21:00:00Z', customersProcessed: 112 }
  },
  upcomingActions: [
    { id: 1, customerId: 101, customerName: 'Rajesh Kumar', type: 'sip_due', title: 'SIP Due', description: 'HDFC Mid-Cap Opportunities', amount: 25000, dueDate: '2024-12-15', priority: 'high' },
    { id: 2, customerId: 102, customerName: 'Priya Sharma', type: 'goal_review', title: 'Goal Review', description: 'Retirement Fund at 78%', dueDate: '2024-12-14', priority: 'medium' },
    { id: 3, customerId: 103, customerName: 'Amit Patel', type: 'redemption', title: 'Redemption Due', description: 'ICICI Prudential Bluechip', amount: 150000, dueDate: '2024-12-14', priority: 'critical' },
    { id: 4, customerId: 104, customerName: 'Sunita Verma', type: 'birthday', title: 'Birthday', description: 'Client turning 45', dueDate: '2024-12-16', priority: 'low' },
    { id: 5, customerId: 105, customerName: 'Vikram Singh', type: 'sip_due', title: 'SIP Due', description: 'Axis Small Cap Fund', amount: 50000, dueDate: '2024-12-15', priority: 'high' },
    { id: 6, customerId: 106, customerName: 'Meera Reddy', type: 'anniversary', title: 'Anniversary', description: 'Wedding Anniversary', dueDate: '2024-12-18', priority: 'low' }
  ],
  // Planned withdrawals from Goals - NOT redemptions
  plannedWithdrawals: [
    { id: 1, customerId: 107, customerName: 'Suresh Menon', goalName: 'Home Down Payment', goalType: 'major_purchase', amount: 500000, withdrawalDate: '2025-01-15', frequency: 'one_time' },
    { id: 2, customerId: 108, customerName: 'Kavita Nair', goalName: 'Child Education', goalType: 'education', amount: 200000, withdrawalDate: '2025-02-01', frequency: 'yearly' },
    { id: 3, customerId: 109, customerName: 'Ravi Gupta', goalName: 'Retirement Income', goalType: 'retirement', amount: 75000, withdrawalDate: '2025-01-01', frequency: 'monthly' },
    { id: 4, customerId: 110, customerName: 'Anita Desai', goalName: 'Vacation Fund', goalType: 'lifestyle', amount: 150000, withdrawalDate: '2025-03-10', frequency: 'one_time' }
  ],
  meetings: {
    today: [
      { id: 1, customerId: 110, customerName: 'Anil Kapoor', title: 'Portfolio Review', time: '10:30 AM', type: 'video' },
      { id: 2, customerId: 111, customerName: 'Deepa Sharma', title: 'Goal Planning', time: '2:00 PM', type: 'in_person' },
      { id: 3, customerId: 112, customerName: 'Ramesh Iyer', title: 'SIP Discussion', time: '4:30 PM', type: 'phone' }
    ],
    upcoming: [
      { id: 4, customerId: 113, customerName: 'Neha Gupta', title: 'Quarterly Review', date: '2024-12-13', time: '11:00 AM', type: 'video' },
      { id: 5, customerId: 114, customerName: 'Sanjay Mehta', title: 'New Investment', date: '2024-12-14', time: '3:00 PM', type: 'in_person' },
      { id: 6, customerId: 115, customerName: 'Pooja Reddy', title: 'Tax Planning', date: '2024-12-16', time: '10:00 AM', type: 'video' }
    ]
  },
  reportStatus: [
    { id: 1, reportName: 'Monthly Portfolio Summary', status: 'pending', scheduledFor: '2024-12-15', customersIncluded: 127 },
    { id: 2, reportName: 'Tax Harvesting Report', status: 'generating', scheduledFor: '2024-12-12', customersIncluded: 45 },
    { id: 3, reportName: 'Goal Progress Report', status: 'completed', scheduledFor: '2024-12-10', customersIncluded: 89 }
  ],
  recentTransactions: [
    { id: 1, customerName: 'Rahul Mehta', type: 'Purchase', schemeName: 'Axis Bluechip Fund', amount: 100000, date: '2024-12-12' },
    { id: 2, customerName: 'Neha Gupta', type: 'SIP', schemeName: 'HDFC Flexi Cap', amount: 15000, date: '2024-12-12' },
    { id: 3, customerName: 'Arun Kumar', type: 'Redemption', schemeName: 'SBI Large Cap', amount: 50000, date: '2024-12-11' },
    { id: 4, customerName: 'Deepa Joshi', type: 'Switch', schemeName: 'ICICI Value Discovery', amount: 75000, date: '2024-12-11' },
    { id: 5, customerName: 'Kiran Rao', type: 'Purchase', schemeName: 'Mirae Asset Large Cap', amount: 200000, date: '2024-12-10' }
  ]
});

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [data, setData] = useState<DashboardData>(getDummyData());
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = () => {
    setLoading(true);
    setTimeout(() => {
      setData(getDummyData());
      setLastUpdated(new Date());
      setLoading(false);
    }, 500);
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
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
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
                {formatCurrency(data.summary.totalAUM, true)}
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
                {data.summary.activeCustomers}
              </div>
              <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '8px' }}>
                of {data.summary.totalCustomers} total
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
              <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>Downloads Today</div>
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
                {((data.goalsSummary.currentValue / data.goalsSummary.totalTargetValue) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{
              height: '10px',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E2E8F0',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(data.goalsSummary.currentValue / data.goalsSummary.totalTargetValue) * 100}%`,
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
        </Card>

        {/* Today's Meetings */}
        <Card>
          <SectionHeader
            title="Today's Meetings"
            icon={<Calendar size={18} />}
            action={{ label: 'Add Meeting', onClick: () => console.log('Add meeting clicked') }}
          />

          {data.meetings.today.length === 0 ? (
            <div style={{
              padding: '32px',
              textAlign: 'center',
              color: colors.utility.secondaryText
            }}>
              <Calendar size={32} style={{ marginBottom: '8px', opacity: 0.5 }} />
              <div>No meetings scheduled for today</div>
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
            action={{ label: 'View All', onClick: () => navigate('/cruise-control') }}
          />

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
            title="Report Generation"
            icon={<FileText size={18} />}
          />

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.reportStatus.map((report) => {
              const statusConfig: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
                pending: { color: '#F59E0B', bg: '#F59E0B15', icon: <Clock size={14} /> },
                generating: { color: colors.brand.primary, bg: colors.brand.primary + '15', icon: <RefreshCw size={14} className="animate-spin" /> },
                completed: { color: '#10B981', bg: '#10B98115', icon: <CheckCircle size={14} /> },
                failed: { color: colors.semantic.error, bg: colors.semantic.error + '15', icon: <XCircle size={14} /> }
              };
              const config = statusConfig[report.status];

              return (
                <div
                  key={report.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '10px 12px',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                    borderRadius: '8px'
                  }}
                >
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: '500', fontSize: '13px', color: colors.utility.primaryText }}>
                      {report.reportName}
                    </div>
                    <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                      {report.customersIncluded} customers • {formatDate(report.scheduledFor)}
                    </div>
                  </div>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '4px 10px',
                    borderRadius: '6px',
                    backgroundColor: config.bg,
                    color: config.color,
                    fontSize: '12px',
                    fontWeight: '500'
                  }}>
                    {config.icon}
                    {report.status.charAt(0).toUpperCase() + report.status.slice(1)}
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom Section - Recent Transactions */}
      <Card>
        <SectionHeader
          title="Recent Transactions"
          icon={<Clock size={18} />}
          action={{ label: 'View All', onClick: () => navigate('/transactions') }}
        />

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
      </Card>
    </div>
  );
};

export default Dashboard;
