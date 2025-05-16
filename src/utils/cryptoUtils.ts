const AES_KEY = 'FishIslandKey_16';
const AES_IV = 'FishIsland_IV_16';
import CryptoJS from 'crypto-js';
export  const aesDecrypt = async (encryptedBase64) => {
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);

  const decrypted = CryptoJS.AES.decrypt(encryptedBase64, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7 // 这里明确使用Pkcs7
  });

  return JSON.parse(decrypted.toString(CryptoJS.enc.Utf8));
}

// AES加密函数
export const aesEncrypt = (data: object | string): string => {
  // 统一处理数据格式
  const plainText = typeof data === 'string' ? data : JSON.stringify(data);

  // 密钥处理（与解密保持一致）
  const key = CryptoJS.enc.Utf8.parse(AES_KEY);
  const iv = CryptoJS.enc.Utf8.parse(AES_IV);

  // 执行加密
  const encrypted = CryptoJS.AES.encrypt(plainText, key, {
    iv: iv,
    mode: CryptoJS.mode.CBC,
    padding: CryptoJS.pad.Pkcs7
  });

  // 返回Base64格式密文
  return encrypted.toString();
};
