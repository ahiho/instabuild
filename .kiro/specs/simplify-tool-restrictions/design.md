# Design Document

## Overview

This design outlines the replacement of the complex role-based permission system with a lightweight Safety Constraint System. The new system eliminates user roles, admin privileges, and permission matrices, replacing them with intelligent detection of potentially destructive actions and simple user confirmation prompts.

**Key Design Principles**:

1. **User Freedom**: All users can execute any tool without role restrictions
2. **Smart Safety**: Only prompt for confirmation on genuinely destructive actions
3. **Simple Implementation**: Minimal code complexity compared to role-based systems
4. **Clear Communication**: Non-technical confirmation dialogs that users understand
5. **System Health**: Maintain monitoring and rate limiting without access control

**User Experience Flow**:

1. User requests action through natural language
2. AI selects appropriate tool for the request
3. Safety Constraint System evaluates if action is potentially destructive
4. If safe: Execute immediately with feedback
5. If potentially destructive: Show clear confirmation dialog
6. User confirms or cancels
7. Execute action and provide clear feedback

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    User Request                             │
│                 (Natural Language)                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                  AI Tool Selection                          │
│              (No Permission Filtering)                     │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Safety Constraint System                       │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────────────────────┐   │
│  │ Action Analyzer │  │    Confirmation Manager         │   │
│  │                 │  │                                 │   │
│  │ • Detect        │  │ • Generate clear prompts       │   │
│  │   Destructive   │  │ • Handle user responses         │   │
│  │   Actions       │  │ • Execute after confirmation    │   │
│  └─────────────────┘  └─────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                   Tool Execution                            │
│              (All Tools Available)                         │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│              Audit Logging & Monitoring                    │
│            (For System Health, Not Access Control)         │
└─────────────────────────────────────────────────────────────┘
```

### Component Architecture

```
Safety Constraint System:
├── ActionAnalyzer
│   ├── DestructiveActionDetector
│   ├── SafetyLevelEvaluator
│   └── ContextAnalyzer
├── ConfirmationManager
│   ├── PromptGenerator
│   ├── UserResponseHandler
│   └── ActionExecutor
├── AuditLogger
│   ├── ExecutionTracker
│   ├── PerformanceMonitor
│   └── SafetyMetrics
└── RateLimiter
    ├── ResourceBasedLimiting
    ├── SystemHealthMonitor
    └── AbusePrevention

Simplified Tool Registry:
├── ToolManager
│   ├── SimpleToolRegistration
│   ├── SafetyLevelMapping
│   └── ToolDiscovery
├── ExecutionEngine
│   ├── DirectExecution (no permission checks)
│   ├── SafetyConstraintIntegration
│   └── ResultHandling
└── MonitoringCollector
    ├── UsageTracking
    ├── PerformanceMetrics
    └── ErrorReporting
```

## Components and Interfaces

### 1. Safety Constraint System

**Purpose**: Replace complex permission system with intelligent safety detection and user confirmation.

**Key Components**:

- `ActionAnalyzer`: Determines if an action is potentially destructive
- `ConfirmationManager`: Handles user confirmation flow
- `AuditLogger`: Tracks executions for monitoring (not access control)

**Interface**:

```typescript
interface SafetyConstraintSystem {
  evaluateAction(
    toolName: string,
    parameters: any,
    context: ExecutionContext
  ): Promise<SafetyEvaluation>;
  requestConfirmation(
    destructiveAction: DestructiveAction
  ): Promise<UserConfirmation>;
  executeWithSafety(
    toolCall: ToolCall,
    evaluation: SafetyEvaluation
  ): Promise<ExecutionResult>;
  logExecution(execution: ToolExecution): Promise<void>;
}

interface SafetyEvaluation {
  safetyLevel: 'safe' | 'potentially_destructive';
  requiresConfirmation: boolean;
  warningMessage?: string;
  affectedElements?: string[];
  reversible: boolean;
}

interface DestructiveAction {
  type:
    | 'delete_section'
    | 'clear_content'
    | 'replace_all'
    | 'remove_styling'
    | 'restructure_page';
  description: string;
  affectedAreas: string[];
  userFriendlyExplanation: string;
  confirmationPrompt: string;
}

interface UserConfirmation {
  confirmed: boolean;
  timestamp: Date;
  userMessage?: string;
}
```

### 2. Simplified Tool Registry

**Purpose**: Register and manage tools with simple safety levels instead of complex permissions.

**Key Components**:

- `ToolManager`: Handles tool registration with safety levels
- `ExecutionEngine`: Executes tools without permission filtering
- `MonitoringCollector`: Tracks usage for system health

**Interface**:

```typescript
interface SimplifiedToolRegistry {
  registerTool(toolDef: SimpleToolDefinition): void;
  getAllTools(): Record<string, ToolFunction>;
  executeToolWithSafety(toolCall: ToolCall): Promise<ToolResult>;
  getToolSafetyLevel(toolName: string): SafetyLevel;
  trackExecution(execution: ToolExecution): void;
}

interface SimpleToolDefinition {
  name: string;
  description: string;
  inputSchema: z.ZodSchema;
  execute: ToolExecutor;
  safetyLevel: 'safe' | 'potentially_destructive';
  category: ToolCategory;
  userFriendlyName: string;
  destructiveActionTypes?: DestructiveActionType[];
}

// No more permission requirements or role-based access
type SafetyLevel = 'safe' | 'potentially_destructive';

interface ExecutionContext {
  userId: string;
  conversationId: string;
  timestamp: Date;
  // No role or permission fields
}
```

### 3. Action Analyzer

**Purpose**: Intelligently detect potentially destructive actions without using permission-based rules.

**Interface**:

```typescript
interface ActionAnalyzer {
  analyzeAction(toolName: string, parameters: any): DestructiveActionAnalysis;
  isDestructive(analysis: DestructiveActionAnalysis): boolean;
  generateWarningMessage(analysis: DestructiveActionAnalysis): string;
  estimateImpact(analysis: DestructiveActionAnalysis): ImpactEstimate;
}

interface DestructiveActionAnalysis {
  actionType: DestructiveActionType;
  confidence: number; // 0-1 confidence that this is destructive
  affectedElements: ElementReference[];
  reversibility: 'easily_reversible' | 'difficult_to_reverse' | 'irreversible';
  severity: 'low' | 'medium' | 'high';
}

interface ElementReference {
  type: 'section' | 'content' | 'styling' | 'component';
  identifier: string;
  description: string;
}

type DestructiveActionType =
  | 'delete_section'
  | 'clear_all_content'
  | 'remove_all_styling'
  | 'replace_entire_page'
  | 'delete_multiple_sections'
  | 'clear_navigation'
  | 'remove_all_images';
```

### 4. Confirmation Manager

**Purpose**: Handle user confirmation flow with clear, non-technical communication.

**Interface**:

```typescript
interface ConfirmationManager {
  generateConfirmationPrompt(action: DestructiveAction): ConfirmationPrompt;
  requestUserConfirmation(
    prompt: ConfirmationPrompt
  ): Promise<UserConfirmation>;
  handleUserResponse(
    response: UserConfirmation,
    action: DestructiveAction
  ): Promise<ActionDecision>;
  suggestAlternatives(action: DestructiveAction): Alternative[];
}

interface ConfirmationPrompt {
  title: string;
  message: string;
  details: string[];
  warningLevel: 'caution' | 'warning' | 'danger';
  confirmButtonText: string;
  cancelButtonText: string;
  alternatives?: Alternative[];
}

interface Alternative {
  description: string;
  action: string;
  safetyLevel: SafetyLevel;
}

interface ActionDecision {
  proceed: boolean;
  alternativeChosen?: Alternative;
  userNote?: string;
}
```

## Data Models

### Simplified Execution Data Model

```typescript
interface ToolExecution {
  id: string;
  toolName: string;
  parameters: Record<string, any>;
  context: ExecutionContext;
  safetyEvaluation: SafetyEvaluation;
  userConfirmation?: UserConfirmation;
  result: ToolResult;
  timestamp: Date;
  executionTime: number;
  success: boolean;
}

interface SafetyMetrics {
  toolName: string;
  totalExecutions: number;
  confirmationsRequested: number;
  confirmationsApproved: number;
  confirmationsDenied: number;
  falsePositives: number; // Safe actions that required confirmation
  averageConfirmationTime: number;
}

// No more permission or role-based data models
```

### Database Schema Changes

```sql
-- Remove permission-related tables
DROP TABLE IF EXISTS tool_permissions;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS permission_matrices;

-- Simplified safety constraint tracking
CREATE TABLE safety_evaluations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  tool_name VARCHAR NOT NULL,
  safety_level VARCHAR NOT NULL, -- 'safe' or 'potentially_destructive'
  requires_confirmation BOOLEAN NOT NULL,
  warning_message TEXT,
  affected_elements JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

-- User confirmation tracking
CREATE TABLE user_confirmations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  safety_evaluation_id UUID REFERENCES safety_evaluations(id),
  confirmed BOOLEAN NOT NULL,
  confirmation_time_ms INTEGER,
  user_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Simplified tool execution tracking (no permission fields)
CREATE TABLE tool_executions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID REFERENCES conversations(id),
  tool_name VARCHAR NOT NULL,
  parameters JSONB,
  safety_evaluation_id UUID REFERENCES safety_evaluations(id),
  success BOOLEAN NOT NULL,
  execution_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- Safety metrics for system improvement
CREATE TABLE safety_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tool_name VARCHAR NOT NULL,
  date DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  confirmations_requested INTEGER DEFAULT 0,
  confirmations_approved INTEGER DEFAULT 0,
  confirmations_denied INTEGER DEFAULT 0,
  false_positives INTEGER DEFAULT 0,
  average_confirmation_time_ms INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(tool_name, date)
);
```

## Implementation Strategy

### Phase 1: Create Safety Constraint System

1. **Build ActionAnalyzer**: Implement logic to detect destructive actions
2. **Create ConfirmationManager**: Build user confirmation flow
3. **Implement AuditLogger**: Simple logging without permission context

### Phase 2: Simplify Tool Registry

1. **Remove Permission System**: Delete role-based access control code
2. **Update Tool Registration**: Change to simple safety level approach
3. **Modify Execution Engine**: Remove permission checks, add safety constraints

### Phase 3: Update Database and Migration

1. **Create Migration Script**: Remove permission tables, add safety constraint tables
2. **Update Data Models**: Remove permission-related fields
3. **Migrate Existing Data**: Convert any existing permission data to safety levels

### Phase 4: Frontend Integration

1. **Build Confirmation UI**: Create clear, user-friendly confirmation dialogs
2. **Update Tool Execution Flow**: Remove permission-related UI elements
3. **Add Safety Feedback**: Show users what safety checks are happening

## Error Handling

### Safety Constraint Errors

**Error Categories**:

1. **Analysis Errors**: Unable to determine if action is destructive
2. **Confirmation Errors**: User confirmation flow failures
3. **Execution Errors**: Tool execution failures after confirmation

**Error Recovery Strategies**:

```typescript
interface SafetyErrorHandler {
  handleAnalysisError(error: AnalysisError): SafetyFallback;
  handleConfirmationError(error: ConfirmationError): ConfirmationFallback;
  handleExecutionError(error: ExecutionError): ExecutionFallback;
}

interface SafetyFallback {
  defaultToSafe: boolean;
  requireConfirmation: boolean;
  fallbackMessage: string;
}
```

## Testing Strategy

### Unit Tests

**Safety Constraint System Tests**:

- Action analysis accuracy for various tool calls
- Confirmation prompt generation and clarity
- User response handling and decision logic
- Audit logging without permission context

**Simplified Tool Registry Tests**:

- Tool registration with safety levels
- Tool execution without permission filtering
- Safety constraint integration
- Monitoring and metrics collection

### Integration Tests

**End-to-End Safety Flow**:

- Complete flow from user request to safety evaluation
- Confirmation dialog display and user interaction
- Tool execution after confirmation
- Audit logging and metrics tracking

**Migration Tests**:

- Permission system removal without breaking existing functionality
- Data migration from permission-based to safety-based approach
- Backward compatibility during transition

### User Experience Tests

**Confirmation Dialog Tests**:

- Clarity and understandability of confirmation messages
- Appropriate confirmation requests (not too many, not too few)
- Alternative suggestion accuracy and usefulness
- User decision tracking and learning

## Security Considerations

### Security Without Permissions

**Technical Safeguards**:

1. **Input Sanitization**: Validate all tool parameters regardless of user
2. **Rate Limiting**: Prevent abuse based on system resources, not user roles
3. **Audit Logging**: Track all actions for monitoring and debugging
4. **Resource Protection**: Prevent access to unauthorized files through technical controls
5. **System Monitoring**: Alert on unusual patterns without using permission data

**Safety Measures**:

```typescript
interface SecurityWithoutPermissions {
  sanitizeInput(parameters: any): SanitizedParameters;
  enforceRateLimit(userId: string, toolName: string): RateLimitResult;
  validateResourceAccess(resourcePath: string): AccessValidation;
  monitorSystemHealth(): SystemHealthStatus;
  detectAbusePatterns(executions: ToolExecution[]): AbuseDetection;
}
```

## Performance Considerations

### Simplified System Performance

**Performance Benefits**:

- **Reduced Database Queries**: No permission lookups or role checks
- **Faster Tool Execution**: Direct execution without permission validation
- **Simpler Caching**: No permission-based cache invalidation
- **Reduced Memory Usage**: No permission matrices or role hierarchies

**Optimization Strategies**:

- Cache safety evaluations for identical tool calls
- Optimize destructive action detection algorithms
- Implement efficient confirmation dialog rendering
- Use lightweight audit logging

## Monitoring and Analytics

### Safety-Focused Analytics

**Key Metrics**:

- Safety evaluation accuracy (false positives/negatives)
- User confirmation patterns and response times
- Tool execution success rates without permission barriers
- System performance improvements after permission removal

**Dashboard Components**:

- Safety constraint effectiveness
- User experience metrics (confirmation frequency, user satisfaction)
- System health without permission overhead
- Tool usage patterns and trends
