// frontend/src/pages/market/MarketAnalysisDashboard.tsx
// Market Analysis Dashboard with Bulk Operations Support

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  TrendingDown,
  Activity,
  BarChart3,
  Calendar,
  Download,
  Calculator,
  CheckSquare,
  Square,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useDashboardStatistics } from '../../hooks/useMarketMetrics';
import { useMarketIndices } from '../../hooks/useMarketData';
import { MarketIndex } from '../../types/market.types';
import { BulkDownloadModal } from '../../components/market/BulkDownloadModal';
import { BulkMetricsModal } from '../../components/market/BulkMetricsModal';

type TimePeriod = '1m' | '3m' | '6m' | '1y';

// Card component - Simple replacement for non-existent Card component
const Card: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) => (
  <div className={`bg-white rounded-lg shadow-md p-6 ${className}`}>
    {children}
  </div>
);

export const MarketAnalysisDashboard: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // State management
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('1y');
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());
  const [showBulkDownloadModal, setShowBulkDownloadModal] = useState(false);
  const [showBulkMetricsModal, setShowBulkMetricsModal] = useState(false);

  // Data fetching
  const { data: stats, isLoading: statsLoading } = useDashboardStatistics(timePeriod);
  const { 
    indices, 
    isLoading: indicesLoading, 
    refetch: refetchIndices 
  } = useMarketIndices({
    page: 1,
    page_size: 100
  });

  // ==================== SELECTION HANDLERS ====================
  
  const handleSelectAll = () => {
    if (selectedIndices.size === indices.length) {
      setSelectedIndices(new Set());
    } else {
      setSelectedIndices(new Set(indices.map(idx => idx.id)));
    }
  };

  const handleSelectIndex = (indexId: number) => {
    const newSelected = new Set(selectedIndices);
    if (newSelected.has(indexId)) {
      newSelected.delete(indexId);
    } else {
      newSelected.add(indexId);
    }
    setSelectedIndices(newSelected);
  };

  const getSelectedIndicesData = (): MarketIndex[] => {
    return indices.filter(idx => selectedIndices.has(idx.id));
  };

  // ==================== BULK OPERATIONS ====================
  
  const handleBulkDownload = () => {
    const selected = getSelectedIndicesData();
    if (selected.length === 0) return;
    
    // Validate that selected indices have providers enabled
    const enabledCount = selected.filter(idx => idx.provider_enabled).length;
    if (enabledCount === 0) {
      alert('None of the selected indices have data providers configured and enabled.');
      return;
    }
    
    setShowBulkDownloadModal(true);
  };

  const handleBulkCalculate = () => {
    const selected = getSelectedIndicesData();
    if (selected.length === 0) return;
    
    // Validate that selected indices have data
    const withDataCount = selected.filter(idx => idx.historical_data_available).length;
    if (withDataCount === 0) {
      alert('None of the selected indices have historical data. Please download data first.');
      return;
    }
    
    setShowBulkMetricsModal(true);
  };

  const handleBulkOperationSuccess = () => {
    refetchIndices();
    setSelectedIndices(new Set());
  };

  // ==================== UTILITY FUNCTIONS ====================
  
  const formatNumber = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return '--';
    const sign = value >= 0 ? '+' : '';
    return `${sign}${value.toFixed(2)}%`;
  };

  const getColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'text-gray-500';
    return value >= 0 ? 'text-green-600' : 'text-red-600';
  };

  const getBgColor = (value: number | null | undefined): string => {
    if (value === null || value === undefined) return 'bg-gray-50';
    return value >= 0 ? 'bg-green-50' : 'bg-red-50';
  };

  // ==================== RENDER GUARDS ====================
  
  if (!user) {
    return null;
  }

  const isAllSelected = indices.length > 0 && selectedIndices.size === indices.length;
  const selectedCount = selectedIndices.size;

  // ==================== MAIN RENDER ====================
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* ==================== HEADER ==================== */}
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              📊 Market Analysis Dashboard
            </h1>
            <p className="text-gray-600 mt-1">
              Track performance and volatility across {stats?.total_indices_analyzed || 0} NSE indices
            </p>
          </div>
          
          {/* Time Period Selector */}
          <div className="flex items-center gap-2 bg-white rounded-lg border border-gray-200 p-1 shadow-sm">
            {(['1m', '3m', '6m', '1y'] as const).map((period) => (
              <button
                key={period}
                onClick={() => setTimePeriod(period)}
                className={`px-4 py-2 rounded-md text-sm font-medium transition-all ${
                  timePeriod === period
                    ? 'bg-blue-600 text-white shadow-sm'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {period === '1m' && '1 Month'}
                {period === '3m' && '3 Months'}
                {period === '6m' && '6 Months'}
                {period === '1y' && '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* ==================== BULK ACTIONS BAR ==================== */}
        {indices.length > 0 && (
          <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border-blue-200">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div className="flex items-center gap-4">
                <button
                  onClick={handleSelectAll}
                  className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors"
                >
                  {isAllSelected ? (
                    <CheckSquare className="w-5 h-5 text-blue-600" />
                  ) : (
                    <Square className="w-5 h-5 text-gray-400" />
                  )}
                  Select All
                </button>
                
                {selectedCount > 0 && (
                  <span className="text-sm font-medium text-blue-700 bg-blue-100 px-3 py-1 rounded-full">
                    {selectedCount} {selectedCount === 1 ? 'index' : 'indices'} selected
                  </span>
                )}
              </div>

              {selectedCount > 0 && (
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    onClick={handleBulkDownload}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <Download className="w-4 h-4" />
                    Bulk Download ({selectedCount})
                  </button>
                  <button
                    onClick={handleBulkCalculate}
                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-all text-sm font-medium shadow-md hover:shadow-lg"
                  >
                    <Calculator className="w-4 h-4" />
                    Bulk Calculate ({selectedCount})
                  </button>
                </div>
              )}
            </div>
          </Card>
        )}

        {/* ==================== MARKET OVERVIEW CARDS ==================== */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          
          {/* Best Performer */}
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Best Performer
              </h3>
              <TrendingUp className="w-5 h-5 text-green-600" />
            </div>
            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ) : stats?.best_performer ? (
              <>
                <p className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {stats.best_performer.index_name}
                </p>
                <p className={`text-2xl font-bold mb-2 ${getColor(stats.best_performer.return_value)}`}>
                  {formatNumber(stats.best_performer.return_value)}
                </p>
                <button
                  onClick={() => navigate(`/market/indices/${stats.best_performer?.index_id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  View Details →
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </Card>

          {/* Most Volatile */}
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Most Volatile
              </h3>
              <Activity className="w-5 h-5 text-orange-600" />
            </div>
            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-6 bg-gray-200 rounded w-3/4" />
                <div className="h-8 bg-gray-200 rounded w-1/2" />
              </div>
            ) : stats?.most_volatile ? (
              <>
                <p className="text-lg font-semibold text-gray-900 mb-1 truncate">
                  {stats.most_volatile.index_name}
                </p>
                <p className="text-2xl font-bold text-orange-600 mb-2">
                  {stats.most_volatile.volatility_value?.toFixed(2)}%
                </p>
                <button
                  onClick={() => navigate(`/market/indices/${stats.most_volatile?.index_id}`)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium hover:underline"
                >
                  View Details →
                </button>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </Card>

          {/* Market Breadth */}
          <Card className="hover:shadow-lg transition-shadow">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-gray-600 uppercase tracking-wide">
                Market Breadth
              </h3>
              <BarChart3 className="w-5 h-5 text-blue-600" />
            </div>
            {statsLoading ? (
              <div className="animate-pulse space-y-3">
                <div className="h-8 bg-gray-200 rounded w-1/2" />
                <div className="h-4 bg-gray-200 rounded w-3/4" />
              </div>
            ) : stats ? (
              <>
                <p className="text-2xl font-bold text-gray-900 mb-3">
                  {stats.market_breadth?.toFixed(0)}%
                </p>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-green-600 font-medium flex items-center gap-1">
                    <TrendingUp className="w-4 h-4" />
                    {stats.indices_up} Up
                  </span>
                  <span className="text-red-600 font-medium flex items-center gap-1">
                    <TrendingDown className="w-4 h-4" />
                    {stats.indices_down} Down
                  </span>
                </div>
                <div className="mt-3 text-xs text-gray-500">
                  Out of {stats.total_indices_analyzed} indices
                </div>
              </>
            ) : (
              <p className="text-gray-500 text-sm">No data available</p>
            )}
          </Card>
        </div>

        {/* ==================== PERFORMANCE HEATMAP ==================== */}
        <Card>
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Performance Heatmap
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                {timePeriod.toUpperCase()} returns across all indices
              </p>
            </div>
            <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1 rounded-full">
              {stats?.total_indices_analyzed || 0} indices
            </span>
          </div>

          {statsLoading || indicesLoading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {[...Array(15)].map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="h-24 bg-gray-200 rounded-lg" />
                </div>
              ))}
            </div>
          ) : stats?.heatmap && stats.heatmap.length > 0 ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              {stats.heatmap.map((index) => {
                const isSelected = selectedIndices.has(index.index_id);
                const hasData = index.return_value !== null && index.return_value !== undefined;
                
                return (
                  <div key={index.index_id} className="relative group">
                    {/* Selection Checkbox */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectIndex(index.index_id);
                      }}
                      className="absolute top-2 left-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
                      title={isSelected ? 'Deselect' : 'Select'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-5 h-5 text-blue-600" />
                      ) : (
                        <Square className="w-5 h-5 text-gray-400 hover:text-gray-600" />
                      )}
                    </button>

                    {/* Index Card */}
                    <button
                      onClick={() => navigate(`/market/indices/${index.index_id}`)}
                      className={`w-full p-4 rounded-lg border-2 transition-all hover:shadow-md ${
                        isSelected
                          ? 'border-blue-500 bg-blue-50'
                          : 'border-gray-200 hover:border-blue-300'
                      } ${hasData ? getBgColor(index.return_value) : 'bg-gray-50'}`}
                    >
                      <p className="text-xs font-semibold text-gray-900 mb-2 truncate text-left">
                        {index.index_code}
                      </p>
                      <p className={`text-lg font-bold ${hasData ? getColor(index.return_value) : 'text-gray-400'}`}>
                        {formatNumber(index.return_value)}
                      </p>
                      {index.volatility_value !== null && (
                        <p className="text-xs text-gray-600 mt-1 text-left">
                          Vol: {index.volatility_value.toFixed(2)}%
                        </p>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-3" />
              <p className="text-gray-600 font-medium">No heatmap data available</p>
              <p className="text-sm text-gray-500 mt-1">
                Metrics may need to be calculated for indices
              </p>
            </div>
          )}
        </Card>

        {/* ==================== QUICK LINKS ==================== */}
        {/* TODO: Uncomment when these pages are created
        <Card>
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <button
              onClick={() => navigate('/market/download')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <Download className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-gray-900">Download Data</p>
              <p className="text-sm text-gray-600 mt-1">Manage historical data downloads</p>
            </button>

            <button
              onClick={() => navigate('/market/indices')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <BarChart3 className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-gray-900">All Indices</p>
              <p className="text-sm text-gray-600 mt-1">Browse all market indices</p>
            </button>

            <button
              onClick={() => navigate('/market/reports')}
              className="p-4 border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all text-left group"
            >
              <Calendar className="w-5 h-5 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <p className="font-semibold text-gray-900">Reports</p>
              <p className="text-sm text-gray-600 mt-1">Generate analysis reports</p>
            </button>
          </div>
        </Card>
        */}

        {/* ==================== INFO BANNER ==================== */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div className="text-sm text-blue-900">
              <p className="font-semibold mb-1">💡 Getting Started</p>
              <p className="text-blue-800">
                Click on any index tile to view detailed analysis. Use the "Calculate" button on the index detail page to compute metrics for the first time. Daily calculations will run automatically at 11:00 PM.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ==================== BULK OPERATION MODALS ==================== */}
      <BulkDownloadModal
        isOpen={showBulkDownloadModal}
        onClose={() => setShowBulkDownloadModal(false)}
        selectedIndices={getSelectedIndicesData()}
        onSuccess={handleBulkOperationSuccess}
      />

      <BulkMetricsModal
        isOpen={showBulkMetricsModal}
        onClose={() => setShowBulkMetricsModal(false)}
        selectedIndices={getSelectedIndicesData()}
        onSuccess={handleBulkOperationSuccess}
      />
    </div>
  );
};

export default MarketAnalysisDashboard;