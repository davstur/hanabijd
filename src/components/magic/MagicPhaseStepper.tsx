import React from "react";
import { PHASE_LABELS } from "~/lib/magic/actions";
import { MagicPhase } from "~/lib/magic/state";

const PHASE_ORDER = [MagicPhase.BEGINNING, MagicPhase.MAIN_1, MagicPhase.COMBAT, MagicPhase.MAIN_2, MagicPhase.END];

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
        const isFuture = i > currentIdx;

        return (
          <React.Fragment key={phase}>
            {i > 0 && <span className="white-30 f7 ph1">›</span>}
            <button
              className="bn br2 ph2 pv1 f7 fw6"
              disabled={!isMyTurn || !isFuture}
              style={{
                cursor: isMyTurn && isFuture ? "pointer" : "default",
                background: isActive ? "#d4a017" : isPast ? "rgba(255,255,255,0.08)" : "rgba(255,255,255,0.04)",
                color: isActive ? "#1a1a2e" : isPast ? "rgba(255,255,255,0.4)" : "rgba(255,255,255,0.25)",
                lineHeight: 1,
                transition: "background 0.15s, color 0.15s",
              }}
              onClick={() => {
                if (isMyTurn && isFuture) onNextPhase();
              }}
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
