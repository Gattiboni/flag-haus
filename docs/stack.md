# STACK – Flag Haus / Julio Bandeiras

Versão 1.0

08/12/2025
Documento base de arquitetura + decisões técnicas

---

# 1. Princípios da Stack

- Simplicidade primeiro: evitar soluções superdimensionadas enquanto o projeto é pequeno.
- Modularidade: cada camada do sistema deve ser substituível sem quebrar o site inteiro.
- Incrementalidade: estrutura pensada para crescer ao longo do tempo.
- Baixa dependência de código custom inicialmente.
- Respeito ao branding FH.

---

# 2. Infraestrutura

## 2.1 Hospedagem

- Servidor padrão WordPress (LiteSpeed ou Apache)
- Suporte a PHP 8.x
- Banco de dados MySQL/MariaDB
- Acesso SSH opcional

## 2.2 Domínio

- DNS apontado para servidor
- Subpastas e subdomínios conforme necessidade

## 2.3 Repositório

- GitHub: [https://github.com/Gattiboni/flag-haus](https://github.com/Gattiboni/flag-haus)
- Estrutura básica sugerida (a do front quem dita é o template do wordpress):

```
/docs  
/design  

```

---

# 3. WordPress

## 3.1 Configuração base

- WordPress atualizado
- Tema base: Astra, GeneratePress ou Kadence
- Tema filho: flag-haus-child

## 3.2 Plugins essenciais

### SEO

- RankMath ou Yoast

### Performance

- LiteSpeed Cache (ou WP Rocket)

### Segurança

- Wordfence ou Solid Security

### Formulários

- Fluent Forms ou WPForms Lite

### CRM leve

- FluentCRM ou Jetpack CRM

### Agendamento

- Amelia, Bookly ou Calendly embed

### Mídias

- Smash Balloon Instagram Feed

### Utilidades

- Redirection
- Simple Custom CSS/JS
- UpdraftPlus ou equivalente

---

# 4. Estrutura de Páginas

- MUST HAVE: Home, Sobre, Serviços, Agendamento, Blog, Post, Contato, Políticas
- NICE TO HAVE: Serviços detalhados, Depoimentos, FAQ, Landing Pages, Press
- FOR LATER: Área do cliente, Loja, Recursos Avançados, Dashboards, Formulários inteligentes

---

# 5. Front-End

## 5.1 Tecnologia

- HTML + CSS do tema
- Customizações no tema filho
- Gutenberg como editor
- Kadence Blocks / GenerateBlocks se necessário

## 5.2 Responsividade

- Mobile-first
- Breakpoints sugeridos: 360px, 768px, 1024px, 1440px

## 5.3 Branding aplicado

- Paleta oficial
- Neue Einstellung (títulos)
- Lato (textos)
- Uso de espaços vazios
- Grid modular

---

# 6. Conteúdo e SEO

## 6.1 Blog

- Estrutura de categorias e tags
- Template otimizado
- Estratégia inicial: conteúdos nativos + embedding do Instagram

## 6.2 SEO técnico

- Sitemap XML
- Robots.txt
- Schema automático
- Titles + descrições
- LGPD ativa

---

# 7. Integrações Externas

## 7.1 Google

- GA4
- Search Console
- Tag Manager (opcional)

## 7.2 Meta

- Meta Pixel
- Conversões via GTM

## 7.3 Automação

- Make, Zapier ou n8n
- Conexão com CRM

---

# 8. CRM e Dados

## 8.1 CRM inicial

- FluentCRM
- Captação via formulários

## 8.2 Captação de leads

- Formulários integrados ao CRM
- Tagging básico

## 8.3 Supabase (futuro)

- Dashboards customizados
- API própria
- Armazenamento avançado

---

# 9. Segurança e Governança

- Firewall
- 2FA
- Limite de tentativas de login
- Backup automático
- Controle de permissões
- Atualizações programadas

---

# 10. Observabilidade e Dashboards

- Metabase
- Fontes: GA4, Meta, CRM
- Indicadores iniciais: visitas, conversão, origem do tráfego, posts mais vistos, crescimento de leads

---

# 11. Roadmap de Evolução Técnica

1. Lançamento com CRM leve + blog + agendamentos
2. Landing pages para tráfego pago
3. Área do cliente
4. Automações internas (zapier/n8n/Make)
5. Supabase
6. Dashboard unificado
7. Loja e produtos digitais

