import { motion } from 'motion/react';

export interface DonutSegment {
  label: string;
  value: number;
  color: string;
}

interface DonutChartProps {
  segments: DonutSegment[];
  size?: number;
  strokeWidth?: number;
  centerLabel?: string;
  centerSub?: string;
}

export function DonutChart({
  segments,
  size = 140,
  strokeWidth = 18,
  centerLabel,
  centerSub,
}: DonutChartProps) {
  const total = segments.reduce((sum, s) => sum + s.value, 0);
  if (total === 0) return null;

  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  let accumulated = 0;
  const arcs = segments
    .filter((s) => s.value > 0)
    .map((segment) => {
      const fraction = segment.value / total;
      const dashLength = fraction * circumference;
      const gap = circumference - dashLength;
      const offset = -accumulated * circumference + circumference * 0.25;
      accumulated += fraction;

      return {
        ...segment,
        fraction,
        dashArray: `${dashLength} ${gap}`,
        dashOffset: offset,
      };
    });

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          {arcs.map((arc, i) => (
            <motion.circle
              key={arc.label}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={arc.color}
              strokeWidth={strokeWidth}
              strokeDasharray={arc.dashArray}
              strokeDashoffset={arc.dashOffset}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4, delay: i * 0.05, ease: 'easeOut' }}
            />
          ))}
        </svg>

        {(centerLabel || centerSub) && (
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            {centerLabel && (
              <span className="text-sm font-semibold tabular-nums text-white">
                {centerLabel}
              </span>
            )}
            {centerSub && (
              <span className="text-[10px] text-slate-500">{centerSub}</span>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-wrap justify-center gap-x-3 gap-y-1">
        {arcs.map((arc) => (
          <div key={arc.label} className="flex items-center gap-1">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: arc.color }}
            />
            <span className="text-[10px] text-slate-400">
              {arc.label}
              <span className="ml-0.5 text-slate-500">
                {Math.round(arc.fraction * 100)}%
              </span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
