# Connecting the Web App to the API

This doc describes how the Next.js frontend connects to the backend API (`../api`) using a **centralized API client** and **TanStack React Query** for data fetching.

---

## 1. API client (`lib/api-client.ts`)

All API calls go through one client:

- **Base URL** from `NEXT_PUBLIC_API_URL` (default `http://localhost:3002` when unset).
- **JWT** sent in `Authorization: Bearer <token>` when a token is set via `setAccessToken(token)`.
- **Helpers**: `apiGet`, `apiPost`, `apiPut`, `apiPatch`, `apiDelete` and `authApi.login`, `authApi.me`, `authApi.refresh`, `authApi.logout`.
- **Errors**: non-2xx throws `ApiClientError` with `message`, `status`, and optional `body`.

Use these helpers inside **query functions** and **mutation functions** (see below); do not call the API directly from components.

---

## 2. TanStack React Query

The app uses **@tanstack/react-query** for all server state: caching, loading/error states, refetch, and invalidation.

### Provider

`QueryProvider` in `lib/query-provider.tsx` wraps the app in `app/layout.tsx`. Default options:

- `staleTime: 60_000` (1 minute)
- `retry: 1`
- `refetchOnWindowFocus: false`

### Query keys (`lib/query-keys.ts`)

Use the shared **query key factory** so invalidation is consistent:

```ts
import { queryKeys } from '@/lib/query-keys';

// In useQuery
queryKey: queryKeys.children.list()

// Invalidate after a mutation
queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
```

Available keys: `queryKeys.auth.me`, `queryKeys.children`, `queryKeys.classes`, `queryKeys.invoices`, `queryKeys.payments`, `queryKeys.messages`, `queryKeys.calendarEvents`, `queryKeys.attendance`, `queryKeys.staff`, `queryKeys.monthlyReports`. Each has `.all`, `.list()`, and where relevant `.detail(id)`.

### Queries (GET)

Use `useQuery` with `apiGet` in the `queryFn`. The client adds the token automatically when `setAccessToken` has been called.

```ts
import { useQuery } from '@tanstack/react-query';
import { apiGet } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';
import { ApiClientError } from '@/lib/api-client';

const { data, isLoading, error, refetch } = useQuery({
  queryKey: queryKeys.children.list(),
  queryFn: async () => {
    const res = await apiGet<{ children: Child[] }>('/api/v1/children');
    if (!res.data?.children) throw new Error(res.message ?? 'Falha ao carregar');
    return res.data.children;
  },
});

// Optional: show API error message to user
const errorMessage = error instanceof ApiClientError ? error.message : error?.message;
```

### Mutations (POST / PUT / PATCH / DELETE)

Use `useMutation` with `apiPost` / `apiPut` / `apiPatch` / `apiDelete`, then invalidate related queries so the UI stays in sync.

```ts
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiPost, ApiClientError } from '@/lib/api-client';
import { queryKeys } from '@/lib/query-keys';

const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: async (body: { name: string }) => {
    const res = await apiPost<{ child: Child }>('/api/v1/children', body);
    if (!res.data?.child) throw new Error(res.message ?? 'Falha ao criar');
    return res.data.child;
  },
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
  },
});

// In form submit:
mutation.mutate({ name: 'Novo' });
// mutation.isPending, mutation.isError, mutation.error
```

### Disabling a query when not authenticated

If the endpoint requires auth, disable the query when there is no token so it does not run or retry unnecessarily:

```ts
import { getAccessToken } from '@/lib/api-client';

useQuery({
  queryKey: queryKeys.children.list(),
  queryFn: async () => { ... },
  enabled: !!getAccessToken(),
});
```

---

## 3. Environment

Create `.env.local` in the web-app root:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

- **Development**: run the API with `npm run dev` in `../api` (port 3002).
- **Production**: set `NEXT_PUBLIC_API_URL` to your deployed API URL.

---

## 4. Auth flow

1. **Login**: call `authApi.login(email, password)` → get `data.token` (and optionally `data.refreshToken`) → call `setAccessToken(data.token)` and set user in auth context (e.g. from `data.user` or `authApi.me(token)`).
2. **Restore session**: on load, if you have a stored token, call `authApi.me(token)`; if 401, clear token and redirect to login.
3. **Requests**: `apiGet` / `apiPost` etc. use the token from `getAccessToken()` when you don’t pass a token.
4. **Logout**: call `authApi.logout(token)` if you want to invalidate on the server, then `setAccessToken(null)` and clear user.

Map API `user` (`_id`, `firstName`, `lastName`, `email`, `role`) to your frontend `User` type (e.g. `name = firstName + ' ' + lastName`, and map `role` to `responsavel` | `staff` | `administrador` when you add those roles to the API).

---

## 5. CORS

The API uses `app.use(cors())`, so the browser can call it from `http://localhost:3000`. In production, restrict CORS in the API to your frontend origin.

---

## 6. Checklist

- [ ] Set `NEXT_PUBLIC_API_URL` in `.env.local` (or use default 3002).
- [ ] Run the API (`cd ../api && npm run dev`) when developing.
- [ ] Login: `authApi.login` → `setAccessToken(data.token)` and set user.
- [ ] Logout: `setAccessToken(null)` and clear user.
- [ ] Use **React Query** for all API data: `useQuery` for GET, `useMutation` for POST/PUT/PATCH/DELETE.
- [ ] Use **query keys** from `lib/query-keys.ts` and invalidate after mutations.
- [ ] Use **apiGet** / **apiPost** etc. inside `queryFn` / `mutationFn` only; keep auth and base URL in the client.
