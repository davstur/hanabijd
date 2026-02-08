import { useRouter } from "next/router";
import React, { useEffect } from "react";
import LoadingScreen from "~/components/loadingScreen";

export default function ResetSession() {
  const router = useRouter();

  useEffect(() => {
    localStorage.removeItem("name");
    localStorage.removeItem("currentRoom");
    localStorage.removeItem("gameId");
    router.replace("/");
  }, [router]);

  return <LoadingScreen />;
}
