# Component API Contracts

## HeroSection Component

**Purpose**: Action-first hero section with direct prompt input

**Props**: `HeroPromptProps`
**Events**:

- `onSubmit(content: string)` - Triggered when Generate button clicked
- `onFocus()` - Triggered when textarea gains focus
- `onChange(content: string)` - Triggered on content change

**Accessibility**:

- ARIA labels for textarea and button
- Keyboard navigation support
- Screen reader announcements for character count

## ShowcaseCarousel Component

**Purpose**: Auto-scrolling carousel of example page thumbnails

**Props**: `ShowcaseCarouselProps`
**Events**:

- `onSlideChange(index: number)` - Triggered when slide changes
- `onExampleClick(example: ShowcaseExample)` - Triggered when thumbnail clicked

**Accessibility**:

- ARIA carousel pattern implementation
- Keyboard navigation (arrow keys)
- Pause on hover/focus for accessibility

## FeatureCards Component

**Purpose**: Polished feature cards with hover effects

**Props**: `FeatureCardsProps`
**Events**:

- `onCardHover(cardId: string)` - Triggered on hover start
- `onCardLeave(cardId: string)` - Triggered on hover end

**Accessibility**:

- Focus indicators for keyboard navigation
- High contrast mode support
- Semantic HTML structure

## DynamicBackground Component

**Purpose**: Animated background for high-tech aesthetic

**Props**: `DynamicBackgroundProps`
**Events**:

- `onAnimationStart()` - Triggered when animation begins
- `onPerformanceChange(metrics: PerformanceMetrics)` - Performance monitoring

**Accessibility**:

- Respects `prefers-reduced-motion`
- No flashing content (seizure prevention)
- Does not interfere with content readability
