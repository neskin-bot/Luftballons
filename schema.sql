drop table if exists turno cascade;
drop table if exists partida cascade;
drop table if exists inventario cascade;
drop table if exists item cascade;
drop table if exists personagem cascade;
drop table if exists jogador cascade;

create table jogador (
    id_jogador      serial primary key,
    nome            varchar(100) not null,
    email           varchar(150) not null unique,
    data_cadastro   timestamp not null default current_timestamp
);

create table personagem (
    id_personagem   serial primary key,
    id_jogador      integer not null,
    nome_batalha    varchar(100) not null,
    classe          varchar(50) not null,
    nivel           integer not null default 1 check (nivel > 0),
    hp_maximo       integer not null check (hp_maximo > 0),
    hp_atual        integer not null check (hp_atual >= 0),
    ataque_basico   integer not null check (ataque_basico >= 0),
    defesa          integer not null check (defesa >= 0),
    constraint fk_personagem_jogador
        foreign key (id_jogador) references jogador (id_jogador)
        on delete cascade on update cascade,
    constraint chk_hp_atual_maximo check (hp_atual <= hp_maximo)
);

create table item (
    id_item         serial primary key,
    nome            varchar(100) not null unique,
    descricao       varchar(255) not null,
    tipo            varchar(50) not null
        check (tipo in ('Cura Instantanea', 'Bonus Temporario de Ataque',
                         'Protecao Escudo', 'Dano em Area')),
    valor_efeito    integer not null check (valor_efeito >= 0)
);

create table inventario (
    id_personagem   integer not null,
    id_item         integer not null,
    quantidade      integer not null default 0 check (quantidade >= 0),
    primary key (id_personagem, id_item),
    constraint fk_inventario_personagem
        foreign key (id_personagem) references personagem (id_personagem)
        on delete cascade on update cascade,
    constraint fk_inventario_item
        foreign key (id_item) references item (id_item)
        on delete restrict on update cascade
);

create table partida (
    id_partida      serial primary key,
    id_desafiante   integer not null,
    id_oponente     integer not null,
    id_vencedor     integer null,
    inicio          timestamp not null default current_timestamp,
    fim             timestamp null,
    status          varchar(20) not null default 'Em Andamento'
        check (status in ('Em Andamento', 'Finalizada', 'Cancelada')),
    constraint fk_partida_desafiante
        foreign key (id_desafiante) references personagem (id_personagem)
        on delete restrict on update cascade,
    constraint fk_partida_oponente
        foreign key (id_oponente) references personagem (id_personagem)
        on delete restrict on update cascade,
    constraint fk_partida_vencedor
        foreign key (id_vencedor) references personagem (id_personagem)
        on delete set null on update cascade,
    constraint chk_combatentes_distintos check (id_desafiante <> id_oponente),
    constraint chk_vencedor_participante check (
        id_vencedor is null
        or id_vencedor = id_desafiante
        or id_vencedor = id_oponente
    ),
    constraint chk_fim_apos_inicio check (fim is null or fim >= inicio),
    constraint chk_status_vencedor check (
        (status <> 'Finalizada') or (id_vencedor is not null)
    )
);

create table turno (
    id_turno        serial primary key,
    id_partida      integer not null,
    ordem_turno     integer not null check (ordem_turno > 0),
    id_personagem   integer not null,
    tipo_acao       varchar(30) not null
        check (tipo_acao in ('Ataque Basico', 'Habilidade Especial',
                              'Uso de Item', 'Passar a Vez', 'Fuga',
                              'Efeito Persistente')),
    id_item         integer null,
    valor_impacto   integer not null default 0,
    constraint fk_turno_partida
        foreign key (id_partida) references partida (id_partida)
        on delete cascade on update cascade,
    constraint fk_turno_personagem
        foreign key (id_personagem) references personagem (id_personagem)
        on delete restrict on update cascade,
    constraint fk_turno_item
        foreign key (id_item) references item (id_item)
        on delete set null on update cascade,
    constraint uq_ordem_por_partida unique (id_partida, ordem_turno),
    constraint chk_item_condizente check (
        (tipo_acao = 'Uso de Item' and id_item is not null)
        or (tipo_acao <> 'Uso de Item' and id_item is null)
    )
);