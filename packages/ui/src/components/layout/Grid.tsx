/**
 * Grid component for CSS Grid layouts
 */

import React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '../../utils/cn';

/**
 * Grid variant styles
 */
const gridVariants = cva(
  'grid',
  {
    variants: {
      cols: {
        1: 'grid-cols-1',
        2: 'grid-cols-2',
        3: 'grid-cols-3',
        4: 'grid-cols-4',
        5: 'grid-cols-5',
        6: 'grid-cols-6',
        7: 'grid-cols-7',
        8: 'grid-cols-8',
        9: 'grid-cols-9',
        10: 'grid-cols-10',
        11: 'grid-cols-11',
        12: 'grid-cols-12',
        none: 'grid-cols-none',
        auto: 'grid-cols-auto',
        'min-content': 'grid-cols-min',
        'max-content': 'grid-cols-max',
        fr: 'grid-cols-1fr',
      },
      rows: {
        1: 'grid-rows-1',
        2: 'grid-rows-2',
        3: 'grid-rows-3',
        4: 'grid-rows-4',
        5: 'grid-rows-5',
        6: 'grid-rows-6',
        none: 'grid-rows-none',
        auto: 'grid-rows-auto',
        'min-content': 'grid-rows-min',
        'max-content': 'grid-rows-max',
        fr: 'grid-rows-1fr',
      },
      gap: {
        none: 'gap-0',
        xs: 'gap-2',
        sm: 'gap-3',
        md: 'gap-4',
        lg: 'gap-6',
        xl: 'gap-8',
        '2xl': 'gap-12',
      },
      flow: {
        row: 'grid-flow-row',
        col: 'grid-flow-col',
        'row-dense': 'grid-flow-row-dense',
        'col-dense': 'grid-flow-col-dense',
      },
      autoFit: {
        true: 'grid-cols-[repeat(auto-fit,minmax(0,1fr))]',
        false: '',
      },
      autoFill: {
        true: 'grid-cols-[repeat(auto-fill,minmax(0,1fr))]',
        false: '',
      },
    },
    defaultVariants: {
      cols: 1,
      gap: 'md',
      flow: 'row',
      autoFit: false,
      autoFill: false,
    },
  }
);

/**
 * Grid component props
 */
export interface GridProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {
  /**
   * Grid content
   */
  children: React.ReactNode;
  
  /**
   * Element type to render as
   * @default 'div'
   */
  as?: keyof JSX.IntrinsicElements;
  
  /**
   * Custom grid template columns
   */
  templateColumns?: string;
  
  /**
   * Custom grid template rows
   */
  templateRows?: string;
  
  /**
   * Custom grid template areas
   */
  templateAreas?: string[];
  
  /**
   * Responsive columns
   */
  responsiveCols?: {
    sm?: GridProps['cols'];
    md?: GridProps['cols'];
    lg?: GridProps['cols'];
    xl?: GridProps['cols'];
  };
  
  /**
   * Auto-fit with minimum column width
   */
  autoFitMinWidth?: string;
  
  /**
   * Auto-fill with minimum column width
   */
  autoFillMinWidth?: string;
}

/**
 * Grid component for CSS Grid layouts with responsive support.
 * 
 * @example
 * ```tsx
 * <Grid cols={3} gap="lg">
 *   <Card>Item 1</Card>
 *   <Card>Item 2</Card>
 *   <Card>Item 3</Card>
 * </Grid>
 * 
 * <Grid 
 *   responsiveCols={{ sm: 1, md: 2, lg: 3 }}
 *   autoFitMinWidth="300px"
 * >
 *   <PlayerCard />
 *   <PlayerCard />
 *   <PlayerCard />
 * </Grid>
 * 
 * <Grid
 *   templateAreas={[
 *     'header header',
 *     'sidebar main',
 *     'footer footer'
 *   ]}
 *   templateColumns="200px 1fr"
 *   templateRows="auto 1fr auto"
 * >
 *   <Header style={{ gridArea: 'header' }} />
 *   <Sidebar style={{ gridArea: 'sidebar' }} />
 *   <Main style={{ gridArea: 'main' }} />
 *   <Footer style={{ gridArea: 'footer' }} />
 * </Grid>
 * ```
 */
export const Grid = React.forwardRef<HTMLDivElement, GridProps>(
  ({ 
    children, 
    className,
    cols,
    rows,
    gap,
    flow,
    autoFit,
    autoFill,
    as: Component = 'div',
    templateColumns,
    templateRows,
    templateAreas,
    responsiveCols,
    autoFitMinWidth,
    autoFillMinWidth,
    style,
    ...props 
  }, ref) => {
    // Generate responsive column classes
    const responsiveColsClasses = responsiveCols ? Object.entries(responsiveCols)
      .map(([breakpoint, colValue]) => {
        const prefix = breakpoint === 'sm' ? '' : `${breakpoint}:`;
        const colClass = gridVariants({ cols: colValue }).split(' ').find(cls => cls.includes('grid-cols'));
        return `${prefix}${colClass}`;
      })
      .join(' ') : '';

    // Custom grid styles
    const customStyles: React.CSSProperties = { ...style };
    
    if (templateColumns) {
      customStyles.gridTemplateColumns = templateColumns;
    }
    
    if (templateRows) {
      customStyles.gridTemplateRows = templateRows;
    }
    
    if (templateAreas) {
      customStyles.gridTemplateAreas = templateAreas.map(area => `"${area}"`).join(' ');
    }
    
    if (autoFitMinWidth) {
      customStyles.gridTemplateColumns = `repeat(auto-fit, minmax(${autoFitMinWidth}, 1fr))`;
    }
    
    if (autoFillMinWidth) {
      customStyles.gridTemplateColumns = `repeat(auto-fill, minmax(${autoFillMinWidth}, 1fr))`;
    }

    const Comp = Component as any;
    return (
      <Comp
        ref={ref}
        className={cn(
          gridVariants({ 
            cols: (responsiveCols || autoFitMinWidth || autoFillMinWidth) ? 'none' : cols,
            rows, 
            gap, 
            flow, 
            autoFit: !autoFitMinWidth && autoFit,
            autoFill: !autoFillMinWidth && autoFill,
          }),
          responsiveColsClasses,
          className
        )}
        style={customStyles}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

Grid.displayName = 'Grid';

/**
 * Grid item component for explicit positioning
 */
export interface GridItemProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Grid column span
   */
  colSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 'auto' | 'full';
  
  /**
   * Grid row span
   */
  rowSpan?: 1 | 2 | 3 | 4 | 5 | 6 | 'auto' | 'full';
  
  /**
   * Grid column start
   */
  colStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  
  /**
   * Grid column end
   */
  colEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13 | 'auto';
  
  /**
   * Grid row start
   */
  rowStart?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  
  /**
   * Grid row end
   */
  rowEnd?: 1 | 2 | 3 | 4 | 5 | 6 | 7 | 'auto';
  
  /**
   * Grid area name
   */
  area?: string;
  
  /**
   * Element type to render as
   */
  as?: keyof JSX.IntrinsicElements;
}

const getColSpanClass = (colSpan?: GridItemProps['colSpan']) => {
  if (!colSpan) return '';
  const spanMap = {
    1: 'col-span-1', 2: 'col-span-2', 3: 'col-span-3', 4: 'col-span-4',
    5: 'col-span-5', 6: 'col-span-6', 7: 'col-span-7', 8: 'col-span-8',
    9: 'col-span-9', 10: 'col-span-10', 11: 'col-span-11', 12: 'col-span-12',
    auto: 'col-auto', full: 'col-span-full'
  };
  return spanMap[colSpan] || '';
};

const getRowSpanClass = (rowSpan?: GridItemProps['rowSpan']) => {
  if (!rowSpan) return '';
  const spanMap = {
    1: 'row-span-1', 2: 'row-span-2', 3: 'row-span-3', 4: 'row-span-4',
    5: 'row-span-5', 6: 'row-span-6', auto: 'row-auto', full: 'row-span-full'
  };
  return spanMap[rowSpan] || '';
};

const getColStartClass = (colStart?: GridItemProps['colStart']) => {
  if (!colStart) return '';
  const startMap = {
    1: 'col-start-1', 2: 'col-start-2', 3: 'col-start-3', 4: 'col-start-4',
    5: 'col-start-5', 6: 'col-start-6', 7: 'col-start-7', 8: 'col-start-8',
    9: 'col-start-9', 10: 'col-start-10', 11: 'col-start-11', 12: 'col-start-12',
    13: 'col-start-13', auto: 'col-start-auto'
  };
  return startMap[colStart] || '';
};

const getColEndClass = (colEnd?: GridItemProps['colEnd']) => {
  if (!colEnd) return '';
  const endMap = {
    1: 'col-end-1', 2: 'col-end-2', 3: 'col-end-3', 4: 'col-end-4',
    5: 'col-end-5', 6: 'col-end-6', 7: 'col-end-7', 8: 'col-end-8',
    9: 'col-end-9', 10: 'col-end-10', 11: 'col-end-11', 12: 'col-end-12',
    13: 'col-end-13', auto: 'col-end-auto'
  };
  return endMap[colEnd] || '';
};

const getRowStartClass = (rowStart?: GridItemProps['rowStart']) => {
  if (!rowStart) return '';
  const startMap = {
    1: 'row-start-1', 2: 'row-start-2', 3: 'row-start-3', 4: 'row-start-4',
    5: 'row-start-5', 6: 'row-start-6', 7: 'row-start-7', auto: 'row-start-auto'
  };
  return startMap[rowStart] || '';
};

const getRowEndClass = (rowEnd?: GridItemProps['rowEnd']) => {
  if (!rowEnd) return '';
  const endMap = {
    1: 'row-end-1', 2: 'row-end-2', 3: 'row-end-3', 4: 'row-end-4',
    5: 'row-end-5', 6: 'row-end-6', 7: 'row-end-7', auto: 'row-end-auto'
  };
  return endMap[rowEnd] || '';
};

/**
 * Grid item component for positioned grid children.
 */
export const GridItem = React.forwardRef<HTMLDivElement, GridItemProps>(
  ({ 
    children, 
    className,
    colSpan,
    rowSpan,
    colStart,
    colEnd,
    rowStart,
    rowEnd,
    area,
    as: Component = 'div',
    style,
    ...props 
  }, ref) => {
    const customStyles = area ? { ...style, gridArea: area } : style;

    const Comp = Component as any;
    return (
      <Comp
        ref={ref}
        className={cn(
          getColSpanClass(colSpan),
          getRowSpanClass(rowSpan),
          getColStartClass(colStart),
          getColEndClass(colEnd),
          getRowStartClass(rowStart),
          getRowEndClass(rowEnd),
          className
        )}
        style={customStyles}
        {...props}
      >
        {children}
      </Comp>
    );
  }
);

GridItem.displayName = 'GridItem';

/**
 * Responsive Grid - Auto-responsive grid with minimum column width
 */
export const ResponsiveGrid = React.forwardRef<HTMLDivElement, 
  Omit<GridProps, 'cols' | 'autoFit' | 'autoFitMinWidth'> & {
    minWidth?: string;
  }
>(({ minWidth = '250px', ...props }, ref) => (
  <Grid ref={ref} autoFitMinWidth={minWidth} {...props} />
));

ResponsiveGrid.displayName = 'ResponsiveGrid';