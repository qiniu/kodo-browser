enum ByteSize {
  KB = 1024,
  MB = 1024 * KB,
  GB = 1024 * MB,
  TB = 1024 * GB,
}

const descByteSize = Object.values(ByteSize).sort().reverse();

export function byteSizeFormat(n: number, isApproximate = true): string {
  if (n == 0 || !n || n < 0) {
    return "0";
  }

  const t = [];
  let left = n;

  for (const v of descByteSize) {
    if (typeof v === "number") {
      const k = ByteSize[v];
      const s = Math.floor(left / v);
      if (s > 0) {
        if (isApproximate) {
          return Math.round(100 * left / v) / 100 + k;
        } else {
          t.push(s + k[0]);
          left = left % v;
        }
      }
    }
  }

  if (left > 0) {
    t.push(left + "B");
    if (isApproximate) return left + "B";
  }
  return t.length > 0 ? t.join("") : "0";
}

export default ByteSize;
