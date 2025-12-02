'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { mockChildren, mockClasses } from '@/lib/mock-data';
import { Plus, RefreshCw } from 'lucide-react';
import { useState } from 'react';

// Mock parents data (in real app, this would come from the database)
const mockParents = [
  { id: '1', name: 'Maria Silva', email: 'responsavel@creche.com', phone: '(+258) 98765-4321' },
  { id: '4', name: 'Carlos Oliveira', email: 'carlos@creche.com', phone: '(+258) 99999-2222' },
  { id: '5', name: 'Paula Costa', email: 'paula@creche.com', phone: '(+258) 99999-3333' },
  { id: '6', name: 'Roberto Souza', email: 'roberto@creche.com', phone: '(+258) 99999-4444' },
];

export default function GestaoMatriculasPage() {
  const [open, setOpen] = useState(false);
  const [changeClassOpen, setChangeClassOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<string | null>(null);
  const [newClassId, setNewClassId] = useState('');
  const [parentType, setParentType] = useState<'existing' | 'new'>('new');
  const [formData, setFormData] = useState({
    childName: '',
    birthDate: '',
    parentId: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    classId: '',
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    alert('Matrícula iniciada com sucesso!');
    setFormData({
      childName: '',
      birthDate: '',
      parentId: '',
      parentName: '',
      parentEmail: '',
      parentPhone: '',
      classId: '',
    });
    setParentType('new');
    setOpen(false);
  };

  const handleParentSelect = (parentId: string) => {
    const parent = mockParents.find(p => p.id === parentId);
    if (parent) {
      setFormData({
        ...formData,
        parentId: parent.id,
        parentName: parent.name,
        parentEmail: parent.email,
        parentPhone: parent.phone,
      });
    }
  };

  const handleChangeClass = (childId: string, currentClassId: string) => {
    setSelectedChild(childId);
    setNewClassId(currentClassId);
    setChangeClassOpen(true);
  };

  const handleSubmitClassChange = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedChild && newClassId) {
      alert(`Turma alterada com sucesso para ${mockClasses.find(c => c.id === newClassId)?.name}!`);
      setChangeClassOpen(false);
      setSelectedChild(null);
      setNewClassId('');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Matrículas</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto">
              <Plus className="w-4 h-4" />
              Iniciar Nova Matrícula
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Nova Matrícula</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="childName">Nome da Criança</Label>
                <Input
                  id="childName"
                  value={formData.childName}
                  onChange={(e) => setFormData({ ...formData, childName: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="birthDate">Data de Nascimento</Label>
                <Input
                  id="birthDate"
                  type="date"
                  value={formData.birthDate}
                  onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                  required
                />
              </div>
              
              <div className="space-y-3 border-t pt-4">
                <Label>Responsável</Label>
                <RadioGroup value={parentType} onValueChange={(value) => setParentType(value as 'existing' | 'new')}>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="existing" id="existing" />
                    <Label htmlFor="existing" className="font-normal cursor-pointer">Responsável existente</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="new" id="new" />
                    <Label htmlFor="new" className="font-normal cursor-pointer">Novo responsável</Label>
                  </div>
                </RadioGroup>

                {parentType === 'existing' ? (
                  <div className="space-y-2">
                    <Label htmlFor="parentId">Selecionar Responsável</Label>
                    <Select 
                      value={formData.parentId} 
                      onValueChange={handleParentSelect}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockParents.map((parent) => (
                          <SelectItem key={parent.id} value={parent.id}>
                            {parent.name} - {parent.email}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {formData.parentId && (
                      <div className="text-xs text-gray-600 bg-gray-50 p-2 rounded">
                        <p><strong>Nome:</strong> {formData.parentName}</p>
                        <p><strong>Email:</strong> {formData.parentEmail}</p>
                        <p><strong>Telefone:</strong> {formData.parentPhone}</p>
                      </div>
                    )}
                  </div>
                ) : (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="parentName">Nome do Responsável</Label>
                      <Input
                        id="parentName"
                        value={formData.parentName}
                        onChange={(e) => setFormData({ ...formData, parentName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentEmail">Email</Label>
                      <Input
                        id="parentEmail"
                        type="email"
                        value={formData.parentEmail}
                        onChange={(e) => setFormData({ ...formData, parentEmail: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="parentPhone">Telefone</Label>
                      <Input
                        id="parentPhone"
                        type="tel"
                        value={formData.parentPhone}
                        onChange={(e) => setFormData({ ...formData, parentPhone: e.target.value })}
                        required
                      />
                    </div>
                  </>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="classId">Turma</Label>
                <Select value={formData.classId} onValueChange={(value) => setFormData({ ...formData, classId: value })} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.min_age_months}-{classItem.max_age_months} meses)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Criar Matrícula</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-3 sm:space-y-4">
        {mockChildren.map(child => {
          const classData = mockClasses.find(c => c.id === child.class_id);

          return (
            <Card key={child.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img src={child.photo_url} alt={child.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover mx-auto sm:mx-0" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{child.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                      <Badge variant="outline" className="text-xs">{classData?.name}</Badge>
                      <Badge className="bg-green-100 text-green-700 text-xs">Matrícula Ativa</Badge>
                    </div>
                    <p className="text-xs sm:text-sm text-gray-600 mt-1">
                      Matriculado em: {new Date('2025-01-15').toLocaleDateString('pt-BR')}
                    </p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="gap-2 w-full sm:w-auto"
                    onClick={() => handleChangeClass(child.id, child.class_id)}
                  >
                    <RefreshCw className="w-4 h-4" />
                    Mudar Turma
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Change Class Dialog */}
      <Dialog open={changeClassOpen} onOpenChange={setChangeClassOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Mudar Turma</DialogTitle>
          </DialogHeader>
          {selectedChild && (
            <form onSubmit={handleSubmitClassChange} className="space-y-4">
              <div className="space-y-2">
                <Label>Criança</Label>
                <div className="text-sm text-gray-600 bg-gray-50 p-3 rounded">
                  {mockChildren.find(c => c.id === selectedChild)?.name}
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="newClass">Nova Turma</Label>
                <Select value={newClassId} onValueChange={setNewClassId} required>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a nova turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {mockClasses.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.min_age_months}-{classItem.max_age_months} meses)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setChangeClassOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">Confirmar Mudança</Button>
              </DialogFooter>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
