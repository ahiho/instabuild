# Tool Loop Debugging

This project includes dedicated logging for AI SDK tool loop debugging.

## Debug Log File

All tool loop debug information is written to:

```
logs/tool-loop-debug.log
```

This file contains structured, easy-to-read information about:

- Stop conditions configuration
- Step-by-step execution progress
- Stop reason analysis
- Raw AI SDK responses
- Complete execution summaries
- **Raw OpenAI API requests and responses** (HTTP-level debugging)

## Enable/Disable

Tool loop debugging is **enabled by default** in development mode.

To explicitly control it, set the environment variable:

```bash
# Enable
TOOL_LOOP_DEBUG=true

# Disable
TOOL_LOOP_DEBUG=false
```

## OpenAI Request/Response Logging

**NEW in v2.0**: The debug log now includes raw HTTP requests and responses from OpenAI API.

This helps debug issues like:

- Why the tool loop stops with 'unknown' finish reason
- What OpenAI actually returns vs what the SDK reports
- Streaming response format and content
- API errors and rate limits

### What Gets Logged

1. **📤 OPENAI API REQUEST** - Before each API call:
   - Request URL and method
   - Request headers (API keys are redacted)
   - Full request body (model, messages, tools, etc.)
   - Timestamp

2. **📥 OPENAI API RESPONSE** - After each API call:
   - Response status and headers
   - Full response body (including streaming events)
   - Response duration in milliseconds
   - Timestamp

3. **❌ OPENAI API ERROR** - If API call fails:
   - Error details and stack trace
   - Request duration before failure
   - Timestamp

### Streaming Response Format

For streaming responses (which the SDK uses), the log includes:

- First 5 streaming events (SSE format)
- Last streaming event
- Total event count
- This helps understand what finish_reason OpenAI actually sent

## Log File Format

The log file uses a structured format with clear sections:

```
================================================================================
Tool Loop Debug Session Started: 2025-11-18T12:00:00.000Z
================================================================================

--------------------------------------------------------------------------------
[2025-11-18T12:00:01.000Z] 🔧 STOP CONDITIONS CONFIGURED
--------------------------------------------------------------------------------
{
  "conversationId": "...",
  "Max Steps": 80,
  "Task Complexity": "moderate",
  ...
}

--------------------------------------------------------------------------------
[2025-11-18T12:00:01.500Z] 📤 OPENAI API REQUEST
--------------------------------------------------------------------------------
{
  "Method": "POST",
  "URL": "https://api.openai.com/v1/chat/completions",
  "Headers": {
    "Authorization": "Bearer [REDACTED]",
    "Content-Type": "application/json"
  },
  "=== REQUEST BODY ===": {
    "model": "gpt-4",
    "messages": [...],
    "tools": [...],
    "stream": true
  }
}

--------------------------------------------------------------------------------
[2025-11-18T12:00:01.800Z] 📥 OPENAI API RESPONSE
--------------------------------------------------------------------------------
{
  "Duration (ms)": 300,
  "Status": "200 OK",
  "=== RESPONSE BODY ===": {
    "format": "SSE",
    "eventCount": 25,
    "events": [
      { "id": "chatcmpl-...", "choices": [{ "delta": { "content": "..." } }] },
      ...
    ],
    "lastEvent": {
      "id": "chatcmpl-...",
      "choices": [{ "finish_reason": "stop", "delta": {} }]
    }
  }
}

--------------------------------------------------------------------------------
[2025-11-18T12:00:02.000Z] ⏩ INTERMEDIATE STEP (Continuing)
--------------------------------------------------------------------------------
{
  "Step": "2/80",
  "Tool Calls": 3,
  ...
}

--------------------------------------------------------------------------------
[2025-11-18T12:00:05.000Z] 🔍 RAW FINAL RESULT FROM AI SDK
--------------------------------------------------------------------------------
{
  "=== FINISH REASON ===": {
    "Finish Reason": "stop",
    ...
  },
  ...
}

--------------------------------------------------------------------------------
[2025-11-18T12:00:05.000Z] 📊 COMPREHENSIVE STOP REASON ANALYSIS
--------------------------------------------------------------------------------
{
  "=== FINAL VERDICT ===": {
    "Finish Reason": "stop",
    "Interpretation": "Model completed task naturally"
  },
  "=== STEP-BY-STEP FINISH REASONS ===": [
    { "stepIndex": 0, "finishReason": "unknown", ... },
    { "stepIndex": 1, "finishReason": "unknown", ... },
    { "stepIndex": 2, "finishReason": "stop", ... }
  ]
}

================================================================================
```

## What to Look For

### Understanding 'unknown' Finish Reasons

If you see `finishReason: 'unknown'` in the logs:

1. **Check if it's an intermediate step**
   - Look for `⏩ INTERMEDIATE STEP (Continuing)`
   - This is normal during multi-step execution

2. **Check the final result**
   - Look for `📊 COMPREHENSIVE STOP REASON ANALYSIS`
   - The `=== FINAL VERDICT ===` section shows the real stop reason

3. **Inspect step-by-step patterns**
   - Look at `=== STEP-BY-STEP FINISH REASONS ===`
   - See which step actually triggered the stop

4. **🆕 Check the raw OpenAI response** (NEW):
   - Look for the `📥 OPENAI API RESPONSE` sections
   - Find the `lastEvent` in the response body
   - Check what `finish_reason` OpenAI actually returned
   - Compare OpenAI's finish_reason with what the SDK reports
   - This helps identify if the issue is in OpenAI or the SDK

### Common Scenarios

#### Scenario 1: Natural Completion

```json
{
  "Finish Reason": "stop",
  "Interpretation": "Model completed task naturally"
}
```

✅ Normal - The model finished its task successfully

#### Scenario 2: Step Limit Reached

```json
{
  "Finish Reason": "other",
  "Reached Step Limit": true,
  "Steps Executed": 80,
  "Max Steps Configured": 80
}
```

⚠️ Hit the configured step limit - may need to increase max steps

#### Scenario 3: Unknown in Final Result

```json
{
  "Finish Reason": "unknown",
  "Response Length": 0,
  "Last Step Had Tool Calls": false
}
```

🔍 Check `🔍 RAW FINAL RESULT` section for:

- `lastStepFinishReason`
- `warnings`
- `error`
- `providerMetadata`

## Viewing the Logs

### Tail the log file in real-time:

```bash
tail -f logs/tool-loop-debug.log
```

### Search for specific conversation:

```bash
grep "conversationId-here" logs/tool-loop-debug.log
```

### Find all final verdicts:

```bash
grep -A 5 "FINAL VERDICT" logs/tool-loop-debug.log
```

### Clear old logs:

```bash
rm logs/tool-loop-debug.log
```

## Log Rotation

The log file is append-only. To prevent it from growing too large:

1. **Manual rotation:**

   ```bash
   mv logs/tool-loop-debug.log logs/tool-loop-debug.$(date +%Y%m%d).log
   ```

2. **Or clear it periodically:**
   ```bash
   truncate -s 0 logs/tool-loop-debug.log
   ```

## Integration with Regular Logs

Tool loop debug information is written to **both**:

- `logs/tool-loop-debug.log` - Structured, detailed format
- `stdout` - Concise debug messages via Winston logger

This allows you to:

- Monitor in real-time via stdout
- Analyze in detail via the dedicated log file

## Troubleshooting 'unknown' Finish Reason

If the tool loop stops with 'unknown' finish reason, follow these steps:

### Step 1: Find the OpenAI Response

```bash
# Search for the last OpenAI response in the conversation
grep -A 30 "📥 OPENAI API RESPONSE" logs/tool-loop-debug.log | tail -50
```

### Step 2: Check the lastEvent

Look for the `lastEvent` field in the response body. This shows what OpenAI actually returned:

```json
{
  "lastEvent": {
    "id": "chatcmpl-...",
    "choices": [
      {
        "finish_reason": "stop", // ← What did OpenAI actually return?
        "delta": {}
      }
    ]
  }
}
```

### Step 3: Compare with SDK's Interpretation

Find the corresponding `🔍 RAW FINAL RESULT FROM AI SDK` section and check:

```json
{
  "=== FINISH REASON ===": {
    "Finish Reason": "unknown" // ← What does the SDK report?
  }
}
```

### Step 4: Diagnose the Issue

| OpenAI Returns    | SDK Reports | Diagnosis                                         |
| ----------------- | ----------- | ------------------------------------------------- |
| `stop`            | `unknown`   | SDK parsing bug - check AI SDK version            |
| `length`          | `unknown`   | Token limit issue - check `max_tokens` in request |
| `tool_calls`      | `unknown`   | Tool execution issue - check tool results         |
| `null` or missing | `unknown`   | Streaming incomplete - check for network errors   |

### Step 5: Check for Multiple Requests

The tool loop may make multiple API calls. To see all of them:

```bash
# Count OpenAI API calls in this conversation
grep "📤 OPENAI API REQUEST" logs/tool-loop-debug.log | grep "conversationId-here" | wc -l

# See all finish_reasons from OpenAI
grep -A 50 "📥 OPENAI API RESPONSE" logs/tool-loop-debug.log | grep finish_reason
```

### Common Fixes

1. **SDK reports 'unknown' but OpenAI returns 'stop'**:
   - This is a known issue in some AI SDK versions
   - The task actually completed successfully
   - Upgrade to latest AI SDK version

2. **Both report 'unknown'**:
   - Check if streaming was interrupted
   - Look for `❌ OPENAI API ERROR` in logs
   - Check network stability

3. **OpenAI returns 'tool_calls' but SDK shows 'unknown'**:
   - The AI wants to call more tools
   - Check if tool results are properly formatted
   - Verify tool execution didn't fail
