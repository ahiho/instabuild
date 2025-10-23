# Data Model: Home Page UI/UX Overhaul

**Date**: 2025-10-22
**Feature**: Home Page UI/UX Overhaul

## Entities

### Hero Prompt

**Purpose**: User input for AI landing page generation

**Fields**:

- `content: string` - User's landing page description
- `placeholder: string` - Inspiring placeholder text
- `maxLength: number` - Character limit (default: 2000)

**Validation Rules**:

- Content must be non-empty when submitted
- Content length must not exceed maxLength
- Placeholder must be inspiring and clear about expected input

**State Transitions**:

- Empty → Focused (user clicks textarea)
- Focused → Typing (user enters content)
- Typing → Ready (valid content entered)
- Ready → Submitting (user clicks Generate)

### Example Showcase

**Purpose**: Collection of high-quality example page thumbnails

**Fields**:

- `id: string` - Unique identifier
- `title: string` - Example page title
- `description: string` - Brief description
- `thumbnailUrl: string` - Image URL for thumbnail
- `category: string` - Type of landing page (e.g., "AI Startup", "SaaS", "E-commerce")
- `order: number` - Display order in carousel

**Validation Rules**:

- thumbnailUrl must be valid image URL
- title must be 1-50 characters
- description must be 1-100 characters
- order must be positive integer

**Relationships**:

- Collection of 4-5 examples displayed in carousel
- Auto-advances every 4-5 seconds

### Feature Card

**Purpose**: Redesigned cards highlighting product capabilities

**Fields**:

- `id: string` - Unique identifier
- `title: string` - Feature name
- `description: string` - Feature description
- `iconName: string` - Icon identifier for custom icons
- `order: number` - Display order

**Validation Rules**:

- title must be 1-30 characters
- description must be 1-150 characters
- iconName must correspond to available icon set
- order must be positive integer

**State Transitions**:

- Default → Hovered (mouse over)
- Hovered → Default (mouse out)

### Dynamic Background

**Purpose**: Animated visual element for high-tech aesthetic

**Fields**:

- `animationType: 'particles' | 'waves' | 'constellation'` - Animation style
- `intensity: number` - Animation intensity (0-100)
- `color: string` - Primary color theme
- `reducedMotion: boolean` - Accessibility setting

**Validation Rules**:

- intensity must be 0-100
- color must be valid hex or CSS color
- reducedMotion respects user preference

**State Transitions**:

- Loading → Active (animation starts)
- Active → Reduced (performance optimization)
- Active → Paused (reduced motion preference)
