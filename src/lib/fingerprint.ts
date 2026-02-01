/**
 * Content Fingerprinting Module
 * 
 * 基于 SHA-256 生成唯一的内容标识符 (content_id)
 */

import { sha256 } from '@noble/hashes/sha2';
import { bytesToHex } from '@noble/hashes/utils';
import { canonicalizeText } from './canonicalization';

/**
 * 生成内容 ID（SHA-256 哈希）
 * @param rawText - 原始文本
 * @returns 64 字符的十六进制 content_id
 */
export function generateContentId(rawText: string): string {
  // 1. 规范化文本
  const canonical = canonicalizeText(rawText);
  
  // 2. 转换为 UTF-8 字节
  const bytes = new TextEncoder().encode(canonical);
  
  // 3. SHA-256 哈希
  const hash = sha256(bytes);
  
  // 4. 转十六进制字符串（64 字符）
  return bytesToHex(hash);
}

/**
 * 验证内容 ID 是否匹配
 * @param rawText - 原始文本
 * @param claimedContentId - 声称的 content_id
 * @returns 是否匹配
 */
export function verifyContentId(rawText: string, claimedContentId: string): boolean {
  if (!claimedContentId || claimedContentId.length !== 64) {
    return false;
  }
  
  const computedId = generateContentId(rawText);
  return computedId === claimedContentId;
}

/**
 * 批量生成内容 ID
 * @param texts - 文本数组
 * @returns content_id 数组
 */
export function generateContentIds(texts: string[]): string[] {
  return texts.map(generateContentId);
}

/**
 * 内容指纹结构
 */
export interface ContentFingerprint {
  content_id: string;
  canonical_text: string;
  original_text: string;
  generated_at: string;
  canonicalization_version: string;
}

/**
 * 生成完整的内容指纹信息
 * @param rawText - 原始文本
 * @returns 完整指纹信息
 */
export function generateFingerprint(rawText: string): ContentFingerprint {
  const canonical = canonicalizeText(rawText);
  const content_id = generateContentId(rawText);
  
  return {
    content_id,
    canonical_text: canonical,
    original_text: rawText,
    generated_at: new Date().toISOString(),
    canonicalization_version: '1.0.0',
  };
}