/**
 * User-facing messages in Portuguese (pt-BR).
 * Code and identifiers stay in English; only strings shown to the user go here.
 */

export const messages = {
  /** Generic loading */
  loading: 'Carregando...',

  /** Auth */
  auth: {
    invalidCredentials: 'Email ou senha incorretos',
    userNotFound: 'Usuário não encontrado',
    loggingIn: 'Entrando...',
    login: 'Entrar',
  },

  /** API client: fallback when response has no message */
  api: {
    requestFailed: 'Falha na requisição. Tente novamente.',
    loadFailed: 'Falha ao carregar.',
    createFailed: 'Falha ao criar.',
    updateFailed: 'Falha ao atualizar.',
    deleteFailed: 'Falha ao excluir.',
  },

  /** Common success feedback (for toasts/alerts) */
  success: {
    saved: 'Salvo com sucesso!',
    created: 'Criado com sucesso!',
    updated: 'Atualizado com sucesso!',
    deleted: 'Excluído com sucesso!',
    messageSent: 'Mensagem enviada',
    checkInRecorded: 'Entrada registrada com sucesso!',
    checkOutRecorded: 'Saída registrada com sucesso!',
    reportValidated: 'Relatório validado com sucesso! Agora está disponível para os pais.',
    reportRejected: 'Relatório rejeitado. O staff será notificado para revisar.',
    exportComingSoon: 'Funcionalidade de exportação será implementada em breve.',
    downloadComingSoon: 'Funcionalidade de download será implementada em breve.',
  },
} as const;

export type Messages = typeof messages;
