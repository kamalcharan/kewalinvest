// frontend/src/components/layout/Header.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Menu, 
  Bell, 
  Search, 
  ChevronDown, 
  LogOut,
  Sun,
  Moon,
  Palette,
  Shield,
  Database,
  TestTube,
  Check,
  AlertTriangle,
  RefreshCw
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

// Environment Switch Confirmation Modal
interface EnvironmentSwitchModalProps {
  isOpen: boolean;
  currentEnv: 'live' | 'test';
  onConfirm: () => void;
  onCancel: () => void;
  colors: any;
}

const EnvironmentSwitchModal: React.FC<EnvironmentSwitchModalProps> = ({
  isOpen,
  currentEnv,
  onConfirm,
  onCancel,
  colors
}) => {
  if (!isOpen) return null;

  const targetEnv = currentEnv === 'live' ? 'test' : 'live';
  const targetEnvUpper = targetEnv.toUpperCase();
  const targetColor = targetEnv === 'live' ? colors.semantic.success : colors.semantic.warning;

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 10000,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: colors.utility.primaryBackground,
        borderRadius: '16px',
        padding: '32px',
        maxWidth: '480px',
        width: '90%',
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
        border: `1px solid ${colors.utility.primaryText}10`,
        animation: 'modalSlideIn 0.3s ease-out'
      }}>
        {/* Icon and Title */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '20px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${targetColor}15`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <AlertTriangle size={24} style={{ color: targetColor }} />
          </div>
          <div>
            <h3 style={{
              fontSize: '20px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              margin: 0
            }}>
              Switch to {targetEnvUpper} Environment?
            </h3>
            <p style={{
              fontSize: '14px',
              color: colors.utility.secondaryText,
              margin: '4px 0 0 0'
            }}>
              Confirm environment change
            </p>
          </div>
        </div>

        {/* Message */}
        <div style={{
          padding: '16px',
          backgroundColor: colors.utility.secondaryBackground,
          borderRadius: '8px',
          marginBottom: '24px',
          borderLeft: `4px solid ${targetColor}`
        }}>
          <p style={{
            fontSize: '14px',
            color: colors.utility.primaryText,
            lineHeight: '1.6',
            margin: 0
          }}>
            Switching to <strong style={{ color: targetColor }}>{targetEnvUpper}</strong> environment will:
          </p>
          <ul style={{
            fontSize: '14px',
            color: colors.utility.secondaryText,
            lineHeight: '1.8',
            margin: '12px 0 0 0',
            paddingLeft: '20px'
          }}>
            <li>Change your current environment to <strong>{targetEnvUpper}</strong></li>
            <li>Refresh the application data</li>
            <li>Navigate you to the Dashboard</li>
            <li>Update all data sources to {targetEnv === 'live' ? 'production' : 'testing'} database</li>
          </ul>
        </div>

        {/* Warning Box */}
        <div style={{
          padding: '12px 16px',
          backgroundColor: `${colors.semantic.warning}10`,
          border: `1px solid ${colors.semantic.warning}30`,
          borderRadius: '8px',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}>
          <RefreshCw size={16} style={{ color: colors.semantic.warning, flexShrink: 0 }} />
          <span style={{
            fontSize: '13px',
            color: colors.utility.primaryText,
            lineHeight: '1.5'
          }}>
            Any unsaved changes will be lost. Please save your work before switching.
          </span>
        </div>

        {/* Action Buttons */}
        <div style={{
          display: 'flex',
          gap: '12px',
          justifyContent: 'flex-end'
        }}>
          <button
            onClick={onCancel}
            style={{
              padding: '10px 20px',
              backgroundColor: 'transparent',
              color: colors.utility.secondaryText,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            style={{
              padding: '10px 20px',
              backgroundColor: targetColor,
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontSize: '14px',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-1px)';
              e.currentTarget.style.boxShadow = `0 4px 12px ${targetColor}40`;
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            <RefreshCw size={16} />
            Switch to {targetEnvUpper}
          </button>
        </div>
      </div>

      {/* Animation */}
      <style>{`
        @keyframes modalSlideIn {
          from {
            opacity: 0;
            transform: translateY(-20px) scale(0.95);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }
      `}</style>
    </div>
  );
};

const Header: React.FC<HeaderProps> = ({ onToggleSidebar }) => {
  const navigate = useNavigate();
  const { user, logout, environment, switchEnvironment } = useAuth();
  const { theme, isDarkMode, toggleDarkMode, themes, currentThemeId, setTheme } = useTheme();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showEnvSwitchModal, setShowEnvSwitchModal] = useState(false);
  const [isSwitchingEnv, setIsSwitchingEnv] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);

  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  // Check if user is admin
  const isAdmin = user?.tenant_id === 1 || user?.email?.includes('admin');

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnvironmentToggleClick = () => {
    setShowEnvSwitchModal(true);
  };

  const handleEnvironmentSwitch = async () => {
    setShowEnvSwitchModal(false);
    setIsSwitchingEnv(true);

    try {
      const newEnv = environment === 'live' ? 'test' : 'live';
      const newEnvUpper = newEnv.toUpperCase();
      
      // Show loading toast
      toastService.info(`Switching to ${newEnvUpper} environment...`, { autoClose: 2000 });
      
      // Switch environment
      await switchEnvironment(newEnv);
      
      // Small delay for visual feedback
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Success message
      toastService.success(`Successfully switched to ${newEnvUpper} environment!`, { autoClose: 3000 });
      
      // Navigate to dashboard
      navigate('/dashboard');
      
      // Force page refresh after navigation to ensure clean state
      setTimeout(() => {
        window.location.reload();
      }, 100);
      
    } catch (error) {
      console.error('Failed to switch environment:', error);
      toastService.error('Failed to switch environment. Please try again.');
    } finally {
      setIsSwitchingEnv(false);
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
  };

  return (
    <>
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
            transition: 'all 0.2s ease',
            opacity: isSwitchingEnv ? 0.6 : 1,
            pointerEvents: isSwitchingEnv ? 'none' : 'auto'
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
              onChange={handleEnvironmentToggleClick}
              checkedColor={colors.semantic.success}
              uncheckedColor={colors.semantic.warning}
              size="sm"
            />
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
          <div ref={userMenuRef} style={{ position: 'relative' }}>
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
                minWidth: '280px',
                zIndex: 1000,
                overflow: 'hidden'
              }}>
                {/* User Info Section */}
                <div style={{
                  padding: '16px',
                  borderBottom: `1px solid ${colors.utility.primaryText}20`
                }}>
                  <div style={{
                    fontSize: '14px',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}>
                    {user?.email}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: colors.utility.secondaryText,
                    marginTop: '4px'
                  }}>
                    Tenant ID: {user?.tenant_id || 'N/A'}
                  </div>
                </div>

                {/* Dark Mode Toggle Section */}
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '12px 16px',
                  borderBottom: `1px solid ${colors.utility.primaryText}20`
                }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {isDarkMode ? <Moon size={16} style={{ color: colors.utility.primaryText }} /> : <Sun size={16} style={{ color: colors.utility.primaryText }} />}
                    <span style={{
                      fontSize: '14px',
                      fontWeight: '500',
                      color: colors.utility.primaryText
                    }}>
                      {isDarkMode ? 'Dark Mode' : 'Light Mode'}
                    </span>
                  </div>
                  <ToggleSwitch
                    checked={isDarkMode}
                    onChange={handleDarkModeToggle}
                    checkedColor={colors.brand.primary}
                    uncheckedColor={`${colors.utility.primaryText}40`}
                    size="sm"
                  />
                </div>

                {/* Theme Selection Section */}
                <div style={{ padding: '12px 16px', borderBottom: `1px solid ${colors.utility.primaryText}20` }}>
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '12px'
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

                {/* Logout Button */}
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

      {/* Environment Switch Confirmation Modal */}
      <EnvironmentSwitchModal
        isOpen={showEnvSwitchModal}
        currentEnv={environment}
        onConfirm={handleEnvironmentSwitch}
        onCancel={() => setShowEnvSwitchModal(false)}
        colors={colors}
      />
    </>
  );
};

export default Header;