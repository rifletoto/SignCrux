/**
 * Token Generation and Encoding Module
 * 
 * 使用 CSPRNG 生成 128-bit Token，支持 Braille 和 Base32 编码
 */

import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';

/**
 * 生成 128-bit 加密安全随机 Token
 */
export function generateToken(): Uint8Array {
  return randomBytes(16); // 128 bits = 16 bytes
}

// ============================================================
// Base32 编码/解码（用于 ASCII Token）
// ============================================================

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Base32 编码
 * @param data - 原始字节
 * @returns Base32 字符串
 */
export function encodeBase32(data: Uint8Array): string {
  let bits = '';
  
  // 转换为二进制字符串
  for (const byte of data) {
    bits += byte.toString(2).padStart(8, '0');
  }
  
  // 每 5 bits 一组编码
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    const index = parseInt(chunk, 2);
    result += BASE32_ALPHABET[index];
  }
  
  return result;
}

/**
 * Base32 解码
 * @param encoded - Base32 字符串
 * @returns 原始字节
 */
export function decodeBase32(encoded: string): Uint8Array {
  let bits = '';
  
  // 转换为二进制字符串
  for (const char of encoded.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base32 character: ${char}`);
    }
    bits += index.toString(2).padStart(5, '0');
  }
  
  // 每 8 bits 一组解码为字节
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return new Uint8Array(bytes);
}

// ============================================================
// Braille 编码/解码（用于品牌化 Token）
// ============================================================

const BRAILLE_BASE = 0x2800; // ⠀ (Braille Pattern Blank)

/**
 * Braille 编码（6-dot Braille）
 * @param data - 原始字节
 * @returns Braille 字符串
 */
export function encodeBraille(data: Uint8Array): string {
  let bits = '';
  
  // 转换为二进制字符串
  for (const byte of data) {
    bits += byte.toString(2).padStart(8, '0');
  }
  
  // 每 6 bits 一组编码为一个 Braille 字符
  let result = '';
  for (let i = 0; i < bits.length; i += 6) {
    const chunk = bits.slice(i, i + 6).padEnd(6, '0');
    const value = parseInt(chunk, 2);
    result += String.fromCodePoint(BRAILLE_BASE + value);
  }
  
  return result;
}

/**
 * Braille 解码
 * @param encoded - Braille 字符串
 * @returns 原始字节
 */
export function decodeBraille(encoded: string): Uint8Array {
  let bits = '';
  
  // 转换为二进制字符串
  for (const char of encoded) {
    const codePoint = char.codePointAt(0);
    if (!codePoint || codePoint < BRAILLE_BASE || codePoint >= BRAILLE_BASE + 64) {
      throw new Error(`Invalid Braille character: ${char}`);
    }
    const value = codePoint - BRAILLE_BASE;
    bits += value.toString(2).padStart(6, '0');
  }
  
  // 每 8 bits 一组解码为字节
  const bytes: number[] = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return new Uint8Array(bytes);
}

// ============================================================
// Token 哈希（用于数据库存储）
// ============================================================

/**
 * 计算 Token 哈希（SHA-256）
 * @param token - 原始 Token 字节
 * @returns 64 字符的十六进制哈希
 */
export function hashToken(token: Uint8Array): string {
  return bytesToHex(sha256(token));
}

// ============================================================
// Token 集合（完整生成）
// ============================================================

/**
 * Token 集合（包含所有格式）
 */
export interface TokenSet {
  raw: Uint8Array;      // 原始字节（不存储）
  hash: string;         // SHA-256 哈希（数据库主键）
  braille: string;      // Braille 编码（品牌化展示）
  ascii: string;        // Base32 编码（通用备胎）
}

/**
 * 生成完整的 Token 集合
 */
export function generateTokenSet(): TokenSet {
  const raw = generateToken();
  
  return {
    raw,
    hash: hashToken(raw),
    braille: encodeBraille(raw),
    ascii: encodeBase32(raw),
  };
}

// ============================================================
// Token 解码（自动检测格式）
// ============================================================

/**
 * Token 格式
 */
export enum TokenFormat {
  ASCII = 'ascii',
  BRAILLE = 'braille',
  UNKNOWN = 'unknown',
}

/**
 * 检测 Token 格式
 */
export function detectTokenFormat(token: string): TokenFormat {
  // ASCII (Base32): 仅包含 A-Z 和 2-7
  if (/^[A-Z2-7]+$/i.test(token)) {
    return TokenFormat.ASCII;
  }
  
  // Braille: Unicode 范围 U+2800-U+28FF
  if (/^[\u2800-\u28FF]+$/.test(token)) {
    return TokenFormat.BRAILLE;
  }
  
  return TokenFormat.UNKNOWN;
}

/**
 * 解码 Token（自动检测格式）
 * @param token - Token 字符串
 * @returns 原始字节
 */
export function decodeToken(token: string): Uint8Array {
  const format = detectTokenFormat(token);
  
  switch (format) {
    case TokenFormat.ASCII:
      return decodeBase32(token);
    case TokenFormat.BRAILLE:
      return decodeBraille(token);
    default:
      throw new Error('Invalid token format');
  }
}

/**
 * 验证 Token 编码的可逆性
 */
export function verifyTokenEncoding(): boolean {
  const token = generateToken();
  
  // 测试 Base32
  const asciiEncoded = encodeBase32(token);
  const asciiDecoded = decodeBase32(asciiEncoded);
  const asciiMatch = token.every((byte, i) => byte === asciiDecoded[i]);
  
  // 测试 Braille
  const brailleEncoded = encodeBraille(token);
  const brailleDecoded = decodeBraille(brailleEncoded);
  const brailleMatch = token.every((byte, i) => byte === brailleDecoded[i]);
  
  return asciiMatch && brailleMatch;
}