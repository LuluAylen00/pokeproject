import * as I from './interface';
import {toID, extend} from '../util';

export type TypeChart = {
  [type in I.TypeName]?: {[type in I.TypeName]?: number};
};

const RBY: TypeChart = {
  '???': {
    Normal: 1,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 1,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 1,
  },
  Normal: {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 0.5,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 0,
    'Dragón': 1,
  },
  Planta: {
    '???': 1,
    Normal: 1,
    Planta: 0.5,
    Fuego: 0.5,
    Agua: 2,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 0.5,
    Bicho: 0.5,
    Veneno: 0.5,
    Tierra: 2,
    Roca: 2,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 0.5,
  },
  Fuego: {
    '???': 1,
    Normal: 1,
    Planta: 2,
    Fuego: 0.5,
    Agua: 0.5,
    'Eléctrico': 1,
    Hielo: 2,
    Volador: 1,
    Bicho: 2,
    Veneno: 1,
    Tierra: 1,
    Roca: 0.5,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 0.5,
  },
  Agua: {
    '???': 1,
    Normal: 1,
    Planta: 0.5,
    Fuego: 2,
    Agua: 0.5,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 2,
    Roca: 2,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 0.5,
  },
  'Eléctrico': {
    '???': 1,
    Normal: 1,
    Planta: 0.5,
    Fuego: 1,
    Agua: 2,
    'Eléctrico': 0.5,
    Hielo: 1,
    Volador: 2,
    Bicho: 1,
    Veneno: 1,
    Tierra: 0,
    Roca: 1,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 0.5,
  },
  Hielo: {
    '???': 1,
    Normal: 1,
    Planta: 2,
    Fuego: 1,
    Agua: 0.5,
    'Eléctrico': 1,
    Hielo: 0.5,
    Volador: 2,
    Bicho: 1,
    Veneno: 1,
    Tierra: 2,
    Roca: 1,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 2,
  },
  Volador: {
    '???': 1,
    Normal: 1,
    Planta: 2,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 0.5,
    Hielo: 1,
    Volador: 1,
    Bicho: 2,
    Veneno: 1,
    Tierra: 1,
    Roca: 0.5,
    Lucha: 2,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 1,
  },
  Bicho: {
    '???': 1,
    Normal: 1,
    Planta: 2,
    Fuego: 0.5,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 0.5,
    Bicho: 1,
    Veneno: 2,
    Tierra: 1,
    Roca: 1,
    Lucha: 0.5,
    'Psíquico': 2,
    Fantasma: 0.5,
    'Dragón': 1,
  },
  Veneno: {
    '???': 1,
    Normal: 1,
    Planta: 2,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 2,
    Veneno: 0.5,
    Tierra: 0.5,
    Roca: 0.5,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 0.5,
    'Dragón': 1,
  },
  Tierra: {
    '???': 1,
    Normal: 1,
    Planta: 0.5,
    Fuego: 2,
    Agua: 1,
    'Eléctrico': 2,
    Hielo: 1,
    Volador: 0,
    Bicho: 0.5,
    Veneno: 2,
    Tierra: 1,
    Roca: 2,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 1,
  },
  Roca: {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 2,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 2,
    Volador: 2,
    Bicho: 2,
    Veneno: 1,
    Tierra: 0.5,
    Roca: 1,
    Lucha: 0.5,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 1,
  },
  Lucha: {
    '???': 1,
    Normal: 2,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 2,
    Volador: 0.5,
    Bicho: 0.5,
    Veneno: 0.5,
    Tierra: 1,
    Roca: 2,
    Lucha: 1,
    'Psíquico': 0.5,
    Fantasma: 0,
    'Dragón': 1,
  },
  'Psíquico': {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 2,
    Tierra: 1,
    Roca: 1,
    Lucha: 2,
    'Psíquico': 0.5,
    Fantasma: 1,
    'Dragón': 1,
  },
  Fantasma: {
    '???': 1,
    Normal: 0,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 1,
    Lucha: 1,
    'Psíquico': 0,
    Fantasma: 2,
    'Dragón': 1,
  },
  'Dragón': {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 1,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 2,
  },
};

const GSC: TypeChart = extend(true, {}, RBY, {
  '???': {Siniestro: 1, Acero: 1},
  Normal: {Siniestro: 1, Acero: 0.5},
  Planta: {Siniestro: 1, Acero: 0.5},
  Fuego: {Siniestro: 1, Acero: 2},
  Agua: {Siniestro: 1, Acero: 1},
  'Eléctrico': {Siniestro: 1, Acero: 1},
  Hielo: {Fuego: 0.5, Siniestro: 1, Acero: 0.5},
  Volador: {Siniestro: 1, Acero: 0.5},
  Bicho: {Veneno: 0.5, Siniestro: 2, Acero: 0.5},
  Veneno: {Bicho: 1, Siniestro: 1, Acero: 0},
  Tierra: {Siniestro: 1, Acero: 2},
  Roca: {Siniestro: 1, Acero: 0.5},
  Lucha: {Siniestro: 2, Acero: 2},
  'Psíquico': {Siniestro: 0, Acero: 0.5},
  Fantasma: {'Psíquico': 2, Siniestro: 0.5, Acero: 0.5},
  'Dragón': {Siniestro: 1, Acero: 0.5},
  Siniestro: {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 1,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 1,
    Lucha: 0.5,
    'Psíquico': 2,
    Fantasma: 2,
    'Dragón': 1,
    Siniestro: 0.5,
    Acero: 0.5,
  },
  Acero: {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 0.5,
    Agua: 0.5,
    'Eléctrico': 0.5,
    Hielo: 2,
    Volador: 1,
    Bicho: 1,
    Veneno: 1,
    Tierra: 1,
    Roca: 2,
    Lucha: 1,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 1,
    Siniestro: 1,
    Acero: 0.5,
  },
});

const ADV = GSC;

const DPP = GSC;

const BW = GSC;

const XY: TypeChart = extend(true, {}, GSC, {
  '???': {Hada: 1},
  Normal: {Hada: 1},
  Planta: {Hada: 1},
  Fuego: {Hada: 1},
  Agua: {Hada: 1},
  'Eléctrico': {Hada: 1},
  Hielo: {Hada: 1},
  Volador: {Hada: 1},
  Bicho: {Hada: 0.5},
  Veneno: {Hada: 2},
  Tierra: {Hada: 1},
  Roca: {Hada: 1},
  Lucha: {Hada: 0.5},
  'Psíquico': {Hada: 1},
  Fantasma: {Acero: 1, Hada: 1},
  'Dragón': {Hada: 0},
  Siniestro: {Acero: 1, Hada: 0.5},
  Acero: {Hada: 2},
  Hada: {
    '???': 1,
    Normal: 1,
    Planta: 1,
    Fuego: 0.5,
    Agua: 1,
    'Eléctrico': 1,
    Hielo: 1,
    Volador: 1,
    Bicho: 1,
    Veneno: 0.5,
    Tierra: 1,
    Roca: 1,
    Lucha: 2,
    'Psíquico': 1,
    Fantasma: 1,
    'Dragón': 2,
    Siniestro: 2,
    Acero: 0.5,
    Hada: 1,
  },
});

const SM = XY;

const SS = SM;

const SV = SS;

export const TYPE_CHART = [{}, RBY, GSC, ADV, DPP, BW, XY, SM, SS, SV];

export class Types implements I.Types {
  private readonly gen: I.GenerationNum;

  constructor(gen: I.GenerationNum) {
    this.gen = gen;
  }

  get(id: I.ID) {
    // toID('???') => '', as do many other things, but returning the '???' type seems appropriate :)
    return TYPES_BY_ID[this.gen][id];
  }

  *[Symbol.iterator]() {
    for (const id in TYPES_BY_ID[this.gen]) {
      yield this.get(id as I.ID)!;
    }
  }
}

class Type implements I.Type {
  readonly kind: 'Type';
  readonly id: I.ID;
  readonly name: I.TypeName;
  readonly effectiveness: Readonly<{[type in I.TypeName]?: I.TypeEffectiveness}>;

  constructor(name: string, effectiveness: TypeChart[I.TypeName]) {
    this.kind = 'Type';
    this.id = toID(name);
    this.name = name as I.TypeName;
    this.effectiveness = effectiveness! as {[type in I.TypeName]?: I.TypeEffectiveness};
  }
}

const TYPES_BY_ID: Array<{[id: string]: Type}> = [];

for (const typeChart of TYPE_CHART) {
  const map: {[id: string]: Type} = {};
  for (const type in typeChart) {
    const t = new Type(type, {...typeChart[type as I.TypeName]!});
    map[t.id] = t;
  }
  TYPES_BY_ID.push(map);
}
