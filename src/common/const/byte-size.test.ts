import {byteSizeFormat} from "./byte-size";

describe("test byte-size", () => {
  describe("test byteSizeFormate", () => {
    {
      it("zero", () => {
        expect(byteSizeFormat(0, false))
          .toBe("0");
        expect(byteSizeFormat(NaN, false))
          .toBe("0");
        expect(byteSizeFormat(-1, false))
          .toBe("0");
      });
      it("B", () => {
        expect(byteSizeFormat(1, false))
          .toBe("1B");
        expect(byteSizeFormat(1023, false))
          .toBe("1023B");
        expect(byteSizeFormat(1, true))
          .toBe("1B");
      });
      it("KB", () => {
        expect(byteSizeFormat(1024, false))
          .toBe("1K");
        expect(byteSizeFormat(Math.pow(1024, 2) - 1, false))
          .toBe("1023K1023B");
        expect(byteSizeFormat(Math.pow(1024, 2) - 512, true))
          .toBe("1023.5KB");
        expect(byteSizeFormat(Math.pow(1024, 2) - 1024, true))
          .toBe("1023KB");
        expect(byteSizeFormat(Math.pow(1024, 2) - 1, true))
          .toBe("1024KB");
      });
      it("MB", () => {
        expect(byteSizeFormat(Math.pow(1024, 2), false))
          .toBe("1M");
        expect(byteSizeFormat(Math.pow(1024, 3) - 1, false))
          .toBe("1023M1023K1023B");
        expect(byteSizeFormat(Math.pow(1024, 3) - Math.pow(1024, 2), true))
          .toBe("1023MB");
        expect(byteSizeFormat(Math.pow(1024, 3) - 1, true))
          .toBe("1024MB");
      });
      it("GB", () => {
        expect(byteSizeFormat(Math.pow(1024, 3), false))
          .toBe("1G");
        expect(byteSizeFormat(Math.pow(1024, 4) - 1, false))
          .toBe("1023G1023M1023K1023B");
        expect(byteSizeFormat(Math.pow(1024, 4) - Math.pow(1024, 3), true))
          .toBe("1023GB");
        expect(byteSizeFormat(Math.pow(1024, 4) - 1, true))
          .toBe("1024GB");
      });
    }
  })
})
