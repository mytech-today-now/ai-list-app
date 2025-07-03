# AI ToDo MCP – AI-Driven PWA Task Manager

A cutting-edge Progressive Web App (PWA) for task management that puts AI agents at the center of the experience. Built with the **Modular Command Protocol (MCP)**, this system enables AI agents to autonomously and collaboratively manage tasks and lists.

## 🎯 Key Features

- **AI-First Architecture**: Designed for AI agents as primary users
- **Modular Command Protocol (MCP)**: Universal language for AI interaction
- **Multi-Agent System**: Reader, Executor, and Planner agents with distinct roles
- **Hierarchical Task Management**: Nested lists and sub-tasks with dependencies
- **Progressive Web App**: Offline-ready with native app-like experience
- **Real-time Collaboration**: Multi-agent coordination and conflict resolution
- **Comprehensive Logging**: Full audit trail with rollback capabilities
- **Extensible Plugin System**: Custom actions and integrations

## 🏗️ Architecture

```
Frontend (React PWA) ←→ MCP Core Engine ←→ AI Agent System
        ↓                      ↓                    ↓
   IndexedDB Storage    Backend (Node.js)    OpenAI API
```

### Core Components

- **MCP Core Engine**: Command parsing, validation, and execution
- **AI Agent System**: Specialized agents for different task types
- **React Frontend**: Responsive UI with MCP-aware hooks
- **Node.js Backend**: API server with SQLite/PostgreSQL
- **Storage Layer**: Encrypted IndexedDB with offline sync

## 🤖 MCP Command Examples

```bash
# Create a new task list
create:list:weekend_tasks{"title":"Weekend Tasks","priority":"high"}

# Add items to the list
create:item:buy_groceries{"list":"weekend_tasks","priority":"medium"}

# Execute all tasks in a list
execute:list:weekend_tasks{}

# Check status with recursive details
status:list:weekend_tasks{"recursive":true}

# Mark tasks as completed
mark_done:item:buy_groceries{}
```

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ and npm 9+
- Git

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/ai-todo-mcp.git
cd ai-todo-mcp

# Install dependencies
npm install

# Start development servers
npm run dev
```

This will start:
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- MCP CLI: Available in browser console

### Environment Setup

Create `.env` files in both `apps/frontend` and `apps/backend`:

```bash
# apps/backend/.env
DATABASE_URL="sqlite:./data/ai-todo.db"
OPENAI_API_KEY="your-openai-api-key"
JWT_SECRET="your-jwt-secret"
PORT=3001
NODE_ENV=development

# apps/frontend/.env
VITE_API_URL="http://localhost:3001"
VITE_ENABLE_PWA=true
```

### Database Setup

The backend uses SQLite for development and PostgreSQL for production:

```bash
# Navigate to backend directory
cd apps/backend

# Run database migrations
npm run db:migrate

# Seed with sample data
npm run db:seed

# Or do both at once
npm run db:reset
```

## 📁 Project Structure

```
ai-todo-mcp/
├── apps/
│   ├── frontend/          # React PWA application
│   └── backend/           # Node.js API server
├── packages/
│   ├── mcp-core/          # MCP engine and protocol
│   ├── shared-types/      # TypeScript type definitions
│   └── storage/           # Storage utilities and encryption
├── docs/                  # Documentation and specifications
│   ├── MCP_SPECIFICATION.md
│   ├── DATABASE_SCHEMA.md
│   └── api/               # Generated API docs
└── README.md
```

## 🧠 AI Agent Roles

### Reader Agent
- **Permissions**: `read`, `status`
- **Purpose**: Query and report on system state
- **Use Cases**: Status checks, data retrieval, reporting

### Executor Agent
- **Permissions**: `read`, `execute`, `mark_done`, `reorder`
- **Purpose**: Execute tasks and manage completion
- **Use Cases**: Task execution, progress tracking, workflow automation

### Planner Agent
- **Permissions**: `create`, `read`, `update`, `plan`
- **Purpose**: Create and modify task structures
- **Use Cases**: Task planning, list organization, dependency management

## 🔧 Development

### Available Scripts

```bash
# Development
npm run dev              # Start all development servers
npm run dev:frontend     # Start only frontend
npm run dev:backend      # Start only backend

# Building
npm run build           # Build all packages
npm run build:frontend  # Build frontend only
npm run build:backend   # Build backend only

# Testing
npm run test           # Run all tests
npm run test:frontend  # Test frontend
npm run test:backend   # Test backend

# Code Quality
npm run lint           # Lint all code
npm run lint:fix       # Fix linting issues
npm run type-check     # TypeScript type checking
```

### Adding New MCP Commands

1. Define the command in `packages/shared-types/src/index.ts`
2. Add validation in `packages/mcp-core/src/validation/schemas.ts`
3. Implement execution logic in `packages/mcp-core/src/executor/`
4. Add tests in the respective `*.test.ts` files

## 📱 PWA Features

- **Offline Support**: Full functionality without internet
- **Install Prompt**: Add to home screen on mobile/desktop
- **Push Notifications**: Task reminders and updates
- **Background Sync**: Sync when connection restored
- **Responsive Design**: Works on all device sizes

## 🔒 Security

- **Encrypted Storage**: Client-side data encryption
- **JWT Authentication**: Secure API access
- **Permission System**: Role-based access control
- **Input Validation**: Comprehensive validation at all layers
- **Audit Logging**: Complete action history

## 🧪 Testing

The project includes comprehensive testing:

- **Unit Tests**: Jest for all packages
- **Integration Tests**: API and MCP command testing
- **E2E Tests**: Cypress for full user workflows
- **Type Safety**: Full TypeScript coverage

## 📚 Documentation

- [MCP Specification](./docs/MCP_SPECIFICATION.md) - Complete protocol documentation
- [Database Schema](./docs/DATABASE_SCHEMA.md) - Data model and relationships
- [API Documentation](./docs/api/) - Generated API docs
- [Architecture Guide](./docs/ARCHITECTURE.md) - System design details

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Commit changes: `git commit -m 'Add amazing feature'`
4. Push to branch: `git push origin feature/amazing-feature`
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with [React](https://reactjs.org/) and [Node.js](https://nodejs.org/)
- Powered by [OpenAI](https://openai.com/) for AI capabilities
- Inspired by modern task management and AI agent systems
