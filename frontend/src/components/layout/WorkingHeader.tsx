// frontend/src/components/layout/WorkingHeader.tsx
import React, { useState, useRef, useEffect } from 'react';
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
  const { theme, themes, setTheme, currentThemeId, isDarkMode, toggleDarkMode } = useTheme();
  
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [environment, setEnvironment] = useState<'live' | 'test'>('live');
  
  const userMenuRef = useRef<HTMLDivElement>(null);
  const settingsMenuRef = useRef<HTMLDivElement>(null);

  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
      if (settingsMenuRef.current && !settingsMenuRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnvironmentToggle = () => {
    const newEnv = environment === 'live' ? 'test' : 'live';
    setEnvironment(newEnv);
    toastService.info(`Switched to ${newEnv.toUpperCase()}`);
  };

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    const selectedTheme = themes.find(t => t.id === themeId);
    toastService.success(`Theme changed to ${selectedTheme?.name}`);
    setShowSettingsMenu(false);
  };

  const handleLogout = () => {
    logout();
    toastService.success('Logged out successfully');
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
              fontSize: '20px',
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
            ☰
          </button>
        )}
        
        <input
          type="text"
          placeholder="Search..."
          style={{
            padding: '8px 12px',
            borderRadius: '8px',
            border: `1px solid ${colors.utility.primaryText}20`,
            backgroundColor: colors.utility.secondaryBackground,
            color: colors.utility.primaryText,
            width: '300px',
            fontSize: '14px',
            outline: 'none',
            transition: 'all 0.2s ease'
          }}
          onFocus={(e) => {
            e.target.style.borderColor = colors.brand.primary;
          }}
          onBlur={(e) => {
            e.target.style.borderColor = `${colors.utility.primaryText}20`;
          }}
        />
      </div>

      {/* Right side */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Environment toggle */}
        <button
          onClick={handleEnvironmentToggle}
          style={{
            padding: '6px 12px',
            borderRadius: '20px',
            border: `1px solid ${environment === 'live' ? colors.semantic.success : colors.semantic.warning}`,
            backgroundColor: environment === 'live' ? `${colors.semantic.success}15` : `${colors.semantic.warning}15`,
            color: environment === 'live' ? colors.semantic.success : colors.semantic.warning,
            fontSize: '14px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s ease'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.opacity = '0.8';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.opacity = '1';
          }}
        >
          {environment === 'live' ? '🟢 Live' : '🟡 Test'}
        </button>

        {/* Notifications */}
        <button
          style={{
            background: 'none',
            border: 'none',
            fontSize: '20px',
            cursor: 'pointer',
            position: 'relative',
            padding: '8px',
            borderRadius: '6px',
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
          🔔
          <span style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
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

        {/* Settings Menu (Three Dots) */}
        <div ref={settingsMenuRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '20px',
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
            title="Settings"
          >
            ⋮
          </button>

          {showSettingsMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              marginTop: '8px',
              width: '280px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              zIndex: 1000,
              padding: '8px'
            }}>
              {/* Dark Mode Toggle */}
              <div style={{
                padding: '12px',
                borderBottom: `1px solid ${colors.utility.primaryText}20`
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between'
                }}>
                  <span style={{
                    fontSize: '0.875rem',
                    fontWeight: '500',
                    color: colors.utility.primaryText
                  }}>
                    {isDarkMode ? '🌙 Dark Mode' : '☀️ Light Mode'}
                  </span>
                  <button
                    onClick={toggleDarkMode}
                    style={{
                      width: '44px',
                      height: '24px',
                      borderRadius: '12px',
                      backgroundColor: isDarkMode ? colors.brand.primary : `${colors.utility.primaryText}40`,
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background-color 0.3s'
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: '2px',
                      left: isDarkMode ? '22px' : '2px',
                      width: '20px',
                      height: '20px',
                      backgroundColor: 'white',
                      borderRadius: '50%',
                      transition: 'left 0.3s',
                      boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                    }} />
                  </button>
                </div>
              </div>

              {/* Theme Selection */}
              <div style={{ padding: '8px 0' }}>
                <div style={{
                  padding: '8px 12px',
                  fontSize: '0.75rem',
                  fontWeight: '600',
                  color: colors.utility.secondaryText,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                }}>
                  🎨 Choose Theme
                </div>
                {themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleThemeChange(t.id)}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: currentThemeId === t.id ? `${colors.brand.primary}10` : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: currentThemeId === t.id ? colors.brand.primary : colors.utility.primaryText,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '2px',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      if (currentThemeId !== t.id) {
                        e.currentTarget.style.backgroundColor = `${colors.utility.primaryText}10`;
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentThemeId !== t.id) {
                        e.currentTarget.style.backgroundColor = 'transparent';
                      }
                    }}
                  >
                    <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      {/* Theme color indicators */}
                      <span style={{ display: 'flex', gap: '3px' }}>
                        {t.id === 'techy-simple' && (
                          <>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#EF4444' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#3B82F6' }} />
                          </>
                        )}
                        {t.id === 'bharathavarsha' && (
                          <>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F97316' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#F97316' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#8B5CF6' }} />
                          </>
                        )}
                        {t.id === 'professional-redefined' && (
                          <>
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#1E3A8A' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#10B981' }} />
                            <span style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#64748B' }} />
                          </>
                        )}
                      </span>
                      {t.name}
                    </span>
                    {currentThemeId === t.id && '✓'}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

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
                Administrator
              </div>
            </div>
            <span style={{ fontSize: '12px', color: colors.utility.primaryText }}>▼</span>
          </button>

          {showUserMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              marginTop: '8px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.primaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
              minWidth: '240px',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              {/* User Info Section */}
              <div style={{
                padding: '16px',
                borderBottom: `1px solid ${colors.utility.primaryText}20`
              }}>
                <div style={{ 
                  fontSize: '0.875rem', 
                  fontWeight: '500', 
                  color: colors.utility.primaryText 
                }}>
                  {user?.email}
                </div>
                <div style={{ 
                  fontSize: '0.75rem', 
                  color: colors.utility.secondaryText,
                  marginTop: '4px'
                }}>
                  Tenant ID: {user?.tenant_id || 'N/A'}
                </div>
              </div>

              {/* Logout Button Only */}
              <div style={{ padding: '8px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    width: '100%',
                    padding: '10px 12px',
                    background: 'none',
                    border: 'none',
                    textAlign: 'left',
                    cursor: 'pointer',
                    fontSize: '14px',
                    color: colors.semantic.error,
                    borderRadius: '6px',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = `${colors.semantic.error}10`;
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent';
                  }}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default WorkingHeader;