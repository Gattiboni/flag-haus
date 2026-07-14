/**
 * Valores do enum `job_status` do banco, como fonte única compartilhada.
 *
 * Vive aqui — sem diretiva 'use server'/'use client' — de propósito: um módulo
 * 'use server' só pode exportar funções async, então uma constante exportada de
 * lá vira `undefined` no lado client (foi o bug do #4b). Server e client
 * importam desta camada de domínio.
 */
export const JOB_STATUSES = [
  'quoted',
  'confirmed',
  'executed',
  'cancelled',
  'no_response',
] as const

export type JobStatus = (typeof JOB_STATUSES)[number]
