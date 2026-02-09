import classnames from "classnames";
import React from "react";
import { useTranslation } from "react-i18next";
import PlayerAvatar, { AvatarSize } from "~/components/playerAvatar";
import Txt, { TxtSize } from "~/components/ui/txt";
import { useGame, useSelfPlayer } from "~/hooks/game";
import { IPlayer } from "~/lib/state";

export enum PlayerNameSize {
  SMALL = "small",
  MEDIUM = "medium",
}

const PlayerNameTextSizes = {
  [PlayerNameSize.SMALL]: TxtSize.SMALL,
  [PlayerNameSize.MEDIUM]: TxtSize.MEDIUM,
};

interface Props {
  player: IPlayer;
  size?: PlayerNameSize;
  explicit?: boolean;
  className?: string;
  reaction?: string;
  avatarOnly?: boolean;
}

export default function PlayerName(props: Props) {
  const { player, size = PlayerNameSize.SMALL, explicit = false, className, avatarOnly = false } = props;
  const { t } = useTranslation();

  const game = useGame();
  const selfPlayer = useSelfPlayer(game);
  const you = !explicit && player.name === selfPlayer?.name;

  if (avatarOnly) {
    return <PlayerAvatar className={className} name={player.name} size={AvatarSize.TINY} />;
  }

  return (
    <Txt
      className={classnames("relative inline-flex items-center", className)}
      size={PlayerNameTextSizes[size]}
      style={{ lineHeight: 1.4 }}
      value={you ? t("you") : player.name}
    />
  );
}
