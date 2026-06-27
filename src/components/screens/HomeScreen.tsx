import { useEffect, useState, type MouseEvent } from "react";
import { useNavigate } from "react-router-dom";
import {
  createFile,
  deleteFile,
  duplicateFile,
  importFile,
  listFiles,
  renameFile,
  type FileMeta,
} from "@/lib/persistence/fileLibrary";
import { openDocument } from "@/lib/persistence/fileSystem";
import { createSampleDocument } from "@/lib/sampleDocument";
import { Logo } from "@/components/brand/Logo";
import { ThemeToggle } from "@/components/theme/ThemeToggle";
import "./home.css";

const RECENT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;
type View = "recent" | "all";

export function HomeScreen() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<FileMeta[]>([]);
  const [query, setQuery] = useState("");
  const [view, setView] = useState<View>("all");
  const [renaming, setRenaming] = useState<string | null>(null);

  useEffect(() => {
    void listFiles().then(setFiles);
  }, []);

  async function refresh() {
    setFiles(await listFiles());
  }

  async function handleNew() {
    const id = await createFile("Untitled");
    navigate(`/editor/${id}`);
  }

  async function handleSample() {
    const id = await importFile(createSampleDocument());
    navigate(`/editor/${id}`);
  }

  async function handleOpen() {
    try {
      const result = await openDocument();
      if (!result) return;
      const id = await importFile(result.document);
      navigate(`/editor/${id}`);
    } catch (err) {
      if (err instanceof DOMException && err.name === "AbortError") return;
    }
  }

  async function handleDelete(e: MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    await deleteFile(id);
    await refresh();
  }

  async function handleDuplicate(e: MouseEvent<HTMLButtonElement>, id: string) {
    e.stopPropagation();
    await duplicateFile(id);
    await refresh();
  }

  async function commitRename(id: string, name: string) {
    setRenaming(null);
    const trimmed = name.trim();
    if (trimmed) await renameFile(id, trimmed);
    await refresh();
  }

  const recentCount = files.filter((f) => Date.now() - f.updatedAt < RECENT_WINDOW_MS).length;
  const base = view === "recent" ? files.filter((f) => Date.now() - f.updatedAt < RECENT_WINDOW_MS) : files;
  const shown = base.filter((f) => f.name.toLowerCase().includes(query.trim().toLowerCase()));

  return (
    <div className="home">
      <aside className="home-side">
        <div className="home-brand">
          <span className="gw-logo"><Logo size={24} /></span>
          <span className="gw-word">Groundwork</span>
        </div>
        <nav className="home-nav">
          <button className={`home-nav-item${view === "recent" ? " active" : ""}`} onClick={() => setView("recent")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 8v4l3 2M21 12a9 9 0 1 1-9-9" /></svg>
            Recent <span className="count">{recentCount}</span>
          </button>
          <button className={`home-nav-item${view === "all" ? " active" : ""}`} onClick={() => setView("all")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="4" width="18" height="16" rx="2" /></svg>
            All files <span className="count">{files.length}</span>
          </button>
        </nav>
        <div className="home-storage">
          <div className="t">On this device</div>
          <div className="s">{files.length} {files.length === 1 ? "file" : "files"} · 0 synced</div>
        </div>
      </aside>

      <div className="home-main">
        <header className="home-top">
          <div className="search">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="11" cy="11" r="7" /><path d="M21 21l-4-4" /></svg>
            <input
              placeholder="Search your files…"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
          <span className="spacer" />
          <ThemeToggle />
          <button className="btn" onClick={handleSample}>Try a sample</button>
          <button className="btn" onClick={handleOpen}>Open from disk</button>
          <button className="btn amber" onClick={handleNew}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M12 5v14M5 12h14" /></svg>
            New file
          </button>
        </header>

        <div className="home-content scroll">
          {shown.length === 0 ? (
            <EmptyState hasFiles={files.length > 0} onNew={handleNew} onSample={handleSample} />
          ) : (
            <div className="file-grid">
              {shown.map((f) => (
                <article key={f.id} className="file-card" onClick={() => navigate(`/editor/${f.id}`)}>
                  <div className="file-thumb">
                    {f.thumbnail ? (
                      <img src={f.thumbnail} alt="" className="file-thumb-img" />
                    ) : (
                      <span className="file-mono">{f.name.charAt(0).toUpperCase() || "U"}</span>
                    )}
                  </div>
                  <div className="file-meta">
                    {renaming === f.id ? (
                      <input
                        className="file-rename"
                        autoFocus
                        defaultValue={f.name}
                        onClick={(e) => e.stopPropagation()}
                        onBlur={(e) => void commitRename(f.id, e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") void commitRename(f.id, e.currentTarget.value);
                          if (e.key === "Escape") setRenaming(null);
                        }}
                      />
                    ) : (
                      <div
                        className="file-name"
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          setRenaming(f.id);
                        }}
                      >
                        {f.name}<span className="file-ext">.gwork</span>
                      </div>
                    )}
                    <div className="file-sub">
                      {relativeTime(f.updatedAt)} · {f.layerCount} {f.layerCount === 1 ? "layer" : "layers"}
                    </div>
                  </div>
                  <div className="file-actions">
                    <button className="file-act" title="Rename" aria-label={`Rename ${f.name}`} onClick={(e) => { e.stopPropagation(); setRenaming(f.id); }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z" /></svg>
                    </button>
                    <button className="file-act" title="Duplicate" aria-label={`Duplicate ${f.name}`} onClick={(e) => void handleDuplicate(e, f.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h10" /></svg>
                    </button>
                    <button className="file-act danger" title="Delete" aria-label={`Delete ${f.name}`} onClick={(e) => void handleDelete(e, f.id)}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M5 7h14l-1 13H6zM9 7V4h6v3" /></svg>
                    </button>
                  </div>
                </article>
              ))}
            </div>
          )}
        </div>

        <footer className="home-status">
          <span className="amber-tx">● All local</span>
          <span className="spacer" />
          <span>nothing synced · no account</span>
        </footer>
      </div>
    </div>
  );
}

function EmptyState({ hasFiles, onNew, onSample }: { hasFiles: boolean; onNew: () => void; onSample: () => void }) {
  return (
    <div className="home-empty">
      <div className="home-empty-ill">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><rect x="4" y="5" width="16" height="14" rx="2" /></svg>
      </div>
      <h2>{hasFiles ? "No matches" : "No files yet"}</h2>
      <p>{hasFiles ? "Try a different search." : "Create your first design — it'll be saved right here on your device."}</p>
      {!hasFiles && (
        <div className="home-empty-actions">
          <button className="btn amber lg" onClick={onNew}>New file</button>
          <button className="btn lg" onClick={onSample}>Try a sample</button>
        </div>
      )}
    </div>
  );
}

function relativeTime(ms: number): string {
  const diff = Date.now() - ms;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "just now";
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(ms).toLocaleDateString();
}
