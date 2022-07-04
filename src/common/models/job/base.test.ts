import Base from "./base";

describe("test models/job/base.ts", () => {
    it("on and emit", () => {
        const mockedCallback = jest.fn();
        const base = new Base();
        base.on("boom", mockedCallback);
        base.emit("boom");
        expect(mockedCallback).toBeCalled();
    });
    it("on and emit with payload", () => {
        const mockedCallback = jest.fn();
        const base = new Base();
        base.on("boom", mockedCallback);
        base.emit("boom", { name: "kodo-browser" });
        expect(mockedCallback).toBeCalledWith({ name: "kodo-browser" });
    });
    it("off", () => {
        const mockedCallbackToOff = jest.fn();
        const mockedCallback = jest.fn();
        const base = new Base();
        base.on("boom", mockedCallbackToOff);
        base.on("boom", mockedCallback);
        base.off("boom", mockedCallbackToOff);
        base.emit("boom", { name: "kodo-browser" });
        expect(mockedCallbackToOff).not.toBeCalled();
        expect(mockedCallback).toBeCalledWith({ name: "kodo-browser" });
    });
});
