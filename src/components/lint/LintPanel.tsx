import { useMemo } from "react";
import { useUiStore } from "@/store/uiStore";
import { useEditorStore } from "@/store/editorStore";
import { activePage } from "@/types/document";
import { lintPage, lintCounts, type LintIssue, type LintSeverity } from "@/lib/lint";
import "./lint.css";

const SEVERITY_ORDER: LintSeverity[] = ["error", "warning", "info"];
const SEVERITY_LABEL: Record<LintSeverity, string> = { error: "Errors", warning: "Warnings", info: "Info" };

/** Design-lint / accessibility review panel. */
export function LintPanel() {
  const open = useUiStore((s) => s.lintOpen);
  const setOpen = useUiStore((s) => s.setLintOpen);
  const document = useEditorStore((s) => s.document);
  const select = useEditorStore((s) => s.select);

  const page = activePage(document);
  const issues = useMemo(() => lintPage(page), [page]);
  const counts = lintCounts(issues);

  if (!open) return null;

  const grouped: Record<LintSeverity, LintIssue[]> = { error: [], warning: [], info: [] };
  for (const issue of issues) grouped[issue.severity].push(issue);

  return (
    <div className="dialog-backdrop" onMouseDown={() => setOpen(false)}>
      <div className="dialog lint-dialog" onMouseDown={(e) => e.stopPropagation()} role="dialog" aria-label="Design review">
        <header className="dialog-head">
          <h2>Review</h2>
          <div className="lint-summary">
            <span className="lint-pill error">{counts.error}</span>
            <span className="lint-pill warning">{counts.warning}</span>
            <span className="lint-pill info">{counts.info}</span>
          </div>
          <button className="dialog-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
        </header>

        <div className="dialog-body lint-body">
          {issues.length === 0 ? (
            <p className="lint-clean">✓ No issues found on this page.</p>
          ) : (
            SEVERITY_ORDER.filter((s) => grouped[s].length > 0).map((sev) => (
              <section key={sev} className="lint-section">
                <div className="lint-sec-head">{SEVERITY_LABEL[sev]} <span className="lint-count">{grouped[sev].length}</span></div>
                <ul className="lint-list">
                  {grouped[sev].map((issue) => (
                    <li key={issue.id}>
                      <button
                        className="lint-row"
                        onClick={() => { select([issue.nodeId]); setOpen(false); }}
                        title="Select this layer"
                      >
                        <span className={`lint-dot ${issue.severity}`} aria-hidden />
                        <span className="lint-node">{issue.nodeName}</span>
                        <span className="lint-msg">{issue.message}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </section>
            ))
          )}
          <p className="set-foot">Checks run on your device — contrast (WCAG), tiny fonts, small tap targets, and sub-pixel geometry.</p>
        </div>
      </div>
    </div>
  );
}
