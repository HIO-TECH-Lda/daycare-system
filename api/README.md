# API Starter Kit

A reusable **Node.js + Express + TypeScript + MongoDB** API starter kit. Use it as the base for new backend projects.

## What's Included

- **Express + TypeScript** — REST API with type safety
- **MongoDB (Mongoose)** — Database connection and models
- **JWT auth** — Register, login, refresh, profile, change password, logout
- **User model** — Generic user (name, email, password, role); extend per project
- **Security** — Helmet, CORS, rate limiting
- **Upload** — Multer + **Cloudinary** (avatar, single/multiple images)
- **Audit log** — Middleware that logs create/update/delete by entity and user
- **Utils** — Env validation, messages, Joi validation, ApiError, ApiResponse, catchAsync

## Quick Start

```bash
npm install
cp env.example .env
# Edit .env: set MONGODB_URI and JWT_SECRET
npm run dev
```

- **Health:** `GET http://localhost:3002/health`
- **API info:** `GET http://localhost:3002/api/v1`
- **Auth:** `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, etc.

## Documentation for New Projects

**→ [Starter Kit Guide (docs/STARTER-KIT-GUIDE.md)](docs/STARTER-KIT-GUIDE.md)**

The guide explains:

- Prerequisites and setup
- Project structure
- Environment variables
- **Adding a new resource** (model → service → controller → route)
- Authentication (JWT, roles, protecting routes)
- **File upload & Cloudinary**
- **Audit logging** (how it works, excluding routes, querying)
- Conventions (messages, validation, errors)
- Testing and deployment

Use that doc when starting a new project from this kit.

## Daycare Backend (this repo)

When building the **daycare management system** backend from this starter kit, use the frontend’s backend specification:

**→ [Backend Spec (../web-app/docs/BACKEND-SPEC.md)](../web-app/docs/BACKEND-SPEC.md)**

It defines:

- User roles (`responsavel`, `staff`, `administrador`) and auth response shape
- All resources (classes, children, invoices, messages, etc.) and their endpoints
- Request/response bodies and access rules per role
- Implementation checklist and reference to this starter kit guide

Implement each resource following the [Starter Kit Guide](docs/STARTER-KIT-GUIDE.md) (model → service → controller → route).

## Scripts

| Script       | Description              |
|-------------|--------------------------|
| `npm run dev`  | Start with nodemon (TS, auto-reload) |
| `npm run build`| Compile to `dist/`       |
| `npm start`    | Run `dist/app.js`        |
| `npm test`     | Run Jest tests           |
| `npm run lint`  | Run ESLint               |

## License

MIT
