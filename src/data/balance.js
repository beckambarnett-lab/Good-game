// Balance patches from the gauntlet tournament rounds (docs/gauntlet-log.md). Applied on top of the
// faction files so every tuning change is in one place. Keys are unit ids; values are merged in
// (nested `weapon`, `weapon2`, `charge`, `passive` objects are merged one level deep).
export const BALANCE = {
  // Supports (0-19% in rounds 1-2): cheap, stronger, longer reach
  grow_soup: { cost: 45, weapon: { heal: 30, range: 12 } },
  top_ring: { cost: 30 },
  briny_tide: { cost: 45, weapon: { heal: 24, radius: 8 } },
  cog_oilcan: { cost: 45, weapon: { heal: 36, range: 9 } },
  moss_bloom: { cost: 50, weapon: { heal: 14 } },
  mitten_cocoa: { cost: 38, weapon: { heal: 40, range: 13 } },
  noon_herald: { cost: 32 },
  wax_remold: { cost: 26, weapon: { cooldown: 5, reviveHp: 0.8 } },
  // Lobbed siege (0-13%): more accurate and cheaper
  // round 4: they hit but fire too rarely (8 shots per 26 s fight); review r2 thought 55g was too cheap, but at 85g they fell to 0-4% (round 9 check), so kept
  grow_pumpkin: { cost: 55, weapon: { damage: 110, cooldown: 4.5, proj: { acc: 0.75 } } },
  briny_barrel: { cost: 55, weapon: { damage: 100, cooldown: 4.5, proj: { acc: 0.75, speed: 22 } } },
  moss_seed: { cost: 55, weapon: { damage: 75, cooldown: 4, proj: { acc: 0.75 } } },
  wax_cauldron: { cost: 55, weapon: { damage: 95, cooldown: 4.5, proj: { acc: 0.75 } } },
  // Legendaries (83-100%): knockback lets them win with most HP left; about half the HP
  grow_scare: { cost: 2800, hp: 2400 },
  top_bouncer: { cost: 1800, hp: 3300 },
  briny_light: { hp: 3600 },
  cog_titan: { cost: 2800, hp: 4000 },
  moss_oak: { cost: 2600, hp: 2600 },
  mitten_bliz: { cost: 2600, hp: 3200 },
  noon_colossus: { cost: 3200, hp: 3800 },
  wax_candel: { cost: 3000, hp: 3600 },
  // ranged/siege at 83-92% in round 1
  top_juggler: { cost: 70 },
  noon_lens: { cost: 105 },
  cog_zap: { cost: 220 },
  // melee at 17% in round 1, 29% in round 6
  wax_scamp: { cost: 45 },
  // round 6 borderline (21-29%): a little cheaper for margin
  briny_swab: { cost: 60 },
  noon_spear: { cost: 62 },
  mitten_icicle: { cost: 58 },
  mitten_walrus: { cost: 175 },
  moss_stag: { cost: 145 },
};
