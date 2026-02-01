# Sistema de Gestão de Creche

Sistema completo de gestão para creches dedicadas a crianças de 0 a 5 anos, desenvolvido com Next.js, TypeScript, Tailwind CSS e uma API backend (Node.js + Express + MongoDB).

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
- **Backend**: API em `../api` (Express, TypeScript, MongoDB, JWT auth)
- **Autenticação**: Mock authentication (será integrado com a API JWT)
- **Ícones**: Lucide React

## Configuração

### 1. Instalar Dependências

```bash
npm install
```

### 2. Backend (API)

O frontend consome a API em `../api`. Para desenvolvimento:

1. Entre na pasta da API e configure o ambiente:
   ```bash
   cd ../api
   cp env.example .env
   # Edite .env: MONGODB_URI, JWT_SECRET
   npm install
   npm run dev
   ```
2. A API roda em `http://localhost:3002` por padrão (health: `GET http://localhost:3002/health`).
3. Documentação da API: `../api/docs/STARTER-KIT-GUIDE.md`.

### 3. Executar o Frontend em Desenvolvimento

```bash
npm run dev
```

O aplicativo estará disponível em `http://localhost:3000`

## Contas de Demonstração

Atualmente o login usa dados mock. Contas de teste:

- **Responsável**: `responsavel@creche.com` — senha: qualquer valor
- **Staff**: `staff@creche.com` — senha: qualquer valor
- **Administrador**: `admin@creche.com` — senha: qualquer valor

## Dados

Em desenvolvimento, as páginas usam dados mock em `lib/mock-data.ts`. A integração com a API (login JWT + endpoints de crianças, turmas, faturas, mensagens, etc.) será feita conforme os recursos forem implementados no backend.

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

1. Integrar login com a API (JWT: register, login, refresh, me).
2. Conectar as páginas aos endpoints da API (crianças, turmas, faturas, mensagens, etc.).
3. Implementar upload de fotos (API já suporta Multer + Cloudinary).
4. Adicionar middleware de proteção de rotas por role no frontend.
5. Implementar geração de relatórios em PDF.

## Licença

Este projeto foi desenvolvido para fins de demonstração.
