// Faction progression: factions are ranked in campaign unlock order. Each rank multiplies a unit's
// cost AND its power (HP, damage, heals) by the same factor, so a higher faction is stronger per
// unit but still fair per gold (Lanchester: equal-gold strength is unchanged when HP, DPS and cost
// all scale by k). Knockback and mass are left alone so the physics feel the same.
export const FACTION_RANK = ['grow', 'top', 'briny', 'cog', 'moss', 'mitten', 'noon', 'wax'];
export const RANK_BASE = 0.5;
export const RANK_STEP = 1.6;
export const RANK_MUL = Object.fromEntries(FACTION_RANK.map((f, i) => [f, +(RANK_BASE * RANK_STEP ** i).toFixed(3)]));

export function niceCost(v) {
  const step = v < 100 ? 5 : v < 1000 ? 10 : v < 10000 ? 50 : 100;
  return Math.max(5, Math.round(v / step) * step);
}

const scaleWeapon = (w, k) => {
  if (!w) return;
  if (w.damage) w.damage = Math.round(w.damage * k * 10) / 10;
  if (w.heal) w.heal = Math.round(w.heal * k * 10) / 10;
  if (w.effect && w.effect.burn) w.effect = { ...w.effect, burn: w.effect.burn * k };
  if (w.proj) {
    w.proj = { ...w.proj };
    if (w.proj.roll) w.proj.roll = { ...w.proj.roll, damage: w.proj.roll.damage * k };
    if (w.proj.cloud) w.proj.cloud = { ...w.proj.cloud, dps: w.proj.cloud.dps * k };
  }
};

// Power grows a little slower than price: a few big units beat an equal-gold swarm (only a few
// swarm units can reach them at once), so pure k-for-k scaling made higher ranks win every
// equal-gold fight. Power exponent 0.9 keeps a modest edge for higher ranks.
export const POWER_EXP = 0.9;

// Scale one UnitDef in place by its faction's rank multiplier.
export function applyRank(u) {
  const kc = RANK_MUL[u.faction] ?? 1;
  const k = kc ** POWER_EXP;
  u.rankMul = k;
  u.rank = FACTION_RANK.indexOf(u.faction) + 1;
  u.cost = niceCost(u.cost * kc);
  u.hp = Math.round(u.hp * k);
  scaleWeapon(u.weapon, k);
  scaleWeapon(u.weapon2, k);
  if (u.charge) u.charge = { ...u.charge, damage: u.charge.damage * k };
  if (u.passive) {
    const p = { ...u.passive };
    if (p.regen) p.regen *= k;
    if (p.deathBlast) p.deathBlast = { ...p.deathBlast, damage: p.deathBlast.damage * k };
    if (p.aura && p.aura.kind === 'burn') p.aura = { ...p.aura, amt: p.aura.amt * k };
    u.passive = p;
  }
}
