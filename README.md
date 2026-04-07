# INCIDENT_SYS — Sistema Web Seguro para Registro e Classificação de Incidentes de Segurança

![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)
![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)
![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)
![MySQL](https://img.shields.io/badge/MySQL-8.x-4479A1?style=flat-square&logo=mysql)
![ML Accuracy](https://img.shields.io/badge/ML%20Accuracy-97%25-brightgreen?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-135%20passing-brightgreen?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)

Plataforma de gerenciamento de incidentes de segurança cibernética com classificação automática por Machine Learning (TF-IDF + Naive Bayes), painel de administração global, **CRUD de categorias de incidentes (exclusivo para administradores)**, exportação de relatórios em PDF, notificações automáticas de risco crítico e interface SOC Portal — design profissional dark com tipografia Inter, sidebar compacta, badges coloridos por severidade e tabelas operacionais.

---

## Sumário

- [Visão Geral](#visão-geral)
- [Arquitetura](#arquitetura)
- [Stack Tecnológica](#stack-tecnológica)
- [Funcionalidades](#funcionalidades)
- [Modelo de Machine Learning](#modelo-de-machine-learning)
- [Estrutura de Diretórios](#estrutura-de-diretórios)
- [Como Rodar Localmente](#como-rodar-localmente)
- [Variáveis de Ambiente](#variáveis-de-ambiente)
- [Scripts Disponíveis](#scripts-disponíveis)
- [Referência de API tRPC](#referência-de-api-trpc)
- [Segurança](#segurança)
- [Testes](#testes)
- [Solução de Problemas](#solução-de-problemas)
- [Equipe](#equipe)

---

## Visão Geral

O **INCIDENT_SYS** é uma aplicação web full-stack que permite que equipes de segurança registrem, classifiquem e analisem incidentes cibernéticos de forma estruturada. Cada incidente é automaticamente classificado em uma das cinco categorias de ameaça por um modelo de ML treinado com um dataset real de 100 amostras, recebendo também um score de risco calculado automaticamente.

O sistema opera com três servidores independentes: um servidor Node.js/Express que expõe a API tRPC e serve o frontend React, um servidor Flask em Python que hospeda o modelo de classificação (porta 5001), e um segundo servidor Flask para geração de relatórios PDF (porta 5002).

---

## Arquitetura

```
┌─────────────────────────────────────────────────────────────────┐
│                        NAVEGADOR (React 19)                     │
│  Vite + TailwindCSS 4 + shadcn/ui + Recharts + Wouter           │
│  Design SOC Portal · Inter + JetBrains Mono · Dark Professional  │
└────────────────────────┬────────────────────────────────────────┘
                         │ tRPC (HTTP + superjson)
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│           SERVIDOR NODE.JS — Express 4 + tRPC 11 (porta 3000)   │
│                                                                  │
│  authRouter       incidentsRouter    adminRouter                 │
│  ─ register       ─ create           ─ listIncidents (global)   │
│  ─ login          ─ list             ─ reclassify               │
│  ─ logout         ─ getById          ─ listUsers                │
│  ─ me             ─ delete           ─ updateUserRole           │
│                   ─ stats            ─ stats (global)           │
│                                                                  │
│  reportsRouter                                                   │
│  ─ exportPdf (usuário + admin mode, filtros por categoria)       │
│                                                                  │
│  Validação: Joi · Auth: bcryptjs + JWT · ORM: Drizzle           │
└──────────┬──────────────────────┬───────────────────────────────┘
           │ Drizzle ORM          │ HTTP POST interno
           ▼                      ├──► localhost:5001 (classificador)
┌──────────────────────┐          └──► localhost:5002 (gerador PDF)
│  MySQL / TiDB        │
│  Tabelas:            │  ┌───────────────────────────────────────┐
│  · users             │  │  SERVIDORES FLASK (Python 3.11)       │
│  · incidents         │  │                                       │
│                      │  │  Porta 5001 — Classificador ML        │
│  Campos críticos:    │  │  TF-IDF + Multinomial Naive Bayes     │
│  · passwordHash      │  │  Acurácia CV 5-fold: 97%              │
│  · category (enum)   │  │                                       │
│  · riskLevel (enum)  │  │  Porta 5002 — Gerador de PDF          │
│  · confidence        │  │  ReportLab · Tema cyberpunk           │
└──────────────────────┘  └───────────────────────────────────────┘
```

### Fluxo de Classificação de um Incidente

```
Usuário preenche título + descrição
        │
        ▼
Node.js recebe via tRPC incidents.create
        │
        ├─► POST http://localhost:5001/classify
        │       { "text": "título + descrição" }
        │       ◄── { "category": "malware", "confidence": 0.97 }
        │
        ├─► Mapeia categoria → riskLevel (critical/high/medium/low)
        │
        ├─► Persiste no MySQL (tabela incidents)
        │
        ├─► Se riskLevel === "critical" → notifyOwner() [alerta ao admin]
        │
        └─► Retorna incidente classificado ao frontend
```

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Função |
|---|---|---|
| React | 19.x | Interface de usuário |
| Vite | 7.x | Build tool e dev server |
| TypeScript | 5.9 | Tipagem estática |
| TailwindCSS | 4.x | Estilização utilitária |
| shadcn/ui | latest | Componentes acessíveis |
| Recharts | 2.x | Gráficos e visualizações |
| Wouter | 3.x | Roteamento client-side |
| tRPC Client | 11.x | Chamadas à API tipadas |
| Inter | Google Fonts | Tipografia profissional SOC Portal |
| JetBrains Mono | Google Fonts | Tipografia monospace |

### Backend

| Tecnologia | Versão | Função |
|---|---|---|
| Node.js | 22.x | Runtime JavaScript |
| Express | 4.x | Servidor HTTP |
| tRPC | 11.x | API type-safe |
| Drizzle ORM | 0.44.x | Queries e migrações |
| MySQL2 | 3.x | Driver do banco de dados |
| bcryptjs | 2.x | Hash de senhas |
| jose | 6.x | JWT (sessões) |
| Joi | 17.x | Validação de entrada |
| Zod | 4.x | Validação de schema tRPC |

### Machine Learning e Relatórios

| Tecnologia | Versão | Função |
|---|---|---|
| Python | 3.11 | Runtime ML e PDF |
| Flask | 3.x | Servidor de API interna |
| scikit-learn | 1.x | TF-IDF + Naive Bayes |
| joblib | 1.x | Serialização do modelo |
| ReportLab | 4.x | Geração de PDF |
| openpyxl | 3.x | Leitura do dataset Excel |

---

## Funcionalidades

### Autenticação e Segurança
- Registro de usuários com validação de e-mail e senha com regras robustas:
  - Mínimo de 8 caracteres, máximo de 128
  - Pelo menos uma letra minúscula, uma maiúscula, um número e um caractere especial
  - Checklist visual em tempo real com barra de força (Muito Fraca / Fraca / Média / Forte)
  - Botão de submissão bloqueado até todos os critérios serem atendidos
- Login com hash bcrypt (custo 12) e sessão JWT HttpOnly
- Controle de acesso por usuário: cada usuário vê apenas seus próprios incidentes
- Controle de acesso por papel (role): `user` e `admin`
- Proteção de todas as rotas sensíveis via `protectedProcedure`

### Registro de Incidentes
- Formulário com campos título (3–255 caracteres) e descrição (10–5000 caracteres)
- Validação dupla: Joi no servidor + verificação client-side
- Preview de classificação em tempo real baseado em palavras-chave
- Classificação automática pelo modelo ML ao submeter

### Classificação por Machine Learning
- Modelo TF-IDF + Naive Bayes treinado com 100 amostras reais
- Acurácia de 97% em cross-validation 5-fold
- 5 categorias: Phishing, Malware, Força Bruta, DDoS, Vazamento de Dados
- Score de confiança retornado junto com a classificação
- Fallback por palavras-chave caso o serviço ML esteja indisponível

### Dashboard e Visualizações
- KPIs: total de incidentes, risco crítico, alto risco, precisão do modelo
- Gráfico de barras: incidentes por categoria
- Gráfico de pizza: distribuição por nível de risco
- Lista de incidentes recentes com indicador visual de risco
- Botão de exportação PDF integrado ao dashboard

### Listagem e Filtros
- Listagem paginada dos incidentes do usuário autenticado
- Filtros por categoria e nível de risco
- Busca por texto no título
- Ordenação por data (mais recente primeiro)
- Exportação PDF com filtros aplicados

### Detalhe do Incidente
- Visualização completa com metadados, categoria e risco
- Descrição da categoria e do nível de risco
- Score de confiança do modelo ML
- Análise de risco com recomendações específicas
- Opção de exclusão do incidente

### Análise de Risco
- Score de risco global calculado por ponderação (crítico=4, alto=3, médio=2, baixo=1)
- Gráfico de barras por nível de risco
- Recomendações automáticas baseadas nos incidentes registrados
- Alertas LGPD para vazamentos de dados

### Painel de Administração (`/admin`)
- Acesso exclusivo para usuários com `role === "admin"`
- Listagem global de todos os incidentes de todos os usuários
- Busca e filtros globais (categoria, risco, texto)
- Reclassificação manual de qualquer incidente (categoria + risco)
- Listagem de todos os usuários do sistema
- Promoção/rebaixamento de usuários (user ↔ admin)
- KPIs globais: total de incidentes, usuários, críticos, categorias ativas
- Exportação PDF global (modo admin)

### Gestão de Categorias de Incidentes (`/admin/categories`)
- Acesso exclusivo para usuários com `role === "admin"`
- Listagem de todas as categorias cadastradas com nome, descrição, cor e status (ativa/inativa)
- Criação de novas categorias com nome (obrigatório), descrição e cor personalizados
- Edição de categorias existentes (nome, descrição, cor, status ativo/inativo)
- Exclusão lógica (soft delete) de categorias — o histórico de incidentes é preservado
- Categorias padrão pré-cadastradas: Phishing, Malware, Força Bruta, DDoS, Vazamento de Dados
- Administradores podem criar categorias adicionais conforme necessidade operacional

### Exportação de Relatórios PDF
- Relatório personalizado com dados do usuário e timestamp
- Tabela de estatísticas por categoria e por nível de risco
- Tabela detalhada de todos os incidentes com filtros aplicados
- Modo admin: relatório global com nome do usuário por incidente
- Tema profissional aplicado ao PDF com paleta SOC Portal dark
- Download automático com nome de arquivo timestampado

### Notificações de Risco Crítico
- Alerta automático ao administrador do sistema quando um incidente crítico é registrado
- Notificação inclui: título do incidente, categoria, usuário, data/hora
- Integrado ao fluxo de criação de incidentes sem impacto na performance

---

## Modelo de Machine Learning

O classificador usa um pipeline scikit-learn com vetorização TF-IDF (máximo 5000 features, bigramas) seguido de um classificador Multinomial Naive Bayes (alpha=0.1).

### Categorias e Níveis de Risco

| Categoria | Rótulo Interno | Nível de Risco | Exemplos de Indicadores |
|---|---|---|---|
| Phishing | `phishing` | Alto | e-mail falso, link suspeito, credenciais, engenharia social |
| Malware | `malware` | Crítico | vírus, ransomware, trojan, infecção, criptografia de arquivos |
| Força Bruta | `brute_force` | Alto | tentativas de login, senha incorreta, bloqueio de conta |
| DDoS | `ddos` | Médio | negação de serviço, sobrecarga, tráfego anômalo |
| Vazamento de Dados | `vazamento_de_dados` | Crítico | exposição de dados, LGPD, dados sensíveis, exfiltração |

### Métricas do Modelo

| Métrica | Valor |
|---|---|
| Acurácia (Cross-Validation 5-fold) | 97% |
| Dataset de treinamento | 100 amostras |
| Algoritmo | TF-IDF + Multinomial Naive Bayes |
| Features máximas | 5.000 |
| N-gramas | Unigramas e bigramas |

---

## Estrutura de Diretórios

```
incident_security_system/
├── client/                        # Frontend React
│   ├── src/
│   │   ├── _core/hooks/           # useAuth hook
│   │   ├── components/
│   │   │   ├── CyberLayout.tsx    # Layout SOC Portal com sidebar compacta
│   │   │   ├── ExportPdfButton.tsx # Botão de exportação PDF
│   │   │   └── ui/                # Componentes shadcn/ui
│   │   ├── pages/
│   │   │   ├── Home.tsx           # Landing page
│   │   │   ├── Login.tsx          # Autenticação
│   │   │   ├── Register.tsx       # Registro de usuário
│   │   │   ├── Dashboard.tsx      # Painel principal com KPIs
│   │   │   ├── Incidents.tsx      # Listagem com filtros e exportação PDF
│   │   │   ├── NewIncident.tsx    # Formulário de registro
│   │   │   ├── IncidentDetail.tsx # Detalhe e análise de risco
│   │   │   ├── RiskAnalysis.tsx   # Análise de risco global
│   │   │   └── Admin.tsx          # Painel de administração
│   │   ├── App.tsx                # Roteamento principal
│   │   ├── index.css              # Design System SOC Portal (Inter, dark theme)
│   │   └── lib/trpc.ts            # Cliente tRPC
│   └── index.html                 # Importa fontes Inter + JetBrains Mono
├── drizzle/
│   └── schema.ts                  # Tabelas: users, incidents
├── ml/
│   ├── incidentes_cybersecurity_100.xlsx  # Dataset de treinamento
│   ├── train_model.py             # Script de treinamento
│   ├── classifier_server.py       # Flask API de classificação (porta 5001)
│   ├── pdf_server.py              # Flask API de geração PDF (porta 5002)
│   └── model/                     # Modelo treinado (.pkl)
├── server/
│   ├── _core/                     # Framework: OAuth, JWT, contexto, env
│   ├── db.ts                      # Helpers de banco de dados
│   ├── routers.ts                 # Procedures tRPC (auth, incidents, admin, reports)
│   ├── validation.ts              # Schemas Joi
│   ├── incidents.test.ts          # 27 testes de funcionalidades
│   └── auth.logout.test.ts        # 1 teste de logout
├── shared/
│   └── const.ts                   # Constantes compartilhadas
├── todo.md                        # Rastreamento de funcionalidades
└── README.md                      # Este arquivo
```

---

## Como Rodar Localmente

### Pré-requisitos

| Requisito | Versão Mínima | Verificação |
|---|---|---|
| Node.js | 22.x | `node --version` |
| pnpm | 10.x | `pnpm --version` |
| Python | 3.11+ | `python3 --version` |
| MySQL | 8.x | `mysql --version` |
| Git | qualquer | `git --version` |

### Passo 1 — Clonar o repositório

```bash
git clone https://github.com/margefson/incident_security_system.git
cd incident_security_system
```

### Passo 2 — Criar o banco de dados MySQL

```sql
CREATE DATABASE incident_security CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'incident_user'@'localhost' IDENTIFIED BY 'sua_senha_aqui';
GRANT ALL PRIVILEGES ON incident_security.* TO 'incident_user'@'localhost';
FLUSH PRIVILEGES;
```

### Passo 3 — Configurar variáveis de ambiente

Crie o arquivo `.env` na raiz do projeto:

```env
# Banco de dados
DATABASE_URL=mysql://incident_user:sua_senha_aqui@localhost:3306/incident_security

# Segurança
JWT_SECRET=sua_chave_jwt_secreta_minimo_32_caracteres

# OAuth (configure conforme seu provedor ou use valores locais)
VITE_APP_ID=local
OAUTH_SERVER_URL=http://localhost:3000
VITE_OAUTH_PORTAL_URL=http://localhost:3000/login
OWNER_OPEN_ID=local_admin
OWNER_NAME=Administrador

# API de notificações (opcional)
BUILT_IN_FORGE_API_URL=http://localhost:3000/api
BUILT_IN_FORGE_API_KEY=local_key
VITE_FRONTEND_FORGE_API_KEY=local_key
VITE_FRONTEND_FORGE_API_URL=http://localhost:3000/api
```

### Passo 4 — Instalar dependências Node.js

```bash
pnpm install
```

### Passo 5 — Executar migrações do banco de dados

```bash
pnpm db:push
```

Este comando cria as tabelas `users` e `incidents` no banco de dados.

### Passo 6 — Configurar ambiente Python

```bash
# Criar ambiente virtual (recomendado)
python3 -m venv venv
source venv/bin/activate   # Linux/macOS
# ou: venv\Scripts\activate  # Windows

# Instalar dependências
pip install scikit-learn flask openpyxl joblib reportlab pandas
```

### Passo 7 — Treinar o modelo de Machine Learning

```bash
cd ml
python train_model.py
cd ..
```

Saída esperada:
```
Carregando dataset: 100 amostras
Treinando modelo TF-IDF + Naive Bayes...
Acurácia Cross-Validation (5-fold): 0.97 ± 0.02
Modelo salvo em: ml/model/classifier.pkl
```

### Passo 8 — Iniciar o servidor de classificação ML (porta 5001)

```bash
# Em um terminal separado
cd ml
python classifier_server.py
```

Saída esperada:
```
 * Running on http://0.0.0.0:5001
 * ML model loaded successfully
```

### Passo 9 — Iniciar o servidor de geração de PDF (porta 5002)

```bash
# Em outro terminal separado
cd ml
python pdf_server.py
```

Saída esperada:
```
 * Running on http://0.0.0.0:5002
 * PDF server ready
```

### Passo 10 — Iniciar o servidor Node.js (porta 3000)

```bash
# No terminal principal
pnpm dev
```

Saída esperada:
```
Server running on http://localhost:3000/
```

### Passo 11 — Acessar a aplicação

Abra o navegador em: **http://localhost:3000**

> **Nota — Acesso ao painel de administração:** Registre um usuário normalmente e depois promova-o para admin diretamente no banco de dados:
> ```sql
> UPDATE users SET role = 'admin' WHERE email = 'seu@email.com';
> ```

---

## Variáveis de Ambiente

| Variável | Obrigatória | Descrição |
|---|---|---|
| `DATABASE_URL` | Sim | String de conexão MySQL |
| `JWT_SECRET` | Sim | Chave secreta para assinar tokens JWT (mín. 32 chars) |
| `VITE_APP_ID` | Sim | ID da aplicação OAuth |
| `OAUTH_SERVER_URL` | Sim | URL base do servidor OAuth |
| `VITE_OAUTH_PORTAL_URL` | Sim | URL do portal de login OAuth |
| `OWNER_OPEN_ID` | Não | OpenID do proprietário (recebe notificações críticas) |
| `OWNER_NAME` | Não | Nome do proprietário |
| `BUILT_IN_FORGE_API_URL` | Não | URL da API de notificações |
| `BUILT_IN_FORGE_API_KEY` | Não | Chave da API de notificações |

---

## Scripts Disponíveis

```bash
pnpm dev          # Inicia servidor de desenvolvimento (Node.js + Vite HMR)
pnpm build        # Build de produção (frontend + backend)
pnpm start        # Inicia servidor de produção
pnpm test         # Executa 28 testes Vitest
pnpm db:push      # Gera e executa migrações Drizzle
pnpm check        # Verificação TypeScript sem emissão
pnpm format       # Formata código com Prettier
```

---

## Referência de API tRPC

### Router `auth`

| Procedure | Tipo | Acesso | Descrição |
|---|---|---|---|
| `auth.register` | mutation | público | Registra novo usuário com bcrypt |
| `auth.login` | mutation | público | Autentica e cria sessão JWT |
| `auth.logout` | mutation | público | Invalida cookie de sessão |
| `auth.me` | query | público | Retorna usuário autenticado ou null |

### Router `incidents`

| Procedure | Tipo | Acesso | Descrição |
|---|---|---|---|
| `incidents.create` | mutation | autenticado | Cria e classifica incidente via ML |
| `incidents.list` | query | autenticado | Lista incidentes do usuário |
| `incidents.getById` | query | autenticado | Detalhe de um incidente (owner ou admin) |
| `incidents.delete` | mutation | autenticado | Remove incidente (owner ou admin) |
| `incidents.stats` | query | autenticado | Estatísticas por categoria e risco |

### Router `admin`

| Procedure | Tipo | Acesso | Descrição |
|---|---|---|---|
| `admin.listIncidents` | query | admin | Lista todos os incidentes com paginação e filtros |
| `admin.reclassify` | mutation | admin | Reclassifica manualmente um incidente |
| `admin.listUsers` | query | admin | Lista todos os usuários do sistema |
| `admin.updateUserRole` | mutation | admin | Promove ou rebaixa um usuário |
| `admin.stats` | query | admin | Estatísticas globais do sistema |

### Router `reports`

| Procedure | Tipo | Acesso | Descrição |
|---|---|---|---|
| `reports.exportPdf` | mutation | autenticado | Exporta relatório PDF com filtros opcionais |

---

## Segurança

O sistema implementa todos os **8 requisitos de segurança obrigatórios**, cada um coberto por testes Vitest individuais no arquivo `server/security.test.ts`:

### 6.1 — Gerenciamento de Segredos

Nenhum segredo aparece no código-fonte. Todos os valores sensíveis (`JWT_SECRET`, `DATABASE_URL`, `BUILT_IN_FORGE_API_KEY`) são lidos exclusivamente de variáveis de ambiente via `server/_core/env.ts`. O arquivo `.env` nunca é commitado (listado em `.gitignore`).

### 6.2 — Hash de Senha com bcrypt

Senhas são armazenadas com **bcrypt** (custo 12, via `bcryptjs`). O campo `passwordHash` nunca é retornado nas respostas das procedures. O salt é gerado aleatoriamente a cada hash, garantindo que dois usuários com a mesma senha tenham hashes distintos.

### 6.3 — Sessão Segura

O cookie de sessão é configurado em `server/_core/cookies.ts` com:

| Flag | Valor | Propósito |
|---|---|---|
| `httpOnly` | `true` | Impede acesso via JavaScript (XSS) |
| `secure` | `true` em produção | Transmissão apenas via HTTPS |
| `sameSite` | `"lax"` | Proteção contra CSRF |
| `saveUninitialized` | `false` | Não cria sessão vazia |

### 6.4 — Autorização nos Incidentes (IDOR)

Antes de qualquer operação de leitura, atualização ou remoção de incidente, a API verifica se o recurso pertence ao usuário autenticado. Retorna **404 NOT_FOUND** (nunca 403) quando o incidente não pertence ao usuário — evitando revelar a existência do recurso a atacantes.

### 6.5 — Rate Limiting

| Limitador | Escopo | Limite |
|---|---|---|
| `globalRateLimit` | Todas as rotas `/api/*` | 100 req / IP / 15 min |
| `authRateLimit` | Apenas `/api/trpc/auth.*` | 10 req / IP / 15 min |

Ambos usam `ipKeyGenerator` para suporte seguro a IPv6 (via `express-rate-limit`).

### 6.6 — CORS

A API aceita requisições apenas das origens configuradas via `FRONTEND_URL` (variável de ambiente). Em ambientes de desenvolvimento/staging, domínios `*.manus.computer` e `*.manus.space` são aceitos automaticamente. Credenciais (cookies) são permitidas via `credentials: true`.

### 6.7 — Cabeçalhos de Segurança HTTP (Helmet)

| Cabeçalho | Configuração |
|---|---|
| `X-Powered-By` | Removido |
| `X-Content-Type-Options` | `nosniff` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `SAMEORIGIN` |

### 6.8 — Proteção contra Timing Attack

A função de login executa `bcrypt.compare()` **sempre**, independentemente de o e-mail existir ou não no banco. Quando o e-mail não é encontrado, um hash dummy é usado como alvo da comparação, garantindo tempo de resposta constante e impedindo enumeração de usuários por análise de tempo.

---

### Validação de Senha (Signup)

Regras aplicadas em dupla camada — backend (Joi) e frontend (checklist visual em tempo real):

| Critério | Regra |
|---|---|
| Comprimento mínimo | 8 caracteres |
| Comprimento máximo | 128 caracteres |
| Letra minúscula | Pelo menos uma (`[a-z]`) |
| Letra maiúscula | Pelo menos uma (`[A-Z]`) |
| Número | Pelo menos um (`[0-9]`) |
| Caractere especial | Pelo menos um (`[^a-zA-Z0-9]`) |

### Controle de Acesso e Isolamento de Dados

Todas as procedures sensíveis usam `protectedProcedure`. Operações de incidentes verificam `userId === ctx.user.id` ou `role === "admin"`. O `adminProcedure` bloqueia usuários sem `role === "admin"` com erro FORBIDDEN. A query `getIncidentsByUser` filtra por `userId` no nível do banco de dados..

---

## Testes

```bash
pnpm test
```

Saída esperada:

```
✓ server/incidents.test.ts (79 tests)
✓ server/auth.logout.test.ts (1 test)
✓ server/security.test.ts (34 tests)
✓ server/categories.test.ts (21 tests)
Tests: 135 passed
```

### Cobertura dos Testes

| Suite | Arquivo | Testes | O que cobre |
|---|---|---|---|
| `auth.register` | `incidents.test.ts` | 3 | Registro bem-sucedido, e-mail duplicado, senha curta |
| `auth.register - validação de senha` | `incidents.test.ts` | 9 | Sem maiúscula, sem minúscula, sem número, sem especial, muito curta, muito longa, limites exatos, vazia, válida |
| `checkPasswordCriteria` | `incidents.test.ts` | 5 | Critérios individuais, caracteres especiais, limites |
| `isPasswordValid` | `incidents.test.ts` | 8 | Senhas válidas e inválidas para cada regra |
| `auth.login` | `incidents.test.ts` | 2 | Login bem-sucedido, credenciais inválidas |
| `auth.logout` | `auth.logout.test.ts` | 1 | Limpeza do cookie com `sameSite: lax` (req. 6.3) |
| `incidents.create` | `incidents.test.ts` | 3 | Classificação ML, validação, autenticação |
| `incidents.list` | `incidents.test.ts` | 1 | Isolamento por usuário |
| `incidents.getById` | `incidents.test.ts` | 3 | Owner, outro usuário (404 IDOR), admin |
| `incidents.delete` | `incidents.test.ts` | 2 | Owner, outro usuário (404 IDOR) |
| `incidents.stats` | `incidents.test.ts` | 1 | Estatísticas por categoria e risco |
| `admin.*` | `incidents.test.ts` | 7 | Listagem global, reclassificação, stats, papéis |
| `reports.exportPdf` | `incidents.test.ts` | 2 | Exportação autenticada, não autenticado bloqueado |
| `incidents.create (notif.)` | `incidents.test.ts` | 1 | Notificação disparada para risco crítico |
| **6.1 Gerenciamento de Segredos** | `security.test.ts` | 4 | JWT/DB sem hardcode, ENV correto |
| **6.2 Hash de Senha (bcrypt)** | `security.test.ts` | 6 | Custo 12, hash irreversível, salt aleatório, sem expor hash |
| **6.3 Sessão Segura** | `security.test.ts` | 5 | httpOnly, secure, sameSite=lax, path, maxAge |
| **6.4 IDOR (NOT_FOUND)** | `security.test.ts` | 4 | 404 para incidente alheio, nunca 403 |
| **6.5 Rate Limiting** | `security.test.ts` | 4 | Global 100/15min, auth 10/15min, headers, middleware |
| **6.6 CORS** | `security.test.ts` | 3 | Origem permitida, origem bloqueada, credentials |
| **6.7 Helmet** | `security.test.ts` | 5 | X-Powered-By removido, nosniff, HSTS, X-Frame |
| **6.8 Timing Attack** | `security.test.ts` | 3 | bcrypt sempre executado, mesma mensagem, hash dummy válido |

| **7.1 Design System SOC Portal** | `incidents.test.ts` | 10 | Componentes exportados, classes CSS, campos de formulário, restrição de acesso admin |
| **7.2 Consistência CSS SOC Portal** | `incidents.test.ts` | 5 | soc-card, soc-btn-primary, aliases de subtitle, fonte Inter, badges, soc-table |
| **Categories CRUD — list** | `categories.test.ts` | 2 | Listagem pública, retorno de array com campos corretos |
| **Categories CRUD — create** | `categories.test.ts` | 5 | Admin cria com/sem campos opcionais, FORBIDDEN para user, UNAUTHORIZED para anônimo, validação de nome |
| **Categories CRUD — update** | `categories.test.ts` | 5 | Admin atualiza campos parciais, desativa categoria, FORBIDDEN para user, UNAUTHORIZED para anônimo |
| **Categories CRUD — delete** | `categories.test.ts` | 3 | Admin exclui (soft delete), FORBIDDEN para user, UNAUTHORIZED para anônimo |
| **Categories CRUD — RBAC** | `categories.test.ts` | 4 | list público, create/update/delete apenas admin |
| **Categories CRUD — DB helpers** | `categories.test.ts` | 2 | listCategories e createCategory chamam funções corretas |

**Total: 135 testes passando em 4 arquivos**

---

## Solução de Problemas

| Problema | Causa Provável | Solução |
|---|---|---|
| `ECONNREFUSED 5001` | Servidor ML não está rodando | Execute `python ml/classifier_server.py` |
| `ECONNREFUSED 5002` | Servidor PDF não está rodando | Execute `python ml/pdf_server.py` |
| `ER_ACCESS_DENIED_ERROR` | Credenciais MySQL incorretas | Verifique `DATABASE_URL` no `.env` |
| `JWT_SECRET is required` | Variável de ambiente ausente | Adicione `JWT_SECRET` ao `.env` |
| `model not found` | Modelo não treinado | Execute `python ml/train_model.py` |
| Página em branco após login | Cookie bloqueado pelo navegador | Use Chrome/Firefox em modo normal |
| PDF vazio ou erro 500 | Nenhum incidente registrado | Registre ao menos um incidente antes de exportar |
| Acesso negado ao `/admin` | Usuário sem role admin | Execute `UPDATE users SET role='admin' WHERE email='...'` |

---

## Equipe

O sistema foi desenvolvido por uma equipe de cinco integrantes, com responsabilidades distribuídas conforme a especialidade de cada membro:

| Área | Responsável(is) | Descrição das Atividades |
|---|---|---|
| **Front-end** | Nattan e Keven | Desenvolvimento das interfaces React, design system SOC Portal (dark theme profissional, tipografia Inter, sidebar compacta, badges de severidade por categoria), componentes shadcn/ui, páginas de login, registro, dashboard, listagem, detalhe e painel admin |
| **Back-end** | Margefson | Implementação da API tRPC com Express, autenticação bcryptjs, procedures de incidentes, admin e exportação PDF, validação Joi e testes Vitest |
| **Banco de Dados** | Nattan | Modelagem do schema Drizzle ORM, definição das tabelas `users` e `incidents`, configuração das migrações e queries de acesso |
| **Classificador ML** | Josias e Keven | Construção do pipeline TF-IDF + Naive Bayes, treinamento com o dataset de 100 amostras, servidor Flask de classificação (porta 5001) e servidor Flask de geração de PDF (porta 5002) |

---

## Licença

MIT © 2025 — Desenvolvido como projeto de segurança cibernética aplicada.
