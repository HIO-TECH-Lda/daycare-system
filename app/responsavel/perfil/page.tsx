'use client';

import { useAuth } from '@/lib/auth-context';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockChildren } from '@/lib/mock-data';

export default function PerfilPage() {
  const { user } = useAuth();
  const myChildren = mockChildren.filter(c => c.parent_id === user?.id);

  return (
    <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-4">Meu Perfil</h1>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações Pessoais</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name">Nome</Label>
                  <Input id="name" defaultValue={user.name} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user.email} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue={user.phone} />
                </div>
              </div>
              <Button>Salvar Alterações</Button>
            </CardContent>
          </Card>

          {myChildren.map(child => (
            <Card key={child.id}>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <img src={child.photo_url} alt={child.name} className="w-10 h-10 rounded-full object-cover" />
                  {child.name}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Data de Nascimento</Label>
                    <Input value={new Date(child.birth_date).toLocaleDateString('pt-BR')} disabled />
                  </div>
                  <div>
                    <Label>Alergias</Label>
                    <Input value={child.allergies || 'Nenhuma'} disabled />
                  </div>
                  <div>
                    <Label>Medicações</Label>
                    <Input value={child.medications || 'Nenhum'} disabled />
                  </div>
                </div>

                <div className="bg-blue-50 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">Contato de Emergência</h4>
                  <p className="text-sm text-blue-800"><strong>Nome:</strong> {child.emergency_contact_name}</p>
                  <p className="text-sm text-blue-800"><strong>Telefone:</strong> {child.emergency_contact_phone}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
    </div>
  );
}
