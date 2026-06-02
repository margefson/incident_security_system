# Arquitetura e deploy — INCIDENT_SYS

Estrutura alinhada ao projeto [mapearte](https://github.com/mapearte/mapearte) (pastas `backend/` e `frontend/` separadas).

## Visão geral

```
incident_security_system/
├── backend/              # API Express + tRPC
│   ├── config/           # tsconfig, vitest
│   ├── src/
│   │   ├── _core/        # Auth, bootstrap, env
│   │   ├── controllers/  # Rotas tRPC
│   │   ├── services/     # E-mail, PDF, ML, storage
│   │   ├── middleware/   # CORS, helmet, rate limit
│   │   ├── lib/          # Validação (Joi)
│   │   ├── models/       # Drizzle / acesso a dados
│   │   ├── integrations/ # SIEM / Wazuh
│   │   └── tests/        # Testes automatizados
│   ├── drizzle/          # Schema, migrations e drizzle.config.ts
│   ├── ml/               # Classificador Python
│   │   ├── servers/      # Flask (classifier :5001, PDF :5002)
│   │   ├── scripts/      # Treinamento offline
│   │   ├── models/       # model.pkl, metrics.json
│   │   ├── data/         # Datasets train/ e eval/
│   │   └── paths.py      # Caminhos compartilhados
│   ├── shared/           # Tipos e constantes compartilhados
│   └── scripts/          # Utilitários (seed, docx, etc.)
├── frontend/             # SPA React + Vite
│   ├── config/           # vite, tsconfig, shadcn
│   ├── public/
│   ├── patches/
│   ├── index.html
│   └── src/
│       ├── _core/        # main.tsx, App.tsx, useAuth
│       ├── styles/       # index.css (Tailwind)
│       ├── views/        # Páginas
│       ├── controllers/  # Cliente tRPC
│       ├── models/       # Tipos de domínio
│       ├── components/
│       ├── contexts/
│       ├── hooks/
│       └── lib/
├── docs/                 # Documentação
├── docker-compose.yml    # PostgreSQL local (opcional)
├── package.json          # Scripts do monorepo
└── README.md
```

## Desenvolvimento

| Comando | Descrição |
|---------|-----------|
| `pnpm dev` | Backend `:3000` + frontend `:5173` (proxy `/api` → backend) |
| `pnpm dev:backend` | Somente API |
| `pnpm dev:frontend` | Somente interface |

Configure no `.env` da raiz:

```env
FRONTEND_URL=http://localhost:5173
VITE_API_PROXY_TARGET=http://localhost:3000
```

## Produção

1. `pnpm build:frontend` → `frontend/dist/`
2. `pnpm build:backend` → `dist/index.js`
3. `pnpm start` — API serve o build estático do frontend

## Camadas

| Camada | Backend | Frontend |
|--------|---------|----------|
| **Model** | `models/db.ts` | `models/` |
| **View** | Respostas tRPC | `views/` |
| **Controller** | `controllers/*.ts` | `controllers/trpcClient.ts` |
| **Service** | `services/*.ts` | — |
