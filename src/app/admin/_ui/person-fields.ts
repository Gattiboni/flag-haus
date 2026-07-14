/**
 * Campos travávis da edição de pessoa (#4c §5-bis), como fonte única.
 *
 * Vive num módulo plano (sem 'use server'/'use client') de propósito: a Server
 * Action `admin-people.ts` é 'use server' e só pode exportar funções async — uma
 * constante exportada de lá viraria `undefined` no client (o bug do #4b). Server
 * e client importam esta camada.
 */
export const LOCKABLE_FIELDS = [
  'name',
  'email',
  'phone',
  'birth_date',
  'document_type',
  'document_number',
  'neighborhood',
  'city',
  'instagram',
  'occupation',
  'preferred_channel',
] as const

export type PersonField = (typeof LOCKABLE_FIELDS)[number]

/** Campos que são colunas diretas de `people`; o resto mora em `extra_data`. */
export const COLUMN_FIELDS = ['name', 'email', 'phone', 'birth_date'] as const
