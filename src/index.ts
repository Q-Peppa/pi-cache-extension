import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { renderGraphBody } from "./graph-view.js";
import { ScrollDialog } from "./scroll-dialog.js";
import { collectCacheSessionMetrics } from "./session-data.js";

function usageText(): string {
  return "用法：/cache — 查看缓存效率";
}

export default function cacheGraphExtension(pi: ExtensionAPI): void {
  pi.registerCommand("cache", {
    description: "查看缓存效率概览",
    getArgumentCompletions() {
      return [{ value: "", label: "概览", description: "显示缓存效率和节省的 Token" }];
    },
    handler: async (_args, ctx) => {
      let metrics = collectCacheSessionMetrics(ctx.sessionManager);

      if (!ctx.hasUI) {
        const totals = metrics.activeBranchTotals;
        const denominator = totals.input + totals.cacheRead + totals.cacheWrite;
        const hitRate = denominator > 0 ? (totals.cacheRead / denominator) * 100 : 0;
        ctx.ui.notify(`缓存效率: ${hitRate.toFixed(1)}% | 节省: ${totals.cacheRead} tokens`, "info");
        return;
      }

      await ctx.ui.custom<void>(
        (_tui, theme, _keybindings, done) =>
          new ScrollDialog(
            theme,
            {
              title: "📊 缓存效率概览",
              helpText: "r 刷新 • ↑/↓ 滚动 • q 关闭",
              renderBody: (innerWidth) => renderGraphBody(theme, metrics, innerWidth),
              onKey: (data) => {
                if (data === "r") {
                  metrics = collectCacheSessionMetrics(ctx.sessionManager);
                  return true;
                }
                return false;
              },
            },
            () => done(undefined),
          ),
        {
          overlay: true,
          overlayOptions: {
            anchor: "center",
            width: "90%",
            maxHeight: "90%",
            margin: 1,
          },
        },
      );
    },
  });
}
