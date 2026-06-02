# Banco de dados — PostgreSQL

O projeto migrou de **MySQL/TiDB** para **PostgreSQL** (menor uso de disco e adequado ao roadmap com integração SIEM).

## Instalação rápida (Windows)

### Opção A — Docker (recomendado, pouco espaço)

```powershell
docker run --name incident-pg `
  -e POSTGRES_USER=incident_user `
  -e POSTGRES_PASSWORD=sua_senha `
  -e POSTGRES_DB=incident_security `
  -p 5432:5432 `
  -d postgres:16-alpine
```

### Opção B — PostgreSQL instalado localmente

1. Instale: https://www.postgresql.org/download/windows/
2. Crie usuário e banco:

```sql
CREATE USER incident_user WITH PASSWORD 'sua_senha';
CREATE DATABASE incident_security OWNER incident_user;
GRANT ALL PRIVILEGES ON DATABASE incident_security TO incident_user;
```

## Variável de ambiente

Copie `.env.example` para `.env`:

```env
DATABASE_URL=postgresql://incident_user:sua_senha@localhost:5432/incident_security
```

## Migrações (schema)

```powershell
cd D:\MMB\workspace\incident_security_system
pnpm install
pnpm db:push
```

Isso aplica `drizzle/0000_postgres_initial.sql` (enums + tabelas).

## Seed de categorias (opcional)

```powershell
$env:DATABASE_URL="postgresql://incident_user:sua_senha@localhost:5432/incident_security"
pnpm db:seed:categories
```

## Migração a partir de MySQL antigo

Se você tinha dados no MySQL, exporte com `pgloader` ou dump CSV e importe manualmente. Para ambiente novo/local, basta rodar `pnpm db:push` em banco vazio.

## Arquitetura (inalterada exceto DB)

```
React (tRPC) → Node.js :3000 → PostgreSQL
                      ↘ Flask ML :5001
                      ↘ SIEM (Wazuh) — roadmap fase MVP
```
