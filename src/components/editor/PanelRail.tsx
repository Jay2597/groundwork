import { IcChevronLeft, IcChevronRight, IcLayersGlyph, IcSliders } from "@/components/ui/Icons";
import "./panelrail.css";

interface PanelRailProps {
  side: "left" | "right";
  onExpand: () => void;
}

/** A thin collapsed-panel rail with an expand button. */
export function PanelRail({ side, onExpand }: PanelRailProps) {
  return (
    <div className={`panel-rail ${side}`}>
      <button
        className="rail-btn"
        onClick={onExpand}
        title={side === "left" ? "Show layers" : "Show properties"}
        aria-label={side === "left" ? "Show layers panel" : "Show properties panel"}
      >
        {side === "left" ? <IcChevronRight /> : <IcChevronLeft />}
      </button>
      <div className="rail-glyph" aria-hidden>
        {side === "left" ? <IcLayersGlyph /> : <IcSliders />}
      </div>
    </div>
  );
}
