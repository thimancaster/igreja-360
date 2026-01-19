import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { motion, HTMLMotionProps } from "framer-motion";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0 relative overflow-hidden",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90",
        outline: "border border-input bg-background hover:bg-accent hover:text-accent-foreground",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost: "hover:bg-accent hover:text-accent-foreground",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-9 rounded-md px-3",
        lg: "h-11 rounded-md px-8",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

interface RippleProps {
  x: number;
  y: number;
  size: number;
}

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  ripple?: boolean;
  animate?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ripple = true, animate = true, onClick, disabled, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || !ripple) {
        onClick?.(e);
        return;
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const rippleSize = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - rippleSize / 2;
      const y = e.clientY - rect.top - rippleSize / 2;

      const newRipple = { x, y, size: rippleSize };
      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);

      onClick?.(e);
    };

    // Determine ripple color based on variant
    const getRippleColor = () => {
      switch (variant) {
        case 'default':
        case 'destructive':
          return 'rgba(255, 255, 255, 0.35)';
        case 'outline':
        case 'secondary':
        case 'ghost':
          return 'rgba(0, 0, 0, 0.1)';
        default:
          return 'rgba(255, 255, 255, 0.35)';
      }
    };

    if (asChild) {
      return <Slot className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
    }

    if (!animate) {
      return (
        <button 
          className={cn(buttonVariants({ variant, size, className }))} 
          ref={ref} 
          onClick={onClick}
          disabled={disabled}
          {...props} 
        />
      );
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        disabled={disabled}
        whileHover={disabled ? undefined : { scale: 1.02 }}
        whileTap={disabled ? undefined : { scale: 0.97 }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        {...(props as any)}
      >
        {props.children}
        {ripple && ripples.map((rippleItem, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: rippleItem.x,
              top: rippleItem.y,
              width: rippleItem.size,
              height: rippleItem.size,
              backgroundColor: getRippleColor(),
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </motion.button>
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
