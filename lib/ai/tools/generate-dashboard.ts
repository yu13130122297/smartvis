import { tool } from "ai";
import { z } from "zod";
import { fixChartOption } from "../workflows/chart-fix";

// 单个图表在 Dashboard 中的位置配置
const gridPositionSchema = z.object({
  col: z.number().int().min(0).max(5).describe("列起始位置 (0-based)"),
  row: z.number().int().min(0).max(5).describe("行起始位置 (0-based)"),
  colSpan: z.number().int().min(1).max(3).describe("列跨度 (1-3)"),
  rowSpan: z.number().int().min(1).max(2).describe("行跨度 (1-2)"),
});

// 单个图表配置
const dashboardChartSchema = z.object({
  id: z.string().describe("图表唯一标识，如 'chart-1', 'chart-2'"),
  title: z.string().describe("图表标题"),
  rawOptionString: z
    .string()
    .describe("完整的 ECharts option 对象的 JSON 字符串"),
  gridPosition: gridPositionSchema.describe("图表在网格中的位置和大小"),
});

// Dashboard 布局配置
const dashboardLayoutSchema = z.object({
  columns: z.number().int().min(2).max(4).default(2).describe("网格列数 (2-4)"),
  rows: z.number().int().min(2).max(4).default(2).describe("网格行数 (2-4)"),
  gap: z.number().int().min(8).max(24).default(16).describe("图表间距(px)"),
});

// 输入 Schema
const generateDashboardInputSchema = z.object({
  title: z.string().describe("大屏标题，如 '销售数据大屏'"),
  description: z.string().optional().describe("大屏描述，可选"),
  layout: dashboardLayoutSchema.optional().describe("布局配置，默认 2x2 网格"),
  charts: z
    .array(dashboardChartSchema)
    .min(1)
    .max(12)
    .describe("图表列表 (1-12个)"),
  agentTrace: z.string().default("DashboardRenderer"),
  skipFix: z.boolean().default(false).describe("是否跳过图表配置修复"),
});

// 输出 Schema
const dashboardChartOutputSchema = z.object({
  id: z.string(),
  title: z.string(),
  rawOptionString: z.string(),
  gridPosition: gridPositionSchema,
  fixApplied: z.boolean().optional(),
  fixError: z.string().optional(),
});

const generateDashboardOutputSchema = z.object({
  title: z.string(),
  description: z.string().optional(),
  layout: dashboardLayoutSchema,
  charts: z.array(dashboardChartOutputSchema),
  agentTrace: z.string(),
  totalFixes: z.number().describe("成功修复的图表数量"),
  errors: z
    .array(
      z.object({
        chartId: z.string(),
        error: z.string(),
      })
    )
    .optional(),
});

type DashboardChartInput = z.infer<typeof dashboardChartSchema>;
type DashboardLayout = z.infer<typeof dashboardLayoutSchema>;

/**
 * 检测网格布局冲突
 */
function detectLayoutConflicts(
  charts: DashboardChartInput[],
  layout: DashboardLayout
): string[] {
  const errors: string[] = [];
  const grid: boolean[][] = new Array(layout.rows)
    .fill(null)
    .map(() => new Array(layout.columns).fill(false));

  for (const chart of charts) {
    const { col, row, colSpan, rowSpan } = chart.gridPosition;

    // 检查边界
    if (col < 0 || col + colSpan > layout.columns) {
      errors.push(
        `图表 "${chart.title}" 列位置超出边界 (col=${col}, colSpan=${colSpan}, max=${layout.columns})`
      );
    }
    if (row < 0 || row + rowSpan > layout.rows) {
      errors.push(
        `图表 "${chart.title}" 行位置超出边界 (row=${row}, rowSpan=${rowSpan}, max=${layout.rows})`
      );
    }

    // 检查重叠
    for (let r = row; r < Math.min(row + rowSpan, layout.rows); r++) {
      for (let c = col; c < Math.min(col + colSpan, layout.columns); c++) {
        if (grid[r]?.[c]) {
          errors.push(
            `图表 "${chart.title}" 与其他图表位置重叠 (位置: row=${r}, col=${c})`
          );
        }
        if (grid[r]) {
          grid[r][c] = true;
        }
      }
    }
  }

  return errors;
}

export const generateDashboard = tool({
  description: `当用户要求生成数据大屏、可视化仪表盘、Dashboard 时调用此工具。
可以一次性生成包含多个图表的大屏布局。

示例场景：
- "帮我生成一个销售数据大屏"
- "创建一个包含多个图表的仪表盘"
- "生成一个 2x2 的数据可视化大屏"
- "做一个监控大屏，显示实时数据"

布局模板：
- 2x2 布局：适合 4 个图表
- 2x3 布局：适合 6 个图表
- 3x2 布局：适合 6 个图表，更宽

每个图表需要指定 gridPosition：
- col: 列起始位置 (从 0 开始)
- row: 行起始位置 (从 0 开始)
- colSpan: 列跨度 (1-3)
- rowSpan: 行跨度 (1-2)`,

  inputSchema: generateDashboardInputSchema,

  execute: async ({
    title,
    description,
    layout,
    charts,
    agentTrace,
    skipFix,
  }) => {
    console.log(`[generateDashboard] Agent: ${agentTrace}`);
    console.log(`[generateDashboard] Title: ${title}`);
    console.log(`[generateDashboard] Charts count: ${charts.length}`);

    // 设置默认布局
    const finalLayout: DashboardLayout = layout ?? {
      columns: 2,
      rows: 2,
      gap: 16,
    };

    // 检测布局冲突
    const layoutErrors = detectLayoutConflicts(charts, finalLayout);
    if (layoutErrors.length > 0) {
      console.warn(
        "[generateDashboard] Layout conflicts detected:",
        layoutErrors
      );
    }

    // 处理每个图表
    const processedCharts: z.infer<typeof dashboardChartOutputSchema>[] = [];
    const errors: Array<{ chartId: string; error: string }> = [];
    let totalFixes = 0;

    for (const chart of charts) {
      console.log(
        `[generateDashboard] Processing chart: ${chart.id} - ${chart.title}`
      );

      // 验证基础 JSON 格式
      let isValidJson = true;
      try {
        const cleaned = chart.rawOptionString
          .replace(/```json/gi, "")
          .replace(/```/g, "")
          .trim();
        JSON.parse(cleaned);
      } catch {
        isValidJson = false;
      }

      if (!isValidJson) {
        processedCharts.push({
          id: chart.id,
          title: chart.title,
          rawOptionString: chart.rawOptionString,
          gridPosition: chart.gridPosition,
          fixApplied: false,
          fixError: "JSON 格式错误",
        });
        errors.push({ chartId: chart.id, error: "JSON 格式错误" });
        continue;
      }

      // 调用修复智能体
      if (skipFix) {
        processedCharts.push({
          id: chart.id,
          title: chart.title,
          rawOptionString: chart.rawOptionString,
          gridPosition: chart.gridPosition,
          fixApplied: false,
        });
      } else {
        try {
          const fixResult = await fixChartOption({
            rawOptionString: chart.rawOptionString,
            agentTrace: `${agentTrace}-${chart.id}`,
          });

          if (fixResult.success && fixResult.fixedOptionString) {
            processedCharts.push({
              id: chart.id,
              title: chart.title,
              rawOptionString: fixResult.fixedOptionString,
              gridPosition: chart.gridPosition,
              fixApplied: true,
            });
            totalFixes++;
            console.log(`[generateDashboard] ✅ Chart ${chart.id} fixed`);
          } else {
            processedCharts.push({
              id: chart.id,
              title: chart.title,
              rawOptionString: chart.rawOptionString,
              gridPosition: chart.gridPosition,
              fixApplied: false,
              fixError: fixResult.error ?? "Unknown error",
            });
            errors.push({
              chartId: chart.id,
              error: fixResult.error ?? "Unknown error",
            });
          }
        } catch (fixError) {
          const errorMsg =
            fixError instanceof Error ? fixError.message : "Fix failed";
          processedCharts.push({
            id: chart.id,
            title: chart.title,
            rawOptionString: chart.rawOptionString,
            gridPosition: chart.gridPosition,
            fixApplied: false,
            fixError: errorMsg,
          });
          errors.push({ chartId: chart.id, error: errorMsg });
        }
      }
    }

    console.log(
      `[generateDashboard] ✅ Completed: ${processedCharts.length} charts, ${totalFixes} fixes`
    );

    return {
      title,
      description,
      layout: finalLayout,
      charts: processedCharts,
      agentTrace: agentTrace ?? "DashboardRenderer",
      totalFixes,
      errors: errors.length > 0 ? errors : undefined,
    };
  },
});

export type GenerateDashboardInput = z.infer<
  typeof generateDashboardInputSchema
>;
export type GenerateDashboardOutput = z.infer<
  typeof generateDashboardOutputSchema
>;
export type DashboardChart = z.infer<typeof dashboardChartOutputSchema>;