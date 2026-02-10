'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { childrenApi, staffAssignmentsApi, attendanceApi, guardiansApi, pickupPersonsApi } from '@/lib/api-services';
import { queryKeys } from '@/lib/query-keys';
import { messages } from '@/lib/messages';
import { CheckCircle2, Clock, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PresencaPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const today = new Date().toISOString().split('T')[0];

  const { data: staffAssignments = [] } = useQuery({
    queryKey: queryKeys.staffAssignments.list({ staff_id: user?.id }),
    queryFn: async () => {
      const response = await staffAssignmentsApi.list({ staff_id: user?.id });
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: children = [] } = useQuery({
    queryKey: queryKeys.children.list(),
    queryFn: async () => {
      const response = await childrenApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: attendance = [] } = useQuery({
    queryKey: queryKeys.attendance.list({ date: today }),
    queryFn: async () => {
      const response = await attendanceApi.list({ date: today });
      return response.data || [];
    },
    enabled: !!user,
  });

  const createAttendanceMutation = useMutation({
    mutationFn: (data: any) => attendanceApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success(messages.success.checkInRecorded);
    },
  });

  const updateAttendanceMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: any }) => attendanceApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.attendance.all });
      toast.success(messages.success.checkOutRecorded);
    },
  });

  const myAssignments = staffAssignments;
  const myChildren = children.filter(c => myAssignments.some(a => a.class_id === c.class_id));

  const [checkInOpen, setCheckInOpen] = useState(false);
  const [checkOutOpen, setCheckOutOpen] = useState(false);
  const [selectedChildId, setSelectedChildId] = useState<string | null>(null);
  const [broughtBy, setBroughtBy] = useState('');
  const [broughtByOther, setBroughtByOther] = useState('');
  const [pickedUpBy, setPickedUpBy] = useState('');
  const [pickedUpByOther, setPickedUpByOther] = useState('');

  const handleOpenCheckIn = (childId: string) => {
    setSelectedChildId(childId);
    setBroughtBy('');
    setBroughtByOther('');
    setCheckInOpen(true);
  };

  const handleOpenCheckOut = (childId: string) => {
    setSelectedChildId(childId);
    setPickedUpBy('');
    setPickedUpByOther('');
    setCheckOutOpen(true);
  };

  const { data: guardians = [] } = useQuery({
    queryKey: queryKeys.guardians.all,
    queryFn: async () => {
      const response = await guardiansApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const { data: pickupPersons = [] } = useQuery({
    queryKey: queryKeys.pickupPersons.all,
    queryFn: async () => {
      const response = await pickupPersonsApi.list();
      return response.data || [];
    },
    enabled: !!user,
  });

  const getAuthorizedPersons = (childId: string) => {
    const child = myChildren.find(c => c.id === childId);
    if (!child) return [];

    const childGuardians = guardians.filter(g => g.child_id === childId);
    const childPickupPersons = pickupPersons.filter(a => a.child_id === childId);

    const persons: Array<{ name: string; label: string }> = [];

    childGuardians.forEach(guardian => {
      persons.push({
        name: guardian.name,
        label: `${guardian.name} (${guardian.guardian_type === 1 ? 'Pai/Encarregado 1' : 'Mãe/Encarregada 2'})`,
      });
    });

    childPickupPersons.forEach(person => {
      if (!persons.some(p => p.name === person.name)) {
        persons.push({
          name: person.name,
          label: `${person.name}${person.relationship ? ` (${person.relationship})` : ''}`,
        });
      }
    });

    return persons;
  };

  const handleCheckIn = async () => {
    const finalBroughtBy = broughtBy === 'other' ? broughtByOther : broughtBy;
    
    if (!selectedChildId || !finalBroughtBy.trim()) {
      toast.error('Erro', {
        description: 'Por favor, informe quem trouxe a criança',
        duration: 3000,
      });
      return;
    }

    const now = new Date().toISOString();
    const child = myChildren.find(c => c.id === selectedChildId);
    
    try {
      const existingAttendance = attendance.find(a => a.child_id === selectedChildId && a.date === today);
      if (existingAttendance) {
        await updateAttendanceMutation.mutateAsync({
          id: existingAttendance.id,
          data: { check_in: now, status: 'present', notes: `Trouxe: ${finalBroughtBy}` },
        });
      } else {
        await createAttendanceMutation.mutateAsync({
          child_id: selectedChildId,
          date: today,
          check_in: now,
          status: 'present',
          notes: `Trouxe: ${finalBroughtBy}`,
        });
      }

      toast.success('Entrada registrada com sucesso!', {
        description: `${child?.name} chegou às ${new Date(now).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })} com ${finalBroughtBy}`,
        icon: <LogIn className="w-4 h-4" />,
        duration: 3000,
      });

      setCheckInOpen(false);
      setBroughtBy('');
      setBroughtByOther('');
      setSelectedChildId(null);
    } catch (error) {
      toast.error('Erro ao registrar entrada');
    }
  };

  const handleCheckOut = async () => {
    const finalPickedUpBy = pickedUpBy === 'other' ? pickedUpByOther : pickedUpBy;
    
    if (!selectedChildId || !finalPickedUpBy.trim()) {
      toast.error('Erro', {
        description: 'Por favor, informe quem buscou a criança',
        duration: 3000,
      });
      return;
    }

    const now = new Date().toISOString();
    const child = myChildren.find(c => c.id === selectedChildId);
    const childAttendance = attendance.find(a => a.child_id === selectedChildId && a.attendance_date === today);
    
    if (!childAttendance?.check_in_time) {
      toast.error('Erro ao registrar saída', {
        description: 'A entrada deve ser registrada primeiro',
        duration: 3000,
      });
      return;
    }
    
    // Calculate duration
    const checkInTime = childAttendance.check_in_time.split(':');
    const checkInDate = new Date();
    checkInDate.setHours(parseInt(checkInTime[0]), parseInt(checkInTime[1]), 0);
    const checkOutDate = new Date();
    checkOutDate.setHours(parseInt(time.split(':')[0]), parseInt(time.split(':')[1]), 0);
    const durationMs = checkOutDate.getTime() - checkInDate.getTime();
    const durationHours = Math.floor(durationMs / (1000 * 60 * 60));
    const durationMinutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    
    // Update attendance state
    setAttendance(attendance.map(a => {
      if (a.child_id === selectedChildId && a.attendance_date === today) {
        return {
          ...a,
          check_out_time: time,
          picked_up_by: finalPickedUpBy,
        };
      }
      return a;
    }));

    toast.success('Saída registrada com sucesso!', {
      description: `${child?.name} saiu às ${time} com ${finalPickedUpBy} (permanência: ${durationHours}h ${durationMinutes}min)`,
      icon: <LogOut className="w-4 h-4" />,
      duration: 4000,
    });

    setCheckOutOpen(false);
    setPickedUpBy('');
    setPickedUpByOther('');
    setSelectedChildId(null);
  };

  const getStatusBadge = (childAttendance: any) => {
    if (childAttendance?.check_out_time) {
      return (
        <Badge className="bg-green-100 text-green-700 border-green-200">
          <CheckCircle2 className="w-3 h-3 mr-1" />
          Completo
        </Badge>
      );
    }
    if (childAttendance?.check_in_time) {
      return (
        <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-200">
          <LogIn className="w-3 h-3 mr-1" />
          Presente
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="bg-gray-50 text-gray-700 border-gray-200">
        <Clock className="w-3 h-3 mr-1" />
        Aguardando
      </Badge>
    );
  };

  return (
    <div className="max-w-6xl mx-auto w-full">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Registro de Presença</h1>

        <div className="space-y-3 sm:space-y-4">
          {myChildren.map(child => {
            const childAttendance = attendance.find(a => a.child_id === child.id && a.date === today);

            return (
              <Card key={child.id} className="hover:shadow-md transition-shadow">
                <CardContent className="p-4 sm:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                    <img 
                      src={child.photo_url} 
                      alt={child.name} 
                      className="w-14 h-14 sm:w-16 sm:h-16 rounded-full object-cover mx-auto sm:mx-0 border-2 border-gray-200" 
                    />
                    <div className="flex-1 text-center sm:text-left">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">{child.name}</h3>
                      <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mt-2">
                        {getStatusBadge(childAttendance)}
                        {childAttendance?.check_in && (
                          <span className="text-xs sm:text-sm text-gray-600">
                            Entrada: {new Date(childAttendance.check_in).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {childAttendance.notes && childAttendance.notes.includes('Trouxe:') && ` (${childAttendance.notes.split('Trouxe: ')[1]})`}
                          </span>
                        )}
                        {childAttendance?.check_out && (
                          <span className="text-xs sm:text-sm text-gray-600">
                            Saída: {new Date(childAttendance.check_out).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                            {childAttendance.notes && childAttendance.notes.includes('Buscou:') && ` (${childAttendance.notes.split('Buscou: ')[1]})`}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center sm:justify-end">
                      {!childAttendance?.check_in_time && (
                        <Button 
                          onClick={() => handleOpenCheckIn(child.id)} 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto"
                        >
                          <LogIn className="w-4 h-4" />
                          Registrar Entrada
                        </Button>
                      )}
                      {childAttendance?.check_in_time && !childAttendance?.check_out_time && (
                        <Button 
                          onClick={() => handleOpenCheckOut(child.id)} 
                          size="sm" 
                          className="bg-blue-600 hover:bg-blue-700 gap-2 w-full sm:w-auto"
                        >
                          <LogOut className="w-4 h-4" />
                          Registrar Saída
                        </Button>
                      )}
                      {childAttendance?.check_out_time && (
                        <Badge className="bg-green-100 text-green-700 px-3 py-1.5 text-xs">
                          <CheckCircle2 className="w-3 h-3 mr-1" />
                          Concluído
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

      {/* Check-In Dialog */}
      <Dialog open={checkInOpen} onOpenChange={setCheckInOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Entrada</DialogTitle>
          </DialogHeader>
          {selectedChildId && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  {myChildren.find(c => c.id === selectedChildId)?.name}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="brought_by">Quem trouxe a criança? *</Label>
                <Select
                  value={broughtBy}
                  onValueChange={(value) => {
                    setBroughtBy(value);
                    if (value !== 'other') {
                      setBroughtByOther('');
                    }
                  }}
                  required
                >
                  <SelectTrigger id="brought_by">
                    <SelectValue placeholder="Selecione a pessoa autorizada" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAuthorizedPersons(selectedChildId).map((person, index) => (
                      <SelectItem key={index} value={person.name}>
                        {person.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {broughtBy === 'other' && (
                  <div className="mt-2 space-y-2">
                    <Label htmlFor="brought_by_other">Nome da Pessoa *</Label>
                    <Input
                      id="brought_by_other"
                      value={broughtByOther}
                      onChange={(e) => setBroughtByOther(e.target.value)}
                      placeholder="Ex: Nome completo da pessoa"
                      required
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {broughtBy === 'other' 
                    ? 'Informe o nome completo da pessoa que trouxe a criança (caso não esteja na lista de autorizados)'
                    : 'Selecione uma das pessoas autorizadas que trouxe a criança'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCheckInOpen(false);
              setBroughtBy('');
              setBroughtByOther('');
              setSelectedChildId(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCheckIn} 
              className="bg-green-600 hover:bg-green-700"
              disabled={!broughtBy || (broughtBy === 'other' && !broughtByOther.trim())}
            >
              <LogIn className="w-4 h-4 mr-2" />
              Registrar Entrada
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Check-Out Dialog */}
      <Dialog open={checkOutOpen} onOpenChange={setCheckOutOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar Saída</DialogTitle>
          </DialogHeader>
          {selectedChildId && (
            <div className="space-y-4">
              <div className="bg-blue-50 rounded-lg p-3">
                <p className="text-sm font-medium text-blue-900">
                  {myChildren.find(c => c.id === selectedChildId)?.name}
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="picked_up_by">Quem buscou a criança? *</Label>
                <Select
                  value={pickedUpBy}
                  onValueChange={(value) => {
                    setPickedUpBy(value);
                    if (value !== 'other') {
                      setPickedUpByOther('');
                    }
                  }}
                  required
                >
                  <SelectTrigger id="picked_up_by">
                    <SelectValue placeholder="Selecione a pessoa autorizada" />
                  </SelectTrigger>
                  <SelectContent>
                    {getAuthorizedPersons(selectedChildId).map((person, index) => (
                      <SelectItem key={index} value={person.name}>
                        {person.label}
                      </SelectItem>
                    ))}
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
                {pickedUpBy === 'other' && (
                  <div className="mt-2 space-y-2">
                    <Label htmlFor="picked_up_by_other">Nome da Pessoa *</Label>
                    <Input
                      id="picked_up_by_other"
                      value={pickedUpByOther}
                      onChange={(e) => setPickedUpByOther(e.target.value)}
                      placeholder="Ex: Nome completo da pessoa"
                      required
                    />
                  </div>
                )}
                <p className="text-xs text-gray-500">
                  {pickedUpBy === 'other' 
                    ? 'Informe o nome completo da pessoa que buscou a criança (caso não esteja na lista de autorizados)'
                    : 'Selecione uma das pessoas autorizadas para buscar a criança'}
                </p>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setCheckOutOpen(false);
              setPickedUpBy('');
              setPickedUpByOther('');
              setSelectedChildId(null);
            }}>
              Cancelar
            </Button>
            <Button 
              onClick={handleCheckOut} 
              className="bg-blue-600 hover:bg-blue-700"
              disabled={!pickedUpBy || (pickedUpBy === 'other' && !pickedUpByOther.trim())}
            >
              <LogOut className="w-4 h-4 mr-2" />
              Registrar Saída
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
