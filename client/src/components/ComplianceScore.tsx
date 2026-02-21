import { Progress } from "@/components/ui/progress";
import { cn } from "@/lib/utils";

interface ComplianceScoreProps {
    score: number | null;
    label: string;
    className?: string;
    size?: "sm" | "md" | "lg";
}

export function ComplianceScore({ score, label, className, size = "md" }: ComplianceScoreProps) {
    const safeScore = score ?? 0;

    const getStatusColor = (s: number) => {
        if (s >= 80) return "bg-green-500";
        if (s >= 60) return "bg-yellow-500";
        if (s > 0) return "bg-red-500";
        return "bg-slate-700";
    };

    const statusColor = getStatusColor(safeScore);

    const sizeClasses = {
        sm: "h-1 text-[10px]",
        md: "h-2 text-xs",
        lg: "h-3 text-sm"
    };

    if (score === null || score === undefined) {
        return (
            <div className={cn("space-y-1 opacity-50", className)}>
                <div className="flex justify-between items-center text-slate-500 font-medium">
                    <span>{label}</span>
                    <span>N/A</span>
                </div>
                <Progress value={0} className={cn(sizeClasses[size], "bg-slate-800")} />
            </div>
        );
    }

    return (
        <div className={cn("space-y-1.5", className)}>
            <div className="flex justify-between items-center">
                <span className="text-slate-400 font-medium text-xs uppercase tracking-wider">{label}</span>
                <span className={cn("font-bold font-mono", safeScore >= 80 ? "text-green-400" : safeScore >= 60 ? "text-yellow-400" : "text-red-400")}>
                    {safeScore}%
                </span>
            </div>
            <Progress
                value={safeScore}
                className={cn(sizeClasses[size], "bg-slate-800")}
                // @ts-ignore - indicatorClassName is not in standard Radix progress but often added in Shadcn
                indicatorClassName={statusColor}
            />
        </div>
    );
}
