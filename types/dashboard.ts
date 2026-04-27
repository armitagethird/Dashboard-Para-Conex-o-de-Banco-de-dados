export type SuiteStatus = 'free' | 'occupied' | 'cleaning' | 'maintenance'
export type UserRole = 'receptionist' | 'manager' | 'owner'
export type PaymentStatus = 'pending' | 'confirmed' | 'failed' | 'voided'
export type AlertaSeveridade = 'critica' | 'alta' | 'media' | 'baixa'
export type AlertaTipo =
  | 'divergencia_caixa'
  | 'void_realizado'
  | 'suite_longa'
  | 'void_excessivo'
  | 'estoque_divergente'
  | 'pernoite_overtime'

export interface SuitePrecos {
  '3h'?: number
  '6h'?: number
  '12h'?: number
  pernoite?: number
  [key: string]: number | undefined
}

export interface SuiteLive {
  id: string
  numero: number
  tipo: string
  status: SuiteStatus
  precos: SuitePrecos
  stay_id?: string | null
  opened_at?: string | null
  payment_method?: string | null
  funcionario_nome?: string | null
  minutos_ocupada?: number | null
  minutos_no_status_atual: number
  // Vindos da view v_suites_live (alias PT em cima de stays.type / stays.price).
  // Necessários para calcular cobrança em tempo real (preço base + adicional).
  // Opcionais para degradar graciosamente se a view ainda não os expõe.
  modalidade?: string | null
  valor_base?: number | null
}

export interface ReceitaItem {
  payment_method: string
  quantidade: number
  total: number
}

export interface ReceitaAgregada {
  total: number
  quantidade: number
  por_metodo: ReceitaItem[]
}

export interface TurnoAtivo {
  id: string
  started_at: string
  funcionario: string
  role: string
  stays_no_turno: number
  caixa_parcial: number
}

export interface AlertaPendente {
  tipo: AlertaTipo
  referencia_id: string
  descricao: string
  gerado_em: string
  severidade: AlertaSeveridade
}

// Histórico de uma stay (para o painel de detalhes da suíte).
export interface StayHistorico {
  id: string
  opened_at: string
  closed_at: string | null
  type: string | null
  price: number | null
  extra_value: number | null
  pre_pernoite_value: number | null
  payment_status: string | null
  payment_method: string | null
  void_approved_by: string | null
  void_reason: string | null
  expected_checkout_at: string | null
  opened_by_name: string | null
  closed_by_name: string | null
}

// Item consumido durante uma stay (frigobar/cardápio).
export interface ConsumoItem {
  id: string
  nome: string
  quantidade: number
  reason: string | null
  created_at: string
}

export interface SuiteDetalhes {
  staysHoje: StayHistorico[]
  consumo: ConsumoItem[]
  receitaHoje: number
  expectedCheckoutAt: string | null
}

export interface AuditLogEntry {
  id: string
  table_name: string
  operation: string
  record_id?: string
  user_id?: string
  old_data?: Record<string, unknown>
  new_data?: Record<string, unknown>
  metadata?: Record<string, unknown>
  created_at: string
  profiles?: { name: string }
}

export interface DashboardUser {
  id: string
  name: string
  role: UserRole
  email: string
}
