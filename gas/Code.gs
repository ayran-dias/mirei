// ═══════════════════════════════════════════════════════════════
// Code.gs · Felícia 360 — Dashboard Vida Econômica
// Arquitetura: BQ-only via Advanced Service
// ═══════════════════════════════════════════════════════════════

const BQ_PROJECT = 'sbj7ujlwjbsknn8v396xaahlf4ogck';

// ── Routing ───────────────────────────────────────────────────
function doGet(e) {
  const page = (e && e.parameter && e.parameter.page) || 'home';

  // TEMP: admin actions
  if (page === 'reset-data-8f3q') {
    const result = resetRoadmapDataFromDefault();
    return HtmlService.createHtmlOutput('<pre>' + JSON.stringify(result) + '</pre>');
  }
  if (page === 'inject-cronograma-8f3q') {
    const result = updateCronogramaTable_();
    return HtmlService.createHtmlOutput('<pre>' + JSON.stringify(result) + '</pre>');
  }
  if (page === 'list-tables-8f3q') {
    var props = PropertiesService.getScriptProperties();
    var raw = props.getProperty('roadmap_data') || '{"nodes":[]}';
    var data = JSON.parse(raw);
    var tables = (data.nodes || []).filter(function(n) { return n.type === 'table'; }).map(function(n) {
      return { id: n.id, title: (n.data || {}).title, cols: ((n.data || {}).columns || []).length, rows: ((n.data || {}).rows || []).length, pos: n.position };
    });
    return HtmlService.createHtmlOutput('<pre>' + JSON.stringify(tables, null, 2) + '</pre>');
  }

  // ── Rota para estudos HTML interativos (?page=study-<id>) ──────
  // Serve o arquivo Study_<id>.html fullscreen, sem wrapper React
  if (page.indexOf('study-') === 0) {
    const studyId = page.replace('study-', '');
    try {
      const output = HtmlService.createHtmlOutputFromFile('Study_' + studyId)
        .addMetaTag('viewport', 'width=device-width, initial-scale=1')
        .setTitle('Estudo: ' + studyId)
        .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
      return output;
    } catch (err) {
      // Arquivo nao encontrado — cai no fluxo normal
    }
  }

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
// Auto-migration: atualiza frames para C=400, width=360, heights por coluna
function fixFrameSizes_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return;
  var data = JSON.parse(raw);

  var C = 400; // novo pitch entre colunas
  var R = 160; // row pitch (inalterado)

  // Mapa de frames: col -> { height, title }
  var frameSpec = {
    0: { height: 1520, title: 'Felícia 360' },
    1: { height: 1360, title: 'Adquirência' },
    2: { height: 880,  title: 'Banking' },
    3: { height: 720,  title: 'Carteiras' },
    4: { height: 1360, title: 'Ferramentas & Repo' },
    5: { height: 1040, title: 'Infraestrutura' },
    6: { height: 880,  title: 'Próximos' },
    7: { height: 1040, title: 'Simulador' }
  };

  data.nodes = (data.nodes || []).map(function(n) {
    // Atualizar frames
    var frameMatch = (n.id || '').match(/^frame-col-(\d+)$/);
    if (frameMatch) {
      var col = parseInt(frameMatch[1], 10);
      var spec = frameSpec[col];
      if (spec) {
        n.position = { x: C * col - 65, y: -40 };
        n.style = n.style || {};
        n.style.width = 360;
        n.style.height = spec.height;
        if (n.data) n.data.expandedHeight = spec.height;
      }
      return n;
    }

    // Atualizar labels (lbl-*) — posicao x = C*col
    var lblMap = { 'lbl-f360': 0, 'lbl-adq': 1, 'lbl-banking': 2, 'lbl-carteiras': 3,
                   'lbl-ferramentas': 4, 'lbl-infra': 5, 'lbl-proximo': 6, 'lbl-simulador': 7 };
    if (lblMap.hasOwnProperty(n.id)) {
      n.position = { x: C * lblMap[n.id], y: -80 };
      return n;
    }

    // Atualizar cards — recalcular x baseado na coluna (detectar pela posição relativa ao pitch antigo ou pelo id)
    if (n.type === 'card' && n.position) {
      // Detectar coluna pelo x atual: oldC=300, col = Math.round(x / 300)
      var oldC = 300;
      var col = Math.round(n.position.x / oldC);
      if (col >= 0 && col <= 7) {
        n.position.x = C * col;
        // y permanece inalterado (R*row não mudou)
      }
    }

    return n;
  });

  props.setProperty('roadmap_data', JSON.stringify(data));
}

function fixEdgeHandles_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return;
  var data = JSON.parse(raw);
  data.edges = (data.edges || []).map(function(e) {
    // Forçar bottom->top em TODOS (não apenas nos sem sourceHandle)
    e.sourceHandle = 'bottom';
    e.targetHandle = 'top';
    return e;
  });
  props.setProperty('roadmap_data', JSON.stringify(data));
}

// Migration: aplica edgeStyle 'animated' em todos os edges salvos
function fixEdgeStyleAnimated_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return;
  var data = JSON.parse(raw);
  data.edges = (data.edges || []).map(function(e) {
    if (!e.data) e.data = {};
    e.data.edgeStyle = 'animated';
    return e;
  });
  props.setProperty('roadmap_data', JSON.stringify(data));
}

// Auto-migration: remapeia posições y dos cards do pitch antigo para o novo
// Suporta dois cenários: 160->200 (legado) e 240->200 (após redução recente)
// Também recalcula altura dos frames proporcionalmente
function fixRowPitch_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return;
  var data = JSON.parse(raw);
  // Detectar se o pitch atual é 160 ou 240 para aplicar o remap correto
  var allCards = (data.nodes || []).filter(function(n) { return n.type === 'card'; });
  var hasOld160 = allCards.some(function(n) { return n.position.y > 0 && n.position.y < 200; });
  var OLD_R = hasOld160 ? 160 : 240; var NEW_R = 200;

  data.nodes = (data.nodes || []).map(function(n) {
    if (n.type === 'label') {
      // Labels ficam no mesmo y relativo — não mudar
      return n;
    }
    if (n.type === 'frame') {
      // Calcular nCards da coluna baseado na altura antiga
      var oldH = (n.style || {}).height || 0;
      var nCards = Math.round((oldH - 80) / OLD_R);
      var newH = nCards * NEW_R + 80;
      return Object.assign({}, n, {
        style: Object.assign({}, n.style || {}, { height: newH }),
        data: Object.assign({}, n.data, { expandedHeight: newH })
      });
    }
    if (n.type === 'card') {
      // Remapear índice de linha: detectar qual row o card está (round to nearest OLD_R)
      var rowIdx = Math.round(n.position.y / OLD_R);
      var newY = rowIdx * NEW_R;
      return Object.assign({}, n, {
        position: { x: n.position.x, y: newY }
      });
    }
    return n;
  });

  props.setProperty('roadmap_data', JSON.stringify(data));
}

function fixRowPitchV2_() {
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return;
  var data = JSON.parse(raw);
  var NEW_R = 170;
  // Detectar R atual: pegar o menor y positivo entre cards tipo 'card' = OLD_R
  var ys = [];
  (data.nodes || []).forEach(function(n) {
    if (n.type === 'card' && n.position.y > 50 && n.position.y < 600) ys.push(n.position.y);
  });
  if (ys.length === 0) return;
  ys.sort(function(a,b){return a-b;});
  var OLD_R = ys[0]; // menor y positivo ≈ posição da linha 1
  if (Math.abs(OLD_R - NEW_R) < 10) return; // já está correto, não fazer nada
  var ratio = NEW_R / OLD_R;
  data.nodes = data.nodes.map(function(n) {
    if (n.type === 'card' || n.type === 'label') {
      return Object.assign({}, n, { position: { x: n.position.x, y: Math.round(n.position.y * ratio) } });
    }
    if (n.type === 'frame') {
      var oldH = (n.style || {}).height || 0;
      var newH = Math.round(oldH * ratio);
      return Object.assign({}, n, {
        style: Object.assign({}, n.style || {}, { height: newH }),
        data: Object.assign({}, n.data, { expandedHeight: newH })
      });
    }
    return n;
  });
  props.setProperty('roadmap_data', JSON.stringify(data));
}

function getRoadmapData() {
  var email = Session.getActiveUser().getEmail();
  var isEditor = EDITOR_EMAILS.indexOf(email) !== -1;
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  // Seed automático: roda se node 'lbl-banking' não existe (v5 cascade)
  var parsed = raw ? JSON.parse(raw) : { nodes: [], edges: [] };
  // v5: layout cascata horizontal por coluna
  var hasSeeded = (parsed.nodes || []).some(function(n) { return n.id === 'frame-col-0-v2'; });
  if (!hasSeeded) {
    seedRoadmapV5();
    raw = props.getProperty('roadmap_data');
  }
  // Se não há dado personalizado, usar o layout padrão salvo pelos editores
  if (!raw || raw === '{"nodes":[],"edges":[]}') {
    var defaultRaw = props.getProperty('roadmap_default_layout');
    if (defaultRaw) {
      raw = defaultRaw;
    }
  }
  // Forçar fix de edges bottom→top se ainda não foi aplicado (v3)
  var edgeFixMarker = props.getProperty('edge_fix_v3');
  if (!edgeFixMarker) {
    fixEdgeHandles_();
    props.setProperty('edge_fix_v3', '1');
    raw = props.getProperty('roadmap_data');
  }
  // Migration: aplicar edgeStyle 'animated' em todos os edges salvos (v1)
  var animMarker = props.getProperty('edge_anim_v1');
  if (!animMarker) {
    fixEdgeStyleAnimated_();
    props.setProperty('edge_anim_v1', '1');
    raw = props.getProperty('roadmap_data');
  }
  // Forçar R=170 se necessário
  var rowV2Marker = props.getProperty('rowfix_v2');
  if (!rowV2Marker) {
    fixRowPitchV2_();
    props.setProperty('rowfix_v2', '1');
    raw = props.getProperty('roadmap_data');
  }
  // Auto-migration: corrigir handles de edges se necessário
  var parsedForMigration = JSON.parse(raw || '{"nodes":[],"edges":[]}');
  var needsEdgeFix = (parsedForMigration.nodes || []).some(function(n) { return n.id === 'lbl-banking'; }) &&
                     (parsedForMigration.edges || []).some(function(e) { return !e.sourceHandle || e.sourceHandle === 'right'; });
  if (needsEdgeFix) {
    fixEdgeHandles_();
    raw = props.getProperty('roadmap_data');
    parsedForMigration = JSON.parse(raw || '{"nodes":[],"edges":[]}');
  }
  // REMOVED: fixFrameSizes_ and fixRowPitch_ heuristic migrations.
  // These ran on every load without a marker, detecting card positions heuristically.
  // After manual positioning by the user, the heuristics would false-positive and
  // overwrite all saved positions/sizes with hardcoded grid values.
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

function saveRoadmapDefaultLayout(json) {
  var email = Session.getActiveUser().getEmail();
  if (EDITOR_EMAILS.indexOf(email) === -1) {
    return { error: 'Sem permissao de edicao' };
  }
  PropertiesService.getScriptProperties().setProperty('roadmap_default_layout', json);
  return { ok: true };
}

// TEMP: atualiza tabela existente table-1780517152951 com dados completos
function updateCronogramaTable_() {
  var TARGET_ID = 'table-1780517152951';
  var cols = [
    { header: 'Pilar', hasCheckbox: false, options: ['Informação','Política','Processo','Gestão de Carteira'] },
    { header: 'O que', hasCheckbox: false },
    { header: 'Dono', hasCheckbox: false },
    { header: 'Área Par', hasCheckbox: false },
    { header: 'Gargalo', hasCheckbox: false },
    { header: 'Descrição', hasCheckbox: false },
    { header: 'Início', hasCheckbox: false },
    { header: 'Término', hasCheckbox: false },
    { header: 'Status', hasCheckbox: false, options: ['Não iniciado','Em andamento','Concluído','Bloqueado'] },
    { header: 'Comentário', hasCheckbox: false }
  ];
  var rawRows = [
    ['Informação','Construção Repositório Mesa Banco','Dias','','','Ponto único de informação (Mesa 360º), estudos, links, regras, padrões operacionais, simuladores, etc','','','',''],
    ['Informação','Mesa 360º','Dias','','','Estruturar base de dados centralizada integrando adquirência, banking e crédito por CNPJ — fonte única da verdade para todas as análises e decisões da Mesa.','','','',''],
    ['Informação','Visão Integrada Banco por Grupo','Dias','','','Construir visão consolidada de exposição, receita e relacionamento por grupo econômico, cruzando todas as verticais de produto.','','','',''],
    ['Informação','Visão Carteira','Dias','','','Painel de saúde da carteira ativa da Mesa com cortes por safra, ticket médio, mix de produto, status de contrato e evolução de receita.','','','',''],
    ['Informação','Análise Exploratória','Bazetti / Dias','','','Mapeamento inicial da base de clientes elegíveis à Mesa: segmentação por TPV, perfil de crédito, produto atual e potencial de bundle.','','','',''],
    ['Informação','Breakdown Automático','Frazão','','','Automação do breakdown Real vs Premissado por deal — eliminando compilação manual pelo analista.','','','',''],
    ['Informação','Reports Consolidados','Frazão','','','Relatórios periódicos de performance da Mesa (semanal/mensal) com visão de pipeline, deals fechados, margem realizada.','','','',''],
    ['Informação','Revisão FEE e IC','Bazetti','','','Revisão e consolidação das estruturas de fee e Indicadores de Crédito aplicáveis nas negociações da Mesa.','','','',''],
    ['Informação','Revisão de Unit Economics','Guto','','','Reconstrução dos unit economics por segmento e produto, calibrando premissas de margem, custo de capital e payback.','','','',''],
    ['Informação','Banco de Contratos Concorrência','Guto','','','Repositório estruturado de contratos e condições praticadas pela concorrência.','','','',''],
    ['Política','Estudos de Casos','Bazetti / Guto','','','Análise retrospectiva de deals fechados (ganhos e perdidos) para calibrar política de preço e alçada.','','','',''],
    ['Política','Simulador por NPV','','','','Ferramenta de simulação do NPV de cada deal considerando premissas de TPV, prazo, taxa e custo de capital.','','','',''],
    ['Política','Regras de Entrada na Mesa','','','','Definição formal dos critérios mínimos de elegibilidade para acesso à Mesa Banco.','','','',''],
    ['Política','Regras de Decisão Venda','','','','Playbook de decisão para negociações de aquisição: floor de margem, condições de bundle obrigatório.','','','',''],
    ['Política','Regras de Decisão Base','','','','Playbook de decisão para negociações com base ativa: critérios de renegociação, proteção de contrato.','','','',''],
    ['Política','Governança RASCI','','','','Matriz RASCI formalizada para cada tipo de decisão na Mesa.','','','',''],
    ['Política','Simulador de Probabilidade de Margem','','','','Modelo probabilístico (Monte Carlo) que gera intervalo de margem esperada por deal.','','','',''],
    ['Processo','Portal de Entrada Mesa','','','','Interface centralizada de entrada de oportunidades na Mesa Banco: formulário estruturado, triagem automática.','','','',''],
    ['Processo','Construção de SLA','','','','Definição e formalização dos SLAs por etapa do fluxo da Mesa.','','','',''],
    ['Processo','Visualização das Etapas Fluxo Mesa','','','','Painel de acompanhamento de status do processo para o cliente e/ou área comercial.','','','',''],
    ['Processo','Mesa de Antecipação','','','','Estruturação do subprocesso de antecipação como produto negociável dentro da Mesa.','','','',''],
    ['Gestão de Carteira','Rituais de Gestão de Carteira','','','','Definição e implementação dos rituais periódicos de revisão da carteira ativa.','','','',''],
    ['Gestão de Carteira','Rituais Áreas Pares','','','','Cadência formal de alinhamento com Crédito, Banking e Comercial.','','','',''],
    ['Gestão de Carteira','Checks de Comprimento de Contrato','','','','Processo de monitoramento de vencimento de contratos ativos com alertas antecipados.','','','','']
  ];
  var rows = rawRows.map(function(r, i) {
    return { id: 'cr-' + (i+1), cells: r.map(function(text) { return { text: text }; }) };
  });
  var newData = {
    title: 'Cronograma Mesa Banco',
    columns: cols,
    rows: rows,
    headerColor: '#00461e',
    headerFontColor: '#ffffff',
    stripeColor: '#f0faf0',
    fontColor: '#1A1A1A'
  };
  var props = PropertiesService.getScriptProperties();
  var raw = props.getProperty('roadmap_data');
  if (!raw) return { error: 'no roadmap_data' };
  var data = JSON.parse(raw);
  var found = false;
  data.nodes = (data.nodes || []).map(function(n) {
    if (n.id === TARGET_ID) {
      found = true;
      n.data = newData;
      n.style = { width: 1800, height: 1000 };
    }
    return n;
  });
  if (!found) return { error: 'node not found: ' + TARGET_ID };
  props.setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, updated: TARGET_ID, rows: rawRows.length, cols: cols.length };
}

// LEGACY: injectCronogramaTable_ (replaced by updateCronogramaTable_)
function injectCronogramaTable_() {
  var cols = [
    { header: 'Pilar', hasCheckbox: false, options: ['Informação','Política','Processo','Gestão de Carteira'] },
    { header: 'O que', hasCheckbox: false },
    { header: 'Dono', hasCheckbox: false },
    { header: 'Área Par', hasCheckbox: false },
    { header: 'Gargalo', hasCheckbox: false },
    { header: 'Descrição', hasCheckbox: false },
    { header: 'Início', hasCheckbox: false },
    { header: 'Término', hasCheckbox: false },
    { header: 'Status', hasCheckbox: false, options: ['Não iniciado','Em andamento','Concluído','Bloqueado'] },
    { header: 'Comentário', hasCheckbox: false }
  ];
  var rawRows = [
    ['Informação','Construção Repositório Mesa Banco','Dias','','','Ponto único de informação (Mesa 360º), estudos, links, regras, padrões operacionais, simuladores, etc','','','',''],
    ['Informação','Mesa 360º','Dias','','','Estruturar base de dados centralizada integrando adquirência, banking e crédito por CNPJ — fonte única da verdade para todas as análises e decisões da Mesa.','','','',''],
    ['Informação','Visão Integrada Banco por Grupo','Dias','','','Construir visão consolidada de exposição, receita e relacionamento por grupo econômico, cruzando todas as verticais de produto.','','','',''],
    ['Informação','Visão Carteira','Dias','','','Painel de saúde da carteira ativa da Mesa com cortes por safra, ticket médio, mix de produto, status de contrato e evolução de receita.','','','',''],
    ['Informação','Análise Exploratória','Bazetti / Dias','','','Mapeamento inicial da base de clientes elegíveis à Mesa: segmentação por TPV, perfil de crédito, produto atual e potencial de bundle.','','','',''],
    ['Informação','Breakdown Automático','Frazão','','','Automação do breakdown Real vs Premissado por deal — eliminando compilação manual pelo analista.','','','',''],
    ['Informação','Reports Consolidados','Frazão','','','Relatórios periódicos de performance da Mesa (semanal/mensal) com visão de pipeline, deals fechados, margem realizada.','','','',''],
    ['Informação','Revisão FEE e IC','Bazetti','','','Revisão e consolidação das estruturas de fee e Indicadores de Crédito aplicáveis nas negociações da Mesa.','','','',''],
    ['Informação','Revisão de Unit Economics','Guto','','','Reconstrução dos unit economics por segmento e produto, calibrando premissas de margem, custo de capital e payback.','','','',''],
    ['Informação','Banco de Contratos Concorrência','Guto','','','Repositório estruturado de contratos e condições praticadas pela concorrência.','','','',''],
    ['Política','Estudos de Casos','Bazetti / Guto','','','Análise retrospectiva de deals fechados (ganhos e perdidos) para calibrar política de preço e alçada.','','','',''],
    ['Política','Simulador por NPV','','','','Ferramenta de simulação do NPV de cada deal considerando premissas de TPV, prazo, taxa e custo de capital.','','','',''],
    ['Política','Regras de Entrada na Mesa','','','','Definição formal dos critérios mínimos de elegibilidade para acesso à Mesa Banco.','','','',''],
    ['Política','Regras de Decisão Venda','','','','Playbook de decisão para negociações de aquisição: floor de margem, condições de bundle obrigatório.','','','',''],
    ['Política','Regras de Decisão Base','','','','Playbook de decisão para negociações com base ativa: critérios de renegociação, proteção de contrato.','','','',''],
    ['Política','Governança RASCI','','','','Matriz RASCI formalizada para cada tipo de decisão na Mesa.','','','',''],
    ['Política','Simulador de Probabilidade de Margem','','','','Modelo probabilístico (Monte Carlo) que gera intervalo de margem esperada por deal.','','','',''],
    ['Processo','Portal de Entrada Mesa','','','','Interface centralizada de entrada de oportunidades na Mesa Banco: formulário estruturado, triagem automática.','','','',''],
    ['Processo','Construção de SLA','','','','Definição e formalização dos SLAs por etapa do fluxo da Mesa.','','','',''],
    ['Processo','Visualização das Etapas Fluxo Mesa','','','','Painel de acompanhamento de status do processo para o cliente e/ou área comercial.','','','',''],
    ['Processo','Mesa de Antecipação','','','','Estruturação do subprocesso de antecipação como produto negociável dentro da Mesa.','','','',''],
    ['Gestão de Carteira','Rituais de Gestão de Carteira','','','','Definição e implementação dos rituais periódicos de revisão da carteira ativa.','','','',''],
    ['Gestão de Carteira','Rituais Áreas Pares','','','','Cadência formal de alinhamento com Crédito, Banking e Comercial.','','','',''],
    ['Gestão de Carteira','Checks de Comprimento de Contrato','','','','Processo de monitoramento de vencimento de contratos ativos com alertas antecipados.','','','','']
  ];
  var rows = rawRows.map(function(r, i) {
    return { id: 'cr-' + (i+1), cells: r.map(function(text) { return { text: text }; }) };
  });
  var tableNode = {
    id: 'table-cronograma-mesa-' + Date.now(),
    type: 'table',
    position: { x: 3200, y: 0 },
    data: {
      title: 'Cronograma Mesa Banco',
      columns: cols,
      rows: rows,
      headerColor: '#00461e',
      headerFontColor: '#ffffff',
      stripeColor: '#f0faf0',
      fontColor: '#1A1A1A'
    },
    style: { width: 1600, height: 900 },
    zIndex: 0
  };
  var nodesJson = JSON.stringify([tableNode]);
  var edgesJson = JSON.stringify([]);
  return addRoadmapNodes(nodesJson, edgesJson);
}

// TEMP: restaura roadmap_data a partir do roadmap_default_layout
// Chamar uma vez via execução direta no editor GAS, depois remover
function resetRoadmapDataFromDefault() {
  var props = PropertiesService.getScriptProperties();
  var defaultRaw = props.getProperty('roadmap_default_layout');
  if (!defaultRaw) return { error: 'roadmap_default_layout vazio' };
  props.setProperty('roadmap_data', defaultRaw);
  return { ok: true, bytes: defaultRaw.length };
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

      // ═══ SESSÃO 2026-05-29 — MELHORIAS UI ═══
      { id: 'lbl-ui-0529', type: 'label', position: { x: 0, y: 1700 }, data: { text: 'Felícia 360 — Melhorias UI (2026-05-29)', fontSize: 26 }, style: { width: 540, height: 40 } },
      // Linha 1 (y=1780)
      { id: 'font-rotulos-fluxo', type: 'card', position: { x: 0, y: 1780 }, data: { title: 'Rótulos Fluxo de Caixa', description: 'isKeyPoint: first/last/inflexões nos highlight lines (Net CF + Margem)', status: 'done', category: 'fix' } },
      { id: 'font-tabela-adq', type: 'card', position: { x: 280, y: 1780 }, data: { title: 'Fonte Tabela Adquirência', description: 'font-mono → font-sans em células numéricas e tooltips', status: 'done', category: 'fix' } },
      { id: 'filtro-meses-adq', type: 'card', position: { x: 560, y: 1780 }, data: { title: 'Filtro de Meses — Detalhado Mensal', description: 'Pills de meses com toggle individual + Todos/Nenhum em lote', status: 'done', category: 'feature' } },
      // Linha 2 (y=1940)
      { id: 'navbar-mobile', type: 'card', position: { x: 0, y: 1940 }, data: { title: 'Navbar Mobile Reorganizada', description: 'Seções ACOMPANHAMENTOS / FERRAMENTAS / REPOSITÓRIO com separadores', status: 'done', category: 'fix' } },
      { id: 'mcc-toggle', type: 'card', position: { x: 280, y: 1940 }, data: { title: 'MCC Toggle no InfoCliente', description: 'Mostra só número por default, pill \'ver\' revela nome completo', status: 'done', category: 'feature' } },
      { id: 'ofertas-reorder', type: 'card', position: { x: 560, y: 1940 }, data: { title: 'Ofertas de Crédito — Reorder + Collapse', description: 'Ordem: Cartão → Desembolso → Demais Ofertas (colapsável, fechado por default)', status: 'done', category: 'feature' } },
      // Linha 3 (y=2100)
      { id: 'roadmap-fundo', type: 'card', position: { x: 0, y: 2100 }, data: { title: 'Roadmap — Fundo Acompanhamentos', description: 'CollapsibleCard abaixo do canvas com links para Enterprise e Grupos Marca', status: 'done', category: 'feature' } },

      // ═══ SESSÃO 2026-05-29 — SIMULADOR ADQUIRÊNCIA ═══
      { id: 'lbl-sim-0529', type: 'label', position: { x: 0, y: 2260 }, data: { text: 'Simulador Adquirência — Pesquisa (2026-05-29)', fontSize: 26 }, style: { width: 560, height: 40 } },
      // Linha 1 (y=2340)
      { id: 'simulador-digital', type: 'card', position: { x: 0, y: 2340 }, data: { title: 'Disseção Simulador Digital', description: '38 abas mapeadas. 10 funções de adquirência identificadas (MDR, RAV, IC, CET, Payback)', status: 'done', category: 'feature' } },
      { id: 'simulador-polos', type: 'card', position: { x: 280, y: 2340 }, data: { title: 'Disseção Simulador Polos', description: '61 abas. Comissão franquia 0,48% TPV + rebates. CAC por canal. CET 1x-18x.', status: 'done', category: 'feature' } },
      { id: 'pnl-api-check', type: 'card', position: { x: 560, y: 2340 }, data: { title: 'PnL API — Viabilidade Simulador', description: 'API não aceita share livre. Arquitetura: motor JS no frontend + API como fonte de premissas via BQ', status: 'done', category: 'feature' } },

      // ═══ PRÓXIMOS PASSOS — SIMULADOR ═══
      { id: 'lbl-sim-next', type: 'label', position: { x: 0, y: 2500 }, data: { text: 'Próximos Passos — Simulador', fontSize: 26 }, style: { width: 420, height: 40 } },
      // Linha 1 (y=2580)
      { id: 'motor-js', type: 'card', position: { x: 0, y: 2580 }, data: { title: 'Motor JS — Simulação Adquirência', description: 'Implementar motor de cálculo no frontend: Net MDR, RAV, IC, floating, payback. Usar premissas do BQ.', status: 'planned', category: 'feature' } },
      { id: 'share-editavel', type: 'card', position: { x: 280, y: 2580 }, data: { title: 'Share de Modalidade Editável', description: 'UI para o usuário ajustar share débito/crédito/parcelado por bandeira. Validar vs premissas regionais do BQ.', status: 'planned', category: 'feature' } },
      { id: 'unificar-estudos', type: 'card', position: { x: 560, y: 2580 }, data: { title: 'Unificar Estudos Mesa Banco', description: 'Mover 2026-04-30-mesa-banco para dentro de 2026-05-20-felicia-credito como fase 1 do projeto.', status: 'planned', category: 'improvement' } },
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
      // Sessão 2026-05-29 — Melhorias UI (chain horizontal por linha)
      { id: 'e-ui-rotulos-fonte', source: 'font-rotulos-fluxo', target: 'font-tabela-adq' },
      { id: 'e-ui-fonte-filtro', source: 'font-tabela-adq', target: 'filtro-meses-adq' },
      { id: 'e-ui-navbar-mcc', source: 'navbar-mobile', target: 'mcc-toggle' },
      { id: 'e-ui-mcc-ofertas', source: 'mcc-toggle', target: 'ofertas-reorder' },
      // Sessão 2026-05-29 — Simulador (chain horizontal)
      { id: 'e-sim-digital-polos', source: 'simulador-digital', target: 'simulador-polos' },
      { id: 'e-sim-polos-api', source: 'simulador-polos', target: 'pnl-api-check' },
      // Próximos Passos Simulador (chain horizontal)
      { id: 'e-next-motor-share', source: 'motor-js', target: 'share-editavel' },
      { id: 'e-next-share-unif', source: 'share-editavel', target: 'unificar-estudos' },
      // Ligação pesquisa → próximos
      { id: 'e-sim-api-motor', source: 'pnl-api-check', target: 'motor-js' },
    ]
  };
  PropertiesService.getScriptProperties().setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, nodes: data.nodes.length, edges: data.edges.length };
}

// ── Seed v5 — Layout Cascata Horizontal (2026-06-01) ────────────
function seedRoadmapV5() {
  var C = 400; // column pitch px
  var R = 170; // row pitch px (reduzido de 200 para espaçamento mais compacto)
  var data = {
    nodes: [
      // ═══ FRAMES DE COLUNA ═══
      // Heights: nCards * R + 80  (col0:9→1610, col1:8→1440, col2:5→930, col3:4→760, col4:8→1440, col5:6→1100, col6:5→930, col7:6→1100)
      { id: 'frame-col-0-v2', type: 'frame', position: { x: C*0 - 65, y: -40 },  data: { title: 'Felícia 360',          titleSize: 14, minimized: false, expandedHeight: 1610, containedNodeIds: [] }, style: { width: 360, height: 1610 }, zIndex: -1 },
      { id: 'frame-col-1', type: 'frame', position: { x: C*1 - 65, y: -40 },  data: { title: 'Adquirência',          titleSize: 14, minimized: false, expandedHeight: 1440, containedNodeIds: [] }, style: { width: 360, height: 1440 }, zIndex: -1 },
      { id: 'frame-col-2', type: 'frame', position: { x: C*2 - 65, y: -40 },  data: { title: 'Banking',              titleSize: 14, minimized: false, expandedHeight:  930, containedNodeIds: [] }, style: { width: 360, height:  930 }, zIndex: -1 },
      { id: 'frame-col-3', type: 'frame', position: { x: C*3 - 65, y: -40 },  data: { title: 'Carteiras',            titleSize: 14, minimized: false, expandedHeight:  930, containedNodeIds: [] }, style: { width: 360, height:  930 }, zIndex: -1 },
      { id: 'frame-col-4', type: 'frame', position: { x: C*4 - 65, y: -40 },  data: { title: 'Ferramentas & Repo',   titleSize: 14, minimized: false, expandedHeight: 1950, containedNodeIds: [] }, style: { width: 360, height: 1950 }, zIndex: -1 },
      { id: 'frame-col-5', type: 'frame', position: { x: C*5 - 65, y: -40 },  data: { title: 'Infraestrutura',       titleSize: 14, minimized: false, expandedHeight: 1440, containedNodeIds: [] }, style: { width: 360, height: 1440 }, zIndex: -1 },
      { id: 'frame-col-6', type: 'frame', position: { x: C*6 - 65, y: -40 },  data: { title: 'Próximos',             titleSize: 14, minimized: false, expandedHeight:  930, containedNodeIds: [] }, style: { width: 360, height:  930 }, zIndex: -1 },
      { id: 'frame-col-7', type: 'frame', position: { x: C*7 - 65, y: -40 },  data: { title: 'Simulador',            titleSize: 14, minimized: false, expandedHeight: 1100, containedNodeIds: [] }, style: { width: 360, height: 1100 }, zIndex: -1 },

      // ═══ LABELS DE COLUNA (y = -80) ═══
      { id: 'lbl-f360',        type: 'label', position: { x: C*0, y: -80 }, data: { text: 'Felícia 360',        fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-adq',         type: 'label', position: { x: C*1, y: -80 }, data: { text: 'Adquirência',        fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-banking',     type: 'label', position: { x: C*2, y: -80 }, data: { text: 'Banking',            fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-carteiras',   type: 'label', position: { x: C*3, y: -80 }, data: { text: 'Carteiras',          fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-ferramentas', type: 'label', position: { x: C*4, y: -80 }, data: { text: 'Ferramentas & Repo', fontSize: 22, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-infra',       type: 'label', position: { x: C*5, y: -80 }, data: { text: 'Infraestrutura',     fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-proximo',     type: 'label', position: { x: C*6, y: -80 }, data: { text: 'Próximos',           fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },
      { id: 'lbl-simulador',   type: 'label', position: { x: C*7, y: -80 }, data: { text: 'Simulador',          fontSize: 26, color: '#00461e' }, style: { width: 290, height: 44 } },

      // ═══ COL 0 — Felícia 360 Core ═══
      { id: 'f1-busca',      type: 'card', position: { x: C*0, y: R*0 }, data: { title: 'Busca por CNPJ/CPF',   description: 'SearchBar com sanitização e roteamento por documento.',          status: 'done', category: 'feature'      } },
      { id: 'f1-credito',    type: 'card', position: { x: C*0, y: R*1 }, data: { title: 'Ofertas de Crédito',   description: 'KYC, limites, ofertas, crédito ativo, negociações.',             status: 'done', category: 'feature'      } },
      { id: 'f2-pnl',        type: 'card', position: { x: C*0, y: R*2 }, data: { title: 'PnL Adquirência',      description: 'Tabela: TPV, MDR, RAV, Floating, COGs, Margem por mês.',        status: 'done', category: 'feature'      } },
      { id: 'f2-fluxo',      type: 'card', position: { x: C*0, y: R*3 }, data: { title: 'Fluxo de Caixa',       description: 'Gráfico crédito + adquirência combinados. Rótulos K/M.',        status: 'done', category: 'feature'      } },
      { id: 'f2-summary',    type: 'card', position: { x: C*0, y: R*4 }, data: { title: 'Summary Cards',        description: 'NPV, NII, Risk Adj NII, TPV, Receita nCOF, Margem.',           status: 'done', category: 'feature'      } },
      { id: 'f2-banco',      type: 'card', position: { x: C*0, y: R*5 }, data: { title: 'Banco Média 3m',       description: 'Saldo conta/reservas, boleto, receita seguros.',                status: 'done', category: 'feature'      } },
      { id: 'f6-info360',    type: 'card', position: { x: C*0, y: R*6 }, data: { title: 'InfoCliente 360',      description: '11 badges produtos, grupo econômico, tempo e engajamento.',     status: 'done', category: 'nova-entrega' } },
      { id: 'f6-cond-sc',    type: 'card', position: { x: C*0, y: R*7 }, data: { title: 'Condições Stonecodes', description: 'Active Offers: MDR, CET, RAV por stonecode. Blur preview.',    status: 'done', category: 'nova-entrega' } },
      { id: 'f6-afiliacoes', type: 'card', position: { x: C*0, y: R*8 }, data: { title: 'Popup Afiliações',     description: 'Modal: stonecode, empresa, status, data credenciamento.',      status: 'done', category: 'feature'      } },

      // ═══ COL 1 — Adquirência Insights ═══
      { id: 'f4-insights',        type: 'card', position: { x: C*1, y: R*0 }, data: { title: 'Insights Adquirência',     description: 'TPV, Share CTPV, 10 linhas de receita, Margem Global.',      status: 'done', category: 'nova-entrega' } },
      { id: 'f4-filtro-prod',     type: 'card', position: { x: C*1, y: R*1 }, data: { title: 'Filtro Stone / Pagar.me',  description: 'Checkboxes que filtram Insights e PnL por empresa.',         status: 'done', category: 'feature'      } },
      { id: 'f4-share',           type: 'card', position: { x: C*1, y: R*2 }, data: { title: 'Share CTPV Normalizado',   description: 'Normalização 100%, fix Recharts cumulativo.',                status: 'done', category: 'ajuste'       } },
      { id: 'filtro-meses-adq',   type: 'card', position: { x: C*1, y: R*3 }, data: { title: 'Filtro de Meses',          description: 'Pills de meses com toggle individual + Todos/Nenhum.',       status: 'done', category: 'feature'      } },
      { id: 'font-tabela-adq',    type: 'card', position: { x: C*1, y: R*4 }, data: { title: 'Fonte Tabela Adquirência', description: 'font-mono para font-sans em células numéricas.',             status: 'done', category: 'ajuste'       } },
      { id: 'font-rotulos-fluxo', type: 'card', position: { x: C*1, y: R*5 }, data: { title: 'Rótulos Fluxo de Caixa',  description: 'isKeyPoint: first/last/inflexoes nas highlight lines.',      status: 'done', category: 'ajuste'       } },
      { id: 'mcc-toggle',         type: 'card', position: { x: C*1, y: R*6 }, data: { title: 'MCC Toggle InfoCliente',   description: 'Numero por default, pill ver revela nome completo do MCC.', status: 'done', category: 'feature'      } },
      { id: 'f6-reorder',         type: 'card', position: { x: C*1, y: R*7 }, data: { title: 'Reordenação de Cards',     description: 'Fluxo de Caixa primeiro. defaultOpen em todos os cards.',   status: 'done', category: 'ajuste'       } },

      // ═══ COL 2 — Banking ═══
      { id: 'f-banking-insights', type: 'card', position: { x: C*2, y: R*0 }, data: { title: 'InsightsBanking',             description: '10 métricas banking por mês. Paleta Stone green.',             status: 'done', category: 'nova-entrega' } },
      { id: 'f-banking-card',     type: 'card', position: { x: C*2, y: R*1 }, data: { title: 'CardBanking Transposta',       description: 'Tabela: meses como linhas, métricas como colunas. 3 seções.', status: 'done', category: 'nova-entrega' } },
      { id: 'f-bq-historico',     type: 'card', position: { x: C*2, y: R*2 }, data: { title: 'BQ: resumo_conta_historico',   description: '76.8M rows, jan/24 a hoje. PARTITION + CLUSTER. 26 colunas.', status: 'done', category: 'feature'      } },
      { id: 'f-merge-v4',         type: 'card', position: { x: C*2, y: R*3 }, data: { title: 'MERGE v4 — Partition Pruning', description: '2.07TB para 0.31TB (-85%). ~R$2/run vs R$12 antes.',           status: 'done', category: 'ajuste'       } },
      { id: 'f-smart-fees',       type: 'card', position: { x: C*2, y: R*4 }, data: { title: 'Smart Fees — Fila BQ',         description: 'GAS grava BQ via DML, Colab cron processa a cada 30 min.',    status: 'done', category: 'nova-entrega' } },

      // ═══ COL 3 — Carteiras ═══
      { id: 'f3-enterprise',    type: 'card', position: { x: C*3, y: R*0 }, data: { title: 'Carteira Enterprise',        description: '10 seções: Base, Receita, Visão 3M, Transacional, RAV, etc.',                                    status: 'done', category: 'nova-entrega' } },
      { id: 'f3-gm',            type: 'card', position: { x: C*3, y: R*1 }, data: { title: 'Carteira Grupos Marca',      description: 'Espelho Enterprise com PnL_GM, filtros por categoria.',                                          status: 'done', category: 'nova-entrega' } },
      { id: 'f3-filtros',       type: 'card', position: { x: C*3, y: R*2 }, data: { title: 'Filtros Cascading',          description: 'MultiCombo, FilterBar 7 filtros, GS (grupo selector).',                                          status: 'done', category: 'feature'      } },
      { id: 'f3-lazy',          type: 'card', position: { x: C*3, y: R*3 }, data: { title: 'Lazy Loading',               description: 'CollapsibleCard mounted=false. Queries na primeira abertura.',                                   status: 'done', category: 'ajuste'       } },
      { id: 'f3-credito-life',  type: 'card', position: { x: C*3, y: R*4 }, data: { title: 'Crédito: Lifetime (VP)',     description: 'NII, Risk-Adj NII, NPV por carteira via npv_kgiro. 1 job BQ, paginação 20 docs, export XLSX.',    status: 'done', category: 'nova-entrega' } },

      // ═══ COL 4 — Ferramentas & Repo ═══
      { id: 'f5-ajuste',       type: 'card', position: { x: C*4, y: R*0 }, data: { title: 'Ajuste de Ofertas',              description: 'Iframe embed da ferramenta de ajuste de planos.',                       status: 'done',    category: 'feature'      } },
      { id: 'f5-admin',        type: 'card', position: { x: C*4, y: R*1 }, data: { title: 'Admin Monitor',                  description: 'Presença em tempo real, heartbeat 30s. Fix: page no return + PAGE_LABELS 13 páginas.', status: 'done',    category: 'feature'      } },
      { id: 'f6-doc',          type: 'card', position: { x: C*4, y: R*2 }, data: { title: 'Documentação Felícia 360',        description: 'Progressive disclosure 3 níveis. Estilo editorial Stone.',             status: 'done',    category: 'nova-entrega' } },
      { id: 'f6-roadmap',      type: 'card', position: { x: C*4, y: R*3 }, data: { title: 'Roadmap Canvas',                 description: '@xyflow/react. Drag, connect, edit. Permissões por email.',            status: 'done',    category: 'nova-entrega' } },
      { id: 'roadmap-fundo',   type: 'card', position: { x: C*4, y: R*4 }, data: { title: 'Roadmap — Fundo Acompanhs',      description: 'CollapsibleCard com links para Enterprise e Grupos Marca.',            status: 'done',    category: 'feature'      } },
      { id: 'ofertas-reorder', type: 'card', position: { x: C*4, y: R*5 }, data: { title: 'Crédito — Reorder + Collapse',   description: 'Ordem: Cartão, Desembolso, Demais (colapsável, fechado).',             status: 'done',    category: 'feature'      } },
      { id: 'navbar-mobile',   type: 'card', position: { x: C*4, y: R*6 }, data: { title: 'Navbar Mobile',                  description: 'Seções ACOMPANHAMENTOS / FERRAMENTAS / REPOSITÓRIO com separadores.',  status: 'done',    category: 'ajuste'       } },
      { id: 'estudos-repo',    type: 'card', position: { x: C*4, y: R*7 }, data: { title: 'Repositório de Estudos',          description: 'GAS standalone + embed Mesa Banco. HTML interativo por estudo, link compartilhável ?study=ID.', status: 'done',    category: 'nova-entrega' } },
      { id: 'study-route',     type: 'card', position: { x: C*4, y: R*8 }, data: { title: 'Rota study-* Fullscreen',          description: 'Code.gs serve Study_<id>.html fullscreen via ?page=study-<id>. Link compartilhável direto.', status: 'done',    category: 'feature'      } },
      { id: 'p4-doc-outros',   type: 'card', position: { x: C*4, y: R*9  }, data: { title: 'Documentação outros cards',      description: 'Expandir DocFelicia360 com texto refinado.',                                                  status: 'planned', category: 'feature'      } },
      { id: 'p4-home-upd',     type: 'card', position: { x: C*4, y: R*10 }, data: { title: 'Home: 3 repositórios',          description: 'Card Estudos adicionado. Contador: 4 dashboards, 1 ferramenta, 3 repositórios.',              status: 'done',    category: 'ajuste'       } },

      // ═══ COL 5 — Infraestrutura ═══
      { id: 'f1-estrutura',    type: 'card', position: { x: C*5, y: R*0 }, data: { title: 'Estrutura GAS + React',    description: 'React 18, Tailwind, Vite singlefile, BQ Advanced Service.',          status: 'done', category: 'feature'      } },
      { id: 'f5-hero',         type: 'card', position: { x: C*5, y: R*1 }, data: { title: 'Hero Animado',              description: 'CSS puro 4 blobs. Velocidade 50% original.',                         status: 'done', category: 'ajuste'       } },
      { id: 'f5-nav',          type: 'card', position: { x: C*5, y: R*2 }, data: { title: 'NavDropdown Sub-grupos',    description: 'Menus aninhados hover delay. Children recursivo.',                   status: 'done', category: 'feature'      } },
      { id: 'f6-deeplinks',    type: 'card', position: { x: C*5, y: R*3 }, data: { title: 'Deep Links',                description: 'google.script.history.push. URLs compartilháveis.',                  status: 'done', category: 'feature'      } },
      { id: 'f-active-offers', type: 'card', position: { x: C*5, y: R*4 }, data: { title: 'Active Offers API — GAS',   description: 'getActiveOffers(): busca MDR, CET, RAV por stonecode no GAS.',        status: 'done', category: 'nova-entrega' } },
      { id: 'f-secret-mgr',    type: 'card', position: { x: C*5, y: R*5 }, data: { title: 'Secret Manager',            description: 'getSFCredentials_(): Secret Manager first, ScriptProps fallback. IAM resolvido 2026-06-02.', status: 'done', category: 'ajuste'       } },
      { id: 'f-aux-docs',      type: 'card', position: { x: C*5, y: R*6 }, data: { title: 'Tabelas Auxiliares docs',    description: 'docs_enterprise (44k) + docs_gm (106k). CREATE OR REPLACE seg-qua-sex 05:00 UTC. Elimina scan GBs nas PnL.', status: 'done', category: 'nova-entrega' } },
      { id: 'f-sched-company',  type: 'card', position: { x: C*5, y: R*7 }, data: { title: 'resumo_conta_historico_company', description: 'Scheduled query sunday 03:00. Banking por document × company_name. 46.5M rows.', status: 'done', category: 'feature'      } },

      // ═══ COL 6 — Próximos ═══
      { id: 'p2-seguro',       type: 'card', position: { x: C*6, y: R*0 }, data: { title: 'Corrigir tem_seguro',    description: 'Expandir filtro product_type para todos os tipos de seguro.',  status: 'in-progress', category: 'ajuste'      } },
      { id: 'p3-banking-date', type: 'card', position: { x: C*6, y: R*1 }, data: { title: 'Data abertura Banking',  description: 'Investigar dim_one_number_client_banking.',                    status: 'planned',     category: 'ajuste'      } },
      { id: 'p1-ton',          type: 'card', position: { x: C*6, y: R*2 }, data: { title: 'Incluir Ton',            description: 'Remover filtro company != TON na affiliation_360.',             status: 'planned',     category: 'longo-prazo' } },
      { id: 'p5-export-pdf',   type: 'card', position: { x: C*6, y: R*3 }, data: { title: 'Export PDF',             description: 'PDF dos dados do cliente para compartilhar offline.',           status: 'backlog',     category: 'longo-prazo' } },
      { id: 'p6-notif',        type: 'card', position: { x: C*6, y: R*4 }, data: { title: 'Notificações',           description: 'Alertar churn ou oferta expirando.',                           status: 'backlog',     category: 'longo-prazo' } },

      // ═══ COL 7 — Simulador ═══
      { id: 'simulador-digital', type: 'card', position: { x: C*7, y: R*0 }, data: { title: 'Disseção Simulador Digital',  description: '38 abas. 10 funções: MDR, RAV, IC, CET, Payback.',             status: 'done',    category: 'feature' } },
      { id: 'simulador-polos',   type: 'card', position: { x: C*7, y: R*1 }, data: { title: 'Disseção Simulador Polos',    description: '61 abas. Comissão 0,48% TPV + rebates. CET 1x a 18x.',         status: 'done',    category: 'feature' } },
      { id: 'pnl-api-check',     type: 'card', position: { x: C*7, y: R*2 }, data: { title: 'PnL API — Viabilidade',       description: 'Motor JS no frontend + BQ como fonte de premissas.',            status: 'done',    category: 'feature' } },
      { id: 'motor-js',          type: 'card', position: { x: C*7, y: R*3 }, data: { title: 'Motor JS — Simulação',        description: 'Net MDR, RAV, IC, floating, payback. Premissas do BQ.',         status: 'planned', category: 'feature' } },
      { id: 'share-editavel',    type: 'card', position: { x: C*7, y: R*4 }, data: { title: 'Share Modalidade Editável',   description: 'UI para ajustar share débito/crédito/parcelado por bandeira.',  status: 'planned', category: 'feature' } },
      { id: 'unificar-estudos',  type: 'card', position: { x: C*7, y: R*5 }, data: { title: 'Unificar Estudos Mesa Banco', description: 'Mover fase 1 (2026-04-30) para dentro de 2026-05-20.',          status: 'done',    category: 'ajuste'  } },
    ],
    edges: [
      // Col 0 — chain vertical
      { id: 'e0-busca-cred',   source: 'f1-busca',      target: 'f1-credito',    sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-cred-pnl',     source: 'f1-credito',    target: 'f2-pnl',        sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-pnl-fluxo',    source: 'f2-pnl',        target: 'f2-fluxo',      sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-fluxo-summ',   source: 'f2-fluxo',      target: 'f2-summary',    sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-summ-banco',   source: 'f2-summary',    target: 'f2-banco',      sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-banco-info',   source: 'f2-banco',      target: 'f6-info360',    sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-info-cond',    source: 'f6-info360',    target: 'f6-cond-sc',    sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e0-cond-afil',    source: 'f6-cond-sc',    target: 'f6-afiliacoes', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 1 — chain vertical
      { id: 'e1-ins-filt',     source: 'f4-insights',        target: 'f4-filtro-prod',     sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-filt-share',   source: 'f4-filtro-prod',     target: 'f4-share',           sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-share-meses',  source: 'f4-share',           target: 'filtro-meses-adq',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-meses-fonte',  source: 'filtro-meses-adq',   target: 'font-tabela-adq',    sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-fonte-rot',    source: 'font-tabela-adq',    target: 'font-rotulos-fluxo', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-rot-mcc',      source: 'font-rotulos-fluxo', target: 'mcc-toggle',         sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e1-mcc-reord',    source: 'mcc-toggle',         target: 'f6-reorder',         sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 2 — chain vertical
      { id: 'e2-bi-bc',  source: 'f-banking-insights', target: 'f-banking-card', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e2-bc-bq',  source: 'f-banking-card',     target: 'f-bq-historico', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e2-bq-mv4', source: 'f-bq-historico',     target: 'f-merge-v4',     sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e2-mv4-sf', source: 'f-merge-v4',          target: 'f-smart-fees',  sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 3 — chain vertical
      { id: 'e3-ent-gm',    source: 'f3-enterprise', target: 'f3-gm',      sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e3-gm-filt',   source: 'f3-gm',         target: 'f3-filtros', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e3-filt-lazy', source: 'f3-filtros',     target: 'f3-lazy',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 4 — chain vertical
      { id: 'e4-ajust-adm',  source: 'f5-ajuste',       target: 'f5-admin',        sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-adm-doc',    source: 'f5-admin',        target: 'f6-doc',          sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-doc-road',   source: 'f6-doc',          target: 'f6-roadmap',      sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-road-fund',  source: 'f6-roadmap',      target: 'roadmap-fundo',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-fund-ofer',  source: 'roadmap-fundo',   target: 'ofertas-reorder', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-ofer-nav',   source: 'ofertas-reorder', target: 'navbar-mobile',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e4-nav-docout', source: 'navbar-mobile',   target: 'p4-doc-outros',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 5 — chain vertical
      { id: 'e5-est-hero', source: 'f1-estrutura',    target: 'f5-hero',          sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e5-hero-nav', source: 'f5-hero',         target: 'f5-nav',           sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e5-nav-deep', source: 'f5-nav',          target: 'f6-deeplinks',     sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e5-deep-ao',  source: 'f6-deeplinks',    target: 'f-active-offers',  sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e5-ao-sm',    source: 'f-active-offers', target: 'f-secret-mgr',     sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 6 — chain vertical
      { id: 'e6-seg-bd',  source: 'p2-seguro',       target: 'p3-banking-date', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e6-bd-ton',  source: 'p3-banking-date', target: 'p1-ton',          sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e6-ton-pdf', source: 'p1-ton',          target: 'p5-export-pdf',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e6-pdf-not', source: 'p5-export-pdf',   target: 'p6-notif',        sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      // Col 7 — chain vertical
      { id: 'e7-dig-pol', source: 'simulador-digital', target: 'simulador-polos',  sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e7-pol-api', source: 'simulador-polos',   target: 'pnl-api-check',   sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e7-api-mot', source: 'pnl-api-check',     target: 'motor-js',         sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e7-mot-shr', source: 'motor-js',           target: 'share-editavel',  sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
      { id: 'e7-shr-uni', source: 'share-editavel',     target: 'unificar-estudos', sourceHandle: 'bottom', targetHandle: 'top', data: { edgeStyle: 'animated' } },
    ]
  };
  PropertiesService.getScriptProperties().setProperty('roadmap_data', JSON.stringify(data));
  return { ok: true, nodes: data.nodes.length, edges: data.edges.length };
}

// ── Permissoes ───────────────────────────────────────────────
const SIMULADOR_EDITORS = [
  'ayran.maduro@stone.com.br',
  'carlos.bazetti@stone.com.br',
  'gustavo.teles@stone.com.br',
];

function getUserInfo() {
  var email = Session.getActiveUser().getEmail() || '';
  return {
    email: email,
    isAdmin: email === 'ayran.maduro@stone.com.br',
    isSimuladorEditor: SIMULADOR_EDITORS.indexOf(email) !== -1,
  };
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
  } catch(e) {}
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
  } catch(e) {}
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
    return { email: em, doc: d.doc, page: d.page || 'home', lastPing: d.lastPing, firstSeen: d.firstSeen, online: online };
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
// Fonte: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_3M
// Tabela já contém apenas os 3 meses fechados — sem filtro de data adicional
function getBancoMedia(doc) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  const sql = `
    WITH ft AS (
      SELECT
        mes,
        IFNULL(Media_Saldo_Conta_Visao_Cliente, 0) AS saldo_conta,
        IFNULL(Media_Saldo_Reservas, 0)            AS saldo_reservas,
        IFNULL(Quantidade_total_emitida, 0)        AS boleto_emitido,
        IFNULL(Quantidade_de_boletos_liquidados, 0) AS boleto_liquidado,
        IFNULL(Valor_total_liquidado_pago, 0)      AS volume_boleto_liquidado,
        IFNULL(receita_seguros, 0)                 AS receita_seguros,
        produtos_seguro
      FROM \`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_3M\`
      WHERE Documento = '${doc}'
    )
    SELECT
      ROUND(AVG(saldo_conta), 2)                AS saldo_conta,
      ROUND(AVG(saldo_reservas), 2)             AS saldo_reservas,
      ROUND(AVG(boleto_emitido), 1)             AS boleto_emitido,
      ROUND(AVG(boleto_liquidado), 1)           AS boleto_liquidado,
      ROUND(AVG(volume_boleto_liquidado), 2)    AS volume_boleto,
      ROUND(AVG(receita_seguros), 2)            AS receita_seguros,
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
const ENT_FILTER = "Produto_PnL IN ('Apends','RAV')";

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

  let clauses = [ENT_FILTER, "Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 12 MONTH)"];
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
      ROUND(SUM(IFNULL(floating_delayed, 0)), 2)                                    AS delay_rcta,
      ROUND(SAFE_DIVIDE(SUM(IFNULL(floating_delayed, 0)), NULLIF(SUM(GMV), 0)), 4) AS delay_pct,
      ROUND(SUM(Margem_RAV_STN), 2)                                                AS net_rav,
      ROUND(SAFE_DIVIDE(SUM(Margem_RAV_STN), NULLIF(SUM(GMV), 0)), 4)             AS rav_pct,
      ROUND(SUM(Receita_TED), 2)                                                   AS rcta_ted,
      ROUND(SUM(Receita_Pix_Geral), 2)                                             AS rcta_pix,
      ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral), NULLIF(SUM(GMV), 0)), 4)          AS pctg_pix,
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
      WHERE ${ENT_FILTER}
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
    WHERE ${ENT_FILTER} AND f.motivo IS NOT NULL
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
    WHERE ${ENT_FILTER}
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
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
    WHERE ${ENT_FILTER}
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
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
  const w = [ENT_FILTER];
  if (f.grupos  && f.grupos.length)  w.push(`motivo IN (${f.grupos.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo1s && f.grupo1s.length) w.push(`grupo1_enc IN (${f.grupo1s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.grupo2s && f.grupo2s.length) w.push(`grupo2_enc IN (${f.grupo2s.map(g => `'${safe(g)}'`).join(',')})`);
  if (f.docs    && f.docs.length)    w.push(`ClientCNPJorCPF IN (${f.docs.map(d => `'${safe(d)}'`).join(',')})`);
  if (f.scs     && f.scs.length)     w.push(`CAST(SC AS STRING) IN (${f.scs.map(s => `'${safe(s)}'`).join(',')})`);
  if (f.mccs    && f.mccs.length)    w.push(`CAST(MCC AS STRING) IN (${f.mccs.map(m => `'${safe(m)}'`).join(',')})`);
  const where = 'AND ' + w.join(' AND ');

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
    WHERE ${ENT_FILTER}
      AND Dt_Month = DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 1 MONTH), MONTH)
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
    WHERE ${ENT_FILTER}
      AND motivo IS NOT NULL
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
    WHERE ${ENT_FILTER}
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH)
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
          WHERE ${ENT_FILTER} AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH)) AS dt_m1
      FROM ${ENT_TABLE}
      WHERE ${ENT_FILTER}
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
    WHERE ${ENT_FILTER}
      AND f.motivo IS NOT NULL
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
    : `AND Dt_Month = (SELECT MAX(Dt_Month) FROM ${ENT_TABLE} WHERE ${ENT_FILTER} AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))`;
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
    WHERE ${ENT_FILTER}
      AND motivo IS NOT NULL
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
    : `AND Dt_Month = (SELECT MAX(Dt_Month) FROM ${ENT_TABLE} WHERE ${ENT_FILTER} AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))`;
  const sql = `
    WITH base AS (
      SELECT * FROM ${ENT_TABLE}
      WHERE ${ENT_FILTER} ${dtWhere} ${grupoWhere}
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
    WHERE ${ENT_FILTER}
      AND Dt_Month >= DATE_SUB(CURRENT_DATE(), INTERVAL 18 MONTH)
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
    WITH last_dt AS (
      SELECT MAX(Dt_Month) AS max_dt FROM ${ENT_TABLE}
        WHERE ${ENT_FILTER} AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH)
    )
    SELECT DISTINCT
      motivo                                    AS grupo,
      CAST(SC AS STRING)                        AS afiliacao,
      ClientCNPJorCPF                           AS documento,
      CAST(MCC AS STRING)                       AS mcc,
      categoria
    FROM ${ENT_TABLE} CROSS JOIN last_dt
    WHERE ${ENT_FILTER}
      AND Dt_Month = max_dt
      AND motivo IS NOT NULL
    ORDER BY grupo, documento
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
    ' ROUND(SAFE_DIVIDE(SUM(Receita_Pix_Geral),NULLIF(SUM(GMV),0)),4) AS pctg_pix,' +
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
  const sql = "WITH last_dt AS (SELECT MAX(Dt_Month) AS max_dt FROM " + GM_TABLE +
    " WHERE " + GM_FILTER + " AND Dt_Month < DATE_TRUNC(CURRENT_DATE(), MONTH))" +
    " SELECT DISTINCT motivo AS grupo, CAST(SC AS STRING) AS afiliacao, ClientCNPJorCPF AS documento," +
    " CAST(MCC AS STRING) AS mcc, categoria" +
    " FROM " + GM_TABLE + " CROSS JOIN last_dt" +
    " WHERE " + GM_FILTER + " AND motivo IS NOT NULL AND Dt_Month = max_dt" +
    " ORDER BY grupo, documento";
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

// ── Banking Histórico — card "Banking: Insights" + "Banking: Detalhado Mensal"
// Fonte principal: sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico
// Retorna 1 linha por mês dos últimos 24 meses fechados (excluindo mês corrente).
// Schema agrupado (~26 colunas) — campos pré-agregados na tabela; sem soma no GAS.
// Nomes de campo batem com BancoHistoricoRow em frontend/src/types/index.ts.
//
// Filtro de company (v228 -> refactored):
// - Quando ambas as empresas estão selecionadas (ou companies omitido): usa a tabela
//   pré-agregada resumo_conta_historico (rápido, ~0.01 TB).
// - Quando apenas 1 empresa está selecionada: usa resumo_conta_historico_company
//   (tabela auxiliar com granularidade doc x company x month, ~0.01 TB) para receitas
//   + resumo_conta_historico para saldos/boletos (account-level, sem company).
//   NUNCA faz scan direto em fct_one_number_banking ou PnL_Dashs_part.
function getBankingHistorico(doc, companies) {
  doc = cleanDoc_(doc);
  if (!doc) return { error: 'Documento vazio' };

  // Normalizar companies: array de strings, ex: ['Stone', 'Pagar.me'] -> ['STONE', 'PAGARME']
  var companyMap = { 'stone': 'STONE', 'pagar.me': 'PAGARME', 'STONE': 'STONE', 'PAGARME': 'PAGARME' };
  var filtered = [];
  if (companies && Array.isArray(companies)) {
    for (var i = 0; i < companies.length; i++) {
      var mapped = companyMap[(companies[i] || '').toLowerCase()] || companyMap[companies[i]];
      if (mapped && filtered.indexOf(mapped) === -1) filtered.push(mapped);
    }
  }
  // Se ambas ou nenhuma selecionada, usar query rápida na tabela pré-agregada
  var useBothCompanies = filtered.length === 0 || filtered.length === 2;

  var dtFilterPlain = "reference_month >= DATE_TRUNC(DATE_SUB(CURRENT_DATE(), INTERVAL 24 MONTH), MONTH)\n" +
                      "      AND reference_month < DATE_TRUNC(CURRENT_DATE(), MONTH)";

  if (useBothCompanies) {
    var sql = "SELECT\n" +
      "  FORMAT_DATE('%Y-%m', reference_month) AS mes, document,\n" +
      "  ROUND(IFNULL(media_saldo_conta, 0), 2) AS media_saldo_conta,\n" +
      "  ROUND(IFNULL(media_saldo_conta_visao_cliente, 0), 2) AS media_saldo_conta_visao_cliente,\n" +
      "  ROUND(IFNULL(media_saldo_reservas, 0), 2) AS media_saldo_reservas,\n" +
      "  ROUND(IFNULL(media_saldo_raspa_conta, 0), 2) AS media_saldo_raspa_conta,\n" +
      "  ROUND(IFNULL(media_saldo_total, 0), 2) AS media_saldo_total,\n" +
      "  IFNULL(qtd_boleto_emitido, 0) AS qtd_boleto_emitido,\n" +
      "  IFNULL(qtd_boleto_liquidado, 0) AS qtd_boleto_liquidado,\n" +
      "  ROUND(IFNULL(vlr_boleto_liquidado, 0), 2) AS vlr_boleto_liquidado,\n" +
      "  ROUND(IFNULL(receita_seguros, 0), 2) AS receita_seguros,\n" +
      "  IFNULL(produtos_seguro, '') AS produtos_seguro,\n" +
      "  ROUND(IFNULL(receita_floating_sweep, 0), 2) AS receita_floating_sweep,\n" +
      "  ROUND(IFNULL(receita_pix_pos, 0), 2) AS receita_pix_pos,\n" +
      "  ROUND(IFNULL(tpv_pix_pos, 0), 2) AS tpv_pix_pos,\n" +
      "  IFNULL(trx_pix_pos, 0) AS trx_pix_pos,\n" +
      "  ROUND(IFNULL(receita_floating_conta_reserva, 0), 2) AS receita_floating_conta_reserva,\n" +
      "  ROUND(IFNULL(receita_interchange_cartao, 0), 2) AS receita_interchange_cartao,\n" +
      "  ROUND(IFNULL(receita_cartao, 0), 2) AS receita_cartao,\n" +
      "  ROUND(IFNULL(receita_boleto, 0), 2) AS receita_boleto,\n" +
      "  ROUND(IFNULL(receita_juros_rotativo, 0), 2) AS receita_juros_rotativo,\n" +
      "  ROUND(IFNULL(receita_movimentacao, 0), 2) AS receita_movimentacao,\n" +
      "  ROUND(IFNULL(receita_outros_cartao, 0), 2) AS receita_outros_cartao,\n" +
      "  ROUND(IFNULL(gmv_cartao, 0), 2) AS gmv_cartao,\n" +
      "  ROUND(IFNULL(receita_outros_banking, 0), 2) AS receita_outros_banking,\n" +
      "  ROUND(IFNULL(receita_floating_delayed, 0), 2) AS receita_floating_delayed\n" +
      "FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico`\n" +
      "WHERE document = '" + doc + "' AND " + dtFilterPlain + "\n" +
      "ORDER BY reference_month ASC";
    return runBQ_(sql);
  }

  // ── Filtro de company ativo (apenas 1 empresa selecionada) ──
  // Saldos e boletos: tabela pré-agregada resumo_conta_historico (account-level, sem company).
  // Receitas + floating_delayed: tabela pré-agregada resumo_conta_historico_company
  //   com granularidade doc × company × month. NUNCA scan direto em fct_one_number_banking.
  var companyIn = "'" + filtered[0] + "'";

  var sqlFiltered =
    "WITH saldos_boletos AS (\n" +
    "  SELECT FORMAT_DATE('%Y-%m', reference_month) AS mes, document,\n" +
    "    ROUND(IFNULL(media_saldo_conta, 0), 2) AS media_saldo_conta,\n" +
    "    ROUND(IFNULL(media_saldo_conta_visao_cliente, 0), 2) AS media_saldo_conta_visao_cliente,\n" +
    "    ROUND(IFNULL(media_saldo_reservas, 0), 2) AS media_saldo_reservas,\n" +
    "    ROUND(IFNULL(media_saldo_raspa_conta, 0), 2) AS media_saldo_raspa_conta,\n" +
    "    ROUND(IFNULL(media_saldo_total, 0), 2) AS media_saldo_total,\n" +
    "    IFNULL(qtd_boleto_emitido, 0) AS qtd_boleto_emitido,\n" +
    "    IFNULL(qtd_boleto_liquidado, 0) AS qtd_boleto_liquidado,\n" +
    "    ROUND(IFNULL(vlr_boleto_liquidado, 0), 2) AS vlr_boleto_liquidado\n" +
    "  FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico`\n" +
    "  WHERE document = '" + doc + "' AND " + dtFilterPlain + "\n" +
    "),\n" +
    "receitas AS (\n" +
    "  SELECT FORMAT_DATE('%Y-%m', reference_month) AS mes, document,\n" +
    "    ROUND(IFNULL(receita_seguros, 0), 2) AS receita_seguros,\n" +
    "    IFNULL(produtos_seguro, '') AS produtos_seguro,\n" +
    "    ROUND(IFNULL(receita_floating_sweep, 0), 2) AS receita_floating_sweep,\n" +
    "    ROUND(IFNULL(receita_pix_pos, 0), 2) AS receita_pix_pos,\n" +
    "    ROUND(IFNULL(tpv_pix_pos, 0), 2) AS tpv_pix_pos,\n" +
    "    IFNULL(trx_pix_pos, 0) AS trx_pix_pos,\n" +
    "    ROUND(IFNULL(receita_floating_conta_reserva, 0), 2) AS receita_floating_conta_reserva,\n" +
    "    ROUND(IFNULL(receita_interchange_cartao, 0), 2) AS receita_interchange_cartao,\n" +
    "    ROUND(IFNULL(receita_cartao, 0), 2) AS receita_cartao,\n" +
    "    ROUND(IFNULL(receita_boleto, 0), 2) AS receita_boleto,\n" +
    "    ROUND(IFNULL(receita_juros_rotativo, 0), 2) AS receita_juros_rotativo,\n" +
    "    ROUND(IFNULL(receita_movimentacao, 0), 2) AS receita_movimentacao,\n" +
    "    ROUND(IFNULL(receita_outros_cartao, 0), 2) AS receita_outros_cartao,\n" +
    "    ROUND(IFNULL(gmv_cartao, 0), 2) AS gmv_cartao,\n" +
    "    ROUND(IFNULL(receita_outros_banking, 0), 2) AS receita_outros_banking,\n" +
    "    ROUND(IFNULL(receita_floating_delayed, 0), 2) AS receita_floating_delayed\n" +
    "  FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_PnL.resumo_conta_historico_company`\n" +
    "  WHERE document = '" + doc + "'\n" +
    "    AND company_name = " + companyIn + "\n" +
    "    AND " + dtFilterPlain + "\n" +
    ")\n" +
    "SELECT COALESCE(sb.mes, r.mes) AS mes,\n" +
    "  COALESCE(sb.document, r.document) AS document,\n" +
    "  sb.media_saldo_conta, sb.media_saldo_conta_visao_cliente,\n" +
    "  sb.media_saldo_reservas, sb.media_saldo_raspa_conta, sb.media_saldo_total,\n" +
    "  sb.qtd_boleto_emitido, sb.qtd_boleto_liquidado, sb.vlr_boleto_liquidado,\n" +
    "  r.receita_seguros, r.produtos_seguro,\n" +
    "  r.receita_floating_sweep, r.receita_pix_pos, r.tpv_pix_pos, r.trx_pix_pos,\n" +
    "  r.receita_floating_conta_reserva, r.receita_interchange_cartao, r.receita_cartao,\n" +
    "  r.receita_boleto, r.receita_juros_rotativo, r.receita_movimentacao,\n" +
    "  r.receita_outros_cartao, r.gmv_cartao, r.receita_outros_banking,\n" +
    "  r.receita_floating_delayed\n" +
    "FROM saldos_boletos sb\n" +
    "FULL OUTER JOIN receitas r ON sb.mes = r.mes AND sb.document = r.document\n" +
    "ORDER BY COALESCE(sb.mes, r.mes) ASC";

  return runBQ_(sqlFiltered);
}

// ── Banking Detalhado Mensal — card "Banking: Detalhado Mensal" ───────────────
// Alias de getBankingHistorico(). Os dois endpoints retornam os mesmos dados;
// getBankingDetalhado é exposto para o CardBanking.tsx via doGet handler.
// Mantém contrato de interface estável caso getBankingHistorico mude no futuro.
function getBankingDetalhado(doc, companies) {
  return getBankingHistorico(doc, companies);
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

// ── Credito: Lifetime Value (VP) ─────────────────────────────
// Legacy — mantido por compatibilidade; novos cards usam Summary + Detail abaixo
function getCreditoLifetimeVP(docs) {
  if (!docs || !docs.length) return { summary: null, detail: [] };
  var safe = function(s) { return (s || '').replace(/'/g, '').replace(/\\/g, '').trim(); };
  var inList = docs.map(function(d) { return "'" + safe(d) + "'"; }).join(',');

  var sql = "WITH npv_doc AS (" +
    " SELECT b.documento," +
    "   SUM(a.financial_income_net * a.discount_factor) - SUM(a.funding_cost * a.discount_factor) - SUM(a.capital_cost * a.discount_factor) AS nii," +
    "   SUM(a.financial_income_net * a.discount_factor) - SUM(a.funding_cost * a.discount_factor) - SUM(a.capital_cost * a.discount_factor) - SUM(a.pdd_result * a.discount_factor) AS risk_adj_nii," +
    "   SUM(a.pv_cf) AS npv" +
    " FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro` a" +
    " LEFT JOIN (SELECT DISTINCT LoanId, documento FROM `dataplatform-prd.credit_policy_studies.credit_portfolio`) b ON a.loanid = b.LoanId" +
    " WHERE a.run_at = (SELECT MAX(run_at) FROM `pricing-dedicated-non-prod.credit_pricing.npv_kgiro`)" +
    "   AND b.documento IN (" + inList + ")" +
    " GROUP BY b.documento" +
    ")" +
    " SELECT 'summary' AS tipo, CAST(NULL AS STRING) AS documento, ROUND(SUM(nii),2) AS nii, ROUND(SUM(risk_adj_nii),2) AS risk_adj_nii, ROUND(SUM(npv),2) AS npv FROM npv_doc" +
    " UNION ALL" +
    " SELECT 'detail', documento, ROUND(nii,2), ROUND(risk_adj_nii,2), ROUND(npv,2) FROM npv_doc" +
    " ORDER BY tipo DESC, npv DESC";

  var rows = runBQ_(sql);
  var summary = null;
  var detail = [];
  rows.forEach(function(r) {
    if (r.tipo === 'summary') {
      summary = { nii: r.nii, risk_adj_nii: r.risk_adj_nii, npv: r.npv };
    } else {
      detail.push({ documento: r.documento, nii: r.nii, risk_adj_nii: r.risk_adj_nii, npv: r.npv });
    }
  });
  return { summary: summary, detail: detail };
}

// ── Credito Lifetime: helper para subquery de docs da carteira ──
// Usa tabelas auxiliares pré-computadas (seg-qua-sex) em vez de escanear
// as PnL completas — 44k/106k linhas vs GBs, query em ms.
function buildCreditoDocsSubquery_(carteira, filters) {
  var f = filters || {};
  var safe = function(s) { return (s || '').replace(/'/g, '').replace(/\\/g, '').trim(); };

  // Tabelas auxiliares pré-computadas (CLUSTER BY ClientCNPJorCPF, SC)
  var table = carteira === 'gm'
    ? '`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_gm`'
    : '`sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.docs_enterprise`';

  var w = ['1=1'];
  if (f.grupos  && f.grupos.length)  w.push("motivo IN (" + f.grupos.map(function(g){ return "'" + safe(g) + "'"; }).join(',') + ")");
  if (f.grupo1s && f.grupo1s.length) {
    var col = carteira === 'gm' ? 'categoria' : 'grupo1_enc';
    w.push(col + " IN (" + f.grupo1s.map(function(g){ return "'" + safe(g) + "'"; }).join(',') + ")");
  }
  if (f.grupo2s && f.grupo2s.length) {
    var col2 = carteira === 'gm' ? 'responsible_agent_id' : 'grupo2_enc';
    w.push(col2 + " IN (" + f.grupo2s.map(function(g){ return "'" + safe(g) + "'"; }).join(',') + ")");
  }
  if (f.docs  && f.docs.length)  w.push("ClientCNPJorCPF IN (" + f.docs.map(function(d){ return "'" + safe(d) + "'"; }).join(',') + ")");
  if (f.scs   && f.scs.length)   w.push("SC IN (" + f.scs.map(function(s){ return "'" + safe(s) + "'"; }).join(',') + ")");
  if (f.mccs  && f.mccs.length)  w.push("MCC IN (" + f.mccs.map(function(m){ return "'" + safe(m) + "'"; }).join(',') + ")");

  return "SELECT ClientCNPJorCPF, MAX(motivo) AS motivo FROM " + table + " WHERE " + w.join(' AND ') + " GROUP BY ClientCNPJorCPF";
}

// ── Credito Lifetime: resolve docs via query separada (performance) ──
// Mantido para compatibilidade; novos Summary/Detail usam query única.
function resolveCreditoDocs_(carteira, filters) {
  var sql = buildCreditoDocsSubquery_(carteira, filters) + " LIMIT 2000";
  var rows = runBQ_(sql);
  return rows.map(function(r) { return { doc: r.ClientCNPJorCPF, motivo: r.motivo || '' }; });
}

// ── Credito Lifetime: CTE unificado usando tabela auxiliar pré-computada ──────
// Tabela aux: npv_kgiro_por_documento (atualizada semanalmente, ~91k docs)
// Elimina scan cross-project pricing-dedicated-non-prod em tempo real.
// Fluxo: docs CTE (aux pequena, filtrada pelo FilterBar) →
//        npv_doc CTE (join com npv_kgiro_por_documento, clustered por documento) →
//        query final SUM ou SELECT paginado — zero tabelas grandes no caminho real-time.
function buildCreditoLifetimeSql_(carteira, filters) {
  var docsCte = buildCreditoDocsSubquery_(carteira, filters);
  return (
    "WITH docs AS (" + docsCte + ")," +
    " npv_doc AS (" +
    "   SELECT d.ClientCNPJorCPF AS documento, d.motivo, n.nii, n.risk_adj_nii, n.npv" +
    "   FROM `sbj7ujlwjbsknn8v396xaahlf4ogck.Dias_auxiliares.npv_kgiro_por_documento` n" +
    "   JOIN docs d ON n.documento = d.ClientCNPJorCPF" +
    " )"
  );
}

// ── Credito Lifetime: Summary (1 job BQ, sem LIMIT) ──
function getCreditoLifetimeSummary(carteira, filters) {
  var baseSql = buildCreditoLifetimeSql_(carteira, filters);
  var sql = baseSql +
    " SELECT" +
    "   ROUND(SUM(nii), 2) AS nii," +
    "   ROUND(SUM(risk_adj_nii), 2) AS risk_adj_nii," +
    "   ROUND(SUM(npv), 2) AS npv," +
    "   COUNT(*) AS doc_count" +
    " FROM npv_doc";

  var rows = runBQ_(sql);
  return rows && rows.length > 0 ? rows[0] : { nii: 0, risk_adj_nii: 0, npv: 0, doc_count: 0 };
}

// ── Credito Lifetime: Detail paginado (1 job BQ) ──
function getCreditoLifetimeDetail(carteira, filters, limit, offset) {
  var lim = limit || 20;
  var off = offset || 0;
  var baseSql = buildCreditoLifetimeSql_(carteira, filters);
  var sql = baseSql +
    " SELECT" +
    "   documento," +
    "   motivo," +
    "   ROUND(nii, 2) AS nii," +
    "   ROUND(risk_adj_nii, 2) AS risk_adj_nii," +
    "   ROUND(npv, 2) AS npv" +
    " FROM npv_doc" +
    " ORDER BY npv DESC" +
    " LIMIT " + lim + " OFFSET " + off;

  return runBQ_(sql);
}

// ── Salesforce Auth ───────────────────────────────────────────
// Requer Script Properties: SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN
// Mesmo padrão do projeto Ajuste de Ofertas (3 tentativas: OAuth+clientId, OAuth simples, SOAP).
// Cache de 90 min para evitar re-auth desnecessária.
//
// Credenciais SF: lê do Google Secret Manager com fallback para ScriptProperties.
// Secret: projects/802494589841/secrets/Chaves-sf (JSON com SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN)
//
function getSFCredentials_() {
  // Tentativa 1: Secret Manager via REST API
  try {
    var token = ScriptApp.getOAuthToken();
    var url = 'https://secretmanager.googleapis.com/v1/projects/802494589841/secrets/Chaves-sf/versions/latest:access';
    var resp = UrlFetchApp.fetch(url, {
      headers: { 'Authorization': 'Bearer ' + token },
      muteHttpExceptions: true
    });
    if (resp.getResponseCode() === 200) {
      var data = JSON.parse(resp.getContentText());
      var decoded = Utilities.newBlob(Utilities.base64Decode(data.payload.data)).getDataAsString();
      var creds = JSON.parse(decoded);
      if (creds.SF_USERNAME && creds.SF_PASSWORD && creds.SF_SECURITY_TOKEN) {
        return creds;
      }
    }
  } catch(e) {
    // Fallback silencioso para ScriptProperties
  }

  // Tentativa 2: ScriptProperties (fallback)
  var props = PropertiesService.getScriptProperties();
  return {
    SF_USERNAME: props.getProperty('SF_USERNAME'),
    SF_PASSWORD: props.getProperty('SF_PASSWORD'),
    SF_SECURITY_TOKEN: props.getProperty('SF_SECURITY_TOKEN')
  };
}

function getSFToken_() {
  var cache = CacheService.getScriptCache();
  var cached = cache.get('SF_SESSION_ID_MB');
  if (cached) return cached;

  var creds = getSFCredentials_();
  var username      = creds.SF_USERNAME;
  var password      = creds.SF_PASSWORD;
  var securityToken = creds.SF_SECURITY_TOKEN;

  if (!username || !password || !securityToken) {
    throw new Error('Credenciais SF não configuradas (SF_USERNAME, SF_PASSWORD, SF_SECURITY_TOKEN).');
  }

  // Tentativa 1: OAuth REST com Connected App
  try {
    var sfClientId = PropertiesService.getScriptProperties().getProperty('SF_CLIENT_ID') ||
                     '3MVG9I5UQ_0k_hTmzgBt1JI_YO5MvapEkE93bH.UBQGIPgPM1Cm2DMVvLVEoVJ7xFPAbq.GUGwXTJFOEzBCHt';
    var p1 = 'grant_type=password&client_id=' + encodeURIComponent(sfClientId) + '&client_secret=&username=' +
      encodeURIComponent(username) + '&password=' + encodeURIComponent(password + securityToken);
    var r1 = UrlFetchApp.fetch('https://login.salesforce.com/services/oauth2/token', {
      method:'POST', contentType:'application/x-www-form-urlencoded', payload:p1, muteHttpExceptions:true
    });
    if (r1.getResponseCode() === 200) {
      var d1 = JSON.parse(r1.getContentText());
      if (d1.session_id || d1.access_token) { var t1 = d1.session_id || d1.access_token; cache.put('SF_SESSION_ID_MB', t1, 5400); return t1; }
    }
  } catch(e) {}

  // Tentativa 2: OAuth REST sem client_id
  try {
    var p2 = 'grant_type=password&username=' + encodeURIComponent(username) + '&password=' + encodeURIComponent(password + securityToken);
    var r2 = UrlFetchApp.fetch('https://login.salesforce.com/services/oauth2/token', {
      method:'POST', contentType:'application/x-www-form-urlencoded', payload:p2, muteHttpExceptions:true
    });
    if (r2.getResponseCode() === 200) {
      var d2 = JSON.parse(r2.getContentText());
      if (d2.session_id || d2.access_token) { var t2 = d2.session_id || d2.access_token; cache.put('SF_SESSION_ID_MB', t2, 5400); return t2; }
    }
  } catch(e) {}

  // Tentativa 3: SOAP login
  var soap = '<?xml version="1.0" encoding="utf-8"?><soapenv:Envelope xmlns:soapenv="http://schemas.xmlsoap.org/soap/envelope/" xmlns:urn="urn:partner.soap.sforce.com"><soapenv:Body><urn:login><urn:username>' +
    username + '</urn:username><urn:password>' + password + securityToken + '</urn:password></urn:login></soapenv:Body></soapenv:Envelope>';
  var r3 = UrlFetchApp.fetch('https://login.salesforce.com/services/Soap/u/57.0', {
    method:'POST', headers:{'Content-Type':'text/xml; charset=UTF-8','SOAPAction':'login'}, payload:soap, muteHttpExceptions:true
  });
  if (r3.getResponseCode() !== 200) throw new Error('Auth SF falhou (HTTP ' + r3.getResponseCode() + ')');
  var match = r3.getContentText().match(/<sessionId>([^<]+)<\/sessionId>/);
  if (!match) throw new Error('sessionId não encontrado na resposta SOAP');
  var t3 = match[1];
  cache.put('SF_SESSION_ID_MB', t3, 5400);
  return t3;
}

// ── Active Offers API ─────────────────────────────────────────
function getActiveOffers(stonecode) {
  var token;
  try {
    token = getSFToken_();
  } catch(e) {
    return { error: 'Falha na autenticação SF: ' + e.message };
  }

  var url = 'https://active-offers.marcopolo.stone.com.br/v1/acquiring/' + encodeURIComponent(String(stonecode)) + '?proxy=true';
  var options = {
    method: 'GET',
    headers: {
      'token': token,
      'x-stone-idempotency-key': Utilities.getUuid(),
      'request-id': Utilities.getUuid()
    },
    muteHttpExceptions: true
  };

  try {
    var response = UrlFetchApp.fetch(url, options);
    var code = response.getResponseCode();
    if (code !== 200) return { error: 'HTTP ' + code + ': ' + response.getContentText().substring(0, 200) };
    return JSON.parse(response.getContentText());
  } catch(e) {
    return { error: e.message };
  }
}
