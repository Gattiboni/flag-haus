# Decision Log – Flag Haus / Julio Bandeiras
Versão inicial – 08/12/2025

Este documento registra decisões técnicas, operacionais e estratégicas do projeto, seguindo o formato padrão de entradas numeradas.
Cada entrada contém: **Decisão, Contexto, Motivos e Impacto**.

---

## 001 — 2025-12-08  
### Decisão: Adoção do WordPress como Plataforma Oficial do Site
**Contexto**  
Foram avaliadas alternativas: Squarespace, Wix, builders visuais e stack custom. O projeto demanda escalabilidade, SEO técnico sólido, integrações futuras com CRM e automações.

**Motivos**  
- Maior flexibilidade para crescer no longo prazo.  
- Suporte maduro para SEO, blog e integrações.  
- Liberdade para customização de tema e automações futuras.  
- Ecossistema modular consistente.

**Impacto**  
- WordPress define toda a base do projeto.  
- Documentação técnica (stack) orientada a WP.  
- Facilita CRM leve, agendamentos, blog e automações.

---

## 002 — 2025-12-08  
### Decisão: Definição das Páginas MUST HAVE, NICE TO HAVE e FOR LATER
**Contexto**  
Necessidade de estabilizar a arquitetura inicial do site antes de wireframes, conteúdo e implementação.

**Motivos**  
Criar um escopo claro que permita construção incremental.

**Impacto**  
Base da arquitetura e backlog futuro estabilizados.

**MUST HAVE**  
- Home  
- Sobre  
- Serviços  
- Agendamento  
- Blog  
- Post Individual  
- Contato  
- Políticas (Privacidade + Termos)

**NICE TO HAVE**  
- Serviços detalhados  
- Depoimentos  
- FAQ  
- Landing Pages  
- Press

**FOR LATER**  
- Área do Cliente  
- Loja  
- Recursos Avançados  
- Dashboard interno  
- Formulários Inteligentes

---

## 003 — 2025-12-08  
### Decisão: Embedding do Instagram na Home
**Contexto**  
O branding requer movimento, presença e frescor constante. A Home é o espaço mais lógico.

**Motivos**  
- Reforçar presença digital.  
- Integrar conteúdo recorrente ao SEO.  
- Permitir modularidade do layout.

**Impacto**  
Plugins definidos para avaliação: Smash Balloon ou Spotlight.

---

## 004 — 2025-12-08  
### Decisão: Manter Página de Contato no Cabeçalho
**Contexto**  
Mesmo com redundância no rodapé, decisões de UX priorizam acesso rápido.

**Motivos**  
Reduz atrito de conversão e melhora experiência.

**Impacto**  
Contato é item fixo do menu principal.

---

## 005 — 2025-12-08  
### Decisão: Políticas Como Links no Rodapé
**Contexto**  
Evitar poluição visual e manter conformidade legal.  

**Motivos**  
Fica mais limpo, mais padrão e mais acessível.

**Impacto**  
Rodapé concentra informações institucionais essenciais.

---

## 006 — 2025-12-08  
### Decisão: CRM Leve Interno via WordPress (FluentCRM ou Jetpack)
**Contexto**  
O projeto precisa capturar leads, tags, e armazenar contatos básicos para automações futuras.

**Motivos**  
- Leve, direto e já integrado ao WordPress.  
- Evita stacks desnecessárias neste momento.  
- Integra naturalmente com formulários e agendamento.

**Impacto**  
Supabase fica reservado para etapas avançadas.

---

## 007 — 2025-12-08  
### Decisão: Agendamentos via Plugin WP (Amelia / Bookly / Calendly)
**Contexto**  
O site precisa permitir marcações reais, registrar informações e enviar dados para CRM.

**Motivos**  
WordPress tem plugins sólidos que resolvem tudo sem stack externa.

**Impacto**  
Agendamento vira pilar funcional desde o lançamento.

---

## 008 — 2025-12-08  
### Decisão: Padronizar Segurança Mínima (Firewall, 2FA, Backup e Limite de Login)
**Contexto**  
WordPress é alvo de robôs 24/7 e precisa de proteção mesmo sem usuários externos.

**Motivos**  
- Evitar invasão do painel admin.  
- Proteger CRM e agendamentos.  
- Garantir integridade dos dados.

**Impacto**  
Camada de segurança ativa desde a etapa de testes.

---

## 009 — 2025-12-08  
### Decisão: Uso do Metabase como Ferramenta Oficial de Dashboards
**Contexto**  
O Looker foi rejeitado por limitações irritantes e decisões de design absurdas.

**Motivos**  
- Metabase é flexível, amigável e escalável.  
- Permite embed direto no site WordPress.  
- Opera bem com GA4, Meta e CRM.

**Impacto**  
Stack de observabilidade definida para médio prazo.

---

## 010 — 2025-12-08  
### Decisão: Estrutura Geral da Stack (Stack.md)
**Contexto**  
Criar documento único que consolida decisões técnicas.  

**Motivos**  
- Evitar perda de contexto.  
- Padronizar evolução do projeto.  
- Facilitar onboarding futuro.

**Impacto**  
Arquivo `stack.md` criado e vinculado ao repositório.

---

## 011 — 2025-12-08  
### Decisão: Roadmap Técnico em 7 etapas
**Contexto**  
O site precisa se desenvolver incrementalmente sem perder coerência.

**Motivos**  
Definir trajetória realista entre MVP e maturidade.

**Impacto**  
Roadmap oficial: 1) MVP, 2) Landing pages, 3) Área do cliente, 4) Automações, 5) Supabase, 6) Dashboard, 7) Loja.

---

## 012 — 2025-12-08  
### Decisão: Embedding do Instagram como parte da estratégia de SEO
**Contexto**  
Os posts servirão como extensão do blog para reforçar presença e conteúdo indexável.

**Motivos**  
- Atualização orgânica de conteúdo  
- Aproveitamento de copies existentes  
- Sinergia com imagem FH

**Impacto**  
Home terá seção dinâmica alimentada pelo Instagram.

---

*(Novas entradas devem seguir este mesmo formato.)*

