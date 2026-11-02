"use client";
/**
 * Markdown renderer for all content: GFM tables, KaTeX math ($…$, $$…$$),
 * ```mermaid diagrams and callouts (> [!DEFINITION] Titel).
 */
import clsx from "clsx";
import ReactMarkdown, { type Components } from "react-markdown";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { CALLOUT_LABELS, CALLOUT_TYPES, type CalloutType } from "@/lib/content/callouts";
import { slugify } from "@/lib/slug";
import { Mermaid } from "./Mermaid";

// Minimal mdast typing for the callout plugin (avoids extra deps).
interface MdNode {
  type: string;
  value?: string;
  children?: MdNode[];
  data?: { hName?: string; hProperties?: Record<string, unknown> };
}

/** remark plugin: turns `> [!TYPE] optional title` blockquotes into styled callouts. */
function remarkCallouts() {
  return (tree: MdNode) => {
    const walk = (node: MdNode) => {
      if (node.type === "blockquote") {
        const para = node.children?.[0];
        const first = para?.type === "paragraph" ? para.children?.[0] : undefined;
        const m = first?.type === "text" ? /^\[!([A-Z]+)\][ \t]*([^\n]*)\n?/.exec(first.value ?? "") : null;
        if (m && (CALLOUT_TYPES as readonly string[]).includes(m[1]!)) {
          const type = m[1] as CalloutType;
          const title = m[2]?.trim() || CALLOUT_LABELS[type];
          first!.value = first!.value!.slice(m[0].length);
          if (!first!.value && para!.children!.length === 1) node.children!.shift();
          node.data = { hProperties: { className: `callout callout-${type}`, "data-title": title } };
        }
      }
      node.children?.forEach(walk);
    };
    walk(tree);
  };
}

function textOf(children: React.ReactNode): string {
  if (typeof children === "string" || typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(textOf).join("");
  if (children && typeof children === "object" && "props" in children)
    return textOf((children as { props: { children?: React.ReactNode } }).props.children);
  return "";
}

const components: Components = {
  h2: ({ children }) => <h2 id={slugify(textOf(children))}>{children}</h2>,
  h3: ({ children }) => <h3 id={slugify(textOf(children))}>{children}</h3>,
  blockquote: ({ node: _node, children, ...props }) => {
    const p = props as { className?: string; "data-title"?: string };
    if (p.className?.startsWith("callout")) {
      return (
        <blockquote className={p.className}>
          <div className="callout-title">{p["data-title"]}</div>
          {children}
        </blockquote>
      );
    }
    return <blockquote>{children}</blockquote>;
  },
  code: ({ className, children, ...rest }) => {
    const lang = /language-(\w+)/.exec(className ?? "")?.[1];
    if (lang === "mermaid") return <Mermaid code={String(children).trim()} />;
    return (
      <code className={className} {...rest}>
        {children}
      </code>
    );
  },
  pre: ({ children, node }) => {
    // mermaid blocks render their own container
    const child = node?.children?.[0];
    const cls = child && "properties" in child ? (child.properties?.className as string[] | undefined) : undefined;
    if (cls?.includes("language-mermaid")) return <>{children}</>;
    return <pre>{children}</pre>;
  },
  a: ({ href, children }) => (
    <a href={href} target={href?.startsWith("http") ? "_blank" : undefined} rel="noreferrer">
      {children}
    </a>
  ),
};

export function Markdown({ children, compact = false, className }: { children: string; compact?: boolean; className?: string }) {
  return (
    <div className={clsx("prose-study", compact && "prose-compact", className)}>
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath, remarkCallouts]} rehypePlugins={[rehypeKatex]} components={components}>
        {children}
      </ReactMarkdown>
    </div>
  );
}

