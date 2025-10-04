// src/hooks/usePortfolioData.ts

import { useState, useEffect, useCallback } from 'react';
import { PortfolioService } from '../services/portfolio.service';
import { 
  CustomerPortfolioResponse, 
  PortfolioHolding,
  PortfolioFilters,
  PortfolioStatistics 
} from '../types/portfolio.types';
import { useAuth } from '../contexts/AuthContext';

interface UsePortfolioDataOptions {
  customerId?: number;
  filters?: PortfolioFilters;
  includeAnalytics?: boolean;
  autoFetch?: boolean;
}

interface UsePortfolioDataReturn {
  portfolio: CustomerPortfolioResponse | null;
  portfolios: PortfolioHolding[];
  analytics: PortfolioStatistics | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => void;
}

export const usePortfolioData = (options: UsePortfolioDataOptions = {}): UsePortfolioDataReturn => {
  const { customerId, filters, includeAnalytics = false, autoFetch = true } = options;
  const { user, tenantId } = useAuth();
  
  const [portfolio, setPortfolio] = useState<CustomerPortfolioResponse | null>(null);
  const [portfolios, setPortfolios] = useState<PortfolioHolding[]>([]);
  const [analytics, setAnalytics] = useState<PortfolioStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchPortfolioData = useCallback(async () => {
    if (!user || !tenantId) {
      setError(new Error('Authentication required'));
      return;
    }

    try {
      setIsLoading(true);
      setError(null);

      // Fetch single customer portfolio
      if (customerId) {
        const response = await PortfolioService.getCustomerPortfolio(customerId);
        
        if (response.success && response.data) {
          setPortfolio(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch portfolio');
        }
      }

      // Fetch filtered portfolio holdings
      if (filters) {
        const response = await PortfolioService.getPortfolioHoldings(filters);
        
        if (response.success && response.data) {
          setPortfolios(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch portfolio holdings');
        }
      }

      // Fetch analytics/statistics
      if (includeAnalytics) {
        const response = await PortfolioService.getPortfolioStatistics();
        
        if (response.success && response.data) {
          setAnalytics(response.data);
        } else {
          throw new Error(response.error || 'Failed to fetch portfolio statistics');
        }
      }

    } catch (err: any) {
      console.error('Error fetching portfolio data:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, filters, includeAnalytics, user, tenantId]);

  // Auto-fetch on mount and when dependencies change
  useEffect(() => {
    if (autoFetch) {
      fetchPortfolioData();
    }
  }, [fetchPortfolioData, autoFetch]);

  const refetch = useCallback(() => {
    fetchPortfolioData();
  }, [fetchPortfolioData]);

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
  const { analytics, isLoading, error } = usePortfolioData({ 
    includeAnalytics: true,
    autoFetch: true 
  });
  
  const metrics = {
    totalAUM: analytics?.total_current_value || 0,
    totalCustomers: analytics?.total_customers_with_portfolio || 0,
    totalInvested: analytics?.total_invested || 0,
    totalReturns: analytics?.total_returns || 0,
    avgReturns: analytics?.average_return_percentage || 0,
    totalSchemes: analytics?.total_schemes_held || 0,
    positiveReturnsCount: 0,
    negativeReturnsCount: 0,
    highRiskCount: 0
  };
  
  return {
    metrics,
    isLoading,
    error
  };
};

// Hook for portfolio comparison
export const usePortfolioComparison = (customerIds: number[]) => {
  const { user, tenantId } = useAuth();
  const [portfolios, setPortfolios] = useState<CustomerPortfolioResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user || !tenantId || customerIds.length === 0) return;

    const fetchPortfolios = async () => {
      try {
        setIsLoading(true);
        setError(null);

        const promises = customerIds.map(id =>
          PortfolioService.getCustomerPortfolio(id)
        );

        const responses = await Promise.all(promises);
        const validPortfolios = responses
          .filter(r => r.success && r.data)
          .map(r => r.data!);

        setPortfolios(validPortfolios);
      } catch (err: any) {
        console.error('Error fetching portfolios for comparison:', err);
        setError(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchPortfolios();
  }, [customerIds, user, tenantId]);

  const comparison = portfolios.length > 0 ? {
    portfolios,
    avgValue: portfolios.reduce((sum, p) => sum + p.summary.current_value, 0) / portfolios.length,
    avgReturns: portfolios.reduce((sum, p) => sum + p.summary.return_percentage, 0) / portfolios.length,
    avgRisk: 0,
    bestPerformer: portfolios.reduce((best, p) => 
      p.summary.return_percentage > best.summary.return_percentage ? p : best
    ),
    worstPerformer: portfolios.reduce((worst, p) => 
      p.summary.return_percentage < worst.summary.return_percentage ? p : worst
    )
  } : null;
  
  return { 
    comparison, 
    isLoading, 
    error 
  };
};

// Hook for customer portfolio totals only (faster query)
export const usePortfolioTotals = (customerId: number) => {
  const { user, tenantId } = useAuth();
  const [totals, setTotals] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchTotals = useCallback(async () => {
    if (!user || !tenantId || !customerId) return;

    try {
      setIsLoading(true);
      setError(null);

      const response = await PortfolioService.getPortfolioTotals(customerId);

      if (response.success && response.data) {
        setTotals(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch portfolio totals');
      }
    } catch (err: any) {
      console.error('Error fetching portfolio totals:', err);
      setError(err);
    } finally {
      setIsLoading(false);
    }
  }, [customerId, user, tenantId]);

  useEffect(() => {
    fetchTotals();
  }, [fetchTotals]);

  return {
    totals,
    isLoading,
    error,
    refetch: fetchTotals
  };
};