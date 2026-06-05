export declare function generateApiKey(prefix: 'sk' | 'pat'): {
    raw: string;
    hash: string;
};
export declare function hashApiKey(raw: string): string;
export declare function encryptFile(plaintext: Buffer): Buffer;
export declare function decryptFile(data: Buffer): Buffer;
export declare function encryptSecret(plaintext: string): string;
export declare function decryptSecret(encrypted: string): string;
