<p align="center">
  <img src="docs/assets/logo.png" alt="Imagenix Logo" width="180" />
</p>

<h1 align="center">Imagenix</h1>

<p align="center">
  <strong>AI-Powered Image Dataset Platform</strong><br/>
  Build, annotate, augment, and export production-ready image datasets for computer vision model training.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-14.2-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/NestJS-10.3-e0234e?logo=nestjs" alt="NestJS" />
  <img src="https://img.shields.io/badge/TypeScript-5.4-3178c6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/PostgreSQL-15.6-336791?logo=postgresql" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/Prisma-7.8-2d3748?logo=prisma" alt="Prisma" />
  <img src="https://img.shields.io/badge/Redis-7.2-dc382d?logo=redis" alt="Redis" />
  <img src="https://img.shields.io/badge/License-MIT-22c55e" alt="License" />
</p>

---

## Overview

Imagenix is a full-stack platform that handles the entire image dataset pipeline for ML teams.

| Stage        | Capability                                                                          |
| ------------ | ----------------------------------------------------------------------------------- |
| **Ingest**   | Bulk upload with automatic duplicate detection                                      |
| **Annotate** | Bounding box editor or AI auto-annotation (Grounding DINO)                          |
| **Augment**  | Classical transforms, random pipelines, or Stable Diffusion generative augmentation |
| **Export**   | COCO JSON, YOLO TXT, Pascal VOC XML, or labeled image archives                      |

---

## Tech Stack

| Layer              | Technologies                                                        |
| ------------------ | ------------------------------------------------------------------- |
| **Frontend**       | Next.js 14, React 18, TypeScript, Tailwind CSS, shadcn/ui, Zustand  |
| **Backend**        | NestJS 10, Prisma 7.8, `@prisma/adapter-pg`, Passport + JWT, BullMQ |
| **Database**       | PostgreSQL 15.6, Redis 7.2                                          |
| **Storage**        | MinIO (S3-compatible), presigned URLs                               |
| **ML Service**     | FastAPI, PyTorch, Stable Diffusion v1.5, ControlNet                 |
| **Infrastructure** | Docker Compose, Turborepo, ESLint, Prettier                         |

---

## Quick Start

### Prerequisites

| Requirement    | Version    |
| -------------- | ---------- |
| Node.js        | >= 20.11.0 |
| npm            | >= 10.2.0  |
| Docker Desktop | Latest     |

### 1. Start Infrastructure

```bash
docker compose up -d
```

Starts PostgreSQL (5432), Redis (6379), and MinIO (9000/9001).

### 2. Install & Set Up

```bash
npm install
npm run db:generate
npm run db:migrate
npm run db:seed
```

### 3. Run

```bash
npm run dev
```

---

## Access Points

| Service           | URL                          | Credentials                     |
| ----------------- | ---------------------------- | ------------------------------- |
| **Application**   | http://localhost:3000        | `demo@imagenix.ai` / `Demo123!` |
| **Backend API**   | http://localhost:3001/api/v1 | JWT Bearer token                |
| **MinIO Console** | http://localhost:9001        | `minioadmin` / `minioadmin123`  |
| **Prisma Studio** | `npm run db:studio`          | —                               |

---

## Project Structure

```
imagenix/
├── apps/
│   ├── frontend/          # Next.js 14 — UI, annotation editor, augmentation views
│   ├── backend/           # NestJS — REST API, jobs, storage, auth
│   └── ml-service/        # FastAPI + PyTorch — generative augmentation
├── packages/
│   ├── shared-types/      # Shared TypeScript interfaces
│   └── ui-components/     # Shared component library
├── docker-compose.yml
└── turbo.json
```

---

## API Reference

**Base URL:** `http://localhost:3001/api/v1`  
All authenticated endpoints require: `Authorization: Bearer <access_token>`

```
POST   /auth/register          POST   /auth/login
GET    /projects               POST   /projects/:id/datasets
GET    /datasets/:id/images    POST   /datasets/:id/images/upload-url
GET    /images/:id/annotations POST   /images/:id/annotations
POST   /datasets/:id/jobs/auto-annotate
POST   /datasets/:id/augmentation/classical
POST   /datasets/:id/augmentation/random
POST   /datasets/:id/augmentation/generative
POST   /datasets/:id/exports
```

---

## Troubleshooting

**Ports in use** — `taskkill /F /IM node.exe /T` (Windows)

**Database won't connect** — `docker compose down && docker compose up -d`

**`db:generate` fails (EPERM on Windows)** — Close all terminals, kill Node processes, then `rmdir /s /q node_modules && npm install && npm run db:generate`

**MinIO buckets missing** — Open http://localhost:9001 and manually create `imagenix-uploads` and `imagenix-exports`

---

## License

[MIT License](LICENSE)
