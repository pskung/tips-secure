export function timingSafeCompare(a: string | undefined | null, b: string | undefined | null): boolean {
  const strA = typeof a === "string" ? a : "";
  const strB = typeof b === "string" ? b : "";

  let diff = strA.length ^ strB.length;
  const len = Math.max(strA.length, strB.length);

  for (let i = 0; i < len; i++) {
    const charA = i < strA.length ? strA.charCodeAt(i) : 0;
    const charB = i < strB.length ? strB.charCodeAt(i) : 0;
    diff |= charA ^ charB;
  }

  return diff === 0;
}