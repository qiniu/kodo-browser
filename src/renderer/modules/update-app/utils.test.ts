import {compareVersion} from "./utils";

describe("test update app utils", () => {
  describe("compareVersion", () => {
    it("should return 0 for equal versions", () => {
      expect(compareVersion("1.0.0", "1.0.0")).toBe(0);
      expect(compareVersion("2.3.4", "2.3.4")).toBe(0);
      expect(compareVersion("0", "0")).toBe(0);
    });

    it("should return 1 for a greater version", () => {
      expect(compareVersion("2.0.0", "1.0.0")).toBeGreaterThan(0);
      expect(compareVersion("2.3.4", "2.2.4")).toBeGreaterThan(0);
      expect(compareVersion("1.0.1", "1.0.0")).toBeGreaterThan(0);
      expect(compareVersion("1.1", "1.0")).toBeGreaterThan(0);
    });

    it("should return -1 for a lesser version", () => {
      expect(compareVersion("1.0.0", "2.0.0")).toBeLessThan(0);
      expect(compareVersion("2.2.4", "2.3.4")).toBeLessThan(0);
      expect(compareVersion("1.0.0", "1.0.1")).toBeLessThan(0);
      expect(compareVersion("1.0", "1.1")).toBeLessThan(0);
    });

    it("should handle missing segments as 0", () => {
      expect(compareVersion("1.0.0", "1")).toBe(0);
      expect(compareVersion("1.2.0", "1.2")).toBe(0);
      expect(compareVersion("1.0.0", "1.0")).toBe(0);
      expect(compareVersion("0.0.0", "")).toBe(0);
    });

    it("should ignore alphabets after numbers", () => {
      expect(compareVersion("1.0.0", "1.0.0-dev")).toBe(0);
      expect(compareVersion("1.0.0", "1.0-alpha.0-dev")).toBe(0);
      expect(compareVersion("1.0.0", "1.0a.0b")).toBe(0);
    })

    // it("should handle non-numeric segments", () => {
    //   expect(compareVersion("1.0.0", "a.b.c")).toBe(?);
    //   expect(compareVersion("1.2.3", "x.y.z")).toBe(?);
    //   expect(compareVersion("1.0.0", "1.x")).toBe(?);
    //   expect(compareVersion("1.0.0", "1.0.x")).toBe(?);
    //   expect(compareVersion("1.0.0-alpha", "1.0.x")).toBe(?);
    //   expect(compareVersion("1.0.0-dev", "1.0.x")).toBe(?);
    // });
  });
});
