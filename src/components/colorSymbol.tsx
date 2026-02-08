import { SvgImage } from "~/components/ui/svgImage";
import heartSvg from "~/images/symbols/heart.svg";
import cloveSvg from "~/images/symbols/clove.svg";
import spadeSvg from "~/images/symbols/spade.svg";
import diamondSvg from "~/images/symbols/diamond.svg";
import starSvg from "~/images/symbols/star.svg";
import cloudSvg from "~/images/symbols/cloud.svg";
import wheelSvg from "~/images/symbols/wheel.svg";
import rainbowSvg from "~/images/symbols/rainbow.svg";
import { IColor } from "~/lib/state";

export const ColorsToSymbols = {
  [IColor.RED]: heartSvg,
  [IColor.GREEN]: cloveSvg,
  [IColor.BLUE]: spadeSvg,
  [IColor.WHITE]: diamondSvg,
  [IColor.YELLOW]: starSvg,
  [IColor.ORANGE]: cloudSvg,
  [IColor.MULTICOLOR]: wheelSvg,
  [IColor.RAINBOW]: rainbowSvg,
};

interface Props {
  color: IColor;
}

export default function ColorSymbol(props: Props) {
  const { color } = props;

  const svg = ColorsToSymbols[color];

  if (!svg) {
    return null;
  }

  return (
    <div className="absolute w-100 h-100 flex justify-center items-center" style={{ transform: "scale(1.4)" }}>
      <SvgImage svg={svg} />
    </div>
  );
}
