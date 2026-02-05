import { useRouter } from "next/router";
import React, { useState } from "react";
import { useTranslation } from "react-i18next";
import LanguageSelector from "~/components/languageSelector";
import Rules from "~/components/rules";
import Button, { ButtonSize } from "~/components/ui/button";
import { Modal } from "~/components/ui/modal";
import Txt, { TxtSize } from "~/components/ui/txt";
import UserPreferencesDialog from "~/components/userPreferencesDialog";
import { UserPreferences, useUserPreferences } from "~/hooks/userPreferences";

interface Props {
  onCloseArea: () => void;
}

function getCurrentRoom(): string | null {
  if (typeof window === "undefined") return null;
  const stored = localStorage.getItem("currentRoom");
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return stored;
    }
  }
  return null;
}

export default function MenuArea(props: Props) {
  const { onCloseArea } = props;

  const [showRules, setShowRules] = useState(false);
  const router = useRouter();
  const { t } = useTranslation();
  const [showUserPreferences, setShowUserPreferences] = useState(false);
  const [userPreferences, setUserPreferences] = useUserPreferences();

  const currentRoom = getCurrentRoom();

  function onPrefClick() {
    setShowUserPreferences(true);
  }

  function onNewGameClick() {
    const roomParam = currentRoom ? `?room=${currentRoom}` : "";
    router.push(`/new-game${roomParam}`);
  }

  function onBackToRoomClick() {
    if (currentRoom) {
      router.push(`/rooms/${currentRoom}`);
    } else {
      router.push("/");
    }
  }

  if (showUserPreferences) {
    return (
      <UserPreferencesDialog
        saveUserPreferences={(userPreferences: UserPreferences) => {
          setUserPreferences(userPreferences);
        }}
        userPreferences={userPreferences}
        onCloseArea={() => {
          setShowUserPreferences(false);
        }}
      />
    );
  }

  return (
    <Modal isOpen onRequestClose={() => onCloseArea()}>
      <div className="flex flex-column justify-center items-center w-100 h-100 pa2 z-10">
        {!showRules && (
          <div className="flex flex-column justify-center items-center">
            <Txt className="ttu txt-yellow mb4 mb5-l" size={TxtSize.MEDIUM} value={t("hanab")} />

            <div className="mb4 mb5-l">
              <LanguageSelector />
            </div>
            <Button
              primary
              className="mb3 w-100"
              size={ButtonSize.MEDIUM}
              text={t("newGame", "New game")}
              onClick={onNewGameClick}
            />
            {currentRoom && (
              <Button
                className="mb3 w-100"
                size={ButtonSize.MEDIUM}
                text={t("backToRoom", "Back to room")}
                onClick={onBackToRoomClick}
              />
            )}
            <Button className="mb3 w-100" size={ButtonSize.MEDIUM} text={t("userPreferences")} onClick={onPrefClick} />
            <Button
              className="mb3 w-100"
              size={ButtonSize.MEDIUM}
              text={t("rules")}
              onClick={() => setShowRules(true)}
            />
          </div>
        )}

        {showRules && (
          <div className="overflow-y-scroll">
            <Rules setShowRules={setShowRules} />
          </div>
        )}
      </div>
    </Modal>
  );
}
