// frontend/src/hooks/useMarketData.ts
// CORRECTED VERSION - Replace entire file

import { useState, useEffect, useCallback, useRef } from 'react';
import { marketService } from '../services/market.service';
import { toastService } from '../services/toast.service';
import { FrontendErrorLogger } from '../services/errorLogger.service';
import type {
  MarketIndex,
  MarketStatistics,
  GetIndicesParams,
  DownloadHistoricalRequest,
  DownloadEODRequest,
  ApiResponse,
  GetIndicesResponse
} from '../types/market.types';

// ==================== INTERFACES ====================

export interface FilterState {
  category?: 'broad' | 'sectoral' | 'thematic' | 'all';
  status?: 'downloaded' | 'pending' | 'failed' | 'all';
  search?: string;
}

// ==================== MARKET INDICES HOOK ====================

export interface UseMarketIndicesReturn {
  indices: MarketIndex[];
  isLoading: boolean;
  error: string | null;
  fetchIndices: (params?: GetIndicesParams) => Promise<void>;
  refetch: () => void;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useMarketIndices = (initialParams?: GetIndicesParams): UseMarketIndicesReturn => {
  const [indices, setIndices] = useState<MarketIndex[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseMarketIndicesReturn['pagination']>(null);
  const lastParamsRef = useRef<GetIndicesParams>(initialParams || {});
  const hasInitializedRef = useRef(false);

  const fetchIndices = useCallback(async (params: GetIndicesParams = {}) => {
    setIsLoading(true);
    setError(null);
    lastParamsRef.current = params;

    try {
      const response = await marketService.getAllIndices(params);
      
      if (response.success && response.data) {
        setIndices(response.data.indices || []);
        
        const currentPage = response.data.page || 1;
        const totalPages = response.data.total_pages || 0;
        
        setPagination({
          total: response.data.total || 0,
          page: currentPage,
          pageSize: response.data.page_size || 50,
          totalPages: totalPages,
          hasNext: currentPage < totalPages,
          hasPrev: currentPage > 1,
        });

        FrontendErrorLogger.info(
          'Market indices fetched successfully',
          'useMarketIndices',
          {
            total: response.data.total,
            page: response.data.page,
            filters: params
          }
        );
      } else {
        console.warn('Market indices API error:', response.error);
        setError(response.error || 'Failed to fetch market indices');
        setIndices([]);
        setPagination({
          total: 0,
          page: params.page || 1,
          pageSize: params.page_size || 50,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (err: any) {
      console.error('Fetch market indices error:', err);
      const errorMsg = err.message || 'Failed to fetch market indices';
      setError(errorMsg);
      setIndices([]);
      setPagination({
        total: 0,
        page: params.page || 1,
        pageSize: params.page_size || 50,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });

      FrontendErrorLogger.error(
        'Failed to fetch market indices',
        'useMarketIndices',
        { error: errorMsg, params },
        err.stack
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchIndices(lastParamsRef.current);
  }, [fetchIndices]);

  // Initial load
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchIndices(initialParams || {});
    }
  }, []);

  return {
    indices,
    isLoading,
    error,
    fetchIndices,
    refetch,
    pagination,
  };
};

// ==================== MARKET STATISTICS HOOK ====================

export interface UseMarketStatisticsReturn {
  statistics: MarketStatistics | null;
  isLoading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
  refetch: () => void;
}

export const useMarketStatistics = (): UseMarketStatisticsReturn => {
  const [statistics, setStatistics] = useState<MarketStatistics | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const hasInitializedRef = useRef(false);

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await marketService.getStatistics();
      
      if (response.success && response.data) {
        setStatistics(response.data);

        FrontendErrorLogger.info(
          'Market statistics fetched successfully',
          'useMarketStatistics',
          {
            totalIndices: response.data.total_indices,
            totalDataPoints: response.data.total_data_points
          }
        );
      } else {
        console.warn('Statistics API error:', response.error);
        setStatistics({
          total_indices: 0,
          downloaded_indices: 0,
          pending_indices: 0,
          failed_indices: 0,
          total_data_points: 0,
          earliest_date: null,
          latest_date: null,
          storage_size_mb: 0
        });
      }
    } catch (err: any) {
      console.error('Fetch statistics error:', err);
      setStatistics({
        total_indices: 0,
        downloaded_indices: 0,
        pending_indices: 0,
        failed_indices: 0,
        total_data_points: 0,
        earliest_date: null,
        latest_date: null,
        storage_size_mb: 0
      });

      FrontendErrorLogger.error(
        'Failed to fetch market statistics',
        'useMarketStatistics',
        { error: err.message },
        err.stack
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refetch = useCallback(() => {
    fetchStatistics();
  }, [fetchStatistics]);

  // Initial load
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchStatistics();
    }
  }, [fetchStatistics]);

  return {
    statistics,
    isLoading,
    error,
    fetchStatistics,
    refetch,
  };
};

// ==================== MARKET DOWNLOAD HOOK ====================

export interface UseMarketDownloadReturn {
  downloadHistorical: (
    indexId: number,
    startDate: string,
    endDate: string
  ) => Promise<void>;
  downloadEOD: (indexId: number) => Promise<void>;
  deleteData: (indexId: number) => Promise<void>;
  isProcessing: boolean;
  error: string | null;
}

export const useMarketDownload = (
  onSuccess?: () => void
): UseMarketDownloadReturn => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const downloadHistorical = useCallback(async (
    indexId: number,
    startDate: string,
    endDate: string
  ) => {
    if (isProcessing) {
      toastService.warning('Another operation is in progress. Please wait.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      FrontendErrorLogger.info(
        'Starting historical download',
        'useMarketDownload',
        {
          indexId,
          startDate,
          endDate
        }
      );

      const request: DownloadHistoricalRequest = {
        index_id: indexId,
        start_date: startDate,
        end_date: endDate,
        skip_existing: true
      };

      const response = await marketService.downloadHistorical(request);
      
      if (response.success && response.data) {
        toastService.success(
          response.message || 'Historical download started successfully'
        );

        FrontendErrorLogger.info(
          'Historical download initiated',
          'useMarketDownload',
          {
            indexId,
            response: response.data
          }
        );

        // Trigger success callback (to refetch data)
        onSuccess?.();
      } else {
        const errorMsg = marketService.parseError(response.error);
        setError(errorMsg);
        toastService.error(`Download failed: ${errorMsg}`);

        FrontendErrorLogger.error(
          'Historical download failed',
          'useMarketDownload',
          {
            indexId,
            error: response.error
          }
        );
      }
    } catch (err: any) {
      console.error('Download historical error:', err);
      const errorMsg = marketService.parseError(err.message);
      setError(errorMsg);
      toastService.error(`Download failed: ${errorMsg}`);

      FrontendErrorLogger.error(
        'Historical download exception',
        'useMarketDownload',
        {
          indexId,
          error: err.message
        },
        err.stack
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onSuccess]);

  const downloadEOD = useCallback(async (indexId: number) => {
    if (isProcessing) {
      toastService.warning('Another operation is in progress. Please wait.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      FrontendErrorLogger.info(
        'Starting EOD download',
        'useMarketDownload',
        { indexId }
      );

      const request: DownloadEODRequest = {
        index_id: indexId
      };

      const response = await marketService.downloadEOD(request);
      
      if (response.success && response.data) {
        toastService.success(
          response.message || 'EOD download started successfully'
        );

        FrontendErrorLogger.info(
          'EOD download initiated',
          'useMarketDownload',
          {
            indexId,
            response: response.data
          }
        );

        // Trigger success callback
        onSuccess?.();
      } else {
        const errorMsg = marketService.parseError(response.error);
        setError(errorMsg);
        toastService.error(`EOD download failed: ${errorMsg}`);

        FrontendErrorLogger.error(
          'EOD download failed',
          'useMarketDownload',
          {
            indexId,
            error: response.error
          }
        );
      }
    } catch (err: any) {
      console.error('Download EOD error:', err);
      const errorMsg = marketService.parseError(err.message);
      setError(errorMsg);
      toastService.error(`EOD download failed: ${errorMsg}`);

      FrontendErrorLogger.error(
        'EOD download exception',
        'useMarketDownload',
        {
          indexId,
          error: err.message
        },
        err.stack
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onSuccess]);

  const deleteData = useCallback(async (indexId: number) => {
    if (isProcessing) {
      toastService.warning('Another operation is in progress. Please wait.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      FrontendErrorLogger.info(
        'Starting data deletion',
        'useMarketDownload',
        { indexId }
      );

      const response = await marketService.deleteAllData(indexId);
      
      if (response.success && response.data) {
        const deletedCount = response.data.deleted_count || 0;
        toastService.success(
          `Successfully deleted ${deletedCount.toLocaleString()} records`
        );

        FrontendErrorLogger.info(
          'Data deletion completed',
          'useMarketDownload',
          {
            indexId,
            deletedCount
          }
        );

        // Trigger success callback
        onSuccess?.();
      } else {
        const errorMsg = marketService.parseError(response.error);
        setError(errorMsg);
        toastService.error(`Delete failed: ${errorMsg}`);

        FrontendErrorLogger.error(
          'Data deletion failed',
          'useMarketDownload',
          {
            indexId,
            error: response.error
          }
        );
      }
    } catch (err: any) {
      console.error('Delete data error:', err);
      const errorMsg = marketService.parseError(err.message);
      setError(errorMsg);
      toastService.error(`Delete failed: ${errorMsg}`);

      FrontendErrorLogger.error(
        'Data deletion exception',
        'useMarketDownload',
        {
          indexId,
          error: err.message
        },
        err.stack
      );
    } finally {
      setIsProcessing(false);
    }
  }, [isProcessing, onSuccess]);

  return {
    downloadHistorical,
    downloadEOD,
    deleteData,
    isProcessing,
    error,
  };
};

// ==================== DASHBOARD HOOK (COMBINED) ====================

export interface UseMarketDashboardReturn {
  indices: MarketIndex[];
  statistics: MarketStatistics | null;
  isLoading: boolean;
  error: string | null;
  refetchAll: () => void;
  downloadHistorical: (indexId: number, startDate: string, endDate: string) => Promise<void>;
  downloadEOD: (indexId: number) => Promise<void>;
  deleteData: (indexId: number) => Promise<void>;
  isProcessing: boolean;
}

export const useMarketDashboard = (filters?: FilterState): UseMarketDashboardReturn => {
  // Build params from filters
  const params: GetIndicesParams = {
    page: 1,
    page_size: 1000,
    ...(filters?.category && filters.category !== 'all' && { category: filters.category }),
    ...(filters?.status && filters.status !== 'all' && { download_status: filters.status }),
    ...(filters?.search && { search: filters.search })
  };

  const { 
    indices, 
    isLoading: indicesLoading, 
    error: indicesError, 
    refetch: refetchIndices 
  } = useMarketIndices(params);
  
  const { 
    statistics, 
    isLoading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useMarketStatistics();

  const {
    downloadHistorical,
    downloadEOD,
    deleteData,
    isProcessing
  } = useMarketDownload(() => {
    // On success, refetch both indices and stats
    refetchIndices();
    refetchStats();
  });

  const isLoading = indicesLoading || statsLoading;
  const error = indicesError || statsError;

  const lastRefetchRef = useRef<number>(0);
  const refetchAll = useCallback(() => {
    const now = Date.now();
    // Debounce: only allow refetch every 2 seconds
    if (now - lastRefetchRef.current > 2000) {
      lastRefetchRef.current = now;
      refetchIndices();
      refetchStats();
    }
  }, [refetchIndices, refetchStats]);

  return {
    indices,
    statistics,
    isLoading,
    error,
    refetchAll,
    downloadHistorical,
    downloadEOD,
    deleteData,
    isProcessing,
  };
};

// ==================== EXPORTS ====================

export default {
  useMarketIndices,
  useMarketStatistics,
  useMarketDownload,
  useMarketDashboard
};