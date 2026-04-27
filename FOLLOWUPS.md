# Follow-ups — Reconciliação Kiosk v1.1.1

**Última atualização:** 25/04/2026
**Commit que fechou o lote principal:** `7c5cd4a` em `main`

---

## Contexto

O app de recepção (kiosk) foi atualizado para a v1.1.1 com nova regra de cobrança:

- **Antes:** pernoite (R$90 fixo, 00:00–06:00) não cobrava nada após 06:00, só sinalizava `pernoiteState='overtime'`.
- **Agora:** pernoite cobra R$15 por hora iniciada após 06:00 (sem tolerância — 06:01 = 1h). Mesma fórmula da estadia 2h. Valor é gravado em `stays.extra_value` no checkout.

Fórmula:
```
extra_hours = ceil((now − expected_checkout_at) / 3_600_000)  -- quando now > expected_checkout_at
extra_value = extra_hours × 15
```

Vale para ambas as modalidades (pernoite e estadia).

---

## ✅ O que foi feito (commit `7c5cd4a`)

### Cobrança em tempo real

| Arquivo | Mudança |
|---|---|
| `lib/billing.ts` | `PernoiteState` ganha `horasOvertime` + `valorOvertime`. Fase `'expirado'` aplica `ceil((now - checkoutAt)/3600000) × 15`. `calcCobranca` soma overtime no total. |
| `components/suite-card.tsx` | Banner "Pernoite em overtime" com R$ crescendo a cada hora cheia pós-06:00 |
| `components/suite-detail-sheet.tsx` | Linhas separadas pra pré-pernoite e pós-checkout no breakdown |

### Receita

| Arquivo | Mudança |
|---|---|
| `lib/queries/revenue.ts` | `getReceitaHoje` reescrito lendo `stays` direto (não depende mais da view). Chart por hora soma `extra_value`. |
| `lib/queries/home.ts` | KPI da home soma `price + extra_value` |
| `app/api/ai/_lib/data-fetcher.ts` | `receitaConfirmada`, `receitaPendente`, `receitaEmAberto`, `valorEsperado` incluem `extra_value` |

### Tipos

| Arquivo | Mudança |
|---|---|
| `types/dashboard.ts` | `AlertaTipo` aceita `'pernoite_overtime'` |

### Banco (aplicado direto no Supabase via SQL Editor)

```sql
-- v_receita_hoje
CREATE OR REPLACE VIEW v_receita_hoje AS
SELECT payment_method,
       count(*) AS quantidade,
       sum(price + COALESCE(extra_value, 0)) AS total
FROM stays
WHERE payment_status = 'confirmed' AND closed_at >= CURRENT_DATE
GROUP BY payment_method;

-- v_alertas_pendentes (terceiro UNION ALL adicionado)
CREATE OR REPLACE VIEW v_alertas_pendentes AS
SELECT 'divergencia_caixa'::text AS tipo, ... -- inalterado
UNION ALL
SELECT 'void_realizado'::text AS tipo, ...    -- inalterado
UNION ALL
SELECT 'pernoite_overtime'::text AS tipo,
       st.id AS referencia_id,
       ('Suíte ' || s.number::text || ' passou do checkout — '
        || CEIL(EXTRACT(epoch FROM (now() - st.expected_checkout_at)) / 3600)::text
        || 'h adicional (R$'
        || (CEIL(EXTRACT(epoch FROM (now() - st.expected_checkout_at)) / 3600) * 15)::text
        || ')') AS descricao,
       st.expected_checkout_at AS gerado_em,
       'alta'::text AS severidade
FROM stays st
JOIN suites s ON s.id = st.suite_id
WHERE st.type = 'pernoite'
  AND st.closed_at IS NULL
  AND st.void_approved_by IS NULL
  AND st.expected_checkout_at IS NOT NULL
  AND now() > st.expected_checkout_at;
```

---

## 🟡 Pendente — Refator opcional: usar `expected_checkout_at` da view

**Descoberta surpresa nesta sessão:** a view `v_suites_live` **já expõe** `st.expected_checkout_at`. O `lib/billing.ts:60-67` deriva manualmente "próximas 06:00" — refatorar pra ler do campo da view ganha:

- Robustez se algum dia o kiosk permitir checkout custom de pernoite
- Menos código, menos chance de bug em casos extremos

**Como fazer:**
1. Adicionar `expected_checkout_at?: string | null` em `SuiteLive` (`types/dashboard.ts:20`)
2. Passar pra `useCobranca` (`lib/hooks/use-cobranca.ts`)
3. Em `calcCobranca`, se `expected_checkout_at` presente, usar como `checkoutAt` direto — fallback pra derivação atual se NULL (compat com stays antigas)

Tamanho estimado: ~30min de trabalho + tsc + commit.

---

## 🔵 Pendente — Decisão de produto: tela de detalhe de stay fechada

**Problema:** hoje só dá pra ver `extra_value` de uma stay fechada via JSON cru no `audit_log` (`/dashboard/auditoria`). Sem breakdown amigável de `price + extra_value + pre_pernoite_value`.

**Opções:**
- **A) Sheet de detalhe ao clicar em linha do `audit-table`** — menor custo, reusa estrutura existente
- **B) Rota nova `/dashboard/stays/[id]` com timeline e breakdown completo** — mais completo, custo médio
- **C) Deixar como está** se o uso de inspecionar stay fechada é raro

Romero precisa decidir qual antes do código rodar.

---

## ⚪ Registrar (sem ação imediata)

**`payment_status` `'void'` vs tipo TS `'voided'`**

A view `v_alertas_pendentes` filtra `payment_status = 'void'` (singular), mas o tipo `PaymentStatus` em `types/dashboard.ts:3` lista `'voided'`. Hoje nenhum código compara contra essas strings, então não quebra nada. Se um dia o tipo for usado em comparação, padronizar com o valor real do banco.

---

## 🧪 Smoke test pós-deploy

Quando o Vercel terminar o build do commit `7c5cd4a`:

1. **Vercel Dashboard** → confirmar que o build ficou verde
2. **Login → `/dashboard/suites`** → se houver pernoite que passou de 06:00, conferir que o card mostra "Pernoite em overtime" com R$ crescendo
3. **`/dashboard/caixa`** → KPI "Receita de hoje" deve incluir `extra_value` em qualquer stay confirmada hoje
4. **Botão "Gerar relatório IA"** na home → receita confirmada deve bater com `SUM(price + extra_value)` no banco

Se não tiver pernoite em overtime ao vivo agora, dá pra forçar uma stay de teste com `extra_value > 0` no banco e confirmar visualmente que a receita do dia subiu.

---

## 📌 Pendências antigas que continuam abertas (de `project_pendencias_abril26.md`)

- 🔴 **Rotacionar `service_role` key do Supabase** — bloqueador de segurança da sessão de 24/04. Manualmente no Supabase Dashboard → Settings → API → Reset.
- 🟡 Validar relatórios IA novos com receita real
- 🟡 Teste de check-in real via sistema do motel
