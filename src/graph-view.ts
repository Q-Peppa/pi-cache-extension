import type { Theme } from "@earendil-works/pi-coding-agent";
import type { CacheSessionMetrics } from "./types.js";
import { formatInt, formatPercent, formatTotalsLine, summarizeHitPercent } from "./format-utils.js";

export type GraphView = "simple";

export const GRAPH_VIEWS: GraphView[] = ["simple"];

export function graphViewLabel(view: GraphView): string {
  return "缓存效率";
}

function renderProgressBar(theme: Theme, percent: number, width: number): string {
  const filled = Math.round((percent / 100) * width);
  const filledStr = percent >= 40 ? theme.fg("accent", "█".repeat(filled)) : theme.fg("muted", "█".repeat(filled));
  const emptyStr = theme.fg("dim", "░".repeat(width - filled));
  return filledStr + emptyStr;
}

function getEfficiencyRating(percent: number): { label: string; color: "accent" | "muted" } {
  if (percent >= 70) return { label: "优秀 🟢", color: "accent" };
  if (percent >= 40) return { label: "良好 🟡", color: "accent" };
  return { label: "一般 🔴", color: "muted" };
}

export function renderGraphBody(
  theme: Theme,
  metrics: CacheSessionMetrics,
  width: number,
): string[] {
  const messages = metrics.allMessages;
  const lines: string[] = [];
  const totals = metrics.activeBranchTotals;
  const hitRate = summarizeHitPercent(totals);
  const savedTokens = totals.cacheRead;
  const estimatedSaving = (savedTokens / 1_000_000) * 5; // 估算：每百万token约5美元

  // ===== 主标题 =====
  lines.push(theme.fg("accent", theme.bold("📊 缓存效率概览")));
  lines.push("");

  // ===== 核心数据卡片 =====
  const barWidth = Math.min(40, width - 20);
  lines.push(`  缓存命中率：${theme.bold(formatPercent(hitRate))}`);
  lines.push(`  ${renderProgressBar(theme, hitRate, barWidth)}`);
  lines.push("");

  const rating = getEfficiencyRating(hitRate);
  lines.push(`  效率评级：${theme.fg(rating.color, theme.bold(rating.label))}`);
  lines.push("");

  lines.push(`  ✅ 累计节省 Token：${theme.bold(formatInt(savedTokens))}`);
  lines.push(`  💰 估算节省金额：${theme.bold(`$${estimatedSaving.toFixed(2)}`)}`);
  lines.push(`  📝 对话轮次：${theme.bold(formatInt(totals.assistantMessages))}`);
  lines.push("");

  // ===== 详细数据（折叠显示） =====
  lines.push(theme.fg("dim", "─── 详细数据 ───"));
  lines.push(formatTotalsLine("当前分支", metrics.activeBranchTotals));
  lines.push(formatTotalsLine("整个会话", metrics.treeTotals));
  lines.push("");

  if (messages.length === 0) {
    lines.push(
      theme.fg("muted", "还没有对话数据，继续使用 AI 吧！"),
    );
    return lines;
  }

  // ===== 最近几次命中率 =====
  const recentCount = Math.min(5, messages.length);
  const recent = messages.slice(-recentCount).reverse();

  lines.push(theme.fg("accent", theme.bold(`📋 最近 ${recentCount} 轮`)));
  for (let i = 0; i < recent.length; i++) {
    const msg = recent[i]!;
    lines.push(
      `  第 ${formatInt(messages.length - i)} 轮：${formatPercent(msg.cacheHitPercent).padStart(6)}  ${msg.cacheHitPercent >= 50 ? "✅" : "⭕"}`,
    );
  }

  return lines;
}
