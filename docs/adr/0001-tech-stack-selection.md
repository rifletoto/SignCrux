# ADR-0001: 技术栈选型

## 状态
**已接受** | 2025-02-01

## 决策者
rifletoto (项目发起人)

## 上下文

CAPS (Content Authentication & Provenance System) 是一个**开源的内容确权与溯源系统**，核心目标是在 AI 时代提供：

1. **四阶段抄袭检测**：从逐字复制到 AI 改写的全方位检测
2. **密码学确权**：基于 Ed25519 签名和时间戳证明的不可抵赖所有权
3. **可视化签名**：Token-SVG Bundle 系统，提升 C 端传播力

### 关键技术挑战

| 挑战 | 技术需求 |
|------|----------|
| **语义相似度检测** | 高维向量索引 (>1M 文档规模) |
| **低延迟查询** | ANN 查询 p99 < 50ms |
| **密码学运算** | Ed25519 签名、SHA-256 哈希 |
| **证据链存储** | 不可变事件流 + 快照证据包 |
| **快速迭代** | 开源友好、社区活跃、文档完善 |

### 项目约束

- **团队规模**：1-2 人初期开发
- **预算**：开源项目，优先使用免费/低成本方案
- **上线目标**：Phase 1 需在 5-6 周内完成 MVP
- **扩展性**：需支持未来 100K+ 用户规模

---

## 决策

### 1. 前端框架：Next.js 14 (App Router)

#### 选择理由

✅ **全栈能力**
- API Routes 无需独立后端服务器
- Server Components 减少客户端 JS 包大小
- Edge Runtime 支持全球低延迟部署

✅ **SEO 友好**
- 验证页面 (`/verify/:token`) 需要被搜索引擎索引
- 证书页面 (`/certificate/:content_id`) 需要 Open Graph 预览

✅ **开发效率**
- TypeScript 原生支持
- 热重载、零配置构建
- Vercel 平台一键部署（免费额度充足）

✅ **生态成熟**
- React 18 并发特性
- 丰富的 UI 组件库 (shadcn/ui, Radix UI)
- 活跃的社区和学习资源

#### 备选方案对比

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| **SvelteKit** | 更小的运行时、编译时优化 | 生态较小、招聘困难 | ❌ 风险高 |
| **Remix** | 优秀的数据加载模式 | 社区规模 < Next.js | ❌ 非最优 |
| **Astro** | 极致的静态性能 | 不适合动态应用 | ❌ 不适用 |

---

### 2. 数据库：PostgreSQL 15+ (with pgvector)

#### 选择理由

✅ **pgvector 扩展**
- 原生支持高维向量存储和 HNSW 索引
- SQL 友好的向量操作（无需学习专用向量数据库）
- 在 1M 规模数据集上，HNSW 性能足够（recall@100 >90%）

✅ **事务能力**
- ACID 保证，确保证据链完整性
- Append-only 模式（利用 INSERT-only + 逻辑删除）
- 原生支持 JSONB 存储 Evidence Manifest

✅ **成熟稳定**
- 30+ 年历史，久经考验
- 丰富的索引类型 (B-tree, GIN, HNSW)
- 强大的窗口函数和 CTE（用于复杂查询）

✅ **开源友好**
- PostgreSQL License（类似 MIT）
- 免费托管方案：Supabase, Neon, Railway
- 社区庞大，问题解决快

#### pgvector HNSW 参数选择

基于 v3.1 文档的基准测试要求：

```sql
-- 索引创建（Phase 2 实现）
CREATE INDEX idx_embeddings_hnsw ON content_embeddings 
USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);

-- 查询时参数
SET hnsw.ef_search = 50;  -- 默认值，可根据 recall 调整
```

| 参数 | 值 | 理由 |
|------|-----|------|
| `m` | 16 | 平衡构建速度和召回率 |
| `ef_construction` | 64 | 足够的索引质量 |
| `ef_search` | 50 | 目标 recall@100 >90%, p99 <50ms |

#### 备选方案对比

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| **Pinecone** | 专用向量数据库、托管服务 | 闭源、成本高（$70/月起）、供应商锁定 | ❌ 不符合开源定位 |
| **Weaviate** | 开源向量数据库 | 需额外维护、学习成本、过度设计 | ❌ 复杂度不匹配 |
| **Qdrant** | Rust 实现、高性能 | 社区小、生态不如 pgvector | ❌ 非必要 |
| **MongoDB Atlas Vector Search** | 文档数据库 + 向量 | 事务能力弱、成本高 | ❌ 不适合 |

**关键判断**：pgvector 在 **1M 规模** 下性能足够，且与 PostgreSQL 深度集成，避免多数据库复杂度。

---

### 3. 编程语言：TypeScript

#### 选择理由

✅ **类型安全**
- 密码学运算需要严格的类型检查（避免 Buffer/String 混淆）
- Evidence Manifest 等复杂数据结构需要接口约束
- 减少运行时错误，提升代码质量

✅ **生态兼容**
- Next.js 原生支持
- 密码学库 `@noble/hashes`, `@noble/ed25519` 均为 TS 编写
- PostgreSQL 驱动 `pg` 有完善的 `@types/pg`

✅ **开发体验**
- IDE 智能提示（VSCode）
- 重构友好
- 文档即代码（JSDoc + TSDoc）

#### 备选方案对比

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| **JavaScript** | 无编译步骤、灵活 | 类型错误在运行时暴露 | ❌ 风险高 |
| **Python (FastAPI)** | ML 生态好（BGE-M3） | 部署复杂、并发性能弱 | ❌ 不适合全栈 |
| **Go** | 高性能、并发优秀 | 前端生态弱、开发速度慢 | ❌ 非最优 |

---

### 4. 密码学库：@noble/hashes + @noble/ed25519

#### 选择理由

✅ **安全审计**
- Paul Miller (@paulmillr) 维护，行业认可
- 经过多次安全审计
- 无依赖（减少供应链攻击面）

✅ **性能优秀**
- 纯 TypeScript 实现，可在 Edge Runtime 运行
- Ed25519 签名速度 ~10K ops/s（单核）
- SHA-256 性能接近原生实现

✅ **API 简洁**
```typescript
import { sha256 } from '@noble/hashes/sha256';
import { ed25519 } from '@noble/curves/ed25519';

const contentId = sha256(canonicalText);
const signature = ed25519.sign(message, privateKey);
```

#### 备选方案对比

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| **Node.js crypto** | 原生模块、性能最高 | 不支持 Edge Runtime | ❌ 限制部署 |
| **tweetnacl** | 经典库 | 已停止维护（5年+） | ❌ 过时 |
| **libsodium.js** | C 移植、性能好 | WASM 体积大、加载慢 | ❌ 非必要 |

---

### 5. 向量嵌入模型：BGE-M3 (API 调用)

#### 选择理由

✅ **多语言支持**
- 中英文性能均优（MTEB 排名前 5）
- 支持长文本（最大 8192 tokens）

✅ **维度适中**
- 1024 维，平衡精度和存储成本
- pgvector HNSW 在此维度下性能良好

✅ **API 灵活**
- Phase 1-2: 使用第三方 API（SiliconFlow, 通义千问）
- Phase 3+: 可选自部署（降低成本）

#### 调用方式（Phase 1）

```typescript
// 使用 SiliconFlow API (免费额度：100万tokens/月)
const response = await fetch('https://api.siliconflow.cn/v1/embeddings', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${process.env.SILICONFLOW_API_KEY}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'BAAI/bge-m3',
    input: canonicalText
  })
});

const { data } = await response.json();
const embedding = data[0].embedding; // 1024-dim vector
```

#### 备选方案对比

| 方案 | 优势 | 劣势 | 结论 |
|------|------|------|------|
| **OpenAI text-embedding-3-small** | API 稳定、文档完善 | 成本高（$0.02/1M tokens） | ❌ 成本不适合开源 |
| **Sentence-BERT** | 开源、可自部署 | 中文支持弱、维度低（768） | ❌ 性能不足 |
| **自部署 BGE-M3** | 成本可控 | 需 GPU 服务器（$50/月起） | ⏸️ Phase 4+ 考虑 |

**关键判断**：Phase 1-2 使用 API（快速验证），Phase 4+ 根据成本评估自部署。

---

### 6. 算法库：自实现 + datasketch

#### MinHash / LSH (Stage 2)

**选择**：使用 Python 库 `datasketch`，通过 API 调用

**理由**：
- 成熟实现，避免重复造轮子
- LSH 索引支持，开箱即用
- Phase 2 可通过 FastAPI 包装成微服务

```python
# 示例：MinHash 计算
from datasketch import MinHash, MinHashLSH

m = MinHash(num_perm=128)
for token in tokens:
    m.update(token.encode('utf8'))
```

#### Winnowing (Stage 3)

**选择**：**自实现**（TypeScript）

**理由**：
- 算法简单（50 行代码）
- 需要精细控制 k-gram 和窗口大小
- 避免 Python 互操作复杂度

```typescript
// docs/guides/winnowing-implementation.md 将提供详细说明
function winnowing(text: string, k: number, w: number): Set<number> {
  // ...
}
```

---

### 7. 缓存层：Redis (可选，Phase 3+)

#### 使用场景

- Token 验证结果缓存（TTL: 1小时）
- SVG Bundle 渲染缓存（永久，content_id 为键）
- 频繁访问的 Evidence Manifest

#### 选择理由

✅ **性能**：内存数据库，亚毫秒级读写  
✅ **数据结构**：支持 Set, Hash, Sorted Set（用于 Top-K 查询）  
✅ **免费托管**：Upstash (免费额度：10K 命令/天)

#### 何时引入

- **Phase 1-2**：不使用（PostgreSQL 足够）
- **Phase 3+**：当 Token 验证 QPS > 100 时引入

---

### 8. 任务队列：Bull (可选，Phase 4+)

#### 使用场景

- Merkle 批量锚定（每日凌晨执行）
- TSA 时间戳申请（异步处理）
- 大文件 Embedding 计算（后台任务）

#### 选择理由

✅ **Redis 驱动**：与缓存层复用基础设施  
✅ **可视化**：Bull Dashboard 监控任务  
✅ **可靠性**：重试、优先级队列

#### 何时引入

- **Phase 1-3**：同步处理
- **Phase 4**：引入 TSA 时启用队列

---

## 技术栈总结

```yaml
前端:
  框架: Next.js 14 (App Router)
  语言: TypeScript 5.3+
  样式: Tailwind CSS 3.4
  组件: shadcn/ui (Radix UI primitives)
  状态: React Query (服务端状态)
  图表: D3.js / Recharts (SVG 签名渲染)

后端:
  运行时: Node.js 20 LTS
  框架: Next.js API Routes
  语言: TypeScript 5.3+
  ORM: Drizzle ORM (可选，Phase 2+)

数据库:
  主库: PostgreSQL 15+ (Supabase 托管)
  扩展: pgvector 0.5+ (HNSW 索引)
  缓存: Redis 7+ (Upstash, Phase 3+)

密码学:
  哈希: @noble/hashes (SHA-256, BLAKE3)
  签名: @noble/ed25519
  密钥派生: @noble/hashes (HKDF)

算法:
  MinHash/LSH: datasketch (Python API)
  Winnowing: 自实现 (TypeScript)
  Embedding: BGE-M3 (SiliconFlow API)
  向量索引: pgvector HNSW

基础设施:
  部署: Vercel (前端 + API Routes)
  数据库: Supabase (PostgreSQL + pgvector)
  文件存储: Vercel Blob / R2 (Phase 4+)
  监控: Sentry (错误追踪)
```

---

## 成本估算 (前 6 个月)

| 服务 | 免费额度 | 付费阈值 | 预估成本 |
|------|----------|----------|----------|
| **Vercel** | 100GB 带宽/月 | >100K 请求/天 | $0 (Phase 1-3) |
| **Supabase** | 500MB DB, 1GB 传输 | >10K 注册内容 | $0 (Phase 1-3) |
| **SiliconFlow API** | 100万 tokens/月 | >3K embeddings/天 | $0 (Phase 1-2) |
| **Upstash Redis** | 10K 命令/天 | >100 QPS | $0 (Phase 3) |
| **总计** | | | **$0 / 月** |

**关键判断**：前 6 个月（Phase 1-3）**完全免费**，为开源项目降低门槛。

---

## 风险与缓解

| 风险 | 影响 | 概率 | 缓解措施 |
|------|------|------|----------|
| **pgvector 性能不足** | 检测延迟 >500ms | 低 | 降级到 IVFFlat；监控 p99 延迟 |
| **BGE-M3 API 限流** | Embedding 失败 | 中 | 备用 API（通义千问）；Phase 4 自部署 |
| **Vercel 免费额度用尽** | 部署成本上升 | 低 | 迁移到 Railway / Fly.io |
| **Supabase 存储超限** | 数据库成本 | 中 | 归档旧数据到 IPFS；升级付费计划 |

---

## 决策验证标准

### Phase 1 结束前验证

- [ ] PostgreSQL + pgvector 能处理 1K 文档的 HNSW 查询（p99 <100ms）
- [ ] @noble/ed25519 签名性能 >5K ops/s（单核）
- [ ] Next.js API Routes 能支撑 100 QPS（Vercel 免费额度内）

### Phase 2 结束前验证

- [ ] BGE-M3 API 稳定性 >99.9%
- [ ] HNSW 索引在 10K 文档下 recall@100 >90%
- [ ] 总体检测延迟 p99 <500ms

### 失败条件（触发技术栈调整）

- PostgreSQL 查询延迟 p99 >1s（考虑专用向量数据库）
- BGE-M3 API 成本 >$50/月（切换自部署或降级模型）
- Vercel 部署成本 >$20/月（迁移到自托管）

---

## 参考资料

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Next.js 14 Documentation](https://nextjs.org/docs)
- [@noble Cryptographic Libraries](https://github.com/paulmillr/noble-hashes)
- [BGE-M3 Model Card](https://huggingface.co/BAAI/bge-m3)
- [datasketch Library](https://github.com/ekzhu/datasketch)

---

## 变更日志

- **2025-02-01**: 初始版本，定义 Phase 1-5 技术栈
- **待定**: Phase 2 结束后根据基准测试结果可能调整向量索引参数

---

**下一个 ADR**: [ADR-0002: Detection Pipeline 设计](./0002-detection-pipeline-design.md)
