// Lógica de cobrança em tempo real — espelha o sistema principal do motel.
// Regras (alinhadas com kiosk v1.1.1):
//   - Preço base cobre as primeiras 2 horas.
//   - Adicional: R$15 por hora iniciada após o tempo base.
//   - Pernoite tem checkout fixo às 06:00. Horas antes da meia-noite contam
//     como adicional (R$15/h, hora iniciada). Entre meia-noite e 06:00 o
//     valor trava. Após 06:00 volta a cobrar R$15 por hora iniciada
//     (mesma fórmula do horista). Alerta visual quando faltar ≤30min.

export const HORAS_INCLUIDAS = 2
export const VALOR_HORA_ADICIONAL = 15
export const PERNOITE_CHECKOUT_HOUR = 6
export const PERNOITE_ALERT_MINUTES = 30

const MS_HORA = 60 * 60 * 1000
const MS_MIN = 60 * 1000

export function isPernoite(stayType: string | null | undefined): boolean {
  return stayType === 'pernoite'
}

function horasIniciadas(openedAt: Date, now: Date): number {
  const ms = now.getTime() - openedAt.getTime()
  if (ms <= 0) return 0
  return Math.ceil(ms / MS_HORA)
}

export interface AdicionalHorista {
  horasIniciadas: number
  horasExtras: number
  valor: number
}

export function calcAdicionalHorista(openedAt: Date, now: Date): AdicionalHorista {
  const horas = horasIniciadas(openedAt, now)
  const horasExtras = Math.max(0, horas - HORAS_INCLUIDAS)
  return {
    horasIniciadas: horas,
    horasExtras,
    valor: horasExtras * VALOR_HORA_ADICIONAL,
  }
}

export type PernoiteFase = 'pre' | 'ativo' | 'expirando' | 'expirado'

export interface PernoiteState {
  fase: PernoiteFase
  // Hora cheia do checkout fixo (sempre 06:00 do dia da virada).
  checkoutAt: Date
  // Pré-pernoite (horas iniciadas antes da meia-noite). Trava ao cruzar 00:00.
  horasPreMidnight: number
  valorPreMidnight: number
  // Tempo restante até checkout (após meia-noite).
  msAteCheckout: number
  // True quando faltam ≤30min para o checkout.
  alertaProximoCheckout: boolean
  // Horas iniciadas após o checkout fixo (06:00). Só cresce na fase 'expirado'.
  horasOvertime: number
  valorOvertime: number
}

export function calcPernoiteState(openedAt: Date, now: Date): PernoiteState {
  // Determina o checkout fixo às 06:00. Se a stay foi aberta na madrugada
  // (antes de 06:00), o checkout é hoje; caso contrário, amanhã.
  const checkoutAt = new Date(openedAt)
  if (openedAt.getHours() < PERNOITE_CHECKOUT_HOUR) {
    checkoutAt.setHours(PERNOITE_CHECKOUT_HOUR, 0, 0, 0)
  } else {
    checkoutAt.setDate(checkoutAt.getDate() + 1)
    checkoutAt.setHours(PERNOITE_CHECKOUT_HOUR, 0, 0, 0)
  }

  // Meia-noite da virada = checkout - 6h.
  const midnight = new Date(checkoutAt.getTime() - PERNOITE_CHECKOUT_HOUR * MS_HORA)

  // Adicional pré-pernoite: das horas decorridas entre opened_at e meia-noite.
  // Trava no momento em que cruza a meia-noite.
  const fimPreMidnight = now < midnight ? now : midnight
  const msPre = fimPreMidnight.getTime() - openedAt.getTime()
  const horasPre = msPre > 0 ? Math.ceil(msPre / MS_HORA) : 0
  const valorPre = horasPre * VALOR_HORA_ADICIONAL

  if (now < midnight) {
    return {
      fase: 'pre',
      checkoutAt,
      horasPreMidnight: horasPre,
      valorPreMidnight: valorPre,
      msAteCheckout: checkoutAt.getTime() - now.getTime(),
      alertaProximoCheckout: false,
      horasOvertime: 0,
      valorOvertime: 0,
    }
  }

  if (now >= checkoutAt) {
    // Pós-checkout: cobra R$15 por hora iniciada (sem tolerância — 06:01 = 1h).
    const msOver = now.getTime() - checkoutAt.getTime()
    const horasOver = msOver > 0 ? Math.ceil(msOver / MS_HORA) : 0
    return {
      fase: 'expirado',
      checkoutAt,
      horasPreMidnight: horasPre,
      valorPreMidnight: valorPre,
      msAteCheckout: 0,
      alertaProximoCheckout: false,
      horasOvertime: horasOver,
      valorOvertime: horasOver * VALOR_HORA_ADICIONAL,
    }
  }

  const msAteCheckout = checkoutAt.getTime() - now.getTime()
  const alerta = msAteCheckout <= PERNOITE_ALERT_MINUTES * MS_MIN

  return {
    fase: alerta ? 'expirando' : 'ativo',
    checkoutAt,
    horasPreMidnight: horasPre,
    valorPreMidnight: valorPre,
    msAteCheckout,
    alertaProximoCheckout: alerta,
    horasOvertime: 0,
    valorOvertime: 0,
  }
}

export interface Cobranca {
  precoBase: number
  adicional: number
  total: number
  isPernoite: boolean
  pernoite?: PernoiteState
  horista?: AdicionalHorista
}

export function calcCobranca(args: {
  openedAt: Date
  now: Date
  stayType: string | null | undefined
  stayPrice: number | null | undefined
  precos: Record<string, number | undefined> | null | undefined
}): Cobranca {
  const { openedAt, now, stayType, stayPrice, precos } = args

  // Resolve preço base: stay_price (contratado) → precos[stay_type] →
  // menor pacote disponível → 0.
  let precoBase: number | null = stayPrice ?? null
  if (precoBase == null && stayType && precos) {
    precoBase = precos[stayType] ?? null
  }
  if (precoBase == null && precos) {
    precoBase = precos['2h'] ?? precos.pernoite ?? null
  }
  precoBase = precoBase ?? 0

  if (isPernoite(stayType)) {
    const p = calcPernoiteState(openedAt, now)
    const adicional = p.valorPreMidnight + p.valorOvertime
    return {
      precoBase,
      adicional,
      total: precoBase + adicional,
      isPernoite: true,
      pernoite: p,
    }
  }

  const adic = calcAdicionalHorista(openedAt, now)
  return {
    precoBase,
    adicional: adic.valor,
    total: precoBase + adic.valor,
    isPernoite: false,
    horista: adic,
  }
}

export function formatTempoRestante(ms: number): string {
  if (ms <= 0) return '0min'
  const totalMin = Math.floor(ms / MS_MIN)
  const h = Math.floor(totalMin / 60)
  const m = totalMin % 60
  return h > 0 ? `${h}h ${m}min` : `${m}min`
}
