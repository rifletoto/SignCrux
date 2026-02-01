# 内容确权与防抄袭溯源系统 - 完整项目规格 v3.0

## 文档信息

| 属性 | 值 |
|------|-----|
| 版本 | 3.0.0 |
| 最后更新 | 2025-02-01 |
| 项目类型 | 开源项目 |
| 许可证 | MIT |
| 基于 | v2.0 + 顾问反馈升级 |

---

## 版本更新摘要 (v2 → v3)

| 模块 | v2 设计 | v3 升级 | 收益 |
|------|---------|---------|------|
| Detection Pipeline | 术语模糊，Embedding 在 Phase 5 | 四阶段明确，Embedding 前移 Phase 2 | AI 改写检测能力前置 |
| ANN 索引 | IVFFlat | HNSW (m=16, ef=64) | 低延迟 + 高召回 |
| Token-SVG | 分离展示 | Bundle 一键集成 | UX 闭环，传播力↑ |
| 基准测试 | 无明确指标 | PlagBench recall@100 >90% | 可量化质量保证 |
| Phase 规划 | 6 阶段 | 5 阶段精简 | 更快 MVP |

---

## 项目概述

### 项目名称
**Content Authentication & Provenance System (CAPS)**
内容确权与溯源系统

### 核心目标
1. **防抄袭溯源**：检测内容被搬运、改写、AI 重写的情况，精确定位抄袭片段
2. **高价值 UGC 确权**：为原创内容提供可验证的所有权证明
3. **可视化签名**：Token + SVG Bundle 一键确权，增强作者品牌识别

### 差异化优势（AI 时代核心竞争力）

```
┌─────────────────────────────────────────────────────────────────┐
│                    CAPS vs 现有方案对比                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  传统抄袭检测（Turnitin 等）        CAPS v3                      │
│  ─────────────────────────         ──────────                   │
│  • 仅文本相似度                    • 四阶段检测（含语义）         │
│  • 后台审核报告                    • 发布时即检即确权            │
│  • 无确权能力                      • Token + 签名 + 时间证明     │
│  • 无可视化标识                    • SVG Bundle 品牌化展示       │
│                                                                 │
│  区块链存证（蚂蚁链等）            CAPS v3                       │
│  ─────────────────────             ──────────                   │
│  • 只做存证，不检测                • 检测 + 确权 + 展示 一体     │
│  • B2B，用户无感知                 • C 端可见，可传播            │
│  • 无 AI 改写识别                  • Embedding 语义检测          │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

---

## 系统架构 v3

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              CAPS 系统架构 v3.0                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 5: 展示层 (Presentation)                      │ │
│  │  ┌──────────────────────────────────────────────────────────────────┐ │ │
│  │  │                    Token-SVG Bundle (一键集成)                    │ │ │
│  │  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐ │ │ │
│  │  │  │ Braille码  │  │ ASCII码   │  │ 静态SVG    │  │ 动态SVG    │ │ │ │
│  │  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘ │ │ │
│  │  │                         ↓                                        │ │ │
│  │  │              GET /api/signature/bundle/:token                    │ │ │
│  │  └──────────────────────────────────────────────────────────────────┘ │ │
│  │                                                                       │ │
│  │  ┌────────────────┐  ┌────────────────┐                              │ │
│  │  │ 验证页面       │  │ 证书下载       │                              │ │
│  │  └────────────────┘  └────────────────┘                              │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 4: 索引层 (Token Index)                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐  │ │
│  │  │  Token 映射：CSPRNG 128-bit Token ←→ Evidence Chain              │  │ │
│  │  │  编码：Braille (品牌化) + Base32 (通用备胎)                       │  │ │
│  │  │  存储：token_hash (SHA256) → content_id, author_id, assertion    │  │ │
│  │  └─────────────────────────────────────────────────────────────────┘  │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 3: 检测层 (Detection) ⭐ v3 重构              │ │
│  │                                                                       │ │
│  │  ┌─────────────────────────────────────────────────────────────────┐ │ │
│  │  │              四阶段检测管道 (Detection Pipeline)                  │ │ │
│  │  │                                                                   │ │ │
│  │  │  Stage 1        Stage 2        Stage 3        Stage 4            │ │ │
│  │  │  ┌─────────┐   ┌─────────┐   ┌─────────┐   ┌─────────┐          │ │ │
│  │  │  │Verbatim │──►│Lexical  │──►│NearDup  │──►│Semantic │          │ │ │
│  │  │  │精确匹配 │   │轻改乱序 │   │局部搬运 │   │AI重写   │          │ │ │
│  │  │  │SHA256   │   │MinHash  │   │Winnowing│   │Embedding│          │ │ │
│  │  │  └─────────┘   └─────────┘   └─────────┘   └─────────┘          │ │ │
│  │  │       │             │             │             │                │ │ │
│  │  │       └─────────────┴─────────────┴─────────────┘                │ │ │
│  │  │                           │                                       │ │ │
│  │  │                    ┌──────▼──────┐                                │ │ │
│  │  │                    │ Alignment   │  (Phase 4)                     │ │ │
│  │  │                    │ 精细证据生成 │                                │ │ │
│  │  │                    └─────────────┘                                │ │ │
│  │  └─────────────────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 2: 确权层 (Authentication)                    │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │ │
│  │  │ 内容指纹    │  │ 发布声明    │  │ 时间证明    │                    │ │
│  │  │ content_id  │  │ assertion   │  │ TSA/Merkle  │                    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    │ │
│  │                           │                                            │ │
│  │                    ┌─────────────┐                                     │ │
│  │                    │ 作者签名    │                                     │ │
│  │                    │ Ed25519     │                                     │ │
│  │                    └─────────────┘                                     │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                      │                                      │
│  ┌───────────────────────────────────────────────────────────────────────┐ │
│  │                    Layer 1: 存储层 (Storage)                           │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐                    │ │
│  │  │ 事件流存储  │  │ 快照证据包  │  │ 内容寻址    │                    │ │
│  │  │(append-only)│  │(抗链接腐烂) │  │ (IPFS)      │                    │ │
│  │  └─────────────┘  └─────────────┘  └─────────────┘                    │ │
│  └───────────────────────────────────────────────────────────────────────┘ │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 核心设计原则

### 原则一：四阶段检测管道

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Detection Pipeline v3                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  阶段          算法              检测目标              典型场景             │
│  ────          ────              ────────              ────────             │
│  Verbatim      SHA256/BLAKE3    完全相同              复制粘贴             │
│  Lexical       MinHash+LSH      轻改/顺序乱           换几个字、调段落     │
│  NearDuplicate Winnowing        局部搬运              拼接、部分引用       │
│  Semantic      Embedding+HNSW   语义相似              AI 改写、翻译        │
│                                                                             │
│  【关键变化】Semantic 从 Phase 5 前移到 Phase 2，应对 AI 改写抄袭          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 原则二：Token-SVG Bundle 一体化

```
┌─────────────────────────────────────────────────────────────────┐
│                    Token-SVG Bundle 设计                         │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  v2 问题：Token 和 SVG 分离展示，用户需多次操作                  │
│                                                                 │
│  v3 方案：Token 作为锚点，一键获取完整 Bundle                    │
│                                                                 │
│  GET /api/signature/bundle/{ascii_token}                        │
│       │                                                         │
│       ├── Token 验证 → content_id                               │
│       │                                                         │
│       ├── 生成 Static SVG（永久签名）                           │
│       │                                                         │
│       ├── 生成 Dynamic SVG（今日徽章）                          │
│       │                                                         │
│       └── 返回 HTML Snippet（可直接嵌入）                       │
│                                                                 │
│  用户体验：一个 Token → 完整确权展示 → 可传播                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

### 原则三：证据层与展示层分离

```
展示层（用户可见）              证据层（法律/技术证明）
─────────────────              ──────────────────────
• SVG Bundle                   • content_id (SHA-256)
• Braille/ASCII Token          • author_signature (Ed25519)
• 验证页面                     • timestamp_proof (RFC3161)
                               • merkle_proof

【关键】展示层不承担证明责任，只是证据的"可视化入口"
```

---

## 模块一：内容指纹系统 (Content Fingerprinting)

### 1.1 规范化处理 (Canonicalization)

```typescript
interface CanonicalizationConfig {
  version: "1.0.0";                    // 永不修改已发布版本
  
  rules: {
    unicode: "NFC";                    // Unicode 规范化
    width: "half";                     // 全角→半角
    whitespace: "normalize";           // 多空格→单空格
    structure: "preserve";             // 保留 Markdown 结构
    punctuation: "preserve";           // 保留标点（结构信号）
  };
}

// 【重要】规范化规则版本一旦发布，永不修改
// 新规则必须使用新版本号
```

### 1.2 四阶段指纹配置 (DetectionConfig)

```typescript
interface DetectionConfig {
  // Stage 1: Verbatim（完全匹配）
  verbatim: {
    algorithm: "sha256" | "blake3";
    enabled: true;
  };
  
  // Stage 2: Lexical（轻改/乱序）
  lexical: {
    minhashLSH: {
      enabled: true;
      numPermutations: 128;
      bands: 16;
      rowsPerBand: 8;
      jaccardThreshold: 0.8;
      tokenizer: "jieba" | "whitespace";  // 中文/英文
    };
  };
  
  // Stage 3: NearDuplicate（局部搬运）
  nearDuplicate: {
    winnowing: {
      enabled: true;
      kgramSize: {
        zh: 7,                          // 中文字符
        en: 10                          // 英文单词
      };
      windowSize: 4;
      minMatchFingerprints: 3;
    };
  };
  
  // Stage 4: Semantic（AI 重写）⭐ v3 前移
  semantic: {
    embedding: {
      enabled: true;
      model: "bge-m3";                  // 固定模型
      dimension: 1024;                  // 固定维度
      annIndex: "hnsw";                 // HNSW 优于 IVFFlat
      hnswParams: {
        m: 16,                          // 每层连接数
        efConstruction: 64,             // 构建时搜索宽度
        efSearch: 50                    // 查询时搜索宽度（可调）
      };
      cosineThreshold: 0.85;
      topK: 100;
    };
  };
  
  // Phase 4: Alignment（精细证据）
  alignment: {
    enabled: true;
    lcsRatio: 0.3;
    structureWeight: 0.2;
    semanticWeight: 0.5;
    lexicalWeight: 0.3;
    minSegmentLength: 50;              // 最小对齐片段（字符）
  };
}
```

### 1.3 分段指纹

```
内容多粒度指纹:
├── 全文级: 所有指纹（召回用）
├── 段落级: 每段独立指纹（定位用）
├── 句子级: 关键句指纹（精细对齐用）
└── 代码块: 代码单独哈希（教程价值核心）
```

---

## 模块二：确权证据系统 (Authentication Evidence)

### 2.1 内容指纹 (Content ID)

```typescript
interface ContentFingerprint {
  // 核心标识（永不变）
  content_id: string;                    // SHA256(canonical_content)
  canonicalization_version: string;      // "1.0.0"
  
  // 可选包含（影响 content_id）
  title_hash?: string;
  structure_hash?: string;
  media_hashes?: string[];
  
  // 版本链
  prev_content_id?: string;
  version_number?: number;
  
  // 【不纳入 content_id】
  // - URL, 时间戳, author_id（在 assertion 层）
}
```

### 2.2 发布声明 (Assertion)

```typescript
interface PublishAssertion {
  assertion_id: string;
  content_id: string;
  author_id: string;
  
  // URL（规范化）
  canonical_url?: string;
  observed_urls?: string[];
  
  // 时间
  published_at?: string;
  observed_at: string;
  
  // 签名
  author_signature: string;
  author_pubkey: string;
  signature_algorithm: "ed25519";
  signature_level: "platform_managed" | "user_controlled" | "hardware_key";
}
```

### 2.3 时间证明 (Timestamp Proof)

```typescript
interface TimestampProof {
  proof_type: "rfc3161" | "merkle_anchor" | "blockchain";
  
  // RFC3161
  tsa_token?: string;
  tsa_authority?: string;
  
  // Merkle
  merkle_root?: string;
  merkle_proof?: string[];
  anchor_tx_id?: string;
  
  verification_url?: string;
}
```

---

## 模块三：认证码系统 (Authentication Token)

### 3.1 设计原则

```
✅ Token 是"引用码"，不是"数据载体"
   • 不含可解析语义（author_id, timestamp 等）
   • 语义由后端通过 token_hash 查询

✅ 双编码冗余
   • Braille: 品牌化展示 (⣏⡳⢕⣫⠷⡎⢽⣳⠞⡧⢻⣓⠾⡜⢯⣚)
   • ASCII:  通用备胎 (S7K3-F2Q9-DXMN-4TPW)

✅ Token 驱动 SVG Bundle
   • 一个 Token → 完整确权展示

❌ 不要把语义塞进 Token
❌ 不要默认隐藏 Token
```

### 3.2 Token 生成

```typescript
import { randomBytes } from 'crypto';
import { sha256 } from '@noble/hashes/sha256';

interface AuthToken {
  token_raw: Uint8Array;         // 128 bits CSPRNG
  token_hash: string;            // SHA256(token_raw)，存储用
  braille: string;               // Braille 编码
  ascii: string;                 // Base32 编码
  verify_url: string;
  bundle_url: string;            // ⭐ v3 新增
}

function generateAuthToken(contentId: string): AuthToken {
  const token_raw = randomBytes(16);
  const token_hash = Buffer.from(sha256(token_raw)).toString('hex');
  const braille = bytesToBraille(token_raw);
  const ascii = bytesToBase32(token_raw);
  
  return {
    token_raw,
    token_hash,
    braille,
    ascii,
    verify_url: `https://caps.example.com/verify/${ascii.replace(/-/g, '')}`,
    bundle_url: `https://caps.example.com/api/signature/bundle/${ascii.replace(/-/g, '')}`
  };
}
```

### 3.3 Braille 编码

```typescript
// U+2800 - U+28FF: 256 个字符 = 1 byte/char
function bytesToBraille(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map(byte => String.fromCodePoint(0x2800 + byte))
    .join('');
}

function brailleToBytes(braille: string): Uint8Array {
  return new Uint8Array(
    [...braille].map(char => char.codePointAt(0)! - 0x2800)
  );
}
```

### 3.4 Base32 编码

```typescript
const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

function bytesToBase32(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0, bitsLeft = 0;
  
  for (const byte of bytes) {
    buffer = (buffer << 8) | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      result += BASE32_ALPHABET[(buffer >> bitsLeft) & 0x1F];
    }
  }
  if (bitsLeft > 0) {
    result += BASE32_ALPHABET[(buffer << (5 - bitsLeft)) & 0x1F];
  }
  
  return result.match(/.{1,4}/g)?.join('-') || result;
}
```

---

## 模块四：可视化签名系统 (Visual Signature)

### 4.1 设计原则

```
静态签名（确权用）           动态徽章（品牌用）
────────────────            ────────────────
• 永不变                    • 每日变化
• 用于证书、法律证据        • 用于社交展示
• 输入: content_hash +      • 输入: + day_index
        author_style_id +
        algo_version

【v3 关键】通过 Bundle API 一键获取两者
```

### 4.2 参数派生（HKDF）

```typescript
import { hkdf } from '@noble/hashes/hkdf';
import { sha256 } from '@noble/hashes/sha256';

interface SignatureParams {
  identity: IdentityParams;      // 由 content_hash 控制
  style: StyleParams;            // 由 author_style_id 控制
  dynamic?: DynamicParams;       // 由 day_index 控制（仅动态徽章）
}

function deriveParams(
  contentHash: Uint8Array,
  authorStyleId: Uint8Array,
  algoVersion: string = "1.0.0",
  dayIndex?: number
): SignatureParams {
  // 主种子（不含 dayIndex）
  const masterSeed = sha256(new Uint8Array([
    ...contentHash,
    ...authorStyleId,
    ...new TextEncoder().encode(algoVersion)
  ]));
  
  const identity = {
    symmetry_axes: deriveInt(masterSeed, "symmetry", 3, 8),
    foreground_hue: deriveFloat(masterSeed, "fg_hue", 0, 360),
    // ... 其他 10 个参数
  };
  
  const style = {
    curve_ratio: normalizeByteToRange(authorStyleId[0], 0.2, 0.8),
    // ... 其他 10 个参数
  };
  
  let dynamic = undefined;
  if (dayIndex !== undefined) {
    const timeSeed = sha256(new Uint8Array([
      ...masterSeed, ...intToBytes(dayIndex)
    ]));
    dynamic = {
      hue_shift: deriveFloat(timeSeed, "hue", -10, 10),
      // ... 其他 6 个参数
    };
  }
  
  return { identity, style, dynamic };
}
```

### 4.3 SVG 图层结构

```
┌─────────────────────────────────────────┐
│  Layer 3: 装饰层（仅动态徽章）          │
│  Layer 2: 主结构层（content 控制）      │
│  Layer 1: 背景层（渐变/纹理）           │
│  Layer 0: 画布 (viewBox="0 0 64 64")   │
└─────────────────────────────────────────┘
```

---

## 模块五：Token-SVG Bundle 系统 ⭐ v3 新增

### 5.1 Bundle API

```typescript
// GET /api/signature/bundle/:token
// token 可以是 ASCII 格式（去掉分隔符）

interface BundleResponse {
  success: boolean;
  
  // Token 信息
  token: {
    braille: string;
    ascii: string;
    verify_url: string;
  };
  
  // 内容信息
  content: {
    content_id: string;
    title?: string;
    author: {
      id: string;
      display_name?: string;
    };
    created_at: string;
  };
  
  // SVG 签名
  signatures: {
    static_svg: string;              // Base64 或 Data URL
    static_svg_url: string;
    dynamic_svg: string;
    dynamic_svg_url: string;
    dynamic_date: string;            // 今日日期
  };
  
  // 可嵌入 HTML
  html_snippet: string;
  
  // 证书链接
  certificate_url: string;
}
```

### 5.2 Bundle HTML Snippet

```html
<div class="caps-bundle" data-content-id="{content_id}">
  <!-- Token 展示 -->
  <div class="caps-token">
    <span class="caps-braille" title="认证码">{braille}</span>
    <span class="caps-ascii">{ascii}</span>
  </div>
  
  <!-- SVG 签名 -->
  <div class="caps-signatures">
    <img class="caps-static" src="{static_svg_url}" alt="永久签名">
    <img class="caps-dynamic" src="{dynamic_svg_url}" alt="今日徽章">
  </div>
  
  <!-- 验证链接 -->
  <a class="caps-verify" href="{verify_url}" target="_blank">
    验证此内容 →
  </a>
</div>
```

### 5.3 Bundle CSS

```css
.caps-bundle {
  display: grid;
  grid-template-areas: 
    "token static"
    "token dynamic"
    "verify verify";
  gap: 8px;
  padding: 12px;
  background: linear-gradient(135deg, #f8f9fa, #f0f1f2);
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  max-width: 320px;
}

.caps-token {
  grid-area: token;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.caps-braille {
  font-family: "Segoe UI Symbol", "Noto Sans Symbols", monospace;
  font-size: 1.1em;
  color: #333;
  cursor: pointer;
  user-select: all;
}

.caps-braille:hover { color: #0066cc; }

.caps-ascii {
  font-family: "SF Mono", "Consolas", monospace;
  font-size: 0.75em;
  color: #888;
  margin-top: 4px;
}

.caps-static { grid-area: static; width: 48px; height: 48px; }
.caps-dynamic { grid-area: dynamic; width: 48px; height: 48px; opacity: 0.8; }

.caps-verify {
  grid-area: verify;
  text-align: center;
  font-size: 0.85em;
  color: #0066cc;
}
```

---

## 模块六：存储设计

### 6.1 数据库表结构

```sql
-- ============================================================
-- 核心表
-- ============================================================

-- 内容注册表
CREATE TABLE content_registry (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id CHAR(64) NOT NULL UNIQUE,
    canonicalization_version VARCHAR(20) NOT NULL DEFAULT '1.0.0',
    
    -- 预览
    title VARCHAR(500),
    content_preview VARCHAR(1000),
    content_length INT,
    
    -- 多阶段指纹
    -- Stage 1: Verbatim（content_id 即是）
    -- Stage 2: Lexical
    minhash_signature BYTEA,
    -- Stage 3: NearDuplicate
    winnowing_fingerprints JSONB,
    -- Stage 4: Semantic
    embedding_vector vector(1024),
    
    -- 版本链
    prev_content_id CHAR(64),
    version_number INT DEFAULT 1,
    
    -- 元数据
    content_type VARCHAR(50),
    locale VARCHAR(10),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ⭐ v3: HNSW 索引（优于 IVFFlat）
CREATE INDEX CONCURRENTLY idx_content_embedding_hnsw 
ON content_registry USING hnsw (embedding_vector vector_cosine_ops) 
WITH (m = 16, ef_construction = 64);

-- Token 映射表
CREATE TABLE auth_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    token_hash CHAR(64) NOT NULL UNIQUE,
    token_version VARCHAR(10) DEFAULT '1.0',
    
    -- 编码缓存
    braille_display VARCHAR(32),
    ascii_display VARCHAR(40),
    
    -- 映射
    content_id CHAR(64) NOT NULL REFERENCES content_registry(content_id),
    author_id UUID NOT NULL,
    assertion_id CHAR(64),
    
    -- 状态
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    
    -- 统计
    verify_count INT DEFAULT 0,
    last_verified_at TIMESTAMPTZ
);

CREATE INDEX idx_tokens_content ON auth_tokens(content_id);
CREATE INDEX idx_tokens_status ON auth_tokens(status) WHERE status = 'active';

-- 发布声明表
CREATE TABLE assertions (
    assertion_id CHAR(64) PRIMARY KEY,
    content_id CHAR(64) NOT NULL REFERENCES content_registry(content_id),
    author_id UUID NOT NULL,
    
    canonical_url TEXT,
    observed_urls JSONB,
    published_at TIMESTAMPTZ,
    observed_at TIMESTAMPTZ NOT NULL,
    
    author_signature BYTEA NOT NULL,
    author_pubkey BYTEA NOT NULL,
    signature_level VARCHAR(30),
    
    timestamp_proof JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 事件流表（append-only）
CREATE TABLE content_events (
    event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    content_id CHAR(64) NOT NULL,
    event_type VARCHAR(30) NOT NULL,
    event_data JSONB NOT NULL,
    prev_event_hash CHAR(64),
    event_hash CHAR(64) NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 相似检测结果表
CREATE TABLE similarity_detections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    source_content_id CHAR(64) NOT NULL,
    target_content_id CHAR(64) NOT NULL,
    
    -- v3: 明确 match_type
    match_type VARCHAR(30) NOT NULL,  -- verbatim/lexical/nearDuplicate/semantic
    similarity_score FLOAT,
    
    -- 证据
    matched_segments JSONB,
    minimal_evidence BOOLEAN DEFAULT false,  -- Phase 2: 简化证据
    
    created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_detections_source ON similarity_detections(source_content_id);
CREATE INDEX idx_detections_score ON similarity_detections(similarity_score DESC);
```

### 6.2 HNSW 调参指南

```sql
-- 构建索引时参数
-- m: 每层连接数，越大召回越高、内存越多
-- ef_construction: 构建时搜索宽度，越大构建越慢但质量越高

CREATE INDEX ... WITH (m = 16, ef_construction = 64);

-- 查询时参数
-- ef_search: 查询时搜索宽度，越大召回越高、延迟越高

SET hnsw.ef_search = 50;  -- 默认

-- 调参建议（根据基准测试调整）
-- 高召回场景: ef_search = 100
-- 低延迟场景: ef_search = 20
-- 平衡场景:   ef_search = 50
```

---

## 模块七：API 设计

### 7.1 内容注册

```typescript
// POST /api/v1/content/register
interface RegisterRequest {
  content: string;
  title?: string;
  content_type: ContentType;
  canonical_url?: string;
  signature_method: "platform" | "user_provided";
  user_signature?: string;
  user_pubkey?: string;
}

interface RegisterResponse {
  success: boolean;
  
  content_id: string;
  assertion_id: string;
  
  // 指纹信息
  fingerprints: {
    verbatim: string;                // SHA256
    lexical_generated: boolean;      // MinHash
    near_duplicate_count: number;    // Winnowing 指纹数
    semantic_generated: boolean;     // Embedding
  };
  
  // 认证码
  auth_token: {
    braille: string;
    ascii: string;
    verify_url: string;
    bundle_url: string;              // ⭐ v3 新增
  };
  
  // 可视化签名
  visual_signature: {
    static_svg_url: string;
    dynamic_badge_url: string;
    bundle_url: string;              // ⭐ v3 新增
  };
  
  // 相似检测（如启用）
  similarity_check?: {
    is_duplicate: boolean;
    matches: SimilarityMatch[];
    recommendation: "allow" | "review" | "reject";
  };
  
  certificate_url: string;
}
```

### 7.2 相似检测

```typescript
// POST /api/v1/content/check-similarity
interface CheckSimilarityRequest {
  content: string;
  check_types?: ("verbatim" | "lexical" | "nearDuplicate" | "semantic")[];
  threshold?: number;
  max_results?: number;
  include_evidence?: boolean;        // Phase 4: 完整证据
}

interface CheckSimilarityResponse {
  is_duplicate: boolean;
  highest_similarity: number;
  
  matches: Array<{
    content_id: string;
    match_type: "verbatim" | "lexical" | "nearDuplicate" | "semantic";
    similarity_score: number;
    
    original: {
      title?: string;
      author_id: string;
      first_published: string;
      url?: string;
    };
    
    // Phase 2: 简化证据
    minimal_evidence: boolean;
    overlap_preview?: string;
    
    // Phase 4: 完整证据
    matched_segments?: Array<{
      source_pos: [number, number];
      target_pos: [number, number];
      source_text: string;
      target_text: string;
      similarity: number;
    }>;
  }>;
  
  recommendation: "allow" | "review" | "reject";
  recommendation_reason?: string;
}
```

### 7.3 Token 验证

```typescript
// GET /api/v1/token/verify/:token
interface TokenVerifyResponse {
  is_valid: boolean;
  token_status: "active" | "revoked" | "expired" | "not_found";
  
  content?: {
    content_id: string;
    title?: string;
    author: { id: string; display_name?: string; };
    created_at: string;
    certificate_url: string;
    bundle_url: string;              // ⭐ v3 新增
  };
  
  verification_stats?: {
    total_verifications: number;
    last_verified_at?: string;
  };
}
```

### 7.4 Bundle 获取 ⭐ v3 新增

```typescript
// GET /api/v1/signature/bundle/:token
interface BundleResponse {
  success: boolean;
  
  token: { braille: string; ascii: string; verify_url: string; };
  
  content: {
    content_id: string;
    title?: string;
    author: { id: string; display_name?: string; };
    created_at: string;
  };
  
  signatures: {
    static_svg: string;              // Data URL
    static_svg_url: string;
    dynamic_svg: string;
    dynamic_svg_url: string;
    dynamic_date: string;
  };
  
  html_snippet: string;              // 可直接嵌入的 HTML
  
  certificate_url: string;
}
```

---

## 开发阶段规划 v3

### 总览

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           v3 开发阶段规划                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1          Phase 2          Phase 3          Phase 4          Phase 5│
│  ─────────        ─────────        ─────────        ─────────        ───────│
│  基础确权         检测管道         SVG Bundle       确权增强         精细证据│
│  + Token          全四阶段         一键集成         TSA/Merkle       Alignment│
│                   ⭐ Embedding                                              │
│                   前移                                                      │
│                                                                             │
│  5-6 周           6-8 天           4-5 天           4-5 周           3-4 周 │
│                   (+2天 HNSW)      (+1天 Bundle)                            │
│                                                                             │
│  ──────────────────────────────────────────────────────────────────────────│
│  总计：约 14-18 周（比 v2 的 6 Phase 更紧凑）                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Phase 1: 基础确权 + Token (5-6 周)

**目标**: 核心确权能力 + 认证码系统

**交付物**:
- [ ] 内容规范化 (canonicalization v1.0.0)
- [ ] SHA256 content_id 生成
- [ ] 平台托管签名 (Ed25519)
- [ ] Token 生成 (CSPRNG 128-bit)
- [ ] Braille + ASCII 双编码
- [ ] 基础数据库结构
- [ ] 注册 / 验证 API
- [ ] Token 验证页面

**技术栈**: Next.js 14, TypeScript, PostgreSQL, @noble/hashes, @noble/ed25519

### Phase 2: 检测管道 - 四阶段 (6-8 天) ⭐ 关键升级

**目标**: 完整四阶段检测，Embedding 前移

**交付物**:
- [ ] Stage 1: Verbatim (SHA256)
- [ ] Stage 2: Lexical (MinHash + LSH)
- [ ] Stage 3: NearDuplicate (Winnowing)
- [ ] Stage 4: Semantic (BGE-M3 + HNSW) ⭐
- [ ] /check-similarity API（支持四阶段 + minimal_evidence）
- [ ] pgvector HNSW 索引配置
- [ ] 基准测试：PlagBench recall@100 >90%

**技术栈**: datasketch/自实现, pgvector, BGE-M3 API

**调参重点**:
```sql
-- HNSW 索引
CREATE INDEX ... WITH (m = 16, ef_construction = 64);
SET hnsw.ef_search = 50;  -- 根据测试调整
```

### Phase 3: SVG + Bundle (4-5 天) ⭐ v3 新增

**目标**: Token-SVG Bundle 一键集成

**交付物**:
- [ ] 静态签名生成器
- [ ] 动态徽章生成器
- [ ] HKDF 参数派生
- [ ] SVG 渲染引擎
- [ ] Bundle API (/api/signature/bundle/:token) ⭐
- [ ] HTML Snippet 生成
- [ ] Bundle React 组件

**技术栈**: @noble/hashes (HKDF), D3.js/纯 SVG

### Phase 4: 确权增强 (4-5 周)

**目标**: 时间证明 + 外部验证

**交付物**:
- [ ] RFC3161 TSA 集成
- [ ] Merkle 批量锚定
- [ ] 用户自持签名支持
- [ ] 快照证据包生成
- [ ] 证据导出（ZIP）

**技术栈**: FreeTSA / DigiStamp, 蚂蚁链存证（可选）

### Phase 5: 精细证据 (3-4 周)

**目标**: Alignment 精细对齐 + 完整证据包

**交付物**:
- [ ] LCS 对齐算法
- [ ] 结构对齐
- [ ] 权重融合
- [ ] matched_segments 完整证据
- [ ] 检测报告页面
- [ ] 证据包生成器

---

## 基准测试要求 ⭐ v3 新增

### 必测数据集

| 数据集 | 用途 | 目标指标 |
|--------|------|----------|
| PlagBench | 学术抄袭检测标准 | recall@100 >90% |
| 自建中文集 | Newsletter 改写 | recall@100 >85% |
| 自建翻译集 | 中英翻译抄袭 | recall@100 >80% |

### 性能指标

| 指标 | Phase 2 目标 | Phase 5 目标 |
|------|--------------|--------------|
| 单文检测延迟 | <500ms | <1s |
| HNSW 查询延迟 | <50ms | <50ms |
| 吞吐量 | >100 docs/min | >50 docs/min |

### HNSW 调参测试矩阵

| ef_search | recall@100 | latency (p99) |
|-----------|------------|---------------|
| 20 | ~85% | ~20ms |
| 50 | ~92% | ~40ms |
| 100 | ~96% | ~80ms |

选择 ef_search=50 作为默认，可根据场景调整。

---

## 风险与应对

| 风险 | 影响 | 应对措施 |
|------|------|----------|
| HNSW 召回不足 | 漏检 AI 改写 | 降级 IVFFlat；可选 semhash 离线补充 |
| BGE-M3 成本高 | 运营成本↑ | 备选 text-embedding-3-small |
| Token Bundle UX 不熟 | 用户困惑 | 内部狗食 1 周，迭代 CSS |
| 规范化规则变更 | 旧内容失效 | 严格版本化，永不修改已发布版本 |

---

## 技术栈总结

```
前端:
├── Next.js 14 (App Router)
├── TypeScript
├── Tailwind CSS
├── React Query
└── SVG 渲染

后端:
├── Next.js API Routes / Fastify
├── PostgreSQL 15+ (pgvector, HNSW)
├── Redis (缓存/队列)
└── Bull (任务队列)

算法:
├── @noble/hashes (SHA256, HKDF)
├── @noble/ed25519
├── datasketch / 自实现 (MinHash, LSH)
├── BGE-M3 API (Embedding)
└── jieba (中文分词)

存证:
├── FreeTSA / DigiStamp (RFC3161)
├── 蚂蚁链存证 (可选)
└── IPFS (可选)
```

---

## KPI 指标

### 技术 KPI

| 指标 | 目标 |
|------|------|
| PlagBench recall@100 | >90% |
| 检测延迟 p99 | <500ms |
| Token 验证成功率 | >99.9% |
| SVG 渲染一致性 | 100% |

### 产品 KPI

| 指标 | 目标 |
|------|------|
| Bundle 点击率 | >30% |
| 验证页访问转化 | >50% |
| 用户满意度 | >4.5/5 |

---

## 参考资料

- [PlagBench: Plagiarism Detection Benchmark](https://github.com/plagbench)
- [BGE-M3 Model](https://huggingface.co/BAAI/bge-m3)
- [pgvector HNSW](https://github.com/pgvector/pgvector)
- [Hash Visualization: Random Art](https://people.eecs.berkeley.edu/~dawnsong/papers/randomart.pdf)
- [Winnowing Algorithm](https://theory.stanford.edu/~aiken/publications/papers/sigmod03.pdf)
- [RFC 3161 - Time-Stamp Protocol](https://tools.ietf.org/html/rfc3161)

---

*文档版本: 3.0.0*
*最后更新: 2025-02-01*
*变更说明: 整合顾问反馈，四阶段检测、HNSW 前移、Token-SVG Bundle 集成*
