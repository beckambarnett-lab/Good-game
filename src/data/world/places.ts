// Named spots in the valley, for dev teleports and the Review Labs: one per surface and view the
// labs need. `yaw` faces (sin, cos); each spot looks at something rather than the world's edge.

export interface Place {
  id: string;
  label: string;
  /** What's underfoot or in view, for buttons. */
  note: string;
  x: number;
  z: number;
  yaw: number;
}

export const places: readonly Place[] = [
  { id: 'cabin', label: 'Cabin', note: 'powder', x: -166, z: -22, yaw: Math.PI / 2 },
  { id: 'woodlot', label: 'Woodlot', note: 'among the trees', x: -212, z: -62, yaw: Math.PI / 2 },
  { id: 'mainStreet', label: 'Main Street', note: 'packed road', x: -40, z: 0, yaw: Math.PI / 2 },
  { id: 'lake', label: 'Lake', note: 'ice', x: 232, z: 40, yaw: -Math.PI / 2 },
  { id: 'lookout', label: 'Lookout', note: '88 m up', x: -40, z: -225, yaw: 0 },
];
