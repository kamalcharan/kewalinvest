// frontend/src/hooks/useBookmarkGaps.ts
// React hook for bookmark gap detection with caching and auto-refresh

import { useState, useEffect, useCallback, useRef } from 'react';
import { navService } from '../services/nav.service';
import { 
  BookmarkGapSummary, 
  UnbookmarkedScheme, 
  CustomerUnbookmarkedScheme,
  BookmarkGapAlert
} from '../types/nav.types';

interface UseBookmarkGapsResult {
  data: UnbookmarkedScheme[] | null;
  alert: BookmarkGapAlert | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseBookmarkGapSummaryResult {
  data: BookmarkGapSummary | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

interface UseCustomerBookmarkGapsResult {
  data: CustomerUnbookmarkedScheme[] | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Cache configuration
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

// Global cache storage
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const gapCache: Map<string, CacheEntry<any>> = new Map();

// Helper to check if cache is valid
const isCacheValid = (key: string): boolean => {
  const cached = gapCache.get(key);
  if (!cached) return false;
  
  const now = Date.now();
  return (now - cached.timestamp) < CACHE_DURATION;
};

// Helper to get from cache
const getFromCache = <T>(key: string): T | null => {
  if (!isCacheValid(key)) {
    gapCache.delete(key);
    return null;
  }
  return gapCache.get(key)?.data || null;
};

// Helper to set cache
const setCache = <T>(key: string, data: T): void => {
  gapCache.set(key, {
    data,
    timestamp: Date.now()
  });
};

// Helper to invalidate cache (call this when bookmarks change)
export const invalidateGapCache = (): void => {
  gapCache.clear();
};

/**
 * Hook to fetch all unbookmarked schemes with full gap alert data
 * Includes 5-minute caching
 */
export const useBookmarkGaps = (): UseBookmarkGapsResult => {
  const [data, setData] = useState<UnbookmarkedScheme[] | null>(null);
  const [alert, setAlert] = useState<BookmarkGapAlert | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const cacheKey = 'bookmark_gaps_all';

  const fetchData = useCallback(async () => {
    try {
      // Check cache first
      const cachedData = getFromCache<BookmarkGapAlert>(cacheKey);
      if (cachedData) {
        if (isMounted.current) {
          setData(cachedData.unbookmarked_schemes);
          setAlert(cachedData);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const response = await navService.getBookmarkGaps({
        page: 1,
        page_size: 1000 // Get all
      });

      if (response.success && response.data) {
        // response.data is UnbookmarkedScheme[], construct BookmarkGapAlert
        const schemes: UnbookmarkedScheme[] = response.data;
        
        // Construct a BookmarkGapAlert object from the schemes
        const gapAlert: BookmarkGapAlert = {
          alert_type: schemes.length > 10 ? 'critical' : 'warning',
          message: `${schemes.length} unbookmarked scheme(s) found`,
          unbookmarked_schemes: schemes,
          summary: {
            total_unbookmarked: schemes.length,
            total_customers_affected: schemes.reduce((sum, s) => sum + s.customer_count, 0),
            total_investment_at_risk: schemes.reduce((sum, s) => sum + s.total_invested, 0),
            schemes_not_in_master: schemes.filter(s => !s.exists_in_master).length,
            schemes_not_bookmarked: schemes.filter(s => s.exists_in_master).length,
            last_checked: new Date().toISOString()
          }
        };
        
        // Cache the result
        setCache(cacheKey, gapAlert);
        
        if (isMounted.current) {
          setData(gapAlert.unbookmarked_schemes);
          setAlert(gapAlert);
        }
      } else {
        if (isMounted.current) {
          setError(response.error || 'Failed to fetch gap data');
        }
      }
    } catch (err: any) {
      console.error('Error fetching bookmark gaps:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch gap data');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    alert,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook to fetch lightweight gap summary only
 * Best for dashboard widgets that don't need full data
 */
export const useBookmarkGapSummary = (): UseBookmarkGapSummaryResult => {
  const [data, setData] = useState<BookmarkGapSummary | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const cacheKey = 'bookmark_gaps_summary';

  const fetchData = useCallback(async () => {
    try {
      // Check cache first
      const cachedData = getFromCache<BookmarkGapSummary>(cacheKey);
      if (cachedData) {
        if (isMounted.current) {
          setData(cachedData);
          setLoading(false);
        }
        return;
      }

      setLoading(true);
      setError(null);

      const response = await navService.getBookmarkGapsSummary();

      if (response.success && response.data) {
        // Cache the result
        setCache(cacheKey, response.data);
        
        if (isMounted.current) {
          setData(response.data);
        }
      } else {
        if (isMounted.current) {
          setError(response.error || 'Failed to fetch summary');
        }
      }
    } catch (err: any) {
      console.error('Error fetching gap summary:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch summary');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      fetchData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchData]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook to fetch customer-specific unbookmarked schemes
 * Useful for customer detail pages
 */
export const useCustomerBookmarkGaps = (
  customerId: number | undefined
): UseCustomerBookmarkGapsResult => {
  const [data, setData] = useState<CustomerUnbookmarkedScheme[] | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  
  const isMounted = useRef(true);
  const cacheKey = customerId ? `bookmark_gaps_customer_${customerId}` : null;

  const fetchData = useCallback(async () => {
    if (!customerId) {
      if (isMounted.current) {
        setData(null);
        setLoading(false);
      }
      return;
    }

    try {
      // Check cache first
      if (cacheKey) {
        const cachedData = getFromCache<CustomerUnbookmarkedScheme[]>(cacheKey);
        if (cachedData) {
          if (isMounted.current) {
            setData(cachedData);
            setLoading(false);
          }
          return;
        }
      }

      setLoading(true);
      setError(null);

      const response = await navService.getCustomerBookmarkGaps(customerId);

      if (response.success && response.data) {
        // Cache the result
        if (cacheKey) {
          setCache(cacheKey, response.data);
        }
        
        if (isMounted.current) {
          setData(response.data);
        }
      } else {
        if (isMounted.current) {
          setError(response.error || 'Failed to fetch customer gaps');
        }
      }
    } catch (err: any) {
      console.error('Error fetching customer gaps:', err);
      if (isMounted.current) {
        setError(err.message || 'Failed to fetch customer gaps');
      }
    } finally {
      if (isMounted.current) {
        setLoading(false);
      }
    }
  }, [customerId, cacheKey]);

  useEffect(() => {
    isMounted.current = true;
    fetchData();

    return () => {
      isMounted.current = false;
    };
  }, [fetchData]);

  // Auto-refresh every 5 minutes
  useEffect(() => {
    if (!customerId) return;

    const interval = setInterval(() => {
      fetchData();
    }, CACHE_DURATION);

    return () => clearInterval(interval);
  }, [fetchData, customerId]);

  return {
    data,
    loading,
    error,
    refetch: fetchData
  };
};

/**
 * Hook to manage bookmark operations with automatic cache invalidation
 * Use this wrapper when adding/removing bookmarks to auto-refresh gaps
 */
export const useBookmarkOperations = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const addBookmark = async (schemeId: number, aliasName?: string) => {
    try {
      setLoading(true);
      setError(null);

      const response = await navService.createBookmark({
        scheme_id: schemeId,
        alias_name: aliasName
      });

      if (response.success) {
        // Invalidate cache to trigger refetch
        invalidateGapCache();
        return response.data;
      } else {
        setError(response.error || 'Failed to add bookmark');
        throw new Error(response.error || 'Failed to add bookmark');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const removeBookmark = async (bookmarkId: number) => {
    try {
      setLoading(true);
      setError(null);

      const response = await navService.deleteBookmark(bookmarkId);

      if (response.success) {
        // Invalidate cache to trigger refetch
        invalidateGapCache();
        return true;
      } else {
        setError(response.error || 'Failed to remove bookmark');
        throw new Error(response.error || 'Failed to remove bookmark');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const bulkBookmark = async (schemeCodes: string[]) => {
    try {
      setLoading(true);
      setError(null);

      const response = await navService.bulkBookmarkSchemes(schemeCodes);

      if (response.success) {
        // Invalidate cache to trigger refetch
        invalidateGapCache();
        return response.data;
      } else {
        setError(response.error || 'Failed to bulk bookmark');
        throw new Error(response.error || 'Failed to bulk bookmark');
      }
    } catch (err: any) {
      setError(err.message);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    addBookmark,
    removeBookmark,
    bulkBookmark,
    loading,
    error
  };
};

/**
 * Hook that combines gap data with automatic refresh on operations
 * Use this for components that both display gaps and allow bookmarking
 */
export const useBookmarkGapsWithOperations = () => {
  const gapsResult = useBookmarkGaps();
  const operations = useBookmarkOperations();

  // Refetch gaps after any operation completes
  const wrappedAddBookmark = async (schemeId: number, aliasName?: string) => {
    const result = await operations.addBookmark(schemeId, aliasName);
    await gapsResult.refetch();
    return result;
  };

  const wrappedRemoveBookmark = async (bookmarkId: number) => {
    const result = await operations.removeBookmark(bookmarkId);
    await gapsResult.refetch();
    return result;
  };

  const wrappedBulkBookmark = async (schemeCodes: string[]) => {
    const result = await operations.bulkBookmark(schemeCodes);
    await gapsResult.refetch();
    return result;
  };

  return {
    ...gapsResult,
    addBookmark: wrappedAddBookmark,
    removeBookmark: wrappedRemoveBookmark,
    bulkBookmark: wrappedBulkBookmark,
    operationLoading: operations.loading,
    operationError: operations.error
  };
};

// Export cache utilities for external use
export const bookmarkGapCacheUtils = {
  invalidate: invalidateGapCache,
  isValid: isCacheValid,
  clear: () => gapCache.clear(),
  getAll: () => Array.from(gapCache.entries())
};