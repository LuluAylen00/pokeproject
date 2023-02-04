import {Generation, Weather, Terrain, TypeName, ID} from './data/interface';
import {Field, Side} from './field';
import {Move} from './move';
import {Pokemon} from './pokemon';
import {Damage, damageRange} from './result';
import {error} from './util';
// NOTE: This needs to come last to simplify bundling
import {isGrounded} from './mechanics/util';

export interface RawDesc {
  HPEVs?: string;
  attackBoost?: number;
  attackEVs?: string;
  attackerAbility?: string;
  attackerItem?: string;
  attackerName: string;
  attackerTera?: string;
  defenderAbility?: string;
  defenderItem?: string;
  defenderName: string;
  defenderTera?: string;
  defenseBoost?: number;
  defenseEVs?: string;
  hits?: number;
  alliesFainted?: number;
  isBeadsOfRuin?: boolean;
  isSwordOfRuin?: boolean;
  isTabletsOfRuin?: boolean;
  isVesselOfRuin?: boolean;
  isAuroraVeil?: boolean;
  isFlowerGiftAttacker?: boolean;
  isFlowerGiftDefender?: boolean;
  isFriendGuard?: boolean;
  isHelpingHand?: boolean;
  isCritical?: boolean;
  isLightScreen?: boolean;
  isBurned?: boolean;
  isProtected?: boolean;
  isReflect?: boolean;
  isBattery?: boolean;
  isPowerSpot?: boolean;
  isWonderRoom?: boolean;
  isSwitching?: 'out' | 'in';
  moveBP?: number;
  moveName: string;
  moveTurns?: string;
  moveType?: TypeName;
  rivalry?: 'buffed' | 'nerfed';
  terrain?: Terrain;
  weather?: Weather;
  isDefenderDynamaxed?: boolean;
}

export function display(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  rawDesc: RawDesc,
  notation = '%',
  err = true
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = (typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1]) * move.hits;
  const max = (typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1]) * move.hits;

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const desc = buildDescription(rawDesc, attacker, defender);
  const damageText = `${min}-${max} (${minDisplay} - ${maxDisplay}${notation})`;

  if (move.category === 'Status' && !move.named('Nature Power')) return `${desc}: ${damageText}`;
  const koChanceText = getKOChance(gen, attacker, defender, move, field, damage, err).text;
  return koChanceText ? `${desc}: ${damageText} -- ${koChanceText}` : `${desc}: ${damageText}`;
}

export function displayMove(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = (typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1]) * move.hits;
  const max = (typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1]) * move.hits;

  const minDisplay = toDisplay(notation, min, defender.maxHP());
  const maxDisplay = toDisplay(notation, max, defender.maxHP());

  const recoveryText = getRecovery(gen, attacker, defender, move, damage, notation).text;
  const recoilText = getRecoil(gen, attacker, defender, move, damage, notation).text;

  return `${minDisplay} - ${maxDisplay}${notation}${recoveryText &&
    ` (${recoveryText})`}${recoilText && ` (${recoilText})`}`;
}

export function getRecovery(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const minD = typeof minDamage === 'number' ? [minDamage] : minDamage;
  const maxD = typeof maxDamage === 'number' ? [maxDamage] : maxDamage;

  const recovery = [0, 0] as [number, number];
  let text = '';

  const ignoresShellBell =
    gen.num === 3 && move.named('Doom Desire', 'Future Sight');
  if (attacker.hasItem('Shell Bell') && !ignoresShellBell) {
    const max = Math.round(defender.maxHP() / 8);
    for (let i = 0; i < minD.length; i++) {
      recovery[0] += Math.min(Math.round(minD[i] * move.hits / 8), max);
      recovery[1] += Math.min(Math.round(maxD[i] * move.hits / 8), max);
    }
  }

  if (move.named('G-Max Finale')) {
    recovery[0] = recovery[1] = Math.round(attacker.maxHP() / 6);
  }

  if (move.drain) {
    const percentHealed = move.drain[0] / move.drain[1];
    const max = Math.round(defender.maxHP() * percentHealed);
    for (let i = 0; i < minD.length; i++) {
      recovery[0] += Math.min(Math.round(minD[i] * move.hits * percentHealed), max);
      recovery[1] += Math.min(Math.round(maxD[i] * move.hits * percentHealed), max);
    }
  }

  if (recovery[1] === 0) return {recovery, text};

  const minHealthRecovered = toDisplay(notation, recovery[0], attacker.maxHP());
  const maxHealthRecovered = toDisplay(notation, recovery[1], attacker.maxHP());

  text = `${minHealthRecovered} - ${maxHealthRecovered}${notation} recuperado`;
  return {recovery, text};
}

// TODO: return daño de retroceso as exact HP
export function getRecoil(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  damage: Damage,
  notation = '%'
) {
  const [minDamage, maxDamage] = damageRange(damage);
  const min = (typeof minDamage === 'number' ? minDamage : minDamage[0] + minDamage[1]) * move.hits;
  const max = (typeof maxDamage === 'number' ? maxDamage : maxDamage[0] + maxDamage[1]) * move.hits;

  let recoil: [number, number] | number = [0, 0];
  let text = '';

  const damageOverflow = minDamage > defender.curHP() || maxDamage > defender.curHP();
  if (move.recoil) {
    const mod = (move.recoil[0] / move.recoil[1]) * 100;
    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * mod, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.curHP()) * mod, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.curHP()) * mod, attacker.maxHP(), 100
      );
    }
    if (!attacker.hasAbility('Rock Head')) {
      recoil = [minRecoilDamage, maxRecoilDamage];
      text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} daño de retroceso`;
    }
  } else if (move.hasCrashDamage) {
    const genMultiplier = gen.num === 2 ? 12.5 : gen.num >= 3 ? 50 : 1;

    let minRecoilDamage, maxRecoilDamage;
    if (damageOverflow && gen.num !== 2) {
      minRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
      maxRecoilDamage =
        toDisplay(notation, defender.curHP() * genMultiplier, attacker.maxHP(), 100);
    } else {
      minRecoilDamage = toDisplay(
        notation, Math.min(min, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
      maxRecoilDamage = toDisplay(
        notation, Math.min(max, defender.maxHP()) * genMultiplier, attacker.maxHP(), 100
      );
    }

    recoil = [minRecoilDamage, maxRecoilDamage];
    switch (gen.num) {
    case 1:
      recoil = toDisplay(notation, 1, attacker.maxHP());
      text = '1hp damage on miss';
      break;
    case 2: case 3: case 4:
      if (defender.hasType('Ghost')) {
        if (gen.num === 4) {
          const gen4CrashDamage = Math.floor(((defender.maxHP() * 0.5) / attacker.maxHP()) * 100);
          recoil = notation === '%' ? gen4CrashDamage : Math.floor((gen4CrashDamage / 100) * 48);
          text = `${gen4CrashDamage}% crash damage`;
        } else {
          recoil = 0;
          text = 'no crash damage on Ghost types';
        }
      } else {
        text = `${minRecoilDamage} - ${maxRecoilDamage}${notation} crash damage on miss`;
      }
      break;
    default:
      recoil = notation === '%' ? 24 : 50;
      text = '50% daño de caída ';
    }
  } else if (move.struggleRecoil) {
    recoil = notation === '%' ? 12 : 25;
    text = '25% struggle damage ';
    // Struggle recoil is actually rounded down in Gen 4 per DaWoblefet's research, but until we
    // return daño de retroceso as exact HP the best we can do is add some more text to this effect
    if (gen.num === 4) text += ' (rounded down)';
  } else if (move.mindBlownRecoil) {
    recoil = notation === '%' ? 24 : 50;
    text = '50% daño de retroceso';
  }

  return {recoil, text};
}

export function getKOChance(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field,
  damage: Damage,
  err = true
) {
  damage = combine(damage);
  if (isNaN(damage[0])) {
    error(err, 'damage[0] must be a number.');
    return {chance: 0, n: 0, text: ''};
  }
  if (damage[damage.length - 1] === 0) {
    error(err, 'damage[damage.length - 1] === 0.');
    return {chance: 0, n: 0, text: ''};
  }

  // Code doesn't really work if these aren't set.
  if (move.timesUsed === undefined) move.timesUsed = 1;
  if (move.timesUsedWithMetronome === undefined) move.timesUsedWithMetronome = 1;

  if (damage[0] >= defender.maxHP() && move.timesUsed === 1 && move.timesUsedWithMetronome === 1) {
    return {chance: 1, n: 1, text: 'KO en 1 golpe garantizado'};
  }

  const hazards = getHazards(gen, defender, field.defenderSide);
  const eot = getEndOfTurn(gen, attacker, defender, move, field);
  const toxicCounter =
     defender.hasStatus('tox') && !defender.hasAbility('Magic Guard') ? defender.toxicCounter : 0;

  // multi-hit moves have too many possibilities for brute-forcing to work, so reduce it
  // to an approximate distribution
  let qualifier = '';
  if (move.hits > 1) {
    qualifier = 'approx. ';
    damage = squashMultihit(gen, damage, move.hits, err);
  }

  const hazardsText = hazards.texts.length > 0
    ? ' después de ' + serializeText(hazards.texts)
    : '';
  const afterText =
    hazards.texts.length > 0 || eot.texts.length > 0
      ? ' después de ' + serializeText(hazards.texts.concat(eot.texts))
      : '';

  if ((move.timesUsed === 1 && move.timesUsedWithMetronome === 1) || move.isZ) {
    const chance = computeKOChance(
      damage, defender.curHP() - hazards.damage, 0, 1, 1, defender.maxHP(), toxicCounter
    );
    if (chance === 1) {
      return {chance, n: 1, text: `KO en 1 golpe garantizado${hazardsText}`}; // eot wasn't considered
    } else if (chance > 0) {
      // note: still not accounting for EOT due to poor eot damage handling
      return {
        chance,
        n: 1,
        text: qualifier + Math.round(chance * 1000) / 10 + `% posibilidades de KO en 1 golpe${hazardsText}`,
      };
    }

    // Parental Bond's combined first + second hit only is accurate for chance to OHKO, for
    // multihit KOs its only approximated. We should be doing squashMultihit here instead of
    // pretending we ar emore accurate than we are, but just throwing on an qualifer should be
    // sufficient.
    if (damage.length === 256) {
      qualifier = 'aprox. ';
      // damage = squashMultihit(gen, damage, move.hits, err);
    }

    for (let i = 2; i <= 4; i++) {
      const chance = computeKOChance(
        damage, defender.curHP() - hazards.damage, eot.damage, i, 1, defender.maxHP(), toxicCounter
      );
      if (chance === 1) {
        return {chance, n: i, text: `${qualifier || 'garantizado KO'} en ${i} golpes${afterText}`};
      } else if (chance > 0) {
        return {
          chance,
          n: i,
          text: qualifier + Math.round(chance * 1000) / 10 + `% chances de KO en ${i} golpes ${afterText}`,
        };
      }
    }

    for (let i = 5; i <= 9; i++) {
      if (
        predictTotal(damage[0], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        return {chance: 1, n: i, text: `${qualifier || 'KO en '}${i} garantizado${afterText}`};
      } else if (
        predictTotal(damage[damage.length - 1], eot.damage, i, 1, toxicCounter, defender.maxHP()) >=
        defender.curHP() - hazards.damage
      ) {
        return {n: i, text: qualifier + `posible KO en ${i} golpes${afterText}`};
      }
    }
  } else {
    const chance = computeKOChance(
      damage, defender.maxHP() - hazards.damage,
      eot.damage,
      move.hits || 1,
      move.timesUsed || 1,
      defender.maxHP(),
      toxicCounter
    );
    if (chance === 1) {
      return {
        chance,
        n: move.timesUsed,
        text: `${qualifier || 'garantizado '}KO en ${move.timesUsed} turnos${afterText}`,
      };
    } else if (chance > 0) {
      return {
        chance,
        n: move.timesUsed,
        text:
          qualifier +
          Math.round(chance * 1000) / 10 +
          `% chances de KO en ${move.timesUsed} golpes${afterText}`,
      };
    }

    if (predictTotal(
      damage[0],
      eot.damage,
      move.hits,
      move.timesUsed,
      toxicCounter,
      defender.maxHP()
    ) >=
      defender.curHP() - hazards.damage
    ) {
      return {
        chance: 1,
        n: move.timesUsed,
        text: `${qualifier || 'garantizado '}KO en ${move.timesUsed} turnos${afterText}`,
      };
    } else if (
      predictTotal(
        damage[damage.length - 1],
        eot.damage,
        move.hits,
        move.timesUsed,
        toxicCounter,
        defender.maxHP()
      ) >=
      defender.curHP() - hazards.damage
    ) {
      return {
        n: move.timesUsed,
        text: qualifier + `posible KO en ${move.timesUsed} turnos${afterText}`,
      };
    }
    return {n: move.timesUsed, text: qualifier + 'not a KO'};
  }

  return {chance: 0, n: 0, text: ''};
}

function combine(damage: Damage) {
  // Fixed Damage
  if (typeof damage === 'number') return [damage];
  // Standard Damage
  if (damage.length > 2) {
    if (damage[0] > damage[damage.length - 1]) damage = damage.slice().sort() as number[];
    return damage as number[];
  }
  // Fixed Parental Bond Damage
  if (typeof damage[0] === 'number' && typeof damage[1] === 'number') {
    return [damage[0] + damage[1]];
  }
  // Parental Bond Damage
  const d = damage as [number[], number[]];
  const combined = [];
  for (let i = 0; i < d[0].length; i++) { // eslint-disable-line
    for (let j = 0; j < d[1].length; j++) { // eslint-disable-line
      combined.push(d[0][i] + d[1][j]);
    }
  }
  return combined.sort();
}

const TRAPPING = [
  'Bind', 'Clamp', 'Fire Spin', 'Infestation', 'Magma Storm', 'Sand Tomb',
  'Thunder Cage', 'Whirlpool', 'Wrap', 'G-Max Sandblast', 'G-Max Centiferno',
];

function getHazards(gen: Generation, defender: Pokemon, defenderSide: Side) {
  let damage = 0;
  const texts: string[] = [];
  
  if (defender.hasItem('Heavy-Duty Boots')) {
    return {damage, texts};
  }
  if (defenderSide.isSR && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
    const rockType = gen.types.get('rock' as ID)!;
    const effectiveness =
      rockType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? rockType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Trampa Rocas');
  }
  if (defenderSide.steelsurge && !defender.hasAbility('Magic Guard', 'Mountaineer')) {
    const steelType = gen.types.get('steel' as ID)!; 
    const effectiveness =
      steelType.effectiveness[defender.types[0]]! *
      (defender.types[1] ? steelType.effectiveness[defender.types[1]]! : 1);
    damage += Math.floor((effectiveness * defender.maxHP()) / 8);
    texts.push('Steelsurge');
  }

  if (!defender.hasType('Flying') &&
      !defender.hasAbility('Magic Guard', 'Levitate') &&
      !defender.hasItem('Air Balloon')
  ) {
    if (defenderSide.spikes === 1) {
      damage += Math.floor(defender.maxHP() / 8);
      if (gen.num === 2) {
        texts.push('Púas');
      } else {
        texts.push('1 capa de Púas');
      }
    } else if (defenderSide.spikes === 2) {
      damage += Math.floor(defender.maxHP() / 6);
      texts.push('2 capas de Púas');
    } else if (defenderSide.spikes === 3) {
      damage += Math.floor(defender.maxHP() / 4);
      texts.push('3 capas de Púas');
    }
  }

  if (isNaN(damage)) {
    damage = 0;
  }

  return {damage, texts};
}

function getEndOfTurn(
  gen: Generation,
  attacker: Pokemon,
  defender: Pokemon,
  move: Move,
  field: Field
) {
  let damage = 0;
  const texts = [];

  function translate(hab : string) {
    switch (hab) {
      case "Solar Power":
        return "Poder Solar"
      case "Dry Skin":
        return "Piel Seca"
      default:
        return ""
    }
  }

  if (field.hasWeather('Sun', 'Harsh Sunshine')) {
    if (defender.hasAbility('Dry Skin', 'Solar Power')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push('daño por ' + translate(String(defender.ability)));
    }
  } else if (field.hasWeather('Rain', 'Heavy Rain')) {
    if (defender.hasAbility('Dry Skin')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('recuperación por Piel Seca');
    } else if (defender.hasAbility('Rain Dish')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('recuperación por Cura Lluvia');
    }
  } else if (field.hasWeather('Sand')) {
    if (
      !defender.hasType('Rock', 'Ground', 'Steel') &&
      !defender.hasAbility('Magic Guard', 'Overcoat', 'Sand Force', 'Sand Rush', 'Sand Veil') &&
      !defender.hasItem('Safety Goggles')
    ) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 2 ? 8 : 16));
      texts.push('daño por Tormenta de Arena');
    }
  } else if (field.hasWeather('Hail', 'Snow')) {
    if (defender.hasAbility('Ice Body')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('recuperación por Gélido');
    } else if (
      !defender.hasType('Ice') &&
      !defender.hasAbility('Magic Guard', 'Overcoat', 'Snow Cloak') &&
      !defender.hasItem('Safety Goggles') &&
      field.hasWeather('Hail')
    ) {
      damage -= Math.floor(defender.maxHP() / 16);
      texts.push('daño por Granizo');
    }
  }

  const loseItem = move.named('Knock Off') && !defender.hasAbility('Sticky Hold');
  if (defender.hasItem('Leftovers') && !loseItem) {
    damage += Math.floor(defender.maxHP() / 16);
    texts.push('recuperación por Restos');
  } else if (defender.hasItem('Black Sludge') && !loseItem) {
    if (defender.hasType('Poison')) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('recuperación por Lodo Negro');
    } else if (!defender.hasAbility('Magic Guard', 'Klutz')) {
      damage -= Math.floor(defender.maxHP() / 8);
      texts.push('daño por Lodo Negro');
    }
  } else if (defender.hasItem('Sticky Barb')) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('daño por Toxiestrella');
  }

  if (field.defenderSide.isSeeded) {
    if (!defender.hasAbility('Magic Guard')) {
      // 1/16 in gen 1, 1/8 in gen 2 onwards
      damage -= Math.floor(defender.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('daño por Drenadoras');
    }
  }

  if (field.attackerSide.isSeeded && !attacker.hasAbility('Magic Guard')) {
    if (attacker.hasAbility('Liquid Ooze')) {
      damage -= Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('daño por Lodo Líquido');
    } else {
      damage += Math.floor(attacker.maxHP() / (gen.num >= 2 ? 8 : 16));
      texts.push('recuperación por Drenadoras');
    }
  }

  if (field.hasTerrain('Grassy')) {
    if (isGrounded(defender, field)) {
      damage += Math.floor(defender.maxHP() / 16);
      texts.push('recuperación por Grassy Terrain');
    }
  }

  if (defender.hasStatus('psn')) {
    if (defender.hasAbility('Poison Heal')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('curación por Antídoto');
    } else if (!defender.hasAbility('Magic Guard')) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 ? 16 : 8));
      texts.push('daño por Veneno');
    }
  } else if (defender.hasStatus('tox')) {
    if (defender.hasAbility('Poison Heal')) {
      damage += Math.floor(defender.maxHP() / 8);
      texts.push('curación por Antídoto');
    } else if (!defender.hasAbility('Magic Guard')) {
      texts.push('daño por Veneno');
    }
  } else if (defender.hasStatus('brn')) {
    if (defender.hasAbility('Heatproof')) {
      damage -= Math.floor(defender.maxHP() / (gen.num > 6 ? 32 : 16));
      texts.push('daño por Quemadura reducido');
    } else if (!defender.hasAbility('Magic Guard')) {
      damage -= Math.floor(defender.maxHP() / (gen.num === 1 || gen.num > 6 ? 16 : 8));
      texts.push('daño por Quemadura');
    }
  } else if (
    (defender.hasStatus('slp') || defender.hasAbility('Comatose')) &&
    attacker.hasAbility('isBadDreams') &&
    !defender.hasAbility('Magic Guard')
  ) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('Mal Sueño');
  }

  if (!defender.hasAbility('Magic Guard') && TRAPPING.includes(move.name)) {
    if (attacker.hasItem('Binding Band')) {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 6) : Math.floor(defender.maxHP() / 8);
      texts.push('daño por trampa');
    } else {
      damage -= gen.num > 5 ? Math.floor(defender.maxHP() / 8) : Math.floor(defender.maxHP() / 16);
      texts.push('daño por trampa');
    }
  }
  if (defender.isSaltCure && !defender.hasAbility('Magic Guard')) {
    const isWaterOrSteel = defender.hasType('Water', 'Steel') ||
      (defender.teraType && ['Water', 'Steel'].includes(defender.teraType));
    damage -= Math.floor(defender.maxHP() / (isWaterOrSteel ? 4 : 8));
    texts.push('Salazón');
  }
  if (!defender.hasType('Fire') && !defender.hasAbility('Magic Guard') &&
      (move.named('Fire Pledge (Grass Pledge Boosted)', 'Grass Pledge (Fire Pledge Boosted)'))) {
    damage -= Math.floor(defender.maxHP() / 8);
    texts.push('daño por Mar de Fuego');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Grass') &&
      (field.defenderSide.vinelash || move.named('G-Max Vine Lash'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('daño por Gigalianas');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Fire') &&
      (field.defenderSide.wildfire || move.named('G-Max Wildfire'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('daño por Gigallamarada');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Water') &&
      (field.defenderSide.cannonade || move.named('G-Max Cannonade'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('daño por Cannonade');
  }

  if (!defender.hasAbility('Magic Guard') && !defender.hasType('Rock') &&
      (field.defenderSide.volcalith || move.named('G-Max Volcalith'))) {
    damage -= Math.floor(defender.maxHP() / 6);
    texts.push('daño por Volcalith');
  }

  return {damage, texts};
}

function computeKOChance(
  damage: number[],
  hp: number,
  eot: number,
  hits: number,
  timesUsed: number,
  maxHP: number,
  toxicCounter: number
) {
  const n = damage.length;
  if (hits === 1) {
    for (let i = 0; i < n; i++) {
      if (damage[n - 1] < hp) return 0;
      if (damage[i] >= hp) {
        return (n - i) / n;
      }
    }
  }
  let toxicDamage = 0;
  if (toxicCounter > 0) {
    toxicDamage = Math.floor((toxicCounter * maxHP) / 16);
    toxicCounter++;
  }
  let sum = 0;
  let lastc = 0;
  for (let i = 0; i < n; i++) {
    let c;
    if (i === 0 || damage[i] !== damage[i - 1]) {
      c = computeKOChance(
        damage,
        hp - damage[i] + eot - toxicDamage,
        eot,
        hits - 1,
        timesUsed,
        maxHP,
        toxicCounter
      );
    } else {
      c = lastc;
    }
    if (c === 1) {
      sum += n - i;
      break;
    } else {
      sum += c;
    }
    lastc = c;
  }
  return sum / n;
}

function predictTotal(
  damage: number,
  eot: number,
  hits: number,
  timesUsed: number,
  toxicCounter: number,
  maxHP: number
) {
  let toxicDamage = 0;
  if (toxicCounter > 0) {
    for (let i = 0; i < hits - 1; i++) {
      toxicDamage += Math.floor(((toxicCounter + i) * maxHP) / 16);
    }
  }
  let total = 0;
  if (hits > 1 && timesUsed === 1) {
    total = damage * hits - eot * (hits - 1) + toxicDamage;
  } else {
    total = damage - eot * (hits - 1) + toxicDamage;
  }
  return total;
}

function squashMultihit(gen: Generation, d: number[], hits: number, err = true) {
  if (d.length === 1) {
    return [d[0] * hits];
  } else if (gen.num === 1) {
    const r = [];
    for (let i = 0; i < d.length; i++) {
      r[i] = d[i] * hits;
    }
    return r;
  } else if (d.length === 16) {
    switch (hits) {
    case 2:
      return [
        2 * d[0], d[2] + d[3], d[4] + d[4], d[4] + d[5], d[5] + d[6], d[6] + d[6],
        d[6] + d[7], d[7] + d[7], d[8] + d[8], d[8] + d[9], d[9] + d[9], d[9] + d[10],
        d[10] + d[11], d[11] + d[11], d[12] + d[13], 2 * d[15],
      ];
    case 3:
      return [
        3 * d[0], d[3] + d[3] + d[4], d[4] + d[4] + d[5], d[5] + d[5] + d[6],
        d[5] + d[6] + d[6], d[6] + d[6] + d[7], d[6] + d[7] + d[7], d[7] + d[7] + d[8],
        d[7] + d[8] + d[8], d[8] + d[8] + d[9], d[8] + d[9] + d[9], d[9] + d[9] + d[10],
        d[9] + d[10] + d[10], d[10] + d[11] + d[11], d[11] + d[12] + d[12], 3 * d[15],
      ];
    case 4:
      return [
        4 * d[0], 4 * d[4], d[4] + d[5] + d[5] + d[5], d[5] + d[5] + d[6] + d[6],
        4 * d[6], d[6] + d[6] + d[7] + d[7], 4 * d[7], d[7] + d[7] + d[7] + d[8],
        d[7] + d[8] + d[8] + d[8], 4 * d[8], d[8] + d[8] + d[9] + d[9], 4 * d[9],
        d[9] + d[9] + d[10] + d[10], d[10] + d[10] + d[10] + d[11], 4 * d[11], 4 * d[15],
      ];
    case 5:
      return [
        5 * d[0], d[4] + d[4] + d[4] + d[5] + d[5], d[5] + d[5] + d[5] + d[5] + d[6],
        d[5] + d[6] + d[6] + d[6] + d[6], d[6] + d[6] + d[6] + d[6] + d[7],
        d[6] + d[6] + d[7] + d[7] + d[7], 5 * d[7], d[7] + d[7] + d[7] + d[8] + d[8],
        d[7] + d[7] + d[8] + d[8] + d[8], 5 * d[8], d[8] + d[8] + d[8] + d[9] + d[9],
        d[8] + d[9] + d[9] + d[9] + d[9], d[9] + d[9] + d[9] + d[9] + d[10],
        d[9] + d[10] + d[10] + d[10] + d[10], d[10] + d[10] + d[11] + d[11] + d[11], 5 * d[15],
      ];
    case 10:
      return [
        10 * d[0], 10 * d[4], 3 * d[4] + 7 * d[5], 5 * d[5] + 5 * d[6], 10 * d[6],
        5 * d[6] + 5 * d[7], 10 * d[7], 7 * d[7] + 3 * d[8], 3 * d[7] + 7 * d[8], 10 * d[8],
        5 * d[8] + 5 * d[9], 4 * d[9], 5 * d[9] + 5 * d[10], 7 * d[10] + 3 * d[11], 10 * d[11],
        10 * d[15],
      ];
    default:
      error(err, `Unexpected # of hits: ${hits}`);
      return d;
    }
  } else if (d.length === 39) {
    switch (hits) {
    case 2:
      return [
        2 * d[0], 2 * d[7], 2 * d[10], 2 * d[12], 2 * d[14], d[15] + d[16],
        2 * d[17], d[18] + d[19], d[19] + d[20], 2 * d[21], d[22] + d[23],
        2 * d[24], 2 * d[26], 2 * d[28], 2 * d[31], 2 * d[38],
      ];
    case 3:
      return [
        3 * d[0], 3 * d[9], 3 * d[12], 3 * d[13], 3 * d[15], 3 * d[16],
        3 * d[17], 3 * d[18], 3 * d[20], 3 * d[21], 3 * d[22], 3 * d[23],
        3 * d[25], 3 * d[26], 3 * d[29], 3 * d[38],
      ];
    case 4:
      return [
        4 * d[0], 2 * d[10] + 2 * d[11], 4 * d[13], 4 * d[14], 2 * d[15] + 2 * d[16],
        2 * d[16] + 2 * d[17], 2 * d[17] + 2 * d[18], 2 * d[18] + 2 * d[19],
        2 * d[19] + 2 * d[20], 2 * d[20] + 2 * d[21], 2 * d[21] + 2 * d[22],
        2 * d[22] + 2 * d[23], 4 * d[24], 4 * d[25], 2 * d[27] + 2 * d[28], 4 * d[38],
      ];
    case 5:
      return [
        5 * d[0], 5 * d[11], 5 * d[13], 5 * d[15], 5 * d[16], 5 * d[17],
        5 * d[18], 5 * d[19], 5 * d[19], 5 * d[20], 5 * d[21], 5 * d[22],
        5 * d[23], 5 * d[25], 5 * d[27], 5 * d[38],
      ];
    case 10:
      return [
        10 * d[0], 10 * d[11], 10 * d[13], 10 * d[15], 10 * d[16], 10 * d[17],
        10 * d[18], 10 * d[19], 10 * d[19], 10 * d[20], 10 * d[21], 10 * d[22],
        10 * d[23], 10 * d[25], 10 * d[27], 10 * d[38],
      ];
    default:
      error(err, `Unexpected # of hits: ${hits}`);
      return d;
    }
  } else if (d.length === 256) {
    if (hits > 1) {
      error(err, `Unexpected # of hits for Parental Bond: ${hits}`);
    }
    // FIXME: Come up with a better Parental Bond approximation
    const r: number[] = [];
    for (let i = 0; i < 16; i++) {
      let val = 0;
      for (let j = 0; j < 16; j++) {
        val += d[i + j];
      }
      r[i] = Math.round(val / 16);
    }
    return r;
  } else {
    error(err, `Unexpected # of possible damage values: ${d.length}`);
    return d;
  }
}

function translateElement(name : string, valueType : string){
  let habilidades = [{"en": "Stench","es": "Hedor"},{"en": "Drizzle","es": "Llovizna"},{"en": "Speed Boost","es": "Impulso"},{"en": "Battle Armor","es": "Armadura Batalla"},{"en": "Sturdy","es": "Robustez"},{"en": "Damp","es": "Humedad"},{"en": "Limber","es": "Flexibilidad"},{"en": "Sand Veil","es": "Velo Arena"},{"en": "Static","es": "Elec. Estática"},{"en": "Volt Absorb","es": "Absorbe Elec"},{"en": "Water Absorb","es": "Absorbe Agua"},{"en": "Oblivious","es": "Despiste"},{"en": "Cloud Nine","es": "Aclimatación"},{"en": "Compound Eyes","es": "Ojo Compuesto"},{"en": "Insomnia","es": "Insomnio"},{"en": "Color Change","es": "Cambio Color"},{"en": "Immunity","es": "Inmunidad"},{"en": "Flash Fire","es": "Absorbe Fuego"},{"en": "Shield Dust","es": "Polvo Escudo"},{"en": "Own Tempo","es": "Ritmo Propio"},{"en": "Suction Cups","es": "Ventosas"},{"en": "Intimidate","es": "Intimidación"},{"en": "Shadow Tag","es": "Sombra Trampa"},{"en": "Rough Skin","es": "Piel Tosca"},{"en": "Wonder Guard","es": "Superguarda"},{"en": "Levitate","es": "Levitación"},{"en": "Effect Spore","es": "Efecto Espora"},{"en": "Synchronize","es": "Sincronía"},{"en": "Clear Body","es": "Cuerpo Puro"},{"en": "Natural Cure","es": "Cura Natural"},{"en": "Lightning Rod","es": "Pararrayos"},{"en": "Serene Grace","es": "Dicha"},{"en": "Swift Swim","es": "Nado Rápido"},{"en": "Chlorophyll","es": "Clorofila"},{"en": "Illuminate","es": "Iluminación"},{"en": "Trace","es": "Rastro"},{"en": "Huge Power","es": "Potencia"},{"en": "Poison Point","es": "Punto Tóxico"},{"en": "Inner Focus","es": "Foco Interno"},{"en": "Magma Armor","es": "Escudo Magma"},{"en": "Water Veil","es": "Velo Agua"},{"en": "Magnet Pull","es": "Imán"},{"en": "Soundproof","es": "Insonorizar"},{"en": "Rain Dish","es": "Cura Lluvia"},{"en": "Sand Stream","es": "Chorro Arena"},{"en": "Pressure","es": "Presión"},{"en": "Thick Fat","es": "Sebo"},{"en": "Early Bird","es": "Madrugar"},{"en": "Flame Body","es": "Cuerpo Llama"},{"en": "Run Away","es": "Fuga"},{"en": "Keen Eye","es": "Vista Lince"},{"en": "Hyper Cutter","es": "Corte Fuerte"},{"en": "Pickup","es": "Recogida"},{"en": "Truant","es": "Ausente"},{"en": "Hustle","es": "Entusiasmo"},{"en": "Cute Charm","es": "Gran Encanto"},{"en": "Plus","es": "Más"},{"en": "Minus","es": "Menos"},{"en": "Forecast","es": "Predicción"},{"en": "Sticky Hold","es": "Viscosidad"},{"en": "Shed Skin","es": "Mudar"},{"en": "Guts","es": "Agallas"},{"en": "Marvel Scale","es": "Escama Especial"},{"en": "Liquid Ooze","es": "Lodo Líquido"},{"en": "Overgrow","es": "Espesura"},{"en": "Blaze","es": "Mar Llamas"},{"en": "Torrent","es": "Torrente"},{"en": "Swarm","es": "Enjambre"},{"en": "Rock Head","es": "Cabeza Roca"},{"en": "Drought","es": "Sequía"},{"en": "Arena Trap","es": "Trampa Arena"},{"en": "Vital Spirit","es": "Espíritu Vital"},{"en": "White Smoke","es": "Humo Blanco"},{"en": "Pure Power","es": "Energía Pura"},{"en": "Shell Armor","es": "Caparazón"},{"en": "Air Lock","es": "Bucle Aire"},{"en": "Tangled Feet","es": "Tumbos"},{"en": "Motor Drive","es": "Electromotor"},{"en": "Rivalry","es": "Rivalidad"},{"en": "Steadfast","es": "Impasible"},{"en": "Snow Cloak","es": "Manto Níveo"},{"en": "Gluttony","es": "Gula"},{"en": "Anger Point","es": "Irascible"},{"en": "Unburden","es": "Liviano"},{"en": "Heatproof","es": "Ignífugo"},{"en": "Simple","es": "Simple"},{"en": "Dry Skin","es": "Piel Seca"},{"en": "Download","es": "Descarga"},{"en": "Iron Fist","es": "Puño Férreo"},{"en": "Poison Heal","es": "Antídoto"},{"en": "Adaptability","es": "Adaptable"},{"en": "Skill Link","es": "Encadenado"},{"en": "Hydration","es": "Hidratación"},{"en": "Solar Power","es": "Poder Solar"},{"en": "Quick Feet","es": "Pies Rápidos"},{"en": "Normalize","es": "Normalidad"},{"en": "Sniper","es": "Francotirador"},{"en": "Magic Guard","es": "Muro Mágico"},{"en": "No Guard","es": "Indefenso"},{"en": "Stall","es": "Rezagado"},{"en": "Technician","es": "Experto"},{"en": "Leaf Guard","es": "Defensa Hoja"},{"en": "Klutz","es": "Zoquete"},{"en": "Mold Breaker","es": "Rompemoldes"},{"en": "Super Luck","es": "Afortunado"},{"en": "Aftermath","es": "Detonación"},{"en": "Anticipation","es": "Anticipación"},{"en": "Forewarn","es": "Alerta"},{"en": "Unaware","es": "Ignorante"},{"en": "Tinted Lens","es": "Cromolente"},{"en": "Filter","es": "Filtro"},{"en": "Slow Start","es": "Inicio Lento"},{"en": "Scrappy","es": "Intrépido"},{"en": "Storm Drain","es": "Colector"},{"en": "Ice Body","es": "Gélido"},{"en": "Solid Rock","es": "Roca Sólida"},{"en": "Snow Warning","es": "Nevada"},{"en": "Honey Gather","es": "Recogemiel"},{"en": "Frisk","es": "Cacheo"},{"en": "Reckless","es": "Audaz"},{"en": "Multitype","es": "Multitipo"},{"en": "Flower Gift","es": "Don Floral"},{"en": "Bad Dreams","es": "Mal Sueño"},{"en": "Pickpocket","es": "Hurto"},{"en": "Sheer Force","es": "Potencia Bruta"},{"en": "Contrary","es": "Respondón"},{"en": "Unnerve","es": "Nerviosismo"},{"en": "Defiant","es": "Competitivo"},{"en": "Defeatist","es": "Flaqueza"},{"en": "Cursed Body","es": "Cuerpo Maldito"},{"en": "Healer","es": "Alma Cura"},{"en": "Friend Guard","es": "Compiescolta"},{"en": "Weak Armor","es": "Armadura Frágil"},{"en": "Heavy Metal","es": "Metal Pesado"},{"en": "Light Metal","es": "Metal Liviano"},{"en": "Multiscale","es": "Multiescamas"},{"en": "Toxic Boost","es": "Ímpetu Tóxico"},{"en": "Flare Boost","es": "Ímpetu Ardiente"},{"en": "Harvest","es": "Cosecha"},{"en": "Telepathy","es": "Telepatía"},{"en": "Moody","es": "Veleta"},{"en": "Overcoat","es": "Funda"},{"en": "Poison Touch","es": "Toque Tóxico"},{"en": "Regenerator","es": "Regeneración"},{"en": "Big Pecks","es": "Sacapecho"},{"en": "Sand Rush","es": "Ímpetu Arena"},{"en": "Wonder Skin","es": "Piel Milagro"},{"en": "Analytic","es": "Cálculo Final"},{"en": "Illusion","es": "Ilusión"},{"en": "Imposter","es": "Impostor"},{"en": "Infiltrator","es": "Allanamiento"},{"en": "Mummy","es": "Momia"},{"en": "Moxie","es": "Autoestima"},{"en": "Justified","es": "Justiciero"},{"en": "Rattled","es": "Cobardía"},{"en": "Magic Bounce","es": "Espejo Mágico"},{"en": "Sap Sipper","es": "Herbívoro"},{"en": "Prankster","es": "Bromista"},{"en": "Sand Force","es": "Poder Arena"},{"en": "Iron Barbs","es": "Punta Acero"},{"en": "Zen Mode","es": "Modo Daruma"},{"en": "Victory Star","es": "Tinovictoria"},{"en": "Turboblaze","es": "Turbollama"},{"en": "Teravolt","es": "Terravoltaje"},{"en": "Aroma Veil","es": "Velo Aroma"},{"en": "Flower Veil","es": "Velo Flor"},{"en": "Cheek Pouch","es": "Carrillo"},{"en": "Protean","es": "Mutatipo"},{"en": "Fur Coat","es": "Pelaje Recio"},{"en": "Magician","es": "Prestidigitador"},{"en": "Bulletproof","es": "Antibalas"},{"en": "Competitive","es": "Tenacidad"},{"en": "Strong Jaw","es": "Mandíbula Fuerte"},{"en": "Refrigerate","es": "Piel Helada"},{"en": "Sweet Veil","es": "Velo Dulce"},{"en": "Stance Change","es": "Cambio Táctico"},{"en": "Gale Wings","es": "Alas Vendaval"},{"en": "Mega Launcher","es": "Megadisparador"},{"en": "Grass Pelt","es": "Manto Frondoso"},{"en": "Symbiosis","es": "Simbiosis"},{"en": "Tough Claws","es": "Garra Dura"},{"en": "Pixilate","es": "Piel Feérica"},{"en": "Gooey","es": "Baba"},{"en": "Aerilate","es": "Piel Celeste"},{"en": "Parental Bond","es": "Amor Filial"},{"en": "Dark Aura","es": "Aura Oscura"},{"en": "Fairy Aura","es": "Aura Feérica"},{"en": "Aura Break","es": "Rompeaura"},{"en": "Primordial Sea","es": "Mar del Albor"},{"en": "Desolate Land","es": "Tierra del Ocaso"},{"en": "Delta Stream","es": "Ráfaga Delta"},{"en": "Stamina","es": "Firmeza"},{"en": "Wimp Out","es": "Huida"},{"en": "Emergency Exit","es": "Retirada"},{"en": "Water Compaction","es": "Hidrorrefuerzo"},{"en": "Merciless","es": "Ensañamiento"},{"en": "Shields Down","es": "Escudo Limitado"},{"en": "Stakeout","es": "Vigilante"},{"en": "Water Bubble","es": "Pompa"},{"en": "Steelworker","es": "Acero Templado"},{"en": "Berserk","es": "Cólera"},{"en": "Slush Rush","es": "Quitanieves"},{"en": "Long Reach","es": "Remoto"},{"en": "Liquid Voice","es": "Voz Fluida"},{"en": "Triage","es": "Primer Auxilio"},{"en": "Galvanize","es": "Piel Eléctrica"},{"en": "Surge Surfer","es": "Cola Surf"},{"en": "Schooling","es": "Banco"},{"en": "Disguise","es": "Disfraz"},{"en": "Battle Bond","es": "Fuerte Afecto"},{"en": "Power Construct","es": "Agrupamiento"},{"en": "Corrosion","es": "Corrosión"},{"en": "Comatose","es": "Letargo Perenne"},{"en": "Queenly Majesty","es": "Regia Presencia"},{"en": "Innards Out","es": "Revés"},{"en": "Dancer","es": "Pareja de Baile"},{"en": "Battery","es": "Batería"},{"en": "Fluffy","es": "Peluche"},{"en": "Dazzling","es": "Cuerpo Vívido"},{"en": "Soul-Heart","es": "Coránima"},{"en": "Tangling Hair","es": "Rizos Rebeldes"},{"en": "Receiver","es": "Receptor"},{"en": "Power of Alchemy","es": "Reacción Química"},{"en": "Beast Boost","es": "Ultraimpulso"},{"en": "RKS System","es": "Sistema Alfa"},{"en": "Electric Surge","es": "Electrogénesis"},{"en": "Psychic Surge","es": "Psicogénesis"},{"en": "Misty Surge","es": "Nebulogénesis"},{"en": "Grassy Surge","es": "Herbogénesis"},{"en": "Full Metal Body","es": "Guardia Metálica"},{"en": "Shadow Shield","es": "Guardia Espectro"},{"en": "Prism Armor","es": "Armadura Prisma"},{"en": "Neuroforce","es": "Fuerza Cerebral"},{"en": "Intrepid Sword","es": "Espada Indómita"},{"en": "Dauntless Shield","es": "Escudo Recio"},{"en": "Libero","es": "Líbero"},{"en": "Ball Fetch","es": "Recogebolas"},{"en": "Cotton Down","es": "Pelusa"},{"en": "Propeller Tail","es": "Hélice Caudal"},{"en": "Mirror Armor","es": "Coraza Reflejo"},{"en": "Gulp Missile","es": "Tragamisil"},{"en": "Stalwart","es": "Acérrimo"},{"en": "Steam Engine","es": "Combustible"},{"en": "Punk Rock","es": "Punk Rock"},{"en": "Sand Spit","es": "Expulsarena"},{"en": "Ice Scales","es": "Escama de Hielo"},{"en": "Ripen","es": "Maduración"},{"en": "Ice Face","es": "Cara de Hielo"},{"en": "Power Spot","es": "Fuente Energía"},{"en": "Mimicry","es": "Mimetismo"},{"en": "Screen Cleaner","es": "Antibarrera"},{"en": "Steely Spirit","es": "Alma Acerada"},{"en": "Perish Body","es": "Cuerpo Mortal"},{"en": "Wandering Spirit","es": "Alma Errante"},{"en": "Gorilla Tactics","es": "Monotema"},{"en": "Neutralizing Gas","es": "Gas Reactivo"},{"en": "Pastel Veil","es": "Velo Pastel"},{"en": "Hunger Switch","es": "Mutapetito"},{"en": "Quick Draw","es": "Mano Rápida"},{"en": "Unseen Fist","es": "Puño Invisible"},{"en": "Curious Medicine","es": "Medicina Extraña"},{"en": "Transistor","es": "Transistor"},{"en": "Dragon’s Maw","es": "Mandíbula Dragón"},{"en": "Chilling Neigh","es": "Relincho Blanco"},{"en": "Grim Neigh","es": "Relincho Negro"},{"en": "As One","es": "Unidad Ecuestre"},{"en": "As One","es": "Unidad Ecuestre"}];
  let objetos = [{"es": "Master Ball","en": "Master Ball"},{"es": "Ultra Ball","en": "Ultra Ball"},{"es": "Super Ball","en": "Great Ball"},{"es": "Poké Ball","en": "Poke Ball"},{"es": "Safari Ball","en": "Safari Ball"},{"es": "Malla Ball","en": "Net Ball"},{"es": "Buceo Ball","en": "Dive Ball"},{"es": "Nido Ball","en": "Nest Ball"},{"es": "Acopio Ball","en": "Repeat Ball"},{"es": "Turno Ball","en": "Timer Ball"},{"es": "Lujo Ball","en": "Luxury Ball"},{"es": "Honor Ball","en": "Premier Ball"},{"es": "Ocaso Ball","en": "Dusk Ball"},{"es": "Sana Ball","en": "Heal Ball"},{"es": "Veloz Ball","en": "Quick Ball"},{"es": "Gloria Ball","en": "Cherish Ball"},{"es": "Poción","en": "Potion"},{"es": "Antídoto","en": "Antidote"},{"es": "Antiquemar","en": "Burn Heal"},{"es": "Antihielo","en": "Ice Heal"},{"es": "Despertar","en": "Awakening"},{"es": "Antiparalizador","en": "Paralyze Heal"},{"es": "Restaurar Todo","en": "Full Restore"},{"es": "Poción Máxima","en": "Max Potion"},{"es": "Hiperpoción","en": "Hyper Potion"},{"es": "Superpoción","en": "Super Potion"},{"es": "Cura Total","en": "Full Heal"},{"es": "Revivir","en": "Revive"},{"es": "Revivir Máximo","en": "Max Revive"},{"es": "Agua Fresca","en": "Fresh Water"},{"es": "Refresco","en": "Soda Pop"},{"es": "Limonada","en": "Lemonade"},{"es": "Leche Mu-mu","en": "Moomoo Milk"},{"es": "Polvo Energía","en": "Energy Powder"},{"es": "Raíz Energía","en": "Energy Root"},{"es": "Polvo Curación","en": "Heal Powder"},{"es": "Hierba Revivir","en": "Revival Herb"},{"es": "Éter","en": "Ether"},{"es": "Éter Máximo","en": "Max Ether"},{"es": "Elixir","en": "Elixir"},{"es": "Elixir Máximo","en": "Max Elixir"},{"es": "Galleta Lava","en": "Lava Cookie"},{"es": "Zumo de Baya","en": "Berry Juice"},{"es": "Ceniza Sagrada","en": "Sacred Ash"},{"es": "Más PS","en": "HP Up"},{"es": "Proteína","en": "Protein"},{"es": "Hierro","en": "Iron"},{"es": "Carburante","en": "Carbos"},{"es": "Calcio","en": "Calcium"},{"es": "Caramelo Raro","en": "Rare Candy"},{"es": "Más PP","en": "PP Up"},{"es": "Zinc","en": "Zinc"},{"es": "PP Máximos","en": "PP Max"},{"es": "Barrita Plus","en": "Old Gateau"},{"es": "Protección X","en": "Guard Spec."},{"es": "Crítico X","en": "Dire Hit"},{"es": "Ataque X","en": "X Attack"},{"es": "Defensa X","en": "X Defense"},{"es": "Velocidad X","en": "X Speed"},{"es": "Precisión X","en": "X Accuracy"},{"es": "At. Especial X","en": "X Sp. Atk"},{"es": "Def. Especial X","en": "X Sp. Def"},{"es": "Poké Muñeco","en": "Poké Doll"},{"es": "Cola Skitty","en": "Fluffy Tail"},{"es": "Flauta Azul","en": "Blue Flute"},{"es": "Flauta Amarilla","en": "Yellow Flute"},{"es": "Flauta Roja","en": "Red Flute"},{"es": "Flauta Negra","en": "Black Flute"},{"es": "Flauta Blanca","en": "White Flute"},{"es": "Sal Cardumen","en": "Shoal Salt"},{"es": "Concha Cardumen","en": "Shoal Shell"},{"es": "Parte Roja","en": "Red Shard"},{"es": "Parte Azul","en": "Blue Shard"},{"es": "Parte Amarilla","en": "Yellow Shard"},{"es": "Parte Verde","en": "Green Shard"},{"es": "Superrepelente","en": "Super Repel"},{"es": "Repelente Máximo","en": "Max Repel"},{"es": "Cuerda Huida","en": "Escape Rope"},{"es": "Repelente","en": "Repel"},{"es": "Piedra Solar","en": "Sun Stone"},{"es": "Piedra Lunar","en": "Moon Stone"},{"es": "Piedra Fuego","en": "Fire Stone"},{"es": "Piedra Trueno","en": "Thunder Stone"},{"es": "Piedra Agua","en": "Water Stone"},{"es": "Piedra Hoja","en": "Leaf Stone"},{"es": "Miniseta","en": "Tiny Mushroom"},{"es": "Seta Grande","en": "Big Mushroom"},{"es": "Perla","en": "Pearl"},{"es": "Perla Grande","en": "Big Pearl"},{"es": "Polvo Estelar","en": "Stardust"},{"es": "Trozo Estrella","en": "Star Piece"},{"es": "Pepita","en": "Nugget"},{"es": "Escama Corazón","en": "Heart Scale"},{"es": "Miel","en": "Honey"},{"es": "Abono Rápido","en": "Growth Mulch"},{"es": "Abono Lento","en": "Damp Mulch"},{"es": "Abono Fijador","en": "Stable Mulch"},{"es": "Abono Brote","en": "Gooey Mulch"},{"es": "Fósil Raíz","en": "Root Fossil"},{"es": "Fósil Garra","en": "Claw Fossil"},{"es": "Fósil Hélix","en": "Helix Fossil"},{"es": "Fósil Domo","en": "Dome Fossil"},{"es": "Ámbar Viejo","en": "Old Amber"},{"es": "Fósil Coraza","en": "Armor Fossil"},{"es": "Fósil Cráneo","en": "Skull Fossil"},{"es": "Hueso Raro","en": "Rare Bone"},{"es": "Piedra Día","en": "Shiny Stone"},{"es": "Piedra Noche","en": "Dusk Stone"},{"es": "Piedra Alba","en": "Dawn Stone"},{"es": "Piedra Oval","en": "Oval Stone"},{"es": "Piedra Espíritu","en": "Odd Keystone"},{"es": "Diamansfera","en": "Adamant Orb"},{"es": "Lustresfera","en": "Lustrous Orb"},{"es": "Baya Zreza","en": "Cheri Berry"},{"es": "Baya Atania","en": "Chesto Berry"},{"es": "Baya Meloc","en": "Pecha Berry"},{"es": "Baya Safre","en": "Rawst Berry"},{"es": "Baya Perasi","en": "Aspear Berry"},{"es": "Baya Zanama","en": "Leppa Berry"},{"es": "Baya Aranja","en": "Oran Berry"},{"es": "Baya Caquic","en": "Persim Berry"},{"es": "Baya Ziuela","en": "Lum Berry"},{"es": "Baya Zidra","en": "Sitrus Berry"},{"es": "Baya Higog","en": "Figy Berry"},{"es": "Baya Wiki","en": "Wiki Berry"},{"es": "Baya Ango","en": "Mago Berry"},{"es": "Baya Guaya","en": "Aguav Berry"},{"es": "Baya Pabaya","en": "Iapapa Berry"},{"es": "Baya Frambu","en": "Razz Berry"},{"es": "Baya Oram","en": "Bluk Berry"},{"es": "Baya Latano","en": "Nanab Berry"},{"es": "Baya Peragu","en": "Wepear Berry"},{"es": "Baya Pinia","en": "Pinap Berry"},{"es": "Baya Grana","en": "Pomeg Berry"},{"es": "Baya Algama","en": "Kelpsy Berry"},{"es": "Baya Ispero","en": "Qualot Berry"},{"es": "Baya Meluce","en": "Hondew Berry"},{"es": "Baya Uvav","en": "Grepa Berry"},{"es": "Baya Tamate","en": "Tamato Berry"},{"es": "Baya Mais","en": "Cornn Berry"},{"es": "Baya Aostan","en": "Magost Berry"},{"es": "Baya Rautan","en": "Rabuta Berry"},{"es": "Baya Monli","en": "Nomel Berry"},{"es": "Baya Wikano","en": "Spelon Berry"},{"es": "Baya Plama","en": "Pamtre Berry"},{"es": "Baya Sambia","en": "Watmel Berry"},{"es": "Baya Rudion","en": "Durin Berry"},{"es": "Baya Andano","en": "Belue Berry"},{"es": "Baya Caoca","en": "Occa Berry"},{"es": "Baya Pasio","en": "Passho Berry"},{"es": "Baya Gualot","en": "Wacan Berry"},{"es": "Baya Tamar","en": "Rindo Berry"},{"es": "Baya Rimoya","en": "Yache Berry"},{"es": "Baya Pomaro","en": "Chople Berry"},{"es": "Baya Kebia","en": "Kebia Berry"},{"es": "Baya Acardo","en": "Shuca Berry"},{"es": "Baya Kouba","en": "Coba Berry"},{"es": "Baya Payapa","en": "Payapa Berry"},{"es": "Baya Yecana","en": "Tanga Berry"},{"es": "Baya Alcho","en": "Charti Berry"},{"es": "Baya Drasi","en": "Kasib Berry"},{"es": "Baya Anjiro","en": "Haban Berry"},{"es": "Baya Dillo","en": "Colbur Berry"},{"es": "Baya Baribá","en": "Babiri Berry"},{"es": "Baya Chilan","en": "Chilan Berry"},{"es": "Baya Lichi","en": "Liechi Berry"},{"es": "Baya Gonlan","en": "Ganlon Berry"},{"es": "Baya Aslac","en": "Salac Berry"},{"es": "Baya Yapati","en": "Petaya Berry"},{"es": "Baya Aricoc","en": "Apicot Berry"},{"es": "Baya Zonlan","en": "Lansat Berry"},{"es": "Baya Arabol","en": "Starf Berry"},{"es": "Baya Enigma","en": "Enigma Berry"},{"es": "Baya Lagro","en": "Micle Berry"},{"es": "Baya Chiri","en": "Custap Berry"},{"es": "Baya Jaboca","en": "Jaboca Berry"},{"es": "Baya Magua","en": "Rowap Berry"},{"es": "Polvo Brillo","en": "Bright Powder"},{"es": "Hierba Blanca","en": "White Herb"},{"es": "Brazal Firme","en": "Macho Brace"},{"es": "Repartir Exp","en": "Exp. Share"},{"es": "Garra Rápida","en": "Quick Claw"},{"es": "Cascabel Alivio","en": "Soothe Bell"},{"es": "Hierba Mental","en": "Mental Herb"},{"es": "Cinta Elegida","en": "Choice Band"},{"es": "Roca del Rey","en": "King's Rock"},{"es": "Polvo Plata","en": "Silver Powder"},{"es": "Moneda Amuleto","en": "Amulet Coin"},{"es": "Amuleto","en": "Cleanse Tag"},{"es": "Rocío Bondad","en": "Soul Dew"},{"es": "Diente Marino","en": "Deep Sea Tooth"},{"es": "Escama Marina","en": "Deep Sea Scale"},{"es": "Bola de Humo","en": "Smoke Ball"},{"es": "Piedra Eterna","en": "Everstone"},{"es": "Cinta Focus","en": "Focus Band"},{"es": "Huevo Suerte","en": "Lucky Egg"},{"es": "Periscopio","en": "Scope Lens"},{"es": "Revest. Metálico","en": "Metal Coat"},{"es": "Restos","en": "Leftovers"},{"es": "Escama Dragón","en": "Dragon Scale"},{"es": "Bola Luminosa","en": "Light Ball"},{"es": "Arena Fina","en": "Soft Sand"},{"es": "Piedra Dura","en": "Hard Stone"},{"es": "Semilla Milagro","en": "Miracle Seed"},{"es": "Gafas de Sol","en": "Black Glasses"},{"es": "Cinturón Negro","en": "Black Belt"},{"es": "Imán","en": "Magnet"},{"es": "Agua Mística","en": "Mystic Water"},{"es": "Pico Afilado","en": "Sharp Beak"},{"es": "Flecha Venenosa","en": "Poison Barb"},{"es": "Antiderretir","en": "Never-Melt Ice"},{"es": "Hechizo","en": "Spell Tag"},{"es": "Cuchara Torcida","en": "Twisted Spoon"},{"es": "Carbón","en": "Charcoal"},{"es": "Colmillo Dragón","en": "Dragon Fang"},{"es": "Pañuelo de Seda","en": "Silk Scarf"},{"es": "Mejora","en": "Up-Grade"},{"es": "Cascabel Concha","en": "Shell Bell"},{"es": "Incienso Marino","en": "Sea Incense"},{"es": "Incienso Suave","en": "Lax Incense"},{"es": "Puño Suerte","en": "Lucky Punch"},{"es": "Polvo Metálico","en": "Metal Powder"},{"es": "Hueso Grueso","en": "Thick Club"},{"es": "Puerro","en": "Leek"},{"es": "Pañuelo Rojo","en": "Red Scarf"},{"es": "Pañuelo Azul","en": "Blue Scarf"},{"es": "Pañuelo Rosa","en": "Pink Scarf"},{"es": "Pañuelo Verde","en": "Green Scarf"},{"es": "Pañuelo Amarillo","en": "Yellow Scarf"},{"es": "Lupa","en": "Wide Lens"},{"es": "Cinta Fuerte","en": "Muscle Band"},{"es": "Gafas Especiales","en": "Wise Glasses"},{"es": "Cinta Experto","en": "Expert Belt"},{"es": "Refleluz","en": "Light Clay"},{"es": "Vidasfera","en": "Life Orb"},{"es": "Hierba Única","en": "Power Herb"},{"es": "Toxisfera","en": "Toxic Orb"},{"es": "Llamasfera","en": "Flame Orb"},{"es": "Polvo Veloz","en": "Quick Powder"},{"es": "Banda Focus","en": "Focus Sash"},{"es": "Telescopio","en": "Zoom Lens"},{"es": "Metrónomo","en": "Metronome"},{"es": "Bola Férrea","en": "Iron Ball"},{"es": "Cola Plúmbea","en": "Lagging Tail"},{"es": "Lazo Destino","en": "Destiny Knot"},{"es": "Lodo Negro","en": "Black Sludge"},{"es": "Roca Helada","en": "Icy Rock"},{"es": "Roca Suave","en": "Smooth Rock"},{"es": "Roca Calor","en": "Heat Rock"},{"es": "Roca Lluvia","en": "Damp Rock"},{"es": "Garra Garfio","en": "Grip Claw"},{"es": "Pañuelo Elegido","en": "Choice Scarf"},{"es": "Toxiestrella","en": "Sticky Barb"},{"es": "Brazal Recio","en": "Power Bracer"},{"es": "Cinto Recio","en": "Power Belt"},{"es": "Lente Recia","en": "Power Lens"},{"es": "Banda Recia","en": "Power Band"},{"es": "Franja Recia","en": "Power Anklet"},{"es": "Pesa Recia","en": "Power Weight"},{"es": "Muda Concha","en": "Shed Shell"},{"es": "Raíz Grande","en": "Big Root"},{"es": "Gafas Elegidas","en": "Choice Specs"},{"es": "Tabla Llama","en": "Flame Plate"},{"es": "Tabla Linfa","en": "Splash Plate"},{"es": "Tabla Trueno","en": "Zap Plate"},{"es": "Tabla Pradal","en": "Meadow Plate"},{"es": "Tabla Helada","en": "Icicle Plate"},{"es": "Tabla Fuerte","en": "Fist Plate"},{"es": "Tabla Tóxica","en": "Toxic Plate"},{"es": "Tabla Terrax","en": "Earth Plate"},{"es": "Tabla Cielo","en": "Sky Plate"},{"es": "Tabla Mental","en": "Mind Plate"},{"es": "Tabla Bicho","en": "Insect Plate"},{"es": "Tabla Pétrea","en": "Stone Plate"},{"es": "Tabla Terror","en": "Spooky Plate"},{"es": "Tabla Draco","en": "Draco Plate"},{"es": "Tabla Oscura","en": "Dread Plate"},{"es": "Tabla Acero","en": "Iron Plate"},{"es": "Incienso Raro","en": "Odd Incense"},{"es": "Incienso Roca","en": "Rock Incense"},{"es": "Incienso Lento","en": "Full Incense"},{"es": "Incienso Acua","en": "Wave Incense"},{"es": "Incienso Floral","en": "Rose Incense"},{"es": "Incienso Duplo","en": "Luck Incense"},{"es": "Incienso Puro","en": "Pure Incense"},{"es": "Protector","en": "Protector"},{"es": "Electrizador","en": "Electirizer"},{"es": "Magmatizador","en": "Magmarizer"},{"es": "Disco Extraño","en": "Dubious Disc"},{"es": "Tela Terrible","en": "Reaper Cloth"},{"es": "Garra Afilada","en": "Razor Claw"},{"es": "Colmillo Agudo","en": "Razor Fang"},{"es": "MT01","en": "TM01"},{"es": "MT02","en": "TM02"},{"es": "MT03","en": "TM03"},{"es": "MT04","en": "TM04"},{"es": "MT05","en": "TM05"},{"es": "MT06","en": "TM06"},{"es": "MT07","en": "TM07"},{"es": "MT08","en": "TM08"},{"es": "MT09","en": "TM09"},{"es": "MT10","en": "TM10"},{"es": "MT11","en": "TM11"},{"es": "MT12","en": "TM12"},{"es": "MT13","en": "TM13"},{"es": "MT14","en": "TM14"},{"es": "MT15","en": "TM15"},{"es": "MT16","en": "TM16"},{"es": "MT17","en": "TM17"},{"es": "MT18","en": "TM18"},{"es": "MT19","en": "TM19"},{"es": "MT20","en": "TM20"},{"es": "MT21","en": "TM21"},{"es": "MT22","en": "TM22"},{"es": "MT23","en": "TM23"},{"es": "MT24","en": "TM24"},{"es": "MT25","en": "TM25"},{"es": "MT26","en": "TM26"},{"es": "MT27","en": "TM27"},{"es": "MT28","en": "TM28"},{"es": "MT29","en": "TM29"},{"es": "MT30","en": "TM30"},{"es": "MT31","en": "TM31"},{"es": "MT32","en": "TM32"},{"es": "MT33","en": "TM33"},{"es": "MT34","en": "TM34"},{"es": "MT35","en": "TM35"},{"es": "MT36","en": "TM36"},{"es": "MT37","en": "TM37"},{"es": "MT38","en": "TM38"},{"es": "MT39","en": "TM39"},{"es": "MT40","en": "TM40"},{"es": "MT41","en": "TM41"},{"es": "MT42","en": "TM42"},{"es": "MT43","en": "TM43"},{"es": "MT44","en": "TM44"},{"es": "MT45","en": "TM45"},{"es": "MT46","en": "TM46"},{"es": "MT47","en": "TM47"},{"es": "MT48","en": "TM48"},{"es": "MT49","en": "TM49"},{"es": "MT50","en": "TM50"},{"es": "MT51","en": "TM51"},{"es": "MT52","en": "TM52"},{"es": "MT53","en": "TM53"},{"es": "MT54","en": "TM54"},{"es": "MT55","en": "TM55"},{"es": "MT56","en": "TM56"},{"es": "MT57","en": "TM57"},{"es": "MT58","en": "TM58"},{"es": "MT59","en": "TM59"},{"es": "MT60","en": "TM60"},{"es": "MT61","en": "TM61"},{"es": "MT62","en": "TM62"},{"es": "MT63","en": "TM63"},{"es": "MT64","en": "TM64"},{"es": "MT65","en": "TM65"},{"es": "MT66","en": "TM66"},{"es": "MT67","en": "TM67"},{"es": "MT68","en": "TM68"},{"es": "MT69","en": "TM69"},{"es": "MT70","en": "TM70"},{"es": "MT71","en": "TM71"},{"es": "MT72","en": "TM72"},{"es": "MT73","en": "TM73"},{"es": "MT74","en": "TM74"},{"es": "MT75","en": "TM75"},{"es": "MT76","en": "TM76"},{"es": "MT77","en": "TM77"},{"es": "MT78","en": "TM78"},{"es": "MT79","en": "TM79"},{"es": "MT80","en": "TM80"},{"es": "MT81","en": "TM81"},{"es": "MT82","en": "TM82"},{"es": "MT83","en": "TM83"},{"es": "MT84","en": "TM84"},{"es": "MT85","en": "TM85"},{"es": "MT86","en": "TM86"},{"es": "MT87","en": "TM87"},{"es": "MT88","en": "TM88"},{"es": "MT89","en": "TM89"},{"es": "MT90","en": "TM90"},{"es": "MT91","en": "TM91"},{"es": "MT92","en": "TM92"},{"es": "MO01","en": "HM01"},{"es": "MO02","en": "HM02"},{"es": "MO03","en": "HM03"},{"es": "MO04","en": "HM04"},{"es": "MO05","en": "HM05"},{"es": "MO06","en": "HM06"},{"es": "MO07","en": "HM07"},{"es": "Kit Explorador","en": "Explorer Kit"},{"es": "Saca Botín","en": "Loot Sack"},{"es": "Reglamento","en": "Rule Book"},{"es": "Pokéradar","en": "Poké Radar"},{"es": "Tarjeta Puntos","en": "Point Card"},{"es": "Diario","en": "Journal"},{"es": "Caja Sellos","en": "Seal Case"},{"es": "Caja Corazón","en": "Fashion Case"},{"es": "Bolsa Sellos","en": "Seal Bag"},{"es": "Bloc amigos","en": "Pal Pad"},{"es": "Llave Central","en": "Works Key"},{"es": "Talismán","en": "Old Charm"},{"es": "Llave Galaxia","en": "Galactic Key"},{"es": "Cadena Roja","en": "Red Chain"},{"es": "Mapa","en": "Town Map"},{"es": "Buscapelea","en": "Vs. Seeker"},{"es": "Monedero","en": "Coin Case"},{"es": "Caña Vieja","en": "Old Rod"},{"es": "Caña Buena","en": "Good Rod"},{"es": "Supercaña","en": "Super Rod"},{"es": "Psydugadera","en": "Sprayduck"},{"es": "Pokochera","en": "Poffin Case"},{"es": "Llave Suite","en": "Suite Key"},{"es": "Carta Prof. Oak","en": "Oak’s Letter"},{"es": "Pluma Lunar","en": "Lunar Wing"},{"es": "Carné Socio","en": "Member Card"},{"es": "Flauta Azur","en": "Azure Flute"},{"es": "Ticket Barco","en": "S.S. Ticket"},{"es": "Pase Concurso","en": "Contest Pass"},{"es": "Piedra Magma","en": "Magma Stone"},{"es": "Paquete","en": "Parcel"},{"es": "Cupón 1","en": "Coupon 1"},{"es": "Cupón 2","en": "Coupon 2"},{"es": "Cupón 3","en": "Coupon 3"},{"es": "Llave Almacén","en": "Storage Key"},{"es": "Poción Secreta","en": "Secret Potion"},{"es": "Griseosfera","en": "Griseous Orb"},{"es": "Cámara Lucha","en": "Vs. Recorder"},{"es": "Gracídea","en": "Gracidea"},{"es": "Llave Secreta","en": "Secret Key"},{"es": "Caja Bonguri","en": "Apricorn Box"},{"es": "Plantabayas","en": "Berry Pots"},{"es": "Regadera","en": "Squirt Bottle"},{"es": "Cebo Ball","en": "Lure Ball"},{"es": "Nivel Ball","en": "Level Ball"},{"es": "Luna Ball","en": "Moon Ball"},{"es": "Peso Ball","en": "Heavy Ball"},{"es": "Rapid Ball","en": "Fast Ball"},{"es": "Amigo Ball","en": "Friend Ball"},{"es": "Amor Ball","en": "Love Ball"},{"es": "Parque Ball","en": "Park Ball"},{"es": "Competi Ball","en": "Sport Ball"},{"es": "Bonguri Rojo","en": "Red Apricorn"},{"es": "Bonguri Azul","en": "Blue Apricorn"},{"es": "Bonguri Amarillo","en": "Yellow Apricorn"},{"es": "Bonguri Verde","en": "Green Apricorn"},{"es": "Bonguri Rosa","en": "Pink Apricorn"},{"es": "Bonguri Blanco","en": "White Apricorn"},{"es": "Bonguri Negro","en": "Black Apricorn"},{"es": "Zahorí","en": "Dowsing Machine"},{"es": "Caramelo Furia","en": "Rage Candy Bar"},{"es": "Prisma Rojo","en": "Red Orb"},{"es": "Prisma Azul","en": "Blue Orb"},{"es": "Esfera Verde","en": "Jade Orb"},{"es": "Misticristal","en": "Enigma Stone"},{"es": "Bloc Unown","en": "Unown Report"},{"es": "Tarjeta Azul","en": "Blue Card"},{"es": "Cola Slowpoke","en": "Slowpoke Tail"},{"es": "Cascabel Claro","en": "Clear Bell"},{"es": "Llave Magnética","en": "Card Key"},{"es": "Llave Sótano","en": "Basement Key"},{"es": "Escama Roja","en": "Red Scale"},{"es": "Objeto Perdido","en": "Lost Item"},{"es": "Magnetopase","en": "Pass"},{"es": "Maquinaria","en": "Machine Part"},{"es": "Ala Plateada","en": "Silver Wing"},{"es": "Ala Arcoíris","en": "Rainbow Wing"},{"es": "Huevo Misterioso","en": "Mystery Egg"},{"es": "Lector GB","en": "GB Sounds"},{"es": "Cascabel Oleaje","en": "Tidal Bell"},{"es": "Tarjeta Datos 01","en": "Data Card 01"},{"es": "Tarjeta Datos 02","en": "Data Card 02"},{"es": "Tarjeta Datos 03","en": "Data Card 03"},{"es": "Tarjeta Datos 04","en": "Data Card 04"},{"es": "Tarjeta Datos 05","en": "Data Card 05"},{"es": "Tarjeta Datos 06","en": "Data Card 06"},{"es": "Tarjeta Datos 07","en": "Data Card 07"},{"es": "Tarjeta Datos 08","en": "Data Card 08"},{"es": "Tarjeta Datos 09","en": "Data Card 09"},{"es": "Tarjeta Datos 10","en": "Data Card 10"},{"es": "Tarjeta Datos 11","en": "Data Card 11"},{"es": "Tarjeta Datos 12","en": "Data Card 12"},{"es": "Tarjeta Datos 13","en": "Data Card 13"},{"es": "Tarjeta Datos 14","en": "Data Card 14"},{"es": "Tarjeta Datos 15","en": "Data Card 15"},{"es": "Tarjeta Datos 16","en": "Data Card 16"},{"es": "Tarjeta Datos 17","en": "Data Card 17"},{"es": "Tarjeta Datos 18","en": "Data Card 18"},{"es": "Tarjeta Datos 19","en": "Data Card 19"},{"es": "Tarjeta Datos 20","en": "Data Card 20"},{"es": "Tarjeta Datos 21","en": "Data Card 21"},{"es": "Tarjeta Datos 22","en": "Data Card 22"},{"es": "Tarjeta Datos 23","en": "Data Card 23"},{"es": "Tarjeta Datos 24","en": "Data Card 24"},{"es": "Tarjeta Datos 25","en": "Data Card 25"},{"es": "Tarjeta Datos 26","en": "Data Card 26"},{"es": "Tarjeta Datos 27","en": "Data Card 27"},{"es": "Cápsula Candado","en": "Lock Capsule"},{"es": "Álbum","en": "Photo Album"},{"es": "Bici de Carreras","en": "Mach Bike"},{"es": "Bici Acrobática","en": "Acro Bike"},{"es": "Wailmegadera","en": "Wailmer Pail"},{"es": "Saco Hollín","en": "Soot Sack"},{"es": "Carta a Máximo","en": "Letter"},{"es": "Ticket Eón","en": "Eon Ticket"},{"es": "Escáner","en": "Scanner"},{"es": "Gafas Aislantes","en": "Go-Goggles"},{"es": "Meteorito","en": "Meteorite"},{"es": "Detector Devon","en": "Devon Scope"},{"es": "Poké Flauta","en": "Poké Flute"},{"es": "Dentadura de Oro","en": "Gold Teeth"},{"es": "Llave Ascensor","en": "Lift Key"},{"es": "Visor Silph","en": "Silph Scope"},{"es": "Estuche de MT","en": "TM Case"},{"es": "Té","en": "Tea"},{"es": "HidroROM","en": "Douse Drive"},{"es": "FulgoROM","en": "Shock Drive"},{"es": "PiroROM","en": "Burn Drive"},{"es": "CrioROM","en": "Chill Drive"},{"es": "Corazón Dulce","en": "Sweet Heart"},{"es": "Carta Inicial","en": "Greet Mail"},{"es": "Carta","en": "Mail"},{"es": "Carta Favoritos","en": "Favored Mail"},{"es": "Carta Invitar","en": "RSVP Mail"},{"es": "Carta Gracias","en": "Thanks Mail"},{"es": "Carta Pregunta","en": "Inquiry Mail"},{"es": "Carta Gustos","en": "Like Mail"},{"es": "Carta Respuesta","en": "Reply Mail"},{"es": "Carta Puente S","en": "Bridge Mail S"},{"es": "Carta Puente F","en": "Bridge Mail D"},{"es": "Carta Puente A","en": "Bridge Mail T"},{"es": "Carta Puente V","en": "Bridge Mail V"},{"es": "Carta Puente P","en": "Bridge Mail M"},{"es": "Escama Bella","en": "Prism Scale"},{"es": "Mineral Evol","en": "Eviolite"},{"es": "Piedra Pómez","en": "Float Stone"},{"es": "Casco Dentado","en": "Rocky Helmet"},{"es": "Globo Helio","en": "Air Balloon"},{"es": "Tarjeta Roja","en": "Red Card"},{"es": "Blanco","en": "Ring Target"},{"es": "Banda Atadura","en": "Binding Band"},{"es": "Tubérculo","en": "Absorb Bulb"},{"es": "Pila","en": "Cell Battery"},{"es": "Botón Escape","en": "Eject Button"},{"es": "Gema Fuego","en": "Fire Gem"},{"es": "Gema Agua","en": "Water Gem"},{"es": "Gema Eléctrica","en": "Electric Gem"},{"es": "Gema Planta","en": "Grass Gem"},{"es": "Gema Hielo","en": "Ice Gem"},{"es": "Gema Lucha","en": "Fighting Gem"},{"es": "Gema Veneno","en": "Poison Gem"},{"es": "Gema Tierra","en": "Ground Gem"},{"es": "Gema Voladora","en": "Flying Gem"},{"es": "Gema Psíquica","en": "Psychic Gem"},{"es": "Gema Bicho","en": "Bug Gem"},{"es": "Gema Roca","en": "Rock Gem"},{"es": "Gema Fantasma","en": "Ghost Gem"},{"es": "Gema Siniestra","en": "Dark Gem"},{"es": "Gema Acero","en": "Steel Gem"},{"es": "Pluma Vigor","en": "Health Feather"},{"es": "Pluma Músculo","en": "Muscle Feather"},{"es": "Pluma Aguante","en": "Resist Feather"},{"es": "Pluma Intelecto","en": "Genius Feather"},{"es": "Pluma Mente","en": "Clever Feather"},{"es": "Pluma Ímpetu","en": "Swift Feather"},{"es": "Pluma Bella","en": "Pretty Feather"},{"es": "Fósil Tapa","en": "Cover Fossil"},{"es": "Fósil Pluma","en": "Plume Fossil"},{"es": "Tarjeta Libertad","en": "Liberty Pass"},{"es": "Regalosfera","en": "Pass Orb"},{"es": "Ensueño Ball","en": "Dream Ball"},{"es": "Pokéseñuelo","en": "Poké Toy"},{"es": "Neceser","en": "Prop Case"},{"es": "Cráneo Dragón","en": "Dragon Skull"},{"es": "Seta Aroma","en": "Balm Mushroom"},{"es": "Maxipepita","en": "Big Nugget"},{"es": "Sarta Perlas","en": "Pearl String"},{"es": "Fragmento Cometa","en": "Comet Shard"},{"es": "Real Cobre","en": "Relic Copper"},{"es": "Real Plata","en": "Relic Silver"},{"es": "Real Oro","en": "Relic Gold"},{"es": "Ánfora","en": "Relic Vase"},{"es": "Brazal","en": "Relic Band"},{"es": "Efigie Antigua","en": "Relic Statue"},{"es": "Corona Antigua","en": "Relic Crown"},{"es": "Porcehelado","en": "Casteliacone"},{"es": "Crítico X 2","en": "Dire Hit 2"},{"es": "Velocidad X 2","en": "X Speed 2"},{"es": "At. Esp. X 2","en": "X Sp. Atk 2"},{"es": "Def. Esp. X 2","en": "X Sp. Def 2"},{"es": "Defensa X 2","en": "X Defense 2"},{"es": "Ataque X 2","en": "X Attack 2"},{"es": "Precisión X 2","en": "X Accuracy 2"},{"es": "Velocidad X 3","en": "X Speed 3"},{"es": "At. Esp. X 3","en": "X Sp. Atk 3"},{"es": "Def. Esp. X 3","en": "X Sp. Def 3"},{"es": "Defensa X 3","en": "X Defense 3"},{"es": "Ataque X 3","en": "X Attack 3"},{"es": "Precisión X 3","en": "X Accuracy 3"},{"es": "Velocidad X 6","en": "X Speed 6"},{"es": "At. Esp. X 6","en": "X Sp. Atk 6"},{"es": "Def. Esp. X 6","en": "X Sp. Def 6"},{"es": "Defensa X 6","en": "X Defense 6"},{"es": "Ataque X 6","en": "X Attack 6"},{"es": "Precisión X 6","en": "X Accuracy 6"},{"es": "Habilitador","en": "Ability Urge"},{"es": "Tiraobjeto","en": "Item Drop"},{"es": "Activaobjeto","en": "Item Urge"},{"es": "Quitaestado","en": "Reset Urge"},{"es": "Crítico X 3","en": "Dire Hit 3"},{"es": "Orbe Claro","en": "Light Stone"},{"es": "Orbe Oscuro","en": "Dark Stone"},{"es": "MT93","en": "TM93"},{"es": "MT94","en": "TM94"},{"es": "MT95","en": "TM95"},{"es": "Videomisor","en": "Xtransceiver"},{"es": "Envío 1","en": "Gram 1"},{"es": "Envío 2","en": "Gram 2"},{"es": "Envío 3","en": "Gram 3"},{"es": "Gema Dragón","en": "Dragon Gem"},{"es": "Gema Normal","en": "Normal Gem"},{"es": "Caja Insignias","en": "Medal Box"},{"es": "Punta ADN","en": "DNA Splicers"},{"es": "Pase","en": "Permit"},{"es": "Amuleto Oval","en": "Oval Charm"},{"es": "Amuleto Iris","en": "Shiny Charm"},{"es": "Tarjeta Plasma","en": "Plasma Card"},{"es": "Pañuelo Sucio","en": "Grubby Hanky"},{"es": "Acromáquina","en": "Colress Machine"},{"es": "Objeto Perdido","en": "Dropped Item"},{"es": "Espejo Veraz","en": "Reveal Glass"},{"es": "Seguro Debilidad","en": "Weakness Policy"},{"es": "Equipo de Asalto","en": "Assault Vest"},{"es": "Tabla Duende","en": "Pixie Plate"},{"es": "Cáps. Habilidad","en": "Ability Capsule"},{"es": "Dulce de Nata","en": "Whipped Dream"},{"es": "Saquito Fragante","en": "Sachet"},{"es": "Musgo Brillante","en": "Luminous Moss"},{"es": "Bola de Nieve","en": "Snowball"},{"es": "Gafa Protectora","en": "Safety Goggles"},{"es": "Abono Fértil","en": "Rich Mulch"},{"es": "Abono Sorpresa","en": "Surprise Mulch"},{"es": "Abono Fructífero","en": "Boost Mulch"},{"es": "Abono Insólito","en": "Amaze Mulch"},{"es": "Gengarita","en": "Gengarite"},{"es": "Gardevoirita","en": "Gardevoirite"},{"es": "Ampharosita","en": "Ampharosite"},{"es": "Venusaurita","en": "Venusaurite"},{"es": "Charizardita X","en": "Charizardite X"},{"es": "Blastoisita","en": "Blastoisinite"},{"es": "Mewtwoita X","en": "Mewtwonite X"},{"es": "Mewtwoita Y","en": "Mewtwonite Y"},{"es": "Blazikenita","en": "Blazikenite"},{"es": "Medichamita","en": "Medichamite"},{"es": "Houndoomita","en": "Houndoominite"},{"es": "Aggronita","en": "Aggronite"},{"es": "Banettita","en": "Banettite"},{"es": "Tyranitarita","en": "Tyranitarite"},{"es": "Scizorita","en": "Scizorite"},{"es": "Pinsirita","en": "Pinsirite"},{"es": "Aerodactylita","en": "Aerodactylite"},{"es": "Lucarita","en": "Lucarionite"},{"es": "Abomasnowita","en": "Abomasite"},{"es": "Kangaskhanita","en": "Kangaskhanite"},{"es": "Gyaradosita","en": "Gyaradosite"},{"es": "Absolita","en": "Absolite"},{"es": "Charizardita Y","en": "Charizardite Y"},{"es": "Alakazamita","en": "Alakazite"},{"es": "Heracrossita","en": "Heracronite"},{"es": "Mawilita","en": "Mawilite"},{"es": "Manectricita","en": "Manectite"},{"es": "Garchompita","en": "Garchompite"},{"es": "Baya Hibis","en": "Roseli Berry"},{"es": "Baya Biglia","en": "Kee Berry"},{"es": "Baya Maranga","en": "Maranga Berry"},{"es": "Vale Descuento","en": "Discount Coupon"},{"es": "Estatuilla Rara","en": "Strange Souvenir"},{"es": "Crêpe Luminalia","en": "Lumiose Galette"},{"es": "Fósil Mandíbula","en": "Jaw Fossil"},{"es": "Fósil Aleta","en": "Sail Fossil"},{"es": "Gema Hada","en": "Fairy Gem"},{"es": "Guía de Aventura","en": "Adventure Guide"},{"es": "Llave Ascensor","en": "Elevator Key"},{"es": "Holomisor","en": "Holo Caster"},{"es": "Emblema Kalos","en": "Honor of Kalos"},{"es": "Piedra Insólita","en": "Intriguing Stone"},{"es": "Portalentillas","en": "Lens Case"},{"es": "Boleto Handsome","en": "Looker Ticket"},{"es": "Mega-Aro","en": "Mega Ring"},{"es": "Pase Central","en": "Power Plant Pass"},{"es": "Carta Profesor","en": "Prof’s Letter"},{"es": "Patines","en": "Roller Skates"},{"es": "Lotadgadera","en": "Sprinklotad"},{"es": "Abono del TMV","en": "TMV Pass"},{"es": "MT96","en": "TM96"},{"es": "MT97","en": "TM97"},{"es": "MT98","en": "TM98"},{"es": "MT99","en": "TM99"},{"es": "MT100","en": "TM100"},{"es": "Latiasita","en": "Latiasite"},{"es": "Latiosita","en": "Latiosite"},{"es": "Piedra Común","en": "Common Stone"},{"es": "Kit Maquillaje","en": "Makeup Bag"},{"es": "Maleta","en": "Travel Trunk"},{"es": "Galleta Yantra","en": "Shalour Sable"},{"es": "Megacolgante","en": "Mega Charm"},{"es": "Megaguante","en": "Mega Glove"},{"es": "Piezas Devon","en": "Devon Parts"},{"es": "Kit de Pokécubos","en": "Pokéblock Kit"},{"es": "Ll. Habitación 1","en": "Key to Room 1"},{"es": "Ll. Habitación 2","en": "Key to Room 2"},{"es": "Ll. Habitación 4","en": "Key to Room 4"},{"es": "Ll. Habitación 6","en": "Key to Room 6"},{"es": "Bombona Devon","en": "Devon Scuba Gear"},{"es": "Traje de Gala","en": "Contest Costume"},{"es": "Traje Magma","en": "Magma Suit"},{"es": "Traje Aqua","en": "Aqua Suit"},{"es": "Entrada para dos","en": "Pair of Tickets"},{"es": "Megapulsera","en": "Mega Bracelet"},{"es": "Megacollar","en": "Mega Pendant"},{"es": "Megagafas","en": "Mega Glasses"},{"es": "Megaancla","en": "Mega Anchor"},{"es": "Megabroche","en": "Mega Stickpin"},{"es": "Palo","en": "Stick"},{"es": "Megatiara","en": "Mega Tiara"},{"es": "Megatobillera","en": "Mega Anklet"},{"es": "Swampertita","en": "Swampertite"},{"es": "Sceptilita","en": "Sceptilite"},{"es": "Sableynita","en": "Sablenite"},{"es": "Altarianita","en": "Altarianite"},{"es": "Galladita","en": "Galladite"},{"es": "Audinita","en": "Audinite"},{"es": "Metagrossita","en": "Metagrossite"},{"es": "Sharpedonita","en": "Sharpedonite"},{"es": "Slowbronita","en": "Slowbronite"},{"es": "Steelixita","en": "Steelixite"},{"es": "Pidgeotita","en": "Pidgeotite"},{"es": "Glalita","en": "Glalitite"},{"es": "Diancita","en": "Diancite"},{"es": "Vasija Castigo","en": "Prison Bottle"},{"es": "Megabrazalete","en": "Mega Cuff"},{"es": "Cameruptita","en": "Cameruptite"},{"es": "Lopunnita","en": "Lopunnite"},{"es": "Salamencita","en": "Salamencite"},{"es": "Beedrillita","en": "Beedrillite"},{"es": "Piedra Activadora","en": "Key Stone"},{"es": "Frag. Meteorito","en": "Meteorite Shard"},{"es": "Flauta Eón","en": "Eon Flute"},{"es": "Normastal Z","en": "Normalium Z"},{"es": "Pirostal Z","en": "Firium Z"},{"es": "Hidrostal Z","en": "Waterium Z"},{"es": "Electrostal Z","en": "Electrium Z"},{"es": "Fitostal Z","en": "Grassium Z"},{"es": "Criostal Z","en": "Icium Z"},{"es": "Lizastal Z","en": "Fightinium Z"},{"es": "Toxistal Z","en": "Poisonium Z"},{"es": "Geostal Z","en": "Groundium Z"},{"es": "Aerostal Z","en": "Flyinium Z"},{"es": "Psicostal Z","en": "Psychium Z"},{"es": "Insectostal Z","en": "Buginium Z"},{"es": "Litostal Z","en": "Rockium Z"},{"es": "Espectrostal Z","en": "Ghostium Z"},{"es": "Dracostal Z","en": "Dragonium Z"},{"es": "Nictostal Z","en": "Darkinium Z"},{"es": "Metalostal Z","en": "Steelium Z"},{"es": "Feeristal Z","en": "Fairium Z"},{"es": "Pikastal Z","en": "Pikanium Z"},{"es": "Chapa Plateada","en": "Bottle Cap"},{"es": "Chapa Dorada","en": "Gold Bottle Cap"},{"es": "Pulsera Z","en": "Z-Ring"},{"es": "Dueyestal Z","en": "Decidium Z"},{"es": "Incinostal Z","en": "Incinium Z"},{"es": "Primastal Z","en": "Primarium Z"},{"es": "Tapistal Z","en": "Tapunium Z"},{"es": "Marshastal Z","en": "Marshadium Z"},{"es": "Alo-Raistal Z","en": "Aloraichium Z"},{"es": "Snorlastal Z","en": "Snorlium Z"},{"es": "Eeveestal Z","en": "Eevium Z"},{"es": "Mewstal Z","en": "Mewnium Z"},{"es": "Ash-Pikastal Z","en": "Pikashunium Z"},{"es": "Zurrón","en": "Forage Bag"},{"es": "Caña","en": "Fishing Rod"},{"es": "Máscara Profesor","en": "Professor’s Mask"},{"es": "Festicupón","en": "Festival Ticket"},{"es": "Piedra Brillante","en": "Sparkling Stone"},{"es": "Nerviosfera","en": "Adrenaline Orb"},{"es": "Arca de Zygarde","en": "Zygarde Cube"},{"es": "Piedra Hielo","en": "Ice Stone"},{"es": "Buscamontura","en": "Ride Pager"},{"es": "Ente Ball","en": "Beast Ball"},{"es": "Malasada Maxi","en": "Big Malasada"},{"es": "Néctar Rojo","en": "Red Nectar"},{"es": "Néctar Amarillo","en": "Yellow Nectar"},{"es": "Néctar Rosa","en": "Pink Nectar"},{"es": "Néctar Violeta","en": "Purple Nectar"},{"es": "Flauta Solar","en": "Sun Flute"},{"es": "Flauta Lunar","en": "Moon Flute"},{"es": "Nota Intrigante","en": "Enigmatic Card"},{"es": "Cubresuelos","en": "Terrain Extender"},{"es": "Paracontacto","en": "Protective Pads"},{"es": "Semilla Electro","en": "Electric Seed"},{"es": "Semilla Psique","en": "Psychic Seed"},{"es": "Semilla Bruma","en": "Misty Seed"},{"es": "Semilla Hierba","en": "Grassy Seed"},{"es": "Disco Lucha","en": "Fighting Memory"},{"es": "Disco Volador","en": "Flying Memory"},{"es": "Disco Veneno","en": "Poison Memory"},{"es": "Disco Tierra","en": "Ground Memory"},{"es": "Disco Roca","en": "Rock Memory"},{"es": "Disco Bicho","en": "Bug Memory"},{"es": "Disco Fantasma","en": "Ghost Memory"},{"es": "Disco Acero","en": "Steel Memory"},{"es": "Disco Fuego","en": "Fire Memory"},{"es": "Disco Agua","en": "Water Memory"},{"es": "Disco Planta","en": "Grass Memory"},{"es": "Disco Eléctrico","en": "Electric Memory"},{"es": "Disco Psíquico","en": "Psychic Memory"},{"es": "Disco Hielo","en": "Ice Memory"},{"es": "Disco Dragón","en": "Dragon Memory"},{"es": "Disco Siniestro","en": "Dark Memory"},{"es": "Disco Hada","en": "Fairy Memory"},{"es": "Bici","en": "Bike"},{"es": "Llave Almacén","en": "Storage Key"},{"es": "Llave Sótano","en": "Basement Key"},{"es": "Videomisor","en": "Xtransceiver"},{"es": "Videomisor","en": "Xtransceiver"},{"es": "Punta ADN","en": "DNA Splicers"},{"es": "Punta ADN","en": "DNA Splicers"},{"es": "Objeto Perdido","en": "Dropped Item"},{"es": "Objeto Perdido","en": "Dropped Item"},{"es": "Holomisor","en": "Holo Caster"},{"es": "Bici","en": "Bike"},{"es": "Holomisor","en": "Holo Caster"},{"es": "Llave del Sótano","en": "Basement Key"},{"es": "Llave Almacén","en": "Storage Key"},{"es": "Ticket Barco","en": "S.S. Ticket"},{"es": "Vestido de Gala","en": "Contest Costume"},{"es": "Meteorito","en": "Meteorite"},{"es": "Meteorito","en": "Meteorite"},{"es": "Meteorito","en": "Meteorite"},{"es": "Normastal Z","en": "Normalium Z"},{"es": "Pirostal Z","en": "Firium Z"},{"es": "Hidrostal Z","en": "Waterium Z"},{"es": "Electrostal Z","en": "Electrium Z"},{"es": "Fitostal Z","en": "Grassium Z"},{"es": "Criostal Z","en": "Icium Z"},{"es": "Lizastal Z","en": "Fightinium Z"},{"es": "Toxistal Z","en": "Poisonium Z"},{"es": "Geostal Z","en": "Groundium Z"},{"es": "Aerostal Z","en": "Flyinium Z"},{"es": "Psicostal Z","en": "Psychium Z"},{"es": "Insectostal Z","en": "Buginium Z"},{"es": "Litostal Z","en": "Rockium Z"},{"es": "Espectrostal Z","en": "Ghostium Z"},{"es": "Dracostal Z","en": "Dragonium Z"},{"es": "Nictostal Z","en": "Darkinium Z"},{"es": "Metalostal Z","en": "Steelium Z"},{"es": "Feeristal Z","en": "Fairium Z"},{"es": "Pikastal Z","en": "Pikanium Z"},{"es": "Dueyestal Z","en": "Decidium Z"},{"es": "Incinostal Z","en": "Incinium Z"},{"es": "Primastal Z","en": "Primarium Z"},{"es": "Tapistal Z","en": "Tapunium Z"},{"es": "Marshastal Z","en": "Marshadium Z"},{"es": "Alo-Raistal Z","en": "Aloraichium Z"},{"es": "Snorlastal Z","en": "Snorlium Z"},{"es": "Eeveestal Z","en": "Eevium Z"},{"es": "Mewstal Z","en": "Mewnium Z"},{"es": "Ash-Pikastal Z","en": "Pikashunium Z"},{"es": "Solgaleostal Z","en": "Solganium Z"},{"es": "Lunalastal Z","en": "Lunalium Z"},{"es": "Ultranecrostal Z","en": "Ultranecrozium Z"},{"es": "Mimikyustal Z","en": "Mimikium Z"},{"es": "Lycanrostal Z","en": "Lycanium Z"},{"es": "Kommostal Z","en": "Kommonium Z"},{"es": "Solgaleostal Z","en": "Solganium Z"},{"es": "Lunalastal Z","en": "Lunalium Z"},{"es": "Ultranecrostal Z","en": "Ultranecrozium Z"},{"es": "Mimikyustal Z","en": "Mimikium Z"},{"es": "Lycanrostal Z","en": "Lycanium Z"},{"es": "Kommostal Z","en": "Kommonium Z"},{"es": "Superpulsera Z","en": "Z-Power Ring"},{"es": "Pétalo Rosa","en": "Pink Petal"},{"es": "Pétalo Naranja","en": "Orange Petal"},{"es": "Pétalo Azul","en": "Blue Petal"},{"es": "Pétalo Rojo","en": "Red Petal"},{"es": "Pétalo Verde","en": "Green Petal"},{"es": "Pétalo Amarillo","en": "Yellow Petal"},{"es": "Pétalo Violeta","en": "Purple Petal"},{"es": "Flor Irisada","en": "Rainbow Flower"},{"es": "Medalla Fulgor","en": "Surge Badge"},{"es": "Necrosol","en": "N-Solarizer"},{"es": "Necroluna","en": "N-Lunarizer"},{"es": "Necrosol","en": "N-Solarizer"},{"es": "Necroluna","en": "N-Lunarizer"},{"es": "Cristal Z (Liam)","en": "Ilima Normalium Z"},{"es": "Poké Ball Ajena","en": "Left Poké Ball"},{"es": "Cupón Eclosión","en": "Roto Hatch"},{"es": "Cupón Rebaja","en": "Roto Bargain"},{"es": "Cupón Botín","en": "Roto Prize Money"},{"es": "Cupón Exp","en": "Roto Exp. Points"},{"es": "Cupón Amistad","en": "Roto Friendship"},{"es": "Cupón Reclamo","en": "Roto Encounter"},{"es": "Cupón Sigilo","en": "Roto Stealth"},{"es": "Cupón PS","en": "Roto HP Restore"},{"es": "Cupón PP","en": "Roto PP Restore"},{"es": "Cupón Refuerzo","en": "Roto Boost"},{"es": "Cupón Captura","en": "Roto Catch"},{"es": "Autógrafo","en": "Autograph"},{"es": "Caja de Pokémon","en": "Pokémon Box Link"},{"es": "Botiquín","en": "Medicine Pocket"},{"es": "Tarro de Caramelos","en": "Candy Jar"},{"es": "Bolsillo Mejoras","en": "Power-Up Pocket"},{"es": "Maleta","en": "Clothing Trunk"},{"es": "Bolsillo Captura","en": "Catching Pocket"},{"es": "Bolsillo Combate","en": "Battle Pocket"},{"es": "Baya Frambu Plateada","en": "Silver Razz Berry"},{"es": "Baya Frambu Dorada","en": "Golden Razz Berry"},{"es": "Baya Latano Plateada","en": "Silver Nanab Berry"},{"es": "Baya Latano Dorada","en": "Golden Nanab Berry"},{"es": "Baya Pinia Plateada","en": "Silver Pinap Berry"},{"es": "Baya Pinia Dorada","en": "Golden Pinap Berry"},{"es": "Llave Secreta","en": "Secret Key"},{"es": "Ticket del Barco","en": "S.S. Ticket"},{"es": "Paquete","en": "Parcel"},{"es": "Llave Magnética","en": "Card Key"},{"es": "Muelle Estirado","en": "Stretchy Spring"},{"es": "Tiza","en": "Chalky Stone"},{"es": "Canica","en": "Marble"},{"es": "Pendiente","en": "Lone Earring"},{"es": "Cristal Marino","en": "Beach Glass"},{"es": "Hoja de Oro","en": "Gold Leaf"},{"es": "Hoja de Plata","en": "Silver Leaf"},{"es": "Bola de Arcilla","en": "Polished Mud Ball"},{"es": "Concha Tropical","en": "Tropical Shell"},{"es": "Hoja Escrita","en": "Leaf Letter"},{"es": "Hoja Escrita","en": "Leaf Letter"},{"es": "Ramo Pequeño","en": "Small Bouquet"},{"es": "Colonia","en": "Lure"},{"es": "Supercolonia","en": "Super Lure"},{"es": "Colonia Máxima","en": "Max Lure"},{"es": "Rokikos","en": "Pewter Crunchies"},{"es": "Caramelo Vigor","en": "Health Candy"},{"es": "Caramelo Músculo","en": "Mighty Candy"},{"es": "Caramelo Aguante","en": "Tough Candy"},{"es": "Caramelo Intelecto","en": "Smart Candy"},{"es": "Caramelo Mente","en": "Courage Candy"},{"es": "Caramelo Ímpetu","en": "Quick Candy"},{"es": "Caramelo Vigor +","en": "Health Candy L"},{"es": "Caramelo Músculo +","en": "Mighty Candy L"},{"es": "Caramelo Aguante +","en": "Tough Candy L"},{"es": "Caramelo Intelecto +","en": "Smart Candy L"},{"es": "Caramelo Mente +","en": "Courage Candy L"},{"es": "Caramelo Ímpetu +","en": "Quick Candy L"},{"es": "Caramelo Vigor ++","en": "Health Candy XL"},{"es": "Caramelo Músculo ++","en": "Mighty Candy XL"},{"es": "Caramelo Aguante ++","en": "Tough Candy XL"},{"es": "Caramelo Intelecto ++","en": "Smart Candy XL"},{"es": "Caramelo Mente ++","en": "Courage Candy XL"},{"es": "Caramelo Ímpetu ++","en": "Quick Candy XL"},{"es": "Caramelo Bulbasaur","en": "Bulbasaur Candy"},{"es": "Caramelo Charmander","en": "Charmander Candy"},{"es": "Caramelo Squirtle","en": "Squirtle Candy"},{"es": "Caramelo Caterpie","en": "Caterpie Candy"},{"es": "Caramelo Weedle","en": "Weedle Candy"},{"es": "Caramelo Pidgey","en": "Pidgey Candy"},{"es": "Caramelo Rattata","en": "Rattata Candy"},{"es": "Caramelo Spearow","en": "Spearow Candy"},{"es": "Caramelo Ekans","en": "Ekans Candy"},{"es": "Caramelo Pikachu","en": "Pikachu Candy"},{"es": "Caramelo Sandshrew","en": "Sandshrew Candy"},{"es": "Caramelo Nidoran♀","en": "Nidoran♀ Candy"},{"es": "Caramelo Nidoran♂","en": "Nidoran♂ Candy"},{"es": "Caramelo Clefairy","en": "Clefairy Candy"},{"es": "Caramelo Vulpix","en": "Vulpix Candy"},{"es": "Caramelo Jigglypuff","en": "Jigglypuff Candy"},{"es": "Caramelo Zubat","en": "Zubat Candy"},{"es": "Caramelo Oddish","en": "Oddish Candy"},{"es": "Caramelo Paras","en": "Paras Candy"},{"es": "Caramelo Venonat","en": "Venonat Candy"},{"es": "Caramelo Diglett","en": "Diglett Candy"},{"es": "Caramelo Meowth","en": "Meowth Candy"},{"es": "Caramelo Psyduck","en": "Psyduck Candy"},{"es": "Caramelo Mankey","en": "Mankey Candy"},{"es": "Caramelo Growlithe","en": "Growlithe Candy"},{"es": "Caramelo Poliwag","en": "Poliwag Candy"},{"es": "Caramelo Abra","en": "Abra Candy"},{"es": "Caramelo Machop","en": "Machop Candy"},{"es": "Caramelo Bellsprout","en": "Bellsprout Candy"},{"es": "Caramelo Tentacool","en": "Tentacool Candy"},{"es": "Caramelo Geodude","en": "Geodude Candy"},{"es": "Caramelo Ponyta","en": "Ponyta Candy"},{"es": "Caramelo Slowpoke","en": "Slowpoke Candy"},{"es": "Caramelo Magnemite","en": "Magnemite Candy"},{"es": "Caramelo Farfetch’d","en": "Farfetch’d Candy"},{"es": "Caramelo Doduo","en": "Doduo Candy"},{"es": "Caramelo Seel","en": "Seel Candy"},{"es": "Caramelo Grimer","en": "Grimer Candy"},{"es": "Caramelo Shellder","en": "Shellder Candy"},{"es": "Caramelo Gastly","en": "Gastly Candy"},{"es": "Caramelo Onix","en": "Onix Candy"},{"es": "Caramelo Drowzee","en": "Drowzee Candy"},{"es": "Caramelo Krabby","en": "Krabby Candy"},{"es": "Caramelo Voltorb","en": "Voltorb Candy"},{"es": "Caramelo Exeggcute","en": "Exeggcute Candy"},{"es": "Caramelo Cubone","en": "Cubone Candy"},{"es": "Caramelo Hitmonlee","en": "Hitmonlee Candy"},{"es": "Caramelo Hitmonchan","en": "Hitmonchan Candy"},{"es": "Caramelo Lickitung","en": "Lickitung Candy"},{"es": "Caramelo Koffing","en": "Koffing Candy"},{"es": "Caramelo Rhyhorn","en": "Rhyhorn Candy"},{"es": "Caramelo Chansey","en": "Chansey Candy"},{"es": "Caramelo Tangela","en": "Tangela Candy"},{"es": "Caramelo Kangaskhan","en": "Kangaskhan Candy"},{"es": "Caramelo Horsea","en": "Horsea Candy"},{"es": "Caramelo Goldeen","en": "Goldeen Candy"},{"es": "Caramelo Staryu","en": "Staryu Candy"},{"es": "Caramelo Mr. Mime","en": "Mr. Mime Candy"},{"es": "Caramelo Scyther","en": "Scyther Candy"},{"es": "Caramelo Jynx","en": "Jynx Candy"},{"es": "Caramelo Electabuzz","en": "Electabuzz Candy"},{"es": "Caramelo Pinsir","en": "Pinsir Candy"},{"es": "Caramelo Tauros","en": "Tauros Candy"},{"es": "Caramelo Magikarp","en": "Magikarp Candy"},{"es": "Caramelo Lapras","en": "Lapras Candy"},{"es": "Caramelo Ditto","en": "Ditto Candy"},{"es": "Caramelo Eevee","en": "Eevee Candy"},{"es": "Caramelo Porygon","en": "Porygon Candy"},{"es": "Caramelo Omanyte","en": "Omanyte Candy"},{"es": "Caramelo Kabuto","en": "Kabuto Candy"},{"es": "Caramelo Aerodactyl","en": "Aerodactyl Candy"},{"es": "Caramelo Snorlax","en": "Snorlax Candy"},{"es": "Caramelo Articuno","en": "Articuno Candy"},{"es": "Caramelo Zapdos","en": "Zapdos Candy"},{"es": "Caramelo Moltres","en": "Moltres Candy"},{"es": "Caramelo Dratini","en": "Dratini Candy"},{"es": "Caramelo Mewtwo","en": "Mewtwo Candy"},{"es": "Caramelo Mew","en": "Mew Candy"},{"es": "Caramelo Meltan","en": "Meltan Candy"},{"es": "Caramelo Magmar","en": "Magmar Candy"},{"es": "Recomendación","en": "Endorsement"},{"es": "Caja de Pokémon","en": "Pokémon Box Link"},{"es": "Estrella Deseo","en": "Wishing Star"},{"es": "Maximuñequera","en": "Dynamax Band"},{"es": "Caña","en": "Fishing Rod"},{"es": "Bici Rotom","en": "Rotom Bike"},{"es": "Salchichas","en": "Sausages"},{"es": "Lata de Darren","en": "Bob’s Food Tin"},{"es": "Lata de Bach","en": "Bach’s Food Tin"},{"es": "Lata de Habas","en": "Tin of Beans"},{"es": "Pan de Molde","en": "Bread"},{"es": "Pasta","en": "Pasta"},{"es": "Setas","en": "Mixed Mushrooms"},{"es": "Cola Ahumada","en": "Smoke-Poke Tail"},{"es": "Puerro Grueso","en": "Large Leek"},{"es": "Manzana Selecta","en": "Fancy Apple"},{"es": "Huesos Finos","en": "Brittle Bones"},{"es": "Patatas","en": "Pack of Potatoes"},{"es": "Hierba Intensa","en": "Pungent Root"},{"es": "Verduras","en": "Salad Mix"},{"es": "Frituras","en": "Fried Food"},{"es": "Huevo Duro","en": "Boiled Egg"},{"es": "Kit de Acampada","en": "Camping Gear"},{"es": "Espada Oxidada","en": "Rusted Sword"},{"es": "Escudo Oxidado","en": "Rusted Shield"},{"es": "Ornitofósil","en": "Fossilized Bird"},{"es": "Ictiofósil","en": "Fossilized Fish"},{"es": "Dracofósil","en": "Fossilized Drake"},{"es": "Plesiofósil","en": "Fossilized Dino"},{"es": "Confite Fresa","en": "Strawberry Sweet"},{"es": "Confite Corazón","en": "Love Sweet"},{"es": "Confite Fruto","en": "Berry Sweet"},{"es": "Confite Trébol","en": "Clover Sweet"},{"es": "Confite Flor","en": "Flower Sweet"},{"es": "Confite Estrella","en": "Star Sweet"},{"es": "Confite Lazo","en": "Ribbon Sweet"},{"es": "Manzana Dulce","en": "Sweet Apple"},{"es": "Manzana Ácida","en": "Tart Apple"},{"es": "Espray Bucal","en": "Throat Spray"},{"es": "Mochila Escape","en": "Eject Pack"},{"es": "Botas Gruesas","en": "Heavy-Duty Boots"},{"es": "Seguro Fallo","en": "Blunder Policy"},{"es": "Servicio Raro","en": "Room Service"},{"es": "Parasol Multiuso","en": "Utility Umbrella"},{"es": "Caramelo Exp. XS","en": "Exp. Candy XS"},{"es": "Caramelo Exp. S","en": "Exp. Candy S"},{"es": "Caramelo Exp. M","en": "Exp. Candy M"},{"es": "Caramelo Exp. L","en": "Exp. Candy L"},{"es": "Caramelo Exp. XL","en": "Exp. Candy XL"},{"es": "Caramelo Dinamax","en": "Dynamax Candy"},{"es": "DT00","en": "TR00"},{"es": "DT01","en": "TR01"},{"es": "DT02","en": "TR02"},{"es": "DT03","en": "TR03"},{"es": "DT04","en": "TR04"},{"es": "DT05","en": "TR05"},{"es": "DT06","en": "TR06"},{"es": "DT07","en": "TR07"},{"es": "DT08","en": "TR08"},{"es": "DT09","en": "TR09"},{"es": "DT10","en": "TR10"},{"es": "DT11","en": "TR11"},{"es": "DT12","en": "TR12"},{"es": "DT13","en": "TR13"},{"es": "DT14","en": "TR14"},{"es": "DT15","en": "TR15"},{"es": "DT16","en": "TR16"},{"es": "DT17","en": "TR17"},{"es": "DT18","en": "TR18"},{"es": "DT19","en": "TR19"},{"es": "DT20","en": "TR20"},{"es": "DT21","en": "TR21"},{"es": "DT22","en": "TR22"},{"es": "DT23","en": "TR23"},{"es": "DT24","en": "TR24"},{"es": "DT25","en": "TR25"},{"es": "DT26","en": "TR26"},{"es": "DT27","en": "TR27"},{"es": "DT28","en": "TR28"},{"es": "DT29","en": "TR29"},{"es": "DT30","en": "TR30"},{"es": "DT31","en": "TR31"},{"es": "DT32","en": "TR32"},{"es": "DT33","en": "TR33"},{"es": "DT34","en": "TR34"},{"es": "DT35","en": "TR35"},{"es": "DT36","en": "TR36"},{"es": "DT37","en": "TR37"},{"es": "DT38","en": "TR38"},{"es": "DT39","en": "TR39"},{"es": "DT40","en": "TR40"},{"es": "DT41","en": "TR41"},{"es": "DT42","en": "TR42"},{"es": "DT43","en": "TR43"},{"es": "DT44","en": "TR44"},{"es": "DT45","en": "TR45"},{"es": "DT46","en": "TR46"},{"es": "DT47","en": "TR47"},{"es": "DT48","en": "TR48"},{"es": "DT49","en": "TR49"},{"es": "DT50","en": "TR50"},{"es": "DT51","en": "TR51"},{"es": "DT52","en": "TR52"},{"es": "DT53","en": "TR53"},{"es": "DT54","en": "TR54"},{"es": "DT55","en": "TR55"},{"es": "DT56","en": "TR56"},{"es": "DT57","en": "TR57"},{"es": "DT58","en": "TR58"},{"es": "DT59","en": "TR59"},{"es": "DT60","en": "TR60"},{"es": "DT61","en": "TR61"},{"es": "DT62","en": "TR62"},{"es": "DT63","en": "TR63"},{"es": "DT64","en": "TR64"},{"es": "DT65","en": "TR65"},{"es": "DT66","en": "TR66"},{"es": "DT67","en": "TR67"},{"es": "DT68","en": "TR68"},{"es": "DT69","en": "TR69"},{"es": "DT70","en": "TR70"},{"es": "DT71","en": "TR71"},{"es": "DT72","en": "TR72"},{"es": "DT73","en": "TR73"},{"es": "DT74","en": "TR74"},{"es": "DT75","en": "TR75"},{"es": "DT76","en": "TR76"},{"es": "DT77","en": "TR77"},{"es": "DT78","en": "TR78"},{"es": "DT79","en": "TR79"},{"es": "DT80","en": "TR80"},{"es": "DT81","en": "TR81"},{"es": "DT82","en": "TR82"},{"es": "DT83","en": "TR83"},{"es": "DT84","en": "TR84"},{"es": "DT85","en": "TR85"},{"es": "DT86","en": "TR86"},{"es": "DT87","en": "TR87"},{"es": "DT88","en": "TR88"},{"es": "DT89","en": "TR89"},{"es": "DT90","en": "TR90"},{"es": "DT91","en": "TR91"},{"es": "DT92","en": "TR92"},{"es": "DT93","en": "TR93"},{"es": "DT94","en": "TR94"},{"es": "DT95","en": "TR95"},{"es": "DT96","en": "TR96"},{"es": "DT97","en": "TR97"},{"es": "DT98","en": "TR98"},{"es": "DT99","en": "TR99"},{"es": "MT00","en": "TM00"},{"es": "Menta Huraña","en": "Lonely Mint"},{"es": "Menta Firme","en": "Adamant Mint"},{"es": "Menta Pícara","en": "Naughty Mint"},{"es": "Menta Audaz","en": "Brave Mint"},{"es": "Menta Osada","en": "Bold Mint"},{"es": "Menta Agitada","en": "Impish Mint"},{"es": "Menta Floja","en": "Lax Mint"},{"es": "Menta Plácida","en": "Relaxed Mint"},{"es": "Menta Modesta","en": "Modest Mint"},{"es": "Menta Afable","en": "Mild Mint"},{"es": "Menta Alocada","en": "Rash Mint"},{"es": "Menta Mansa","en": "Quiet Mint"},{"es": "Menta Serena","en": "Calm Mint"},{"es": "Menta Amable","en": "Gentle Mint"},{"es": "Menta Cauta","en": "Careful Mint"},{"es": "Menta Grosera","en": "Sassy Mint"},{"es": "Menta Miedosa","en": "Timid Mint"},{"es": "Menta Activa","en": "Hasty Mint"},{"es": "Menta Alegre","en": "Jolly Mint"},{"es": "Menta Ingenua","en": "Naive Mint"},{"es": "Menta Seria","en": "Serious Mint"},{"es": "Trozo Deseo","en": "Wishing Piece"},{"es": "Tetera Agrietada","en": "Cracked Pot"},{"es": "Tetera Rota","en": "Chipped Pot"},{"es": "Supertapones","en": "Hi-tech Earbuds"},{"es": "Fruta Tropical","en": "Fruit Bunch"},{"es": "Queso Mu-mu","en": "Moomoo Cheese"},{"es": "Especias","en": "Spice Mix"},{"es": "Nata Fresca","en": "Fresh Cream"},{"es": "Curri de Bote","en": "Packaged Curry"},{"es": "Leche de Coco","en": "Coconut Milk"},{"es": "Fideos de Bote","en": "Instant Noodles"},{"es": "Hamburguesas","en": "Precooked Burger"},{"es": "Especias Gigamax","en": "Gigantamix"},{"es": "Trocito Deseo","en": "Wishing Chip"},{"es": "Bici Rotom","en": "Rotom Bike"},{"es": "Amuleto Captura","en": "Catching Charm"},{"es": "Carta Ajada","en": "Old Letter"},{"es": "Autógrafo Grupo","en": "Band Autograph"},{"es": "Libro de Sonia","en": "Sonia’s Book"},{"es": "Catálogo Rotom","en": "Rotom Catalog"},{"es": "★And458","en": "★And458"},{"es": "★And15","en": "★And15"},{"es": "★And337","en": "★And337"},{"es": "★And603","en": "★And603"},{"es": "★And390","en": "★And390"},{"es": "★Sgr6879","en": "★Sgr6879"},{"es": "★Sgr6859","en": "★Sgr6859"},{"es": "★Sgr6913","en": "★Sgr6913"},{"es": "★Sgr7348","en": "★Sgr7348"},{"es": "★Sgr7121","en": "★Sgr7121"},{"es": "★Sgr6746","en": "★Sgr6746"},{"es": "★Sgr7194","en": "★Sgr7194"},{"es": "★Sgr7337","en": "★Sgr7337"},{"es": "★Sgr7343","en": "★Sgr7343"},{"es": "★Sgr6812","en": "★Sgr6812"},{"es": "★Sgr7116","en": "★Sgr7116"},{"es": "★Sgr7264","en": "★Sgr7264"},{"es": "★Sgr7597","en": "★Sgr7597"},{"es": "★Del7882","en": "★Del7882"},{"es": "★Del7906","en": "★Del7906"},{"es": "★Del7852","en": "★Del7852"},{"es": "★Psc596","en": "★Psc596"},{"es": "★Psc361","en": "★Psc361"},{"es": "★Psc510","en": "★Psc510"},{"es": "★Psc437","en": "★Psc437"},{"es": "★Psc8773","en": "★Psc8773"},{"es": "★Lep1865","en": "★Lep1865"},{"es": "★Lep1829","en": "★Lep1829"},{"es": "★Boo5340","en": "★Boo5340"},{"es": "★Boo5506","en": "★Boo5506"},{"es": "★Boo5435","en": "★Boo5435"},{"es": "★Boo5602","en": "★Boo5602"},{"es": "★Boo5733","en": "★Boo5733"},{"es": "★Boo5235","en": "★Boo5235"},{"es": "★Boo5351","en": "★Boo5351"},{"es": "★Hya3748","en": "★Hya3748"},{"es": "★Hya3903","en": "★Hya3903"},{"es": "★Hya3418","en": "★Hya3418"},{"es": "★Hya3482","en": "★Hya3482"},{"es": "★Hya3845","en": "★Hya3845"},{"es": "★Eri1084","en": "★Eri1084"},{"es": "★Eri472","en": "★Eri472"},{"es": "★Eri1666","en": "★Eri1666"},{"es": "★Eri897","en": "★Eri897"},{"es": "★Eri1231","en": "★Eri1231"},{"es": "★Eri874","en": "★Eri874"},{"es": "★Eri1298","en": "★Eri1298"},{"es": "★Eri1325","en": "★Eri1325"},{"es": "★Eri984","en": "★Eri984"},{"es": "★Eri1464","en": "★Eri1464"},{"es": "★Eri1393","en": "★Eri1393"},{"es": "★Eri850","en": "★Eri850"},{"es": "★Tau1409","en": "★Tau1409"},{"es": "★Tau1457","en": "★Tau1457"},{"es": "★Tau1165","en": "★Tau1165"},{"es": "★Tau1791","en": "★Tau1791"},{"es": "★Tau1910","en": "★Tau1910"},{"es": "★Tau1346","en": "★Tau1346"},{"es": "★Tau1373","en": "★Tau1373"},{"es": "★Tau1412","en": "★Tau1412"},{"es": "★CMa2491","en": "★CMa2491"},{"es": "★CMa2693","en": "★CMa2693"},{"es": "★CMa2294","en": "★CMa2294"},{"es": "★CMa2827","en": "★CMa2827"},{"es": "★CMa2282","en": "★CMa2282"},{"es": "★CMa2618","en": "★CMa2618"},{"es": "★CMa2657","en": "★CMa2657"},{"es": "★CMa2646","en": "★CMa2646"},{"es": "★UMa4905","en": "★UMa4905"},{"es": "★UMa4301","en": "★UMa4301"},{"es": "★UMa5191","en": "★UMa5191"},{"es": "★UMa5054","en": "★UMa5054"},{"es": "★UMa4295","en": "★UMa4295"},{"es": "★UMa4660","en": "★UMa4660"},{"es": "★UMa4554","en": "★UMa4554"},{"es": "★UMa4069","en": "★UMa4069"},{"es": "★UMa3569","en": "★UMa3569"},{"es": "★UMa3323","en": "★UMa3323"},{"es": "★UMa4033","en": "★UMa4033"},{"es": "★UMa4377","en": "★UMa4377"},{"es": "★UMa4375","en": "★UMa4375"},{"es": "★UMa4518","en": "★UMa4518"},{"es": "★UMa3594","en": "★UMa3594"},{"es": "★Vir5056","en": "★Vir5056"},{"es": "★Vir4825","en": "★Vir4825"},{"es": "★Vir4932","en": "★Vir4932"},{"es": "★Vir4540","en": "★Vir4540"},{"es": "★Vir4689","en": "★Vir4689"},{"es": "★Vir5338","en": "★Vir5338"},{"es": "★Vir4910","en": "★Vir4910"},{"es": "★Vir5315","en": "★Vir5315"},{"es": "★Vir5359","en": "★Vir5359"},{"es": "★Vir5409","en": "★Vir5409"},{"es": "★Vir5107","en": "★Vir5107"},{"es": "★Ari617","en": "★Ari617"},{"es": "★Ari553","en": "★Ari553"},{"es": "★Ari546","en": "★Ari546"},{"es": "★Ari951","en": "★Ari951"},{"es": "★Ori1713","en": "★Ori1713"},{"es": "★Ori2061","en": "★Ori2061"},{"es": "★Ori1790","en": "★Ori1790"},{"es": "★Ori1903","en": "★Ori1903"},{"es": "★Ori1948","en": "★Ori1948"},{"es": "★Ori2004","en": "★Ori2004"},{"es": "★Ori1852","en": "★Ori1852"},{"es": "★Ori1879","en": "★Ori1879"},{"es": "★Ori1899","en": "★Ori1899"},{"es": "★Ori1543","en": "★Ori1543"},{"es": "★Cas21","en": "★Cas21"},{"es": "★Cas168","en": "★Cas168"},{"es": "★Cas403","en": "★Cas403"},{"es": "★Cas153","en": "★Cas153"},{"es": "★Cas542","en": "★Cas542"},{"es": "★Cas219","en": "★Cas219"},{"es": "★Cas265","en": "★Cas265"},{"es": "★Cnc3572","en": "★Cnc3572"},{"es": "★Cnc3208","en": "★Cnc3208"},{"es": "★Cnc3461","en": "★Cnc3461"},{"es": "★Cnc3449","en": "★Cnc3449"},{"es": "★Cnc3429","en": "★Cnc3429"},{"es": "★Cnc3627","en": "★Cnc3627"},{"es": "★Cnc3268","en": "★Cnc3268"},{"es": "★Cnc3249","en": "★Cnc3249"},{"es": "★Com4968","en": "★Com4968"},{"es": "★Crv4757","en": "★Crv4757"},{"es": "★Crv4623","en": "★Crv4623"},{"es": "★Crv4662","en": "★Crv4662"},{"es": "★Crv4786","en": "★Crv4786"},{"es": "★Aur1708","en": "★Aur1708"},{"es": "★Aur2088","en": "★Aur2088"},{"es": "★Aur1605","en": "★Aur1605"},{"es": "★Aur2095","en": "★Aur2095"},{"es": "★Aur1577","en": "★Aur1577"},{"es": "★Aur1641","en": "★Aur1641"},{"es": "★Aur1612","en": "★Aur1612"},{"es": "★Pav7790","en": "★Pav7790"},{"es": "★Cet911","en": "★Cet911"},{"es": "★Cet681","en": "★Cet681"},{"es": "★Cet188","en": "★Cet188"},{"es": "★Cet539","en": "★Cet539"},{"es": "★Cet804","en": "★Cet804"},{"es": "★Cep8974","en": "★Cep8974"},{"es": "★Cep8162","en": "★Cep8162"},{"es": "★Cep8238","en": "★Cep8238"},{"es": "★Cep8417","en": "★Cep8417"},{"es": "★Cen5267","en": "★Cen5267"},{"es": "★Cen5288","en": "★Cen5288"},{"es": "★Cen551","en": "★Cen551"},{"es": "★Cen5459","en": "★Cen5459"},{"es": "★Cen5460","en": "★Cen5460"},{"es": "★CMi2943","en": "★CMi2943"},{"es": "★CMi2845","en": "★CMi2845"},{"es": "★Equ8131","en": "★Equ8131"},{"es": "★Vul7405","en": "★Vul7405"},{"es": "★UMi424","en": "★UMi424"},{"es": "★UMi5563","en": "★UMi5563"},{"es": "★UMi5735","en": "★UMi5735"},{"es": "★UMi6789","en": "★UMi6789"},{"es": "★Crt4287","en": "★Crt4287"},{"es": "★Lyr7001","en": "★Lyr7001"},{"es": "★Lyr7178","en": "★Lyr7178"},{"es": "★Lyr7106","en": "★Lyr7106"},{"es": "★Lyr7298","en": "★Lyr7298"},{"es": "★Ara6585","en": "★Ara6585"},{"es": "★Sco6134","en": "★Sco6134"},{"es": "★Sco6527","en": "★Sco6527"},{"es": "★Sco6553","en": "★Sco6553"},{"es": "★Sco5953","en": "★Sco5953"},{"es": "★Sco5984","en": "★Sco5984"},{"es": "★Sco6508","en": "★Sco6508"},{"es": "★Sco6084","en": "★Sco6084"},{"es": "★Sco5944","en": "★Sco5944"},{"es": "★Sco6630","en": "★Sco6630"},{"es": "★Sco6027","en": "★Sco6027"},{"es": "★Sco6247","en": "★Sco6247"},{"es": "★Sco6252","en": "★Sco6252"},{"es": "★Sco5928","en": "★Sco5928"},{"es": "★Sco6241","en": "★Sco6241"},{"es": "★Sco6165","en": "★Sco6165"},{"es": "★Tri544","en": "★Tri544"},{"es": "★Leo3982","en": "★Leo3982"},{"es": "★Leo4534","en": "★Leo4534"},{"es": "★Leo4357","en": "★Leo4357"},{"es": "★Leo4057","en": "★Leo4057"},{"es": "★Leo4359","en": "★Leo4359"},{"es": "★Leo4031","en": "★Leo4031"},{"es": "★Leo3852","en": "★Leo3852"},{"es": "★Leo3905","en": "★Leo3905"},{"es": "★Leo3773","en": "★Leo3773"},{"es": "★Gru8425","en": "★Gru8425"},{"es": "★Gru8636","en": "★Gru8636"},{"es": "★Gru8353","en": "★Gru8353"},{"es": "★Lib5685","en": "★Lib5685"},{"es": "★Lib5531","en": "★Lib5531"},{"es": "★Lib5787","en": "★Lib5787"},{"es": "★Lib5603","en": "★Lib5603"},{"es": "★Pup3165","en": "★Pup3165"},{"es": "★Pup3185","en": "★Pup3185"},{"es": "★Pup3045","en": "★Pup3045"},{"es": "★Cyg7924","en": "★Cyg7924"},{"es": "★Cyg7417","en": "★Cyg7417"},{"es": "★Cyg7796","en": "★Cyg7796"},{"es": "★Cyg8301","en": "★Cyg8301"},{"es": "★Cyg7949","en": "★Cyg7949"},{"es": "★Cyg7528","en": "★Cyg7528"},{"es": "★Oct7228","en": "★Oct7228"},{"es": "★Col1956","en": "★Col1956"},{"es": "★Col2040","en": "★Col2040"},{"es": "★Col2177","en": "★Col2177"},{"es": "★Gem2990","en": "★Gem2990"},{"es": "★Gem2891","en": "★Gem2891"},{"es": "★Gem2421","en": "★Gem2421"},{"es": "★Gem2473","en": "★Gem2473"},{"es": "★Gem2216","en": "★Gem2216"},{"es": "★Gem2777","en": "★Gem2777"},{"es": "★Gem2650","en": "★Gem2650"},{"es": "★Gem2286","en": "★Gem2286"},{"es": "★Gem2484","en": "★Gem2484"},{"es": "★Gem2930","en": "★Gem2930"},{"es": "★Peg8775","en": "★Peg8775"},{"es": "★Peg8781","en": "★Peg8781"},{"es": "★Peg39","en": "★Peg39"},{"es": "★Peg8308","en": "★Peg8308"},{"es": "★Peg8650","en": "★Peg8650"},{"es": "★Peg8634","en": "★Peg8634"},{"es": "★Peg8684","en": "★Peg8684"},{"es": "★Peg8450","en": "★Peg8450"},{"es": "★Peg8880","en": "★Peg8880"},{"es": "★Peg8905","en": "★Peg8905"},{"es": "★Oph6556","en": "★Oph6556"},{"es": "★Oph6378","en": "★Oph6378"},{"es": "★Oph6603","en": "★Oph6603"},{"es": "★Oph6149","en": "★Oph6149"},{"es": "★Oph6056","en": "★Oph6056"},{"es": "★Oph6075","en": "★Oph6075"},{"es": "★Ser5854","en": "★Ser5854"},{"es": "★Ser7141","en": "★Ser7141"},{"es": "★Ser5879","en": "★Ser5879"},{"es": "★Her6406","en": "★Her6406"},{"es": "★Her6148","en": "★Her6148"},{"es": "★Her6410","en": "★Her6410"},{"es": "★Her6526","en": "★Her6526"},{"es": "★Her6117","en": "★Her6117"},{"es": "★Her6008","en": "★Her6008"},{"es": "★Per936","en": "★Per936"},{"es": "★Per1017","en": "★Per1017"},{"es": "★Per1131","en": "★Per1131"},{"es": "★Per1228","en": "★Per1228"},{"es": "★Per834","en": "★Per834"},{"es": "★Per941","en": "★Per941"},{"es": "★Phe99","en": "★Phe99"},{"es": "★Phe338","en": "★Phe338"},{"es": "★Vel3634","en": "★Vel3634"},{"es": "★Vel3485","en": "★Vel3485"},{"es": "★Vel3734","en": "★Vel3734"},{"es": "★Aqr8232","en": "★Aqr8232"},{"es": "★Aqr8414","en": "★Aqr8414"},{"es": "★Aqr8709","en": "★Aqr8709"},{"es": "★Aqr8518","en": "★Aqr8518"},{"es": "★Aqr7950","en": "★Aqr7950"},{"es": "★Aqr8499","en": "★Aqr8499"},{"es": "★Aqr8610","en": "★Aqr8610"},{"es": "★Aqr8264","en": "★Aqr8264"},{"es": "★Cru4853","en": "★Cru4853"},{"es": "★Cru4730","en": "★Cru4730"},{"es": "★Cru4763","en": "★Cru4763"},{"es": "★Cru4700","en": "★Cru4700"},{"es": "★Cru4656","en": "★Cru4656"},{"es": "★PsA8728","en": "★PsA8728"},{"es": "★TrA6217","en": "★TrA6217"},{"es": "★Cap7776","en": "★Cap7776"},{"es": "★Cap7754","en": "★Cap7754"},{"es": "★Cap8278","en": "★Cap8278"},{"es": "★Cap8322","en": "★Cap8322"},{"es": "★Cap7773","en": "★Cap7773"},{"es": "★Sge7479","en": "★Sge7479"},{"es": "★Car2326","en": "★Car2326"},{"es": "★Car3685","en": "★Car3685"},{"es": "★Car3307","en": "★Car3307"},{"es": "★Car3699","en": "★Car3699"},{"es": "★Dra5744","en": "★Dra5744"},{"es": "★Dra5291","en": "★Dra5291"},{"es": "★Dra6705","en": "★Dra6705"},{"es": "★Dra6536","en": "★Dra6536"},{"es": "★Dra7310","en": "★Dra7310"},{"es": "★Dra6688","en": "★Dra6688"},{"es": "★Dra4434","en": "★Dra4434"},{"es": "★Dra6370","en": "★Dra6370"},{"es": "★Dra7462","en": "★Dra7462"},{"es": "★Dra6396","en": "★Dra6396"},{"es": "★Dra6132","en": "★Dra6132"},{"es": "★Dra6636","en": "★Dra6636"},{"es": "★CVn4915","en": "★CVn4915"},{"es": "★CVn4785","en": "★CVn4785"},{"es": "★CVn4846","en": "★CVn4846"},{"es": "★Aql7595","en": "★Aql7595"},{"es": "★Aql7557","en": "★Aql7557"},{"es": "★Aql7525","en": "★Aql7525"},{"es": "★Aql7602","en": "★Aql7602"},{"es": "★Aql7235","en": "★Aql7235"},{"es": "Maxipanal","en": "Max Honey"},{"es": "Maxiseta","en": "Max Mushrooms"},{"es": "Rama de Galanuez","en": "Galarica Twig"},{"es": "Brazal Galanuez","en": "Galarica Cuff"},{"es": "Tarjeta Chic","en": "Style Card"},{"es": "Pase Armadura","en": "Armor Pass"},{"es": "Bici Rotom","en": "Rotom Bike"},{"es": "Bici Rotom","en": "Rotom Bike"},{"es": "Amuleto Exp","en": "Exp. Charm"},{"es": "Duralium","en": "Armorite Ore"},{"es": "Amuleto Emblema","en": "Mark Charm"},{"es": "Riendas Unión","en": "Reins of Unity"},{"es": "Riendas Unión","en": "Reins of Unity"},{"es": "Corona Galanuez","en": "Galarica Wreath"},{"es": "Leyenda 1","en": "Legendary Clue 1"},{"es": "Leyenda 2","en": "Legendary Clue 2"},{"es": "Leyenda 3","en": "Legendary Clue 3"},{"es": "Leyenda (?)","en": "Legendary Clue?"},{"es": "Pase Corona","en": "Crown Pass"},{"es": "Corona Tallada","en": "Wooden Crown"},{"es": "Pétalo Fulgor","en": "Radiant Petal"},{"es": "Crin Blanca","en": "White Mane Hair"},{"es": "Crin Negra","en": "Black Mane Hair"},{"es": "Zanahoria Nívea","en": "Iceroot Carrot"},{"es": "Zanahoria Oscura","en": "Shaderoot Carrot"},{"es": "Maxinium","en": "Dynite Ore"},{"es": "Sem. Zanahoria","en": "Carrot Seeds"},{"es": "Parche Habilidad","en": "Ability Patch"},{"es": "Riendas Unión","en": "Reins of Unity"}];
  
  switch (valueType) {
      case "habilidad":
          let foundHab = habilidades.find(e => e.en == name)
          if (foundHab) {
              return "+ Hab. "+foundHab.es;
          } else {
              return "";
          }
      case "objeto":
          let found = objetos.find(e => e.en == name)
          if (found) {
              return "+ Obj. "+found.es;
          } else {
              return "";
          }
      default:
          return ""
  }
}

function buildDescription(description: RawDesc, attacker: Pokemon, defender: Pokemon) {
  const [attackerLevel, defenderLevel] = getDescriptionLevels(attacker, defender);
  let output = '';
  if (description.attackBoost) {
    if (description.attackBoost > 0) {
      output += '+';
    }
    output += description.attackBoost + ' ';
  }
  output = appendIfSet(output, attackerLevel);
  output = appendIfSet(output, description.attackEVs);
  output = appendIfSet(output, description.rivalry);
  
  if (description.alliesFainted) {
    output += Math.min(5, description.alliesFainted) +
      ` ${description.alliesFainted === 1 ? 'aliado' : 'aliados'} debilitados `;
  }
  if (description.attackerTera) {
    output += `Tera ${description.attackerTera} `;
  }
  if (description.isBeadsOfRuin) {
    output += 'Beads of Ruin ';
  }
  if (description.isSwordOfRuin) {
    output += 'Sword of Ruin ';
  }

  output += description.attackerName + ' ';
  if (description.isBurned) {
    output += 'Quemado ';
  }
  if (description.isHelpingHand) {
    output += 'Reforzado ';
  }
  output = appendIfSet(output, translateElement(String(description.attackerItem), "objeto"));
  output = appendIfSet(output, translateElement(String(description.attackerAbility), "habilidad"));
  if (description.isBattery) {
    output += ' potenciado por Batería ';
  }
  if (description.isPowerSpot) {
    output += ' potenciado por Fuente Energía ';
  }
  if (description.isFlowerGiftAttacker) {
    output += ' con Don Floral aliado ';
  }
  if (description.isSwitching) {
    output += ' potenciado por cambio rival ';
  }
  output += "usando "
  output += description.moveName + ' ';
  if (description.moveBP && description.moveType) {
    output += '(' + description.moveBP + ' BP ' + description.moveType + ') ';
  } else if (description.moveBP) {
    output += '(' + description.moveBP + ' BP) ';
  } else if (description.moveType) {
    output += '(' + description.moveType + ') ';
  }
  if (description.hits) {
    output += '(' + description.hits + ' golpes) ';
  }
  output = appendIfSet(output, description.moveTurns);
  if (description.isCritical) {
    output += ' de un golpe crítico ';
  }
  output += 'contra un ';
  output += description.defenderName;
  if (description.isProtected) {
    output += 'que usó Protección';
  } else {
    if (description.defenseBoost) {
      if (description.defenseBoost > 0) {
        output += '+';
      }
      output += description.defenseBoost + ' ';
    }
    output = appendIfSet(output, defenderLevel);
    output = output + "("
    output = appendIfSet(output, description.HPEVs);
    if (description.defenseEVs) {
      output += '/ ' + description.defenseEVs;
    }
    output = output + ") "
    output = appendIfSet(output, description.defenderItem);
    output = appendIfSet(output, description.defenderAbility);
    if (description.isTabletsOfRuin) {
      output += 'Tablets of Ruin ';
    }
    if (description.isVesselOfRuin) {
      output += 'Vessel of Ruin ';
    }
    if (description.isDefenderDynamaxed) {
      output += 'Dynamax ';
    }
    if (description.defenderTera) {
      output += `Tera ${description.defenderTera} `;
    }
    if (description.weather && description.terrain) {
      // do nothing
    } else if (description.weather) {
      output += ' en ' + description.weather;
    } else if (description.terrain) {
      output += ' en terreno ' + description.terrain + '';
    }
    if (description.isReflect) {
      output += ' con Reflejo activo';
    } else if (description.isLightScreen) {
      output += ' con Pantalla Luz activa';
    }
    if (description.isFlowerGiftDefender) {
      output += ' con un Don Floral aliado';
    }
    if (description.isFriendGuard) {
      output += ' con Compiescolta aliado';
    }
    if (description.isAuroraVeil) {
      output += ' con un Velo Aurora aliado';
    }
    if (description.isWonderRoom) {
      output += ' en Zona Extraña';
    }
  }
  return output;
}

function getDescriptionLevels(attacker: Pokemon, defender: Pokemon) {
  if (attacker.level !== defender.level) {
    return [
      attacker.level === 100 ? '' : `Nv ${attacker.level}`,
      defender.level === 100 ? '' : `Nv ${defender.level}`,
    ];
  }
  // There's an argument for showing any level thats not 100, but VGC and LC players
  // probably would rather not see level cruft in their calcs
  const elide = [100, 50, 5].includes(attacker.level);
  const level = elide ? '' : `Nv ${attacker.level}`;
  return [level, level];
}

function serializeText(arr: string[]) {
  if (arr.length === 0) {
    return '';
  } else if (arr.length === 1) {
    return arr[0];
  } else if (arr.length === 2) {
    return arr[0] + ' y ' + arr[1];
  } else {
    let text = '';
    for (let i = 0; i < arr.length - 1; i++) {
      text += arr[i] + ', ';
    }
    return text + 'y ' + arr[arr.length - 1];
  }
}

function appendIfSet(str: string, toAppend?: string) {
  return toAppend ? `${str}${toAppend} ` : str;
}

function toDisplay(notation: string, a: number, b: number, f = 1) {
  return notation === '%' ? Math.floor((a * (1000 / f)) / b) / 10 : Math.floor((a * (48 / f)) / b);
}
