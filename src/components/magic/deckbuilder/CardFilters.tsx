import classnames from "classnames";
import React, { useCallback, useEffect, useRef, useState } from "react";
import Txt, { TxtSize } from "~/components/ui/txt";
import { CardSearchFilters } from "~/lib/magic/scryfall";

const COLORS = [
  { code: "W", label: "W", bg: "#F9FAF4", fg: "#333" },
  { code: "U", label: "U", bg: "#0E68AB", fg: "#fff" },
  { code: "B", label: "B", bg: "#150B00", fg: "#fff" },
  { code: "R", label: "R", bg: "#D3202A", fg: "#fff" },
  { code: "G", label: "G", bg: "#00733E", fg: "#fff" },
];

const CMC_OPTIONS = [
  { label: "Any", value: null },
  { label: "0", value: 0 },
  { label: "1", value: 1 },
  { label: "2", value: 2 },
  { label: "3", value: 3 },
  { label: "4", value: 4 },
  { label: "5", value: 5 },
  { label: "6", value: 6 },
  { label: "7+", value: 7 },
];

interface Props {
  filters: CardSearchFilters;
  onFiltersChange: (filters: CardSearchFilters) => void;
}

export default function CardFilters({ filters, onFiltersChange }: Props) {
  const [nameInput, setNameInput] = useState(filters.name || "");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  const debouncedNameChange = useCallback(
    (value: string) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        onFiltersChange({ ...filters, name: value || undefined });
      }, 300);
    },
    [filters, onFiltersChange]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  function toggleColor(code: string) {
    const current = filters.colors || [];
    const next = current.includes(code) ? current.filter((c) => c !== code) : [...current, code];
    onFiltersChange({ ...filters, colors: next.length > 0 ? next : undefined });
  }

  function setCmc(value: number | null) {
    onFiltersChange({ ...filters, cmc: value });
  }

  return (
    <div className="flex flex-column" style={{ gap: 8 }}>
      <div>
        <Txt className="mb1 white fw6 db" size={TxtSize.XSMALL} value="Card name" />
        <input
          className="w-100 pa2 br2 bn bg-white-10 white f6"
          placeholder="Search cards..."
          type="text"
          value={nameInput}
          onChange={(e) => {
            setNameInput(e.target.value);
            debouncedNameChange(e.target.value);
          }}
        />
      </div>

      <div>
        <Txt className="mb1 white fw6 db" size={TxtSize.XSMALL} value="Color" />
        <div className="flex" style={{ gap: 4 }}>
          {COLORS.map((c) => {
            const active = filters.colors?.includes(c.code);
            return (
              <button
                key={c.code}
                className={classnames("pointer br2 bn fw7 f7 pa1 ph2", { "o-40": !active })}
                style={{
                  background: c.bg,
                  color: c.fg,
                  border: active ? "2px solid #FFD700" : "2px solid transparent",
                  minWidth: 32,
                }}
                onClick={() => toggleColor(c.code)}
              >
                {c.label}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <Txt className="mb1 white fw6 db" size={TxtSize.XSMALL} value="Mana cost" />
        <div className="flex flex-wrap" style={{ gap: 4 }}>
          {CMC_OPTIONS.map((opt) => {
            const active =
              opt.value === null ? filters.cmc === undefined || filters.cmc === null : filters.cmc === opt.value;
            return (
              <button
                key={opt.label}
                className={classnames("pointer br2 bn f7 pa1 ph2", {
                  "bg-cta main-dark fw6": active,
                  "bg-white-10 white": !active,
                })}
                onClick={() => setCmc(opt.value)}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
