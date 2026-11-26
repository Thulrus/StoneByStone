/** Lowercase hex SHA-256 of a blob or bytes (Photo.sha256). */
export async function sha256Hex(data: Blob | Uint8Array): Promise<string> {
  // `isView`, not `instanceof`: bytes from another realm (jsdom tests, workers) still count.
  const bytes = ArrayBuffer.isView(data)
    ? new Uint8Array(data.buffer, data.byteOffset, data.byteLength)
    : new Uint8Array(await data.arrayBuffer());
  const digest = await crypto.subtle.digest('SHA-256', bytes as BufferSource);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, '0')).join('');
}
