import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface InstallmentStatusCardProps {
  title: string;
  amount: string;
  count: number;
  countLabel: string;
  icon: LucideIcon;
  borderColor: string;
  textColor: string;
  iconColor: string;
  onClick: () => void;
}

export function InstallmentStatusCard({
  title,
  amount,
  count,
  countLabel,
  icon: Icon,
  borderColor,
  textColor,
  iconColor,
  onClick,
}: InstallmentStatusCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <Card
        className={`cursor-pointer border-l-4 ${borderColor} transition-shadow hover:shadow-md`}
        onClick={onClick}
      >
        <CardContent className="pt-4 pb-4 px-3 sm:px-4">
          <div className="flex items-center justify-between">
            <div className="min-w-0">
              <p className="text-xs sm:text-sm text-muted-foreground truncate">{title}</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold ${textColor} truncate`}>
                {amount}
              </p>
              <p className="text-xs text-muted-foreground mt-0.5 sm:mt-1">
                {count} {countLabel}
              </p>
            </div>
            <Icon className={`h-6 w-6 sm:h-8 sm:w-8 ${iconColor} opacity-50 shrink-0`} />
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
}
