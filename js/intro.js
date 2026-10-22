(() => {
const FLAGS = { 1: 'assets/cenas/flag_otan.jpg', 2: 'assets/cenas/flag_ovd.jpg' };
const NOMES = { 1: 'OTAN', 2: 'OVD' };
const SIGNIF = { 1: 'North Atlantic Treaty Organization', 2: 'Warsaw Treaty Organization' };
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
const SONS = { ping: 'assets/audio/radar_ping.mp3', alarme: 'assets/audio/alarme.mp3', kennedy: 'assets/audio/kennedy.mp3', tv: 'assets/audio/tv.mp3', correndo: 'assets/audio/correndo.mp3', menu: 'assets/audio/menu.mp3' };
// VOLUMES (0 a 10) — normal = 5
const VOL = { ping: 5, alarme: .3, kennedy: 5, tv: 5, menu: 1, correndo: 5 };
const fade = (a, ms = 1500) => { if (!a) return; const v0 = a.volume, t = performance.now(); const f = () => { const u = Math.min(1, (performance.now() - t) / ms); a.volume = v0 * (1 - u); if (u < 1) setTimeout(f, 40); else a.pause(); }; f(); };
const tocar = (nome, loop = false) => { try { const a = new Audio(SONS[nome]); a.loop = loop; a.volume = (VOL[nome] ?? 5) / 10; a.onerror = () => console.warn('[áudio] não carregou:', SONS[nome], a.error && a.error.code); const p = a.play(); if (p && p.catch) p.catch(e => console.warn('[áudio] bloqueado/erro:', SONS[nome], e && e.name)); return a; } catch (e) { console.warn('[áudio] exceção', e); return null; } };

// ---- efeitos sonoros sintetizados (WebAudio, sem arquivos) ----
const SFX = (() => {
  let A, hum;
  const ac = () => { try { A = A || new (window.AudioContext || window.webkitAudioContext)(); if (A.state === 'suspended') A.resume(); return A; } catch (e) { return null; } };
  const gain = (a, v, dur) => { const g = a.createGain(), t = a.currentTime; g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(.0001, t + dur); return g; };
  const bip = (f, dur, v, tp = 'square', f2) => { const a = ac(); if (!a) return; const o = a.createOscillator(), g = gain(a, v, dur); o.type = tp; o.frequency.setValueAtTime(f, a.currentTime); if (f2) o.frequency.exponentialRampToValueAtTime(f2, a.currentTime + dur); o.connect(g).connect(a.destination); o.start(); o.stop(a.currentTime + dur); };
  const ruido = (dur, v, f0, f1) => { const a = ac(); if (!a) return; const b = a.createBuffer(1, a.sampleRate * dur | 0, a.sampleRate), d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = gain(a, v, dur); s.buffer = b; fl.type = 'lowpass'; fl.frequency.setValueAtTime(f0, a.currentTime); fl.frequency.exponentialRampToValueAtTime(f1, a.currentTime + dur); s.connect(fl).connect(g).connect(a.destination); s.start(); };
  const clack = (v, freq, dur, grave) => { const a = ac(); if (!a) return; const n = a.sampleRate * dur | 0, b = a.createBuffer(1, n, a.sampleRate), d = b.getChannelData(0); for (let k = 0; k < n; k++) d[k] = (Math.random() * 2 - 1) * Math.pow(1 - k / n, 3); const s = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); s.buffer = b; fl.type = 'bandpass'; fl.frequency.value = freq * (.9 + Math.random() * .2); fl.Q.value = 1.2; g.gain.value = v; s.connect(fl).connect(g).connect(a.destination); s.start(); if (grave) bip(grave, .05, v * .5, 'sine', grave * .5); };
  return {
    tecla() { clack(.5, 2200, .03, 150 + Math.random() * 30); },
    hover() { clack(.12, 1800, .02); },
    click() { clack(.7, 1300, .07, 95); },
    tv() { tocar('tv'); },
    humOn() { const a = ac(); if (!a || hum) return; const b = a.createBuffer(1, a.sampleRate * 2, a.sampleRate), d = b.getChannelData(0); for (let k = 0; k < d.length; k++) d[k] = Math.random() * 2 - 1; const o = a.createBufferSource(), fl = a.createBiquadFilter(), g = a.createGain(); o.buffer = b; o.loop = true; fl.type = 'highpass'; fl.frequency.value = 3500; g.gain.value = .012; o.connect(fl).connect(g).connect(a.destination); o.start(); hum = { o, g }; },
    humOff() { if (!hum) return; const a = ac(), h = hum; hum = null; h.g.gain.setValueAtTime(h.g.gain.value, a.currentTime); h.g.gain.linearRampToValueAtTime(0, a.currentTime + .6); h.o.stop(a.currentTime + .65); }
  };
})();

const css = `
#intro{position:fixed;inset:0;z-index:9999;background:#000;overflow:hidden;font-family:ui-monospace,"Courier New",monospace;transition:opacity .5s}
#intro .scr{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;z-index:2}
#intro.term{color:#33ff66}
#intro.term .scr{text-shadow:0 0 6px #33ff66,0 0 14px rgba(51,255,102,.6);animation:flick 2.4s infinite alternate}
@keyframes flick{0%{opacity:.95}40%{opacity:1}60%{opacity:.97}100%{opacity:1}}
#intro .crtbg{position:absolute;inset:0;z-index:1;background:radial-gradient(ellipse at center,#06180a 0%,#020a02 70%);clip-path:inset(50% 50% 50% 50%);overflow:hidden}
#intro .crtbg>*{position:absolute;inset:0;pointer-events:none}
#intro .scan{background:repeating-linear-gradient(0deg,rgba(0,0,0,.28) 0,rgba(0,0,0,.28) 1px,transparent 1px,transparent 3px);z-index:3}
#intro .vig{background:radial-gradient(circle at center,transparent 50%,rgba(0,0,0,.8) 100%);z-index:4}
#intro .noise{width:100%;height:100%;image-rendering:pixelated;opacity:.55;mix-blend-mode:screen;z-index:2}
#intro .flash{background:#d8ffe0;opacity:0;z-index:5}
#intro .roll{inset:auto 0 auto 0;top:-25%;height:22%;background:linear-gradient(transparent,rgba(120,255,160,.16) 45%,rgba(120,255,160,.22) 55%,transparent);z-index:3;opacity:0}
#intro .dot{position:absolute;left:50%;top:50%;width:6px;height:6px;margin:-3px 0 0 -3px;background:#eaffee;border-radius:3px;opacity:0;z-index:20;pointer-events:none;box-shadow:0 0 10px 3px #b6ffc8,0 0 34px 10px rgba(51,255,102,.55)}
#intro .radar{width:min(122.6vh,96vw);aspect-ratio:4/3;max-height:92vh}
#intro .corre{position:absolute;inset:0;overflow:hidden;z-index:10;pointer-events:none}
#intro .world{position:absolute;left:0;top:0;transform-origin:0 0;z-index:2;pointer-events:none;will-change:transform}
#intro .world>*{position:absolute;pointer-events:none}
#intro .alarmeW{opacity:0}
#intro .alarmeW.on{animation:alarme .7s ease-in-out infinite alternate}
@keyframes alarme{from{opacity:.1}to{opacity:.34}}
#intro .play{font:inherit;font-size:1.1rem;letter-spacing:.12em;color:#fff;background:transparent;border:1px solid #fff;padding:12px 34px;cursor:pointer;border-radius:0;transition:background .2s,color .2s}
#intro .play:hover{background:#fff;color:#000}
#intro .fala{max-width:720px;padding:0 24px;text-align:center;color:#e8e8e8;font-family:Georgia,"Times New Roman",serif;font-size:clamp(1.3rem,2.6vw,2.3rem);line-height:1.4;opacity:0;animation:fala 13s linear forwards}
@keyframes fala{0%{opacity:0;transform:translateY(34px)}15%{opacity:1}100%{opacity:1;transform:translateY(-34px)}}
#intro .skip{position:absolute;right:28px;bottom:24px;font:inherit;font-size:1rem;letter-spacing:.15em;color:#777;background:transparent;border:0;padding:8px 10px;cursor:pointer;opacity:0;animation:autor 1s ease 1.5s forwards;transition:color .2s}
#intro .skip:hover{color:#fff}
#intro .fala small{display:block;margin-top:18px;font-size:.5em;color:#9a9a9a;font-style:italic;opacity:0;animation:autor 1.2s ease 7s forwards}
@keyframes autor{to{opacity:1}}
#intro h1{margin:0;font-weight:normal;font-size:clamp(2.2rem,8vw,5.2rem);letter-spacing:.4em;padding-left:.4em;text-align:center}
#intro h2{margin:0 0 38px;font-weight:normal;font-size:clamp(1.1rem,2.6vw,1.7rem);letter-spacing:.18em;text-align:center;min-height:1.3em}
#intro .cur{display:inline-block;width:.55em;height:1em;margin-left:.1em;background:#33ff66;vertical-align:-.1em;animation:cur 1s steps(1) infinite}
@keyframes cur{50%{opacity:0}}
#intro .scr.esq{align-items:flex-start;justify-content:flex-start;padding:11vh 7vw}
#intro .esq h1{text-align:left;padding-left:0;font-size:clamp(2rem,6vw,4.2rem)}
#intro .menu{display:flex;flex-direction:column;align-items:flex-start;gap:14px;margin-top:48px}
#intro .menu .go{margin-top:0;font-size:1.05rem}
#intro .cred{line-height:1.7;font-size:clamp(.95rem,1.6vw,1.2rem);margin-bottom:10px}
#intro .cred div{opacity:0;animation:autor .7s ease forwards;margin-bottom:6px}
#intro .cred .t{letter-spacing:.3em;margin-bottom:14px}
#intro .cred .k{opacity:.6}
#intro .go{font:inherit;font-size:1.15rem;letter-spacing:.12em;margin-top:60px;color:#33ff66;background:transparent;border:1px solid #33ff66;padding:12px 30px;cursor:pointer;border-radius:0;text-shadow:inherit;opacity:0;transition:opacity .6s,background .15s,color .15s}
#intro .go.on{opacity:1}
#intro .go:hover{background:#33ff66;color:#020a02;text-shadow:none}
#intro .band{display:flex;gap:40px;flex-wrap:wrap;justify-content:center;opacity:0;transition:opacity .8s;pointer-events:none}
#intro .band.on{opacity:1;pointer-events:auto}
#intro .band figure{margin:0;display:flex;flex-direction:column;align-items:center;cursor:pointer;transition:transform .15s}
#intro .band figure:hover{transform:translateY(-5px)}
#intro .band img{display:block;width:min(320px,78vw);aspect-ratio:4/3;object-fit:cover;border:2px solid #33ff66;box-shadow:0 0 10px rgba(51,255,102,.45);transition:box-shadow .15s}
#intro .band figure:hover img{box-shadow:0 0 26px #33ff66}
#intro .band figcaption{margin-top:16px;text-align:center}
#intro .band .sg{font-size:1.4rem;letter-spacing:.25em;padding-left:.25em}
#intro .band .sig{font-size:.8rem;letter-spacing:.08em;opacity:.75;margin-top:6px}
`;

const root = document.createElement('div');
root.id = 'intro';
const st = document.createElement('style');
st.textContent = css;
document.head.appendChild(st);
document.body.appendChild(root);
const alvoUI = (e) => e && e.closest && e.closest('button,figure');
root.addEventListener('mouseover', e => { const x = alvoUI(e.target); if (x && x !== alvoUI(e.relatedTarget)) SFX.hover(); });
root.addEventListener('click', e => { if (alvoUI(e.target)) SFX.click(); });

const tela = (html = '') => { const d = document.createElement('div'); d.className = 'scr'; d.innerHTML = html; root.appendChild(d); return d; };
const limpar = () => root.querySelectorAll('.scr').forEach(e => e.remove());
const el = (cls, tag = 'div') => { const d = document.createElement(tag); d.className = cls; return d; };

async function digitar(elm, texto, ms) {
  const t = document.createTextNode(''); elm.textContent = ''; elm.appendChild(t);
  const c = el('cur', 'span'); elm.appendChild(c);
  for (const ch of texto) { t.nodeValue += ch; if (ch !== ' ') SFX.tecla(); await sleep(ms); }
  return c;
}

async function ligarTV() {
  const bg = el('crtbg'), noise = el('noise', 'canvas'), scan = el('scan'), vig = el('vig'), flash = el('flash'), roll = el('roll');
  noise.width = 192; noise.height = 108;
  bg.append(noise, scan, vig, roll, flash);
  const dot = el('dot');
  root.append(bg, dot);

  const nctx = noise.getContext('2d'), img = nctx.createImageData(192, 108);
  let ruido = true;
  const tick = () => {
    if (!ruido) return;
    const d = img.data;
    for (let i = 0; i < d.length; i += 4) { const v = Math.random() * 255 | 0; d[i] = v * .55; d[i + 1] = v; d[i + 2] = v * .6; d[i + 3] = 255; }
    nctx.putImageData(img, 0, 0); requestAnimationFrame(tick);
  };
  tick();

  await sleep(500);
  SFX.tv();
  dot.animate([{ opacity: 0, transform: 'scale(.3)' }, { opacity: 1, transform: 'scale(1)' }], { duration: 160, fill: 'forwards' });
  await sleep(380);
  dot.animate([{ transform: 'scale(1)' }, { transform: 'scale(1.6)' }, { transform: 'scale(1)' }], { duration: 160 });
  await sleep(160);

  await dot.animate([
    { width: '6px', height: '6px', margin: '-3px 0 0 -3px', borderRadius: '3px' },
    { width: '100vw', height: '3px', margin: '-1.5px 0 0 -50vw', borderRadius: '0px' }
  ], { duration: 420, easing: 'cubic-bezier(.6,0,.9,.4)', fill: 'forwards' }).finished;
  await sleep(140);

  dot.animate([{ opacity: 1 }, { opacity: 1, offset: .35 }, { opacity: 0 }], { duration: 520, fill: 'forwards' });
  bg.animate([
    { clipPath: 'inset(calc(50% - 1.5px) 0 calc(50% - 1.5px) 0)', filter: 'brightness(3)' },
    { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1.4)', offset: .7 },
    { clipPath: 'inset(0 0 0 0)', filter: 'brightness(1)' }
  ], { duration: 640, easing: 'cubic-bezier(.15,.7,.2,1)', fill: 'forwards' });
  flash.animate([{ opacity: .85 }, { opacity: 0 }], { duration: 520, easing: 'ease-out', fill: 'forwards' });
  await sleep(640);

  const jit = bg.animate([
    { transform: 'translateX(0) scaleY(1)' }, { transform: 'translateX(-9px) skewX(1.2deg)', offset: .1 },
    { transform: 'translateX(5px) scaleY(1.01)', offset: .2 }, { transform: 'translateX(0)', offset: .3 },
    { transform: 'translateX(7px) skewX(-.8deg)', offset: .42 }, { transform: 'translateX(-3px)', offset: .55 },
    { transform: 'translateX(0)', offset: .7 }, { transform: 'translateX(-2px)', offset: .85 }, { transform: 'translateX(0)' }
  ], { duration: 650, easing: 'steps(1)' });
  roll.animate([{ top: '-25%', opacity: 1 }, { top: '115%', opacity: 1 }], { duration: 900, easing: 'linear', iterations: 2 });
  bg.animate([{ filter: 'brightness(1)' }, { filter: 'brightness(1.5)', offset: .15 }, { filter: 'brightness(.8)', offset: .3 }, { filter: 'brightness(1.25)', offset: .45 }, { filter: 'brightness(.95)', offset: .65 }, { filter: 'brightness(1)' }], { duration: 900 });
  noise.animate([{ opacity: .55 }, { opacity: .4, offset: .4 }, { opacity: 0 }], { duration: 1100, easing: 'ease-in', fill: 'forwards' });
  await sleep(1100);
  ruido = false; dot.remove(); noise.remove();
  await jit.finished.catch(() => {});
}


function desenharRadar(ctx, t, T) {
  const W = ctx.canvas.width, H = ctx.canvas.height, CX = W / 2, CY = H / 2, R = 330, TAU = Math.PI * 2;
  const mix = (a, b, k) => Math.round(a + (b - a) * k);
  const tom = 0;
  const col = (a) => `rgba(${mix(51, 255, tom)},${mix(255, 60, tom)},${mix(102, 50, tom)},${a})`;
  const periodo = 2.2, fase = (t / periodo) % 1, phi = fase * TAU;
  ctx.clearRect(0, 0, W, H);
  ctx.lineWidth = 2;
  ctx.strokeStyle = col(.35);
  for (let k = 1; k <= 4; k++) { ctx.beginPath(); ctx.arc(CX, CY, R * k / 4, 0, TAU); ctx.stroke(); }
  ctx.strokeStyle = col(.25);
  ctx.beginPath(); ctx.moveTo(CX - R, CY); ctx.lineTo(CX + R, CY); ctx.moveTo(CX, CY - R); ctx.lineTo(CX, CY + R); ctx.stroke();
  ctx.strokeStyle = col(.12);
  ctx.beginPath(); for (const d of [Math.PI / 4, 3 * Math.PI / 4]) { ctx.moveTo(CX - Math.cos(d) * R, CY - Math.sin(d) * R); ctx.lineTo(CX + Math.cos(d) * R, CY + Math.sin(d) * R); } ctx.stroke();
  ctx.strokeStyle = col(.7); ctx.fillStyle = col(.8); ctx.font = '16px "Courier New",monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  for (let i = 0; i < 72; i++) {
    const a = i / 72 * TAU - Math.PI / 2, len = i % 6 === 0 ? 20 : i % 2 === 0 ? 12 : 7;
    ctx.beginPath(); ctx.moveTo(CX + Math.cos(a) * R, CY + Math.sin(a) * R); ctx.lineTo(CX + Math.cos(a) * (R + len), CY + Math.sin(a) * (R + len)); ctx.stroke();
    if (i % 6 === 0) ctx.fillText(String(i * 5).padStart(3, '0'), CX + Math.cos(a) * (R + 40), CY + Math.sin(a) * (R + 40));
  }
  const luz = (ang) => { const d = ((phi - ang) % TAU + TAU) % TAU; return Math.pow(Math.max(0, 1 - d / (TAU * .85)), 2); };
  const trail = TAU * .22, ini = phi - Math.PI / 2 - trail;
  const g = ctx.createConicGradient(ini, CX, CY);
  g.addColorStop(0, col(0)); g.addColorStop(trail / TAU, col(.5)); g.addColorStop(Math.min(1, trail / TAU + .0001), col(0)); g.addColorStop(1, col(0));
  ctx.save(); ctx.beginPath(); ctx.arc(CX, CY, R, 0, TAU); ctx.clip();
  ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(CX, CY); ctx.arc(CX, CY, R, ini, phi - Math.PI / 2); ctx.closePath(); ctx.fill();
  ctx.restore();
  ctx.save(); ctx.strokeStyle = col(.95); ctx.lineWidth = 3; ctx.shadowColor = col(1); ctx.shadowBlur = 14;
  ctx.beginPath(); ctx.moveTo(CX, CY); ctx.lineTo(CX + Math.cos(phi - Math.PI / 2) * R, CY + Math.sin(phi - Math.PI / 2) * R); ctx.stroke(); ctx.restore();
  const bx = CX + Math.sin(T.alvo.a) * T.alvo.r * R, by = CY - Math.cos(T.alvo.a) * T.alvo.r * R;
  const visto = t >= T.alvo.a / TAU * periodo;
  if (visto) {
    const base = Math.max(luz(T.alvo.a), t >= T.ping ? .55 : 0), pisca = t >= T.alarme ? (Math.floor(t * 6) % 2 ? 1 : .35) : 1;
    ctx.save(); ctx.fillStyle = col(Math.min(1, base) * pisca); ctx.shadowColor = col(1); ctx.shadowBlur = 16;
    const s = t >= T.ping ? 14 + Math.sin(t * 9) * 2 : 10; ctx.fillRect(bx - s / 2, by - s / 2, s, s); ctx.restore();
  }
  if (t >= T.ping) {
    for (let i = 0; i < 3; i++) {
      const u = (t - T.ping - i * .7) / 1.6; if (u < 0 || u > 1) continue;
      ctx.strokeStyle = col((1 - u) * .8); ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(bx, by, 10 + u * 130, 0, TAU); ctx.stroke();
    }
    const u = Math.min(1, (t - T.ping - .3) / .5);
    if (u > 0) {
      const h = 70 - u * 44, l = 14; ctx.strokeStyle = col(.95); ctx.lineWidth = 3;
      for (const [sx, sy] of [[-1, -1], [1, -1], [1, 1], [-1, 1]]) {
        ctx.beginPath(); ctx.moveTo(bx + sx * h, by + sy * (h - l)); ctx.lineTo(bx + sx * h, by + sy * h); ctx.lineTo(bx + sx * (h - l), by + sy * h); ctx.stroke();
      }
    }
  }
}

// imagens da sala com a tela magenta já recortada (assets/cenas/sala_*_buraco.png) e posição da tela (x, y, largura, altura)
const SALAS = { 1: { src: 'assets/cenas/sala_otan_buraco.png', r: [594, 327, 189, 150], mesa: 512 }, 2: { src: 'assets/cenas/sala_ovd_buraco.png', r: [602, 318, 172, 135], mesa: 510 } };
async function prepararSala(lado) {
  const S = SALAS[lado], img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = S.src; });
  if (!img) return null;
  const pad = 3, rect = { x: S.r[0] - pad, y: S.r[1] - pad, w: S.r[2] + pad * 2, h: S.r[3] + pad * 2 };
  rect.mesa = S.mesa; rect.cx = rect.x + rect.w / 2; rect.cy = rect.y + rect.h / 2;
  return { img, W: 1376, H: 768, NW: img.naturalWidth, NH: img.naturalHeight, rect }; // W/H = espaço lógico das coordenadas; NW/NH = resolução real da imagem (pode ser maior, ex.: upscale 3x)
}

// tiras com 6 quadros da corrida (assets/intro/correndo_*.png): largura/altura de cada quadro e direção da corrida
const CORRIDA = { 1: { src: 'assets/intro/correndo_otan.png', fw: 389, fh: 433, dir: 1, vis: .66 }, 2: { src: 'assets/intro/correndo_ovd.png', fw: 314, fh: 530, dir: 1, vis: .62 } };
async function prepararCorrida(lado) {
  const C = CORRIDA[lado], img = await new Promise(r => { const i = new Image(); i.onload = () => r(i); i.onerror = () => r(null); i.src = C.src; });
  return img ? { ...C, fw: img.naturalWidth / 6, fh: img.naturalHeight } : null; // 6 quadros iguais lado a lado: o tamanho do quadro sai da própria imagem, então vale pra tira com upscale
}

async function cenaRadar(lado) {
  const salaP = prepararSala(lado), corP = prepararCorrida(lado);
  root.querySelectorAll('.scr').forEach(e => e.animate([{ opacity: 1 }, { opacity: 0 }], { duration: 500, fill: 'forwards' }));
  await sleep(500);
  limpar();
  const sala = await salaP, cor = await corP, crt = root.querySelector('.crtbg');
  const VW = root.clientWidth, VH = root.clientHeight;
  const IW = sala ? sala.W : 1376, IH = sala ? sala.H : 768;
  const R = sala ? sala.rect : { x: IW / 2 - 95, y: IH / 2 - 75, w: 190, h: 150, cx: IW / 2, cy: IH / 2 };
  const S0 = Math.min(.92 * VH / R.h, .96 * VW / R.w), S1 = Math.max(VW / IW, VH / 360), CY1 = 190 + (VH / S1) / 2; // enquadramento final: monitor + só a parte de baixo das bandeiras (topo da câmera em y=190)
  const smooth = (u) => { u = Math.max(0, Math.min(1, u)); return u * u * u * (u * (6 * u - 15) + 10); };

  // mundo: tudo em coordenadas da imagem da sala; a câmera é só uma transformação
  const world = el('world'); world.style.width = IW + 'px'; world.style.height = IH + 'px';
  const sbg = el(''); Object.assign(sbg.style, { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px', opacity: 0, background: 'radial-gradient(ellipse at center,#06180a 0%,#020a02 70%)' });
  const alA = el('alarmeW'); Object.assign(alA.style, { left: '-4000px', top: '-4000px', width: (IW + 8000) + 'px', height: (IH + 8000) + 'px', background: 'rgb(255,25,15)' });
  const cv = document.createElement('canvas'); cv.height = 768; cv.width = Math.round(768 * R.w / R.h);
  Object.assign(cv.style, { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px' });
  world.append(sbg, alA, cv);
  let alB = null, fadeSala = null;
  if (sala) {
    fadeSala = el(''); Object.assign(fadeSala.style, { left: 0, top: 0, width: IW + 'px', height: IH + 'px', opacity: 0 });
    const glow = el(''); Object.assign(glow.style, { left: (R.cx - R.w * 1.6) + 'px', top: (R.cy - R.h * 1.6) + 'px', width: R.w * 3.2 + 'px', height: R.h * 3.2 + 'px', mixBlendMode: 'screen', background: 'radial-gradient(ellipse at center,rgba(51,255,102,.16) 0%,rgba(51,255,102,.05) 45%,transparent 70%)' });
    alB = document.createElement('canvas'); alB.width = sala.NW; alB.height = sala.NH; alB.className = 'alarmeW';
    const bx = alB.getContext('2d'); bx.drawImage(sala.img, 0, 0); bx.globalCompositeOperation = 'source-in'; bx.fillStyle = 'rgb(255,25,15)'; bx.fillRect(0, 0, sala.NW, sala.NH);
    const brilho = el(''); Object.assign(brilho.style, { left: R.x + 'px', top: R.y + 'px', width: R.w + 'px', height: R.h + 'px', background: 'linear-gradient(125deg,rgba(255,255,255,.07) 0%,transparent 38%,transparent 100%)' });
    sala.img.style.cssText = 'position:absolute;left:0;top:0;width:' + IW + 'px;height:' + IH + 'px';
    alB.style.cssText = 'position:absolute;left:0;top:0;width:' + IW + 'px;height:' + IH + 'px';
    fadeSala.append(sala.img, glow, alB, brilho); world.appendChild(fadeSala);
  }
  const cam = (e, t) => {
    const S = S0 * Math.pow(S1 / S0, e), cx = R.cx + (IW / 2 - R.cx) * e, cy = R.cy + (CY1 - R.cy) * e, sw = Math.sin(e * Math.PI) * 2.2;
    world.style.transform = `translate(${VW / 2 - cx * S + Math.sin(t * 9) * sw}px,${VH / 2 - cy * S + Math.cos(t * 7.3) * sw}px) scale(${S})`;
  };
  cam(0, 0);
  const skip = el('skip', 'button'); skip.innerHTML = '&gt;&gt;&gt;'; skip.style.zIndex = 30;
  root.append(world, skip);
  cv.animate([{ opacity: 0 }, { opacity: 1 }], { duration: 1600, easing: 'ease-in', fill: 'forwards' });
  const T = { ping: 2.0, alarme: 5.0, zoom: 6.0, dur: 3.8, hold: 1.8, alvo: { a: 5.25, r: .56 } };

  // soldados correndo em primeiro plano: tira de 6 quadros (assets/intro/correndo_*.png), escuros e levemente fora de foco
  const tRun = T.zoom + T.dur + .2;
  const MESA = 0; // ajuste fino em px: positivo desce a cintura dos soldados, negativo sobe
  const waistY = ((R.mesa || (R.y + R.h)) - 190) * S1 + MESA; // topo da mesa do radar na tela (enquadramento final): a cintura dos soldados fica nele
  let runners = [], tFim = T.zoom + T.dur + T.hold;
  if (sala && cor) {
    const corre = el('corre'); root.insertBefore(corre, skip);
    // ALTURA = parte visível do soldado (cabeça até a cintura) em fração da altura da tela; independe da resolução da imagem
    const ALTURA = .62, FADE = .14;
    const ks = [1, .94, .97, .92, .95], dl = [0, .42, .8, 1.15, 1.6], du = [1.8, 2.1, 1.9, 2.2, 2.0], ph = [0, 2.3, 4.1, 1.2, 3.4], br = [.85, .72, .8, .68, .76];
    runners = ks.map((k, i) => {
      const h = ALTURA * VH * k / cor.vis, sc = h / cor.fh, w = Math.round(cor.fw * sc), d = document.createElement('div');
      const corte = cor.vis / (cor.vis + FADE) * 100;
      d.style.cssText = `position:absolute;left:0;top:0;width:${w}px;height:${h * (cor.vis + FADE)}px;background:url(${cor.src}) 0 0/${6 * w}px ${h}px no-repeat;-webkit-mask-image:linear-gradient(to bottom,#000 ${corte}%,transparent);mask-image:linear-gradient(to bottom,#000 ${corte}%,transparent);filter:brightness(${br[i]}) sepia(.25) blur(${k < .95 ? .8 : .4}px);will-change:transform;display:none;z-index:${Math.round(k * 10)}`;
      corre.appendChild(d); return { d, w, h, vis: cor.vis, dl: dl[i], du: du[i], ph: ph[i] };
    });
    tFim = tRun + Math.max(...runners.map(r => r.dl + r.du)) + .4;
  }
  const correr = (t) => {
    for (const r of runners) {
      const tt = t - tRun - r.dl, p = tt / r.du;
      if (p <= 0 || p >= 1) { r.d.style.display = 'none'; continue; }
      const ciclo = tt * 13 + r.ph, f = Math.floor(ciclo % 6), bob = Math.abs(Math.sin(ciclo / 6 * Math.PI * 2)) * r.h * .01;
      const x = cor.dir > 0 ? -r.w + (VW + r.w) * p : VW - (VW + r.w) * p, y = waistY - r.h * r.vis - bob;
      r.d.style.display = 'block'; r.d.style.backgroundPositionX = (-f * r.w) + 'px';
      r.d.style.transform = cor.dir > 0 ? `translate(${x}px,${y}px)` : `translate(${x + r.w}px,${y}px) scale(-1,1)`;
    }
  };

  const ctx = cv.getContext('2d');
  let somCorrer = null, sCorrer = false, ultN = -1, vivo = true, sPing = false, sAlarme = false, somAlarme = null, fim;
  const acabou = new Promise(r => fim = r);
  const t0 = performance.now();
  const quadro = () => {
    if (!vivo) return;
    const t = (performance.now() - t0) / 1000;
    desenharRadar(ctx, t, T);
    if (t >= T.ping && !sPing) { sPing = true; tocar('ping'); }
    if (runners.length && !sCorrer && t >= tRun - 1.0) { sCorrer = true; somCorrer = tocar('correndo'); } // 1.0 = segundos antes dos soldados aparecerem
    const nVarr = Math.floor(t / 2.2 - T.alvo.a / (Math.PI * 2)); // a barra (período 2.2s) passou sobre o alvo
    if (nVarr > ultN) { ultN = nVarr; if (t > T.ping + .05) tocar('ping'); }
    if (t >= T.alarme && !sAlarme) {
      sAlarme = true; alA.classList.add('on'); if (alB) alB.classList.add('on'); somAlarme = tocar('alarme', true);
      const vg = root.querySelector('.vig'); if (vg) { vg.style.transition = 'opacity .4s'; vg.style.opacity = 0; }
    }
    if (sala && t >= T.zoom) {
      const u = (t - T.zoom) / T.dur, e = smooth(u), f = smooth(u / .3);
      cam(e, t); fadeSala.style.opacity = f; sbg.style.opacity = f; crt.style.opacity = 1 - f;
      correr(t);
      if (t >= tFim) { vivo = false; fim(); return; }
    } else if (!sala && t >= T.alarme + 2.5) { vivo = false; fim(); return; }
    requestAnimationFrame(quadro);
  };
  quadro();
  await Promise.race([acabou, new Promise(r => skip.onclick = r)]);
  vivo = false;
  fade(somAlarme, 1500); fade(somCorrer, 1500);
}

async function intro() {
  let s = tela('<button class="play">Play</button>');
  await new Promise(r => s.querySelector('.play').onclick = r);
  limpar();

  const t2 = tela('<div class="fala">“Freedom is indivisible, and when one man is enslaved, all are not free.”<small>— John F. Kennedy, Berlin, 1963</small></div><button class="skip">&gt;&gt;&gt;</button>');
  const pt = document.createElement('div');
  pt.style.cssText = 'position:fixed;top:6px;right:6px;width:6px;height:6px;border-radius:50%;background:#fff;opacity:.35;cursor:pointer;z-index:99';
  pt.onclick = () => { Luft.C.PONTOS_INICIAIS = 999999; pt.style.background = '#4caf50'; pt.style.opacity = '1'; pt.onclick = null; };
  t2.appendChild(pt);
  const somK = tocar('kennedy');
  await Promise.race([sleep(13000), new Promise(r => t2.querySelector('.skip').onclick = r)]);
  fade(somK, 1500);
  const somMenu = tocar('menu', true);
  limpar();

  await ligarTV();
  root.classList.add('term');
  const t3 = tela('<h1></h1><div class="menu"></div>');
  t3.classList.add('esq');
  await sleep(300);
  await digitar(t3.querySelector('h1'), 'LUFTBALLONS', 130);
  await sleep(500);
  const menu = t3.querySelector('.menu');
  const botao = (txt, fn) => { const b = el('go', 'button'); b.innerHTML = txt; b.onclick = fn; menu.appendChild(b); setTimeout(() => b.classList.add('on'), 40); };
  const CRED = [['Desenvolvedor principal', 'Luiz E.'], ['Parte gráfica', 'AI'], ['Dublagem', 'Luiz E., GRdolzan, GBmoser'], ['Efeitos sonoros', 'Warthunder, Escape from Tarkov']];
  await new Promise(res => {
    const principal = () => { menu.innerHTML = ''; botao('&gt; Iniciar', res); botao('&gt; Créditos', creditos); };
    const creditos = () => {
      menu.innerHTML = '';
      const c = el('cred');
      c.innerHTML = '<div class="t">CRÉDITOS</div>' + CRED.map(([k, v], n) => `<div style="animation-delay:${(n + 1) * .3}s"><span class="k">${k}:</span> ${v}</div>`).join('');
      menu.appendChild(c);
      botao('&gt; Voltar', principal);
    };
    principal();
  });
  limpar();

  const t4 = tela('<h2></h2><div class="band"></div>');
  const band = t4.querySelector('.band');
  const lado = await new Promise(async (res) => {
    for (const l of [1, 2]) {
      const fig = document.createElement('figure');
      const img = document.createElement('img'); img.src = FLAGS[l]; img.alt = NOMES[l]; img.draggable = false;
      const cap = document.createElement('figcaption');
      cap.innerHTML = `<div class="sg">${NOMES[l]}</div><div class="sig">${SIGNIF[l]}</div>`;
      fig.append(img, cap);
      fig.onclick = () => res(l);
      band.appendChild(fig);
    }
    await digitar(t4.querySelector('h2'), 'Escolha o seu lado', 55);
    band.classList.add('on');
  });
  SFX.humOff(); fade(somMenu, 2000);
  await cenaRadar(lado);
  root.style.opacity = '0';
  await sleep(500);
  root.remove(); st.remove();
  Luft.iniciar(lado);
}
intro();
})();