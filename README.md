# Sistema de Gestão de Creche

Sistema completo de gestão para creches dedicadas a crianças de 0 a 5 anos, desenvolvido com Next.js, TypeScript, Tailwind CSS e Supabase.

## Funcionalidades

### Portal do Responsável (Parent/Guardian)
- **Dashboard**: Visão geral com resumos diários das crianças, mensagens não lidas e próximos eventos
- **Rotina Diária**: Visualização detalhada dos relatórios diários com atividades (alimentação, sonecas, trocas de fraldas, atividades pedagógicas) e fotos
- **Calendário**: Eventos relevantes para as turmas das crianças
- **Mensagens**: Comunicação direta com staff e administração
- **Faturamento**: Visualização de faturas pendentes e pagas
- **Perfil**: Gerenciamento de informações pessoais e contatos de emergência

### Portal do Educador (Staff)
- **Dashboard**: Visão geral das turmas atribuídas e crianças presentes
- **Preencher Relatório**: Interface otimizada para tablet/mobile para registrar atividades diárias
- **Gestão da Turma**: Visualização das crianças da turma com informações de saúde importantes
- **Presença**: Registro de check-in/check-out das crianças
- **Comunicação**: Mensagens com responsáveis e administração

### Portal Administrativo
- **Dashboard**: Métricas gerais (ocupação, faturamento, estatísticas)
- **Gestão de Alunos**: CRUD completo de crianças matriculadas
- **Gestão de Staff**: Gerenciamento de educadores e atribuições de turmas
- **Gestão de Turmas**: Configuração de turmas e capacidades
- **Faturamento**: Visão geral de todas as faturas e geração de novas cobranças
- **Gestão de Eventos**: Criação e gerenciamento de eventos no calendário
- **Matrículas**: Gerenciamento do processo de matrícula e mudanças de turma

## Tecnologias

- **Framework**: Next.js 13 com App Router
- **Linguagem**: TypeScript
- **Estilização**: Tailwind CSS
- **Componentes**: shadcn/ui
- **Banco de Dados**: Supabase (PostgreSQL)
- **Autenticação**: Mock authentication (pode ser integrado com Supabase Auth)
- **Ícones**: Lucide React

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Configurar Supabase

1. Crie uma conta no [Supabase](https://supabase.com)
2. Crie um novo projeto
3. As migrações do banco de dados já foram aplicadas
4. Configure as variáveis de ambiente no arquivo `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=sua_url_do_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anonima
```

### 3. Executar em Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

## Contas de Demonstração

### Responsável
- Email: `responsavel@creche.com`
- Senha: qualquer valor

### Staff
- Email: `staff@creche.com`
- Senha: qualquer valor

### Administrador
- Email: `admin@creche.com`
- Senha: qualquer valor

## Estrutura do Banco de Dados

O sistema utiliza as seguintes tabelas principais:

- **users**: Usuários do sistema (responsáveis, staff, administradores)
- **classes**: Turmas da creche
- **children**: Crianças matriculadas
- **staff_classes**: Atribuições de educadores às turmas
- **daily_reports**: Relatórios diários das crianças
- **activities**: Atividades registradas nos relatórios
- **report_photos**: Fotos dos relatórios diários
- **attendance**: Registro de presença (check-in/out)
- **calendar_events**: Eventos do calendário
- **invoices**: Faturas de pagamento
- **messages**: Sistema de mensagens

Todas as tabelas possuem Row Level Security (RLS) configurado para garantir que usuários acessem apenas os dados apropriados para seu perfil.

## Design

O sistema segue princípios de design modernos:

- **Mobile-first**: Interface totalmente responsiva
- **Paleta de cores**: Verde, azul e amarelo claro para transmitir segurança e educação infantil
- **Tipografia**: Inter font para máxima legibilidade
- **Componentes**: Design limpo com bordas arredondadas e alvos de toque grandes
- **Acessibilidade**: Alto contraste e navegação clara

## Localização

Todo o sistema está em **Português Brasileiro**, incluindo:
- Interface do usuário
- Mensagens de erro
- Notificações
- Formatação de datas e valores monetários

## Próximos Passos

Para integração completa com Supabase:

1. Substituir o mock authentication por Supabase Auth
2. Conectar todas as páginas ao banco de dados real
3. Implementar upload de fotos para Supabase Storage
4. Adicionar notificações em tempo real
5. Implementar geração de relatórios em PDF

## Licença

Este projeto foi desenvolvido para fins de demonstração.
