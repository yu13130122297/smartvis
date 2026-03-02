"use client";

import type { EChartsOption } from "echarts";
import type { EChartsInstance } from "echarts-for-react";
import ReactECharts from "echarts-for-react";
import { Grid3X3, Maximize2, Minimize2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

// 类型定义
export interface GridPosition {
  col: number;
  row: number;
  colSpan: number;
  rowSpan: number;
}

export interface DashboardChart {
  id: string;
  title: string;
  rawOptionString: string;
  gridPosition: GridPosition;
  fixApplied?: boolean;
  fixError?: string;
}

export interface DashboardLayout {
  columns: number;
  rows: number;
  gap: number;
}

export interface DashboardRendererProps {
  title: string;
  description?: string;
  layout: DashboardLayout;
  charts: DashboardChart[];
  agentTrace?: string;
}

// 单个图表卡片组件
function ChartCard({ chart }: { chart: DashboardChart }) {
  const [option, setOption] = useState<EChartsOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);
  const workerRef = useRef<Worker | null>(null);
  const chartRef = useRef<EChartsInstance | null>(null);

  const resizeChart = useCallback(() => {
    if (chartRef.current) {
      chartRef.current.resize();
    }
  }, []);

  // 全屏切换
  const toggleFullscreen = () => {
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } else if (cardRef.current?.requestFullscreen) {
      cardRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      const nowFullscreen = document.fullscreenElement === cardRef.current;
      setIsFullscreen(nowFullscreen);

      // 退出全屏时需要多次延迟 resize，确保 DOM 布局完全恢复后再计算尺寸
      setTimeout(resizeChart, 50);
      setTimeout(resizeChart, 200);
      setTimeout(resizeChart, 500);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, [resizeChart]);

  // Web Worker 解析 JSON
  useEffect(() => {
    const initWorker = () => {
      try {
        const worker = new Worker("/json-worker.js");

        worker.onmessage = (e) => {
          if (e.data.type === "ready") {
            return;
          }

          if (e.data.success === true) {
            setOption(e.data.data);
            setError(null);
          } else if (e.data.success === false) {
            setError(e.data.error ?? "解析失败");
          }
          setIsLoading(false);
        };

        worker.onerror = () => {
          // Fallback: 直接解析
          try {
            const cleaned = chart.rawOptionString
              .replace(/```json|```/g, "")
              .trim();
            const parsed = JSON.parse(cleaned);
            setOption(parsed);
            setError(null);
          } catch {
            setError("JSON 解析失败");
          }
          setIsLoading(false);
        };

        workerRef.current = worker;
      } catch {
        setIsLoading(false);
        setError("Worker 初始化失败");
      }
    };

    initWorker();

    return () => {
      if (workerRef.current) {
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [chart.rawOptionString]);

  // 发送数据到 Worker
  useEffect(() => {
    if (chart.rawOptionString && workerRef.current) {
      setIsLoading(true);
      workerRef.current.postMessage({ rawData: chart.rawOptionString });
    }
  }, [chart.rawOptionString]);

  // 加载状态
  if (isLoading) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[200px] bg-gray-50 dark:bg-gray-900 rounded-lg"
        style={{ minHeight: "200px" }}
      >
        <div className="flex items-center gap-2 text-gray-500">
          <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm">加载中...</span>
        </div>
      </div>
    );
  }

  // 错误状态
  if (error) {
    return (
      <div
        className="flex items-center justify-center h-full min-h-[200px] bg-red-50 dark:bg-red-950/30 rounded-lg p-4"
        style={{ minHeight: "200px" }}
      >
        <div className="text-center">
          <div className="text-red-500 text-sm font-medium">图表加载失败</div>
          <div className="text-red-400 text-xs mt-1">{error}</div>
        </div>
      </div>
    );
  }

  // 统一渲染：通过 CSS 类控制全屏样式，避免组件重新挂载
  return (
    <div
      ref={cardRef}
      className={`h-full flex flex-col bg-white dark:bg-gray-950 rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden ${
        isFullscreen ? "fixed inset-0 z-[100] p-4" : ""
      }`}
    >
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-3 py-2 border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900">
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300 truncate">
          {chart.title}
        </span>
        <button
          aria-label={isFullscreen ? "退出全屏" : "全屏"}
          className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded transition-colors"
          onClick={toggleFullscreen}
          type="button"
        >
          {isFullscreen ? (
            <Minimize2 className="w-4 h-4 text-gray-500" />
          ) : (
            <Maximize2 className="w-4 h-4 text-gray-500" />
          )}
        </button>
      </div>

      {/* 图表区域 */}
      <div className="flex-1 p-2">
        {option && (
          <ReactECharts
            ref={(e) => {
              if (e) {
                chartRef.current = e.getEchartsInstance();
              }
            }}
            lazyUpdate
            notMerge
            option={option}
            opts={{ renderer: "canvas" }}
            style={{ height: "100%", width: "100%" }}
          />
        )}
      </div>

      {/* 修复标记 */}
      {chart.fixApplied && (
        <div className="absolute top-1 right-8">
          <span className="text-xs bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-400 px-1.5 py-0.5 rounded">
            已修复
          </span>
        </div>
      )}
    </div>
  );
}

// Dashboard 主组件
export function DashboardRenderer({
  title,
  description,
  layout,
  charts,
  agentTrace = "DashboardRenderer",
}: DashboardRendererProps) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const dashboardRef = useRef<HTMLDivElement>(null);

  const toggleFullscreen = () => {
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } else if (dashboardRef.current?.requestFullscreen) {
      dashboardRef.current.requestFullscreen();
    }
  };

  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === dashboardRef.current);

      // Dashboard 全屏状态变化后，通知所有子 ECharts 实例 resize
      const resizeAllCharts = () => {
        if (dashboardRef.current) {
          const canvases = dashboardRef.current.querySelectorAll("canvas");
          canvases.forEach((canvas) => {
            // 触发 window resize 事件让 echarts-for-react 自动处理
            // 但更可靠的方式是直接用 echarts 的 getInstanceByDom
            const parent = canvas.parentElement;
            if (parent) {
              const instance = (
                window as unknown as { echarts?: { getInstanceByDom?: (dom: HTMLElement) => EChartsInstance | undefined } }
              ).echarts?.getInstanceByDom?.(parent);
              instance?.resize();
            }
          });
        }
      };

      // 多次延迟 resize，确保布局完全恢复
      setTimeout(resizeAllCharts, 50);
      setTimeout(resizeAllCharts, 200);
      setTimeout(resizeAllCharts, 500);
    };
    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  // 计算 grid 模板 — 行高固定 280px，防止全屏退出后尺寸漂移
  const gridTemplateColumns = `repeat(${layout.columns}, 1fr)`;
  const gridTemplateRows = `repeat(${layout.rows}, 280px)`;

  // 统一渲染：通过 CSS 类控制全屏样式
  return (
    <div
      ref={dashboardRef}
      className={`w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 ${
        isFullscreen ? "fixed inset-0 z-50 overflow-auto" : "overflow-hidden"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="flex items-center gap-3">
          <Grid3X3 className="w-5 h-5 text-blue-500" />
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
              {title}
            </h3>
            {description && (
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {description}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">
            {charts.length} 个图表 · {layout.columns}x{layout.rows}
          </span>
          <button
            aria-label={isFullscreen ? "退出全屏" : "全屏"}
            className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
            onClick={toggleFullscreen}
            type="button"
          >
            {isFullscreen ? (
              <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            ) : (
              <Maximize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
            )}
          </button>
        </div>
      </div>

      {/* Agent 标记 */}
      <div className="px-4 py-1.5 bg-blue-50 dark:bg-blue-950/30 border-b border-blue-100 dark:border-blue-900">
        <span className="text-xs text-blue-600 dark:text-blue-400">
          由 AI Agent 生成:{" "}
          <span className="font-medium">{agentTrace}</span>
        </span>
      </div>

      {/* Charts Grid */}
      <div className="p-4">
        <div
          className="grid gap-4"
          style={{
            gridTemplateColumns,
            gridTemplateRows,
          }}
        >
          {charts.map((chart) => {
            const { col, row, colSpan, rowSpan } = chart.gridPosition;
            return (
              <div
                key={chart.id}
                className="overflow-hidden"
                style={{
                  gridColumn: `${col + 1} / span ${colSpan}`,
                  gridRow: `${row + 1} / span ${rowSpan}`,
                }}
              >
                <ChartCard chart={chart} />
              </div>
            );
          })}
        </div>
      </div>

      {/* Footer */}
      <div className="px-4 py-2 bg-gray-100 dark:bg-gray-900 border-t border-gray-200 dark:border-gray-800">
        <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <span>智能大屏渲染器 v1.0</span>
          <span>
            {charts.filter((c) => c.fixApplied).length} 个图表已自动修复
          </span>
        </div>
      </div>
    </div>
  );
}