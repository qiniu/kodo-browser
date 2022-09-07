import crypto from "crypto"

const ALGORITHM = "aes-256-cbc";
const KEY = "x82m#*lx8vv";

export function cipher(
    data: string,
    key: string = KEY,
    algorithm: string = ALGORITHM,
): string {
  let encrypted = "";
  const cip = crypto.createCipher(algorithm, key);
  encrypted += cip.update(data, "utf8", "hex");
  encrypted += cip.final("hex");
  return encrypted;
}

export function decipher(
    encrypted: string,
    key: string = KEY,
    algorithm: string = ALGORITHM,
):string {
  let decrypted = "";
  const decipher = crypto.createDecipher(algorithm, key);
  decrypted += decipher.update(encrypted, "hex", "utf8");
  decrypted += decipher.final("utf8");
  return decrypted;
}
