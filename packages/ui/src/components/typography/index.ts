/**
 * Typography components for AstralField design system
 */

export * from './Heading';
export * from './Text';
export * from './Code';
export * from './Quote';

// Re-export commonly used typography components
export {
  Heading,
  PageTitle,
  SectionTitle,
  CardTitle,
  DisplayHeading,
  type HeadingProps,
} from './Heading';

export {
  Text,
  Lead,
  Small,
  Muted,
  Label,
  Caption,
  Link,
  PlayerName,
  TeamName,
  PositionLabel,
  FantasyPoints,
  ProjectionText,
  type TextProps,
} from './Text';

export {
  Code,
  InlineCode,
  CodeBlock,
  Kbd,
  SyntaxHighlighter,
  type CodeProps,
  type KbdProps,
  type SyntaxHighlighterProps,
} from './Code';

export {
  Quote,
  Blockquote,
  Testimonial,
  PullQuote,
  FantasyQuote,
  InlineQuote,
  type QuoteProps,
  type InlineQuoteProps,
} from './Quote';