# CAPS 项目规格 v3.1 - P0 修复补丁

## 文档信息

| 属性 | 值 |
|------|-----|
| 版本 | 3.1.0 |
| 最后更新 | 2025-02-01 |
| 变更类型 | P0 修复补丁 |
| 基于 | v3.0.0 |

---

## P0 修复清单

| ID | 问题 | 状态 |
|----|------|------|
| P0-1 | API 路径与版本号不一致 | ✅ 已修复 |
| P0-2 | Phase/Stage 混用，路线图自相矛盾 | ✅ 已修复 |
| P0-3 | Evidence Chain 未定义 | ✅ 已修复 |

---

# P0-1 修复：API 版本规范

## 1.1 统一 API 路径规范

```
所有 API 统一使用 /api/v1/ 前缀

❌ 废弃格式：
   /api/signature/bundle/:token
   /api/content/register

✅ 标准格式：
   /api/v1/signature/bundle/:token
   /api/v1/content/register
```

## 1.2 完整 API 路径清单

```yaml
# ============================================================
# CAPS API v1 - 完整路径清单
# ============================================================

# 内容管理
POST   /api/v1/content/register          # 注册内容
POST   /api/v1/content/check-similarity  # 相似检测
POST   /api/v1/content/verify            # 内容验证
GET    /api/v1/content/:content_id       # 获取内容信息

# Token 管理
GET    /api/v1/token/verify/:token       # Token 验证
GET    /api/v1/token/revoke/:token       # Token 撤销 (需认证)

# 签名管理
GET    /api/v1/signature/static/:content_id      # 静态 SVG
GET    /api/v1/signature/dynamic/:content_id     # 动态 SVG
GET    /api/v1/signature/bundle/:token           # Bundle 获取
GET    /api/v1/signature/params/:content_id      # 参数查询

# 证据管理
GET    /api/v1/evidence/:content_id              # 证据链查询
GET    /api/v1/evidence/:content_id/manifest     # 证据清单
GET    /api/v1/evidence/:content_id/download     # 证据包下载 (ZIP)
POST   /api/v1/evidence/verify                   # 证据验证

# 证书页面 (非 API，前端路由)
GET    /certificate/:content_id          # 证书页面
GET    /verify/:token                    # 验证页面
```

## 1.3 版本升级策略

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           API 版本升级策略                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  变更类型              处理方式                    示例                      │
│  ─────────            ─────────                   ─────                     │
│  新增可选字段          v1 原地添加                 response 新增字段         │
│  新增端点              v1 原地添加                 /api/v1/new-endpoint      │
│  字段重命名            v2 + v1 兼容期              content_id → contentId    │
│  字段删除              v2 + v1 兼容期              移除 deprecated 字段      │
│  语义变更              v2 + v1 兼容期              相同字段含义改变          │
│                                                                             │
│  兼容期策略：                                                               │
│  • v2 发布后，v1 保持 6 个月可用                                            │
│  • v1 响应添加 Deprecation header                                           │
│  • 文档明确标注 deprecated                                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 1.4 API 响应规范

```typescript
// 所有 API 响应遵循统一结构
interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;           // 机器可读错误码
    message: string;        // 人类可读错误信息
    details?: unknown;      // 可选详情
  };
  meta?: {
    api_version: "v1";
    request_id: string;
    timestamp: string;      // ISO 8601
  };
}

// 示例成功响应
{
  "success": true,
  "data": { ... },
  "meta": {
    "api_version": "v1",
    "request_id": "req_abc123",
    "timestamp": "2025-02-01T12:00:00Z"
  }
}

// 示例错误响应
{
  "success": false,
  "error": {
    "code": "CONTENT_NOT_FOUND",
    "message": "Content with specified ID does not exist"
  },
  "meta": { ... }
}
```

---

# P0-2 修复：Stage vs Phase 明确定义

## 2.1 术语定义

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Stage vs Phase 定义                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage（阶段）= 算法流水线的处理步骤                                         │
│  ─────────────────────────────────────                                      │
│  • 定义：检测管道中的一个处理环节                                            │
│  • 特点：技术实现，永久固定，不随版本变化                                    │
│  • 命名：Stage 1, Stage 2, ... （数字编号）                                 │
│                                                                             │
│  Phase（期）= 项目交付的批次                                                 │
│  ────────────────────────────                                               │
│  • 定义：一个可独立上线的功能集合                                            │
│  • 特点：项目管理，可调整，有明确交付物                                      │
│  • 命名：Phase 1, Phase 2, ... （数字编号）                                 │
│                                                                             │
│  关系：每个 Phase 交付若干 Stage 的特定能力                                  │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.2 Detection Pipeline - Stage 定义（永久固定）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Detection Pipeline Stages (v1)                            │
│                    ─────────────────────────────────                         │
│                    算法流水线定义，一旦发布永不修改                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Stage 1: Verbatim                                                          │
│  ─────────────────                                                          │
│  • 算法: SHA-256 / BLAKE3                                                   │
│  • 输入: 规范化内容                                                         │
│  • 输出: content_id (64 char hex)                                           │
│  • 检测: 完全相同的内容                                                     │
│  • 场景: 复制粘贴                                                           │
│                                                                             │
│  Stage 2: Lexical                                                           │
│  ────────────────                                                           │
│  • 算法: MinHash + LSH                                                      │
│  • 输入: 分词后的 token 序列                                                │
│  • 输出: MinHash 签名 (128 permutations)                                    │
│  • 检测: 轻微修改、顺序打乱                                                 │
│  • 场景: 改几个字、调换段落                                                 │
│                                                                             │
│  Stage 3: NearDuplicate                                                     │
│  ──────────────────────                                                     │
│  • 算法: Winnowing (k-gram fingerprinting)                                  │
│  • 输入: 规范化内容                                                         │
│  • 输出: 指纹集合 + 位置映射                                                │
│  • 检测: 局部搬运、拼接                                                     │
│  • 场景: 部分抄袭、多源拼凑                                                 │
│                                                                             │
│  Stage 4: Semantic                                                          │
│  ────────────────                                                           │
│  • 算法: Transformer Embedding + HNSW ANN                                   │
│  • 输入: 规范化内容                                                         │
│  • 输出: 向量 (1024 dim) + 相似候选列表                                     │
│  • 检测: 语义相似、AI 改写                                                  │
│  • 场景: ChatGPT 改写、翻译抄袭                                             │
│                                                                             │
│  Stage 5: Alignment                                                         │
│  ──────────────────                                                         │
│  • 算法: LCS + 结构对齐 + 权重融合                                          │
│  • 输入: Stage 1-4 的候选对                                                 │
│  • 输出: 精细对齐证据 (matched_segments)                                    │
│  • 功能: 定位具体抄袭片段、生成证据包                                       │
│  • 场景: 法律取证、争议仲裁                                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

【重要】Stage 定义一旦发布（v1），永不修改。
        新增 Stage 使用新编号（Stage 6, 7, ...）。
        重大变更升级为 Pipeline v2。
```

## 2.3 项目交付 - Phase 定义（可调整）

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Phase 交付计划 v3.1                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 1: 基础确权                                                          │
│  ════════════════                                                           │
│  周期: 5-6 周                                                               │
│  目标: 核心确权能力，可独立使用                                              │
│                                                                             │
│  交付物:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 模块              能力                        Stage 依赖             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 规范化            canonicalization v1.0.0     -                      │   │
│  │ 内容指纹          content_id 生成             Stage 1 (完整)         │   │
│  │ 作者签名          Ed25519 平台托管            -                      │   │
│  │ Token 系统        生成 + 验证 + 双编码        -                      │   │
│  │ 数据库            基础表结构                  -                      │   │
│  │ API               /register, /verify          -                      │   │
│  │ 前端              Token 验证页                -                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  验收标准:                                                                  │
│  • 用户可注册内容，获得 content_id + Token                                  │
│  • Token 可验证，返回内容信息                                               │
│  • 签名可验证                                                               │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 2: 检测管道                                                          │
│  ════════════════                                                           │
│  周期: 2-3 周                                                               │
│  目标: 四阶段检测召回能力                                                   │
│                                                                             │
│  交付物:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 模块              能力                        Stage 依赖             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ Verbatim 检测     完全匹配检测                Stage 1 (Phase 1 已有) │   │
│  │ Lexical 检测      MinHash+LSH 召回            Stage 2 (完整)         │   │
│  │ NearDup 检测      Winnowing 召回              Stage 3 (完整)         │   │
│  │ Semantic 检测     Embedding+HNSW 召回         Stage 4 (完整)         │   │
│  │ 简化证据          overlap_preview             Stage 5 (minimal)      │   │
│  │ API               /check-similarity           -                      │   │
│  │ 数据库            HNSW 索引                   -                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  验收标准:                                                                  │
│  • PlagBench recall@100 > 90%                                               │
│  • 检测延迟 p99 < 500ms                                                     │
│  • 返回 match_type + similarity_score + overlap_preview                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 3: 可视化签名                                                        │
│  ══════════════════                                                         │
│  周期: 1-2 周                                                               │
│  目标: SVG 签名 + Token-SVG Bundle                                          │
│                                                                             │
│  交付物:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 模块              能力                        Stage 依赖             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ 参数派生          HKDF 28 参数                -                      │   │
│  │ 静态签名          永久 SVG                    -                      │   │
│  │ 动态徽章          每日 SVG                    -                      │   │
│  │ Bundle            Token → 完整展示            -                      │   │
│  │ API               /signature/*                -                      │   │
│  │ 组件              React Bundle 组件           -                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  验收标准:                                                                  │
│  • 同一 content_id 永远生成相同静态 SVG                                     │
│  • Bundle API 返回完整 HTML snippet                                         │
│  • 动态徽章每日变化但可识别为同一内容                                       │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 4: 确权增强                                                          │
│  ════════════════                                                           │
│  周期: 3-4 周                                                               │
│  目标: 时间证明 + 外部可验证                                                │
│                                                                             │
│  交付物:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 模块              能力                        Stage 依赖             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ RFC3161 TSA       时间戳证明                  -                      │   │
│  │ Merkle 锚定       批量存证                    -                      │   │
│  │ 用户签名          自持密钥支持                -                      │   │
│  │ 证据链            Evidence Manifest           -                      │   │
│  │ 证据导出          ZIP 下载                    -                      │   │
│  │ API               /evidence/*                 -                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  验收标准:                                                                  │
│  • TSA token 可被第三方验证                                                 │
│  • Evidence ZIP 包含完整可验证证据链                                        │
│  • 证据清单 hash 可复现                                                     │
│                                                                             │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Phase 5: 精细证据                                                          │
│  ════════════════                                                           │
│  周期: 2-3 周                                                               │
│  目标: Stage 5 完整实现，法律级证据                                         │
│                                                                             │
│  交付物:                                                                    │
│  ┌─────────────────────────────────────────────────────────────────────┐   │
│  │ 模块              能力                        Stage 依赖             │   │
│  ├─────────────────────────────────────────────────────────────────────┤   │
│  │ LCS 对齐          最长公共子序列              Stage 5 (完整)         │   │
│  │ 结构对齐          Markdown AST 对齐           Stage 5 (完整)         │   │
│  │ 权重融合          多信号综合评分              Stage 5 (完整)         │   │
│  │ 证据包            matched_segments 完整       Stage 5 (完整)         │   │
│  │ 报告页            可视化对比报告              -                      │   │
│  └─────────────────────────────────────────────────────────────────────┘   │
│                                                                             │
│  验收标准:                                                                  │
│  • matched_segments 包含精确字符位置                                        │
│  • 对比报告可视化展示抄袭片段                                               │
│  • 证据包可用于法律取证                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 2.4 Stage vs Phase 对照表

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Stage 在各 Phase 的交付状态                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│              │ Phase 1 │ Phase 2 │ Phase 3 │ Phase 4 │ Phase 5 │           │
│  ────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤           │
│  Stage 1     │ ████████│         │         │         │         │ 完整      │
│  (Verbatim)  │         │         │         │         │         │           │
│  ────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤           │
│  Stage 2     │         │ ████████│         │         │         │ 完整      │
│  (Lexical)   │         │         │         │         │         │           │
│  ────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤           │
│  Stage 3     │         │ ████████│         │         │         │ 完整      │
│  (NearDup)   │         │         │         │         │         │           │
│  ────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤           │
│  Stage 4     │         │ ████████│         │         │         │ 完整      │
│  (Semantic)  │         │         │         │         │         │           │
│  ────────────┼─────────┼─────────┼─────────┼─────────┼─────────┤           │
│  Stage 5     │         │ ░░░░    │         │         │ ████████│ Phase 2:  │
│  (Alignment) │         │ minimal │         │         │         │ minimal   │
│              │         │         │         │         │         │ Phase 5:  │
│              │         │         │         │         │         │ 完整      │
│                                                                             │
│  图例: ████ = 完整交付   ░░░░ = 部分交付 (minimal)                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

# P0-3 修复：Evidence Chain 完整定义

## 3.1 Evidence Chain 概念模型

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         Evidence Chain 结构                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  Token ──────► Evidence Manifest ──────► Evidence Components               │
│                     │                                                       │
│                     ├── content_evidence    (内容证据)                      │
│                     ├── authorship_evidence (作者证据)                      │
│                     ├── timestamp_evidence  (时间证据)                      │
│                     ├── fingerprint_evidence(指纹证据)                      │
│                     └── manifest_hash       (清单哈希)                      │
│                                                                             │
│  Hash Chain:                                                                │
│  content_hash ─┬─► content_evidence_hash                                   │
│                │                           ─┬─► manifest_hash               │
│  author_sig ───┼─► authorship_evidence_hash │                              │
│                │                           ─┤                               │
│  tsa_token ────┼─► timestamp_evidence_hash  │                              │
│                │                           ─┤                               │
│  fingerprints ─┴─► fingerprint_evidence_hash┘                              │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 3.2 Canonical Evidence Manifest 结构

```typescript
/**
 * Evidence Manifest v1.0
 * 
 * 【重要】此结构一旦发布，v1 版本永不修改。
 * 新增字段必须是 optional，或升级到 v2。
 */

interface EvidenceManifest {
  // ============================================================
  // 元数据
  // ============================================================
  manifest_version: "1.0.0";
  manifest_id: string;              // UUID
  generated_at: string;             // ISO 8601 UTC
  generator: {
    name: "CAPS";
    version: string;                // e.g., "3.1.0"
  };
  
  // ============================================================
  // 内容证据 (Content Evidence)
  // ============================================================
  content_evidence: {
    content_id: string;             // SHA256(canonical_content), 64 char hex
    canonicalization: {
      version: string;              // "1.0.0"
      algorithm: "caps-canonical-v1";
    };
    
    // 内容快照
    content_snapshot: {
      original_text_hash: string;   // SHA256(original_text)
      canonical_text_hash: string;  // SHA256(canonical_text)
      structure_hash?: string;      // SHA256(markdown_ast_json)
      title_hash?: string;          // SHA256(title)
      
      // 内容元数据
      content_length: number;       // 字符数
      word_count: number;           // 词数
      locale?: string;              // "zh-CN" | "en-US"
    };
    
    // 媒体引用
    media_references?: Array<{
      media_id: string;             // 内部 ID
      media_hash: string;           // SHA256(media_bytes)
      media_type: string;           // MIME type
      filename?: string;
    }>;
    
    // 版本链
    version_chain?: {
      prev_content_id?: string;     // 前一版本
      version_number: number;
    };
    
    // 本段哈希
    evidence_hash: string;          // SHA256(canonical_json(content_evidence))
  };
  
  // ============================================================
  // 作者证据 (Authorship Evidence)
  // ============================================================
  authorship_evidence: {
    author_id: string;              // 平台内作者 ID
    
    // 签名
    signature: {
      algorithm: "ed25519";
      level: "platform_managed" | "user_controlled" | "hardware_key";
      
      // 签名数据
      signed_payload_hash: string;  // SHA256(assertion_id)
      signature_value: string;      // Base64 编码的签名
      public_key: string;           // Base64 编码的公钥
      
      // 签名时间
      signed_at: string;            // ISO 8601 UTC
    };
    
    // 身份验证（可选）
    identity_verification?: {
      type: "email" | "phone" | "kyc" | "domain";
      verified_at: string;
      verifier?: string;
      verification_hash?: string;   // SHA256(verification_evidence)
    };
    
    // 本段哈希
    evidence_hash: string;          // SHA256(canonical_json(authorship_evidence))
  };
  
  // ============================================================
  // 时间证据 (Timestamp Evidence)
  // ============================================================
  timestamp_evidence: {
    // 首次观测时间（系统记录）
    first_observed: {
      timestamp: string;            // ISO 8601 UTC
      source: "system";
    };
    
    // 发布时间（作者声明）
    published_at?: {
      timestamp: string;
      source: "author_declared";
    };
    
    // RFC3161 时间戳
    rfc3161_proof?: {
      tsa_authority: string;        // TSA 机构 URL
      tsa_policy_oid?: string;
      timestamp: string;            // TSA 返回的时间
      token_hash: string;           // SHA256(tsa_token)
      token_base64: string;         // Base64 编码的 TSA token
      verification_url?: string;
    };
    
    // Merkle 锚定
    merkle_anchor?: {
      merkle_root: string;
      merkle_proof: string[];       // 证明路径
      leaf_index: number;
      anchor_timestamp: string;
      anchor_type: "blockchain" | "notary";
      anchor_tx_id?: string;        // 区块链交易 ID
      anchor_chain?: string;        // "ethereum" | "antchain" | ...
      verification_url?: string;
    };
    
    // 本段哈希
    evidence_hash: string;          // SHA256(canonical_json(timestamp_evidence))
  };
  
  // ============================================================
  // 指纹证据 (Fingerprint Evidence)
  // ============================================================
  fingerprint_evidence: {
    pipeline_version: "1.0";        // Detection Pipeline 版本
    
    stages: {
      // Stage 1
      verbatim: {
        algorithm: "sha256";
        hash: string;               // = content_id
      };
      
      // Stage 2
      lexical: {
        algorithm: "minhash-lsh";
        params: {
          num_permutations: number;
          bands: number;
          rows_per_band: number;
        };
        signature_hash: string;     // SHA256(minhash_signature)
      };
      
      // Stage 3
      near_duplicate: {
        algorithm: "winnowing";
        params: {
          kgram_size: number;
          window_size: number;
        };
        fingerprints_hash: string;  // SHA256(winnowing_fingerprints_json)
        fingerprint_count: number;
      };
      
      // Stage 4
      semantic: {
        algorithm: "transformer-embedding";
        model: string;              // "bge-m3"
        dimension: number;          // 1024
        embedding_hash: string;     // SHA256(embedding_bytes)
      };
    };
    
    // 本段哈希
    evidence_hash: string;          // SHA256(canonical_json(fingerprint_evidence))
  };
  
  // ============================================================
  // Token 引用
  // ============================================================
  token_reference: {
    token_hash: string;             // SHA256(token_raw)
    braille_display: string;
    ascii_display: string;
    verify_url: string;
    created_at: string;
  };
  
  // ============================================================
  // 清单哈希（整体完整性）
  // ============================================================
  manifest_hash: string;            // SHA256(canonical_json(manifest_without_manifest_hash))
}
```

## 3.3 Canonical JSON 序列化规则

```typescript
/**
 * Canonical JSON 序列化规则
 * 
 * 目的：确保相同数据永远产生相同的 JSON 字符串，从而产生相同的哈希。
 */

interface CanonicalJsonRules {
  // 1. 键排序：所有对象的键按 Unicode 码点升序排列
  key_order: "unicode_ascending";
  
  // 2. 空白：无空格、无换行
  whitespace: "none";
  
  // 3. 数字：不使用科学记数法，整数无小数点
  numbers: "no_exponent_no_trailing_decimal";
  
  // 4. 字符串：使用双引号，必要时转义
  strings: "double_quotes_with_escaping";
  
  // 5. Unicode：非 ASCII 字符直接输出（不转义为 \uXXXX）
  unicode: "direct_output";
  
  // 6. null/undefined：null 保留，undefined 省略该键
  nulls: "null_preserved_undefined_omitted";
}

// 实现示例 (TypeScript)
function canonicalJsonStringify(obj: unknown): string {
  return JSON.stringify(obj, (key, value) => {
    if (value === undefined) return undefined;  // 省略
    if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
      // 对象键排序
      return Object.keys(value)
        .sort()
        .reduce((sorted, k) => {
          sorted[k] = value[k];
          return sorted;
        }, {} as Record<string, unknown>);
    }
    return value;
  });
  // 注意：JSON.stringify 默认无空格
}

// 计算 Evidence Hash
function computeEvidenceHash(evidence: unknown): string {
  const canonical = canonicalJsonStringify(evidence);
  return sha256Hex(canonical);
}
```

## 3.4 Hash Chain 计算规则

```typescript
/**
 * Evidence Manifest Hash Chain
 * 
 * 计算顺序（必须严格遵守）：
 * 1. 计算各 evidence 段的 evidence_hash
 * 2. 计算 manifest_hash
 */

function computeManifestHashes(manifest: EvidenceManifest): EvidenceManifest {
  // Step 1: 计算 content_evidence.evidence_hash
  const contentEvidenceForHash = { ...manifest.content_evidence };
  delete contentEvidenceForHash.evidence_hash;
  manifest.content_evidence.evidence_hash = sha256Hex(
    canonicalJsonStringify(contentEvidenceForHash)
  );
  
  // Step 2: 计算 authorship_evidence.evidence_hash
  const authorshipEvidenceForHash = { ...manifest.authorship_evidence };
  delete authorshipEvidenceForHash.evidence_hash;
  manifest.authorship_evidence.evidence_hash = sha256Hex(
    canonicalJsonStringify(authorshipEvidenceForHash)
  );
  
  // Step 3: 计算 timestamp_evidence.evidence_hash
  const timestampEvidenceForHash = { ...manifest.timestamp_evidence };
  delete timestampEvidenceForHash.evidence_hash;
  manifest.timestamp_evidence.evidence_hash = sha256Hex(
    canonicalJsonStringify(timestampEvidenceForHash)
  );
  
  // Step 4: 计算 fingerprint_evidence.evidence_hash
  const fingerprintEvidenceForHash = { ...manifest.fingerprint_evidence };
  delete fingerprintEvidenceForHash.evidence_hash;
  manifest.fingerprint_evidence.evidence_hash = sha256Hex(
    canonicalJsonStringify(fingerprintEvidenceForHash)
  );
  
  // Step 5: 计算 manifest_hash
  const manifestForHash = { ...manifest };
  delete manifestForHash.manifest_hash;
  manifest.manifest_hash = sha256Hex(
    canonicalJsonStringify(manifestForHash)
  );
  
  return manifest;
}
```

## 3.5 Evidence Package (ZIP) 结构

```
evidence_package_{content_id}.zip
│
├── manifest.json                     # Evidence Manifest (主文件)
│
├── content/
│   ├── original.txt                  # 原始文本（如有）
│   ├── canonical.txt                 # 规范化文本
│   ├── structure.json                # Markdown AST（如有）
│   └── metadata.json                 # 内容元数据
│
├── media/                            # 媒体文件（如有）
│   ├── {media_id_1}.{ext}
│   ├── {media_id_2}.{ext}
│   └── ...
│
├── signatures/
│   ├── author_signature.json         # 作者签名详情
│   │   {
│   │     "algorithm": "ed25519",
│   │     "payload_hash": "...",
│   │     "signature": "...",          // Base64
│   │     "public_key": "..."          // Base64
│   │   }
│   │
│   ├── tsa_token.der                 # RFC3161 TSA token（二进制）
│   ├── tsa_token.json                # TSA 元数据
│   │
│   └── merkle_proof.json             # Merkle 证明
│       {
│         "root": "...",
│         "proof": ["...", "..."],
│         "leaf_index": 42
│       }
│
├── fingerprints/
│   ├── minhash.bin                   # MinHash 签名（二进制）
│   ├── minhash.json                  # MinHash 元数据
│   ├── winnowing.json                # Winnowing 指纹列表
│   └── embedding.bin                 # Embedding 向量（二进制）
│
├── verification/
│   ├── README.md                     # 验证说明
│   ├── verify.sh                     # 验证脚本 (Bash)
│   ├── verify.py                     # 验证脚本 (Python)
│   └── checksums.sha256              # 所有文件的 SHA256 校验和
│
└── MANIFEST.sha256                   # manifest.json 的 SHA256
```

## 3.6 验证流程

```typescript
/**
 * Evidence Package 验证流程
 */

interface VerificationResult {
  valid: boolean;
  checks: {
    manifest_integrity: boolean;      // manifest_hash 校验
    content_integrity: boolean;       // content_evidence 校验
    authorship_integrity: boolean;    // 签名校验
    timestamp_integrity: boolean;     // TSA/Merkle 校验
    fingerprint_integrity: boolean;   // 指纹校验
    file_integrity: boolean;          // ZIP 内文件校验
  };
  errors: string[];
}

async function verifyEvidencePackage(
  zipPath: string
): Promise<VerificationResult> {
  const result: VerificationResult = {
    valid: true,
    checks: {
      manifest_integrity: false,
      content_integrity: false,
      authorship_integrity: false,
      timestamp_integrity: false,
      fingerprint_integrity: false,
      file_integrity: false,
    },
    errors: [],
  };
  
  // 1. 解压并读取 manifest.json
  const manifest = await readManifestFromZip(zipPath);
  
  // 2. 验证 manifest_hash
  const manifestWithoutHash = { ...manifest };
  delete manifestWithoutHash.manifest_hash;
  const computedManifestHash = sha256Hex(canonicalJsonStringify(manifestWithoutHash));
  if (computedManifestHash === manifest.manifest_hash) {
    result.checks.manifest_integrity = true;
  } else {
    result.errors.push("Manifest hash mismatch");
    result.valid = false;
  }
  
  // 3. 验证 content_evidence
  const canonicalText = await readFileFromZip(zipPath, "content/canonical.txt");
  const computedContentId = sha256Hex(canonicalText);
  if (computedContentId === manifest.content_evidence.content_id) {
    result.checks.content_integrity = true;
  } else {
    result.errors.push("Content ID mismatch");
    result.valid = false;
  }
  
  // 4. 验证 authorship_evidence (签名)
  const signatureValid = await verifyEd25519Signature(
    manifest.authorship_evidence.signature.signed_payload_hash,
    manifest.authorship_evidence.signature.signature_value,
    manifest.authorship_evidence.signature.public_key
  );
  if (signatureValid) {
    result.checks.authorship_integrity = true;
  } else {
    result.errors.push("Signature verification failed");
    result.valid = false;
  }
  
  // 5. 验证 timestamp_evidence (TSA)
  if (manifest.timestamp_evidence.rfc3161_proof) {
    const tsaValid = await verifyRfc3161Token(
      await readFileFromZip(zipPath, "signatures/tsa_token.der"),
      manifest.content_evidence.content_id
    );
    if (tsaValid) {
      result.checks.timestamp_integrity = true;
    } else {
      result.errors.push("TSA token verification failed");
      result.valid = false;
    }
  } else {
    result.checks.timestamp_integrity = true;  // 无 TSA 时跳过
  }
  
  // 6. 验证 fingerprint_evidence
  // ... 类似逻辑
  
  // 7. 验证 checksums.sha256
  const checksumValid = await verifyChecksums(zipPath);
  if (checksumValid) {
    result.checks.file_integrity = true;
  } else {
    result.errors.push("File checksum mismatch");
    result.valid = false;
  }
  
  return result;
}
```

## 3.7 API 端点

```typescript
// GET /api/v1/evidence/:content_id
// 获取证据链信息
interface GetEvidenceResponse {
  success: boolean;
  data: {
    content_id: string;
    manifest_id: string;
    manifest_hash: string;
    
    summary: {
      has_author_signature: boolean;
      has_tsa_proof: boolean;
      has_merkle_anchor: boolean;
      created_at: string;
    };
    
    download_url: string;  // /api/v1/evidence/:content_id/download
  };
}

// GET /api/v1/evidence/:content_id/manifest
// 获取完整 Evidence Manifest
interface GetManifestResponse {
  success: boolean;
  data: EvidenceManifest;
}

// GET /api/v1/evidence/:content_id/download
// 下载 Evidence Package (ZIP)
// Content-Type: application/zip
// Content-Disposition: attachment; filename="evidence_package_{content_id}.zip"

// POST /api/v1/evidence/verify
// 验证上传的 Evidence Package
interface VerifyEvidenceRequest {
  // multipart/form-data
  package: File;  // ZIP 文件
}

interface VerifyEvidenceResponse {
  success: boolean;
  data: VerificationResult;
}
```

---

# 附录：完整 API 清单 (v3.1)

```yaml
# ============================================================
# CAPS API v1 - 完整清单 (v3.1 修订)
# ============================================================

# 内容管理
POST   /api/v1/content/register          # 注册内容
POST   /api/v1/content/check-similarity  # 相似检测
POST   /api/v1/content/verify            # 内容验证
GET    /api/v1/content/:content_id       # 获取内容信息

# Token 管理
GET    /api/v1/token/verify/:token       # Token 验证
POST   /api/v1/token/revoke/:token       # Token 撤销 (需认证)

# 签名管理
GET    /api/v1/signature/static/:content_id      # 静态 SVG
GET    /api/v1/signature/dynamic/:content_id     # 动态 SVG (可选 ?date=)
GET    /api/v1/signature/bundle/:token           # Bundle 获取
GET    /api/v1/signature/params/:content_id      # 参数查询

# 证据管理 (P0-3 新增)
GET    /api/v1/evidence/:content_id              # 证据链摘要
GET    /api/v1/evidence/:content_id/manifest     # 完整 Manifest
GET    /api/v1/evidence/:content_id/download     # 证据包下载 (ZIP)
POST   /api/v1/evidence/verify                   # 证据包验证

# 前端页面路由 (非 API)
GET    /certificate/:content_id                  # 证书页面
GET    /verify/:token                            # 验证页面
```

---

# 变更日志

## v3.1.0 (2025-02-01)

### P0-1: API 版本规范
- 统一所有 API 路径为 `/api/v1/...`
- 定义版本升级策略（破坏性变更 → v2，兼容期 6 个月）
- 定义统一响应结构 `ApiResponse<T>`

### P0-2: Stage vs Phase 定义
- 明确 Stage = 算法流水线（永久固定）
- 明确 Phase = 交付批次（可调整）
- 重新定义 Phase 1-5 的交付物和验收标准
- 添加 Stage/Phase 对照表

### P0-3: Evidence Chain 定义
- 定义 `EvidenceManifest` 完整结构（TypeScript interface）
- 定义 Canonical JSON 序列化规则
- 定义 Hash Chain 计算规则
- 定义 Evidence Package (ZIP) 结构
- 定义验证流程
- 添加证据管理 API 端点

---

*文档版本: 3.1.0*
*最后更新: 2025-02-01*
*变更类型: P0 修复补丁*
