# Feature Specification: EditorPage UI/UX Overhaul

**Feature Branch**: `005-editor-page-redesign`
**Created**: 2025-10-24
**Status**: Draft
**Input**: User description: "Overhaul the EditorPage UI/UX. The current implementation is functionally correct but has an improper layout and does not meet the project's design standards. This refactor will implement a minimalist, 2-column layout that is visually consistent with the HomePage."

## User Scenarios & Testing _(mandatory)_

### User Story 1 - View Live Preview While Chatting (Priority: P1)

A user who is editing their landing page needs to see changes reflected in real-time while interacting with the AI assistant. They want to provide feedback on the generated design without switching between different views or tabs.

**Why this priority**: This is the core value proposition of the editor - seamless interaction between AI chat and visual preview. Without this, the editor loses its primary advantage over traditional tools.

**Independent Test**: Can be fully tested by opening an existing page in the editor and verifying that (a) the chat interface is visible on the left, (b) the preview iframe is visible on the right, and (c) both panels are visible simultaneously on desktop viewports.

**Acceptance Scenarios**:

1. **Given** a user opens an existing landing page in the editor on a desktop viewport, **When** they view the editor interface, **Then** they see a 2-column layout with the chat panel on the left (30% width) and the live preview iframe on the right (70% width)
2. **Given** a user is viewing the editor on a desktop, **When** they type a message in the chat panel, **Then** the live preview remains visible and does not get hidden or obscured
3. **Given** a user is viewing the editor on a desktop, **When** they interact with the preview iframe (e.g., scrolling, clicking), **Then** the chat panel remains visible and accessible

---

### User Story 2 - Resize Panels for Custom Workspace (Priority: P2)

A user working on detailed design feedback wants to adjust the relative sizes of the chat and preview panels to better suit their workflow. Sometimes they need more space for the preview, other times they need more space for lengthy chat conversations.

**Why this priority**: Provides flexibility and improves usability for different workflows, but the default layout already delivers core value. This enhances the experience but isn't critical for basic functionality.

**Independent Test**: Can be fully tested by dragging the resize handle between the chat and preview panels and verifying that both panels resize responsively without breaking layout or functionality.

**Acceptance Scenarios**:

1. **Given** a user is viewing the editor on a desktop, **When** they drag the resize handle between the chat and preview panels, **Then** both panels resize smoothly and maintain their content integrity
2. **Given** a user has resized the panels to a custom ratio, **When** they refresh the page, **Then** the panels return to the default 30/70 split (resize state is not persisted)
3. **Given** a user drags the resize handle to an extreme position, **When** the panel reaches its minimum width threshold, **Then** it stops resizing to prevent unusable panel widths

---

### User Story 3 - Access Version History Without Clutter (Priority: P2)

A user who wants to review previous versions of their landing page needs to access the version history without it permanently occupying valuable screen space in the main editor view.

**Why this priority**: Version history is an important feature for iteration and recovery, but it's not needed constantly during active editing. Moving it to a modal/sheet reduces clutter while preserving functionality.

**Independent Test**: Can be fully tested by clicking the version history icon button in the chat panel header and verifying that (a) a modal or sheet opens displaying version history, (b) the main editor layout remains unchanged, and (c) the modal/sheet can be closed to return to editing.

**Acceptance Scenarios**:

1. **Given** a user is viewing the editor, **When** they click the version history icon button in the chat panel header, **Then** a modal or slide-out panel opens displaying the version history
2. **Given** the version history modal/sheet is open, **When** the user clicks outside the modal or presses the close button, **Then** the modal/sheet closes and the user returns to the main editor view
3. **Given** a user opens the version history, **When** they view the content, **Then** they see the current version number and any available previous versions

---

### User Story 4 - Upload Assets On-Demand (Priority: P3)

A user who needs to upload custom images, logos, or other assets for their landing page wants quick access to the asset uploader without it taking up permanent space in the editor interface.

**Why this priority**: Asset uploading is a less frequent action compared to chatting and previewing. Making it accessible via an icon button keeps the interface clean while still providing access when needed.

**Independent Test**: Can be fully tested by clicking the asset uploader icon button in the chat panel header and verifying that (a) a modal or sheet opens with the asset upload interface, (b) files can be uploaded successfully, and (c) the modal/sheet closes after upload completion.

**Acceptance Scenarios**:

1. **Given** a user is viewing the editor, **When** they click the asset uploader icon button in the chat panel header, **Then** a modal or slide-out panel opens with the asset upload interface
2. **Given** the asset uploader modal/sheet is open, **When** the user successfully uploads an asset, **Then** the asset is added to the page and the modal/sheet can be closed
3. **Given** the asset uploader modal/sheet is open, **When** the user clicks cancel or the close button, **Then** the modal/sheet closes without making changes

---

### User Story 5 - Use Editor on Mobile Devices (Priority: P3)

A user accessing the editor from a tablet or mobile device needs to be able to chat with the AI and preview their landing page, even though the screen size is limited.

**Why this priority**: Mobile support expands accessibility and allows for on-the-go editing, but most serious editing work will happen on desktop. This ensures the editor is usable on all devices without requiring a complete mobile-first redesign.

**Independent Test**: Can be fully tested by accessing the editor on a mobile viewport (or resizing the browser window to mobile width) and verifying that (a) the panels stack vertically, (b) both chat and preview are accessible, and (c) the interface remains functional.

**Acceptance Scenarios**:

1. **Given** a user opens the editor on a mobile viewport (width < 768px), **When** the page loads, **Then** the chat panel and preview panel stack vertically instead of side-by-side
2. **Given** a user is viewing the editor on a mobile device, **When** they scroll down the page, **Then** they can access both the chat interface and the preview iframe
3. **Given** a user interacts with the chat panel on mobile, **When** they send a message, **Then** the preview updates appropriately without layout issues

---

### Edge Cases

- What happens when the user drags the resize handle beyond the minimum/maximum panel width thresholds?
- How does the layout behave when transitioning between desktop and mobile breakpoints (e.g., rotating a tablet)?
- What happens if the version history or asset uploader modal is open when the user resizes the browser window?
- How does the dark theme appear if the user has high contrast mode or accessibility settings enabled in their browser?
- What happens if the preview iframe fails to load or encounters an error?
- How does the chat panel handle extremely long messages or code snippets that could overflow?

## Requirements _(mandatory)_

### Functional Requirements

- **FR-001**: The editor MUST display a 2-column layout on desktop viewports (≥768px width) with the chat panel on the left and the live preview iframe on the right
- **FR-002**: The chat panel MUST occupy 30% of the available width by default, and the preview panel MUST occupy 70% of the available width by default
- **FR-003**: Users MUST be able to resize the panels by dragging a resize handle between the chat and preview panels
- **FR-004**: The resize functionality MUST enforce minimum width constraints to prevent unusable panel sizes (minimum 20% width for chat, minimum 30% width for preview)
- **FR-005**: The editor MUST use a responsive layout that stacks panels vertically on mobile viewports (<768px width)
- **FR-006**: The editor MUST use the same dark theme color scheme as the HomePage, including:
  - Primary background: `#0a0e27` (dark navy) or `#0a0a0a` (near-black)
  - Card/panel backgrounds: `bg-black/40` with `backdrop-blur-sm`
  - Primary text: `text-white`
  - Secondary text: `text-gray-300` or `text-gray-400`
  - Accent color: `text-purple-300` (and `bg-purple-600` for buttons)
  - Borders: `border-gray-800` or `border-purple-500/20`
- **FR-007**: The chat panel header MUST contain icon buttons to access the version history and asset uploader features
- **FR-008**: The version history MUST be accessible via a modal or slide-out panel (shadcn/ui Dialog or Sheet component)
- **FR-009**: The asset uploader MUST be accessible via a modal or slide-out panel (shadcn/ui Dialog or Sheet component)
- **FR-010**: The version history modal/sheet MUST display the current version number and any available previous versions
- **FR-011**: The asset uploader modal/sheet MUST provide an interface for uploading files
- **FR-012**: Both the version history and asset uploader modals/sheets MUST be dismissible (closeable) by clicking outside, pressing ESC, or clicking a close button
- **FR-013**: The editor MUST maintain the existing functionality of the ChatPanel, PreviewPanel, and page data fetching logic
- **FR-014**: The editor MUST display appropriate loading states with dark theme styling while page data is being fetched
- **FR-015**: The editor MUST display error messages with dark theme styling (e.g., `text-red-400`) when page loading fails
- **FR-016**: The layout MUST adhere to a minimalist design aesthetic with clean lines, subtle borders, and minimal visual clutter
- **FR-017**: Interactive elements (buttons, resize handles, modals) MUST use the purple-300 accent color for hover states and focus indicators
- **FR-018**: The resize handle MUST be visually discoverable but unobtrusive, using dark theme styling consistent with the overall design
- **FR-019**: The editor MUST remove the current ThreeColumnLayout component and replace it with a 2-column resizable layout using shadcn/ui Resizable components
- **FR-020**: Panel resize state MUST NOT persist across page refreshes (panels reset to default 30/70 split on each load)

### Key Entities

- **Page**: Represents the landing page being edited, including its content, current version, and metadata
- **Version**: Represents a snapshot of the page content at a specific point in time, with a version number
- **Asset**: Represents an uploaded file (image, logo, etc.) associated with the page
- **Chat Message**: Represents a message in the conversation between the user and the AI assistant

## Success Criteria _(mandatory)_

### Measurable Outcomes

- **SC-001**: Users can view both the chat panel and live preview simultaneously on desktop viewports without scrolling or switching views
- **SC-002**: Users can resize the chat and preview panels to any ratio within the defined constraints (chat: 20-80%, preview: 30-80%) by dragging the resize handle
- **SC-003**: The editor displays the same dark theme color scheme as the HomePage, as verified by visual inspection showing matching background colors, text colors, and accent colors
- **SC-004**: Users can access version history and asset uploader features via icon buttons that open modals or slide-out panels within 1 click
- **SC-005**: The editor layout adapts responsively to mobile viewports (<768px) by stacking panels vertically, allowing users to scroll and access both chat and preview
- **SC-006**: 90% of users can identify the purple-300 accent color as the primary interactive accent, consistent with the HomePage branding
- **SC-007**: The editor loads and displays page content within the same timeframe as the previous implementation (no performance regression)
- **SC-008**: Users can dismiss version history and asset uploader modals/sheets using standard methods (ESC key, click outside, close button) 100% of the time
- **SC-009**: The editor passes accessibility checks for color contrast ratios in dark mode (WCAG AA standard: 4.5:1 for normal text, 3:1 for large text)
- **SC-010**: The layout maintains visual consistency with the HomePage's minimalist aesthetic, as judged by design review showing no conflicting styles or visual inconsistencies

## Assumptions _(mandatory)_

- The existing ChatPanel and PreviewPanel components have no hard dependencies on ThreeColumnLayout and can be integrated into a new 2-column layout without modification
- The shadcn/ui Resizable component is already installed and available in the project (or can be installed without conflicts)
- The shadcn/ui Dialog and Sheet components are already installed and available for modals/slide-out panels
- The current version history and asset uploader functionality is either already implemented or will be implemented as part of this feature (the UI redesign focuses on layout and accessibility, not building these features from scratch)
- The default 30/70 split ratio is an acceptable starting point and does not require user research or A/B testing
- The minimum width constraints (20% for chat, 30% for preview) are sufficient to prevent usability issues and do not require user testing
- The 768px breakpoint for mobile responsiveness aligns with existing responsive design breakpoints in the project
- The purple-300 accent color is the established brand color and does not require design approval
- Resize state does not need to persist across sessions (users are comfortable with panels resetting to default on page reload)
- The preview iframe's internal content will handle its own scrolling and does not require special scroll synchronization with the chat panel

## Dependencies

- **shadcn/ui Resizable component**: Required for implementing the resizable 2-column layout
- **shadcn/ui Dialog or Sheet component**: Required for version history and asset uploader modals/slide-out panels
- **Tailwind CSS dark theme utilities**: Required for applying the dark theme color scheme
- **Existing HomePage components**: Needed as reference for sampling dark theme colors and design patterns
- **React Router**: Already in use for page routing (no new dependency)
- **@tanstack/react-query**: Already in use for data fetching (no new dependency)

## Out of Scope

- **Building version history functionality**: This redesign assumes version history already exists or will be implemented separately. The scope is limited to providing UI access via a modal/sheet.
- **Building asset uploader functionality**: Similar to version history, the redesign provides UI access but does not implement the upload logic itself.
- **Implementing a light mode theme**: The project explicitly focuses on dark mode only, 
- **Persistent panel resize state**: Saving user preferences for panel sizes across sessions is not included in this scope.
- **Advanced panel layouts**: Features like draggable panels, floating panels, or more than 2 columns are not included.
- **Performance optimization of the preview iframe**: This redesign does not address iframe loading speed or rendering performance.
- **Accessibility enhancements beyond color contrast**: While the dark theme must meet WCAG AA contrast standards, advanced accessibility features (screen reader optimization, keyboard shortcuts) are out of scope.
- **User onboarding or tooltips**: Explaining how to use the resize handle or access modals is not included.
- **A/B testing or user research**: The design decisions are based on the provided requirements and do not include user testing.

## Constraints

- The redesign MUST maintain all existing editor functionality (chat, preview, page loading)
- The color scheme MUST match the HomePage's dark theme exactly
- The layout MUST use shadcn/ui components (Resizable, Dialog/Sheet) to maintain consistency with the project's UI component library
- The design MUST adhere to the minimalist aesthetic 
- The implementation MUST support responsive design with a mobile-first approach
- The purple-300 accent color MUST be used for all interactive elements and focus states
- The layout MUST NOT introduce new third-party dependencies beyond shadcn/ui components
- The implementation MUST follow TypeScript strict typing standards
- The implementation MUST use functional React components with hooks (no class components)

## Questions & Clarifications

None at this time. All requirements are clear and well-defined based on the provided feature description and existing HomePage design patterns.
