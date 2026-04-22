<div align="center">

# Paraíso Motel — Dashboard Operacional

**Painel de controle em tempo real para gestão interna de motel**  
Acesso exclusivo para proprietários · Somente leitura · Dados ao vivo

[![Next.js](https://img.shields.io/badge/Next.js-16-black?logo=next.js)](https://nextjs.org)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Supabase](https://img.shields.io/badge/Supabase-Realtime-3ECF8E?logo=supabase)](https://supabase.com)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-4-06B6D4?logo=tailwindcss)](https://tailwindcss.com)
[![Vercel](https://img.shields.io/badge/Deploy-Vercel-black?logo=vercel)](https://vercel.com)

</div>

---

## Visão Geral

O **Paraíso Dashboard** é um painel operacional de tempo real construído para proprietários de motel. Ele conecta diretamente ao banco de dados Supabase e exibe dados ao vivo sobre ocupação de suítes, receita do dia, turnos de caixa e auditoria de todas as operações — sem nunca escrever nenhum dado, apenas consultar.

O design segue um tema **dark premium**: vermelho sangue (`#C41E20`), creme (`#F0E6D0`) e preto profundo (`#080809`), com animações sutis e responsividade total (mobile-first).

---

## Funcionalidades

### Suítes ao Vivo
- Grid responsivo (2 / 3 / 4 colunas) com atualização em tempo real via **Supabase Realtime**
- Cada card exibe status colorido (livre · ocupada · limpeza · manutenção), hóspede, tipo e **tempo de ocupação contado ao vivo** (atualiza a cada segundo)
- Alerta visual automático para suítes ocupadas há mais de 4 horas

### Caixa / Receita
- KPIs do dia: receita confirmada, pendente, stays abertas, voids
- **AreaChart** com gradiente vermelho (Recharts) mostrando receita hora a hora
- Tabela de turnos com highlight de divergências por magnitude (verde · âmbar · vermelho)

### Auditoria
- Log completo de todas as operações do sistema (`audit_log`)
- Paginação (50 registros/página), filtros por URL search params
- Ações `VOID` destacadas em vermelho
- Modal (Sheet) com visualização do JSON `old_data` / `new_data`
- **Export CSV** com BOM para compatibilidade com Excel

### Relatórios com IA
- Geração automática de relatórios via **Google Gemini**
- Cron jobs automáticos: relatório diário (11h), semanal (12h segunda) e mensal (13h, dia 1)
- Relatórios exibidos em drawer deslizante com histórico

### Autenticação
- Login com `signInWithPassword()` do Supabase
- Acesso restrito a usuários com `role = 'owner'`
- Proteção em duas camadas: `middleware.ts` (Edge) + Server Component no layout
- Logout via Server Action

---

## Stack Técnica

| Camada | Tecnologia |
|--------|-----------|
| Framework | Next.js 16 (App Router) |
| Linguagem | TypeScript 5 (strict mode) |
| Estilo | Tailwind CSS 4 + shadcn/ui |
| Banco de Dados | Supabase (PostgreSQL) |
| Realtime | Supabase Realtime Channels |
| Autenticação | Supabase Auth (`@supabase/ssr`) |
| Gráficos | Recharts 3 |
| Datas | date-fns 4 (locale pt-BR) |
| IA | Google Gemini API |
| Animações | Anime.js 4 |
| Notificações | Sonner |
| Deploy | Vercel |

---

## Estrutura do Projeto

```
paraiso-dashboard/
├── app/
│   ├── login/                    # Página de autenticação
│   ├── dashboard/
│   │   ├── layout.tsx            # Auth guard (Server) + sidebar + header
│   │   ├── home/                 # Visão geral + relatórios IA
│   │   ├── suites/               # Monitoramento ao vivo
│   │   ├── caixa/                # Receita e turnos
│   │   └── auditoria/            # Log de operações
│   └── api/ai/generate/          # Endpoint de geração de relatórios (Gemini)
├── components/
│   ├── ui/                       # shadcn/ui base components
│   ├── ai-reports/               # Componentes de relatório IA
│   ├── suite-card.tsx            # Card individual de suíte
│   ├── suite-grid.tsx            # Grid com realtime
│   ├── kpi-card.tsx              # Card de KPI
│   ├── revenue-chart.tsx         # AreaChart de receita
│   ├── shift-table.tsx           # Tabela de turnos
│   ├── audit-table.tsx           # Tabela de auditoria
│   ├── sidebar.tsx               # Navegação desktop
│   ├── bottom-nav.tsx            # Navegação mobile
│   ├── header.tsx                # Header com realtime dot + alertas
│   ├── realtime-dot.tsx          # Indicador de conexão ao vivo
│   └── alert-badge.tsx           # Badge de alertas pendentes
├── lib/
│   ├── supabase/
│   │   ├── client.ts             # Cliente browser
│   │   ├── server.ts             # Cliente server (cookies)
│   │   └── middleware.ts         # Cliente edge
│   ├── queries/                  # Queries tipadas por domínio
│   └── utils.ts                  # cn(), formatBRL(), formatDate()...
├── types/
│   └── dashboard.ts              # Todos os tipos do domínio
├── middleware.ts                 # Proteção de rotas (Edge)
└── vercel.json                   # Configuração de cron jobs
```

---

## Views do Banco de Dados

O dashboard depende das seguintes **views** criadas no Supabase:

| View | Descrição |
|------|-----------|
| `v_suites_live` | JOIN suites + stays + profiles com `minutos_ocupada` |
| `v_receita_hoje` | Totais do dia: confirmado, pendente, abertos, voids |
| `v_turnos_ativos` | Shifts dos últimos 7 dias com receita e atendimentos |
| `v_alertas_pendentes` | Suítes >4h, divergências de caixa, voids excessivos |

**Realtime** habilitado nas tabelas: `suites`, `stays`, `audit_log`, `shifts`, `inventory`

> O Realtime escuta as **tabelas** (não as views). Ao detectar mudança, o frontend rebusca a view completa.

---

## Configuração Local

### Pré-requisitos

- Node.js 20+
- Conta e projeto no [Supabase](https://supabase.com)
- (Opcional) Chave da [Google Gemini API](https://aistudio.google.com) para relatórios IA

### 1. Clone e instale

```bash
git clone https://github.com/armitagethird/Dashboard-Para-Conex-o-de-Banco-de-dados.git
cd Dashboard-Para-Conex-o-de-Banco-de-dados
npm install
```

### 2. Configure as variáveis de ambiente

Crie um arquivo `.env.local` na raiz do projeto:

```env
# Supabase — obrigatório
NEXT_PUBLIC_SUPABASE_URL=https://SEU_PROJETO.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_anon_key_aqui

# Google Gemini — necessário apenas para relatórios IA
GEMINI_API_KEY=sua_gemini_key_aqui

# Cron secret — protege o endpoint de geração de relatórios
CRON_SECRET=uma_string_aleatoria_longa_aqui
```

> **Nunca** comite o `.env.local`. Ele já está no `.gitignore`.

### 3. Crie as views no Supabase

Execute os scripts SQL das views (`v_suites_live`, `v_receita_hoje`, `v_turnos_ativos`, `v_alertas_pendentes`) no **SQL Editor** do Supabase.

Habilite o Realtime para as tabelas:

```sql
ALTER TABLE suites REPLICA IDENTITY FULL;
ALTER TABLE stays REPLICA IDENTITY FULL;
ALTER TABLE audit_log REPLICA IDENTITY FULL;
ALTER TABLE shifts REPLICA IDENTITY FULL;

ALTER PUBLICATION supabase_realtime ADD TABLE suites, stays, audit_log, shifts;
```

### 4. Execute

```bash
npm run dev
```

Acesse [http://localhost:3000](http://localhost:3000) — você será redirecionado para `/login`.

---

## Deploy na Vercel

1. Importe o repositório na [Vercel](https://vercel.com/new)
2. Adicione as variáveis de ambiente no painel (Settings → Environment Variables)
3. O `vercel.json` já configura os **cron jobs** automáticos para relatórios IA

```json
{
  "crons": [
    { "path": "/api/ai/generate", "schedule": "0 11 * * *"  },
    { "path": "/api/ai/generate", "schedule": "0 12 * * 1"  },
    { "path": "/api/ai/generate", "schedule": "0 13 1 * *"  }
  ]
}
```

---

## Design System

| Token | Valor | Uso |
|-------|-------|-----|
| `--bg-base` | `#080809` | Fundo principal |
| `--bg-surface` | `#111113` | Cards e painéis |
| `--red-400` | `#C41E20` | Cor de destaque principal |
| `--text-primary` | `#F0E6D0` | Texto principal (creme) |
| `--status-livre` | `#22C55E` | Suíte disponível |
| `--status-ocupada` | `#C41E20` | Suíte em uso |
| `--status-limpeza` | `#F59E0B` | Em limpeza |
| `--status-manutencao` | `#6366F1` | Em manutenção |

**Fontes:** Geist Sans (interface) + Geist Mono (números e dados)

**Animações:** pulse do realtime dot · flash de card ao atualizar · skeleton shine · fade-in + slide-up no login · hover 150ms na sidebar

---

## Segurança

- Dashboard é **estritamente somente leitura** — nenhuma operação de escrita no banco
- `service_role` nunca exposto no frontend
- Acesso restrito por `role = 'owner'` verificado em duas camadas (Edge + Server)
- Todas as rotas do dashboard têm `robots: noindex`

---

## Licença

Projeto proprietário — uso interno. Não licenciado para redistribuição.

---

<div align="center">
  <sub>Construído com Next.js 16 · Supabase · TypeScript · Tailwind CSS</sub>
</div>
