// src/hooks/usePortfolioData.ts

import { useState, useEffect, useMemo } from 'react';
import { PortfolioData, PortfolioFilters, PortfolioAnalytics } from '../types/portfolio.types';
import { mockPortfolioData } from '../data/mock/mockPortfolioData';

interface UsePortfolioDataOptions {
  customerId?: number;
  filters?: PortfolioFilters;
  includeAnalytics?: boolean;
}

interface UsePortfolioDataReturn {
  portfolio: PortfolioData | null;
  portfolios: PortfolioData[];
  analytics: PortfolioAnalytics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const usePortfolioData = (options: UsePortfolioDataOptions = {}): UsePortfolioDataReturn => {
  const { customerId, filters, includeAnalytics = false } = options;
  
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [lastFetch, setLastFetch] = useState(Date.now());

  // Simulate API call delay
  useEffect(() => {
    setIsLoading(true);
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);
    
    return () => clearTimeout(timer);
  }, [customerId, lastFetch]);

  // Get single portfolio
  const portfolio = useMemo(() => {
    if (!customerId) return null;
    return mockPortfolioData[customerId] || null;
  }, [customerId]);

  // Get filtered portfolios
  const portfolios = useMemo(() => {
    let result = Object.values(mockPortfolioData);
    
    if (!filters) return result;
    
    // Apply filters
    if (filters.minValue !== undefined) {
      result = result.filter(p => p.summary.totalValue >= filters.minValue!);
    }
    
    if (filters.maxValue !== undefined) {
      result = result.filter(p => p.summary.totalValue <= filters.maxValue!);
    }
    
    if (filters.riskProfile && filters.riskProfile.length > 0) {
      result = result.filter(p => filters.riskProfile!.includes(p.riskProfile));
    }
    
    if (filters.returnsRange) {
      result = result.filter(p => 
        p.summary.overallReturns.percentage >= filters.returnsRange!.min &&
        p.summary.overallReturns.percentage <= filters.returnsRange!.max
      );
    }
    
    if (filters.hasNegativeReturns !== undefined) {
      result = result.filter(p => 
        filters.hasNegativeReturns 
          ? p.summary.overallReturns.percentage < 0
          : p.summary.overallReturns.percentage >= 0
      );
    }
    
    // Apply sorting
    if (filters.sortBy) {
      result.sort((a, b) => {
        let aVal: number, bVal: number;
        
        switch (filters.sortBy) {
          case 'value':
            aVal = a.summary.totalValue;
            bVal = b.summary.totalValue;
            break;
          case 'returns':
            aVal = a.summary.overallReturns.percentage;
            bVal = b.summary.overallReturns.percentage;
            break;
          case 'risk':
            aVal = a.riskScore;
            bVal = b.riskScore;
            break;
          default:
            aVal = a.customerId;
            bVal = b.customerId;
        }
        
        return filters.sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
      });
    }
    
    return result;
  }, [filters]);

  // Calculate analytics
  const analytics = useMemo(() => {
    if (!includeAnalytics) return null;
    
    const allPortfolios = Object.values(mockPortfolioData);
    
    const totalAUM = allPortfolios.reduce((sum, p) => sum + p.summary.totalValue, 0);
    const avgPortfolioValue = totalAUM / allPortfolios.length;
    const avgReturns = allPortfolios.reduce((sum, p) => sum + p.summary.overallReturns.percentage, 0) / allPortfolios.length;
    
    const riskDistribution = {
      conservative: allPortfolios.filter(p => p.riskProfile === 'Conservative').length,
      moderate: allPortfolios.filter(p => p.riskProfile === 'Moderate').length,
      aggressive: allPortfolios.filter(p => p.riskProfile === 'Aggressive').length
    };
    
    const topPerformers = allPortfolios
      .sort((a, b) => b.summary.overallReturns.percentage - a.summary.overallReturns.percentage)
      .slice(0, 5)
      .map(p => ({
        customerId: p.customerId,
        customerName: `Customer ${p.customerId}`, // In real app, would fetch from customer data
        returns: p.summary.overallReturns.percentage
      }));
    
    const needsAttention = allPortfolios
      .filter(p => p.summary.overallReturns.percentage < -5 || p.riskScore > 8)
      .map(p => ({
        customerId: p.customerId,
        customerName: `Customer ${p.customerId}`,
        reason: p.summary.overallReturns.percentage < -5 
          ? `Negative returns: ${p.summary.overallReturns.percentage.toFixed(1)}%`
          : `High risk: ${p.riskScore}/10`
      }));
    
    return {
      totalAUM,
      totalCustomers: allPortfolios.length,
      averagePortfolioValue: avgPortfolioValue,
      averageReturns: avgReturns,
      riskDistribution,
      topPerformers,
      needsAttention
    };
  }, [includeAnalytics]);

  const refetch = () => {
    setLastFetch(Date.now());
  };

  return {
    portfolio,
    portfolios,
    analytics,
    isLoading,
    error,
    refetch
  };
};

// Hook for aggregated portfolio metrics
export const usePortfolioMetrics = () => {
  const { analytics, isLoading, error } = usePortfolioData({ includeAnalytics: true });
  
  const metrics = useMemo(() => {
    if (!analytics) {
      return {
        totalAUM: 0,
        totalCustomers: 0,
        positiveReturnsCount: 0,
        negativeReturnsCount: 0,
        avgReturns: 0,
        highRiskCount: 0
      };
    }
    
    const allPortfolios = Object.values(mockPortfolioData);
    
    return {
      totalAUM: analytics.totalAUM,
      totalCustomers: analytics.totalCustomers,
      positiveReturnsCount: allPortfolios.filter(p => p.summary.overallReturns.percentage >= 0).length,
      negativeReturnsCount: allPortfolios.filter(p => p.summary.overallReturns.percentage < 0).length,
      avgReturns: analytics.averageReturns,
      highRiskCount: allPortfolios.filter(p => p.riskScore > 7).length
    };
  }, [analytics]);
  
  return {
    metrics,
    isLoading,
    error
  };
};

// Hook for portfolio comparison
export const usePortfolioComparison = (customerIds: number[]) => {
  const portfolios = useMemo(() => {
    return customerIds.map(id => mockPortfolioData[id]).filter(Boolean);
  }, [customerIds]);
  
  const comparison = useMemo(() => {
    if (portfolios.length === 0) return null;
    
    return {
      portfolios,
      avgValue: portfolios.reduce((sum, p) => sum + p.summary.totalValue, 0) / portfolios.length,
      avgReturns: portfolios.reduce((sum, p) => sum + p.summary.overallReturns.percentage, 0) / portfolios.length,
      avgRisk: portfolios.reduce((sum, p) => sum + p.riskScore, 0) / portfolios.length,
      bestPerformer: portfolios.reduce((best, p) => 
        p.summary.overallReturns.percentage > best.summary.overallReturns.percentage ? p : best
      ),
      worstPerformer: portfolios.reduce((worst, p) => 
        p.summary.overallReturns.percentage < worst.summary.overallReturns.percentage ? p : worst
      )
    };
  }, [portfolios]);
  
  return comparison;
};