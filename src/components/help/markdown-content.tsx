"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Components } from "react-markdown";

function slugify(text: string): string {
  return text.toLowerCase().replace(/[^\w]+/g, "-").replace(/(^-|-$)/g, "");
}

interface MarkdownContentProps {
  content: string;
  onLinkClick?: (slug: string) => void;
}

export function MarkdownContent({ content, onLinkClick }: MarkdownContentProps) {
  const components: Components = {
    h1: ({ children }) => (
      <h1 className="text-2xl font-bold text-slate-900 mt-8 mb-4 first:mt-0">
        {children}
      </h1>
    ),
    h2: ({ children }) => {
      const text = typeof children === "string" ? children : String(children);
      const id = slugify(text);
      return (
        <h2 id={id} className="text-xl font-semibold text-slate-800 mt-8 mb-3 scroll-mt-24 border-b border-slate-200 pb-2">
          {children}
        </h2>
      );
    },
    h3: ({ children }) => (
      <h3 className="text-lg font-medium text-slate-700 mt-5 mb-2">
        {children}
      </h3>
    ),
    h4: ({ children }) => (
      <h4 className="text-base font-medium text-slate-600 mt-4 mb-2">
        {children}
      </h4>
    ),
    p: ({ children }) => (
      <p className="text-slate-600 mb-4 leading-relaxed">{children}</p>
    ),
    a: ({ href, children }) => {
      // Rewrite internal .md links to tab switches
      if (href && href.startsWith("./") && href.endsWith(".md") && onLinkClick) {
        const slug = href.replace("./", "").replace(".md", "");
        return (
          <button
            onClick={() => onLinkClick(slug)}
            className="text-blue-600 hover:text-blue-800 underline underline-offset-2 font-medium"
          >
            {children}
          </button>
        );
      }
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-blue-600 hover:text-blue-800 underline underline-offset-2"
        >
          {children}
        </a>
      );
    },
    ul: ({ children }) => (
      <ul className="list-disc list-outside ml-6 mb-4 space-y-1 text-slate-600">
        {children}
      </ul>
    ),
    ol: ({ children }) => (
      <ol className="list-decimal list-outside ml-6 mb-4 space-y-1 text-slate-600">
        {children}
      </ol>
    ),
    li: ({ children }) => (
      <li className="leading-relaxed">{children}</li>
    ),
    blockquote: ({ children }) => (
      <blockquote className="border-l-4 border-blue-300 bg-blue-50 pl-4 py-2 my-4 text-slate-700 italic">
        {children}
      </blockquote>
    ),
    code: ({ className, children }) => {
      const isBlock = className?.includes("language-");
      if (isBlock) {
        return (
          <code className={`block bg-slate-900 text-slate-100 rounded-lg p-4 my-4 text-sm overflow-x-auto whitespace-pre ${className || ""}`}>
            {children}
          </code>
        );
      }
      return (
        <code className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded text-sm font-mono">
          {children}
        </code>
      );
    },
    pre: ({ children }) => (
      <pre className="bg-slate-900 text-slate-100 rounded-lg p-4 my-4 text-sm overflow-x-auto">
        {children}
      </pre>
    ),
    table: ({ children }) => (
      <div className="overflow-x-auto my-4">
        <table className="w-full border-collapse text-sm">
          {children}
        </table>
      </div>
    ),
    thead: ({ children }) => (
      <thead className="bg-slate-50 border-b border-slate-200">
        {children}
      </thead>
    ),
    th: ({ children }) => (
      <th className="text-left px-4 py-2 font-semibold text-slate-700 border-b border-slate-200">
        {children}
      </th>
    ),
    td: ({ children }) => (
      <td className="px-4 py-2 text-slate-600 border-b border-slate-100">
        {children}
      </td>
    ),
    hr: () => <hr className="my-8 border-slate-200" />,
    strong: ({ children }) => (
      <strong className="font-semibold text-slate-800">{children}</strong>
    ),
    em: ({ children }) => (
      <em className="italic text-slate-600">{children}</em>
    ),
  };

  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
      {content}
    </ReactMarkdown>
  );
}
