import React from "react";

const AvatarColors = [
  "#ec7063", // red
  "#5dade2", // blue
  "#52be80", // green
  "#ed8936", // orange
  "#805ad5", // purple
  "#f4d03f", // yellow
  "#e57fd4", // pink
  "#48c9b0", // teal
];

function hashName(name: string): number {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = (hash << 5) - hash + name.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

export enum AvatarSize {
  SMALL = 20,
  MEDIUM = 28,
}

interface Props {
  className?: string;
  name: string;
  size?: AvatarSize;
}

export default function PlayerAvatar(props: Props) {
  const { className, name, size = AvatarSize.SMALL } = props;
  const letter = (name || "?")[0].toUpperCase();
  const color = AvatarColors[hashName(name) % AvatarColors.length];
  const fontSize = size * 0.5;

  return (
    <span
      className={className}
      style={{
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: size,
        height: size,
        minWidth: size,
        borderRadius: "50%",
        backgroundColor: color,
        color: "#001030",
        fontSize,
        fontWeight: 700,
        lineHeight: `${size}px`,
        verticalAlign: "middle",
        userSelect: "none",
      }}
      title={name}
    >
      {letter}
    </span>
  );
}
