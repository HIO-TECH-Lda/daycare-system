'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockChildren, mockStaffAssignments, mockAttendance } from '@/lib/mock-data';
import { CheckCircle2, Clock, LogIn, LogOut } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

export default function PresencaPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(mockAttendance);

  const myAssignments = mockStaffAssignments.filter(sa => sa.staff_id === user?.id);
  const myChildren = mockChildren.filter(c => myAssignments.some(a => a.class_id === c.class_id));

  const today = '2025-11-12';

  const handleCheckIn = (childId: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const child = myChildren.find(c => c.id === childId);
    
    // Update attendance state
    const existingAttendance = attendance.find(a => a.child_id === childId && a.attendance_date === today);
    if (existingAttendance) {
      setAttendance(attendance.map(a => 
        a.id === existingAttendance.id 
          ? { ...a, check_in_time: time }
          : a
      ));
    } else {
      setAttendance([...attendance, {
        id: `att-${Date.now()}`,
        child_id: childId,
        attendance_date: today,
        check_in_time: time,
        check_out_time: null,
        authorized_pickup_person: null,
      }]);
    }

    toast.success('Entrada registrada com sucesso!', {
      description: `${child?.name} chegou às ${time}`,
      icon: <LogIn className="w-4 h-4" />,
      duration: 3000,
    });
  };

  const handleCheckOut = (childId: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    const child = myChildren.find(c => c.id === childId);
    const childAttendance = attendance.find(a => a.child_id === childId && a.attendance_date === today);
    
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
      if (a.child_id === childId && a.attendance_date === today) {
        // If check_out_time is being set, keep authorized_pickup_person as it was (or null)
        return {
          ...a,
          check_out_time: time,
          authorized_pickup_person: a.authorized_pickup_person ?? null,
        } as typeof a;
      }
      return a;
    }));

    toast.success('Saída registrada com sucesso!', {
      description: `${child?.name} saiu às ${time} (permanência: ${durationHours}h ${durationMinutes}min)`,
      icon: <LogOut className="w-4 h-4" />,
      duration: 4000,
    });
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
            const childAttendance = attendance.find(a => a.child_id === child.id && a.attendance_date === today);

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
                        {childAttendance?.check_in_time && (
                          <span className="text-xs sm:text-sm text-gray-600">
                            Entrada: {childAttendance.check_in_time}
                          </span>
                        )}
                        {childAttendance?.check_out_time && (
                          <span className="text-xs sm:text-sm text-gray-600">
                            Saída: {childAttendance.check_out_time}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-center sm:justify-end">
                      {!childAttendance?.check_in_time && (
                        <Button 
                          onClick={() => handleCheckIn(child.id)} 
                          size="sm" 
                          className="bg-green-600 hover:bg-green-700 gap-2 w-full sm:w-auto"
                        >
                          <LogIn className="w-4 h-4" />
                          Registrar Entrada
                        </Button>
                      )}
                      {childAttendance?.check_in_time && !childAttendance?.check_out_time && (
                        <Button 
                          onClick={() => handleCheckOut(child.id)} 
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
    </div>
  );
}
