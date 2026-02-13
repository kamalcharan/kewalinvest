// frontend/src/constants/assetTypes.ts
// Centralized asset type constants for consistent styling across the application
// NOTE: These should match asset types configured in m_asset_types database table
// UPDATED: Now supports all scheme categories (50+ types from Scheme Category column)

/**
 * Non-MF asset type codes (manual assets, not from scheme import)
 * These are tracked separately and not based on NAV
 */
export const NON_SCHEME_ASSET_TYPES = [
  'GOLD', 'SILVER', 'EQUITY', 'FD', 'PPF', 'EPF', 'NPS',
  'REAL_ESTATE', 'INSURANCE', 'NSC', 'BONDS', 'OTHER'
];

/**
 * Scheme category prefixes for grouping colors
 */
const _CATEGORY_PREFIXES = {
  EQUITY: 'Equity Scheme',
  DEBT: 'Debt Scheme',
  HYBRID: 'Hybrid Scheme',
  OTHER_SCHEME: 'Other Scheme',
  SOLUTION: 'Solution Oriented'
};

/**
 * Category-based colors for scheme types
 * Used when specific color not defined
 */
const CATEGORY_COLORS: Record<string, string> = {
  equity: '#10B981',    // Emerald - Equity schemes
  debt: '#3B82F6',      // Blue - Debt schemes
  hybrid: '#8B5CF6',    // Violet - Hybrid schemes
  fof: '#F59E0B',       // Amber - Fund of Funds
  solution: '#EC4899',  // Pink - Solution Oriented
  commodity: '#F97316', // Orange - Commodity (Gold ETF)
  fixed_income: '#14B8A6', // Teal - Fixed Income
  pension: '#6366F1',   // Indigo - Pension
  real_estate: '#EF4444', // Red - Real Estate
  insurance: '#06B6D4', // Cyan - Insurance
  default: '#6B7280'    // Gray - Default
};

/**
 * Asset Type Color Palette
 * Specific colors for known asset types; others derive from category
 */
export const ASSET_TYPE_COLORS: Record<string, string> = {
  // Legacy scheme types (backward compatibility)
  'Open Ended': '#4F46E5',
  'Close Ended': '#7C3AED',
  'Interval Fund': '#A855F7',

  // Legacy categories
  'Assured Return': '#6366F1',
  'Balanced': '#8B5CF6',
  'ELSS': '#10B981',
  'Gilt': '#3B82F6',
  'Growth': '#10B981',
  'Income': '#3B82F6',
  'Liquid': '#06B6D4',
  'Money Market': '#14B8A6',

  // Equity Scheme - shades of green
  'Equity Scheme - Large Cap Fund': '#059669',
  'Equity Scheme - Mid Cap Fund': '#10B981',
  'Equity Scheme - Small Cap Fund': '#34D399',
  'Equity Scheme - Multi Cap Fund': '#6EE7B7',
  'Equity Scheme - Flexi Cap Fund': '#047857',
  'Equity Scheme - Large & Mid Cap Fund': '#0D9488',
  'Equity Scheme - ELSS': '#22C55E',
  'Equity Scheme - Sectoral/ Thematic': '#84CC16',
  'Equity Scheme - Value Fund': '#16A34A',
  'Equity Scheme - Contra Fund': '#15803D',
  'Equity Scheme - Dividend Yield Fund': '#166534',
  'Equity Scheme - Focused Fund': '#14532D',

  // Debt Scheme - shades of blue
  'Debt Scheme - Liquid Fund': '#0EA5E9',
  'Debt Scheme - Overnight Fund': '#38BDF8',
  'Debt Scheme - Ultra Short Duration Fund': '#7DD3FC',
  'Debt Scheme - Low Duration Fund': '#06B6D4',
  'Debt Scheme - Short Duration Fund': '#22D3EE',
  'Debt Scheme - Medium Duration Fund': '#67E8F9',
  'Debt Scheme - Medium to Long Duration Fund': '#3B82F6',
  'Debt Scheme - Long Duration Fund': '#2563EB',
  'Debt Scheme - Dynamic Bond': '#1D4ED8',
  'Debt Scheme - Corporate Bond Fund': '#1E40AF',
  'Debt Scheme - Credit Risk Fund': '#1E3A8A',
  'Debt Scheme - Banking and PSU Fund': '#0284C7',
  'Debt Scheme - Gilt Fund': '#0369A1',
  'Debt Scheme - Gilt Fund with 10 year constant duration': '#075985',
  'Debt Scheme - Floater Fund': '#0C4A6E',
  'Debt Scheme - Money Market Fund': '#164E63',

  // Hybrid Scheme - shades of purple
  'Hybrid Scheme - Aggressive Hybrid Fund': '#7C3AED',
  'Hybrid Scheme - Balanced Hybrid Fund': '#8B5CF6',
  'Hybrid Scheme - Conservative Hybrid Fund': '#A78BFA',
  'Hybrid Scheme - Dynamic Asset Allocation or Balanced Advantage': '#6D28D9',
  'Hybrid Scheme - Multi Asset Allocation': '#5B21B6',
  'Hybrid Scheme - Arbitrage Fund': '#4C1D95',
  'Hybrid Scheme - Equity Savings': '#C4B5FD',

  // Other Scheme - shades of amber/orange
  'Other Scheme - Index Funds': '#F59E0B',
  'Other Scheme - Gold ETF': '#D97706',
  'Other Scheme - Other  ETFs': '#B45309',
  'Other Scheme - FoF Domestic': '#92400E',
  'Other Scheme - FoF Overseas': '#78350F',

  // Solution Oriented - shades of pink
  'Solution Oriented Scheme - Children s Fund': '#EC4899',
  'Solution Oriented Scheme - Retirement Fund': '#DB2777',

  // Non-MF asset types
  EQUITY: '#059669',
  GOLD: '#D97706',
  SILVER: '#6B7280',
  FD: '#0EA5E9',
  PPF: '#EC4899',
  EPF: '#14B8A6',
  NPS: '#6366F1',
  REAL_ESTATE: '#EF4444',
  INSURANCE: '#06B6D4',
  NSC: '#84CC16',
  BONDS: '#F43F5E',
  OTHER: '#9CA3AF'
};

/**
 * Asset Type Icons (emoji-based)
 */
export const ASSET_TYPE_ICONS: Record<string, string> = {
  // Legacy scheme types
  'Open Ended': '📊',
  'Close Ended': '📅',
  'Interval Fund': '⏰',
  // Legacy categories
  'ELSS': '🏛️',
  'Gilt': '📜',
  'Growth': '📈',
  'Income': '💵',
  'Liquid': '💧',
  // Equity schemes
  'Equity Scheme - Large Cap Fund': '🏢',
  'Equity Scheme - Mid Cap Fund': '🏬',
  'Equity Scheme - Small Cap Fund': '🏪',
  'Equity Scheme - ELSS': '🏛️',
  'Equity Scheme - Sectoral/ Thematic': '🎯',
  // Debt schemes
  'Debt Scheme - Liquid Fund': '💧',
  'Debt Scheme - Gilt Fund': '📜',
  'Debt Scheme - Corporate Bond Fund': '🏢',
  // Hybrid schemes
  'Hybrid Scheme - Aggressive Hybrid Fund': '⚡',
  'Hybrid Scheme - Balanced Hybrid Fund': '⚖️',
  // Other schemes
  'Other Scheme - Index Funds': '📊',
  'Other Scheme - Gold ETF': '🪙',
  // Solution schemes
  'Solution Oriented Scheme - Children s Fund': '👶',
  'Solution Oriented Scheme - Retirement Fund': '🎯',
  // Non-MF asset types
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
 * Asset Type Display Names (fallback only - prefer API data)
 */
export const ASSET_TYPE_NAMES: Record<string, string> = {
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
 * Check if an asset type code is a scheme category (MF-based)
 * Returns true for all scheme categories from Scheme Category column
 * Returns false for manual assets (GOLD, FD, etc.)
 */
export function isSchemeAssetType(assetTypeCode: string): boolean {
  // If it's a known non-scheme asset type, return false
  if (NON_SCHEME_ASSET_TYPES.includes(assetTypeCode)) {
    return false;
  }
  // Everything else is assumed to be a scheme category
  return true;
}

/**
 * Get color for an asset type code
 * Uses specific color if defined, otherwise derives from category prefix
 */
export function getAssetTypeColor(assetTypeCode: string): string {
  // Check for specific color
  if (ASSET_TYPE_COLORS[assetTypeCode]) {
    return ASSET_TYPE_COLORS[assetTypeCode];
  }

  // Derive from category prefix
  if (assetTypeCode.startsWith('Equity Scheme')) return CATEGORY_COLORS.equity;
  if (assetTypeCode.startsWith('Debt Scheme')) return CATEGORY_COLORS.debt;
  if (assetTypeCode.startsWith('Hybrid Scheme')) return CATEGORY_COLORS.hybrid;
  if (assetTypeCode.startsWith('Other Scheme')) return CATEGORY_COLORS.fof;
  if (assetTypeCode.startsWith('Solution Oriented')) return CATEGORY_COLORS.solution;

  return CATEGORY_COLORS.default;
}

/**
 * Get icon for an asset type code
 * Falls back to category-based icon if specific not defined
 */
export function getAssetTypeIcon(assetTypeCode: string): string {
  if (ASSET_TYPE_ICONS[assetTypeCode]) {
    return ASSET_TYPE_ICONS[assetTypeCode];
  }

  // Derive from category prefix
  if (assetTypeCode.startsWith('Equity Scheme')) return '📈';
  if (assetTypeCode.startsWith('Debt Scheme')) return '💵';
  if (assetTypeCode.startsWith('Hybrid Scheme')) return '⚖️';
  if (assetTypeCode.startsWith('Other Scheme')) return '📊';
  if (assetTypeCode.startsWith('Solution Oriented')) return '🎯';

  return '💰';
}

/**
 * Get display name for an asset type code
 * Falls back to the code itself if not found
 */
export function getAssetTypeName(assetTypeCode: string): string {
  return ASSET_TYPE_NAMES[assetTypeCode] || assetTypeCode;
}

/**
 * Get category color for charts (used when grouping by category)
 */
export function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.default;
}
