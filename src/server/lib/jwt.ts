import crypto from 'crypto';

const JWT_SECRET = process.env.JWT_SECRET || 'wacloud_secret_default_key_1234567890';

function base64urlEncode(str: string): string {
  return Buffer.from(str)
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');
}

function base64urlDecode(str: string): string {
  // Add padding back if necessary
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  return Buffer.from(base64, 'base64').toString('utf8');
}

export interface JWTPayload {
  userId: string;
  email: string;
  role?: string;
  exp?: number;
  [key: string]: any;
}

/**
 * Signs a payload and returns an HS256 JWT token string.
 * @param payload Payload object
 * @param expiresIn Number of seconds or string (e.g., '2h')
 */
export function signJWT(payload: Omit<JWTPayload, 'exp'>, expiresInSeconds: number = 7200): string {
  const header = {
    alg: 'HS256',
    typ: 'JWT',
  };

  const exp = Math.floor(Date.now() / 1000) + expiresInSeconds;
  const fullPayload: JWTPayload = {
    ...(payload as JWTPayload),
    exp,
  };

  const encodedHeader = base64urlEncode(JSON.stringify(header));
  const encodedPayload = base64urlEncode(JSON.stringify(fullPayload));

  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  return `${signatureInput}.${signature}`;
}

/**
 * Verifies and decodes an HS256 JWT token string.
 * Returns the decoded payload if valid, otherwise throws an error.
 */
export function verifyJWT(token: string): JWTPayload {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token structure');
  }

  const [encodedHeader, encodedPayload, signature] = parts;

  // Validate signature
  const signatureInput = `${encodedHeader}.${encodedPayload}`;
  const expectedSignature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(signatureInput)
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=/g, '');

  // Timing safe equal to prevent timing attacks
  const signatureBuffer = Buffer.from(signature);
  const expectedBuffer = Buffer.from(expectedSignature);
  
  if (signatureBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(signatureBuffer, expectedBuffer)) {
    throw new Error('Invalid token signature');
  }

  // Parse and validate payload
  const payloadStr = base64urlDecode(encodedPayload);
  const payload: JWTPayload = JSON.parse(payloadStr);

  if (payload.exp && Math.floor(Date.now() / 1000) > payload.exp) {
    throw new Error('Token has expired');
  }

  return payload;
}
