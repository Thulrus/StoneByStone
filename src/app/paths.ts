/** Link target for a cemetery. */
export function cemeteryPath(id: string): string {
  const path = `/cemetery/${encodeURIComponent(id)}`;
  return path;
}

/** Link target for a stone's detail screen. */
export function stonePath(cemeteryId: string, stoneId: string): string {
  return `${cemeteryPath(cemeteryId)}/stone/${encodeURIComponent(stoneId)}`;
}
