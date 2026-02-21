import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DollarSign, TrendingDown, Clock, Zap } from "lucide-react";

interface CostEstimationTabProps {
  projectId: number;
}

// CostEstimate interface reserved for future API integration

export default function CostEstimationTab({ projectId: _projectId }: CostEstimationTabProps) {
  const [shotCount, setShotCount] = useState("10");
  const [averageDuration, setAverageDuration] = useState("4");
  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");

  // Pricing structure
  const veo3PricingPerSecond = 0.1;
  const soraPricingPerSecond = 0.15;

  const resolutionMultipliers: Record<string, { veo3: number; sora: number }> = {
    "720p": { veo3: 1.0, sora: 1.0 },
    "1080p": { veo3: 1.5, sora: 1.3 },
    "4k": { veo3: 2.5, sora: 2.0 },
  };

  const estimates = useMemo(() => {
    const shots = parseInt(shotCount) || 0;
    const duration = parseInt(averageDuration) || 4;
    const multipliers = resolutionMultipliers[resolution];

    const veo3PerShot =
      veo3PricingPerSecond * duration * (multipliers?.veo3 || 1);
    const soraPerShot =
      soraPricingPerSecond * duration * (multipliers?.sora || 1) * 1.2; // Quality premium

    const veo3Total = Math.round(veo3PerShot * shots * 100) / 100;
    const soraTotal = Math.round(soraPerShot * shots * 100) / 100;

    const veo3Time = Math.ceil(2 + duration / 10);
    const soraTime = Math.ceil(3 + duration / 10);

    return {
      veo3: {
        provider: "veo3" as const,
        duration,
        resolution,
        totalCost: veo3Total,
        estimatedTime: `${veo3Time} min`,
        costPerShot: Math.round(veo3PerShot * 100) / 100,
      },
      sora: {
        provider: "sora" as const,
        duration,
        resolution,
        totalCost: soraTotal,
        estimatedTime: `${soraTime} min`,
        costPerShot: Math.round(soraPerShot * 100) / 100,
      },
    };
  }, [shotCount, averageDuration, resolution]);

  const savings = Math.abs(estimates.veo3.totalCost - estimates.sora.totalCost);
  const savingsPercent = Math.round(
    (savings / Math.max(estimates.veo3.totalCost, estimates.sora.totalCost)) * 100
  );
  const cheaperProvider =
    estimates.veo3.totalCost < estimates.sora.totalCost ? "veo3" : "sora";

  return (
    <div className="space-y-6">
      {/* Configuration Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Cost Estimation Parameters</CardTitle>
          <CardDescription>Configure your project to see accurate pricing</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                Total Shots
              </label>
              <Input
                type="number"
                min="1"
                max="100"
                value={shotCount}
                onChange={(e) => setShotCount(e.target.value)}
                className="bg-background border-border"
              />
              <p className="text-xs text-muted-foreground mt-1">
                Number of storyboard frames to animate
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                Average Duration
              </label>
              <div className="flex gap-2">
                <Input
                  type="number"
                  min="4"
                  max="60"
                  value={averageDuration}
                  onChange={(e) => setAverageDuration(e.target.value)}
                  className="bg-background border-border"
                />
                <span className="flex items-center text-muted-foreground">sec</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                Per video clip (4-60 seconds)
              </p>
            </div>

            <div>
              <label className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-2 block">
                Resolution
              </label>
              <Select value={resolution} onValueChange={(v: unknown) => setResolution(v)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-card border-border">
                  <SelectItem value="720p">720p</SelectItem>
                  <SelectItem value="1080p">1080p (Recommended)</SelectItem>
                  <SelectItem value="4k">4K</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground mt-1">
                Output video quality
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Cost Comparison */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Veo3 Card */}
        <Card
          className={`border-2 ${cheaperProvider === "veo3"
              ? "border-accent bg-accent/5"
              : "border-border bg-card"
            }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Veo3</CardTitle>
              {cheaperProvider === "veo3" && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-accent/20">
                  <TrendingDown className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold text-accent">
                    {savingsPercent}% Cheaper
                  </span>
                </div>
              )}
            </div>
            <CardDescription>Fast, cost-effective video generation</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Cost per Shot
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${estimates.veo3.costPerShot.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Total Project Cost
                </p>
                <p className="text-3xl font-bold text-accent">
                  ${estimates.veo3.totalCost.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Generation Time</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {estimates.veo3.estimatedTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="text-sm font-semibold text-foreground">High</p>
                </div>
              </div>
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Select Veo3
            </Button>
          </CardContent>
        </Card>

        {/* Sora Card */}
        <Card
          className={`border-2 ${cheaperProvider === "sora"
              ? "border-accent bg-accent/5"
              : "border-border bg-card"
            }`}
        >
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">Sora 2</CardTitle>
              {cheaperProvider === "sora" && (
                <div className="flex items-center gap-1 px-2 py-1 rounded-sm bg-accent/20">
                  <TrendingDown className="w-3 h-3 text-accent" />
                  <span className="text-xs font-bold text-accent">
                    {savingsPercent}% Cheaper
                  </span>
                </div>
              )}
            </div>
            <CardDescription>Premium quality with advanced features</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Cost per Shot
                </p>
                <p className="text-2xl font-bold text-foreground">
                  ${estimates.sora.costPerShot.toFixed(2)}
                </p>
              </div>

              <div>
                <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">
                  Total Project Cost
                </p>
                <p className="text-3xl font-bold text-accent">
                  ${estimates.sora.totalCost.toFixed(2)}
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-3 border-t border-border">
                <div>
                  <p className="text-xs text-muted-foreground">Generation Time</p>
                  <p className="text-sm font-semibold text-foreground flex items-center gap-1 mt-1">
                    <Clock className="w-3 h-3" />
                    {estimates.sora.estimatedTime}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-muted-foreground">Quality</p>
                  <p className="text-sm font-semibold text-foreground">Premium</p>
                </div>
              </div>
            </div>

            <Button className="w-full bg-accent hover:bg-accent/90 text-accent-foreground">
              <Zap className="w-4 h-4 mr-2" />
              Select Sora
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Savings Summary */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-accent" />
            Cost Comparison
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-sm bg-background border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                Veo3 Total
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${estimates.veo3.totalCost.toFixed(2)}
              </p>
            </div>

            <div className="p-4 rounded-sm bg-background border border-border">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                Sora Total
              </p>
              <p className="text-2xl font-bold text-foreground">
                ${estimates.sora.totalCost.toFixed(2)}
              </p>
            </div>

            <div className="p-4 rounded-sm bg-accent/10 border border-accent">
              <p className="text-xs text-muted-foreground uppercase tracking-widest mb-2">
                Potential Savings
              </p>
              <p className="text-2xl font-bold text-accent">
                ${savings.toFixed(2)} ({savingsPercent}%)
              </p>
            </div>
          </div>

          <div className="p-4 rounded-sm bg-background border border-border">
            <p className="text-sm text-foreground">
              <span className="font-semibold">Recommendation:</span> Use{" "}
              <span className="text-accent font-bold">
                {cheaperProvider === "veo3" ? "Veo3" : "Sora"}
              </span>{" "}
              for{" "}
              {cheaperProvider === "veo3"
                ? "faster generation at lower cost"
                : "premium quality output"}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Pricing Details */}
      <Card className="bg-card border-border">
        <CardHeader>
          <CardTitle className="text-lg">Pricing Details</CardTitle>
          <CardDescription>How costs are calculated</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-semibold text-foreground mb-2">Veo3 Pricing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Base: $0.10 per second</li>
                <li>• 720p: 1x multiplier</li>
                <li>• 1080p: 1.5x multiplier</li>
                <li>• 4K: 2.5x multiplier</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-foreground mb-2">Sora 2 Pricing</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Base: $0.15 per second</li>
                <li>• 720p: 1x multiplier</li>
                <li>• 1080p: 1.3x multiplier</li>
                <li>• 4K: 2.0x multiplier</li>
                <li>• Quality Premium: +20%</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
