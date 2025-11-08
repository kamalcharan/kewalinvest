// frontend/src/components/jtbd/CelebrationCards.tsx
// Birthday and Anniversary cards - UI only, to be integrated with Jobs framework later

import React from 'react';
import { Cake, Heart } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';

interface CelebrationCardProps {
  name: string;
  date: string; // Format: "DD MMM" e.g., "15 Dec"
  daysUntil: number;
}

export const BirthdayCard: React.FC<CelebrationCardProps> = ({ name, date, daysUntil }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Warm gold/orange tones for birthday
  const birthdayColor = '#F59E0B'; // Amber
  const birthdayBgColor = '#FEF3C7'; // Light amber

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${birthdayColor}30`,
        borderLeft: `4px solid ${birthdayColor}`,
        borderRadius: '8px',
        padding: '12px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px ${birthdayColor}30`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Decorative background pattern */}
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontSize: '80px',
        opacity: 0.05,
        transform: 'rotate(-15deg)'
      }}>
        🎂
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
        {/* Birthday Icon */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: birthdayBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: birthdayColor,
          flexShrink: 0
        }}>
          <Cake size={16} />
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {name}'s Birthday 🎉
          </h3>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '1px' }}>
            Celebration
          </div>
        </div>

        {/* Days Until Badge */}
        <div style={{
          padding: '3px 8px',
          borderRadius: '4px',
          backgroundColor: birthdayColor + '20',
          border: `1px solid ${birthdayColor}40`,
          fontSize: '10px',
          fontWeight: '600',
          color: birthdayColor,
          flexShrink: 0
        }}>
          {daysUntil === 0 ? 'TODAY' : `IN ${daysUntil} DAY${daysUntil > 1 ? 'S' : ''}`}
        </div>
      </div>

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '12px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: colors.utility.primaryText,
          fontWeight: '500'
        }}>
          📅 {date}
        </div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          fontStyle: 'italic',
          padding: '8px',
          backgroundColor: birthdayColor + '10',
          borderRadius: '6px',
          border: `1px dashed ${birthdayColor}30`
        }}>
          📝 To be integrated with Jobs framework later
        </div>
      </div>
    </div>
  );
};

export const AnniversaryCard: React.FC<CelebrationCardProps> = ({ name, date, daysUntil }) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Romantic pink/rose tones for anniversary
  const anniversaryColor = '#EC4899'; // Pink
  const anniversaryBgColor = '#FCE7F3'; // Light pink

  return (
    <div
      style={{
        backgroundColor: colors.utility.secondaryBackground,
        border: `1px solid ${anniversaryColor}30`,
        borderLeft: `4px solid ${anniversaryColor}`,
        borderRadius: '8px',
        padding: '12px',
        transition: 'all 0.2s',
        cursor: 'pointer',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.boxShadow = `0 2px 8px ${anniversaryColor}30`;
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.boxShadow = 'none';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {/* Decorative background pattern */}
      <div style={{
        position: 'absolute',
        top: '-10px',
        right: '-10px',
        fontSize: '80px',
        opacity: 0.05,
        transform: 'rotate(-15deg)'
      }}>
        💍
      </div>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px', position: 'relative', zIndex: 1 }}>
        {/* Anniversary Icon */}
        <div style={{
          width: '28px',
          height: '28px',
          borderRadius: '6px',
          backgroundColor: anniversaryBgColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: anniversaryColor,
          flexShrink: 0
        }}>
          <Heart size={16} />
        </div>

        {/* Title */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3 style={{
            margin: 0,
            fontSize: '14px',
            fontWeight: '600',
            color: colors.utility.primaryText,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {name}'s Anniversary 💕
          </h3>
          <div style={{ fontSize: '11px', color: colors.utility.secondaryText, marginTop: '1px' }}>
            Celebration
          </div>
        </div>

        {/* Days Until Badge */}
        <div style={{
          padding: '3px 8px',
          borderRadius: '4px',
          backgroundColor: anniversaryColor + '20',
          border: `1px solid ${anniversaryColor}40`,
          fontSize: '10px',
          fontWeight: '600',
          color: anniversaryColor,
          flexShrink: 0
        }}>
          {daysUntil === 0 ? 'TODAY' : `IN ${daysUntil} DAY${daysUntil > 1 ? 'S' : ''}`}
        </div>
      </div>

      {/* Content */}
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        fontSize: '12px',
        position: 'relative',
        zIndex: 1
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          color: colors.utility.primaryText,
          fontWeight: '500'
        }}>
          📅 {date}
        </div>
        <div style={{
          fontSize: '11px',
          color: colors.utility.secondaryText,
          fontStyle: 'italic',
          padding: '8px',
          backgroundColor: anniversaryColor + '10',
          borderRadius: '6px',
          border: `1px dashed ${anniversaryColor}30`
        }}>
          📝 To be integrated with Jobs framework later
        </div>
      </div>
    </div>
  );
};
