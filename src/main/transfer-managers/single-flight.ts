type AsyncFunction = (...args: any[]) => Promise<any>;

// `Promise<Awaited<ReturnType<T>>>` is ugly to get the right type because of
// the deferred resolving of conditional types involving unbound type parameters in TypeScript.
// There are many issue with it, such as
// https://github.com/microsoft/TypeScript/issues/43702
// https://github.com/microsoft/TypeScript/issues/50251
export default function singleFlight<T extends AsyncFunction>(
    fn: T,
): (key: string, ...args: Parameters<T>) => Promise<Awaited<ReturnType<T>>> {
    const flightMap = new Map<string, Promise<Awaited<ReturnType<T>>>>();
    return function (key: string, ...args: Parameters<T>): Promise<Awaited<ReturnType<T>>> {
        const flight = flightMap.get(key);
        if (flight) {
            return flight;
        }
        const p = fn(...args);
        flightMap.set(key, p);
        p.then(() => {
            flightMap.delete(key);
        });
        return p;
    }
}
