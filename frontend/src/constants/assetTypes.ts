// frontend/src/constants/assetTypes.ts
// Centralized asset type constants for consistent styling across the application
// NOTE: These should match asset types configured in m_asset_types database table
// UPDATED: Replaced 'MF' with scheme-based types (Open Ended, Close Ended, Interval Fund)

/**
 * Scheme-based asset types (replaces single 'MF' type)
 * These are the 3 scheme types from the Scheme Data import
 */
export const SCHEME_ASSET_TYPES = ['Open Ended', 'Close Ended', 'Interval Fund'];

/**
 * Asset Type Color Palette
 * Each asset type has a unique, distinguishable color for charts and visualizations
 * Matches DB m_asset_types table codes
 */
export const ASSET_TYPE_COLORS: Record<string, string> = {
  // Scheme-based asset types (replaces MF)
  'Open Ended': '#4F46E5',      // Indigo - Open-ended mutual funds
  'Close Ended': '#7C3AED',     // Violet - Close-ended mutual funds (FMPs)
  'Interval Fund': '#A855F7',   // Purple - Interval funds
  // Other asset types (from DB m_asset_types)
  EQUITY: '#10B981',            // Emerald - Direct Equity
  GOLD: '#F59E0B',              // Amber - Gold
  SILVER: '#6B7280',            // Gray - Silver
  FD: '#3B82F6',                // Blue - Fixed Deposit
  PPF: '#EC4899',               // Pink - Public Provident Fund
  EPF: '#14B8A6',               // Teal - Employee Provident Fund
  NPS: '#8B5CF6',               // Violet - National Pension System
  REAL_ESTATE: '#F97316',       // Orange - Real Estate
  INSURANCE: '#06B6D4',         // Cyan - Insurance
  // Additional asset types (for future DB additions)
  NSC: '#84CC16',               // Lime - National Savings Certificate
  BONDS: '#EF4444',             // Red - Bonds
  OTHER: '#9CA3AF'              // Slate Gray - Other/Unknown (fallback)
};

/**
 * Asset Type Icons (emoji-based)
 * Matches DB m_asset_types table codes
 */
export const ASSET_TYPE_ICONS: Record<string, string> = {
  // Scheme-based asset types (replaces MF)
  'Open Ended': '📊',
  'Close Ended': '📅',
  'Interval Fund': '⏰',
  // Other asset types
  EQUITY: '📈',
  GOLD: '🪙',
  SILVER: '🥈',
  FD: '🏦',
  PPF: '🏛️',
  EPF: '💼',
  NPS: '🎯',
  REAL_ESTATE: '🏠',
  INSURANCE: '🛡️',
  NSC: '📜',
  BONDS: '📄',
  OTHER: '💰'
};

/**
 * Asset Type Display Names
 * NOTE: Display names should come from API (asset_type_name from DB)
 * This is only used as fallback when API data is not available
 */
export const ASSET_TYPE_NAMES: Record<string, string> = {
  // Scheme-based asset types (replaces MF)
  'Open Ended': 'Open Ended',
  'Close Ended': 'Close Ended',
  'Interval Fund': 'Interval Fund',
  // Other asset types
  EQUITY: 'Equity',
  GOLD: 'Gold',
  SILVER: 'Silver',
  FD: 'Fixed Deposit',
  PPF: 'Public Provident Fund',
  EPF: 'Employee Provident Fund',
  NPS: 'National Pension System',
  REAL_ESTATE: 'Real Estate',
  INSURANCE: 'Insurance',
  NSC: 'National Savings Certificate',
  BONDS: 'Bonds',
  OTHER: 'Other'
};

/**
 * Check if an asset type code is scheme-based
 */
export function isSchemeAssetType(assetTypeCode: string): boolean {
  return SCHEME_ASSET_TYPES.includes(assetTypeCode);
}

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
