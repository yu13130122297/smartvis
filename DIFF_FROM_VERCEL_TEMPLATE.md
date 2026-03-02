# 与 Vercel AI Chatbot 模板的差异说明

本文档详细说明了 Smart-Viz 项目在 [Vercel AI Chatbot](https://github.com/vercel/ai-chatbot) 模板基础上所做的修改和新增功能。

---

## 📁 总体新增文件目录结构

```
smart-viz/ (相对于 Vercel 原模板的新增文件)

├── 🆕 lib/ai/
│   ├── tools/
│   │   ├── generate-chart.ts       # 单图表生成工具
│   │   └── generate-dashboard.ts   # 数据大屏生成工具
│   └── workflows/
│       └── chart-fix.ts            # AI 配置修复工作流
│
├── 🆕 components/smart-viz/
│   ├── ChartRenderer.tsx           # 单图表渲染组件
│   ├── DashboardRenderer.tsx         # 数据大屏渲染组件
│   └── index.ts                   # 导出文件
│
├── 🆕 public/
│   └── json-worker.js              # Web Worker JSON 清洗脚本
│
├── 🆕 artifacts/
│   ├── code/
│   │   ├── client.tsx             # 代码工件客户端
│   │   └── server.ts              # 代码工件服务端
│   ├── image/
│   │   └── client.tsx             # 图片工件客户端
│   ├── sheet/
│   │   ├── client.tsx             # 表格工件客户端
│   │   └── server.ts              # 表格工件服务端
│   └── text/
│       ├── client.tsx             # 文本工件客户端
│       └── server.ts             # 文本工件服务端
│
├── 🆕 docs/
│   ├── ARCHITECTURE.ts             # 架构设计文档
│   └── ...
│
├── 🆕 PROJECT_README.md            # 整合后的项目主文档
├── 🆕 DIFF_FROM_VERCEL_TEMPLATE.md # 本文档
├── 🆕 SMART_VIZ_USAGE.md          # 智能可视化使用说明
├── 🆕 IMPLEMENTATION_SUMMARY.md    # 实现总结
├── 🆕 BUGFIX_DEEPSEEK_SCHEMA.md   # DeepSeek Schema 修复记录
└── 🆕 JSON_PARSING_FIX.md         # JSON 解析修复记录
```

**图例**：
- 🆕 = 新增文件（相对于 Vercel AI Chatbot 原模板）
- ✏️ = 修改文件
- 📦 = 新增依赖包

---

## 📊 总览

| 类别 | 新增/修改 | 说明 |
|------|-----------|------|
| 核心功能 | ✅ 新增 | 智能数据可视化（单图表 + 数据大屏） |
| AI 工具 | ✅ 新增 | generateChart, generateDashboard, chart-fix |
| 组件 | ✅ 新增 | ChartRenderer, DashboardRenderer |
| 容错机制 | ✅ 新增 | Web Worker + 三层容错管线 |
| 依赖 | ✅ 新增 | echarts, echarts-for-react, @xyflow/react 等 |
| 文档 | ✅ 新增 | 使用文档、差异说明 |

---

## 🆕 新增功能

### 1. 智能单图表生成

**功能描述**：用户可以通过自然语言让 AI 生成各种类型的交互式图表

**示例输入**：
```
帮我画一个柱状图，展示苹果、香蕉、橘子的销量
绘制一个折线图显示温度变化趋势
用饼图展示市场份额
```

**核心文件**：
- `lib/ai/tools/generate-chart.ts` - AI 工具定义
- `components/smart-viz/ChartRenderer.tsx` - 图表渲染组件

**特性**：
- 支持 ECharts 所有图表类型
- AI 自动生成完整配置
- 深色/浅色主题自适应
- 全屏查看模式
- 流式加载状态显示

---

### 2. 数据大屏生成

**功能描述**：一次性生成包含多个图表的仪表盘

**示例输入**：
```
生成一个销售数据大屏，包含月度趋势、区域对比、产品分布等图表
```

**核心文件**：
- `lib/ai/tools/generate-dashboard.ts` - AI 工具定义
- `components/smart-viz/DashboardRenderer.tsx` - 大屏渲染组件

**特性**：
- 支持 2x2, 2x3, 3x2 等多种布局
- 自动检测布局冲突
- 每个图表独立容错和修复
- 响应式网格布局
- 图表间距可配置

---

### 3. AI 配置修复

**功能描述**：自动修复 ECharts 配置中的常见错误

**核心文件**：
- `lib/ai/workflows/chart-fix.ts` - AI 工作流

**修复内容**：
- 缺少必要的配置项（title, tooltip, legend 等）
- 数据格式错误
- 坐标轴配置问题
- 系列（series）配置错误

**使用场景**：
当 AI 生成的 ECharts 配置不完整或有问题时，自动调用此工具进行修复，提高成功率。

---

## 🛠️ 新增文件清单

### AI 工具和工作流

```
lib/ai/tools/
├── generate-chart.ts       # ✨ 新增：单图表生成工具
└── generate-dashboard.ts   # ✨ 新增：数据大屏生成工具

lib/ai/workflows/
└── chart-fix.ts            # ✨ 新增：AI 配置修复工作流
```

**关键代码示例** (generate-chart.ts):

```typescript
export const generateChart = tool({
  description: `当用户要求分析数据、绘制图表、可视化数据时调用此工具。
你需要输出完整的 ECharts option 配置对象的 JSON 字符串格式。`,

  inputSchema: z.object({
    rawOptionString: z.string().describe("完整的 ECharts option 对象的 JSON 字符串格式"),
    agentTrace: z.string().default("ChartRenderer").describe("Agent 名称"),
    skipFix: z.boolean().default(false).describe("是否跳过修复智能体验证"),
  }),

  execute: async ({ rawOptionString, agentTrace, skipFix }) => {
    // 验证 JSON 格式
    // 调用修复智能体（如果需要）
    // 返回修复后的配置
  },
});
```

---

### 前端组件

```
components/smart-viz/
├── ChartRenderer.tsx       # ✨ 新增：单图表渲染组件
├── DashboardRenderer.tsx   # ✨ 新增：大屏渲染组件
└── index.ts                # ✨ 新增：导出文件
```

**ChartRenderer.tsx 核心功能**：

1. **Web Worker 集成**
   - 后台线程解析 JSON
   - 不阻塞主线程
   - 自动容错和降级

2. **流式加载状态**
   ```tsx
   {isLoading && (
     <div className="loading-state">
       AI Agent [{agentTrace}] 正在处理数据...
     </div>
   )}
   ```

3. **错误处理**
   ```tsx
   {error && (
     <div className="error-state">
       图表渲染失败: {error}
     </div>
   )}
   ```

4. **全屏支持**
   - 全屏查看图表
   - 响应式布局

---

### Web Worker

```
public/
└── json-worker.js          # ✨ 新增：JSON 数据清洗 Worker
```

**功能**：
1. 清除 Markdown 代码块标记
2. 修复常见 JSON 格式错误
3. 多层级容错解析
4. 返回解析结果或错误信息

**核心代码**：
```javascript
// 1. 清理 markdown 标记
cleanedString = cleanedString.replace(/```json\s*/gi, '');
cleanedString = cleanedString.replace(/```\s*/g, '');

// 2. 修复常见问题
cleanedString = cleanedString.replace(/'/g, '"');
cleanedString = cleanedString.replace(/,(\s*[}\]])/g, '$1');

// 3. 尝试解析
try {
  return { success: true, data: JSON.parse(cleanedString) };
} catch (e) {
  // 降级处理
}
```

---

### 工件组件

```
artifacts/
├── code/
│   ├── client.tsx          # ✨ 新增：代码工件客户端
│   └── server.ts           # ✨ 新增：代码工件服务端
├── image/
│   └── client.tsx          # ✨ 新增：图片工件客户端
├── sheet/
│   ├── client.tsx          # ✨ 新增：表格工件客户端
│   └── server.ts           # ✨ 新增：表格工件服务端
└── text/
    ├── client.tsx          # ✨ 新增：文本工件客户端
    └── server.ts           # ✨ 新增：文本工件服务端
```

**功能**：支持 AI 生成不同类型的工件（代码、图片、表格、文本）

---

### 文档文件

```
├── PROJECT_README.md           # ✨ 新增：整合后的项目文档
├── DIFF_FROM_VERCEL_TEMPLATE.md # ✨ 新增：本差异说明文档
├── SMART_VIZ_USAGE.md          # ✨ 新增：使用说明
├── IMPLEMENTATION_SUMMARY.md    # ✨ 新增：实现总结
├── BUGFIX_DEEPSEEK_SCHEMA.md   # ✨ 新增：DeepSeek Schema 修复说明
└── JSON_PARSING_FIX.md         # ✨ 新增：JSON 解析修复说明
```

---

## 🔧 修改的文件

### 1. `app/(chat)/api/chat/route.ts`

**修改内容**：在 AI 工具列表中注册新工具

**修改前**：
```typescript
const tools = {
  createDocument,
  // ... 其他工具
};
```

**修改后**：
```typescript
const tools = {
  createDocument,
  generateChart,      // ✨ 新增
  generateDashboard,  // ✨ 新增
  // ... 其他工具
};
```

---

### 2. `components/message.tsx`

**修改内容**：集成图表渲染组件

**修改位置**：在消息渲染逻辑中添加对 `generateChart` 和 `generateDashboard` 的处理

**新增代码**：
```tsx
// 渲染图表
{output.toolName === 'generateChart' && (
  <ChartRenderer
    rawOptionString={output.rawOptionString}
    agentTrace={output.agentTrace || 'ChartRenderer'}
  />
)}

// 渲染大屏
{output.toolName === 'generateDashboard' && (
  <DashboardRenderer
    title={output.title}
    charts={output.charts}
    layout={output.layout}
  />
)}
```

---

### 3. `lib/types.ts`

**修改内容**：添加新工具的类型定义

**新增类型**：
```typescript
export interface GenerateChartOutput {
  rawOptionString: string;
  agentTrace: string;
  fixApplied?: boolean;
  fixAttempts?: number;
  fixError?: string;
}

export interface GenerateDashboardOutput {
  title: string;
  description?: string;
  layout: DashboardLayout;
  charts: DashboardChart[];
  agentTrace: string;
  totalFixes: number;
  errors?: Array<{ chartId: string; error: string }>;
}
```

---

### 4. `package.json`

**新增依赖**：

```json
{
  "dependencies": {
    "@ai-sdk/deepseek": "^2.0.20",           // ✨ 新增
    "@ai-sdk/openai": "^3.0.36",             // ✨ 新增
    "@ai-sdk/openai-compatible": "^2.0.30",   // ✨ 新增
    "@langchain/langgraph": "^1.2.0",         // ✨ 新增
    "@xyflow/react": "^12.10.0",              // ✨ 新增
    "echarts": "^6.0.0",                     // ✨ 新增
    "echarts-for-react": "^3.0.6",            // ✨ 新增
    "jsonrepair": "^3.13.2",                 // ✨ 新增
    "react-data-grid": "7.0.0-beta.47",       // ✨ 新增
    "diff-match-patch": "^1.0.5",             // ✨ 新增
    "orderedmap": "^2.1.1",                   // ✨ 新增
    "papaparse": "^5.5.2",                    // ✨ 新增
    "prosemirror-*": "*",                     // ✨ 新增（多个）
    // ... 其他依赖
  }
}
```

---

## 🏗️ 架构改进

### 原始架构

```
User Input → LLM → Tool Call → Display Text
```

### 新增架构

```
User Input 
    ↓
LLM (DeepSeek/OpenAI/xAI)
    ↓
Tool Call (generateChart/generateDashboard)
    ↓
AI Fix (chart-fix workflow) [可选]
    ↓
Frontend Component (ChartRenderer/DashboardRenderer)
    ↓
Web Worker (json-worker.js) → 清洗和修复 JSON
    ↓
ECharts Rendering
```

**核心改进**：
1. **AI 工具扩展**：从纯文本输出扩展到可视化工具
2. **智能体编排**：多智能体协作（生成 + 修复）
3. **容错机制**：三层容错确保稳定性
4. **流式体验**：实时显示处理状态

---

## 📦 新增依赖包

### 图表相关

| 包名 | 版本 | 用途 |
|------|------|------|
| `echarts` | ^6.0.0 | 图表库 |
| `echarts-for-react` | ^3.0.6 | React ECharts 组件封装 |

### AI 相关

| 包名 | 版本 | 用途 |
|------|------|------|
| `@ai-sdk/deepseek` | ^2.0.20 | DeepSeek 提供者 |
| `@ai-sdk/openai` | ^3.0.36 | OpenAI 提供者 |
| `@ai-sdk/openai-compatible` | ^2.0.30 | OpenAI 兼容接口 |
| `@langchain/langgraph` | ^1.2.0 | AI 智能体编排 |

### 工具库

| 包名 | 版本 | 用途 |
|------|------|------|
| `jsonrepair` | ^3.13.2 | JSON 修复 |
| `diff-match-patch` | ^1.0.5 | 文本差异比较 |
| `papaparse` | ^5.5.2 | CSV 解析 |

### 编辑器相关

| 包名 | 版本 | 用途 |
|------|------|------|
| `@codemirror/*` | * | 代码编辑器 |
| `prosemirror-*` | * | 富文本编辑器 |

### UI 组件

| 包名 | 版本 | 用途 |
|------|------|------|
| `@xyflow/react` | ^12.10.0 | 流程图组件 |
| `react-data-grid` | 7.0.0-beta.47 | 数据表格 |

---

## 🎨 UI/UX 改进

### 新增交互功能

1. **全屏查看**
   - 图表支持全屏模式
   - 大屏支持全屏模式
   - 键盘快捷键支持

2. **流式加载**
   - 显示 AI Agent 处理状态
   - 渐进式内容加载
   - 实时反馈

3. **错误处理**
   - 优雅的错误提示
   - 降级 UI 展示
   - 重试引导

4. **主题适配**
   - 深色/浅色主题自动切换
   - 图表颜色自适应

---

## 🔒 容错机制

### 三层容错架构

**Layer 1: Web Worker**
```javascript
// public/json-worker.js
// 在后台线程中清洗数据
try {
  // 直接解析
  return JSON.parse(cleanedString);
} catch {
  // 清洗后重试
  // 正则提取
  // Function 构造器
}
```

**Layer 2: 主线程降级**
```typescript
// components/smart-viz/ChartRenderer.tsx
worker.onerror = () => {
  // Worker 失败，直接在主线程解析
  const parsedOption = JSON.parse(cleanedString);
  setOption(parsedOption);
};
```

**Layer 3: Error Boundary**
```tsx
// 兜底 UI
{error && (
  <div className="error-boundary">
    图表渲染失败，正在尝试让 AI 重新生成...
  </div>
)}
```

---

## 📝 修复记录

### 1. DeepSeek Schema 兼容性问题

**问题**：
```
Error: schema must be a JSON Schema of 'type: "object"', got 'type: null'.
```

**原因**：使用 `.optional()` 导致 Schema 类型不是 object

**解决方案**：
```typescript
// ❌ 错误
agentTrace: z.string().optional()

// ✅ 正确
agentTrace: z.string().default('ChartRenderer')
```

**文档**：`BUGFIX_DEEPSEEK_SCHEMA.md`

---

### 2. JSON 解析问题

**问题**：Web Worker 无法加载外部 ESM 模块

**解决方案**：
- 移除对 `jsonrepair` 库的依赖
- 实现内置的 JSON 清洗逻辑
- 多层级容错解析

**文档**：`JSON_PARSING_FIX.md`

---

## 🚀 性能优化

### Web Worker 优化

**优化前**：
- 主线程直接解析 JSON
- 可能阻塞 UI
- 大数据量时卡顿

**优化后**：
- 后台线程解析
- 主线程保持响应
- 流畅的用户体验

### 流式渲染

**优化前**：
- 等待完整响应后显示
- 用户不知道进度

**优化后**：
- 实时显示处理状态
- 渐进式内容加载
- 更好的用户反馈

---

## 📚 文档完善

### 新增文档

1. **PROJECT_README.md** - 整合后的完整项目文档
2. **DIFF_FROM_VERCEL_TEMPLATE.md** - 本文档，详细说明差异
3. **SMART_VIZ_USAGE.md** - 智能可视化功能使用说明
4. **IMPLEMENTATION_SUMMARY.md** - 实现总结
5. **BUGFIX_DEEPSEEK_SCHEMA.md** - DeepSeek Schema 问题修复记录
6. **JSON_PARSING_FIX.md** - JSON 解析问题修复记录

---

## 🎯 关键差异总结

| 方面 | Vercel 原模板 | Smart-Viz |
|------|--------------|-----------|
| 核心功能 | 文本对话 | 文本对话 + 数据可视化 |
| AI 工具 | 文档、代码等 | + 图表生成、大屏生成 |
| 容错机制 | 基础错误处理 | 三层容错管线 |
| 渲染能力 | Markdown、代码 | + ECharts 图表 |
| AI 能力 | 单模型对话 | 多智能体协作（生成+修复） |
| 依赖包 | 基础 AI SDK | + ECharts、LangGraph 等 |
| 文档 | 基础 README | 完整的使用文档和差异说明 |

---

## 🔍 迁移指南

如果你正在使用 Vercel AI Chatbot 原模板，可以按以下步骤升级到 Smart-Viz：

### 1. 安装新依赖

```bash
pnpm add echarts echarts-for-react @ai-sdk/deepseek @ai-sdk/openai @langchain/langgraph
```

### 2. 复制新增文件

```
lib/ai/tools/generate-chart.ts
lib/ai/tools/generate-dashboard.ts
lib/ai/workflows/chart-fix.ts
components/smart-viz/
public/json-worker.js
```

### 3. 修改现有文件

- `app/(chat)/api/chat/route.ts` - 注册新工具
- `components/message.tsx` - 集成图表渲染
- `lib/types.ts` - 添加类型定义

### 4. 配置环境变量

```bash
# 添加 DeepSeek API Key
DEEPSEEK_API_KEY=your-key
```

### 5. 测试

```bash
pnpm dev
# 在聊天框测试图表生成
```

---

## 📞 问题反馈

如果在升级过程中遇到问题：

1. 查看本文档的"修复记录"部分
2. 查看各个 `*_FIX.md` 文件
3. 提交 Issue 到项目仓库

---

## ✅ 验证清单

使用 Smart-Viz 前请确认：

- [x] 已安装所有新增依赖
- [x] 已配置环境变量（DEEPSEEK_API_KEY 或其他）
- [x] 已执行数据库迁移
- [x] 开发服务器正常运行
- [x] 可以测试基本的图表生成功能

---

🎉 **恭喜！现在你已经了解了 Smart-Viz 与 Vercel 原模板的所有差异。**