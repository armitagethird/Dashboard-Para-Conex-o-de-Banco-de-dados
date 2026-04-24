export const METHOD_LABEL: Record<string, string> = {
  cash: 'Dinheiro',
  card: 'Cartão',
  pix:  'Pix',
}

export function formatPaymentMethod(pm: string | null | undefined): string {
  if (!pm) return '—'
  return METHOD_LABEL[pm] ?? pm.charAt(0).toUpperCase() + pm.slice(1)
}
