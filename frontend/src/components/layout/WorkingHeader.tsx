// frontend/src/components/layout/WorkingHeader.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toastService } from '../../services/toast.service';

interface WorkingHeaderProps {
  onToggleSidebar?: () => void;
}

const WorkingHeader: React.FC<WorkingHeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, isDarkMode, toggleDarkMode } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');

  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  return (
    <div style={{
      height: '64px',
      backgroundColor: '#ffffff',
      borderBottom: '1px solid #e0e0e0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px'
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
              cursor: 'pointer',
              padding: '8px'
            }}
          >
            ☰
          </button>
        )}
        
        <input
          type="text"
          placeholder="Search..."
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: '1px solid #e0e0e0',
            width: '300px',
            fontSize: '14px'
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Environment toggle */}
        <button
          onClick={() => {
            const newEnv = environment === 'live' ? 'test' : 'live';
            setEnvironment(newEnv);
            toastService.info(`Switched to ${newEnv.toUpperCase()}`);
          }}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${environment === 'live' ? '#4caf50' : '#ff9800'}`,
            backgroundColor: environment === 'live' ? '#e8f5e9' : '#fff3e0',
            color: environment === 'live' ? '#4caf50' : '#ff9800',
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500'
          }}
        >
          {environment === 'live' ? 'Live' : 'Test'} {environment === 'live' ? '●' : '○'}
        </button>

        {/* Notifications */}
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            position: 'relative'
          }}
        >
          🔔
          <span style={{
            position: 'absolute',
            top: '-4px',
            right: '-4px',
            backgroundColor: '#f44336',
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            2
          </span>
        </button>

        {/* User menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '8px',
              background: 'none',
              border: 'none',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: colors.brand.primary,
              color: 'white',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontWeight: 'bold'
            }}>
              {user?.email ? user.email[0].toUpperCase() : 'U'}
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div style={{ fontSize: '12px', color: '#666' }}>
                Administrator
              </div>
            </div>
            <span style={{ fontSize: '12px' }}>▼</span>
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '8px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
              minWidth: '200px',
              zIndex: 1000
            }}>
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowUserMenu(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                Settings
              </button>
              <hr style={{ margin: 0, border: 'none', borderTop: '1px solid #e0e0e0' }} />
              <button
                onClick={() => {
                  logout();
                  toastService.success('Logged out successfully');
                }}
                style={{
                  display: 'block',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: '#f44336'
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingHeader; 