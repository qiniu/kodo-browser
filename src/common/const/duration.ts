import {isNumber} from "lodash";

enum Duration {
    Millisecond = 1,
    Second = 1000 * Millisecond,
    Minute = 60 * Second,
    Hour = 60 * Minute,
    Day = 24 * Hour,
}

export default Duration;

const formatAbbr = {
  [Duration.Millisecond]: "ms",
  [Duration.Second]: "s",
  [Duration.Minute]: "m",
  [Duration.Hour]: "h",
  [Duration.Day]: "D",
}

const descDuration = (Object.values(Duration) as any[])
  .filter(v => isNumber(v))
  .sort((a, b) => b - a);

export function durationFormat(ms: number): string {
  if (Number.isNaN(ms)) {
    return ""
  }

  if (ms <= 0) {
    return "0";
  }

  if (ms === Infinity) {
    return "∞"
  }

  if (ms < Duration.Second) {
    return ms + "ms";
  }

  const t = [];
  let left = ms;

  for (const v of descDuration) {
    if (v > Duration.Millisecond) {
      const k = formatAbbr[v];
      const s = Math.floor(left / v);
      if (s > 0) {
        t.push(s + k);
        left = left % v;
      }
    }
  }

  return t.join(" ");
}

// convert millisecond to other duration unit
export function convertDuration(val: number, unit: Duration) {
  return val / unit;
}
