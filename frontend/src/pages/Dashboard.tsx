// frontend/src/pages/Dashboard.tsx
import React, { useState, useEffect } from 'react';
import { useTheme } from '../contexts/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from 'recharts';
import apiService from '../services/api.service';
import { API_ENDPOINTS } from '../services/serviceURLs';
import GoalInvestmentAllocationService from '../services/goalInvestmentAllocation.service';
import { GoalCalculationResult } from '../types/goal.types';

type TabType = 'dashboard' | 'rebalancing' | 'reports' | 'notifications';
type PeriodType = '1M' | '3M' | '6M' | '1Y' | 'ALL';

interface PerformanceData {
  month: string;
  value: number;
}

interface AllocationData {
  name: string;
  value: number;
  color: string;
  [key: string]: any;
}

interface HoldingData {
  name: string;
  units: number;
  avgCost: number;
  currentNav: number;
  invested: number;
  currentValue: number;
  gain: number;
  returnPct: number;
}

interface GoalWithCalculation {
  id: number;
  title: string;
  config_data: any;
  calculation?: GoalCalculationResult | null;
  loadingCalculation?: boolean;
}

const Dashboard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  const navigate = useNavigate();

  const [activeTab, setActiveTab] = useState<TabType>('dashboard');
  const [selectedCustomer, setSelectedCustomer] = useState('101');
  const [selectedPeriod, setSelectedPeriod] = useState<PeriodType>('1Y');

  // Phase 2: Goals state
  const [goals, setGoals] = useState<GoalWithCalculation[]>([]);
  const [loadingGoals, setLoadingGoals] = useState<boolean>(false);

  // Sample data - replace with API calls
  const performanceData: PerformanceData[] = [
    { month: 'Oct 24', value: 750000 },
    { month: 'Nov 24', value: 770000 },
    { month: 'Dec 24', value: 805000 },
    { month: 'Jan 25', value: 830000 },
    { month: 'Feb 25', value: 850000 },
    { month: 'Mar 25', value: 890000 },
    { month: 'Apr 25', value: 920000 },
    { month: 'May 25', value: 950000 },
    { month: 'Jun 25', value: 980000 },
    { month: 'Jul 25', value: 1000000 },
    { month: 'Aug 25', value: 1025000 },
    { month: 'Sep 25', value: 1050000 },
  ];

  const allocationData: AllocationData[] = [
    { name: 'Equity', value: 68, color: colors.brand.primary },
    { name: 'Debt', value: 25, color: colors.semantic.success },
    { name: 'Hybrid', value: 5, color: colors.brand.secondary },
    { name: 'Gold', value: 2, color: colors.semantic.warning },
  ];

  const holdings: HoldingData[] = [
    {
      name: 'HDFC Top 100 Fund',
      units: 250.50,
      avgCost: 398.40,
      currentNav: 465.20,
      invested: 99799,
      currentValue: 116533,
      gain: 16734,
      returnPct: 16.8
    },
    {
      name: 'ICICI Prudential Bluechip',
      units: 420.75,
      avgCost: 85.50,
      currentNav: 98.30,
      invested: 35974,
      currentValue: 41360,
      gain: 5386,
      returnPct: 15.0
    },
    {
      name: 'SBI Small Cap Fund',
      units: 1250.00,
      avgCost: 120.00,
      currentNav: 165.80,
      invested: 150000,
      currentValue: 207250,
      gain: 57250,
      returnPct: 38.2
    },
    {
      name: 'Axis Midcap Fund',
      units: 890.25,
      avgCost: 95.30,
      currentNav: 87.50,
      invested: 84843,
      currentValue: 77897,
      gain: -6946,
      returnPct: -8.2
    },
    {
      name: 'HDFC Corporate Bond Fund',
      units: 2500.00,
      avgCost: 22.50,
      currentNav: 24.10,
      invested: 56250,
      currentValue: 60250,
      gain: 4000,
      returnPct: 7.1
    }
  ];

  const formatCurrency = (value: number, compact: boolean = false): string => {
    if (compact) {
      if (value >= 10000000) {
        return `₹${(value / 10000000).toFixed(2)}Cr`;
      } else if (value >= 100000) {
        return `₹${(value / 100000).toFixed(1)}L`;
      } else if (value >= 1000) {
        return `₹${(value / 1000).toFixed(1)}K`;
      }
      return `₹${Math.round(value)}`;
    }

    if (value >= 10000000) {
      return `₹${(value / 10000000).toFixed(2)}Cr`;
    } else if (value >= 100000) {
      return `₹${(value / 100000).toFixed(1)}L`;
    }
    return `₹${value.toLocaleString('en-IN')}`;
  };

  const formatChartValue = (value: number): string => {
    return `₹${(value / 100000).toFixed(1)}L`;
  };

  // Phase 2: Fetch goals and calculations for selected customer
  useEffect(() => {
    fetchGoals();
  }, [selectedCustomer]);

  const fetchGoals = async () => {
    setLoadingGoals(true);
    try {
      const response = await apiService.get<any>(
        API_ENDPOINTS.GOALS.GET_CUSTOMER_GOALS(parseInt(selectedCustomer))
      );

      if (response.success && response.data) {
        const goalsData: GoalWithCalculation[] = response.data.map((goal: any) => ({
          id: goal.id,
          title: goal.title,
          config_data: goal.config_data,
          calculation: null,
          loadingCalculation: true
        }));

        setGoals(goalsData);

        // Fetch calculations for each goal
        goalsData.forEach(async (goal) => {
          const calcResponse = await GoalInvestmentAllocationService.getGoalCalculations(goal.id);
          if (calcResponse.success && calcResponse.data) {
            setGoals(prev => prev.map(g =>
              g.id === goal.id
                ? { ...g, calculation: calcResponse.data, loadingCalculation: false }
                : g
            ));
          } else {
            setGoals(prev => prev.map(g =>
              g.id === goal.id
                ? { ...g, calculation: null, loadingCalculation: false }
                : g
            ));
          }
        });
      }
    } catch (error: any) {
      console.error('Failed to fetch goals:', error);
    } finally {
      setLoadingGoals(false);
    }
  };

  // Icons
  const TrendingUpIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );

  const UsersIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );

  const PercentIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <line x1="19" y1="5" x2="5" y2="19" />
      <circle cx="6.5" cy="6.5" r="2.5" />
      <circle cx="17.5" cy="17.5" r="2.5" />
    </svg>
  );

  const AlertCircleIcon = () => (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="10" />
      <line x1="12" y1="8" x2="12" y2="12" />
      <line x1="12" y1="16" x2="12.01" y2="16" />
    </svg>
  );

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: colors.utility.primaryBackground
    }}>
      {/* Header */}
      <div style={{
        backgroundColor: colors.utility.secondaryBackground,
        borderBottom: `1px solid ${colors.utility.primaryText}10`,
        padding: '20px 32px'
      }}>
        <h1 style={{
          fontSize: '24px',
          fontWeight: '700',
          color: colors.utility.primaryText,
          margin: '0 0 4px 0'
        }}>
          Portfolio Management System
        </h1>
        <div style={{
          fontSize: '14px',
          color: colors.utility.secondaryText,
          margin: 0
        }}>
          Fund Manager Dashboard
        </div>
      </div>

      <div style={{
        maxWidth: '1400px',
        margin: '0 auto',
        padding: '24px'
      }}>
        {/* Tabs */}
        <div style={{
          display: 'flex',
          gap: '8px',
          marginBottom: '24px',
          borderBottom: `2px solid ${colors.utility.primaryText}10`
        }}>
          {(['dashboard', 'rebalancing', 'reports', 'notifications'] as TabType[]).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              style={{
                padding: '12px 24px',
                background: 'none',
                border: 'none',
                color: activeTab === tab ? colors.brand.primary : colors.utility.secondaryText,
                cursor: 'pointer',
                fontSize: '15px',
                fontWeight: '500',
                borderBottom: `3px solid ${activeTab === tab ? colors.brand.primary : 'transparent'}`,
                transition: 'all 0.2s',
                textTransform: 'capitalize'
              }}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* DASHBOARD TAB */}
        {activeTab === 'dashboard' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '16px'
            }}>
              <StatCard
                icon={<TrendingUpIcon />}
                label="Total AUM"
                value="₹42.5 Cr"
                change="↑ 12.3% from last month"
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
              <StatCard
                icon={<UsersIcon />}
                label="Active Customers"
                value="147"
                change="+8 new this month"
                gradient="linear-gradient(135deg, #11998e 0%, #38ef7d 100%)"
              />
              <StatCard
                icon={<PercentIcon />}
                label="Average XIRR"
                value="14.2%"
                change="Beating Nifty by 2.5%"
                gradient="linear-gradient(135deg, #667eea 0%, #764ba2 100%)"
              />
              <StatCard
                icon={<AlertCircleIcon />}
                label="Portfolios Needing Rebalancing"
                value="23"
                change="15% of total portfolios"
                gradient="linear-gradient(135deg, #ee0979 0%, #ff6a00 100%)"
              />
            </div>

            {/* Customer Selector */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Select Customer Portfolio
                </h2>
                <select
                  value={selectedCustomer}
                  onChange={(e) => setSelectedCustomer(e.target.value)}
                  style={{
                    padding: '8px 16px',
                    border: `1px solid ${colors.utility.primaryText}20`,
                    borderRadius: '6px',
                    fontSize: '14px',
                    backgroundColor: colors.utility.primaryBackground,
                    color: colors.utility.primaryText,
                    cursor: 'pointer'
                  }}
                >
                  <option value="101">Rajesh Kumar (₹10.5L)</option>
                  <option value="102">Priya Sharma (₹25.8L)</option>
                  <option value="103">Amit Patel (₹45.2L)</option>
                </select>
              </div>
            </div>

            {/* Performance Summary */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: '16px'
            }}>
              <MetricCard label="Current Value" value="₹10,50,000" colors={colors} />
              <MetricCard label="Total Invested" value="₹7,50,000" colors={colors} />
              <MetricCard label="Absolute Gain" value="₹3,00,000" valueColor={colors.semantic.success} subValue="+40.0%" colors={colors} />
              <MetricCard label="XIRR" value="15.8%" colors={colors} />
            </div>

            {/* Performance Chart */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Portfolio Performance
                </h2>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {(['1M', '3M', '6M', '1Y', 'ALL'] as PeriodType[]).map((period) => (
                    <button
                      key={period}
                      onClick={() => setSelectedPeriod(period)}
                      style={{
                        padding: '6px 12px',
                        fontSize: '13px',
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '6px',
                        backgroundColor: selectedPeriod === period ? colors.brand.primary : 'transparent',
                        color: selectedPeriod === period ? 'white' : colors.utility.secondaryText,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                    >
                      {period}
                    </button>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={300}>
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" stroke={colors.utility.primaryText + '10'} />
                  <XAxis 
                    dataKey="month" 
                    stroke={colors.utility.secondaryText}
                    style={{ fontSize: '12px' }}
                  />
                  <YAxis 
                    tickFormatter={formatChartValue}
                    stroke={colors.utility.secondaryText}
                    style={{ fontSize: '12px' }}
                  />
                  <Tooltip
                    formatter={(value: number) => formatCurrency(value)}
                    contentStyle={{
                      backgroundColor: colors.utility.secondaryBackground,
                      border: `1px solid ${colors.utility.primaryText}20`,
                      borderRadius: '8px',
                      color: colors.utility.primaryText
                    }}
                  />
                  <Line
                    type="monotone"
                    dataKey="value"
                    stroke={colors.brand.primary}
                    strokeWidth={2}
                    dot={{ fill: colors.brand.primary, r: 4 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Asset Allocation and Metrics */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
              gap: '16px'
            }}>
              {/* Allocation Chart */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '20px'
                }}>
                  Asset Allocation
                </h2>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={allocationData}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={(entry: any) => `${entry.name} ${(entry.percent * 100).toFixed(0)}%`}
                      outerRadius={80}
                      dataKey="value"
                    >
                      {allocationData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: colors.utility.secondaryBackground,
                        border: `1px solid ${colors.utility.primaryText}20`,
                        borderRadius: '8px',
                        color: colors.utility.primaryText
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>

              {/* Performance Metrics */}
              <div style={{
                backgroundColor: colors.utility.secondaryBackground,
                borderRadius: '12px',
                padding: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  marginBottom: '20px'
                }}>
                  Performance Metrics
                </h2>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  <MetricRow label="1 Month Return" value="+3.2%" positive colors={colors} />
                  <MetricRow label="3 Month Return" value="+8.5%" positive colors={colors} />
                  <MetricRow label="6 Month Return" value="+12.8%" positive colors={colors} />
                  <MetricRow label="1 Year Return" value="+18.4%" positive colors={colors} />
                  <MetricRow label="Nifty 50 (1Y)" value="+15.2%" colors={colors} />
                  <MetricRow label="Alpha" value="+3.2%" positive colors={colors} />
                </div>
              </div>
            </div>

            {/* Holdings Table */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <h2 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: colors.utility.primaryText,
                marginBottom: '20px'
              }}>
                Current Holdings
              </h2>
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr style={{
                      backgroundColor: colors.utility.primaryBackground,
                      borderBottom: `2px solid ${colors.utility.primaryText}10`
                    }}>
                      <th style={tableHeaderStyle(colors)}>Scheme Name</th>
                      <th style={tableHeaderStyle(colors)}>Units</th>
                      <th style={tableHeaderStyle(colors)}>Avg Cost</th>
                      <th style={tableHeaderStyle(colors)}>Current NAV</th>
                      <th style={tableHeaderStyle(colors)}>Invested</th>
                      <th style={tableHeaderStyle(colors)}>Current Value</th>
                      <th style={tableHeaderStyle(colors)}>Gain/Loss</th>
                      <th style={tableHeaderStyle(colors)}>Return %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.map((holding, index) => (
                      <tr
                        key={index}
                        style={{
                          borderBottom: `1px solid ${colors.utility.primaryText}10`
                        }}
                      >
                        <td style={tableCellStyle(colors, true)}>{holding.name}</td>
                        <td style={tableCellStyle(colors)}>{holding.units.toFixed(2)}</td>
                        <td style={tableCellStyle(colors)}>₹{holding.avgCost.toFixed(2)}</td>
                        <td style={tableCellStyle(colors)}>₹{holding.currentNav.toFixed(2)}</td>
                        <td style={tableCellStyle(colors)}>{formatCurrency(holding.invested)}</td>
                        <td style={tableCellStyle(colors)}>{formatCurrency(holding.currentValue)}</td>
                        <td style={{
                          ...tableCellStyle(colors),
                          color: holding.gain >= 0 ? colors.semantic.success : colors.semantic.error
                        }}>
                          {holding.gain >= 0 ? '+' : ''}{formatCurrency(holding.gain)}
                        </td>
                        <td style={tableCellStyle(colors)}>
                          <span style={{
                            padding: '4px 12px',
                            borderRadius: '12px',
                            fontSize: '13px',
                            fontWeight: '600',
                            backgroundColor: holding.returnPct >= 0
                              ? colors.semantic.success + '20'
                              : colors.semantic.error + '20',
                            color: holding.returnPct >= 0
                              ? colors.semantic.success
                              : colors.semantic.error
                          }}>
                            {holding.returnPct >= 0 ? '+' : ''}{holding.returnPct.toFixed(1)}%
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Goals Overview */}
            <div style={{
              backgroundColor: colors.utility.secondaryBackground,
              borderRadius: '12px',
              padding: '20px'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h2 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  color: colors.utility.primaryText,
                  margin: 0
                }}>
                  Goals Tracking
                </h2>
                <button
                  onClick={() => navigate('/goals')}
                  style={{
                    padding: '8px 16px',
                    fontSize: '13px',
                    fontWeight: '600',
                    color: colors.brand.primary,
                    backgroundColor: 'transparent',
                    border: `1px solid ${colors.brand.primary}`,
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  View All Goals →
                </button>
              </div>

              {loadingGoals ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: colors.utility.secondaryText
                }}>
                  Loading goals...
                </div>
              ) : goals.length === 0 ? (
                <div style={{
                  padding: '40px',
                  textAlign: 'center',
                  color: colors.utility.secondaryText
                }}>
                  <div style={{ fontSize: '48px', marginBottom: '12px' }}>🎯</div>
                  <div style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    No Goals Found
                  </div>
                  <div style={{ fontSize: '14px' }}>
                    Create goals to start tracking investment progress
                  </div>
                </div>
              ) : (
                <div>
                  {/* Goal Summary Stats */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))',
                    gap: '12px',
                    marginBottom: '20px'
                  }}>
                    <div style={{
                      padding: '12px',
                      backgroundColor: colors.brand.primary + '10',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                        Total Goals
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: colors.brand.primary }}>
                        {goals.length}
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: colors.semantic.success + '10',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                        On Track
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.success }}>
                        {goals.filter(g => g.calculation?.is_on_track).length}
                      </div>
                    </div>
                    <div style={{
                      padding: '12px',
                      backgroundColor: colors.semantic.error + '10',
                      borderRadius: '8px'
                    }}>
                      <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginBottom: '4px' }}>
                        High Risk
                      </div>
                      <div style={{ fontSize: '24px', fontWeight: '700', color: colors.semantic.error }}>
                        {goals.filter(g => g.calculation?.risk_level === 'high').length}
                      </div>
                    </div>
                  </div>

                  {/* Goals Grid */}
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                    gap: '16px'
                  }}>
                    {goals.map((goal) => (
                      <div
                        key={goal.id}
                        onClick={() => navigate(`/goals/${goal.id}`)}
                        style={{
                          padding: '16px',
                          backgroundColor: colors.utility.primaryBackground,
                          border: `1px solid ${colors.utility.primaryText}20`,
                          borderRadius: '8px',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = colors.brand.primary;
                          e.currentTarget.style.boxShadow = `0 2px 8px ${colors.brand.primary}20`;
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = colors.utility.primaryText + '20';
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        {/* Goal Header */}
                        <div style={{
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'flex-start',
                          marginBottom: '12px'
                        }}>
                          <h3 style={{
                            fontSize: '14px',
                            fontWeight: '600',
                            color: colors.utility.primaryText,
                            margin: 0,
                            flex: 1
                          }}>
                            {goal.title}
                          </h3>
                          {goal.calculation && (
                            <span style={{
                              fontSize: '10px',
                              fontWeight: '600',
                              padding: '4px 8px',
                              borderRadius: '12px',
                              backgroundColor:
                                goal.calculation.risk_level === 'high' ? colors.semantic.error + '20' :
                                goal.calculation.risk_level === 'medium' ? colors.semantic.warning + '20' :
                                colors.semantic.success + '20',
                              color:
                                goal.calculation.risk_level === 'high' ? colors.semantic.error :
                                goal.calculation.risk_level === 'medium' ? colors.semantic.warning :
                                colors.semantic.success
                            }}>
                              {goal.calculation.risk_level.toUpperCase()} RISK
                            </span>
                          )}
                        </div>

                        {goal.loadingCalculation ? (
                          <div style={{ textAlign: 'center', padding: '20px', color: colors.utility.secondaryText, fontSize: '12px' }}>
                            Loading...
                          </div>
                        ) : goal.calculation ? (
                          <>
                            {/* Progress Bar */}
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                marginBottom: '4px'
                              }}>
                                <span style={{ fontSize: '11px', color: colors.utility.secondaryText }}>
                                  Progress
                                </span>
                                <span style={{ fontSize: '12px', fontWeight: '600', color: colors.brand.primary }}>
                                  {goal.calculation.progress_percentage.toFixed(1)}%
                                </span>
                              </div>
                              <div style={{
                                width: '100%',
                                height: '6px',
                                backgroundColor: colors.utility.primaryText + '10',
                                borderRadius: '3px',
                                overflow: 'hidden'
                              }}>
                                <div style={{
                                  width: `${Math.min(100, goal.calculation.progress_percentage)}%`,
                                  height: '100%',
                                  backgroundColor: goal.calculation.is_on_track ? colors.semantic.success : colors.semantic.warning,
                                  transition: 'width 0.3s ease'
                                }} />
                              </div>
                            </div>

                            {/* Metrics Grid */}
                            <div style={{
                              display: 'grid',
                              gridTemplateColumns: '1fr 1fr',
                              gap: '8px',
                              marginBottom: '8px'
                            }}>
                              <div>
                                <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>Current</div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                                  {formatCurrency(goal.calculation.current_amount, true)}
                                </div>
                              </div>
                              <div>
                                <div style={{ fontSize: '10px', color: colors.utility.secondaryText }}>Projected</div>
                                <div style={{ fontSize: '13px', fontWeight: '600', color: colors.utility.primaryText }}>
                                  {formatCurrency(goal.calculation.projected_amount, true)}
                                </div>
                              </div>
                            </div>

                            {/* Status Badge */}
                            <div style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              padding: '8px',
                              backgroundColor: goal.calculation.is_on_track ? colors.semantic.success + '10' : colors.semantic.warning + '10',
                              borderRadius: '6px',
                              fontSize: '11px'
                            }}>
                              <span>{goal.calculation.is_on_track ? '✓' : '⚠️'}</span>
                              <span style={{
                                fontWeight: '600',
                                color: goal.calculation.is_on_track ? colors.semantic.success : colors.semantic.warning
                              }}>
                                {goal.calculation.is_on_track ? 'On Track' : `SIP Required: ${formatCurrency(goal.calculation.monthly_sip_required, true)}/mo`}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div style={{
                            padding: '20px',
                            textAlign: 'center',
                            color: colors.utility.secondaryText,
                            fontSize: '12px'
                          }}>
                            No allocations configured
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* OTHER TABS - Placeholder */}
        {activeTab !== 'dashboard' && (
          <div style={{
            backgroundColor: colors.utility.secondaryBackground,
            borderRadius: '12px',
            padding: '40px',
            textAlign: 'center'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '8px',
              textTransform: 'capitalize'
            }}>
              {activeTab} Dashboard
            </h2>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText
            }}>
              Coming soon...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

// Helper Components
interface StatCardProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  change: string;
  gradient: string;
}

const StatCard: React.FC<StatCardProps> = ({ icon, label, value, change, gradient }) => (
  <div style={{
    background: gradient,
    color: 'white',
    borderRadius: '12px',
    padding: '24px'
  }}>
    <div style={{ marginBottom: '12px', opacity: 0.9 }}>{icon}</div>
    <div style={{ fontSize: '13px', opacity: 0.9, marginBottom: '8px' }}>{label}</div>
    <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '8px' }}>{value}</div>
    <div style={{ fontSize: '13px', opacity: 0.9 }}>{change}</div>
  </div>
);

interface MetricCardProps {
  label: string;
  value: string;
  valueColor?: string;
  subValue?: string;
  colors: any;
}

const MetricCard: React.FC<MetricCardProps> = ({ label, value, valueColor, subValue, colors }) => (
  <div style={{
    backgroundColor: colors.utility.secondaryBackground,
    borderRadius: '12px',
    padding: '20px'
  }}>
    <div style={{ fontSize: '13px', color: colors.utility.secondaryText, marginBottom: '8px' }}>
      {label}
    </div>
    <div style={{ fontSize: '28px', fontWeight: '700', color: valueColor || colors.utility.primaryText }}>
      {value}
    </div>
    {subValue && (
      <div style={{ fontSize: '14px', fontWeight: '600', color: valueColor || colors.utility.primaryText, marginTop: '4px' }}>
        {subValue}
      </div>
    )}
  </div>
);

interface MetricRowProps {
  label: string;
  value: string;
  positive?: boolean;
  colors: any;
}

const MetricRow: React.FC<MetricRowProps> = ({ label, value, positive, colors }) => (
  <div style={{
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: '16px',
    borderBottom: `1px solid ${colors.utility.primaryText}10`
  }}>
    <span style={{ fontSize: '14px', color: colors.utility.secondaryText }}>{label}</span>
    <span style={{
      fontSize: '15px',
      fontWeight: '600',
      color: positive ? colors.semantic.success : colors.utility.primaryText
    }}>
      {value}
    </span>
  </div>
);

// Table Styles
const tableHeaderStyle = (colors: any): React.CSSProperties => ({
  padding: '12px 16px',
  textAlign: 'left',
  fontSize: '13px',
  fontWeight: '600',
  color: colors.utility.secondaryText
});

const tableCellStyle = (colors: any, bold?: boolean): React.CSSProperties => ({
  padding: '16px',
  fontSize: '14px',
  color: colors.utility.primaryText,
  fontWeight: bold ? '600' : '400'
});

export default Dashboard;