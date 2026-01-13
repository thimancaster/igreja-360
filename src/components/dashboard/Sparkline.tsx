import React from "react";
import { motion } from "framer-motion";

interface SparklineProps {
  data: number[];
  color?: string;
  height?: number;
  width?: number;
  strokeWidth?: number;
  showArea?: boolean;
}

export const Sparkline: React.FC<SparklineProps> = ({
  data,
  color = "hsl(var(--primary))",
  height = 40,
  width = 120,
  strokeWidth = 2,
  showArea = true,
}) => {
  if (!data || data.length < 2) {
    return (
      <div 
        className="flex items-center justify-center text-xs text-muted-foreground"
        style={{ width, height }}
      >
        Sem dados
      </div>
    );
  }

  const padding = 4;
  const effectiveWidth = width - padding * 2;
  const effectiveHeight = height - padding * 2;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  // Calculate points
  const points = data.map((value, index) => {
    const x = padding + (index / (data.length - 1)) * effectiveWidth;
    const y = padding + effectiveHeight - ((value - min) / range) * effectiveHeight;
    return { x, y };
  });

  // Create SVG path
  const pathD = points.reduce((path, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    
    // Smooth curve using quadratic bezier
    const prev = points[index - 1];
    const cpX = (prev.x + point.x) / 2;
    return `${path} Q ${cpX} ${prev.y} ${point.x} ${point.y}`;
  }, "");

  // Area path (for gradient fill)
  const areaPathD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${padding} ${height - padding} Z`;

  // Calculate trend
  const trend = data[data.length - 1] - data[0];
  const trendColor = trend >= 0 ? "hsl(142 76% 36%)" : "hsl(0 84% 60%)";
  const displayColor = color === "auto" ? trendColor : color;

  // Generate unique gradient ID
  const gradientId = `sparkline-gradient-${Math.random().toString(36).substr(2, 9)}`;

  return (
    <motion.svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="overflow-visible"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={displayColor} stopOpacity="0.3" />
          <stop offset="100%" stopColor={displayColor} stopOpacity="0" />
        </linearGradient>
      </defs>

      {/* Area fill */}
      {showArea && (
        <motion.path
          d={areaPathD}
          fill={`url(#${gradientId})`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        />
      )}

      {/* Main line */}
      <motion.path
        d={pathD}
        fill="none"
        stroke={displayColor}
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1.2, ease: "easeOut" }}
      />

      {/* End point dot */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={3}
        fill={displayColor}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 1, duration: 0.3 }}
      />

      {/* Glow effect on end point */}
      <motion.circle
        cx={points[points.length - 1].x}
        cy={points[points.length - 1].y}
        r={6}
        fill={displayColor}
        opacity={0.2}
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 0.2 }}
        transition={{ delay: 1.1, duration: 0.3 }}
      />
    </motion.svg>
  );
};