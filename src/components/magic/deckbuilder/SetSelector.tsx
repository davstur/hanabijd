import classnames from "classnames";
import React, { useEffect, useState } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { fetchSets, ScryfallSet } from "~/lib/magic/scryfall";

interface Props {
  selectedSet: string | null;
  onSelectSet: (setCode: string) => void;
}

export default function SetSelector({ selectedSet, onSelectSet }: Props) {
  const [sets, setSets] = useState<ScryfallSet[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    fetchSets().then((s) => {
      setSets(s);
      setLoading(false);
    });
  }, []);

  const filtered = filter
    ? sets.filter((s) => {
        const q = filter.toLowerCase();
        return s.name.toLowerCase().includes(q) || (s.block && s.block.toLowerCase().includes(q));
      })
    : sets;

  return (
    <div className="flex flex-column" style={{ minHeight: 0 }}>
      <Txt className="mb2 white fw6" size={TxtSize.XSMALL} value="Expansion" />
      <input
        className="mb2 pa2 br2 bn bg-white-10 white f6"
        placeholder="Filter sets..."
        type="text"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
      />
      <div className="overflow-y-auto" style={{ flex: 1, minHeight: 0 }}>
        {loading && <Txt className="o-70" size={TxtSize.XSMALL} value="Loading sets..." />}
        {filtered.map((s) => (
          <button
            key={s.code}
            className={classnames("db w-100 tl pointer br2 pa2 mb1 bn f7", {
              "bg-cta main-dark fw6": selectedSet === s.code,
              "bg-white-10 white": selectedSet !== s.code,
            })}
            onClick={() => onSelectSet(s.code)}
          >
            <span className="fw6">{s.name}</span>
            {s.released_at && <span className="o-50 ml1">({s.released_at.slice(0, 4)})</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
