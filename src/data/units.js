// Roster registry: every faction file exports a FactionDef { id, name, blurb, color, units, projLooks? }.
import { FACTION as briny } from './factions/briny.js';
import { FACTION as cog } from './factions/cog.js';
import { FACTION as grow } from './factions/grow.js';
import { FACTION as mitten } from './factions/mitten.js';
import { FACTION as moss } from './factions/moss.js';
import { FACTION as noon } from './factions/noon.js';
import { FACTION as top } from './factions/top.js';
import { FACTION as wax } from './factions/wax.js';

export const FACTIONS = [grow, top, briny, cog, moss, mitten, noon, wax];
export const UNITS = {};
export const UNIT_LIST = [];
for (const f of FACTIONS) {
  for (const u of f.units) {
    u.faction = f.id;
    UNITS[u.id] = u;
    UNIT_LIST.push(u);
  }
  // Hidden helper units (summons) are registered but not shown in the tray.
  for (const u of f.hidden || []) {
    u.faction = f.id;
    u.hidden = true;
    UNITS[u.id] = u;
  }
}
export const ROLE_ORDER = ['melee', 'ranged', 'tank', 'cavalry', 'siege', 'support', 'legendary'];
