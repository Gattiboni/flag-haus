'use client'

import { useState } from 'react'
import { reverseGeocode } from '@/lib/utils/geo'

type GeoFieldsProps = {
  neighborhood: string
  city: string
  onNeighborhood: (value: string) => void
  onCity: (value: string) => void
  /** Guarda lat/lng no state do form pai (null se não capturou). */
  onCoords: (lat: number | null, lng: number | null) => void
}

const inputCls =
  'w-full bg-transparent border-0 border-b border-[color:var(--onyx)] py-2.5 text-lg text-[color:var(--onyx)] outline-none focus:border-[color:var(--oxblood)] transition-colors'
const labelCls =
  'block text-[13px] uppercase tracking-[0.12em] text-[color:var(--granite)] mb-3'

/**
 * Bairro/cidade sempre editáveis + botão de geolocalização best-effort.
 * Geoloc é progressive enhancement: negou/falhou → segue manual, lat/lng null,
 * sem sobrescrever o que o usuário já digitou.
 */
export function GeoFields({
  neighborhood,
  city,
  onNeighborhood,
  onCity,
  onCoords,
}: GeoFieldsProps) {
  const [locating, setLocating] = useState(false)
  const [hint, setHint] = useState<string | null>(null)

  function handleLocate() {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setHint('Localização indisponível — pode digitar abaixo.')
      return
    }
    setLocating(true)
    setHint(null)
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        onCoords(latitude, longitude)
        const geo = await reverseGeocode(latitude, longitude)
        // não sobrescreve o que o usuário já digitou
        if (geo.neighborhood && !neighborhood.trim()) onNeighborhood(geo.neighborhood)
        if (geo.city && !city.trim()) onCity(geo.city)
        setLocating(false)
      },
      () => {
        // negado / erro / timeout: silencioso, segue manual
        onCoords(null, null)
        setLocating(false)
        setHint('Sem problema — é só digitar abaixo.')
      },
      { enableHighAccuracy: false, timeout: 8000 }
    )
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleLocate}
        disabled={locating}
        className="rounded-full border border-[color:var(--onyx)] px-5 py-3 text-sm text-[color:var(--onyx)] hover:bg-[color:var(--whisper)] transition-colors cursor-pointer disabled:opacity-50 mb-2"
      >
        {locating ? 'Localizando…' : '📍 Usar minha localização'}
      </button>
      {hint && (
        <p className="text-[color:var(--granite)] text-[13px] mb-2">{hint}</p>
      )}

      <div className="my-8">
        <label className={labelCls}>Bairro</label>
        <input
          type="text"
          value={neighborhood}
          onChange={(e) => onNeighborhood(e.target.value)}
          placeholder="Vila Mariana"
          className={inputCls}
        />
      </div>
      <div className="my-8">
        <label className={labelCls}>Cidade</label>
        <input
          type="text"
          value={city}
          onChange={(e) => onCity(e.target.value)}
          className={inputCls}
        />
      </div>
    </div>
  )
}
