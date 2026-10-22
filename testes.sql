-- 1) vida dos personagens
SELECT id_personagem, nome_batalha, hp_atual, hp_maximo FROM personagem;

-- 2) dano persistente (molotov)
SELECT * FROM turno;

-- 3) itens de cada personagem
SELECT p.nome_batalha, i.nome AS item, inv.quantidade
FROM inventario inv
JOIN personagem p ON p.id_personagem = inv.id_personagem
JOIN item i ON i.id_item = inv.id_item
ORDER BY p.id_personagem, i.id_item;