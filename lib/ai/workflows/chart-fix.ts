import { generateText } from "ai";
import { z } from "zod";
import { getLanguageModel } from "../providers";

/**
 * Chart Fix Agent - 使用 LangGraph 实现的多轮修复智能体
 *
 * 功能：
 * 1. 验证 ECharts 配置的语义正确性
 * 2. 自动修复常见配置错误（如缺少 gridIndex）
 * 3. 多轮验证确保修复成功
 */

const MAX_REPAIR_ATTEMPTS = 3;

// 输入模式
export const chartFixInputSchema = z.object({
  rawOptionString: z.string().describe("ECharts 配置的 JSON 字符串"),
  agentTrace: z.string().default("ChartFixAgent"),
});

type ChartFixInput = z.infer<typeof chartFixInputSchema>;

// 修复结果模式
export const chartFixResultSchema = z.object({
  success: z.boolean(),
  fixedOptionString: z.string().nullable(),
  fixAttempts: z.number().nullable(),
  error: z.string().nullable(),
  repairLog: z.array(z.string()),
});

type ChartFixResult = z.infer<typeof chartFixResultSchema>;

// 验证 ECharts 配置的提示词
const VALIDATION_SYSTEM_PROMPT = `You are an ECharts configuration validation expert.

Your task is to validate and fix semantic errors in ECharts configurations.

## Common Error Types

### 1. Multi-grid Layout Issues (Most Common)
- When configuring multiple grids, each xAxis/yAxis must specify gridIndex
- gridIndex starts from 0, corresponding to the grid array index
- series xAxisIndex/yAxisIndex must also be correctly linked

### 2. Axis Type Mismatch
- category type xAxis requires data array
- value type axes do not need data array
- time axis requires special data format

### 3. Missing Series Configuration
- Each series must have a type property
- Pie charts do not require xAxis/yAxis
- Scatter charts require two numeric axes

## Validation Steps

1. Parse the JSON configuration
2. Check grid array length
3. Check xAxis/yAxis array length and gridIndex
4. Check if series xAxisIndex/yAxisIndex are valid
5. Verify required fields exist

## Output Format

Please return the following JSON format:
{
  "isValid": true/false,
  "errors": ["error description 1", "error description 2"],
  "fixedOption": "fixed JSON string (if fixing is needed)"
}

Only return JSON, nothing else.`;

const VALIDATION_USER_PROMPT = `Please validate and fix the following ECharts configuration:

{option}

{context}`;

// 修复配置
async function repairOption(
  optionString: string,
  repairAttempts: number,
  repairLog: string[]
): Promise<{ fixedOption: string | null; error: string | null }> {
  const context =
    repairAttempts > 0
      ? `This is repair attempt ${repairAttempts + 1}. The previous fix may be incomplete, please check carefully and ensure all issues are resolved.`
      : "Please check and fix any issues in the configuration.";

  const result = await generateText({
    model: getLanguageModel("deepseek-chat"),
    messages: [
      { role: "system", content: VALIDATION_SYSTEM_PROMPT },
      {
        role: "user",
        content: VALIDATION_USER_PROMPT.replace(
          "{option}",
          optionString
        ).replace("{context}", context),
      },
    ],
  });

  const content = result.text;
  repairLog.push(
    `[Repair attempt ${repairAttempts + 1}] Model response: ${content.substring(0, 200)}...`
  );

  // 提取 JSON
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    return {
      fixedOption: null,
      error: "Cannot extract JSON from model response",
    };
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]);

    if (!parsed.isValid && !parsed.fixedOption) {
      return {
        fixedOption: null,
        error: parsed.errors?.join(", ") ?? "Configuration validation failed",
      };
    }

    if (parsed.fixedOption) {
      // 验证修复后的配置是否是有效 JSON
      try {
        const validated = JSON.parse(parsed.fixedOption);
        // 额外验证：确保必要的字段存在
        if (!validated.series || !Array.isArray(validated.series)) {
          return { fixedOption: null, error: "Fixed config missing series" };
        }
        return { fixedOption: parsed.fixedOption, error: null };
      } catch {
        return { fixedOption: null, error: "Fixed option is not valid JSON" };
      }
    }

    // 配置有效，无需修复
    return { fixedOption: optionString, error: null };
  } catch (e) {
    const errorMessage =
      e instanceof Error ? e.message : "Failed to parse fix result";
    return { fixedOption: null, error: errorMessage };
  }
}

// 主修复函数
export async function fixChartOption(
  input: ChartFixInput
): Promise<ChartFixResult> {
  const { rawOptionString, agentTrace } = input;
  const repairLog: string[] = [];

  repairLog.push(`[${agentTrace}] Starting fix workflow`);
  repairLog.push(`Original option length: ${rawOptionString.length} chars`);

  // 步骤 1: 基础 JSON 验证
  let parsedOption: Record<string, unknown>;
  try {
    const cleaned = rawOptionString
      .replace(/```json/gi, "")
      .replace(/```/g, "")
      .trim();
    parsedOption = JSON.parse(cleaned);
    repairLog.push("[Step 1] ✅ JSON parse successful");
  } catch {
    repairLog.push("[Step 1] ❌ JSON parse failed");
    return {
      success: false,
      fixedOptionString: null,
      fixAttempts: null,
      error: "JSON format error, cannot parse",
      repairLog,
    };
  }

  // 步骤 2: 基础结构验证
  const gridCount = Array.isArray(parsedOption.grid)
    ? parsedOption.grid.length
    : 0;
  const xAxisCount = Array.isArray(parsedOption.xAxis)
    ? parsedOption.xAxis.length
    : 1;
  const yAxisCount = Array.isArray(parsedOption.yAxis)
    ? parsedOption.yAxis.length
    : 1;

  if (gridCount > 0) {
    repairLog.push(
      `[Step 2] Grid count: ${gridCount}, xAxis count: ${xAxisCount}, yAxis count: ${yAxisCount}`
    );
  }

  // 检查 xAxis/yAxis 数量与 grid 数量不匹配的问题
  let needsAutoFix = false;

  // 新增：检查 grid 布局配置是否完整
  if (gridCount > 0) {
    const grids = parsedOption.grid as Record<string, unknown>[];
    for (let i = 0; i < grids.length; i++) {
      const grid = grids[i];
      if (!grid.left || !grid.top || !grid.width || !grid.height) {
        repairLog.push(
          `❌ grid[${i}] missing position config (left/top/width/height required)`
        );
        needsAutoFix = true;
      }
    }
  }

  // 新增：检查 title 是否存在
  if (!parsedOption.title) {
    repairLog.push("❌ Missing title in option");
    needsAutoFix = true;
  }

  // 新增：检查 series 数量是否过多（可能导致布局混乱）
  if (Array.isArray(parsedOption.series) && parsedOption.series.length > 10) {
    repairLog.push(
      `⚠️ Too many series (${parsedOption.series.length}), may cause layout issues`
    );
  }

  if (gridCount > 1) {
    // 多 grid 布局：每个轴必须指定 gridIndex
    const xAxis = parsedOption.xAxis;
    const yAxis = parsedOption.yAxis;

    if (Array.isArray(xAxis)) {
      for (let i = 0; i < xAxis.length; i++) {
        const axis = xAxis[i] as Record<string, unknown>;
        if (axis.gridIndex === undefined) {
          repairLog.push(`[Step 2] ❌ xAxis[${i}] missing gridIndex`);
          needsAutoFix = true;
        } else if ((axis.gridIndex as number) >= gridCount) {
          repairLog.push(
            `❌ xAxis[${i}] gridIndex=${axis.gridIndex} out of range (max: ${gridCount - 1})`
          );
          needsAutoFix = true;
        }
      }
    }

    if (Array.isArray(yAxis)) {
      for (let i = 0; i < yAxis.length; i++) {
        const axis = yAxis[i] as Record<string, unknown>;
        if (axis.gridIndex === undefined) {
          repairLog.push(`[Step 2] ❌ yAxis[${i}] missing gridIndex`);
          needsAutoFix = true;
        } else if ((axis.gridIndex as number) >= gridCount) {
          repairLog.push(
            `❌ yAxis[${i}] gridIndex=${axis.gridIndex} out of range (max: ${gridCount - 1})`
          );
          needsAutoFix = true;
        }
      }
    }
  }

  // 检查 series 中的 xAxisIndex/yAxisIndex 是否超出范围
  const series = parsedOption.series;
  if (Array.isArray(series)) {
    for (let i = 0; i < series.length; i++) {
      const s = series[i] as Record<string, unknown>;

      if (s.xAxisIndex !== undefined) {
        const xAxisIndex = s.xAxisIndex as number;
        if (xAxisIndex >= xAxisCount) {
          repairLog.push(
            `❌ series[${i}] xAxisIndex=${xAxisIndex} out of range (max: ${xAxisCount - 1})`
          );
          needsAutoFix = true;
        }
      }

      if (s.yAxisIndex !== undefined) {
        const yAxisIndex = s.yAxisIndex as number;
        if (yAxisIndex >= yAxisCount) {
          repairLog.push(
            `❌ series[${i}] yAxisIndex=${yAxisIndex} out of range (max: ${yAxisCount - 1})`
          );
          needsAutoFix = true;
        }
      }
    }
  }

  if (needsAutoFix) {
    repairLog.push("[Step 2] Issues detected, calling fix agent");
  } else if (gridCount > 0) {
    repairLog.push("[Step 2] ✅ All configurations valid");
  }

  // 步骤 3: 使用 LLM 进行深度验证和修复
  let currentOption = rawOptionString;
  let attempts = 0;
  let lastError: string | null = null;

  while (attempts < MAX_REPAIR_ATTEMPTS) {
    const result = await repairOption(currentOption, attempts, repairLog);

    if (result.error) {
      lastError = result.error;
      attempts++;
      continue;
    }

    if (result.fixedOption) {
      if (result.fixedOption !== currentOption) {
        repairLog.push(`[Repair attempt ${attempts + 1}] ✅ Config fixed`);
        currentOption = result.fixedOption;
        break;
      }
      repairLog.push(
        `[Repair attempt ${attempts + 1}] ✅ Config already valid`
      );
      break;
    }

    attempts++;
  }

  if (lastError && attempts >= MAX_REPAIR_ATTEMPTS) {
    repairLog.push(`[Final result] ❌ Fix failed: ${lastError}`);
    return {
      success: false,
      fixedOptionString: null,
      fixAttempts: attempts,
      error: lastError,
      repairLog,
    };
  }

  repairLog.push(
    `[Final result] ✅ Fix successful (attempts: ${attempts + 1})`
  );
  return {
    success: true,
    fixedOptionString: currentOption,
    fixAttempts: attempts + 1,
    error: null,
    repairLog,
  };
}
