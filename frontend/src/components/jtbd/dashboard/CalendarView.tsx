// frontend/src/components/jtbd/dashboard/CalendarView.tsx

import React, { useMemo } from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import { AlertsByDate } from '../../../types/jtbd.types';

interface CalendarViewProps {
  alertsByDate: AlertsByDate[];
  onDateClick: (date: string) => void;
  currentMonth: Date;
}

const CalendarView: React.FC<CalendarViewProps> = ({
  alertsByDate,
  onDateClick,
  currentMonth
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  // Generate calendar grid
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();

    // First day of month
    const firstDay = new Date(year, month, 1);
    const firstDayOfWeek = firstDay.getDay(); // 0 = Sunday

    // Last day of month
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Build calendar grid
    const days: Array<{
      date: Date;
      dateString: string;
      isCurrentMonth: boolean;
      isToday: boolean;
      alertCount: number;
    }> = [];

    // Previous month's trailing days
    const prevMonthLastDay = new Date(year, month, 0).getDate();
    for (let i = firstDayOfWeek - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, prevMonthLastDay - i);
      days.push({
        date,
        dateString: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        isToday: false,
        alertCount: 0
      });
    }

    // Current month days
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const dateString = date.toISOString().split('T')[0];
      const alertData = alertsByDate.find(a => a.alert_date === dateString);

      days.push({
        date,
        dateString,
        isCurrentMonth: true,
        isToday: date.getTime() === today.getTime(),
        alertCount: alertData?.alert_count || 0
      });
    }

    // Next month's leading days to complete the grid
    const remainingDays = 42 - days.length; // 6 weeks * 7 days
    for (let day = 1; day <= remainingDays; day++) {
      const date = new Date(year, month + 1, day);
      days.push({
        date,
        dateString: date.toISOString().split('T')[0],
        isCurrentMonth: false,
        isToday: false,
        alertCount: 0
      });
    }

    return days;
  }, [currentMonth, alertsByDate]);

  // Weekday names
  const weekDays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  return (
    <div style={{
      backgroundColor: colors.utility.secondaryBackground,
      borderRadius: '12px',
      padding: '20px',
      border: `1px solid ${colors.utility.primaryText}10`
    }}>
      {/* Month Header */}
      <div style={{
        marginBottom: '20px',
        paddingBottom: '16px',
        borderBottom: `1px solid ${colors.utility.primaryText}10`
      }}>
        <div style={{
          fontSize: '18px',
          fontWeight: '700',
          color: colors.utility.primaryText
        }}>
          {currentMonth.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' })}
        </div>
        <div style={{
          fontSize: '12px',
          color: colors.utility.secondaryText,
          marginTop: '4px'
        }}>
          Click on any date to view alerts
        </div>
      </div>

      {/* Calendar Grid */}
      <div>
        {/* Weekday Headers */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px',
          marginBottom: '8px'
        }}>
          {weekDays.map((day) => (
            <div
              key={day}
              style={{
                textAlign: 'center',
                fontSize: '11px',
                fontWeight: '600',
                color: colors.utility.secondaryText,
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                padding: '8px 0'
              }}
            >
              {day}
            </div>
          ))}
        </div>

        {/* Calendar Days */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px'
        }}>
          {calendarDays.map((day, index) => {
            const hasAlerts = day.alertCount > 0;
            const isClickable = day.isCurrentMonth && hasAlerts;

            return (
              <div
                key={index}
                onClick={() => isClickable && onDateClick(day.dateString)}
                style={{
                  aspectRatio: '1',
                  padding: '8px',
                  backgroundColor: day.isToday 
                    ? colors.brand.primary + '20'
                    : hasAlerts
                    ? colors.semantic.info + '10'
                    : colors.utility.primaryBackground,
                  border: day.isToday
                    ? `2px solid ${colors.brand.primary}`
                    : hasAlerts
                    ? `1px solid ${colors.semantic.info}40`
                    : `1px solid ${colors.utility.primaryText}10`,
                  borderRadius: '8px',
                  cursor: isClickable ? 'pointer' : 'default',
                  opacity: day.isCurrentMonth ? 1 : 0.3,
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative'
                }}
                onMouseEnter={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'scale(1.05)';
                    e.currentTarget.style.boxShadow = `0 2px 8px ${colors.semantic.info}30`;
                  }
                }}
                onMouseLeave={(e) => {
                  if (isClickable) {
                    e.currentTarget.style.transform = 'scale(1)';
                    e.currentTarget.style.boxShadow = 'none';
                  }
                }}
              >
                {/* Day Number */}
                <div style={{
                  fontSize: '14px',
                  fontWeight: day.isToday ? '700' : '600',
                  color: day.isToday
                    ? colors.brand.primary
                    : day.isCurrentMonth
                    ? colors.utility.primaryText
                    : colors.utility.secondaryText,
                  marginBottom: hasAlerts ? '4px' : 0
                }}>
                  {day.date.getDate()}
                </div>

                {/* Alert Count Badge */}
                {hasAlerts && (
                  <div style={{
                    padding: '2px 6px',
                    backgroundColor: colors.semantic.info,
                    borderRadius: '10px',
                    fontSize: '9px',
                    fontWeight: '700',
                    color: 'white'
                  }}>
                    {day.alertCount}
                  </div>
                )}

                {/* Today Indicator */}
                {day.isToday && (
                  <div style={{
                    position: 'absolute',
                    top: '4px',
                    right: '4px',
                    width: '6px',
                    height: '6px',
                    borderRadius: '50%',
                    backgroundColor: colors.brand.primary
                  }} />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Legend */}
      <div style={{
        marginTop: '20px',
        paddingTop: '16px',
        borderTop: `1px solid ${colors.utility.primaryText}10`,
        display: 'flex',
        gap: '16px',
        justifyContent: 'center',
        flexWrap: 'wrap'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.utility.secondaryText }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '4px',
            backgroundColor: colors.brand.primary + '20',
            border: `2px solid ${colors.brand.primary}`
          }} />
          Today
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.utility.secondaryText }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '4px',
            backgroundColor: colors.semantic.info + '10',
            border: `1px solid ${colors.semantic.info}40`
          }} />
          Has Alerts
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '11px', color: colors.utility.secondaryText }}>
          <div style={{
            width: '12px',
            height: '12px',
            borderRadius: '4px',
            backgroundColor: colors.utility.primaryBackground,
            border: `1px solid ${colors.utility.primaryText}10`
          }} />
          No Alerts
        </div>
      </div>
    </div>
  );
};

export default CalendarView;