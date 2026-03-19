/**
 * Centralized API messages in Portuguese (pt-BR) for user-facing responses.
 * Code and identifiers stay in English; only strings shown to users are here.
 */

export const Messages = {
  AUTH: {
    LOGIN_SUCCESS: 'Login realizado com sucesso',
    LOGOUT_SUCCESS: 'Logout realizado com sucesso',
    REGISTER_SUCCESS: 'Cadastro realizado com sucesso',
    REGISTER_FAILED: 'Falha ao realizar cadastro',
    TOKEN_INVALID: 'Token inválido',
    TOKEN_EXPIRED: 'Token expirado',
    TOKEN_MISSING: 'Token não fornecido',
    TOKEN_REQUIRED: 'Token não fornecido',
    UNAUTHORIZED: 'Não autorizado. Por favor, faça login.',
    AUTHENTICATION_REQUIRED: 'Autenticação necessária',
    ACCESS_DENIED: 'Acesso negado',
    INSUFFICIENT_PERMISSIONS: 'Permissões insuficientes',
    ADMIN_ONLY: 'Acesso apenas para administradores',
    EMAIL_ALREADY_EXISTS: 'Este email já está cadastrado',
    INVALID_CREDENTIALS: 'Email ou senha incorretos',
    INVALID_REFRESH_TOKEN: 'Token de atualização inválido',
    PASSWORD_CHANGED: 'Senha alterada com sucesso',
    CURRENT_PASSWORD_INCORRECT: 'Senha atual incorreta',
    TOKEN_REFRESHED: 'Token atualizado com sucesso',
    PASSWORD_RESET_EMAIL_SENT: 'Se o email existir, um link de redefinição será enviado',
    PASSWORD_RESET_SUCCESS: 'Senha redefinida com sucesso',
    INVALID_RESET_TOKEN: 'Token de redefinição inválido ou expirado',
    ADMIN_ACCESS: 'Acesso de administrador concedido'
  },

  USER: {
    CREATED: 'Usuário criado com sucesso',
    UPDATED: 'Usuário atualizado com sucesso',
    NOT_FOUND: 'Usuário não encontrado',
    PROFILE_UPDATED: 'Perfil atualizado com sucesso',
    PROFILE_RETRIEVED: 'Perfil recuperado com sucesso',
    PASSWORD_UPDATED: 'Senha atualizada com sucesso',
    FETCH_FAILED: 'Falha ao buscar usuário'
  },

  ERROR: {
    INTERNAL_SERVER_ERROR: 'Erro interno do servidor',
    SOMETHING_WENT_WRONG: 'Algo deu errado',
    ROUTE_NOT_FOUND: 'Rota não encontrada',
    VALIDATION_FAILED: 'Validação falhou'
  },

  API: {
    TOO_MANY_REQUESTS: 'Muitas requisições deste IP. Tente novamente mais tarde.',
    RUNNING: 'API está em execução',
    WELCOME: 'Bem-vindo à API'
  }
};

export function getMessage(path: string, defaultMessage = 'Operação concluída'): string {
  const keys = path.split('.');
  let message: unknown = Messages;
  for (const key of keys) {
    message = (message as Record<string, unknown>)?.[key];
  }
  return typeof message === 'string' ? message : defaultMessage;
}

export function formatMessage(message: string, variables: Record<string, unknown>): string {
  let formatted = message;
  Object.keys(variables).forEach(key => {
    formatted = formatted.replace(`{${key}}`, String(variables[key]));
  });
  return formatted;
}

export default Messages;
