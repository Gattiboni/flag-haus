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
