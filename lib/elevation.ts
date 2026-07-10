// lib/elevation.ts — 海拔計算（App 端入口，含 server-only 保護）
// 核心邏輯在 elevation-core.ts（Phase 15C 拆出，讓批次腳本可重用）。
import 'server-only';
export * from './elevation-core';
export { precomputeElevationForRoute } from './elevation-precompute';
