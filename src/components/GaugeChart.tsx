import { useEffect, useState } from 'react';

interface GaugeChartProps {
  label: string;
  value: number;
  color: 'green' | 'yellow' | 'red';
  suffix?: string;
  meta?: number;
  metaLabel?: string;
  unit?: string;
  // Range-based evaluation (overrides meta-based)
  rangeMode?: boolean;
  rangeMin?: number;
  rangeMax?: number;
  rangeLabel?: string; // label shown instead of ✓/✗
  lowerIsBetter?: boolean; // invert meta comparison (e.g. absentismo)
}

const colorMap = {
  green: 'hsl(142, 71%, 45%)',
  yellow: 'hsl(45, 93%, 58%)',
  red: 'hsl(0, 72%, 51%)',
};

const bgColorMap = {
  green: 'hsla(142, 71%, 45%, 0.12)',
  yellow: 'hsla(45, 93%, 58%, 0.12)',
  red: 'hsla(0, 72%, 51%, 0.12)',
};

function getRangeStatus(value: number, min: number, max: number): { label: string; colorClass: string } {
  if (value >= min && value <= max) return { label: '✓ Óptimo', colorClass: 'status-green' };
  if (value < min) return { label: '⚠ Falta recurso', colorClass: 'status-yellow' };
  return { label: '🔴 Sobresaturado', colorClass: 'status-red' };
}

export default function GaugeChart({ label, value, color, suffix = '%', meta, metaLabel, unit, rangeMode, rangeMin = 55, rangeMax = 72, lowerIsBetter = false }: GaugeChartProps) {
  const [animatedValue, setAnimatedValue] = useState(0);
  
  useEffect(() => {
    const timer = setTimeout(() => setAnimatedValue(value), 100);
    return () => clearTimeout(timer);
  }, [value]);

  const radius = 60;
  const circumference = Math.PI * radius;
  const clampedValue = Math.min(Math.max(animatedValue, 0), 100);
  const offset = circumference - (clampedValue / 100) * circumference;
  const strokeColor = colorMap[color];

  const rangeStatus = rangeMode ? getRangeStatus(value, rangeMin, rangeMax) : null;

  return (
    <div className="dashboard-card flex flex-col items-center justify-center gap-2 min-h-[200px]">
      <div className="relative">
        <svg width="160" height="100" viewBox="0 0 160 100">
          {/* Background arc */}
          <path
            d="M 10 90 A 60 60 0 0 1 150 90"
            fill="none"
            stroke="hsla(220, 10%, 55%, 0.15)"
            strokeWidth="12"
            strokeLinecap="round"
          />
          {/* Value arc */}
          <path
            d="M 10 90 A 60 60 0 0 1 150 90"
            fill="none"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            style={{
              transition: 'stroke-dashoffset 1.5s ease-out, stroke 0.5s ease',
              filter: `drop-shadow(0 0 8px ${bgColorMap[color]})`,
            }}
          />
        </svg>
        <div className="absolute inset-0 flex items-end justify-center pb-1">
          <span
            className="kpi-value text-3xl"
            style={{ color: strokeColor }}
          >
            {animatedValue.toFixed(1)}{suffix}
          </span>
        </div>
      </div>
      <span className="kpi-label text-center">{label}</span>
      {unit && (
        <span className="text-[10px] text-muted-foreground -mt-1">{unit}</span>
      )}
      {rangeMode && rangeStatus && (
        <div className="flex flex-col items-center gap-0.5 mt-1">
          <span className="text-[10px] text-muted-foreground">Rango óptimo: {rangeMin}% – {rangeMax}%</span>
          <span className={`text-xs font-semibold ${rangeStatus.colorClass}`}>{rangeStatus.label}</span>
        </div>
      )}
      {!rangeMode && meta !== undefined && (
        <div className="flex items-center gap-1 text-xs mt-1">
          <span className="text-muted-foreground">Meta: {metaLabel || `${meta}%`}</span>
          <span className={`font-semibold ${(lowerIsBetter ? value <= meta : value >= meta) ? 'status-green' : 'status-red'}`}>
            {(lowerIsBetter ? value <= meta : value >= meta) ? '✓ Cumple' : '✗ Fuera'}
          </span>
        </div>
      )}
    </div>
  );
}
