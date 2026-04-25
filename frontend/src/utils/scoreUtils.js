/**
 * Convert a 5-point score to 100-point scale
 */
export function toHundredScale(score) {
  return Math.round(score * 20);
}

/**
 * Get color class based on score (100-point scale)
 */
export function getScoreColor(score) {
  if (score >= 80) return 'text-emerald-600';
  if (score >= 60) return 'text-amber-600';
  return 'text-red-600';
}

/**
 * Get background color class based on score
 */
export function getScoreBgColor(score) {
  if (score >= 80) return 'bg-emerald-500';
  if (score >= 60) return 'bg-amber-500';
  return 'bg-red-500';
}
