// src/types/portfolio.types.ts

export interface PortfolioSummary {
  totalValue: number;
  totalInvested: number;
  dayChange: {
    amount: number;
    percentage: number;
  };
  overallReturns: {
    amount: number;
    percentage: number;
    xirr: number;
  };
}

export interface AssetAllocation {
  equity: {
    value: number;
    percentage: number;
  };
  debt: {
    value: number;
    percentage: number;
  };
  hybrid: {
    value: number;
    percentage: number;
  };
  liquid: {
    value: number;
    percentage: number;
  };
}

export interface FundHolding {
  fundName: string;
  value: number;
  returns: number;
  allocation: number;
  units?: number;
  nav?: number;
  purchaseNav?: number;
}

export interface Transaction {
  id?: string;
  date: string;
  type: 'BUY' | 'SELL' | 'SIP' | 'SWP' | 'SWITCH';
  amount: number;
  fundName: string;
  units?: number;
  nav?: number;
  status?: 'completed' | 'pending' | 'failed';
}

export type RiskProfile = 'Conservative' | 'Moderate' | 'Aggressive';

export interface PortfolioData {
  customerId: number;
  summary: PortfolioSummary;
  allocation: AssetAllocation;
  riskProfile: RiskProfile;
  riskScore: number; // 1-10 scale
  topHoldings: FundHolding[];
  performanceHistory: number[]; // Monthly values for sparkline
  lastTransaction: Transaction;
  monthlyPerformance?: Array<{
    month: string;
    value: number;
    returns: number;
  }>;
  recentTransactions?: Transaction[];
  sipDetails?: Array<{
    fundName: string;
    amount: number;
    date: number;
    active: boolean;
    startDate: string;
    totalInvested: number;
  }>;
  metadata?: {
    lastUpdated?: string;
    dataSource?: string;
    currency?: string;
  };
}

export interface PortfolioMetrics {
  sharpeRatio?: number;
  beta?: number;
  alpha?: number;
  standardDeviation?: number;
  maxDrawdown?: number;
  volatility?: number;
}

export interface PortfolioComparison {
  benchmark: string;
  benchmarkReturns: number;
  excessReturns: number;
  trackingError?: number;
  informationRatio?: number;
}

// Enhanced portfolio with customer data integration
export interface CustomerPortfolio extends PortfolioData {
  customerName: string;
  customerPrefix: string;
  isActive: boolean;
  lastReviewDate?: string;
  nextReviewDate?: string;
}

// Portfolio filters for dashboard
export interface PortfolioFilters {
  minValue?: number;
  maxValue?: number;
  riskProfile?: RiskProfile[];
  returnsRange?: {
    min: number;
    max: number;
  };
  hasNegativeReturns?: boolean;
  sortBy?: 'value' | 'returns' | 'risk' | 'name';
  sortOrder?: 'asc' | 'desc';
}

// Portfolio analytics for aggregated views
export interface PortfolioAnalytics {
  totalAUM: number;
  totalCustomers: number;
  averagePortfolioValue: number;
  averageReturns: number;
  riskDistribution: {
    conservative: number;
    moderate: number;
    aggressive: number;
  };
  topPerformers: Array<{
    customerId: number;
    customerName: string;
    returns: number;
  }>;
  needsAttention: Array<{
    customerId: number;
    customerName: string;
    reason: string;
  }>;
}