import React from 'react';

// Bar colours: yours is green, the people you're watching with are blue.
export const YOUR_BAR_COLOR = '#22c55e';
export const PARTNER_BAR_COLOR = '#60a5fa';

// A plain progress bar. percent is 0-100.
// - trackColor: the unfilled part (the default suits dark backgrounds; use e.g. '#d1d5db' on light ones)
// - height: thickness in pixels
export const ProgressBar = ({ percent, color = YOUR_BAR_COLOR, trackColor = 'rgba(255, 255, 255, 0.3)', height = 6 }) => {
  const safePercent = Math.max(0, Math.min(percent || 0, 100));
  return (
    <div
      role="progressbar"
      aria-valuenow={safePercent}
      aria-valuemin={0}
      aria-valuemax={100}
      style={{ flex: 1, minWidth: 0, height, borderRadius: 9999, backgroundColor: trackColor, overflow: 'hidden' }}
    >
      <div
        style={{
          width: `${safePercent}%`,
          height: '100%',
          borderRadius: 9999,
          backgroundColor: color,
          transition: 'width 0.3s ease',
        }}
      />
    </div>
  );
};

// One line on a card: name, bar, season/episode. Hovering shows the percentage.
// percent may be null (episode count unknown), in which case there's no bar.
export const ProgressRow = ({ label, season, episode, percent, color, bold = false }) => (
  <div className="flex items-center gap-2" title={percent !== null ? `${label}: ${percent}% watched` : label}>
    <span
      className={`truncate ${bold ? 'font-semibold' : 'opacity-90'}`}
      style={{ width: '3.5rem', flexShrink: 0 }}
    >
      {label}
    </span>
    {percent !== null ? <ProgressBar percent={percent} color={color} /> : <span style={{ flex: 1 }} />}
    <span style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
      S{season}E{episode}
    </span>
  </div>
);

export default ProgressBar;
