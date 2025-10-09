import { LucideIcon } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatsCardProps {
  title: string;
  value: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  variant?: "default" | "success" | "warning" | "destructive";
}

const variantStyles = {
  default: "from-primary/10 to-primary/5 border-primary/20",
  success: "from-success/10 to-success/5 border-success/20",
  warning: "from-warning/10 to-warning/5 border-warning/20",
  destructive: "from-destructive/10 to-destructive/5 border-destructive/20",
};

const iconVariantStyles = {
  default: "bg-primary text-primary-foreground",
  success: "bg-success text-success-foreground",
  warning: "bg-warning text-warning-foreground",
  destructive: "bg-destructive text-destructive-foreground",
};

export function StatsCard({ title, value, icon: Icon, trend, variant = "default" }: StatsCardProps) {
  return (
    <Card className={cn("transition-smooth hover:shadow-lg", "bg-gradient-to-br", variantStyles[variant])}>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        <div className={cn("p-2 rounded-lg", iconVariantStyles[variant])}>
          <Icon className="h-4 w-4" />
        </div>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold">{value}</div>
        {trend && (
          <p className={cn("text-xs mt-2", trend.isPositive ? "text-success" : "text-destructive")}>
            {trend.value}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
