// src/components/ui/index.ts
/**
 * Design System - UI Component Library
 * Shadcn/UI inspired components for AccountSafe
 * 
 * Generic, reusable UI components that are not specific to any business domain.
 * These should be stateless, presentational components.
 */

// Button Components
export { 
  Button, 
  ButtonLink, 
  IconButton,
  type ButtonVariant,
  type ButtonSize,
} from './Button';

// Input Components
export { 
  Input, 
  Textarea, 
  SearchInput,
  type InputVariant,
  type InputSize,
} from './Input';

// Card Components
export { 
  Card, 
  CardHeader, 
  CardContent, 
  CardFooter,
  FeatureCard,
  type CardVariant,
} from './Card';

// Badge Components
export { 
  Badge, 
  StatusBadge, 
  CountBadge,
  type BadgeVariant,
  type StatusType,
} from './Badge';

// Re-export generic UI components (Skeletons)
export { 
  Skeleton, 
  CardSkeleton, 
  VaultGridSkeleton,
  StatCardSkeleton,
  TableRowSkeleton, 
  DashboardSkeleton,
  ProfileSkeleton,
  EmptyState
} from '../Skeleton';

// Premium Visual & Animation Components
export { default as AuroraBackground } from './AuroraBackground';
export { default as DotGrid } from './DotGrid';
export { default as BorderBeam } from './BorderBeam';
export { default as ShimmerButton } from './ShimmerButton';
export { default as HyperText } from './HyperText';
export { default as NumberTicker } from './NumberTicker';
export { default as MagicCard } from './MagicCard';
export { Dock, DockIcon } from './Dock';

