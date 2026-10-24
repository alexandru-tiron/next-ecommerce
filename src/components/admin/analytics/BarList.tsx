"use client";

import { useState } from "react";

const SERIES = "#2a78d6"; // categorical slot 1 (blue)
const SERIES_HOVER = "#1f5fae";

// Horizontal single-series bars: label, bar from a shared baseline, value at the tip, hover tooltip with the share
const BarList = ({ items, formatValue, emptyLabel }: { items: { label: string; value: number }[]; formatValue: (value: number) => string; emptyLabel: string }) => {
   const [hovered, setHovered] = useState<number | null>(null);
   const max = Math.max(...items.map((item) => item.value), 0);
   const total = items.reduce((acc, item) => acc + item.value, 0);

   if (total === 0) return <p className="text-sm text-gray-500 py-6 text-center">{emptyLabel}</p>;

   return (
      <ul className="space-y-3">
         {items.map((item, index) => (
            <li key={item.label} className="relative grid grid-cols-[minmax(0,9rem)_1fr] items-center gap-3 text-sm" onMouseEnter={() => setHovered(index)} onMouseLeave={() => setHovered(null)}>
               <span className="truncate text-gray-700" title={item.label}>
                  {item.label}
               </span>
               <div className="flex items-center gap-2 min-w-0">
                  <div className="h-3 rounded-r" style={{ width: `${max > 0 ? Math.max((item.value / max) * 80, item.value > 0 ? 1 : 0) : 0}%`, backgroundColor: hovered === index ? SERIES_HOVER : SERIES }} />
                  <span className="text-gray-700 tabular-nums whitespace-nowrap">{formatValue(item.value)}</span>
               </div>
               {hovered === index && (
                  <div className="pointer-events-none absolute right-0 -top-8 z-10 rounded-md bg-gray-900 text-white text-xs px-2 py-1 whitespace-nowrap">
                     {item.label}: {formatValue(item.value)} ({Math.round((item.value / total) * 100)}%)
                  </div>
               )}
            </li>
         ))}
      </ul>
   );
};

export default BarList;
