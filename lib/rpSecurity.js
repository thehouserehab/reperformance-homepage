export function safeEqual(left, right) {
  const leftBytes = new TextEncoder().encode(String(left || ''));
  const rightBytes = new TextEncoder().encode(String(right || ''));

  if (!leftBytes.length || !rightBytes.length) return false;

  let diff = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);

  for (let index = 0; index < maxLength; index += 1) {
    diff |= leftBytes[index % leftBytes.length] ^ rightBytes[index % rightBytes.length];
  }

  return diff === 0;
}
