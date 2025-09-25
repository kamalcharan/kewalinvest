// frontend/src/components/layout/SideNavigation.tsx
import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { 
  ChevronRight,
  ChevronLeft,
  HelpCircle
} from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { useAuth } from '../../contexts/AuthContext';
import { 
  getFilteredNavigationMenu, 
  isActiveRoute, 
  NavigationItem, 
  NavigationSection,
  FEATURE_FLAGS 
} from '../../constants/navigation';

interface NavItemProps {
  item: NavigationItem;
  collapsed: boolean;
  isSubItem?: boolean;
}

const NavItem: React.FC<NavItemProps> = ({ item, collapsed, isSubItem = false }) => {
  const [isSubmenuOpen, setIsSubmenuOpen] = useState(false);
  const { theme, isDarkMode } = useTheme();
  const location = useLocation();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;
  
  const Icon = item.icon;
  const isActive = isActiveRoute(location.pathname, item.path);
  const hasChildren = item.children && item.children.length > 0;
  
  const toggleSubmenu = (e: React.MouseEvent) => {
    if (hasChildren) {
      e.preventDefault();
      setIsSubmenuOpen(!isSubmenuOpen);
    }
  };

  const baseStyles = {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: collapsed ? '12px' : isSubItem ? '8px 12px' : '12px 16px',
    borderRadius: isSubItem ? '6px' : '8px',
    textDecoration: 'none',
    transition: 'all 0.2s',
    fontSize: isSubItem ? '14px' : '16px',
    marginLeft: isSubItem ? '20px' : '0',
    position: 'relative' as const,
    justifyContent: collapsed ? 'center' : 'flex-start'
  };

  const activeStyles = {
    backgroundColor: isActive ? colors.brand.primary : 'transparent',
    color: isActive ? 'white' : colors.utility.primaryText,
    fontWeight: isActive ? '500' : 'normal'
  };

  return (
    <div className="mb-1">
      <NavLink 
        to={hasChildren ? '#' : item.path}
        onClick={toggleSubmenu}
        style={{
          ...baseStyles,
          ...activeStyles
        }}
        onMouseEnter={(e) => {
          const target = e.currentTarget as HTMLAnchorElement;
          if (!isActive) {
            target.style.backgroundColor = `${colors.brand.primary}10`;
            target.style.color = colors.brand.primary;
          }
        }}
        onMouseLeave={(e) => {
          const target = e.currentTarget as HTMLAnchorElement;
          if (!isActive) {
            target.style.backgroundColor = 'transparent';
            target.style.color = colors.utility.primaryText;
          }
        }}
      >
        <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
          <Icon size={isSubItem ? 16 : 20} />
          {item.badge && (
            <span style={{
              position: 'absolute',
              top: '-4px',
              right: '-4px',
              backgroundColor: colors.semantic.error,
              color: 'white',
              fontSize: '10px',
              borderRadius: '50%',
              width: '16px',
              height: '16px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              {typeof item.badge === 'number' && item.badge > 9 ? '9+' : item.badge}
            </span>
          )}
        </div>
        
        {!collapsed && (
          <>
            <span style={{ flex: 1 }}>{item.name}</span>
            {hasChildren && (
              <ChevronRight 
                size={16}
                style={{
                  transform: isSubmenuOpen ? 'rotate(90deg)' : 'none',
                  transition: 'transform 0.2s'
                }}
              />
            )}
          </>
        )}

        {/* Tooltip for collapsed state */}
        {collapsed && (
          <div style={{
            position: 'absolute',
            left: '100%',
            marginLeft: '8px',
            padding: '4px 8px',
            backgroundColor: colors.utility.primaryText,
            color: colors.utility.secondaryBackground,
            borderRadius: '4px',
            fontSize: '12px',
            whiteSpace: 'nowrap',
            opacity: 0,
            pointerEvents: 'none',
            transition: 'opacity 0.2s',
            zIndex: 1000
          }}
          className="sidebar-tooltip">
            {item.name}
          </div>
        )}
      </NavLink>
      
      {/* Submenu */}
      {!collapsed && hasChildren && isSubmenuOpen && (
        <div style={{
          marginLeft: '16px',
          paddingLeft: '12px',
          borderLeft: `1px solid ${colors.utility.secondaryText}20`,
          marginTop: '4px'
        }}>
          {item.children!.map((subItem) => (
            <NavItem
              key={subItem.id}
              item={subItem}
              collapsed={false}
              isSubItem={true}
            />
          ))}
        </div>
      )}
    </div>
  );
};

interface NavSectionProps {
  section: NavigationSection;
  collapsed: boolean;
}

const NavSection: React.FC<NavSectionProps> = ({ section, collapsed }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Show all items - no admin filtering
  const filteredItems = section.items;

  if (filteredItems.length === 0) return null;

  return (
    <div style={{ marginBottom: '16px' }}>
      {/* Section Header */}
      {!collapsed && section.id !== 'main' && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          marginBottom: '8px',
          paddingLeft: '16px'
        }}>
          <span style={{
            fontSize: '11px',
            fontWeight: '600',
            textTransform: 'uppercase',
            letterSpacing: '0.5px',
            color: colors.utility.secondaryText,
            marginRight: '8px'
          }}>
            {section.name}
          </span>
          <div style={{
            flex: 1,
            height: '1px',
            backgroundColor: `${colors.utility.secondaryText}20`
          }} />
        </div>
      )}
      
      {/* Section Items */}
      {filteredItems.map((item) => (
        <NavItem key={item.id} item={item} collapsed={collapsed} />
      ))}
    </div>
  );
};

interface SideNavigationProps {
  isOpen: boolean;
  onToggle: () => void;
}

const SideNavigation: React.FC<SideNavigationProps> = ({ isOpen, onToggle }) => {
  const collapsed = !isOpen;
  const { theme, isDarkMode } = useTheme();
  const { user } = useAuth();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Get filtered navigation menu based on feature flags
  const navigationSections = getFilteredNavigationMenu();

  return (
    <aside style={{
      width: collapsed ? '64px' : '250px',
      backgroundColor: colors.utility.secondaryBackground,
      borderRight: `1px solid ${colors.utility.secondaryText}20`,
      height: '100vh',
      display: 'flex',
      flexDirection: 'column',
      transition: 'width 0.3s ease',
      position: 'relative'
    }}>
      {/* Header */}
      <div style={{
        padding: '20px',
        borderBottom: `1px solid ${colors.utility.secondaryText}20`,
        display: 'flex',
        alignItems: 'center',
        justifyContent: collapsed ? 'center' : 'space-between'
      }}>
        {collapsed ? (
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '8px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 'bold'
          }}>
            KI
          </div>
        ) : (
          <h2 style={{
            margin: 0,
            fontSize: '20px',
            fontWeight: 'bold',
            background: `linear-gradient(135deg, ${colors.brand.primary}, ${colors.brand.secondary})`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            KewalInvest
          </h2>
        )}
      </div>

      {/* Navigation */}
      <nav style={{
        flex: 1,
        padding: '16px',
        overflowY: 'auto'
      }}>
        {navigationSections.map((section) => (
          <NavSection
            key={section.id}
            section={section}
            collapsed={collapsed}
          />
        ))}
      </nav>

      {/* Help Section */}
      {!collapsed && FEATURE_FLAGS.notifications && (
        <div style={{
          padding: '16px',
          borderTop: `1px solid ${colors.utility.secondaryText}20`
        }}>
          <div style={{
            padding: '12px',
            borderRadius: '8px',
            backgroundColor: `${colors.brand.primary}10`
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '8px'
            }}>
              <HelpCircle size={16} style={{ color: colors.brand.primary }} />
              <span style={{
                fontSize: '14px',
                fontWeight: '500',
                color: colors.utility.primaryText
              }}>
                Need help?
              </span>
            </div>
            <p style={{
              fontSize: '12px',
              color: colors.utility.secondaryText,
              margin: '0 0 8px 0'
            }}>
              Check our documentation or contact support
            </p>
            <button style={{
              fontSize: '12px',
              color: colors.brand.primary,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              textDecoration: 'underline'
            }}>
              View Documentation →
            </button>
          </div>
        </div>
      )}

      {/* Collapse Toggle */}
      <button
        onClick={onToggle}
        style={{
          position: 'absolute',
          right: '-12px',
          top: '28px',
          width: '24px',
          height: '24px',
          borderRadius: '50%',
          backgroundColor: colors.utility.secondaryBackground,
          border: `1px solid ${colors.utility.secondaryText}20`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          zIndex: 10
        }}
      >
        {collapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
      </button>

      {/* Add CSS for tooltip hover effect */}
      <style>{`
        .sidebar-tooltip {
          opacity: 0 !important;
        }
        a:hover .sidebar-tooltip {
          opacity: 1 !important;
        }
      `}</style>
    </aside>
  );
};

export default SideNavigation;