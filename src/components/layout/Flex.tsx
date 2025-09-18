import React from 'react';

export interface FlexProps {
  children: React.ReactNode;
  direction?: 'row' | 'col' | 'row-reverse' | 'col-reverse';
  wrap?: 'wrap' | 'nowrap' | 'wrap-reverse';
  justify?: 'start' | 'end' | 'center' | 'between' | 'around' | 'evenly';
  align?: 'start' | 'end' | 'center' | 'baseline' | 'stretch';
  gap?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  responsive?: {
    sm?: Partial<Pick<FlexProps, 'direction' | 'wrap' | 'justify' | 'align'>>;
    md?: Partial<Pick<FlexProps, 'direction' | 'wrap' | 'justify' | 'align'>>;
    lg?: Partial<Pick<FlexProps, 'direction' | 'wrap' | 'justify' | 'align'>>;
    xl?: Partial<Pick<FlexProps, 'direction' | 'wrap' | 'justify' | 'align'>>;
  };
  className?: string;
}

export interface FlexItemProps {
  children: React.ReactNode;
  flex?: 'none' | 'auto' | '1' | 'initial';
  grow?: boolean;
  shrink?: boolean;
  basis?: 'auto' | 'full' | '1/2' | '1/3' | '2/3' | '1/4' | '3/4';
  order?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12;
  className?: string;
}

export function Flex({
  children,
  direction = 'row',
  wrap = 'nowrap',
  justify = 'start',
  align = 'start',
  gap = 'md',
  responsive,
  className = ''
}: FlexProps) {
  const directionClasses = {
    row: 'flex-row',
    col: 'flex-col',
    'row-reverse': 'flex-row-reverse',
    'col-reverse': 'flex-col-reverse'
  };

  const wrapClasses = {
    wrap: 'flex-wrap',
    nowrap: 'flex-nowrap',
    'wrap-reverse': 'flex-wrap-reverse'
  };

  const justifyClasses = {
    start: 'justify-start',
    end: 'justify-end',
    center: 'justify-center',
    between: 'justify-between',
    around: 'justify-around',
    evenly: 'justify-evenly'
  };

  const alignClasses = {
    start: 'items-start',
    end: 'items-end',
    center: 'items-center',
    baseline: 'items-baseline',
    stretch: 'items-stretch'
  };

  const gapClasses = {
    none: 'gap-0',
    xs: 'gap-1',
    sm: 'gap-2',
    md: 'gap-4',
    lg: 'gap-6',
    xl: 'gap-8'
  };

  const responsiveClasses = responsive ? [
    responsive.sm?.direction && `sm:${directionClasses[responsive.sm.direction]}`,
    responsive.sm?.wrap && `sm:${wrapClasses[responsive.sm.wrap]}`,
    responsive.sm?.justify && `sm:${justifyClasses[responsive.sm.justify]}`,
    responsive.sm?.align && `sm:${alignClasses[responsive.sm.align]}`,
    responsive.md?.direction && `md:${directionClasses[responsive.md.direction]}`,
    responsive.md?.wrap && `md:${wrapClasses[responsive.md.wrap]}`,
    responsive.md?.justify && `md:${justifyClasses[responsive.md.justify]}`,
    responsive.md?.align && `md:${alignClasses[responsive.md.align]}`,
    responsive.lg?.direction && `lg:${directionClasses[responsive.lg.direction]}`,
    responsive.lg?.wrap && `lg:${wrapClasses[responsive.lg.wrap]}`,
    responsive.lg?.justify && `lg:${justifyClasses[responsive.lg.justify]}`,
    responsive.lg?.align && `lg:${alignClasses[responsive.lg.align]}`,
    responsive.xl?.direction && `xl:${directionClasses[responsive.xl.direction]}`,
    responsive.xl?.wrap && `xl:${wrapClasses[responsive.xl.wrap]}`,
    responsive.xl?.justify && `xl:${justifyClasses[responsive.xl.justify]}`,
    responsive.xl?.align && `xl:${alignClasses[responsive.xl.align]}`
  ].filter(Boolean).join(' ') : '';

  return (
    <div className={`
      flex 
      ${directionClasses[direction]} 
      ${wrapClasses[wrap]} 
      ${justifyClasses[justify]} 
      ${alignClasses[align]} 
      ${gapClasses[gap]} 
      ${responsiveClasses} 
      ${className}
    `}>
      {children}
    </div>
  );
}

export function FlexItem({
  children,
  flex,
  grow = false,
  shrink = false,
  basis,
  order,
  className = ''
}: FlexItemProps) {
  const flexClasses = flex ? {
    none: 'flex-none',
    auto: 'flex-auto',
    '1': 'flex-1',
    initial: 'flex-initial'
  }[flex] : '';

  const growClass = grow ? 'flex-grow' : '';
  const shrinkClass = shrink ? 'flex-shrink' : '';
  
  const basisClasses = basis ? {
    auto: 'basis-auto',
    full: 'basis-full',
    '1/2': 'basis-1/2',
    '1/3': 'basis-1/3',
    '2/3': 'basis-2/3',
    '1/4': 'basis-1/4',
    '3/4': 'basis-3/4'
  }[basis] : '';

  const orderClass = order ? `order-${order}` : '';

  return (
    <div className={`${flexClasses} ${growClass} ${shrinkClass} ${basisClasses} ${orderClass} ${className}`}>
      {children}
    </div>
  );
}