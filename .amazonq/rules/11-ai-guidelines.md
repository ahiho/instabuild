# AI-Specific Guidelines

## Prompt Engineering

- Store and version AI prompts in the codebase
- Document prompt templates
- Use system messages for context
- Keep prompts clear and specific

## Token Management

- Monitor and optimize token usage
- Use streaming for long responses
- Implement token counting
- Cache common completions

## Error Recovery

- Implement fallbacks for AI service failures
- Handle rate limiting gracefully
- Provide default responses when AI is unavailable
- Log AI errors for debugging

## Streaming Responses

- Use streaming for better UX
- Show loading indicators
- Handle partial responses
- Implement abort functionality

## Model Selection

- Document which AI models are used and why
- Consider cost vs. quality tradeoffs
- Use appropriate models for different tasks
- Test with multiple models when possible
- Keep model versions consistent
