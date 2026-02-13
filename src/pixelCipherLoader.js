
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { getMachineId } = require('./security/hardware_id');
const vm = require('vm');

const DATA_DIR = path.join(__dirname, 'blackbox_data');

function decryptBlob(filename) {
    try {
        const machineKey = getMachineId(); // Re-derive key from current hardware
        const blob = fs.readFileSync(path.join(DATA_DIR, filename));
        
        const iv = blob.subarray(0, 16);
        const tag = blob.subarray(16, 32);
        const data = blob.subarray(32);
        
        const decipher = crypto.createDecipheriv('aes-256-gcm', machineKey, iv);
        decipher.setAuthTag(tag);
        
        const decrypted = Buffer.concat([decipher.update(data), decipher.final()]);
        return decrypted.toString('utf-8');
    } catch (e) {
        throw new Error('SECURITY VIOLATION: Hardware fingerprint mismatch. Code cannot run on this machine.');
    }
}

// Lazy-load the CPU Cipher class
let PixelCipherClass = null;

function loadCpuCipher() {
    if (PixelCipherClass) return PixelCipherClass;
    
    const code = decryptBlob('cpu_core.enc');
    
    // Execute the code in a sandbox to extract the class
    const sandbox = { 
        require: require, 
        console: console, 
        module: { exports: {} },
        Buffer: Buffer
    };
    
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    
    PixelCipherClass = sandbox.module.exports.PixelCipher;
    
    // Also export constants if they exist
    module.exports.BLOCK_SIZE = sandbox.module.exports.BLOCK_SIZE;
    module.exports.KEY_SIZE = sandbox.module.exports.KEY_SIZE;
    module.exports.NUM_ROUNDS = sandbox.module.exports.NUM_ROUNDS;
    
    return PixelCipherClass;
}

// Loader Class that mimics the original PixelCipher API
class HybridPixelCipher {
    constructor(key) {
        // TODO: Try to init GPU here. If fail, fall back.
        // For now, we use the protected CPU fallback.
        const CpuCipher = loadCpuCipher();
        this.engine = new CpuCipher(key);
        this.type = 'CPU-Encrypted-vm';
    }
    
    encrypt(data, iv) { return this.engine.encrypt(data, iv); }
    decrypt(data) { return this.engine.decrypt(data); }
    encryptString(str) { return this.engine.encryptString(str); }
    decryptString(b64) { return this.engine.decryptString(b64); }
    getKeyHex() { return this.engine.getKeyHex(); }
    createTextureHash(data) { return this.engine.createTextureHash(data); }
}

module.exports = { PixelCipher: HybridPixelCipher };
