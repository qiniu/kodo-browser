import Duration from "@common/const/duration";

export function leftTime(ms: number): string {
    if (Number.isNaN(ms)) {
        return ""
    }

    if (ms <= 0) {
        return "0";
    }

    if (ms < Duration.Second) {
        return ms + "ms";
    }

    if (ms === Infinity) {
        return "∞"
    }

    const t = [];

    const d = Math.floor(ms / Duration.Day);
    if (d > 0) {
        ms -= d * Duration.Day;
        t.push(d + "D");
    }
    const h = Math.floor(ms / Duration.Hour);
    if (h > 0) {
        ms -= h * Duration.Hour;
        t.push(h + "h");
    }
    const m = Math.floor(ms / Duration.Minute);
    if (m > 0) {
        ms -= m * Duration.Minute;
        t.push(m + "m");
    }
    const s = Math.floor(ms / Duration.Second);
    if (s > 0) {
        ms -= s * Duration.Second;
        t.push(s + "s");
    }

    return t.join(" ");
}
