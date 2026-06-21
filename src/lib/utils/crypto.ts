export function timingSafeCompare(
  a: string | undefined | null,
  b: string | undefined | null,
): boolean {
  const strA = a ?? "";
  const strB = b ?? "";

  if (strA.length !== strB.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < strA.length; i++) {
    result |= strA.charCodeAt(i) ^ strB.charCodeAt(i);
  }

  return result === 0;
}
