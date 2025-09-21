import React from 'react';

export interface StackProps {
  children: React.ReactNode;
  direction?: 'vertical' | 'horizontal';
  spacing?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
  align?: 'start' | 'center' | 'end' | 'stretch';
  justify?: 'start' | 'center' | 'end' | 'between' | 'around' | 'evenly';
  wrap?: boolean;
  divider?: React.ReactNode;
  responsive?: {
    sm?: Partial<Pick<StackProps, 'direction' | 'spacing' | 'align' | 'justify'>>;
    md?: Partial<Pick<StackProps, 'direction' | 'spacing' | 'align' | 'justify'>>;
    lg?: Partial<Pick<StackProps, 'direction' | 'spacing' | 'align' | 'justify'>>;
  };
  className?: string;
}

export function Stack({
  children,
  direction = 'vertical',
  spacing = 'md',
  align = 'stretch',
  justify = 'start',
  wrap = false,
  divider,
  responsive,
  className = ''
}: StackProps) {
  const isVertical = direction === 'vertical';
  
  const baseClasses = 'flex';
  
  const directionClass = isVertical ? 'flex-col' : 'flex-row';
  
  const spacingClasses = {
    none: isVertical ? 'space-y-0' : 'space-x-0',
    xs: isVertical ? 'space-y-1' : 'space-x-1',
    sm: isVertical ? 'space-y-2' : 'space-x-2',
    md: isVertical ? 'space-y-4' : 'space-x-4',
    lg: isVertical ? 'space-y-6' : 'space-x-6',
    xl: isVertical ? 'space-y-8' : 'space-x-8',
    '2xl': isVertical ? 'space-y-12' : 'space-x-12'
  };

  const alignClasses = {
    start: 'items-start',
    center: 'items-center',
    end: 'items-end',
    stretch: 'items-stretch'
  };

  const justifyClasses = {
    start: 'justify-start',
    center: 'justify-center',
    end: 'justify-end',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const wrapClass = wrap ? 'flex-wrap' : 'flex-nowrap';

  const responsiveClasses = responsive ? [
    responsive.sm?.direction && (responsive.sm.direction === 'vertical' ? 'sm:flex-col' : 'sm:flex-row'),
    responsive.sm?.align && `sm:${alignClasses[responsive.sm.align]}`,
    responsive.sm?.justify && `sm:${justifyClasses[responsive.sm.justify]}`,
    responsive.md?.direction && (responsive.md.direction === 'vertical' ? 'md:flex-col' : 'md:flex-row'),
    responsive.md?.align && `md:${alignClasses[responsive.md.align]}`,
    responsive.md?.justify && `md:${justifyClasses[responsive.md.justify]}`,
    responsive.lg?.direction && (responsive.lg.direction === 'vertical' ? 'lg:flex-col' : 'lg:flex-row'),
    responsive.lg?.align && `lg:${alignClasses[responsive.lg.align]}`,
    responsive.lg?.justify && `lg:${justifyClasses[responsive.lg.justify]}`
  ].filter(Boolean).join(' ') : '';

  const childrenArray = React.Children.toArray(children);

  return (
    <div className={`
      ${baseClasses} 
      ${directionClass} 
      ${spacingClasses[spacing]} 
      ${alignClasses[align]} 
      ${justifyClasses[justify]} 
      ${wrapClass} 
      ${responsiveClasses} 
      ${className}
    `}>
      {divider 
        ? childrenArray.reduce((acc: React.ReactNode[], child, index) => {
            if (index === 0) return [child];
            return [...acc, <div key={`divider-${index}`} className="flex-shrink-0">{divider}</div>, child];
          }, [] as React.ReactNode[])
        : children
      }
    </div>
  );
}