// frontend/src/hooks/useNavData.ts
// File 12/14: React hooks for NAV operations - TYPESCRIPT FIXED

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
  PaginatedResponse,
  ApiResponse
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
      const response: PaginatedResponse<SchemeSearchResult> = await navService.searchSchemes(params);
      
      if (response.success && response.data) {
        // FIXED: Access data structure correctly - response.data IS the data
        setSchemes(response.data.schemes || []);
        setPagination({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.page_size || 20,
          totalPages: response.data.total_pages || 0,
          hasNext: response.data.has_next || false,
          hasPrev: response.data.has_prev || false,
        });
      } else {
        setError(response.error || 'Failed to search schemes');
        setSchemes([]);
        setPagination(null);
      }
    } catch (err: any) {
      console.error('Search schemes error:', err);
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

export const useBookmarks = (initialParams?: BookmarkSearchParams): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<SchemeBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseBookmarksReturn['pagination']>(null);
  const lastParamsRef = useRef<BookmarkSearchParams>(initialParams || {});

  const fetchBookmarksStable = useCallback(async (params: BookmarkSearchParams = {}) => {
    setIsLoading(true);
    setError(null);
    lastParamsRef.current = params;

    try {
      const response: PaginatedResponse<SchemeBookmark> = await navService.getBookmarks(params);
      
      if (response.success && response.data) {
        // FIXED: Access data structure correctly - response.data IS the data
        setBookmarks(response.data.bookmarks || []);
        setPagination({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.page_size || 20,
          totalPages: response.data.total_pages || 0,
          hasNext: response.data.has_next || false,
          hasPrev: response.data.has_prev || false,
        });
      } else {
        console.warn('Bookmarks API error:', response.error);
        setError(response.error || 'Failed to fetch bookmarks');
        setBookmarks([]);
        setPagination({
          total: 0,
          page: params.page || 1,
          pageSize: params.page_size || 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (err: any) {
      console.error('Fetch bookmarks error:', err);
      setError(err.message || 'Failed to fetch bookmarks');
      setBookmarks([]);
      setPagination({
        total: 0,
        page: params.page || 1,
        pageSize: params.page_size || 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchBookmarksStableRef = useRef(fetchBookmarksStable);
  fetchBookmarksStableRef.current = fetchBookmarksStable;

  const fetchBookmarks = useCallback((params?: BookmarkSearchParams) => {
    return fetchBookmarksStableRef.current(params || {});
  }, []);

  const createBookmark = useCallback(async (request: CreateBookmarkRequest) => {
    try {
      const response: ApiResponse<SchemeBookmark> = await navService.createBookmark(request);
      
      if (response.success) {
        await fetchBookmarksStable(lastParamsRef.current);
      } else {
        const errorMsg = response.error || 'Failed to create bookmark';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Create bookmark error:', err);
      const errorMsg = err.message || 'Failed to create bookmark';
      setError(errorMsg);
      throw err;
    }
  }, [fetchBookmarksStable]);

  const updateBookmark = useCallback(async (id: number, updates: UpdateBookmarkRequest) => {
    try {
      const response: ApiResponse<SchemeBookmark> = await navService.updateBookmark(id, updates);
      
      if (response.success && response.data) {
        setBookmarks(prev => 
          prev.map(bookmark => 
            bookmark.id === id ? { ...bookmark, ...updates } : bookmark
          )
        );
      } else {
        const errorMsg = response.error || 'Failed to update bookmark';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Update bookmark error:', err);
      const errorMsg = err.message || 'Failed to update bookmark';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const deleteBookmark = useCallback(async (id: number) => {
    try {
      const response: ApiResponse<void> = await navService.deleteBookmark(id);
      
      if (response.success) {
        setBookmarks(prev => prev.filter(bookmark => bookmark.id !== id));
        setPagination(prev => prev ? { ...prev, total: Math.max(0, prev.total - 1) } : null);
      } else {
        const errorMsg = response.error || 'Failed to delete bookmark';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Delete bookmark error:', err);
      const errorMsg = err.message || 'Failed to delete bookmark';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const refetch = useCallback(() => {
    fetchBookmarksStable(lastParamsRef.current);
  }, [fetchBookmarksStable]);

  useEffect(() => {
    fetchBookmarksStable(initialParams || {});
  }, []);

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
      const response: PaginatedResponse<NavData> = await navService.getNavData(params);
      
      if (response.success && response.data) {
        // FIXED: Access data structure correctly - response.data IS the data
        setNavData(response.data.nav_data || []);
        setPagination({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.page_size || 50,
          totalPages: response.data.total_pages || 0,
          hasNext: response.data.has_next || false,
          hasPrev: response.data.has_prev || false,
        });
      } else {
        console.warn('NAV data API error:', response.error);
        setError(response.error || 'Failed to fetch NAV data');
        setNavData([]);
        setPagination(null);
      }
    } catch (err: any) {
      console.error('Fetch NAV data error:', err);
      setError(err.message || 'Failed to fetch NAV data');
      setNavData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const getLatestNav = useCallback(async (schemeId: number): Promise<NavData | null> => {
    try {
      const response: ApiResponse<NavData> = await navService.getLatestNav(schemeId);
      
      if (response.success && response.data) {
        return response.data;
      }
      return null;
    } catch (err: any) {
      console.error('Get latest NAV error:', err);
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

export const useDownloads = (initialParams?: DownloadJobParams): UseDownloadsReturn => {
  const [downloadJobs, setDownloadJobs] = useState<DownloadJob[]>([]);
  const [activeDownloads, setActiveDownloads] = useState<DownloadProgress[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseDownloadsReturn['pagination']>(null);
  const lastParamsRef = useRef<DownloadJobParams>(initialParams || {});

  const fetchDownloadJobsStable = useCallback(async (params: DownloadJobParams = {}) => {
    setIsLoading(true);
    setError(null);
    lastParamsRef.current = params;

    try {
      const response: PaginatedResponse<DownloadJob> = await navService.getDownloadJobs(params);
      
      if (response.success && response.data) {
        // FIXED: Access data structure correctly - response.data IS the data
        setDownloadJobs(response.data.jobs || []);
        setPagination({
          total: response.data.total || 0,
          page: response.data.page || 1,
          pageSize: response.data.page_size || 20,
          totalPages: response.data.total_pages || 0,
          hasNext: response.data.has_next || false,
          hasPrev: response.data.has_prev || false,
        });
      } else {
        console.warn('Download jobs API error:', response.error);
        setError(response.error || 'Failed to fetch download jobs');
        setDownloadJobs([]);
        setPagination({
          total: 0,
          page: params.page || 1,
          pageSize: params.page_size || 20,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        });
      }
    } catch (err: any) {
      console.error('Fetch download jobs error:', err);
      setError(err.message || 'Failed to fetch download jobs');
      setDownloadJobs([]);
      setPagination({
        total: 0,
        page: params.page || 1,
        pageSize: params.page_size || 20,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchActiveDownloadsStable = useCallback(async () => {
    try {
      const response = await navService.getActiveDownloads();
      
      if (response.success && response.data) {
        setActiveDownloads(response.data.active_downloads || []);
      } else {
        console.warn('Failed to fetch active downloads:', response.error);
        setActiveDownloads([]);
      }
    } catch (err: any) {
      console.warn('Failed to fetch active downloads:', err);
      setActiveDownloads([]);
    }
  }, []);

  const fetchDownloadJobsStableRef = useRef(fetchDownloadJobsStable);
  const fetchActiveDownloadsStableRef = useRef(fetchActiveDownloadsStable);
  fetchDownloadJobsStableRef.current = fetchDownloadJobsStable;
  fetchActiveDownloadsStableRef.current = fetchActiveDownloadsStable;

  const fetchDownloadJobs = useCallback((params?: DownloadJobParams) => {
    return fetchDownloadJobsStableRef.current(params || {});
  }, []);

  const fetchActiveDownloads = useCallback(() => {
    return fetchActiveDownloadsStableRef.current();
  }, []);

  const triggerDailyDownload = useCallback(async () => {
    try {
      const response = await navService.triggerDailyDownload();
      
      if (response.success && response.data) {
        await Promise.all([
          fetchDownloadJobsStable(lastParamsRef.current),
          fetchActiveDownloadsStable()
        ]);
        return response.data;
      } else {
        const errorMsg = response.error || 'Failed to trigger daily download';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Trigger daily download error:', err);
      const errorMsg = err.message || 'Failed to trigger daily download';
      setError(errorMsg);
      throw err;
    }
  }, [fetchDownloadJobsStable, fetchActiveDownloadsStable]);

  const triggerHistoricalDownload = useCallback(async (request: HistoricalDownloadRequest) => {
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
        await Promise.all([
          fetchDownloadJobsStable(lastParamsRef.current),
          fetchActiveDownloadsStable()
        ]);
        return response.data;
      } else {
        const errorMsg = response.error || 'Failed to trigger historical download';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Trigger historical download error:', err);
      const errorMsg = err.message || 'Failed to trigger historical download';
      setError(errorMsg);
      throw err;
    }
  }, [fetchDownloadJobsStable, fetchActiveDownloadsStable]);

  const cancelDownload = useCallback(async (jobId: number) => {
    try {
      const response = await navService.cancelDownloadJob(jobId);
      
      if (response.success) {
        setDownloadJobs(prev => 
          prev.map(job => 
            job.id === jobId ? { ...job, status: 'cancelled' as const } : job
          )
        );
        setActiveDownloads(prev => prev.filter(download => download.jobId !== jobId));
      } else {
        const errorMsg = response.error || 'Failed to cancel download';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Cancel download error:', err);
      const errorMsg = err.message || 'Failed to cancel download';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const refetch = useCallback(() => {
    fetchDownloadJobsStable(lastParamsRef.current);
    fetchActiveDownloadsStable();
  }, [fetchDownloadJobsStable, fetchActiveDownloadsStable]);

  useEffect(() => {
    fetchDownloadJobsStable(initialParams || {});
    fetchActiveDownloadsStable();
  }, []);

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
    stopPolling();
    setError(null);
    setIsPolling(true);
    onProgressCallbackRef.current = onProgress || null;

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          const response = await navService.getDownloadProgress(jobId);
          
          if (!response.success || !response.data) {
            throw new Error(response.error || 'Failed to get download progress');
          }

          const currentProgress = response.data;
          setProgress(currentProgress);
          
          if (onProgressCallbackRef.current) {
            onProgressCallbackRef.current(currentProgress);
          }

          if (currentProgress.status === 'completed' || 
              currentProgress.status === 'failed' || 
              currentProgress.status === 'cancelled') {
            stopPolling();
            resolve(currentProgress);
            return;
          }

        } catch (err: any) {
          console.error('Download progress polling error:', err);
          setError(err.message || 'Failed to get progress');
          stopPolling();
          reject(err);
          return;
        }
      };

      intervalRef.current = setInterval(poll, interval);
      poll();
    });
  }, [stopPolling]);

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
  refetch: () => void;
}

export const useNavStatistics = (): UseNavStatisticsReturn => {
  const [statistics, setStatistics] = useState<NavStatistics | null>(null);
  const [todayDataStatus, setTodayDataStatus] = useState<UseNavStatisticsReturn['todayDataStatus']>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchStatisticsStable = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getStatistics();
      
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        console.warn('Statistics API error:', response.error);
        setStatistics({
          total_schemes_tracked: 0,
          total_nav_records: 0,
          schemes_with_daily_download: 0,
          schemes_with_historical_data: 0,
          latest_nav_date: new Date().toISOString(),
          oldest_nav_date: new Date().toISOString(),
          download_jobs_today: 0,
          failed_downloads_today: 0
        });
      }
    } catch (err: any) {
      console.error('Fetch statistics error:', err);
      setStatistics({
        total_schemes_tracked: 0,
        total_nav_records: 0,
        schemes_with_daily_download: 0,
        schemes_with_historical_data: 0,
        latest_nav_date: new Date().toISOString(),
        oldest_nav_date: new Date().toISOString(),
        download_jobs_today: 0,
        failed_downloads_today: 0
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  const checkTodayDataStable = useCallback(async () => {
    try {
      const response = await navService.checkTodayData();
      
      if (response.success && response.data) {
        setTodayDataStatus(response.data);
      } else {
        console.warn('Failed to check today data:', response.error);
        setTodayDataStatus({
          total_bookmarked_schemes: 0,
          schemes_with_today_data: 0,
          schemes_missing_data: 0,
          data_available: false,
          message: 'No schemes bookmarked'
        });
      }
    } catch (err: any) {
      console.warn('Failed to check today data:', err);
      setTodayDataStatus({
        total_bookmarked_schemes: 0,
        schemes_with_today_data: 0,
        schemes_missing_data: 0,
        data_available: false,
        message: 'Unable to check today\'s data'
      });
    }
  }, []);

  const fetchStatisticsStableRef = useRef(fetchStatisticsStable);
  const checkTodayDataStableRef = useRef(checkTodayDataStable);
  fetchStatisticsStableRef.current = fetchStatisticsStable;
  checkTodayDataStableRef.current = checkTodayDataStable;

  const fetchStatistics = useCallback(() => {
    return fetchStatisticsStableRef.current();
  }, []);

  const checkTodayData = useCallback(() => {
    return checkTodayDataStableRef.current();
  }, []);

  const refetch = useCallback(() => {
    fetchStatisticsStable();
    checkTodayDataStable();
  }, [fetchStatisticsStable, checkTodayDataStable]);

  useEffect(() => {
    fetchStatisticsStable();
    checkTodayDataStable();
  }, []);

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
  refetchAll: () => void;
}

export const useNavDashboard = (): UseNavDashboardReturn => {
  const { 
    bookmarks, 
    isLoading: bookmarksLoading, 
    error: bookmarksError, 
    refetch: refetchBookmarks 
  } = useBookmarks({ page_size: 10 });
  
  const { 
    statistics, 
    todayDataStatus, 
    isLoading: statsLoading, 
    error: statsError, 
    refetch: refetchStats 
  } = useNavStatistics();
  
  const { 
    activeDownloads, 
    isLoading: downloadsLoading, 
    error: downloadsError, 
    fetchActiveDownloads 
  } = useDownloads();

  const isLoading = bookmarksLoading || statsLoading || downloadsLoading;
  const error = bookmarksError || statsError || downloadsError;

  const refetchAll = useCallback(() => {
    refetchBookmarks();
    refetchStats();
    fetchActiveDownloads();
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