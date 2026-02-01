/**
 * Cryptographic Signature Module
 * 
 * 使用 Ed25519 实现内容签名和验证
 */

import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex, hexToBytes, randomBytes } from '@noble/hashes/utils';

export interface SignaturePayload {
  content_id: string;
  author_id: string;
  assertion: string;
  timestamp: string; // ISO 8601
}

export interface SignatureResult {
  signed_payload_hash: string;   // SHA-256(payload canonical json)
  signature_value: string;       // Ed25519 signature (hex)
  public_key: string;            // Ed25519 public key (hex)
}

/**
 * Canonical JSON：按字母序排列键，确保一致性
 */
function serializePayload(payload: SignaturePayload): string {
  const sortedKeys = Object.keys(payload).sort();
  const sortedPayload: Record<string, string> = {};

  for (const key of sortedKeys) {
    sortedPayload[key] = payload[key as keyof SignaturePayload];
  }

  return JSON.stringify(sortedPayload);
}

function assertKeyBytes(name: string, bytes: Uint8Array, expectedLen: number) {
  if (bytes.length !== expectedLen) {
    throw new Error(`${name} must be ${expectedLen} bytes, got ${bytes.length}`);
  }
}

/**
 * 生成签名（平台/用户通用）
 * 说明：签名的是 payload 的 SHA-256 哈希（32 bytes）
 */
export function signPayload(
  payload: SignaturePayload,
  privateKeyHex: string
): SignatureResult {
  const payloadJson = serializePayload(payload);
  const payloadBytes = new TextEncoder().encode(payloadJson);

  const payloadHash = sha256(payloadBytes);           // Uint8Array(32)
  const payloadHashHex = bytesToHex(payloadHash);

  const privateKey = hexToBytes(privateKeyHex);
  assertKeyBytes('Ed25519 private key', privateKey, 32);

  const publicKey = ed25519.getPublicKey(privateKey); // Uint8Array(32)
  const signature = ed25519.sign(payloadHash, privateKey);

  return {
    signed_payload_hash: payloadHashHex,
    signature_value: bytesToHex(signature),
    public_key: bytesToHex(publicKey),
  };
}

/**
 * 平台签名（可选：校验 env 中的 publicKeyHex 是否与 privateKeyHex 匹配）
 */
export function generatePlatformSignature(
  payload: SignaturePayload,
  privateKeyHex: string,
  expectedPublicKeyHex?: string
): SignatureResult {
  const result = signPayload(payload, privateKeyHex);

  if (expectedPublicKeyHex) {
    const expected = hexToBytes(expectedPublicKeyHex);
    assertKeyBytes('Ed25519 public key', expected, 32);

    const actual = hexToBytes(result.public_key);
    // 常量时间比较不是必须，但这里属于公开公钥比较，风险低；需要更严谨可引入 timingSafeEqual（Node）
    if (bytesToHex(expected) !== bytesToHex(actual)) {
      throw new Error('Public key does not match the provided private key');
    }
  }

  return result;
}

/**
 * 验证签名：基于 payloadHashHex 验证（你也可以写 verifyPayload(payload, sig, pub) 由库内部重算 hash）
 */
export function verifySignature(
  payloadHashHex: string,
  signatureHex: string,
  publicKeyHex: string
): boolean {
  try {
    const payloadHash = hexToBytes(payloadHashHex);
    const signature = hexToBytes(signatureHex);
    const publicKey = hexToBytes(publicKeyHex);

    assertKeyBytes('Payload hash', payloadHash, 32);
    assertKeyBytes('Ed25519 public key', publicKey, 32);

    // Ed25519 signature 长度通常 64 bytes；不同实现会校验
    return ed25519.verify(signature, payloadHash, publicKey);
  } catch {
    return false;
  }
}

/**
 * 生成 Ed25519 密钥对
 */
export function generateKeyPair(): { privateKey: string; publicKey: string } {
  const privateKey = randomBytes(32); // ✅ 不依赖 ed25519.utils 命名
  const publicKey = ed25519.getPublicKey(privateKey);

  return {
    privateKey: bytesToHex(privateKey),
    publicKey: bytesToHex(publicKey),
  };
}
