import { toast } from "sonner";
import { Artifact } from "@/components/create-artifact";
import { DiffView } from "@/components/diffview";
import { DocumentSkeleton } from "@/components/document-skeleton";
import {
  ClockRewind,
  CopyIcon,
  MessageIcon,
  PenIcon,
  RedoIcon,
  UndoIcon,
} from "@/components/icons";
import { Editor } from "@/components/text-editor";
import type { Suggestion } from "@/lib/db/schema";
import { getSuggestions } from "../actions";

type TextArtifactMetadata = {
  suggestions: Suggestion[];
};

export const textArtifact = new Artifact<"text", TextArtifactMetadata>({
  kind: "text",
  description: "适用于文本内容，如撰写文章和邮件。",
  initialize: async ({ documentId, setMetadata }) => {
    const suggestions = await getSuggestions({ documentId });

    setMetadata({
      suggestions,
    });
  },
  onStreamPart: ({ streamPart, setMetadata, setArtifact }) => {
    if (streamPart.type === "data-suggestion") {
      setMetadata((metadata) => {
        return {
          suggestions: [...metadata.suggestions, streamPart.data],
        };
      });
    }

    if (streamPart.type === "data-textDelta") {
      setArtifact((draftArtifact) => {
        return {
          ...draftArtifact,
          content: draftArtifact.content + streamPart.data,
          isVisible:
            draftArtifact.status === "streaming" &&
            draftArtifact.content.length > 400 &&
            draftArtifact.content.length < 450
              ? true
              : draftArtifact.isVisible,
          status: "streaming",
        };
      });
    }
  },
  content: ({
    mode,
    status,
    content,
    isCurrentVersion,
    currentVersionIndex,
    onSaveContent,
    getDocumentContentById,
    isLoading,
    metadata,
  }) => {
    if (isLoading) {
      return <DocumentSkeleton artifactKind="text" />;
    }

    if (mode === "diff") {
      const oldContent = getDocumentContentById(currentVersionIndex - 1);
      const newContent = getDocumentContentById(currentVersionIndex);

      return <DiffView newContent={newContent} oldContent={oldContent} />;
    }

    return (
      <div className="flex flex-row px-4 py-8 md:p-20">
        <Editor
          content={content}
          currentVersionIndex={currentVersionIndex}
          isCurrentVersion={isCurrentVersion}
          onSaveContent={onSaveContent}
          status={status}
          suggestions={metadata ? metadata.suggestions : []}
        />

        {metadata?.suggestions && metadata.suggestions.length > 0 ? (
          <div className="h-dvh w-12 shrink-0 md:hidden" />
        ) : null}
      </div>
    );
  },
  actions: [
    {
      icon: <ClockRewind size={18} />,
      description: "查看更改",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("toggle");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <UndoIcon size={18} />,
      description: "查看上一版本",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("prev");
      },
      isDisabled: ({ currentVersionIndex }) => {
        if (currentVersionIndex === 0) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <RedoIcon size={18} />,
      description: "查看下一版本",
      onClick: ({ handleVersionChange }) => {
        handleVersionChange("next");
      },
      isDisabled: ({ isCurrentVersion }) => {
        if (isCurrentVersion) {
          return true;
        }

        return false;
      },
    },
    {
      icon: <CopyIcon size={18} />,
      description: "复制到剪贴板",
      onClick: ({ content }) => {
        navigator.clipboard.writeText(content);
        toast.success("已复制到剪贴板！");
      },
    },
  ],
  toolbar: [
    {
      icon: <PenIcon />,
      description: "最终润色",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "请进行最终润色并检查语法，添加章节标题以改善结构，并确保整体阅读流畅。",
            },
          ],
        });
      },
    },
    {
      icon: <MessageIcon />,
      description: "请求建议",
      onClick: ({ sendMessage }) => {
        sendMessage({
          role: "user",
          parts: [
            {
              type: "text",
              text: "请添加您认为可以改进写作的建议。",
            },
          ],
        });
      },
    },
  ],
});
