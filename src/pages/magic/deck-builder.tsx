import Head from "next/head";
import { useRouter } from "next/router";
import React from "react";
import DeckBuilder from "~/components/magic/deckbuilder/DeckBuilder";

export default function DeckBuilderPage() {
  const router = useRouter();

  return (
    <>
      <Head>
        <title>Deck Builder - Magic: The Gathering</title>
      </Head>
      <DeckBuilder onBack={() => router.back()} onSaved={() => router.back()} />
    </>
  );
}
