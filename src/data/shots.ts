// Art QA shot list (Plan Part 5.13): fixed viewpoints captured by `npm run shots` in headless
// Chromium. Positions are [x, z, metres above the ground] so terrain changes never bury a camera.
// Time and weather apply once the Environment system lands (M1); until then shots use the default
// daylight rig.

export interface ShotDef {
  id: string;
  title: string;
  eye: readonly [number, number, number];
  target: readonly [number, number, number];
  time: string;
  weather: 'clear' | 'fair' | 'lightSnow' | 'heavySnow' | 'blizzard' | 'iceFog';
}

export const shots: readonly ShotDef[] = [
  {
    id: 'S01',
    title: 'Cabin porch → town lights',
    eye: [-168.5, -24, 2.1],
    target: [20, 15, 3],
    time: '21:00',
    weather: 'clear',
  },
  {
    id: 'S04',
    title: 'Main Street from the Cabin Road bend',
    eye: [-127, 5, 1.7],
    target: [20, 0, 2],
    time: '16:30',
    weather: 'fair',
  },
  {
    // The lookout's platform: the tower (Plan Part 3.1: 12 m) plus eye height.
    id: 'S08',
    title: 'Lookout',
    eye: [-40, -222, 13.6],
    target: [60, 60, 0],
    time: '23:00',
    weather: 'clear',
  },
];
