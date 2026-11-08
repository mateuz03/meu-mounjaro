// Classificação de erros do Supabase/PostgREST para mensagens adequadas
// ao usuário, sem confundir falha de consulta com modo offline.

export type DbErrorKind = 'network' | 'auth' | 'schema' | 'permission' | 'unknown';

export interface DbErrorLike {
  message?: string;
  code?: string | number;
}

const SCHEMA_CODES = new Set(['42P01', '42703', '42883']); // undefined_table, undefined_column, undefined_function
const PERMISSION_CODES = new Set(['42501', '42502']); // insufficient_privilege / grant

export function classifyDbError(err: DbErrorLike | null | undefined): DbErrorKind {
  if (!err) return 'unknown';
  const code = err.code != null ? String(err.code) : '';
  const message = err.message ?? '';

  if (SCHEMA_CODES.has(code)) return 'schema';
  if (PERMISSION_CODES.has(code)) return 'permission';
  // PGRST301 = JWT expirado/inválido (PostgREST)
  if (code === 'PGRST301' || /jwt|token/i.test(message)) return 'auth';
  // supabase-js encapsula falha de fetch como "TypeError: fetch failed" / "Fetch failed"
  if (/fetch|network/i.test(message)) return 'network';
  return 'unknown';
}

export function loadErrorMessage(kind: DbErrorKind): string {
  switch (kind) {
    case 'network':
      return 'Sem conexão com o servidor. Exibindo dados salvos no aparelho.';
    case 'auth':
      return 'Sua sessão expirou. Entre novamente para atualizar seus dados.';
    case 'schema':
      return 'A estrutura do banco está desatualizada. Aplique as migrações do Supabase e tente de novo.';
    case 'permission':
      return 'Sem permissão para ler alguns dados. Verifique as políticas RLS no Supabase.';
    default:
      return 'Não foi possível carregar alguns dados. Tente atualizar em alguns instantes.';
  }
}

// true quando a falha é de conectividade (justifica entrar em modo offline)
export function isNetworkFailure(kind: DbErrorKind): boolean {
  return kind === 'network';
}
