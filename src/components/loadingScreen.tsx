import { motion } from "motion/react";
import React from "react";
import { useTranslation } from "react-i18next";
import Txt, { TxtSize } from "~/components/ui/txt";

export default function LoadingScreen() {
  const { t } = useTranslation();

  return (
    <div className="w-100 h-100 flex flex-column justify-center items-center bg-main-dark pa2 pv4-l ph3-l shadow-5 br3">
      <motion.div animate={{ opacity: [1, 0.7, 1] }} transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}>
        <Txt size={TxtSize.LARGE} value={t("loading")} />
      </motion.div>
    </div>
  );
}
