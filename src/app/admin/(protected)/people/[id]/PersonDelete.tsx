'use client'

import { useRouter } from 'next/navigation'
import { useState, useTransition } from 'react'
import { deletePerson } from '@/app/actions/admin-people'
import { CADASTROS_PATH } from '@/app/admin/_ui/cadastros'
import { Button, Dialog, Input } from '@/components/ui'

/**
 * "Excluir cadastro" (Bloco 5C, pedido do Alan em 09/08). Fica no rodapé da
 * ficha, discreto, e em lugar nenhum da lista: excluir é o fim de um cadastro,
 * não uma ação de varredura entre 25 linhas.
 *
 * A confirmação exige DIGITAR o nome — não é cerimônia. Um `window.confirm`
 * (ou um "Tem certeza?" com botão) é respondido no automático, e a ação não tem
 * botão de desfazer: quem digita o nome leu de quem está falando. É o mesmo
 * mecanismo que o GitHub usa pra apagar repositório, pela mesma razão.
 *
 * O que o texto promete é o que o server faz: soft-delete. Some das listas,
 * histórico preservado no banco, volta só por dentro.
 */

function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim()
}

export function PersonDelete({
  personId,
  displayName,
}: {
  personId: string
  displayName: string
}) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [typed, setTyped] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [deleted, setDeleted] = useState(false)
  const [pending, startTransition] = useTransition()

  const matches = normalize(typed) !== '' && normalize(typed) === normalize(displayName)

  function close() {
    if (pending || deleted) return
    setOpen(false)
    setTyped('')
    setError(null)
  }

  function handleDelete() {
    if (!matches || pending) return
    setError(null)

    startTransition(async () => {
      const res = await deletePerson({ personId, confirmName: typed })
      if (res.status === 'ok') {
        // O modal fica aberto anunciando o resultado: fechar tudo e navegar de
        // uma vez deixaria o Julio na lista sem saber se deu certo.
        setDeleted(true)
        router.replace(CADASTROS_PATH)
        router.refresh()
      } else {
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra excluir. Tenta de novo.'
        )
      }
    })
  }

  return (
    <div className="mt-fh-6 flex items-center justify-end">
      <Button
        variant="tertiary"
        size="sm"
        onClick={() => setOpen(true)}
        disabled={pending}
      >
        Excluir cadastro
      </Button>

      <Dialog
        open={open}
        onClose={close}
        variant="danger"
        title="Excluir este cadastro?"
        description={
          <>
            <strong>{displayName}</strong> some da lista de Cadastros, da busca e
            do Funil, junto com os jobs em aberto. O histórico (consentimentos,
            eventos, ficha clínica) continua guardado no banco — a exclusão é
            reversível só tecnicamente, por dentro, e não há botão de desfazer
            aqui.
          </>
        }
        confirmLabel={deleted ? 'Excluído' : 'Excluir cadastro'}
        cancelLabel="Cancelar"
        loading={pending}
        confirmDisabled={!matches || deleted}
        onConfirm={handleDelete}
      >
        {deleted ? (
          <p className="fh-micro" role="status">
            Cadastro excluído. Voltando pra lista…
          </p>
        ) : (
          <>
            <Input
              label={`Digite "${displayName}" para confirmar`}
              type="text"
              autoFocus
              autoComplete="off"
              placeholder={displayName}
              value={typed}
              disabled={pending}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleDelete()
              }}
            />
            {error && (
              <p className="fh-error mt-fh-2" role="alert">
                {error}
              </p>
            )}
          </>
        )}
      </Dialog>
    </div>
  )
}
