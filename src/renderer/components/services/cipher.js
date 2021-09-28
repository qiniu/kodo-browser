import crypto from 'crypto'

import webModule from '@/app-module/web'

const CIPHER_FACTORY_NAME = 'Cipher'

webModule.factory(CIPHER_FACTORY_NAME, function () {
  var ALGORITHM = "aes-256-cbc";
  var KEY = "x82m#*lx8vv";

  return {
    cipher: cipher,
    decipher: decipher
  };

  function cipher(buf, key, algorithm) {
    if (!buf instanceof Buffer) {
      buf = Buffer.from(buf);
    }
    var encrypted = "";
    var cip = crypto.createCipher(algorithm || ALGORITHM, key || KEY);
    encrypted += cip.update(buf, "utf8", "hex");
    encrypted += cip.final("hex");
    return encrypted;
  }

  function decipher(encrypted, key, algorithm) {
    var decrypted = "";
    var decipher = crypto.createDecipher(algorithm || ALGORITHM, key || KEY);
    decrypted += decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
});

export default CIPHER_FACTORY_NAME
