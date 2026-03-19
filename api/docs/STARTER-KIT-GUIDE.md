# API Starter Kit — Guide for New Projects

This guide is for developers starting a **new project** from this API starter kit. It describes what the kit includes, how to set up a project, and how to extend it with new features.

---

## Table of Contents

1. [What This Starter Includes](#1-what-this-starter-includes)
2. [Prerequisites & Setup](#2-prerequisites--setup)
3. [Project Structure](#3-project-structure)
4. [Environment Variables](#4-environment-variables)
5. [Adding a New Resource](#5-adding-a-new-resource)
6. [Authentication](#6-authentication)
7. [File Upload & Cloudinary](#7-file-upload--cloudinary)
8. [Audit Logging](#8-audit-logging)
9. [Conventions](#9-conventions)
10. [Testing](#10-testing)
11. [Deployment](#11-deployment)

---

## 1. What This Starter Includes

| Layer | What's Included |
|-------|-----------------|
| **Runtime** | Node.js, Express, TypeScript |
| **Database** | MongoDB via Mongoose |
| **Security** | Helmet, CORS, rate limiting, JWT auth |
| **Auth** | Register, login, refresh token, profile (get/update), change password, logout |
| **User model** | Generic user (name, email, password, role) — extend per project |
| **Upload** | Multer + Cloudinary (avatar, single image, multiple images) |
| **Audit log** | Middleware that logs create/update/delete by entity and user |
| **Utils** | Env validation, centralized messages, request validation (Joi), ApiError, ApiResponse, catchAsync, wrapHandler |

You get a running API with health check, `/api/v1` info, and auth routes. Everything else (products, orders, etc.) you add following the patterns below.

---

## 2. Prerequisites & Setup

### Prerequisites

- **Node.js** 18+ (LTS recommended)
- **MongoDB** (local or Atlas)
- **npm** or **yarn**

### Setup a New Project

1. **Clone or copy this repo** into your new project folder.
2. **Install dependencies:**
   ```bash
   npm install
   ```
3. **Copy environment file and edit:**
   ```bash
   cp env.example .env
   ```
   Set at least: `MONGODB_URI`, `JWT_SECRET`. See [Environment Variables](#4-environment-variables).
4. **Run in development:**
   ```bash
   npm run dev
   ```
5. **Verify:** Open `http://localhost:3002/health` — you should get `{ "status": "OK", ... }`.

### Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start with nodemon (TS, auto-reload) |
| `npm run build` | Compile TypeScript to `dist/` |
| `npm start` | Run compiled app (`dist/app.js`) |
| `npm test` | Run Jest tests |
| `npm run lint` | Run ESLint |

---

## 3. Project Structure

```
src/
├── app.ts                 # Express app, middleware, route mounting
├── config/
│   └── database.ts        # MongoDB connect/disconnect
├── controllers/           # Request handlers (one per domain)
├── middleware/
│   ├── auth.ts            # JWT + role checks (authenticateToken, requireAdmin, etc.)
│   ├── auditLog.ts        # Auto audit logging for mutations
│   └── upload.ts          # Multer: avatar, single/multiple images
├── models/                # Mongoose models (User, AuditLog, …)
├── routes/                # Express routers (mount in app.ts)
├── services/              # Business logic (authService, auditLogService, …)
├── templates/             # Email templates (e.g. Handlebars)
├── types/
│   └── index.ts           # Shared TypeScript types (e.g. IUser)
└── utils/
    ├── envValidation.ts   # Required/optional env vars
    ├── messages.ts        # Centralized API messages
    ├── validation.ts     # Joi schemas (auth, etc.)
    ├── ApiError.ts        # Custom error class
    ├── ApiResponse.ts     # Standard response helpers
    ├── catchAsync.ts      # Wrap async route handlers
    ├── wrapHandler.ts     # Alternative async wrapper
    └── cloudinary.ts      # Cloudinary upload/delete helpers
```

**Pattern:** For each new feature (e.g. “posts”), add: **model** → **service** → **controller** → **route**, then mount the route in `app.ts`.

---

## 4. Environment Variables

Use `.env` (never commit it). Start from `env.example`.

### Required

| Variable | Description |
|----------|-------------|
| `NODE_ENV` | `development` \| `production` \| `test` |
| `MONGODB_URI` | MongoDB connection string (e.g. Atlas or `mongodb://localhost:27017/yourdb`) |
| `JWT_SECRET` | Secret used to sign JWT tokens (use a long random string in production) |

### Optional (with defaults)

| Variable | Description | Default |
|----------|-------------|---------|
| `PORT` | Server port | `3002` |
| `JWT_EXPIRES_IN` | Access token TTL | `7d` |

### Optional (features)

| Variable | Description | Used by |
|----------|-------------|--------|
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name | Uploads |
| `CLOUDINARY_API_KEY` | Cloudinary API key | Uploads |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret | Uploads |
| `CLOUDINARY_FOLDER_NAME` | Base folder in Cloudinary | `cloudinary.ts` (e.g. per project) |
| `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` | SMTP for emails | Email service (if you add one) |

Env validation runs at startup in `utils/envValidation.ts`. Add or remove variables there when you add new features.

---

## 5. Adding a New Resource

Example: adding a **Posts** resource (create, read, update, delete).

### Step 1: Model (`src/models/Post.ts`)

```ts
import mongoose, { Document, Schema } from 'mongoose';

export interface IPost {
  _id?: string;
  title: string;
  body: string;
  author: mongoose.Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IPostDocument extends Omit<IPost, '_id'>, Document {}

const postSchema = new Schema<IPostDocument>(
  {
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    author: { type: Schema.Types.ObjectId, ref: 'User', required: true }
  },
  { timestamps: true }
);

export default mongoose.model<IPostDocument>('Post', postSchema);
```

### Step 2: Service (`src/services/postService.ts`)

Put business logic here; controller only parses request and calls service.

```ts
import Post from '../models/Post';

export class PostService {
  static async create(data: { title: string; body: string; authorId: string }) {
    const post = await Post.create({ ...data, author: data.authorId });
    return post;
  }

  static async findById(id: string) {
    const post = await Post.findById(id).populate('author', 'name email');
    if (!post) throw new Error('Post not found');
    return post;
  }

  static async update(id: string, data: Partial<{ title: string; body: string }>) {
    const post = await Post.findByIdAndUpdate(id, data, { new: true });
    if (!post) throw new Error('Post not found');
    return post;
  }

  static async delete(id: string) {
    const post = await Post.findByIdAndDelete(id);
    if (!post) throw new Error('Post not found');
    return post;
  }
}
```

### Step 3: Controller (`src/controllers/postController.ts`)

Use `catchAsync` or `wrapHandler` so async errors go to the global error handler. Use `ApiResponse` for consistent JSON.

```ts
import { Request, Response } from 'express';
import { PostService } from '../services/postService';
import { catchAsync } from '../utils/catchAsync';
import ApiResponse from '../utils/ApiResponse';

export const createPost = catchAsync(async (req: Request, res: Response) => {
  const user = (req as any).user;
  const post = await PostService.create({
    title: req.body.title,
    body: req.body.body,
    authorId: user.userId
  });
  res.status(201).json(ApiResponse.success(post, 'Post created', 201));
});

export const getPost = catchAsync(async (req: Request, res: Response) => {
  const post = await PostService.findById(req.params.id);
  res.json(ApiResponse.success(post));
});

// updatePost, deletePost similar...
```

### Step 4: Validation (`src/utils/validation.ts`)

Add a Joi schema and export it (and add to `validateRequest` if you use a generic validator):

```ts
export const createPostSchema = Joi.object({
  title: Joi.string().required().max(200),
  body: Joi.string().required()
});
```

### Step 5: Route (`src/routes/posts.ts`)

```ts
import { Router } from 'express';
import * as PostController from '../controllers/postController';
import { authenticateToken } from '../middleware/auth';
import { validateRequest, createPostSchema } from '../utils/validation';

const router = Router();

router.post('/', authenticateToken, validateRequest(createPostSchema), PostController.createPost);
router.get('/:id', PostController.getPost);
router.put('/:id', authenticateToken, PostController.updatePost);
router.delete('/:id', authenticateToken, PostController.deletePost);

export default router;
```

### Step 6: Mount in `app.ts`

```ts
import postRoutes from './routes/posts';

// After other routes
app.use('/api/v1/posts', postRoutes);
```

The **audit middleware** will log create/update/delete for `/api/v1/posts` automatically (see [Audit Logging](#8-audit-logging)).

---

## 6. Authentication

### How It Works

- **Access token:** JWT in `Authorization: Bearer <token>`.
- **Refresh token:** Stored per user (e.g. in User model or a separate collection); used at `POST /api/v1/auth/refresh` to get a new access token.
- **Roles:** The User model has a `role` field (e.g. `user`, `admin`). Middleware can restrict by role.

### Protecting Routes

```ts
import { authenticateToken, requireAdmin } from '../middleware/auth';

// Any logged-in user
router.get('/me', authenticateToken, SomeController.getMe);

// Admin only
router.delete('/users/:id', authenticateToken, requireAdmin, AdminController.deleteUser);
```

The middleware sets `req.user` (e.g. `userId`, `email`, `role`). Use it in controllers and services.

### Auth Endpoints (from the starter)

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Register |
| POST | `/api/v1/auth/login` | Login (returns access + refresh token) |
| POST | `/api/v1/auth/refresh` | New access token from refresh token |
| GET | `/api/v1/auth/me` | Current user (requires token) |
| PUT | `/api/v1/auth/me` | Update profile (optional: avatar via multipart) |
| PUT | `/api/v1/auth/change-password` | Change password |
| POST | `/api/v1/auth/logout` | Logout (invalidate refresh token) |

---

## 7. File Upload & Cloudinary

### Middleware (`src/middleware/upload.ts`)

- **Memory storage:** Files are kept in memory so you can upload to Cloudinary in the controller.
- **Fields:**
  - `uploadAvatar` — single file, field name `avatar`.
  - `uploadSingleImage` — single file, field name `image`.
  - `uploadMultipleImages` — up to 10 files, field name `images`.

Example: profile update with avatar

```ts
router.put(
  '/me',
  authenticateToken,
  uploadAvatar,        // multer: req.file is the uploaded file
  normalizeProfileBody,
  validateRequest(updateProfileSchema),
  AuthController.updateProfile
);
```

In the controller, if the client sent a file, `req.file` is set. You can convert to base64 and pass to Cloudinary (see below).

### Cloudinary (`src/utils/cloudinary.ts`)

- **Config:** Set `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (and optionally `CLOUDINARY_FOLDER_NAME`).
- **Upload from base64** (e.g. after multer):

  ```ts
  import { uploadBase64Image, deleteImage } from '../utils/cloudinary';

  const b64 = `data:${req.file.mimetype};base64,${req.file.buffer.toString('base64')}`;
  const { url, publicId } = await uploadBase64Image(b64, 'avatars');
  // save url (and publicId for later delete) to user
  ```

- **Delete:**

  ```ts
  await deleteImage(publicId);
  ```

- **Folder:** Uploads go under `CLOUDINARY_FOLDER_NAME/<folder>` (e.g. `myapp/avatars`). Use a different `CLOUDINARY_FOLDER_NAME` per project.

---

## 8. Audit Logging

### Behavior

- **Middleware:** `auditLogMiddleware` in `src/middleware/auditLog.ts` runs after body parsers and before routes.
- **What is logged:** Successful (2xx) **create / update / delete** requests that match URL patterns like `/api/v1/<entity>/...` or `/api/v1/admin/<entity>/...`.
- **Stored:** User id/name/email/role, action, entity type, entity id, optional changes, IP, user agent, method, url, status code.

Read operations (GET) are not logged by default. High-volume or sensitive routes can be excluded.

### Excluding Routes

Edit `EXCLUDED_ROUTES` in `src/middleware/auditLog.ts`:

```ts
const EXCLUDED_ROUTES = [
  '/api/v1/health',
  '/api/v1/admin/audit-logs',
  '/api/v1/some-noisy-endpoint'
];
```

### Querying Audit Logs

Use `AuditLog` model and `AuditLogService`:

- **List:** Filter by `userId`, `entityType`, `action`, date range.
- **Manual log:** For custom actions (e.g. login, password reset), call `AuditLogService.log({ ... })` from your controller.

See `src/services/auditLogService.ts` for `log`, `findByEntity`, etc.

### Entity Names in Descriptions

Update `entityMap` in `auditLog.ts` (function `generateDescription`) so new resources get readable descriptions (e.g. `posts` → “Post”).

---

## 9. Conventions

### Messages

Use `src/utils/messages.ts` for user-facing strings (success, validation, errors). Keep messages in one place so you can later add i18n or change copy.

### Validation

- Use **Joi** schemas in `src/utils/validation.ts`.
- Use a single `validateRequest(schema)` middleware so invalid bodies are rejected before the controller.

### Errors

- Use `ApiError` for known errors (e.g. 404, 403); let the global error handler send the response.
- Use `ApiResponse.success(data, message, status)` for success responses.

### Async Handlers

Wrap async route handlers with `catchAsync(handler)` or `wrapHandler(handler)` so thrown errors are passed to `next(err)` and handled centrally.

---

## 10. Testing

- **Framework:** Jest; config in `jest.config.js`.
- **Setup:** Use `src/__tests__/setup.ts` for global setup (e.g. env, DB).
- **Pattern:** Use supertest to hit the Express app; mock or use a test DB for Mongoose.

Example:

```ts
import request from 'supertest';
import { app } from '../app';

describe('GET /health', () => {
  it('returns 200 and status OK', async () => {
    const res = await request(app).get('/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});
```

Run: `npm test`.

---

## 11. Deployment

- **Build:** `npm run build` → run `node dist/app.js` (or `npm start`).
- **Env:** Set all required and optional env vars in the host (no `.env` in repo).
- **Process manager:** Use PM2, systemd, or your platform’s process manager.
- **MongoDB:** Prefer Atlas or a managed service; use a strong `MONGODB_URI` and firewall.
- **Security:** Use a long random `JWT_SECRET`; enable HTTPS; keep rate limiting and Helmet enabled.

---

## Quick Reference

| I want to… | Where to look |
|------------|----------------|
| Add a new API resource | [Adding a New Resource](#5-adding-a-new-resource) |
| Protect a route with JWT | `authenticateToken`, `requireAdmin` in `middleware/auth.ts` |
| Upload avatar/image | `upload.ts` (multer) + `cloudinary.ts` |
| Exclude a route from audit | `EXCLUDED_ROUTES` in `middleware/auditLog.ts` |
| Add env vars | `env.example` + `utils/envValidation.ts` |
| Change API messages | `utils/messages.ts` |
| Add validation for a route | `utils/validation.ts` (Joi) + `validateRequest` |

This starter is meant to be copied and adapted per project. Remove or add features (e.g. email, extra roles) as needed and keep this guide in sync with your project’s structure.
