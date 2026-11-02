"use client";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { inputClass } from "@/components/exercises/shared";
import { Button, Panel } from "@/components/ui";
import { getBrowserSupabase } from "@/lib/supabase/browser";

function LoginForm() {
  const params = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(params.get("error") === "forbidden" ? "Dieses Konto hat keinen Zugriff." : null);
  const supabase = getBrowserSupabase();

  if (!supabase) {
    return <p className="text-center text-muted">Lokaler Modus – keine Anmeldung nötig.</p>;
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError("Anmeldung fehlgeschlagen. E-Mail oder Passwort falsch.");
      setBusy(false);
      return;
    }
    const next = params.get("next");
    // only allow local redirects
    location.href = next && next.startsWith("/") && !next.startsWith("//") ? next : "/";
  };

  return (
    <form onSubmit={submit} className="space-y-3">
      <input className={inputClass} type="email" autoComplete="email" placeholder="E-Mail" value={email} onChange={(e) => setEmail(e.target.value)} required />
      <input className={inputClass} type="password" autoComplete="current-password" placeholder="Passwort" value={password} onChange={(e) => setPassword(e.target.value)} required />
      {error && <p className="text-sm text-bad">{error}</p>}
      <Button type="submit" className="w-full" disabled={busy}>
        {busy ? "Anmelden …" : "Anmelden"}
      </Button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto mt-[12vh] max-w-sm">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-4 grid size-12 place-items-center rounded-2xl bg-accent text-xl font-semibold text-white dark:text-neutral-950">W</div>
        <h1 className="text-2xl font-semibold tracking-tight">Studium</h1>
        <p className="mt-1 text-sm text-muted">Wirtschaftsinformatik</p>
      </div>
      <Panel className="p-6">
        <Suspense>
          <LoginForm />
        </Suspense>
      </Panel>
    </div>
  );
}
