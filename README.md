# ◉ RoomOS Pro

**Sistema de Reserva de Salas de Reunião** — v2.4.1

Stack completo com autenticação SSO (Google + Microsoft 365), check-in por QR Code/botão, planta baixa interativa, wallboard em tempo real para tablets e painel de administração completo.

---

## 🚀 Deploy no EasyPanel (recomendado)

### Pré-requisitos
- EasyPanel instalado no Proxmox ou VPS
- Domínio configurado com registro DNS A
- Conta GitHub com este repositório

### Passo a passo

#### 1. Fork / clone este repositório
```bash
# Clone para sua conta GitHub
gh repo fork SEU_USUARIO/roomos-pro --clone
```

#### 2. Configure os Secrets no GitHub
Em **Settings → Secrets and variables → Actions**:

| Secret | Descrição |
|--------|-----------|
| `EASYPANEL_TOKEN` | Token da API do EasyPanel |
| `EASYPANEL_WEBHOOK_URL` | URL do webhook de deploy |

#### 3. Crie o projeto no EasyPanel

No painel EasyPanel:
1. **Projects → Create Project** → Nome: `roomos-pro`
2. **Services → Add Service → App**
3. Fonte: GitHub → selecione este repositório
4. Dockerfile: `docker/Dockerfile`
5. **Adicione os serviços de banco:**
   - PostgreSQL 15 → nome: `db`
   - Redis 7 → nome: `redis`

#### 4. Configure as variáveis de ambiente no EasyPanel

Em **App → Environment**:

```env
NODE_ENV=production
APP_NAME=RoomOS
DATABASE_URL=postgresql://roomos:SENHA@roomos-pro_db:5432/roomos
REDIS_HOST=roomos-pro_redis
REDIS_PORT=6379
REDIS_PASSWORD=SUA_SENHA_REDIS
JWT_SECRET=CHAVE_64_CHARS
REFRESH_SECRET=OUTRA_CHAVE_64_CHARS
APP_URL=https://salas.suaempresa.com.br
TZ=America/Sao_Paulo

# SSO (opcional)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
MS_CLIENT_ID=
MS_CLIENT_SECRET=
MS_TENANT_ID=
```

#### 5. Configure o domínio

Em **App → Domains**:
- Host: `salas.suaempresa.com.br`
- Port: `3000`
- SSL: ativado automaticamente via Let's Encrypt

#### 6. Deploy

Faça push para `main` — o GitHub Actions faz build e notifica o EasyPanel automaticamente:

```bash
git add .
git commit -m "feat: initial deploy"
git push origin main
```

---

## 💻 Desenvolvimento local

```bash
# Instalar dependências
npm install

# Subir banco e Redis
docker compose up db redis -d

# Copiar e editar variáveis
cp .env.example .env
# Edite DATABASE_URL, REDIS_PASSWORD, JWT_SECRET

# Rodar migrations
cd backend && npx prisma migrate dev

# Iniciar em modo dev (hot reload)
npm run dev
# Frontend: http://localhost:5173
# Backend:  http://localhost:3000
```

---

## 📦 Estrutura do repositório

```
roomos-pro/
├── frontend/               # React 18 + Vite + TypeScript
│   ├── src/
│   │   ├── pages/          # Dashboard, Rooms, Bookings...
│   │   ├── components/     # AppShell, modals, UI
│   │   ├── store/          # Zustand (auth, theme, rooms)
│   │   ├── services/       # API client, WebSocket
│   │   └── styles/         # globals.css (Yeastar P-Series design)
│   └── public/             # manifest.json, ícones PWA
├── backend/                # Node.js + Express + TypeScript
│   ├── src/
│   │   ├── routes/         # auth, rooms, bookings, users...
│   │   ├── middleware/      # auth JWT, passport SSO
│   │   ├── services/       # redis, logger, email
│   │   └── server.ts       # entry point
│   └── prisma/
│       └── schema.prisma   # PostgreSQL schema
├── docker/
│   └── Dockerfile          # Multi-stage build
├── .github/
│   └── workflows/
│       └── deploy.yml      # CI/CD → EasyPanel
├── docker-compose.yml      # Desenvolvimento local
├── easypanel.json          # Configuração EasyPanel
└── .env.example            # Template de variáveis
```

---

## 🔑 SSO — Configuração

### Google Workspace
1. [console.cloud.google.com](https://console.cloud.google.com) → Credenciais → OAuth 2.0
2. URI de redirecionamento: `https://SEU_DOMINIO/api/auth/google/callback`
3. Copie `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` para o EasyPanel

### Microsoft 365 / Azure AD
1. [portal.azure.com](https://portal.azure.com) → Azure AD → Registros de aplicativo
2. URI de redirecionamento: `https://SEU_DOMINIO/api/auth/microsoft/callback`
3. Copie `MS_CLIENT_ID`, `MS_CLIENT_SECRET`, `MS_TENANT_ID` para o EasyPanel

---

## 📱 Wallboard — Tablets Android/iPad

Acesse `https://SEU_DOMINIO/wallboard` no browser do tablet.

**Android (Chrome):** Menu → "Adicionar à tela inicial"  
**iPad (Safari):** Compartilhar → "Adicionar à Tela de Início"

O app roda em modo kiosk (tela cheia), sem barra de navegação.

---

## 🛠️ Comandos úteis

```bash
# Ver logs no EasyPanel CLI
easypanel logs roomos-pro_app -f

# Backup manual do banco
docker exec roomos-pro_db pg_dump -U roomos roomos | gzip > backup.sql.gz

# Aplicar migrations manualmente
docker exec roomos-pro_app npx prisma migrate deploy

# Acessar shell do banco
docker exec -it roomos-pro_db psql -U roomos -d roomos
```

---

## 📄 Licença

Proprietário — uso interno corporativo.  
© 2025 RoomOS Pro
