'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { staffAssignmentsApi, classesApi, usersApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { Plus, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Staff = {
  id: string;
  name: string;
  email: string;
  phone: string;
};

export default function GestaoStaffPage() {
  const queryClient = useQueryClient();

  const { data: staff = [] } = useQuery({
    queryKey: queryKeys.users.list({ role: 'staff' }),
    queryFn: async () => {
      const res = await usersApi.list({ role: 'staff' });
      return res.data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: async () => {
      const res = await classesApi.list();
      return res.data || [];
    },
  });

  const { data: assignments = [] } = useQuery({
    queryKey: queryKeys.staffAssignments.all,
    queryFn: async () => {
      const res = await staffAssignmentsApi.list();
      return res.data || [];
    },
  });

  const [open, setOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<Staff | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    classIds: [] as string[],
  });

  const deleteAssignmentMutation = useMutation({
    mutationFn: (id: string) => staffAssignmentsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffAssignments.all });
      toast.success(messages.success.deleted);
    },
  });

  const createAssignmentMutation = useMutation({
    mutationFn: ({ staff_id, class_id }: { staff_id: string; class_id: string }) =>
      staffAssignmentsApi.create({ staff_id, class_id }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.staffAssignments.all });
      toast.success(messages.success.created);
    },
  });

  const handleOpenDialog = (staffMember?: Staff) => {
    if (staffMember) {
      setEditingStaff(staffMember);
      const staffAssignments = assignments.filter(sa => sa.staff_id === staffMember.id);
      setFormData({
        name: staffMember.name,
        email: staffMember.email,
        phone: staffMember.phone,
        classIds: staffAssignments.map(sa => sa.class_id),
      });
    } else {
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', classIds: [] });
    }
    setOpen(true);
  };

  const handleToggleClass = (classId: string) => {
    setFormData(prev => ({
      ...prev,
      classIds: prev.classIds.includes(classId)
        ? prev.classIds.filter(id => id !== classId)
        : [...prev.classIds, classId],
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingStaff) {
        // Delete existing assignments and create new ones
        const existingAssignments = assignments.filter(sa => sa.staff_id === editingStaff.id);
        for (const assignment of existingAssignments) {
          await deleteAssignmentMutation.mutateAsync(assignment.id);
        }
        for (const classId of formData.classIds) {
          await createAssignmentMutation.mutateAsync({
            staff_id: editingStaff.id,
            class_id: classId,
          });
        }
      } else {
        // TODO: Create staff user first, then create assignments
        toast.error('Criação de staff requer integração com API de usuários');
      }
      setOpen(false);
      setEditingStaff(null);
      setFormData({ name: '', email: '', phone: '', classIds: [] });
    } catch (error) {
      toast.error('Erro ao salvar');
    }
  };

  const handleDelete = async (staffId: string) => {
    try {
      const staffAssignments = assignments.filter(sa => sa.staff_id === staffId);
      for (const assignment of staffAssignments) {
        await deleteAssignmentMutation.mutateAsync(assignment.id);
      }
    } catch (error) {
      toast.error('Erro ao excluir');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Staff</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4" />
              Adicionar Novo Staff
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingStaff ? 'Editar Staff' : 'Novo Staff'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Atribuir Turmas</Label>
                <div className="space-y-2 max-h-48 overflow-y-auto border rounded-lg p-3">
                  {classes.map(classItem => (
                    <div key={classItem.id} className="flex items-center space-x-2">
                      <Checkbox
                        id={`class-${classItem.id}`}
                        checked={formData.classIds.includes(classItem.id)}
                        onCheckedChange={() => handleToggleClass(classItem.id)}
                      />
                      <Label
                        htmlFor={`class-${classItem.id}`}
                        className="text-sm font-normal cursor-pointer flex-1"
                      >
                        {classItem.name}
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingStaff ? 'Atualizar' : 'Criar'} Staff</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {staff.map(staffMember => {
          const staffAssignments = assignments.filter(sa => sa.staff_id === staffMember.id);
          const assignedClasses = classes.filter(c => staffAssignments.some(a => a.class_id === c.id));

          return (
            <Card key={staffMember.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
                  <div className="flex-1">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{staffMember.name}</h3>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">{staffMember.email}</p>
                    <p className="text-xs sm:text-sm text-gray-600">{staffMember.phone}</p>
                    {assignedClasses.length > 0 && (
                      <div className="flex flex-wrap items-center gap-2 mt-3">
                        <span className="text-xs sm:text-sm text-gray-700">Turmas:</span>
                        {assignedClasses.map(c => (
                          <Badge key={c.id} variant="outline" className="text-xs">{c.name}</Badge>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => handleOpenDialog(staffMember)}
                    >
                      <Edit className="w-4 h-4" />
                      <span className="hidden sm:inline">Editar</span>
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="text-red-600 hover:text-red-700 gap-2"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span className="hidden sm:inline">Excluir</span>
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir o staff &ldquo;{staffMember.name}&rdquo;? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(staffMember.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
