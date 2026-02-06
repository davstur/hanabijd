import { useRouter } from "next/router";
import { useEffect } from "react";

// Legacy route - redirect to home
export default function JoinGame() {
  const router = useRouter();

  useEffect(() => {
    router.replace("/");
  }, [router]);

  return null;
}
