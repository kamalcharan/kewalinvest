import React, { useEffect, useState } from 'react';
import { useTheme } from '../../contexts/ThemeContext';
import { PanchangService } from '../../services/panchang.service';
import type { DailyPanchang } from '../../services/panchang.service';

// Returns current time in IST as "HH:MM"
function getCurrentISTTime(): string {
  const now = new Date();
  // IST = UTC + 5:30
  const istMs = now.getTime() + (5.5 * 60 * 60 * 1000);
  const ist = new Date(istMs);
  const h = String(ist.getUTCHours()).padStart(2, '0');
  const m = String(ist.getUTCMinutes()).padStart(2, '0');
  return `${h}:${m}`;
}

// Returns true if timeA (HH:MM) is before timeB (HH:MM)
function isBefore(timeA: string, timeB: string): boolean {
  const [aH, aM] = timeA.split(':').map(Number);
  const [bH, bM] = timeB.split(':').map(Number);
  return aH * 60 + aM < bH * 60 + bM;
}

// Strips seconds from "HH:MM:SS" → "HH:MM"
function toHHMM(timeStr: string): string {
  return timeStr.slice(0, 5);
}

interface TithiDisplay {
  name: string;
  label: string; // "ends HH:MM" or "since HH:MM"
}

function resolveTithi(panchang: DailyPanchang, nowIST: string): TithiDisplay {
  const endTime = toHHMM(panchang.tithi_end_ist);
  if (isBefore(nowIST, endTime)) {
    return { name: panchang.tithi_name, label: `ends ${endTime}` };
  }
  // Tithi has ended — next tithi is active since endTime
  const nextName = panchang.tithi_next_name ?? 'Next Tithi';
  return { name: nextName, label: `since ${endTime}` };
}

function resolveNakshatra(panchang: DailyPanchang, nowIST: string): TithiDisplay {
  const endTime = toHHMM(panchang.nakshatra_end_ist);
  if (isBefore(nowIST, endTime)) {
    return { name: panchang.nakshatra_name, label: `ends ${endTime}` };
  }
  const nextName = panchang.nakshatra_next_name ?? 'Next Nakshatra';
  return { name: nextName, label: `since ${endTime}` };
}

const PanchangamCard: React.FC = () => {
  const { theme, isDarkMode } = useTheme();
  const colors = isDarkMode && theme.darkMode ? theme.darkMode.colors : theme.colors;

  const [panchang, setPanchang] = useState<DailyPanchang | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [nowIST, setNowIST] = useState(getCurrentISTTime());

  useEffect(() => {
    PanchangService.getToday()
      .then(data => setPanchang(data))
      .catch(() => setError('Could not load Panchangam data'))
      .finally(() => setLoading(false));
  }, []);

  // Refresh current IST time every minute so the display stays accurate
  useEffect(() => {
    const id = setInterval(() => setNowIST(getCurrentISTTime()), 60_000);
    return () => clearInterval(id);
  }, []);

  const cardStyle: React.CSSProperties = {
    backgroundColor: colors.utility.primaryBackground,
    border: `1px solid ${colors.utility.secondaryText}30`,
    borderRadius: '12px',
    padding: '16px 20px',
    minWidth: '240px',
  };

  const labelStyle: React.CSSProperties = {
    fontSize: '11px',
    fontWeight: 600,
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
    color: colors.utility.secondaryText,
    marginBottom: '4px',
  };

  const nameStyle: React.CSSProperties = {
    fontSize: '16px',
    fontWeight: 600,
    color: colors.utility.primaryText,
    lineHeight: 1.2,
  };

  const timeStyle: React.CSSProperties = {
    fontSize: '12px',
    color: colors.utility.secondaryText,
    marginTop: '2px',
  };

  if (loading) {
    return (
      <div style={{ ...cardStyle, color: colors.utility.secondaryText, fontSize: '13px' }}>
        Loading Panchangam…
      </div>
    );
  }

  if (error || !panchang) {
    return (
      <div style={{ ...cardStyle, color: colors.utility.secondaryText, fontSize: '13px' }}>
        {error ?? 'No data'}
      </div>
    );
  }

  const tithi = resolveTithi(panchang, nowIST);
  const nakshatra = resolveNakshatra(panchang, nowIST);

  return (
    <div style={cardStyle}>
      <div style={{ display: 'flex', gap: '24px' }}>
        <div>
          <div style={labelStyle}>Tithi</div>
          <div style={nameStyle}>{tithi.name}</div>
          <div style={timeStyle}>{tithi.label}</div>
        </div>
        <div>
          <div style={labelStyle}>Nakshatra</div>
          <div style={nameStyle}>{nakshatra.name}</div>
          <div style={timeStyle}>{nakshatra.label}</div>
        </div>
      </div>
    </div>
  );
};

export default PanchangamCard;
