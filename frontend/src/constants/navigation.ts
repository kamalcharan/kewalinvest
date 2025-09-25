// frontend/src/constants/navigation.ts
import { 
  Home, 
  Users, 
  Crown,
  TrendingUp,
  PieChart,
  BarChart3,
  FileText,
  Settings,
  Database,
  Briefcase,
  Upload,
  FileSpreadsheet,
  Bug  // Add this import
} from 'lucide-react';

export interface NavigationItem {
  id: string;
  name: string;
  path: string;
  icon: any;
  badge?: string | number;
  children?: NavigationItem[];
}

export interface NavigationSection {
  id: string;
  name: string;
  items: NavigationItem[];
}

export const NAVIGATION_MENU: NavigationSection[] = [
  {
    id: 'main',
    name: 'Main',
    items: [
      {
        id: 'dashboard',
        name: 'Dashboard',
        path: '/dashboard',
        icon: Home
      }
    ]
  },
  {
    id: 'contacts',
    name: 'Contacts',
    items: [
      {
        id: 'contacts',
        name: 'Contacts',
        path: '/contacts',
        icon: Users
      },
      {
        id: 'customers',
        name: 'Customers',
        path: '/customers',
        icon: Crown
      }
    ]
  },
  {
  id: 'data_operations',
  name: 'Data Operations',
  items: [
    {
      id: 'etl_dashboard',
      name: 'ETL Dashboard',
      path: '/import-dashboard',
      icon: FileSpreadsheet
    },
    {
      id: 'data_import',
      name: 'Import Data',
      path: '/data-import',
      icon: Upload
    },
    
  ]
},
  {
    id: 'portfolio_management',
    name: 'Portfolio Management',
    items: [
      {
        id: 'portfolio_contacts',
        name: 'Contacts',
        path: '/portfolio/contacts',
        icon: Users
      },
      {
        id: 'portfolio_customers',
        name: 'Customers',
        path: '/portfolio/customers',
        icon: Crown
      },
      {
        id: 'portfolios',
        name: 'Portfolios',
        path: '/portfolios',
        icon: TrendingUp
      },
      {
        id: 'portfolio_analysis',
        name: 'Portfolio Analysis',
        path: '/portfolios/analysis',
        icon: PieChart
      },
      {
        id: 'market_data',
        name: 'Market Data',
        path: '/market-data',
        icon: BarChart3
      }
    ]
  },
  {
    id: 'reports',
    name: 'Reports & Analytics',
    items: [
      {
        id: 'reports',
        name: 'Reports',
        path: '/reports',
        icon: FileText
      },
      {
        id: 'analytics',
        name: 'Analytics',
        path: '/analytics',
        icon: BarChart3
      }
    ]
  },
  {
    id: 'system',
    name: 'System',
    items: [
      {
        id: 'settings',
        name: 'Settings',
        path: '/settings',
        icon: Settings
      },
      {  // ADD THIS ITEM
        id: 'system_logs',
        name: 'System Logs',
        path: '/admin/logs',
        icon: Bug
      }
    ]
  }
];

// Quick access items for mobile or compact view
export const QUICK_ACCESS_ITEMS: NavigationItem[] = [
  {
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home
  },
  {
    id: 'contacts',
    name: 'Contacts',
    path: '/contacts',
    icon: Users
  },
  {
    id: 'customers',
    name: 'Customers',
    path: '/customers',
    icon: Crown
  },
  {
    id: 'etl_upload',
    name: 'Import Data',
    path: '/etl/upload',
    icon: Upload
  },
  {
    id: 'portfolios',
    name: 'Portfolios',
    path: '/portfolios',
    icon: TrendingUp
  }
];

// Navigation utility functions
export const findNavigationItem = (path: string): NavigationItem | null => {
  for (const section of NAVIGATION_MENU) {
    for (const item of section.items) {
      if (item.path === path) return item;
      if (item.children) {
        const found = item.children.find(child => child.path === path);
        if (found) return found;
      }
    }
  }
  return null;
};

export const isActiveRoute = (currentPath: string, itemPath: string): boolean => {
  if (itemPath === '/dashboard') {
    return currentPath === '/dashboard';
  }
  
  // Handle ETL routes
  if (itemPath === '/etl') {
    return currentPath === '/etl' || (currentPath.startsWith('/etl') && !currentPath.startsWith('/etl/upload'));
  }
  
  if (itemPath === '/etl/upload') {
    return currentPath === '/etl/upload';
  }
  
  // Handle portfolio sub-routes
  if (itemPath === '/portfolio/contacts') {
    return currentPath === '/portfolio/contacts';
  }
  
  if (itemPath === '/portfolio/customers') {
    return currentPath === '/portfolio/customers';
  }
  
  // For customers route, make sure it's exact match or starts with /customers/
  if (itemPath === '/customers') {
    return currentPath === '/customers' || currentPath.startsWith('/customers/');
  }
  
  // For contacts route, make sure it's exact match or starts with /contacts/
  if (itemPath === '/contacts') {
    return currentPath === '/contacts' || currentPath.startsWith('/contacts/');
  }

  // Handle admin/logs route  // ADD THIS
  if (itemPath === '/admin/logs') {
    return currentPath === '/admin/logs';
  }
  
  return currentPath.startsWith(itemPath);
};

export const getBreadcrumbs = (currentPath: string): NavigationItem[] => {
  const breadcrumbs: NavigationItem[] = [];
  
  // Always start with Dashboard
  breadcrumbs.push({
    id: 'dashboard',
    name: 'Dashboard',
    path: '/dashboard',
    icon: Home
  });
  
  // Handle ETL routes
  if (currentPath.startsWith('/etl')) {
    breadcrumbs.push({
      id: 'etl_dashboard',
      name: 'ETL Dashboard',
      path: '/etl',
      icon: FileSpreadsheet
    });
    
    if (currentPath === '/etl/upload') {
      breadcrumbs.push({
        id: 'etl_upload',
        name: 'Import Data',
        path: '/etl/upload',
        icon: Upload
      });
    }
  } 
  // Handle admin routes  // ADD THIS BLOCK
  else if (currentPath.startsWith('/admin/')) {
    if (currentPath === '/admin/logs') {
      breadcrumbs.push({
        id: 'system_logs',
        name: 'System Logs',
        path: '/admin/logs',
        icon: Bug
      });
    }
  }
  // Handle portfolio routes
  else if (currentPath.startsWith('/portfolio/')) {
    breadcrumbs.push({
      id: 'portfolio_management',
      name: 'Portfolio Management',
      path: '/portfolio',
      icon: Briefcase
    });
    
    if (currentPath === '/portfolio/contacts') {
      breadcrumbs.push({
        id: 'portfolio_contacts',
        name: 'Contacts',
        path: '/portfolio/contacts',
        icon: Users
      });
    } else if (currentPath === '/portfolio/customers') {
      breadcrumbs.push({
        id: 'portfolio_customers',
        name: 'Customers',
        path: '/portfolio/customers',
        icon: Crown
      });
    }
  } 
  // Handle contact routes
  else if (currentPath.startsWith('/contacts/')) {
    breadcrumbs.push({
      id: 'contacts',
      name: 'Contacts',
      path: '/contacts',
      icon: Users
    });
    
    if (currentPath === '/contacts/new') {
      breadcrumbs.push({
        id: 'new_contact',
        name: 'New Contact',
        path: '/contacts/new',
        icon: Users
      });
    }
  } 
  // Handle customer routes
  else if (currentPath.startsWith('/customers/')) {
    breadcrumbs.push({
      id: 'customers',
      name: 'Customers',
      path: '/customers',
      icon: Crown
    });
    
    if (currentPath === '/customers/new') {
      breadcrumbs.push({
        id: 'new_customer',
        name: 'New Customer',
        path: '/customers/new',
        icon: Crown
      });
    }
  } 
  // Handle other routes
  else {
    const currentItem = findNavigationItem(currentPath);
    if (currentItem && currentItem.path !== '/dashboard') {
      breadcrumbs.push(currentItem);
    }
  }
  
  return breadcrumbs;
};

// Feature flags for menu items
export const FEATURE_FLAGS = {
  portfolios: true,        // Portfolio management features
  analytics: true,         // Analytics and reporting
  import_export: true,     // File import/export features
  etl_system: true,        // ETL system features
  market_data: false,      // Real-time market data (coming soon)
  ai_insights: false,      // AI-powered insights (future feature)
  notifications: true,     // Notification system
  portfolio_contacts: true, // Portfolio contacts view
  portfolio_customers: true, // Portfolio customers view
  system_logs: true        // ADD THIS - System logs feature
};

// Filter menu based on feature flags
export const getFilteredNavigationMenu = (): NavigationSection[] => {
  return NAVIGATION_MENU.map(section => ({
    ...section,
    items: section.items.filter(item => {
      // Apply feature flag filtering logic here
      if (item.id === 'portfolios' && !FEATURE_FLAGS.portfolios) return false;
      if (item.id === 'portfolio_analysis' && !FEATURE_FLAGS.analytics) return false;
      if (item.id === 'market_data' && !FEATURE_FLAGS.market_data) return false;
      if (item.id === 'portfolio_contacts' && !FEATURE_FLAGS.portfolio_contacts) return false;
      if (item.id === 'portfolio_customers' && !FEATURE_FLAGS.portfolio_customers) return false;
      if ((item.id === 'etl_dashboard' || item.id === 'etl_upload') && !FEATURE_FLAGS.etl_system) return false;
      if (item.id === 'data_management' && !FEATURE_FLAGS.import_export) return false;
      if (item.id === 'system_logs' && !FEATURE_FLAGS.system_logs) return false;  // ADD THIS LINE
      return true;
    })
  })).filter(section => section.items.length > 0);
};

export default NAVIGATION_MENU;