// frontend/src/App.tsx
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Pages (these already exist)
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Layout
import MainLayout from './components/layout/MainLayout';

// Dashboard page
import Dashboard from './pages/Dashboard';

// NAV Pages
import NavDashboardPage from './pages/nav/NavDashboardPage';

// Contact pages
import ContactsPage from './pages/contacts/ContactsPage';
import ContactFormPage from './pages/contacts/ContactFormPage';
import ContactViewPage from './pages/contacts/ContactViewPage';

// Customer pages
import CustomersPage from './pages/customers/CustomersPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import CustomerViewPage from './pages/customers/CustomerViewPage';

// Import Data pages
import ImportDataPage from './pages/data-import/ImportDataPage';
import ImportDashboard from './pages/data-import/ImportDashboard';

// System Admin pages
import SystemLogsPage from './pages/admin/SystemLogsPage';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <ThemeProvider>
          <AuthProvider>
            <Routes>
              {/* Public Routes */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              
              {/* Protected Routes with Layout */}
              <Route path="/" element={<MainLayout />}>
                <Route index element={<Navigate to="/dashboard" replace />} />
                <Route path="dashboard" element={<Dashboard />} />
                
                {/* Contact Routes */}
                <Route path="contacts" element={<ContactsPage />} />
                <Route path="contacts/new" element={<ContactFormPage />} />
                <Route path="contacts/:id" element={<ContactViewPage />} />
                <Route path="contacts/:id/edit" element={<ContactFormPage />} />
                
                {/* Customer Routes */}
                <Route path="customers" element={<CustomersPage />} />
                <Route path="customers/new" element={<CustomerFormPage />} />
                <Route path="customers/:id/edit" element={<CustomerFormPage />} />
                <Route path="customers/:id" element={<CustomerViewPage />} />
                
                {/* Data Import Routes */}
                <Route path="import-dashboard" element={<ImportDashboard />} />
                <Route path="data-import" element={<ImportDataPage />} />
                <Route path="data-import/:step" element={<ImportDataPage />} />
                <Route path="data-import/results/:sessionId" element={<ImportDataPage />} />
                
                {/* NAV Tracking Routes */}
                <Route path="nav/dashboard" element={<NavDashboardPage />} />
                {/* Add these future NAV routes when you create the components */}
                {/* 
                <Route path="nav/search" element={<NavSchemeSearchPage />} />
                <Route path="nav/bookmarks" element={<NavBookmarksPage />} />
                <Route path="nav/downloads" element={<NavDownloadsPage />} />
                <Route path="nav/statistics" element={<NavStatisticsPage />} />
                */}
                
                {/* Admin Routes */}
                <Route path="admin/logs" element={<SystemLogsPage />} />
                
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Route>
            </Routes>
            
            <ToastContainer
              position="bottom-right"
              autoClose={3000}
              hideProgressBar={false}
              newestOnTop={false}
              closeOnClick
              rtl={false}
              pauseOnFocusLoss
              draggable
              pauseOnHover
            />
          </AuthProvider>
        </ThemeProvider>
      </Router>
    </QueryClientProvider>
  );
}

export default App;