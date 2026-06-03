import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { absUrl } from "@/lib/api";

export const MarkdownPreview = ({ content, className = "" }) => {
  return (
    <div className={`prose-cs ${className}`} data-testid="markdown-preview">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          img: ({ node, ...props }) => <img {...props} src={absUrl(props.src)} alt={props.alt || ""} />,
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noreferrer" />,
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
};
