# InstaBuild - AI-Powered Landing Page Builder

Build stunning landing pages with AI. Tell the AI what you want, and it generates fully functional, animated pages in minutes.

## What is InstaBuild?

InstaBuild is an intelligent landing page builder that works like having an AI developer on your team. Instead of dragging and dropping elements or writing code, you describe what you want and the AI builds it for you.

**Key capabilities:**
- **Natural language requests** - Just describe your landing page
- **Real code generation** - Creates actual HTML, CSS, and JavaScript
- **Smart animations** - Includes modern entrance effects and hover interactions
- **Multiple design themes** - Professional, vibrant, luxury, e-commerce, and more
- **Live preview** - See changes instantly in your browser
- **Version control** - All code automatically backed up on GitHub
- **Full customization** - Generated code is 100% editable

## Features

### 🎨 Design System
- **10 built-in themes** optimized for different industries
- **40+ animation patterns** for modern, engaging interactions
- **Responsive design** that works on all devices
- **Accessibility built-in** with semantic HTML and ARIA labels

### 🤖 AI Magic
- **Multi-step reasoning** - AI breaks down complex requests into logical steps
- **Error recovery** - Automatically fixes issues and tries alternative approaches
- **Transparency** - See the AI's thought process as it works
- **Learning system** - Improves over time with your feedback

### 🔒 Security & Privacy
- **Isolated sandboxes** - User code runs in secure Docker containers
- **Zero data leakage** - Cannot access other users' projects
- **Automatic backups** - Code synced to GitHub after each change
- **No vendor lock-in** - Export your code anytime

### 👥 Team Collaboration
- **Project sharing** - Work together on landing pages
- **Conversation history** - Track all changes and decisions
- **Easy handoff** - Download code and deploy anywhere

## Getting Started

### Quick Start (Development)

```bash
# Install dependencies
pnpm install

# Start development server
pnpm dev

# Open browser to http://localhost:5173
```

### Project Setup

1. **Sign up** - Create an account or login with Google/GitHub
2. **Create a project** - Name your landing page project
3. **Describe your vision** - Tell the AI what you want
4. **Watch it build** - See the AI generate code in real-time
5. **Refine & iterate** - Request changes, add features, improve design

## Project Structure

```
InstaBuild/
├── apps/
│   ├── backend/          # API server (Fastify)
│   └── frontend/         # Web app (React)
├── packages/
│   └── shared/           # Shared types and utilities
├── sandbox-template/     # Base template for generated projects
└── AGENTS.md             # Technical development guidelines
```

## Tech Stack

**Frontend:**
- React 19 with TypeScript
- Vite for fast builds
- Tailwind CSS for styling
- Framer Motion for animations

**Backend:**
- Fastify API server
- PostgreSQL database
- Docker + gVisor for secure sandboxes
- Vercel AI SDK for multi-step AI execution

## Environment Setup

### Required for Development

```bash
# Create .env files in both directories:
# apps/backend/.env
# apps/frontend/.env

# Backend needs:
GITHUB_TOKEN=ghp_xxxxx  # For code backup to GitHub
DATABASE_URL=postgresql://...

# Frontend needs:
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

See `AGENTS.md` for full environment variable details.

## How It Works

### The AI Process

1. **Understand** - AI analyzes your description
2. **Plan** - Breaks down into build steps
3. **Choose theme** - Selects appropriate design theme
4. **Generate** - Creates HTML, CSS, JavaScript
5. **Validate** - Checks for errors and accessibility
6. **Deploy** - Starts live preview in sandbox
7. **Backup** - Saves code to GitHub

### Example Interaction

```
You: "Create a SaaS landing page for a project management tool.
      Include pricing tables, feature comparison, and customer testimonials."

AI:
1. "I'll use the Professional SaaS theme with minimal colors"
2. "Creating navbar with pricing CTA button..."
3. "Building hero section with feature highlights..."
4. "Adding pricing comparison table..."
5. "Including customer testimonials carousel..."
6. "Adding smooth scroll animations and hover effects..."

Result: Fully functional landing page ready to preview
```

## Commands

```bash
pnpm dev              # Start all development servers
pnpm build            # Build for production
pnpm test             # Run all tests
pnpm lint             # Check code quality
pnpm type-check       # Verify TypeScript
```
