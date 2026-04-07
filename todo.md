# Incident Security System - TODO

## Schema & Database
- [x] Tabela `users` com campos: id, openId, name, email, passwordHash, loginMethod, role, createdAt, updatedAt, lastSignedIn, isActive
- [x] Tabela `incidents` com campos: id, userId, title, description, category, riskLevel, confidence, createdAt, updatedAt
- [x] Executar `pnpm db:push` para migrar o schema

## Backend - Autenticação (bcryptjs)
- [x] Endpoint `auth.register` com validação Joi (nome, email, senha mínimo 8 chars)
- [x] Endpoint `auth.login` com bcrypt.compare e geração de cookie JWT
- [x] Endpoint `auth.me` retornando usuário autenticado
- [x] Endpoint `auth.logout` limpando cookie de sessão
- [x] Hash de senha com bcryptjs (saltRounds=12)

## Backend - Incidentes
- [x] Endpoint `incidents.create` (protectedProcedure) com validação Joi
- [x] Endpoint `incidents.list` retornando apenas incidentes do usuário autenticado
- [x] Endpoint `incidents.getById` com verificação de ownership
- [x] Endpoint `incidents.delete` com verificação de ownership
- [x] Endpoint `incidents.stats` com contagem por categoria

## Backend - Classificação ML
- [x] Script Python para treinar modelo TF-IDF + Naive Bayes com dataset de 100 incidentes
- [x] Salvar modelo treinado (vectorizer + classifier) em arquivo .pkl
- [x] Servidor Flask interno na porta 5001 para servir predições
- [x] Integração do backend Node.js com API Flask via HTTP interno
- [x] Cálculo de nível de risco baseado na categoria classificada
- [x] Importação do dataset incidentes_cybersecurity_100.xlsx

## Backend - Análise de Risco
- [x] Mapeamento de categorias para níveis de risco (critical, high, medium, low)
- [x] Endpoint `incidents.riskAnalysis` com estatísticas de risco por usuário

## Frontend - Tema Cyberpunk
- [x] Configurar CSS variables com paleta neon (rosa #FF006E, ciano #00F5FF, preto #0A0A0A)
- [x] Fonte geométrica sans-serif (Space Grotesk + JetBrains Mono via Google Fonts)
- [x] Efeitos de glow/neon nos elementos principais
- [x] Componente HUD com linhas técnicas e corner brackets
- [x] Animações neon-pulse

## Frontend - Páginas
- [x] Página de Login com estética cyberpunk
- [x] Página de Registro de usuário
- [x] Dashboard principal com estatísticas e gráficos
- [x] Página de listagem de incidentes com filtros por categoria
- [x] Formulário de novo incidente com preview da classificação
- [x] Página de detalhe do incidente com análise de risco
- [x] Página de análise de risco geral

## Frontend - Componentes
- [x] CyberLayout com sidebar cyberpunk
- [x] Componente de card de incidente com badge de categoria colorido
- [x] Componente de gráfico de barras (recharts) com cores neon
- [x] Componente de badge de risco com cores semânticas
- [x] Componente de loading com animação cyberpunk

## Testes
- [x] Teste de autenticação (register + login)
- [x] Teste de criação de incidente
- [x] Teste de controle de acesso (usuário não vê incidentes de outros)
- [x] Teste de classificação automática
- [x] 18 testes passando (2 arquivos de teste)

## Deploy
- [x] Checkpoint final salvo
- [x] Código publicado no GitHub

## Remoção de Referências "Manus"
- [x] Remover todas as referências a "Manus" no código-fonte, testes e configurações
- [x] Reexecutar 18 testes e garantir 100% de aprovação
- [x] Atualizar Manual do Usuário (PDF)
- [x] Atualizar Manual de Implantação (PDF)
- [x] Atualizar README.md
- [x] Commitar no GitHub

## Novas Funcionalidades (Fase 2)
- [x] Painel de administração (/admin) com listagem global e reclassificação manual
- [x] Exportação de relatórios em PDF via tRPC (incidents.exportPdf)
- [x] Notificações automáticas de risco crítico (notifyOwner)
- [x] Modernização do frontend (visual clássico + moderno)
- [x] Novos testes Vitest para admin, exportação e notificações
- [x] Atualizar README.md com novas funcionalidades
- [x] Atualizar Manual do Usuário (PDF)
- [x] Atualizar Manual de Implantação (PDF)
- [x] Commit final no GitHub

## Divisão de Atividades do Grupo
- [x] Adicionar divisão de atividades no README.md
- [x] Adicionar divisão de atividades no Manual do Usuário
- [x] Adicionar divisão de atividades no Manual de Implantação
- [x] Gerar PDFs atualizados
- [x] Commitar no GitHub

## Validação Robusta de Senha (Signup)
- [x] Atualizar schema Joi: mín. 8, máx. 128 chars, minúscula, maiúscula, número, especial
- [x] Adicionar feedback visual em tempo real no formulário de registro (checklist de critérios)
- [x] Adicionar casos de teste para todas as regras de senha (22 novos testes, total 50)
- [x] Atualizar README.md com as regras de validação
- [x] Atualizar Manual do Usuário com as regras de validação
- [x] Atualizar Manual de Implantação com as regras de validação
- [x] Gerar PDFs atualizados
- [x] Commitar no GitHub

## Requisitos de Segurança Obrigatórios (6.1–6.8)
- [x] 6.1 Gerenciamento de segredos: verificar que nenhum segredo está hardcoded; documentar .env
- [x] 6.2 Hash de senha: confirmar bcrypt saltRounds=12, nunca texto puro
- [x] 6.3 Sessão segura: cookie httpOnly=true, secure=true em produção, sameSite="lax", saveUninitialized=false
- [x] 6.4 IDOR: retornar 404 (não 403) quando incidente não pertence ao usuário autenticado
- [x] 6.5 Rate limiting: 100 req/IP/15min global; 10 req/IP/15min em /api/trpc/auth.*
- [x] 6.6 CORS: aceitar apenas origem do frontend via variável de ambiente, com credentials
- [x] 6.7 Helmet: remover X-Powered-By, ativar X-Content-Type-Options e Strict-Transport-Security
- [x] 6.8 Timing attack: bcrypt.compare executado sempre no login, mesmo quando e-mail não existe
- [x] Testes Vitest individuais para cada requisito (6.1–6.8) — 34 testes no security.test.ts
- [x] Atualizar README com seção de segurança detalhada
- [x] Atualizar Manual do Usuário com requisitos de segurança
- [x] Atualizar Manual de Implantação com requisitos de segurança
- [x] Gerar PDFs atualizados
- [x] Commitar no GitHub

## Redesign Frontend SOC Portal (Clean/Professional)
- [x] Redesenhar CSS global: paleta SOC Portal (fundo #0d1117, verde #00ff88, texto #e6edf3)
- [x] Redesenhar CyberLayout: sidebar compacta com ícones, breadcrumb, indicador LIVE
- [x] Redesenhar Home/Landing page: estilo SOC Portal profissional
- [x] Redesenhar Login: formulário clean dark com logo SOC
- [x] Redesenhar Register: formulário clean dark com checklist de senha
- [x] Redesenhar Dashboard: cards KPI, tabela de incidentes recentes, gráfico de distribuição
- [x] Redesenhar Incidents: tabela operacional com badges de severidade e status
- [x] Redesenhar NewIncident: formulário clean com preview de classificação
- [x] Redesenhar IncidentDetail: layout de detalhe com seções organizadas
- [x] Redesenhar RiskAnalysis: gráficos e métricas de risco clean
- [x] Redesenhar Admin: painel administrativo com tabelas e controles
- [x] Atualizar ExportPdfButton: estilo SOC Portal
- [x] Executar 114 testes e garantir 100% passando
- [x] Adicionar testes de UI/comportamento para o novo design (tests/ui.test.ts)
- [x] Atualizar README com novo design SOC Portal
- [x] Atualizar manuais PDF com novo design SOC Portal
- [x] Commitar no GitHub

## Redesign Frontend (Estilo v2x_security_system) + CRUD de Categorias
- [ ] Reverter CSS global para o tema do v2x_security_system (OKLCH dark theme, fontes Inter+JetBrains Mono)
- [ ] Adaptar DashboardLayout para o estilo v2x (sidebar com SidebarProvider, ícones, font-mono)
- [ ] Redesenhar Login no estilo v2x (card dark, ícone Shield, blur decorativo)
- [ ] Redesenhar Register no estilo v2x (card dark, ícone Shield)
- [ ] Redesenhar Dashboard no estilo v2x (StatCards, gráficos AreaChart/PieChart, eventos recentes)
- [ ] Redesenhar Incidents no estilo v2x (tabela operacional, badges coloridos)
- [ ] Redesenhar NewIncident no estilo v2x (formulário clean)
- [ ] Redesenhar IncidentDetail no estilo v2x
- [ ] Redesenhar RiskAnalysis no estilo v2x
- [ ] Redesenhar Admin no estilo v2x
- [ ] Atualizar index.html com fontes Google (Inter + JetBrains Mono)
- [ ] Schema: adicionar tabela `categories` (id, name, description, isActive, createdAt, updatedAt)
- [ ] Backend: procedures categories.list, categories.create, categories.update, categories.delete (adminProcedure)
- [ ] Backend: seed das 5 categorias padrão (Phishing, Malware, Força Bruta, DDoS, Vazamento)
- [ ] Frontend: página Categories.tsx (CRUD admin) com listagem, criação, edição e exclusão
- [ ] Frontend: rota /admin/categories protegida por role admin
- [ ] Frontend: usar categorias dinâmicas no formulário NewIncident (select com categorias do banco)
- [ ] Testes: casos de teste individuais para CRUD de categorias (create, list, update, delete, acesso negado para user)
- [ ] Atualizar README com CRUD de categorias
- [ ] Atualizar Manual do Usuário com CRUD de categorias
- [ ] Atualizar Manual de Implantação com CRUD de categorias
- [x] Gerar PDFs atualizados
- [x] Commitar no GitHub

## Redesign Frontend (Estilo v2x_security_system)
- [x] Reverter CSS global para tema dark OKLCH (Inter + JetBrains Mono)
- [x] Reescrever Login.tsx no estilo v2x
- [x] Reescrever Register.tsx com checklist de senha
- [x] Reescrever DashboardLayout.tsx com sidebar SidebarProvider
- [x] Reescrever Dashboard.tsx com cards e gráficos
- [x] Reescrever Incidents.tsx com tabela soc-table
- [x] Reescrever RiskAnalysis.tsx com RISK_CONFIG e RISK_BADGE
- [x] Reescrever IncidentDetail.tsx
- [x] Reescrever NewIncident.tsx
- [x] Reescrever Admin.tsx
- [x] Adicionar classes soc-* ao index.css (design system)

## CRUD de Categorias (Admin Only)
- [x] Adicionar tabela categories ao schema Drizzle
- [x] Rodar migração pnpm db:push
- [x] Adicionar helpers CRUD ao server/db.ts
- [x] Adicionar categoriesRouter ao server/routers.ts (RBAC admin)
- [x] Criar página AdminCategories.tsx
- [x] Adicionar rota /admin/categories no App.tsx
- [x] Popular banco com 5 categorias padrão (seed)
- [x] Criar server/categories.test.ts (21 testes)
- [x] Todos os 135 testes passando

## Manuais e README
- [x] Atualizar README.md (135 testes, CRUD categorias)
- [x] Atualizar manual_usuario.md (seção 13.6 categorias)
- [x] Atualizar manual_implantacao.md (135 testes, categories.test.ts)
- [x] Gerar PDFs atualizados

## Recomendações de Segurança Contextualizadas (Seção 7.5)
- [x] Verificar estado atual das recomendações no RiskAnalysis.tsx e IncidentDetail.tsx
- [x] Backend: procedure incidents.recommendations retornando recomendações por categoria
- [x] Frontend RiskAnalysis: exibir recomendações contextualizadas por categoria ativa
- [x] Frontend IncidentDetail: exibir recomendação específica da categoria do incidente
- [x] Recomendação Malware: verificar isolamento de sistemas comprometidos
- [x] Recomendação Vazamento: notificar DPO e avaliar obrigações LGPD
- [x] Recomendação Phishing: reforçar treinamento de conscientização
- [x] Recomendação Força Bruta: implementar bloqueio automático após falhas de login
- [x] Recomendação DDoS: revisar configurações de rate limiting e CDN
- [x] Testes individuais para cada recomendação por categoria
- [x] Atualizar README com seção 7.5
- [x] Atualizar Manual do Usuário com seção 7.5
- [x] Atualizar Manual de Implantação com seção 7.5
- [x] Gerar PDFs atualizados
- [x] Commitar no GitHub

## Correções de Bugs e Funcionalidades Avançadas (Fase Final)
- [x] Bug: Rota /profile 404 — criar página Profile.tsx e registrar no App.tsx
- [x] Bug: Label "Seção 8 —" no AdminML — verificado: label visível já está correto ("Machine Learning")
- [x] Filtros avançados na listagem de incidentes: categoria, risco, data inicial, data final
- [x] Contador de filtros ativos com botão de limpeza rápida
- [x] Exportação CSV dos incidentes filtrados (BOM UTF-8, aspas escapadas, labels legíveis)
- [x] Relatório consolidado no painel admin (ExportPdfButton com adminMode=true)
- [x] Painel Admin: adicionar card de Machine Learning e stats globais (total, usuários, críticos, categorias)
- [x] Testes: advanced_features.test.ts com 33 testes (AF-1 a AF-5)
- [x] Total de testes: 233 passando em 7 arquivos
- [x] README.md atualizado (badge 233 testes, filtros avançados, perfil, CSV)
- [x] Manual do usuário atualizado (seção 5.3 filtros avançados, seção 5.4 CSV)
- [x] PDFs dos manuais regenerados
- [x] Checkpoint final e commit no GitHub
