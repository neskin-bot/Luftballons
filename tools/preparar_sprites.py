"""Converte os JPEGs com fundo magenta em PNGs transparentes, recorta poses e gera assets.json.
Uso: python preparar_sprites.py <pasta_uploads> <pasta_saida>"""
import sys, json, os
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

SRC, OUT = sys.argv[1], sys.argv[2]
os.makedirs(OUT, exist_ok=True)

# id: (arquivo, facing original 'L'/'R', n_poses esperadas ou None)
S = {}
def add(i, f, face, n=None): S[i] = (f, face, n)
for lado, suf, fac in (("ovd", "", "L"), ("otan", "_1", "L")):
    pass
# infantaria (todos viram para a direita)
for lado, suf in (("ovd", ""), ("otan", "_1")):
    add(f"{lado}_at", f"AT{suf}.jpeg", "R", 2)
    add(f"{lado}_molotov", f"AT_molotov{suf}.jpeg", "R", 3)
    add(f"{lado}_fuz_a", f"Fuzileiro_A{suf}.jpeg", "R", 2)
    add(f"{lado}_fuz_b", f"Fuzileiro_B{suf}.jpeg", "R", 2)
    add(f"{lado}_smg_a", f"SMG_A{suf}.jpeg", "R", 2)
    add(f"{lado}_smg_b", f"SMG_B{suf}.jpeg", "R", None)  # OVD tem 3 (idle duplicado)
# OVD
for i, f, fa in (("ovd_leve","BMP-1.jpeg","L"),("ovd_medio","T-54.jpeg","L"),("ovd_pesado","T-10M.jpeg","L"),
                 ("ovd_art_body","2S1_body.jpeg","L"),("ovd_art_gun","2S1_gun.jpeg","R"),
                 ("ovd_aa_body","ZSU-57-2_body.jpg","L"),("ovd_aa_gun","ZSU-57-2_cannon.jpg","L"),
                 ("ovd_caminhao","ZIL-157.jpeg","L"),("ovd_aviao","SU-7B.jpeg","L"),("ovd_bomba","FAB-500.jpeg","R")):
    add(i, f, fa)
# OTAN
for i, f, fa in (("otan_leve","WalkerBulldog.jpeg","L"),("otan_medio","M48_-_PATTON.jpeg","L"),("otan_pesado","M103.jpeg","R"),
                 ("otan_art_body","M55_body.jpg","L"),("otan_art_gun","M35_gun.jpeg","R"),
                 ("otan_aa_body","VADS_body.jpeg","R"),("otan_aa_gun","VADS_gun.jpeg","R"),
                 ("otan_caminhao","M35.jpeg","R"),("otan_aviao","F-84F_1.jpeg","R"),("otan_bomba","MK84.jpeg","R")):
    add(i, f, fa)

def keyed(im, preencher=True):
    a = np.asarray(im.convert("RGB")).astype(int)
    R, G, B = a[..., 0], a[..., 1], a[..., 2]
    strong = (R - G > 110) & (B - G > 110) & (abs(R - B) < 80)
    lab, n = ndi.label(strong)
    edge = set(np.unique(np.concatenate([lab[0], lab[-1], lab[:, 0], lab[:, -1]]))) - {0}
    bg = np.isin(lab, list(edge))
    # halo: pixels rosados vizinhos do fundo
    weak = (R - G > 55) & (B - G > 55) & (abs(R - B) < 90)
    bg |= ndi.binary_dilation(bg, iterations=2) & weak
    # magenta interno (grades, vãos entre rodas) vira cinza escuro opaco
    if not preencher:
        bg |= strong
    interior = (strong | ((R - G > 40) & (B - G > 40) & (abs(R - B) < 90))) & ~bg
    a = a.astype(np.uint8)
    a[interior] = (45, 48, 45)
    rgba = np.dstack([a, np.where(bg, 0, 255).astype(np.uint8)])
    return rgba

def remove_ground_lines(rgba):
    al = rgba[..., 3] > 0
    H, W = al.shape
    dark = al & (rgba[..., :3].max(axis=2) < 55)
    for y in range(int(H * 0.85), H):
        lab, n = ndi.label(dark[y])
        for k in range(1, n + 1):
            xs = np.where(lab == k)[0]
            if len(xs) >= 200:
                rgba[y, xs, 3] = 0
    return rgba

def bbox(rgba):
    ys, xs = np.where(rgba[..., 3] > 0)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1

def split(rgba, gap=6, minw=30):
    cols = (rgba[..., 3] > 0).any(axis=0)
    segs, start, last = [], None, None
    for x, v in enumerate(cols):
        if v:
            if start is None: start = x
            last = x
        elif start is not None and x - last > gap:
            segs.append((start, last + 1)); start = None
    if start is not None: segs.append((start, last + 1))
    return [s for s in segs if s[1] - s[0] >= minw]

def clean_small(rgba, minpix=40):
    lab, n = ndi.label(rgba[..., 3] > 0)
    sizes = ndi.sum(np.ones_like(lab), lab, range(1, n + 1))
    for k, s in enumerate(sizes, 1):
        if s < minpix: rgba[lab == k, 3] = 0
    return rgba

CENTROS = {"ovd_molotov":[300,760,1170],"otan_molotov":[330,720,1130],"otan_fuz_a":[330,960]}

def split_comp(rgba, centros):
    lab, n = ndi.label(rgba[..., 3] > 0)
    grupos = [np.zeros(lab.shape, bool) for _ in centros]
    for k in range(1, n + 1):
        m = lab == k
        cx = np.where(m.any(axis=0))[0].mean()
        grupos[int(np.argmin([abs(cx - c) for c in centros]))] |= m
    out = []
    for g in grupos:
        r = rgba.copy(); r[~g, 3] = 0
        out.append(r)
    return out

meta = {}
for sid, (fname, face, n) in S.items():
    p = os.path.join(SRC, fname)
    if not os.path.exists(p):
        print("FALTA", fname); continue
    rgba = clean_small(keyed(Image.open(p), preencher=not (n is not None or 'smg_b' in sid)))
    infantry = n is not None or sid.endswith("_b") and False
    if n is not None or "smg_b" in sid:
        rgba = remove_ground_lines(rgba)
        rgba = clean_small(rgba)
        poses = []
        if sid in CENTROS:
            for r in split_comp(rgba, CENTROS[sid]):
                bx0, by0, bx1, by1 = bbox(r); poses.append(r[by0:by1, bx0:bx1])
        else:
          for x0, x1 in split(rgba):
              sub = rgba[:, x0:x1]
              bx0, by0, bx1, by1 = bbox(sub)
              poses.append(sub[by0:by1, bx0:bx1])
        names = []
        for i, im in enumerate(poses):
            nm = f"{sid}_{i}"
            Image.fromarray(im).save(os.path.join(OUT, nm + ".png"))
            names.append({"file": nm + ".png", "w": im.shape[1], "h": im.shape[0]})
        meta[sid] = {"facing": face, "poses": names, "esperado": n}
        if n and len(poses) != n: print("ATENCAO", sid, "poses:", len(poses), "esperado:", n)
    else:
        bx0, by0, bx1, by1 = bbox(rgba)
        im = rgba[by0:by1, bx0:bx1]
        Image.fromarray(im).save(os.path.join(OUT, sid + ".png"))
        meta[sid] = {"facing": face, "file": sid + ".png", "w": im.shape[1], "h": im.shape[0]}
json.dump(meta, open(os.path.join(OUT, "assets.json"), "w"), indent=1)
print("ok", len(meta))
