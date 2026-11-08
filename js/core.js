(function (root) {
'use strict';
const L = {};
// ============================================================================
// VERSÃO DO JOGO — REGRA DE MANUTENÇÃO (não remover este aviso)
// Toda vez que algo novo for adicionado ou alterado no jogo:
//   1) ADICIONAR uma entrada nova no FIM de L.DEV_LOG (data + lista do que mudou).
//      NUNCA apagar nem editar entradas antigas, só acrescentar.
//   2) AUMENTAR a versão dessa nova entrada:
//        - mudança pequena (ajuste, balanceamento, correção): +0.1  (ex.: 1.2 -> 1.3)
//        - muitas coisas novas / mudança grande (unidades, modos, regras): sobe para
//          a próxima versão inteira (ex.: 1.x -> 2.0)
// A versão mostrada no canto do menu é sempre a da última entrada do DEV_LOG.
// ============================================================================
L.DEV_LOG = [
  { versao: '1.0', data: 'Oct 22, 2026', itens: ['Initial version of the game.'] },
  { versao: '1.1', data: 'Oct 26, 2026', itens: ['Difficulty selection added.', 'Bot updated.'] },
  { versao: '1.2', data: 'Nov 06, 2026', itens: [
    'SMG: cost 10 → 8 pts.',
    'Anti-tank: cost 30 → 25 pts; extra ammo 40 → 30 pts.',
    'Armor against normal weapons: 10% → 20% of the damage gets through.',
    'Skip turn: bonus 10 → 5 pts.',
    'Warsaw Pact tanks: +1 round of fuel and −5 pts call cost.',
    'NATO tanks: cannon max damage +2.',
    'M103: reload 3 → 4 and fuel 3 → 4 rounds.',
    'Warsaw Pact SMG (PPS-43): max ammo 16 → 20.',
    'Anti-aircraft: Warsaw Pact 25% → 30% and NATO 35% → 30% interception chance.',
    'Warsaw Pact artillery: damage per shot [6,9] → [7,10].',
    'Tank cannons: 15% chance of a total miss; otherwise damage is between 75% and 100% of the max.',
    'Version number and Development log added to the menu.',
    'Menu background music drawn at random on each launch (6 tracks), with the track name shown in the bottom-left corner.',
    'Options menu with volume controls: master, music, gunfire and combat, voice acting and ambience/intro (saved in the browser).',
    'Whole game translated to English.',
  ] },
  { versao: '1.3', data: 'Nov 07, 2026', itens: [
    'Attack rework: every player attack now opens an aiming minigame ("GET READY" for 1s, then a red crosshair appears for 0.8s at a random spot).',
    'Damage depends on how close the click is to the red crosshair: perfect aim = max damage, no click = 0 damage (missed aim).',
    'Cover reaction uses the same aiming minigame, without the "GET READY" delay.',
    'Removed the SMG burst (single shot now, max 15 damage for both sides). Rifle max damage is now 10 for both sides.',
    'Removed the molotov and the weapon-on-the-ground mechanic.',
    'Bot aim accuracy now scales with difficulty.',
  ] },
];
L.VERSAO = L.DEV_LOG[L.DEV_LOG.length - 1].versao;
const HOOK = L.HOOK = {
  say() {}, wait: async () => {}, fx: async () => {}, mira: async () => 1,
  escolherAcao: async () => 'pular_vez', resumo() {}, status() {}, limparTela() {},
};

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

const C = L.C = {
  SUPORTE_AEREO_ATIVO: true,
  DADOS_LADOS: {
    1: { nome: 'NATO', nome_completo: 'North Atlantic Treaty Organization', vida_maxima: 100,
         rifle_nome: 'M1 Garand', submetralhadora_nome: 'Thompson', suporte_nome: 'F-84F Thunderstreak',
         bomba_nome: 'Mk 84', caminhao_nome: 'M35 Truck', arma_anti_tank_nome: 'Bazooka M20', buff_defesa: 0 },
    2: { nome: 'Warsaw Pact', nome_completo: 'Warsaw Treaty Organization', vida_maxima: 100,
         rifle_nome: 'SKS', submetralhadora_nome: 'PPS-43', suporte_nome: 'Su-7B',
         bomba_nome: 'FAB-500', caminhao_nome: 'ZIL-157 Truck', arma_anti_tank_nome: 'RPG-2', buff_defesa: 0 },
  },
  CUSTOS_ACAO: { rifle: 5, submetralhadora: 8, suprimento_medico: 25, suprimento_municao_rifle: 10,
    suprimento_municao_smg: 30, anti_tank: 25, suprimento_municao_anti_tank: 30, 
    sair_tanque: 0, cobertura: 0, tanque_metralhadora: 6, tanque_perfurante: 15, tanque_explosivo: 15,
    pular_vez: 0, fugir: 0, chamar_blindado: 0, reabastecer: 0, carregar_perfurante: 0, carregar_explosivo: 0 },
  GANHO_PONTOS_TURNO: 10, BONUS_PULAR_VEZ: 5, PONTOS_INICIAIS: 30, CURA_SUPRIMENTO: 30,
  MUNICAO_MAXIMA_RIFLE: 25, MUNICAO_GASTA_RIFLE: 5, MUNICAO_MAXIMA_SMG: { 1: 16, 2: 20 }, MUNICAO_GASTA_SMG: 4,
  MUNICAO_MAXIMA_ANTI_TANK: 2, MUNICAO_GASTA_ANTI_TANK: 1,
  TANQUES: {
    1: { leve: { nome: 'Walker Bulldog', vida: 50, custo_chamar: 45, dano_max: 22, recarga_rodadas: 1, combustivel_rodadas: 5, custo_reabastecer: 15 },
         medio: { nome: 'M48 Patton', vida: 80, custo_chamar: 65, dano_max: 27, recarga_rodadas: 2, combustivel_rodadas: 4, custo_reabastecer: 15 },
         pesado: { nome: 'M103', vida: 110, custo_chamar: 90, dano_max: 32, recarga_rodadas: 4, combustivel_rodadas: 4, custo_reabastecer: 15 } },
    2: { leve: { nome: 'BMP-1', vida: 50, custo_chamar: 40, dano_max: 20, recarga_rodadas: 1, combustivel_rodadas: 6, custo_reabastecer: 15 },
         medio: { nome: 'T-54', vida: 80, custo_chamar: 60, dano_max: 25, recarga_rodadas: 2, combustivel_rodadas: 5, custo_reabastecer: 15 },
         pesado: { nome: 'T-10M', vida: 110, custo_chamar: 85, dano_max: 30, recarga_rodadas: 3, combustivel_rodadas: 4, custo_reabastecer: 15 } },
  },
  SUPORTE_AEREO: { custo: 40, dano_frente: [20, 40], cooldown_rodadas: 4,
    rodadas_para_chegar: { 1: { frente: 3, suporte: 5 }, 2: { frente: 2, suporte: 3 } } },
  DANO_INCENDIARIO_POR_RODADA: 3, DURACAO_INCENDIARIO_ANTITANQUE: 3,
  FATOR_DANO_ARMA_NORMAL_VS_TANQUE: 0.20,
  COBERTURA_REDUCAO_MIN: 0.40, COBERTURA_REDUCAO_MAX: 0.70,
  MIRA: { preparo: 1, janela: 0.8, tolerancia_perfeita: 0.025, raio_zero: 0.42 },
  DANO_MAX_RIFLE: { 1: 10, 2: 10 }, DANO_MAX_SMG: 15, DANO_MAX_ANTI_TANK_BLINDADO: 23, DANO_MAX_ANTI_TANK_INFANTARIA: 10, DANO_MAX_TANQUE_MG: 8,
  DANO_TANQUE_METRALHADORA: { faixa: [2, 8] }, TANQUE_DANO_MIN_ACERTO: 5,
  TANQUE_FATOR_MUNICAO_ERRADA: 0.25, TANQUE_CHANCE_ERRO_TOTAL: 0.15, TANQUE_DANO_MIN_FRACAO: 0.75,
  LINHA_SUPORTE: {
    artilharia: { nomes: { 1: 'M55', 2: '2S1' }, custo_compra: 10, custo_uso: 15, tiros: 3,
      dano_tiro: { 1: [8, 12], 2: [7, 10] }, cooldown_rodadas: { 1: 4, 2: 3 }, rodadas_para_chegar: 1 },
    antiaerea: { nomes: { 1: 'VADS', 2: 'Shilka' }, custo_compra: 12, chance_interceptacao: { 1: 30, 2: 30 } },
  },
};
Object.assign(C.CUSTOS_ACAO, {
  comprar_artilharia: C.LINHA_SUPORTE.artilharia.custo_compra, solicitar_artilharia: C.LINHA_SUPORTE.artilharia.custo_uso,
  comprar_antiaerea: C.LINHA_SUPORTE.antiaerea.custo_compra, suporte_aereo: C.SUPORTE_AEREO.custo,
  ataque_aereo_frente: C.SUPORTE_AEREO.custo, ataque_aereo_antiaerea: C.SUPORTE_AEREO.custo, ataque_aereo_artilharia: C.SUPORTE_AEREO.custo,
});

C.CAMINHAO = { custo_chamar: 0, rodadas_para_chegar: 5, vida: 30, bonus_pontos: 5, fator_dano: 0.5 };
C.DIFICULDADE_PADRAO = 'medio';
C.TUTORIAL_ATIVO = false;
C.DIFICULDADES = {
  facil: { nome: 'EASY', mira: [0.2, 0.85], desc: 'Passive bot: misses a lot and earns fewer points.', temp: 30, erro: .08, persona: 'passivo', muda: false, blefa: false, le_jogador: false, planeja: false, combos: false, finaliza: false, qte: 20, pontos_rodada: -2, tutorial: true },
  medio: { nome: 'MEDIUM', mira: [0.5, 0.95], desc: 'Balanced bot with a playstyle drawn at random each match.', temp: 18, erro: .03, persona: 'sorteada', muda: false, blefa: false, le_jogador: false, planeja: false, combos: false, finaliza: true, qte: 50, pontos_rodada: 0, tutorial: false },
  dificil: { nome: 'HARD', mira: [0.7, 1], desc: 'Bot that reads your moves, plans ahead and changes playstyle mid-match.', temp: 8, erro: 0, persona: 'sorteada', muda: true, blefa: false, le_jogador: true, planeja: true, combos: false, finaliza: true, qte: 70, pontos_rodada: 0, tutorial: false },
  impossivel: { nome: 'IMPOSSIBLE', mira: [0.88, 1], desc: 'Bot that bluffs, chains combos and plays with a points advantage.', temp: 4, erro: 0, persona: 'sorteada', muda: true, blefa: true, le_jogador: true, planeja: true, combos: true, finaliza: true, qte: 90, pontos_rodada: 5, tutorial: false },
};
C.CUSTOS_ACAO.chamar_caminhao = C.CAMINHAO.custo_chamar; C.CUSTOS_ACAO.interceptar_caminhao = C.LINHA_SUPORTE.artilharia.custo_uso;
const SUPR_CAMINHAO = new Set(['suprimento_medico', 'suprimento_municao_rifle', 'suprimento_municao_smg', 'suprimento_municao_anti_tank']);

const U = L.U = {};
U.criar_unidade = (lado) => { const d = C.DADOS_LADOS[lado]; return {
  lado_id: lado, nome: d.nome, vida_atual: d.vida_maxima, vida_maxima: d.vida_maxima, pontos: C.PONTOS_INICIAIS,
  municao_rifle: C.MUNICAO_MAXIMA_RIFLE, municao_smg: C.MUNICAO_MAXIMA_SMG[lado], municao_anti_tank: C.MUNICAO_MAXIMA_ANTI_TANK,
  efeito_incendiario_restante: 0, tanque_ativo: false, tanque_classe: null, tanque_combustivel: 0, tanque_recem_chamado: false,
  tanque_vida: 0, tanque_municao: null, tanque_recarga: 0, em_cobertura: false, cobertura_pendente: false,
  fugiu: false, linha_suporte: [], ataque_aereo: null, aviao_cooldown: 0, caminhao: null, hist: [], ajuste_pontos: 0, interceptado: 0, ia: null }; };
U.nome_tanque = (lado, classe) => C.TANQUES[lado][classe].nome;
U.nome_alvo_principal = (u) => u.tanque_ativo ? U.nome_tanque(u.lado_id, u.tanque_classe) : C.DADOS_LADOS[u.lado_id].nome;
U.vida_atual_principal = (u) => u.tanque_ativo ? u.tanque_vida : u.vida_atual;
U.vida_maxima_principal = (u) => u.tanque_ativo ? C.TANQUES[u.lado_id][u.tanque_classe].vida : u.vida_maxima;
U.unidade_derrotada = (u) => u.tanque_ativo ? false : u.vida_atual <= 0;
U.pode_pagar = (u, a) => u.pontos >= C.CUSTOS_ACAO[a];
U.pagar = (u, a) => { u.pontos -= C.CUSTOS_ACAO[a]; };
U.ganhar_pontos_turno = (u) => { u.pontos += Math.max(0, C.GANHO_PONTOS_TURNO + (CM.ativo(u) ? C.CAMINHAO.bonus_pontos : 0) + u.ajuste_pontos); };
U.ativar_cobertura = (u) => { u.cobertura_pendente = true; };
U.consumir_cobertura_se_ativa = (u, dano) => {
  if (!u.em_cobertura) return dano;
  u.em_cobertura = false;
  const f = uniform(C.COBERTURA_REDUCAO_MIN, C.COBERTURA_REDUCAO_MAX);
  const r = Math.max(0, pyRound(dano * (1 - f)));
  say(`Cover worked: damage ${dano} → ${r} (-${pyRound(f * 100)}%).`);
  fx('cobertura_absorve', { u });
  return r;
};
U.aplicar_dano = async (u, dano, pular = false) => {
  let ef = dano;
  if (u.tanque_ativo && !pular) {
    const red = Math.max(0, pyRound(ef * C.FATOR_DANO_ARMA_NORMAL_VS_TANQUE));
    say(`Armor of the ${U.nome_tanque(u.lado_id, u.tanque_classe)}: damage ${ef} → ${red}.`);
    ef = red;
  }
  ef = U.consumir_cobertura_se_ativa(u, ef);
  await fx('dano', { u, dano: ef });
  if (u.tanque_ativo) {
    u.tanque_vida = Math.max(0, u.tanque_vida - ef);
    if (u.tanque_vida === 0) {
      say(`${U.nome_tanque(u.lado_id, u.tanque_classe)} destroyed!`);
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
  if (rand100() <= C.DADOS_LADOS[def.lado_id].buff_defesa * 100) { say(`Defense of ${def.nome}: damage halved!`); return Math.floor(dano / 2); }
  return dano;
};
const MUN = { rifle: ['municao_rifle', 'MUNICAO_GASTA_RIFLE', 'MUNICAO_MAXIMA_RIFLE'], smg: ['municao_smg', 'MUNICAO_GASTA_SMG', 'MUNICAO_MAXIMA_SMG'],
  anti_tank: ['municao_anti_tank', 'MUNICAO_GASTA_ANTI_TANK', 'MUNICAO_MAXIMA_ANTI_TANK'] };
const mmax = (a, lado) => { const m = C[MUN[a][2]]; return typeof m === 'object' ? m[lado || 1] : m; };
U.tem_municao = (u, a) => MUN[a] ? u[MUN[a][0]] >= C[MUN[a][1]] : true;
U.usos_restantes = (u, a) => MUN[a] ? Math.floor(u[MUN[a][0]] / C[MUN[a][1]]) : 0;
U.usos_maximos = (a, lado) => MUN[a] ? Math.floor(mmax(a, lado) / C[MUN[a][1]]) : 0;
U.consumir_municao = (u, a) => { if (MUN[a]) u[MUN[a][0]] -= C[MUN[a][1]]; };
U.recarregar_municao = (u, a) => { if (MUN[a]) u[MUN[a][0]] = mmax(a, u.lado_id); };

const A = L.A = {};
const mostrarTiros = async (t, p = 0.4) => { for (let i = 0; i < t.length; i++) { say(`  Shot ${i + 1} - ${t[i]} damage`); await espera(p); } };
L.precisao = async (at, info) => {
  if (L._prec_forcada != null) { const p = L._prec_forcada; L._prec_forcada = null; return p; }
  if (at !== L.jogador_humano) { const [a, b] = DIF().mira; return a + Math.random() * (b - a); }
  return Math.max(0, Math.min(1, await HOOK.mira({ ...info, at, prep: true })));
};
const marcaMira = (p) => p >= .95 ? ' (perfect aim!)' : p === 0 ? ' (missed aim)' : '';
const danoMira = (def, max, p) => { const d = Math.round(max * p); return d > 0 ? U.dano_com_buff(def, d) : 0; };
A.ataque_rifle = async (at, def) => {
  const d = C.DADOS_LADOS[at.lado_id];
  const p = await L.precisao(at, { arma: 'rifle', def });
  const dano = danoMira(def, C.DANO_MAX_RIFLE[at.lado_id], p);
  say(`${d.rifle_nome}: ${dano} damage${marcaMira(p)}`);
  await fx('tiro', { at, def, arma: 'rifle', dano });
  if (dano > 0) await U.aplicar_dano(def, dano);
  U.consumir_municao(at, 'rifle'); await espera(1);
};
A.ataque_submetralhadora = async (at, def) => {
  const d = C.DADOS_LADOS[at.lado_id];
  const p = await L.precisao(at, { arma: 'smg', def });
  const dano = danoMira(def, C.DANO_MAX_SMG, p);
  say(`${d.submetralhadora_nome}: ${dano} damage${marcaMira(p)}`);
  await fx('rajada', { at, def, arma: 'smg', n: 4 });
  if (dano > 0) await U.aplicar_dano(def, dano);
  U.consumir_municao(at, 'smg'); await espera(1);
};
A.ataque_anti_tank = async (at, def) => {
  const arma = C.DADOS_LADOS[at.lado_id].arma_anti_tank_nome;
  const p = await L.precisao(at, { arma: 'anti_tank', def });
  let dano, desc;
  if (def.tanque_ativo) {
    dano = Math.round(C.DANO_MAX_ANTI_TANK_BLINDADO * p); desc = 'hits the armored vehicle';
    if (p >= .95 && Math.random() < 0.1) { dano = 30; def.efeito_incendiario_restante = C.DURACAO_INCENDIARIO_ANTITANQUE; desc = 'CRITICAL on the armored vehicle, setting it on fire'; }
  } else { dano = Math.round(C.DANO_MAX_ANTI_TANK_INFANTARIA * p); desc = 'ineffective against infantry'; }
  if (dano > 0) dano = U.dano_com_buff(def, dano);
  say(`${arma}: ${desc}, ${dano} damage${marcaMira(p)}`);
  await fx('tiro', { at, def, arma: 'anti_tank', dano });
  if (dano > 0) await U.aplicar_dano(def, dano, true);
  U.consumir_municao(at, 'anti_tank'); await espera(1);
};

L.aplica_efeito_incendiario = async (u) => {
  if (u.efeito_incendiario_restante > 0 && !U.unidade_derrotada(u)) {
    await U.aplicar_dano(u, C.DANO_INCENDIARIO_POR_RODADA);
    u.efeito_incendiario_restante -= 1;
    say(`The fire keeps burning ${U.nome_alvo_principal(u)}! Lost ${C.DANO_INCENDIARIO_POR_RODADA} HP.`);
    await espera(1.3);
  }
};

const S = L.S = {};
S.suprimento_medico = async (u) => { const d = C.DADOS_LADOS[u.lado_id]; U.aplicar_cura(u, C.CURA_SUPRIMENTO);
  say(`${d.caminhao_nome}: ${U.nome_alvo_principal(u)} recovers ${C.CURA_SUPRIMENTO} HP.`); await fx('suprimento', { u, tipo: 'medico' }); await espera(1); };
const mk = (arma, chave, campo) => async (u) => { const d = C.DADOS_LADOS[u.lado_id]; U.recarregar_municao(u, arma);
  say(`${d.caminhao_nome}: ${d[campo]} restocked (${U.usos_restantes(u, arma)} uses).`); await fx('suprimento', { u, tipo: arma }); await espera(1); };
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
  if (u.pontos < tc.custo_chamar) { say('Not enough points to call this armored vehicle!'); await espera(1.5); return false; }
  u.pontos -= tc.custo_chamar; u.em_cobertura = false; u.cobertura_pendente = false; u.tanque_ativo = true; u.tanque_classe = classe;
  u.tanque_vida = tc.vida; u.tanque_municao = null; u.tanque_combustivel = tc.combustivel_rodadas; u.tanque_recem_chamado = true; u.tanque_recarga = 0;
  say(`${tc.nome} takes the front line (fuel: ${tc.combustivel_rodadas} rounds; attacks next round).`);
  await fx('tanque_chega', { u, classe }); await espera(1.2); return true;
};
T.sair_do_tanque = async (u) => {
  say(`The crew abandons the ${tcfg(u).nome} and goes back to fighting as infantry.`); await espera(1.3);
  Object.assign(u, { tanque_ativo: false, tanque_classe: null, tanque_combustivel: 0, tanque_vida: 0, tanque_municao: null, tanque_recem_chamado: false, tanque_recarga: 0 });
};
T.reabastecer = async (u) => {
  const tc = tcfg(u);
  if (u.pontos < tc.custo_reabastecer) { say(`Not enough points to refuel the ${tc.nome}! (cost ${tc.custo_reabastecer})`); await espera(1.5); return; }
  u.pontos -= tc.custo_reabastecer; u.tanque_combustivel = tc.combustivel_rodadas;
  say(`${tc.nome} refueled (${tc.combustivel_rodadas} rounds of range).`); await espera(1);
};
T.ataque_tanque_metralhadora = async (at, def) => {
  const tc = tcfg(at);
  const p = await L.precisao(at, { arma: 'tanque_mg', def });
  const dano = danoMira(def, C.DANO_MAX_TANQUE_MG, p);
  say(`${tc.nome}, machine gun: ${dano} damage${marcaMira(p)}`); await fx('rajada', { at, def, arma: 'tanque_mg', n: 1 });
  if (dano > 0) await U.aplicar_dano(def, dano);
  await espera(1);
};
const canhao = async (at, def, tipo) => {
  const tc = tcfg(at), certa = (tipo === 'perfurante') === def.tanque_ativo;
  const p = await L.precisao(at, { arma: 'canhao', def, tipo }), rolado = Math.round(tc.dano_max * p);
  let dano = certa ? rolado : pyRound(rolado * C.TANQUE_FATOR_MUNICAO_ERRADA);
  if (dano > 0) dano = U.dano_com_buff(def, dano);
  say(rolado === 0 ? `${tc.nome}, ${tipo === 'perfurante' ? 'AP' : 'HE'} shot: misses the target (missed aim)!` : `${tc.nome}, ${tipo === 'perfurante' ? 'AP' : 'HE'} shot: ${dano} damage on ${def.tanque_ativo ? 'armor' : 'infantry'}${certa ? '' : ' (wrong ammo, -75%)'}.`);
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
  if (u.tanque_combustivel === 0) { say(`Out of fuel! The ${tcfg(u).nome} can no longer act.`); await espera(1.5); return; }
  if (u.tanque_recarga > 0) {
    u.tanque_recarga -= 1;
    if (u.tanque_recarga === 0 && u.tanque_municao) { say(`${tcfg(u).nome}: cannon loaded and ready to fire.`); await fx('tanque_pronto', { u }); await espera(1); }
  }
};
T.carregar = async (u, tipo) => {
  const tc = tcfg(u);
  u.tanque_municao = tipo; u.tanque_recarga = tc.recarga_rodadas;
  say(`${tc.nome}: loading ${tipo === 'perfurante' ? 'AP' : 'HE'} ammo (ready in ${tc.recarga_rodadas} round(s)).`);
  await fx('tanque_carrega', { u, tipo }); await espera(1);
};

const LS = L.LS = {};
const item = (u, t) => u.linha_suporte.find(i => i.tipo === t) || null;
LS.tem = (u, t) => item(u, t) !== null;
LS.nome = (u, t) => C.LINHA_SUPORTE[t].nomes[u.lado_id];
LS.nomes_comprados = (u) => u.linha_suporte.map(i => LS.nome(u, i.tipo));
LS.comprar = async (u, t) => { u.linha_suporte.push({ tipo: t, cooldown: 0, bloqueado: false, chegada: 0 });
  say(`${LS.nome(u, t)} joins the support line.`); await fx('suporte_compra', { u, tipo: t }); await espera(1); };
LS.destruir_unidade_suporte = (u, t) => { u.linha_suporte = u.linha_suporte.filter(i => i.tipo !== t); };
LS.processa_cooldown = (u) => { for (const i of u.linha_suporte) { if (i.cooldown > 0) { i.bloqueado = true; i.cooldown -= 1; } else i.bloqueado = false; } };
LS.artilharia_a_caminho = (u) => { const i = item(u, 'artilharia'); return i !== null && i.chegada > 0 && i.alvo !== 'caminhao'; };
LS.pode_solicitar_artilharia = (u) => { const i = item(u, 'artilharia'); return i !== null && !i.bloqueado && i.cooldown === 0 && i.chegada === 0; };
LS.solicitar_artilharia = async (at) => {
  const cfg = C.LINHA_SUPORTE.artilharia, i = item(at, 'artilharia');
  i.chegada = cfg.rodadas_para_chegar; i.cooldown = cfg.cooldown_rodadas[at.lado_id]; i.alvo = 'frente';
  say(`${LS.nome(at, 'artilharia')} opens fire!`); say('You hear the sound of an artillery barrage!');
  await fx('artilharia_fogo', { u: at }); await espera(1.5);
};
LS.interceptar_caminhao = async (at, op) => {
  const cfg = C.LINHA_SUPORTE.artilharia, i = item(at, 'artilharia');
  i.chegada = cfg.rodadas_para_chegar; i.cooldown = cfg.cooldown_rodadas[at.lado_id]; i.alvo = 'caminhao';
  say(`${LS.nome(at, 'artilharia')} aims at the road to intercept the truck!`); say('You hear the sound of an artillery barrage!');
  await fx('artilharia_fogo', { u: at }); await espera(1.5);
};
LS.processa_chegada = async (u, op) => {
  const i = item(u, 'artilharia');
  if (i === null || i.chegada <= 0) return;
  i.chegada -= 1; if (i.chegada > 0) return;
  if (i.alvo === 'caminhao') {
    i.alvo = 'frente';
    if (CM.a_caminho(op)) { say(`The ${LS.nome(u, 'artilharia')} barrage hits the ${C.DADOS_LADOS[op.lado_id].caminhao_nome} on the road!`); await fx('caminhao_interceptado', { u, alvo: op }); await CM.destruir(op, 'interceptado'); }
    else { say('The barrage lands on an empty road: the truck had already passed.'); await espera(1); }
    return;
  }
  const cfg = C.LINHA_SUPORTE.artilharia;
  say(`The ${LS.nome(u, 'artilharia')} barrage hits the target!`);
  const tiros = Array.from({ length: cfg.tiros }, () => ri(...cfg.dano_tiro[u.lado_id]));
  await fx('artilharia_impacto', { u, alvo: op }); await mostrarTiros(tiros);
  const tot = U.dano_com_buff(op, tiros.reduce((a, b) => a + b, 0)); say(`  Total: ${tot} damage`);
  await U.aplicar_dano(op, tot); await espera(1);
};
LS.tentar_interceptar = (def) => LS.tem(def, 'antiaerea') && rand100() <= C.LINHA_SUPORTE.antiaerea.chance_interceptacao[def.lado_id];
LS.rodadas_chegada = (u, alvo) => C.SUPORTE_AEREO.rodadas_para_chegar[u.lado_id][alvo === 'frente' ? 'frente' : 'suporte'];
LS.aviao_a_caminho = (u) => u.ataque_aereo !== null;
LS.aviao_disponivel = (u) => u.ataque_aereo === null && u.aviao_cooldown === 0;
LS.aviao_chegando = (u) => u.ataque_aereo !== null && u.ataque_aereo.chegada === 1;
LS.status_aereo = (u) => {
  const av = C.DADOS_LADOS[u.lado_id].suporte_nome;
  if (u.ataque_aereo !== null) return `${av} on its way (arrives in ${u.ataque_aereo.chegada})`;
  if (u.aviao_cooldown > 0) return `${av} on cooldown (${u.aviao_cooldown})`;
  return `${av} ready`;
};
LS.solicitar_ataque_aereo = async (u, alvo) => {
  const d = C.DADOS_LADOS[u.lado_id];
  u.ataque_aereo = { alvo, chegada: LS.rodadas_chegada(u, alvo) };
  say(`The ${d.suporte_nome} takes off loaded with ${d.bomba_nome} bombs!`); say('You hear the roar of jet engines on the horizon!');
  await fx('aviao_decola', { u }); await espera(1.5);
};
const encerrar = (u) => { u.ataque_aereo = null; u.aviao_cooldown = C.SUPORTE_AEREO.cooldown_rodadas; };
LS.processa_ataque_aereo = async (u, op) => {
  const m = u.ataque_aereo;
  if (m === null) { if (u.aviao_cooldown > 0) u.aviao_cooldown -= 1; return; }
  const d = C.DADOS_LADOS[u.lado_id], av = d.suporte_nome;
  m.chegada -= 1;
  if (LS.tentar_interceptar(op)) {
    say(`The ${LS.nome(op, 'antiaerea')} intercepts and shoots down the ${av}!`);
    await fx('interceptacao', { aviao_de: u, antiaerea_de: op }); u.interceptado += 1; encerrar(u); await espera(1.5); return;
  }
  if (m.chegada > 0) { say(`The ${av} keeps heading to the target (${m.chegada} round(s)).`); await espera(1); return; }
  const alvo = m.alvo; encerrar(u);
  say(`The ${av} reaches the target and drops its ${d.bomba_nome} bombs!`);
  const dano = alvo === 'frente' ? U.dano_com_buff(op, ri(...C.SUPORTE_AEREO.dano_frente)) : 0;
  await fx('bombardeio', { u, alvo_tipo: alvo, op, dano, existe: alvo === 'frente' || LS.tem(op, alvo) });
  if (alvo === 'frente') {
    const nome = U.nome_alvo_principal(op);
    say(`The bombing hits ${nome}: ${dano} damage.`); await U.aplicar_dano(op, dano, true);
  } else if (LS.tem(op, alvo)) { say(`Support unit destroyed: ${LS.nome(op, alvo)}!`); LS.destruir_unidade_suporte(op, alvo); }
  else say('The target is no longer there, the bombs fall into the void.');
  await espera(1.5);
};

const CM = L.CM = {};
const cnome = (u) => C.DADOS_LADOS[u.lado_id].caminhao_nome;
CM.ativo = (u) => !!u.caminhao && u.caminhao.estado === 'ativo';
CM.a_caminho = (u) => !!u.caminhao && u.caminhao.estado === 'a_caminho';
CM.chamar = async (u) => { u.caminhao = { estado: 'a_caminho', chegada: C.CAMINHAO.rodadas_para_chegar, vida: C.CAMINHAO.vida };
  say(`${u.nome} calls the ${cnome(u)}! Arrives in ${C.CAMINHAO.rodadas_para_chegar} rounds.`); await fx('caminhao_chamado', { u }); await espera(1); };
CM.processa_chegada = async (u) => { if (!CM.a_caminho(u)) return; u.caminhao.chegada -= 1; if (u.caminhao.chegada > 0) return;
  u.caminhao.estado = 'ativo'; say(`${cnome(u)} has arrived! Instant supplies and +${C.CAMINHAO.bonus_pontos} pts per round.`);
  await fx('caminhao_chega', { u }); await espera(1); };
CM.dano = async (u, ef) => { if (!CM.ativo(u)) return; const d = pyRound(ef * C.CAMINHAO.fator_dano); if (d <= 0) return;
  u.caminhao.vida = Math.max(0, u.caminhao.vida - d); say(`${cnome(u)} takes ${d} damage (${u.caminhao.vida}/${C.CAMINHAO.vida}).`);
  if (u.caminhao.vida === 0) await CM.destruir(u, 'dano'); };
CM.destruir = async (u, motivo) => { say(`${cnome(u)} destroyed!`); await fx('caminhao_destruido', { u, motivo }); u.caminhao = null; await espera(1); };

const Tn = L.Tn = {};
const ACOES_ATAQUE = { rifle: A.ataque_rifle, submetralhadora: A.ataque_submetralhadora, anti_tank: A.ataque_anti_tank,
  tanque_metralhadora: T.ataque_tanque_metralhadora, tanque_perfurante: T.ataque_tanque_perfurante, tanque_explosivo: T.ataque_tanque_explosivo,
  solicitar_artilharia: LS.solicitar_artilharia, interceptar_caminhao: LS.interceptar_caminhao };
const ACOES_SUPRIMENTO = { suprimento_medico: S.suprimento_medico, suprimento_municao_rifle: S.suprimento_municao_rifle,
  suprimento_municao_smg: S.suprimento_municao_smg, suprimento_municao_anti_tank: S.suprimento_municao_anti_tank, reabastecer: T.reabastecer };

Tn.montar_opcoes_disponiveis = (u) => {
  const o = []; let n = 1; const lado = u.lado_id, cu = C.CUSTOS_ACAO;
  const add = (chave, texto) => { o.push({ n: n++, chave, texto }); };
  const info = (texto) => o.push({ n: null, chave: null, texto });
  if (u.tanque_ativo) {
    const tc = tcfg(u), nm = { perfurante: 'AP (vs armor)', explosivo: 'HE (vs infantry)' };
    if (T.tanque_operacional(u)) {
      add('tanque_metralhadora', `Tank machine gun (${cu.tanque_metralhadora} pts)`);
      if (u.tanque_municao) {
        if (T.canhao_pronto(u)) add('tanque_' + u.tanque_municao, `Fire: ${nm[u.tanque_municao]} (${cu['tanque_' + u.tanque_municao]} pts)`);
        else info(`Cannon reloading ${nm[u.tanque_municao]} (${u.tanque_recarga} round(s))`);
      } else {
        add('carregar_perfurante', `Load AP (vs armor, reload ${tc.recarga_rodadas})`);
        add('carregar_explosivo', `Load HE (vs infantry, reload ${tc.recarga_rodadas})`);
      }
    } else if (u.tanque_combustivel <= 0) {
      info(`Tank out of fuel${u.tanque_municao ? ` (reload frozen: ${u.tanque_recarga})` : ''}`);
      add('reabastecer', `Refuel the ${tc.nome} (${tc.custo_reabastecer} pts)`);
    } else info('Tank unavailable this round');
    add('sair_tanque', 'Leave the tank (free)');
  } else {
    for (const [k, t, arma] of [['rifle', 'Rifle', 'rifle'], ['submetralhadora', 'Submachine gun', 'smg']])
      U.tem_municao(u, arma) ? add(k, `${t} (${U.usos_restantes(u, arma)}x, ${cu[k]} pts)`) : info(`${t} out of ammo`);
    const na = C.DADOS_LADOS[lado].arma_anti_tank_nome;
    if (U.tem_municao(u, 'anti_tank')) add('anti_tank', `${na} (${U.usos_restantes(u, 'anti_tank')}x, ${cu.anti_tank} pts)`);
    else info(`${na} out of ammo`);
    add('chamar_blindado', 'Call armor');
  }
  if (!u.caminhao) add('chamar_caminhao', `Call truck ${C.DADOS_LADOS[lado].caminhao_nome} (arrives in ${C.CAMINHAO.rodadas_para_chegar} rounds)`);
  else if (u.caminhao.estado === 'a_caminho') info(`Truck on its way (arrives in ${u.caminhao.chegada} round(s))`);
  else add('caminhao_suprimento', `Truck supplies (instant · truck ${u.caminhao.vida}/${C.CAMINHAO.vida})`);
  const ca = C.LINHA_SUPORTE.artilharia, na = LS.nome(u, 'artilharia');
  if (!LS.tem(u, 'artilharia')) add('comprar_artilharia', `Buy artillery ${na} (${ca.custo_compra} pts)`);
  else if (LS.pode_solicitar_artilharia(u)) add('solicitar_artilharia', `Request artillery ${na} (${ca.custo_uso} pts)`);
  else info(`Artillery ${na} on cooldown`);
  if (!LS.tem(u, 'antiaerea')) add('comprar_antiaerea', `Buy anti-aircraft ${LS.nome(u, 'antiaerea')} (${C.LINHA_SUPORTE.antiaerea.custo_compra} pts)`);
  if (C.SUPORTE_AEREO_ATIVO) {
    const av = C.DADOS_LADOS[lado].suporte_nome;
    if (LS.aviao_disponivel(u)) add('suporte_aereo', `Air support ${av} (${cu.suporte_aereo} pts)`);
    else if (LS.aviao_a_caminho(u)) info(`${av} on its way to the target`); else info(`${av} on cooldown`);
  }
  u.tanque_ativo ? add('aguardar', 'Wait (free)') : add('cobertura', 'Take cover (free, leaves you exposed)');
  if (!u.tanque_ativo) add('pular_vez', `Skip turn (+${C.BONUS_PULAR_VEZ} pts)`);
  add('fugir', 'Flee');
  return o;
};
Tn.opcoes_suprimento = (u) => {
  const c = C.CUSTOS_ACAO, na = C.DADOS_LADOS[u.lado_id].arma_anti_tank_nome;
  const r = [{ chave: 'suprimento_medico', texto: `Medical (+${C.CURA_SUPRIMENTO} HP, ${c.suprimento_medico} pts)` },
    { chave: 'suprimento_municao_rifle', texto: `Rifle ammo (${c.suprimento_municao_rifle} pts)` },
    { chave: 'suprimento_municao_smg', texto: `SMG ammo (${c.suprimento_municao_smg} pts)` },
    { chave: 'suprimento_municao_anti_tank', texto: `${na} ammo (${c.suprimento_municao_anti_tank} pts)` }];
  if (u.tanque_ativo) { const tc = tcfg(u); r.push({ chave: 'reabastecer', texto: `Fuel for the ${tc.nome} (${tc.custo_reabastecer} pts)` }); }
  return r;
};
Tn.opcoes_artilharia = (u, op) => [{ chave: 'solicitar_artilharia', texto: `Attack the front line (${C.LINHA_SUPORTE.artilharia.custo_uso} pts)` },
  { chave: 'interceptar_caminhao', texto: `Intercept the ${C.DADOS_LADOS[op.lado_id].caminhao_nome} (${C.LINHA_SUPORTE.artilharia.custo_uso} pts)` }];
Tn.opcoes_blindado = (lado) => ['leve', 'medio', 'pesado'].map(k => { const t = C.TANQUES[lado][k];
  return { chave: `chamar_blindado_${k}`, classe: k, texto: `${t.nome} — HP ${t.vida}, cost ${t.custo_chamar}, cannon ${Math.ceil(t.dano_max * C.TANQUE_DANO_MIN_FRACAO)}–${t.dano_max}, reload ${t.recarga_rodadas}, fuel ${t.combustivel_rodadas}` }; });
Tn.opcoes_aereo = (u, op) => {
  const r = [{ chave: 'ataque_aereo_frente', texto: `Attack the front line (arrives in ${LS.rodadas_chegada(u, 'frente')} rounds)` }];
  for (const [t, rot] of [['antiaerea', 'anti-aircraft'], ['artilharia', 'artillery']])
    if (LS.tem(op, t)) r.push({ chave: `ataque_aereo_${t}`, texto: `Attack the support line: ${rot} (arrives in ${LS.rodadas_chegada(u, t)} rounds)` });
  return r;
};

Tn.validar_acao = (chave, u, op) => {
  if (chave.startsWith('chamar_blindado_')) {
    const custo = C.TANQUES[u.lado_id][chave.split('_').pop()].custo_chamar;
    return u.pontos < custo ? 'Not enough points to call this armored vehicle!' : null;
  }
  if (SUPR_CAMINHAO.has(chave) && !CM.ativo(u)) return 'No active truck to provide supplies!';
  if (chave === 'chamar_caminhao' && u.caminhao) return 'You already have a truck on its way or active!';
  if (chave === 'interceptar_caminhao' && (!LS.pode_solicitar_artilharia(u) || !CM.a_caminho(op))) return 'Interception unavailable!';
  if (chave === 'reabastecer') {
    if (!u.tanque_ativo) return 'No active armored vehicle!';
    const custo = tcfg(u).custo_reabastecer;
    return u.pontos < custo ? `Not enough points to refuel! (cost ${custo})` : null;
  }
  if ((chave === 'comprar_artilharia' || chave === 'comprar_antiaerea') && LS.tem(u, chave.slice(8))) return `${u.nome} already bought this support unit!`;
  if (chave === 'solicitar_artilharia' && !LS.pode_solicitar_artilharia(u)) return 'Artillery unavailable (not bought or on cooldown)!';
  if (chave.startsWith('ataque_aereo_')) {
    const alvo = chave.slice(13);
    if (!LS.aviao_disponivel(u) || (alvo !== 'frente' && !LS.tem(op, alvo))) return 'Air strike unavailable!';
  }
  if (chave === 'carregar_perfurante' || chave === 'carregar_explosivo') return T.pode_carregar(u) ? null : 'The cannon cannot be loaded right now!';
  if (chave === 'tanque_metralhadora' && !T.tanque_operacional(u)) return 'The tank machine gun is unavailable!';
  if (chave === 'tanque_perfurante' || chave === 'tanque_explosivo') {
    if (!T.canhao_pronto(u) || u.tanque_municao !== chave.slice(7)) return 'The cannon is not ready with that ammo type!';
  }
  for (const [a, arma, t] of [['rifle', 'rifle', 'rifle'], ['submetralhadora', 'smg', 'submachine gun'], ['anti_tank', 'anti_tank', 'anti-tank weapon']])
    if (chave === a && !U.tem_municao(u, arma)) return `${u.nome} is out of ${t} ammo!`;
  if (chave in C.CUSTOS_ACAO && !U.pode_pagar(u, chave)) return `${u.nome} does not have enough points for this action!`;
  return null;
};
Tn.executar_acao = async (chave, u, op) => {
  const erro = Tn.validar_acao(chave, u, op);
  if (erro) { say(erro); await espera(1.2); return; }
  u.hist.push(chave); if (u.hist.length > 10) u.hist.shift();
  if (chave === 'pular_vez') { u.pontos += C.BONUS_PULAR_VEZ; say(`${u.nome} regroups (+${C.BONUS_PULAR_VEZ} pts).`); await espera(1.3); }
  else if (chave === 'fugir') { u.fugiu = true; say(`${u.nome} retreats and abandons the battlefield!`); await espera(1.5); }
  else if (chave === 'sair_tanque') await T.sair_do_tanque(u);
  else if (chave.startsWith('chamar_blindado_')) await T.chamar_tanque(u, chave.split('_').pop());
  else if (chave === 'aguardar') { say(`${u.nome} waits.`); await espera(1); }
  else if (chave === 'cobertura') { if (!u.tanque_ativo) { U.ativar_cobertura(u); say(`${u.nome} runs for cover, exposed for a moment.`); await fx('cobertura_corre', { u }); await espera(1); } }
  else {
    U.pagar(u, chave);
    if (chave in ACOES_ATAQUE) await ACOES_ATAQUE[chave](u, op);
    else if (chave.startsWith('carregar_')) await T.carregar(u, chave.slice(9));
    else if (chave in ACOES_SUPRIMENTO) { await ACOES_SUPRIMENTO[chave](u); }
    else if (chave.startsWith('ataque_aereo_')) await LS.solicitar_ataque_aereo(u, chave.slice(13));
    else if (chave.startsWith('comprar_')) await LS.comprar(u, chave.slice(8));
    else if (chave === 'chamar_caminhao') await CM.chamar(u);
  }
};
Tn.turno_humano = async (u, op, turno) => {
  for (;;) {
    L.pausar_registro();
    const chave = await HOOK.escolherAcao(u, op, turno);
    if (chave === null || chave === undefined) continue;
    const erro = Tn.validar_acao(chave, u, op);
    if (erro) { say(erro); await espera(1.2); continue; }
    L.retomar_registro(); say(`\n▶ ${u.nome}`);
    await Tn.executar_acao(chave, u, op);
    if (chave in ACOES_SUPRIMENTO && CM.ativo(u)) continue;
    break;
  }
};

const B = L.B = {};
const DIF = L.dif = () => C.DIFICULDADES[L.dificuldade] || C.DIFICULDADES[C.DIFICULDADE_PADRAO];
L.dificuldade = C.DIFICULDADE_PADRAO;
L.definir_dificuldade = (k) => { if (C.DIFICULDADES[k]) L.dificuldade = k; };

const PERSONAS = {
  passivo:   { ataque: .7,  antitanque: 1,   blindado: .8,  aereo: .6,  artilharia: .8,  suporte: 1,   cura: 1.2, cobertura: 1.2, guardar: 1.5 },
  agressivo: { ataque: 1.3, antitanque: 1.1, blindado: 1,   aereo: 1.2, artilharia: 1.25, suporte: .9,  cura: .9,  cobertura: .7,  guardar: .5 },
  defensivo: { ataque: .85, antitanque: 1,   blindado: 1,   aereo: .8,  artilharia: .9,  suporte: 1.3, cura: 1.3, cobertura: 1.4, guardar: 1 },
  economico: { ataque: 1.1, antitanque: 1,   blindado: 1.25, aereo: .7, artilharia: .8,  suporte: .9,  cura: 1,   cobertura: 1,   guardar: 1.7 },
  blindado:  { ataque: .8,  antitanque: 1.2, blindado: 1.9, aereo: .8,  artilharia: .9,  suporte: .9,  cura: 1,   cobertura: .9,  guardar: 1.2 },
  aereo:     { ataque: .85, antitanque: 1,   blindado: .8,  aereo: 1.9, artilharia: 1.2, suporte: 1.2, cura: 1,   cobertura: 1,   guardar: 1.3 },
};
const SORTEAVEIS = ['agressivo', 'defensivo', 'economico', 'blindado', 'aereo'];
const sorteia = (a) => a[Math.floor(Math.random() * a.length)];
const CAT = (k) => {
  if (['rifle', 'submetralhadora', 'tanque_metralhadora', 'tanque_perfurante', 'tanque_explosivo'].includes(k) || k.startsWith('carregar_')) return 'ataque';
  if (k === 'anti_tank' || k === 'suprimento_municao_anti_tank') return 'antitanque';
  if (k.startsWith('chamar_blindado_')) return 'blindado';
  if (k.startsWith('ataque_aereo_')) return 'aereo';
  if (k === 'solicitar_artilharia' || k === 'interceptar_caminhao') return 'artilharia';
  if (k === 'comprar_artilharia' || k === 'comprar_antiaerea' || k === 'chamar_caminhao') return 'suporte';
  if (k === 'suprimento_medico') return 'cura';
  if (k === 'cobertura') return 'cobertura';
  if (k === 'pular_vez' || k === 'aguardar') return 'guardar';
  return null;
};
const custoDe = (k, u) => k.startsWith('chamar_blindado_') ? C.TANQUES[u.lado_id][k.split('_').pop()].custo_chamar : (C.CUSTOS_ACAO[k] || 0);

const dmgEsp = (k, u, op) => {
  const tk = op.tanque_ativo, arm = tk ? C.FATOR_DANO_ARMA_NORMAL_VS_TANQUE : 1, cob = op.em_cobertura ? .45 : 1, buff = 1 - C.DADOS_LADOS[op.lado_id].buff_defesa * .5, l = u.lado_id;
  if (k === 'rifle') return 7.3 * arm * cob * buff;
  if (k === 'submetralhadora') return 11 * arm * cob * buff;
  if (k === 'anti_tank') return (tk ? 16.5 : 5.5) * cob * buff;
  if (k === 'solicitar_artilharia') { const c = C.LINHA_SUPORTE.artilharia, f = c.dano_tiro[l]; return c.tiros * (f[0] + f[1]) / 2 * arm * cob * buff; }
  if (k === 'ataque_aereo_frente') { const p = LS.tem(op, 'antiaerea') ? C.LINHA_SUPORTE.antiaerea.chance_interceptacao[op.lado_id] / 100 : 0; return 30 * Math.pow(1 - p, LS.rodadas_chegada(u, 'frente')) * cob * buff; }
  if (k === 'tanque_metralhadora') return 5.8 * arm * cob * buff;
  if (k === 'tanque_perfurante' || k === 'tanque_explosivo') { const certa = (k === 'tanque_perfurante') === tk; return tcfg(u).dano_max * (1 - C.TANQUE_CHANCE_ERRO_TOTAL) * (1 + C.TANQUE_DANO_MIN_FRACAO) / 2 * (certa ? 1 : C.TANQUE_FATOR_MUNICAO_ERRADA) * cob * buff; }
  return 0;
};

const ler = (op) => {
  const h = op.hist.slice(-6), n = Math.max(1, h.length), f = (p) => h.filter(p).length / n;
  return { cob: f((k) => k === 'cobertura'), pass: f((k) => k === 'pular_vez' || k === 'aguardar' || k === 'cobertura'),
    tank: f((k) => /^(chamar_blindado_|tanque_|carregar_)/.test(k)), ar: f((k) => k.startsWith('ataque_aereo_')) };
};

const contexto = (u, op, turno, ia, d) => {
  const hpP = U.vida_atual_principal(u) / U.vida_maxima_principal(u);
  const prox = op.pontos + C.GANHO_PONTOS_TURNO + (CM.ativo(op) ? C.CAMINHAO.bonus_pontos : 0);
  const c = { u, op, turno, ia, d, hpP, pts: u.pontos, tk: op.tanque_ativo, cam: CM.ativo(u), opHp: U.vida_atual_principal(op),
    ameaca: LS.artilharia_a_caminho(op) || LS.aviao_chegando(op), mem: d.le_jogador ? ler(op) : { cob: 0, pass: 0, tank: 0, ar: 0 },
    opTankProx: false, opAereoProx: false, interceptavel: false, reserva: 0 };
  if (d.planeja) {
    c.opTankProx = !op.tanque_ativo && prox >= C.TANQUES[op.lado_id].leve.custo_chamar;
    c.opAereoProx = LS.aviao_disponivel(op) && prox >= C.SUPORTE_AEREO.custo;
    c.interceptavel = LS.pode_solicitar_artilharia(op) && prox >= C.CUSTOS_ACAO.interceptar_caminhao;
    c.reserva = c.cam && hpP < .55 ? C.CUSTOS_ACAO.suprimento_medico : 0;
  }
  return c;
};

const pontuar = (k, c) => {
  const { u, op, d, ia, hpP, pts, tk, turno } = c, custo = custoDe(k, u), dmg = dmgEsp(k, u, op);
  const atq = (extra = 0) => 12 + 1.5 * dmg - .5 * custo + extra;
  let s;
  if (k === 'rifle' || k === 'submetralhadora' || k === 'tanque_metralhadora' || k === 'solicitar_artilharia') s = atq();
  else if (k === 'anti_tank') s = atq(tk ? 8 : 0);
  else if (k.startsWith('chamar_blindado_')) s = (tk ? 34 : 22) + { leve: 0, medio: 6, pesado: 11 }[k.split('_').pop()] + (hpP < .4 ? 10 : 0) + (turno >= 3 ? 3 : -4);
  else if (k === 'tanque_perfurante' || k === 'tanque_explosivo') s = atq(tk && k === 'tanque_perfurante' ? 8 : 0);
  else if (k.startsWith('carregar_')) { const tc = tcfg(u); s = (k.slice(9) === (tk ? 'perfurante' : 'explosivo') ? 36 : 6) - tc.recarga_rodadas * 2 - (u.tanque_combustivel <= tc.recarga_rodadas ? 14 : 0); }
  else if (k === 'reabastecer') s = u.tanque_combustivel <= 0 ? 52 : u.tanque_combustivel === 1 ? 10 : 2;
  else if (k === 'sair_tanque') s = u.tanque_combustivel <= 0 && pts < tcfg(u).custo_reabastecer ? 32 : 4;
  else if (k === 'aguardar') s = 9 + (!T.tanque_operacional(u) && u.tanque_combustivel > 0 ? 14 : 0);
  else if (k === 'chamar_caminhao') s = (turno <= 2 ? 40 : 27) + (hpP < .5 ? 6 : 0) - (c.interceptavel ? 10 : 0);
  else if (k === 'comprar_artilharia') s = 26 + (turno >= 2 ? 3 : 0);
  else if (k === 'interceptar_caminhao') s = 38;
  else if (k === 'comprar_antiaerea') s = 16 + (c.opAereoProx ? 14 : 0) + (c.mem.ar >= .15 ? 10 : 0) + (op.ataque_aereo ? 12 : 0);
  else if (k === 'ataque_aereo_frente') s = atq(tk ? 8 : 0);
  else if (k === 'ataque_aereo_antiaerea') s = u.interceptado ? 30 : 0;
  else if (k === 'ataque_aereo_artilharia') s = LS.pode_solicitar_artilharia(op) ? 18 : 2;
  else if (k === 'cobertura') s = 5 + (c.ameaca ? (d.planeja ? 34 : 24) : 0) + (hpP < .4 ? 10 : 0) + (tk && T.canhao_pronto(op) ? 8 : 0);
  else if (k === 'pular_vez') s = 9 + (pts < 12 ? 16 : 0) + (pts >= 25 && pts < 45 ? 6 : 0);
  else s = 0;

  const sobra = pts - custo;
  if (c.reserva && custo > 0 && sobra < c.reserva) s -= Math.min(14, (c.reserva - sobra) * .6);
  if (d.finaliza && dmg > 0) {
    const atras = k === 'solicitar_artilharia' || k === 'ataque_aereo_frente';
    if (!tk && dmg >= c.opHp * .85) s += atras ? 27 : 45;
    else if (tk && dmg >= c.opHp * .9) s += atras ? 8 : 14;
  }
  if (c.mem.pass >= .5 && (CAT(k) === 'ataque' || CAT(k) === 'aereo')) s += 6;
  if (c.opAereoProx && hpP < .35 && k.startsWith('chamar_blindado_')) s += 10;
  const cb = d.combos && ia.combo && ia.combo.ate >= turno ? ia.combo.tipo : null;
  if (cb === 'amaciar' && (k === 'ataque_aereo_frente' || k === 'submetralhadora' || k === 'tanque_explosivo')) s += 20;
  if (cb === 'fogo' && (k === 'submetralhadora' || k === 'rifle')) s += 15;
  if (d.combos && k === 'interceptar_caminhao') s += 12;
  if (ia.blefe && (k === 'pular_vez' || k === 'aguardar')) s += 45;
  if (ia.golpe === turno && custo >= 30) s += 22;
  const m = (PERSONAS[ia.persona] || {})[CAT(k)];
  if (s > 0 && m) s *= m;
  return s;
};

const pontuarSup = (k, c) => {
  const { u, hpP } = c, custo = custoDe(k, u);
  if (k === 'suprimento_medico') { const falta = U.vida_maxima_principal(u) - U.vida_atual_principal(u); return Math.min(C.CURA_SUPRIMENTO, falta) * 1.7 - .4 * custo + (c.opAereoProx && hpP < .5 ? 8 : 0); }
  if (k === 'reabastecer') return u.tanque_combustivel <= 0 ? 50 : -99;
  if (u.tanque_ativo) return -99;
  const f = c.tk ? .3 : 1;
  if (k === 'suprimento_municao_rifle') return (!U.tem_municao(u, 'rifle') ? 30 : U.usos_restantes(u, 'rifle') <= 1 ? 10 : 0) * f - .4 * custo;
  if (k === 'suprimento_municao_smg') return (!U.tem_municao(u, 'smg') ? 26 : U.usos_restantes(u, 'smg') <= 1 ? 6 : 0) * f - .4 * custo;
  if (k === 'suprimento_municao_anti_tank') {
    return (!U.tem_municao(u, 'anti_tank') ? (c.tk || c.opTankProx || c.mem.tank >= .3 ? 42 : 8) : 0) - .4 * custo;
  }
  return -99;
};

const candidatos = (u, op, fase) => {
  const ks = [];
  if (fase === 'sup') {
    ks.push('suprimento_medico', 'suprimento_municao_rifle', 'suprimento_municao_smg', 'suprimento_municao_anti_tank');
    if (u.tanque_ativo) ks.push('reabastecer');
  } else {
    if (u.tanque_ativo) ks.push('tanque_metralhadora', 'tanque_perfurante', 'tanque_explosivo', 'carregar_perfurante', 'carregar_explosivo', 'reabastecer', 'sair_tanque', 'aguardar');
    else {
      ks.push('rifle', 'submetralhadora', 'anti_tank', 'chamar_blindado_leve', 'chamar_blindado_medio', 'chamar_blindado_pesado', 'pular_vez');
      if (!u.em_cobertura && !u.cobertura_pendente) ks.push('cobertura');
    }
    ks.push('chamar_caminhao', 'comprar_artilharia', 'comprar_antiaerea', 'solicitar_artilharia', 'interceptar_caminhao');
    if (C.SUPORTE_AEREO_ATIVO) ks.push('ataque_aereo_frente', 'ataque_aereo_antiaerea', 'ataque_aereo_artilharia');
  }
  return ks.filter((k) => Tn.validar_acao(k, u, op) === null && (k !== 'interceptar_caminhao' || op.caminhao.chegada >= 2));
};

const sortear = (lista, temp) => {
  const mx = Math.max(...lista.map((x) => x.s)), w = lista.map((x) => Math.exp((x.s - mx) / temp));
  let r = Math.random() * w.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lista.length; i++) { r -= w[i]; if (r <= 0) return lista[i]; }
  return lista[lista.length - 1];
};

B.atualizar = (u, op, turno, d) => {
  const ia = u.ia || (u.ia = { persona: d.persona === 'sorteada' ? sorteia(SORTEAVEIS) : d.persona, desde: 1, blefe: 0, golpe: 0, combo: null });
  const hpP = U.vida_atual_principal(u) / U.vida_maxima_principal(u);
  if (d.muda && turno - ia.desde >= 3) {
    let nova = null;
    if (hpP < .4 && ia.persona !== 'defensivo') nova = 'defensivo';
    else if (op.tanque_ativo && !u.tanque_ativo && ia.persona !== 'blindado' && ia.persona !== 'aereo') nova = sorteia(['blindado', 'aereo']);
    else if (turno - ia.desde >= 5 && Math.random() < .25) nova = sorteia(SORTEAVEIS.filter((p) => p !== ia.persona));
    if (nova) { ia.persona = nova; ia.desde = turno; }
  }
  ia.blefe = 0;
  if (ia.golpe && turno > ia.golpe) ia.golpe = 0;
  const ameaca = LS.artilharia_a_caminho(op) || LS.aviao_chegando(op);
  if (d.blefa && !ia.golpe && u.pontos >= 30 && hpP > .5 && !ameaca && Math.random() < .14) { ia.blefe = 1; ia.golpe = turno + 1; }
  return ia;
};

B.escolher = (u, op, turno, fase, d, ia) => {
  const c = contexto(u, op, turno, ia, d);
  let lista = candidatos(u, op, fase).map((k) => ({ k, s: fase === 'sup' ? pontuarSup(k, c) : pontuar(k, c) })).filter((x) => x.s > -50);
  if (fase === 'sup') lista.push({ k: null, s: 18 });
  else if (d.erro && Math.random() < d.erro) return sorteia(lista).k;
  return sortear(lista, d.temp).k;
};

Tn.turno_bot = async (u, op, turno) => {
  const d = DIF(), ia = B.atualizar(u, op, turno, d);
  say(`\n▶ ${u.nome}`); await espera(0.5);
  if (CM.ativo(u)) for (let k = 0; k < 3; k++) { const s = B.escolher(u, op, turno, 'sup', d, ia); if (!s) break; await Tn.executar_acao(s, u, op); }
  const acao = B.escolher(u, op, turno, 'main', d, ia);
  if (d.combos) ia.combo = acao === 'solicitar_artilharia' ? { tipo: 'amaciar', ate: turno + 1 } : (ia.combo && ia.combo.ate >= turno + 1 ? ia.combo : null);
  await Tn.executar_acao(acao, u, op);
};

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
      say(`\n>>> ${alvo.nome} runs for cover! Aim fast!`);
      const pr = await HOOK.mira({ arma: acao, at, def: alvo, prep: false, reacao: true });
      L.retomar_registro();
      if (pr > 0) { reagiu = true; L._prec_forcada = pr; }
    } else reagiu = rand100() <= DIF().qte;
  }
  if (reagiu) { say(`${at.nome} catches ${alvo.nome} in the open!`); await Tn.executar_acao(acao, at, alvo); L._prec_forcada = null; }
  else { alvo.em_cobertura = true; say(`${alvo.nome} reaches cover in time.`); await fx('cobertura_chega', { u: alvo }); await espera(1); }
};

L.rodar_batalha = async (jogador, inimigo) => {
  L.jogador_humano = jogador;
  let turno = 1;
  inimigo.ajuste_pontos = DIF().pontos_rodada;
  const alemao = jogador.lado_id === 1 ? jogador : inimigo, sovietico = jogador.lado_id === 1 ? inimigo : jogador;
  for (;;) {
    if (turno > 1) {
      HOOK.limparTela(); L.mostrar_resumo(turno - 1);
      U.ganhar_pontos_turno(jogador); U.ganhar_pontos_turno(inimigo);
    }
    HOOK.status(jogador, inimigo, turno);
    say(`\n=== Turn ${turno} ===`); await espera(0.5);
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
    for (const u of [alemao, sovietico]) { await L.aplica_efeito_incendiario(u); }
    const fuga = jogador.fugiu || inimigo.fugiu;
    if (fuga || U.unidade_derrotada(jogador) || U.unidade_derrotada(inimigo)) { HOOK.status(jogador, inimigo, turno); return fuga ? 'fuga' : 'combate'; }
    turno += 1;
  }
};
L.vencedor = (jogador, inimigo, motivo) =>
  motivo === 'fuga' ? (jogador.fugiu ? inimigo : jogador) : (U.unidade_derrotada(jogador) ? inimigo : jogador);

// ============================================================================
// VOLUMES (menu Opções). Só roda no navegador.
// Todo `new Audio(...)` do jogo passa por aqui: o volume final é
//   volume pedido pelo código x volume da categoria x volume geral.
// Categorias pelo caminho do arquivo: dublagem (assets/dublagem/), musica (menu.mp3 e 1..N.mp3
// em assets/audio/), ambiente (ambiente.mp3 + efeitos da intro em assets/audio/), combate (resto de assets/sons/).
// ============================================================================
L.VOLUMES_ROTULOS = [['geral', 'Master'], ['musica', 'Music'], ['combate', 'Gunfire and combat'], ['dublagem', 'Voice acting'], ['ambiente', 'Ambience and intro']];
L.VOLUMES = { geral: 1, musica: 1, combate: 1, dublagem: 1, ambiente: 1 };
if (typeof window !== 'undefined' && window.Audio) {
  try { Object.assign(L.VOLUMES, JSON.parse(localStorage.getItem('luftballons_volumes') || '{}')); } catch (e) {}
  const Nativo = window.Audio, vd = Object.getOwnPropertyDescriptor(HTMLMediaElement.prototype, 'volume');
  const vivos = [];
  const categoria = (src) => {
    src = decodeURI(String(src || '')).toLowerCase();
    if (src.includes('/dublagem/')) return 'dublagem';
    if (/assets\/audio\/(menu|\d+)\.mp3/.test(src)) return 'musica';
    if (src.includes('ambiente.mp3') || src.includes('/audio/')) return 'ambiente';
    if (src.includes('/sons/')) return 'combate';
    return null;
  };
  const aplicar = (a) => { const c = categoria(a.getAttribute('src') || a.src); vd.set.call(a, Math.max(0, Math.min(1, (a._v ?? 1) * L.VOLUMES.geral * (c ? L.VOLUMES[c] : 1)))); };
  window.Audio = function (src) {
    const a = src === undefined ? new Nativo() : new Nativo(src);
    Object.defineProperty(a, 'volume', { get() { return a._v ?? 1; }, set(v) { a._v = v; aplicar(a); }, configurable: true });
    a.addEventListener('play', () => aplicar(a)); aplicar(a); vivos.push(new WeakRef(a));
    return a;
  };
  window.Audio.prototype = Nativo.prototype;
  L.definir_volume = (k, v) => {
    if (!(k in L.VOLUMES)) return;
    L.VOLUMES[k] = Math.max(0, Math.min(1, v));
    try { localStorage.setItem('luftballons_volumes', JSON.stringify(L.VOLUMES)); } catch (e) {}
    for (let i = vivos.length - 1; i >= 0; i--) { const a = vivos[i].deref(); if (!a) vivos.splice(i, 1); else aplicar(a); }
    if (L.aoMudarVolume) L.aoMudarVolume();
  };
}

root.Luft = L;
if (typeof module !== 'undefined') module.exports = L;
})(typeof window !== 'undefined' ? window : globalThis);