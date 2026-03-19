# Daycare Backend — Specification Reference

The full backend specification for the daycare management system is maintained in the **web-app** repo so the frontend owns the API contract.

**→ [Backend Spec (../web-app/docs/BACKEND-SPEC.md)](../web-app/docs/BACKEND-SPEC.md)**

That document includes:

- **Auth & users**: roles (`responsavel`, `staff`, `administrador`), user shape for login/register/me
- **Response format**: `{ success, message, data? }` for all endpoints
- **Resources & endpoints**: classes, children, staff assignments, guardians, pickup persons, daily reports, activities, report photos, attendance, calendar events, invoices, payments, expense categories, expenses, messages, monthly reports (and optional enrollment documents)
- **Access rules**: what each role can see and do
- **Implementation checklist**: extend User, add role middleware, implement resources in order, CORS, file uploads
- **Frontend types reference**: TypeScript shapes the API responses should align with

Use it together with this folder’s [STARTER-KIT-GUIDE.md](STARTER-KIT-GUIDE.md) to implement the backend (model → service → controller → route per resource).
