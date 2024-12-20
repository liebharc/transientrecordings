const tuning = 440;

export function getDifferenceInCents(measuredPitch: number) {
  const closestNotePitch = findClosestNotePitch(measuredPitch);
  return Math.floor(1200 * Math.log2(measuredPitch / closestNotePitch));
}

/**
 * Finds the closest note pitch to the given measured pitch. E.g.
 * 446.5 Hz -> 440 Hz
 */
function findClosestNotePitch(measuredPitch: number) {
  const ratio = measuredPitch / tuning;
  const semitonesFromTuning = Math.round(12 * Math.log2(ratio));
  return tuning * Math.pow(2, semitonesFromTuning / 12);
}
