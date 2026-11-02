import type { ResultSet } from "@/lib/grading";

export function ResultTable({ result, caption }: { result: ResultSet; caption?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line">
      {caption && <div className="border-b border-line bg-surface-2 px-3 py-1.5 text-xs font-medium text-muted">{caption}</div>}
      <table className="w-full text-left font-mono text-[0.8125rem]">
        <thead className="bg-surface-2">
          <tr>
            {result.columns.map((c, i) => (
              <th key={i} className="px-3 py-1.5 font-semibold whitespace-nowrap">{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {result.values.map((row, i) => (
            <tr key={i} className="border-t border-line">
              {row.map((v, j) => (
                <td key={j} className="px-3 py-1.5 whitespace-nowrap">{v === null ? <span className="text-muted">NULL</span> : String(v)}</td>
              ))}
            </tr>
          ))}
          {!result.values.length && (
            <tr>
              <td className="px-3 py-2 text-muted" colSpan={result.columns.length || 1}>(keine Zeilen)</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
