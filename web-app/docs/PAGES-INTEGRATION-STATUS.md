# Pages API Integration Status

## ✅ Completed (3 pages)
- `app/admin/dashboard/page.tsx` - ✅ Integrated
- `app/staff/dashboard/page.tsx` - ✅ Integrated  
- `app/responsavel/dashboard/page.tsx` - ✅ Integrated
- `app/admin/turmas/page.tsx` - ✅ Integrated

## 🔄 In Progress
- `app/admin/alunos/page.tsx` - Partially updated (needs form submission fixes)

## ⏳ Remaining (20+ pages)

### Children/Students Management
- `app/admin/alunos/page.tsx` - Needs form handlers updated
- `app/admin/matriculas/page.tsx` - Needs full integration
- `app/admin/matriculas/questionario/page.tsx` - Needs full integration

### Classes
- `app/staff/turma/[classId]/page.tsx` - Needs full integration

### Attendance
- `app/staff/presenca/page.tsx` - Needs full integration

### Daily Reports
- `app/staff/relatorio/preencher/[childId]/[date]/page.tsx` - Needs full integration
- `app/responsavel/relatorio/[childId]/page.tsx` - Needs full integration

### Monthly Reports
- `app/admin/relatorios-mensais/page.tsx` - Needs full integration
- `app/staff/relatorios-mensais/page.tsx` - Needs full integration
- `app/responsavel/relatorios-mensais/page.tsx` - Needs full integration

### Messages
- `app/admin/mensagens/page.tsx` - Needs full integration (if exists)
- `app/staff/mensagens/page.tsx` - Needs full integration
- `app/responsavel/mensagens/page.tsx` - Needs full integration

### Invoices/Payments
- `app/admin/pagamentos/page.tsx` - Needs full integration
- `app/admin/pagamentos/relatorios/page.tsx` - Needs full integration
- `app/admin/faturamento/visao-geral/page.tsx` - Needs full integration
- `app/responsavel/faturamento/page.tsx` - Needs full integration

### Expenses
- `app/admin/despesas/page.tsx` - Needs full integration
- `app/admin/despesas/relatorios/page.tsx` - Needs full integration

### Calendar Events
- `app/admin/eventos/gestao/page.tsx` - Needs full integration
- `app/responsavel/eventos/page.tsx` - Needs full integration

### Staff Management
- `app/admin/staff/page.tsx` - Needs full integration

### Profile
- `app/responsavel/perfil/page.tsx` - Needs full integration

## Integration Pattern

For each page, follow this pattern:

1. **Replace imports:**
```typescript
// Remove
import { mockX, mockY } from '@/lib/mock-data';

// Add
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { xApi, yApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
```

2. **Add queries:**
```typescript
const queryClient = useQueryClient();
const { data: items = [], isLoading } = useQuery({
  queryKey: queryKeys.items.list(),
  queryFn: async () => {
    const response = await itemsApi.list();
    return response.data || [];
  },
});
```

3. **Add mutations:**
```typescript
const createMutation = useMutation({
  mutationFn: (data) => itemsApi.create(data),
  onSuccess: () => {
    queryClient.invalidateQueries({ queryKey: queryKeys.items.all });
    toast.success(messages.success.created);
  },
});
```

4. **Replace state:**
```typescript
// Remove
const [items, setItems] = useState(mockItems);

// Use query data directly
const { data: items = [] } = useQuery(...);
```

5. **Update handlers:**
```typescript
// Replace local state updates with mutations
await createMutation.mutateAsync(data);
await updateMutation.mutateAsync({ id, data });
await deleteMutation.mutateAsync(id);
```

6. **Add loading states:**
```typescript
if (isLoading) {
  return <LoadingSpinner />;
}
```
