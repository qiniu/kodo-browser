export default class Base {
    private _eventStack: Record<string, ((...args: any[]) => boolean)[]> = {};

    on(eventName: string, callbackFn: (...args: any[]) => boolean): this {
        if (!this._eventStack[eventName]) {
            this._eventStack[eventName] = [];
        }
        this._eventStack[eventName].push(callbackFn);
        return this;
    }

    off(eventName: string, callbackFn: (...args: any[]) => boolean): this {
        if (this._eventStack[eventName]) {
            this._eventStack[eventName] = this._eventStack[eventName].filter(
                fn => fn !== callbackFn
            );
        }
        return this;
    }

    emit(eventName: string, ...args: any[]) {
        if (!this._eventStack[eventName]) {
            return this;
        }
        for (const callbackFn of this._eventStack[eventName]) {
            if (!callbackFn.apply(this, args)) {
                break;
            }
        }
        return this;
    }
}
