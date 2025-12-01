'use client';

import { useAuth } from '@/lib/auth-context';
import { Navbar } from '@/components/layout/navbar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { mockChildren } from '@/lib/mock-data';
import { ArrowLeft, User } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function PerfilPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && (!user || user.role !== 'responsavel')) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading) return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Carregando...</div>;
  if (!user) return null;

  const myChildren = mockChildren.filter(c => c.parent_id === user.id);

  return (
    <div className="min-h-screen bg-gray-50">
      <Navbar />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link href="/responsavel/dashboard">
          <Button variant="ghost" size="sm" className="gap-2 mb-4">
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </Button>
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-6">Meu Perfil</h1>

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
      </main>
    </div>
  );
}
