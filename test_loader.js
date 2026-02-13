const { PixelCipher } = require('./src/pixelCipherLoader');
const crypto = require('crypto');

console.log("--- Testing Encrypted Black Box Loader ---");

try {
    const key = crypto.randomBytes(32);
    const cipher = new PixelCipher(key);
    console.log("Initialization: SUCCESS");
    console.log(`Cipher Type: ${cipher.type}`);
    
    const plain = "This message was encrypted by hidden code.";
    const enc = cipher.encryptString(plain);
    console.log(`Encrypted: ${enc.substring(0, 32)}...`);
    
    const dec = cipher.decryptString(enc);
    console.log(`Decrypted: ${dec}`);
    
    if (plain === dec) {
        console.log("Encryption/Decryption Cycle: PASS");
    } else {
        console.log("Encryption/Decryption Cycle: FAIL");
    }
} catch (e) {
    console.error("FATAL ERROR:", e.message);
}
