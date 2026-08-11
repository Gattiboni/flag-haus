'use client'

import { useEffect, useState, useTransition } from 'react'
import { updatePersonNotes } from '@/app/actions/admin-people'
import { Button, Textarea } from '@/components/ui'

/**
 * Observações vivas (Bloco 5B) — a caderneta do Julio sobre a pessoa, prometida
 * desde julho e nunca implementada.
 *
 * Botão Salvar em vez de autosave, e a razão não é preguiça: autosave num campo
 * onde se digita durante uma conversa com o cliente na frente grava cada frase
 * pela metade e transforma um rascunho em fato. O Julio decide quando a nota
 * está pronta. O botão só aparece quando há mudança (mesmo padrão do JobDetail
 * e do inline edit de Cadastros), e "Salvo" confirma sem exigir leitura.
 *
 * Esta nota vive SÓ aqui: não entra na lista de Cadastros, não entra na busca e
 * não entra no payload do evento de auditoria. É a mesma regra de "zero dado
 * sensível na lista" — o que o cliente conta numa conversa não vira coluna.
 */

const NOTES_MAX = 4000

export function PersonNotes({
  personId,
  initial,
}: {
  personId: string
  initial: string
}) {
  const [saved, setSaved] = useState(initial)
  const [draft, setDraft] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  const [done, setDone] = useState(false)
  const [saving, startSaving] = useTransition()

  const dirty = draft.trim() !== saved.trim()

  // O "Salvo" é confirmação, não estado: some sozinho pra não virar rótulo
  // permanente de uma nota que já foi editada de novo.
  useEffect(() => {
    if (!done) return
    const t = setTimeout(() => setDone(false), 2500)
    return () => clearTimeout(t)
  }, [done])

  function handleSave() {
    if (!dirty || saving) return
    setError(null)
    setDone(false)

    const next = draft.trim()

    startSaving(async () => {
      const res = await updatePersonNotes({ personId, notes: next })
      if (res.status === 'ok') {
        setSaved(next)
        setDraft(next)
        setDone(true)
      } else {
        // Valor NÃO revertido: o texto é do Julio, e jogar fora o que ele
        // acabou de escrever porque a rede falhou seria pior que o erro.
        setError(
          res.status === 'invalid' ? res.reason : 'Não deu pra salvar. Tenta de novo.'
        )
      }
    })
  }

  return (
    <div className="flex flex-col gap-fh-3">
      <Textarea
        aria-label="Observações sobre a pessoa"
        rows={5}
        maxLength={NOTES_MAX}
        placeholder="O que é bom lembrar na próxima conversa."
        value={draft}
        disabled={saving}
        onChange={(e) => setDraft(e.target.value)}
      />

      <div className="flex items-center justify-end gap-fh-3">
        {error && (
          <span className="fh-error" role="alert">
            {error}
          </span>
        )}
        {!error && done && !dirty && (
          <span className="fh-micro" role="status">
            Salvo.
          </span>
        )}
        {dirty && (
          <Button size="sm" onClick={handleSave} loading={saving}>
            {saving ? 'Salvando…' : 'Salvar'}
          </Button>
        )}
      </div>
    </div>
  )
}
