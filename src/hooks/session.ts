import React, { useContext } from "react";

export const SessionContext = React.createContext<Session>(null);

export interface Session {
  playerName: string;
}

export function useSession() {
  return useContext(SessionContext) || { playerName: null };
}
