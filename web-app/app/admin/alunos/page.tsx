'use client';

import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Textarea } from '@/components/ui/textarea';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { childrenApi, classesApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { toast } from 'sonner';
import { Plus, Search, Edit, Trash2, Eye } from 'lucide-react';
import { useState } from 'react';

// Note: Parents should be fetched from API or users with role 'responsavel'

type Child = {
  id: string;
  name: string;
  birth_date: string;
  class_id: string;
  parent_id: string;
  photo_url: string;
  allergies: string;
  medications: string;
  emergency_contact_name: string;
  emergency_contact_phone: string;
  gender?: string;
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
};

export default function GestaoAlunosPage() {
  const queryClient = useQueryClient();
  const { data: children = [], isLoading } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
  });

  const { data: classes = [] } = useQuery({
    queryKey: queryKeys.classes.list(),
    queryFn: async () => {
      const response = await classesApi.list();
      return response.data || [];
    },
  });

  const createMutation = useMutation({
    mutationFn: (data: any) => childrenApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
      toast.success(messages.success.created);
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => childrenApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
      toast.success(messages.success.updated);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => childrenApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.children.all });
      toast.success(messages.success.deleted);
    },
  });

  const [searchTerm, setSearchTerm] = useState('');
  const [open, setOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedChild, setSelectedChild] = useState<Child | null>(null);
  const [editingChild, setEditingChild] = useState<Child | null>(null);
  const [parentType, setParentType] = useState<'existing' | 'new'>('existing');
  const [formData, setFormData] = useState({
    name: '',
    birth_date: '',
    class_id: '',
    parent_id: '',
    parentName: '',
    parentEmail: '',
    parentPhone: '',
    allergies: '',
    medications: '',
    emergency_contact_name: '',
    emergency_contact_phone: '',
    photo_url: '',
  });

  const filteredChildren = children.filter(child =>
    child.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleOpenDialog = (child?: Child) => {
    if (child) {
      setEditingChild(child);
      setParentType('existing');
      setFormData({
        name: child.name,
        birth_date: child.birth_date,
        class_id: child.class_id,
        parent_id: child.parent_id,
        parentName: '',
        parentEmail: '',
        parentPhone: '',
        allergies: child.allergies,
        medications: child.medications,
        emergency_contact_name: child.emergency_contact_name,
        emergency_contact_phone: child.emergency_contact_phone,
        photo_url: child.photo_url || '',
      });
    } else {
      setEditingChild(null);
      setParentType('existing');
      setFormData({
        name: '', birth_date: '', class_id: '', parent_id: '',
        parentName: '', parentEmail: '', parentPhone: '',
        allergies: '', medications: '', emergency_contact_name: '', emergency_contact_phone: '',
        photo_url: '',
      });
    }
    setOpen(true);
  };

  const handleParentSelect = (parentId: string) => {
    setFormData({ ...formData, parent_id: parentId });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const childData = {
        name: formData.name,
        birth_date: formData.birth_date,
        class_id: formData.class_id,
        parent_id: formData.parent_id,
        allergies: formData.allergies || 'Nenhuma',
        medications: formData.medications || 'Nenhum',
        emergency_contact_name: formData.emergency_contact_name,
        emergency_contact_phone: formData.emergency_contact_phone,
        ...(formData.photo_url && { photo_url: formData.photo_url }),
      };

      if (editingChild) {
        await updateMutation.mutateAsync({ id: editingChild.id, data: childData });
      } else {
        await createMutation.mutateAsync(childData);
      }
      setOpen(false);
      setEditingChild(null);
      setFormData({
        name: '', birth_date: '', class_id: '', parent_id: '',
        parentName: '', parentEmail: '', parentPhone: '',
        allergies: '', medications: '', emergency_contact_name: '', emergency_contact_phone: '',
        photo_url: '',
      });
    } catch (error) {
      toast.error('Erro ao salvar aluno');
    }
  };

  const handleDelete = async (childId: string) => {
    try {
      await deleteMutation.mutateAsync(childId);
    } catch (error) {
      toast.error('Erro ao excluir aluno');
    }
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Gestão de Alunos</h1>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 w-full sm:w-auto" onClick={() => handleOpenDialog()}>
              <Plus className="w-4 h-4" />
              Adicionar Novo Aluno
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingChild ? 'Editar Aluno' : 'Novo Aluno'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da Criança</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="photo_url">URL da Foto</Label>
                <Input
                  id="photo_url"
                  type="url"
                  value={formData.photo_url}
                  onChange={(e) => setFormData({ ...formData, photo_url: e.target.value })}
                  placeholder="https://..."
                />
                {formData.photo_url && (
                  <div className="mt-1 flex items-center gap-2">
                    <img
                      src={formData.photo_url}
                      alt="Pré-visualização"
                      className="w-12 h-12 rounded-full object-cover border"
                      onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                    />
                    <span className="text-xs text-gray-500">Pré-visualização</span>
                  </div>
                )}
              </div>
              <div className="space-y-2">
                <Label htmlFor="birth_date">Data de Nascimento</Label>
                <Input
                  id="birth_date"
                  type="date"
                  value={formData.birth_date}
                  onChange={(e) => setFormData({ ...formData, birth_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="class_id">Turma</Label>
                <Select 
                  value={formData.class_id} 
                  onValueChange={(value) => setFormData({ ...formData, class_id: value })}
                  required
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione a turma" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((classItem) => (
                      <SelectItem key={classItem.id} value={classItem.id}>
                        {classItem.name} ({classItem.min_age_months}-{classItem.max_age_months} meses)
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
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
                    <Label htmlFor="parent_id">Selecionar Responsável</Label>
                    <Select 
                      value={formData.parent_id} 
                      onValueChange={handleParentSelect}
                      required
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um responsável" />
                      </SelectTrigger>
                      <SelectContent>
                        {/* TODO: Fetch parents from API/users with role 'responsavel' */}
                        <SelectItem value="1">Responsável (selecione)</SelectItem>
                      </SelectContent>
                    </Select>
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
                <Label htmlFor="allergies">Alergias</Label>
                <Input
                  id="allergies"
                  value={formData.allergies}
                  onChange={(e) => setFormData({ ...formData, allergies: e.target.value })}
                  placeholder="Ex: Lactose, Amendoim, ou deixe vazio se nenhuma"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="medications">Medicações</Label>
                <Input
                  id="medications"
                  value={formData.medications}
                  onChange={(e) => setFormData({ ...formData, medications: e.target.value })}
                  placeholder="Ex: Antialérgico (conforme necessidade)"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_name">Contato de Emergência - Nome</Label>
                <Input
                  id="emergency_contact_name"
                  value={formData.emergency_contact_name}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergency_contact_phone">Contato de Emergência - Telefone</Label>
                <Input
                  id="emergency_contact_phone"
                  type="tel"
                  value={formData.emergency_contact_phone}
                  onChange={(e) => setFormData({ ...formData, emergency_contact_phone: e.target.value })}
                  required
                />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit">{editingChild ? 'Atualizar' : 'Criar'} Aluno</Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card className="mb-4 sm:mb-6">
        <CardContent className="p-3 sm:p-4">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 sm:w-5 sm:h-5 text-gray-400" />
            <Input
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="border-0 focus-visible:ring-0 text-sm"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-green-600 mx-auto"></div>
            <p className="text-sm text-gray-600">{messages.loading}</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3 sm:space-y-4">
          {filteredChildren.map(child => {
            const classData = classes.find(c => c.id === child.class_id);
          return (
            <Card key={child.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                  <img src={child.photo_url} alt={child.name} className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover mx-auto sm:mx-0" />
                  <div className="flex-1 text-center sm:text-left">
                    <h3 className="text-base sm:text-lg font-semibold text-gray-900">{child.name}</h3>
                    <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-1">
                      <Badge className="text-xs">{classData?.name}</Badge>
                      {child.gender && (
                        <Badge variant="outline" className="text-xs">{child.gender}</Badge>
                      )}
                      <span className="text-xs sm:text-sm text-gray-600">
                        Nascimento: {new Date(child.birth_date).toLocaleDateString('pt-BR')}
                      </span>
                      {child.nationality && (
                        <span className="text-xs sm:text-sm text-gray-600">
                          • {child.nationality}
                        </span>
                      )}
                    </div>
                    <div className="mt-1 space-y-1">
                      {child.allergies && child.allergies !== 'Nenhuma' && (
                        <p className="text-xs sm:text-sm text-red-600">⚠️ Alergia: {child.allergies}</p>
                      )}
                      {child.dietary_restrictions && child.dietary_restrictions !== '' && (
                        <p className="text-xs sm:text-sm text-orange-600">🍽️ Restrições alimentares: {child.dietary_restrictions}</p>
                      )}
                      {child.medications && child.medications !== 'Nenhum' && (
                        <p className="text-xs sm:text-sm text-blue-600">💊 Medicação: {child.medications}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2 justify-center sm:justify-end">
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => {
                        setSelectedChild(child);
                        setDetailsOpen(true);
                      }}
                    >
                      <Eye className="w-4 h-4" />
                      <span className="hidden sm:inline">Detalhes</span>
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="gap-2"
                      onClick={() => handleOpenDialog(child)}
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
                            Tem certeza que deseja excluir o aluno "{child.name}"? Esta ação não pode ser desfeita.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancelar</AlertDialogCancel>
                          <AlertDialogAction
                            onClick={() => handleDelete(child.id)}
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
      )}

      {/* Child Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Detalhes Completos do Aluno</DialogTitle>
          </DialogHeader>
          {selectedChild && (
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label className="text-sm font-semibold">Nome Completo</Label>
                  <p className="text-sm">{selectedChild.name}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Data de Nascimento</Label>
                  <p className="text-sm">{new Date(selectedChild.birth_date).toLocaleDateString('pt-BR')}</p>
                </div>
                {selectedChild.gender && (
                  <div>
                    <Label className="text-sm font-semibold">Sexo</Label>
                    <p className="text-sm">{selectedChild.gender}</p>
                  </div>
                )}
                {selectedChild.nationality && (
                  <div>
                    <Label className="text-sm font-semibold">Nacionalidade</Label>
                    <p className="text-sm">{selectedChild.nationality}</p>
                  </div>
                )}
                {selectedChild.address && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold">Endereço</Label>
                    <p className="text-sm">{selectedChild.address}</p>
                  </div>
                )}
                {selectedChild.languages_spoken && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold">Língua(s) Falada(s) em Casa</Label>
                    <p className="text-sm">{selectedChild.languages_spoken}</p>
                  </div>
                )}
                <div>
                  <Label className="text-sm font-semibold">Alergias</Label>
                  <p className="text-sm">{selectedChild.allergies || 'Nenhuma'}</p>
                </div>
                <div>
                  <Label className="text-sm font-semibold">Medicações</Label>
                  <p className="text-sm">{selectedChild.medications || 'Nenhum'}</p>
                </div>
                {selectedChild.dietary_restrictions && (
                  <div className="md:col-span-2">
                    <Label className="text-sm font-semibold">Restrições Alimentares</Label>
                    <p className="text-sm">{selectedChild.dietary_restrictions}</p>
                  </div>
                )}
                {selectedChild.sleep_schedule && (
                  <div>
                    <Label className="text-sm font-semibold">Horário de Sono</Label>
                    <p className="text-sm">{selectedChild.sleep_schedule}</p>
                  </div>
                )}
                {selectedChild.preferred_foods && (
                  <div>
                    <Label className="text-sm font-semibold">Alimentos Preferidos/Recusados</Label>
                    <p className="text-sm">{selectedChild.preferred_foods}</p>
                  </div>
                )}
                {selectedChild.plays_with_others !== undefined && (
                  <div>
                    <Label className="text-sm font-semibold">Gosta de Brincar com Outras Crianças</Label>
                    <p className="text-sm">{selectedChild.plays_with_others ? 'Sim' : 'Não'}</p>
                  </div>
                )}
                {selectedChild.previous_center && (
                  <div>
                    <Label className="text-sm font-semibold">Centro Anterior</Label>
                    <p className="text-sm">{selectedChild.previous_center}</p>
                  </div>
                )}
                {selectedChild.transfer_reason && (
                  <div>
                    <Label className="text-sm font-semibold">Motivo da Transferência</Label>
                    <p className="text-sm">{selectedChild.transfer_reason}</p>
                  </div>
                )}
              </div>
              {selectedChild.behavior_notes && (
                <div className="bg-yellow-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold text-yellow-900">Notas sobre Comportamento</Label>
                  <p className="text-sm text-yellow-800 mt-1">{selectedChild.behavior_notes}</p>
                </div>
              )}
              <div className="bg-blue-50 rounded-lg p-4">
                <Label className="text-sm font-semibold text-blue-900">Contato de Emergência</Label>
                <p className="text-sm text-blue-800 mt-1"><strong>Nome:</strong> {selectedChild.emergency_contact_name}</p>
                <p className="text-sm text-blue-800"><strong>Telefone:</strong> {selectedChild.emergency_contact_phone}</p>
              </div>
              {selectedChild.image_usage_authorized !== undefined && (
                <div className="bg-gray-50 rounded-lg p-4">
                  <Label className="text-sm font-semibold">Autorização de Uso de Imagem</Label>
                  <p className="text-sm mt-1">{selectedChild.image_usage_authorized ? 'Autorizado' : 'Não autorizado'}</p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setDetailsOpen(false)}>
              Fechar
            </Button>
            <Button onClick={() => {
              setDetailsOpen(false);
              handleOpenDialog(selectedChild || undefined);
            }}>
              Editar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
