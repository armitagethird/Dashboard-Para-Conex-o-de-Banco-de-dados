import type { ReportData, SituacaoAtual } from '@/types/ai-reports'

export const SYSTEM_INSTRUCTION = `
Você é o assistente pessoal de gestão do Paraíso Motel. Seu trabalho é analisar os dados do sistema e escrever relatórios em português brasileiro claro, direto e humano — como se um gerente de confiança de muitos anos estivesse explicando o movimento ao dono pessoalmente, numa conversa informal.

REGRAS INEGOCIÁVEIS DE ESCRITA:
- Escreva como uma pessoa fala, não como um robô. Evite frases genéricas como "O período analisado apresentou...".
- JAMAIS mencione termos técnicos: audit_log, payment_status, UUID, database, API, tabela, campo, JSON, null. O dono não sabe e não precisa saber o que são.
- Use o vocabulário do motel: "atendimento", "entrada de hóspede", "fechamento de turno", "sangria", "troco", "frigobar", "suíte".
- Quando for bom, celebre. Quando for preocupante, seja direto e claro — sem alarmismo, mas sem esconder.
- Valores sempre em reais: R$ 1.234,56 (ponto para milhar, vírgula para decimal).
- Parágrafos curtos. O dono lê no celular.
- Use emojis com moderação — só onde ajudam a escanear a leitura. Não em todo parágrafo.
- Se não houver anomalias, diga isso claramente — é uma boa notícia e merece ser destacada.
- NUNCA invente dados. Se um dado não foi fornecido, não mencione aquele assunto.
- O relatório deve terminar com algo útil: uma observação, uma recomendação, um ponto de atenção para o próximo período.
Quando houver suítes ainda em uso no momento da geração:
- Mencione de forma natural no início ou ao final do relatório, nunca como um aviso grave.
- Use linguagem casual: "No momento, ainda tem X suíte(s) ocupada(s) aguardando saída."
- Se a receita do período parece baixa mas há suítes em aberto, explique que parte da receita ainda está em andamento — não deixe o dono pensar que foi um dia ruim sem motivo.
- Não liste detalhes de cada suíte — só o total e o valor em aberto é suficiente.
`.trim()

function buildSituacaoAtualBloco(s: SituacaoAtual): string {
  if (!s.temStaysAbertas) {
    return 'SITUAÇÃO ATUAL:\nNenhuma suíte em uso no momento da geração deste relatório.'
  }

  const linhas = s.suitesEmUso.map((suite) => {
    const horas = Math.floor(suite.minutosAberta / 60)
    const mins = suite.minutosAberta % 60
    const tempo = horas > 0 ? `${horas}h${mins > 0 ? ` ${mins}min` : ''}` : `${mins}min`
    const valor = suite.valorEsperado != null ? ` · valor: ${brl(suite.valorEsperado)}` : ''
    return `- Suíte ${suite.numero} (${suite.tipo}): em uso há ${tempo}${valor}`
  })

  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  return [
    `SITUAÇÃO ATUAL (${hora}, momento da geração):`,
    `${s.totalEmUso} suíte${s.totalEmUso > 1 ? 's' : ''} ainda em uso — checkout pendente.`,
    `Receita em aberto (ainda não fechada): ${brl(s.receitaEmAberto)}`,
    ...linhas,
  ].join('\n')
}

function brl(value: number): string {
  return `R$ ${value
    .toFixed(2)
    .replace('.', ',')
    .replace(/\B(?=(\d{3})+(?!\d))/g, '.')}`
}

function pct(value: number): string {
  return `${value.toFixed(1).replace('.', ',')}%`
}

export function buildDailyPrompt(data: ReportData, referenceDate: Date): string {
  const diaSemana = referenceDate.toLocaleDateString('pt-BR', { weekday: 'long' })
  const dataFull = referenceDate.toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  })

  const pagamentos =
    Object.entries(data.distribuicaoPagamento)
      .map(([forma, qtd]) => `${forma}: ${qtd}x`)
      .join(' · ') || 'nenhum pagamento confirmado'

  const equipeLinhas =
    data.turnos.length === 0
      ? 'Nenhum turno registrado neste dia.'
      : data.turnos
          .map((t) => {
            const divStr =
              t.diferenca !== null && Math.abs(t.diferenca) > 0
                ? ` ⚠ DIFERENÇA DE CAIXA: ${brl(Math.abs(t.diferenca))} ${t.diferenca < 0 ? 'a menos' : 'a mais'}`
                : ' ✓ caixa fechou certinho'
            const status = t.fim ? 'turno encerrado' : 'ainda em andamento'
            return `- ${t.funcionario} (${status})${divStr}`
          })
          .join('\n')

  const cancelamentosStr =
    data.voidsPorFuncionario.length === 0
      ? 'Nenhum atendimento cancelado no dia.'
      : data.voidsPorFuncionario
          .map(
            (v) =>
              `- ${v.nome}: ${v.quantidade} cancelamento${v.quantidade > 1 ? 's' : ''}`
          )
          .join('\n')

  const estoqueStr =
    data.itensAbaixoMinimo.length === 0
      ? 'Estoque em dia, nada precisando de reposição.'
      : data.itensAbaixoMinimo
          .map(
            (i) =>
              `- ${i.nome}: ${i.qtdAtual} restantes (mínimo recomendado: ${i.minimo})`
          )
          .join('\n')

  const alertas: string[] = []
  if (data.cancelamentosExcessivos) {
    alertas.push(
      '⚠ ATENÇÃO IMPORTANTE: Há funcionário(s) com 3 ou mais cancelamentos hoje. Isso foge muito do normal — mencione com destaque e recomende investigar.'
    )
  }
  if (data.turnosComDivergencia > 0) {
    alertas.push(
      `⚠ ATENÇÃO: ${data.turnosComDivergencia} turno(s) fecharam com diferença de caixa. Mencione o nome do funcionário e o valor exato.`
    )
  }
  if (data.itensAbaixoMinimo.length > 0) {
    alertas.push('⚠ Itens abaixo do estoque mínimo — recomende providenciar reposição.')
  }

  return `
Escreva o RELATÓRIO DIÁRIO do Paraíso Motel referente a ${diaSemana}, ${dataFull}.

ESTRUTURA (siga esta ordem, sem usar títulos de seção visíveis — escreva como texto corrido):
1. Abrir com uma saudação rápida e o resumo do dia em 1-2 frases
2. Movimento do dia: quantos atendimentos, receita, formas de pagamento
3. Equipe e caixa: quem trabalhou e como foi o fechamento
4. Cancelamentos (se houver — dar contexto)
5. Estoque (só mencionar se houver alerta)
6. Fechar com avaliação curta do dia e, se pertinente, uma recomendação

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DO DIA:

MOVIMENTO:
- Atendimentos abertos hoje: ${data.totalAtendimentos}
- Concluídos: ${data.atendimentosConcluidos}
- Cancelados: ${data.atendimentosVoidados}
- Receita confirmada: ${brl(data.receitaConfirmada)}
- Receita pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento usadas hoje: ${pagamentos}

SUÍTES MAIS MOVIMENTADAS:
${
  data.suitesMaisUsadas.length > 0
    ? data.suitesMaisUsadas
        .map(
          (s) =>
            `- Suíte ${s.numero} (${s.tipo}): ${s.atendimentos} entrada${s.atendimentos > 1 ? 's' : ''}`
        )
        .join('\n')
    : '- Dados não disponíveis'
}

EQUIPE E CAIXA:
${equipeLinhas}

CANCELAMENTOS:
${cancelamentosStr}

ESTOQUE:
${estoqueStr}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva o relatório agora. Linguagem humana, texto corrido, parágrafos curtos.
`.trim()
}

export function buildWeeklyPrompt(data: ReportData): string {
  const inicio = new Date(data.periodStart).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })
  const fim = new Date(data.periodEnd).toLocaleDateString('pt-BR', {
    day: 'numeric',
    month: 'long',
  })

  const txCancelamento =
    data.totalAtendimentos > 0
      ? pct((data.atendimentosVoidados / data.totalAtendimentos) * 100)
      : '0%'

  const equipeResume =
    data.turnos.length === 0
      ? 'Nenhum turno registrado na semana.'
      : data.turnos
          .map((t) => {
            const div =
              t.diferenca !== null && Math.abs(t.diferenca) > 0
                ? ` | diferença de caixa: ${brl(Math.abs(t.diferenca))}`
                : ' | caixa OK'
            return `- ${t.funcionario}${div}`
          })
          .join('\n')

  const alertas: string[] = []
  if (data.cancelamentosExcessivos) {
    alertas.push(
      '⚠ PADRÃO SUSPEITO: Um ou mais funcionários com 3+ cancelamentos na semana. Analise com atenção e recomende ação concreta ao dono.'
    )
  }
  if (data.turnosComDivergencia >= 2) {
    alertas.push(
      `⚠ RECORRÊNCIA: ${data.turnosComDivergencia} turnos com diferença de caixa na mesma semana. Recomende revisão do processo de fechamento.`
    )
  }

  return `
Escreva o RELATÓRIO SEMANAL do Paraíso Motel referente ao período de ${inicio} a ${fim}.

ESTRUTURA:
1. Balanço geral da semana (2-3 frases de abertura)
2. Receita e movimento: foi uma boa semana? O ritmo foi constante?
3. Análise da equipe: quem se destacou, quem teve problemas
4. Suítes: quais mais trabalharam, taxa de ocupação
5. Pontos de atenção (se houver anomalias)
6. Recomendações práticas para a próxima semana (pelo menos 1)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DA SEMANA:

FINANCEIRO:
- Total de atendimentos: ${data.totalAtendimentos}
- Concluídos: ${data.atendimentosConcluidos} | Cancelados: ${data.atendimentosVoidados} (${txCancelamento})
- Receita confirmada: ${brl(data.receitaConfirmada)}
- Receita pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento: ${Object.entries(data.distribuicaoPagamento)
    .map(([f, q]) => `${f}: ${q}x`)
    .join(' · ') || '—'}

EQUIPE (${data.turnos.length} turnos na semana):
${equipeResume}
- Turnos com diferença de caixa: ${data.turnosComDivergencia}

CANCELAMENTOS POR FUNCIONÁRIO:
${
  data.voidsPorFuncionario.length > 0
    ? data.voidsPorFuncionario
        .map(
          (v) =>
            `- ${v.nome}: ${v.quantidade} cancelamento${v.quantidade > 1 ? 's' : ''}`
        )
        .join('\n')
    : '- Nenhum cancelamento na semana ✓'
}

SUÍTES:
- Mais usadas: ${
  data.suitesMaisUsadas
    .map((s) => `Suíte ${s.numero} (${s.tipo}): ${s.atendimentos}x`)
    .join(' · ') || '—'
}
- Taxa de ocupação atual: ${pct(data.taxaOcupacao)}

ESTOQUE:
- Movimentações na semana: ${data.movimentacoesEstoque}
- Itens abaixo do mínimo: ${
  data.itensAbaixoMinimo.length > 0
    ? data.itensAbaixoMinimo
        .map((i) => `${i.nome} (${i.qtdAtual}/${i.minimo})`)
        .join(', ')
    : 'nenhum ✓'
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva um relatório rico, analítico e útil. O dono precisa entender a semana de forma clara.
`.trim()
}

export function buildMonthlyPrompt(data: ReportData): string {
  const mesAno = new Date(data.periodStart).toLocaleDateString('pt-BR', {
    month: 'long',
    year: 'numeric',
  })

  const txCancelamento =
    data.totalAtendimentos > 0
      ? pct((data.atendimentosVoidados / data.totalAtendimentos) * 100)
      : '0%'

  const alertas: string[] = []
  if (data.cancelamentosExcessivos) {
    alertas.push(
      '⚠ AÇÃO NECESSÁRIA: Padrão de cancelamentos excessivos identificado no mês. Proponha uma conversa com os envolvidos e descreva um plano de acompanhamento.'
    )
  }
  if (data.turnosComDivergencia > 3) {
    alertas.push(
      '⚠ PROBLEMA SISTÊMICO: Mais de 3 divergências de caixa no mês. Sugira uma revisão completa do processo de fechamento e conferência dupla.'
    )
  }
  if (data.itensAbaixoMinimo.length > 2) {
    alertas.push(
      '⚠ ESTOQUE: Múltiplos itens abaixo do mínimo. Sugira uma revisão das quantidades mínimas configuradas e um pedido de reposição urgente.'
    )
  }

  return `
Escreva o RELATÓRIO MENSAL do Paraíso Motel referente a ${mesAno}.

Este é o relatório mais importante do mês. O dono usa ele para tomar decisões estratégicas sobre o negócio — equipe, estoque, preços, operação.

ESTRUTURA:
1. Resumo executivo do mês (3-4 frases que capturam a essência)
2. Desempenho financeiro: receita, ticket médio, evolução, formas de pagamento
3. Operação: ocupação das suítes, quais mais renderam, padrões
4. Equipe: desempenho, confiabilidade, pontos de atenção (direto e concreto)
5. Estoque: o que consumiu mais, o que precisa de atenção
6. Anomalias e padrões do mês (se houver — análise profunda)
7. Pontos positivos do mês (celebrar o que foi bem)
8. Ações recomendadas para o próximo mês (pelo menos 2 concretas)

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DO MÊS:

FINANCEIRO:
- Atendimentos no mês: ${data.totalAtendimentos}
- Concluídos: ${data.atendimentosConcluidos} | Cancelados: ${data.atendimentosVoidados} (${txCancelamento})
- Receita total confirmada: ${brl(data.receitaConfirmada)}
- Receita pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento preferidas: ${
  Object.entries(data.distribuicaoPagamento)
    .map(([f, q]) => `${f}: ${q}x`)
    .join(' · ') || '—'
}

OPERACIONAL:
- Turnos trabalhados: ${data.turnos.length}
- Turnos com diferença de caixa: ${data.turnosComDivergencia}
- Taxa de ocupação atual: ${pct(data.taxaOcupacao)} (${data.suitesOcupadas} de ${data.suitesTotais} suítes)
- Suítes mais usadas: ${
  data.suitesMaisUsadas
    .map((s) => `Suíte ${s.numero}: ${s.atendimentos}x`)
    .join(' · ') || '—'
}

EQUIPE — CANCELAMENTOS NO MÊS:
${
  data.voidsPorFuncionario.length > 0
    ? data.voidsPorFuncionario
        .map(
          (v) =>
            `- ${v.nome}: ${v.quantidade} cancelamento${v.quantidade > 1 ? 's' : ''}`
        )
        .join('\n')
    : '- Sem cancelamentos ✓'
}

ESTOQUE:
- Movimentações no mês: ${data.movimentacoesEstoque}
- Itens que precisam de reposição: ${
  data.itensAbaixoMinimo.length > 0
    ? data.itensAbaixoMinimo
        .map((i) => `${i.nome} (atual: ${i.qtdAtual}, mínimo: ${i.minimo})`)
        .join(', ')
    : 'nenhum — estoque em dia ✓'
}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva um relatório gerencial completo. Rico, analítico, útil. Português humano.
`.trim()
}
