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
    description: "Fast and efficient for everyday tasks",
  },
  {
    id: "deepseek/deepseek-reasoner",
    name: "DeepSeek Reasoner",
    provider: "deepseek",
    description: "Advanced reasoning for complex problems",
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
