// Collision filter groups. Limbs only touch the ground (perf); torsos/heads push each other.
export const G = {
  GROUND: 1,
  TORSO: 2,
  LIMB: 4,
  PROP: 8,
  CORPSE: 16,
};
export const MASK = {
  TORSO: G.GROUND | G.TORSO | G.PROP,
  LIMB: G.GROUND | G.PROP,
  CORPSE: G.GROUND | G.PROP | G.CORPSE,
  CORPSE_LIMB: G.GROUND | G.PROP,
};
