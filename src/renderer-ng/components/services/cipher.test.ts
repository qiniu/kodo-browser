import * as Cipher from './cipher';

describe("cipher", () => {
    it("cipher const", () => {
        const actual = Cipher.cipher("test cipher");
        expect(actual).toBe("d8734177789bda96d17e693599380615");
    });

    it("decipher const", () => {
        const actual = Cipher.decipher("d8734177789bda96d17e693599380615");
        expect(actual).toBe("test cipher");
    })

    it("cipher and decipher", () => {
        const data = "hello kodo-browser";
        const encode = Cipher.cipher(data);
        const decode = Cipher.decipher(encode);
        expect(decode).toBe(data);
    })
})
