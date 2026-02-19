import React from "react";
import { PHASE_LABELS, PHASE_ORDER } from "~/lib/magic/actions";
import { MagicPhase } from "~/lib/magic/state";

interface Props {
  currentPhase: MagicPhase;
  isMyTurn: boolean;
  onNextPhase: () => void;
}

export default function MagicPhaseStepper({ currentPhase, isMyTurn, onNextPhase }: Props) {
  const currentIdx = PHASE_ORDER.indexOf(currentPhase);

  return (
    <div className="flex items-center justify-center pv1" style={{ gap: 2 }}>
      {PHASE_ORDER.map((phase, i) => {
        const isActive = phase === currentPhase;
        const isPast = i < currentIdx;
        const isNext = isMyTurn && i === currentIdx + 1;

        let bg = "rgba(255,255,255,0.04)";
        let fg = "rgba(255,255,255,0.25)";
        if (isActive) {
          bg = "#d4a017";
          fg = "#1a1a2e";
        } else if (isPast) {
          bg = "rgba(255,255,255,0.08)";
          fg = "rgba(255,255,255,0.4)";
        }

        return (
          <React.Fragment key={phase}>
            {i > 0 && <span className="white-30 f7 ph1">›</span>}
            <button
              className="bn br2 ph2 pv1 f7 fw6"
              disabled={!isNext}
              style={{
                cursor: isNext ? "pointer" : "default",
                background: bg,
                color: fg,
                lineHeight: 1,
                transition: "background 0.15s, color 0.15s",
              }}
              onClick={onNextPhase}
            >
              {PHASE_LABELS[phase]}
            </button>
          </React.Fragment>
        );
      })}
      {isMyTurn && (
        <button
          className="bn br2 ph2 pv1 f7 fw6 pointer"
          style={{
            background: "rgba(212,160,23,0.25)",
            color: "#d4a017",
            lineHeight: 1,
            marginLeft: 4,
          }}
          onClick={onNextPhase}
        >
          {currentIdx === PHASE_ORDER.length - 1 ? "Pass ⏎" : "Next ›"}
        </button>
      )}
    </div>
  );
}
