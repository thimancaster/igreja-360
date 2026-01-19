import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

const cardVariants = cva(
  "rounded-xl border transition-all duration-300",
  {
    variants: {
      variant: {
        default: "bg-card text-card-foreground shadow-sm",
        glass: "glass-card text-card-foreground",
        "glass-static": "glass-card-static text-card-foreground",
        elevated: "bg-card text-card-foreground shadow-lg hover:shadow-xl hover:-translate-y-1",
        gradient: "gradient-border text-card-foreground shadow-sm",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface CardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {
  interactive?: boolean;
  hoverLift?: boolean;
  tapScale?: boolean;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, variant, interactive = false, hoverLift = false, tapScale = false, ...props }, ref) => {
    // If interactive features are enabled, use motion.div
    if (interactive || hoverLift || tapScale) {
      return (
        <motion.div
          ref={ref}
          className={cn(cardVariants({ variant, className }))}
          whileHover={hoverLift ? { 
            y: -4,
            transition: { type: "spring", stiffness: 300, damping: 20 }
          } : undefined}
          whileTap={tapScale ? { 
            scale: 0.98,
            transition: { type: "spring", stiffness: 400, damping: 17 }
          } : undefined}
          {...(props as any)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(cardVariants({ variant, className }))}
        {...props}
      />
    );
  }
);
Card.displayName = "Card";

const CardHeader = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
  ),
);
CardHeader.displayName = "CardHeader";

const CardTitle = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLHeadingElement>>(
  ({ className, ...props }, ref) => (
    <h3 ref={ref} className={cn("text-2xl font-semibold leading-none tracking-tight", className)} {...props} />
  ),
);
CardTitle.displayName = "CardTitle";

const CardDescription = React.forwardRef<HTMLParagraphElement, React.HTMLAttributes<HTMLParagraphElement>>(
  ({ className, ...props }, ref) => (
    <p ref={ref} className={cn("text-sm text-muted-foreground", className)} {...props} />
  ),
);
CardDescription.displayName = "CardDescription";

const CardContent = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => <div ref={ref} className={cn("p-6 pt-0", className)} {...props} />,
);
CardContent.displayName = "CardContent";

const CardFooter = React.forwardRef<HTMLDivElement, React.HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cn("flex items-center p-6 pt-0", className)} {...props} />
  ),
);
CardFooter.displayName = "CardFooter";

export { Card, CardHeader, CardFooter, CardTitle, CardDescription, CardContent, cardVariants };
