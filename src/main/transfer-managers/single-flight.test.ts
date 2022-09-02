import singleFlight from "./single-flight";

describe("test transfer-managers/single-flight.ts", () => {
    function makeWait(t: number) {
        return async (): Promise<void> => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve();
                }, t);
            });
        };
    }

    function makeProcessWithTimestamp(t: number) {
        return async (): Promise<number> => {
            return new Promise(resolve => {
                setTimeout(() => {
                    resolve(Date.now());
                }, t);
            });
        };
    }

    function groupFlights(doneResults: number[]): number[] {
        return [
            ...doneResults
                .reduce((acc: Map<number, number>, cur) => {
                    const times = acc.get(cur);
                    if (times) {
                        acc.set(cur, times + 1);
                    } else {
                        acc.set(cur, 1);
                    }
                    return acc;
                }, new Map())
                .values()
        ];
    }

    const asyncProcess = makeProcessWithTimestamp(2000);
    const wait = makeWait(300);

    it("with single flight", async () => {
        const singleFlightProcess = singleFlight(asyncProcess);
        const processPromises: Promise<number>[] = []
        for (let i = 0; i < 5; i++) {
            processPromises.push(singleFlightProcess(`key-${i % 2}`))
            await wait();
        }
        const doneResults = await Promise.all(processPromises);
        const actual = groupFlights(doneResults);
        // we call 5 processes.
        // 2 of them have same flightKey, the others 3 hava same flightKey.
        // so expect [2, 3]
        expect(actual).toEqual(expect.arrayContaining([2, 3]))
    });

    it("without single flight", async () => {
        const processPromises: Promise<number>[] = []
        for (let i = 0; i < 5; i++) {
            processPromises.push(asyncProcess())
            await wait();
        }
        const doneResults = await Promise.all(processPromises);
        const actual = groupFlights(doneResults);
        expect(actual).toEqual(expect.arrayContaining([1, 1, 1, 1, 1]))
    });

    it("with single flight but should tow flight with same key", async () => {
        const singleFlightProcess = singleFlight(asyncProcess);
        const processResults: number[] = []
        for (let i = 0; i < 2; i++) {
            const result = await singleFlightProcess(`key`);
            processResults.push(result);
            await wait();
        }
        const actual = groupFlights(processResults);
        expect(actual).toEqual(expect.arrayContaining([1, 1]))
    });
});
