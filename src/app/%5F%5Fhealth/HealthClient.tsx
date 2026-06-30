'use client'

import { useState, useTransition } from 'react'
import type { FindPersonResult } from '@/app/actions/people'

type Props = {
  findPersonAction: (phone: string) => Promise<FindPersonResult>
}

export function HealthClient({ findPersonAction }: Props) {
  const [phone, setPhone] = useState('')
  const [result, setResult] = useState<FindPersonResult | null>(null)
  const [isPending, startTransition] = useTransition()

  function handleSubmit() {
    if (!phone.trim()) return
    startTransition(async () => {
      const r = await findPersonAction(phone)
      setResult(r)
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="11 99999 8888"
          className="flex-1 px-3 py-2 border border-[color:var(--line)] rounded font-mono text-sm bg-transparent text-[color:var(--onyx)]"
          disabled={isPending}
        />
        <button
          onClick={handleSubmit}
          disabled={isPending || !phone.trim()}
          className="px-4 py-2 bg-[color:var(--onyx)] text-[color:var(--paper)] rounded text-sm disabled:opacity-50"
        >
          {isPending ? 'Buscando...' : 'Buscar'}
        </button>
      </div>

      {result && (
        <pre className="bg-[color:var(--whisper)] p-4 rounded text-xs overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  )
}
