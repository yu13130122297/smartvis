import { tool } from "ai";
import { z } from "zod";
import { fixChartOption } from "../workflows/chart-fix";

export const generateChart = tool({
  description: `当用户要求分析数据、绘制图表、可视化数据时调用此工具。
你需要输出完整的 ECharts option 配置对象的 JSON 字符串格式。

示例场景：
- "帮我画一个柱状图展示销量数据"
- "绘制折线图显示温度变化趋势"
- "可视化这些数据：苹果 100, 香蕉 200, 橘子 150"
- "分析并展示用户增长趋势"

重要提示：
1. 返回的 rawOptionString 必须是有效的 JSON 字符串
2. ECharts option 必须包含完整的配置（title, tooltip, xAxis, yAxis, series 等）
3. 确保数据格式正确，避免语法错误
4. 可以使用各种图表类型：bar, line, pie, scatter, radar 等
5. 如果使用多 grid 布局，必须为每个 xAxis/yAxis 指定 gridIndex`,

  inputSchema: z.object({
    rawOptionString: z.string().describe(
      `完整的 ECharts option 对象的 JSON 字符串格式。

      示例：
      {
        "title": { "text": "销量数据分析" },
        "tooltip": { "trigger": "axis" },
        "xAxis": { "type": "category", "data": ["苹果", "香蕉", "橘子"] },
        "yAxis": { "type": "value" },
        "series": [{
          "name": "销量",
          "type": "bar",
          "data": [100, 200, 150]
        }]
      }`
    ),

    agentTrace: z
      .string()
      .describe(
        `描述当前正在执行的 Agent 名称，例如：
      - "DataAnalyzer" (数据分析)
      - "ChartRenderer" (图表渲染)
      - "TrendAnalyzer" (趋势分析)
      - "VisualizationAgent" (可视化智能体)`
      )
      .default("ChartRenderer"),

    skipFix: z
      .boolean()
      .describe("是否跳过修复智能体验证。默认为 false，即会自动修复配置错误。")
      .default(false),
  }),

  execute: async ({ rawOptionString, agentTrace, skipFix }) => {
    console.log(`[generateChart] Agent: ${agentTrace || "Unknown"}`);
    console.log(
      `[generateChart] Option length: ${rawOptionString.length} chars`
    );
    console.log(`[generateChart] Skip fix: ${skipFix}`);

    // 验证基础 JSON 格式
    let isValidJson = true;
    try {
      const cleaned = rawOptionString
        .replace(/```json/gi, "")
        .replace(/```/g, "")
        .trim();
      JSON.parse(cleaned);
    } catch {
      isValidJson = false;
    }

    // 如果 JSON 格式无效，直接返回（让前端 Web Worker 处理）
    if (!isValidJson) {
      console.warn(
        "[generateChart] Invalid JSON format, will be handled by frontend worker"
      );
      return {
        rawOptionString,
        agentTrace: agentTrace || "ChartRenderer",
        fixApplied: false,
        fixError: "JSON 格式错误",
      };
    }

    // 调用修复智能体（除非明确跳过）
    if (!skipFix) {
      console.log("[generateChart] Calling Chart Fix Agent...");
      try {
        const fixResult = await fixChartOption({
          rawOptionString,
          agentTrace: `${agentTrace || "ChartRenderer"}-Fix`,
        });

        if (fixResult.success && fixResult.fixedOptionString) {
          console.log(
            `[generateChart] ✅ Fix applied: ${fixResult.修复尝试次数} attempts`
          );
          return {
            rawOptionString: fixResult.fixedOptionString,
            agentTrace: agentTrace || "ChartRenderer",
            fixApplied: true,
            fixAttempts: fixResult.修复尝试次数,
            fixLog: fixResult.repairLog,
          };
        }

        console.warn(`[generateChart] ⚠️ Fix failed: ${fixResult.error}`);
      } catch (fixError) {
        console.error("[generateChart] ❌ Fix agent error:", fixError);
      }
    }

    return {
      rawOptionString,
      agentTrace: agentTrace || "ChartRenderer",
      fixApplied: false,
    };
  },
});
