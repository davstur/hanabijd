import { useRouter } from "next/router";
import React, { useEffect } from "react";
import LoadingScreen from "~/components/loadingScreen";
import { logFailedPromise } from "~/lib/errors";

/**
 * Legacy route for /summary?gameId={gameId}
 * Redirects to /games/{gameId}/summary
 */
export default function Summary() {
  const router = useRouter();
  const { gameId } = router.query;

  useEffect(() => {
    if (!gameId) return;

    router.replace(`/games/${gameId}/summary`).catch(logFailedPromise);
  }, [gameId, router]);

  return <LoadingScreen />;
}
