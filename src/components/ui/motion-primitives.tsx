import * as React from "react";
import { motion, HTMLMotionProps, useMotionValue, useTransform, useSpring } from "framer-motion";
import { cn } from "@/lib/utils";

// ============================================
// Ripple Effect Component
// ============================================
interface RippleProps {
  x: number;
  y: number;
  size: number;
}

interface RippleContainerProps {
  children: React.ReactNode;
  className?: string;
  rippleColor?: string;
  disabled?: boolean;
}

export const RippleContainer = React.forwardRef<HTMLDivElement, RippleContainerProps & React.HTMLAttributes<HTMLDivElement>>(
  ({ children, className, rippleColor = "rgba(255, 255, 255, 0.35)", disabled = false, onClick, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLDivElement>) => {
      if (disabled) return;
      
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple = { x, y, size };
      setRipples((prev) => [...prev, newRipple]);

      // Remove ripple after animation
      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);

      onClick?.(e);
    };

    return (
      <div
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        onClick={handleClick}
        {...props}
      >
        {children}
        {ripples.map((ripple, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: ripple.x,
              top: ripple.y,
              width: ripple.size,
              height: ripple.size,
              backgroundColor: rippleColor,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }
);
RippleContainer.displayName = "RippleContainer";

// ============================================
// Motion Button with Scale + Ripple
// ============================================
export interface MotionButtonProps extends Omit<HTMLMotionProps<"button">, "ref" | "children"> {
  children?: React.ReactNode;
  ripple?: boolean;
  rippleColor?: string;
  scaleOnTap?: number;
  scaleOnHover?: number;
}

export const MotionButton = React.forwardRef<HTMLButtonElement, MotionButtonProps>(
  ({ 
    children, 
    className, 
    ripple = true, 
    rippleColor = "rgba(255, 255, 255, 0.35)",
    scaleOnTap = 0.97,
    scaleOnHover = 1.02,
    disabled,
    onClick,
    ...props 
  }, ref) => {
    const [ripples, setRipples] = React.useState<RippleProps[]>([]);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (disabled || !ripple) {
        onClick?.(e);
        return;
      }
      
      const rect = e.currentTarget.getBoundingClientRect();
      const size = Math.max(rect.width, rect.height) * 2;
      const x = e.clientX - rect.left - size / 2;
      const y = e.clientY - rect.top - size / 2;

      const newRipple = { x, y, size };
      setRipples((prev) => [...prev, newRipple]);

      setTimeout(() => {
        setRipples((prev) => prev.slice(1));
      }, 600);

      onClick?.(e);
    };

    return (
      <motion.button
        ref={ref}
        className={cn("relative overflow-hidden", className)}
        whileHover={disabled ? undefined : { scale: scaleOnHover }}
        whileTap={disabled ? undefined : { scale: scaleOnTap }}
        transition={{ type: "spring", stiffness: 400, damping: 17 }}
        onClick={handleClick}
        disabled={disabled}
        {...props}
      >
        {children}
        {ripple && ripples.map((rippleItem, index) => (
          <motion.span
            key={index}
            className="absolute rounded-full pointer-events-none"
            style={{
              left: rippleItem.x,
              top: rippleItem.y,
              width: rippleItem.size,
              height: rippleItem.size,
              backgroundColor: rippleColor,
            }}
            initial={{ scale: 0, opacity: 0.5 }}
            animate={{ scale: 1, opacity: 0 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
          />
        ))}
      </motion.button>
    );
  }
);
MotionButton.displayName = "MotionButton";

// ============================================
// Motion Card with Hover + Tap Effects
// ============================================
export interface MotionCardProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  children?: React.ReactNode;
  hoverLift?: boolean;
  tapScale?: boolean;
  glowOnHover?: boolean;
}

export const MotionCard = React.forwardRef<HTMLDivElement, MotionCardProps>(
  ({ 
    children, 
    className, 
    hoverLift = true, 
    tapScale = true,
    glowOnHover = false,
    ...props 
  }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={cn(
          "transition-shadow duration-300",
          glowOnHover && "hover:shadow-[0_0_20px_rgba(var(--primary-rgb),0.3)]",
          className
        )}
        whileHover={hoverLift ? { 
          y: -4, 
          transition: { type: "spring", stiffness: 300, damping: 20 } 
        } : undefined}
        whileTap={tapScale ? { 
          scale: 0.98,
          transition: { type: "spring", stiffness: 400, damping: 17 }
        } : undefined}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
MotionCard.displayName = "MotionCard";

// ============================================
// Tilt Card with 3D Effect
// ============================================
export interface TiltCardProps extends Omit<HTMLMotionProps<"div">, "ref" | "children"> {
  children?: React.ReactNode;
  tiltAmount?: number;
  perspective?: number;
}

export const TiltCard = React.forwardRef<HTMLDivElement, TiltCardProps>(
  ({ children, className, tiltAmount = 10, perspective = 1000, ...props }, ref) => {
    const x = useMotionValue(0);
    const y = useMotionValue(0);

    const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [tiltAmount, -tiltAmount]), {
      stiffness: 300,
      damping: 30
    });
    const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-tiltAmount, tiltAmount]), {
      stiffness: 300,
      damping: 30
    });

    const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
      const rect = e.currentTarget.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;
      
      x.set((e.clientX - centerX) / rect.width);
      y.set((e.clientY - centerY) / rect.height);
    };

    const handleMouseLeave = () => {
      x.set(0);
      y.set(0);
    };

    return (
      <div style={{ perspective }}>
        <motion.div
          ref={ref}
          className={className}
          style={{
            rotateX,
            rotateY,
            transformStyle: "preserve-3d"
          }}
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
          {...props}
        >
          {children}
        </motion.div>
      </div>
    );
  }
);
TiltCard.displayName = "TiltCard";

// ============================================
// Pulse Animation Wrapper
// ============================================
export const PulseWrapper = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        animate={{
          scale: [1, 1.02, 1],
        }}
        transition={{
          duration: 2,
          repeat: Infinity,
          ease: "easeInOut"
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
PulseWrapper.displayName = "PulseWrapper";

// ============================================
// Stagger Container for Children
// ============================================
interface StaggerContainerProps extends HTMLMotionProps<"div"> {
  staggerDelay?: number;
}

export const StaggerContainer = React.forwardRef<HTMLDivElement, StaggerContainerProps>(
  ({ children, className, staggerDelay = 0.1, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: {
              staggerChildren: staggerDelay
            }
          }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerContainer.displayName = "StaggerContainer";

export const StaggerItem = React.forwardRef<HTMLDivElement, HTMLMotionProps<"div">>(
  ({ children, className, ...props }, ref) => {
    return (
      <motion.div
        ref={ref}
        className={className}
        variants={{
          hidden: { opacity: 0, y: 20 },
          visible: { 
            opacity: 1, 
            y: 0,
            transition: { type: "spring", stiffness: 300, damping: 24 }
          }
        }}
        {...props}
      >
        {children}
      </motion.div>
    );
  }
);
StaggerItem.displayName = "StaggerItem";
