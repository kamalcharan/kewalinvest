// frontend/src/components/jtbd/common/PrioritySelector.tsx

import React from 'react';
import { useTheme } from '../../../contexts/ThemeContext';
import RadioButtonCard from './RadioButtonCard';

interface PrioritySelectorProps {
  value: 'critical' | 'high' | 'medium' | 'low';
  onChange: (priority: 'critical' | 'high' | 'medium' | 'low') => void;
  disabled?: boolean;
}

const PrioritySelector: React.FC<PrioritySelectorProps> = ({
  value,
  onChange,
  disabled = false
}) => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const priorities = [
    {
      value: 'critical' as const,
      label: 'Critical',
      description: 'Immediate attention required',
      icon: '🔴',
      color: '#DC2626'
    },
    {
      value: 'high' as const,
      label: 'High',
      description: 'Important, act soon',
      icon: '🟠',
      color: '#F97316'
    },
    {
      value: 'medium' as const,
      label: 'Medium',
      description: 'Standard priority',
      icon: '🟡',
      color: '#F59E0B',
      badge: 'Default'
    },
    {
      value: 'low' as const,
      label: 'Low',
      description: 'For information',
      icon: '🟢',
      color: '#10B981'
    }
  ];

  return (
    <div>
      <label
        style={{
          display: 'block',
          fontSize: '14px',
          fontWeight: '500',
          color: colors.utility.primaryText,
          marginBottom: '12px'
        }}
      >
        Priority Level
      </label>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '12px'
        }}
      >
        {priorities.map((priority) => (
          <RadioButtonCard
            key={priority.value}
            id={`priority-${priority.value}`}
            value={priority.value}
            label={priority.label}
            description={priority.description}
            icon={
              <span style={{ fontSize: '20px' }}>
                {priority.icon}
              </span>
            }
            isSelected={value === priority.value}
            onChange={(val) => onChange(val as 'critical' | 'high' | 'medium' | 'low')}
            disabled={disabled}
            accentColor={priority.color}
            badge={priority.badge}
          />
        ))}
      </div>
    </div>
  );
};

export default PrioritySelector;