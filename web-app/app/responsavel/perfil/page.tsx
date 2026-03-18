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
    <div className="max-w-6xl mx-auto">
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
                  <Input id="name" defaultValue={user?.name} />
                </div>
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" defaultValue={user?.email} />
                </div>
                <div>
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" defaultValue={user?.phone} />
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
                  {child.gender && (
                    <div>
                      <Label>Sexo</Label>
                      <Input value={child.gender} disabled />
                    </div>
                  )}
                  {child.nationality && (
                    <div>
                      <Label>Nacionalidade</Label>
                      <Input value={child.nationality} disabled />
                    </div>
                  )}
                  {child.address && (
                    <div className="md:col-span-2">
                      <Label>Endereço</Label>
                      <Input value={child.address} disabled />
                    </div>
                  )}
                  {child.languages_spoken && (
                    <div className="md:col-span-2">
                      <Label>Língua(s) falada(s) em casa</Label>
                      <Input value={child.languages_spoken} disabled />
                    </div>
                  )}
                  <div>
                    <Label>Alergias</Label>
                    <Input value={child.allergies || 'Nenhuma'} disabled />
                  </div>
                  <div>
                    <Label>Medicações</Label>
                    <Input value={child.medications || 'Nenhum'} disabled />
                  </div>
                  {child.dietary_restrictions && (
                    <div className="md:col-span-2">
                      <Label>Restrições Alimentares</Label>
                      <Input value={child.dietary_restrictions || 'Nenhuma'} disabled />
                    </div>
                  )}
                  {child.sleep_schedule && (
                    <div>
                      <Label>Horário de Sono</Label>
                      <Input value={child.sleep_schedule} disabled />
                    </div>
                  )}
                  {child.preferred_foods && (
                    <div>
                      <Label>Alimentos Preferidos/Recusados</Label>
                      <Input value={child.preferred_foods} disabled />
                    </div>
                  )}
                </div>

                {child.behavior_notes && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="font-semibold text-yellow-900 mb-2">Notas sobre Comportamento</h4>
                    <p className="text-sm text-yellow-800">{child.behavior_notes}</p>
                  </div>
                )}

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
