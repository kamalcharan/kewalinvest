// frontend/src/hooks/useNavData.ts
// Fixed TypeScript errors with enhanced bookmark functionality - PRODUCTION READY

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
  BookmarkNavDataParams,
  BookmarkStats,
  UpdateBookmarkDownloadStatus,
  PaginatedResponse,
  ApiResponse
} from '../services/nav.service';

// ==================== INTERFACES ====================

export interface SchedulerConfig {
  id?: number;
  schedule_type: 'daily' | 'weekly' | 'custom';
  cron_expression?: string;
  download_time: string;
  is_enabled: boolean;
  next_execution_at?: string;
  last_executed_at?: string;
  execution_count?: number;
  failure_count?: number;
  created_at?: string;
  updated_at?: string;
}

export interface SchedulerStatus {
  config: SchedulerConfig;
  is_running: boolean;
  cron_job_active: boolean;
  next_run: string | null;
  last_run: string | null;
  recent_executions: Array<{
    id: number;
    execution_time: string;
    status: 'success' | 'failed' | 'skipped';
    n8n_execution_id?: string;
    error_message?: string;
    execution_duration_ms?: number;
  }>;
}

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

// ==================== ENHANCED BOOKMARK HOOKS ====================

/**
 * Hook for managing bookmark NAV data viewing
 */
export interface UseBookmarkNavDataReturn {
  navData: NavData[];
  isLoading: boolean;
  error: string | null;
  fetchNavData: (params: BookmarkNavDataParams) => Promise<void>;
  clearData: () => void;
  pagination: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  } | null;
}

export const useBookmarkNavData = (): UseBookmarkNavDataReturn => {
  const [navData, setNavData] = useState<NavData[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseBookmarkNavDataReturn['pagination']>(null);

  const fetchNavDataStable = useCallback(async (params: BookmarkNavDataParams) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getBookmarkNavData(params);
      
      if (response.success && response.data) {
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
        setError(response.error || 'Failed to load NAV data');
        setNavData([]);
        setPagination(null);
      }
    } catch (err: any) {
      console.error('Fetch bookmark NAV data error:', err);
      setError(err.message || 'Failed to load NAV data');
      setNavData([]);
      setPagination(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchNavData = useCallback((params: BookmarkNavDataParams) => {
    return fetchNavDataStable(params);
  }, [fetchNavDataStable]);

  const clearData = useCallback(() => {
    setNavData([]);
    setPagination(null);
    setError(null);
  }, []);

  return {
    navData,
    isLoading,
    error,
    fetchNavData,
    clearData,
    pagination,
  };
};

/**
 * Hook for managing bookmark statistics
 */
export interface UseBookmarkStatsReturn {
  stats: BookmarkStats | null;
  isLoading: boolean;
  error: string | null;
  fetchStats: (bookmarkId: number) => Promise<void>;
  refreshStats: () => void;
}

export const useBookmarkStats = (bookmarkId?: number): UseBookmarkStatsReturn => {
  const [stats, setStats] = useState<BookmarkStats | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBookmarkId, setCurrentBookmarkId] = useState<number | undefined>(bookmarkId);

  const fetchStatsStable = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    setCurrentBookmarkId(id);

    try {
      const response = await navService.getBookmarkStats(id);
      
      if (response.success && response.data) {
        setStats(response.data);
      } else {
        setError(response.error || 'Failed to load bookmark statistics');
        setStats(null);
      }
    } catch (err: any) {
      console.error('Fetch bookmark stats error:', err);
      setError(err.message || 'Failed to load statistics');
      setStats(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStats = useCallback((id: number) => {
    return fetchStatsStable(id);
  }, [fetchStatsStable]);

  const refreshStats = useCallback(() => {
    if (currentBookmarkId) {
      fetchStatsStable(currentBookmarkId);
    }
  }, [currentBookmarkId, fetchStatsStable]);

  useEffect(() => {
    if (bookmarkId) {
      fetchStatsStable(bookmarkId);
    }
  }, [bookmarkId, fetchStatsStable]);

  return {
    stats,
    isLoading,
    error,
    fetchStats,
    refreshStats,
  };
};

/**
 * Hook for managing historical downloads for bookmarks
 */
export interface UseBookmarkHistoricalDownloadReturn {
  isTriggering: boolean;
  error: string | null;
  triggerDownload: (bookmarkIds: number[], startDate: string, endDate: string) => Promise<{ jobId: number }>;
  clearError: () => void;
}

export const useBookmarkHistoricalDownload = (): UseBookmarkHistoricalDownloadReturn => {
  const [isTriggering, setIsTriggering] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const triggerDownload = useCallback(async (
    bookmarkIds: number[], 
    startDate: string, 
    endDate: string
  ): Promise<{ jobId: number }> => {
    if (isTriggering) {
      throw new Error('Download already in progress');
    }

    // Validate date range
    const start = new Date(startDate);
    const end = new Date(endDate);
    const validation = NavService.validateDateRange(start, end);
    
    if (!validation.valid) {
      const validationError = new Error(validation.error);
      setError(validationError.message);
      throw validationError;
    }

    setIsTriggering(true);
    setError(null);

    try {
      const response = await navService.triggerHistoricalDownloadForBookmarks(
        bookmarkIds,
        startDate,
        endDate
      );
      
      if (response.success && response.data) {
        return { jobId: response.data.jobId };
      } else {
        const errorMsg = response.error || 'Failed to trigger historical download';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Trigger bookmark historical download error:', err);
      const errorMsg = err.message || 'Failed to trigger download';
      setError(errorMsg);
      throw err;
    } finally {
      setIsTriggering(false);
    }
  }, [isTriggering]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isTriggering,
    error,
    triggerDownload,
    clearError,
  };
};

/**
 * Hook for managing bookmark download status
 */
export interface UseBookmarkDownloadStatusReturn {
  statusMap: { [bookmarkId: number]: any };
  isLoading: boolean;
  error: string | null;
  fetchStatus: (bookmarkIds: number[]) => Promise<void>;
  updateStatus: (bookmarkId: number, status: UpdateBookmarkDownloadStatus) => Promise<void>;
  refreshStatus: () => void;
}

export const useBookmarkDownloadStatus = (initialBookmarkIds: number[] = []): UseBookmarkDownloadStatusReturn => {
  const [statusMap, setStatusMap] = useState<{ [bookmarkId: number]: any }>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentBookmarkIds, setCurrentBookmarkIds] = useState<number[]>(initialBookmarkIds);

  const fetchStatusStable = useCallback(async (bookmarkIds: number[]) => {
    if (bookmarkIds.length === 0) return;

    setIsLoading(true);
    setError(null);
    setCurrentBookmarkIds(bookmarkIds);

    try {
      const response = await navService.getBookmarkDownloadStatus(bookmarkIds);
      
      if (response.success && response.data) {
        setStatusMap(response.data);
      } else {
        setError(response.error || 'Failed to load download status');
      }
    } catch (err: any) {
      console.error('Fetch bookmark download status error:', err);
      setError(err.message || 'Failed to load download status');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback((bookmarkIds: number[]) => {
    return fetchStatusStable(bookmarkIds);
  }, [fetchStatusStable]);

  const updateStatus = useCallback(async (bookmarkId: number, status: UpdateBookmarkDownloadStatus) => {
    try {
      const response = await navService.updateBookmarkDownloadStatus(bookmarkId, status);
      
      if (response.success) {
        // Update local status map
        setStatusMap(prev => ({
          ...prev,
          [bookmarkId]: {
            status: status.last_download_status,
            lastAttempt: status.last_download_attempt || new Date().toISOString(),
            error: status.last_download_error
          }
        }));
      } else {
        throw new Error(response.error || 'Failed to update status');
      }
    } catch (err: any) {
      console.error('Update bookmark download status error:', err);
      setError(err.message || 'Failed to update status');
      throw err;
    }
  }, []);

  const refreshStatus = useCallback(() => {
    if (currentBookmarkIds.length > 0) {
      fetchStatusStable(currentBookmarkIds);
    }
  }, [currentBookmarkIds, fetchStatusStable]);

  useEffect(() => {
    if (initialBookmarkIds.length > 0) {
      fetchStatusStable(initialBookmarkIds);
    }
  }, [initialBookmarkIds, fetchStatusStable]);

  return {
    statusMap,
    isLoading,
    error,
    fetchStatus,
    updateStatus,
    refreshStatus,
  };
};

// ==================== ENHANCED BOOKMARK MANAGEMENT HOOK ====================

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
  // ENHANCED: Add download status tracking
  downloadStatus: { [bookmarkId: number]: any };
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
      const response = await navService.getBookmarks(params);
      
      if (response.success && response.data) {
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

  // ENHANCED: Create bookmark with default daily download enabled
  const createBookmark = useCallback(async (request: CreateBookmarkRequest) => {
    try {
      // Default to daily download enabled unless explicitly set to false
      const enhancedRequest = {
        ...request,
        daily_download_enabled: request.daily_download_enabled !== false
      };

      const response: ApiResponse<SchemeBookmark> = await navService.createBookmark(enhancedRequest);
      
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

  // ENHANCED: Add download status tracking
  const bookmarkIds = bookmarks.map(b => b.id);
  const { statusMap, fetchStatus } = useBookmarkDownloadStatus(bookmarkIds);

  // Refresh download status when bookmarks change
  useEffect(() => {
    if (bookmarkIds.length > 0) {
      fetchStatus(bookmarkIds);
    }
  }, [bookmarkIds, fetchStatus]);

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
    downloadStatus: statusMap, // ENHANCED: Add download status data
  };
};

// ==================== SCHEDULER MANAGEMENT HOOK ====================

export interface UseSchedulerReturn {
  config: SchedulerConfig | null;
  status: SchedulerStatus | null;
  isLoading: boolean;
  error: string | null;
  fetchConfig: () => Promise<void>;
  fetchStatus: () => Promise<void>;
  saveConfig: (config: Omit<SchedulerConfig, 'id' | 'tenant_id' | 'user_id' | 'is_live'>) => Promise<void>;
  updateConfig: (updates: Partial<SchedulerConfig>) => Promise<void>;
  deleteConfig: () => Promise<void>;
  manualTrigger: () => Promise<{ executionId: string }>;
  refetch: () => void;
}

export const useScheduler = (): UseSchedulerReturn => {
  const [config, setConfig] = useState<SchedulerConfig | null>(null);
  const [status, setStatus] = useState<SchedulerStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchConfigStable = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getSchedulerConfig();
      
      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        // No config exists yet - this is normal
        setConfig(null);
      }
    } catch (err: any) {
      console.error('Fetch scheduler config error:', err);
      setError(err.message || 'Failed to fetch scheduler config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatusStable = useCallback(async () => {
    try {
      const response = await navService.getSchedulerStatus();
      
      if (response.success && response.data) {
        setStatus(response.data);
      } else {
        setStatus(null);
      }
    } catch (err: any) {
      console.error('Fetch scheduler status error:', err);
      setStatus(null);
    }
  }, []);

  const fetchConfigStableRef = useRef(fetchConfigStable);
  const fetchStatusStableRef = useRef(fetchStatusStable);
  fetchConfigStableRef.current = fetchConfigStable;
  fetchStatusStableRef.current = fetchStatusStable;

  const fetchConfig = useCallback(() => {
    return fetchConfigStableRef.current();
  }, []);

  const fetchStatus = useCallback(() => {
    return fetchStatusStableRef.current();
  }, []);

  const saveConfig = useCallback(async (configData: Omit<SchedulerConfig, 'id' | 'tenant_id' | 'user_id' | 'is_live'>) => {
    try {
      const response = await navService.saveSchedulerConfig(configData);
      
      if (response.success && response.data) {
        setConfig(response.data);
        await fetchStatusStable();
      } else {
        const errorMsg = response.error || 'Failed to save scheduler config';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Save scheduler config error:', err);
      const errorMsg = err.message || 'Failed to save scheduler config';
      setError(errorMsg);
      throw err;
    }
  }, [fetchStatusStable]);

  const updateConfig = useCallback(async (updates: Partial<SchedulerConfig>) => {
    if (!config?.id) {
      throw new Error('No scheduler config to update');
    }

    try {
      const response = await navService.updateSchedulerConfig(config.id, updates);
      
      if (response.success && response.data) {
        setConfig(response.data);
        await fetchStatusStable();
      } else {
        const errorMsg = response.error || 'Failed to update scheduler config';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Update scheduler config error:', err);
      const errorMsg = err.message || 'Failed to update scheduler config';
      setError(errorMsg);
      throw err;
    }
  }, [config, fetchStatusStable]);

  const deleteConfig = useCallback(async () => {
    try {
      const response = await navService.deleteSchedulerConfig();
      
      if (response.success) {
        setConfig(null);
        setStatus(null);
      } else {
        const errorMsg = response.error || 'Failed to delete scheduler config';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Delete scheduler config error:', err);
      const errorMsg = err.message || 'Failed to delete scheduler config';
      setError(errorMsg);
      throw err;
    }
  }, []);

  const manualTrigger = useCallback(async () => {
    try {
      const response = await navService.triggerScheduledDownload();
      
      if (response.success && response.data) {
        await fetchStatusStable();
        return { executionId: response.data.execution_id || 'unknown' };
      } else {
        const errorMsg = response.error || 'Failed to trigger download';
        setError(errorMsg);
        throw new Error(errorMsg);
      }
    } catch (err: any) {
      console.error('Manual trigger error:', err);
      const errorMsg = err.message || 'Failed to trigger download';
      setError(errorMsg);
      throw err;
    }
  }, [fetchStatusStable]);

  const refetch = useCallback(() => {
    fetchConfigStable();
    fetchStatusStable();
  }, [fetchConfigStable, fetchStatusStable]);

  useEffect(() => {
    fetchConfigStable();
    fetchStatusStable();
  }, []);

  return {
    config,
    status,
    isLoading,
    error,
    fetchConfig,
    fetchStatus,
    saveConfig,
    updateConfig,
    deleteConfig,
    manualTrigger,
    refetch,
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
      const response = await navService.getDownloadJobs(params);
      
      if (response.success && response.data) {
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
  schedulerConfig: SchedulerConfig | null;
  schedulerStatus: SchedulerStatus | null;
  downloadStatus: { [bookmarkId: number]: any }; // ENHANCED: Add download status
  isLoading: boolean;
  error: string | null;
  refetchAll: () => void;
}

export const useNavDashboard = (): UseNavDashboardReturn => {
  const { 
    bookmarks, 
    isLoading: bookmarksLoading, 
    error: bookmarksError, 
    refetch: refetchBookmarks,
    downloadStatus // ENHANCED: Get download status from enhanced hook
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

  const {
    config: schedulerConfig,
    status: schedulerStatus,
    isLoading: schedulerLoading,
    error: schedulerError,
    refetch: refetchScheduler
  } = useScheduler();

  const isLoading = bookmarksLoading || statsLoading || downloadsLoading || schedulerLoading;
  const error = bookmarksError || statsError || downloadsError || schedulerError;

  const refetchAll = useCallback(() => {
    refetchBookmarks();
    refetchStats();
    fetchActiveDownloads();
    refetchScheduler();
  }, [refetchBookmarks, refetchStats, fetchActiveDownloads, refetchScheduler]);

  return {
    bookmarks,
    statistics,
    activeDownloads,
    todayDataStatus,
    schedulerConfig,
    schedulerStatus,
    downloadStatus, // ENHANCED: Include download status
    isLoading,
    error,
    refetchAll,
  };
};