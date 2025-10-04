// src/types/extended.types.ts
// Extended type definitions for enhanced dashboard features

import { CustomerPortfolioResponse } from './portfolio.types';
import { JTBDData as BaseJTBDData } from './jtbd.types';

// Extended Portfolio interfaces
export interface MonthlyPerformance {
  month: string;
  value: number;
  returns: number;
}

export interface SIPDetail {
  fundName: string;
  amount: number;
  date: number;
  active: boolean;
  startDate: string;
  totalInvested: number;
}

export interface ExtendedTransaction {
  date: string;
  type: 'BUY' | 'SELL' | 'SIP' | 'SWP' | 'SWITCH';
  amount: number;
  fundName: string;
  units?: number;
  nav?: number;
  status?: 'completed' | 'pending' | 'failed';
}

// Use CustomerPortfolioResponse as base instead of non-existent PortfolioData
export interface ExtendedPortfolioData extends CustomerPortfolioResponse {
  monthlyPerformance?: MonthlyPerformance[];
  recentTransactions?: ExtendedTransaction[];
  sipDetails?: SIPDetail[];
}

// Extended JTBD interfaces
export interface DetailedAnalysis {
  strengthAreas: string[];
  improvementAreas: string[];
  peerComparison?: {
    percentile: number;
    message: string;
    avgPeerReturns: number;
    yourReturns: number;
  };
}

export interface Recommendation {
  title: string;
  description: string;
  potentialSaving?: number;
  expectedImpact?: string;
  urgency?: string;
  priority: string;
  complexity: string;
}

export interface UpcomingEvent {
  date: string;
  event: string;
  action?: string;
  amount?: number;
}

export interface ExtendedJTBDData extends BaseJTBDData {
  detailedAnalysis?: DetailedAnalysis;
  recommendations?: Recommendation[];
  upcomingEvents?: UpcomingEvent[];
}

// Type guards
export function isExtendedPortfolio(data: any): data is ExtendedPortfolioData {
  return data && typeof data === 'object' && 'summary' in data;
}

export function isExtendedJTBD(data: any): data is ExtendedJTBDData {
  return data && typeof data === 'object' && 'primaryGoal' in data;
}