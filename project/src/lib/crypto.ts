import CryptoJS from 'crypto-js';

// Feistel Cipher implementation
export class FeistelCipher {
  private static rounds = 16;

  private static F(R: string, key: string): string {
    return CryptoJS.HmacSHA256(R, key).toString();
  }

  static encrypt(plaintext: string, key: string): string {
    let L = plaintext.slice(0, Math.floor(plaintext.length / 2));
    let R = plaintext.slice(Math.floor(plaintext.length / 2));

    for (let i = 0; i < this.rounds; i++) {
      const temp = L;
      L = R;
      R = CryptoJS.enc.Hex.stringify(
        CryptoJS.enc.Hex.parse(temp).xor(CryptoJS.enc.Hex.parse(this.F(R, key)))
      );
    }

    return R + L;
  }

  static decrypt(ciphertext: string, key: string): string {
    let L = ciphertext.slice(0, Math.floor(ciphertext.length / 2));
    let R = ciphertext.slice(Math.floor(ciphertext.length / 2));

    for (let i = 0; i < this.rounds; i++) {
      const temp = R;
      R = L;
      L = CryptoJS.enc.Hex.stringify(
        CryptoJS.enc.Hex.parse(temp).xor(CryptoJS.enc.Hex.parse(this.F(L, key)))
      );
    }

    return L + R;
  }
}

export const encryptMessage = (message: string, key: string, algorithm: string): string => {
  switch (algorithm) {
    case 'AES':
      return CryptoJS.AES.encrypt(message, key).toString();
    case 'DES':
      return CryptoJS.DES.encrypt(message, key).toString();
    case 'FEISTEL':
      return FeistelCipher.encrypt(message, key);
    default:
      throw new Error('Unsupported algorithm');
  }
};

export const decryptMessage = (encrypted: string, key: string, algorithm: string): string => {
  try {
    switch (algorithm) {
      case 'AES':
        const decryptedAES = CryptoJS.AES.decrypt(encrypted, key);
        return decryptedAES.toString(CryptoJS.enc.Utf8);
      case 'DES':
        const decryptedDES = CryptoJS.DES.decrypt(encrypted, key);
        return decryptedDES.toString(CryptoJS.enc.Utf8);
      case 'FEISTEL':
        return FeistelCipher.decrypt(encrypted, key);
      default:
        throw new Error('Unsupported algorithm');
    }
  } catch (error) {
    throw new Error('Decryption failed. Invalid key or corrupted message.');
  }
};