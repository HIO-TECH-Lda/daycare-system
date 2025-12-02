'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockClasses, mockChildren } from '@/lib/mock-data';
import { Plus, Users, Edit, Trash2 } from 'lucide-react';
import { useState } from 'react';

type Class = {
  id: string;
  name: string;
  min_age_months: number;
  max_age_months: number;
  capacity: number;
};

export default function GestaoTurmasPage() {
  const [classes, setClasses] = useState<Class[]>(mockClasses);
  const [open, setOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    min_age_months: '',
    max_age_months: '',
    capacity: '',
  });

  const handleOpenDialog = (classItem?: Class) => {
    if (classItem) {
      setEditingClass(classItem);
      setFormData({
        name: classItem.name,
        min_age_months: classItem.min_age_months.toString(),
        max_age_months: classItem.max_age_months.toString(),
        capacity: classItem.capacity.toString(),
      });
    } else {
      setEditingClass(null);
      setFormData({
        name: '',
        min_age_months: '',
        max_age_months: '',
        capacity: '',
      });
    }
    setOpen(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingClass) {
      // Update existing class
      setClasses(classes.map(c => 
        c.id === editingClass.id 
          ? {
              ...editingClass,
              name: formData.name,
              min_age_months: parseInt(formData.min_age_months),
              max_age_months: parseInt(formData.max_age_months),
              capacity: parseInt(formData.capacity),
            }
          : c
      ));
      alert('Turma atualizada com sucesso!');
    } else {
      // Create new class
      const newClass: Class = {
        id: `class-${Date.now()}`,
        name: formData.name,
        min_age_months: parseInt(formData.min_age_months),
        max_age_months: parseInt(formData.max_age_months),
        capacity: parseInt(formData.capacity),
      };
      setClasses([...classes, newClass]);
      alert('Turma criada com sucesso!');
    }
    setOpen(false);
    setEditingClass(null);
    setFormData({
      name: '',
      min_age_months: '',
      max_age_months: '',
      capacity: '',
    });
  };

  const handleDelete = (classId: string) => {
    setClasses(classes.filter(c => c.id !== classId));
    alert('Turma excluída com sucesso!');
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Turmas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4" />
              Adicionar Nova Turma
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingClass ? 'Editar Turma' : 'Nova Turma'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Turma</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="min_age_months">Idade Mínima (meses)</Label>
                  <Input
                    id="min_age_months"
                    type="number"
                    min="0"
                    value={formData.min_age_months}
                    onChange={(e) => setFormData({ ...formData, min_age_months: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_age_months">Idade Máxima (meses)</Label>
                  <Input
                    id="max_age_months"
                    type="number"
                    min="0"
                    value={formData.max_age_months}
                    onChange={(e) => setFormData({ ...formData, max_age_months: e.target.value })}
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="capacity">Capacidade</Label>
                <Input
                  id="capacity"
                  type="number"
                  min="1"
                  value={formData.capacity}
                  onChange={(e) => setFormData({ ...formData, capacity: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingClass ? 'Atualizar' : 'Criar'} Turma</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
        {classes.map(classItem => {
          const enrolled = mockChildren.filter(c => c.class_id === classItem.id).length;
          const percentage = (enrolled / classItem.capacity) * 100;

          return (
            <Card key={classItem.id}>
              <CardHeader className="bg-gradient-to-r from-blue-50 to-green-50">
                <CardTitle className="flex items-center justify-between">
                  <span className="text-base sm:text-lg">{classItem.name}</span>
                  <div className="flex gap-1">
                    <Button 
                      size="sm" 
                      variant="ghost"
                      onClick={() => handleOpenDialog(classItem)}
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button 
                          size="sm" 
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
                          <AlertDialogDescription>
                            Tem certeza que deseja excluir a turma "{classItem.name}"? Esta ação não pode ser desfeita.
                            {enrolled > 0 && (
                              <span className="block mt-2 text-red-600 font-medium">
                                Atenção: Esta turma tem {enrolled} criança{enrolled > 1 ? 's' : ''} matriculada{enrolled > 1 ? 's' : ''}.
                              </span>
                            )}
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(classItem.id)}
                            className="bg-red-600 hover:bg-red-700"
                          >
                            Excluir
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-4 sm:pt-6 space-y-3 sm:space-y-4">
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
                  <span className="text-xs sm:text-sm text-gray-600">
                    {enrolled} / {classItem.capacity} crianças
                  </span>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2 text-xs sm:text-sm">
                    <span className="text-gray-600">Ocupação</span>
                    <span className="font-semibold text-gray-900">{percentage.toFixed(0)}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all"
                      style={{ width: `${percentage}%` }}
                    ></div>
                  </div>
                </div>

                <div className="text-xs sm:text-sm text-gray-600 pt-2 border-t">
                  <p>Idade: {classItem.min_age_months}-{classItem.max_age_months} meses</p>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
