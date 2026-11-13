const MIN_JWT_SECRET_BYTES = 32;

export function getJwtSecret(): string {
    const secret = process.env.JWT_SECRET?.trim();

    if (!secret) {
        throw new Error('JWT_SECRET no esta configurado.');
    }

    if (Buffer.byteLength(secret, 'utf8') < MIN_JWT_SECRET_BYTES) {
        throw new Error('JWT_SECRET debe tener al menos 32 bytes (256 bits).');
    }

    return secret;
}
