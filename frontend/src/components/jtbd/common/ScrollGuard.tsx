// frontend/src/components/jtbd/common/ScrollGuard.tsx

import React, { useRef, useState, useEffect } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';

interface ScrollGuardProps {
  children: React.ReactNode;
  onScrollComplete: (completed: boolean) => void;
  threshold?: number; // Pixels from bottom to consider "scrolled"
  disabled?: boolean;
}

const ScrollGuard: React.FC<ScrollGuardProps> = ({
  children,
  onScrollComplete,
  threshold = 50,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);
  const [showScrollIndicator, setShowScrollIndicator] = useState(true);

  useEffect(() => {
    if (disabled) {
      setHasScrolledToBottom(true);
      onScrollComplete(true);
      return;
    }

    const checkIfScrollable = () => {
      const container = scrollContainerRef.current;
      if (!container) return;

      const isScrollable = container.scrollHeight > container.clientHeight;
      
      if (!isScrollable) {
        // Content fits without scrolling
        setHasScrolledToBottom(true);
        setShowScrollIndicator(false);
        onScrollComplete(true);
      } else {
        setShowScrollIndicator(true);
      }
    };

    checkIfScrollable();
    
    // Check again if content changes
    const observer = new ResizeObserver(checkIfScrollable);
    if (scrollContainerRef.current) {
      observer.observe(scrollContainerRef.current);
    }

    return () => observer.disconnect();
  }, [disabled, onScrollComplete]);

  const handleScroll = () => {
    const container = scrollContainerRef.current;
    if (!container || disabled) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const distanceFromBottom = scrollHeight - scrollTop - clientHeight;

    if (distanceFromBottom <= threshold) {
      setHasScrolledToBottom(true);
      setShowScrollIndicator(false);
      onScrollComplete(true);
    }
  };

  // Arrow icon
  const ArrowDownIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <polyline points="6,9 12,15 18,9" />
    </svg>
  );

  return (
    <div style={{ position: 'relative', height: '100%', display: 'flex', flexDirection: 'column' }}>
      {/* Scrollable Content */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        style={{
          flex: 1,
          overflowY: 'auto',
          overflowX: 'hidden',
          padding: '16px'
        }}
      >
        {children}
      </div>

      {/* Scroll Indicator - Sticky at bottom */}
      {showScrollIndicator && !hasScrolledToBottom && (
        <div
          style={{
            position: 'sticky',
            bottom: 0,
            left: 0,
            right: 0,
            padding: '16px',
            background: `linear-gradient(to top, ${colors.utility.primaryBackground} 70%, transparent)`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            pointerEvents: 'none',
            animation: 'bounce 2s infinite'
          }}
        >
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '8px 16px',
            backgroundColor: colors.brand.primary,
            color: 'white',
            borderRadius: '20px',
            fontSize: '12px',
            fontWeight: '500',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)'
          }}>
            <span>Scroll to review all options</span>
            <ArrowDownIcon />
          </div>
        </div>
      )}

      {/* CSS Animation */}
      <style>{`
        @keyframes bounce {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-10px);
          }
        }
      `}</style>
    </div>
  );
};

export default ScrollGuard;