// frontend/src/App.tsx
// Updated with Market Analysis routes

import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';

// Auth Pages
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';

// Layout
import MainLayout from './components/layout/MainLayout';

// Dashboard page
import Dashboard from './pages/Dashboard';

// NAV Pages
import NavSearchPage from './pages/nav/NavSearchPage';
import NavSchedulerPage from './pages/nav/NavSchedulerPage';
import NavBookmarksPage from './pages/nav/NavBookmarksPage';
import NavHistoryPage from './pages/nav/NavHistoryPage';
import MarketHistoryPage from './pages/nav/MarketHistoryPage';
import SchemeDetailPage from './pages/nav/SchemeDetailPage';  

// Market Analysis Pages - NEW
import MarketAnalysisDashboard from './pages/market/MarketAnalysisDashboard';
import IndexDetailPage from './pages/market/IndexDetailPage';

// Cruise Control Pages - NEW
import CruiseControlPage from './pages/cruiseControl/CruiseControlPage';

// Contact pages
import ContactsPage from './pages/contacts/ContactsPage';
import ContactFormPage from './pages/contacts/ContactFormPage';
import ContactViewPage from './pages/contacts/ContactViewPage';

// Customer pages
import CustomersPage from './pages/customers/CustomersPage';
import CustomerFormPage from './pages/customers/CustomerFormPage';
import CustomerViewPage from './pages/customers/CustomerViewPage';

// Alias pages
import AliasListPage from './pages/AliasListPage';
import AliasDetailPage from './pages/AliasDetailPage';

// Goal pages
import GoalWizardPage from './pages/goals/GoalWizardPage';
import GoalSetupPage from './pages/goals/GoalSetupPage';
import GoalDetailsPage from './pages/goals/GoalDetailsPage';
import GoalsListPage from './pages/goals/GoalsListPage';

// Transaction pages
import TransactionListPage from './pages/transactions/TransactionListPage';

// JTBD pages
import JTBDDashboardPage from './pages/jtbd/JTBDDashboardPage';

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
                <Route path="customers/:customerId" element={<CustomerViewPage />} />

                {/* Alias Routes */}
                <Route path="aliases" element={<AliasListPage />} />
                <Route path="aliases/:aliasId" element={<AliasDetailPage />} />

                {/* Goal Routes */}
                <Route path="goals" element={<GoalsListPage />} />
                <Route path="customers/:customerId/goals/new" element={<GoalWizardPage />} />
                <Route path="customers/:customerId/goals/:goalId" element={<GoalDetailsPage />} />
                <Route path="customers/:customerId/goals/:goalId/edit" element={<GoalSetupPage />} />
                <Route path="customers/:customerId/goals/:goalId/rebalance" element={<GoalSetupPage />} />
                
                {/* Data Import Routes */}
                <Route path="import-dashboard" element={<ImportDashboard />} />
                <Route path="data-import" element={<ImportDataPage />} />
                <Route path="data-import/:step" element={<ImportDataPage />} />
                <Route path="data-import/results/:sessionId" element={<ImportDataPage />} />
                
                {/* NAV Tracking Routes */}
                <Route path="nav/bookmarks" element={<NavBookmarksPage />} />
                <Route path="nav/search" element={<NavSearchPage />} />
                <Route path="nav/scheduler" element={<NavSchedulerPage />} />
                <Route path="nav/history" element={<NavHistoryPage />} />
                <Route path="nav/market-history" element={<MarketHistoryPage />} />
                <Route path="fund-dashboard/:scheme_id" element={<SchemeDetailPage />} />
                
                {/* Market Analysis Routes - NEW */}
                <Route path="market/dashboard" element={<MarketAnalysisDashboard />} />
                <Route path="market/indices/:id" element={<IndexDetailPage />} />

                {/* Cruise Control Routes - NEW */}
                <Route path="cruise-control" element={<CruiseControlPage />} />

                {/* Admin Routes */}
                <Route path="admin/logs" element={<SystemLogsPage />} />

                {/* Transaction Routes */}
                <Route path="transactions" element={<TransactionListPage />} />
                <Route path="transactions/:id" element={<TransactionListPage />} />
                
                {/* JTBD Dashboard Route */}
                <Route path="jtbd/dashboard" element={<JTBDDashboardPage />} />
                
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