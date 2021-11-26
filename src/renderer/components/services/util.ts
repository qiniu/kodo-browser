export function leftTime(ms: number): string {
    if (Number.isNaN(ms)) {
        return ""
    }

    if (ms <= 0) {
        return "0";
    }

    if (ms < 1000) {
        return ms + "ms";
    }

    if (ms === Infinity) {
        return "∞"
    }

    const t = [];

    const d = Math.floor(ms / 24 / 3600 / 1000);
    if (d > 0) {
        ms -= d * 3600 * 1000 * 24;
        t.push(d + "D");
    }
    const h = Math.floor(ms / 3600 / 1000);
    if (h > 0) {
        ms -= h * 3600 * 1000;
        t.push(h + "h");
    }
    const m = Math.floor(ms / 60 / 1000);
    if (m > 0) {
        ms -= m * 60 * 1000;
        t.push(m + "m");
    }
    const s = Math.floor(ms / 1000);
    if (s > 0) {
        ms -= s * 1000;
        t.push(s + "s");
    }

    return t.join(" ");
}
