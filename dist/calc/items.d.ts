import { Generation, TypeName, StatID } from './data/interface';
export declare const SEED_BOOSTED_STAT: {
    [item: string]: StatID;
};
export declare function getItemBoostType(item: string | undefined): "Normal" | "Lucha" | "Volador" | "Veneno" | "Tierra" | "Roca" | "Bicho" | "Fantasma" | "Acero" | "Fuego" | "Agua" | "Planta" | "Eléctrico" | "Psíquico" | "Hielo" | "Dragón" | "Siniestro" | "Hada" | undefined;
export declare function getBerryResistType(berry: string | undefined): "Normal" | "Lucha" | "Volador" | "Veneno" | "Tierra" | "Roca" | "Bicho" | "Fantasma" | "Acero" | "Fuego" | "Agua" | "Planta" | "Eléctrico" | "Psíquico" | "Hielo" | "Dragón" | "Siniestro" | "Hada" | undefined;
export declare function getFlingPower(item?: string): 0 | 20 | 10 | 30 | 100 | 40 | 60 | 50 | 85 | 130 | 110 | 95 | 90 | 80 | 70;
export declare function getNaturalGift(gen: Generation, item: string): {
    t: TypeName;
    p: number;
};
export declare function getTechnoBlast(item: string): "Fuego" | "Agua" | "Eléctrico" | "Hielo" | undefined;
export declare function getMultiAttack(item: string): TypeName | undefined;
