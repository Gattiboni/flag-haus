/**
 * Versão do texto de consentimento aceito no `/antes-da-sessao`.
 *
 * Gravada em `consents.policy_version` a cada consentimento coletado — é a prova
 * de qual texto o titular leu. O texto congelado está em
 * `docs/legal/consentimento_anamnese_v1.md`.
 *
 * Fonte única: nenhum literal de versão espalhado pelo código. Se o texto mudar,
 * cria-se `consentimento_anamnese_v2.md` e atualiza-se SÓ esta constante.
 */
export const POLICY_VERSION_ANAMNESE = 'anamnese-v1-2026-07'

/**
 * Versão do texto de consentimento aceito no `/cadastro` (só `lgpd` e
 * `marketing` — o cadastro não coleta dado de saúde).
 *
 * Mesmo papel da constante acima: gravada em `consents.policy_version`, é a
 * prova de qual texto o titular leu. O texto congelado está em
 * `docs/legal/consentimento_cadastro_v1.md`.
 *
 * O valor precisa bater byte a byte com o default do `coalesce` na RPC
 * `submit_cadastro` — que gravou essa mesma versão nos consents coletados antes
 * de o app passar a enviá-la. Divergir aqui criaria uma segunda versão fantasma
 * para o mesmo texto.
 */
export const POLICY_VERSION_CADASTRO = 'cadastro-v1-2026-07'
