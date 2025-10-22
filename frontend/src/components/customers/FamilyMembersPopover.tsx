// frontend/src/components/customers/FamilyMembersPopover.tsx
// Reusable popover component to display family members when hovering over family badge

import React, { useState, useEffect, useRef } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { useFamilyMembers } from '../../hooks/useCustomers';

interface FamilyMembersPopoverProps {
  familyCode: string;
  isFamilyHead: boolean;
  children: React.ReactNode;
}

const FamilyMembersPopover: React.FC<FamilyMembersPopoverProps> = ({
  familyCode,
  isFamilyHead,
  children
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [isHovered, setIsHovered] = useState(false);
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLDivElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch family members when hovered
  const { data: familyData, isLoading } = useFamilyMembers(familyCode, isHovered);
  const members = familyData?.members || [];

  const handleMouseEnter = () => {
    // Delay showing popover by 300ms to avoid accidental triggers
    hoverTimeoutRef.current = setTimeout(() => {
      setIsHovered(true);

      // Calculate position
      if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const scrollY = window.scrollY || document.documentElement.scrollTop;
        const scrollX = window.scrollX || document.documentElement.scrollLeft;

        // Position popover below the trigger element
        setPosition({
          top: rect.bottom + scrollY + 8,
          left: rect.left + scrollX
        });
      }
    }, 300);
  };

  const handleMouseLeave = () => {
    // Clear timeout if mouse leaves before delay
    if (hoverTimeoutRef.current) {
      clearTimeout(hoverTimeoutRef.current);
      hoverTimeoutRef.current = null;
    }

    // Delay hiding to allow moving mouse to popover
    setTimeout(() => {
      if (popoverRef.current && !popoverRef.current.matches(':hover') &&
          triggerRef.current && !triggerRef.current.matches(':hover')) {
        setIsHovered(false);
      }
    }, 100);
  };

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (hoverTimeoutRef.current) {
        clearTimeout(hoverTimeoutRef.current);
      }
    };
  }, []);

  // Close popover when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        popoverRef.current &&
        triggerRef.current &&
        !popoverRef.current.contains(event.target as Node) &&
        !triggerRef.current.contains(event.target as Node)
      ) {
        setIsHovered(false);
      }
    };

    if (isHovered) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isHovered]);

  return (
    <>
      {/* Trigger element */}
      <div
        ref={triggerRef}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{ display: 'inline-block' }}
      >
        {children}
      </div>

      {/* Popover */}
      {isHovered && position && (
        <div
          ref={popoverRef}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={handleMouseLeave}
          style={{
            position: 'absolute',
            top: `${position.top}px`,
            left: `${position.left}px`,
            zIndex: 10000,
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}20`,
            borderRadius: '8px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
            padding: '12px',
            minWidth: '280px',
            maxWidth: '320px',
            animation: 'fadeIn 0.15s ease-out'
          }}
        >
          {/* Header */}
          <div style={{
            paddingBottom: '8px',
            marginBottom: '8px',
            borderBottom: `1px solid ${colors.utility.primaryText}10`
          }}>
            <div style={{
              fontSize: '13px',
              fontWeight: '600',
              color: colors.utility.primaryText,
              marginBottom: '4px'
            }}>
              Family {familyCode}
            </div>
            <div style={{
              fontSize: '11px',
              color: colors.utility.secondaryText
            }}>
              {isLoading ? 'Loading...' : `${members.length} ${members.length === 1 ? 'member' : 'members'}`}
            </div>
          </div>

          {/* Members list */}
          {isLoading ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              Loading family members...
            </div>
          ) : members.length === 0 ? (
            <div style={{
              padding: '12px',
              textAlign: 'center',
              fontSize: '12px',
              color: colors.utility.secondaryText
            }}>
              No family members found
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {members.map((member, index) => (
                <div
                  key={member.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 8px',
                    borderRadius: '4px',
                    backgroundColor: member.is_family_head
                      ? colors.brand.primary + '10'
                      : colors.utility.secondaryBackground,
                    fontSize: '12px'
                  }}
                >
                  {/* Member icon */}
                  <div style={{
                    width: '24px',
                    height: '24px',
                    borderRadius: '50%',
                    backgroundColor: member.is_family_head
                      ? colors.brand.primary
                      : colors.utility.primaryText + '20',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: member.is_family_head ? 'white' : colors.utility.primaryText,
                    fontSize: '10px',
                    fontWeight: '600',
                    flexShrink: 0
                  }}>
                    {member.is_family_head ? 'H' : index}
                  </div>

                  {/* Member details */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: '12px',
                      fontWeight: member.is_family_head ? '600' : '500',
                      color: colors.utility.primaryText,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}>
                      {member.name}
                      {member.is_family_head && (
                        <span style={{
                          marginLeft: '4px',
                          fontSize: '10px',
                          color: colors.brand.primary,
                          fontWeight: '500'
                        }}>
                          (Head)
                        </span>
                      )}
                    </div>
                    <div style={{
                      fontSize: '10px',
                      color: colors.utility.secondaryText,
                      fontFamily: 'monospace'
                    }}>
                      IW: {member.iwell_code}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Animation styles */}
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-4px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  );
};

export default FamilyMembersPopover;
