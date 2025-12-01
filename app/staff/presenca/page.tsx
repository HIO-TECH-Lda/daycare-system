'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { mockChildren, mockStaffAssignments, mockAttendance } from '@/lib/mock-data';
import { CheckCircle2, Clock } from 'lucide-react';
import { useState } from 'react';

export default function PresencaPage() {
  const { user } = useAuth();
  const [attendance, setAttendance] = useState(mockAttendance);

  const myAssignments = mockStaffAssignments.filter(sa => sa.staff_id === user?.id);
  const myChildren = mockChildren.filter(c => myAssignments.some(a => a.class_id === c.class_id));

  const today = '2025-11-12';

  const handleCheckIn = (childId: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    alert(`Check-in registrado às ${time}`);
  };

  const handleCheckOut = (childId: string) => {
    const now = new Date();
    const time = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    alert(`Check-out registrado às ${time}`);
  };

  return (
    <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Registro de Presença</h1>

        <div className="space-y-4">
          {myChildren.map(child => {
            const childAttendance = attendance.find(a => a.child_id === child.id && a.attendance_date === today);

            return (
              <Card key={child.id}>
                <CardContent className="p-6">
                  <div className="flex items-center gap-4">
                    <img src={child.photo_url} alt={child.name} className="w-16 h-16 rounded-full object-cover" />
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900">{child.name}</h3>
                      <div className="flex items-center gap-2 mt-1">
                        {childAttendance?.check_in_time && (
                          <Badge variant="outline" className="bg-green-50 text-green-700">
                            <CheckCircle2 className="w-3 h-3 mr-1" />
                            Entrada: {childAttendance.check_in_time}
                          </Badge>
                        )}
                        {childAttendance?.check_out_time && (
                          <Badge variant="outline" className="bg-blue-50 text-blue-700">
                            Saída: {childAttendance.check_out_time}
                          </Badge>
                        )}
                        {!childAttendance?.check_in_time && (
                          <Badge variant="outline" className="bg-gray-50 text-gray-700">
                            <Clock className="w-3 h-3 mr-1" />
                            Aguardando
                          </Badge>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!childAttendance?.check_in_time && (
                        <Button onClick={() => handleCheckIn(child.id)} size="sm" className="bg-green-600 hover:bg-green-700">
                          Registrar Entrada
                        </Button>
                      )}
                      {childAttendance?.check_in_time && !childAttendance?.check_out_time && (
                        <Button onClick={() => handleCheckOut(child.id)} size="sm" className="bg-blue-600 hover:bg-blue-700">
                          Registrar Saída
                        </Button>
                      )}
                      {childAttendance?.check_out_time && (
                        <Badge className="bg-gray-100 text-gray-700 px-3 py-1">
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
