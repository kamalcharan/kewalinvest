// frontend/src/constants/assetTypes.ts
// Centralized asset type constants for consistent styling across the application

/**
 * Asset Type Color Palette
 * Each asset type has a unique, distinguishable color for charts and visualizations
 */
export const ASSET_TYPE_COLORS: Record<string, string> = {
  MF: '#4F46E5',      // Indigo - Mutual Funds
  EQUITY: '#10B981',  // Emerald - Direct Equity
  GOLD: '#F59E0B',    // Amber - Gold
  SILVER: '#6B7280',  // Gray - Silver
  RE: '#8B5CF6',      // Violet - Real Estate
  FD: '#3B82F6',      // Blue - Fixed Deposits
  PPF: '#EC4899',     // Pink - PPF
  NSC: '#14B8A6',     // Teal - NSC
  BONDS: '#F97316',   // Orange - Bonds
  OTHER: '#9CA3AF'    // Slate Gray - Other/Unknown
};

/**
 * Asset Type Icons (emoji-based)
 */
export const ASSET_TYPE_ICONS: Record<string, string> = {
  MF: '📊',
  EQUITY: '📈',
  GOLD: '🪙',
  SILVER: '🥈',
  RE: '🏠',
  FD: '🏦',
  PPF: '🏛️',
  NSC: '📜',
  BONDS: '📄',
  OTHER: '💰'
};

/**
 * Asset Type Display Names
 */
export const ASSET_TYPE_NAMES: Record<string, string> = {
  MF: 'Mutual Funds',
  EQUITY: 'Direct Equity',
  GOLD: 'Gold',
  SILVER: 'Silver',
  RE: 'Real Estate',
  FD: 'Fixed Deposits',
  PPF: 'PPF',
  NSC: 'NSC',
  BONDS: 'Bonds',
  OTHER: 'Other'
};

/**
 * Get color for an asset type code
 * Falls back to OTHER color if code is not found
 */
export function getAssetTypeColor(assetTypeCode: string): string {
  return ASSET_TYPE_COLORS[assetTypeCode] || ASSET_TYPE_COLORS.OTHER;
}

/**
 * Get icon for an asset type code
 * Falls back to OTHER icon if code is not found
 */
export function getAssetTypeIcon(assetTypeCode: string): string {
  return ASSET_TYPE_ICONS[assetTypeCode] || ASSET_TYPE_ICONS.OTHER;
}

/**
 * Get display name for an asset type code
 * Falls back to the code itself if not found
 */
export function getAssetTypeName(assetTypeCode: string): string {
  return ASSET_TYPE_NAMES[assetTypeCode] || assetTypeCode;
}
