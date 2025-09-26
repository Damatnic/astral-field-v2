/**
 * Layout components for AstralField design system
 */

export * from './Container';
export * from './Stack';
export * from './Grid';
export * from './Flex';

// Re-export commonly used layout components
export {
  Container,
  PageContainer,
  SectionContainer,
  HeroContainer,
  CardContainer,
  type ContainerProps,
} from './Container';

export {
  Stack,
  VStack,
  HStack,
  CenterStack,
  InlineStack,
  SplitStack,
  type StackProps,
} from './Stack';

export {
  Grid,
  GridItem,
  ResponsiveGrid,
  type GridProps,
  type GridItemProps,
} from './Grid';

export {
  Flex,
  FlexItem,
  Row,
  Column,
  Center,
  Spacer,
  type FlexProps,
  type FlexItemProps,
} from './Flex';