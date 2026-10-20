// Reference camera angles. World: shop front at z = 0 (x -2.7..2.7), street z 2.5..11.5, far sidewalk z 11.7..14.2,
// footbridge deck y 3.6 at x -6.4..-4.0 from z 1.0 (shop end) to z 13.9 (far end). Calibrated against the references (see LOG.md).
export const ANGLES = {
  street: { refs: { before: 'bridge_before_street.png', after: 'bridge_after_crosswalk.png' }, cam: { pos: [2.6, 0.9, 13.1], at: [-6, 3.4, 4.5], fov: 74 } },
  high: { refs: { before: 'bridge_before_high.png', after: 'bridge_after_high.png' }, cam: { pos: [2.5, 7.8, 1.0], at: [-7, 2.0, 9], fov: 70 } },
  konbini: { refs: { after: 'bridge_after_konbini.png' }, cam: { pos: [-13.5, 0.9, 11.6], at: [-3, 3.4, 7.8], fov: 72 } },
  terrace: { refs: { after: 'bridge_after_terrace.png' }, cam: { pos: [-5.0, 5.0, 1.3], at: [-5.2, 4.0, 9], fov: 70 } },
  balcony: { refs: { after: 'bridge_after_balcony.png' }, cam: { pos: [7.5, 5.5, 6.5], at: [-6, 4.2, 7.2], fov: 60 } },
};
