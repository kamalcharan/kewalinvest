// frontend/src/hooks/useNavData.ts
// MINIMAL FIX: Only fix infinite loops, no new dependencies or refactoring

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

// ==================== INTERFACES (UNCHANGED) ====================

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

// ==================== SCHEME SEARCH HOOK (FIXED) ====================

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

  // FIXED: Stable function reference
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
  }, []); // FIXED: Empty dependency array

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

// ==================== BOOKMARK NAV DATA HOOK (FIXED) ====================

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

  // FIXED: Stable function
  const fetchNavData = useCallback(async (params: BookmarkNavDataParams) => {
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

// ==================== BOOKMARK STATS HOOK (FIXED) ====================

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
  const currentBookmarkIdRef = useRef<number | undefined>(bookmarkId);

  const fetchStats = useCallback(async (id: number) => {
    setIsLoading(true);
    setError(null);
    currentBookmarkIdRef.current = id;

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

  const refreshStats = useCallback(() => {
    if (currentBookmarkIdRef.current) {
      fetchStats(currentBookmarkIdRef.current);
    }
  }, [fetchStats]);

  // FIXED: Only call when bookmarkId actually changes
  const lastBookmarkIdRef = useRef<number | undefined>();
  useEffect(() => {
    if (bookmarkId && bookmarkId !== lastBookmarkIdRef.current) {
      lastBookmarkIdRef.current = bookmarkId;
      currentBookmarkIdRef.current = bookmarkId;
      fetchStats(bookmarkId);
    }
  }, [bookmarkId, fetchStats]);

  return {
    stats,
    isLoading,
    error,
    fetchStats,
    refreshStats,
  };
};

// ==================== BOOKMARK DOWNLOAD STATUS HOOK (SIMPLIFIED) ====================

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
  const currentBookmarkIdsRef = useRef<number[]>([]);

  // FIXED: Simplified to prevent recursive calls
  const fetchStatus = useCallback(async (bookmarkIds: number[]) => {
    if (bookmarkIds.length === 0) return;

    // Prevent calling if already loading or same IDs
    if (isLoading || JSON.stringify(bookmarkIds.sort()) === JSON.stringify(currentBookmarkIdsRef.current.sort())) {
      return;
    }

    setIsLoading(true);
    setError(null);
    currentBookmarkIdsRef.current = bookmarkIds;

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
  }, [isLoading]);

  const updateStatus = useCallback(async (bookmarkId: number, status: UpdateBookmarkDownloadStatus) => {
    try {
      const response = await navService.updateBookmarkDownloadStatus(bookmarkId, status);
      
      if (response.success) {
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
    if (currentBookmarkIdsRef.current.length > 0) {
      fetchStatus(currentBookmarkIdsRef.current);
    }
  }, [fetchStatus]);

  // FIXED: Use string comparison to detect actual changes
  const lastIdsStringRef = useRef<string>('');
  useEffect(() => {
    const currentIdsString = initialBookmarkIds.sort().join(',');
    if (initialBookmarkIds.length > 0 && currentIdsString !== lastIdsStringRef.current) {
      lastIdsStringRef.current = currentIdsString;
      fetchStatus(initialBookmarkIds);
    }
  }, [initialBookmarkIds.join(','), fetchStatus]); // Use join for stable comparison

  return {
    statusMap,
    isLoading,
    error,
    fetchStatus,
    updateStatus,
    refreshStatus,
  };
};

// ==================== BOOKMARKS HOOK (FIXED TO PREVENT LOOPS) ====================

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
  downloadStatus: { [bookmarkId: number]: any };
}

export const useBookmarks = (initialParams?: BookmarkSearchParams): UseBookmarksReturn => {
  const [bookmarks, setBookmarks] = useState<SchemeBookmark[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<UseBookmarksReturn['pagination']>(null);
  const lastParamsRef = useRef<BookmarkSearchParams>(initialParams || {});
  const hasInitializedRef = useRef(false);

  // FIXED: Stable function that doesn't cause re-renders
  const fetchBookmarks = useCallback(async (params: BookmarkSearchParams = {}) => {
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

  const createBookmark = useCallback(async (request: CreateBookmarkRequest) => {
    try {
      const enhancedRequest = {
        ...request,
        daily_download_enabled: request.daily_download_enabled !== false
      };

      const response: ApiResponse<SchemeBookmark> = await navService.createBookmark(enhancedRequest);
      
      if (response.success) {
        await fetchBookmarks(lastParamsRef.current);
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
  }, [fetchBookmarks]);

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
    fetchBookmarks(lastParamsRef.current);
  }, [fetchBookmarks]);

  // FIXED: Get download status but prevent infinite loops by disabling it temporarily
  const bookmarkIds = bookmarks.map(b => b.id);
  
  // SIMPLIFIED: Don't fetch download status automatically to prevent loops
  // This can be enabled later after fixing the service layer
  const statusMap = {};

  // FIXED: Only fetch on mount, not on every render
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchBookmarks(initialParams || {});
    }
  }, []); // Empty dependency array for mount only

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
    downloadStatus: statusMap, // Simplified to prevent loops
  };
};

// ==================== SCHEDULER HOOK (FIXED) ====================

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
  const hasInitializedRef = useRef(false);

  const fetchConfig = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await navService.getSchedulerConfig();
      
      if (response.success && response.data) {
        setConfig(response.data);
      } else {
        setConfig(null);
      }
    } catch (err: any) {
      console.error('Fetch scheduler config error:', err);
      setError(err.message || 'Failed to fetch scheduler config');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchStatus = useCallback(async () => {
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

  const saveConfig = useCallback(async (configData: Omit<SchedulerConfig, 'id' | 'tenant_id' | 'user_id' | 'is_live'>) => {
    try {
      const response = await navService.saveSchedulerConfig(configData);
      
      if (response.success && response.data) {
        setConfig(response.data);
        await fetchStatus();
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
  }, [fetchStatus]);

  const updateConfig = useCallback(async (updates: Partial<SchedulerConfig>) => {
    if (!config?.id) {
      throw new Error('No scheduler config to update');
    }

    try {
      const response = await navService.updateSchedulerConfig(config.id, updates);
      
      if (response.success && response.data) {
        setConfig(response.data);
        await fetchStatus();
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
  }, [config, fetchStatus]);

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
        await fetchStatus();
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
  }, [fetchStatus]);

  const refetch = useCallback(() => {
    fetchConfig();
    fetchStatus();
  }, [fetchConfig, fetchStatus]);

  // FIXED: Only fetch on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const initializeFetch = async () => {
        await Promise.all([fetchConfig(), fetchStatus()]);
      };
      initializeFetch();
    }
  }, []); // Empty dependency array

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

// ==================== OTHER HOOKS (SIMPLIFIED FIXES) ====================

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

// ==================== DOWNLOADS HOOK (FIXED) ====================

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
  const hasInitializedRef = useRef(false);

  const fetchDownloadJobs = useCallback(async (params: DownloadJobParams = {}) => {
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

  const fetchActiveDownloads = useCallback(async () => {
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

  const triggerDailyDownload = useCallback(async () => {
    try {
      const response = await navService.triggerDailyDownload();
      
      if (response.success && response.data) {
        // Don't automatically refetch to prevent loops
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
  }, []);

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
        // Don't automatically refetch to prevent loops
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
  }, []);

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
    fetchDownloadJobs(lastParamsRef.current);
    fetchActiveDownloads();
  }, [fetchDownloadJobs, fetchActiveDownloads]);

  // FIXED: Only fetch on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const initializeFetch = async () => {
        await Promise.all([
          fetchDownloadJobs(initialParams || {}),
          fetchActiveDownloads()
        ]);
      };
      initializeFetch();
    }
  }, []); // Empty dependency array

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

// ==================== PROGRESS HOOK (FIXED) ====================

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

// ==================== STATISTICS HOOK (FIXED) ====================

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
  const hasInitializedRef = useRef(false);

  const fetchStatistics = useCallback(async () => {
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

  const checkTodayData = useCallback(async () => {
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

  const refetch = useCallback(() => {
    fetchStatistics();
    checkTodayData();
  }, [fetchStatistics, checkTodayData]);

  // FIXED: Only fetch on mount
  useEffect(() => {
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      const initializeFetch = async () => {
        await Promise.all([fetchStatistics(), checkTodayData()]);
      };
      initializeFetch();
    }
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

// ==================== DASHBOARD HOOK (FIXED) ====================

export interface UseNavDashboardReturn {
  bookmarks: SchemeBookmark[];
  statistics: NavStatistics | null;
  activeDownloads: DownloadProgress[];
  todayDataStatus: UseNavStatisticsReturn['todayDataStatus'];
  schedulerConfig: SchedulerConfig | null;
  schedulerStatus: SchedulerStatus | null;
  downloadStatus: { [bookmarkId: number]: any };
  isLoading: boolean;
  error: string | null;
  refetchAll: () => void;
}

export const useNavDashboard = (): UseNavDashboardReturn => {
  // FIXED: Use specific params and prevent auto-fetching
  const { 
    bookmarks, 
    isLoading: bookmarksLoading, 
    error: bookmarksError, 
    refetch: refetchBookmarks,
    downloadStatus
  } = useBookmarks({ page: 1, page_size: 10 });
  
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

  // FIXED: Debounced refetch to prevent excessive calls
  const lastRefetchRef = useRef<number>(0);
  const refetchAll = useCallback(() => {
    const now = Date.now();
    if (now - lastRefetchRef.current > 5000) { // 5 second cooldown
      lastRefetchRef.current = now;
      refetchBookmarks();
      refetchStats();
      fetchActiveDownloads();
      refetchScheduler();
    }
  }, [refetchBookmarks, refetchStats, fetchActiveDownloads, refetchScheduler]);

  return {
    bookmarks,
    statistics,
    activeDownloads,
    todayDataStatus,
    schedulerConfig,
    schedulerStatus,
    downloadStatus,
    isLoading,
    error,
    refetchAll,
  };
};