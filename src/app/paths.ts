/** Link target for a cemetery. */
export function cemeteryPath(id: string): string {
  const path = `/cemetery/${encodeURIComponent(id)}`;
  return path;
}

/** Link target for a stone's detail screen. */
export function stonePath(cemeteryId: string, stoneId: string): string {
  return `${cemeteryPath(cemeteryId)}/stone/${encodeURIComponent(stoneId)}`;
}

/** Link target for desk-mode transcription, optionally opening on one stone. */
export function transcribePath(cemeteryId: string, stoneId?: string): string {
  const base = `${cemeteryPath(cemeteryId)}/transcribe`;
  return stoneId ? `${base}?stone=${encodeURIComponent(stoneId)}` : base;
}

/** Link target for a cemetery's progress dashboard. */
export function progressPath(cemeteryId: string): string {
  return `${cemeteryPath(cemeteryId)}/progress`;
}

/** Link target for a cemetery's people index. */
export function peoplePath(cemeteryId: string): string {
  return `${cemeteryPath(cemeteryId)}/people`;
}

/** Link target for matching imported index records to stones. */
export function matchPath(cemeteryId: string): string {
  return `${cemeteryPath(cemeteryId)}/match`;
}

/** Link target for a cemetery's possible-duplicates review. */
export function duplicatesPath(cemeteryId: string): string {
  return `${cemeteryPath(cemeteryId)}/duplicates`;
}

/** Link target for a cemetery's exports (CSV, GeoJSON, KML, booklet). */
export function exportPath(cemeteryId: string): string {
  return `${cemeteryPath(cemeteryId)}/export`;
}
