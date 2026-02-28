import { tool } from "ai";
import { z } from "zod";

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
4. 可以使用各种图表类型：bar, line, pie, scatter, radar 等`,

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

    agentTrace: z.string().describe(
      `描述当前正在执行的 Agent 名称，例如：
      - "DataAnalyzer" (数据分析)
      - "ChartRenderer" (图表渲染)
      - "TrendAnalyzer" (趋势分析)
      - "VisualizationAgent" (可视化智能体)`
    ).default('ChartRenderer'),
  }),

  execute: async ({ rawOptionString, agentTrace }) => {
    // 这里可以接入真实的后端 Python/Java 多智能体接口
    // 目前先 Mock 直接返回，让前端跑通

    // 可选：在这里添加日志记录或数据验证
    console.log(`[generateChart] Agent: ${agentTrace || 'Unknown'}`);
    console.log(`[generateChart] Option length: ${rawOptionString.length} chars`);

    // 可选：在这里进行基础的 JSON 验证
    try {
      // 尝试解析以确保是有效的 JSON
      JSON.parse(rawOptionString);
    } catch (error) {
      console.warn('[generateChart] Warning: Invalid JSON format, will be handled by frontend worker', error);
    }

    return {
      rawOptionString,
      agentTrace: agentTrace || 'ChartRenderer',
    };
  },
});
