"use client";
import { useEffect, useId, useState } from "react";

/** Renders a mermaid diagram client-side (lazy-loaded; mermaid is large). */
export function Mermaid({ code }: { code: string }) {
  const id = useId().replace(/[^a-zA-Z0-9]/g, "");
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      const dark = window.matchMedia("(prefers-color-scheme: dark)").matches;
      mermaid.initialize({ startOnLoad: false, theme: dark ? "dark" : "neutral", securityLevel: "strict", fontFamily: "inherit" });
      try {
        const { svg } = await mermaid.render(`m${id}`, code);
        if (!cancelled) setSvg(svg);
      } catch (e) {
        if (!cancelled) setError((e as Error).message);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code, id]);

  if (error) return <pre className="text-xs text-bad">Diagramm-Fehler: {error}</pre>;
  return (
    <div
      className="not-prose my-6 flex justify-center overflow-x-auto rounded-xl border border-line bg-surface p-4 [&_svg]:h-auto [&_svg]:max-w-full"
      aria-busy={!svg}
      dangerouslySetInnerHTML={{ __html: svg || "" }}
    />
  );
}
