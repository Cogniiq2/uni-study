/**
 * Exam task selection: weighted sampling without replacement.
 * Weight favours core topics (examWeight) and weak items (low mastery) — practise where points are lost.
 */
export interface Candidate {
  uid: string;
  examWeight: 1 | 2 | 3;
  mastery: number; // 0..1
}

export function candidateWeight(c: Candidate): number {
  return c.examWeight * (1.25 - c.mastery);
}

export function pickExamItems(cands: Candidate[], n: number, rand: () => number = Math.random): string[] {
  const pool = cands.map((c) => ({ uid: c.uid, w: candidateWeight(c) }));
  const out: string[] = [];
  while (out.length < n && pool.length) {
    const total = pool.reduce((s, p) => s + p.w, 0);
    let r = rand() * total;
    let idx = pool.findIndex((p) => (r -= p.w) <= 0);
    if (idx < 0) idx = pool.length - 1;
    out.push(pool[idx]!.uid);
    pool.splice(idx, 1);
  }
  return out;
}
