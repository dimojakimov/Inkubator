interface GaugeProps {
  value: number;
  min: number;
  max: number;
  target: number;
  targetRange?: [number, number];
  unit: string;
  label: string;
  size?: number;
  colorOk?: string;
  colorWarn?: string;
}

export default function GaugeMeter({
  value,
  min,
  max,
  target,
  targetRange,
  unit,
  label,
  size = 120,
  colorOk = "#437A22",
  colorWarn = "#C55700",
}: GaugeProps) {
  const r = 44;
  const cx = 60, cy = 60;
  const circumference = 2 * Math.PI * r;
  const range = max - min;
  const pct = Math.min(Math.max((value - min) / range, 0), 1);
  const dashOffset = circumference * (1 - pct);

  const isOk = targetRange
    ? value >= targetRange[0] && value <= targetRange[1]
    : Math.abs(value - target) <= 0.5;

  const color = isOk ? colorOk : colorWarn;
  const strokeBg = "rgba(128,128,128,0.15)";

  // Needle angle: -130deg to +130deg
  const angle = -130 + pct * 260;
  const needleRad = (angle * Math.PI) / 180;
  const nx = cx + 32 * Math.sin(needleRad);
  const ny = cy - 32 * Math.cos(needleRad);

  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={size} height={size} viewBox="0 0 120 120">
        {/* Background arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={strokeBg}
          strokeWidth="10"
          strokeDasharray={`${circumference * 0.722} ${circumference * 0.278}`}
          strokeDashoffset={circumference * 0.139}
          strokeLinecap="round"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Value arc */}
        <circle
          cx={cx} cy={cy} r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeDasharray={`${circumference * 0.722 * pct} ${circumference}`}
          strokeDashoffset={circumference * 0.139}
          strokeLinecap="round"
          className="gauge-ring"
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        {/* Needle */}
        <line x1={cx} y1={cy} x2={nx} y2={ny} stroke={color} strokeWidth="2.5" strokeLinecap="round" />
        <circle cx={cx} cy={cy} r="4" fill={color} />
        {/* Value text */}
        <text x={cx} y={cy + 14} textAnchor="middle" fontSize="15" fontWeight="700" fill={color}>
          {value.toFixed(1)}{unit}
        </text>
      </svg>
      <span className="text-xs text-muted-foreground font-medium">{label}</span>
      {!isOk && (
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ background: colorWarn + "22", color: colorWarn }}>
          ⚠ Надвор од опсег
        </span>
      )}
    </div>
  );
}
