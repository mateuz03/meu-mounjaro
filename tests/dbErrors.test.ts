import { describe, expect, it } from 'vitest';
import {
  classifyDbError,
  isNetworkFailure,
  loadErrorMessage,
} from '../src/lib/dbErrors';

describe('classifyDbError', () => {
  it('classifica tabela/coluna inexistente como schema', () => {
    expect(classifyDbError({ code: '42P01', message: 'relation does not exist' })).toBe('schema');
    expect(classifyDbError({ code: '42703', message: 'column does not exist' })).toBe('schema');
  });

  it('classifica 42501 como permission', () => {
    expect(classifyDbError({ code: '42501', message: 'insufficient privilege' })).toBe('permission');
  });

  it('classifica JWT expirado como auth', () => {
    expect(classifyDbError({ code: 'PGRST301', message: 'JWT expired' })).toBe('auth');
    expect(classifyDbError({ message: 'Invalid token supplied' })).toBe('auth');
  });

  it('classifica falha de fetch como network', () => {
    expect(classifyDbError({ message: 'TypeError: fetch failed' })).toBe('network');
    expect(classifyDbError({ message: 'NetworkError when attempting to fetch resource' })).toBe(
      'network',
    );
  });

  it('retorna unknown para erro nulo ou não reconhecido', () => {
    expect(classifyDbError(null)).toBe('unknown');
    expect(classifyDbError({ code: 'XX999', message: 'qualquer coisa' })).toBe('unknown');
  });
});

describe('loadErrorMessage', () => {
  it('tem mensagem específica por tipo (sem dizer "offline" para erro de schema)', () => {
    expect(loadErrorMessage('schema')).toMatch(/migrações/i);
    expect(loadErrorMessage('schema')).not.toMatch(/offline/i);
    expect(loadErrorMessage('permission')).toMatch(/RLS/i);
    expect(loadErrorMessage('auth')).toMatch(/sessão expirou/i);
    expect(loadErrorMessage('network')).toMatch(/sem conexão/i);
    expect(loadErrorMessage('unknown')).toMatch(/não foi possível carregar/i);
  });
});

describe('isNetworkFailure', () => {
  it('só rede justifica modo offline', () => {
    expect(isNetworkFailure('network')).toBe(true);
    expect(isNetworkFailure('schema')).toBe(false);
    expect(isNetworkFailure('auth')).toBe(false);
    expect(isNetworkFailure('permission')).toBe(false);
    expect(isNetworkFailure('unknown')).toBe(false);
  });
});
