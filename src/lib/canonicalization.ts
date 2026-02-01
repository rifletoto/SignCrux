/**
 * Content Canonicalization Module
 * Version: 1.0.0 (永久固定，不可修改)
 * 
 * 规范化规则：
 * 1. Unicode NFC 规范化
 * 2. 全角字符转半角（ASCII 范围）
 * 3. 空白符规范化（多空格→单空格，统一换行符）
 * 4. 保留 Markdown 结构标记
 * 5. Trim 首尾空白
 */

export const CANONICALIZATION_VERSION = '1.0.0';

export interface CanonicalizationConfig {
  version: '1.0.0';
  rules: {
    unicode: 'NFC';
    width: 'half';
    whitespace: 'normalize';
    structure: 'preserve';
    punctuation: 'preserve';
  };
}

export const CONFIG: CanonicalizationConfig = {
  version: '1.0.0',
  rules: {
    unicode: 'NFC',
    width: 'half',
    whitespace: 'normalize',
    structure: 'preserve',
    punctuation: 'preserve',
  },
};

/**
 * 规范化文本内容
 * @param rawText - 原始文本
 * @returns 规范化后的文本
 */
export function canonicalizeText(rawText: string): string {
  if (!rawText) return '';
  
  let text = rawText;
  
  // 1. Unicode NFC 规范化
  text = text.normalize('NFC');
  
  // 2. 全角转半角（仅处理 ASCII 范围：U+FF01-U+FF5E → U+0021-U+007E）
  text = text.replace(/[\uff01-\uff5e]/g, (char) => {
    const code = char.charCodeAt(0);
    return String.fromCharCode(code - 0xfee0);
  });
  
  // 3. 空白符规范化
  text = text
    // 统一换行符：CRLF/CR → LF
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    // 多空格/Tab → 单空格（保留段落内空格）
    .replace(/[\t ]+/g, ' ')
    // 多换行 → 双换行（保留段落分隔）
    .replace(/\n{3,}/g, '\n\n');
  
  // 4. 保留 Markdown 结构
  // 不做处理，# ## - * [ ] 等结构标记原样保留
  
  // 5. Trim 首尾空白
  text = text.trim();
  
  return text;
}

/**
 * 验证规范化的幂等性
 * @param text - 待验证的文本
 * @returns 是否满足幂等性（canonicalize(canonicalize(x)) === canonicalize(x)）
 */
export function verifyIdempotence(text: string): boolean {
  const first = canonicalizeText(text);
  const second = canonicalizeText(first);
  return first === second;
}

/**
 * 获取规范化配置信息
 */
export function getConfig(): CanonicalizationConfig {
  return CONFIG;
}