// DeepSeek models
export const DEFAULT_CHAT_MODEL = "deepseek/deepseek-chat";

export type ChatModel = {
  id: string;
  name: string;
  provider: string;
  description: string;
};

export const chatModels: ChatModel[] = [
  {
    id: "deepseek/deepseek-chat",
    name: "DeepSeek Chat",
    provider: "deepseek",
    description: "快速高效，适合日常任务",
  },
  {
    id: "deepseek/deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "deepseek",
    description: "高级推理，适合复杂问题",
  },
];

// Group models by provider for UI
export const modelsByProvider = chatModels.reduce(
  (acc, model) => {
    if (!acc[model.provider]) {
      acc[model.provider] = [];
    }
    acc[model.provider].push(model);
    return acc;
  },
  {} as Record<string, ChatModel[]>
);
