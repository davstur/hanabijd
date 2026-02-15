import React from "react";

interface Props {
  life: number;
  onChange: (newLife: number) => void;
}

export default function MagicLifeCounter({ life, onChange }: Props) {
  return (
    <div className="flex items-center" style={{ gap: 6 }}>
      <button
        className="pointer bg-red white bn br2 flex items-center justify-center fw7"
        style={{ width: 28, height: 28, fontSize: 16 }}
        onClick={() => onChange(life - 1)}
      >
        −
      </button>
      <span className="white fw6 f5 tc" style={{ minWidth: 32 }}>
        {life}
      </span>
      <button
        className="pointer bg-green white bn br2 flex items-center justify-center fw7"
        style={{ width: 28, height: 28, fontSize: 16 }}
        onClick={() => onChange(life + 1)}
      >
        +
      </button>
    </div>
  );
}
