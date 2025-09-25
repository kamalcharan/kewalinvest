// frontend/src/components/common/Loader.tsx
import React from 'react';
import { useTheme } from '../../contexts/ThemeContext';

interface LoaderProps {
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
  message?: string;
}

const Loader: React.FC<LoaderProps> = ({ 
  size = 'medium', 
  fullScreen = false,
  message 
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const sizeMap = {
    small: 30,
    medium: 50,
    large: 70
  };

  const spinnerSize = sizeMap[size];
  const borderWidth = size === 'small' ? 2 : size === 'medium' ? 3 : 4;

  const spinnerStyles: React.CSSProperties = {
    width: `${spinnerSize}px`,
    height: `${spinnerSize}px`,
    border: `${borderWidth}px solid ${colors.utility.secondaryBackground}`,
    borderTop: `${borderWidth}px solid ${colors.brand.primary}`,
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  };

  const containerStyles: React.CSSProperties = fullScreen ? {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: isDarkMode ? 'rgba(0, 0, 0, 0.7)' : 'rgba(255, 255, 255, 0.9)',
    zIndex: 9999,
    backdropFilter: 'blur(4px)',
  } : {
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    alignItems: 'center',
    padding: '20px',
  };

  return (
    <>
      <div style={containerStyles}>
        <div style={spinnerStyles} />
        {message && (
          <p style={{
            marginTop: '16px',
            color: colors.utility.primaryText,
            fontSize: size === 'small' ? '12px' : size === 'medium' ? '14px' : '16px',
            fontWeight: 500,
          }}>
            {message}
          </p>
        )}
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </>
  );
};

// Button Loader Component
export const ButtonLoader: React.FC<{ color?: string }> = ({ color = '#ffffff' }) => {
  return (
    <div style={{
      display: 'inline-block',
      width: '16px',
      height: '16px',
      border: `2px solid ${color}`,
      borderRadius: '50%',
      borderTopColor: 'transparent',
      animation: 'spin 0.8s linear infinite',
    }} />
  );
};

export default Loader;