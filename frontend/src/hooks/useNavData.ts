// frontend/src/hooks/useNavData.ts
// File 12/14: React hooks for NAV operations following existing patterns

import { useState, useEffect, useCallback, useRef } from 'react';
import { navService, NavService } from '../services/nav.service';
import type {
  SchemeSearchResult,
  SchemeBookmark,
  NavData,
  DownloadJob,
  DownloadProgress,
  NavStatistics,
  SchemeSearchParams,
  BookmarkSearchParams,
  CreateBookmarkRequest,
  UpdateBookmarkRequest,
  NavDataParams,
  HistoricalDownloadRequest,
  DownloadJobParams,
} from '../services/nav.service';

// ==================== SCHEME SEARCH HOOK ====================

export interface UseSchemeSearchReturn {
  schemes: SchemeSearchResult[];
  isLoading: boolean;
  error: string | null;
  searchSchemes: (params: SchemeSearchParams) => Promise<void>;
  clearResults: () => void;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useSchemeSearch = (): UseSchemeSearchReturn => {
  const [schemes, setSchemes] = useState<SchemeSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseSchemeSearchReturn['pagination']>(null);

  const searchSchemes = useCallback(async (params: SchemeSearchParams) => {
    if (!params.search || params.search.trim().length < 2) {
      setError('Search query must be at least 2 characters');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.searchSchemes(params);
      
      if (response.success && response.data) {
        setSchemes(response.data.schemes);
        setPagination({
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.page_size,
          totalPages: response.data.total_pages,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev,
        });
      } else {
        throw new Error(response.error || 'Failed to search schemes');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to search schemes');
      setSchemes([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const clearResults = useCallback(() => {
    setSchemes([]);
    setPagination(null);
    setError(null);
  }, []);

  return {
    schemes,
    isLoading,
    error,
    searchSchemes,
    clearResults,
    pagination,
  };
};

// ==================== BOOKMARK MANAGEMENT HOOK ====================

export interface UseBookmarksReturn {
  bookmarks: SchemeBookmark[];
  isLoading: boolean;
  error: string | null;
  fetchBookmarks: (params?: BookmarkSearchParams) => Promise<void>;
  createBookmark: (request: CreateBookmarkRequest) => Promise<void>;
  updateBookmark: (id: number, updates: UpdateBookmarkRequest) => Promise<void>;
  deleteBookmark: (id: number) => Promise<void>;
  refetch: () => Promise<void>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useBookmarks = (initialParams?: BookmarkSearchParams): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<SchemeBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseBookmarksReturn['pagination']>(null);
  const [lastParams, setLastParams] = useState<BookmarkSearchParams | undefined>(initialParams);

  const fetchBookmarks = useCallback(async (params: BookmarkSearchParams = {}) => {
    setIsLoading(true);
    setError(null);
    setLastParams(params);

    try {
      const response = await navService.getBookmarks(params);
      
      if (response.success && response.data) {
        setBookmarks(response.data.bookmarks);
        setPagination({
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.page_size,
          totalPages: response.data.total_pages,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch bookmarks');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch bookmarks');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const createBookmark = useCallback(async (request: CreateBookmarkRequest) => {
    try {
      const response = await navService.createBookmark(request);
      
      if (response.success) {
        // Refetch bookmarks to get updated list
        await fetchBookmarks(lastParams);
      } else {
        throw new Error(response.error || 'Failed to create bookmark');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to create bookmark');
      throw err;
    }
  }, [fetchBookmarks, lastParams]);

  const updateBookmark = useCallback(async (id: number, updates: UpdateBookmarkRequest) => {
    try {
      const response = await navService.updateBookmark(id, updates);
      
      if (response.success) {
        // Update the bookmark in the local state
        setBookmarks(prev => 
          prev.map(bookmark => 
            bookmark.id === id ? { ...bookmark, ...updates } : bookmark
          )
        );
      } else {
        throw new Error(response.error || 'Failed to update bookmark');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to update bookmark');
      throw err;
    }
  }, []);

  const deleteBookmark = useCallback(async (id: number) => {
    try {
      const response = await navService.deleteBookmark(id);
      
      if (response.success) {
        // Remove the bookmark from local state
        setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
        // Update pagination if needed
        if (pagination) {
          setPagination(prev => prev ? { ...prev, total: prev.total - 1 } : null);
        }
      } else {
        throw new Error(response.error || 'Failed to delete bookmark');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to delete bookmark');
      throw err;
    }
  }, [pagination]);

  const refetch = useCallback(() => fetchBookmarks(lastParams), [fetchBookmarks, lastParams]);

  // Initial fetch
  useEffect(() => {
    fetchBookmarks(initialParams);
  }, [fetchBookmarks, initialParams]);

  return {
    bookmarks,
    isLoading,
    error,
    fetchBookmarks,
    createBookmark,
    updateBookmark,
    deleteBookmark,
    refetch,
    pagination,
  };
};

// ==================== NAV DATA HOOK ====================

export interface UseNavDataReturn {
  navData: NavData[];
  isLoading: boolean;
  error: string | null;
  fetchNavData: (params: NavDataParams) => Promise<void>;
  getLatestNav: (schemeId: number) => Promise<NavData | null>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useNavData = (): UseNavDataReturn => {
  const [navData, setNavData] = useState<NavData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseNavDataReturn['pagination']>(null);

  const fetchNavData = useCallback(async (params: NavDataParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getNavData(params);
      
      if (response.success && response.data) {
        setNavData(response.data.nav_data);
        setPagination({
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.page_size,
          totalPages: response.data.total_pages,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch NAV data');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch NAV data');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLatestNav = useCallback(async (schemeId: number): Promise<NavData | null> => {
    try {
      const response = await navService.getLatestNav(schemeId);
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      setError(err.message || 'Failed to get latest NAV');
      return null;
    }
  }, []);

  return {
    navData,
    isLoading,
    error,
    fetchNavData,
    getLatestNav,
    pagination,
  };
};

// ==================== DOWNLOAD MANAGEMENT HOOK ====================

export interface UseDownloadsReturn {
  downloadJobs: DownloadJob[];
  activeDownloads: DownloadProgress[];
  isLoading: boolean;
  error: string | null;
  triggerDailyDownload: () => Promise<{ jobId: number; message: string; alreadyExists?: boolean }>;
  triggerHistoricalDownload: (request: HistoricalDownloadRequest) => Promise<{ jobId: number; message: string; estimatedTime: number }>;
  cancelDownload: (jobId: number) => Promise<void>;
  fetchDownloadJobs: (params?: DownloadJobParams) => Promise<void>;
  fetchActiveDownloads: () => Promise<void>;
  refetch: () => Promise<void>;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useDownloads = (initialParams?: DownloadJobParams): UseDownloadsReturn => {
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseDownloadsReturn['pagination']>(null);
  const [lastParams, setLastParams] = useState<DownloadJobParams | undefined>(initialParams);

  const fetchDownloadJobs = useCallback(async (params: DownloadJobParams = {}) => {
    setIsLoading(true);
    setError(null);
    setLastParams(params);

    try {
      const response = await navService.getDownloadJobs(params);
      
      if (response.success && response.data) {
        setDownloadJobs(response.data.jobs);
        setPagination({
          total: response.data.total,
          page: response.data.page,
          pageSize: response.data.page_size,
          totalPages: response.data.total_pages,
          hasNext: response.data.has_next,
          hasPrev: response.data.has_prev,
        });
      } else {
        throw new Error(response.error || 'Failed to fetch download jobs');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch download jobs');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveDownloads = useCallback(async () => {
    try {
      const response = await navService.getActiveDownloads();
      
      if (response.success && response.data) {
        setActiveDownloads(response.data.active_downloads);
      }
    } catch (err: any) {
      // Don't set error for active downloads fetch failure
      console.error('Failed to fetch active downloads:', err);
    }
  }, []);

  const triggerDailyDownload = useCallback(async () => {
    try {
      const response = await navService.triggerDailyDownload();
      
      if (response.success && response.data) {
        // Refresh download jobs after triggering
        await fetchDownloadJobs(lastParams);
        await fetchActiveDownloads();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to trigger daily download');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger daily download');
      throw err;
    }
  }, [fetchDownloadJobs, fetchActiveDownloads, lastParams]);

  const triggerHistoricalDownload = useCallback(async (request: HistoricalDownloadRequest) => {
    // Validate date range
    const startDate = new Date(request.start_date);
    const endDate = new Date(request.end_date);
    const validation = NavService.validateDateRange(startDate, endDate);
    
    if (!validation.valid) {
      const error = new Error(validation.error);
      setError(error.message);
      throw error;
    }

    try {
      const response = await navService.triggerHistoricalDownload(request);
      
      if (response.success && response.data) {
        // Refresh download jobs after triggering
        await fetchDownloadJobs(lastParams);
        await fetchActiveDownloads();
        return response.data;
      } else {
        throw new Error(response.error || 'Failed to trigger historical download');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger historical download');
      throw err;
    }
  }, [fetchDownloadJobs, fetchActiveDownloads, lastParams]);

  const cancelDownload = useCallback(async (jobId: number) => {
    try {
      const response = await navService.cancelDownloadJob(jobId);
      
      if (response.success) {
        // Update the job status in local state
        setDownloadJobs(prev => 
          prev.map(job => 
            job.id === jobId ? { ...job, status: 'cancelled' as const } : job
          )
        );
        // Remove from active downloads
        setActiveDownloads(prev => prev.filter(download => download.jobId !== jobId));
      } else {
        throw new Error(response.error || 'Failed to cancel download');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to cancel download');
      throw err;
    }
  }, []);

  const refetch = useCallback(async () => {
    await fetchDownloadJobs(lastParams);
    await fetchActiveDownloads();
  }, [fetchDownloadJobs, fetchActiveDownloads, lastParams]);

  // Initial fetch
  useEffect(() => {
    fetchDownloadJobs(initialParams);
    fetchActiveDownloads();
  }, [fetchDownloadJobs, fetchActiveDownloads, initialParams]);

  return {
    downloadJobs,
    activeDownloads,
    isLoading,
    error,
    triggerDailyDownload,
    triggerHistoricalDownload,
    cancelDownload,
    fetchDownloadJobs,
    fetchActiveDownloads,
    refetch,
    pagination,
  };
};

// ==================== DOWNLOAD PROGRESS TRACKING HOOK ====================

export interface UseDownloadProgressReturn {
  progress: DownloadProgress | null;
  isPolling: boolean;
  startPolling: (jobId: number, onProgress?: (progress: DownloadProgress) => void) => Promise<DownloadProgress>;
  stopPolling: () => void;
  error: string | null;
}

export const useDownloadProgress = (): UseDownloadProgressReturn => {
  const [progress, setProgress] = useState<DownloadProgress | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const onProgressCallbackRef = useRef<((progress: DownloadProgress) => void) | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
    onProgressCallbackRef.current = null;
  }, []);

  const startPolling = useCallback(async (
    jobId: number, 
    onProgress?: (progress: DownloadProgress) => void,
    interval: number = 2000
  ): Promise<DownloadProgress> => {
    stopPolling(); // Stop any existing polling
    setError(null);
    setIsPolling(true);
    onProgressCallbackRef.current = onProgress || null;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await navService.getDownloadProgress(jobId);
          
          if (!response.success || !response.data) {
            throw new Error('Failed to get download progress');
          }

          const currentProgress = response.data;
          setProgress(currentProgress);
          
          // Call the progress callback if provided
          if (onProgressCallbackRef.current) {
            onProgressCallbackRef.current(currentProgress);
          }

          // Check if download is complete
          if (currentProgress.status === 'completed' || 
              currentProgress.status === 'failed' || 
              currentProgress.status === 'cancelled') {
            stopPolling();
            resolve(currentProgress);
            return;
          }

        } catch (err: any) {
          setError(err.message || 'Failed to get progress');
          stopPolling();
          reject(err);
          return;
        }
      };

      // Start polling
      intervalRef.current = setInterval(poll, interval);
      poll(); // Initial poll
    });
  }, [stopPolling]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    progress,
    isPolling,
    startPolling,
    stopPolling,
    error,
  };
};

// ==================== STATISTICS HOOK ====================

export interface UseNavStatisticsReturn {
  statistics: NavStatistics | null;
  todayDataStatus: {
    total_bookmarked_schemes: number;
    schemes_with_today_data: number;
    schemes_missing_data: number;
    data_available: boolean;
    message: string;
  } | null;
  isLoading: boolean;
  error: string | null;
  fetchStatistics: () => Promise<void>;
  checkTodayData: () => Promise<void>;
  refetch: () => Promise<void>;
}

export const useNavStatistics = (): UseNavStatisticsReturn => {
  const [statistics, setStatistics] = useState<NavStatistics | null>(null);
  const [todayDataStatus, setTodayDataStatus] = useState<UseNavStatisticsReturn['todayDataStatus']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getStatistics();
      
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        throw new Error(response.error || 'Failed to fetch statistics');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to fetch statistics');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkTodayData = useCallback(async () => {
    try {
      const response = await navService.checkTodayData();
      
      if (response.success && response.data) {
        setTodayDataStatus(response.data);
      }
    } catch (err: any) {
      // Don't set error for today data check failure
      console.error('Failed to check today data:', err);
    }
  }, []);

  const refetch = useCallback(async () => {
    await Promise.all([fetchStatistics(), checkTodayData()]);
  }, [fetchStatistics, checkTodayData]);

  // Initial fetch
  useEffect(() => {
    refetch();
  }, [refetch]);

  return {
    statistics,
    todayDataStatus,
    isLoading,
    error,
    fetchStatistics,
    checkTodayData,
    refetch,
  };
};

// ==================== COMBINED DASHBOARD HOOK ====================

export interface UseNavDashboardReturn {
  bookmarks: SchemeBookmark[];
  statistics: NavStatistics | null;
  activeDownloads: DownloadProgress[];
  todayDataStatus: UseNavStatisticsReturn['todayDataStatus'];
  isLoading: boolean;
  error: string | null;
  refetchAll: () => Promise<void>;
}

export const useNavDashboard = (): UseNavDashboardReturn => {
  const { bookmarks, isLoading: bookmarksLoading, error: bookmarksError, refetch: refetchBookmarks } = useBookmarks({ page_size: 10 });
  const { statistics, todayDataStatus, isLoading: statsLoading, error: statsError, refetch: refetchStats } = useNavStatistics();
  const { activeDownloads, isLoading: downloadsLoading, error: downloadsError, fetchActiveDownloads } = useDownloads();

  const isLoading = bookmarksLoading || statsLoading || downloadsLoading;
  const error = bookmarksError || statsError || downloadsError;

  const refetchAll = useCallback(async () => {
    await Promise.all([
      refetchBookmarks(),
      refetchStats(),
      fetchActiveDownloads()
    ]);
  }, [refetchBookmarks, refetchStats, fetchActiveDownloads]);

  return {
    bookmarks,
    statistics,
    activeDownloads,
    todayDataStatus,
    isLoading,
    error,
    refetchAll,
  };
};