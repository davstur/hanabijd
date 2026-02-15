import classnames from "classnames";
import { useRouter } from "next/router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import Button, { ButtonSize } from "~/components/ui/button";
import { Field, TextInput } from "~/components/ui/forms";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useRequireName } from "~/hooks/useRequireName";
import { addGameToRoom } from "~/lib/firebase";
import { readableUniqueId } from "~/lib/id";
import { newMagicLobby } from "~/lib/magic/actions";
import { updateMagicGame } from "~/lib/magic/firebase";
import { GameMode } from "~/lib/state";

const PlayerCounts = [2];
const LifeTotals = [20, 40];

export default function NewMagicGame() {
  const router = useRouter();
  const { t } = useTranslation();
  useRequireName();
  const roomId = (router.query.room as string) || null;

  const [playersCount, setPlayersCount] = useState(2);
  const [startingLife, setStartingLife] = useState(20);
  const [customLife, setCustomLife] = useState("");
  const [creatingGame, setCreatingGame] = useState(false);

  async function onCreateGame() {
    setCreatingGame(true);

    const gameId = readableUniqueId();
    const life = customLife ? parseInt(customLife, 10) || startingLife : startingLife;

    const lobby = newMagicLobby(gameId, playersCount, life, GameMode.NETWORK);
    await updateMagicGame(lobby);

    if (roomId) {
      await addGameToRoom(roomId, gameId);
    }

    await router.push(`/magic/${gameId}`);
  }

  function onBack() {
    if (roomId) {
      router.push(`/rooms/${roomId}`);
    } else {
      router.push("/");
    }
  }

  return (
    <div className="w-100 h-100 overflow-y-scroll pv4 flex items-center pv6-l relative bg-main-dark ph2 ph3-l shadow-5 br3">
      <Button
        void
        className="absolute top-1 left-1"
        size={ButtonSize.TINY}
        text={`< ${t("back", "Back")}`}
        onClick={onBack}
      />
      <div className="flex flex-column w-75-m w-70-l w-80" style={{ margin: "auto" }}>
        <Txt className="mb4 tc" size={TxtSize.LARGE} value="Magic: The Gathering" />

        {/* Player count */}
        <div className="flex justify-between ph1 items-center pb4 mb4 bb b--yellow-light">
          <Txt size={TxtSize.MEDIUM} value={t("players", "Players")} />
          <div className="flex">
            {PlayerCounts.map((count) => (
              <Button
                key={count}
                className={classnames("ph3 ph4-l pv2", {
                  "bg-lavender": playersCount !== count,
                  "z-5": playersCount === count,
                })}
                size={ButtonSize.SMALL}
                style={{
                  ...(playersCount === count && { transform: "scale(1.20)" }),
                }}
                text={`${count}`}
                onClick={() => setPlayersCount(count)}
              />
            ))}
          </div>
        </div>

        {/* Starting life */}
        <div className="flex justify-between ph1 items-center pb4 mb4 bb b--yellow-light">
          <Txt size={TxtSize.MEDIUM} value={t("startingLife", "Starting life")} />
          <div className="flex items-center">
            {LifeTotals.map((life) => (
              <Button
                key={life}
                className={classnames("ph3 pv2", {
                  "bg-lavender": startingLife !== life || !!customLife,
                  "z-5": startingLife === life && !customLife,
                })}
                size={ButtonSize.SMALL}
                style={{
                  ...(startingLife === life && !customLife && { transform: "scale(1.20)" }),
                }}
                text={`${life}`}
                onClick={() => {
                  setStartingLife(life);
                  setCustomLife("");
                }}
              />
            ))}
          </div>
        </div>

        <Field className="pb3 mb3 bb b--yellow-light" label={t("customLife", "Custom life total")}>
          <TextInput
            className="w3 tr"
            placeholder="—"
            value={customLife}
            onChange={(e) => setCustomLife(e.target.value.replace(/\D/g, ""))}
          />
        </Field>

        <Txt
          className="f4 mt4 mb4 tc lavender"
          value={t("magicGameExplanation", "Players will select their decks in the lobby before the game starts.")}
        />

        <div className="flex justify-center">
          <Button
            className="justify-end mt2"
            disabled={creatingGame}
            primary={!creatingGame}
            size={ButtonSize.LARGE}
            text={creatingGame ? t("creatingGame") : t("newGame")}
            onClick={onCreateGame}
          />
        </div>
      </div>
    </div>
  );
}
