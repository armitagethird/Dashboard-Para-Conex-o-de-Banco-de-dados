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

  const suiteTop = data.suitesMaisUsadas[0]
  const itemTop = data.itensMaisVendidos[0]

  const alertas: string[] = []
  if (data.cancelamentosExcessivos) {
    alertas.push('⚠ Funcionário(s) com 3+ cancelamentos — destaque e recomende investigar.')
  }
  if (data.turnosComDivergencia > 0) {
    alertas.push(`⚠ ${data.turnosComDivergencia} turno(s) com diferença de caixa — mencione nome e valor.`)
  }
  if (data.itensAbaixoMinimo.length > 0) {
    alertas.push('⚠ Itens abaixo do estoque mínimo — recomende reposição.')
  }

  return `
Escreva o RESUMO DIÁRIO do Paraíso Motel referente a ${diaSemana}, ${dataFull}.

FORMATO — OBRIGATÓRIO:
- Texto corrido, parágrafos curtos (máx. 3 linhas cada).
- Entre 3 e 5 parágrafos no total. Máximo 280 palavras.
- NÃO use títulos com ## ou #. NÃO use listas ou bullets.

CONTEÚDO — OBRIGATÓRIO MENCIONAR (com números exatos):
1. Receita confirmada do dia em R$ (valor exato fornecido abaixo).
2. Quantidade de atendimentos concluídos no dia.
3. Ticket médio em R$.
4. ${suiteTop ? `Suíte mais procurada hoje: Suíte ${suiteTop.numero} (${suiteTop.atendimentos} entrada${suiteTop.atendimentos > 1 ? 's' : ''}).` : 'Se houve movimento, cite a suíte com mais entradas.'}
5. ${itemTop ? `Item mais vendido do frigobar/cardápio: ${itemTop.nome} (${itemTop.quantidade} unidades).` : 'Se houve venda de itens, cite o mais pedido.'}
6. ${data.situacaoAtual.temStaysAbertas ? `Situação atual: ${data.situacaoAtual.totalEmUso} suíte(s) ainda em uso com receita em aberto de ${brl(data.situacaoAtual.receitaEmAberto)} — mencione isso no fechamento.` : 'Não há stays abertas agora.'}
7. Destaque da equipe: diferenças de caixa ou cancelamentos fora do padrão.
8. Um ponto de atenção para amanhã (se houver).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DO DIA:
- Atendimentos: ${data.totalAtendimentos} (concluídos: ${data.atendimentosConcluidos} · cancelados: ${data.atendimentosVoidados})
- Receita confirmada: ${brl(data.receitaConfirmada)} · pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento: ${pagamentos}
- Suítes mais procuradas: ${data.suitesMaisUsadas.map((s) => `Suíte ${s.numero} (${s.atendimentos}x)`).join(' · ') || 'sem dados'}
- Itens mais vendidos (frigobar/cardápio): ${data.itensMaisVendidos.map((i) => `${i.nome} (${i.quantidade})`).join(' · ') || 'sem vendas'}
- Turnos com diferença de caixa: ${data.turnosComDivergencia}
- Cancelamentos por funcionário: ${
    data.voidsPorFuncionario.length > 0
      ? data.voidsPorFuncionario.map((v) => `${v.nome} (${v.quantidade})`).join(', ')
      : 'nenhum ✓'
  }
- Estoque abaixo do mínimo: ${
    data.itensAbaixoMinimo.length === 0
      ? 'em dia'
      : data.itensAbaixoMinimo.map((i) => `${i.nome} ${i.qtdAtual}/${i.minimo}`).join(', ')
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva o resumo agora. Direto ao ponto — e cite OBRIGATORIAMENTE os 6 números/destaques da lista acima.
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

  const suiteTop = data.suitesMaisUsadas[0]
  const itemTop = data.itensMaisVendidos[0]

  const alertas: string[] = []
  if (data.cancelamentosExcessivos) {
    alertas.push('⚠ Funcionário(s) com 3+ cancelamentos na semana — padrão suspeito, recomende ação.')
  }
  if (data.turnosComDivergencia >= 2) {
    alertas.push(`⚠ ${data.turnosComDivergencia} turnos com diferença de caixa — recomende revisão do processo.`)
  }

  return `
Escreva o RESUMO SEMANAL do Paraíso Motel referente ao período de ${inicio} a ${fim}.

FORMATO — OBRIGATÓRIO:
- Texto corrido, parágrafos curtos (máx. 3 linhas).
- Entre 4 e 6 parágrafos. Máximo 420 palavras.
- NÃO use títulos com ## ou #. NÃO use listas.

CONTEÚDO — OBRIGATÓRIO MENCIONAR (com números exatos):
1. Receita total confirmada da semana em R$.
2. Total de atendimentos e taxa de cancelamento em %.
3. Ticket médio da semana em R$.
4. ${suiteTop ? `Suíte mais usada na semana: Suíte ${suiteTop.numero} (${suiteTop.atendimentos} atendimentos).` : 'Cite a suíte com mais atendimentos.'}
5. ${itemTop ? `Item mais vendido na semana: ${itemTop.nome} (${itemTop.quantidade} unidades).` : 'Se houve vendas, cite o item mais pedido.'}
6. Destaques de equipe (diferenças de caixa, cancelamentos).
7. Pelo menos 1 recomendação concreta para a próxima semana.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DA SEMANA:
- Atendimentos: ${data.totalAtendimentos} (concluídos: ${data.atendimentosConcluidos} · cancelados: ${data.atendimentosVoidados} = ${txCancelamento})
- Receita confirmada: ${brl(data.receitaConfirmada)} · pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento: ${Object.entries(data.distribuicaoPagamento).map(([f, q]) => `${f}: ${q}x`).join(' · ') || '—'}
- Turnos na semana: ${data.turnos.length} · com diferença de caixa: ${data.turnosComDivergencia}
- Cancelamentos por funcionário: ${
    data.voidsPorFuncionario.length > 0
      ? data.voidsPorFuncionario.map((v) => `${v.nome} (${v.quantidade})`).join(', ')
      : 'nenhum ✓'
  }
- Suítes mais usadas: ${data.suitesMaisUsadas.map((s) => `Suíte ${s.numero}: ${s.atendimentos}x`).join(' · ') || '—'}
- Itens mais vendidos: ${data.itensMaisVendidos.map((i) => `${i.nome} (${i.quantidade})`).join(' · ') || 'sem vendas'}
- Taxa de ocupação atual: ${pct(data.taxaOcupacao)}
- Estoque abaixo do mínimo: ${
    data.itensAbaixoMinimo.length > 0
      ? data.itensAbaixoMinimo.map((i) => `${i.nome} (${i.qtdAtual}/${i.minimo})`).join(', ')
      : 'nenhum ✓'
  }
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva o resumo agora. Cite OBRIGATORIAMENTE os 5 números-chave listados acima. O dono lê em 1 minuto.
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
    alertas.push('⚠ Padrão de cancelamentos excessivos no mês — proponha conversa com os envolvidos e plano de acompanhamento.')
  }
  if (data.turnosComDivergencia > 3) {
    alertas.push('⚠ Mais de 3 divergências de caixa no mês — sugira revisão do processo de fechamento e conferência dupla.')
  }
  if (data.itensAbaixoMinimo.length > 2) {
    alertas.push('⚠ Múltiplos itens de estoque abaixo do mínimo — revisão de quantidades mínimas e pedido urgente.')
  }

  return `
Escreva o RELATÓRIO MENSAL DETALHADO do Paraíso Motel referente a ${mesAno}.

Este é o documento mais importante do mês. O dono usa para decisões estratégicas — equipe, estoque, preços, operação.

FORMATO — OBRIGATÓRIO:
- Divida o relatório em 6 seções, cada uma iniciada com título em markdown usando duplo hashtag. Exatamente:

## Visão geral
## Receita e movimento
## Suítes mais usadas
## Turnos e divergências de caixa
## Estoque
## Anomalias e recomendações

- Cada seção deve ter entre 2 e 4 parágrafos curtos (máx. 4 linhas cada).
- Não use listas com bullet (-) ou numeradas. Escreva em texto corrido.
- Seja específico e analítico: mencione nomes, números, valores exatos, percentuais, comparativos.
- "Visão geral": 2-3 parágrafos que resumem o mês — receita total, ticket médio, volume, saúde geral do negócio.
- "Receita e movimento": detalhar padrão de receita, formas de pagamento preferidas, proporção concluídos/cancelados.
- "Suítes mais usadas": top suítes com números concretos e o que isso sugere (ocupação desbalanceada? Todas girando igual?).
- "Turnos e divergências de caixa": quantos turnos, divergências com nomes dos funcionários quando houver, padrão.
- "Estoque": cite o item mais vendido do frigobar/cardápio com quantidade exata, o que está abaixo do mínimo, itens críticos, movimentações.
- "Anomalias e recomendações": pontos de atenção do mês + pelo menos 3 ações concretas para o próximo mês.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
${buildSituacaoAtualBloco(data.situacaoAtual)}

DADOS DO MÊS:

FINANCEIRO:
- Atendimentos no mês: ${data.totalAtendimentos}
- Concluídos: ${data.atendimentosConcluidos} | Cancelados: ${data.atendimentosVoidados} (${txCancelamento})
- Receita total confirmada: ${brl(data.receitaConfirmada)}
- Receita pendente: ${brl(data.receitaPendente)}
- Ticket médio: ${brl(data.ticketMedio)}
- Formas de pagamento: ${
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
      .map((s) => `Suíte ${s.numero} (${s.tipo}): ${s.atendimentos}x`)
      .join(' · ') || '—'
  }

EQUIPE — TURNOS E CANCELAMENTOS:
${
  data.turnos.length > 0
    ? data.turnos
        .map((t) => {
          const div =
            t.diferenca !== null && Math.abs(t.diferenca) > 0
              ? ` — diferença ${brl(Math.abs(t.diferenca))} ${t.diferenca < 0 ? 'a menos' : 'a mais'}`
              : ''
          return `- ${t.funcionario}${div}`
        })
        .join('\n')
    : '- Nenhum turno registrado'
}

Cancelamentos por funcionário:
${
  data.voidsPorFuncionario.length > 0
    ? data.voidsPorFuncionario
        .map((v) => `- ${v.nome}: ${v.quantidade}`)
        .join('\n')
    : '- Sem cancelamentos ✓'
}

ESTOQUE:
- Movimentações no mês: ${data.movimentacoesEstoque}
- Itens mais vendidos do mês: ${
    data.itensMaisVendidos.length > 0
      ? data.itensMaisVendidos.map((i) => `${i.nome} (${i.quantidade})`).join(' · ')
      : 'sem vendas registradas'
  }
- Itens abaixo do mínimo: ${
    data.itensAbaixoMinimo.length > 0
      ? data.itensAbaixoMinimo
          .map((i) => `${i.nome} (atual: ${i.qtdAtual}, mínimo: ${i.minimo})`)
          .join(', ')
      : 'nenhum — estoque em dia ✓'
  }

AUDITORIA:
- Total de eventos auditados no mês: ${data.totalEventosAudit}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${alertas.length > 0 ? alertas.join('\n') : ''}

Escreva o relatório completo agora, SEGUINDO RIGOROSAMENTE o formato de 6 seções com ## acima. Português humano, analítico, com dados concretos.
`.trim()
}
