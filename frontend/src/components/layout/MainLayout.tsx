// frontend/src/components/layout/MainLayout.tsx
import React, { useState } from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import WorkingHeader from './Header';
import SideNavigation from './SideNavigation'; // Add this import

const MainLayout: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const { isAuthenticated, isLoading } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Get current theme colors
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Handle authentication check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-xl">Loading...</div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div style={{ display: 'flex', height: '100vh', width: '100vw', overflow: 'hidden' }}>
      {/* Use SideNavigation component instead of hardcoded sidebar */}
      <SideNavigation isOpen={isSidebarOpen} onToggle={() => setIsSidebarOpen(!isSidebarOpen)} />

      {/* Main Content Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden'
      }}>
        {/* Use the WorkingHeader component */}
        <WorkingHeader onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)} />

        {/* Page Content */}
        <main style={{
          flex: 1,
          padding: '20px',
          overflow: 'auto',
          backgroundColor: colors.utility.primaryBackground
        }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default MainLayout;