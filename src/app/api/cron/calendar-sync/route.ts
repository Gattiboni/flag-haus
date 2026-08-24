import { timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { syncCalendar } from '@/lib/google/sync'

/**
 * Rota do cron do sync (contrato §8.5). O Vercel Cron bate aqui 2x/dia
 * (07:00 e 15:00 BRT) com `Authorization: Bearer $CRON_SECRET`.
 *
 * O botão "Sincronizar agora" da página NÃO passa por aqui: ele chama o núcleo
 * direto pela Server Action. Um app fazendo HTTP pra si mesmo pra rodar código
 * que já está no mesmo processo é um salto de rede que só existe pra dar erro
 * em preview deploy e atrás de proxy.
 *
 * `?dry=1` roda o núcleo em modo leitura pura — é como o sync se valida contra
 * a agenda real sem escrever em produção. Exige o mesmo segredo.
 *
 * `CRON_SECRET` vem da env, sem default no código: uma rota que sincroniza
 * agenda não pode ficar aberta porque alguém esqueceu de setar a variável.
 */

export const dynamic = 'force-dynamic'
export const maxDuration = 60

function authorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    console.error('[api/cron/calendar-sync] CRON_SECRET não está setado — negando')
    return false
  }

  const header = req.headers.get('authorization') ?? ''
  const offered = header.startsWith('Bearer ') ? header.slice(7) : header

  const a = Buffer.from(offered)
  const b = Buffer.from(secret)
  // Comparação de tamanho antes: `timingSafeEqual` estoura com buffers de
  // tamanhos diferentes, e o tamanho do segredo não é o que se protege aqui.
  return a.length === b.length && timingSafeEqual(a, b)
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ status: 'unauthorized' }, { status: 401 })
  }

  const params = new URL(req.url).searchParams
  const dryRun = params.get('dry') === '1'
  // `full` só vale em dry-run: forçar janela cheia numa rodada que ESCREVE
  // jogaria fora o syncToken sem motivo.
  const forceFull = dryRun && params.get('full') === '1'
  const result = await syncCalendar({ dryRun, forceFull })

  return NextResponse.json(result, { status: result.status === 'ok' ? 200 : 500 })
}
