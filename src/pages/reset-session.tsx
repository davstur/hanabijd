import React from "react";
import LoadingScreen from "~/components/loadingScreen";

export async function getServerSideProps() {
  return {
    redirect: {
      destination: "/",
      permanent: false,
    },
  };
}

export default function ResetSession() {
  return <LoadingScreen />;
}
