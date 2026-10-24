import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";
import { twMerge } from "tailwind-merge";

// Label, value and the signed change against the previous period (up is good for every metric shown here)
const StatTile = ({ label, value, change, comparisonLabel }: { label: string; value: string; change: number | null; comparisonLabel: string }) => {
   const Icon = change === null || change === 0 ? Minus : change > 0 ? ArrowUpRight : ArrowDownRight;
   return (
      <div className="bg-white rounded-lg border border-gray-100 p-4">
         <p className="text-sm text-gray-500">{label}</p>
         <p className="mt-1 text-2xl font-semibold text-gray-900">{value}</p>
         <p className={twMerge("mt-1 flex items-center gap-1 text-xs", change === null || change === 0 ? "text-gray-500" : change > 0 ? "text-green-700" : "text-red-700")}>
            <Icon className="w-3.5 h-3.5" />
            {change === null ? "—" : `${change > 0 ? "+" : ""}${change}%`}
            <span className="text-gray-500">{comparisonLabel}</span>
         </p>
      </div>
   );
};

export default StatTile;
