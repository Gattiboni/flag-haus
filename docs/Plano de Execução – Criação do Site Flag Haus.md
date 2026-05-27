# Plano de Execução – Criação do Site Flag Haus  
Versão 1 – Checklist Cronológico  
Baseado em: tarefas macro + estrutura do arquivo anexo

---

# 1. Arquitetura da Informação  
(Definição da estrutura, páginas, navegação e prioridades)

**Contexto:**  
Esta fase define o esqueleto do site. É onde as decisões estruturais são tomadas para evitar retrabalhos durante o layout e o desenvolvimento.

## ✔️ Tarefas
- [X] 1.1 Criar lista final de páginas MUST HAVE, NICE TO HAVE e FOR LATER  
- [X] 1.2 Definir hierarquia de navegação (menu principal, submenus, footer)  
- [X] 1.3 Criar mapa de URLs inicial  
- [X] 1.4 Definir comportamento de navegação mobile  
- [X] 1.5 Criar documento de arquitetura no repositório (`docs/arquitetura.md`)  
- [X] 1.6 Registrar requisitos funcionais básicos (agendamento, blog, feed IG, CRM leve)

---

# 2. Wireframe e Layout  
(Protótipo visual, estrutura da interface e elementos do branding FH)

**Contexto:**  
Aqui entram organização visual, identidade FH, uso de espaços vazios, paleta, tipografia e estrutura modular dos blocos.

## ✔️ Tarefas
- [ ] 2.1 Criar wireframe da Home  
- [ ] 2.2 Criar wireframe das páginas MUST HAVE: Sobre, Serviços, Agendamento, Blog, Post Individual, Contato  
- [ ] 2.3 Criar wireframe do Footer  
- [ ] 2.4 Criar wireframe do Header (desktop e mobile)  
- [ ] 2.5 Criar variantes de wireframe para páginas NICE TO HAVE  
- [ ] 2.6 Criar moodboard visual no repositório (`/design/`)  
- [ ] 2.7 Definir diretrizes de componentes (blocos, cartões, seções, espaçamentos)

---

# 3. Criação de Conteúdo e Copy  
(Escrita da narrativa de marca, textos das páginas e estrutura do blog)

**Contexto:**  
Os textos devem refletir o branding FH: gesto, estrutura, presença. O conteúdo precisa ser conciso e preparado para SEO.

## ✔️ Tarefas
- [ ] 3.1 Redigir copy da Home  
- [ ] 3.2 Redigir Manifesto / Sobre  
- [ ] 3.3 Escrever descrições dos Serviços  
- [ ] 3.4 Redigir texto da página de Agendamento  
- [ ] 3.5 Criar texto e layout base para Blog e Posts  
- [ ] 3.6 Criar texto da página Contato  
- [ ] 3.7 Criar políticas legais (Privacidade e Termos)  
- [ ] 3.8 Criar documentação de estilo editorial (`docs/copy-style.md`)

---

# 4. Implementação do Front-End  
(Criação do tema WordPress ou setup de tema base + customizações)

**Contexto:**  
Aqui o site toma forma. É a transposição dos wireframes para código/tema, respeitando o branding e garantindo modularidade.

## ✔️ Tarefas
- [X] 4.1 Configurar ambiente WordPress no servidor  
- [X] 4.2 Instalar tema base (Astra, GeneratePress, Kadence ou similar)  
- [ ] 4.3 Configurar tema filho (`/wp-content/themes/flag-haus-child`)  
- [ ] 4.4 Implementar Header + navegação  
- [ ] 4.5 Implementar Footer completo  
- [ ] 4.6 Construir Home com placeholders  
- [ ] 4.7 Construir páginas MUST HAVE  
- [ ] 4.8 Implementar responsividade mobile  
- [ ] 4.9 Criar página 404 customizada  
- [ ] 4.10 Criar estrutura de landing pages reutilizáveis

---

# 5. Integração com CMS  
(Funções internas, plugins essenciais, CRM leve, blog e automações iniciais)

**Contexto:**  
É aqui que WordPress vira ferramenta, não só estética. Ajustes de fluxo, automações mínimas e preparação para futuro CRM.

## ✔️ Tarefas
- [ ] 5.1 Instalar e configurar plugin de agendamento (Amelia, Bookly ou Calendly embed)  
- [ ] 5.2 Configurar CRM leve (FluentCRM ou Jetpack CRM)  
- [ ] 5.3 Integrar formulários com CRM  
- [ ] 5.4 Configurar Blog (categorias, tags, estrutura de archive e single)  
- [ ] 5.5 Implementar embedding do Instagram na Home  
- [ ] 5.6 Configurar coleta de leads (formulários)  
- [ ] 5.7 Criar backup automático  
- [ ] 5.8 Registrar documentação do CMS (`docs/cms.md`)

---

# 6. Configuração de SEO Técnico  
(Infraestrutura para indexação, velocidade, rastreabilidade e governança)

**Contexto:**  
Essa fase sustenta visibilidade e performance no Google. É base obrigatória.

## ✔️ Tarefas
- [ ] 6.1 Instalar plugin de SEO (Yoast, RankMath ou SEOPress)  
- [ ] 6.2 Configurar titles, metas e schema padrão  
- [ ] 6.3 Criar e enviar sitemap  
- [ ] 6.4 Configurar robots.txt  
- [ ] 6.5 Configurar Search Console  
- [ ] 6.6 Configurar Google Analytics (GA4)  
- [ ] 6.7 Instalar Pixel do Meta  
- [ ] 6.8 Otimizar velocidade (cache + imagem)  
- [ ] 6.9 Configurar LGPD (banner e consentimento)

---

# 7. Testes e Ajustes  
(QA final, comportamento real, revisões e resolução de inconsistências)

**Contexto:**  
Garantia de que o site funciona como um adulto e não como um estagiário com sono.

## ✔️ Tarefas
- [ ] 7.1 Testar responsividade em múltiplos dispositivos  
- [ ] 7.2 Testar formulários e CRM  
- [ ] 7.3 Testar agendamentos (fluxo completo)  
- [ ] 7.4 Verificar links internos/externos  
- [ ] 7.5 Validar SEO (Search Console + Lighthouse)  
- [ ] 7.6 Ajustar performance (cache, compressão, lazy load)  
- [ ] 7.7 Revisar microcopy e consistência visual  
- [ ] 7.8 Criar checklist final de lançamento (`docs/launch-checklist.md`)

---

# 8. Lançamento do Site  
(Transição para público, ativação de monitoramento e observação inicial)

**Contexto:**  
Etapa final e início da vida real do site.

## ✔️ Tarefas
- [ ] 8.1 Fazer última revisão geral  
- [ ] 8.2 Tirar o site do modo manutenção  
- [ ] 8.3 Validar indexação inicial  
- [ ] 8.4 Publicar anúncio interno/externo do lançamento  
- [ ] 8.5 Ativar dashboard de métricas (Google + Meta)  
- [ ] 8.6 Criar plano de manutenção contínua (`docs/maintenance.md`)

---

Fim da versão 1.  
