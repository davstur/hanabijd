import { useRouter } from "next/router";
import { useEffect } from "react";

export function useRequireName() {
  const router = useRouter();
  useEffect(() => {
    const stored = localStorage.getItem("name");
    if (!stored) {
      router.replace("/");
    }
  }, [router]);
}
