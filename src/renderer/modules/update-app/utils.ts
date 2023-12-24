export function compareVersion(a: string, b: string) {
  const aArr = a.split(".");
  const bArr = b.split(".");

  const len = Math.max(aArr.length, bArr.length);

  for (let i = 0; i < len; i++) {
    const aSeg = parseInt(aArr[i]) || 0;
    const bSeg = parseInt(bArr[i]) || 0;

    if (aSeg > bSeg) {
      return 1;
    } else if (aSeg < bSeg) {
      return -1;
    }
  }
  return 0;
}

// export function compareVersion(a: string, b: string, humanist?: false): number
// export function compareVersion(a: string, b: string, humanist: true):  | ">" | "<" | "="
// export function compareVersion(a: string, b: string, humanist = false): number | ">" | "<" | "=" {
//   const aArr = a.split(".");
//   const bArr = b.split(".");
//
//   const len = Math.max(aArr.length, bArr.length);
//
//   for (let i = 0; i < len; i++) {
//     const aSeg = parseInt(aArr[i]) || 0;
//     const bSeg = parseInt(bArr[i]) || 0;
//
//     if (aSeg > bSeg) {
//       return humanist ? ">" : 1;
//     } else if (aSeg < bSeg) {
//       return humanist ? "<" : -1;
//     }
//   }
//   return humanist ? "=" : 0;
// }
