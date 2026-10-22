/* Luftballons - núcleo lógico (porte 1:1 do Python). Sem DOM.
   A UI se pluga em Luft.HOOK (wait, fx, qte, escolherAcao, resumo, status, say, limparTela). */
(function (root) {
'use strict';
const L = {};
const HOOK = L.HOOK = {
  say() {}, wait: async () => {}, fx: async () => {}, qte: async () => false,
  escolherAcao: async () => 'pular_vez', resumo() {}, status() {}, limparTela() {},
};

// ---------- utils ----------
const ri = (a, b) => Math.floor(Math.random() * (b - a + 1)) + a;
const rand100 = () => ri(1, 100);
const uniform = (a, b) => a + Math.random() * (b - a);
function pyRound(x) { return Math.abs(x % 1) === 0.5 ? 2 * Math.round(x / 2) : Math.round(x); }
const LOG = { linhas: [], on: false, sessao: false };
function say(t) { if (LOG.on) LOG.linhas.push(...String(t).split('\n')); HOOK.say(t); }
const espera = (s) => HOOK.wait(s);
const fx = (n, d) => HOOK.fx(n, d);
L.say = say;
L.iniciar_registro = () => { LOG.linhas = []; LOG.on = LOG.sessao = true; };
L.pausar_registro = () => { LOG.on = false; };
L.retomar_registro = () => { LOG.on = LOG.sessao; };
L.mostrar_resumo = (n) => {
  LOG.on = LOG.sessao = false;
  HOOK.resumo(n, LOG.linhas.filter(l => l.trim() && !l.startsWith('===')));
};

// ---------- config ----------
const C = L.C = {
  SUPORTE_AEREO_ATIVO: true,
  DADOS_LADOS: {
    1: { nome: 'OTAN', nome_completo: 'Organização do Tratado do Atlântico Norte', vida_maxima: 100,
         rifle_nome: 'M1 Garand', submetralhadora_nome: 'Thompson', suporte_nome: 'F-84F Thunderstreak',
         bomba_nome: 'Mk 84', caminhao_nome: 'Caminhão M35', arma_anti_tank_nome: 'Bazooka M20', buff_defesa: 0 },
    2: { nome: 'OVD', nome_completo: 'Organização do Pacto de Varsóvia', vida_maxima: 100,
         rifle_nome: 'SKS', submetralhadora_nome: 'PPS-43', suporte_nome: 'Su-7B',
         bomba_nome: 'FAB-500', caminhao_nome: 'Caminhão ZIL-157', arma_anti_tank_nome: 'RPG-2', buff_defesa: 0 },
  },
  CUSTOS_ACAO: { rifle: 5, submetralhadora: 10, suprimento_medico: 25, suprimento_municao_rifle: 10,
    suprimento_municao_smg: 30, anti_tank: 30, suprimento_municao_anti_tank: 40, molotov: 15, recolher_arma: 0,
    sair_tanque: 0, cobertura: 0, tanque_metralhadora: 6, tanque_perfurante: 15, tanque_explosivo: 15,
    pular_vez: 0, fugir: 0, chamar_blindado: 0, reabastecer: 0, carregar_perfurante: 0, carregar_explosivo: 0 },
  GANHO_PONTOS_TURNO: 10, BONUS_PULAR_VEZ: 10, PONTOS_INICIAIS: 30, CURA_SUPRIMENTO: 30,
  MUNICAO_MAXIMA_RIFLE: 25, MUNICAO_GASTA_RIFLE: 5, MUNICAO_MAXIMA_SMG: 16, MUNICAO_GASTA_SMG: 4,
  MUNICAO_MAXIMA_ANTI_TANK: 2, MUNICAO_GASTA_ANTI_TANK: 1,
  TANQUES: {
    1: { leve: { nome: 'Walker Bulldog', vida: 50, custo_chamar: 45, dano_max: 20, recarga_rodadas: 1, combustivel_rodadas: 5, custo_reabastecer: 15 },
         medio: { nome: 'M48 Patton', vida: 80, custo_chamar: 65, dano_max: 25, recarga_rodadas: 2, combustivel_rodadas: 4, custo_reabastecer: 15 },
         pesado: { nome: 'M103', vida: 110, custo_chamar: 90, dano_max: 30, recarga_rodadas: 3, combustivel_rodadas: 3, custo_reabastecer: 15 } },
    2: { leve: { nome: 'BMP-1', vida: 50, custo_chamar: 45, dano_max: 20, recarga_rodadas: 1, combustivel_rodadas: 5, custo_reabastecer: 15 },
         medio: { nome: 'T-54', vida: 80, custo_chamar: 65, dano_max: 25, recarga_rodadas: 2, combustivel_rodadas: 4, custo_reabastecer: 15 },
         pesado: { nome: 'T-10M', vida: 110, custo_chamar: 90, dano_max: 30, recarga_rodadas: 3, combustivel_rodadas: 3, custo_reabastecer: 15 } },
  },
  SUPORTE_AEREO: { custo: 40, dano_frente: [20, 40], cooldown_rodadas: 4,
    rodadas_para_chegar: { 1: { frente: 3, suporte: 5 }, 2: { frente: 2, suporte: 3 } } },
  MOLOTOV: { dano: [1, 10], rodadas: 3 },
  DANO_INCENDIARIO_POR_RODADA: 3, DURACAO_INCENDIARIO_ANTITANQUE: 3,
  FATOR_DANO_ARMA_NORMAL_VS_TANQUE: 0.10,
  COBERTURA_REDUCAO_MIN: 0.40, COBERTURA_REDUCAO_MAX: 0.70,
  QTE_TEMPO_SEGUNDOS: 2.0, QTE_CHANCE_BOT: 50, BOT_CHANCE_COBERTURA_ARTILHARIA: 70,
  DANO_TANQUE_METRALHADORA: { faixa: [2, 8] }, TANQUE_DANO_MIN_ACERTO: 5,
  TANQUE_FATOR_MUNICAO_ERRADA: 0.25,
  LINHA_SUPORTE: {
    artilharia: { nomes: { 1: 'M55', 2: '2S1' }, custo_compra: 10, custo_uso: 15, tiros: 3,
      dano_tiro: { 1: [8, 12], 2: [6, 9] }, cooldown_rodadas: { 1: 4, 2: 3 }, rodadas_para_chegar: 1 },
    antiaerea: { nomes: { 1: 'VADS', 2: 'Shilka' }, custo_compra: 12, chance_interceptacao: { 1: 35, 2: 25 } },
  },
  BOT_RESERVA_COMPRA_SUPORTE: 10,
};
Object.assign(C.CUSTOS_ACAO, {
  comprar_artilharia: C.LINHA_SUPORTE.artilharia.custo_compra, solicitar_artilharia: C.LINHA_SUPORTE.artilharia.custo_uso,
  comprar_antiaerea: C.LINHA_SUPORTE.antiaerea.custo_compra, suporte_aereo: C.SUPORTE_AEREO.custo,
  ataque_aereo_frente: C.SUPORTE_AEREO.custo, ataque_aereo_antiaerea: C.SUPORTE_AEREO.custo, ataque_aereo_artilharia: C.SUPORTE_AEREO.custo,
});

C.CAMINHAO = { custo_chamar: 0, rodadas_para_chegar: 5, vida: 30, bonus_pontos: 5, fator_dano: 0.5 };
C.BOT_CHANCE_CHAMAR_CAMINHAO = 60; C.BOT_CHANCE_INTERCEPTAR = 70;
C.CUSTOS_ACAO.chamar_caminhao = C.CAMINHAO.custo_chamar; C.CUSTOS_ACAO.interceptar_caminhao = C.LINHA_SUPORTE.artilharia.custo_uso;
const SUPR_CAMINHAO = new Set(['suprimento_medico', 'suprimento_municao_rifle', 'suprimento_municao_smg', 'suprimento_municao_anti_tank']);

// ---------- unidade ----------
const U = L.U = {};
U.criar_unidade = (lado) => { const d = C.DADOS_LADOS[lado]; return {
  lado_id: lado, nome: d.nome, vida_atual: d.vida_maxima, vida_maxima: d.vida_maxima, pontos: C.PONTOS_INICIAIS,
  municao_rifle: C.MUNICAO_MAXIMA_RIFLE, municao_smg: C.MUNICAO_MAXIMA_SMG, municao_anti_tank: C.MUNICAO_MAXIMA_ANTI_TANK,
  efeito_incendiario_restante: 0, tanque_ativo: false, tanque_classe: null, tanque_combustivel: 0, tanque_recem_chamado: false,
  tanque_vida: 0, tanque_municao: null, tanque_recarga: 0, em_cobertura: false, cobertura_pendente: false,
  fugiu: false, linha_suporte: [], molotov_restante: 0, arma_no_chao: false, ataque_aereo: null, aviao_cooldown: 0, caminhao: null }; };
U.nome_tanque = (lado, classe) => C.TANQUES[lado][classe].nome;
U.nome_alvo_principal = (u) => u.tanque_ativo ? U.nome_tanque(u.lado_id, u.tanque_classe) : C.DADOS_LADOS[u.lado_id].nome;
U.vida_atual_principal = (u) => u.tanque_ativo ? u.tanque_vida : u.vida_atual;
U.vida_maxima_principal = (u) => u.tanque_ativo ? C.TANQUES[u.lado_id][u.tanque_classe].vida : u.vida_maxima;
U.unidade_derrotada = (u) => u.tanque_ativo ? false : u.vida_atual <= 0;
U.pode_pagar = (u, a) => u.pontos >= C.CUSTOS_ACAO[a];
U.pagar = (u, a) => { u.pontos -= C.CUSTOS_ACAO[a]; };
U.ganhar_pontos_turno = (u) => { u.pontos += C.GANHO_PONTOS_TURNO + (CM.ativo(u) ? C.CAMINHAO.bonus_pontos : 0); };
U.ativar_cobertura = (u) => { u.cobertura_pendente = true; };
U.consumir_cobertura_se_ativa = (u, dano) => {
  if (!u.em_cobertura) return dano;
  u.em_cobertura = false;
  const f = uniform(C.COBERTURA_REDUCAO_MIN, C.COBERTURA_REDUCAO_MAX);
  const r = Math.max(0, pyRound(dano * (1 - f)));
  say(`Cobertura funcionou: dano ${dano} → ${r} (-${pyRound(f * 100)}%).`);
  fx('cobertura_absorve', { u });
  return r;
};
U.aplicar_dano = async (u, dano, pular = false) => {
  let ef = dano;
  if (u.tanque_ativo && !pular) {
    const red = Math.max(0, pyRound(ef * C.FATOR_DANO_ARMA_NORMAL_VS_TANQUE));
    say(`Blindagem do ${U.nome_tanque(u.lado_id, u.tanque_classe)}: dano ${ef} → ${red}.`);
    ef = red;
  }
  ef = U.consumir_cobertura_se_ativa(u, ef);
  await fx('dano', { u, dano: ef });
  if (u.tanque_ativo) {
    u.tanque_vida = Math.max(0, u.tanque_vida - ef);
    if (u.tanque_vida === 0) {
      say(`${U.nome_tanque(u.lado_id, u.tanque_classe)} destruído!`);
      await fx('tanque_destruido', { u });
      await espera(1.5);
      u.tanque_ativo = false; u.tanque_municao = null; u.tanque_recarga = 0;
    }
  } else u.vida_atual = Math.max(0, u.vida_atual - ef);
  await CM.dano(u, ef);
  return ef;
};
U.aplicar_cura = (u, c) => {
  if (u.tanque_ativo) u.tanque_vida = Math.min(C.TANQUES[u.lado_id][u.tanque_classe].vida, u.tanque_vida + c);
  else u.vida_atual = Math.min(u.vida_maxima, u.vida_atual + c);
};
U.dano_com_buff = (def, dano) => {
  if (rand100() <= C.DADOS_LADOS[def.lado_id].buff_defesa * 100) { say(`Defesa do ${def.nome}: dano pela metade!`); return Math.floor(dano / 2); }
  return dano;
};
const MUN = { rifle: ['municao_rifle', 'MUNICAO_GASTA_RIFLE', 'MUNICAO_MAXIMA_RIFLE'], smg: ['municao_smg', 'MUNICAO_GASTA_SMG', 'MUNICAO_MAXIMA_SMG'],
  anti_tank: ['municao_anti_tank', 'MUNICAO_GASTA_ANTI_TANK', 'MUNICAO_MAXIMA_ANTI_TANK'] };
U.tem_municao = (u, a) => MUN[a] ? u[MUN[a][0]] >= C[MUN[a][1]] : true;
U.usos_restantes = (u, a) => MUN[a] ? Math.floor(u[MUN[a][0]] / C[MUN[a][1]]) : 0;
U.usos_maximos = (a) => MUN[a] ? Math.floor(C[MUN[a][2]] / C[MUN[a][1]]) : 0;
U.consumir_municao = (u, a) => { if (MUN[a]) u[MUN[a][0]] -= C[MUN[a][1]]; };
U.recarregar_municao = (u, a) => { if (MUN[a]) u[MUN[a][0]] = C[MUN[a][2]]; };

// ---------- ataques ----------
const A = L.A = {};
A.ataque_rifle = async (at, def) => {
  const d = C.DADOS_LADOS[at.lado_id];
  let dano = at.lado_id === 1 ? ri(1, 20) : ri(1, 17);
  dano = U.dano_com_buff(def, dano);
  const marca = dano > 18 ? ' (crítico!)' : dano < 5 ? ' (erro de mira)' : '';
  say(`${d.rifle_nome}: ${dano} de dano${marca}`);
  await fx('tiro', { at, def, arma: 'rifle', dano });
  await U.aplicar_dano(def, dano);
  U.consumir_municao(at, 'rifle'); await espera(1);
};
const mostrarTiros = async (t, p = 0.4) => { for (let i = 0; i < t.length; i++) { say(`  Tiro ${i + 1} - ${t[i]} de dano`); await espera(p); } };
A.ataque_submetralhadora = async (at, def) => {
  const d = C.DADOS_LADOS[at.lado_id];
  const f = at.lado_id === 1 ? [1, 7] : [1, 5];
  const tiros = [0, 1, 2, 3].map(() => ri(...f));
  say(`${d.submetralhadora_nome}:`);
  await fx('rajada', { at, def, arma: 'smg', n: 4 });
  await mostrarTiros(tiros);
  const tot = U.dano_com_buff(def, tiros.reduce((a, b) => a + b, 0));
  say(`  Total: ${tot} de dano`);
  await U.aplicar_dano(def, tot); U.consumir_municao(at, 'smg'); await espera(1);
};
A.ataque_anti_tank = async (at, def) => {
  const arma = C.DADOS_LADOS[at.lado_id].arma_anti_tank_nome;
  let dano, desc;
  if (def.tanque_ativo) {
    dano = ri(13, 23);
    if (Math.random() < 0.1) { dano = 30; def.efeito_incendiario_restante = C.DURACAO_INCENDIARIO_ANTITANQUE; desc = 'CRÍTICO no blindado, incendiando-o'; }
    else desc = 'acerta o blindado';
  } else { dano = ri(5, 10); desc = 'pouco eficaz contra infantaria'; }
  dano = U.dano_com_buff(def, dano);
  say(`${arma}: ${desc}, ${dano} de dano`);
  await fx('tiro', { at, def, arma: 'anti_tank', dano });
  await U.aplicar_dano(def, dano, true);
  U.consumir_municao(at, 'anti_tank'); await espera(1);
};
A.ataque_molotov = async (at, def) => {
  const d = C.DADOS_LADOS[at.lado_id];
  at.arma_no_chao = true; def.molotov_restante = C.MOLOTOV.rodadas;
  say(`${at.nome} larga o ${d.arma_anti_tank_nome} no chão, acende uma molotov e a arremessa!`);
  say(`${U.nome_alvo_principal(def)} pega fogo!`);
  await fx('molotov', { at, def }); await espera(1.5);
};

// ---------- efeitos ----------
L.aplica_efeito_incendiario = async (u) => {
  if (u.efeito_incendiario_restante > 0 && !U.unidade_derrotada(u)) {
    await U.aplicar_dano(u, C.DANO_INCENDIARIO_POR_RODADA);
    u.efeito_incendiario_restante -= 1;
    say(`O incêndio continua queimando o ${U.nome_alvo_principal(u)}! Perdeu ${C.DANO_INCENDIARIO_POR_RODADA} de vida.`);
    await espera(1.3);
  }
};
L.aplica_molotov = async (u) => {
  if (u.molotov_restante <= 0 || U.unidade_derrotada(u)) return;
  const nome = U.nome_alvo_principal(u);
  const dano = U.dano_com_buff(u, ri(...C.MOLOTOV.dano));
  const ef = await U.aplicar_dano(u, dano);
  u.molotov_restante -= 1;
  say(`O fogo da molotov queima ${nome}: ${ef} de dano.`); await espera(1.3);
};

// ---------- suprimentos ----------
const S = L.S = {};
S.suprimento_medico = async (u) => { const d = C.DADOS_LADOS[u.lado_id]; U.aplicar_cura(u, C.CURA_SUPRIMENTO);
  say(`${d.caminhao_nome}: ${U.nome_alvo_principal(u)} recupera ${C.CURA_SUPRIMENTO} de vida.`); await fx('suprimento', { u, tipo: 'medico' }); await espera(1); };
const mk = (arma, chave, campo) => async (u) => { const d = C.DADOS_LADOS[u.lado_id]; U.recarregar_municao(u, arma);
  say(`${d.caminhao_nome}: ${d[campo]} recarregad${arma === 'smg' ? 'a' : 'o'} (${U.usos_restantes(u, arma)} usos).`); await fx('suprimento', { u, tipo: arma }); await espera(1); };
S.suprimento_municao_rifle = mk('rifle', 'rifle', 'rifle_nome');
S.suprimento_municao_smg = mk('smg', 'smg', 'submetralhadora_nome');
S.suprimento_municao_anti_tank = mk('anti_tank', 'at', 'arma_anti_tank_nome');

const T = L.T = {};
const tcfg = (u) => C.TANQUES[u.lado_id][u.tanque_classe];
T.tanque_operacional = (u) => u.tanque_ativo && !u.tanque_recem_chamado && u.tanque_combustivel > 0;
T.canhao_pronto = (u) => T.tanque_operacional(u) && !!u.tanque_municao && u.tanque_recarga === 0;
T.pode_carregar = (u) => T.tanque_operacional(u) && !u.tanque_municao;
T.chamar_tanque = async (u, classe) => {
  const tc = C.TANQUES[u.lado_id][classe];
  if (u.pontos < tc.custo_chamar) { say('Pontos insuficientes para chamar este blindado!'); await espera(1.5); return false; }
  u.pontos -= tc.custo_chamar; u.em_cobertura = false; u.cobertura_pendente = false; u.tanque_ativo = true; u.tanque_classe = classe;
  u.tanque_vida = tc.vida; u.tanque_municao = null; u.tanque_combustivel = tc.combustivel_rodadas; u.tanque_recem_chamado = true; u.tanque_recarga = 0;
  say(`${tc.nome} assume a linha de frente (combustível: ${tc.combustivel_rodadas} rodadas; ataca na próxima rodada).`);
  await fx('tanque_chega', { u, classe }); await espera(1.2); return true;
};
T.sair_do_tanque = async (u) => {
  say(`A tripulação abandona o ${tcfg(u).nome} e volta a lutar como infantaria.`); await espera(1.3);
  Object.assign(u, { tanque_ativo: false, tanque_classe: null, tanque_combustivel: 0, tanque_vida: 0, tanque_municao: null, tanque_recem_chamado: false, tanque_recarga: 0 });
};
T.reabastecer = async (u) => {
  const tc = tcfg(u);
  if (u.pontos < tc.custo_reabastecer) { say(`Pontos insuficientes para reabastecer o ${tc.nome}! (custo ${tc.custo_reabastecer})`); await espera(1.5); return; }
  u.pontos -= tc.custo_reabastecer; u.tanque_combustivel = tc.combustivel_rodadas;
  say(`${tc.nome} reabastecido (${tc.combustivel_rodadas} rodadas de autonomia).`); await espera(1);
};
T.ataque_tanque_metralhadora = async (at, def) => {
  const tc = tcfg(at);
  let dano = ri(...C.DANO_TANQUE_METRALHADORA.faixa);
  say(`${tc.nome}, metralhadora:`); await fx('rajada', { at, def, arma: 'tanque_mg', n: 1 });
  dano = U.dano_com_buff(def, dano); say(`  Total: ${dano} de dano`);
  await U.aplicar_dano(def, dano);
  await espera(1);
};
const canhao = async (at, def, tipo) => {
  const tc = tcfg(at), certa = (tipo === 'perfurante') === def.tanque_ativo, rolado = ri(0, tc.dano_max);
  let dano = certa ? rolado : pyRound(rolado * C.TANQUE_FATOR_MUNICAO_ERRADA);
  if (dano > 0) dano = U.dano_com_buff(def, dano);
  say(rolado === 0 ? `${tc.nome}, tiro ${tipo}: erra o alvo!` : `${tc.nome}, tiro ${tipo}: ${dano} de dano em ${def.tanque_ativo ? 'blindado' : 'infantaria'}${certa ? '' : ' (munição inadequada, -75%)'}.`);
  await fx('tiro_tanque', { at, def, tipo, acertou: dano >= C.TANQUE_DANO_MIN_ACERTO });
  at.tanque_municao = null;
  if (dano > 0) await U.aplicar_dano(def, dano, true);
  await espera(1);
};
T.ataque_tanque_perfurante = (at, def) => canhao(at, def, 'perfurante');
T.ataque_tanque_explosivo = (at, def) => canhao(at, def, 'explosivo');
T.processa_chegada_e_cooldown_tanque = async (u) => {
  if (!u.tanque_ativo) return;
  if (u.tanque_recem_chamado) { u.tanque_recem_chamado = false; return; }
  if (u.tanque_combustivel <= 0) return;
  u.tanque_combustivel -= 1;
  if (u.tanque_combustivel === 0) { say(`O combustível acabou! O ${tcfg(u).nome} não pode mais agir.`); await espera(1.5); return; }
  if (u.tanque_recarga > 0) {
    u.tanque_recarga -= 1;
    if (u.tanque_recarga === 0 && u.tanque_municao) { say(`${tcfg(u).nome}: canhão carregado e pronto para atirar.`); await fx('tanque_pronto', { u }); await espera(1); }
  }
};
T.carregar = async (u, tipo) => {
  const tc = tcfg(u);
  u.tanque_municao = tipo; u.tanque_recarga = tc.recarga_rodadas;
  say(`${tc.nome}: carregando munição ${tipo === 'perfurante' ? 'perfurante' : 'explosiva'} (pronto em ${tc.recarga_rodadas} rodada(s)).`);
  await fx('tanque_carrega', { u, tipo }); await espera(1);
};

// ---------- linha de suporte ----------
const LS = L.LS = {};
const item = (u, t) => u.linha_suporte.find(i => i.tipo === t) || null;
LS.tem = (u, t) => item(u, t) !== null;
LS.nome = (u, t) => C.LINHA_SUPORTE[t].nomes[u.lado_id];
LS.nomes_comprados = (u) => u.linha_suporte.map(i => LS.nome(u, i.tipo));
LS.comprar = async (u, t) => { u.linha_suporte.push({ tipo: t, cooldown: 0, bloqueado: false, chegada: 0 });
  say(`${LS.nome(u, t)} entra na linha de suporte.`); await fx('suporte_compra', { u, tipo: t }); await espera(1); };
LS.destruir_unidade_suporte = (u, t) => { u.linha_suporte = u.linha_suporte.filter(i => i.tipo !== t); };
LS.processa_cooldown = (u) => { for (const i of u.linha_suporte) { if (i.cooldown > 0) { i.bloqueado = true; i.cooldown -= 1; } else i.bloqueado = false; } };
LS.artilharia_a_caminho = (u) => { const i = item(u, 'artilharia'); return i !== null && i.chegada > 0 && i.alvo !== 'caminhao'; };
LS.pode_solicitar_artilharia = (u) => { const i = item(u, 'artilharia'); return i !== null && !i.bloqueado && i.cooldown === 0 && i.chegada === 0; };
LS.solicitar_artilharia = async (at) => {
  const cfg = C.LINHA_SUPORTE.artilharia, i = item(at, 'artilharia');
  i.chegada = cfg.rodadas_para_chegar; i.cooldown = cfg.cooldown_rodadas[at.lado_id]; i.alvo = 'frente';
  say(`${LS.nome(at, 'artilharia')} abre fogo!`); say('Se escuta tiros de uma barragem de artilharia!');
  await fx('artilharia_fogo', { u: at }); await espera(1.5);
};
LS.interceptar_caminhao = async (at, op) => {
  const cfg = C.LINHA_SUPORTE.artilharia, i = item(at, 'artilharia');
  i.chegada = cfg.rodadas_para_chegar; i.cooldown = cfg.cooldown_rodadas[at.lado_id]; i.alvo = 'caminhao';
  say(`${LS.nome(at, 'artilharia')} mira a estrada para interceptar o caminhão!`); say('Se escuta tiros de uma barragem de artilharia!');
  await fx('artilharia_fogo', { u: at }); await espera(1.5);
};
LS.processa_chegada = async (u, op) => {
  const i = item(u, 'artilharia');
  if (i === null || i.chegada <= 0) return;
  i.chegada -= 1; if (i.chegada > 0) return;
  if (i.alvo === 'caminhao') {
    i.alvo = 'frente';
    if (CM.a_caminho(op)) { say(`A barragem de ${LS.nome(u, 'artilharia')} atinge o ${C.DADOS_LADOS[op.lado_id].caminhao_nome} na estrada!`); await fx('caminhao_interceptado', { u, alvo: op }); await CM.destruir(op, 'interceptado'); }
    else { say('A barragem cai na estrada vazia: o caminhão já tinha passado.'); await espera(1); }
    return;
  }
  const cfg = C.LINHA_SUPORTE.artilharia;
  say(`A barragem de ${LS.nome(u, 'artilharia')} atinge o alvo!`);
  const tiros = Array.from({ length: cfg.tiros }, () => ri(...cfg.dano_tiro[u.lado_id]));
  await fx('artilharia_impacto', { u, alvo: op }); await mostrarTiros(tiros);
  const tot = U.dano_com_buff(op, tiros.reduce((a, b) => a + b, 0)); say(`  Total: ${tot} de dano`);
  await U.aplicar_dano(op, tot); await espera(1);
};
LS.tentar_interceptar = (def) => LS.tem(def, 'antiaerea') && rand100() <= C.LINHA_SUPORTE.antiaerea.chance_interceptacao[def.lado_id];
LS.rodadas_chegada = (u, alvo) => C.SUPORTE_AEREO.rodadas_para_chegar[u.lado_id][alvo === 'frente' ? 'frente' : 'suporte'];
LS.aviao_a_caminho = (u) => u.ataque_aereo !== null;
LS.aviao_disponivel = (u) => u.ataque_aereo === null && u.aviao_cooldown === 0;
LS.aviao_chegando = (u) => u.ataque_aereo !== null && u.ataque_aereo.chegada === 1;
LS.status_aereo = (u) => {
  const av = C.DADOS_LADOS[u.lado_id].suporte_nome;
  if (u.ataque_aereo !== null) return `${av} a caminho (chega em ${u.ataque_aereo.chegada})`;
  if (u.aviao_cooldown > 0) return `${av} em recarga (${u.aviao_cooldown})`;
  return `${av} pronto`;
};
LS.solicitar_ataque_aereo = async (u, alvo) => {
  const d = C.DADOS_LADOS[u.lado_id];
  u.ataque_aereo = { alvo, chegada: LS.rodadas_chegada(u, alvo) };
  say(`O ${d.suporte_nome} decola carregado de bombas ${d.bomba_nome}!`); say('Se escuta o ronco de motores a jato no horizonte!');
  await fx('aviao_decola', { u }); await espera(1.5);
};
const encerrar = (u) => { u.ataque_aereo = null; u.aviao_cooldown = C.SUPORTE_AEREO.cooldown_rodadas; };
LS.processa_ataque_aereo = async (u, op) => {
  const m = u.ataque_aereo;
  if (m === null) { if (u.aviao_cooldown > 0) u.aviao_cooldown -= 1; return; }
  const d = C.DADOS_LADOS[u.lado_id], av = d.suporte_nome;
  m.chegada -= 1;
  if (LS.tentar_interceptar(op)) {
    say(`A ${LS.nome(op, 'antiaerea')} intercepta e derruba o ${av}!`);
    await fx('interceptacao', { aviao_de: u, antiaerea_de: op }); encerrar(u); await espera(1.5); return;
  }
  if (m.chegada > 0) { say(`O ${av} segue a caminho do alvo (${m.chegada} rodada(s)).`); await espera(1); return; }
  const alvo = m.alvo; encerrar(u);
  say(`O ${av} chega ao alvo e lança as bombas ${d.bomba_nome}!`);
  const dano = alvo === 'frente' ? U.dano_com_buff(op, ri(...C.SUPORTE_AEREO.dano_frente)) : 0;
  await fx('bombardeio', { u, alvo_tipo: alvo, op, dano, existe: alvo === 'frente' || LS.tem(op, alvo) });
  if (alvo === 'frente') {
    const nome = U.nome_alvo_principal(op);
    say(`O bombardeio atinge ${nome}: ${dano} de dano.`); await U.aplicar_dano(op, dano, true);
  } else if (LS.tem(op, alvo)) { say(`Unidade de suporte destruída: ${LS.nome(op, alvo)}!`); LS.destruir_unidade_suporte(op, alvo); }
  else say('O alvo já não está lá, as bombas caem no vazio.');
  await espera(1.5);
};

// ---------- caminhão de suporte ----------
const CM = L.CM = {};
const cnome = (u) => C.DADOS_LADOS[u.lado_id].caminhao_nome;
CM.ativo = (u) => !!u.caminhao && u.caminhao.estado === 'ativo';
CM.a_caminho = (u) => !!u.caminhao && u.caminhao.estado === 'a_caminho';
CM.chamar = async (u) => { u.caminhao = { estado: 'a_caminho', chegada: C.CAMINHAO.rodadas_para_chegar, vida: C.CAMINHAO.vida };
  say(`${u.nome} chama o ${cnome(u)}! Chega em ${C.CAMINHAO.rodadas_para_chegar} rodadas.`); await fx('caminhao_chamado', { u }); await espera(1); };
CM.processa_chegada = async (u) => { if (!CM.a_caminho(u)) return; u.caminhao.chegada -= 1; if (u.caminhao.chegada > 0) return;
  u.caminhao.estado = 'ativo'; say(`${cnome(u)} chegou! Suprimentos instantâneos e +${C.CAMINHAO.bonus_pontos} pts por rodada.`);
  await fx('caminhao_chega', { u }); await espera(1); };
CM.dano = async (u, ef) => { if (!CM.ativo(u)) return; const d = pyRound(ef * C.CAMINHAO.fator_dano); if (d <= 0) return;
  u.caminhao.vida = Math.max(0, u.caminhao.vida - d); say(`${cnome(u)} sofre ${d} de dano (${u.caminhao.vida}/${C.CAMINHAO.vida}).`);
  if (u.caminhao.vida === 0) await CM.destruir(u, 'dano'); };
CM.destruir = async (u, motivo) => { say(`${cnome(u)} destruído!`); await fx('caminhao_destruido', { u, motivo }); u.caminhao = null; await espera(1); };

// ---------- ações (turnos) ----------
const Tn = L.Tn = {};
const ACOES_ATAQUE = { rifle: A.ataque_rifle, submetralhadora: A.ataque_submetralhadora, anti_tank: A.ataque_anti_tank, molotov: A.ataque_molotov,
  tanque_metralhadora: T.ataque_tanque_metralhadora, tanque_perfurante: T.ataque_tanque_perfurante, tanque_explosivo: T.ataque_tanque_explosivo,
  solicitar_artilharia: LS.solicitar_artilharia, interceptar_caminhao: LS.interceptar_caminhao };
const ACOES_SUPRIMENTO = { suprimento_medico: S.suprimento_medico, suprimento_municao_rifle: S.suprimento_municao_rifle,
  suprimento_municao_smg: S.suprimento_municao_smg, suprimento_municao_anti_tank: S.suprimento_municao_anti_tank, reabastecer: T.reabastecer };

Tn.montar_opcoes_disponiveis = (u) => {
  const o = []; let n = 1; const lado = u.lado_id, cu = C.CUSTOS_ACAO;
  const add = (chave, texto) => { o.push({ n: n++, chave, texto }); };
  const info = (texto) => o.push({ n: null, chave: null, texto });
  if (u.tanque_ativo) {
    const tc = tcfg(u), nm = { perfurante: 'perfurante (vs blindado)', explosivo: 'explosiva (vs infantaria)' };
    if (T.tanque_operacional(u)) {
      add('tanque_metralhadora', `Metralhadora do tanque (${cu.tanque_metralhadora} pts)`);
      if (u.tanque_municao) {
        if (T.canhao_pronto(u)) add('tanque_' + u.tanque_municao, `Atirar: ${nm[u.tanque_municao]} (${cu['tanque_' + u.tanque_municao]} pts)`);
        else info(`Canhão recarregando ${nm[u.tanque_municao]} (${u.tanque_recarga} rodada(s))`);
      } else {
        add('carregar_perfurante', `Carregar perfurante (AP, vs blindado, recarga ${tc.recarga_rodadas})`);
        add('carregar_explosivo', `Carregar explosiva (HE, vs infantaria, recarga ${tc.recarga_rodadas})`);
      }
    } else if (u.tanque_combustivel <= 0) {
      info(`Tanque sem combustível${u.tanque_municao ? ` (recarga congelada: ${u.tanque_recarga})` : ''}`);
      add('reabastecer', `Reabastecer o ${tc.nome} (${tc.custo_reabastecer} pts)`);
    } else info('Tanque indisponível nesta rodada');
    add('sair_tanque', 'Sair do tanque (grátis)');
  } else {
    for (const [k, t, arma] of [['rifle', 'Rifle', 'rifle'], ['submetralhadora', 'Submetralhadora', 'smg']])
      U.tem_municao(u, arma) ? add(k, `${t} (${U.usos_restantes(u, arma)}x, ${cu[k]} pts)`) : info(`${t} sem munição`);
    const na = C.DADOS_LADOS[lado].arma_anti_tank_nome;
    if (u.arma_no_chao) add('recolher_arma', `Recolher ${na} do chão (grátis)`);
    else if (U.tem_municao(u, 'anti_tank')) add('anti_tank', `${na} (${U.usos_restantes(u, 'anti_tank')}x, ${cu.anti_tank} pts)`);
    else info(`${na} sem munição`);
    add('molotov', `Molotov (${cu.molotov} pts, fogo por ${C.MOLOTOV.rodadas} rodadas)`);
    add('chamar_blindado', 'Chamar blindado');
  }
  if (!u.caminhao) add('chamar_caminhao', `Chamar caminhão ${C.DADOS_LADOS[lado].caminhao_nome} (chega em ${C.CAMINHAO.rodadas_para_chegar} rodadas)`);
  else if (u.caminhao.estado === 'a_caminho') info(`Caminhão a caminho (chega em ${u.caminhao.chegada} rodada(s))`);
  else add('caminhao_suprimento', `Suprimentos do caminhão (instantâneo · caminhão ${u.caminhao.vida}/${C.CAMINHAO.vida})`);
  const ca = C.LINHA_SUPORTE.artilharia, na = LS.nome(u, 'artilharia');
  if (!LS.tem(u, 'artilharia')) add('comprar_artilharia', `Comprar artilharia ${na} (${ca.custo_compra} pts)`);
  else if (LS.pode_solicitar_artilharia(u)) add('solicitar_artilharia', `Solicitar artilharia ${na} (${ca.custo_uso} pts)`);
  else info(`Artilharia ${na} em recarga`);
  if (!LS.tem(u, 'antiaerea')) add('comprar_antiaerea', `Comprar antiaérea ${LS.nome(u, 'antiaerea')} (${C.LINHA_SUPORTE.antiaerea.custo_compra} pts)`);
  if (C.SUPORTE_AEREO_ATIVO) {
    const av = C.DADOS_LADOS[lado].suporte_nome;
    if (LS.aviao_disponivel(u)) add('suporte_aereo', `Suporte aéreo ${av} (${cu.suporte_aereo} pts)`);
    else if (LS.aviao_a_caminho(u)) info(`${av} a caminho do alvo`); else info(`${av} em recarga`);
  }
  u.tanque_ativo ? add('aguardar', 'Aguardar (grátis)') : add('cobertura', 'Buscar cobertura (grátis, fica exposto)');
  if (!u.tanque_ativo) add('pular_vez', `Pular a vez (+${C.BONUS_PULAR_VEZ} pts)`);
  add('fugir', 'Fugir');
  return o;
};
// dados dos submenus (a UI desenha os botões)
Tn.opcoes_suprimento = (u) => {
  const c = C.CUSTOS_ACAO, na = C.DADOS_LADOS[u.lado_id].arma_anti_tank_nome;
  const r = [{ chave: 'suprimento_medico', texto: `Médico (+${C.CURA_SUPRIMENTO} HP, ${c.suprimento_medico} pts)` },
    { chave: 'suprimento_municao_rifle', texto: `Munição de rifle (${c.suprimento_municao_rifle} pts)` },
    { chave: 'suprimento_municao_smg', texto: `Munição de SMG (${c.suprimento_municao_smg} pts)` },
    { chave: 'suprimento_municao_anti_tank', texto: `Munição de ${na} (${c.suprimento_municao_anti_tank} pts)` }];
  if (u.tanque_ativo) { const tc = tcfg(u); r.push({ chave: 'reabastecer', texto: `Combustível do ${tc.nome} (${tc.custo_reabastecer} pts)` }); }
  return r;
};
Tn.opcoes_artilharia = (u, op) => [{ chave: 'solicitar_artilharia', texto: `Atacar a linha de frente (${C.LINHA_SUPORTE.artilharia.custo_uso} pts)` },
  { chave: 'interceptar_caminhao', texto: `Interceptar o ${C.DADOS_LADOS[op.lado_id].caminhao_nome} (${C.LINHA_SUPORTE.artilharia.custo_uso} pts)` }];
Tn.opcoes_blindado = (lado) => ['leve', 'medio', 'pesado'].map(k => { const t = C.TANQUES[lado][k];
  return { chave: `chamar_blindado_${k}`, classe: k, texto: `${t.nome} — vida ${t.vida}, custo ${t.custo_chamar}, canhão 0–${t.dano_max}, recarga ${t.recarga_rodadas}, combustível ${t.combustivel_rodadas}` }; });
Tn.opcoes_aereo = (u, op) => {
  const r = [{ chave: 'ataque_aereo_frente', texto: `Atacar a linha de frente (chega em ${LS.rodadas_chegada(u, 'frente')} rodadas)` }];
  for (const [t, rot] of [['antiaerea', 'antiaérea'], ['artilharia', 'artilharia']])
    if (LS.tem(op, t)) r.push({ chave: `ataque_aereo_${t}`, texto: `Atacar a linha de suporte: ${rot} (chega em ${LS.rodadas_chegada(u, t)} rodadas)` });
  return r;
};

Tn.validar_acao = (chave, u, op) => {
  if (chave.startsWith('chamar_blindado_')) {
    const custo = C.TANQUES[u.lado_id][chave.split('_').pop()].custo_chamar;
    return u.pontos < custo ? 'Pontos insuficientes para chamar este blindado!' : null;
  }
  if (SUPR_CAMINHAO.has(chave) && !CM.ativo(u)) return 'Sem caminhão ativo para fornecer suprimentos!';
  if (chave === 'chamar_caminhao' && u.caminhao) return 'Você já tem um caminhão a caminho ou ativo!';
  if (chave === 'interceptar_caminhao' && (!LS.pode_solicitar_artilharia(u) || !CM.a_caminho(op))) return 'Interceptação indisponível!';
  if (chave === 'reabastecer') {
    if (!u.tanque_ativo) return 'Sem blindado ativo!';
    const custo = tcfg(u).custo_reabastecer;
    return u.pontos < custo ? `Pontos insuficientes para reabastecer! (custo ${custo})` : null;
  }
  if ((chave === 'comprar_artilharia' || chave === 'comprar_antiaerea') && LS.tem(u, chave.slice(8))) return `${u.nome} já comprou essa unidade de suporte!`;
  if (chave === 'solicitar_artilharia' && !LS.pode_solicitar_artilharia(u)) return 'Artilharia indisponível (não comprada ou em recarga)!';
  if (chave.startsWith('ataque_aereo_')) {
    const alvo = chave.slice(13);
    if (!LS.aviao_disponivel(u) || (alvo !== 'frente' && !LS.tem(op, alvo))) return 'Ataque aéreo indisponível!';
  }
  if (chave === 'carregar_perfurante' || chave === 'carregar_explosivo') return T.pode_carregar(u) ? null : 'O canhão não pode ser carregado agora!';
  if (chave === 'tanque_metralhadora' && !T.tanque_operacional(u)) return 'A metralhadora do tanque está indisponível!';
  if (chave === 'tanque_perfurante' || chave === 'tanque_explosivo') {
    if (!T.canhao_pronto(u) || u.tanque_municao !== chave.slice(7)) return 'O canhão não está pronto com esse tipo de munição!';
  }
  if (chave === 'recolher_arma' && !u.arma_no_chao) return 'Não há arma no chão!';
  if (chave === 'anti_tank' && u.arma_no_chao) return `${u.nome} está sem a arma antitanque (ela está no chão)!`;
  for (const [a, arma, t] of [['rifle', 'rifle', 'de rifle'], ['submetralhadora', 'smg', 'de submetralhadora'], ['anti_tank', 'anti_tank', 'da arma antitanque']])
    if (chave === a && !U.tem_municao(u, arma)) return `${u.nome} está sem munição ${t}!`;
  if (chave in C.CUSTOS_ACAO && !U.pode_pagar(u, chave)) return `${u.nome} não tem pontos suficientes para essa ação!`;
  return null;
};
Tn.executar_acao = async (chave, u, op) => {
  const erro = Tn.validar_acao(chave, u, op);
  if (erro) { say(erro); await espera(1.2); return; }
  if (chave === 'pular_vez') { u.pontos += C.BONUS_PULAR_VEZ; say(`${u.nome} reagrupa (+${C.BONUS_PULAR_VEZ} pts).`); await espera(1.3); }
  else if (chave === 'fugir') { u.fugiu = true; say(`${u.nome} recua e abandona o campo de batalha!`); await espera(1.5); }
  else if (chave === 'sair_tanque') await T.sair_do_tanque(u);
  else if (chave.startsWith('chamar_blindado_')) await T.chamar_tanque(u, chave.split('_').pop());
  else if (chave === 'aguardar') { say(`${u.nome} aguarda.`); await espera(1); }
  else if (chave === 'cobertura') { if (!u.tanque_ativo) { U.ativar_cobertura(u); say(`${u.nome} corre para a cobertura, exposto por um instante.`); await fx('cobertura_corre', { u }); await espera(1); } }
  else if (chave === 'recolher_arma') { u.arma_no_chao = false; say(`${u.nome} recolhe o ${C.DADOS_LADOS[u.lado_id].arma_anti_tank_nome} do chão.`); await espera(1.2); }
  else {
    U.pagar(u, chave);
    if (chave in ACOES_ATAQUE) await ACOES_ATAQUE[chave](u, op);
    else if (chave.startsWith('carregar_')) await T.carregar(u, chave.slice(9));
    else if (chave in ACOES_SUPRIMENTO) await ACOES_SUPRIMENTO[chave](u);
    else if (chave.startsWith('ataque_aereo_')) await LS.solicitar_ataque_aereo(u, chave.slice(13));
    else if (chave.startsWith('comprar_')) await LS.comprar(u, chave.slice(8));
    else if (chave === 'chamar_caminhao') await CM.chamar(u);
  }
};
Tn.turno_humano = async (u, op, turno) => {
  for (;;) {
    L.pausar_registro();
    const chave = await HOOK.escolherAcao(u, op, turno); // a UI resolve submenus e devolve a chave final (ou null = voltar)
    if (chave === null || chave === undefined) continue;
    const erro = Tn.validar_acao(chave, u, op);
    if (erro) { say(erro); await espera(1.2); continue; }
    L.retomar_registro(); say(`\n▶ ${u.nome}`);
    await Tn.executar_acao(chave, u, op);
    if (chave in ACOES_SUPRIMENTO && CM.ativo(u)) continue; // suprimento do caminhão é instantâneo: não gasta a vez
    break;
  }
};

// ---------- bot ----------
const B = L.B = {};
B.escolher_pular_ou_cobertura = (u, op, permitirPular = true) => {
  if (!permitirPular) return 'aguardar';
  const pct = U.vida_atual_principal(u) / U.vida_maxima_principal(u);
  const custoLeve = C.TANQUES[op.lado_id].leve.custo_chamar;
  return (pct < 0.6 || op.tanque_ativo || op.pontos >= custoLeve) ? 'cobertura' : 'pular_vez';
};
// Ataque aereo ignora a blindagem (dano total no tanque); artilharia e armas normais so fazem 10% nele.
const alvoAereo = (op) => {
  if (op.tanque_ativo) return 'frente';
  for (const t of ['artilharia', 'antiaerea']) if (LS.tem(op, t) && rand100() <= 40) return t;
  return 'frente';
};
const acaoSuporte = (u, op, turno) => {
  if (CM.a_caminho(op) && LS.pode_solicitar_artilharia(u) && U.pode_pagar(u, 'interceptar_caminhao') && rand100() <= C.BOT_CHANCE_INTERCEPTAR) return 'interceptar_caminhao';
  if (!u.caminhao && (turno <= 2 || rand100() <= C.BOT_CHANCE_CHAMAR_CAMINHAO)) return 'chamar_caminhao';
  const cfg = C.LINHA_SUPORTE.artilharia, reserva = C.BOT_RESERVA_COMPRA_SUPORTE;
  if (!LS.tem(u, 'artilharia')) { if (u.pontos >= cfg.custo_compra + reserva) return 'comprar_artilharia'; }
  else if (!op.tanque_ativo && LS.pode_solicitar_artilharia(u) && U.pode_pagar(u, 'solicitar_artilharia')) return 'solicitar_artilharia';
  const custoAa = C.LINHA_SUPORTE.antiaerea.custo_compra;
  if (!LS.tem(u, 'antiaerea') && turno >= 2 && u.pontos >= custoAa + reserva && rand100() <= 35) return 'comprar_antiaerea';
  if (C.SUPORTE_AEREO_ATIVO && LS.aviao_disponivel(u) && U.pode_pagar(u, 'suporte_aereo') && (op.tanque_ativo ? rand100() <= 85 : turno >= 4 && rand100() <= 30)) {
    const alvo = alvoAereo(op); if (alvo === 'frente' || LS.tem(op, alvo)) return `ataque_aereo_${alvo}`;
  }
  return null;
};
// melhor blindado que o bot consegue pagar agora (ou null)
const melhorBlindado = (u) => ['pesado', 'medio', 'leve'].find((k) => u.pontos >= C.TANQUES[u.lado_id][k].custo_chamar) || null;
const escolherBase = (u, op, turno) => {
  if (u.tanque_ativo) {
    const tc = C.TANQUES[u.lado_id][u.tanque_classe];
    if (u.tanque_combustivel <= 0) return u.pontos >= tc.custo_reabastecer ? 'reabastecer' : 'aguardar';
    const pronto = T.canhao_pronto(u) && U.pode_pagar(u, 'tanque_' + u.tanque_municao);
    const certa = pronto && ((u.tanque_municao === 'perfurante') === op.tanque_ativo);
    if (certa) return 'tanque_' + u.tanque_municao; // atirar com a municao certa vem antes de qualquer compra
    const as = acaoSuporte(u, op, turno); if (as) return as;
    if (!T.tanque_operacional(u)) return 'aguardar';
    const p = U.vida_atual_principal(u) / U.vida_maxima_principal(u);
    if (p < 0.4 && U.pode_pagar(u, 'suprimento_medico') && rand100() <= 60) return 'suprimento_medico';
    if (pronto) return 'tanque_' + u.tanque_municao;
    if (T.pode_carregar(u)) return op.tanque_ativo ? 'carregar_perfurante' : 'carregar_explosivo';
    // metralhadora nao faz nada contra blindado (10% do dano)
    if (!op.tanque_ativo && u.pontos >= C.CUSTOS_ACAO.tanque_perfurante + C.CUSTOS_ACAO.tanque_metralhadora) return 'tanque_metralhadora';
    return 'aguardar';
  }
  const pct = u.vida_atual / u.vida_maxima, truck = CM.ativo(u);
  if (pct < 0.3 && truck && U.pode_pagar(u, 'suprimento_medico') && rand100() <= 60) return 'suprimento_medico';
  const protegido = u.em_cobertura || u.cobertura_pendente;
  const ameaca = LS.artilharia_a_caminho(op) || LS.aviao_chegando(op);
  if (ameaca && !protegido && rand100() <= C.BOT_CHANCE_COBERTURA_ARTILHARIA) return 'cobertura';
  const as = acaoSuporte(u, op, turno); if (as) return as;
  if (op.tanque_ativo) {
    // rifle/SMG/molotov quase nao machucam blindado: usar antitanque ou ter um blindado proprio
    if (u.arma_no_chao) return 'recolher_arma';
    if (U.pode_pagar(u, 'anti_tank') && U.tem_municao(u, 'anti_tank')) return 'anti_tank';
    const k = melhorBlindado(u); if (k) return `chamar_blindado_${k}`;
    if (truck && U.pode_pagar(u, 'suprimento_municao_anti_tank')) return 'suprimento_municao_anti_tank';
    return B.escolher_pular_ou_cobertura(u, op);
  }
  const k = melhorBlindado(u);
  if (k && turno >= 3 && rand100() <= (k === 'leve' ? 35 : 60)) return `chamar_blindado_${k}`;
  const ctr = op.em_cobertura; // proximo dano do inimigo sera reduzido: nao gastar ataque forte
  const rifleMax = u.lado_id === 1 ? 20 : 17, smgMed = u.lado_id === 1 ? 16 : 12;
  if (op.molotov_restante === 0 && !ctr && op.vida_atual > 25 && u.pontos >= 25 && (u.arma_no_chao || !U.tem_municao(u, 'anti_tank')) && rand100() <= 40) return 'molotov';
  const querSmg = !ctr && op.vida_atual > rifleMax * 0.6 && u.pontos >= 20 && U.tem_municao(u, 'smg') && U.pode_pagar(u, 'submetralhadora');
  if (querSmg && op.vida_atual > smgMed * 0.5) return 'submetralhadora';
  if (U.tem_municao(u, 'rifle') && U.pode_pagar(u, 'rifle')) return 'rifle';
  if (U.tem_municao(u, 'smg') && U.pode_pagar(u, 'submetralhadora')) return 'submetralhadora';
  if (truck && U.pode_pagar(u, 'suprimento_municao_rifle')) return 'suprimento_municao_rifle';
  if (truck && U.pode_pagar(u, 'suprimento_municao_smg')) return 'suprimento_municao_smg';
  if (u.arma_no_chao && U.tem_municao(u, 'anti_tank')) return 'recolher_arma';
  return B.escolher_pular_ou_cobertura(u, op);
};
B.escolher_acao_bot = (u, op, turno) => { const a = escolherBase(u, op, turno);
  if (SUPR_CAMINHAO.has(a) && !CM.ativo(u)) { if (u.tanque_ativo) return 'aguardar';
    if (!op.tanque_ativo && U.tem_municao(u, 'rifle') && U.pode_pagar(u, 'rifle')) return 'rifle'; return B.escolher_pular_ou_cobertura(u, op); }
  return a; };
B.suprimento_bot = (u) => {
  if (U.vida_atual_principal(u) / U.vida_maxima_principal(u) < 0.5 && U.pode_pagar(u, 'suprimento_medico')) return 'suprimento_medico';
  if (u.tanque_ativo) return null;
  for (const [arma, ch] of [['rifle', 'suprimento_municao_rifle'], ['smg', 'suprimento_municao_smg'], ['anti_tank', 'suprimento_municao_anti_tank']])
    if (!U.tem_municao(u, arma) && !(arma === 'anti_tank' && u.arma_no_chao) && U.pode_pagar(u, ch)) return ch;
  return null;
};
Tn.turno_bot = async (u, op, turno) => {
  say(`\n▶ ${u.nome}`); await espera(0.5);
  if (CM.ativo(u)) for (let k = 0; k < 3; k++) { const s = B.suprimento_bot(u); if (!s) break; await Tn.executar_acao(s, u, op); }
  const acao = B.escolher_acao_bot(u, op, turno);
  await Tn.executar_acao(acao, u, op);
};

// ---------- cobertura (QTE) ----------
const acaoRapida = (a) => {
  if (a.tanque_ativo) { if (T.canhao_pronto(a) && U.pode_pagar(a, 'tanque_' + a.tanque_municao)) return 'tanque_' + a.tanque_municao; return (T.tanque_operacional(a) && U.pode_pagar(a, 'tanque_metralhadora')) ? 'tanque_metralhadora' : null; }
  return (U.tem_municao(a, 'rifle') && U.pode_pagar(a, 'rifle')) ? 'rifle' : null;
};
L.resolver_cobertura = async (at, alvo, ehHumano) => {
  alvo.cobertura_pendente = false;
  const acao = acaoRapida(at); let reagiu = false;
  if (acao) {
    if (ehHumano) {
      L.pausar_registro();
      say(`\n>>> ${alvo.nome} corre para a cobertura! Aperte ENTER em ${C.QTE_TEMPO_SEGUNDOS}s para atacar!`);
      reagiu = await HOOK.qte(C.QTE_TEMPO_SEGUNDOS, at, alvo);
      L.retomar_registro();
    } else reagiu = rand100() <= C.QTE_CHANCE_BOT;
  }
  if (reagiu) { say(`${at.nome} flagra ${alvo.nome} em campo aberto!`); await Tn.executar_acao(acao, at, alvo); }
  else { alvo.em_cobertura = true; say(`${alvo.nome} alcança a cobertura a tempo.`); await fx('cobertura_chega', { u: alvo }); await espera(1); }
};

// ---------- batalha ----------
L.rodar_batalha = async (jogador, inimigo) => {
  let turno = 1;
  const alemao = jogador.lado_id === 1 ? jogador : inimigo, sovietico = jogador.lado_id === 1 ? inimigo : jogador;
  for (;;) {
    if (turno > 1) {
      HOOK.limparTela(); L.mostrar_resumo(turno - 1);
      U.ganhar_pontos_turno(jogador); U.ganhar_pontos_turno(inimigo);
    }
    HOOK.status(jogador, inimigo, turno);
    say(`\n=== Turno ${turno} ===`); await espera(0.5);
    L.iniciar_registro();
    for (const [u, op] of [[alemao, sovietico], [sovietico, alemao]]) {
      await T.processa_chegada_e_cooldown_tanque(u);
      await CM.processa_chegada(u);
      LS.processa_cooldown(u);
      if (op.cobertura_pendente) await L.resolver_cobertura(u, op, u === jogador);
      await LS.processa_chegada(u, op);
      await LS.processa_ataque_aereo(u, op);
      if (U.unidade_derrotada(op)) break;
      if (u === jogador) await Tn.turno_humano(u, op, turno); else await Tn.turno_bot(u, op, turno);
      if (u.fugiu || op.fugiu) break;
      if (U.unidade_derrotada(op)) break;
    }
    for (const u of [alemao, sovietico]) { await L.aplica_efeito_incendiario(u); await L.aplica_molotov(u); }
    const fuga = jogador.fugiu || inimigo.fugiu;
    if (fuga || U.unidade_derrotada(jogador) || U.unidade_derrotada(inimigo)) { HOOK.status(jogador, inimigo, turno); return fuga ? 'fuga' : 'combate'; }
    turno += 1;
  }
};
L.vencedor = (jogador, inimigo, motivo) =>
  motivo === 'fuga' ? (jogador.fugiu ? inimigo : jogador) : (U.unidade_derrotada(jogador) ? inimigo : jogador);

root.Luft = L;
if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);