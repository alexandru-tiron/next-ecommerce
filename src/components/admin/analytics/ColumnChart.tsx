"use client";

import { useEffect, useRef, useState } from "react";
import { compactNumber, niceTicks } from "./aggregate";

export type Column = { key: string; label: string; value: number; detail?: string };

const SERIES = "#2a78d6"; // categorical slot 1 (blue)
const SERIES_HOVER = "#1f5fae";
const GRID = "#e5e7eb";
const MARGIN = { top: 12, right: 8, bottom: 28, left: 44 };

// Rounded 4px data-end at the top, square at the baseline
function columnPath(x: number, y: number, width: number, height: number) {
   const r = Math.min(4, width / 2, height);
   return `M${x},${y + height} V${y + r} Q${x},${y} ${x + r},${y} H${x + width - r} Q${x + width},${y} ${x + width},${y + r} V${y + height} Z`;
}

// Single-series column chart (no legend: the card title names the series), with a hover tooltip per column
const ColumnChart = ({ data, formatValue, height = 240, ariaLabel }: { data: Column[]; formatValue: (value: number) => string; height?: number; ariaLabel: string }) => {
   const containerRef = useRef<HTMLDivElement>(null);
   const [width, setWidth] = useState(0);
   const [hovered, setHovered] = useState<number | null>(null);

   useEffect(() => {
      const element = containerRef.current;
      if (!element) return;
      const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
      observer.observe(element);
      return () => observer.disconnect();
   }, []);

   const innerWidth = Math.max(0, width - MARGIN.left - MARGIN.right);
   const innerHeight = height - MARGIN.top - MARGIN.bottom;
   const ticks = niceTicks(Math.max(...data.map((column) => column.value), 0));
   const top = ticks[ticks.length - 1];
   const band = data.length > 0 ? innerWidth / data.length : 0;
   const barWidth = Math.min(24, band * 0.6);
   const y = (value: number) => MARGIN.top + innerHeight - (value / top) * innerHeight;
   // Show as many x labels as fit (about 56px each)
   const labelEvery = Math.max(1, Math.ceil((data.length * 56) / Math.max(innerWidth, 1)));
   const active = hovered !== null ? data[hovered] : null;

   return (
      <div ref={containerRef} className="relative w-full" style={{ height }}>
         {width > 0 && (
            <svg width={width} height={height} role="img" aria-label={ariaLabel} onMouseLeave={() => setHovered(null)}>
               {ticks.map((tick) => (
                  <g key={tick}>
                     <line x1={MARGIN.left} x2={width - MARGIN.right} y1={y(tick)} y2={y(tick)} stroke={GRID} strokeWidth={1} />
                     <text x={MARGIN.left - 8} y={y(tick)} textAnchor="end" dominantBaseline="middle" className="fill-gray-500 text-[11px] tabular-nums">
                        {compactNumber(tick)}
                     </text>
                  </g>
               ))}
               {data.map((column, index) => {
                  const x = MARGIN.left + index * band;
                  const barHeight = column.value > 0 ? Math.max(1, (column.value / top) * innerHeight) : 0;
                  return (
                     <g key={column.key}>
                        {barHeight > 0 && <path d={columnPath(x + (band - barWidth) / 2, y(column.value), barWidth, barHeight)} fill={hovered === index ? SERIES_HOVER : SERIES} />}
                        {index % labelEvery === 0 && (
                           <text x={x + band / 2} y={height - 8} textAnchor="middle" className="fill-gray-500 text-[11px]">
                              {column.label}
                           </text>
                        )}
                        {/* Hit target: the whole band, taller than the mark */}
                        <rect x={x} y={MARGIN.top} width={band} height={innerHeight} fill="transparent" onMouseEnter={() => setHovered(index)} />
                     </g>
                  );
               })}
            </svg>
         )}
         {active && hovered !== null && (
            <div
               className="pointer-events-none absolute z-10 rounded-md bg-gray-900 text-white text-xs px-3 py-2 shadow-lg whitespace-nowrap -translate-x-1/2"
               style={{ left: Math.min(Math.max(MARGIN.left + hovered * band + band / 2, 70), width - 70), top: Math.max(0, y(active.value) - 56) }}
            >
               <div className="text-gray-300">{active.label}</div>
               <div className="font-semibold">{formatValue(active.value)}</div>
               {active.detail && <div className="text-gray-300">{active.detail}</div>}
            </div>
         )}
      </div>
   );
};

export default ColumnChart;
