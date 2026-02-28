import {
  createAnthropic,
  createAzure,
  createGoogleGenerativeAI,
  createOpenAI,
} from "@ai-sdk/openai";
import {
  customProvider,
  extractReasoningMiddleware,
  wrapLanguageModel,
} from "ai";
import { createDeepSeek } from "@ai-sdk/deepseek";
import { isTestEnvironment } from "../constants";

const THINKING_SUFFIX_REGEX = /-thinking$/;

// DeepSeek provider
const deepseek = createDeepSeek({
  apiKey: process.env.DEEPSEEK_API_KEY,
});

export const myProvider = isTestEnvironment
  ? (() => {
      const {
        artifactModel,
        chatModel,
        reasoningModel,
        titleModel,
      } = require("./models.mock");
      return customProvider({
        languageModels: {
          "chat-model": chatModel,
          "chat-model-reasoning": reasoningModel,
          "title-model": titleModel,
          "artifact-model": artifactModel,
        },
      });
    })()
  : null;

export function getLanguageModel(modelId: string) {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel(modelId);
  }

  // Remove provider prefix if present (e.g., "deepseek/deepseek-chat" -> "deepseek-chat")
  const actualModelId = modelId.includes("/") ? modelId.split("/")[1] : modelId;

  // Debug logging
  console.log("[DeepSeek Debug] Requested modelId:", modelId);
  console.log("[DeepSeek Debug] Actual modelId:", actualModelId);
  console.log("[DeepSeek Debug] API Key exists:", !!process.env.DEEPSEEK_API_KEY);
  console.log("[DeepSeek Debug] API Key prefix:", process.env.DEEPSEEK_API_KEY?.substring(0, 10) + "...");

  const isReasoningModel =
    actualModelId.includes("reasoning") || actualModelId.endsWith("-thinking");

  if (isReasoningModel) {
    const deepseekModelId = actualModelId.replace(THINKING_SUFFIX_REGEX, "");
    console.log("[DeepSeek Debug] Using reasoning model:", deepseekModelId);

    return wrapLanguageModel({
      model: deepseek(deepseekModelId),
      middleware: extractReasoningMiddleware({ tagName: "thinking" }),
    });
  }

  console.log("[DeepSeek Debug] Using standard model:", actualModelId);
  return deepseek(actualModelId);
}

export function getTitleModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("title-model");
  }
  return deepseek("deepseek-chat");
}

export function getArtifactModel() {
  if (isTestEnvironment && myProvider) {
    return myProvider.languageModel("artifact-model");
  }
  return deepseek("deepseek-chat");
}
