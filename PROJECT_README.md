# Smart-Viz: 智能数据可视化聊天机器人

> 基于 Vercel AI SDK 和 Next.js 的 AI 聊天机器人，支持智能数据可视化功能

---

## 📋 项目概述

Smart-Viz 是一个功能强大的 AI 聊天机器人平台，在 [Vercel AI Chatbot](https://chat.vercel.ai) 模板基础上，新增了**智能数据可视化**功能。用户可以通过自然语言直接生成各种图表和数据大屏。

### 核心特性

#### 🤖 AI 聊天能力
- **多模型支持**：集成 DeepSeek、OpenAI、xAI 等多种 LLM
- **流式响应**：实时的 AI 对话体验
- **工具调用**：支持 AI 调用各种工具（图表生成、文档创建等）
- **上下文记忆**：保存对话历史，支持多轮对话

#### 📊 智能数据可视化
- **自然语言生成图表**：用简单的文字描述即可生成专业图表
  ```bash
  用户输入："帮我画一个柱状图，展示苹果、香蕉、橘子的销量"
  AI 输出：完整的交互式 ECharts 图表
  ```

- **支持多种图表类型**：柱状图、折线图、饼图、散点图、雷达图、热力图等
- **数据大屏生成**：一键生成包含多个图表的仪表盘
- **智能容错**：三层容错机制确保即使 AI 输出格式错误也能正常工作
- **AI 辅助修复**：自动修复 ECharts 配置错误

#### 🎨 用户体验
- **响应式设计**：完美适配桌面和移动端
- **深色/浅色主题**：自动适应系统主题
- **全屏交互**：图表支持全屏查看和缩放
- **流式加载**：实时显示 AI 处理进度

---

## 🏗️ 技术架构

### 技术栈

**前端**
- Next.js 16 + React 19 + TypeScript
- shadcn/ui (基于 Radix UI)
- Tailwind CSS 4
- ECharts + echarts-for-react
- CodeMirror (代码编辑器)

**后端**
- Vercel AI SDK 6.0
- NextAuth.js v5 (认证)
- Drizzle ORM (数据库)
- PostgreSQL (Neon Serverless Postgres)

**AI 能力**
- Vercel AI SDK (统一接口)
- DeepSeek / OpenAI / xAI 模型
- LangGraph (智能体编排)

### 架构图

```
┌─────────────────────────────────────────────────────────┐
│                      用户输入层                           │
│  "帮我画一个柱状图，展示苹果、香蕉、橘子的销量"             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                  AI 推理层 (LLM)                         │
│  - 分析用户意图                                          │
│  - 识别需要调用 generateChart/generateDashboard 工具     │
│  - 生成 ECharts option JSON                             │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   Tool 执行层                            │
│  generateChart({ rawOptionString, agentTrace })        │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   AI 配置修复层                          │
│  fixChartOption - 自动修复常见配置错误                  │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│                   前端渲染层                             │
│  ChartRenderer / DashboardRenderer                     │
└────────────────────┬────────────────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────────────────┐
│            Web Worker 容错层 (json-worker.js)           │
│  步骤 1: 清除 markdown 标记 (```json, ```)             │
│  步骤 2: 尝试直接 JSON.parse()                         │
│  步骤 3: 失败则调用内置修复逻辑                         │
│  步骤 4: 验证并返回结果                                 │
└────────────────────┬────────────────────────────────────┘
                     │
             ┌───────┴───────┐
             │               │
          Success        Failure
             │               │
             ▼               ▼
    ┌────────────────┐  ┌────────────────┐
    │  返回解析后的   │  │  返回错误信息    │
    │  ECharts option│  │  触发容错 UI     │
    └────────┬───────┘  └────────┬───────┘
             │                     │
             ▼                     ▼
    ┌────────────────┐      ┌──────────────┐
    │ 图表渲染层      │      │ Error Boundary│
    │ ReactECharts   │      │ 优雅降级 UI    │
    └────────────────┘      └──────────────┘
```

---

## 🚀 快速开始

### 环境要求

- Node.js 18+
- pnpm 9+

### 安装依赖

```bash
pnpm install
```

### 配置环境变量

复制 `.env.example` 到 `.env.local` 并配置：

```bash
# AI 模型配置（三选一）
OPENAI_API_KEY=your-openai-api-key
DEEPSEEK_API_KEY=your-deepseek-api-key
AI_GATEWAY_API_KEY=your-vercel-ai-gateway-key

# 数据库配置
POSTGRES_URL=your-postgres-url
POSTGRES_PRISMA_URL=your-postgres-prisma-url

# 认证配置
NEXTAUTH_SECRET=your-nextauth-secret
NEXTAUTH_URL=http://localhost:3000

# 文件存储（可选）
BLOB_READ_WRITE_TOKEN=your-vercel-blob-token
```

### 数据库迁移

```bash
pnpm db:migrate
```

### 启动开发服务器

```bash
pnpm dev
```

访问 http://localhost:3000

---

## 📖 使用指南

### 基础聊天

直接在聊天框中输入问题，AI 会实时回复：

```
你好，介绍一下你自己
帮我写一段 Python 代码计算斐波那契数列
```

### 生成图表

#### 单个图表

```markdown
1. 帮我画一个柱状图，展示苹果、香蕉、橘子的销量（随便编造点数据）

2. 绘制一个折线图，显示 2024 年 1-6 月的用户增长趋势，数据可以随机生成

3. 用饼图展示市场份额：产品 A 40%, 产品 B 30%, 产品 C 20%, 其他 10%

4. 画一个双 Y 轴的柱状图和折线图组合，展示销售额和订单量的关系

5. 绘制雷达图，对比我们产品和竞品在五个维度上的表现
```

#### 数据大屏

```markdown
帮我生成一个销售数据大屏，包含：
- 左上：月度销售额趋势图
- 右上：各区域销售额对比
- 左下：产品分类饼图
- 右下：客户来源分布
```

### 其他 AI 工具

- **文档创建**：创建和管理文档
- **代码编辑**：生成和编辑代码
- **文件上传**：上传图片、PDF 等文件进行分析
- **历史记录**：查看和管理对话历史

---

## 🔧 核心功能详解

### 1. 智能图表生成 (generateChart)

**功能**：AI 分析用户需求，生成 ECharts 配置

**输入**：
- `rawOptionString`: ECharts option JSON 字符串
- `agentTrace`: Agent 名称（默认 "ChartRenderer"）
- `skipFix`: 是否跳过配置修复

**流程**：
1. 验证 JSON 格式
2. 调用 AI 修复智能体（可选）
3. 返回修复后的配置

**文件位置**：`lib/ai/tools/generate-chart.ts`

### 2. 数据大屏生成 (generateDashboard)

**功能**：一次生成多个图表的仪表盘

**输入**：
- `title`: 大屏标题
- `layout`: 网格布局配置
- `charts`: 图表列表（1-12 个）
- 每个图表包含：
  - `id`: 唯一标识
  - `title`: 图表标题
  - `rawOptionString`: ECharts 配置
  - `gridPosition`: 位置和大小

**特性**：
- 自动检测布局冲突
- 每个图表独立修复
- 支持多种布局模板（2x2, 2x3, 3x2）

**文件位置**：`lib/ai/tools/generate-dashboard.ts`

### 3. 配置修复 (chart-fix)

**功能**：AI 自动修复 ECharts 配置错误

**修复内容**：
- 缺少必要属性
- 数据格式错误
- 配置冲突
- 语法错误

**文件位置**：`lib/ai/workflows/chart-fix.ts`

### 4. 容错管线

**三层容错机制**：

1. **Web Worker 容错**
   - 后台线程清洗数据
   - 修复常见 JSON 格式错误
   - 不阻塞主线程

2. **主线程降级**
   - Worker 失败时直接解析
   - 提供更友好的错误提示

3. **Error Boundary**
   - 兜底 UI 组件
   - 防止页面崩溃
   - 引导用户重新生成

**文件位置**：
- Worker: `public/json-worker.js`
- 组件: `components/smart-viz/ChartRenderer.tsx`

---

## 📁 项目结构

```
smart-viz/
├── app/
│   ├── (auth)/                 # 认证相关页面
│   │   ├── login/
│   │   ├── register/
│   │   └── api/                # 认证 API
│   └── (chat)/                 # 聊天界面
│       ├── api/
│       │   ├── chat/           # 聊天流式接口
│       │   ├── document/       # 文档管理
│       │   ├── files/          # 文件上传
│       │   └── history/        # 历史记录
│       └── chat/[id]/          # 聊天页面
│
├── lib/
│   ├── ai/
│   │   ├── tools/              # AI 工具
│   │   │   ├── generate-chart.ts      # ✨ 新增：单图表生成
│   │   │   ├── generate-dashboard.ts  # ✨ 新增：大屏生成
│   │   │   ├── create-document.ts
│   │   │   └── ...
│   │   ├── workflows/          # AI 工作流
│   │   │   └── chart-fix.ts           # ✨ 新增：配置修复
│   │   └── providers.ts        # AI 提供者配置
│   ├── db/                     # 数据库
│   │   ├── schema.ts
│   │   └── migrations/
│   └── types.ts                # TypeScript 类型
│
├── components/
│   ├── smart-viz/              # ✨ 新增：可视化组件
│   │   ├── ChartRenderer.tsx   # 单图表渲染
│   │   ├── DashboardRenderer.tsx # 大屏渲染
│   │   └── index.ts
│   ├── ai-elements/            # AI 元素组件
│   ├── ui/                     # UI 基础组件
│   └── message.tsx             # 消息渲染（集成图表）
│
├── artifacts/                  # 工件
│   ├── code/                   # 代码工件
│   ├── image/                  # 图片工件
│   ├── sheet/                  # 表格工件
│   └── text/                   # 文本工件
│
├── public/
│   ├── json-worker.js          # ✨ 新增：Web Worker
│   └── images/
│
├── hooks/                      # 自定义 Hooks
├── tests/                      # 测试
│   ├── e2e/                    # E2E 测试
│   └── pages/                  # 页面测试
│
├── docs/                       # 文档
├── .env.example                # 环境变量示例
├── PROJECT_README.md           # 本文档
├── DIFF_FROM_VERCEL_TEMPLATE.md # ✨ 新增：差异说明
└── package.json
```

---

## 🧪 测试

### 运行测试

```bash
# E2E 测试
pnpm test
```

### 手动测试流程

1. **启动开发服务器**
   ```bash
   pnpm dev
   ```

2. **打开浏览器**
   访问 http://localhost:3000

3. **登录或访客模式**
   - 注册账号登录，或
   - 使用访客模式

4. **测试图表生成**
   ```
   帮我画一个柱状图，展示苹果、香蕉、橘子的销量
   ```

5. **测试数据大屏**
   ```
   生成一个销售数据大屏，包含 4 个图表
   ```

6. **检查控制台**
   - 按 F12 打开开发者工具
   - 查看 `[ChartRenderer]` 和 `[Worker]` 日志

---

## 🛠️ 开发指南

### 代码规范

```bash
# 检查代码
pnpm lint

# 格式化代码
pnpm format
```

### 数据库操作

```bash
# 生成迁移
pnpm db:generate

# 执行迁移
pnpm db:migrate

# 打开数据库管理界面
pnpm db:studio

# 推送 schema 到数据库
pnpm db:push

# 检查数据库
pnpm db:check
```

### 添加新的图表类型

1. 编辑 `lib/ai/tools/generate-chart.ts`，在 description 中添加新类型
2. 在提示词中引导 AI 生成对应配置
3. 在 `components/smart-viz/ChartRenderer.tsx` 中测试渲染

### 接入真实后端 API

编辑 `lib/ai/tools/generate-chart.ts` 的 `execute` 函数：

```typescript
execute: async ({ rawOptionString, agentTrace }) => {
  // 调用你的后端 API
  const response = await fetch('https://your-backend.com/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ rawOptionString, agentTrace }),
  });
  
  const result = await response.json();
  return result;
},
```

---

## 🐛 故障排除

### 问题 1：图表不显示

**原因**：可能是大模型返回的 JSON 格式错误

**解决**：
1. 打开浏览器控制台（F12）
2. 查找 `[ChartRenderer]` 和 `[Worker]` 日志
3. 检查错误信息

### 问题 2：Web Worker 报错

**原因**：Worker 文件加载失败

**解决**：
1. 检查 `public/json-worker.js` 是否存在
2. 访问 `http://localhost:3000/json-worker.js` 确认可访问
3. 组件会自动降级到主线程解析

### 问题 3：DeepSeek API Schema 错误

**原因**：使用了 `.optional()` 导致 Schema 类型不是 object

**解决**：
- 使用 `.default()` 代替 `.optional()`
- 参考 `BUGFIX_DEEPSEEK_SCHEMA.md`

### 问题 4：JSON 解析失败

**原因**：LLM 输出的 JSON 格式不正确

**解决**：
- Web Worker 会自动尝试修复
- 如果失败，会显示友好的错误提示
- 可以让 AI 重新生成

---

## 📚 相关文档

- [差异说明](DIFF_FROM_VERCEL_TEMPLATE.md) - 与 Vercel 原模板的差异
- [ECharts 配置项手册](https://echarts.apache.org/zh/option.html)
- [Vercel AI SDK 文档](https://sdk.vercel.ai/docs)
- [Next.js 文档](https://nextjs.org/docs)
- [DeepSeek API 文档](https://platform.deepseek.com/api-docs/)

---

## 🚀 部署

### Vercel 部署

1. Fork 本仓库到你的 GitHub
2. 在 Vercel 中导入项目
3. 配置环境变量
4. 点击 Deploy

### 其他平台

```bash
# 构建
pnpm build

# 启动
pnpm start
```

---

## 📄 许可证

MIT License - 详见 [LICENSE](LICENSE)

---

## 🙏 致谢

- [Vercel AI Chatbot](https://chat.vercel.ai) - 原始模板
- [Vercel AI SDK](https://sdk.vercel.ai) - AI 开发框架
- [ECharts](https://echarts.apache.org/) - 图表库
- [shadcn/ui](https://ui.shadcn.com) - UI 组件库

---

## 📮 联系方式

如有问题或建议，欢迎提交 Issue 或 Pull Request！

---

🎉 **开始使用 Smart-Viz，体验 AI 驱动的智能数据可视化！**