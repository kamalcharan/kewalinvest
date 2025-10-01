// frontend/src/components/layout/Navbar.tsx
import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { toastService } from '../../services/toast.service';

interface NavbarProps {
  onMenuToggle?: () => void;
}

const Navbar: React.FC<NavbarProps> = ({ onMenuToggle }) => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { theme, themes, setTheme, currentThemeId, isDarkMode, toggleDarkMode } = useTheme();
  
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [showSettingsMenu, setShowSettingsMenu] = useState(false);
  const [currentEnvironment, setCurrentEnvironment] = useState<'live' | 'test'>('live');
  
  const dropdownRef = useRef<HTMLDivElement>(null);
  const settingsDropdownRef = useRef<HTMLDivElement>(null);

  // Get current theme colors
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserDropdown(false);
      }
      if (settingsDropdownRef.current && !settingsDropdownRef.current.contains(event.target as Node)) {
        setShowSettingsMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleEnvironmentToggle = () => {
    const newEnv = currentEnvironment === 'live' ? 'test' : 'live';
    setCurrentEnvironment(newEnv);
    toastService.info(`Switched to ${newEnv.toUpperCase()} environment`);
  };

  const handleLogout = () => {
    logout();
    toastService.success('Successfully logged out');
    navigate('/login');
  };

  const handleThemeChange = (themeId: string) => {
    setTheme(themeId);
    toastService.success(`Theme changed to ${themes.find(t => t.id === themeId)?.name}`);
  };

  // Icons
  const BellIcon = () => <span>🔔</span>;
  const UserIcon = () => <span>👤</span>;
  const MoreVerticalIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="1" fill="currentColor" />
      <circle cx="12" cy="5" r="1" fill="currentColor" />
      <circle cx="12" cy="19" r="1" fill="currentColor" />
    </svg>
  );

  return (
    <nav style={{
      height: '64px',
      backgroundColor: colors.utility.secondaryBackground,
      borderBottom: `1px solid ${colors.utility.secondaryText}20`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 24px',
      position: 'relative',
      boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
    }}>
      {/* Left Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <h1 style={{ 
          color: colors.utility.primaryText,
          fontSize: '1.25rem',
          fontWeight: '600',
          margin: 0
        }}>
          Dashboard
        </h1>

        {/* Environment Switch */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          padding: '6px 12px',
          borderRadius: '20px',
          backgroundColor: colors.utility.primaryBackground
        }}>
          <span style={{ 
            fontSize: '0.875rem',
            color: currentEnvironment === 'live' ? colors.semantic.success : colors.utility.secondaryText
          }}>
            Live
          </span>
          <button
            onClick={handleEnvironmentToggle}
            style={{
              width: '44px',
              height: '24px',
              borderRadius: '12px',
              backgroundColor: currentEnvironment === 'live' ? colors.semantic.success : colors.semantic.warning,
              border: 'none',
              cursor: 'pointer',
              position: 'relative',
              transition: 'background-color 0.3s'
            }}
          >
            <span style={{
              position: 'absolute',
              top: '2px',
              left: currentEnvironment === 'live' ? '2px' : '22px',
              width: '20px',
              height: '20px',
              backgroundColor: 'white',
              borderRadius: '50%',
              transition: 'left 0.3s',
              boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
          <span style={{ 
            fontSize: '0.875rem',
            color: currentEnvironment === 'test' ? colors.semantic.warning : colors.utility.secondaryText
          }}>
            Test
          </span>
        </div>
      </div>

      {/* Right Section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        
        {/* Notifications */}
        <button
          style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.secondaryText}20`,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: colors.utility.primaryText,
            position: 'relative',
            fontSize: '1.2rem'
          }}
        >
          <BellIcon />
          <span style={{
            position: 'absolute',
            top: '6px',
            right: '6px',
            width: '8px',
            height: '8px',
            backgroundColor: colors.semantic.error,
            borderRadius: '50%'
          }} />
        </button>

        {/* Settings Menu (Three Dots) */}
        <div ref={settingsDropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowSettingsMenu(!showSettingsMenu)}
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '8px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.secondaryText}20`,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: colors.utility.primaryText
            }}
            title="Settings"
          >
            <MoreVerticalIcon />
          </button>

          {showSettingsMenu && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              width: '280px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.secondaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              padding: '8px'
            }}>
              {/* Dark Mode Toggle */}
              <div style={{
                padding: '12px',
                borderBottom: `1px solid ${colors.utility.secondaryText}20`
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
                      backgroundColor: isDarkMode ? colors.brand.primary : colors.utility.secondaryText + '40',
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
                    onClick={() => {
                      handleThemeChange(t.id);
                      setShowSettingsMenu(false);
                    }}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      textAlign: 'left',
                      backgroundColor: currentThemeId === t.id ? colors.brand.primary + '10' : 'transparent',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      color: currentThemeId === t.id ? colors.brand.primary : colors.utility.primaryText,
                      fontSize: '0.875rem',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '2px'
                    }}
                    onMouseEnter={(e) => {
                      if (currentThemeId !== t.id) {
                        e.currentTarget.style.backgroundColor = colors.utility.primaryBackground;
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
                      <span style={{
                        display: 'flex',
                        gap: '3px'
                      }}>
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

        {/* User Dropdown */}
        <div ref={dropdownRef} style={{ position: 'relative' }}>
          <button
            onClick={() => setShowUserDropdown(!showUserDropdown)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '8px 12px',
              backgroundColor: colors.utility.primaryBackground,
              border: `1px solid ${colors.utility.secondaryText}20`,
              borderRadius: '8px',
              cursor: 'pointer'
            }}
          >
            <div style={{
              width: '32px',
              height: '32px',
              borderRadius: '50%',
              backgroundColor: colors.brand.primary,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '1.2rem'
            }}>
              <UserIcon />
            </div>
            <div style={{ textAlign: 'left' }}>
              <div style={{ 
                fontSize: '0.875rem',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                {user?.email?.split('@')[0] || 'User'}
              </div>
              <div style={{ 
                fontSize: '0.75rem',
                color: colors.utility.secondaryText
              }}>
                Administrator
              </div>
            </div>
            <span style={{ fontSize: '0.7rem' }}>▼</span>
          </button>

          {showUserDropdown && (
            <div style={{
              position: 'absolute',
              top: '110%',
              right: 0,
              width: '240px',
              backgroundColor: colors.utility.secondaryBackground,
              border: `1px solid ${colors.utility.secondaryText}20`,
              borderRadius: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
              zIndex: 1000,
              overflow: 'hidden'
            }}>
              {/* User Info Section */}
              <div style={{
                padding: '16px',
                borderBottom: `1px solid ${colors.utility.secondaryText}20`
              }}>
                <div style={{ fontSize: '0.875rem', fontWeight: '500', color: colors.utility.primaryText }}>
                  {user?.email}
                </div>
                <div style={{ fontSize: '0.75rem', color: colors.utility.secondaryText, marginTop: '4px' }}>
                  Tenant ID: {user?.tenant_id || 'N/A'}
                </div>
              </div>

              {/* Logout Button */}
              <div style={{ padding: '8px' }}>
                <button
                  onClick={handleLogout}
                  style={{
                    width: '100%',
                    padding: '10px 12px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    color: colors.semantic.error,
                    fontSize: '0.875rem',
                    textAlign: 'left'
                  }}
                  onMouseEnter={(e) => e.currentTarget.style.backgroundColor = colors.semantic.error + '10'}
                  onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                >
                  🚪 Logout
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;