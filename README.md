# INCIDENT_SYS

> **Sistema Web Seguro para Registro e Classificação de Incidentes de Segurança Cibernética**

[![Node.js](https://img.shields.io/badge/Node.js-22.x-339933?style=flat-square&logo=node.js)](https://nodejs.org)
[![React](https://img.shields.io/badge/React-19-61DAFB?style=flat-square&logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?style=flat-square&logo=typescript)](https://typescriptlang.org)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?style=flat-square&logo=python)](https://python.org)
[![scikit-learn](https://img.shields.io/badge/scikit--learn-ML-F7931E?style=flat-square&logo=scikitlearn)](https://scikit-learn.org)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-4479A1?style=flat-square&logo=mysql)](https://mysql.com)
[![Tests](https://img.shields.io/badge/Tests-18%20passed-brightgreen?style=flat-square)](#testes)
[![ML Accuracy](https://img.shields.io/badge/ML%20Accuracy-97%25%20CV-ff00ff?style=flat-square)](#modelo-de-machine-learning)

---

## Visão Geral

O **INCIDENT_SYS** é uma plataforma full-stack de gerenciamento de incidentes de segurança cibernética que combina autenticação segura com bcryptjs, controle de acesso individual por usuário e classificação automática de incidentes por Machine Learning. O sistema foi desenvolvido seguindo os requisitos do documento *"Sistema Web Seguro para Registro e Classificação de Incidentes de Segurança"* e a arquitetura do repositório de referência [v2x_security_system](https://github.com/margefson/v2x_security_system).

A interface adota uma estética **cyberpunk de alto contraste** — fundo preto profundo com tipografia neon rosa e ciano elétrico — projetada para ambientes de operações de segurança (SOC) onde a leitura rápida de informações críticas é prioritária.

### Funcionalidades Principais

| Funcionalidade | Descrição |
|---|---|
| **Autenticação local** | Registro e login com bcryptjs (saltRounds=12) + sessões JWT |
| **Validação Joi** | Schemas de validação para todos os formulários de entrada |
| **Classificação automática** | TF-IDF + Naive Bayes em 5 categorias de ameaça (97% acurácia CV) |
| **Controle de acesso** | Cada usuário acessa exclusivamente seus próprios incidentes |
| **Dashboard interativo** | KPIs, gráficos de barras e donut com Recharts |
| **Análise de risco** | Score ponderado, gráfico radar e recomendações contextuais |
| **API ML interna** | Servidor Flask (porta 5001) integrado ao backend Node.js |
| **Perfis de acesso** | Roles `user` e `admin` com controle granular por procedure |

---

## Arquitetura do Sistema

O sistema opera com dois processos independentes que se comunicam internamente via HTTP:

```
┌──────────────────────────────────────────────────────────────────┐
│                      NAVEGADOR (porta 3000)                       │
│              React 19 + Vite HMR + Tailwind CSS 4                │
└────────────────────────────┬─────────────────────────────────────┘
                             │ tRPC over HTTP (/api/trpc/*)
┌────────────────────────────▼─────────────────────────────────────┐
│              SERVIDOR NODE.JS — Express 4 (porta 3000)            │
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐    │
│  │                    tRPC Procedures                        │    │
│  │  auth.register  · auth.login  · auth.logout  · auth.me   │    │
│  │  incidents.create  · incidents.list  · incidents.getById  │    │
│  │  incidents.delete  · incidents.stats  · incidents.globalStats │
│  └──────────────────────────────────────────────────────────┘    │
│                                                                    │
│  Validação: Joi  ·  Auth: bcryptjs + JWT (jose)                  │
│  ORM: Drizzle  ·  Tipagem: tRPC + Zod end-to-end                 │
└──────────┬─────────────────────────────────┬─────────────────────┘
           │ Drizzle ORM                      │ HTTP POST /classify
           │                                  │ (localhost interno)
┌──────────▼──────────┐          ┌────────────▼────────────────────┐
│  MySQL / TiDB        │          │  SERVIDOR FLASK — Python 3.11   │
│  (porta 3306)        │          │  (porta 5001 — interna)         │
│                      │          │                                  │
│  Tabelas:            │          │  Pipeline scikit-learn:          │
│  · users             │          │  TfidfVectorizer (5k features)   │
│  · incidents         │          │  → MultinomialNB                 │
│                      │          │                                  │
│  Campos críticos:    │          │  Treinado com 100 amostras       │
│  · passwordHash      │          │  Acurácia CV 5-fold: 97%         │
│  · category (enum)   │          │  Retorna: categoria + confiança  │
│  · riskLevel (enum)  │          │  + nível de risco                │
│  · confidence        │          │                                  │
└──────────────────────┘          └──────────────────────────────────┘
```

### Fluxo de Classificação de um Incidente

```
Usuário preenche título + descrição
        │
        ▼
Backend valida com Joi (min/max chars)
        │
        ▼
POST http://localhost:5001/classify
{ "title": "...", "description": "..." }
        │
        ▼
TF-IDF vetoriza texto (título + descrição concatenados)
        │
        ▼
Naive Bayes calcula P(categoria | texto) para 5 classes
        │
        ▼
Retorna: { category, confidence, risk_level }
        │
        ▼
Incidente salvo no MySQL com metadados ML
        │
        ▼
Usuário redirecionado para página de detalhe
```

---

## Stack Tecnológica

### Frontend

| Tecnologia | Versão | Papel |
|---|---|---|
| React | 19.x | Framework de UI reativa |
| Vite | 7.x | Build tool e dev server com HMR |
| TypeScript | 5.9 | Tipagem estática end-to-end |
| Tailwind CSS | 4.x | Estilização com CSS variables OKLCH |
| Wouter | 3.x | Roteamento client-side leve |
| Recharts | 2.x | Gráficos interativos (barras, donut, radar) |
| shadcn/ui + Radix | — | Componentes acessíveis e estilizáveis |
| Lucide React | — | Ícones SVG |

### Backend

| Tecnologia | Versão | Papel |
|---|---|---|
| Node.js | 22.x | Runtime do servidor |
| Express | 4.x | Servidor HTTP |
| tRPC | 11.x | Contratos de API tipados (sem REST manual) |
| Zod | 4.x | Validação de schema nas procedures |
| Joi | 17.x | Validação de regras de negócio |
| bcryptjs | 2.x | Hash de senhas (saltRounds=12) |
| jose | 6.x | Geração e verificação de tokens JWT |
| Drizzle ORM | 0.44 | ORM type-safe para MySQL |
| mysql2 | 3.x | Driver MySQL para Node.js |

### Machine Learning

| Tecnologia | Versão | Papel |
|---|---|---|
| Python | 3.11 | Runtime do servidor ML |
| scikit-learn | 1.x | Pipeline TF-IDF + Naive Bayes |
| Flask | 3.x | Servidor HTTP para API de classificação |
| joblib | 1.x | Serialização do modelo treinado |
| pandas | 2.x | Manipulação do dataset de treinamento |
| openpyxl | 3.x | Leitura do dataset .xlsx |

---

## Modelo de Machine Learning

O motor de classificação utiliza um pipeline **TF-IDF + Multinomial Naive Bayes** treinado sobre um dataset de 100 amostras rotuladas de incidentes de segurança cibernética (20 amostras por categoria).

### Categorias e Níveis de Risco

| Categoria | Rótulo | Risco Atribuído | Exemplos de Indicadores |
|---|---|---|---|
| Phishing | `phishing` | Alto | e-mail suspeito, link malicioso, credenciais, fraude |
| Malware | `malware` | **Crítico** | executável suspeito, vírus, ransomware, backdoor |
| Força Bruta | `brute_force` | Alto | tentativas de login, falhas consecutivas, dicionário |
| DDoS | `ddos` | Médio | tráfego anômalo, sobrecarga, indisponibilidade |
| Vazamento de Dados | `vazamento_de_dados` | **Crítico** | dados expostos, arquivo não autorizado, exfiltração |

### Métricas de Desempenho

| Métrica | Valor |
|---|---|
| Acurácia no conjunto de treino | 100% |
| Acurácia em cross-validation (5-fold) | **97% ± 6%** |
| Número de categorias | 5 |
| Tamanho do vocabulário TF-IDF | 5.000 features |
| Dataset de treinamento | 100 amostras balanceadas |

---

## Estrutura de Diretórios

```
incident_security_system/
├── client/                        # Frontend React + Vite
│   ├── index.html                 # HTML raiz (fontes Google Fonts)
│   └── src/
│       ├── App.tsx                # Roteamento principal (Wouter)
│       ├── index.css              # Tema cyberpunk (CSS variables OKLCH)
│       ├── main.tsx               # Ponto de entrada React + providers
│       ├── components/
│       │   └── CyberLayout.tsx    # Layout com sidebar cyberpunk
│       ├── pages/
│       │   ├── Home.tsx           # Landing page
│       │   ├── Login.tsx          # Autenticação
│       │   ├── Register.tsx       # Cadastro de usuário
│       │   ├── Dashboard.tsx      # Painel com KPIs e gráficos
│       │   ├── Incidents.tsx      # Listagem com filtros
│       │   ├── NewIncident.tsx    # Formulário + pré-visualização ML
│       │   ├── IncidentDetail.tsx # Detalhe + análise de risco
│       │   └── RiskAnalysis.tsx   # Análise consolidada de risco
│       └── lib/
│           └── trpc.ts            # Cliente tRPC tipado
├── drizzle/
│   └── schema.ts                  # Schema do banco (users + incidents)
├── ml/                            # Motor de Machine Learning
│   ├── train_model.py             # Treinamento TF-IDF + Naive Bayes
│   ├── classifier_server.py       # Servidor Flask (porta 5001)
│   ├── model.pkl                  # Modelo treinado serializado
│   ├── metrics.json               # Métricas de desempenho
│   └── incidentes_cybersecurity_100.xlsx  # Dataset de treinamento
├── server/                        # Backend Node.js
│   ├── routers.ts                 # Procedures tRPC (auth + incidents)
│   ├── db.ts                      # Helpers Drizzle (queries)
│   ├── validation.ts              # Schemas Joi de validação
│   ├── incidents.test.ts          # Testes Vitest (17 testes)
│   ├── auth.logout.test.ts        # Teste de logout (1 teste)
│   └── _core/                     # Infraestrutura do framework
│       ├── index.ts               # Servidor Express principal
│       ├── context.ts             # Contexto tRPC (user, req, res)
│       ├── env.ts                 # Variáveis de ambiente tipadas
│       └── trpc.ts                # publicProcedure / protectedProcedure
├── shared/
│   └── const.ts                   # Constantes compartilhadas
├── drizzle.config.ts              # Configuração Drizzle Kit
├── package.json                   # Dependências e scripts
├── tsconfig.json                  # Configuração TypeScript
└── vite.config.ts                 # Configuração Vite
```

---

## Como Rodar Localmente

### Pré-requisitos

Certifique-se de ter os seguintes softwares instalados:

| Software | Versão Mínima | Instalação |
|---|---|---|
| Node.js | 18.x LTS | https://nodejs.org |
| pnpm | 8.x | `npm install -g pnpm` |
| Python | 3.9+ | https://python.org |
| MySQL | 8.0+ | https://dev.mysql.com/downloads/ |
| Git | 2.x | https://git-scm.com |

### Passo 1 — Clonar o Repositório

```bash
git clone https://github.com/margefson/incident_security_system.git
cd incident_security_system
```

### Passo 2 — Configurar o Banco de Dados MySQL

Conecte-se ao MySQL e execute:

```sql
CREATE DATABASE incident_security CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'incident_user'@'localhost' IDENTIFIED BY 'SuaSenhaForte123!';
GRANT ALL PRIVILEGES ON incident_security.* TO 'incident_user'@'localhost';
FLUSH PRIVILEGES;
```

### Passo 3 — Configurar as Variáveis de Ambiente

Crie o arquivo `.env` na raiz do projeto:

```bash
cp .env.example .env   # se disponível, ou crie manualmente
```

Edite o `.env` com os seguintes valores obrigatórios:

```env
# Banco de dados (obrigatório)
DATABASE_URL=mysql://incident_user:SuaSenhaForte123!@localhost:3306/incident_security

# Chave secreta JWT (obrigatório — gere com: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
JWT_SECRET=sua_chave_secreta_aleatoria_de_pelo_menos_32_caracteres

# OAuth Manus (opcional para uso local com bcryptjs)
VITE_APP_ID=local-dev
OAUTH_SERVER_URL=https://api.manus.im
VITE_OAUTH_PORTAL_URL=https://manus.im
OWNER_OPEN_ID=local-owner
OWNER_NAME=Admin Local

# APIs internas (opcional para uso local básico)
BUILT_IN_FORGE_API_URL=
BUILT_IN_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_KEY=
VITE_FRONTEND_FORGE_API_URL=
```

### Passo 4 — Instalar Dependências Node.js

```bash
pnpm install
```

### Passo 5 — Migrar o Schema do Banco de Dados

```bash
pnpm db:push
```

Este comando cria as tabelas `users` e `incidents` no banco de dados configurado.

### Passo 6 — Configurar o Ambiente Python

```bash
cd ml

# Criar e ativar ambiente virtual (recomendado)
python3 -m venv venv
source venv/bin/activate        # Linux/macOS
# .\venv\Scripts\Activate.ps1   # Windows PowerShell

# Instalar dependências Python
pip install scikit-learn flask openpyxl joblib pandas
```

### Passo 7 — Treinar o Modelo ML (opcional)

O arquivo `model.pkl` já está incluído no repositório. Execute este passo apenas se quiser retreinar com dados atualizados:

```bash
# No diretório ml/ com o ambiente virtual ativado
python3 train_model.py
```

Saída esperada:

```
[ML] Dataset carregado: 100 amostras
[ML] Acurácia CV (5-fold): 0.97 ± 0.06
[ML] Modelo salvo em: ml/model.pkl
```

### Passo 8 — Iniciar o Servidor Flask (ML)

Abra um **terminal dedicado** e mantenha-o aberto durante toda a sessão:

```bash
cd ml
source venv/bin/activate   # se usar ambiente virtual
python3 classifier_server.py
```

Saída esperada:

```
[Classifier] Modelo carregado com sucesso!
 * Running on http://127.0.0.1:5001
```

Verifique o servidor:

```bash
curl http://localhost:5001/health
# {"model_loaded": true, "metrics": {"cv_accuracy_mean": 0.97, ...}, "status": "ok"}
```

### Passo 9 — Iniciar o Servidor Node.js

Abra um **segundo terminal** na raiz do projeto:

```bash
pnpm dev
```

Saída esperada:

```
[OAuth] Initialized with baseURL: https://api.manus.im
Server running on http://localhost:3000/
```

### Passo 10 — Acessar o Sistema

Abra o navegador e acesse:

```
http://localhost:3000
```

O sistema estará disponível com a interface cyberpunk. Crie uma conta clicando em **CRIAR CONTA** e comece a registrar incidentes.

---

## Scripts Disponíveis

Todos os comandos são executados na raiz do projeto:

| Comando | Descrição |
|---|---|
| `pnpm dev` | Inicia o servidor de desenvolvimento (Node.js + Vite HMR) na porta 3000 |
| `pnpm build` | Compila frontend (Vite) e backend (esbuild) para produção |
| `pnpm start` | Inicia em modo produção (requer `pnpm build` antes) |
| `pnpm test` | Executa os 18 testes Vitest |
| `pnpm db:push` | Gera e aplica migrações do schema Drizzle no banco |
| `pnpm check` | Verifica erros TypeScript sem compilar |
| `pnpm format` | Formata todos os arquivos com Prettier |

---

## API tRPC — Referência de Procedures

Todas as procedures são acessadas via `trpc.*` no frontend. Procedures marcadas como `protected` exigem sessão autenticada.

| Procedure | Tipo | Acesso | Descrição |
|---|---|---|---|
| `auth.me` | query | público | Retorna o usuário da sessão atual |
| `auth.register` | mutation | público | Cria nova conta com bcryptjs |
| `auth.login` | mutation | público | Autentica e gera cookie JWT |
| `auth.logout` | mutation | público | Invalida o cookie de sessão |
| `incidents.create` | mutation | protegido | Registra e classifica incidente via ML |
| `incidents.list` | query | protegido | Lista incidentes do usuário autenticado |
| `incidents.getById` | query | protegido | Detalhe de um incidente (ownership check) |
| `incidents.delete` | mutation | protegido | Remove incidente (ownership check) |
| `incidents.stats` | query | protegido | Estatísticas por categoria e risco do usuário |
| `incidents.globalStats` | query | admin | Estatísticas globais de todos os usuários |

---

## Segurança

O sistema implementa múltiplas camadas de proteção:

**Credenciais:** As senhas são armazenadas exclusivamente como hash bcrypt com fator de custo 12. Nenhuma senha é registrada em logs ou transmitida após o momento de autenticação.

**Sessões:** O cookie JWT é configurado com `HttpOnly: true`, `Secure: true` e `SameSite: None`, tornando-o inacessível via JavaScript e transmitido apenas via HTTPS.

**Controle de acesso:** Todas as queries ao banco são filtradas pelo `userId` extraído do token JWT. Tentativas de acessar incidentes de outros usuários retornam erro 403 (FORBIDDEN), mesmo que o ID do incidente seja conhecido.

**Validação de entrada:** Todos os campos de formulário são validados com schemas Joi antes de qualquer processamento ou persistência, prevenindo injeção de dados malformados.

**API ML interna:** O servidor Flask (porta 5001) é exclusivamente interno e nunca exposto publicamente. Toda comunicação com o modelo ML passa pelo servidor Node.js como proxy seguro.

---

## Testes

O projeto possui 18 testes automatizados com Vitest cobrindo os fluxos críticos:

```bash
pnpm test
```

```
 ✓ server/auth.logout.test.ts (1 teste)   — logout e limpeza de cookie
 ✓ server/incidents.test.ts  (17 testes)  — validação Joi, controle de acesso,
                                            criação/listagem/deleção de incidentes,
                                            estatísticas, roles admin/user

 Test Files  2 passed (2)
      Tests  18 passed (18)
   Duration  ~1s
```

---

## Solução de Problemas

| Problema | Causa | Solução |
|---|---|---|
| `DATABASE_URL is required` | Arquivo `.env` ausente ou incompleto | Criar `.env` com `DATABASE_URL` válido |
| `ECONNREFUSED 127.0.0.1:5001` | Servidor Flask não está rodando | Executar `python3 ml/classifier_server.py` em terminal separado |
| `Access denied for user` (MySQL) | Usuário sem privilégios no banco | Executar `GRANT ALL PRIVILEGES` no MySQL como root |
| `ModuleNotFoundError: sklearn` | Dependências Python não instaladas | Executar `pip install scikit-learn flask openpyxl joblib pandas` |
| `model.pkl not found` | Arquivo do modelo ausente | Executar `python3 ml/train_model.py` para retreinar |
| Porta 3000 em uso | Outro processo na porta | `lsof -i :3000` e encerrar o processo conflitante |
| `pnpm: command not found` | pnpm não instalado | `npm install -g pnpm` |

---

## Licença

MIT — consulte o arquivo [LICENSE](LICENSE) para detalhes.

---

*Desenvolvido com a stack tRPC + React + Drizzle + MySQL + Python Flask. Arquitetura baseada em [v2x_security_system](https://github.com/margefson/v2x_security_system).*
