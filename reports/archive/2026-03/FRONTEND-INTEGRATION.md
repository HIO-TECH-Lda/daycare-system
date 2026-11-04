# Frontend Integration Guide — Daycare Management System API

This document provides complete API integration documentation for the frontend development team.

---

## Table of Contents

1. [Base Configuration](#1-base-configuration)
2. [Authentication](#2-authentication)
3. [Response Format](#3-response-format)
4. [Pagination](#4-pagination)
5. [Error Handling](#5-error-handling)
6. [API Endpoints](#6-api-endpoints)
7. [TypeScript Types Reference](#7-typescript-types-reference)
8. [Examples](#8-examples)

---

## 1. Base Configuration

### Base URL
- **Development**: `http://localhost:3002/api/v1`
- **Production**: Set via environment variable

### Headers
All authenticated requests require:
```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### CORS
The API supports CORS. Configure your frontend origin in the backend `.env` file.

---

## 2. Authentication

### Register (removed)
> Public registration was removed (2026-11). Accounts are created by admins via `POST /users` and activated with `POST /auth/accept-invite` — see `API.md`. The example below is kept for history only.

**POST** `/api/v1/auth/register`

**Request Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "email": "joao@example.com",
  "password": "Password123!",
  "confirmPassword": "Password123!",
  "role": "responsavel",
  "phone": "+5511999999999"
}
```

**Response (201):**
```json
{
  "success": true,
  "message": "Cadastro realizado com sucesso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "name": "João Silva",
      "role": "responsavel",
      "phone": "+5511999999999"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here"
  }
}
```

### Login
**POST** `/api/v1/auth/login`

**Request Body:**
```json
{
  "email": "joao@example.com",
  "password": "Password123!"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Login realizado com sucesso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "name": "João Silva",
      "role": "responsavel",
      "phone": "+5511999999999"
    },
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "refreshToken": "refresh_token_here"
  }
}
```

### Get Current User
**GET** `/api/v1/auth/me`

**Response (200):**
```json
{
  "success": true,
  "message": "Perfil recuperado com sucesso",
  "data": {
    "user": {
      "id": "507f1f77bcf86cd799439011",
      "email": "joao@example.com",
      "name": "João Silva",
      "role": "responsavel",
      "phone": "+5511999999999"
    }
  }
}
```

### Refresh Token
**POST** `/api/v1/auth/refresh`

**Request Body:**
```json
{
  "refreshToken": "refresh_token_here"
}
```

**Response (200):**
```json
{
  "success": true,
  "message": "Token atualizado com sucesso",
  "data": {
    "token": "new_access_token",
    "refreshToken": "new_refresh_token"
  }
}
```

### Update Profile
**PUT** `/api/v1/auth/me`

**Request Body:**
```json
{
  "firstName": "João",
  "lastName": "Silva",
  "phone": "+5511999999999"
}
```

### Change Password
**PUT** `/api/v1/auth/change-password`

**Request Body:**
```json
{
  "currentPassword": "OldPassword123!",
  "newPassword": "NewPassword123!",
  "confirmNewPassword": "NewPassword123!"
}
```

### Logout
**POST** `/api/v1/auth/logout`

**Response (200):**
```json
{
  "success": true,
  "message": "Logout realizado com sucesso"
}
```

---

## 3. Response Format

All API responses follow this structure:

### Success Response (2xx)
```json
{
  "success": true,
  "message": "Operation message",
  "data": { ... }
}
```

### Paginated Response
```json
{
  "success": true,
  "message": "Dados recuperados com sucesso",
  "data": [ ... ],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "pages": 5
  }
}
```

### Error Response (4xx/5xx)
```json
{
  "success": false,
  "message": "Error message",
  "error": "Detailed error (development only)"
}
```

### Validation Error Response (400)
```json
{
  "success": false,
  "message": "Validação falhou",
  "errors": [
    "Nome é obrigatório",
    "Email inválido"
  ]
}
```

---

## 4. Pagination

All list endpoints support pagination via query parameters:

- `page` (default: 1) - Page number
- `limit` (default: 20, max: 100) - Items per page

**Example:**
```
GET /api/v1/children?page=2&limit=10
```

**Response:**
```json
{
  "success": true,
  "message": "Crianças recuperadas com sucesso",
  "data": [ ... ],
  "pagination": {
    "page": 2,
    "limit": 10,
    "total": 45,
    "pages": 5
  }
}
```

---

## 5. Error Handling

### HTTP Status Codes

- `200` - Success
- `201` - Created
- `400` - Bad Request (validation errors)
- `401` - Unauthorized (missing/invalid token)
- `403` - Forbidden (insufficient permissions)
- `404` - Not Found
- `500` - Internal Server Error

### Common Error Messages

| Code | Message | Description |
|------|---------|-------------|
| 401 | `Token não fornecido` | Missing Authorization header |
| 401 | `Token inválido` | Invalid or expired token |
| 403 | `Acesso negado` | User doesn't have permission |
| 404 | `[Resource] não encontrado` | Resource not found |
| 400 | `Validação falhou` | Request validation failed |

---

## 6. API Endpoints

### 6.1 Classes

**List Classes**
- **GET** `/api/v1/classes?page=1&limit=20`
- **Auth**: Required
- **Role**: Any
- **Response**: Paginated list of classes

**Get Class**
- **GET** `/api/v1/classes/:id`
- **Auth**: Required
- **Role**: Any

**Create Class**
- **POST** `/api/v1/classes`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "name": "Berçário A",
  "min_age_months": 0,
  "max_age_months": 12,
  "capacity": 10
}
```

**Update Class**
- **PUT** `/api/v1/classes/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Class**
- **DELETE** `/api/v1/classes/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.2 Children

**List Children**
- **GET** `/api/v1/children?page=1&limit=20`
- **Auth**: Required
- **Role**: Admin (all), Staff (assigned classes), Responsável (own children)
- **Response**: Paginated list filtered by role

**Get Child**
- **GET** `/api/v1/children/:id`
- **Auth**: Required
- **Role**: Admin, Staff (assigned classes), Responsável (own child)

**Create Child**
- **POST** `/api/v1/children`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "name": "Maria Silva",
  "birth_date": "2023-01-15",
  "class_id": "507f1f77bcf86cd799439011",
  "parent_id": "507f1f77bcf86cd799439012",
  "gender": "Feminino",
  "photo_url": "https://...",
  "allergies": "Nenhuma",
  "medications": "",
  "emergency_contact_name": "João Silva",
  "emergency_contact_phone": "+5511999999999"
}
```

**Update Child**
- **PUT** `/api/v1/children/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Child**
- **DELETE** `/api/v1/children/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.3 Staff Assignments

**List Assignments**
- **GET** `/api/v1/staff-assignments?page=1&limit=20&staff_id=xxx`
- **Auth**: Required
- **Role**: Admin (all), Staff (own only)

**Create Assignment**
- **POST** `/api/v1/staff-assignments`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "staff_id": "507f1f77bcf86cd799439011",
  "class_id": "507f1f77bcf86cd799439012"
}
```

**Delete Assignment**
- **DELETE** `/api/v1/staff-assignments/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.4 Guardians

**List Guardians**
- **GET** `/api/v1/guardians?page=1&limit=20&child_id=xxx`
- **Auth**: Required
- **Role**: Admin, Staff, Responsável (own children)

**Get Guardians by Child**
- **GET** `/api/v1/guardians/child/:childId`
- **Auth**: Required

**Create Guardian**
- **POST** `/api/v1/guardians`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "name": "João Silva",
  "profession": "Engenheiro",
  "workplace": "Empresa XYZ",
  "relationship": "Pai",
  "phone": "+5511999999999",
  "email": "joao@example.com",
  "address": "Rua ABC, 123",
  "guardian_type": 1
}
```

**Update Guardian**
- **PUT** `/api/v1/guardians/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Guardian**
- **DELETE** `/api/v1/guardians/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.5 Pickup Persons

**List Pickup Persons**
- **GET** `/api/v1/pickup-persons?page=1&limit=20&child_id=xxx`
- **Auth**: Required

**Get Pickup Persons by Child**
- **GET** `/api/v1/pickup-persons/child/:childId`
- **Auth**: Required

**Create Pickup Person**
- **POST** `/api/v1/pickup-persons`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "name": "Ana Silva",
  "relationship": "Tia",
  "phone": "+5511999999999",
  "email": "ana@example.com",
  "id_document": "12345678900",
  "photo_url": "https://...",
  "is_authorized": true
}
```

**Update Pickup Person**
- **PUT** `/api/v1/pickup-persons/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Pickup Person**
- **DELETE** `/api/v1/pickup-persons/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.6 Daily Reports

**List Daily Reports**
- **GET** `/api/v1/daily-reports?page=1&limit=20&child_id=xxx&start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required
- **Role**: Admin, Staff (assigned classes), Responsável (own children)

**Get Daily Reports by Child**
- **GET** `/api/v1/daily-reports/child/:childId?start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required

**Create Daily Report**
- **POST** `/api/v1/daily-reports`
- **Auth**: Required
- **Role**: Staff, Admin
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "date": "2025-01-15",
  "meals": {
    "breakfast": "Leite e biscoito",
    "lunch": "Arroz, feijão e frango",
    "snack": "Frutas",
    "dinner": ""
  },
  "activities": ["Brincadeira livre", "Música"],
  "nap_time": {
    "start": "2025-01-15T13:00:00Z",
    "end": "2025-01-15T15:00:00Z",
    "duration_minutes": 120
  },
  "mood": "Feliz",
  "notes": "Dia tranquilo",
  "behavior_notes": "Boa interação",
  "health_notes": ""
}
```

**Update Daily Report**
- **PUT** `/api/v1/daily-reports/:id`
- **Auth**: Required
- **Role**: Staff, Admin

**Delete Daily Report**
- **DELETE** `/api/v1/daily-reports/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.7 Activities

**List Activities**
- **GET** `/api/v1/activities?page=1&limit=20&class_id=xxx&active_only=true`
- **Auth**: Required
- **Role**: Any

**Create Activity**
- **POST** `/api/v1/activities`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "name": "Brincadeira com blocos",
  "description": "Atividade de coordenação motora",
  "class_id": "507f1f77bcf86cd799439011",
  "age_group": "12-24 meses",
  "duration_minutes": 30,
  "materials_needed": ["Blocos de madeira", "Tapete"],
  "learning_objectives": ["Coordenação motora", "Criatividade"],
  "is_active": true
}
```

**Update Activity**
- **PUT** `/api/v1/activities/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Activity**
- **DELETE** `/api/v1/activities/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.8 Report Photos

**Get Photos by Report**
- **GET** `/api/v1/report-photos/report/:reportId`
- **Auth**: Required

**Create Report Photo**
- **POST** `/api/v1/report-photos`
- **Auth**: Required
- **Role**: Staff, Admin
- **Body:**
```json
{
  "daily_report_id": "507f1f77bcf86cd799439011",
  "photo_url": "https://cloudinary.com/...",
  "caption": "Brincando no parque"
}
```

**Delete Report Photo**
- **DELETE** `/api/v1/report-photos/:id`
- **Auth**: Required
- **Role**: Staff, Admin

---

### 6.9 Attendance

**List Attendance**
- **GET** `/api/v1/attendance?page=1&limit=20&child_id=xxx&date=2025-01-15&start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required
- **Role**: Admin, Staff, Responsável (own children)

**Get Attendance by Child**
- **GET** `/api/v1/attendance/child/:childId?start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required

**Create Attendance**
- **POST** `/api/v1/attendance`
- **Auth**: Required
- **Role**: Staff, Admin
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "date": "2025-01-15",
  "check_in": "2025-01-15T08:00:00Z",
  "check_out": "2025-01-15T17:00:00Z",
  "status": "present",
  "notes": ""
}
```

**Update Attendance**
- **PUT** `/api/v1/attendance/:id`
- **Auth**: Required
- **Role**: Staff, Admin

**Delete Attendance**
- **DELETE** `/api/v1/attendance/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.10 Calendar Events

**List Calendar Events**
- **GET** `/api/v1/calendar-events?page=1&limit=20&start_date=2025-01-01&end_date=2025-01-31&class_id=xxx`
- **Auth**: Required
- **Role**: Any

**Create Calendar Event**
- **POST** `/api/v1/calendar-events`
- **Auth**: Required
- **Role**: Staff, Admin
- **Body:**
```json
{
  "title": "Festa de Aniversário",
  "description": "Celebração coletiva",
  "start_date": "2025-02-15T10:00:00Z",
  "end_date": "2025-02-15T12:00:00Z",
  "is_all_day": false,
  "event_type": "activity",
  "class_id": "507f1f77bcf86cd799439011"
}
```

**Update Calendar Event**
- **PUT** `/api/v1/calendar-events/:id`
- **Auth**: Required
- **Role**: Staff, Admin

**Delete Calendar Event**
- **DELETE** `/api/v1/calendar-events/:id`
- **Auth**: Required
- **Role**: Staff, Admin

---

### 6.11 Invoices

**List Invoices**
- **GET** `/api/v1/invoices?page=1&limit=20&parent_id=xxx&status=pending`
- **Auth**: Required
- **Role**: Admin (all), Responsável (own invoices)

**Create Invoice**
- **POST** `/api/v1/invoices`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "parent_id": "507f1f77bcf86cd799439012",
  "issue_date": "2025-01-01",
  "due_date": "2025-01-31",
  "amount": 500.00,
  "items": [
    {
      "description": "Mensalidade Janeiro",
      "quantity": 1,
      "unit_price": 500.00,
      "total": 500.00
    }
  ],
  "notes": ""
}
```

**Update Invoice**
- **PUT** `/api/v1/invoices/:id`
- **Auth**: Required
- **Role**: Admin only

**Update Invoice Status**
- **PATCH** `/api/v1/invoices/:id/status`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "status": "paid"
}
```

**Delete Invoice**
- **DELETE** `/api/v1/invoices/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.12 Payments

**List Payments**
- **GET** `/api/v1/payments?page=1&limit=20&invoice_id=xxx&start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required
- **Role**: Admin, Responsável (own payments)

**Get Payments by Invoice**
- **GET** `/api/v1/payments/invoice/:invoiceId`
- **Auth**: Required

**Create Payment**
- **POST** `/api/v1/payments`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "invoice_id": "507f1f77bcf86cd799439011",
  "parent_id": "507f1f77bcf86cd799439012",
  "child_id": "507f1f77bcf86cd799439013",
  "amount": 500.00,
  "payment_date": "2025-01-15",
  "payment_method": "bank_transfer",
  "payment_method_details": "Transferência bancária",
  "reference_number": "TXN123456",
  "notes": ""
}
```

**Delete Payment**
- **DELETE** `/api/v1/payments/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.13 Expense Categories

**List Expense Categories**
- **GET** `/api/v1/expense-categories?page=1&limit=20&active_only=true`
- **Auth**: Required
- **Role**: Admin only

**Create Expense Category**
- **POST** `/api/v1/expense-categories`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "name": "Material de Limpeza",
  "description": "Produtos de limpeza e higiene",
  "is_active": true
}
```

**Update Expense Category**
- **PUT** `/api/v1/expense-categories/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Expense Category**
- **DELETE** `/api/v1/expense-categories/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.14 Expenses

**List Expenses**
- **GET** `/api/v1/expenses?page=1&limit=20&category_id=xxx&start_date=2025-01-01&end_date=2025-01-31`
- **Auth**: Required
- **Role**: Admin only

**Create Expense**
- **POST** `/api/v1/expenses`
- **Auth**: Required
- **Role**: Admin only
- **Body:**
```json
{
  "category_id": "507f1f77bcf86cd799439011",
  "amount": 150.00,
  "description": "Compra de material de limpeza",
  "expense_date": "2025-01-15",
  "receipt_url": "https://...",
  "vendor": "Supermercado XYZ"
}
```

**Update Expense**
- **PUT** `/api/v1/expenses/:id`
- **Auth**: Required
- **Role**: Admin only

**Delete Expense**
- **DELETE** `/api/v1/expenses/:id`
- **Auth**: Required
- **Role**: Admin only

---

### 6.15 Messages

**Get Inbox**
- **GET** `/api/v1/messages/inbox?page=1&limit=20&unread_only=true`
- **Auth**: Required
- **Role**: Any
- **Note**: Staff/Admin see role-based messages, Responsável see direct messages

**Get Sent Messages**
- **GET** `/api/v1/messages/sent?page=1&limit=20`
- **Auth**: Required
- **Role**: Any

**Get Message**
- **GET** `/api/v1/messages/:id`
- **Auth**: Required
- **Role**: Any (participant only)
- **Note**: Automatically marks as read

**Send Message**
- **POST** `/api/v1/messages`
- **Auth**: Required
- **Role**: Any
- **Body:**
```json
{
  "recipient_id": "507f1f77bcf86cd799439011",
  "recipient_role": "responsavel",
  "subject": "Lembrete: Reunião de pais",
  "content": "A reunião será no dia 20/01 às 19h",
  "message_type": "reminder",
  "child_id": "507f1f77bcf86cd799439012"
}
```

**Mark as Read**
- **PATCH** `/api/v1/messages/:id/read`
- **Auth**: Required
- **Role**: Any

**Delete Message**
- **DELETE** `/api/v1/messages/:id`
- **Auth**: Required
- **Role**: Any

---

### 6.16 Monthly Reports

**List Monthly Reports**
- **GET** `/api/v1/monthly-reports?page=1&limit=20&child_id=xxx&month=1&year=2025`
- **Auth**: Required
- **Role**: Admin, Staff, Responsável (own children)

**Get Monthly Reports by Child**
- **GET** `/api/v1/monthly-reports/child/:childId?year=2025`
- **Auth**: Required

**Create Monthly Report**
- **POST** `/api/v1/monthly-reports`
- **Auth**: Required
- **Role**: Staff, Admin
- **Body:**
```json
{
  "child_id": "507f1f77bcf86cd799439011",
  "month": 1,
  "year": 2025,
  "status": "draft",
  "attendance_summary": {
    "total_days": 22,
    "present_days": 20,
    "absent_days": 2,
    "late_days": 0
  },
  "physical_development": "Desenvolvimento normal",
  "cognitive_development": "Boa evolução",
  "social_development": "Interage bem",
  "emotional_development": "Estável",
  "general_notes": "Ótimo mês",
  "achievements": "Aprendeu a andar",
  "areas_for_improvement": "Falar mais palavras"
}
```

**Update Monthly Report**
- **PUT** `/api/v1/monthly-reports/:id`
- **Auth**: Required
- **Role**: Staff, Admin
- **Note**: Admin can update status to `validated` or `rejected`

**Delete Monthly Report**
- **DELETE** `/api/v1/monthly-reports/:id`
- **Auth**: Required
- **Role**: Admin only

---

## 7. TypeScript Types Reference

### User
```typescript
interface User {
  id: string;
  email: string;
  name: string;
  role: 'responsavel' | 'staff' | 'administrador';
  phone: string;
}
```

### Class
```typescript
interface Class {
  id: string;
  name: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
}
```

### Child
```typescript
interface Child {
  id: string;
  name: string;
  birth_date: string; // ISO date
  class_id: string;
  parent_id: string;
  photo_url?: string;
  allergies?: string;
  medications?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  gender?: 'Masculino' | 'Feminino';
  nationality?: string;
  address?: string;
  languages_spoken?: string;
  dietary_restrictions?: string;
  sleep_schedule?: string;
  preferred_foods?: string;
  separation_reaction?: string;
  plays_with_others?: boolean;
  behavior_notes?: string;
  previous_center?: string;
  transfer_reason?: string;
  image_usage_authorized?: boolean;
  enrollment_signature?: string;
  enrollment_date?: string;
}
```

### Guardian
```typescript
interface Guardian {
  id: string;
  child_id: string;
  name: string;
  profession?: string;
  workplace?: string;
  relationship?: string;
  phone?: string;
  email?: string;
  address?: string;
  guardian_type: 1 | 2; // 1 = primary, 2 = secondary
}
```

### Daily Report
```typescript
interface DailyReport {
  id: string;
  child_id: string;
  date: string; // ISO date
  created_by: string;
  meals?: {
    breakfast?: string;
    lunch?: string;
    snack?: string;
    dinner?: string;
  };
  activities?: string[];
  nap_time?: {
    start?: string;
    end?: string;
    duration_minutes?: number;
  };
  mood?: string;
  notes?: string;
  behavior_notes?: string;
  health_notes?: string;
}
```

### Invoice
```typescript
interface Invoice {
  id: string;
  invoice_number: string;
  child_id: string;
  parent_id: string;
  issue_date: string;
  due_date: string;
  amount: number;
  status: 'pending' | 'paid' | 'overdue' | 'cancelled';
  items: Array<{
    description: string;
    quantity?: number;
    unit_price: number;
    total: number;
  }>;
  notes?: string;
}
```

### Payment
```typescript
interface Payment {
  id: string;
  invoice_id?: string;
  parent_id: string;
  child_id: string;
  amount: number;
  payment_date: string;
  payment_method: 'cash' | 'card' | 'bank_transfer' | 'check' | 'mobile_money' | 'other';
  payment_method_details?: string;
  reference_number?: string;
  notes?: string;
}
```

### Monthly Report
```typescript
interface MonthlyReport {
  id: string;
  child_id: string;
  month: number; // 1-12
  year: number;
  status: 'draft' | 'submitted' | 'validated' | 'rejected';
  validated_by?: string;
  validated_at?: string;
  rejection_reason?: string;
  attendance_summary?: {
    total_days: number;
    present_days: number;
    absent_days: number;
    late_days: number;
  };
  physical_development?: string;
  cognitive_development?: string;
  social_development?: string;
  emotional_development?: string;
  general_notes?: string;
  achievements?: string;
  areas_for_improvement?: string;
}
```

### API Response Types
```typescript
interface ApiResponse<T> {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
}
```

---

## 8. Examples

### Example: Fetching Paginated Children

```typescript
async function fetchChildren(page = 1, limit = 20) {
  const response = await fetch(
    `http://localhost:3002/api/v1/children?page=${page}&limit=${limit}`,
    {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  );
  
  const data: ApiResponse<Child[]> = await response.json();
  
  if (data.success) {
    console.log('Children:', data.data);
    console.log('Pagination:', data.pagination);
  }
}
```

### Example: Creating a Daily Report

```typescript
async function createDailyReport(childId: string, reportData: Partial<DailyReport>) {
  const response = await fetch('http://localhost:3002/api/v1/daily-reports', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      child_id: childId,
      date: new Date().toISOString().split('T')[0],
      ...reportData
    })
  });
  
  const data: ApiResponse<DailyReport> = await response.json();
  
  if (data.success) {
    console.log('Report created:', data.data);
  } else {
    console.error('Error:', data.message);
  }
}
```

### Example: Error Handling

```typescript
async function handleApiCall<T>(
  url: string,
  options?: RequestInit
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        ...options?.headers
      }
    });
    
    const data: ApiResponse<T> = await response.json();
    
    if (!response.ok || !data.success) {
      throw new Error(data.message || 'API request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}
```

### Example: React Hook for Paginated Data

```typescript
import { useState, useEffect } from 'react';

function usePaginatedData<T>(
  endpoint: string,
  page: number = 1,
  limit: number = 20,
  filters?: Record<string, string>
) {
  const [data, setData] = useState<T[]>([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      const params = new URLSearchParams({
        page: page.toString(),
        limit: limit.toString(),
        ...filters
      });
      
      try {
        const response = await fetch(`${endpoint}?${params}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
        
        const result: ApiResponse<T[]> = await response.json();
        
        if (result.success) {
          setData(result.data || []);
          setPagination(result.pagination);
        } else {
          setError(result.message);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Unknown error');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, [endpoint, page, limit, JSON.stringify(filters)]);
  
  return { data, pagination, loading, error };
}
```

---

## 9. Access Rules Summary

| Role | Can Access |
|------|------------|
| **responsavel** | Own profile, own children, guardians/pickup persons for own children, daily reports for own children, own invoices/payments, calendar events, messages, monthly reports for own children (read-only when validated) |
| **staff** | Profile, assigned classes, children in assigned classes, guardians/pickup persons for assigned classes, daily reports for assigned classes (create/update), attendance for assigned classes (create/update), calendar events, messages, monthly reports for assigned classes (create/update) |
| **administrador** | Full access to all resources |

---

## 10. Notes

- All dates should be sent as ISO 8601 strings (e.g., `"2025-01-15"` or `"2025-01-15T10:00:00Z"`)
- IDs are MongoDB ObjectIds as strings
- Pagination is available on all list endpoints
- Rate limiting: 1000 requests per 15 minutes per IP
- File uploads for photos use Cloudinary (see file upload endpoints)
- Token expiration: 7 days (configurable)
- Refresh tokens should be stored securely and used to get new access tokens

---

**Last Updated**: February 2025  
**API Version**: 1.0.0
