# Phase 1: 基础确权 + Token - 任务清单

## 阶段信息

| 属性 | 值 |
|------|-----|
| **阶段名称** | Phase 1: 基础确权 + Token |
| **预计周期** | 5-6 周 |
| **开始日期** | 2025-02-01 |
| **目标日期** | 2025-03-15 |
| **核心目标** | 完成核心确权能力，可独立使用的 MVP |

---

## 阶段目标

### 功能目标
- ✅ 用户可以注册内容并获得 `content_id` 和 Token
- ✅ 用户可以通过 Token 验证内容所有权
- ✅ 系统生成平台托管的 Ed25519 签名
- ✅ Token 支持 Braille 和 ASCII 双编码

### 技术目标
- ✅ 建立规范化处理管道（Canonicalization v1.0.0）
- ✅ 实现 SHA-256 内容指纹生成
- ✅ 实现密码学签名验证流程
- ✅ 搭建基础数据库结构
- ✅ 提供 RESTful API（/api/v1/content/*, /api/v1/token/*）

### 验收标准
- [ ] 可通过 API 注册 1000 字的文章，返回 Token（<200ms）
- [ ] Token 验证成功率 >99.9%（包括 Braille 和 ASCII 格式）
- [ ] 签名验证通过率 100%（使用 @noble/ed25519）
- [ ] 数据库可存储 10K+ 内容记录
- [ ] 所有 API 有完整的错误处理和 TypeScript 类型定义

---

## 任务分解

### 📦 模块 1: 项目初始化 (Week 1, Day 1-2)

#### 1.1 创建 Next.js 项目
**优先级**: P0  
**预计时间**: 2 小时  
**负责人**: 自己

**任务**:
```bash
# 创建 Next.js 14 项目
npx create-next-app@latest signcrux \
  --typescript \
  --tailwind \
  --app \
  --src-dir \
  --import-alias "@/*"

cd signcrux
```

**验收标准**:
- [ ] 项目可运行 `npm run dev`
- [ ] TypeScript 无编译错误
- [ ] Tailwind CSS 正常工作

**依赖文件**:
- `package.json`
- `tsconfig.json`
- `next.config.js`
- `tailwind.config.ts`

---

#### 1.2 安装核心依赖
**优先级**: P0  
**预计时间**: 1 小时

**任务**:
```bash
# 密码学库
npm install @noble/hashes @noble/ed25519

# 数据库
npm install pg @types/pg drizzle-orm
npm install -D drizzle-kit

# 工具库
npm install zod  # 输入验证
npm install nanoid  # Token 生成辅助
```

**验收标准**:
- [ ] 所有依赖成功安装
- [ ] `package-lock.json` 已生成
- [ ] 无安全漏洞警告（`npm audit`）

---

#### 1.3 配置环境变量
**优先级**: P0  
**预计时间**: 30 分钟

**任务**:
创建 `.env.local`:
```bash
# Database
DATABASE_URL="postgresql://user:pass@localhost:5432/signcrux"

# Platform Signing Key (Ed25519, 生成方式见下方脚本)
PLATFORM_PRIVATE_KEY="hex-encoded-32-bytes"
PLATFORM_PUBLIC_KEY="hex-encoded-32-bytes"

# API Settings
API_VERSION="v1"
NODE_ENV="development"
```

**密钥生成脚本** (`scripts/generate-keys.ts`):
```typescript
import { ed25519 } from '@noble/curves/ed25519';
import { bytesToHex } from '@noble/hashes/utils';

const privateKey = ed25519.utils.randomPrivateKey();
const publicKey = ed25519.getPublicKey(privateKey);

console.log('PLATFORM_PRIVATE_KEY=' + bytesToHex(privateKey));
console.log('PLATFORM_PUBLIC_KEY=' + bytesToHex(publicKey));
```

**验收标准**:
- [ ] `.env.local` 已创建且不在 Git 中
- [ ] `.env.example` 包含所有必需变量（无实际值）
- [ ] 密钥对可用于签名和验证

---

### 📦 模块 2: 数据库设计 (Week 1, Day 3-5)

#### 2.1 设计数据库 Schema
**优先级**: P0  
**预计时间**: 4 小时

**Schema 定义** (`src/db/schema.ts`):
```typescript
import { pgTable, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// 内容表
export const contents = pgTable('contents', {
  // 主键
  content_id: varchar('content_id', { length: 64 }).primaryKey(), // SHA-256 hex
  
  // 内容快照
  canonical_text: text('canonical_text').notNull(), // 规范化后的文本
  original_text: text('original_text').notNull(),   // 原始文本（用于展示）
  
  // 元数据
  title: varchar('title', { length: 500 }),
  author_id: varchar('author_id', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  
  // 规范化版本
  canonicalization_version: varchar('canonicalization_version', { length: 10 }).notNull().default('1.0.0'),
}, (table) => ({
  authorIdx: index('idx_author_id').on(table.author_id),
  createdAtIdx: index('idx_created_at').on(table.created_at),
}));

// Token 表
export const tokens = pgTable('tokens', {
  // 主键
  token_hash: varchar('token_hash', { length: 64 }).primaryKey(), // SHA-256(token)
  
  // Token 数据
  token_braille: varchar('token_braille', { length: 100 }).notNull().unique(),
  token_ascii: varchar('token_ascii', { length: 50 }).notNull().unique(),
  
  // 关联
  content_id: varchar('content_id', { length: 64 }).notNull().references(() => contents.content_id),
  
  // 状态
  is_revoked: boolean('is_revoked').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  revoked_at: timestamp('revoked_at'),
}, (table) => ({
  contentIdx: index('idx_token_content_id').on(table.content_id),
  brailleIdx: index('idx_token_braille').on(table.token_braille),
  asciiIdx: index('idx_token_ascii').on(table.token_ascii),
}));

// 签名表
export const signatures = pgTable('signatures', {
  // 主键
  signature_id: varchar('signature_id', { length: 64 }).primaryKey(), // nanoid
  
  // 关联
  content_id: varchar('content_id', { length: 64 }).notNull().references(() => contents.content_id),
  
  // 签名数据
  signed_payload_hash: varchar('signed_payload_hash', { length: 64 }).notNull(), // SHA-256
  signature_value: varchar('signature_value', { length: 128 }).notNull(),        // Ed25519 hex
  public_key: varchar('public_key', { length: 64 }).notNull(),                   // Ed25519 public key hex
  
  // 元数据
  signature_type: varchar('signature_type', { length: 20 }).notNull().default('platform'), // 'platform' | 'user'
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contentIdx: index('idx_signature_content_id').on(table.content_id),
}));

// 声明表 (Assertion)
export const assertions = pgTable('assertions', {
  // 主键
  assertion_id: varchar('assertion_id', { length: 64 }).primaryKey(), // nanoid
  
  // 关联
  content_id: varchar('content_id', { length: 64 }).notNull().references(() => contents.content_id),
  
  // 声明内容
  claim_type: varchar('claim_type', { length: 50 }).notNull().default('authorship'), // 'authorship' | 'timestamp'
  claim_statement: text('claim_statement').notNull(), // "I am the original author of this content"
  
  // 元数据
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  contentIdx: index('idx_assertion_content_id').on(table.content_id),
}));
```

**验收标准**:
- [ ] Schema 符合 v3.1 文档的数据模型
- [ ] 所有外键关系正确
- [ ] 索引覆盖常见查询（author_id, created_at, token）

---

#### 2.2 数据库迁移
**优先级**: P0  
**预计时间**: 2 小时

**任务**:
```bash
# 生成迁移文件
npx drizzle-kit generate:pg

# 执行迁移
npx drizzle-kit push:pg
```

**验收标准**:
- [ ] 本地 PostgreSQL 数据库已创建所有表
- [ ] 可插入测试数据
- [ ] 索引已正确创建（通过 `EXPLAIN` 验证）

---

### 📦 模块 3: 规范化处理 (Week 2, Day 1-3)

#### 3.1 实现 Canonicalization v1.0.0
**优先级**: P0  
**预计时间**: 6 小时

**文件**: `src/lib/canonicalization.ts`

**实现要点**:
```typescript
import { normalize } from 'node:util';

export const CANONICALIZATION_VERSION = '1.0.0';

interface CanonicalizationConfig {
  version: '1.0.0';
  rules: {
    unicode: 'NFC';
    width: 'half';
    whitespace: 'normalize';
    structure: 'preserve';
    punctuation: 'preserve';
  };
}

export function canonicalizeText(rawText: string): string {
  let text = rawText;
  
  // 1. Unicode 规范化 (NFC)
  text = normalize('NFC', text);
  
  // 2. 全角转半角 (仅 ASCII 范围)
  text = text.replace(/[\uff01-\uff5e]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
  );
  
  // 3. 空白符规范化
  text = text
    .replace(/\r\n/g, '\n')           // Windows 换行 → Unix
    .replace(/\r/g, '\n')             // 旧 Mac 换行 → Unix
    .replace(/[\t ]+/g, ' ')          // 多空格/Tab → 单空格
    .replace(/\n{3,}/g, '\n\n');      // 多换行 → 双换行
  
  // 4. 保留 Markdown 结构标记 (# ## - * [ ] 等)
  // 不做处理，原样保留
  
  // 5. Trim 首尾空白
  text = text.trim();
  
  return text;
}
```

**验收标准**:
- [ ] 通过单元测试（见下方测试用例）
- [ ] 处理 10KB 文本 <10ms
- [ ] 幂等性：`canonicalize(canonicalize(x)) === canonicalize(x)`

**单元测试** (`src/lib/canonicalization.test.ts`):
```typescript
import { describe, test, expect } from 'vitest';
import { canonicalizeText } from './canonicalization';

describe('canonicalizeText', () => {
  test('Unicode NFC normalization', () => {
    const input = '\u00e9'; // é (composed)
    const output = canonicalizeText(input);
    expect(output).toBe('\u00e9'); // 应保持 NFC 形式
  });
  
  test('全角转半角', () => {
    const input = 'Ｈｅｌｌｏ　Ｗｏｒｌｄ！';
    const output = canonicalizeText(input);
    expect(output).toBe('Hello World!');
  });
  
  test('空白符规范化', () => {
    const input = 'Hello\r\nWorld\t\tTest   End';
    const output = canonicalizeText(input);
    expect(output).toBe('Hello\nWorld Test End');
  });
  
  test('保留 Markdown 结构', () => {
    const input = '# Title\n\n- Item 1\n- Item 2';
    const output = canonicalizeText(input);
    expect(output).toContain('# Title');
    expect(output).toContain('- Item 1');
  });
  
  test('幂等性', () => {
    const input = 'Test　　Text\r\n\r\n';
    const first = canonicalizeText(input);
    const second = canonicalizeText(first);
    expect(first).toBe(second);
  });
});
```

---

#### 3.2 内容指纹生成
**优先级**: P0  
**预计时间**: 2 小时

**文件**: `src/lib/fingerprint.ts`

```typescript
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';
import { canonicalizeText } from './canonicalization';

export function generateContentId(rawText: string): string {
  // 1. 规范化
  const canonical = canonicalizeText(rawText);
  
  // 2. SHA-256 哈希
  const hash = sha256(new TextEncoder().encode(canonical));
  
  // 3. 转十六进制（64 字符）
  return bytesToHex(hash);
}

// 验证函数
export function verifyContentId(rawText: string, claimedContentId: string): boolean {
  const computedId = generateContentId(rawText);
  return computedId === claimedContentId;
}
```

**验收标准**:
- [ ] 相同文本生成相同 `content_id`
- [ ] 不同文本生成不同 `content_id`（碰撞概率 < 2^-128）
- [ ] 生成速度 >1000 次/秒

---

### 📦 模块 4: 签名系统 (Week 2, Day 4-5 + Week 3, Day 1)

#### 4.1 平台签名实现
**优先级**: P0  
**预计时间**: 4 小时

**文件**: `src/lib/signature.ts`

```typescript
import { ed25519 } from '@noble/curves/ed25519';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex, hexToBytes } from '@noble/hashes/utils';

interface SignaturePayload {
  content_id: string;
  author_id: string;
  assertion: string;
  timestamp: string; // ISO 8601
}

export async function generatePlatformSignature(
  payload: SignaturePayload
): Promise<{
  signed_payload_hash: string;
  signature_value: string;
  public_key: string;
}> {
  // 1. 序列化 Payload (Canonical JSON)
  const payloadJson = JSON.stringify(payload, Object.keys(payload).sort());
  
  // 2. SHA-256 哈希
  const payloadHash = sha256(new TextEncoder().encode(payloadJson));
  const payloadHashHex = bytesToHex(payloadHash);
  
  // 3. Ed25519 签名
  const privateKey = hexToBytes(process.env.PLATFORM_PRIVATE_KEY!);
  const publicKey = hexToBytes(process.env.PLATFORM_PUBLIC_KEY!);
  
  const signature = ed25519.sign(payloadHash, privateKey);
  
  return {
    signed_payload_hash: payloadHashHex,
    signature_value: bytesToHex(signature),
    public_key: bytesToHex(publicKey),
  };
}

export async function verifySignature(
  payloadHashHex: string,
  signatureHex: string,
  publicKeyHex: string
): Promise<boolean> {
  try {
    const payloadHash = hexToBytes(payloadHashHex);
    const signature = hexToBytes(signatureHex);
    const publicKey = hexToBytes(publicKeyHex);
    
    return ed25519.verify(signature, payloadHash, publicKey);
  } catch {
    return false;
  }
}
```

**验收标准**:
- [ ] 签名生成速度 >5000 次/秒
- [ ] 验证成功率 100%（正确签名）
- [ ] 验证拒绝率 100%（篡改签名）

---

### 📦 模块 5: Token 系统 (Week 3, Day 2-4)

#### 5.1 Token 生成与编码
**优先级**: P0  
**预计时间**: 6 小时

**文件**: `src/lib/token.ts`

```typescript
import { randomBytes } from '@noble/hashes/utils';
import { sha256 } from '@noble/hashes/sha256';
import { bytesToHex } from '@noble/hashes/utils';

// CSPRNG 生成 128-bit Token
export function generateToken(): Uint8Array {
  return randomBytes(16); // 128 bits
}

// Base32 编码（用于 ASCII Token）
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

export function encodeBase32(data: Uint8Array): string {
  let bits = '';
  for (const byte of data) {
    bits += byte.toString(2).padStart(8, '0');
  }
  
  let result = '';
  for (let i = 0; i < bits.length; i += 5) {
    const chunk = bits.slice(i, i + 5).padEnd(5, '0');
    result += BASE32_ALPHABET[parseInt(chunk, 2)];
  }
  
  return result;
}

// Braille 编码（6-dot Braille）
const BRAILLE_BASE = 0x2800; // ⠀ (Braille Pattern Blank)

export function encodeBraille(data: Uint8Array): string {
  // 每个 Braille 字符可编码 6 bits
  let result = '';
  let bitBuffer = '';
  
  for (const byte of data) {
    bitBuffer += byte.toString(2).padStart(8, '0');
  }
  
  for (let i = 0; i < bitBuffer.length; i += 6) {
    const chunk = bitBuffer.slice(i, i + 6).padEnd(6, '0');
    const value = parseInt(chunk, 2);
    result += String.fromCodePoint(BRAILLE_BASE + value);
  }
  
  return result;
}

// Token Hash (用于数据库存储)
export function hashToken(token: Uint8Array): string {
  return bytesToHex(sha256(token));
}

// 完整 Token 生成
export interface TokenSet {
  raw: Uint8Array;
  hash: string;
  braille: string;
  ascii: string;
}

export function generateTokenSet(): TokenSet {
  const raw = generateToken();
  return {
    raw,
    hash: hashToken(raw),
    braille: encodeBraille(raw),
    ascii: encodeBase32(raw),
  };
}
```

**验收标准**:
- [ ] Braille Token 长度 ≤ 30 字符
- [ ] ASCII Token 长度 ≤ 26 字符
- [ ] Token 唯一性：100K 次生成无碰撞
- [ ] 编码可逆性：`decode(encode(x)) === x`

---

#### 5.2 Token 解码与验证
**优先级**: P0  
**预计时间**: 3 小时

**扩展** `src/lib/token.ts`:

```typescript
// Base32 解码
export function decodeBase32(encoded: string): Uint8Array {
  let bits = '';
  for (const char of encoded.toUpperCase()) {
    const index = BASE32_ALPHABET.indexOf(char);
    if (index === -1) throw new Error('Invalid Base32 character');
    bits += index.toString(2).padStart(5, '0');
  }
  
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return new Uint8Array(bytes);
}

// Braille 解码
export function decodeBraille(encoded: string): Uint8Array {
  let bits = '';
  for (const char of encoded) {
    const codePoint = char.codePointAt(0)!;
    if (codePoint < BRAILLE_BASE || codePoint >= BRAILLE_BASE + 64) {
      throw new Error('Invalid Braille character');
    }
    const value = codePoint - BRAILLE_BASE;
    bits += value.toString(2).padStart(6, '0');
  }
  
  const bytes = [];
  for (let i = 0; i < bits.length; i += 8) {
    const byte = bits.slice(i, i + 8);
    if (byte.length === 8) {
      bytes.push(parseInt(byte, 2));
    }
  }
  
  return new Uint8Array(bytes);
}

// 验证 Token
export async function verifyToken(
  token: string,
  db: Database
): Promise<{ valid: boolean; content_id?: string }> {
  try {
    // 1. 尝试解码（自动检测格式）
    let rawToken: Uint8Array;
    if (token.match(/^[A-Z2-7]+$/)) {
      // ASCII (Base32)
      rawToken = decodeBase32(token);
    } else if (token.match(/^[\u2800-\u28FF]+$/)) {
      // Braille
      rawToken = decodeBraille(token);
    } else {
      return { valid: false };
    }
    
    // 2. 计算 Token Hash
    const tokenHash = hashToken(rawToken);
    
    // 3. 查询数据库
    const record = await db.query.tokens.findFirst({
      where: eq(tokens.token_hash, tokenHash),
      columns: {
        content_id: true,
        is_revoked: true,
      },
    });
    
    if (!record) return { valid: false };
    if (record.is_revoked) return { valid: false };
    
    return { valid: true, content_id: record.content_id };
  } catch {
    return { valid: false };
  }
}
```

**验收标准**:
- [ ] ASCII Token 解码成功率 100%
- [ ] Braille Token 解码成功率 100%
- [ ] 自动格式检测准确率 100%
- [ ] 无效 Token 拒绝率 100%

---

### 📦 模块 6: API 实现 (Week 3, Day 5 + Week 4, Day 1-3)

#### 6.1 内容注册 API
**优先级**: P0  
**预计时间**: 6 小时

**文件**: `src/app/api/v1/content/register/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { contents, tokens, signatures, assertions } from '@/db/schema';
import { generateContentId } from '@/lib/fingerprint';
import { generatePlatformSignature } from '@/lib/signature';
import { generateTokenSet } from '@/lib/token';
import { nanoid } from 'nanoid';

const registerSchema = z.object({
  text: z.string().min(1).max(100000),
  title: z.string().optional(),
  author_id: z.string().min(1),
});

export async function POST(request: NextRequest) {
  try {
    // 1. 验证输入
    const body = await request.json();
    const { text, title, author_id } = registerSchema.parse(body);
    
    // 2. 生成 content_id
    const content_id = generateContentId(text);
    
    // 3. 检查是否已存在
    const existing = await db.query.contents.findFirst({
      where: eq(contents.content_id, content_id),
    });
    
    if (existing) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'CONTENT_ALREADY_EXISTS',
          message: 'This content has already been registered',
        },
      }, { status: 409 });
    }
    
    // 4. 开启事务
    await db.transaction(async (tx) => {
      // 4.1 插入内容
      await tx.insert(contents).values({
        content_id,
        canonical_text: canonicalizeText(text),
        original_text: text,
        title,
        author_id,
      });
      
      // 4.2 生成 Token
      const tokenSet = generateTokenSet();
      await tx.insert(tokens).values({
        token_hash: tokenSet.hash,
        token_braille: tokenSet.braille,
        token_ascii: tokenSet.ascii,
        content_id,
      });
      
      // 4.3 生成签名
      const timestamp = new Date().toISOString();
      const assertion = `I, ${author_id}, claim authorship of content ${content_id} at ${timestamp}`;
      
      const signature = await generatePlatformSignature({
        content_id,
        author_id,
        assertion,
        timestamp,
      });
      
      await tx.insert(signatures).values({
        signature_id: nanoid(),
        content_id,
        ...signature,
        signature_type: 'platform',
      });
      
      // 4.4 记录声明
      await tx.insert(assertions).values({
        assertion_id: nanoid(),
        content_id,
        claim_type: 'authorship',
        claim_statement: assertion,
      });
    });
    
    // 5. 返回结果
    const tokenRecord = await db.query.tokens.findFirst({
      where: eq(tokens.content_id, content_id),
    });
    
    return NextResponse.json({
      success: true,
      data: {
        content_id,
        token: {
          braille: tokenRecord!.token_braille,
          ascii: tokenRecord!.token_ascii,
        },
        verification_url: `/verify/${tokenRecord!.token_ascii}`,
      },
      meta: {
        api_version: 'v1',
        request_id: nanoid(),
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request data',
          details: error.errors,
        },
      }, { status: 400 });
    }
    
    console.error('Register error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, { status: 500 });
  }
}
```

**验收标准**:
- [ ] 响应时间 p99 <200ms
- [ ] 事务成功率 100%
- [ ] 重复注册返回 409 错误
- [ ] 输入验证拦截无效数据

---

#### 6.2 Token 验证 API
**优先级**: P0  
**预计时间**: 3 小时

**文件**: `src/app/api/v1/token/verify/[token]/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { tokens, contents, signatures } from '@/db/schema';
import { verifyToken } from '@/lib/token';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;
    
    // 1. 验证 Token
    const result = await verifyToken(token, db);
    
    if (!result.valid) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_TOKEN',
          message: 'Token is invalid or has been revoked',
        },
      }, { status: 404 });
    }
    
    // 2. 获取内容信息
    const content = await db.query.contents.findFirst({
      where: eq(contents.content_id, result.content_id!),
    });
    
    // 3. 获取签名信息
    const signature = await db.query.signatures.findFirst({
      where: eq(signatures.content_id, result.content_id!),
      orderBy: (signatures, { desc }) => [desc(signatures.created_at)],
    });
    
    // 4. 返回结果
    return NextResponse.json({
      success: true,
      data: {
        valid: true,
        content: {
          content_id: content!.content_id,
          title: content!.title,
          author_id: content!.author_id,
          created_at: content!.created_at,
        },
        signature: {
          signed_payload_hash: signature!.signed_payload_hash,
          public_key: signature!.public_key,
          created_at: signature!.created_at,
        },
        certificate_url: `/certificate/${content!.content_id}`,
      },
      meta: {
        api_version: 'v1',
        request_id: nanoid(),
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    console.error('Verify error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, { status: 500 });
  }
}
```

**验收标准**:
- [ ] 有效 Token 验证成功率 100%
- [ ] 无效 Token 返回 404
- [ ] 响应时间 p99 <100ms

---

#### 6.3 内容验证 API
**优先级**: P1  
**预计时间**: 3 小时

**文件**: `src/app/api/v1/content/verify/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { db } from '@/db';
import { contents } from '@/db/schema';
import { verifyContentId } from '@/lib/fingerprint';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

const verifySchema = z.object({
  text: z.string().min(1),
  content_id: z.string().length(64).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { text, content_id: claimedId } = verifySchema.parse(body);
    
    // 1. 计算实际 content_id
    const computedId = generateContentId(text);
    
    // 2. 如果提供了 claimed_id，验证是否匹配
    if (claimedId) {
      if (computedId !== claimedId) {
        return NextResponse.json({
          success: true,
          data: {
            exists: false,
            reason: 'CONTENT_ID_MISMATCH',
            message: 'The provided content does not match the claimed content_id',
          },
        });
      }
    }
    
    // 3. 查询数据库
    const record = await db.query.contents.findFirst({
      where: eq(contents.content_id, computedId),
    });
    
    if (!record) {
      return NextResponse.json({
        success: true,
        data: {
          exists: false,
          content_id: computedId,
          message: 'This content has not been registered',
        },
      });
    }
    
    // 4. 返回已注册信息
    return NextResponse.json({
      success: true,
      data: {
        exists: true,
        content_id: computedId,
        registered_at: record.created_at,
        author_id: record.author_id,
        verification_url: `/certificate/${computedId}`,
      },
      meta: {
        api_version: 'v1',
        request_id: nanoid(),
        timestamp: new Date().toISOString(),
      },
    });
    
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid request data',
          details: error.errors,
        },
      }, { status: 400 });
    }
    
    console.error('Verify error:', error);
    return NextResponse.json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred',
      },
    }, { status: 500 });
  }
}
```

**验收标准**:
- [ ] 已注册内容返回完整信息
- [ ] 未注册内容返回 `exists: false`
- [ ] Content ID 不匹配返回明确错误

---

### 📦 模块 7: 前端页面 (Week 4, Day 4-5 + Week 5)

#### 7.1 Token 验证页面
**优先级**: P0  
**预计时间**: 8 小时

**文件**: `src/app/verify/[token]/page.tsx`

```typescript
import { notFound } from 'next/navigation';

async function getTokenData(token: string) {
  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/v1/token/verify/${token}`, {
    cache: 'no-store',
  });
  
  if (!res.ok) return null;
  return res.json();
}

export default async function VerifyPage({ params }: { params: { token: string } }) {
  const data = await getTokenData(params.token);
  
  if (!data?.success) {
    notFound();
  }
  
  const { content, signature } = data.data;
  
  return (
    <div className="container mx-auto px-4 py-16">
      <div className="max-w-2xl mx-auto">
        {/* 验证成功徽章 */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-full">
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
            <span className="font-semibold">Verified Content</span>
          </div>
        </div>
        
        {/* 内容信息 */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-bold mb-4">{content.title || 'Untitled'}</h2>
          
          <dl className="space-y-3">
            <div>
              <dt className="text-sm text-gray-500">Content ID</dt>
              <dd className="font-mono text-sm break-all">{content.content_id}</dd>
            </div>
            
            <div>
              <dt className="text-sm text-gray-500">Author</dt>
              <dd className="font-medium">{content.author_id}</dd>
            </div>
            
            <div>
              <dt className="text-sm text-gray-500">Registered At</dt>
              <dd>{new Date(content.created_at).toLocaleString()}</dd>
            </div>
          </dl>
        </div>
        
        {/* 签名信息 */}
        <div className="bg-gray-50 rounded-lg p-6">
          <h3 className="font-semibold mb-3">Cryptographic Signature</h3>
          
          <dl className="space-y-2 text-sm">
            <div>
              <dt className="text-gray-500">Public Key</dt>
              <dd className="font-mono break-all">{signature.public_key}</dd>
            </div>
            
            <div>
              <dt className="text-gray-500">Payload Hash</dt>
              <dd className="font-mono break-all">{signature.signed_payload_hash}</dd>
            </div>
          </dl>
          
          <a 
            href={data.data.certificate_url}
            className="mt-4 inline-block text-blue-600 hover:underline"
          >
            View Full Certificate →
          </a>
        </div>
      </div>
    </div>
  );
}
```

**验收标准**:
- [ ] 有效 Token 显示完整信息
- [ ] 无效 Token 显示 404 页面
- [ ] 响应式设计（移动端友好）
- [ ] SEO 优化（meta tags, Open Graph）

---

#### 7.2 证书页面（简化版）
**优先级**: P1  
**预计时间**: 6 小时

**文件**: `src/app/certificate/[content_id]/page.tsx`

类似结构，展示更详细的证据信息（signatures, assertions）。

---

### 📦 模块 8: 测试与文档 (Week 6)

#### 8.1 集成测试
**优先级**: P0  
**预计时间**: 8 小时

**测试场景**:
- [ ] 完整注册流程：文本 → content_id → token → 验证
- [ ] Token 格式兼容：Braille 和 ASCII 互通
- [ ] 并发注册：10 个并发请求无数据竞争
- [ ] 重复注册防护：相同内容返回 409

---

#### 8.2 性能测试
**优先级**: P1  
**预计时间**: 4 小时

**测试目标**:
- [ ] 注册 API p99 <200ms（1000 次请求）
- [ ] 验证 API p99 <100ms
- [ ] 数据库可存储 10K 内容记录

---

#### 8.3 API 文档
**优先级**: P0  
**预计时间**: 4 小时

**文件**: `docs/api/PHASE_1_API.md`

包含所有 API 的：
- 端点路径
- 请求/响应示例
- 错误码说明
- cURL 示例

---

## 时间线总览

```
Week 1: 项目初始化 + 数据库设计
├── Day 1-2: Next.js 项目、依赖安装、环境配置
├── Day 3-5: 数据库 Schema、迁移

Week 2: 核心算法实现
├── Day 1-3: Canonicalization + Fingerprinting
├── Day 4-5: 签名系统
└── Week 3 Day 1: 签名系统（续）

Week 3: Token 系统 + API
├── Day 2-4: Token 生成、编码、验证
├── Day 5: 注册 API
└── Week 4 Day 1-3: 验证 API、内容验证 API

Week 4-5: 前端页面
├── Week 4 Day 4-5: Token 验证页面
└── Week 5: 证书页面 + 样式优化

Week 6: 测试与文档
├── Day 1-3: 集成测试、性能测试
├── Day 4-5: API 文档、README 更新
```

---

## 验收清单

### 功能验收
- [ ] 用户可通过 API 注册 1000 字文章（<200ms）
- [ ] 用户可通过 Braille Token 验证内容
- [ ] 用户可通过 ASCII Token 验证内容
- [ ] 验证页面正确展示内容和签名信息
- [ ] 重复内容注册返回 409 错误

### 技术验收
- [ ] 所有 API 遵循 v3.1 规范（`/api/v1/` 前缀）
- [ ] 数据库 Schema 符合设计文档
- [ ] Canonicalization 通过幂等性测试
- [ ] Ed25519 签名验证成功率 100%
- [ ] Token 唯一性：10K 次生成无碰撞

### 性能验收
- [ ] 注册 API p99 <200ms
- [ ] 验证 API p99 <100ms
- [ ] 数据库支持 10K+ 记录

### 文档验收
- [ ] API 文档包含所有端点
- [ ] README 更新使用说明
- [ ] 数据库迁移文档完整

---

## 风险与应对

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **Braille 编码浏览器兼容性** | Token 显示异常 | 中 | 添加 ASCII 后备，浏览器检测 |
| **PostgreSQL 连接池耗尽** | API 超时 | 低 | 配置连接池上限，监控连接数 |
| **Token 碰撞** | 验证错误 | 极低 | 128-bit 熵足够，添加碰撞检测 |
| **规范化规则不完善** | 相同内容不同 ID | 中 | 充分测试，版本化规则 |

---

## 下一阶段预告

**Phase 2: 检测管道（6-8 天）**
- Stage 1: Verbatim (SHA-256)
- Stage 2: Lexical (MinHash + LSH)
- Stage 3: NearDuplicate (Winnowing)
- Stage 4: Semantic (BGE-M3 + HNSW)

---

*文档版本: 1.0.0*  
*创建日期: 2025-02-01*  
*预计完成: 2025-03-15*
