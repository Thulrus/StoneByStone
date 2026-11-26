/** Link target for a cemetery. */
export function cemeteryPath(id: string): string {
  const path = `/cemetery/${encodeURIComponent(id)}`;
  return path;
}
