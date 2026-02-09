import React, { useEffect } from "react";
import { useTranslation } from "react-i18next";
import Logs from "~/components/logs";
import Button, { ButtonSize } from "~/components/ui/button";
import { useReplay } from "~/hooks/replay";

interface Props {
  interturn: boolean;
  onClose: () => void;
  onReplay: () => void;
  onStopReplay: () => void;
}

export default function PlayHistoryPopup(props: Props) {
  const { interturn, onClose, onReplay, onStopReplay } = props;
  const { t } = useTranslation();
  const replay = useReplay();

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        onClose();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed absolute--fill z-9999 flex flex-column" style={{ background: "rgba(0, 16, 48, 0.95)" }}>
      <div className="flex items-center justify-between pa2 bb b--yellow">
        <Button
          void
          className="tracked-tight"
          size={ButtonSize.TINY}
          text={replay.cursor === null ? t("rewind") : t("backToGame")}
          onClick={() => {
            if (replay.cursor === null) {
              onReplay();
            } else {
              onStopReplay();
            }
          }}
        />
        <Button size={ButtonSize.TINY} text={t("close")} onClick={onClose} />
      </div>
      <div className="flex flex-grow-1 overflow-y-scroll pa2">
        <Logs showAll interturn={interturn} />
      </div>
    </div>
  );
}
