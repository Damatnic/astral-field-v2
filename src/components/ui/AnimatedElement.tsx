'use client';

import React from 'react';
import { motion, HTMLMotionProps, Variants } from 'framer-motion';
import { 
  fadeInUp, 
  scaleIn, 
  slideInLeft, 
  slideInRight, 
  cardVariants,
  floatingVariants,
  pulseVariants,
  glowVariants,
  animationPresets
} from '@/lib/animations';

type AnimationType = 
  | 'fadeInUp'
  | 'scaleIn'
  | 'slideInLeft'
  | 'slideInRight'
  | 'card'
  | 'floating'
  | 'pulse'
  | 'glow'
  | 'pageEntry'
  | 'custom';

interface AnimatedElementProps extends Omit<HTMLMotionProps<'div'>, 'variants'> {
  animation?: AnimationType;
  delay?: number;
  duration?: number;
  children: React.ReactNode;
  className?: string;
  as?: keyof typeof motion;
  customVariants?: Variants;
  hover?: boolean;
  stagger?: boolean;
  viewport?: boolean; // Whether to animate when in viewport
  once?: boolean; // Whether to animate only once
}

const AnimatedElement: React.FC<AnimatedElementProps> = ({
  animation = 'fadeInUp',
  delay = 0,
  duration,
  children,
  className = '',
  as = 'div',
  customVariants,
  hover = false,
  stagger = false,
  viewport = true,
  once = true,
  ...props
}) => {
  // Get the appropriate motion component
  const MotionComponent = motion[as];

  // Select animation variants
  const getVariants = (): Variants => {
    if (animation === 'custom' && customVariants) {
      return customVariants;
    }

    const variantMap = {
      fadeInUp,
      scaleIn,
      slideInLeft,
      slideInRight,
      card: cardVariants,
      floating: floatingVariants,
      pulse: pulseVariants,
      glow: glowVariants,
      pageEntry: animationPresets.pageEntry
    };

    return variantMap[animation] || fadeInUp;
  };

  const variants = getVariants();

  // Apply custom duration and delay if provided
  const customizedVariants: Variants = {
    ...variants,
    animate: {
      ...variants.animate,
      transition: {
        ...variants.animate?.transition,
        ...(duration && { duration }),
        ...(delay && { delay })
      }
    }
  };

  // Stagger container variants
  const staggerContainerVariants: Variants = {
    animate: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: delay
      }
    }
  };

  const containerVariants = stagger ? staggerContainerVariants : customizedVariants;

  return (
    <MotionComponent
      className={className}
      variants={containerVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      whileHover={hover ? "hover" : undefined}
      viewport={viewport ? { once, amount: 0.3 } : undefined}
      {...(viewport && { whileInView: "animate" })}
      {...props}
    >
      {children}
    </MotionComponent>
  );
};

// Preset animated components for common use cases
export const AnimatedCard: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="card" hover {...props} />
);

export const AnimatedButton: React.FC<Omit<AnimatedElementProps, 'animation' | 'as'>> = (props) => (
  <AnimatedElement animation="scaleIn" as="button" hover {...props} />
);

export const AnimatedList: React.FC<Omit<AnimatedElementProps, 'animation' | 'stagger'>> = (props) => (
  <AnimatedElement animation="fadeInUp" stagger {...props} />
);

export const FloatingElement: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="floating" {...props} />
);

export const PulsingElement: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="pulse" {...props} />
);

export const GlowingElement: React.FC<Omit<AnimatedElementProps, 'animation'>> = (props) => (
  <AnimatedElement animation="glow" {...props} />
);

// Page transition wrapper
export const PageTransition: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <AnimatedElement
    animation="pageEntry"
    className={`min-h-screen ${className}`}
    stagger
  >
    {children}
  </AnimatedElement>
);

// Intersection observer hook for scroll-triggered animations
export const useScrollAnimation = () => {
  return {
    initial: { opacity: 0, y: 50 },
    whileInView: { opacity: 1, y: 0 },
    viewport: { once: true, amount: 0.3 },
    transition: { duration: 0.6, ease: "easeOut" }
  };
};

// Stagger children helper
export const StaggerContainer: React.FC<{
  children: React.ReactNode;
  className?: string;
  delay?: number;
  staggerDelay?: number;
}> = ({ children, className = '', delay = 0, staggerDelay = 0.1 }) => (
  <motion.div
    className={className}
    initial="initial"
    animate="animate"
    variants={{
      animate: {
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: delay
        }
      }
    }}
  >
    {children}
  </motion.div>
);

// Individual stagger item
export const StaggerItem: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className = '' }) => (
  <motion.div
    className={className}
    variants={{
      initial: { opacity: 0, y: 20 },
      animate: { 
        opacity: 1, 
        y: 0,
        transition: { duration: 0.5, ease: "easeOut" }
      }
    }}
  >
    {children}
  </motion.div>
);

export default AnimatedElement;