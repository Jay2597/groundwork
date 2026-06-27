import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { createFile, importFile } from "@/lib/persistence/fileLibrary";
import { openDocument } from "@/lib/persistence/fileSystem";
import { markOnboarded } from "@/lib/onboarding";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import "./welcome.css";

export function WelcomeScreen() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setBusy(true);
    const id = await createFile("Untitled");
    markOnboarded();
    navigate(`/editor/${id}`);
  }

  async function handleOpen() {
    try {
      const result = await openDocument();
      if (!result) return;
      const id = await importFile(result.document);
      markOnboarded();
      navigate(`/editor/${id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
      setError(err instanceof Error ? err.message : "Couldn't open that file.");
    }
  }

  return (
    <div className="welcome">
      <div className="welcome-bg" />
      <ThemeToggle className="floating" />
      <main className="welcome-wrap">
        <header className="welcome-head">
          <div className="brandline">
            <span className="gw-logo"><Logo size={56} hatch title="Groundwork" /></span>
            <span className="gw-word" style={{ fontSize: 19 }}>Groundwork</span>
            <span className="ver">v0.1 · local build</span>
          </div>
          <h1>A design tool that<br />never <span className="amber-tx">phones home.</span></h1>
          <p className="lede">Everything you make lives on this machine. No account, no cloud, no upload — your work is yours, fully offline.</p>
        </header>

        <section className="welcome-card">
          <div className="feats">
            <Feature title="Private" sub="0 bytes leave your device" />
            <Feature title="Offline" sub="Works on a plane, anywhere" />
            <Feature title="History" sub="Local versions, on disk" />
          </div>

          <div className="welcome-actions">
            <button className="btn" onClick={handleOpen} disabled={busy}>Open existing file</button>
            <button className="btn amber lg" onClick={handleCreate} disabled={busy}>Create my first file →</button>
          </div>
          {error && <p className="welcome-error">{error}</p>}
        </section>

        <p className="footnote">No account · No cloud · No telemetry — and no setting to turn any of that on.</p>
      </main>
    </div>
  );
}

function Feature({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="feat">
      <div className="fi">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V8a4 4 0 0 1 8 0v3" /></svg>
      </div>
      <b>{title}</b>
      <span>{sub}</span>
    </div>
  );
}
