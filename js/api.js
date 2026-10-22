/* Luftballons - comunicacao com o back-end (Node-RED + PostgreSQL).
   Se o back-end estiver fora do ar, o jogo continua funcionando normalmente. */
(() => {
const BASE = 'http://localhost:1881';
// nome de cada suprimento do caminhao na tabela "item" do banco
const ITEM = { suprimento_medico: 'Suprimento Medico', suprimento_municao_rifle: 'Municao de Rifle', suprimento_municao_smg: 'Municao de SMG', suprimento_municao_anti_tank: 'Municao Antitanque' };
// ids que o banco devolve, guardados por lado (1 = OTAN, 2 = OVD)
const S = { partida: null, personagem: {}, item: {} };

// De proposito, sem cabecalho Content-Type: assim o navegador nao faz a "pre-checagem" (CORS) e o Node-RED aceita direto.
async function chamar(rota, metodo = 'GET', corpo) {
  try {
    const r = await fetch(BASE + rota, { method: metodo, body: corpo ? JSON.stringify(corpo) : undefined });
    const dados = await r.json();
    console.log('[api]', metodo, rota, corpo || '', '->', r.status, dados);
    return r.ok ? dados : null;
  } catch (e) {
    console.warn('[api] falhou', metodo, rota, e.message);
    return null;
  }
}

Luft.api = {
  // 4) Inicio da partida: cria a partida no banco e consulta nome, vida e itens de cada personagem
  async iniciar(jogador, inimigo) {
    S.partida = null; S.personagem = {}; S.item = {};
    const d = await chamar('/api/partida/iniciar', 'POST', {
      jogador: { nome: 'Jogador', email: 'jogador@luftballons.local' },
      personagem: { nome_batalha: jogador.nome, hp_maximo: jogador.vida_maxima },
      inimigo: { nome_batalha: inimigo.nome, hp_maximo: inimigo.vida_maxima }
    });
    if (!d || !d.id_partida) { Luft.say('[back-end] indisponivel: jogando sem banco de dados.'); return null; }
    S.partida = d.id_partida;
    S.personagem[jogador.lado_id] = d.id_personagem_jogador;
    S.personagem[inimigo.lado_id] = d.id_personagem_inimigo;
    for (const u of [jogador, inimigo]) {
      const p = await chamar('/api/personagem/' + S.personagem[u.lado_id]);
      if (!p) continue;
      u.nome = p.nome_batalha; u.vida_maxima = p.hp_maximo; u.vida_atual = p.hp_atual;
      S.item[u.lado_id] = {};
      for (const it of p.itens) S.item[u.lado_id][it.nome] = it.id_item;
      Luft.say(`[back-end] ${p.nome_batalha}: vida ${p.hp_atual}/${p.hp_maximo} | itens: ${p.itens.map((i) => i.nome + ' x' + i.quantidade).join(', ') || 'nenhum'}`);
    }
    return d;
  },
  // 1) Fim de cada turno: vida dos dois personagens
  status(turno, a, b) {
    if (!S.partida) return null;
    return chamar('/api/partida/status-turno', 'POST', {
      id_partida: S.partida, turno,
      id_personagem_jogador: S.personagem[a.lado_id], hp_jogador: a.vida_atual,
      id_personagem_inimigo: S.personagem[b.lado_id], hp_inimigo: b.vida_atual
    });
  },
  // 2) Dano persistente aplicado: quem recebe e por quantos rounds
  danoPersistente(lado, rounds, tipo) {
    if (!S.partida) return null;
    return chamar('/api/personagem/efeito', 'POST', { id_partida: S.partida, id_personagem_alvo: S.personagem[lado], turnos: rounds, tipo });
  },
  // 3) Item usado: o back-end tira da lista (inventario)
  async itemUsado(lado, chave) {
    const nome = ITEM[chave], idItem = (S.item[lado] || {})[nome];
    if (!S.partida || !idItem) return null;
    const d = await chamar('/api/personagem/usar-item', 'POST', { id_personagem: S.personagem[lado], id_item: idItem });
    if (d && d.restante === 0) delete S.item[lado][nome]; // acabou: saiu da lista
    return d;
  }
};
})();