"use client";

import type { EChartsOption } from "echarts";
import ReactECharts from "echarts-for-react";
import { Maximize2, Minimize2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface ChartRendererProps {
  rawOptionString: string;
  agentTrace: string;
}

export function ChartRenderer({
  rawOptionString,
  agentTrace,
}: ChartRendererProps) {
  const [option, setOption] = useState<EChartsOption | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const workerRef = useRef<Worker | null>(null);
  const chartRef = useRef<HTMLDivElement>(null);

  // Handle fullscreen toggle
  const toggleFullscreen = () => {
    if (isFullscreen) {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    } else if (chartRef.current?.requestFullscreen) {
      chartRef.current.requestFullscreen();
    }
  };

  // Listen for fullscreen changes
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener("fullscreenchange", handleFullscreenChange);
    return () => {
      document.removeEventListener("fullscreenchange", handleFullscreenChange);
    };
  }, []);

  useEffect(() => {
    // Initialize Web Worker for background JSON processing
    try {
      const worker = new Worker("/json-worker.js");

      worker.onmessage = (e) => {
        console.log("[ChartRenderer] Received message from worker:", e.data);

        // Handle ready signal
        if (e.data.type === "ready") {
          console.log("[ChartRenderer] ✅ Worker initialized and ready");
          return;
        }

        if (e.data.success === true) {
          console.log("[ChartRenderer] ✅ Successfully parsed option");
          console.log("[ChartRenderer] Option data:", e.data.data);
          setOption(e.data.data);
          setError(null);
          setIsLoading(false);
        } else if (e.data.success === false) {
          console.error(
            "[ChartRenderer] ❌ Worker parsing failed:",
            e.data.error
          );
          setError(`数据清洗失败: ${e.data.error}`);
          setIsLoading(false);
        }
      };

      worker.onerror = (err) => {
        console.error("[ChartRenderer] ❌ Web Worker error:", err);
        setError("Web Worker 初始化失败，尝试直接解析...");

        // Fallback: try direct parsing
        if (rawOptionString) {
          try {
            const cleanedString = rawOptionString
              .replace(/```json|```/g, "")
              .trim();
            console.log(
              "[ChartRenderer] Fallback parsing:",
              cleanedString.substring(0, 200)
            );
            const parsedOption = JSON.parse(cleanedString);
            setOption(parsedOption);
            setError(null);
            setIsLoading(false);
          } catch (fallbackError) {
            console.error(
              "[ChartRenderer] Fallback parse failed:",
              fallbackError
            );
            setError("JSON 解析失败，请检查数据格式");
            setIsLoading(false);
          }
        }
      };

      workerRef.current = worker;
    } catch (workerInitError) {
      console.error(
        "[ChartRenderer] Failed to initialize worker:",
        workerInitError
      );
      setError("初始化失败");
      setIsLoading(false);
    }

    return () => {
      if (workerRef.current) {
        console.log("[ChartRenderer] Terminating worker");
        workerRef.current.terminate();
        workerRef.current = null;
      }
    };
  }, [rawOptionString]);

  useEffect(() => {
    if (rawOptionString && workerRef.current) {
      setIsLoading(true);
      console.log("[ChartRenderer] Sending data to worker:", {
        length: rawOptionString.length,
        preview: `${rawOptionString.substring(0, 200)}...`,
      });
      // Send dirty data to background thread for cleaning
      workerRef.current.postMessage({ rawData: rawOptionString });
    }
  }, [rawOptionString]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center gap-3 p-4 bg-blue-50 dark:bg-blue-950/30 rounded-lg border border-blue-200 dark:border-blue-800 mt-4">
        <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400">
          <svg
            className="animate-spin h-5 w-5"
            fill="none"
            viewBox="0 0 24 24"
            xmlns="http://www.w3.org/2000/svg"
          >
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
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              fill="currentColor"
            />
          </svg>
          <span className="text-sm font-medium">
            {agentTrace
              ? `AI Agent [${agentTrace}] 正在处理数据...`
              : "正在清洗数据并渲染图表..."}
          </span>
        </div>
      </div>
    );
  }

  // Error Boundary fallback UI
  if (error) {
    return (
      <div className="p-4 bg-red-50 dark:bg-red-950/30 text-red-600 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 mt-4">
        <div className="flex items-start gap-2">
          <svg
            className="h-5 w-5 shrink-0 mt-0.5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </svg>
          <div>
            <div className="font-medium text-sm">图表渲染失败</div>
            <div className="text-sm mt-1 opacity-90">{error}</div>
            <div className="text-xs mt-2 opacity-75">
              正在尝试让 AI 重新生成...
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Success: render the chart
  if (!option) {
    return null;
  }

  // Fullscreen container
  if (isFullscreen) {
    return (
      <div
        className="fixed inset-0 z-50 bg-white dark:bg-gray-950 p-4 flex flex-col"
        ref={chartRef}
      >
        {/* Header with close button */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            {agentTrace && (
              <span className="text-sm text-gray-600 dark:text-gray-400">
                AI Agent:{" "}
                <span className="font-medium text-gray-900 dark:text-gray-100">
                  {agentTrace}
                </span>
              </span>
            )}
          </div>
          <button
            aria-label="退出全屏"
            className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
            onClick={toggleFullscreen}
            type="button"
          >
            <Minimize2 className="w-5 h-5 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Chart in fullscreen */}
        <div className="flex-1">
          <ReactECharts
            lazyUpdate={true}
            notMerge={true}
            option={option}
            opts={{ renderer: "canvas" }}
            style={{ height: "100%", width: "100%" }}
          />
        </div>
      </div>
    );
  }

  // Normal container with fullscreen button
  return (
    <div
      className="w-full rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-950 shadow-sm mt-4 overflow-hidden"
      ref={chartRef}
    >
      <div className="flex items-center justify-between px-4 py-2 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        {agentTrace && (
          <span className="text-xs text-gray-600 dark:text-gray-400">
            由 AI Agent 生成:{" "}
            <span className="font-medium text-gray-900 dark:text-gray-100">
              {agentTrace}
            </span>
          </span>
        )}
        <button
          aria-label="展开全屏"
          className="p-1.5 rounded-md hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
          onClick={toggleFullscreen}
          type="button"
        >
          <Maximize2 className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>
      <div className="p-4">
        <ReactECharts
          lazyUpdate={true}
          notMerge={true}
          option={option}
          opts={{ renderer: "canvas" }}
          style={{ height: "400px", width: "100%" }}
        />
      </div>
    </div>
  );
}
