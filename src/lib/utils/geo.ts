// ─── Contrato normalizado ──────────────────────────────────
// Toda a app consome só isto. `reverseGeocode` mantém a assinatura antiga
// (os campos são opcionais na leitura), agora com null explícito.

export type GeoResult = { neighborhood: string | null; city: string | null }
export type GeoProvider = {
  name: string
  lookup: (lat: number, lng: number) => Promise<GeoResult>
}

/** lowercase + sem acento, pra comparar bairro vs cidade. */
function normalize(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

/** Timeout por provider: 5s, via AbortController. Lança em erro/timeout/!ok. */
const PROVIDER_TIMEOUT_MS = 5000

async function fetchJson(url: string): Promise<unknown> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PROVIDER_TIMEOUT_MS)
  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) throw new Error(`HTTP ${res.status}`)
    return await res.json()
  } finally {
    clearTimeout(timer)
  }
}

// ─── Provider: Nominatim (PRIMÁRIO) ────────────────────────
// Cobre os bairros de SP que a BigDataCloud não devolve (República, Sé, etc.).

type NominatimData = {
  address?: {
    suburb?: string
    neighbourhood?: string
    city_district?: string
    city?: string
    town?: string
    municipality?: string
  }
}

const nominatim: GeoProvider = {
  name: 'nominatim',
  async lookup(lat, lng) {
    const url =
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2` +
      `&lat=${lat}&lon=${lng}&zoom=16&addressdetails=1&accept-language=pt-BR`
    const d = (await fetchJson(url)) as NominatimData
    const a = d.address ?? {}
    return {
      neighborhood: a.suburb ?? a.neighbourhood ?? a.city_district ?? null,
      city: a.city ?? a.town ?? a.municipality ?? null,
    }
  },
}

// ─── Provider: BigDataCloud (FALLBACK) ─────────────────────
// Lógica herança da #3b preservada: bairro = maior adminLevel >= 9;
// cidade = adminLevel === 8.

type BdcEntry = {
  name?: string
  description?: string
  adminLevel?: number
  order?: number
}

type BdcData = {
  city?: string
  locality?: string
  localityInfo?: {
    administrative?: BdcEntry[]
    informative?: BdcEntry[]
  }
}

/**
 * Extrai o bairro de localityInfo:
 *   - administrative com adminLevel >= 9 (nível 8 é o MUNICÍPIO), ou
 *   - informative cuja description contenha suburb/neighbourhood/district
 * Guard: nunca retorna algo igual a d.city NEM a d.locality (normalizados).
 * Entre os válidos, pega o de maior `order`. Nada válido → undefined.
 */
function extractNeighborhood(d: BdcData, city?: string): string | undefined {
  const info = d.localityInfo
  if (!info) return undefined

  const blocked = new Set(
    [city, d.city, d.locality].filter(Boolean).map((s) => normalize(s as string))
  )
  const candidates: Array<{ name: string; order: number }> = []

  for (const a of info.administrative ?? []) {
    if (typeof a.adminLevel === 'number' && a.adminLevel >= 9 && a.name) {
      candidates.push({ name: a.name, order: a.order ?? 0 })
    }
  }

  const keywords = ['suburb', 'neighbourhood', 'district']
  for (const i of info.informative ?? []) {
    const desc = (i.description ?? '').toLowerCase()
    if (i.name && keywords.some((k) => desc.includes(k))) {
      candidates.push({ name: i.name, order: i.order ?? 0 })
    }
  }

  const valid = candidates.filter((c) => !blocked.has(normalize(c.name)))
  if (valid.length === 0) return undefined

  valid.sort((a, b) => b.order - a.order)
  return valid[0].name
}

/**
 * Cidade real: administrative com adminLevel === 8 (município) se houver;
 * senão o fallback da API (d.city vem "Região Metropolitana..." — inútil).
 */
function extractCity(d: BdcData): string | undefined {
  const admin8 = (d.localityInfo?.administrative ?? []).find(
    (a) => a.adminLevel === 8 && a.name
  )
  return admin8?.name || d.city || d.locality || undefined
}

const bigdatacloud: GeoProvider = {
  name: 'bigdatacloud',
  async lookup(lat, lng) {
    const d = (await fetchJson(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lng}&localityLanguage=pt`
    )) as BdcData
    const city = extractCity(d) ?? null
    const neighborhood = extractNeighborhood(d, city ?? undefined) ?? null
    return { neighborhood, city }
  },
}

// ─── Orquestrador ──────────────────────────────────────────

const PROVIDERS: GeoProvider[] = [nominatim, bigdatacloud]

/** bairro === cidade não é bairro: vira null. */
function guard(r: GeoResult): GeoResult {
  if (
    r.neighborhood &&
    r.city &&
    normalize(r.neighborhood) === normalize(r.city)
  ) {
    return { neighborhood: null, city: r.city }
  }
  return r
}

/**
 * Reverse geocoding client-side. Percorre os providers EM ORDEM; retorna o
 * primeiro resultado com bairro. Se nenhum tiver bairro, retorna o primeiro
 * com cidade. Se todos falharem, retorna { neighborhood: null, city: null }.
 * Best-effort: erro/timeout de um provider nunca propaga — loga e passa ao
 * próximo. O usuário SEMPRE pode editar os campos.
 */
export async function reverseGeocode(lat: number, lng: number): Promise<GeoResult> {
  const partials: GeoResult[] = []

  for (const provider of PROVIDERS) {
    try {
      const result = guard(await provider.lookup(lat, lng))
      if (result.neighborhood !== null) return result
      partials.push(result)
    } catch (err) {
      console.warn(`[reverseGeocode] provider "${provider.name}" falhou:`, err)
    }
  }

  const withCity = partials.find((r) => r.city !== null)
  if (withCity) return withCity

  return { neighborhood: null, city: null }
}

// ─── Autocomplete: Photon / OSM (INDEPENDENTE do reverse) ──
// Provider separado do reverse geocoding de propósito: se a Nominatim for
// bloqueada por abuso de type-ahead, o reverse (que usa Nominatim) cairia
// junto. Photon é feito pra type-ahead, gratuito, sem key, CORS liberado.
// Enhancement puro: erro/timeout → [], NUNCA lança.

export type PlaceSuggestion = {
  label: string // texto exibido, ex: "Vila Mariana — São Paulo, SP"
  neighborhood: string | null
  city: string | null
  state: string | null
}

const PHOTON_TIMEOUT_MS = 4000
/** Viés padrão: São Paulo (reordena resultados por proximidade). */
const SP_BIAS = { lat: -23.5505, lng: -46.6333 }

// Filtro client-side sobre properties.osm_value. A busca crua devolve países
// e POIs (ex.: "Repúb" → 5 países; "Camp" → condado do Texas). Sem isso, o
// autocomplete é inutilizável.
const NEIGHBORHOOD_VALUES = new Set([
  'suburb',
  'neighbourhood',
  'quarter',
  'borough',
  'city_district',
])
const CITY_VALUES = new Set(['city', 'town', 'municipality', 'village'])

type PhotonProperties = {
  name?: string
  osm_value?: string
  district?: string
  city?: string
  state?: string
  country?: string
}
type PhotonFeature = { properties?: PhotonProperties }

/**
 * Monta label legível: "Nome — contexto1, contexto2". Descarta partes de
 * contexto iguais ao nome (normalizadas) pra não repetir "São Paulo, São Paulo".
 */
function buildLabel(name: string, context: Array<string | undefined>): string {
  const seen = new Set([normalize(name)])
  const parts: string[] = []
  for (const c of context) {
    if (!c) continue
    const n = normalize(c)
    if (seen.has(n)) continue
    seen.add(n)
    parts.push(c)
  }
  return parts.length ? `${name} — ${parts.join(', ')}` : name
}

function toSuggestion(
  p: PhotonProperties,
  kind: 'neighborhood' | 'city'
): PlaceSuggestion {
  const name = p.name as string // garantido não-nulo pelo chamador
  const state = p.state ?? null
  if (kind === 'neighborhood') {
    return {
      label: buildLabel(name, [p.city, p.state ?? p.country]),
      neighborhood: name,
      city: p.city ?? null,
      state,
    }
  }
  return {
    label: buildLabel(name, [p.state ?? p.country]),
    neighborhood: null,
    city: name,
    state,
  }
}

/** Filtra por osm_value, dedupe por (name+state+country), máx 5. */
function processFeatures(
  features: PhotonFeature[],
  kind: 'neighborhood' | 'city'
): PlaceSuggestion[] {
  const allowed = kind === 'neighborhood' ? NEIGHBORHOOD_VALUES : CITY_VALUES
  const out: PlaceSuggestion[] = []
  const seen = new Set<string>()

  for (const f of features) {
    const p = f.properties
    if (!p || !p.name || !p.osm_value || !allowed.has(p.osm_value)) continue
    const key = normalize(`${p.name}|${p.state ?? ''}|${p.country ?? ''}`)
    if (seen.has(key)) continue
    seen.add(key)
    out.push(toSuggestion(p, kind))
    if (out.length >= 5) break
  }
  return out
}

/**
 * Autocomplete de bairro/cidade via Photon. `signal` externo cancela a busca
 * anterior a cada nova tecla; timeout interno de 4s. Erro/timeout/abort → [].
 * NUNCA lança — o autocomplete é enhancement, jamais gate.
 */
export async function searchPlaces(
  query: string,
  kind: 'neighborhood' | 'city',
  bias?: { lat: number; lng: number },
  signal?: AbortSignal
): Promise<PlaceSuggestion[]> {
  const q = query.trim()
  if (q.length === 0) return []

  const b = bias ?? SP_BIAS
  const url =
    `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}` +
    `&limit=15&lang=default&lat=${b.lat}&lon=${b.lng}`

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PHOTON_TIMEOUT_MS)
  const onExternalAbort = () => ctrl.abort()
  if (signal) {
    if (signal.aborted) ctrl.abort()
    else signal.addEventListener('abort', onExternalAbort, { once: true })
  }

  try {
    const res = await fetch(url, { signal: ctrl.signal })
    if (!res.ok) return []
    const data = (await res.json()) as { features?: PhotonFeature[] }
    return processFeatures(data.features ?? [], kind)
  } catch {
    return []
  } finally {
    clearTimeout(timer)
    if (signal) signal.removeEventListener('abort', onExternalAbort)
  }
}
