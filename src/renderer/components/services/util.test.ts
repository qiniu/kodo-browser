import { leftTime } from './util';

// duration by ms
enum Duration {
    Millisecond = 1,
    Second = 1000 * Millisecond,
    Minute = 60 * Second,
    Hour = 60 * Minute,
    Day = 24 * Hour,
}

describe("test util", () => {
    describe("test leftTime", () => {
        // TODO const oneDay oneHour oneMinute oneSecond oneMillisecond

        it("param NaN", () => {
            expect(leftTime(NaN)).toBe("");
        });

        it("param Infinity", () => {
            expect(leftTime(-Infinity)).toBe("0");
            expect(leftTime(Infinity)).toBe("∞");
        });

        it("param less or equal zero", () => {
            expect(leftTime(0)).toBe("0");
            expect(leftTime(-1)).toBe("0");
        });

        it("param ms", () => {
            expect(leftTime(Duration.Millisecond)).toBe("1ms");
            expect(leftTime(Duration.Second - 1)).toBe("999ms");
        });

        it("param s", () => {
            expect(leftTime(Duration.Second)).toBe("1s");
            expect(leftTime(Duration.Second + 1)).toBe("1s");
            expect(leftTime(Duration.Minute - 1)).toBe("59s");
        });

        it("param m", () => {
            expect(leftTime(Duration.Minute)).toBe("1m");
            expect(leftTime(Duration.Minute + Duration.Second)).toBe("1m 1s");
            expect(leftTime(Duration.Minute + Duration.Second + 1)).toBe("1m 1s");
            expect(leftTime(Duration.Hour - 1)).toBe("59m 59s");
        });

        it("param h", () => {
            expect(leftTime(Duration.Hour)).toBe("1h");
            expect(leftTime(Duration.Hour + 1)).toBe("1h");
            expect(leftTime(Duration.Hour + Duration.Second)).toBe("1h 1s");
            expect(leftTime(Duration.Hour + Duration.Minute)).toBe("1h 1m");
            expect(leftTime(Duration.Hour + Duration.Minute + Duration.Second)).toBe("1h 1m 1s");
            expect(leftTime(Duration.Day - 1)).toBe("23h 59m 59s");
        });

        it("param D", () => {
            expect(leftTime(Duration.Day)).toBe("1D");
            expect(leftTime(Duration.Day + 1)).toBe("1D");
            expect(leftTime(Duration.Day + Duration.Second)).toBe("1D 1s");
            expect(leftTime(Duration.Day + Duration.Minute)).toBe("1D 1m");
            expect(leftTime(Duration.Day + Duration.Hour)).toBe("1D 1h");
            expect(leftTime(Duration.Day + Duration.Hour + Duration.Minute)).toBe("1D 1h 1m");
            expect(leftTime(10 * Duration.Day)).toBe("10D");
            expect(leftTime(11 * Duration.Day - 1)).toBe("10D 23h 59m 59s");
        });

    });
});
