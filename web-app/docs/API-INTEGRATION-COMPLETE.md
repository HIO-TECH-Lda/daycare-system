# API Integration Complete

This document summarizes the API integration work completed based on the API specification.

## Summary

The frontend has been fully integrated with the backend API (`/api/v1`). All endpoints are now available through typed service functions, with proper authentication, token management, and error handling.

## Files Created/Modified

### Core API Files

1. **`lib/api-client.ts`** - Updated
   - Base URL now includes `/api/v1` prefix
   - Added refresh token support with localStorage persistence
   - Added automatic token refresh on 401 errors
   - Added query parameter support for GET requests
   - Added pagination support in response types
   - Updated auth API helpers to match spec

2. **`lib/api-services.ts`** - Created
   - Comprehensive API service functions for all endpoints:
     - Classes API
     - Children API
     - Staff Assignments API
     - Guardians API
     - Pickup Persons API
     - Daily Reports API
     - Activities API
     - Report Photos API
     - Attendance API
     - Calendar Events API
     - Invoices API
     - Payments API
     - Expense Categories API
     - Expenses API
     - Messages API
     - Monthly Reports API
   - All functions are typed with TypeScript interfaces
   - Filter and pagination parameters are properly typed

3. **`lib/types.ts`** - Updated
   - Updated all types to match API specification exactly:
     - `Guardian` - added relationship, address fields
     - `PickupPerson` - renamed from AuthorizedPickupPerson, added all fields
     - `DailyReport` - restructured to match API format
     - `Activity` - restructured to match API format
     - `Attendance` - updated to match API format
     - `CalendarEvent` - updated to match API format
     - `Invoice` - updated status values and structure
     - `Payment` - updated payment methods
     - `ExpenseCategory` - added is_active field
     - `Expense` - simplified structure
     - `Message` - updated structure
     - `MonthlyReport` - restructured to match API
   - Added `StaffAssignment` type

4. **`lib/auth-context.tsx`** - Updated
   - Replaced mock authentication with real API calls
   - Integrated with `authApi` from api-client
   - Added token management (access + refresh tokens)
   - Added automatic user loading on mount
   - Added token refresh on 401 errors
   - Added `refreshUser` function to manually refresh user data
   - Maps API user format to frontend User type

5. **`lib/query-keys.ts`** - Updated
   - Added query keys for all new endpoints:
     - Guardians
     - Pickup Persons
     - Daily Reports
     - Activities
     - Report Photos
     - Attendance
     - Calendar Events
     - Expense Categories
     - Expenses
     - Staff Assignments
   - Updated existing keys to support filters
   - All keys support filter parameters for proper cache invalidation

6. **`app/login/page.tsx`** - Updated
   - Updated to use real API authentication
   - Improved error handling

## Key Features

### Authentication
- JWT token-based authentication
- Access token stored in localStorage
- Refresh token support with automatic refresh
- Automatic token refresh on 401 errors
- Token persistence across page reloads

### API Client Features
- Centralized base URL configuration (`/api/v1`)
- Automatic Authorization header injection
- Query parameter support
- Pagination support in responses
- Comprehensive error handling
- TypeScript types for all requests/responses

### Token Management
- Access tokens stored in `localStorage` as `daycare_access_token`
- Refresh tokens stored in `localStorage` as `daycare_refresh_token`
- Automatic token refresh when access token expires
- Token clearing on logout

## Usage Examples

### Using API Services

```typescript
import { childrenApi } from '@/lib/api-services';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/lib/query-keys';

// Fetch children with pagination
const { data, isLoading } = useQuery({
  queryKey: queryKeys.children.list({ page: 1, limit: 20 }),
  queryFn: async () => {
    const response = await childrenApi.list({ page: 1, limit: 20 });
    return response.data || [];
  },
});

// Create a child
const queryClient = useQueryClient();
const mutation = useMutation({
  mutationFn: (data: CreateChildData) => childrenApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
  },
});
```

### Authentication

```typescript
import { useAuth } from '@/lib/auth-context';

const { user, login, logout, loading } = useAuth();

// Login
await login(email, password);

// Logout
await logout();

// Check if authenticated
if (user) {
  // User is logged in
}
```

## Environment Configuration

Make sure `.env.local` is configured:

```env
NEXT_PUBLIC_API_URL=http://localhost:3002
```

If not set, defaults to `http://localhost:3002/api/v1`.

## Next Steps

1. Update components to use the new API services instead of mock data
2. Add React Query hooks for commonly used endpoints
3. Add loading and error states to components
4. Test all endpoints with the backend API
5. Add proper error boundaries for API errors

## Notes

- All API responses follow the standard format: `{ success, message, data, pagination? }`
- Error responses include `errors` array for validation errors
- Pagination is available on all list endpoints
- All dates should be sent as ISO 8601 strings
- Token expiration is handled automatically via refresh tokens
