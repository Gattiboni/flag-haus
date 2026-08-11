import Link from 'next/link'
import { Search } from 'lucide-react'
import {
  CADASTROS_PATH,
  CLEAR_PATCH,
  DEFAULT_PER_PAGE,
  DEFAULT_SORT,
  cadastrosHref,
  hasActiveState,
  type CadastrosQuery,
} from '@/app/admin/_ui/cadastros'
import { Input } from '@/components/ui'
import { FiltrosSheet } from './CadastrosMenus'
import './cadastros.css'

/**
 * A barra de cima da tela de Cadastros. Depois do Adendo 3 (09/08) ela guarda
 * só o que não pertence a nenhuma coluna: a busca e o Limpar. Filtro e
 * ordenação desceram pros cabeçalhos (ColumnHeaderMenu, em CadastrosList) —
 * as três fileiras de chips que moravam aqui empurravam a lista pra baixo da
 * dobra, que era exatamente o que a tela existia pra evitar.
 *
 * No celular não há cabeçalho de coluna onde pendurar dropdown, então os quatro
 * painéis entram atrás do botão "Filtrar/Ordenar" que aparece aqui do lado da
 * busca. Mesmo conteúdo, mesmos hrefs, mesma URL.
 *
 * A busca segue um form GET nativo, sem JS: os hidden preservam o resto do
 * estado. Decisão local que continua valendo (§3B pede que seja reportada): a
 * busca global do header aponta pra /admin/buscar e varre `people` direto,
 * servindo pra "achar uma pessoa e sair"; esta é escopada à lista e PRESERVA
 * filtros, ordenação e paginação no submit. Dois papéis, não duas
 * implementações do mesmo papel.
 */

export function CadastrosToolbar({ query }: { query: CadastrosQuery }) {
  return (
    <div className="flex flex-wrap items-center gap-fh-3">
      <form
        action={CADASTROS_PATH}
        method="GET"
        role="search"
        className="min-w-0 flex-1 sm:max-w-md"
      >
        {query.status.length > 0 && (
          <input type="hidden" name="status" value={query.status.join(',')} />
        )}
        {query.filtros.length > 0 && (
          <input type="hidden" name="filtros" value={query.filtros.join(',')} />
        )}
        {/* Só o que difere do default, como em `cadastrosHref` — a URL que a
            busca produz tem que ser a mesma que um clique de menu produziria. */}
        {query.sort !== DEFAULT_SORT && (
          <input type="hidden" name="sort" value={query.sort} />
        )}
        {query.per !== DEFAULT_PER_PAGE && (
          <input type="hidden" name="per" value={String(query.per)} />
        )}

        <Input
          type="search"
          name="q"
          defaultValue={query.q}
          placeholder="Nome, telefone, e-mail ou @instagram…"
          aria-label="Buscar nos cadastros"
          suffix={<Search size={18} strokeWidth={1.5} />}
        />
      </form>

      <div className="flex items-center gap-fh-2 md:hidden">
        <FiltrosSheet query={query} />
      </div>

      {hasActiveState(query) && (
        <Link href={cadastrosHref(query, CLEAR_PATCH)} className="fh-cad-clear">
          Limpar
        </Link>
      )}
    </div>
  )
}
