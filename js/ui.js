(() => {
const { C, U, T, LS, CM, Tn, HOOK } = Luft;
const $ = (s) => document.querySelector(s);
const cv = $('#c'), g = cv.getContext('2d'); g.imageSmoothingEnabled = false;
let player, enemy, fast = false;
const sleep = (ms) => new Promise(r => setTimeout(r, ms));

const IMG = {}, bg = new Image(); bg.src = 'assets/cenas/campo.jpg';
for (const [id, a] of Object.entries(ASSETS)) {
  const fs = a.poses ? a.poses.map(p => p.file) : [a.file];
  for (const f of fs) { const i = new Image(); i.src = 'assets/' + f; IMG[f] = i; }
}
const sprite = (id, pose = 0) => { const a = ASSETS[id], f = a.poses ? a.poses[Math.min(pose, a.poses.length - 1)].file : a.file; return { img: IMG[f], facing: a.facing }; };

const SOL_H = 190, SOLK = SOL_H / 720, PXM = 80;
// Geometria do sprite do anti-tanque em pe/ajoelhado atirando (px do PNG). cut = coluna onde comeca a ogiva (cortada ao disparar); rk = retangulo da ogiva; front/back = boca e traseira do tubo.
const AT_GEO = { 2: { iw: 597, ih: 579, cut: 438, rk: [438, 90, 159, 72], rc: [517, 125], front: [596, 125], back: [10, 121] },
  1: { iw: 615, ih: 633, front: [614, 116], back: [3, 116] } }; // lado 2 = OVD (corta a ogiva e voa como foguete); lado 1 = OTAN (sem corte, so clarao/fumaca/trilha)
const rockets = [];
// ajuste fino dos sprites com radio (px do sprite; negativo = move p/ tras). A antena deixa o PNG mais alto/largo, entao alinha os pes com o sprite antigo.
// BACK_EX: px extras para tras na formacao (OVD: radio e anti-tanque mais ao fundo)
const BACK_EX = { ovd_smg_b: 40, ovd_at: 70 };
const SOL_DX = { otan_smg_b_0: -16, otan_smg_b_1: -16.5 }, ANT_H = 38, SOL_ESC = { otan_smg: 1.06, ovd_smg: 1.06 }; // SOL_ESC: fator extra de tamanho por sprite (1.06 = +6%)
const TANK_M = { leve: { 1: 8.2, 2: 6.9 }, medio: { 1: 8.7, 2: 9.0 }, pesado: { 1: 11.3, 2: 10.3 } };

const TV = {
  otan_pesado: { mount: [0.5813, 0.4045], gl: 0.4187, an: .02, mg: [.395, .031] },
  otan_medio: { mount: [0.3093, 0.4199], gl: 0.3087, an: .02, mg: [.442, .144] },
  otan_leve: { mount: [0.3315, 0.3871], gl: 0.3315, an: .02, mg: [.459, .027] },
  ovd_medio: { mount: [0.4134, 0.3885], gl: 0.4134, an: .02, mg: [.482, .105] },
  ovd_pesado: { mount: [0.4139, 0.3964], gl: 0.4139, an: .02, mg: [.52, .129] },
  ovd_leve: { mount: [0.6392, 0.2294], gl: 0.1277, an: .02, mg: [.64, .275] }
};
const SQ = ['fuz_a', 'fuz_b', 'smg_a', 'smg_b', 'at'], IDLE = ['fuz_a', 'smg_a', 'fuz_b', 'at', 'smg_b'];
const ORDEM = { rifle: ['fuz_a', 'fuz_b', 'smg_a', 'smg_b', 'at'], smg: ['smg_a', 'smg_b', 'fuz_a', 'fuz_b', 'at'], anti_tank: ['at', 'fuz_a', 'fuz_b', 'smg_a', 'smg_b'], molotov: ['at', 'fuz_a', 'fuz_b', 'smg_a', 'smg_b'] };
const FRENTE = { rifle: ['fuz_a', 'fuz_b'], smg: ['smg_a', 'smg_b'], anti_tank: ['at'], molotov: ['at'] };
const DX = 40;

const GROUND = 555, /* altura do chao do campo: menor = sprites mais para cima */ WORLD_W = 2752, X = [480, 2272];
let camX = 0, camT = 0;
const side = (u) => (u === player ? 0 : 1);
const XC = [440, 2312], cov = (u) => u._cov || 0;
const camAlvo = (u) => (side(u) ? WORLD_W - 1376 : 0), focus = (u) => { if (u) camT = camAlvo(u); };
const pan = async (u) => { const t = camAlvo(u); if (t !== camT) { camT = t; await sleep(fast ? 0 : 420); } };
const cxAlvo = (u) => (CM.ativo(u) ? 90 * (side(u) === 0 ? 1 : -1) : 0);
const pos = (u) => { const c = cov(u), e = c * c * (3 - 2 * c); return { x: X[side(u)] + (XC[side(u)] - X[side(u)]) * e + (u._cx || 0), y: GROUND - 85 * e }; };
const parts = [], floats = [];
function drawSquad(u) {
  const p = u.lado_id === 1 ? 'otan' : 'ovd', { x, y } = pos(u), c = cov(u), toEnemy = side(u) === 0 ? 1 : -1, want = side(u) === 0 ? 'R' : 'L';
  const act = u._pose, radioTras = p === 'ovd' && act !== 'smg', order = (ORDEM[act] || IDLE).filter((i) => i !== 'at' && !(radioTras && i === 'smg_b')).concat(radioTras ? ['smg_b', 'at'] : ['at']), front = FRENTE[act] || [];
  u._sq = u._sq || {};
  const L = SQ.map((id) => {
    const k = order.indexOf(id), ex = (id === 'smg_b' && !radioTras) ? 0 : (BACK_EX[`${p}_${id}`] || 0), st = u._sq[id] || (u._sq[id] = { dx: k * DX + ex, dy: k % 2 ? -6 : 5 });
    st.dx += ((k * DX + ex) * (1 - 0.3 * c) - st.dx) * 0.18; st.dy += ((k % 2 ? -6 : 5) - st.dy) * 0.18;
    return { id, st };
  }).sort((a, b) => a.st.dy - b.st.dy);
  for (const { id, st } of L) {
    let fam = id, pose = front.includes(id) ? 99 : 0;
    if (id === 'at') { if (act === 'molotov') { fam = 'molotov'; pose = 1; } else if (u.arma_no_chao) { fam = 'molotov'; pose = 0; } }
    const s = sprite(`${p}_${fam}`, pose); if (!s.img.naturalWidth) continue;
    const sc = SOLK * (1 - 0.14 * c) * (SOL_ESC[`${p}_${fam}`] || 1), w = s.img.naturalWidth * sc, h = s.img.naturalHeight * sc;
    g.save(); g.translate(x - toEnemy * st.dx, y + st.dy); if (s.facing !== want) g.scale(-1, 1);
    if (u._flash > Date.now() && Math.floor(Date.now() / 60) % 2) g.globalAlpha = 0.4;
    const ox = -w / 2 + (SOL_DX[s.img.src.split('/').pop().replace(/\.png.*$/, '')] || 0) * sc, gx = AT_GEO[u.lado_id];
    if (id === 'at' && u._atCut && pose === 99 && gx && gx.cut) g.drawImage(s.img, 0, 0, gx.cut, s.img.naturalHeight, ox, -h, w * gx.cut / s.img.naturalWidth, h); // corta a ogiva (foguete ja disparado)
    else g.drawImage(s.img, ox, -h, w, h);
    g.restore();
  }
  const cx = x - toEnemy * DX * 2 * (1 - 0.3 * c);
  if (u.em_cobertura || u.cobertura_pendente) { g.fillStyle = '#8fd'; g.font = '16px sans-serif'; g.textAlign = 'center'; g.fillText(u.em_cobertura ? '🛡 cobertura' : '↯ correndo', cx, y - SOL_H - 14 - ANT_H); }
  if (u.molotov_restante > 0 || u.efeito_incendiario_restante > 0) for (let i = 0; i < 2; i++) boom(cx + (Math.random() - .5) * 150, y - Math.random() * SOL_H * .8, 1, ['#ff8a1f', '#ffd23f', '#d6370f'], 1.6);
}
function drawUnit(u) {
  { const a = cxAlvo(u), d = a - (u._cx || 0); u._cx = Math.abs(d) < .5 ? a : (u._cx || 0) + d * .08; }
  { const t = (u.em_cobertura || u.cobertura_pendente) && !u.tanque_ativo ? 1 : 0, c = cov(u); u._cov = c < t ? Math.min(t, c + 0.06) : Math.max(t, c - 0.06); }
  if (!u.tanque_ativo || u._troca) return drawSquad(u);
  const p = u.lado_id === 1 ? 'otan' : 'ovd', { y } = pos(u), x = pos(u).x + (side(u) === 0 ? -12 : 12), key = `${p}_${u.tanque_classe}`, V = TV[key], b = sprite(key + '_body'), gs = sprite(key + '_gun');
  if (!b.img.naturalWidth) return;
  const w = TANK_M[u.tanque_classe][u.lado_id] * PXM, h = b.img.naturalHeight * w / b.img.naturalWidth;
  const want = side(u) === 0 ? 'R' : 'L', dir = want === 'R' ? 1 : -1, flip = b.facing !== want ? -1 : 1;
  g.save(); g.translate(x, y);
  if (u._flash > Date.now() && Math.floor(Date.now() / 60) % 2) g.globalAlpha = 0.4;
  if (V && gs.img.naturalWidth) {
    const mx = flip * (-w / 2 + V.mount[0] * w), my = -h + V.mount[1] * h, gw = V.gl * w, gh = gs.img.naturalHeight * gw / gs.img.naturalWidth;
    g.save(); g.translate(mx, my); g.translate(-dir * (u._rec || 0), 0); g.scale(dir, 1); if (gs.facing === 'L') { g.translate(gw * (0.5 - V.an), 0); g.scale(-1, 1); g.translate(-gw * (0.5 - V.an), 0); }
    g.drawImage(gs.img, -V.an * gw, -gh / 2, gw, gh); g.restore();
    u._muz = { x: x + mx + dir * (1 - V.an) * gw, y: y + my };
    if (V.mg) u._mg = { x: x + flip * (-w / 2 + V.mg[0] * w), y: y - h + V.mg[1] * h };
  }
  g.save(); if (flip < 0) g.scale(-1, 1); g.drawImage(b.img, -w / 2, -h, w, h); g.restore(); g.restore();
  if (u.molotov_restante > 0 || u.efeito_incendiario_restante > 0) for (let i = 0; i < 2; i++) boom(x + (Math.random() - .5) * w * .6, y - Math.random() * h * .8, 1, ['#ff8a1f', '#ffd23f', '#d6370f'], 1.6);
}
function boom(x, y, n, cols, spd = 4) { for (let i = 0; i < n; i++) parts.push({ x, y, vx: (Math.random() - .5) * spd * 2, vy: (Math.random() - .8) * spd, life: 25 + Math.random() * 20, c: cols[Math.floor(Math.random() * cols.length)], s: 3 + Math.random() * 5 }); }

const RAIN_ON = true, RAIN = Array.from({ length: 150 }, () => ({ x: Math.random() * 1500, y: Math.random() * 768, l: 14 + Math.random() * 22, v: 16 + Math.random() * 12 }));
function atmos() {
  g.fillStyle = 'rgba(8,12,16,.14)'; g.fillRect(0, 0, 1376, 768);
  const vg = g.createRadialGradient(688, 384, 330, 688, 384, 900); vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,.55)'); g.fillStyle = vg; g.fillRect(0, 0, 1376, 768);
  if (!RAIN_ON) return;
  g.strokeStyle = 'rgba(170,190,205,.28)'; g.lineWidth = 1.5; g.beginPath();
  for (const d of RAIN) { d.y += d.v * (fast ? 1.5 : 1); d.x -= d.v * .25; if (d.y > 768) { d.y = -d.l; d.x = Math.random() * 1500; } g.moveTo(d.x, d.y); g.lineTo(d.x - d.l * .25, d.y + d.l); }
  g.stroke();
}
function loop() {
  g.clearRect(0, 0, 1376, 768);
  g.save(); if (shake > 0.5) { g.translate((Math.random() - .5) * shake, (Math.random() - .5) * shake); shake *= 0.9; }
  camX += (camT - camX) * (fast ? .4 : .09); if (Math.abs(camT - camX) < .5) camX = camT;
  if (scene.name === 'campo') g.translate(-Math.round(camX), 0);
  if (scene.name === 'campo') { if (bg.complete) g.drawImage(bg, 0, 0, WORLD_W, 768); if (player) { for (const q of [player, enemy]) if (CM.ativo(q)) drawCaminhaoCampo(q); drawUnit(player); drawUnit(enemy); } }
  else if (scene.name === 'base') drawBase(); else if (scene.name === 'airfield') drawAirfield(); else if (scene.name === 'rua') drawRua(); else drawSky();
  if (ov) ov();
  for (let i = parts.length - 1; i >= 0; i--) { const p = parts[i]; p.x += p.vx; p.y += p.vy; if (p.g) p.vy += p.g; p.life--; g.globalAlpha = Math.max(0, p.life / 30); g.fillStyle = p.c; g.fillRect(p.x, p.y, p.s, p.s); if (p.life <= 0) parts.splice(i, 1); }
  g.globalAlpha = 1;
  drawFlashes();
  for (let i = floats.length - 1; i >= 0; i--) { const f = floats[i]; f.y -= 0.8; f.life--; g.globalAlpha = Math.min(1, f.life / 20); g.fillStyle = f.c; g.font = 'bold 34px sans-serif'; g.textAlign = 'center'; g.strokeStyle = '#000'; g.lineWidth = 4; g.strokeText(f.t, f.x, f.y); g.fillText(f.t, f.x, f.y); if (f.life <= 0) floats.splice(i, 1); }
  g.globalAlpha = 1; g.restore();
  atmos();
  if (fade > 0) { g.fillStyle = `rgba(0,0,0,${fade})`; g.fillRect(0, 0, 1376, 768); }
  hud(); requestAnimationFrame(loop);
}

const afImg = { 1: new Image(), 2: new Image() }; afImg[1].src = 'assets/cenas/airfield_otan.jpg'; afImg[2].src = 'assets/cenas/airfield_ovd.jpg';
const AFX = 400, AFY = { 1: 612, 2: 604 }, AFW = { 1: 460, 2: 525 }, PFOOT = { 1: .975, 2: .99 }, AF_BICO = { 1: [.86, .58], 2: [.93, .62] }, AF_ACC = { 1: 3000, 2: 4000 };
const bgs = {}; for (const k of ['base_otan', 'base_ovd', 'ceu']) { bgs[k] = new Image(); bgs[k].src = `assets/cenas/${k}.png`; }
let scene = { name: 'campo' }, fade = 0, shake = 0, ov = null;
const K = () => (fast ? 0.3 : 1), nap = (ms) => sleep(ms * K());
const anim = (ms, fn) => new Promise(r => { const t0 = performance.now(), d = ms * K(); const f = (t) => { const p = d ? Math.min(1, (t - t0) / d) : 1; fn(p); p < 1 ? requestAnimationFrame(f) : r(); }; requestAnimationFrame(f); });
const to = async (name, extra = {}) => { await anim(300, p => fade = p); scene = { name, ...extra }; await anim(300, p => fade = 1 - p); };
const sv = (tp) => scene.v[tp] || (scene.v[tp] = { elev: 0, rec: 0, arr: 1 });

const BX = { 1: { artilharia: 265, antiaerea: 620 }, 2: { artilharia: 265, antiaerea: 645 } }, GY = 520, RUA_Y = 700;

const SUP_PXM = 62;
const VEH = {
  otan_art: { m: 6.1, mount: [.574, .255], gl: .74, an: .172, pv: .06 },
  otan_aa: { m: 4.6, mount: [.593, .232], gl: .36, an: .298 },
  ovd_art: { m: 6.3, mount: [.545, .256], gl: .66, an: .289 },
  ovd_aa: { m: 5.9, mount: [.4013, .2559], gl: .448, piv: [.754, .552], ek: .95 },
};
const bx = (u, tp) => side(u) === 0 ? 1376 - BX[u.lado_id][tp] : BX[u.lado_id][tp];
const GATE = 300;
const vpos = (u, tp, arr) => {
  const x1 = bx(u, tp), sd = side(u) === 0 ? 1 : -1, x0 = sd > 0 ? -420 : 1796, xs = x1 - sd * GATE, Ls = Math.abs(xs - x0), Lc = 1.1 * Math.hypot(GATE, GY - RUA_Y), e = arr * arr * (3 - 2 * arr), d = e * (Ls + Lc);
  if (d <= Ls) return { e: arr, x: x0 + sd * d, y: RUA_Y, k: 1, mv: Math.max(0.15, 1 - Math.abs(e - .5) * 0 ) };
  const t = (d - Ls) / Lc, u1 = 1 - t, c1 = GATE * .6, p1 = xs + sd * c1, p2 = x1 - sd * c1;
  return { e: arr, x: u1 ** 3 * xs + 3 * u1 * u1 * t * p1 + 3 * u1 * t * t * p2 + t ** 3 * x1, y: RUA_Y + (GY - RUA_Y) * (3 * t * t - 2 * t ** 3), k: 1 - .12 * (3 * t * t - 2 * t ** 3), mv: 1 };
};

function mudFx(u, tp, P, arr) {
  const key = (u.lado_id === 1 ? 'otan' : 'ovd') + (tp === 'artilharia' ? '_art' : '_aa'), V = VEH[key], b = sprite(key + '_body'); if (!b.img.naturalWidth) return;
  const w = V.m * SUP_PXM * P.k, h = b.img.naturalHeight * w / b.img.naturalWidth, sd = side(u) === 0 ? 1 : -1, cols = ['#5e4a33', '#3a2d1f', '#6d5a40', '#2f2418'], sp = Math.min(1, Math.sin(Math.PI * arr) * 3);
  for (let i = 0; i < 9; i++) if (Math.random() < sp) parts.push({ x: P.x + (Math.random() - .5) * w * .95, y: P.y - Math.random() * h * .3, vx: -sd * (1 + Math.random() * 3.5), vy: -(1 + Math.random() * 4), g: .3, life: 30 + Math.random() * 22, c: cols[Math.floor(Math.random() * 4)], s: 4 + Math.floor(Math.random() * 6) });
}
const fr = (n) => Math.abs((Math.sin(n * 12.9898) * 43758.5453) % 1);
function drawVeh(u, tp) {
  const p = u.lado_id === 1 ? 'otan' : 'ovd', key = p + (tp === 'artilharia' ? '_art' : '_aa'), want = side(u) === 0 ? 'R' : 'L', dir = want === 'R' ? 1 : -1, V = VEH[key];
  const b = sprite(key + '_body'), gs = sprite(key + '_gun'), v = sv(tp);
  if (!b.img.naturalWidth || !gs.img.naturalWidth) return;
  const w = V.m * SUP_PXM, h = b.img.naturalHeight * w / b.img.naturalWidth, flip = b.facing !== want ? -1 : 1;
  const P = vpos(u, tp, v.arr);
  const mx = flip * (-w / 2 + V.mount[0] * w), my = -h + V.mount[1] * h, gw = V.gl * w, gh = gs.img.naturalHeight * gw / gs.img.naturalWidth;
  const ang = v.elev * (V.ek || (tp === 'artilharia' ? 0.95 : 1.15)), pv = (V.pv || 0) * w;
  g.save(); g.translate(P.x, P.y); g.scale(P.k, P.k);
  g.save(); g.translate(mx - dir * pv, my); g.rotate(-dir * ang); g.translate(-dir * v.rec, 0); g.scale(dir, 1); if (gs.facing === 'L') g.scale(-1, 1);
  g.drawImage(gs.img, V.piv ? -V.piv[0] * gw : pv - V.an * gw, V.piv ? -V.piv[1] * gh : -gh / 2, gw, gh); g.restore();
  g.save(); if (flip < 0) g.scale(-1, 1); g.drawImage(b.img, -w / 2, -h, w, h); g.restore();
  g.restore();
  const L = V.piv ? (gs.facing === 'L' ? V.piv[0] : 1 - V.piv[0]) * gw : (1 - V.an) * gw + pv;
  scene.muz = scene.muz || {}; scene.muz[tp] = { x: P.x + P.k * (mx - dir * pv + dir * Math.cos(ang) * L), y: P.y + P.k * (my - Math.sin(ang) * L) };
}
// ---------- caminhão de suporte ----------
const caminhoBg = new Image(); caminhoBg.src = 'assets/cenas/caminho.png';
// centros/diâmetro das rodas em pixels do sprite original (ajuste aqui se alguma roda ficar torta)
const TRK = { otan: { c: [[332, 488], [614, 488], [1350, 492]], d: 222, behind: true }, ovd: { c: [[356, 512], [648, 512], [1426, 512]], d: 248, behind: false } };
// cena da interceptação: y = chão da rua em caminho.png, w = largura do caminhão, v = velocidade (px/s), mid = meio da rua
const CAM = { y: 615, w: 600, v: 240, mid: 688 }, TRK_BASE_W = 420, TRK_CAMPO_W = 520;
function drawCaminhao(lado, x, y, w, dir, dist = 0) {
  const p = lado === 1 ? 'otan' : 'ovd', T = TRK[p], b = sprite(p + '_caminhao_body'); if (!b.img.naturalWidth) return;
  const k = w / b.img.naturalWidth, h = b.img.naturalHeight * k;
  g.save(); g.translate(x, y); g.scale(dir, 1); g.translate(-w / 2, -h);
  const rodas = () => T.c.forEach(([cx, cy], i) => { const r = sprite(`${p}_caminhao_roda_${i}`); if (!r.img.naturalWidth) return; const d = T.d * k;
    g.save(); g.translate(cx * k, cy * k); g.rotate(dist / (d / 2)); g.drawImage(r.img, -d / 2, -d / 2, d, d); g.restore(); });
  if (T.behind) rodas(); g.drawImage(b.img, 0, 0, w, h); if (!T.behind) rodas();
  g.restore();
}
function drawCaminhaoCampo(u) {
  const s0 = side(u) === 0, dir = s0 ? 1 : -1, w = TRK_CAMPO_W, fr = s0 ? 210 : WORLD_W - 210, y = GROUND + 14;
  drawCaminhao(u.lado_id, fr - dir * w / 2, y, w, dir, 0);
  const vm = C.CAMINHAO.vida, v = u.caminhao.vida, bw = 150, x0 = s0 ? 30 : WORLD_W - 30 - bw, by = y - 215;
  g.fillStyle = '#000a'; g.fillRect(x0 - 2, by - 2, bw + 4, 12); g.fillStyle = '#c9a227'; g.fillRect(x0, by, bw * v / vm, 8);
  g.fillStyle = '#fff'; g.font = 'bold 14px sans-serif'; g.textAlign = s0 ? 'left' : 'right'; g.fillText(`${v}/${vm}`, s0 ? x0 : x0 + bw, by - 6);
}
function drawRua() {
  const S = scene;
  if (caminhoBg.complete && caminhoBg.naturalWidth) g.drawImage(caminhoBg, 0, 0, 1376, 768); else { g.fillStyle = '#222'; g.fillRect(0, 0, 1376, 768); }
  drawCaminhao(S.lado, S.x, CAM.y, CAM.w, S.dir, S.dist);
  if (S.shell) drawShell(S.shell.x, S.shell.y, S.shell.a);
}
const motorAudio = () => { try { const x = new Audio('assets/sons/motor_caminhao.mp3'); x.volume = .8; x.play().catch(() => {}); return x; } catch (e) { return null; } };
const paraAudio = (x) => { if (x) try { x.pause(); } catch (e) {} };
const boomAudio2 = () => { try { const x = new Audio('assets/sons/explosao_artilharia2.mp3'); x.volume = .9; x.play().catch(() => {}); return x; } catch (e) { return null; } };
function drawShell(x, y, a) { g.save(); g.translate(x, y); g.rotate(a); g.fillStyle = '#2b2b2b'; g.fillRect(-6, -22, 12, 34); g.fillStyle = '#6b5a3a'; g.beginPath(); g.moveTo(-6, 12); g.lineTo(6, 12); g.lineTo(0, 30); g.fill(); g.restore(); }
const boomAudio = () => { try { const x = new Audio('assets/sons/explosao_artilharia.mp3'); x.volume = .9; x.play().catch(() => {}); return x; } catch (e) { return null; } };

function drawBase() {
  const u = scene.owner, im = bgs[u.lado_id === 1 ? 'base_otan' : 'base_ovd'];
  if (side(u) === 0) { g.save(); g.translate(1376, 0); g.scale(-1, 1); g.drawImage(im, 0, 0, 1376, 768); g.restore(); } else g.drawImage(im, 0, 0, 1376, 768);
  if (scene.sol) drawSol(scene.sol);
  for (const tp of ['artilharia', 'antiaerea']) if ((LS.tem(u, tp) || scene.keep === tp) && scene.gone !== tp) drawVeh(u, tp);
}
function planeDraw(u, x, y, dir, rot = 0, w = 520) {
  const s = sprite((u.lado_id === 1 ? 'otan' : 'ovd') + '_aviao'); if (!s.img.naturalWidth) return;
  const sc = w / s.img.naturalWidth, h = s.img.naturalHeight * sc;
  g.save(); g.translate(x, y); g.rotate(rot * dir); if (s.facing !== (dir > 0 ? 'R' : 'L')) g.scale(-1, 1); g.drawImage(s.img, -w / 2, -h / 2, w, h); g.restore();
}
function drawSky() {
  const S = scene; S.off = (S.off || 0) + S.dir * 14; const W = 1376, P = 2 * W, o = ((S.off % P) + P) % P;
  for (let i = 0; i < 3; i++) { g.save(); const x = i * W - o; if (i % 2) { g.translate(x + W, 0); g.scale(-1, 1); } else g.translate(x, 0); g.drawImage(bgs.ceu, 0, 0, W, 768); g.restore(); }
  planeDraw(S.plane, S.px, S.py, S.dir, S.rot);
  if (S.dano || S.py > 340) boom(S.px - S.dir * 220, S.py, 2, ['#333', '#777', '#ff8a1f'], 2);
}
const bombDraw = (u, x, y) => { const s = sprite((u.lado_id === 1 ? 'otan' : 'ovd') + '_bomba'); if (!s.img.naturalWidth) return; const w = 150, h = s.img.naturalHeight * w / s.img.naturalWidth; g.save(); g.translate(x, y); g.rotate(Math.PI / 2 * (s.facing === 'R' ? 1 : -1)); g.drawImage(s.img, -w / 2, -h / 2, w, h); g.restore(); };
const FOGO = ['#ffe27a', '#ff8a1f', '#aaa', '#555'];
async function atirar(tp, n = 1) { for (let i = 0; i < n; i++) { const v = sv(tp), m = scene.muz && scene.muz[tp]; if (m) boom(m.x, m.y, 16, FOGO, 5); shake = 7; await anim(180, p => v.rec = 22 * (1 - p)); } }
const somMotor = (u) => new Promise(res => {
  let ok = false; const fim = () => { if (!ok) { ok = true; res(); } };
  try { const x = new Audio(`assets/sons/motor_${u.lado_id === 1 ? 'otan' : 'ovd'}_${u.tanque_classe}.mp3`); x.volume = .9; x.onended = fim; x.onerror = fim; x.play().catch(fim); } catch (e) { fim(); }
  setTimeout(fim, 20000);
});
const somFim = (url) => new Promise(res => {
  let ok = false; const fim = () => { if (!ok) { ok = true; res(); } };
  try { const x = new Audio(url); x.volume = .9; x.onended = fim; x.onerror = fim; x.play().catch(fim); } catch (e) { fim(); }
  setTimeout(fim, 20000);
});
const AB = { otan: { total: 6000, hit: 3000 }, ovd: { total: 6000, hit: 3000 } };
function afGeo(u) {
  const k = (u.lado_id === 1 ? 'otan' : 'ovd') + '_aviao_solo', s = sprite(k), d = side(u) === 0 ? 1 : -1, w = AFW[u.lado_id], h = s.img && s.img.naturalWidth ? w * s.img.naturalHeight / s.img.naturalWidth : w * .33;
  const cx = d > 0 ? AFX : 1376 - AFX, top = AFY[u.lado_id] - h * PFOOT[u.lado_id], b = AF_BICO[u.lado_id];
  const frac = s.facing !== (d > 0 ? 'R' : 'L') ? 1 - b[0] : b[0];
  return { s, d, w, h, cx, top, u: u.lado_id, ex: cx + (frac - .5) * w, ey: top + b[1] * h };
}
function afterburner(G, pot) {
  const r = Math.random, ab = Math.min(1, pot * 7), L = (60 + 250 * pot) * ab * (.92 + r() * .08), w = G.h * .11 * (.85 + .3 * pot) * ab;
  if (L < 4) return;
  g.save(); g.globalCompositeOperation = 'lighter'; g.translate(G.ex, G.ey); g.scale(-G.d, 1);
  let gr = g.createRadialGradient(0, 0, 0, 0, 0, w * 4); gr.addColorStop(0, `rgba(255,170,70,${.5 * ab})`); gr.addColorStop(1, 'rgba(255,90,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(0, 0, w * 4, 0, 7); g.fill();
  const cone = (len, hw, c0, c1, c2) => {
    const k = g.createLinearGradient(0, 0, len, 0); k.addColorStop(0, c0); k.addColorStop(.45, c1); k.addColorStop(1, c2); g.fillStyle = k;
    g.beginPath(); g.moveTo(0, -hw); g.quadraticCurveTo(len * .55, -hw * (1.05 + r() * .1), len, (r() - .5) * hw * .3); g.quadraticCurveTo(len * .55, hw * (1.05 + r() * .1), 0, hw); g.closePath(); g.fill();
  };
  cone(L, w, 'rgba(255,225,150,.95)', 'rgba(255,120,30,.6)', 'rgba(190,40,10,0)');
  cone(L * .62, w * .62, 'rgba(255,255,235,.95)', 'rgba(255,205,110,.55)', 'rgba(255,150,40,0)');
  cone(L * .3, w * .3, 'rgba(255,255,255,1)', 'rgba(255,245,200,.6)', 'rgba(255,230,160,0)');
  for (let i = 1; i <= 5; i++) { const x = L * (.1 + .15 * i), hh = w * (.5 - i * .07); if (hh <= 0 || x > L * .95) break; g.fillStyle = `rgba(255,250,225,${(.55 - i * .07) * (.7 + r() * .3)})`; g.beginPath(); g.ellipse(x, 0, w * .32, hh, 0, 0, 7); g.fill(); }
  gr = g.createRadialGradient(L * .5, AFY[G.u] - G.ey, 0, L * .5, AFY[G.u] - G.ey, L * .8); gr.addColorStop(0, `rgba(255,140,50,${.28 * pot})`); gr.addColorStop(1, 'rgba(255,100,30,0)'); g.fillStyle = gr; g.fillRect(-20, -w * 3, L * 1.4, AFY[G.u] - G.ey + w * 4);
  g.restore();
}
function drawAirfield() {
  const u = scene.owner, im = afImg[u.lado_id], G = afGeo(u);
  if (im.complete) { g.save(); if (G.d < 0) { g.translate(1376, 0); g.scale(-1, 1); } g.drawImage(im, 0, 0, 1376, 768); g.restore(); }
  if (!G.s.img || !G.s.img.naturalWidth) return;
  const j = (scene.pot || 0) * 1.6;
  if (u.lado_id === 2 && scene.pot > 0) afterburner(G, scene.pot);
  g.save(); g.translate(G.cx + (Math.random() - .5) * j, G.top + (Math.random() - .5) * j * .6);
  if (G.s.facing !== (G.d > 0 ? 'R' : 'L')) g.scale(-1, 1);
  g.drawImage(G.s.img, -G.w / 2, 0, G.w, G.h); g.restore();
}
async function decolaAirfield(u) {
  await to('airfield', { owner: u, pot: 0 });
  const S = scene, G = afGeo(u), r = Math.random, lado = u.lado_id === 1 ? 'otan' : 'ovd';
  try { const x = new Audio(`assets/sons/aviao_decola_${lado}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  const ACC = AF_ACC[u.lado_id], t0 = performance.now(); let n = 0, ign = false;
  for (;;) {
    const t = performance.now() - t0; if (t >= 8000) break; n++;
    if (t >= ACC && !ign) { ign = true; if (u.lado_id === 2) { flashes.push({ t: 'f', x: G.ex, y: G.ey, r: 120, t0: performance.now(), d: 260 }); shake = Math.max(shake, 5); } }
    const pot = t < ACC ? 0 : Math.min(1, (t - ACC) / (8000 - ACC)); S.pot = pot;
    fade = t < 6000 ? 0 : (t - 6000) / 2000;
    const q = pot > 0 ? 1 + Math.floor(pot * 2.5) : (n % 3 === 0 ? 1 : 0);
    for (let k = 0; k < q; k++) parts.push({ x: G.ex, y: G.ey + (r() - .5) * 12, vx: -G.d * (pot > 0 ? 4 + pot * 11 + r() * 3 : .8 + r()), vy: pot > 0 ? (r() - .5) * 1.2 * (1 - pot * .75) : -(.2 + r() * .5), life: pot > 0 ? 28 + r() * 20 : 22 + r() * 12, c: ['#cfcfcf', '#a9a9a9', '#8a8a8a'][Math.floor(r() * 3)], s: pot > 0 ? 4 + r() * (4 + pot * 10) : 3 + r() * 2 });
    if (pot > 0) shake = Math.max(shake, pot * 6);
    if (pot > .15 && n % 2 === 0) parts.push({ x: G.ex - G.d * 20, y: AFY[u.lado_id] - 2, vx: -G.d * (3 + pot * 8 + r() * 3), vy: -r() * 1.2, life: 20 + r() * 14, c: '#7f8a90', s: 3 + r() * 4 });
    if (pot > .4 && n % 3 === 0) flashes.push({ t: 'f', x: G.ex, y: G.ey, r: 14 + pot * 26, t0: performance.now(), d: 90 });
    await new Promise(requestAnimationFrame);
  }
  fade = 1; scene = { name: 'campo' }; await anim(300, q => fade = 1 - q);
}
const corrOtan = new Image(); corrOtan.src = 'assets/intro/correndo_otan.png';
const corrOvd = new Image(); corrOvd.src = 'assets/intro/correndo_ovd.png';
function drawSol(o) {
  const im = o.im; if (!im.naturalWidth) return;
  const fw = im.naturalWidth / 6, h = 112, w = fw * h / im.naturalHeight;
  g.save(); g.globalAlpha = o.a; g.translate(o.x, GY + 4); if (o.d < 0) g.scale(-1, 1);
  g.drawImage(im, o.f * fw, 0, fw, im.naturalHeight, -w / 2, -h, w, h); g.restore();
}
const TIROAA = {
  1: { snd: 'vads_tiro', im: corrOtan, key: 'otan_aa', cont: true, T: { run: 4520, dentro: 8590, fogo: 11110, fim_fogo: 13470, fim: 14290 } },
  2: { snd: 'shilka_tiro', im: corrOvd, key: 'ovd_aa', cont: false, T: { run: 1880, dentro: 6690, fogo: 10570, fim_fogo: 12950, fim: 16510 } }
};
async function vadsTiro(u, v) {
  const cfg = TIROAA[u.lado_id], T = cfg.T, V = VEH[cfg.key], S = scene, d = side(u) === 0 ? 1 : -1, w = V.m * SUP_PXM, r = Math.random;
  const xv = bx(u, 'antiaerea'), xe = xv - d * (w * .5 - 70), x0 = d > 0 ? -90 : 1466, ek = V.ek || 1.15;
  try { const x = new Audio(`assets/sons/${cfg.snd}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  const t0 = performance.now(); let ult = 0;
  for (;;) {
    const t = performance.now() - t0; if (t >= T.fim) break;
    if (t >= T.run && t < T.dentro) { const q = (t - T.run) / (T.dentro - T.run); S.sol = { x: x0 + (xe - x0) * q, f: Math.floor(t / 90) % 6, d, im: cfg.im, a: q > .92 ? (1 - q) / .08 : 1 }; } else S.sol = null;
    const q = t < T.dentro ? 0 : Math.min(1, (t - T.dentro) / (T.fogo - T.dentro)); v.elev = q * q * (3 - 2 * q);
    const m = S.muz && S.muz.antiaerea, ang = v.elev * ek, ax = d * Math.cos(ang), ay = -Math.sin(ang), now = performance.now();
    if (t >= T.fogo && t < T.fim_fogo && m) {
      if (cfg.cont) {
        flashes.push({ t: 'f', x: m.x, y: m.y, r: 55 + r() * 35, t0: now, d: 60 });
        for (let k = 0; k < 5; k++) { const a = ang + (r() - .5) * .05, sp = 38 + r() * 10; parts.push({ x: m.x + ax * k * 14, y: m.y + ay * k * 14, vx: d * Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: 38, c: k % 2 ? '#ffe9a0' : '#ff9d3a', s: 3 }); }
        for (let k = 0; k < 2; k++) parts.push({ x: m.x - ax * 70, y: m.y - ay * 70 + 10, vx: -d * (2 + r() * 4), vy: -(1 + r() * 3), g: .6, life: 40, c: '#c9a227', s: 3 });
        parts.push({ x: m.x + ax * 20, y: m.y + ay * 20, vx: ax * (1 + r() * 2), vy: ay * (1 + r() * 2) - .3, g: -.03, life: 30 + r() * 20, c: '#8a8a8a', s: 6 + r() * 6 });
        v.rec = r() * 2.2; shake = Math.max(shake, 5 + r() * 3);
      } else if (t - ult >= 48) {
        ult = t; const k = V.gl * w / 887, nx = -d * Math.sin(ang), ny = -Math.cos(ang);
        for (const [back, off] of [[200, 42], [160, -19]]) for (const e of [-3, 3]) {
          const px = m.x - ax * back * k + nx * (off + e) * k, py = m.y - ay * back * k + ny * (off + e) * k;
          flashes.push({ t: 'f', x: px, y: py, r: 22 + r() * 14, t0: now, d: 45 });
          const a = ang + (r() - .5) * .04, sp = 36 + r() * 8; parts.push({ x: px, y: py, vx: d * Math.cos(a) * sp, vy: -Math.sin(a) * sp, life: 36, c: r() < .5 ? '#ffe9a0' : '#ff9d3a', s: 3 });
        }
        parts.push({ x: m.x - ax * 120 * k, y: m.y - ay * 120 * k + 8, vx: -d * (1.5 + r() * 3), vy: -(1 + r() * 2.5), g: .6, life: 36, c: '#c9a227', s: 3 });
        if (r() < .5) parts.push({ x: m.x - ax * 160 * k, y: m.y - ay * 160 * k, vx: ax * (1 + r()), vy: ay * (1 + r()) - .3, g: -.03, life: 28 + r() * 16, c: '#8a8a8a', s: 5 + r() * 5 });
        v.rec = 1.2 + r() * 1.8; shake = Math.max(shake, 2.5 + r() * 1.5);
      } else v.rec *= .6;
    } else v.rec = 0;
    await new Promise(requestAnimationFrame);
  }
  S.sol = null; v.rec = 0;
}
const ARTF = { otan: { snd: true, ms: 13000, sobe: 3000, subir: 4000, tiro: 8400 }, ovd: { snd: true, ms: 13000, sobe: 3780, subir: 3600, tiro: 7970 } }, ARTF_DEF = { ms: 1900, sobe: 0, subir: 700, tiro: 900 };
function artBlast(u, v) {
  const F = TIRO_FX.pesado, m = scene.muz && scene.muz.artilharia; if (!m) return;
  const dir = side(u) === 0 ? 1 : -1, now = performance.now(), ang = v.elev * .95, dx = dir * Math.cos(ang), dy = -Math.sin(ang), r = Math.random, bxx = bx(u, 'artilharia');
  flashes.push({ t: 'f', x: m.x, y: m.y, r: F.r, t0: now, d: 130 });
  flashes.push({ t: 'f', x: m.x + dx * F.r * .5, y: m.y + dy * F.r * .5, r: F.r * .6, t0: now, d: 90 });
  for (let i = 1; i <= F.ring; i++) flashes.push({ t: 'r', x: m.x, y: m.y, r: F.r * (1.2 + i * .6), t0: now + i * 70, d: 320, dir });
  if (F.tela) flashes.push({ t: 's', a: F.tela, t0: now, d: 160 });
  for (let i = 0; i < F.fag; i++) { const sp = 10 + r() * 18; parts.push({ x: m.x, y: m.y, vx: dx * sp * (.5 + r()) + (r() - .5) * 3, vy: dy * sp * (.5 + r()) + (r() - .5) * 5, life: 14 + r() * 14, c: i % 3 ? '#ffd23f' : '#fff3b0', s: 3 + r() * 3 }); }
  for (let i = 0; i < F.fum; i++) parts.push({ x: m.x + dx * r() * 40, y: m.y + dy * r() * 40, vx: dx * (2 + r() * 7), vy: dy * (2 + r() * 7) - r() * 1.5, g: -.04, life: 30 + r() * 30, c: i % 2 ? '#8a8a8a' : '#4a4a4a', s: 8 + r() * (6 + F.r / 14) });
  for (let i = 0; i < F.po; i++) parts.push({ x: bxx + (r() - .5) * 220, y: GY - 4, vx: (r() - .5) * 9, vy: -r() * 3.5, g: -.02, life: 26 + r() * 24, c: '#7a6a52', s: 7 + r() * 9 });
  shake = Math.max(shake, F.shk); anim(260, p => v.rec = F.rec * (1 - p) * (1 - p));
}
const SUP = { otan_antiaerea: { snd: true, ms: 12000, park: 10000 }, otan_artilharia: { snd: true, ms: 12000, park: 9000 }, ovd_artilharia: { snd: true, ms: 15000, park: 12000, skip: 3000 }, ovd_antiaerea: { snd: true, ms: 12000, park: 10000, skip: 2000 } };
const SCN = {
  async caminhao_chamado({ u }) {
    const dir = side(u) === 0 ? 1 : -1, W = TRK_BASE_W, x0 = dir > 0 ? -W : 1376 + W, x1 = dir > 0 ? 1376 + W : -W; let x = x0, dist = 0;
    await to('base', { owner: u, v: {} });
    ov = () => drawCaminhao(u.lado_id, x, RUA_Y, W, dir, dist); const mot = motorAudio();
    await anim(5500, p => { x = x0 + (x1 - x0) * p; dist = Math.abs(x - x0); });
    paraAudio(mot); ov = null; await to('campo');
  },
  async caminhao_chega({ u }) {
    await anim(450, p => fade = p); u._cx = cxAlvo(u); await nap(500); await anim(450, p => fade = 1 - p);
  },
  async caminhao_destruido({ u, motivo }) {
    if (motivo === 'interceptado') return;
    await pan(u); const x = side(u) === 0 ? 120 : WORLD_W - 120;
    boom(x, GROUND - 60, 60, FOGO, 7); shake = Math.max(shake, 12); await sleep(fast ? 0 : 700);
  },
  async caminhao_interceptado({ alvo }) {
    const dir = side(alvo) === 0 ? 1 : -1, W = CAM.w, xs = dir > 0 ? -W / 2 - 40 : 1376 + W / 2 + 40, TF = 1300, tSh = Math.abs(CAM.mid - xs) / CAM.v * 1000 - TF, yI = CAM.y - 90;
    await to('rua', { lado: alvo.lado_id, dir, x: xs, dist: 0, shell: null }); const S = scene, t0 = performance.now(), r = Math.random, mot = motorAudio();
    for (;;) {
      const t = performance.now() - t0, d = CAM.v * t / 1000; S.x = xs + dir * d; S.dist = d;
      if (t >= tSh) {
        const q = Math.min(1, (t - tSh) / TF); S.shell = { x: CAM.mid - dir * 70 * (1 - q), y: -50 + (yI + 50) * q * q, a: dir * .12 * (1 - q) };
        parts.push({ x: S.shell.x, y: S.shell.y - 20, vx: (r() - .5), vy: -.5, life: 16, c: '#999', s: 4 });
        fade = q > .72 ? Math.min(1, (q - .72) / .26) : 0;
        if (q >= 1) break;
      }
      await new Promise(requestAnimationFrame);
    }
    fade = 1; parts.length = 0; S.shell = null; paraAudio(mot); boomAudio(); await sleep(fast ? 800 : 4200);
    scene = { name: 'campo' }; await anim(500, p => fade = 1 - p);
  },
  async tanque_chega({ u }) {
    u._troca = true; const som = somMotor(u); await anim(450, p => fade = p); u._troca = false; await Promise.all([som, nap(400)]); await anim(450, p => fade = 1 - p);
  },
  async suporte_compra({ u, tipo }) {
    const lado = u.lado_id === 1 ? 'otan' : 'ovd', cfg = SUP[`${lado}_${tipo}`] || {}, sc = cfg.snd ? 1 : K(), park = (cfg.park || 4600) * sc, fim = (cfg.ms || 5500) * sc;
    await to('base', { owner: u, v: { [tipo]: { elev: 0, rec: 0, arr: 0 } } });
    const v = sv(tipo);
    const sk = cfg.skip || 0;
    if (cfg.snd) try { const x = new Audio(`assets/sons/chegada_${lado}_${tipo}.mp3`); x.volume = .9; if (sk) x.addEventListener('loadedmetadata', () => { x.currentTime = sk / 1000; }, { once: true }); x.play().catch(() => {}); } catch (e) {}
    const t0 = performance.now() - sk; let paro = false;
    for (;;) {
      const t = performance.now() - t0; if (t >= fim) break;
      v.arr = Math.min(1, t / park); const P = vpos(u, tipo, v.arr);
      if (v.arr < 1) mudFx(u, tipo, P, v.arr);
      else if (!paro) { paro = true; boom(P.x, P.y - 6, 22, ['#5e4a33', '#6d5a40', '#8a7a60'], 3); shake = Math.max(shake, 4); }
      await new Promise(requestAnimationFrame);
    }
    await to('campo');
  },
  async artilharia_fogo({ u }) {
    const lado = u.lado_id === 1 ? 'otan' : 'ovd', cfg = ARTF[lado], c = cfg || ARTF_DEF, sc = cfg ? 1 : K();
    await to('base', { owner: u, v: {} }); const v = sv('artilharia');
    let au = null; if (cfg) try { au = new Audio(`assets/sons/tiro_${lado}_artilharia.mp3`); au.volume = .9; au.play().catch(() => {}); } catch (e) {}
    const t0 = performance.now(); let fogo = false;
    for (;;) {
      const t = performance.now() - t0; if (t >= c.ms * sc) break;
      const q = Math.min(1, Math.max(0, (t - c.sobe * sc) / (c.subir * sc))); v.elev = q * q * (3 - 2 * q);
      if (!fogo && t >= c.tiro * sc) { fogo = true; artBlast(u, v); }
      await new Promise(requestAnimationFrame);
    }
    if (au) au.pause();
    await to('campo');
  },
  async interceptacao({ aviao_de, antiaerea_de }) {
    await to('base', { owner: antiaerea_de, v: {} }); const v = sv('antiaerea');
    await vadsTiro(antiaerea_de, v);
    const dir = aviao_de === player ? 1 : -1, lado = aviao_de.lado_id === 1 ? 'otan' : 'ovd', T = AB[lado], r = Math.random;
    await to('ceu', { plane: aviao_de, dir, off: 0, px: 688, py: 300, rot: 0 }); const S = scene;
    try { const x = new Audio(`assets/sons/aviao_abatido_ovd.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
    const FIRE = ['#ff8a1f', '#ffd23f', '#d6370f', '#333'], t0 = performance.now(); let hit = false, c1 = false, c2 = false, crash = false, n = 0;
    for (;;) {
      const t = performance.now() - t0; if (t >= T.total) break; n++;
      if (t < T.hit) {
        S.px = 688 + Math.sin(t / 400) * 14; S.py = 300 + Math.sin(t / 260) * 8; S.rot = Math.sin(t / 500) * .03;
        if (t > T.hit - 1300 && n % 2) { const x = 200 + r() * 976; parts.push({ x, y: 768, vx: (S.px - x) / 18, vy: -26, life: 24, c: '#ffe27a', s: 4 }); }
        if (t > T.hit - 800 && r() < .3) boom(S.px + (r() - .5) * 280, S.py + (r() - .5) * 120, 7, ['#222', '#555', '#ffd23f'], 3);
      } else {
        if (!hit) { hit = true; S.dano = true; boom(S.px, S.py, 100, FIRE, 9); flashes.push({ t: 's', a: .75, t0: performance.now(), d: 240 }); shake = 22; }
        const p = (t - T.hit) / (T.total - T.hit);
        S.px = 688 + dir * p * 330 + Math.sin(t / 90) * 5; S.py = 300 + p * p * 700; S.rot = p * 1.5 + Math.sin(t / 120) * .06;
        for (let k = 0; k < 3; k++) parts.push({ x: S.px - dir * (120 + r() * 110), y: S.py + (r() - .5) * 40, vx: -dir * (2 + r() * 3), vy: -r() * 2, g: -.05, life: 26 + r() * 22, c: FIRE[Math.floor(r() * 4)], s: 6 + r() * 9 });
        if (p > .25 && !c1) { c1 = true; boom(S.px - dir * 90, S.py, 50, FIRE, 7); shake = Math.max(shake, 14); }
        if (p > .55 && !c2) { c2 = true; boom(S.px, S.py, 60, FIRE, 8); shake = Math.max(shake, 16); }
        if (p > .86 && !crash) { crash = true; boom(S.px, 768, 140, FIRE, 11); flashes.push({ t: 's', a: .6, t0: performance.now(), d: 300 }); shake = 28; }
      }
      await new Promise(requestAnimationFrame);
    }
    await to('campo');
  },
  aviao_decola: ({ u }) => decolaAirfield(u),
  async artilharia_impacto({ alvo }) {
    await pan(alvo); const X0 = pos(alvo).x;
    for (let i = 0; i < 3; i++) { const x = X0 + (i - 1) * 45; await anim(260, p => ov = () => drawShell(x, -40 + p * (GROUND - 170), 0)); ov = null; if (!i) boomAudio2(); boom(x, GROUND - 110, 30, FOGO, 6); shake = 9; }
  },
  async bombardeio({ u, alvo_tipo, op, dano, existe }) {
    const frente = alvo_tipo === 'frente', p = player, dir = u === player ? 1 : -1, r = Math.random, t0 = performance.now();
    try { const x = new Audio('assets/sons/bomba.mp3'); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
    if (p) p._semDub = false;
    if (frente) await pan(op); else await to('base', { owner: op, v: {} });
    const S = scene, tx = frente ? pos(op).x : bx(op, alvo_tipo), ty = frente ? GROUND - 110 : GY - 90, FIRE = ['#ff8a1f', '#ffd23f', '#d6370f', '#333'];
    const bs = sprite((u.lado_id === 1 ? 'otan' : 'ovd') + '_bomba'), BW = 170, REL = 4240, HIT = 5300, OUT = 8300, FIM = 9300, D = 1000, H0 = -80;
    const desenha = (x, y, ang) => { if (!bs.img.naturalWidth) return; const h = bs.img.naturalHeight * BW / bs.img.naturalWidth; g.save(); g.translate(x, y); if (dir < 0) g.scale(-1, 1); g.rotate(ang); if (bs.facing !== 'R') g.scale(-1, 1); g.drawImage(bs.img, -BW / 2, -h / 2, BW, h); g.restore(); };
    let falou = false, gone = false;
    for (;;) {
      const t = performance.now() - t0; if (t >= FIM) break;
      if (t >= REL && t < HIT) {
        const q = (t - REL) / (HIT - REL), x = tx - dir * D * (1 - q), y = H0 + (ty - H0) * q * q, ang = Math.atan2(2 * (ty - H0) * q, D);
        ov = () => desenha(x, y, ang);
        parts.push({ x: x - dir * 50, y: y - 4, vx: -dir * 2, vy: -1, life: 14, c: '#9a9a9a', s: 4 });
      } else ov = null;
      fade = t < REL ? 0 : t < HIT ? (t - REL) / (HIT - REL) : t < OUT ? 1 : 1 - (t - OUT) / (FIM - OUT);
      if (t >= OUT - 400 && !gone) for (let k = 0; k < 2; k++) parts.push({ x: tx + (r() - .5) * 140, y: ty + (r() - .3) * 70, vx: (r() - .5) * 2, vy: -1 - r() * 2.5, g: -.04, life: 26 + r() * 24, c: FIRE[Math.floor(r() * 4)], s: 5 + r() * 9 });
      if (t >= OUT && !falou) { falou = true; if (frente && p && p.tanque_ativo && crew && op === p) { p._semDub = true; dubDano(p, dano); } }
      if (!frente && existe && t >= OUT + 500 && !gone) { gone = true; S.gone = alvo_tipo; }
      await new Promise(requestAnimationFrame);
    }
    ov = null; fade = 0;
    if (!frente) await to('campo');
  },
};
Luft.estado = () => ({ player, enemy });

let hcache = ['', ''], pend = null, pendFim = null;
const pct = (a, b) => Math.max(0, Math.min(100, b > 0 ? a / b * 100 : 0));
const HEART = ['.XX.XX.', 'XXXXXXX', 'XXXXXXX', '.XXXXX.', '..XXX..', '...X...'];
const heartSvg = `<svg viewBox="0 0 7 6" width="28" height="24" shape-rendering="crispEdges">${HEART.map((r, y) => [...r].map((c, x) => c === 'X' ? `<rect x="${x}" y="${y}" width="1" height="1" fill="${x === 1 && y === 1 ? '#ff9aa6' : y === 5 || x === 0 || x === 6 ? '#a3212f' : '#e0364a'}"/>` : '').join('')).join('')}</svg>`;
const TANK_IMG = { leve: 'tanque_leve', medio: 'tanque_medio', pesado: 'tanque_pesado' };
const canBuy = (c) => !!(pend && pend.some((i) => i.chave === c));
const slot = (img, on, tip, buy, cost, nome) => `<div class="sl"><div class="slot${on ? ' on' : ''}${buy ? ' buy' : ''}"${buy ? ` data-buy="${buy}"` : ''} title="${tip}">${img}${!on && cost != null ? `<small>🪙${cost}</small>` : ''}</div><span class="sn${on ? ' on' : ''}">${nome}</span></div>`;
function hud() {
  [player, enemy].forEach((u, k) => {
    if (!u) return;
    const meu = k === 0, lado = u.lado_id === 1 ? 'otan' : 'ovd', pc = pct(u.vida_atual, u.vida_maxima), ex = [];
    let h = `<img class="flag" src="assets/cenas/flag_${lado}.png" alt="${lado.toUpperCase()}" onerror="var e=this.dataset.e|0,x=['.png','.jpg','.webp','.jpeg'];if(e<3){this.dataset.e=e+1;this.src='assets/cenas/flag_${lado}'+x[e+1]}else this.style.display='none'">`;
    let tk = '<div class="bico"></div><div class="vbar none"></div><small>&nbsp;</small>';
    if (u.tanque_ativo) {
      const tc = C.TANQUES[u.lado_id][u.tanque_classe], tp = pct(u.tanque_vida, tc.vida);
      tk = `<div class="bico"><img src="assets/ui/${TANK_IMG[u.tanque_classe]}.png" title="${esc(U.nome_tanque(u.lado_id, u.tanque_classe))}"></div><div class="vbar t"><i style="height:${tp}%;background:hsl(${Math.round(tp * 1.2)},65%,45%)"></i></div><small>${Math.max(0, u.tanque_vida)}</small>`;
      ex.push(u.tanque_municao ? `<span class="chip" title="Canhão">${u.tanque_municao === 'perfurante' ? '🔩 AP' : '💣 HE'} ${u.tanque_recarga > 0 ? '⏳' + u.tanque_recarga : '✔'}</span>` : '<span class="chip off" title="Canhão vazio">🚫</span>');
    }
    h += `<div class="bars"><div class="bcol"><div class="bico">${heartSvg}</div><div class="vbar"><i style="height:${pc}%;background:hsl(${Math.round(pc * 1.2)},65%,45%)"></i></div><small>${Math.max(0, u.vida_atual)}</small></div><div class="bcol">${tk}</div></div>`;
    h += `<div class="pts" title="Pontos">🪙 ${u.pontos}</div>`;
    const art = LS.tem(u, 'artilharia'), aa = LS.tem(u, 'antiaerea'), ca = C.LINHA_SUPORTE.artilharia.custo_compra, ci = C.LINHA_SUPORTE.antiaerea.custo_compra;
    h += `<div class="sup">${slot('<img src="assets/ui/artilharia.png">', art, art ? 'Artilharia' : `Comprar artilharia (${ca} pts)`, meu && !art && canBuy('comprar_artilharia') ? 'comprar_artilharia' : '', ca, 'Artilharia')}${slot('<img src="assets/ui/antiaerea.png">', aa, aa ? 'Antiaérea' : `Comprar antiaérea (${ci} pts)`, meu && !aa && canBuy('comprar_antiaerea') ? 'comprar_antiaerea' : '', ci, 'Antiaérea')}</div>`;
    const cm = u.caminhao;
    h += cm ? `<div class="cam on">🚛 ${cm.estado === 'ativo' ? `Caminhão ativo<em class="mini w"><i style="width:${pct(cm.vida, C.CAMINHAO.vida)}%"></i></em>` : `Caminhão a caminho<br>${cm.chegada} round${cm.chegada === 1 ? '' : 's'} para a chegada`}</div>`
      : `<div class="cam${meu && canBuy('chamar_caminhao') ? ' buy' : ''}"${meu && canBuy('chamar_caminhao') ? ' data-buy="chamar_caminhao"' : ''} title="Chamar caminhão">🚛<small>${meu ? 'Chamar' : ''}</small></div>`;
    if (C.SUPORTE_AEREO_ATIVO) ex.push(`<span class="chip${LS.aviao_disponivel(u) ? '' : ' off'}" title="Suporte aéreo">✈️${LS.aviao_a_caminho(u) ? '➜' : ''}</span>`);
    if (u.molotov_restante > 0) ex.push(`<span class="chip hot" title="Em chamas">🔥${u.molotov_restante}</span>`);
    if (u.arma_no_chao) ex.push('<span class="chip hot" title="Arma AT no chão">🚀⬇</span>');
    h += `<div class="chips">${ex.join('')}</div>`;
    if (h !== hcache[k]) { hcache[k] = h; $('#h' + k).innerHTML = h; }
  });

  const cb = $('#comb'), p = player;
  if (cb) {
    if (p && p.tanque_ativo) {
      const tc = C.TANQUES[p.lado_id][p.tanque_classe], f = pct(p.tanque_combustivel, tc.combustivel_rodadas);
      cb.style.display = 'flex'; cb.querySelector('i').style.width = f + '%'; cb.querySelector('i').style.background = f <= 25 ? '#d6370f' : '#c9a227';
      cb.querySelector('span').textContent = `${Math.max(0, p.tanque_combustivel)}/${tc.combustivel_rodadas}`;
    } else cb.style.display = 'none';
  }
}
$('#h0').addEventListener('click', (e) => { const b = e.target.closest('[data-buy]'); if (!b || !pend) return; const it = pend.find((i) => i.chave === b.dataset.buy); if (it) pendFim(it); });

const logEl = $('#log');
const addLog = (t, cls = '') => { for (const l of String(t).split('\n')) if (l.trim()) { const p = document.createElement('p'); p.className = cls; p.textContent = l; logEl.appendChild(p); } logEl.scrollTop = 1e9; };

HOOK.say = (t) => addLog(t);
HOOK.wait = (s) => sleep(fast ? 0 : s * 650);
HOOK.limparTela = () => { logEl.innerHTML = ''; };
HOOK.resumo = (n, ls) => { addLog(`--- O que aconteceu na rodada ${n} ---`, 'h'); ls.forEach(l => addLog(l)); addLog('-'.repeat(30), 'h'); };
HOOK.status = (j, i, t) => { $('#turno').textContent = 'Turno ' + t; };
HOOK.turnoFim = (j, i, t) => Luft.api.status(t, j, i);
HOOK.danoPersistente = (u, rounds, tipo) => Luft.api.danoPersistente(u.lado_id, rounds, tipo);
HOOK.itemUsado = (u, chave) => Luft.api.itemUsado(u.lado_id, chave);
const pop = (u, t, c) => { const p = pos(u); floats.push({ x: p.x, y: p.y - (u.tanque_ativo ? 230 : SOL_H + 45), t, c, life: 60 }); };
const setPose = (u, k, ms = 700) => { u._pose = k; setTimeout(() => { if (u._pose === k) u._pose = null; }, ms); };
const flashes = [];
const TIRO_FX = {
  leve: { r: 80, fum: 12, fag: 16, shk: 11, rec: 30, ring: 0, po: 0, tela: 0 },
  medio: { r: 120, fum: 22, fag: 28, shk: 18, rec: 40, ring: 1, po: 10, tela: 0 },
  pesado: { r: 175, fum: 36, fag: 46, shk: 28, rec: 54, ring: 2, po: 22, tela: 0.35 }
};
const somTiro = (u) => { try { const x = new Audio(`assets/sons/tiro_${u.lado_id === 1 ? 'otan' : 'ovd'}_${u.tanque_classe}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {} };
function tankBlast(a, d) {
  somTiro(a);
  const A = pos(a), D = pos(d), dir = D.x > A.x ? 1 : -1, m = a._muz || { x: A.x + dir * 45, y: A.y - 60 }, F = TIRO_FX[a.tanque_classe] || TIRO_FX.leve, now = performance.now();
  flashes.push({ t: 'f', x: m.x, y: m.y, r: F.r, t0: now, d: 130 });
  flashes.push({ t: 'f', x: m.x + dir * F.r * .5, y: m.y, r: F.r * .6, t0: now, d: 90 });
  for (let i = 1; i <= F.ring; i++) flashes.push({ t: 'r', x: m.x, y: m.y, r: F.r * (1.2 + i * .6), t0: now + i * 70, d: 320, dir });
  if (F.tela) flashes.push({ t: 's', a: F.tela, t0: now, d: 160 });
  for (let i = 0; i < F.fag; i++) { const sp = 10 + Math.random() * 18; parts.push({ x: m.x, y: m.y, vx: dir * sp * (.5 + Math.random()), vy: (Math.random() - .5) * 5, life: 14 + Math.random() * 14, c: i % 3 ? '#ffd23f' : '#fff3b0', s: 3 + Math.random() * 3 }); }
  for (let i = 0; i < F.fum; i++) parts.push({ x: m.x + dir * Math.random() * 40, y: m.y + (Math.random() - .5) * 20, vx: dir * (2 + Math.random() * 7), vy: -Math.random() * 2.5, g: -0.04, life: 30 + Math.random() * 30, c: i % 2 ? '#8a8a8a' : '#4a4a4a', s: 8 + Math.random() * (6 + F.r / 14) });
  for (let i = 0; i < F.po; i++) parts.push({ x: A.x + (Math.random() - .5) * 220, y: A.y - 4, vx: (Math.random() - .5) * 9, vy: -Math.random() * 3.5, g: -0.02, life: 26 + Math.random() * 24, c: '#7a6a52', s: 7 + Math.random() * 9 });
  shake = Math.max(shake, F.shk); anim(260, p => a._rec = F.rec * (1 - p) * (1 - p));
}
function drawFlashes() {
  const now = performance.now();
  for (let i = rockets.length - 1; i >= 0; i--) {
    const R = rockets[i], p = (now - R.t0) / R.dur; if (p >= 1) { rockets.splice(i, 1); continue; } if (p < 0 || !R.sp.img.naturalWidth) continue;
    const x = R.x0 + (R.x1 - R.x0) * p, y = R.y0 + (R.y1 - R.y0) * p, [sx, sy, sw, sh] = R.rk;
    g.save(); g.translate(x, y); g.scale(R.dir, 1); g.rotate(Math.atan2(R.y1 - R.y0, Math.abs(R.x1 - R.x0)));
    g.drawImage(R.sp.img, sx, sy, sw, sh, -(R.rc[0] - sx) * R.sc, -(R.rc[1] - sy) * R.sc, sw * R.sc, sh * R.sc); g.restore();
  }
  for (let i = flashes.length - 1; i >= 0; i--) {
    const f = flashes[i], p = (now - f.t0) / f.d; if (p < 0) continue; if (p >= 1) { flashes.splice(i, 1); continue; }
    g.save();
    if (f.t === 's') { g.globalAlpha = f.a * (1 - p); g.fillStyle = '#fff'; g.fillRect(0, 0, 1376, 768); }
    else if (f.t === 'f') { const r = f.r * (.6 + .6 * p), gr = g.createRadialGradient(f.x, f.y, 0, f.x, f.y, r); gr.addColorStop(0, 'rgba(255,255,230,' + (1 - p) + ')'); gr.addColorStop(.4, 'rgba(255,190,60,' + (.8 * (1 - p)) + ')'); gr.addColorStop(1, 'rgba(255,100,20,0)'); g.fillStyle = gr; g.beginPath(); g.arc(f.x, f.y, r, 0, 7); g.fill(); }
    else { g.globalAlpha = .6 * (1 - p); g.strokeStyle = '#ffe9b0'; g.lineWidth = 5 * (1 - p) + 1; g.beginPath(); g.ellipse(f.x + f.dir * f.r * p * .5, f.y, f.r * p * .45, f.r * p, 0, 0, 7); g.stroke(); }
    g.restore();
  }
}
const MG_ATRASO = { ovd_medio: 500 };
const MG_MS = { otan_leve: 2000, otan_medio: 2000, otan_pesado: 2000, ovd_leve: 1500, ovd_medio: 1400, ovd_pesado: 2000 };
async function tankMG(a, d) {
  const lado = a.lado_id === 1 ? 'otan' : 'ovd', ms = MG_MS[`${lado}_${a.tanque_classe}`] || 1500;
  try { const x = new Audio(`assets/sons/mg_${lado === 'otan' ? 'otan' : 'ovd_' + a.tanque_classe}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  await sleep(MG_ATRASO[`${lado}_${a.tanque_classe}`] || 0);
  const A = pos(a), D = pos(d), dir = D.x > A.x ? 1 : -1, ty = D.y - (d.tanque_ativo ? 90 : 60), t0 = performance.now();
  while (performance.now() - t0 < ms) {
    const m = a._mg || { x: A.x + dir * 40, y: A.y - 110 }, now = performance.now(), r = Math.random;
    flashes.push({ t: 'f', x: m.x, y: m.y, r: 30 + r() * 18, t0: now, d: 70 });
    for (let i = 0; i < 4; i++) parts.push({ x: m.x + dir * i * 9, y: m.y, vx: dir * (30 + r() * 6), vy: (r() - .5) * 1.2, life: 42, c: i % 2 ? '#fff3b0' : '#ffb347', s: 3 });
    parts.push({ x: m.x, y: m.y, vx: -dir * (1 + r() * 2.5), vy: -(2 + r() * 3), g: .5, life: 32, c: '#c9a227', s: 3 });
    parts.push({ x: m.x + dir * 12, y: m.y, vx: dir * (1 + r() * 2), vy: -r() * 1.2, g: -.03, life: 30 + r() * 22, c: '#7a7a7a', s: 5 + r() * 5 });
    boom(D.x - dir * (20 + r() * 50), ty + (r() - .5) * 50, 2, ['#ffd23f', '#ff9d4d', '#999'], 3);
    shake = Math.max(shake, 2.5 + r() * 2.5);
    await sleep(55);
  }
}
// Fuzil de infantaria. Audio em assets/sons/ (OVD: tiro_ovd_fuzil.mp3 2.79 s | OTAN: tiro_otan_fuzil.mp3 3.00 s). 'tiros' = ms de cada estampido no audio.
// atiradores: sprite de cada fuzileiro + boca do cano em px do PNG (x, y, largura, altura). modo 'alt' = alterna os fuzileiros a cada tiro; 'ambos' = os dois atiram juntos.
const FUZIL = {
  2: { snd: 'tiro_ovd_fuzil', dur: 2790, tiros: [390, 780, 1140, 1350, 1540, 1690, 1930], modo: 'alt', atiradores: [{ id: 'fuz_a', x: 636, y: 112, iw: 638, ih: 732 }] },
  1: { snd: 'tiro_otan_fuzil', dur: 3000, tiros: [80, 450, 660, 820, 950, 1060, 1430, 1640], modo: 'alt', atiradores: [{ id: 'fuz_a', x: 620, y: 105, iw: 621, ih: 691 }, { id: 'fuz_b', x: 661, y: 113, iw: 662, ih: 744 }] }
};
async function fuzilInf(a, d) {
  const F = FUZIL[a.lado_id], lado = a.lado_id === 1 ? 'otan' : 'ovd', dir = pos(d).x > pos(a).x ? 1 : -1;
  try { const x = new Audio(`assets/sons/${F.snd}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  F.tiros.forEach((t, i) => setTimeout(() => {
    const quem = F.modo === 'ambos' ? F.atiradores : [F.atiradores[i % F.atiradores.length]], r = Math.random;
    for (const A of quem) {
      const st = (a._sq && a._sq[A.id]) || { dx: 0, dy: 0 }, now = performance.now(), P = pos(a), sp = sprite(`${lado}_${A.id}`, 99), iw = sp.img.naturalWidth || A.iw, ih = sp.img.naturalHeight || A.ih;
      const sc = SOLK * (1 - 0.14 * cov(a)) * (SOL_ESC[`${lado}_${A.id}`] || 1), w = iw * sc, h = ih * sc;
      const mx = P.x - dir * st.dx + dir * (A.x / A.iw - .5) * w, my = P.y + st.dy - h * (1 - A.y / A.ih);
      flashes.push({ t: 'f', x: mx, y: my, r: 34 + r() * 16, t0: now, d: 70 });
      for (let k = 0; k < 5; k++) parts.push({ x: mx + dir * k * 8, y: my, vx: dir * (16 + k * 2), vy: (r() - .5) * 1.2, life: 26, c: k % 2 ? '#fff3b0' : '#ffb347', s: 3 });
      parts.push({ x: mx, y: my, vx: -dir * (1 + r() * 2), vy: -(2 + r() * 2), g: .5, life: 30, c: '#c9a227', s: 3 });
      parts.push({ x: mx + dir * 10, y: my, vx: dir * (1 + r() * 1.5), vy: -r(), g: -.03, life: 28 + r() * 14, c: '#8a8a8a', s: 5 + r() * 4 });
    }
    const D2 = pos(d), r2 = Math.random; boom(D2.x - dir * (10 + r2() * 30), D2.y - 55 + (r2() - .5) * 40, 2, ['#ffd23f', '#ff9d4d', '#999'], 3);
    shake = Math.max(shake, 1.2 + r2() * 1.3);
  }, t));
  await sleep(F.dur);
}
// SMG da OVD: audio assets/sons/tiro_ovd_smg.mp3 (2.02 s). Rajadas (ms no audio) e intervalo entre clarões; 'espera' = tempo p/ o esquadrao se posicionar antes de comecar audio+tiros.
const SMG_OVD = { snd: 'tiro_ovd_smg', dur: 2020, espera: 450, rajadas: [[0, 580], [930, 1160]], passo: 55 };
async function smgOvd(a, d) {
  await sleep(SMG_OVD.espera);
  const dir = pos(d).x > pos(a).x ? 1 : -1;
  try { const x = new Audio(`assets/sons/${SMG_OVD.snd}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  for (const [t0, t1] of SMG_OVD.rajadas) for (let t = t0; t < t1; t += SMG_OVD.passo) setTimeout(() => {
    // boca do cano no sprite ovd_smg_a_1.png (574x673): x=573, y=121 -> fracoes do sprite
    const st = (a._sq && a._sq.smg_a) || { dx: 0, dy: 0 }, now = performance.now(), r = Math.random, P = pos(a), sp = sprite('ovd_smg_a', 99), iw = sp.img.naturalWidth || 574, ih = sp.img.naturalHeight || 673;
    const sc = SOLK * (1 - 0.14 * cov(a)) * (SOL_ESC.ovd_smg_a || 1), w = iw * sc, h = ih * sc;
    const mx = P.x - dir * st.dx + dir * (573 / 574 - .5) * w, my = P.y + st.dy - h * (1 - 121 / 673);
    flashes.push({ t: 'f', x: mx, y: my, r: 26 + r() * 14, t0: now, d: 55 });
    for (let k = 0; k < 3; k++) parts.push({ x: mx + dir * k * 8, y: my, vx: dir * (18 + k * 2), vy: (r() - .5) * 1.2, life: 20, c: k % 2 ? '#fff3b0' : '#ffb347', s: 3 });
    parts.push({ x: mx, y: my, vx: -dir * (1 + r() * 2), vy: -(2 + r() * 2), g: .5, life: 28, c: '#c9a227', s: 3 });
    if (r() < .5) parts.push({ x: mx + dir * 10, y: my, vx: dir * (1 + r()), vy: -r(), g: -.03, life: 26 + r() * 12, c: '#8a8a8a', s: 4 + r() * 4 });
    const D2 = pos(d); boom(D2.x - dir * (10 + r() * 30), D2.y - 55 + (r() - .5) * 40, 1, ['#ffd23f', '#ff9d4d', '#999'], 3);
    shake = Math.max(shake, .8 + r());
  }, t);
  await sleep(SMG_OVD.dur);
}
// SMG da OTAN: audio assets/sons/tiro_otan_smg.mp3 (2.87 s). Mesmo efeito da OVD, nas bocas dos dois soldados (smg_a e smg_b).
const SMG_OTAN = { snd: 'tiro_otan_smg', dur: 2870, espera: 450, rajadas: [[180, 600], [950, 1450], [1530, 1900]], passo: 55,
  atiradores: [{ id: 'smg_a', x: 555, y: 118, iw: 556, ih: 726 }, { id: 'smg_b', x: 603, y: 299, iw: 604, ih: 869 }] };
async function smgOtan(a, d) {
  await sleep(SMG_OTAN.espera);
  const dir = pos(d).x > pos(a).x ? 1 : -1;
  try { const x = new Audio(`assets/sons/${SMG_OTAN.snd}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  for (const [t0, t1] of SMG_OTAN.rajadas) for (let t = t0; t < t1; t += SMG_OTAN.passo) setTimeout(() => {
    const r = Math.random, P = pos(a);
    for (const A of SMG_OTAN.atiradores) {
      const st = (a._sq && a._sq[A.id]) || { dx: 0, dy: 0 }, now = performance.now(), sp = sprite('otan_' + A.id, 99), iw = sp.img.naturalWidth || A.iw, ih = sp.img.naturalHeight || A.ih;
      const sc = SOLK * (1 - 0.14 * cov(a)) * (SOL_ESC['otan_' + A.id] || 1), w = iw * sc, h = ih * sc, ajx = (SOL_DX[`otan_${A.id}_1`] || 0) * sc;
      const mx = P.x - dir * st.dx + dir * ((A.x / A.iw - .5) * w + ajx), my = P.y + st.dy - h * (1 - A.y / A.ih);
      flashes.push({ t: 'f', x: mx, y: my, r: 26 + r() * 14, t0: now, d: 55 });
      for (let k = 0; k < 3; k++) parts.push({ x: mx + dir * k * 8, y: my, vx: dir * (18 + k * 2), vy: (r() - .5) * 1.2, life: 20, c: k % 2 ? '#fff3b0' : '#ffb347', s: 3 });
      parts.push({ x: mx, y: my, vx: -dir * (1 + r() * 2), vy: -(2 + r() * 2), g: .5, life: 28, c: '#c9a227', s: 3 });
      if (r() < .5) parts.push({ x: mx + dir * 10, y: my, vx: dir * (1 + r()), vy: -r(), g: -.03, life: 26 + r() * 12, c: '#8a8a8a', s: 4 + r() * 4 });
    }
    const D2 = pos(d); boom(D2.x - dir * (10 + r() * 30), D2.y - 55 + (r() - .5) * 40, 1, ['#ffd23f', '#ff9d4d', '#999'], 3);
    shake = Math.max(shake, .8 + r());
  }, t);
  await sleep(SMG_OTAN.dur);
}
// Anti-tanque (todos os lados): audio assets/sons/tiro_antitanque.mp3 (5.19 s). Tiro em 0.35 s, impacto em 0.79 s.
// A funcao retorna no impacto, entao o evento 'dano' (desconto de vida) roda nesse instante; o resto do audio toca sozinho.
const AT_FX = { snd: 'tiro_antitanque', tiro: 350, impacto: 790, pose: 1400, boca: [115, .60] }; // boca: [px a frente do soldado, fracao da altura] (estimado, ajuste se precisar)
async function antiTanque(a, d) {
  const dir = pos(d).x > pos(a).x ? 1 : -1, r = Math.random;
  try { const x = new Audio(`assets/sons/${AT_FX.snd}.mp3`); x.volume = .9; x.play().catch(() => {}); } catch (e) {}
  const geo = AT_GEO[a.lado_id];
  const pt = (fx, fy) => { // ponto do sprite (px do PNG) -> tela
    const st = (a._sq && a._sq.at) || { dx: 0, dy: 0 }, P = pos(a), sp = sprite((a.lado_id === 1 ? 'otan' : 'ovd') + '_at', 99), iw = sp.img.naturalWidth || geo.iw, ih = sp.img.naturalHeight || geo.ih;
    const sc = SOLK * (1 - 0.14 * cov(a)) * (SOL_ESC[(a.lado_id === 1 ? 'otan' : 'ovd') + '_at'] || 1), w = iw * sc, h = ih * sc;
    return { x: P.x - dir * st.dx + dir * (fx / geo.iw - .5) * w, y: P.y + st.dy - h * (1 - fy / geo.ih), sc };
  };
  const origem = () => { if (geo) return pt(geo.front[0], geo.front[1]); const st = (a._sq && a._sq.at) || { dx: 0, dy: 0 }, P = pos(a); return { x: P.x - dir * st.dx + dir * AT_FX.boca[0], y: P.y + st.dy - SOL_H * AT_FX.boca[1] }; };
  const traseira = () => { if (geo) return pt(geo.back[0], geo.back[1]); const m = origem(); return { x: m.x - dir * 150, y: m.y }; };
  const alvo = () => { const D = pos(d); return { x: D.x - dir * 10, y: D.y - (d.tanque_ativo ? 90 : 55) }; };
  setTimeout(() => {
    const m = origem(), now = performance.now();
    flashes.push({ t: 'f', x: m.x, y: m.y, r: 70, t0: now, d: 110 });
    for (let i = 0; i < 10; i++) parts.push({ x: m.x + dir * i * 6, y: m.y, vx: dir * (10 + i), vy: (r() - .5) * 1.5, life: 24, c: i % 2 ? '#fff3b0' : '#ffb347', s: 4 });
    const bk = traseira(); flashes.push({ t: 'f', x: bk.x, y: bk.y, r: 55, t0: now, d: 120 });
    for (let i = 0; i < 16; i++) parts.push({ x: bk.x - dir * (i * 3), y: bk.y + (r() - .5) * 14, vx: -dir * (3 + r() * 7), vy: (r() - .5) * 2.5, g: -.02, life: 30 + r() * 24, c: i % 2 ? '#9a9a9a' : '#c8c8c8', s: 6 + r() * 9 });
    if (geo && geo.cut) { a._atCut = true; setTimeout(() => { a._atCut = false; }, AT_FX.pose);
      const c0 = pt(geo.rc[0], geo.rc[1]), tg = alvo(); rockets.push({ t0: now, dur: AT_FX.impacto - AT_FX.tiro, x0: c0.x, y0: c0.y, x1: tg.x, y1: tg.y, sc: c0.sc, dir, a, rk: geo.rk, rc: geo.rc, sp: sprite((a.lado_id === 1 ? 'otan' : 'ovd') + '_at', 99) }); }
    shake = Math.max(shake, 7);
  }, AT_FX.tiro);
  const passo = 30, n = Math.floor((AT_FX.impacto - AT_FX.tiro) / passo);
  for (let i = 1; i <= n; i++) setTimeout(() => {
    const m = origem(), t = alvo(), k = i / n, x = m.x + (t.x - m.x) * k, y = m.y + (t.y - m.y) * k;
    parts.push({ x, y, vx: -dir * (1 + r()), vy: (r() - .5), g: -.01, life: 22 + r() * 10, c: '#d8d8d8', s: 5 + r() * 4 });
    parts.push({ x, y, vx: 0, vy: 0, life: 6, c: '#ffd23f', s: 6 });
  }, AT_FX.tiro + i * passo);
  setTimeout(() => {
    const t = alvo(), now = performance.now();
    flashes.push({ t: 'f', x: t.x, y: t.y, r: 110, t0: now, d: 160 });
    boom(t.x, t.y, 40, ['#ff8a1f', '#ffd23f', '#d6370f', '#444'], 7);
    shake = Math.max(shake, 14);
  }, AT_FX.impacto);
  await sleep(AT_FX.impacto);
}
const muzzle = (a, d, mg) => { const A = pos(a), D = pos(d), dir = D.x > A.x ? 1 : -1, m = a.tanque_ativo ? (mg && a._mg ? a._mg : a._muz) : null; for (let i = 0; i < 6; i++) parts.push({ x: m ? m.x : A.x + dir * 45, y: m ? m.y : A.y - 60, vx: dir * (14 + i * 2), vy: (Math.random() - .5) * 1.2, life: 28, c: '#ffe27a', s: 4 }); };
HOOK.fx = async (n, d) => {
  if (d && d.at && ['tiro', 'rajada', 'tiro_tanque', 'molotov'].includes(n)) await pan(d.at); else if (d && d.u && ['dano', 'tanque_destruido'].includes(n)) await pan(d.u);
  if (n === 'rajada' && d.arma === 'tanque_mg') await tankMG(d.at, d.def);
  else if ((n === 'tiro' || n === 'rajada') && d.arma === 'rifle' && FUZIL[d.at.lado_id] && !d.at.tanque_ativo && !fast) { setPose(d.at, d.arma, FUZIL[d.at.lado_id].dur); await fuzilInf(d.at, d.def); }
  else if ((n === 'tiro' || n === 'rajada') && d.arma === 'smg' && d.at.lado_id === 2 && !d.at.tanque_ativo && !fast) { setPose(d.at, d.arma, SMG_OVD.espera + SMG_OVD.dur + 100); await smgOvd(d.at, d.def); }
  else if ((n === 'tiro' || n === 'rajada') && d.arma === 'smg' && d.at.lado_id === 1 && !d.at.tanque_ativo && !fast) { setPose(d.at, d.arma, SMG_OTAN.espera + SMG_OTAN.dur + 100); await smgOtan(d.at, d.def); }
  else if ((n === 'tiro' || n === 'rajada') && d.arma === 'anti_tank' && !d.at.tanque_ativo && !fast) { setPose(d.at, d.arma, AT_FX.pose); await antiTanque(d.at, d.def); }
  else if (n === 'tiro' || n === 'rajada') { setPose(d.at, d.arma); muzzle(d.at, d.def, d.arma === 'tanque_mg'); await sleep(fast ? 0 : 250); }
  else if (n === 'tiro_tanque') { tankBlast(d.at, d.def); await sleep(fast ? 0 : 320); }
  else if (n === 'molotov') { setPose(d.at, 'molotov'); await sleep(fast ? 0 : 400); }
  else if (n === 'dano') { const p = pos(d.u); d.u._flash = Date.now() + 350; pop(d.u, '-' + d.dano, '#ff5a4d'); boom(p.x, p.y - (d.u.tanque_ativo ? 120 : 55), 8, ['#ff9d4d', '#ffd23f', '#999']); }
  else if (n === 'tanque_destruido') { const p = pos(d.u); boom(p.x, p.y - 100, 60, ['#ff8a1f', '#ffd23f', '#333', '#d6370f'], 7); }
  else if (n === 'suprimento') pop(d.u, '+', '#6f6');
};
HOOK.qte = (sec, at, alvo) => new Promise(res => {
  const el = $('#qte'); el.style.display = 'flex'; let done = false;
  const fim = (v) => { if (done) return; done = true; el.style.display = 'none'; removeEventListener('keydown', kd); $('#qb').onclick = null; res(v); };
  const kd = (e) => { if (e.key === 'Enter' || e.key === ' ') fim(true); };
  addEventListener('keydown', kd); $('#qb').onclick = () => fim(true); setTimeout(() => fim(false), sec * 1000);
});

const box = $('#acoes');
const ACT = { rifle: ['🎯', 'Atacar com fuzil'], submetralhadora: ['🔫', 'Atacar com submetralhadora'], anti_tank: ['🚀', 'Atacar com anti tanque'], molotov: ['🔥', 'Atacar com molotov'], recolher_arma: ['🤲', 'Recolher AT'],
  chamar_blindado: ['🛡️', 'Blindado'], chamar_caminhao: ['🚛', 'Caminhão'], caminhao_suprimento: ['📦', 'Suprimentos'], comprar_artilharia: ['💣', 'Comprar art.'], solicitar_artilharia: ['💣', 'Artilharia'],
  comprar_antiaerea: ['🛰️', 'Antiaérea'], suporte_aereo: ['✈️', 'Aéreo'], cobertura: ['🧱', 'Cobertura'], aguardar: ['⏳', 'Aguardar'], pular_vez: ['⏭️', 'Pular'], fugir: ['🏃', 'Fugir'],
  tanque_metralhadora: ['🔫', 'Metralhadora'], tanque_perfurante: ['🔩', 'Atirar AP'], tanque_explosivo: ['💣', 'Atirar HE'], carregar_perfurante: ['🔩', 'Carregar AP'], carregar_explosivo: ['💣', 'Carregar HE'],
  reabastecer: ['⛽', 'Combustível'], sair_tanque: ['🚪', 'Sair'], suprimento_medico: ['➕', 'Médico'], interceptar_caminhao: ['🎯', 'Interceptar'] };
const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const acIco = (c) => (ACT[c] || [])[0] || (/^chamar_blindado_/.test(c) ? '🛡️' : /^ataque_aereo/.test(c) ? '✈️' : /^suprimento_municao/.test(c) ? '🔸' : '▪️');
const acRot = (it) => { const c = it.chave || '', t = it.texto; if (ACT[c]) return ACT[c][1]; if (c === 'ataque_aereo_frente') return 'Frente'; if (/^ataque_aereo_/.test(c)) { const m = t.match(/: ([^(]+?) \(/); return m ? m[1] : 'Suporte'; } if (/^suprimento_municao_/.test(c)) return 'Munição ' + (c.endsWith('rifle') ? 'fuzil' : c.endsWith('smg') ? 'SMG' : 'AT'); return t.replace(/\s*[(—:].*$/, ''); };
function acBadges(it) {
  const t = it.texto, b = []; let m;
  if (it.chave === 'pular_vez' && (m = t.match(/\+(\d+)/))) b.push(`<span class="bd gain">+${m[1]} pts</span>`);
  else if ((m = t.match(/(\d+) pts/)) || (m = t.match(/custo (\d+)/))) b.push(`<span class="bd">${m[1]} pts</span>`);
  else if (/grátis/.test(t)) b.push('<span class="bd gain">grátis</span>');
  if ((m = t.match(/\((\d+)x/))) b.push(`<span class="bd">×${m[1]}</span>`);
  if (/^chamar_blindado_/.test(it.chave) && (m = t.match(/vida (\d+)/))) b.push(`<span class="bd">vida ${m[1]}</span>`);
  if ((m = t.match(/chega em (\d+)/))) b.push(`<span class="bd">${m[1]} rounds</span>`);
  if (/^carregar_/.test(it.chave) && (m = t.match(/recarga (\d+)/))) b.push(`<span class="bd">recarga ${m[1]}</span>`);
  if (it.chave === 'caminhao_suprimento' && (m = t.match(/caminhão (\d+)\//))) b.push(`<span class="bd">caminhão ${m[1]}</span>`);
  return b.join('');
}
function acInfo(t) {
  let m;
  if ((m = t.match(/^(.+?) sem munição/))) return ['', m[1].replace(/^Submetralhadora$/, 'SMG') + ' sem munição'];
  if (/sem combustível/.test(t)) return ['', 'Sem combustível'];
  if (/recarregando/.test(t)) return ['', 'Canhão recarregando ' + ((t.match(/\((\d+)/) || [])[1] || '')];
  if (/em recarga/.test(t)) return ['', t.replace(/ em recarga.*$/, '').replace(/^Artilharia .*/, 'Artilharia') + ' em recarga'];
  if (/a caminho/.test(t)) return ['', (/Caminhão/.test(t) ? 'Caminhão' : 'Aéreo') + ' a caminho'];
  if (/indispon/.test(t)) return ['', 'Tanque indisponível'];
  return ['', t];
}
const SIDE = ['comprar_artilharia', 'comprar_antiaerea', 'chamar_caminhao'], ATK = ['rifle', 'submetralhadora', 'anti_tank', 'molotov'];
const pick = (items, back) => new Promise(res => {
  box.innerHTML = '';
  const keys = {}, fim = (v) => { removeEventListener('keydown', kd); pend = null; pendFim = null; res(v); }, kd = (e) => { if (keys[e.key]) fim(keys[e.key]); };
  let vn = 0;
  for (const it of items) {
    if (it.n === null) { const [ic, tx] = acInfo(it.texto), d = document.createElement('div'); d.className = 'card off'; d.title = it.texto; d.innerHTML = `<span class="cl">${esc(tx)}</span>`; box.appendChild(d); continue; }
    if (!back && SIDE.includes(it.chave)) continue; // essas opcoes ficam nos paineis laterais
    const b = document.createElement('button'); b.className = 'card' + (ATK.includes(it.chave) ? ' atk' : ''); b.title = it.texto;
    const num = it.n ? ++vn : 0;
    b.innerHTML = `${num ? `<span class="ck">${num}</span>` : ''}<span class="cl">${esc(acRot(it))}</span><span class="cb">${acBadges(it)}</span>`;
    b.onclick = () => fim(it); box.appendChild(b); if (num) keys[String(num)] = it;
  }
  if (back) { const b = document.createElement('button'); b.className = 'card x'; b.innerHTML = '<span class="cl">Voltar</span>'; b.onclick = () => fim({ chave: null }); box.appendChild(b); keys.Escape = { chave: null }; }
  else { pend = items; pendFim = fim; }
  addEventListener('keydown', kd);
});
HOOK.escolherAcao = async (u, op, turno) => {
  await vozLivre();
  focus(u); hud();
  const it = await pick(Tn.montar_opcoes_disponiveis(u).map(o => ({ ...o, n: o.n === null ? null : o.n })), false);
  let r = it.chave;
  const sub = async (lista) => (await pick(lista.map(o => ({ n: 0, ...o })), true)).chave;
  if (r === 'caminhao_suprimento') r = await sub(Tn.opcoes_suprimento(u));
  else if (r === 'chamar_blindado') r = await sub(Tn.opcoes_blindado(u.lado_id));
  else if (r === 'suporte_aereo') r = await sub(Tn.opcoes_aereo(u, op));
  else if (r === 'solicitar_artilharia' && op.caminhao && op.caminhao.estado === 'a_caminho') r = await sub(Tn.opcoes_artilharia(u, op));
  box.innerHTML = '<span class="dim">⏳</span>';
  return r;
};

const DUB_LANG = { otan_leve: 'ger', otan_medio: 'ger', otan_pesado: 'ing', ovd_leve: 'ger', ovd_medio: 'ger', ovd_pesado: 'rus' };
const dubUrl = (lang, dub, n) => encodeURI(`assets/dublagem/${lang}_${dub}/${n} ${lang} ${dub}.mp3`);

const FALAS = {
  chega: [1, 2, 3], aviso: [4, 5, 6], tipo: { leve: 7, medio: 8, pesado: 9 }, ident: [10, 11, 12],
  tiro: [13, 14, 15], acerto: [16, 17, 18], erro: [19, 20, 21], pronto: [22, 23, 24],
  mg_cmd: [25, 26, 27], mg_art: [28, 29, 30],
  leve: [31, 32, 33], baixa: [34, 35, 36], forte: [37, 38, 39],
  perdemos: [40, 41, 42], vencemos: [43, 44, 45],
  ap: [46, 48], he: [49, 51]
};
const ART = new Set([10, 11, 12, 14, 16, 17, 18, 19, 20, 21, 28, 29, 30, 32, 35, 38, 42, 44]), CAR = new Set([22, 23, 24, 33, 36, 39, 41, 47, 50]);
const papel = (n) => ART.has(n) ? 'art' : CAR.has(n) ? 'car' : 'cmd';
let crew = null, fila = Promise.resolve();
const pickF = (a) => a[Math.floor(Math.random() * a.length)];
const langTanque = (u) => DUB_LANG[`${u.lado_id === 1 ? 'otan' : 'ovd'}_${u.tanque_classe}`];
const novaTripulacao = () => { const d = ['lz', 'gb', 'gr'].sort(() => Math.random() - .5); crew = { cmd: d[0], art: d[1], car: d[2] }; };
const vozLivre = () => fila;
const tocar = (url) => new Promise(res => {
  const a = new Audio(url); let ok = false; const fim = () => { if (!ok) { ok = true; res(); } };
  a.onended = fim; a.onerror = fim; setTimeout(fim, 9000); a.play().catch(fim);
});
function falar(...seq) {
  if (!player || !crew) return Promise.resolve();
  const lang = langTanque(player), cr = crew;
  fila = fila.then(async () => {
    for (const s of seq) { const [n, gap = 250] = [].concat(s); await tocar(dubUrl(lang, cr[papel(n)], n)); if (gap) await sleep(fast ? 0 : gap); }
  });
  return fila;
}
function dubDano(p, dano) {
  const max = C.TANQUES[p.lado_id][p.tanque_classe].vida, resto = p.tanque_vida - dano;
  if (dano > 0 && resto > 0) falar(pickF(dano >= max * .2 ? FALAS.forte : FALAS.leve), ...(resto <= max * .2 ? [pickF(FALAS.baixa)] : []));
}
function dubTanque(n, d) {
  const p = player; if (!p) return;
  if (n === 'tanque_chega' && d.u === p) { novaTripulacao(); sleep(500).then(() => falar(pickF(FALAS.chega))); return; }
  if (!p.tanque_ativo || !crew) return;
  if (n === 'tanque_chega') falar([FALAS.tipo[d.classe], 0], pickF(FALAS.aviso), pickF(FALAS.ident));
  else if (n === 'tanque_carrega' && d.u === p) falar(pickF(d.tipo === 'perfurante' ? FALAS.ap : FALAS.he), d.tipo === 'perfurante' ? 47 : 50);
  else if (n === 'tanque_pronto' && d.u === p) falar(pickF(FALAS.pronto));
  else if (n === 'dano' && d.u === p && d.dano > 0) { if (p._semDub) p._semDub = false; else dubDano(p, d.dano); } else if (n === 'tanque_destruido') falar(pickF(d.u === p ? FALAS.perdemos : FALAS.vencemos));
}
const fx0 = HOOK.fx;
HOOK.fx = async (n, d) => {
  const p = player, ativo = p && p.tanque_ativo && crew;
  if (!((n === 'dano' || n === 'tanque_destruido') && (d.u !== p || p._semDub))) await vozLivre();
  if (ativo && n === 'tiro_tanque' && d.at === p) {
    await falar(pickF(FALAS.tiro));
    await fx0(n, d);
    fila = fila.then(() => sleep(fast ? 0 : 2000));
    falar(pickF(d.acertou ? FALAS.acerto : FALAS.erro));
    return;
  }
  if (ativo && n === 'rajada' && d.at === p && d.arma === 'tanque_mg') { await falar(pickF(FALAS.mg_cmd), pickF(FALAS.mg_art)); return fx0(n, d); }
  if (n === 'tanque_destruido') {
    dubTanque(n, d); await fx0(n, d); await anim(450, q => fade = q);
    d.u._troca = true; await vozLivre(); await somFim('assets/sons/tanque_destruido.mp3'); await anim(450, q => fade = 1 - q);
    setTimeout(() => { d.u._troca = false; }, 3000); return;
  }
  dubTanque(n, d);
  return SCN[n] ? SCN[n](d) : fx0(n, d);
};

const menu = $('#menu');
const click = (sel) => new Promise(r => { $(sel).onclick = () => r(); });
const D = C.DADOS_LADOS;
function comparativo() {
  const rows = [['Vida inicial', 'vida_maxima'], ['Rifle', 'rifle_nome'], ['Submetralhadora', 'submetralhadora_nome'], ['Arma antitanque', 'arma_anti_tank_nome'], ['Suprimento', 'caminhao_nome'], ['Suporte aéreo', 'suporte_nome']];
  let t = `<table><tr><th></th><th>${D[1].nome}<br><small>${D[1].nome_completo}</small></th><th>${D[2].nome}<br><small>${D[2].nome_completo}</small></th></tr>`;
  for (const [r, k] of rows) t += `<tr><td>${r}</td><td>${D[1][k]}</td><td>${D[2][k]}</td></tr>`;
  t += `<tr><td>Buff especial</td><td>Nenhum</td><td>${D[2].buff_defesa * 100}% de chance de reduzir o dano recebido pela metade</td></tr>`;
  for (const k of ['leve', 'medio', 'pesado']) { const a = C.TANQUES[1][k], b = C.TANQUES[2][k]; t += `<tr><td>Blindado ${k}</td><td>${a.nome} (vida ${a.vida}, ${a.custo_chamar} pts)</td><td>${b.nome} (vida ${b.vida}, ${b.custo_chamar} pts)</td></tr>`; }
  return t + '</table>';
}
function custos() {
  const c = C.CUSTOS_ACAO;
  return `<div class="dim" style="max-width:900px;font-size:13px">Custos (iguais para os dois lados): rifle ${c.rifle} · SMG ${c.submetralhadora} · antitanque ${c.anti_tank} · molotov ${c.molotov} (${C.MOLOTOV.dano[0]}–${C.MOLOTOV.dano[1]} de dano por ${C.MOLOTOV.rodadas} rodadas) · suporte aéreo ${c.suporte_aereo} · caminhão médico ${c.suprimento_medico} · artilharia ${C.LINHA_SUPORTE.artilharia.custo_compra} (+${C.LINHA_SUPORTE.artilharia.custo_uso} por uso) · antiaérea ${C.LINHA_SUPORTE.antiaerea.custo_compra} · pular a vez: +${C.BONUS_PULAR_VEZ} pts · cobertura: grátis, reduz o próximo dano em 40–70%. Munição: rifle ${U.usos_maximos('rifle')} usos, SMG ${U.usos_maximos('smg')}, antitanque ${U.usos_maximos('anti_tank')}.</div>`;
}

let _amb = null;
function somAmbiente() { if (_amb) return; _amb = new Audio('assets/sons/ambiente.mp3'); _amb.loop = true; _amb.volume = 0.5; _amb.play().catch(() => {}); }
let menuFlowPre = null;
async function menuFlow(ladoPre) {
  if (ladoPre) {
    fast = false;
    menu.style.display = 'none';
    player = U.criar_unidade(ladoPre); enemy = U.criar_unidade(ladoPre === 1 ? 2 : 1);
    addLog(`Você escolheu: ${D[ladoPre].nome} (${D[ladoPre].nome_completo}).`); addLog('A batalha vai começar!'); somAmbiente();
    await sleep(800);
    await Luft.api.iniciar(player, enemy);
    const motivo = await Luft.rodar_batalha(player, enemy), v = Luft.vencedor(player, enemy, motivo);
    box.innerHTML = `<b>FIM DA BATALHA — VENCEDOR: ${v.nome}</b>${motivo === 'fuga' ? ' (por fuga)' : ''}<br><br><button onclick="location.reload()">Jogar de novo</button>`;
    addLog(`--- FIM DA BATALHA ---`, 'h'); addLog(`VENCEDOR: ${v.nome}!`, 'h');
    return;
  }
  menu.innerHTML = '<h1>L U F T B A L L O N S</h1><div>Selecione o modo de exibição</div><button id="mi">Modo imersivo (pausas e efeitos)</button><button id="mr">Modo rápido (texto instantâneo)</button>';
  fast = await new Promise(r => { $('#mi').onclick = () => r(false); $('#mr').onclick = () => r(true); });
  menu.innerHTML = '<div id="ty" style="font-size:22px;max-width:780px;min-height:170px"></div><button id="sk">Pular</button>';
  let skip = false; $('#sk').onclick = () => { skip = true; };
  const linhas = ['A liberdade é indivisível, e quando um homem é escravizado, todos não são livres.', '— John F. Kennedy, Berlim, 1963.', 'L U F T B A L L O N S', 'Bem-vindo ao Luftballons.', 'Assuma o comando de uma das forças da Guerra Fria (OTAN ou OVD) em uma batalha por turnos com economia de recursos.'];
  for (const l of linhas) {
    const d = document.createElement('div'); d.style.margin = '8px 0'; $('#ty').appendChild(d);
    if (l.startsWith('L U')) d.style.cssText += ';font-size:38px;letter-spacing:.3em';
    for (const ch of l) { d.textContent += ch; if (!fast && !skip) await sleep(38); }
    if (!fast && !skip) await sleep(l.startsWith('—') ? 900 : 400);
  }
  $('#sk').textContent = 'Escolher o lado'; $('#sk').onclick = null; await click('#sk');
  menu.innerHTML = `<div style="font-size:20px">Escolha o seu lado nesta guerra</div>${comparativo()}${custos()}<div class="row"><button data-l="1">Jogar com a ${D[1].nome}</button><button data-l="2">Jogar com a ${D[2].nome}</button></div>`;
  const l = await new Promise(r => menu.querySelectorAll('[data-l]').forEach(b => b.onclick = () => r(+b.dataset.l)));
  menu.style.display = 'none';
  if (menuFlowPre) { menuFlowPre = null; }
  player = U.criar_unidade(l); enemy = U.criar_unidade(l === 1 ? 2 : 1);
  addLog(`Você escolheu: ${D[l].nome} (${D[l].nome_completo}).`); addLog('A batalha vai começar!'); somAmbiente();
  await sleep(fast ? 0 : 800);
  await Luft.api.iniciar(player, enemy);
    const motivo = await Luft.rodar_batalha(player, enemy), v = Luft.vencedor(player, enemy, motivo);
  box.innerHTML = `<b>FIM DA BATALHA — VENCEDOR: ${v.nome}</b>${motivo === 'fuga' ? ' (por fuga)' : ''}<br><br><button onclick="location.reload()">Jogar de novo</button>`;
  addLog(`--- FIM DA BATALHA ---`, 'h'); addLog(`VENCEDOR: ${v.nome}!`, 'h');
}
Luft.iniciar = (lado) => menuFlow(lado); loop();
})();