/**
 * Database Schema Definition
 * 
 * Using Drizzle ORM for type-safe database access
 */

import { pgTable, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';

// ============================================================
// Contents Table - 内容表
// ============================================================

export const contents = pgTable('contents', {
  // 主键：SHA-256 content_id
  content_id: varchar('content_id', { length: 64 }).primaryKey(),
  
  // 内容快照
  canonical_text: text('canonical_text').notNull(),  // 规范化后的文本
  original_text: text('original_text').notNull(),    // 原始文本（用于展示）
  
  // 元数据
  title: varchar('title', { length: 500 }),
  author_id: varchar('author_id', { length: 100 }).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  
  // 规范化版本（用于版本追踪）
  canonicalization_version: varchar('canonicalization_version', { length: 10 })
    .notNull()
    .default('1.0.0'),
}, (table) => ({
  // 索引
  authorIdx: index('idx_contents_author_id').on(table.author_id),
  createdAtIdx: index('idx_contents_created_at').on(table.created_at),
}));

// ============================================================
// Tokens Table - Token 表
// ============================================================

export const tokens = pgTable('tokens', {
  // 主键：SHA-256(token)
  token_hash: varchar('token_hash', { length: 64 }).primaryKey(),
  
  // Token 数据
  token_braille: varchar('token_braille', { length: 100 }).notNull().unique(),
  token_ascii: varchar('token_ascii', { length: 50 }).notNull().unique(),
  
  // 关联到内容
  content_id: varchar('content_id', { length: 64 })
    .notNull()
    .references(() => contents.content_id),
  
  // 状态
  is_revoked: boolean('is_revoked').default(false).notNull(),
  created_at: timestamp('created_at').defaultNow().notNull(),
  revoked_at: timestamp('revoked_at'),
}, (table) => ({
  // 索引
  contentIdx: index('idx_tokens_content_id').on(table.content_id),
  brailleIdx: index('idx_tokens_braille').on(table.token_braille),
  asciiIdx: index('idx_tokens_ascii').on(table.token_ascii),
}));

// ============================================================
// Signatures Table - 签名表
// ============================================================

export const signatures = pgTable('signatures', {
  // 主键：nanoid
  signature_id: varchar('signature_id', { length: 64 }).primaryKey(),
  
  // 关联到内容
  content_id: varchar('content_id', { length: 64 })
    .notNull()
    .references(() => contents.content_id),
  
  // 签名数据
  signed_payload_hash: varchar('signed_payload_hash', { length: 64 }).notNull(),  // SHA-256
  signature_value: varchar('signature_value', { length: 128 }).notNull(),         // Ed25519 signature
  public_key: varchar('public_key', { length: 64 }).notNull(),                    // Ed25519 public key
  
  // 元数据
  signature_type: varchar('signature_type', { length: 20 })
    .notNull()
    .default('platform'),  // 'platform' | 'user'
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // 索引
  contentIdx: index('idx_signatures_content_id').on(table.content_id),
}));

// ============================================================
// Assertions Table - 声明表
// ============================================================

export const assertions = pgTable('assertions', {
  // 主键：nanoid
  assertion_id: varchar('assertion_id', { length: 64 }).primaryKey(),
  
  // 关联到内容
  content_id: varchar('content_id', { length: 64 })
    .notNull()
    .references(() => contents.content_id),
  
  // 声明内容
  claim_type: varchar('claim_type', { length: 50 })
    .notNull()
    .default('authorship'),  // 'authorship' | 'timestamp' | 'license'
  claim_statement: text('claim_statement').notNull(),  // "I am the original author..."
  
  // 元数据
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // 索引
  contentIdx: index('idx_assertions_content_id').on(table.content_id),
}));

// ============================================================
// TypeScript Types (从 schema 推导)
// ============================================================

export type Content = typeof contents.$inferSelect;
export type NewContent = typeof contents.$inferInsert;

export type Token = typeof tokens.$inferSelect;
export type NewToken = typeof tokens.$inferInsert;

export type Signature = typeof signatures.$inferSelect;
export type NewSignature = typeof signatures.$inferInsert;

export type Assertion = typeof assertions.$inferSelect;
export type NewAssertion = typeof assertions.$inferInsert;