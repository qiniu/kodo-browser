import * as patterns from "./patterns";

describe("test patterns.ts", () => {
  describe("test Email", () => {
    const cases = [
      {
        mail: "example@example.com",
        expect: true,
      },
      {
        mail: "i-example@example.com",
        expect: true,
      },
      {
        mail: "i.example@example.com",
        expect: true,
      },
      {
        mail: "-example@example.com",
        expect: false,
      },
      {
        mail: ".example@example.com",
        expect: false,
      },
      {
        mail: "example-@example.com",
        expect: false,
      },
      {
        mail: "example.@example.com",
        expect: false,
      },
      {
        mail: "",
        expect: false,
      },
      {
        mail: "@",
        expect: false,
      },
      {
        mail: "example@example",
        expect: false,
      },
      {
        mail: "@example.com",
        expect: false,
      },
      {
        mail: "ex*ample@example.com",
        expect: false,
      },
    ];

    for (const c of cases) {
      it(`Email \`${c.mail}\``, () => {
        expect(patterns.Email.test(c.mail)).toBe(c.expect);
      });
    }
  });

  describe("test FileRename", () => {
    const cases = [
      {
        name: 'a',
        expect: true,
      },
      {
        name: 'a/a',
        expect: true,
      },
      {
        name: 'a/a',
        expect: true,
      },
      {
        name: 'a//a',
        expect: false,
      },
      {
        name: '/aa',
        expect: false,
      },
      {
        name: 'aa/',
        expect: false,
      },
      {
        name: '/a/a',
        expect: false,
      },
      {
        name: 'a/a/',
        expect: false,
      },
      {
        name: '/a/a/',
        expect: false,
      },
      {
        name: '/',
        expect: false,
      },
    ];
    for (const c of cases) {
      it(`FileRename \`${c.name}\``, () => {
        expect(patterns.FileRename.test(c.name)).toBe(c.expect);
      });
    }
  });

  describe("test BucketName", () => {
    const cases = [
      {
        name: "abc",
        expect: true,
      },
      {
        name: "a-b",
        expect: true,
      },
      {
        name: "",
        expect: false,
      },
      {
        name: new Array(2).fill("a").join(""),
        expect: false,
      },
      {
        name: new Array(64).fill("a").join(""),
        expect: false,
      },
      {
        name: "",
        expect: false,
      },
      {
        name: "-aaa",
        expect: false,
      },
      {
        name: "存储桶",
        expect: false,
      },
    ];
    for (const c of cases) {
      it(`BucketName \`${c.name}\``, () => {
        expect(patterns.BucketName.test(c.name)).toBe(c.expect);
      });
    }
  });

  describe("test DirectoryName", () => {
    const cases = [
      {
        name: "a",
        expect: true,
      },
      {
        name: "",
        expect: false,
      },
      {
        name: "/a",
        expect: false,
      },
      {
        name: "a/",
        expect: false,
      },
      {
        name: "a/a",
        expect: false,
      },
    ];
    for (const c of cases) {
      it(`DirectoryName \`${c.name}\``, () => {
        expect(patterns.DirectoryName.test(c.name)).toBe(c.expect);
      });
    }
  });
});
