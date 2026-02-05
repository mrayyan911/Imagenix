# Imagenix

AI Dataset Intelligence Platform - A cloud platform for building high-quality image datasets faster using AI.

## Features

- **Dataset Upload & Management**: Upload and organize image datasets with duplicate detection
- **Manual Annotation**: Interactive bounding box annotation interface
- **Auto Annotation**: AI-powered automatic object detection and labeling
- **Dataset Export**: Export datasets in COCO, YOLO, and Pascal VOC formats

## Tech Stack

### Frontend
- Next.js 14.1.0
- TypeScript 5.4.2
- Tailwind CSS 3.4.1
- Zustand 4.5.2
- React Hook Form 7.50.0
- shadcn/ui

### Backend
- Node.js 20.11.1
- NestJS 10.3.2
- PostgreSQL 15.6
- Prisma 5.10.2
- Redis 7.2.4
- JWT Authentication

## Prerequisites

- Node.js >= 20.11.0
- Docker & Docker Compose
- npm >= 10.2.0

## Getting Started

### 1. Clone and Install

```bash
cd imagenix
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
# Edit .env with your configuration
```

### 3. Start Infrastructure

```bash
# Start PostgreSQL, Redis, and MinIO
npm run docker:up
```

### 4. Setup Database

```bash
# Generate Prisma client
npm run db:generate

# Run migrations
npm run db:migrate

# (Optional) Seed sample data
npm run db:seed
```

### 5. Start Development Servers

```bash
# Start both frontend and backend in development mode
npm run dev
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- MinIO Console: http://localhost:9001 (admin: minioadmin / minioadmin123)

## Project Structure

```
imagenix/
├── apps/
│   ├── frontend/          # Next.js application
│   └── backend/           # NestJS API server
├── packages/
│   ├── shared-types/      # Shared TypeScript types
│   └── ui-components/     # Shared UI components
├── docs/                  # Documentation
├── infrastructure/        # Deployment configs
├── docker-compose.yml     # Local development services
└── package.json           # Workspace root
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start all apps in development mode |
| `npm run build` | Build all apps for production |
| `npm run lint` | Lint all packages |
| `npm run test` | Run all tests |
| `npm run docker:up` | Start Docker services |
| `npm run docker:down` | Stop Docker services |
| `npm run db:migrate` | Run database migrations |
| `npm run db:studio` | Open Prisma Studio |

## API Documentation

The API follows RESTful conventions with base URL `/api/v1/`.

### Authentication
- `POST /api/v1/auth/register` - Create account
- `POST /api/v1/auth/login` - Login and get tokens
- `POST /api/v1/auth/refresh` - Refresh access token
- `POST /api/v1/auth/logout` - Revoke session

### Projects
- `GET /api/v1/projects` - List projects
- `POST /api/v1/projects` - Create project
- `GET /api/v1/projects/:id` - Get project
- `PATCH /api/v1/projects/:id` - Update project
- `DELETE /api/v1/projects/:id` - Delete project

### Datasets
- `POST /api/v1/projects/:id/datasets` - Create dataset
- `GET /api/v1/datasets/:id` - Get dataset

### Images
- `POST /api/v1/datasets/:id/images/upload-url` - Get upload URL
- `POST /api/v1/datasets/:id/images/commit` - Commit uploaded image
- `GET /api/v1/datasets/:id/images` - List images

### Annotations
- `POST /api/v1/images/:id/annotations` - Create annotation
- `PATCH /api/v1/annotations/:id` - Update annotation
- `DELETE /api/v1/annotations/:id` - Delete annotation

### Jobs
- `POST /api/v1/datasets/:id/jobs/auto-annotate` - Start auto-annotation
- `GET /api/v1/jobs/:id` - Get job status
- `POST /api/v1/jobs/:id/cancel` - Cancel job

### Exports
- `POST /api/v1/datasets/:id/exports` - Create export
- `GET /api/v1/exports/:id/download` - Get download URL

## License

MIT
