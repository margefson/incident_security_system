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
