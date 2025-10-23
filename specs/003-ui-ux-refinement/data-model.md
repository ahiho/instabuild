# Data Model: UI/UX Refinement

**Feature**: 003-ui-ux-refinement  
**Date**: 2025-10-22

## UI State Entities

### LayoutPanel

Represents the state of the three main interface areas.

**Fields**:

- `id`: string (sidebar | chat | preview)
- `isCollapsed`: boolean (for sidebar)
- `width`: number (in pixels, for resizable panels)
- `isVisible`: boolean
- `minWidth`: number (minimum allowed width)
- `maxWidth`: number (maximum allowed width)

**Relationships**: None (independent state)

**State Transitions**:

- sidebar: visible ↔ collapsed
- preview: resizing (width changes within min/max bounds)

### SelectionMode

Represents the element selection state and visual feedback.

**Fields**:

- `isActive`: boolean
- `hoveredElement`: string | null (element selector)
- `selectedElement`: string | null (element selector)
- `overlayVisible`: boolean

**State Transitions**:

- inactive → active (user clicks "Select Mode")
- active → inactive (user selects element or clicks "Exit Select Mode")
- hovering → not hovering (mouse events)

### UserAction

Represents async operations and their feedback states.

**Fields**:

- `id`: string (unique action identifier)
- `type`: 'chat' | 'upload' | 'rollback' | 'deploy'
- `status`: 'idle' | 'loading' | 'success' | 'error'
- `message`: string | null (success/error message)
- `timestamp`: Date

**State Transitions**:

- idle → loading (action initiated)
- loading → success | error (action completed)
- success | error → idle (after timeout or user dismissal)

### ToastNotification

Represents temporary feedback messages.

**Fields**:

- `id`: string (unique notification ID)
- `type`: 'success' | 'error' | 'info'
- `title`: string
- `description`: string | null
- `duration`: number (milliseconds)
- `isVisible`: boolean

**State Transitions**:

- created → visible (notification appears)
- visible → dismissed (after timeout or user action)

## Validation Rules

- LayoutPanel width must be within minWidth/maxWidth bounds
- SelectionMode can only have one active state at a time
- UserAction status transitions must follow defined flow
- ToastNotification duration must be positive number
