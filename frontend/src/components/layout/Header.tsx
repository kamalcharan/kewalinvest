// frontend/src/components/layout/Header.tsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Search, 
  ChevronDown, 
  User, 
  Settings, 
  LogOut,
  Sun,
  Moon,
  Palette,
  Shield,
  Database,
  TestTube,
  Check
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toastService } from '../../services/toast.service';

interface HeaderProps {
  onToggleSidebar?: () => void;
}

// Simple Toggle Switch Component
interface ToggleSwitchProps {
  checked: boolean;
  onChange: () => void;
  checkedColor: string;
  uncheckedColor: string;
  size?: 'sm' | 'md';
}

const ToggleSwitch: React.FC<ToggleSwitchProps> = ({ 
  checked, 
  onChange, 
  checkedColor, 
  uncheckedColor,
  size = 'sm'
}) => {
  const switchSize = size === 'sm' ? { width: 36, height: 20, thumb: 16 } : { width: 44, height: 24, thumb: 20 };
  
  return (
    <button
      onClick={onChange}
      style={{
        width: switchSize.width,
        height: switchSize.height,
        borderRadius: switchSize.height / 2,
        backgroundColor: checked ? checkedColor : uncheckedColor,
        border: 'none',
        cursor: 'pointer',
        position: 'relative',
        transition: 'all 0.2s ease'
      }}
    >
      <div
        style={{
          width: switchSize.thumb,
          height: switchSize.thumb,
          borderRadius: '50%',
          backgroundColor: 'white',
          position: 'absolute',
          top: (switchSize.height - switchSize.thumb) / 2,
          left: checked ? switchSize.width - switchSize.thumb - 2 : 2,
          transition: 'all 0.2s ease',
          boxShadow: '0 1px 3px rgba(0,0,0,0.3)'
        }}
      />
    </button>
  );
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, environment, switchEnvironment } = useAuth();
  const { theme, isDarkMode, toggleDarkMode, themes, currentThemeId, setTheme } = useTheme();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showThemeMenu, setShowThemeMenu] = useState(false);

  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Check if user is admin
  const isAdmin = user?.tenant_id === 1 || user?.email?.includes('admin');

  const handleEnvironmentSwitch = async () => {
    try {
      const newEnv = environment === 'live' ? 'test' : 'live';
      await switchEnvironment(newEnv);
      toastService.info(`Switched to ${newEnv.toUpperCase()}`);
    } catch (error) {
      console.error('Failed to switch environment:', error);
      toastService.error('Failed to switch environment');
    }
  };

  const handleDarkModeToggle = () => {
    toggleDarkMode();
    toastService.info(`Switched to ${!isDarkMode ? 'Dark' : 'Light'} mode`);
  };

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    const selectedTheme = themes.find(t => t.id === themeId);
    toastService.success(`Theme changed to ${selectedTheme?.name}`);
    setShowThemeMenu(false);
  };

  return (
    <div style={{
      height: '64px',
      backgroundColor: colors.utility.secondaryBackground,
      borderBottom: `1px solid ${colors.utility.primaryText}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      transition: 'all 0.2s ease'
    }}>
      {/* Left side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
        {onToggleSidebar && (
          <button
            onClick={onToggleSidebar}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: colors.utility.primaryText,
              backgroundColor: `${colors.utility.primaryText}10`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
          >
            <Menu size={20} />
          </button>
        )}
        
        <div style={{ position: 'relative' }}>
          <input
            type="text"
            placeholder="Search..."
            style={{
              padding: '8px 12px 8px 40px',
              borderRadius: '8px',
              border: `1px solid ${colors.utility.primaryText}20`,
              backgroundColor: `${colors.utility.primaryText}10`,
              color: colors.utility.primaryText,
              width: '300px',
              fontSize: '14px',
              outline: 'none',
              transition: 'all 0.2s ease'
            }}
            onFocus={(e) => {
              e.currentTarget.style.borderColor = colors.brand.primary;
              e.currentTarget.style.backgroundColor = colors.utility.secondaryBackground;
            }}
            onBlur={(e) => {
              e.currentTarget.style.borderColor = `${colors.utility.primaryText}20`;
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
          />
          <Search 
            size={16} 
            style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: colors.utility.secondaryText
            }}
          />
        </div>
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Admin Badge */}
        {isAdmin && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: '16px',
            backgroundColor: `${colors.brand.tertiary}20`,
            border: `1px solid ${colors.brand.tertiary}40`
          }}>
            <Shield size={14} style={{ color: colors.brand.tertiary }} />
            <span style={{
              fontSize: '12px',
              fontWeight: '500',
              color: colors.brand.tertiary
            }}>
              Admin
            </span>
          </div>
        )}

        {/* Enhanced Environment Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          padding: '6px 12px',
          borderRadius: '20px',
          border: `1px solid ${environment === 'live' ? colors.semantic.success : colors.semantic.warning}`,
          backgroundColor: environment === 'live' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
          transition: 'all 0.2s ease'
        }}>
          {environment === 'live' ? (
            <Database size={16} style={{ color: colors.semantic.success }} />
          ) : (
            <TestTube size={16} style={{ color: colors.semantic.warning }} />
          )}
          <span style={{
            fontSize: '14px',
            fontWeight: '500',
            color: environment === 'live' ? colors.semantic.success : colors.semantic.warning
          }}>
            {environment === 'live' ? 'Live' : 'Test'}
          </span>
          <ToggleSwitch
            checked={environment === 'live'}
            onChange={handleEnvironmentSwitch}
            checkedColor={colors.semantic.success}
            uncheckedColor={colors.semantic.warning}
            size="sm"
          />
        </div>

        {/* Dark Mode Toggle */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 10px',
          borderRadius: '20px',
          backgroundColor: `${colors.utility.primaryText}10`,
          border: `1px solid ${colors.utility.primaryText}20`
        }}>
          {isDarkMode ? <Moon size={16} style={{ color: colors.utility.primaryText }} /> : <Sun size={16} style={{ color: colors.utility.primaryText }} />}
          <ToggleSwitch
            checked={isDarkMode}
            onChange={handleDarkModeToggle}
            checkedColor={colors.brand.primary}
            uncheckedColor={`${colors.utility.primaryText}40`}
            size="sm"
          />
        </div>

        {/* Theme Menu */}
        <div style={{ position: 'relative' }}>
          <button
            onClick={() => setShowThemeMenu(!showThemeMenu)}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '8px',
              borderRadius: '6px',
              color: colors.utility.primaryText,
              backgroundColor: `${colors.utility.primaryText}10`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}20`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
          >
            <Palette size={20} />
          </button>

          {showThemeMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '280px',
              zIndex: 1000,
              padding: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                marginBottom: '12px',
                paddingBottom: '8px',
                borderBottom: `1px solid ${colors.utility.primaryText}20`
              }}>
                <Palette size={16} style={{ color: colors.brand.primary }} />
                <span style={{
                  fontSize: '14px',
                  fontWeight: '600',
                  color: colors.utility.primaryText
                }}>
                  Choose Theme
                </span>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {themes.map((themeOption) => (
                  <button
                    key={themeOption.id}
                    onClick={() => handleThemeChange(themeOption.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '8px 12px',
                      background: 'none',
                      border: `1px solid ${currentThemeId === themeOption.id ? colors.brand.primary : 'transparent'}`,
                      borderRadius: '6px',
                      cursor: 'pointer',
                      backgroundColor: currentThemeId === themeOption.id ? `${colors.brand.primary}10` : 'transparent',
                      transition: 'all 0.2s ease',
                      width: '100%',
                      textAlign: 'left'
                    }}
                    onMouseEnter={(e) => {
                      if (currentThemeId !== themeOption.id) {
                        e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentThemeId !== themeOption.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <div style={{ display: 'flex', gap: '3px' }}>
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: themeOption.colors.brand.primary,
                        border: `1px solid ${colors.utility.primaryText}20`
                      }} />
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: themeOption.colors.brand.secondary,
                        border: `1px solid ${colors.utility.primaryText}20`
                      }} />
                      <div style={{
                        width: '12px',
                        height: '12px',
                        borderRadius: '50%',
                        backgroundColor: themeOption.colors.brand.tertiary,
                        border: `1px solid ${colors.utility.primaryText}20`
                      }} />
                    </div>
                    <span style={{
                      fontSize: '13px',
                      fontWeight: '500',
                      color: colors.utility.primaryText,
                      flex: 1
                    }}>
                      {themeOption.name}
                    </span>
                    {currentThemeId === themeOption.id && (
                      <Check size={14} style={{ color: colors.brand.primary }} />
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Notifications */}
        <button
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            position: 'relative',
            padding: '8px',
            borderRadius: '6px',
            color: colors.utility.primaryText,
            backgroundColor: `${colors.utility.primaryText}10`,
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}20`;
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
          }}
        >
          <Bell size={20} />
          <span style={{
            position: 'absolute',
            top: '2px',
            right: '2px',
            backgroundColor: colors.semantic.error,
            color: 'white',
            borderRadius: '50%',
            width: '16px',
            height: '16px',
            fontSize: '10px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
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
              cursor: 'pointer',
              borderRadius: '6px',
              backgroundColor: `${colors.utility.primaryText}05`,
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}05`;
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
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div style={{ 
                fontSize: '12px', 
                color: colors.utility.secondaryText
              }}>
                {isAdmin ? 'Administrator' : 'User'}
              </div>
            </div>
            <ChevronDown size={14} style={{ color: colors.utility.primaryText }} />
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '100%',
              right: 0,
              marginTop: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '200px',
              zIndex: 1000
            }}>
              <button
                onClick={() => {
                  navigate('/profile');
                  setShowUserMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: colors.utility.primaryText,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <User size={16} />
                Profile
              </button>
              <button
                onClick={() => {
                  navigate('/settings');
                  setShowUserMenu(false);
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: colors.utility.primaryText,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <Settings size={16} />
                Settings
              </button>
              <hr style={{ margin: 0, border: 'none', borderTop: `1px solid ${colors.utility.primaryText}20` }} />
              <button
                onClick={() => {
                  logout();
                  toastService.success('Logged out successfully');
                }}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  width: '100%',
                  padding: '12px 16px',
                  background: 'none',
                  border: 'none',
                  textAlign: 'left',
                  cursor: 'pointer',
                  fontSize: '14px',
                  color: colors.semantic.error,
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = `${colors.semantic.error}10`;
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                }}
              >
                <LogOut size={16} />
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;