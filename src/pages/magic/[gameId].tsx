import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import MagicGameIndex from "~/components/magic/MagicGameIndex";

export default function MagicGamePage() {
  const router = useRouter();
  const { gameId } = router.query;

  if (!gameId || typeof gameId !== "string") {
    return null;
  }

  return (
    <>
      <Head>
        <title>Magic: The Gathering</title>
      </Head>
      <MagicGameIndex gameId={gameId} />
    </>
  );
}
