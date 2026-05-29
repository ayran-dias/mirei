// ═══════════════════════════════════════════════════════════════
// Code.gs · Felícia 360 — Dashboard Vida Econômica
// Arquitetura: BQ-only via Advanced Service
// ═══════════════════════════════════════════════════════════════

const BQ_PROJECT = 'sbj7ujlwjbsknn8v396xaahlf4ogck';

// ── Routing ───────────────────────────────────────────────────
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'home';
  const output = HtmlService.createHtmlOutputFromFile('Index')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1')
    .setTitle('Mesa Banco')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  // Injetar ANTES do bundle React — append() coloca depois, o que faz o React
  // inicializar sem a variável. setContent() com prepend garante a ordem correta.
  const script = '<script>window.__FELICIA_PAGE__="' + page + '";</script>';
  output.setContent(script + output.getContent());
  return output;
}

// ── Helpers BQ ────────────────────────────────────────────────
function runBQ_(sql) {
  const request = { query: sql, useLegacySql: false };
  let response = BigQuery.Jobs.query(request, BQ_PROJECT);
  const jobId = response.jobReference.jobId;

  while (!response.jobComplete) {
    Utilities.sleep(500);
    response = BigQuery.Jobs.getQueryResults(BQ_PROJECT, jobId);
  }

  const fields = response.schema.fields.map(f => f.name);
  const rows = (response.rows || []).map(r =>
    Object.fromEntries(fields.map((f, i) => [f, r.f[i].v]))
  );
  return rows;
}

function cleanDoc_(doc) {
  return (doc || '').replace(/[.\-\/\s"']/g, '').trim();
}

// ── Editores do Roadmap ───────────────────────────────────────
const EDITOR_EMAILS = ['ayran.maduro@stone.com.br', 'carlos.bazetti@stone.com.br'];

// ── Roadmap: Mesa Banco ───────────────────────────────────────
function getRoadmapData() {
  var email = Session.getActiveUser().getEmail();
  var isEditor = EDITOR_EMAILS.indexOf(email) !== -1;
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  // Seed automático: roda se node 'f1-estrutura' não existe
  var parsed = raw ? JSON.parse(raw) : { nodes: [], edges: [] };
  // v4: edges smoothstep sem cruzamentos
  var hasSeeded = (parsed.edges || []).some(function(e) { return e.id === 'e-cred-pnl'; });
  if (!hasSeeded) {
    seedRoadmap();
    raw = props.getProperty('roadmap_data');
  }
  var data = JSON.parse(raw || '{"nodes":[],"edges":[]}');
  data.isEditor = isEditor;
  data.email = email;
  return data;
}

// Merge seguro: adiciona novos nodes/edges sem tocar nos existentes
// Usado pelo Claude via prompt para não sobrescrever posições manuais
function addRoadmapNodes(newNodesJson, newEdgesJson) {
  var email = Session.getActiveUser().getEmail();
  if (EDITOR_EMAILS.indexOf(email) === -1) return { error: 'Sem permissao' };

  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data') || '{"nodes":[],"edges":[]}';
  var data = JSON.parse(raw);

  var newNodes = JSON.parse(newNodesJson || '[]');
  var newEdges = JSON.parse(newEdgesJson || '[]');

  // Skip nodes/edges que já existem por id
  var existingNodeIds = {};
  data.nodes.forEach(function(n) { existingNodeIds[n.id] = true; });
  newNodes.forEach(function(n) {
    if (!existingNodeIds[n.id]) data.nodes.push(n);
  });

  var existingEdgeIds = {};
  data.edges.forEach(function(e) { existingEdgeIds[e.id] = true; });
  newEdges.forEach(function(e) {
    if (!existingEdgeIds[e.id]) data.edges.push(e);
  });

  props.setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, added: newNodes.length, totalNodes: data.nodes.length, totalEdges: data.edges.length };
}

// Atualiza status/dados de nodes existentes por id (sem mover posição)
function updateRoadmapNodes(updatesJson) {
  var email = Session.getActiveUser().getEmail();
  if (EDITOR_EMAILS.indexOf(email) === -1) return { error: 'Sem permissao' };

  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data') || '{"nodes":[],"edges":[]}';
  var data = JSON.parse(raw);

  var updates = JSON.parse(updatesJson || '[]');
  var updateMap = {};
  updates.forEach(function(u) { updateMap[u.id] = u; });

  data.nodes = data.nodes.map(function(n) {
    if (updateMap[n.id]) {
      var u = updateMap[n.id];
      // Atualiza data mas preserva posição e tipo
      if (u.data) n.data = u.data;
      return n;
    }
    return n;
  });

  props.setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, updated: updates.length };
}

function saveRoadmapData(json) {
  var email = Session.getActiveUser().getEmail();
  if (EDITOR_EMAILS.indexOf(email) === -1) {
    return { error: 'Sem permissao de edicao' };
  }
  PropertiesService.getScriptProperties().setProperty('roadmap_data', json);
  return { ok: true };
}

// ── Seed do Roadmap (rodar uma vez, depois remover) ───────────
function seedRoadmap() {
  var data = {
    nodes: [
      // ═══ LABELS DE SEÇÃO ═══
      { id: 'lbl-f360', type: 'label', position: { x: 0, y: -80 }, data: { text: 'Felícia 360', fontSize: 36 }, style: { width: 350, height: 50 } },
      { id: 'lbl-carteiras', type: 'label', position: { x: 0, y: 740 }, data: { text: 'Acompanhamentos (Carteiras)', fontSize: 28 }, style: { width: 450, height: 45 } },
      { id: 'lbl-ferramentas', type: 'label', position: { x: 0, y: 1100 }, data: { text: 'Ferramentas', fontSize: 28 }, style: { width: 280, height: 45 } },
      { id: 'lbl-repo', type: 'label', position: { x: 0, y: 1400 }, data: { text: 'Repositório', fontSize: 28 }, style: { width: 280, height: 45 } },
      { id: 'lbl-infra', type: 'label', position: { x: 1200, y: 1100 }, data: { text: 'Infraestrutura', fontSize: 28 }, style: { width: 300, height: 45 } },
      { id: 'lbl-proximo', type: 'label', position: { x: 1200, y: 1400 }, data: { text: 'Próximos', fontSize: 28 }, style: { width: 250, height: 45 } },

      // ═══ FELÍCIA 360 ═══  (col gap 300px, row gap 160px)
      // Linha 1: Core
      { id: 'f1-busca', type: 'card', position: { x: 0, y: 0 }, data: { title: 'Busca por CNPJ/CPF', description: 'SearchBar com sanitização, roteamento por documento.', status: 'done', category: 'feature' } },
      { id: 'f1-credito', type: 'card', position: { x: 300, y: 0 }, data: { title: 'Ofertas de Crédito', description: 'KYC, limites, ofertas, crédito ativo, negociações.', status: 'done', category: 'feature' } },
      { id: 'f2-pnl', type: 'card', position: { x: 600, y: 0 }, data: { title: 'PnL Adquirência Mensal', description: 'Tabela detalhada: TPV, MDR, RAV, Floating, COGs, Margem.', status: 'done', category: 'feature' } },
      { id: 'f2-fluxo', type: 'card', position: { x: 900, y: 0 }, data: { title: 'Fluxo de Caixa Mensal', description: 'Gráfico crédito + adquirência combinados. Rótulos K/M.', status: 'done', category: 'feature' } },
      // Linha 2
      { id: 'f2-summary', type: 'card', position: { x: 0, y: 160 }, data: { title: 'Summary Cards', description: 'NPV, NII, Risk Adj NII, TPV, Receita nCOF, Margem.', status: 'done', category: 'feature' } },
      { id: 'f2-banco', type: 'card', position: { x: 300, y: 160 }, data: { title: 'Banco Média 3m', description: 'Saldo conta/reservas, boleto, receita seguros.', status: 'done', category: 'feature' } },
      { id: 'f4-insights', type: 'card', position: { x: 600, y: 160 }, data: { title: 'Adquirência: Insights', description: 'TPV Performado, Share CTPV, Linhas de Receita (10), Margem Global.', status: 'done', category: 'nova-entrega' } },
      { id: 'f4-filtro-prod', type: 'card', position: { x: 900, y: 160 }, data: { title: 'Filtro Stone / Pagar.me', description: 'Checkboxes que filtram Insights e PnL por empresa.', status: 'done', category: 'feature' } },
      // Linha 3
      { id: 'f6-info360', type: 'card', position: { x: 0, y: 320 }, data: { title: 'InfoCliente 360', description: 'affiliation_360: identificação, tempo, engajamento, 11 badges produtos, grupo econômico, preços.', status: 'done', category: 'nova-entrega' } },
      { id: 'f6-afiliacoes', type: 'card', position: { x: 300, y: 320 }, data: { title: 'Popup Afiliações', description: 'Botão "ver" abre modal: stonecode, empresa, status, data credenciamento.', status: 'done', category: 'feature' } },
      { id: 'f4-share', type: 'card', position: { x: 600, y: 320 }, data: { title: 'Share CTPV normalizado', description: 'Normalização 100%, fix Recharts cumulativo.', status: 'done', category: 'ajuste' } },
      { id: 'f6-reorder', type: 'card', position: { x: 900, y: 320 }, data: { title: 'Reordem Cards', description: 'Fluxo de Caixa primeiro. defaultOpen em todos os cards.', status: 'done', category: 'ajuste' } },
      // Linha 4: Pendentes
      { id: 'p2-seguro', type: 'card', position: { x: 0, y: 480 }, data: { title: 'Corrigir tem_seguro', description: 'Expandir filtro product_type para todos os tipos de seguro.', status: 'in-progress', category: 'ajuste' } },
      { id: 'p3-banking-date', type: 'card', position: { x: 300, y: 480 }, data: { title: 'Data abertura Banking', description: 'Investigar dim_one_number_client_banking.', status: 'planned', category: 'ajuste' } },
      { id: 'p1-ton', type: 'card', position: { x: 600, y: 480 }, data: { title: 'Incluir Ton', description: 'Remover filtro company != TON na affiliation_360.', status: 'planned', category: 'longo-prazo' } },

      // ═══ ACOMPANHAMENTOS (CARTEIRAS) ═══
      { id: 'f3-enterprise', type: 'card', position: { x: 0, y: 810 }, data: { title: 'Carteira Enterprise', description: '10 seções: Base Geral, Linhas Receita, Visão 3M, Transacional, RAV, Modalidade, Métricas, Todos Produtos, Afiliações.', status: 'done', category: 'nova-entrega' } },
      { id: 'f3-gm', type: 'card', position: { x: 300, y: 810 }, data: { title: 'Carteira Grupos Marca', description: 'Espelho Enterprise com PnL_GM, filtros por categoria e responsável.', status: 'done', category: 'nova-entrega' } },
      { id: 'f3-filtros', type: 'card', position: { x: 600, y: 810 }, data: { title: 'Filtros Cascading', description: 'MultiCombo, FilterBar 7 filtros, GS (grupo selector).', status: 'done', category: 'feature' } },
      { id: 'f3-lazy', type: 'card', position: { x: 900, y: 810 }, data: { title: 'Lazy Loading', description: 'CollapsibleCard mounted=false. Queries na 1ª abertura.', status: 'done', category: 'ajuste' } },

      // ═══ FERRAMENTAS ═══
      { id: 'f5-ajuste', type: 'card', position: { x: 0, y: 1170 }, data: { title: 'Ajuste de Ofertas', description: 'Iframe embed da ferramenta de ajuste de planos.', status: 'done', category: 'feature' } },
      { id: 'f5-admin', type: 'card', position: { x: 300, y: 1170 }, data: { title: 'Admin Monitor', description: 'Presença em tempo real, heartbeat 30s, log 100 entradas.', status: 'done', category: 'feature' } },

      // ═══ REPOSITÓRIO ═══
      { id: 'f6-doc', type: 'card', position: { x: 0, y: 1470 }, data: { title: 'Documentação Felícia 360', description: 'Progressive disclosure 3 níveis. Estilo editorial Stone.', status: 'done', category: 'nova-entrega' } },
      { id: 'f6-roadmap', type: 'card', position: { x: 300, y: 1470 }, data: { title: 'Roadmap Canvas', description: '@xyflow/react. Drag, connect, edit. Permissões por email.', status: 'done', category: 'nova-entrega' } },
      { id: 'p4-doc-outros', type: 'card', position: { x: 600, y: 1470 }, data: { title: 'Documentação outros cards', description: 'Expandir DocFelicia360 com texto refinado.', status: 'planned', category: 'feature' } },

      // ═══ INFRAESTRUTURA ═══
      { id: 'f1-estrutura', type: 'card', position: { x: 1300, y: 1170 }, data: { title: 'Estrutura GAS + React', description: 'React 18, Tailwind, Vite, singlefile, BQ Advanced Service.', status: 'done', category: 'feature' } },
      { id: 'f5-hero', type: 'card', position: { x: 1600, y: 1170 }, data: { title: 'Hero Animado', description: 'CSS puro 4 blobs. Velocidade 50% original.', status: 'done', category: 'ajuste' } },
      { id: 'f5-nav', type: 'card', position: { x: 1300, y: 1330 }, data: { title: 'NavDropdown Sub-grupos', description: 'Menus aninhados hover delay. Children recursivo.', status: 'done', category: 'feature' } },
      { id: 'f6-deeplinks', type: 'card', position: { x: 1600, y: 1330 }, data: { title: 'Deep Links', description: 'google.script.history.push. URLs compartilháveis.', status: 'done', category: 'feature' } },

      // ═══ PRÓXIMOS ═══
      { id: 'p5-export-pdf', type: 'card', position: { x: 1300, y: 1470 }, data: { title: 'Export PDF', description: 'PDF dos dados do cliente para compartilhar offline.', status: 'backlog', category: 'longo-prazo' } },
      { id: 'p6-notif', type: 'card', position: { x: 1600, y: 1470 }, data: { title: 'Notificações', description: 'Alertar churn ou oferta expirando.', status: 'backlog', category: 'longo-prazo' } },
    ],
    edges: [
      // Felícia 360 — chain horizontal (nunca pula card)
      { id: 'e-busca-cred', source: 'f1-busca', target: 'f1-credito' },
      { id: 'e-cred-pnl', source: 'f1-credito', target: 'f2-pnl' },
      { id: 'e-pnl-fluxo', source: 'f2-pnl', target: 'f2-fluxo' },
      // Felícia 360 — vertical (mesma coluna)
      { id: 'e-busca-summary', source: 'f1-busca', target: 'f2-summary' },
      { id: 'e-pnl-insights', source: 'f2-pnl', target: 'f4-insights' },
      { id: 'e-insights-filtro', source: 'f4-insights', target: 'f4-filtro-prod' },
      { id: 'e-insights-share', source: 'f4-insights', target: 'f4-share' },
      { id: 'e-summary-banco', source: 'f2-summary', target: 'f2-banco' },
      // InfoCliente 360 — adjacente
      { id: 'e-summary-info', source: 'f2-summary', target: 'f6-info360' },
      { id: 'e-info-afil', source: 'f6-info360', target: 'f6-afiliacoes' },
      // Pendentes F360 — vertical (mesma coluna)
      { id: 'e-info-seguro', source: 'f6-info360', target: 'p2-seguro' },
      { id: 'e-afil-banking', source: 'f6-afiliacoes', target: 'p3-banking-date' },
      { id: 'e-banking-ton', source: 'p3-banking-date', target: 'p1-ton' },
      // Carteiras — chain esquerda→direita
      { id: 'e-ent-gm', source: 'f3-enterprise', target: 'f3-gm' },
      { id: 'e-gm-filtros', source: 'f3-gm', target: 'f3-filtros' },
      { id: 'e-filtros-lazy', source: 'f3-filtros', target: 'f3-lazy' },
      // Ferramentas — adjacente
      { id: 'e-ajuste-admin', source: 'f5-ajuste', target: 'f5-admin' },
      // Repositório — chain
      { id: 'e-doc-roadmap', source: 'f6-doc', target: 'f6-roadmap' },
      { id: 'e-roadmap-docoutros', source: 'f6-roadmap', target: 'p4-doc-outros' },
      // Infra — adjacente
      { id: 'e-estrutura-hero', source: 'f1-estrutura', target: 'f5-hero' },
      { id: 'e-nav-deep', source: 'f5-nav', target: 'f6-deeplinks' },
      { id: 'e-estrutura-nav', source: 'f1-estrutura', target: 'f5-nav' },
      // Próximos — adjacente
      { id: 'e-pdf-notif', source: 'p5-export-pdf', target: 'p6-notif' },
    ]
  };
  PropertiesService.getScriptProperties().setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, nodes: data.nodes.length, edges: data.edges.length };
}

// ── Monitoramento de uso em tempo real ─────────────────────────
const ADMIN_EMAIL = 'ayran.maduro@stone.com.br';

// heartbeat({ page, doc }) — chamado a cada 30s pelo cliente
function heartbeat(data) {
  try {
    const d = data || {};
    const email = Session.getActiveUser().getEmail() || 'unknown';
    const props = PropertiesService.getScriptProperties();
    const now = new Date().toISOString();

    let presence = {};
    try { presence = JSON.parse(props.getProperty('presence') || '{}'); } catch(e) {}
    const existing = presence[email] || {};
    presence[email] = {
      lastPing:  now,
      firstSeen: existing.firstSeen || now,
      page:      d.page  || existing.page  || 'home',
      doc:       d.doc   || existing.doc   || '',
    };
    props.setProperty('presence', JSON.stringify(presence));
  } catch(e) {
    console.log('Heartbeat error: ' + e.message);
  }
  return { ok: true };
}

function logUsage_(doc, page) {
  try {
    const email = Session.getActiveUser().getEmail() || 'unknown';
    const props = PropertiesService.getScriptProperties();
    const now = new Date().toISOString();

    let presence = {};
    try { presence = JSON.parse(props.getProperty('presence') || '{}'); } catch(e) {}
    presence[email] = {
      lastPing:  now,
      firstSeen: presence[email]?.firstSeen || now,
      page:      page || presence[email]?.page || 'home',
      doc:       doc,
    };
    props.setProperty('presence', JSON.stringify(presence));

    let log = [];
    try { log = JSON.parse(props.getProperty('usage_log') || '[]'); } catch(e) {}
    log.unshift({ ts: now, email, doc, page: page || 'home' });
    if (log.length > 100) log = log.slice(0, 100);
    props.setProperty('usage_log', JSON.stringify(log));
  } catch(e) {
    console.log('Log error: ' + e.message);
  }
}

function getActiveUsers() {
  const email = Session.getActiveUser().getEmail();
  const isAdmin = email === ADMIN_EMAIL;
  if (!isAdmin) return { isAdmin: false };

  const props = PropertiesService.getScriptProperties();
  let presence = {};
  try { presence = JSON.parse(props.getProperty('presence') || '{}'); } catch(e) {}
  let log = [];
  try { log = JSON.parse(props.getProperty('usage_log') || '[]'); } catch(e) {}

  // Marcar online/offline (60s threshold)
  const now = Date.now();
  const users = Object.entries(presence).map(([em, data]) => {
    const d = data;
    const lastPing = new Date(d.lastPing).getTime();
    const online = (now - lastPing) < 90000; // 90s threshold
    return { email: em, doc: d.doc, lastPing: d.lastPing, firstSeen: d.firstSeen, online: online };
  }).sort((a, b) => b.online - a.online || new Date(b.lastPing).getTime() - new Date(a.lastPing).getTime());

  return { isAdmin: true, users: users, log: log };
}

// ── Query 1: Status Crédito (base_felicia) ────────────────────
function getStatusCredito(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };
  logUsage_(doc, 'search');

  const sql = `
    SELECT *
    FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_Credit.base_felicia\`
    WHERE CNPJ = '${doc}'
  `;
  return runBQ_(sql);
}

// ── Query 2: NPV Crédito (Finch) ─────────────────────────────
function getNpvCredito(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    WITH loans AS (
      SELECT DISTINCT LoanId, documento
      FROM \`dataplatform-prd.credit_policy_studies.credit_portfolio\`
      WHERE documento = '${doc}'
    )
    SELECT
      b.documento,
      ROUND(SUM(a.financial_income_net * a.discount_factor)
        - SUM(a.funding_cost * a.discount_factor)
        - SUM(a.capital_cost * a.discount_factor), 2) AS nii,
      ROUND(SUM(a.financial_income_net * a.discount_factor)
        - SUM(a.funding_cost * a.discount_factor)
        - SUM(a.capital_cost * a.discount_factor)
        - SUM(a.pdd_result * a.discount_factor), 2) AS risk_adj_nii,
      ROUND(SUM(a.pv_cf), 2) AS npv
    FROM \`pricing-dedicated-non-prod.credit_pricing.npv_kgiro\` a
    JOIN loans b ON a.loanid = b.LoanId
    WHERE a.run_at = (SELECT MAX(run_at) FROM \`pricing-dedicated-non-prod.credit_pricing.npv_kgiro\`)
    GROUP BY b.documento
  `;
  return runBQ_(sql);
}

// ── Query 3: PnL Adquirência (12 meses) ──────────────────────
function getPnlAdquirencia(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', Dt_Month) AS mes,
      CompanyName AS company_name,
      ROUND(SUM(GMV), 2) AS tpv,
      ROUND(SUM(floating_delayed), 2) AS delay_rcta,
      ROUND(SAFE_DIVIDE(SUM(floating_delayed), NULLIF(SUM(GMV), 0)), 4) AS delay_pct,
      ROUND(SUM(Net_MDR_Stone), 2) AS net_mdr,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4) AS pctg_net_mdr,
      ROUND(SUM(Floating_Stn), 2) AS floating_conta,
      ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV), 0)), 4) AS floating_pct,
      ROUND(SUM(Rcta_Aluguel), 2) AS aluguel,
      ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel), NULLIF(SUM(GMV), 0)), 4) AS aluguel_pct,
      ROUND(SUM(Margem_RAV_STN), 2) AS net_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV), 0)), 4) AS rav_pct,
      ROUND(SUM(Receita_TED), 2) AS rcta_ted,
      ROUND(SUM(Receita_Pix_Geral), 2) AS pix_rcta,
      ROUND(SUM(TPV_Adquirencia), 2) AS ctpv,
      ROUND(SUM(Pix_Total), 2) AS tpv_pix_vol,
      ROUND(SUM(Rcta_gateway), 2) AS gateway,
      ROUND(SUM(Rcta_Boleto), 2) AS rcta_boleto,
      ROUND(SUM(Rcta_Antifraude), 2) AS rcta_antifraude,
      ROUND(SUM(Rcta_transferencia), 2) AS rcta_transf,
      ROUND(SUM(Rcta_Setup), 2) AS rcta_setup,
      ROUND(SUM(Receita_Net_COF), 2) AS receita_net_cof,
      ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(ABS(SUM(GMV)), 0)), 4) AS tkr_net_cof,
      ROUND(SUM(custo_servir_Total) * (-1), 2) AS cogs,
      ROUND(SUM(Margem_Query), 2) AS margem,
      ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(ABS(SUM(GMV)), 0)), 4) AS margem_div_tpv
    FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part\`
    WHERE ClientCNPJorCPF = '${doc}'
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
    GROUP BY Dt_Month, CompanyName
    ORDER BY Dt_Month DESC, CompanyName
  `;
  return runBQ_(sql);
}

// ── Query 6: Banco — Média 3m ─────────────────────────────────
function getBancoMedia(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    WITH ft AS (
      SELECT
        mes,
        SUM(Media_Saldo_Conta_Visao_Cliente) AS saldo_conta,
        SUM(Media_Saldo_Reservas) AS saldo_reservas,
        SUM(IFNULL(Quantidade_total_emitida, 0)) AS boleto_emitido,
        SUM(IFNULL(Quantidade_de_boletos_liquidados, 0)) AS boleto_liquidado,
        SUM(IFNULL(Valor_total_liquidado_pago, 0)) AS volume_boleto_liquidado,
        SUM(IFNULL(receita_seguros, 0)) AS receita_seguros,
        STRING_AGG(DISTINCT produtos_seguro, ', ') AS produtos_seguro
      FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_3M\`
      WHERE Documento = '${doc}'
      GROUP BY mes
    )
    SELECT
      ROUND(AVG(saldo_conta), 2) AS saldo_conta,
      ROUND(AVG(saldo_reservas), 2) AS saldo_reservas,
      ROUND(AVG(boleto_emitido), 1) AS boleto_emitido,
      ROUND(AVG(boleto_liquidado), 1) AS boleto_liquidado,
      ROUND(AVG(volume_boleto_liquidado), 2) AS volume_boleto,
      ROUND(AVG(receita_seguros), 2) AS receita_seguros,
      STRING_AGG(DISTINCT produtos_seguro, ', ') AS produtos_seguro
    FROM ft
  `;
  return runBQ_(sql);
}

// ── Query 5: Afiliação 360 (InfoCliente rico) ─────────────────
function getAfiliacao360(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    SELECT *
    FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.affiliation_360\`
    WHERE document = '${doc}'
    LIMIT 1
  `;
  return runBQ_(sql);
}

// ── Query 7: Insights Adquirência — Share por Modalidade ──────
function getInsightsAdq(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    SELECT
      FORMAT_DATE('%Y-%m', Dt_Month) AS mes,
      CompanyName AS company_name,
      ROUND(SUM(TPV_Adquirencia), 2) AS tpv_cartao,
      ROUND(SUM(IFNULL(TPV_PIX_POS, 0)), 2) AS tpv_pix,
      ROUND(SUM(IFNULL(Vlr_TPV_debito_Visa, 0)
               + IFNULL(Vlr_TPV_debito_MasterCard, 0)
               + IFNULL(Vlr_TPV_debito_Elo, 0)), 2) AS tpv_debito,
      ROUND(SUM(IFNULL(Vlr_TPV_credito_a_vista_Visa, 0)
               + IFNULL(Vlr_TPV_credito_a_vista_MasterCard, 0)
               + IFNULL(Vlr_TPV_credito_a_vista_Elo, 0)
               + IFNULL(Vlr_TPV_credito_a_vista_Hipercard, 0)
               + IFNULL(Vlr_TPV_credito_a_vista_Amex, 0)), 2) AS tpv_cred_avista,
      ROUND(SUM(IFNULL(Vlr_TPV_credito__2_6_Visa, 0)
               + IFNULL(Vlr_TPV_credito__2_6_MasterCard, 0)
               + IFNULL(Vlr_TPV_credito__2_6_Elo, 0)
               + IFNULL(Vlr_TPV_credito__2_6_Hipercard, 0)
               + IFNULL(Vlr_TPV_credito__2_6_Amex, 0)), 2) AS tpv_psj1,
      ROUND(SUM(IFNULL(Vlr_TPV_credito_7_12_Visa, 0)
               + IFNULL(Vlr_TPV_credito_7_12_MasterCard, 0)
               + IFNULL(Vlr_TPV_credito_7_12_Elo, 0)
               + IFNULL(Vlr_TPV_credito_7_12_Hipercard, 0)
               + IFNULL(Vlr_TPV_credito_7_12_Amex, 0)), 2) AS tpv_psj2,
      ROUND(SUM(IFNULL(Vlr_TPV_credito_maior_que_12_Visa, 0)
               + IFNULL(Vlr_TPV_credito_maior_que_12_VMasterCard, 0)
               + IFNULL(Vlr_TPV_credito_maior_que_12_VElo, 0)
               + IFNULL(Vlr_TPV_credito_maior_que_12_VHipercard, 0)
               + IFNULL(Vlr_TPV_credito_maior_que_12_VAmex, 0)), 2) AS tpv_psj3
    FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.PnL_Dashs_part\`
    WHERE ClientCNPJorCPF = '${doc}'
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)
    GROUP BY Dt_Month, CompanyName
    ORDER BY Dt_Month DESC, CompanyName
  `;
  return runBQ_(sql);
}

// ════════════════════════════════════════════════════════════════
// ENTERPRISE — Funções de dados
// Fonte: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends
// ════════════════════════════════════════════════════════════════

const ENT_TABLE = '`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_FELICIA_KA_com_Appends`';

// Helper: constrói WHERE clause de grupo — aceita array (grupos) ou string única (grupo)
function buildGrupoWhere_(f) {
  const safe = s => (s || '').replace(/'/g, '').replace(/\\/g, '').trim();
  const arr = f.grupos && Array.isArray(f.grupos) && f.grupos.length > 0;
  if (arr) return `AND motivo IN (${f.grupos.map(g => `'${safe(g)}'`).join(',')})`;
  if (f.grupo) return `AND motivo LIKE '%${safe(f.grupo)}%'`;
  return '';
}

// Helper genérico para WHERE com arrays (IN) ou single
function buildInWhere_(col, arr, safe) {
  if (!arr || !arr.length) return '';
  return `AND ${col} IN (${arr.map(v => `'${safe(v)}'`).join(',')})`;
}

// ── Enterprise 1: Base Geral (últimos 12 meses, com filtros) ──
// filters: { docs[], grupos[], grupo1s[], grupo2s[], scs[], mccs[], mes }
function getEnterpriseBaseGeral(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').replace(/\\/g, '').trim();

  let clauses = ["Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)"];
  if (f.docs   && f.docs.length)   clauses.push(`ClientCNPJorCPF IN (${f.docs.map(d => `'${safe(d)}'`).join(',')})`);
  if (f.grupos && f.grupos.length) clauses.push(`motivo IN (${f.grupos.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo1s && f.grupo1s.length) clauses.push(`grupo1_enc IN (${f.grupo1s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo2s && f.grupo2s.length) clauses.push(`grupo2_enc IN (${f.grupo2s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.scs  && f.scs.length)  clauses.push(`CAST(SC AS STRING) IN (${f.scs.map(s => `'${safe(s)}'`).join(',')})`);
  if (f.mccs && f.mccs.length) clauses.push(`CAST(MCC AS STRING) IN (${f.mccs.map(m => `'${safe(m)}'`).join(',')})`);
  if (f.mes)    clauses.push(`FORMAT_DATE('%m/%Y', Dt_Month) = '${safe(f.mes)}'`);

  const where = clauses.join(' AND ');
  const sql = `
    SELECT
      FORMAT_DATE('%m/%Y', Dt_Month)                                                AS mes,
      ROUND(SUM(GMV), 2)                                                            AS gmv,
      ROUND(SUM(TPV_Adquirencia), 2)                                                AS tpv_cartao,
      ROUND(SUM(Pix_Total), 2)                                                      AS tpv_pix,
      ROUND(SUM(TPV_BOLETO), 2)                                                     AS tpv_boleto,
      ROUND(SUM(TPV_Sub), 2)                                                        AS tpv_sub,
      ROUND(SUM(TPV_Gateway), 2)                                                    AS tpv_gtw,
      ROUND(SUM(Net_MDR_Stone), 2)                                                  AS net_mdr,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)   AS net_mdr_pct,
      ROUND(SUM(Rcta_Aluguel), 2)                                                   AS aluguel,
      ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel), NULLIF(SUM(GMV), 0)), 4)                AS aluguel_pct,
      ROUND(SUM(Floating_Stn), 2)                                                    AS floating_conta,
      ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV), 0)), 4)               AS floating_pct,
      CAST(NULL AS FLOAT64)                                                        AS delay_rcta,
      CAST(NULL AS FLOAT64)                                                        AS delay_pct,
      ROUND(SUM(Margem_RAV_STN), 2)                                                AS net_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV), 0)), 4)             AS rav_pct,
      ROUND(SUM(Receita_TED), 2)                                                   AS rcta_ted,
      ROUND(SUM(Receita_Pix_Geral), 2)                                             AS rcta_pix,
      ROUND(SUM(Receita_Net_COF), 2)                                               AS receita_ncof,
      ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)            AS tkr_ncof,
      ROUND(SUM(custo_servir_Total) * -1, 2)                                       AS cogs,
      ROUND(SUM(Margem_Query), 2)                                                  AS margem,
      ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV), 0)), 4)               AS margem_gmv
    FROM ${ENT_TABLE}
    WHERE ${where}
    GROUP BY Dt_Month
    ORDER BY Dt_Month DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 2: Visão 3M por Grupos ────────────────────────
// Sem filtro de data — cada snapshot contribui com um campo _Menos_X diferente.
// M0 filtrado ao snapshot mais recente para evitar resíduo histórico.
function getEnterpriseVisao3M() {
  const sql = `
    WITH latest AS (
      SELECT MAX(Dt_Month) AS max_dt
      FROM ${ENT_TABLE}
    )
    SELECT
      f.motivo                                                                          AS grupo,
      -- GMV por período
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_3 ELSE 0 END), 2)   AS gmv_m3,
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_2 ELSE 0 END), 2)   AS gmv_m2,
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_1 ELSE 0 END), 2)   AS gmv_m1,
      ROUND(SUM(CASE WHEN f.Dt_Month = l.max_dt THEN f.GMV_M0      ELSE 0 END), 2)   AS gmv_m0,
      -- Receita nCOF por período
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_3 ELSE 0 END), 2) AS ncof_m3,
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_2 ELSE 0 END), 2) AS ncof_m2,
      ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_1 ELSE 0 END), 2) AS ncof_m1,
      ROUND(SUM(CASE WHEN f.Dt_Month = l.max_dt THEN f.Receita_Net_COF_m0         ELSE 0 END), 2) AS ncof_m0
    FROM ${ENT_TABLE} f
    CROSS JOIN latest l
    WHERE f.motivo IS NOT NULL
    GROUP BY f.motivo
    HAVING gmv_m1 > 0 OR gmv_m0 > 0
    ORDER BY gmv_m1 DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 3: Transacional Cartão (mensal) ────────────────
function getEnterpriseTransacional(filters) {
  const f = filters || {};
  const grupoWhere = buildGrupoWhere_(f);
  const sql = `
    SELECT
      FORMAT_DATE('%m/%Y', Dt_Month)                                                AS mes,
      ROUND(SUM(TPV_Adquirencia), 2)                                                AS ctpv,
      ROUND(SUM(MDR_Stone), 2)                                                      AS mdr,
      ROUND(SUM(IC_Stone), 2)                                                       AS ic,
      ROUND(SUM(CAST(Fee_Stone AS FLOAT64)), 2)                                     AS fee,
      ROUND(SUM(Net_MDR_Stone), 2)                                                  AS net_mdr,
      ROUND(SUM(Impostos_MDR_Stone), 2)                                             AS impostos,
      ROUND(SAFE_DIVIDE(SUM(MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)       AS mdr_pct,
      ROUND(SAFE_DIVIDE(SUM(IC_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)        AS ic_pct,
      ROUND(SAFE_DIVIDE(SUM(CAST(Fee_Stone AS FLOAT64)), NULLIF(SUM(TPV_Adquirencia), 0)), 4) AS fee_pct,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)   AS net_mdr_pct,
      ROUND(SAFE_DIVIDE(SUM(Impostos_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4) AS impostos_pct
    FROM ${ENT_TABLE}
    WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
      ${grupoWhere}
    GROUP BY Dt_Month
    ORDER BY Dt_Month DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 4: RAV canal (mensal) ─────────────────────────
function getEnterpriseRAV(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').trim();
  const grupoWhere = buildGrupoWhere_(f);
  const sql = `
    SELECT
      FORMAT_DATE('%m/%Y', Dt_Month)                                                             AS mes,
      ROUND(SUM(TPV_antecipavel_geral), 2)                                                       AS tpv_ant,
      ROUND(SUM(Vlr_GrossValue_STN), 2)                                                          AS gross,
      ROUND(SAFE_DIVIDE(SUM(Vlr_GrossValue_STN), NULLIF(SUM(TPV_antecipavel_geral), 0)), 4)     AS pct_rav,
      ROUND(SUM(Receita_RAV_STN), 2)                                                             AS rcta_rav,
      ROUND(SUM(Vlr_Custo_fund_STN), 2)                                                          AS cof,
      ROUND(SUM(Margem_RAV_STN), 2)                                                              AS mrg_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV), 0)), 4)                           AS mrg_rav_pct,
      ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4)        AS tx_simples,
      ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1)   AS duration_dc
    FROM ${ENT_TABLE}
    WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
      ${grupoWhere}
    GROUP BY Dt_Month
    ORDER BY Dt_Month DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 0: Opções de filtro (único query UNION ALL) ────
// filters: { grupos[], grupo1s[], grupo2s[], docs[], scs[], mccs[], mes }
// Retorna opções cascateadas — ao filtrar por grupo, doc/SC/MCC narrowam automaticamente
function getEnterpriseFilterOptions(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').replace(/\\/g, '').trim();

  // Monta WHERE baseado nos filtros já aplicados (cascading)
  const w = [];
  if (f.grupos  && f.grupos.length)  w.push(`motivo IN (${f.grupos.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo1s && f.grupo1s.length) w.push(`grupo1_enc IN (${f.grupo1s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo2s && f.grupo2s.length) w.push(`grupo2_enc IN (${f.grupo2s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.docs    && f.docs.length)    w.push(`ClientCNPJorCPF IN (${f.docs.map(d => `'${safe(d)}'`).join(',')})`);
  if (f.scs     && f.scs.length)     w.push(`CAST(SC AS STRING) IN (${f.scs.map(s => `'${safe(s)}'`).join(',')})`);
  if (f.mccs    && f.mccs.length)    w.push(`CAST(MCC AS STRING) IN (${f.mccs.map(m => `'${safe(m)}'`).join(',')})`);
  const where = w.length ? 'AND ' + w.join(' AND ') : '';

  const sql = `
    SELECT tipo, valor FROM (
      SELECT 'grupo'  AS tipo, motivo AS valor
        FROM ${ENT_TABLE} WHERE motivo IS NOT NULL ${where} GROUP BY motivo
      UNION ALL
      SELECT 'grupo1', grupo1_enc
        FROM ${ENT_TABLE} WHERE grupo1_enc IS NOT NULL ${where} GROUP BY grupo1_enc
      UNION ALL
      SELECT 'grupo2', grupo2_enc
        FROM ${ENT_TABLE} WHERE grupo2_enc IS NOT NULL ${where} GROUP BY grupo2_enc
      UNION ALL
      SELECT 'mcc', CAST(MCC AS STRING)
        FROM ${ENT_TABLE} WHERE MCC IS NOT NULL ${where} GROUP BY MCC
      UNION ALL
      SELECT 'mes', FORMAT_DATE('%m/%Y', Dt_Month)
        FROM ${ENT_TABLE}
        WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH) ${where} GROUP BY Dt_Month
      UNION ALL
      -- doc e sc: carregados com filtro para evitar listas de milhares
      SELECT 'doc', ClientCNPJorCPF
        FROM (
          SELECT ClientCNPJorCPF, COUNT(*) AS cnt
          FROM ${ENT_TABLE} WHERE ClientCNPJorCPF IS NOT NULL ${where}
          GROUP BY ClientCNPJorCPF ORDER BY cnt DESC LIMIT 500
        )
      UNION ALL
      SELECT 'sc', CAST(SC AS STRING)
        FROM (
          SELECT SC, COUNT(*) AS cnt
          FROM ${ENT_TABLE} WHERE SC IS NOT NULL ${where}
          GROUP BY SC ORDER BY cnt DESC LIMIT 500
        )
    )
    WHERE valor IS NOT NULL AND valor != ''
    ORDER BY tipo,
      -- Meses: ordenar por data DESC (valor no formato MM/YYYY)
      CASE WHEN tipo = 'mes'
        THEN -UNIX_DATE(DATE(
          CAST(SPLIT(valor, '/')[OFFSET(1)] AS INT64),
          CAST(SPLIT(valor, '/')[OFFSET(0)] AS INT64),
          1))
        ELSE NULL
      END,
      -- Demais: ordenar alfabético ASC
      CASE WHEN tipo != 'mes' THEN valor ELSE NULL END
  `;
  return runBQ_(sql);
}

// ── Enterprise 5: Métricas por Cliente (mês selecionado) ──────
// filters: { mes } — sem mes = sem filtro de data (cumulativo, como Looker); com mes = filtra por mês
function getEnterpriseMetricasCliente(filters) {
  const f = filters || {};
  const sql = `
    SELECT
      motivo                                                                                      AS grupo,
      ROUND(SUM(GMV), 2)                                                                         AS gmv,
      ROUND(SUM(TPV_Adquirencia), 2)                                                             AS tpv_cartao,
      ROUND(SUM(Pix_Total), 2)                                                                   AS tpv_pix,
      ROUND(SUM(Net_MDR_Stone), 2)                                                               AS net_mdr,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)                AS net_mdr_pct,
      ROUND(SUM(Vlr_GrossValue_STN), 2)                                                          AS gross_rav,
      ROUND(SUM(Floating_Stn), 2)                                                                AS floating,
      ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV), 0)), 4)                             AS floating_pct,
      ROUND(SUM(Receita_Pix_Geral), 2)                                                           AS rcta_pix,
      ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral), NULLIF(SUM(GMV), 0)), 4)                        AS pix_pct,
      ROUND(SUM(Margem_RAV_STN), 2)                                                              AS mrg_rav,
      ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4)        AS tx_simples,
      ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1)   AS duration_dc,
      ROUND(SUM(Receita_Net_COF), 2)                                                             AS rct_netcof,
      ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)                          AS tkr_ncof,
      ROUND(SUM(Margem_Query), 2)                                                                AS margem,
      ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV), 0)), 4)                             AS margem_gmv
    FROM ${ENT_TABLE}
    WHERE Dt_Month = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
              + INTERVAL DATE_DIFF(
                  LAST_DAY(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH)),
                  DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH),
                  DAY) DAY
      AND motivo IS NOT NULL
    GROUP BY motivo
    ORDER BY gmv DESC
  `;
  // Simplificação: usar data fixa do snapshot M-1
  // Sem filtro de data — igual ao Looker que agrega cumulativo quando nenhum mês selecionado
  const sqlSimples = `
    SELECT
      motivo                                                                                      AS grupo,
      ROUND(SUM(GMV), 2)                                                                         AS gmv,
      ROUND(SUM(TPV_Adquirencia), 2)                                                             AS tpv_cartao,
      ROUND(SUM(Pix_Total), 2)                                                                   AS tpv_pix,
      ROUND(SUM(Net_MDR_Stone), 2)                                                               AS net_mdr,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia), 0)), 4)                AS net_mdr_pct,
      ROUND(SUM(Vlr_GrossValue_STN), 2)                                                          AS gross_rav,
      ROUND(SUM(Floating_Stn), 2)                                                                AS floating,
      ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV), 0)), 4)                             AS floating_pct,
      ROUND(SUM(Receita_Pix_Geral), 2)                                                           AS rcta_pix,
      ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral), NULLIF(SUM(GMV), 0)), 4)                        AS pix_pct,
      ROUND(SUM(Margem_RAV_STN), 2)                                                              AS mrg_rav,
      ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4)        AS tx_simples,
      ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1)   AS duration_dc,
      ROUND(SUM(Receita_Net_COF), 2)                                                             AS rct_netcof,
      ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV), 0)), 4)                          AS tkr_ncof,
      ROUND(SUM(Margem_Query), 2)                                                                AS margem,
      ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV), 0)), 4)                             AS margem_gmv
    FROM ${ENT_TABLE}
    WHERE motivo IS NOT NULL
      ${f.mes ? `AND FORMAT_DATE('%m/%Y', Dt_Month) = '${(f.mes||'').replace(/'/g,'').trim()}'` : ''}
    GROUP BY motivo
    ORDER BY gmv DESC
  `;
  return runBQ_(sqlSimples);
}

// ── Enterprise 6: Linhas de Receita + nCOF vs CTS (mensal) ───
function getEnterpriseLinhasReceita(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').trim();
  const grupoWhere = buildGrupoWhere_(f);
  const sql = `
    SELECT
      FORMAT_DATE('%m/%Y', Dt_Month)                AS mes,
      ROUND(SUM(Net_MDR_Stone), 2)                  AS rcta_net_mdr,
      ROUND(SUM(Receita_Pix_Geral), 2)              AS rcta_pix,
      ROUND(SUM(Margem_RAV_STN), 2)                 AS mrg_rav,
      ROUND(SUM(Rcta_gateway), 2)                   AS rcta_gateway,
      ROUND(SUM(Rcta_Aluguel), 2)                   AS rcta_aluguel,
      ROUND(SUM(Floating_Stn), 2)                   AS rcta_floating,
      ROUND(SUM(Rcta_Boleto), 2)                    AS rcta_boleto,
      ROUND(SUM(Rcta_Antifraude), 2)                AS rcta_antifraude,
      ROUND(SUM(Rcta_transferencia), 2)             AS rcta_transf,
      ROUND(SUM(Rcta_Setup), 2)                     AS rcta_setup,
      ROUND(SUM(Receita_Net_COF), 2)                AS receita_ncof,
      ROUND(SUM(custo_servir_Total) * -1, 2)        AS custo_servir,
      ROUND(SUM(Margem_Query), 2)                   AS margem
    FROM ${ENT_TABLE}
    WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH)
      ${grupoWhere}
    GROUP BY Dt_Month
    ORDER BY Dt_Month ASC
  `;
  return runBQ_(sql);
}

// ── Enterprise 7: Transacional Cartão por Grupo (M-1 vs atual) ─
function getEnterpriseTransacionalGrupos() {
  const sql = `
    WITH dates AS (
      SELECT
        MAX(Dt_Month) AS dt_atual,
        (SELECT MAX(Dt_Month) FROM ${ENT_TABLE}
          WHERE Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH)) AS dt_m1
      FROM ${ENT_TABLE}
    )
    SELECT
      f.motivo                                                                             AS grupo,
      ROUND(SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END), 2)   AS ctpv_m1,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.MDR_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS mdr_pct_m1,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.IC_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS ic_pct_m1,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN CAST(f.Fee_Stone AS FLOAT64) ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS fee_pct_m1,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.Net_MDR_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS net_mdr_pct_m1,
      ROUND(SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END), 2)  AS ctpv_m0,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.MDR_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS mdr_pct_m0,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.IC_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS ic_pct_m0,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN CAST(f.Fee_Stone AS FLOAT64) ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS fee_pct_m0,
      ROUND(SAFE_DIVIDE(
        SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.Net_MDR_Stone ELSE 0 END),
        NULLIF(SUM(CASE WHEN f.Dt_Month = d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS net_mdr_pct_m0
    FROM ${ENT_TABLE} f CROSS JOIN dates d
    WHERE f.motivo IS NOT NULL
      AND f.Dt_Month IN (d.dt_m1, d.dt_atual)
    GROUP BY f.motivo
    ORDER BY ctpv_m1 DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 8: RAV por cliente ─────────────────────────────
// filters: { grupos, mes } — mes default = último mês completo
function getEnterpriseRAVCliente(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').trim();
  const grupoWhere = buildGrupoWhere_(f);
  // Mês: se fornecido usa ele, senão usa o último mês completo da tabela
  const mesWhere = f.mes
    ? `AND FORMAT_DATE('%m/%Y', Dt_Month) = '${safe(f.mes)}'`
    : `AND Dt_Month = (SELECT MAX(Dt_Month) FROM ${ENT_TABLE} WHERE Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))`;
  const sql = `
    SELECT
      motivo                                                                                      AS grupo,
      FORMAT_DATE('%m/%Y', MIN(Dt_Month))                                                        AS mes_ref,
      ROUND(SUM(TPV_antecipavel_geral), 2)                                                       AS tpv_ant,
      ROUND(SUM(Vlr_GrossValue_STN), 2)                                                          AS gross,
      ROUND(SAFE_DIVIDE(SUM(Vlr_GrossValue_STN), NULLIF(SUM(TPV_antecipavel_geral), 0)), 4)     AS pct_rav,
      ROUND(SUM(Receita_RAV_STN), 2)                                                             AS rcta_rav,
      ROUND(SUM(Vlr_Custo_fund_STN), 2)                                                          AS cof,
      ROUND(SUM(Margem_RAV_STN), 2)                                                              AS mrg_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV), 0)), 4)                           AS mrg_rav_pct,
      ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 4)        AS tx_simples,
      ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN), 0)), 1)   AS duration_dc
    FROM ${ENT_TABLE}
    WHERE motivo IS NOT NULL
      ${mesWhere}
      ${grupoWhere}
    GROUP BY motivo
    HAVING gross > 0
    ORDER BY gross DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 9: Aberturas por Modalidade e Bandeira (M-1) ──
// Retorna 1 linha por (band, modal) com share%, mdr%, ic%, fee%, netmdr%
function getEnterpriseModalidade(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').trim();
  const grupoWhere = buildGrupoWhere_(f);
  // Mês: se fornecido usa MM/YYYY, senão usa M-1 como default
  const dtWhere = f.mes
    ? `AND FORMAT_DATE('%m/%Y', Dt_Month) = '${safe(f.mes)}'`
    : `AND Dt_Month = (SELECT MAX(Dt_Month) FROM ${ENT_TABLE} WHERE Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))`;
  const sql = `
    WITH base AS (
      SELECT * FROM ${ENT_TABLE}
      WHERE 1=1 ${dtWhere} ${grupoWhere}
    ),
    totais AS (SELECT SUM(TPV_Adquirencia) AS tpv_total FROM base)
    SELECT band, modal,
      ROUND(SAFE_DIVIDE(tpv_cell, t.tpv_total), 4) AS share,
      ROUND(SAFE_DIVIDE(mdr_cell, NULLIF(tpv_cell,0)), 4) AS mdr_pct,
      ROUND(SAFE_DIVIDE(ic_cell,  NULLIF(tpv_cell,0)), 4) AS ic_pct,
      ROUND(SAFE_DIVIDE(fee_cell, NULLIF(tpv_cell,0)), 4) AS fee_pct,
      ROUND(SAFE_DIVIDE(net_cell, NULLIF(tpv_cell,0)), 4) AS net_mdr_pct
    FROM totais t, (
      SELECT 'VISA' AS band,'DEB' AS modal,SUM(Vlr_TPV_debito_Visa) AS tpv_cell,SUM(Vlr_MDR_debito_Visa) AS mdr_cell,SUM(Vlr_IC_debito_Visa) AS ic_cell,SUM(CAST(Vlr_Fee_debito_Visa AS FLOAT64)) AS fee_cell,SUM(Vlr_NetMDR_debito_Visa) AS net_cell FROM base
      UNION ALL SELECT 'MASTER','DEB',SUM(Vlr_TPV_debito_MasterCard),SUM(Vlr_MDR_debito_MasterCard),SUM(Vlr_IC_debito_MasterCard),SUM(CAST(Vlr_Fee_debito_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_debito_MasterCard) FROM base
      UNION ALL SELECT 'ELO','DEB',SUM(Vlr_TPV_debito_Elo),SUM(Vlr_MDR_debito_Elo),SUM(Vlr_IC_debito_Elo),SUM(CAST(Vlr_Fee_debito_Elo AS FLOAT64)),SUM(Vlr_NetMDR_debito_Elo) FROM base
      UNION ALL SELECT 'VISA','CRED',SUM(Vlr_TPV_credito_a_vista_Visa),SUM(Vlr_MDR_credito_a_vista_Visa),SUM(Vlr_IC_credito_a_vista_Visa),SUM(CAST(Vlr_Fee_credito_a_vista_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Visa) FROM base
      UNION ALL SELECT 'MASTER','CRED',SUM(Vlr_TPV_credito_a_vista_MasterCard),SUM(Vlr_MDR_credito_a_vista_MasterCard),SUM(Vlr_IC_credito_a_vista_MasterCard),SUM(CAST(Vlr_Fee_credito_a_vista_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_MasterCard) FROM base
      UNION ALL SELECT 'ELO','CRED',SUM(Vlr_TPV_credito_a_vista_Elo),SUM(Vlr_MDR_credito_a_vista_Elo),SUM(Vlr_IC_credito_a_vista_Elo),SUM(CAST(Vlr_Fee_credito_a_vista_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Elo) FROM base
      UNION ALL SELECT 'HIPER','CRED',SUM(Vlr_TPV_credito_a_vista_Hipercard),SUM(Vlr_MDR_credito_a_vista_Hipercard),SUM(Vlr_IC_credito_a_vista_Hipercard),SUM(CAST(Vlr_Fee_credito_a_vista_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','CRED',SUM(Vlr_TPV_credito_a_vista_Amex),SUM(Vlr_MDR_credito_a_vista_Amex),SUM(Vlr_IC_credito_a_vista_Amex),SUM(CAST(Vlr_Fee_credito_a_vista_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Amex) FROM base
      UNION ALL SELECT 'VISA','PSJ1',SUM(Vlr_TPV_credito__2_6_Visa),SUM(Vlr_MDR_credito__2_6_Visa),SUM(Vlr_IC_credito__2_6_Visa),SUM(CAST(Vlr_Fee_credito__2_6_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Visa) FROM base
      UNION ALL SELECT 'MASTER','PSJ1',SUM(Vlr_TPV_credito__2_6_MasterCard),SUM(Vlr_MDR_credito__2_6_MasterCard),SUM(Vlr_IC_credito__2_6_MasterCard),SUM(CAST(Vlr_Fee_credito__2_6_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_MasterCard) FROM base
      UNION ALL SELECT 'ELO','PSJ1',SUM(Vlr_TPV_credito__2_6_Elo),SUM(Vlr_MDR_credito__2_6_Elo),SUM(Vlr_IC_credito__2_6_Elo),SUM(CAST(Vlr_Fee_credito__2_6_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Elo) FROM base
      UNION ALL SELECT 'HIPER','PSJ1',SUM(Vlr_TPV_credito__2_6_Hipercard),SUM(Vlr_MDR_credito__2_6_Hipercard),SUM(Vlr_IC_credito__2_6_Hipercard),SUM(CAST(Vlr_Fee_credito__2_6_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','PSJ1',SUM(Vlr_TPV_credito__2_6_Amex),SUM(Vlr_MDR_credito__2_6_Amex),SUM(Vlr_IC_credito__2_6_Amex),SUM(CAST(Vlr_Fee_credito__2_6_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Amex) FROM base
      UNION ALL SELECT 'VISA','PSJ2',SUM(Vlr_TPV_credito_7_12_Visa),SUM(Vlr_MDR_credito_7_12_Visa),SUM(Vlr_IC_credito_7_12_Visa),SUM(CAST(Vlr_Fee_credito_7_12_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Visa) FROM base
      UNION ALL SELECT 'MASTER','PSJ2',SUM(Vlr_TPV_credito_7_12_MasterCard),SUM(Vlr_MDR_credito_7_12_MasterCard),SUM(Vlr_IC_credito_7_12_MasterCard),SUM(CAST(Vlr_Fee_credito_7_12_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_MasterCard) FROM base
      UNION ALL SELECT 'ELO','PSJ2',SUM(Vlr_TPV_credito_7_12_Elo),SUM(Vlr_MDR_credito_7_12_Elo),SUM(Vlr_IC_credito_7_12_Elo),SUM(CAST(Vlr_Fee_credito_7_12_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Elo) FROM base
      UNION ALL SELECT 'HIPER','PSJ2',SUM(Vlr_TPV_credito_7_12_Hipercard),SUM(Vlr_MDR_credito_7_12_Hipercard),SUM(Vlr_IC_credito_7_12_Hipercard),SUM(CAST(Vlr_Fee_credito_7_12_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','PSJ2',SUM(Vlr_TPV_credito_7_12_Amex),SUM(Vlr_MDR_credito_7_12_Amex),SUM(Vlr_IC_credito_7_12_Amex),SUM(CAST(Vlr_Fee_credito_7_12_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Amex) FROM base
      -- Totais por modalidade (linha SHARE — sem quebra por bandeira)
      UNION ALL SELECT 'SHARE','DEB',
        SUM(Vlr_TPV_debito_Visa+Vlr_TPV_debito_MasterCard+Vlr_TPV_debito_Elo),
        SUM(Vlr_MDR_debito_Visa+Vlr_MDR_debito_MasterCard+Vlr_MDR_debito_Elo),
        SUM(Vlr_IC_debito_Visa+Vlr_IC_debito_MasterCard+Vlr_IC_debito_Elo),
        SUM(CAST(Vlr_Fee_debito_Visa AS FLOAT64)+CAST(Vlr_Fee_debito_MasterCard AS FLOAT64)+CAST(Vlr_Fee_debito_Elo AS FLOAT64)),
        SUM(Vlr_NetMDR_debito_Visa+Vlr_NetMDR_debito_MasterCard+Vlr_NetMDR_debito_Elo) FROM base
      UNION ALL SELECT 'SHARE','CRED',
        SUM(Vlr_TPV_credito_a_vista_Visa+Vlr_TPV_credito_a_vista_MasterCard+Vlr_TPV_credito_a_vista_Elo+Vlr_TPV_credito_a_vista_Hipercard+Vlr_TPV_credito_a_vista_Amex),
        SUM(Vlr_MDR_credito_a_vista_Visa+Vlr_MDR_credito_a_vista_MasterCard+Vlr_MDR_credito_a_vista_Elo+Vlr_MDR_credito_a_vista_Hipercard+Vlr_MDR_credito_a_vista_Amex),
        SUM(Vlr_IC_credito_a_vista_Visa+Vlr_IC_credito_a_vista_MasterCard+Vlr_IC_credito_a_vista_Elo+Vlr_IC_credito_a_vista_Hipercard+Vlr_IC_credito_a_vista_Amex),
        SUM(CAST(Vlr_Fee_credito_a_vista_Visa AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Elo AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_a_vista_Visa+Vlr_NetMDR_credito_a_vista_MasterCard+Vlr_NetMDR_credito_a_vista_Elo+Vlr_NetMDR_credito_a_vista_Hipercard+Vlr_NetMDR_credito_a_vista_Amex) FROM base
      UNION ALL SELECT 'SHARE','PSJ1',
        SUM(Vlr_TPV_credito__2_6_Visa+Vlr_TPV_credito__2_6_MasterCard+Vlr_TPV_credito__2_6_Elo+Vlr_TPV_credito__2_6_Hipercard+Vlr_TPV_credito__2_6_Amex),
        SUM(Vlr_MDR_credito__2_6_Visa+Vlr_MDR_credito__2_6_MasterCard+Vlr_MDR_credito__2_6_Elo+Vlr_MDR_credito__2_6_Hipercard+Vlr_MDR_credito__2_6_Amex),
        SUM(Vlr_IC_credito__2_6_Visa+Vlr_IC_credito__2_6_MasterCard+Vlr_IC_credito__2_6_Elo+Vlr_IC_credito__2_6_Hipercard+Vlr_IC_credito__2_6_Amex),
        SUM(CAST(Vlr_Fee_credito__2_6_Visa AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Elo AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_2_6_Visa+Vlr_NetMDR_credito_2_6_MasterCard+Vlr_NetMDR_credito_2_6_Elo+Vlr_NetMDR_credito_2_6_Hipercard+Vlr_NetMDR_credito_2_6_Amex) FROM base
      UNION ALL SELECT 'SHARE','PSJ2',
        SUM(Vlr_TPV_credito_7_12_Visa+Vlr_TPV_credito_7_12_MasterCard+Vlr_TPV_credito_7_12_Elo+Vlr_TPV_credito_7_12_Hipercard+Vlr_TPV_credito_7_12_Amex),
        SUM(Vlr_MDR_credito_7_12_Visa+Vlr_MDR_credito_7_12_MasterCard+Vlr_MDR_credito_7_12_Elo+Vlr_MDR_credito_7_12_Hipercard+Vlr_MDR_credito_7_12_Amex),
        SUM(Vlr_IC_credito_7_12_Visa+Vlr_IC_credito_7_12_MasterCard+Vlr_IC_credito_7_12_Elo+Vlr_IC_credito_7_12_Hipercard+Vlr_IC_credito_7_12_Amex),
        SUM(CAST(Vlr_Fee_credito_7_12_Visa AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Elo AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_7_12_Visa+Vlr_NetMDR_credito_7_12_MasterCard+Vlr_NetMDR_credito_7_12_Elo+Vlr_NetMDR_credito_7_12_Hipercard+Vlr_NetMDR_credito_7_12_Amex) FROM base
    ) cells
    ORDER BY
      CASE band WHEN 'SHARE' THEN 0 ELSE 1 END,  -- SHARE vem primeiro
      CASE modal WHEN 'DEB' THEN 1 WHEN 'CRED' THEN 2 WHEN 'PSJ1' THEN 3 WHEN 'PSJ2' THEN 4 END,
      CASE band  WHEN 'VISA' THEN 1 WHEN 'MASTER' THEN 2 WHEN 'ELO' THEN 3 WHEN 'HIPER' THEN 4 WHEN 'AMEX' THEN 5 END
  `;
  return runBQ_(sql);
}

// ── Enterprise 10: Todos Produtos (mensal, todas as métricas) ─
function getEnterpriseTodosProdutos(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g, '').trim();
  const grupoWhere = buildGrupoWhere_(f);
  const mesWhere = (f.meses && f.meses.length) ? `AND FORMAT_DATE('%m/%Y', Dt_Month) IN (${f.meses.map(m => `'${safe(m)}'`).join(',')})` : f.mes ? `AND FORMAT_DATE('%m/%Y', Dt_Month) = '${safe(f.mes)}'` : '';
  const sql = `
    SELECT
      FORMAT_DATE('%m/%Y', Dt_Month)                                                    AS mes,
      ROUND(SUM(GMV), 2)                                                                AS gmv,
      ROUND(SUM(TPV_Sub), 2)                                                            AS tpv_sub,
      ROUND(SUM(TPV_Gateway), 2)                                                        AS tpv_gtw,
      ROUND(SUM(TPV_BOLETO), 2)                                                         AS tpv_boleto,
      ROUND(SUM(Pix_Total), 2)                                                          AS tpv_pix,
      ROUND(SUM(TPV_Adquirencia), 2)                                                    AS tpv_cartao,
      ROUND(SUM(Net_MDR_Stone), 2)                                                      AS net_mdr,
      ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone), NULLIF(SUM(TPV_Adquirencia),0)), 4)        AS net_mdr_pct,
      ROUND(SUM(Floating_Stn), 2)                                                       AS floating,
      ROUND(SAFE_DIVIDE(SUM(Floating_Stn), NULLIF(SUM(GMV),0)), 4)                     AS floating_pct,
      ROUND(SUM(Receita_Pix_Pagarme), 2)                                                AS rcta_pix_pagarme,
      ROUND(SUM(Receita_Pix_POS), 2)                                                    AS rcta_pix_pos,
      ROUND(SUM(Receita_Pix_Geral), 2)                                                  AS rcta_pix_total,
      ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral), NULLIF(SUM(GMV),0)), 4)                AS pix_pct,
      ROUND(SUM(Vlr_GrossValue_STN), 2)                                                 AS gross_rav,
      ROUND(SUM(Receita_RAV_STN), 2)                                                    AS rcta_rav,
      ROUND(SUM(Vlr_Custo_fund_STN), 2)                                                 AS cof,
      ROUND(SUM(Margem_RAV_STN), 2)                                                     AS mrg_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV),0)), 4)                  AS mrg_rav_pct,
      ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN),0)), 4) AS tx_simples,
      ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue), NULLIF(SUM(Vlr_GrossValue_STN),0)), 1) AS duration_dc,
      ROUND(SUM(Rcta_Aluguel), 2)                                                       AS aluguel,
      ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel), NULLIF(SUM(GMV),0)), 4)                     AS aluguel_pct,
      ROUND(SUM(Rcta_Boleto), 2)                                                        AS rcta_boleto,
      ROUND(SUM(Rcta_gateway), 2)                                                       AS rcta_gateway,
      ROUND(SUM(Rcta_Antifraude), 2)                                                    AS rcta_antifraude,
      ROUND(SUM(Receita_TED), 2)                                                        AS rcta_transf,
      ROUND(SUM(Rcta_Setup), 2)                                                         AS rcta_setup,
      ROUND(SUM(Receita_Net_COF), 2)                                                    AS receita_ncof,
      ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF), NULLIF(SUM(GMV),0)), 4)                  AS tkr_ncof,
      ROUND(SUM(Margem_Query), 2)                                                       AS margem,
      ROUND(SAFE_DIVIDE(SUM(Margem_Query), NULLIF(SUM(GMV),0)), 4)                     AS margem_gmv
    FROM ${ENT_TABLE}
    WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
      ${grupoWhere}
      ${mesWhere}
    GROUP BY Dt_Month
    ORDER BY Dt_Month DESC
  `;
  return runBQ_(sql);
}

// ── Enterprise 11: Afiliações e Documentos ───────────────────
function getEnterpriseAfiliacoes() {
  const sql = `
    WITH last3 AS (
      SELECT MAX(Dt_Month) AS max_dt FROM ${ENT_TABLE}
        WHERE Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH)
    )
    SELECT
      motivo                                    AS grupo,
      CAST(SC AS STRING)                        AS afiliacao,
      ClientCNPJorCPF                           AS documento,
      CAST(MCC AS STRING)                       AS mcc,
      categoria,
      ROUND(AVG(GMV), 2)                        AS avg_tpv_3m,
      ROUND(AVG(Receita_Net_COF), 2)            AS avg_ncof_3m
    FROM ${ENT_TABLE} CROSS JOIN last3
    WHERE Dt_Month > DATE_SUB(max_dt, INTERVAL 3 MONTH)
      AND Dt_Month <= max_dt
      AND motivo IS NOT NULL
    GROUP BY motivo, SC, ClientCNPJorCPF, MCC, categoria
    ORDER BY avg_tpv_3m DESC
  `;
  return runBQ_(sql);
}

// ── Query 4: Fluxo de Caixa Crédito (mensal) ─────────────────
function getFluxoCreditoMensal(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    WITH loans AS (
      SELECT DISTINCT LoanId, documento
      FROM \`dataplatform-prd.credit_policy_studies.credit_portfolio\`
      WHERE documento = '${doc}'
    )
    SELECT
      FORMAT_DATE('%Y-%m', a.reference_date) AS mes,
      ROUND(SUM(a.financial_income_net), 2) AS receita_juros,
      ROUND(SUM(a.funding_cost), 2) AS funding_cost,
      ROUND(SUM(a.capital_cost), 2) AS capital_cost,
      ROUND(SUM(a.pdd_result), 2) AS pdd_result,
      ROUND(SUM(a.variable_cost), 2) AS variable_cost,
      ROUND(SUM(a.net_cf), 2) AS net_cf,
      ROUND(SUM(a.financial_income_net - a.funding_cost - a.capital_cost), 2) AS nii,
      ROUND(SUM(a.financial_income_net - a.funding_cost - a.capital_cost - a.pdd_result), 2) AS risk_adj_nii
    FROM \`pricing-dedicated-non-prod.credit_pricing.npv_kgiro\` a
    JOIN loans b ON a.loanid = b.LoanId
    WHERE a.run_at = (SELECT MAX(run_at) FROM \`pricing-dedicated-non-prod.credit_pricing.npv_kgiro\`)
    GROUP BY a.reference_date
    ORDER BY a.reference_date
  `;
  return runBQ_(sql);
}
// ════════════════════════════════════════════════════════════════
// GRUPOS MARCA — Funções de dados
// Fonte: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_GM
// Filtro fixo: Produto_PnL IN ('Apends','RAV')
// ════════════════════════════════════════════════════════════════

const GM_TABLE = '`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias.PnL_GM`';
const GM_FILTER = "Produto_PnL IN ('Apends','RAV')";

function buildGMWhere_(f, base) {
  const safe = s => (s || '').replace(/'/g,'').replace(/\\/g,'').trim();
  const w = [base || GM_FILTER];
  if (f && f.grupos  && f.grupos.length)  w.push('motivo IN (' + f.grupos.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f && f.grupo1s && f.grupo1s.length) w.push('categoria IN (' + f.grupo1s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f && f.grupo2s && f.grupo2s.length) w.push('responsible_agent_id IN (' + f.grupo2s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f && f.docs    && f.docs.length)    w.push('ClientCNPJorCPF IN (' + f.docs.map(d=>"'"+safe(d)+"'").join(',') + ')');
  if (f && f.scs     && f.scs.length)     w.push('CAST(SC AS STRING) IN (' + f.scs.map(s=>"'"+safe(s)+"'").join(',') + ')');
  if (f && f.mccs    && f.mccs.length)    w.push('CAST(MCC AS STRING) IN (' + f.mccs.map(m=>"'"+safe(m)+"'").join(',') + ')');
  if (f && f.mes)                         w.push("FORMAT_DATE('%m/%Y', Dt_Month) = '" + safe(f.mes) + "'");
  return w.join(' AND ');
}

function getGMBaseGeral(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').replace(/\\/g,'').trim();
  const clauses = [GM_FILTER, "Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)"];
  if (f.docs    && f.docs.length)    clauses.push('ClientCNPJorCPF IN (' + f.docs.map(d=>"'"+safe(d)+"'").join(',') + ')');
  if (f.grupos  && f.grupos.length)  clauses.push('motivo IN (' + f.grupos.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.grupo1s && f.grupo1s.length) clauses.push('categoria IN (' + f.grupo1s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.grupo2s && f.grupo2s.length) clauses.push('responsible_agent_id IN (' + f.grupo2s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.scs     && f.scs.length)     clauses.push('CAST(SC AS STRING) IN (' + f.scs.map(s=>"'"+safe(s)+"'").join(',') + ')');
  if (f.mccs    && f.mccs.length)    clauses.push('CAST(MCC AS STRING) IN (' + f.mccs.map(m=>"'"+safe(m)+"'").join(',') + ')');
  if (f.mes)                         clauses.push("FORMAT_DATE('%m/%Y', Dt_Month) = '" + safe(f.mes) + "'");
  const where = clauses.join(' AND ');
  const sql = 'SELECT FORMAT_DATE(\'%m/%Y\', Dt_Month) AS mes,' +
    ' ROUND(SUM(GMV),2) AS gmv, ROUND(SUM(TPV_Adquirencia),2) AS tpv_cartao,' +
    ' ROUND(SUM(Pix_Total),2) AS tpv_pix, ROUND(SUM(TPV_BOLETO),2) AS tpv_boleto,' +
    ' ROUND(SUM(TPV_Sub),2) AS tpv_sub,' +
    ' ROUND(SUM(Net_MDR_Stone),2) AS net_mdr,' +
    ' ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),6) AS net_mdr_pct,' +
    ' ROUND(SUM(Floating_Stn),2) AS floating_conta, ROUND(SAFE_DIVIDE(SUM(Floating_Stn),NULLIF(SUM(GMV),0)),4) AS floating_pct,' +
    ' ROUND(SUM(floating_delayed),2) AS delay_rcta, ROUND(SAFE_DIVIDE(SUM(floating_delayed),NULLIF(SUM(GMV),0)),4) AS delay_pct,' +
    ' ROUND(SUM(Rcta_Aluguel),2) AS aluguel, ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel),NULLIF(SUM(GMV),0)),4) AS aluguel_pct,' +
    ' ROUND(SUM(Margem_RAV_STN),2) AS net_rav, ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN),NULLIF(SUM(GMV),0)),4) AS rav_pct,' +
    ' ROUND(SUM(Receita_TED),2) AS rcta_ted, ROUND(SUM(Receita_Pix_Geral),2) AS rcta_pix,' +
    ' ROUND(SUM(Receita_Net_COF),2) AS receita_ncof, ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF),NULLIF(SUM(GMV),0)),4) AS tkr_ncof,' +
    ' ROUND(SUM(custo_servir_Total)*-1,2) AS cogs,' +
    ' ROUND(SUM(Margem_Query),2) AS margem, ROUND(SAFE_DIVIDE(SUM(Margem_Query),NULLIF(SUM(GMV),0)),4) AS margem_gmv' +
    ' FROM ' + GM_TABLE + ' WHERE ' + where + ' GROUP BY Dt_Month ORDER BY Dt_Month DESC';
  return runBQ_(sql);
}

function getGMVisao3M() {
  const sql = "WITH latest AS (SELECT MAX(Dt_Month) AS max_dt FROM " + GM_TABLE + " WHERE " + GM_FILTER + ")" +
    " SELECT f.motivo AS grupo," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_3 ELSE 0 END),2) AS gmv_m3," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_2 ELSE 0 END),2) AS gmv_m2," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.GMV_Menos_1 ELSE 0 END),2) AS gmv_m1," +
    " ROUND(SUM(CASE WHEN f.Dt_Month = l.max_dt THEN f.GMV_M0 ELSE 0 END),2) AS gmv_m0," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_3 ELSE 0 END),2) AS ncof_m3," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_2 ELSE 0 END),2) AS ncof_m2," +
    " ROUND(SUM(CASE WHEN f.Dt_Month < l.max_dt THEN f.Receita_Net_COF_M_Menos_1 ELSE 0 END),2) AS ncof_m1," +
    " ROUND(SUM(CASE WHEN f.Dt_Month = l.max_dt THEN f.Receita_Net_COF_m0 ELSE 0 END),2) AS ncof_m0" +
    " FROM " + GM_TABLE + " f CROSS JOIN latest l" +
    " WHERE " + GM_FILTER + " AND f.motivo IS NOT NULL" +
    " GROUP BY f.motivo HAVING gmv_m1 > 0 OR gmv_m0 > 0 ORDER BY gmv_m1 DESC";
  return runBQ_(sql);
}

function getGMTransacional(filters) {
  const f = filters || {};
  const base = GM_FILTER + " AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)";
  const where = buildGMWhere_(f, base);
  const sql = "SELECT FORMAT_DATE('%m/%Y', Dt_Month) AS mes," +
    " ROUND(SUM(TPV_Adquirencia),2) AS ctpv, ROUND(SUM(MDR_Stone),2) AS mdr, ROUND(SUM(IC_Stone),2) AS ic," +
    " ROUND(SUM(CAST(Fee_Stone AS FLOAT64)),2) AS fee, ROUND(SUM(Net_MDR_Stone),2) AS net_mdr," +
    " ROUND(SUM(Impostos_MDR_Stone),2) AS impostos," +
    " ROUND(SAFE_DIVIDE(SUM(MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),4) AS mdr_pct," +
    " ROUND(SAFE_DIVIDE(SUM(IC_Stone),NULLIF(SUM(TPV_Adquirencia),0)),4) AS ic_pct," +
    " ROUND(SAFE_DIVIDE(SUM(CAST(Fee_Stone AS FLOAT64)),NULLIF(SUM(TPV_Adquirencia),0)),4) AS fee_pct," +
    " ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),6) AS net_mdr_pct," +
    " ROUND(SAFE_DIVIDE(SUM(Impostos_MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),4) AS impostos_pct" +
    " FROM " + GM_TABLE + " WHERE " + where + " GROUP BY Dt_Month ORDER BY Dt_Month DESC";
  return runBQ_(sql);
}

function getGMTransacionalGrupos() {
  const sq1 = "(SELECT MAX(Dt_Month) AS dt_atual, (SELECT MAX(Dt_Month) FROM " + GM_TABLE + " WHERE " + GM_FILTER + " AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH)) AS dt_m1 FROM " + GM_TABLE + " WHERE " + GM_FILTER + ")";
  const sql = "WITH dates AS " + sq1 +
    " SELECT f.motivo AS grupo," +
    " ROUND(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),2) AS ctpv_m1," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.MDR_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS mdr_pct_m1," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.IC_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS ic_pct_m1," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN CAST(f.Fee_Stone AS FLOAT64) ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS fee_pct_m1," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.Net_MDR_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_m1 THEN f.TPV_Adquirencia ELSE 0 END),0)),6) AS net_mdr_pct_m1," +
    " ROUND(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),2) AS ctpv_m0," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.MDR_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS mdr_pct_m0," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.IC_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS ic_pct_m0," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN CAST(f.Fee_Stone AS FLOAT64) ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),4) AS fee_pct_m0," +
    " ROUND(SAFE_DIVIDE(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.Net_MDR_Stone ELSE 0 END),NULLIF(SUM(CASE WHEN f.Dt_Month=d.dt_atual THEN f.TPV_Adquirencia ELSE 0 END),0)),6) AS net_mdr_pct_m0" +
    " FROM " + GM_TABLE + " f CROSS JOIN dates d" +
    " WHERE " + GM_FILTER + " AND f.motivo IS NOT NULL AND f.Dt_Month IN (d.dt_m1, d.dt_atual)" +
    " GROUP BY f.motivo ORDER BY ctpv_m1 DESC";
  return runBQ_(sql);
}

function getGMRAV(filters) {
  const f = filters || {};
  const base = GM_FILTER + " AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)";
  const where = buildGMWhere_(f, base);
  const sql = "SELECT FORMAT_DATE('%m/%Y', Dt_Month) AS mes," +
    " ROUND(SUM(TPV_Antecipavel),2) AS tpv_ant, ROUND(SUM(Vlr_GrossValue_STN),2) AS gross," +
    " ROUND(SAFE_DIVIDE(SUM(Vlr_GrossValue_STN),NULLIF(SUM(TPV_Antecipavel),0)),4) AS pct_rav," +
    " ROUND(SUM(Receita_RAV_STN),2) AS rcta_rav, ROUND(SUM(Vlr_Custo_fund_STN),2) AS cof," +
    " ROUND(SUM(Margem_RAV_STN),2) AS mrg_rav, ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN),NULLIF(SUM(GMV),0)),4) AS mrg_rav_pct," +
    " ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),4) AS tx_simples," +
    " ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),1) AS duration_dc" +
    " FROM " + GM_TABLE + " WHERE " + where + " GROUP BY Dt_Month ORDER BY Dt_Month DESC";
  return runBQ_(sql);
}

function getGMRAVCliente(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').trim();
  const mesW = f.mes
    ? "AND FORMAT_DATE('%m/%Y', Dt_Month) = '" + safe(f.mes) + "'"
    : "AND Dt_Month = (SELECT MAX(Dt_Month) FROM " + GM_TABLE + " WHERE " + GM_FILTER + " AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))";
  const grpW = f.grupos && f.grupos.length ? "AND motivo IN (" + f.grupos.map(g=>"'"+safe(g)+"'").join(',') + ")" : '';
  const sql = "SELECT motivo AS grupo, FORMAT_DATE('%m/%Y', MIN(Dt_Month)) AS mes_ref," +
    " ROUND(SUM(TPV_Antecipavel),2) AS tpv_ant, ROUND(SUM(Vlr_GrossValue_STN),2) AS gross," +
    " ROUND(SAFE_DIVIDE(SUM(Vlr_GrossValue_STN),NULLIF(SUM(TPV_Antecipavel),0)),4) AS pct_rav," +
    " ROUND(SUM(Receita_RAV_STN),2) AS rcta_rav, ROUND(SUM(Vlr_Custo_fund_STN),2) AS cof," +
    " ROUND(SUM(Margem_RAV_STN),2) AS mrg_rav, ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN),NULLIF(SUM(GMV),0)),4) AS mrg_rav_pct," +
    " ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),4) AS tx_simples," +
    " ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),1) AS duration_dc" +
    " FROM " + GM_TABLE + " WHERE " + GM_FILTER + " AND motivo IS NOT NULL " + mesW + " " + grpW +
    " GROUP BY motivo HAVING gross > 0 ORDER BY gross DESC";
  return runBQ_(sql);
}

function getGMMetricasCliente(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').trim();
  const mesW = f.mes ? "AND FORMAT_DATE('%m/%Y', Dt_Month) = '" + safe(f.mes) + "'" : '';
  const grpW = f.grupos && f.grupos.length ? "AND motivo IN (" + f.grupos.map(g=>"'"+safe(g)+"'").join(',') + ")" : '';
  const sql = "SELECT motivo AS grupo," +
    " ROUND(SUM(GMV),2) AS gmv, ROUND(SUM(TPV_Adquirencia),2) AS tpv_cartao, ROUND(SUM(Pix_Total),2) AS tpv_pix," +
    " ROUND(SUM(Net_MDR_Stone),2) AS net_mdr," +
    " ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),6) AS net_mdr_pct," +
    " ROUND(SUM(Vlr_GrossValue_STN),2) AS gross_rav, ROUND(SUM(Floating_Stn),2) AS floating," +
    " ROUND(SAFE_DIVIDE(SUM(Floating_Stn),NULLIF(SUM(GMV),0)),4) AS floating_pct," +
    " ROUND(SUM(Receita_Pix_Geral),2) AS rcta_pix, ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral),NULLIF(SUM(GMV),0)),4) AS pix_pct," +
    " ROUND(SUM(Margem_RAV_STN),2) AS mrg_rav, ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),4) AS tx_simples," +
    " ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),1) AS duration_dc," +
    " ROUND(SUM(Receita_Net_COF),2) AS rct_netcof, ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF),NULLIF(SUM(GMV),0)),4) AS tkr_ncof," +
    " ROUND(SUM(Margem_Query),2) AS margem, ROUND(SAFE_DIVIDE(SUM(Margem_Query),NULLIF(SUM(GMV),0)),4) AS margem_gmv" +
    " FROM " + GM_TABLE + " WHERE " + GM_FILTER + " AND motivo IS NOT NULL " + mesW + " " + grpW +
    " GROUP BY motivo ORDER BY gmv DESC";
  return runBQ_(sql);
}

function getGMLinhasReceita(filters) {
  const f = filters || {};
  const base = GM_FILTER + " AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH)";
  const where = buildGMWhere_(f, base);
  const sql = "SELECT FORMAT_DATE('%m/%Y', Dt_Month) AS mes," +
    " ROUND(SUM(Net_MDR_Stone),2) AS rcta_net_mdr, ROUND(SUM(Receita_Pix_Geral),2) AS rcta_pix," +
    " ROUND(SUM(Margem_RAV_STN),2) AS mrg_rav, ROUND(SUM(Rcta_gateway),2) AS rcta_gateway," +
    " ROUND(SUM(Rcta_Aluguel),2) AS rcta_aluguel, ROUND(SUM(Floating_Stn),2) AS rcta_floating," +
    " ROUND(SUM(Rcta_Boleto),2) AS rcta_boleto, ROUND(SUM(Rcta_Antifraude),2) AS rcta_antifraude," +
    " ROUND(SUM(Rcta_transferencia),2) AS rcta_transf, ROUND(SUM(Rcta_Setup),2) AS rcta_setup," +
    " ROUND(SUM(Receita_Net_COF),2) AS receita_ncof, ROUND(SUM(custo_servir_Total)*-1,2) AS custo_servir," +
    " ROUND(SUM(Margem_Query),2) AS margem" +
    " FROM " + GM_TABLE + " WHERE " + where + " GROUP BY Dt_Month ORDER BY Dt_Month ASC";
  return runBQ_(sql);
}

function getGMAfiliacoes() {
  const sql = "WITH last3 AS (SELECT MAX(Dt_Month) AS max_dt FROM " + GM_TABLE +
    " WHERE " + GM_FILTER + " AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))" +
    " SELECT motivo AS grupo, CAST(SC AS STRING) AS afiliacao, ClientCNPJorCPF AS documento," +
    " CAST(MCC AS STRING) AS mcc, categoria, ROUND(AVG(GMV),2) AS avg_tpv_3m, ROUND(AVG(Receita_Net_COF),2) AS avg_ncof_3m" +
    " FROM " + GM_TABLE + " CROSS JOIN last3" +
    " WHERE " + GM_FILTER + " AND motivo IS NOT NULL AND Dt_Month > DATE_SUB(max_dt, INTERVAL 3 MONTH) AND Dt_Month <= max_dt" +
    " GROUP BY motivo, SC, ClientCNPJorCPF, MCC, categoria ORDER BY avg_tpv_3m DESC";
  return runBQ_(sql);
}

function getGMFilterOptions(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').replace(/\\/g,'').trim();
  const w = [GM_FILTER];
  if (f.grupos  && f.grupos.length)  w.push('motivo IN (' + f.grupos.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.grupo1s && f.grupo1s.length) w.push('categoria IN (' + f.grupo1s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.grupo2s && f.grupo2s.length) w.push('responsible_agent_id IN (' + f.grupo2s.map(g=>"'"+safe(g)+"'").join(',') + ')');
  if (f.docs    && f.docs.length)    w.push('ClientCNPJorCPF IN (' + f.docs.map(d=>"'"+safe(d)+"'").join(',') + ')');
  if (f.scs     && f.scs.length)     w.push('CAST(SC AS STRING) IN (' + f.scs.map(s=>"'"+safe(s)+"'").join(',') + ')');
  if (f.mccs    && f.mccs.length)    w.push('CAST(MCC AS STRING) IN (' + f.mccs.map(m=>"'"+safe(m)+"'").join(',') + ')');
  const where = w.join(' AND ');
  const sql = "SELECT tipo, valor FROM (" +
    "  SELECT 'grupo' AS tipo, motivo AS valor FROM " + GM_TABLE + " WHERE motivo IS NOT NULL AND " + where + " GROUP BY motivo UNION ALL" +
    "  SELECT 'grupo1', categoria FROM " + GM_TABLE + " WHERE categoria IS NOT NULL AND " + where + " GROUP BY categoria UNION ALL" +
    "  SELECT 'grupo2', responsible_agent_id FROM " + GM_TABLE + " WHERE responsible_agent_id IS NOT NULL AND " + where + " GROUP BY responsible_agent_id UNION ALL" +
    "  SELECT 'mcc', CAST(MCC AS STRING) FROM " + GM_TABLE + " WHERE MCC IS NOT NULL AND " + where + " GROUP BY MCC UNION ALL" +
    "  SELECT 'mes', FORMAT_DATE('%m/%Y', Dt_Month) FROM " + GM_TABLE + " WHERE Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH) AND " + where + " GROUP BY Dt_Month UNION ALL" +
    "  SELECT 'doc', ClientCNPJorCPF FROM (SELECT ClientCNPJorCPF, COUNT(*) AS cnt FROM " + GM_TABLE + " WHERE ClientCNPJorCPF IS NOT NULL AND " + where + " GROUP BY ClientCNPJorCPF ORDER BY cnt DESC LIMIT 500) UNION ALL" +
    "  SELECT 'sc', CAST(SC AS STRING) FROM (SELECT SC, COUNT(*) AS cnt FROM " + GM_TABLE + " WHERE SC IS NOT NULL AND " + where + " GROUP BY SC ORDER BY cnt DESC LIMIT 500)" +
    ") WHERE valor IS NOT NULL AND valor != ''" +
    " ORDER BY tipo," +
    "  CASE WHEN tipo='mes' THEN -UNIX_DATE(DATE(CAST(SPLIT(valor,'/')[OFFSET(1)] AS INT64),CAST(SPLIT(valor,'/')[OFFSET(0)] AS INT64),1)) ELSE NULL END," +
    "  CASE WHEN tipo!='mes' THEN valor ELSE NULL END";
  return runBQ_(sql);
}

function getGMModalidade(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').trim();
  const grupoWhere = buildGMWhere_(f, '');
  const dtWhere = f.mes
    ? `AND FORMAT_DATE('%m/%Y', Dt_Month) = '${safe(f.mes)}'`
    : `AND Dt_Month = (SELECT MAX(Dt_Month) FROM ${GM_TABLE} WHERE ${GM_FILTER} AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))`;
  const sql = `
    WITH base AS (
      SELECT * FROM ${GM_TABLE}
      WHERE 1=1 ${dtWhere} ${grupoWhere}
    ),
    totais AS (SELECT SUM(TPV_Adquirencia) AS tpv_total FROM base)
    SELECT band, modal,
      ROUND(SAFE_DIVIDE(tpv_cell, t.tpv_total),4) AS share,
      ROUND(SAFE_DIVIDE(mdr_cell, NULLIF(tpv_cell,0)),4) AS mdr_pct,
      ROUND(SAFE_DIVIDE(ic_cell,  NULLIF(tpv_cell,0)),4) AS ic_pct,
      ROUND(SAFE_DIVIDE(fee_cell, NULLIF(tpv_cell,0)),4) AS fee_pct,
      ROUND(SAFE_DIVIDE(net_cell, NULLIF(tpv_cell,0)),4) AS net_mdr_pct
    FROM totais t, (
      SELECT 'VISA' AS band,'DEB' AS modal,SUM(Vlr_TPV_debito_Visa) AS tpv_cell,SUM(Vlr_MDR_debito_Visa) AS mdr_cell,SUM(Vlr_IC_debito_Visa) AS ic_cell,SUM(CAST(Vlr_Fee_debito_Visa AS FLOAT64)) AS fee_cell,SUM(Vlr_NetMDR_debito_Visa) AS net_cell FROM base
      UNION ALL SELECT 'MASTER','DEB',SUM(Vlr_TPV_debito_MasterCard),SUM(Vlr_MDR_debito_MasterCard),SUM(Vlr_IC_debito_MasterCard),SUM(CAST(Vlr_Fee_debito_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_debito_MasterCard) FROM base
      UNION ALL SELECT 'ELO','DEB',SUM(Vlr_TPV_debito_Elo),SUM(Vlr_MDR_debito_Elo),SUM(Vlr_IC_debito_Elo),SUM(CAST(Vlr_Fee_debito_Elo AS FLOAT64)),SUM(Vlr_NetMDR_debito_Elo) FROM base
      UNION ALL SELECT 'VISA','CRED',SUM(Vlr_TPV_credito_a_vista_Visa),SUM(Vlr_MDR_credito_a_vista_Visa),SUM(Vlr_IC_credito_a_vista_Visa),SUM(CAST(Vlr_Fee_credito_a_vista_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Visa) FROM base
      UNION ALL SELECT 'MASTER','CRED',SUM(Vlr_TPV_credito_a_vista_MasterCard),SUM(Vlr_MDR_credito_a_vista_MasterCard),SUM(Vlr_IC_credito_a_vista_MasterCard),SUM(CAST(Vlr_Fee_credito_a_vista_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_MasterCard) FROM base
      UNION ALL SELECT 'ELO','CRED',SUM(Vlr_TPV_credito_a_vista_Elo),SUM(Vlr_MDR_credito_a_vista_Elo),SUM(Vlr_IC_credito_a_vista_Elo),SUM(CAST(Vlr_Fee_credito_a_vista_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Elo) FROM base
      UNION ALL SELECT 'HIPER','CRED',SUM(Vlr_TPV_credito_a_vista_Hipercard),SUM(Vlr_MDR_credito_a_vista_Hipercard),SUM(Vlr_IC_credito_a_vista_Hipercard),SUM(CAST(Vlr_Fee_credito_a_vista_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','CRED',SUM(Vlr_TPV_credito_a_vista_Amex),SUM(Vlr_MDR_credito_a_vista_Amex),SUM(Vlr_IC_credito_a_vista_Amex),SUM(CAST(Vlr_Fee_credito_a_vista_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_a_vista_Amex) FROM base
      UNION ALL SELECT 'VISA','PSJ1',SUM(Vlr_TPV_credito__2_6_Visa),SUM(Vlr_MDR_credito__2_6_Visa),SUM(Vlr_IC_credito__2_6_Visa),SUM(CAST(Vlr_Fee_credito__2_6_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Visa) FROM base
      UNION ALL SELECT 'MASTER','PSJ1',SUM(Vlr_TPV_credito__2_6_MasterCard),SUM(Vlr_MDR_credito__2_6_MasterCard),SUM(Vlr_IC_credito__2_6_MasterCard),SUM(CAST(Vlr_Fee_credito__2_6_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_MasterCard) FROM base
      UNION ALL SELECT 'ELO','PSJ1',SUM(Vlr_TPV_credito__2_6_Elo),SUM(Vlr_MDR_credito__2_6_Elo),SUM(Vlr_IC_credito__2_6_Elo),SUM(CAST(Vlr_Fee_credito__2_6_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Elo) FROM base
      UNION ALL SELECT 'HIPER','PSJ1',SUM(Vlr_TPV_credito__2_6_Hipercard),SUM(Vlr_MDR_credito__2_6_Hipercard),SUM(Vlr_IC_credito__2_6_Hipercard),SUM(CAST(Vlr_Fee_credito__2_6_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','PSJ1',SUM(Vlr_TPV_credito__2_6_Amex),SUM(Vlr_MDR_credito__2_6_Amex),SUM(Vlr_IC_credito__2_6_Amex),SUM(CAST(Vlr_Fee_credito__2_6_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_2_6_Amex) FROM base
      UNION ALL SELECT 'VISA','PSJ2',SUM(Vlr_TPV_credito_7_12_Visa),SUM(Vlr_MDR_credito_7_12_Visa),SUM(Vlr_IC_credito_7_12_Visa),SUM(CAST(Vlr_Fee_credito_7_12_Visa AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Visa) FROM base
      UNION ALL SELECT 'MASTER','PSJ2',SUM(Vlr_TPV_credito_7_12_MasterCard),SUM(Vlr_MDR_credito_7_12_MasterCard),SUM(Vlr_IC_credito_7_12_MasterCard),SUM(CAST(Vlr_Fee_credito_7_12_MasterCard AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_MasterCard) FROM base
      UNION ALL SELECT 'ELO','PSJ2',SUM(Vlr_TPV_credito_7_12_Elo),SUM(Vlr_MDR_credito_7_12_Elo),SUM(Vlr_IC_credito_7_12_Elo),SUM(CAST(Vlr_Fee_credito_7_12_Elo AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Elo) FROM base
      UNION ALL SELECT 'HIPER','PSJ2',SUM(Vlr_TPV_credito_7_12_Hipercard),SUM(Vlr_MDR_credito_7_12_Hipercard),SUM(Vlr_IC_credito_7_12_Hipercard),SUM(CAST(Vlr_Fee_credito_7_12_Hipercard AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Hipercard) FROM base
      UNION ALL SELECT 'AMEX','PSJ2',SUM(Vlr_TPV_credito_7_12_Amex),SUM(Vlr_MDR_credito_7_12_Amex),SUM(Vlr_IC_credito_7_12_Amex),SUM(CAST(Vlr_Fee_credito_7_12_Amex AS FLOAT64)),SUM(Vlr_NetMDR_credito_7_12_Amex) FROM base
      UNION ALL SELECT 'SHARE','DEB',
        SUM(Vlr_TPV_debito_Visa+Vlr_TPV_debito_MasterCard+Vlr_TPV_debito_Elo),
        SUM(Vlr_MDR_debito_Visa+Vlr_MDR_debito_MasterCard+Vlr_MDR_debito_Elo),
        SUM(Vlr_IC_debito_Visa+Vlr_IC_debito_MasterCard+Vlr_IC_debito_Elo),
        SUM(CAST(Vlr_Fee_debito_Visa AS FLOAT64)+CAST(Vlr_Fee_debito_MasterCard AS FLOAT64)+CAST(Vlr_Fee_debito_Elo AS FLOAT64)),
        SUM(Vlr_NetMDR_debito_Visa+Vlr_NetMDR_debito_MasterCard+Vlr_NetMDR_debito_Elo) FROM base
      UNION ALL SELECT 'SHARE','CRED',
        SUM(Vlr_TPV_credito_a_vista_Visa+Vlr_TPV_credito_a_vista_MasterCard+Vlr_TPV_credito_a_vista_Elo+Vlr_TPV_credito_a_vista_Hipercard+Vlr_TPV_credito_a_vista_Amex),
        SUM(Vlr_MDR_credito_a_vista_Visa+Vlr_MDR_credito_a_vista_MasterCard+Vlr_MDR_credito_a_vista_Elo+Vlr_MDR_credito_a_vista_Hipercard+Vlr_MDR_credito_a_vista_Amex),
        SUM(Vlr_IC_credito_a_vista_Visa+Vlr_IC_credito_a_vista_MasterCard+Vlr_IC_credito_a_vista_Elo+Vlr_IC_credito_a_vista_Hipercard+Vlr_IC_credito_a_vista_Amex),
        SUM(CAST(Vlr_Fee_credito_a_vista_Visa AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Elo AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito_a_vista_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_a_vista_Visa+Vlr_NetMDR_credito_a_vista_MasterCard+Vlr_NetMDR_credito_a_vista_Elo+Vlr_NetMDR_credito_a_vista_Hipercard+Vlr_NetMDR_credito_a_vista_Amex) FROM base
      UNION ALL SELECT 'SHARE','PSJ1',
        SUM(Vlr_TPV_credito__2_6_Visa+Vlr_TPV_credito__2_6_MasterCard+Vlr_TPV_credito__2_6_Elo+Vlr_TPV_credito__2_6_Hipercard+Vlr_TPV_credito__2_6_Amex),
        SUM(Vlr_MDR_credito__2_6_Visa+Vlr_MDR_credito__2_6_MasterCard+Vlr_MDR_credito__2_6_Elo+Vlr_MDR_credito__2_6_Hipercard+Vlr_MDR_credito__2_6_Amex),
        SUM(Vlr_IC_credito__2_6_Visa+Vlr_IC_credito__2_6_MasterCard+Vlr_IC_credito__2_6_Elo+Vlr_IC_credito__2_6_Hipercard+Vlr_IC_credito__2_6_Amex),
        SUM(CAST(Vlr_Fee_credito__2_6_Visa AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Elo AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito__2_6_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_2_6_Visa+Vlr_NetMDR_credito_2_6_MasterCard+Vlr_NetMDR_credito_2_6_Elo+Vlr_NetMDR_credito_2_6_Hipercard+Vlr_NetMDR_credito_2_6_Amex) FROM base
      UNION ALL SELECT 'SHARE','PSJ2',
        SUM(Vlr_TPV_credito_7_12_Visa+Vlr_TPV_credito_7_12_MasterCard+Vlr_TPV_credito_7_12_Elo+Vlr_TPV_credito_7_12_Hipercard+Vlr_TPV_credito_7_12_Amex),
        SUM(Vlr_MDR_credito_7_12_Visa+Vlr_MDR_credito_7_12_MasterCard+Vlr_MDR_credito_7_12_Elo+Vlr_MDR_credito_7_12_Hipercard+Vlr_MDR_credito_7_12_Amex),
        SUM(Vlr_IC_credito_7_12_Visa+Vlr_IC_credito_7_12_MasterCard+Vlr_IC_credito_7_12_Elo+Vlr_IC_credito_7_12_Hipercard+Vlr_IC_credito_7_12_Amex),
        SUM(CAST(Vlr_Fee_credito_7_12_Visa AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_MasterCard AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Elo AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Hipercard AS FLOAT64)+CAST(Vlr_Fee_credito_7_12_Amex AS FLOAT64)),
        SUM(Vlr_NetMDR_credito_7_12_Visa+Vlr_NetMDR_credito_7_12_MasterCard+Vlr_NetMDR_credito_7_12_Elo+Vlr_NetMDR_credito_7_12_Hipercard+Vlr_NetMDR_credito_7_12_Amex) FROM base
    ) cells
    ORDER BY
      CASE band WHEN 'SHARE' THEN 0 ELSE 1 END,
      CASE modal WHEN 'DEB' THEN 1 WHEN 'CRED' THEN 2 WHEN 'PSJ1' THEN 3 WHEN 'PSJ2' THEN 4 END,
      CASE band  WHEN 'VISA' THEN 1 WHEN 'MASTER' THEN 2 WHEN 'ELO' THEN 3 WHEN 'HIPER' THEN 4 WHEN 'AMEX' THEN 5 END
  `;
  return runBQ_(sql);
}

function getGMTodosProdutos(filters) {
  const f = filters || {};
  const safe = s => (s || '').replace(/'/g,'').trim();
  const grpW = f.grupos && f.grupos.length ? 'AND motivo IN (' + f.grupos.map(g=>"'" + safe(g) + "'").join(',') + ')' : '';
  const mesW = f.meses && f.meses.length ? "AND FORMAT_DATE('%m/%Y', Dt_Month) IN (" + f.meses.map(m=>"'" + safe(m) + "'").join(',') + ')' : '';
  const where = GM_FILTER + ' AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH) ' + grpW + ' ' + mesW;
  const sql = "SELECT FORMAT_DATE('%m/%Y', Dt_Month) AS mes, ROUND(SUM(GMV),2) AS gmv, ROUND(SUM(TPV_Sub),2) AS tpv_sub, ROUND(SUM(Pix_Total),2) AS tpv_pix, ROUND(SUM(TPV_Adquirencia),2) AS tpv_cartao, ROUND(SUM(Net_MDR_Stone),2) AS net_mdr, ROUND(SAFE_DIVIDE(SUM(Net_MDR_Stone),NULLIF(SUM(TPV_Adquirencia),0)),6) AS net_mdr_pct, ROUND(SUM(Floating_Stn),2) AS floating, ROUND(SAFE_DIVIDE(SUM(Floating_Stn),NULLIF(SUM(GMV),0)),4) AS floating_pct, ROUND(SUM(Vlr_GrossValue_STN),2) AS gross_rav, ROUND(SUM(Receita_RAV_STN),2) AS rcta_rav, ROUND(SUM(Vlr_Custo_fund_STN),2) AS cof, ROUND(SUM(Margem_RAV_STN),2) AS mrg_rav, ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN),NULLIF(SUM(TPV_Antecipavel),0)),4) AS mrg_rav_pct, ROUND(SAFE_DIVIDE(SUM(TxPre_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),4) AS tx_simples, ROUND(SAFE_DIVIDE(SUM(DurationDC_x_GrossValue),NULLIF(SUM(Vlr_GrossValue_STN),0)),1) AS duration_dc, ROUND(SUM(Rcta_Aluguel),2) AS aluguel, ROUND(SAFE_DIVIDE(SUM(Rcta_Aluguel),NULLIF(SUM(GMV),0)),4) AS aluguel_pct, ROUND(SUM(Receita_Net_COF),2) AS receita_ncof, ROUND(SAFE_DIVIDE(SUM(Receita_Net_COF),NULLIF(SUM(GMV),0)),4) AS tkr_ncof, ROUND(SUM(Margem_Query),2) AS margem, ROUND(SAFE_DIVIDE(SUM(Margem_Query),NULLIF(SUM(GMV),0)),4) AS margem_gmv FROM " + GM_TABLE + " WHERE " + where + " GROUP BY Dt_Month ORDER BY Dt_Month DESC";
  return runBQ_(sql);
}
