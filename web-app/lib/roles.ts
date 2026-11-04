import type { LucideIcon } from 'lucide-react';
import {
  Baby,
  BarChart3,
  Bell,
  CalendarDays,
  ClipboardCheck,
  ClipboardList,
  FileText,
  Home,
  Inbox,
  MessageCircle,
  Receipt,
  School,
  UserCircle,
  Users,
  Wallet
} from 'lucide-react';
import type { Role } from './api/auth';

/** Mozambican Portuguese labels (glossary approved by the client, 2026-11-02). */
export const ROLE_LABELS: Record<Role, string> = {
  administrador: 'Administração',
  staff: 'Educador',
  responsavel: 'Encarregado de Educação'
};

/** Each role's area of the app. The route segments stay as in the API (`responsavel`). */
export const ROLE_HOME: Record<Role, string> = {
  administrador: '/admin',
  staff: '/staff',
  responsavel: '/responsavel'
};

export interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Shown in the phone/tablet bottom bar (max 4; the rest go under "Mais") */
  tab?: boolean;
  /** Short description, shown while the screen is being built */
  description: string;
}

/** Navigation per role. Screens are built in Phase 3; until then each shows a placeholder. */
export const NAV: Record<Role, NavItem[]> = {
  administrador: [
    { href: '/admin', label: 'Painel', icon: Home, tab: true, description: 'O que precisa de atenção hoje: matrículas, facturas em atraso, relatórios por validar.' },
    { href: '/admin/matriculas', label: 'Matrículas', icon: Inbox, tab: true, description: 'Pedidos de matrícula para analisar, aprovar ou recusar.' },
    { href: '/admin/criancas', label: 'Crianças', icon: Baby, tab: true, description: 'Fichas das crianças: saúde, encarregados, pessoas autorizadas.' },
    { href: '/admin/turmas', label: 'Turmas', icon: School, description: 'Turmas, capacidade e educadores.' },
    { href: '/admin/pessoas', label: 'Pessoas', icon: Users, description: 'Encarregados e equipa: convites, contas e acessos.' },
    { href: '/admin/facturacao', label: 'Facturação', icon: Receipt, tab: true, description: 'Facturas, pagamentos e valores em atraso.' },
    { href: '/admin/despesas', label: 'Despesas', icon: Wallet, description: 'Despesas do centro e recibos.' },
    { href: '/admin/relatorios', label: 'Relatórios', icon: BarChart3, description: 'Finanças, pagamentos, despesas e presenças.' },
    { href: '/admin/relatorios-mensais', label: 'Relatórios mensais', icon: FileText, description: 'Relatórios de desenvolvimento por validar.' },
    { href: '/admin/eventos', label: 'Eventos', icon: CalendarDays, description: 'Calendário do centro e das turmas.' },
    { href: '/admin/mensagens', label: 'Mensagens', icon: MessageCircle, description: 'Conversas com famílias e equipa.' },
    { href: '/admin/notificacoes', label: 'Notificações', icon: Bell, description: 'Avisos enviados por WhatsApp e email: entregues, lidos, falhados e reenvios.' }
  ],
  staff: [
    { href: '/staff', label: 'Hoje', icon: Home, tab: true, description: 'As suas turmas hoje: presenças e relatórios por preencher.' },
    { href: '/staff/presencas', label: 'Presenças', icon: ClipboardCheck, tab: true, description: 'Registo de entradas e saídas, também sem internet.' },
    { href: '/staff/relatorio-diario', label: 'Relatório diário', icon: ClipboardList, tab: true, description: 'Refeições, sesta, humor e fotos de cada criança.' },
    { href: '/staff/turma', label: 'Turma', icon: School, description: 'As crianças da turma, com alergias e medicação sempre à vista.' },
    { href: '/staff/relatorios-mensais', label: 'Relatórios mensais', icon: FileText, description: 'Rascunhos e relatórios submetidos.' },
    { href: '/staff/mensagens', label: 'Mensagens', icon: MessageCircle, tab: true, description: 'Conversas com as famílias.' }
  ],
  responsavel: [
    { href: '/responsavel', label: 'Hoje', icon: Home, tab: true, description: 'O dia do seu filho: entrada, saída, relatório e fotos.' },
    { href: '/responsavel/relatorios', label: 'Relatórios', icon: FileText, tab: true, description: 'Relatórios diários e mensais.' },
    { href: '/responsavel/mensagens', label: 'Mensagens', icon: MessageCircle, tab: true, description: 'Conversas com a equipa e a administração.' },
    { href: '/responsavel/facturacao', label: 'Facturação', icon: Receipt, tab: true, description: 'Facturas e pagamentos.' },
    { href: '/responsavel/eventos', label: 'Eventos', icon: CalendarDays, description: 'Calendário do centro e da turma.' },
    { href: '/responsavel/perfil', label: 'Perfil', icon: UserCircle, description: 'Os seus contactos, palavra-passe e notificações.' }
  ]
};
