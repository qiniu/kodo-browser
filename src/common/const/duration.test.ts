import Duration, { durationFormat } from './duration';

describe("test duration", () => {
    describe("test Duration", () => {

        it("Millisecond", () => {
          expect(Duration.Millisecond).toBe(1);
        });

        it("Second", () => {
          expect(Duration.Second).toBe(1000);
        });

        it("Minute", () => {
          expect(Duration.Minute).toBe(60 * 1000);
        });

        it("Hour", () => {
          expect(Duration.Hour).toBe(60 * 60 * 1000);
        });

        it("Day", () => {
          expect(Duration.Day).toBe(24 * 60 * 60 * 1000);
        });

    });

    describe("test leftTime", () => {

        it("param NaN", () => {
            expect(durationFormat(NaN)).toBe("");
        });

        it("param Infinity", () => {
            expect(durationFormat(-Infinity)).toBe("0");
            expect(durationFormat(Infinity)).toBe("∞");
        });

        it("param less or equal zero", () => {
            expect(durationFormat(0)).toBe("0");
            expect(durationFormat(-1)).toBe("0");
        });

        it("param ms", () => {
            expect(durationFormat(Duration.Millisecond)).toBe("1ms");
            expect(durationFormat(Duration.Second - 1)).toBe("999ms");
        });

        it("param s", () => {
            expect(durationFormat(Duration.Second)).toBe("1s");
            expect(durationFormat(Duration.Second + 1)).toBe("1s");
            expect(durationFormat(Duration.Minute - 1)).toBe("59s");
        });

        it("param m", () => {
            expect(durationFormat(Duration.Minute)).toBe("1m");
            expect(durationFormat(Duration.Minute + Duration.Second)).toBe("1m 1s");
            expect(durationFormat(Duration.Minute + Duration.Second + 1)).toBe("1m 1s");
            expect(durationFormat(Duration.Hour - 1)).toBe("59m 59s");
        });

        it("param h", () => {
            expect(durationFormat(Duration.Hour)).toBe("1h");
            expect(durationFormat(Duration.Hour + 1)).toBe("1h");
            expect(durationFormat(Duration.Hour + Duration.Second)).toBe("1h 1s");
            expect(durationFormat(Duration.Hour + Duration.Minute)).toBe("1h 1m");
            expect(durationFormat(Duration.Hour + Duration.Minute + Duration.Second)).toBe("1h 1m 1s");
            expect(durationFormat(Duration.Day - 1)).toBe("23h 59m 59s");
        });

        it("param D", () => {
            expect(durationFormat(Duration.Day)).toBe("1D");
            expect(durationFormat(Duration.Day + 1)).toBe("1D");
            expect(durationFormat(Duration.Day + Duration.Second)).toBe("1D 1s");
            expect(durationFormat(Duration.Day + Duration.Minute)).toBe("1D 1m");
            expect(durationFormat(Duration.Day + Duration.Hour)).toBe("1D 1h");
            expect(durationFormat(Duration.Day + Duration.Hour + Duration.Minute)).toBe("1D 1h 1m");
            expect(durationFormat(10 * Duration.Day)).toBe("10D");
            expect(durationFormat(11 * Duration.Day - 1)).toBe("10D 23h 59m 59s");
        });

    });
});
