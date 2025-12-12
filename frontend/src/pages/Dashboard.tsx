// frontend/src/pages/Dashboard.tsx
// Main Dashboard - Executive view for IFA/RIA managing multiple client portfolios

import React, { useState, useEffect } from 'react';
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
  PieChart,
  Activity,
  ArrowUpRight,
  ArrowDownRight,
  Calendar,
  AlertTriangle,
  CheckCircle,
  Clock,
  ChevronRight,
  RefreshCw
} from 'lucide-react';

// Dummy data - In production, this would come from API
const getDummyData = () => ({
  // Executive Summary
  summary: {
    totalAUM: 45672345.67,
    aumChange: 3.2,
    totalCustomers: 127,
    activeCustomers: 112,
    totalSchemes: 89,
    avgPortfolioSize: 359625.24,
    mtdReturns: 2.8,
    ytdReturns: 14.2
  },

  // Market Overview
  marketIndices: [
    { name: 'NIFTY 50', value: 24750.50, change: 1.2, changeValue: 293.45 },
    { name: 'SENSEX', value: 81456.78, change: 1.15, changeValue: 925.32 },
    { name: 'NIFTY BANK', value: 52340.25, change: -0.45, changeValue: -236.78 },
    { name: 'NIFTY IT', value: 41250.80, change: 2.1, changeValue: 847.65 }
  ],

  // Alerts & Actions
  pendingActions: {
    criticalAlerts: 3,
    highPriorityAlerts: 8,
    pendingSIPs: 12,
    redemptionsDue: 4,
    birthdaysThisWeek: 5,
    goalsOffTrack: 7
  },

  // Recent Alerts
  recentAlerts: [
    { id: 1, customer: 'Rajesh Kumar', type: 'SIP Due', amount: 25000, scheme: 'HDFC Mid-Cap Opportunities', dueDate: '2024-12-15', priority: 'high' },
    { id: 2, customer: 'Priya Sharma', type: 'Goal Review', goal: 'Retirement Fund', progress: 78, priority: 'medium' },
    { id: 3, customer: 'Amit Patel', type: 'Redemption', amount: 150000, scheme: 'ICICI Prudential Bluechip', dueDate: '2024-12-14', priority: 'critical' },
    { id: 4, customer: 'Sunita Verma', type: 'Birthday', date: '2024-12-16', priority: 'low' },
    { id: 5, customer: 'Vikram Singh', type: 'SIP Due', amount: 50000, scheme: 'Axis Small Cap Fund', dueDate: '2024-12-15', priority: 'high' }
  ],

  // Top Performing Schemes (by returns)
  topSchemes: [
    { name: 'Quant Small Cap Fund', category: 'Small Cap', returns1Y: 48.5, aum: 8234567 },
    { name: 'Nippon India Small Cap', category: 'Small Cap', returns1Y: 42.3, aum: 6543210 },
    { name: 'HDFC Mid-Cap Opportunities', category: 'Mid Cap', returns1Y: 38.7, aum: 5678234 },
    { name: 'Parag Parikh Flexi Cap', category: 'Flexi Cap', returns1Y: 32.1, aum: 4567890 },
    { name: 'ICICI Pru Technology', category: 'Sectoral', returns1Y: 29.8, aum: 3456789 }
  ],

  // Bottom Performing Schemes
  bottomSchemes: [
    { name: 'HDFC Balanced Advantage', category: 'Hybrid', returns1Y: 8.2, aum: 2345678 },
    { name: 'SBI Magnum Gilt Fund', category: 'Debt', returns1Y: 6.5, aum: 1234567 },
    { name: 'Kotak Liquid Fund', category: 'Liquid', returns1Y: 5.8, aum: 987654 }
  ],

  // Sector Allocation
  sectorAllocation: [
    { sector: 'Financial Services', percentage: 28.5, value: 13016518 },
    { sector: 'Information Technology', percentage: 18.2, value: 8312366 },
    { sector: 'Consumer Goods', percentage: 14.8, value: 6759507 },
    { sector: 'Healthcare', percentage: 12.3, value: 5617698 },
    { sector: 'Automobile', percentage: 9.5, value: 4338872 },
    { sector: 'Others', percentage: 16.7, value: 7627383 }
  ],

  // Goal Summary
  goalSummary: {
    totalGoals: 156,
    onTrack: 124,
    needsAttention: 25,
    offTrack: 7,
    totalTargetValue: 234567890,
    currentValue: 187654321
  },

  // Recent Transactions
  recentTransactions: [
    { id: 1, customer: 'Rahul Mehta', type: 'Purchase', scheme: 'Axis Bluechip Fund', amount: 100000, date: '2024-12-12' },
    { id: 2, customer: 'Neha Gupta', type: 'SIP', scheme: 'HDFC Flexi Cap', amount: 15000, date: '2024-12-12' },
    { id: 3, customer: 'Arun Kumar', type: 'Redemption', scheme: 'SBI Large Cap', amount: 50000, date: '2024-12-11' },
    { id: 4, customer: 'Deepa Joshi', type: 'Switch', scheme: 'ICICI Value Discovery', amount: 75000, date: '2024-12-11' },
    { id: 5, customer: 'Kiran Rao', type: 'Purchase', scheme: 'Mirae Asset Large Cap', amount: 200000, date: '2024-12-10' }
  ],

  // Customer Insights
  customerInsights: {
    newCustomersThisMonth: 8,
    totalInvestmentsThisMonth: 12500000,
    totalRedemptionsThisMonth: 3200000,
    netFlowThisMonth: 9300000,
    avgInvestmentSize: 156250
  }
});

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [data, setData] = useState(getDummyData());
  const [loading, setLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());

  const refreshData = () => {
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      setData(getDummyData());
      setLastUpdated(new Date());
      setLoading(false);
    }, 500);
  };

  // Format currency
  const formatCurrency = (value: number, compact = false) => {
    if (compact) {
      if (value >= 10000000) return `${(value / 10000000).toFixed(2)} Cr`;
      if (value >= 100000) return `${(value / 100000).toFixed(2)} L`;
      if (value >= 1000) return `${(value / 1000).toFixed(1)} K`;
    }
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(value);
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

  // Stat Card
  const StatCard: React.FC<{
    title: string;
    value: string | number;
    subValue?: string;
    change?: number;
    icon: React.ReactNode;
    color: string;
    onClick?: () => void;
  }> = ({ title, value, subValue, change, icon, color, onClick }) => (
    <Card onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>
            {title}
          </div>
          <div style={{ fontSize: '28px', fontWeight: '700', color: colors.utility.primaryText }}>
            {value}
          </div>
          {subValue && (
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginTop: '4px' }}>
              {subValue}
            </div>
          )}
          {change !== undefined && (
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              marginTop: '8px',
              fontSize: '13px',
              fontWeight: '600',
              color: change >= 0 ? '#10B981' : colors.semantic.error
            }}>
              {change >= 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
              {change >= 0 ? '+' : ''}{change.toFixed(1)}%
            </div>
          )}
        </div>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '12px',
          backgroundColor: color + '15',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: color
        }}>
          {icon}
        </div>
      </div>
    </Card>
  );

  return (
    <div style={{
      padding: '24px',
      maxWidth: '1600px',
      margin: '0 auto',
      minHeight: 'calc(100vh - 64px)'
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
            Here's your portfolio overview for {new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
          </p>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <span style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
            Last updated: {lastUpdated.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
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
        <StatCard
          title="Total AUM"
          value={formatCurrency(data.summary.totalAUM, true)}
          change={data.summary.aumChange}
          icon={<Briefcase size={24} />}
          color={colors.brand.primary}
        />
        <StatCard
          title="Active Customers"
          value={data.summary.activeCustomers}
          subValue={`of ${data.summary.totalCustomers} total`}
          icon={<Users size={24} />}
          color="#8B5CF6"
          onClick={() => navigate('/customers')}
        />
        <StatCard
          title="MTD Returns"
          value={`${data.summary.mtdReturns}%`}
          subValue={`YTD: ${data.summary.ytdReturns}%`}
          icon={<TrendingUp size={24} />}
          color="#10B981"
        />
        <StatCard
          title="Pending Actions"
          value={data.pendingActions.criticalAlerts + data.pendingActions.highPriorityAlerts}
          subValue={`${data.pendingActions.criticalAlerts} critical`}
          icon={<Bell size={24} />}
          color={colors.semantic.error}
          onClick={() => navigate('/cruise-control')}
        />
      </div>

      {/* Main Content Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 380px',
        gap: '20px',
        marginBottom: '24px'
      }}>
        {/* Market Overview */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Market Overview
            </h3>
            <Activity size={18} style={{ color: colors.utility.secondaryText }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {data.marketIndices.map((index, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px',
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                  borderRadius: '8px'
                }}
              >
                <div>
                  <div style={{ fontWeight: '600', color: colors.utility.primaryText, fontSize: '14px' }}>
                    {index.name}
                  </div>
                  <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                    {index.value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}
                  </div>
                </div>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px',
                  padding: '4px 10px',
                  borderRadius: '6px',
                  backgroundColor: index.change >= 0 ? '#10B98115' : colors.semantic.error + '15',
                  color: index.change >= 0 ? '#10B981' : colors.semantic.error,
                  fontSize: '13px',
                  fontWeight: '600'
                }}>
                  {index.change >= 0 ? <ArrowUpRight size={14} /> : <ArrowDownRight size={14} />}
                  {index.change >= 0 ? '+' : ''}{index.change}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Goal Summary */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Goals Overview
            </h3>
            <Target size={18} style={{ color: colors.utility.secondaryText }} />
          </div>

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
                {((data.goalSummary.currentValue / data.goalSummary.totalTargetValue) * 100).toFixed(1)}%
              </span>
            </div>
            <div style={{
              height: '10px',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E2E8F0',
              borderRadius: '5px',
              overflow: 'hidden'
            }}>
              <div style={{
                width: `${(data.goalSummary.currentValue / data.goalSummary.totalTargetValue) * 100}%`,
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
              <span>{formatCurrency(data.goalSummary.currentValue, true)}</span>
              <span>{formatCurrency(data.goalSummary.totalTargetValue, true)}</span>
            </div>
          </div>

          {/* Goal Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '12px'
          }}>
            <div style={{
              padding: '12px',
              backgroundColor: '#10B98115',
              borderRadius: '8px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '24px', fontWeight: '700', color: '#10B981' }}>
                {data.goalSummary.onTrack}
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
                {data.goalSummary.needsAttention}
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
                {data.goalSummary.offTrack}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Off Track</div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            fontSize: '13px',
            color: colors.utility.secondaryText,
            textAlign: 'center'
          }}>
            {data.goalSummary.totalGoals} total goals across all customers
          </div>
        </Card>

        {/* Pending Actions / Alerts */}
        <Card style={{ gridRow: 'span 2' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Action Required
            </h3>
            <button
              onClick={() => navigate('/cruise-control')}
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
              View All <ChevronRight size={14} />
            </button>
          </div>

          {/* Quick Stats */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '8px',
            marginBottom: '16px'
          }}>
            <div style={{
              padding: '10px',
              backgroundColor: colors.semantic.error + '10',
              borderRadius: '8px',
              borderLeft: `3px solid ${colors.semantic.error}`
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: colors.semantic.error }}>
                {data.pendingActions.criticalAlerts}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Critical</div>
            </div>
            <div style={{
              padding: '10px',
              backgroundColor: '#F9731615',
              borderRadius: '8px',
              borderLeft: '3px solid #F97316'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#F97316' }}>
                {data.pendingActions.pendingSIPs}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>SIPs Due</div>
            </div>
            <div style={{
              padding: '10px',
              backgroundColor: '#8B5CF615',
              borderRadius: '8px',
              borderLeft: '3px solid #8B5CF6'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#8B5CF6' }}>
                {data.pendingActions.goalsOffTrack}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Goals Off Track</div>
            </div>
            <div style={{
              padding: '10px',
              backgroundColor: '#10B98115',
              borderRadius: '8px',
              borderLeft: '3px solid #10B981'
            }}>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#10B981' }}>
                {data.pendingActions.birthdaysThisWeek}
              </div>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>Birthdays</div>
            </div>
          </div>

          {/* Recent Alerts List */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {data.recentAlerts.slice(0, 5).map((alert) => (
              <div
                key={alert.id}
                style={{
                  padding: '12px',
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                  borderRadius: '8px',
                  borderLeft: `3px solid ${getPriorityColor(alert.priority)}`,
                  cursor: 'pointer'
                }}
                onClick={() => navigate(`/customers/${alert.id}`)}
              >
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  marginBottom: '4px'
                }}>
                  <div style={{ fontWeight: '600', fontSize: '13px', color: colors.utility.primaryText }}>
                    {alert.customer}
                  </div>
                  <span style={{
                    fontSize: '10px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    backgroundColor: getPriorityColor(alert.priority) + '20',
                    color: getPriorityColor(alert.priority),
                    fontWeight: '600',
                    textTransform: 'uppercase'
                  }}>
                    {alert.priority}
                  </span>
                </div>
                <div style={{ fontSize: '12px', color: colors.utility.secondaryText }}>
                  {alert.type}
                  {alert.amount && ` - ${formatCurrency(alert.amount)}`}
                </div>
                {alert.scheme && (
                  <div style={{
                    fontSize: '11px',
                    color: colors.utility.secondaryText,
                    marginTop: '2px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {alert.scheme}
                  </div>
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Top Performing Schemes */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Top Performers (1Y)
            </h3>
            <TrendingUp size={18} style={{ color: '#10B981' }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.topSchemes.map((scheme, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '10px',
                  backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
                  borderRadius: '8px'
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontWeight: '500',
                    fontSize: '13px',
                    color: colors.utility.primaryText,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {scheme.name}
                  </div>
                  <div style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                    {scheme.category} | {formatCurrency(scheme.aum, true)}
                  </div>
                </div>
                <div style={{
                  fontWeight: '700',
                  fontSize: '14px',
                  color: '#10B981',
                  marginLeft: '12px'
                }}>
                  +{scheme.returns1Y}%
                </div>
              </div>
            ))}
          </div>
        </Card>

        {/* Sector Allocation */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Sector Allocation
            </h3>
            <PieChart size={18} style={{ color: colors.utility.secondaryText }} />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {data.sectorAllocation.map((sector, i) => {
              const sectorColors = ['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#6B7280'];
              return (
                <div key={i}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginBottom: '4px',
                    fontSize: '13px'
                  }}>
                    <span style={{ color: colors.utility.primaryText }}>{sector.sector}</span>
                    <span style={{ color: colors.utility.secondaryText }}>
                      {sector.percentage}% ({formatCurrency(sector.value, true)})
                    </span>
                  </div>
                  <div style={{
                    height: '6px',
                    backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#E2E8F0',
                    borderRadius: '3px',
                    overflow: 'hidden'
                  }}>
                    <div style={{
                      width: `${sector.percentage}%`,
                      height: '100%',
                      backgroundColor: sectorColors[i % sectorColors.length],
                      borderRadius: '3px'
                    }} />
                  </div>
                </div>
              );
            })}
          </div>
        </Card>
      </div>

      {/* Bottom Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '20px'
      }}>
        {/* Recent Transactions */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              Recent Transactions
            </h3>
            <Calendar size={18} style={{ color: colors.utility.secondaryText }} />
          </div>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: `1px solid ${isDarkMode ? colors.utility.primaryText + '10' : '#E2E8F0'}` }}>
                <th style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Customer</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Type</th>
                <th style={{ padding: '8px 0', textAlign: 'left', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Scheme</th>
                <th style={{ padding: '8px 0', textAlign: 'right', fontSize: '11px', fontWeight: '600', color: colors.utility.secondaryText }}>Amount</th>
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
                  <td style={{ padding: '10px 0', fontSize: '13px', color: colors.utility.primaryText }}>
                    {txn.customer}
                  </td>
                  <td style={{ padding: '10px 0' }}>
                    <span style={{
                      fontSize: '11px',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      backgroundColor: txn.type === 'Redemption' ? colors.semantic.error + '15' : '#10B98115',
                      color: txn.type === 'Redemption' ? colors.semantic.error : '#10B981',
                      fontWeight: '500'
                    }}>
                      {txn.type}
                    </span>
                  </td>
                  <td style={{
                    padding: '10px 0',
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    maxWidth: '200px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {txn.scheme}
                  </td>
                  <td style={{
                    padding: '10px 0',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.utility.primaryText,
                    textAlign: 'right'
                  }}>
                    {formatCurrency(txn.amount)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        {/* Customer Insights */}
        <Card>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: '16px'
          }}>
            <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: colors.utility.primaryText }}>
              This Month's Activity
            </h3>
            <Activity size={18} style={{ color: colors.utility.secondaryText }} />
          </div>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px'
          }}>
            <div style={{
              padding: '16px',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                New Customers
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: colors.brand.primary }}>
                +{data.customerInsights.newCustomersThisMonth}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: isDarkMode ? colors.utility.secondaryBackground : '#F8FAFC',
              borderRadius: '10px',
              textAlign: 'center'
            }}>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                Avg Investment
              </div>
              <div style={{ fontSize: '28px', fontWeight: '700', color: '#8B5CF6' }}>
                {formatCurrency(data.customerInsights.avgInvestmentSize, true)}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: '#10B98110',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                Total Investments
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: '#10B981' }}>
                {formatCurrency(data.customerInsights.totalInvestmentsThisMonth, true)}
              </div>
            </div>
            <div style={{
              padding: '16px',
              backgroundColor: colors.semantic.error + '10',
              borderRadius: '10px'
            }}>
              <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                Total Redemptions
              </div>
              <div style={{ fontSize: '22px', fontWeight: '700', color: colors.semantic.error }}>
                {formatCurrency(data.customerInsights.totalRedemptionsThisMonth, true)}
              </div>
            </div>
          </div>

          <div style={{
            marginTop: '16px',
            padding: '16px',
            backgroundColor: colors.brand.primary + '10',
            borderRadius: '10px',
            textAlign: 'center'
          }}>
            <div style={{ fontSize: '12px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
              Net Flow This Month
            </div>
            <div style={{
              fontSize: '32px',
              fontWeight: '700',
              color: data.customerInsights.netFlowThisMonth >= 0 ? '#10B981' : colors.semantic.error
            }}>
              {data.customerInsights.netFlowThisMonth >= 0 ? '+' : ''}{formatCurrency(data.customerInsights.netFlowThisMonth, true)}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
