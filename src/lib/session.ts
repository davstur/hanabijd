import { withIronSession } from "next-iron-session";
import { ID, uniqueId } from "~/lib/id";

export default function withSession(handler) {
  return withIronSession(handler, {
    password: "8asduz83890asdf09asdi393hasdfiausdf390asdf9asdie",
    cookieName: "hanabi_session",
    cookieOptions: {
      secure: process.env.NODE_ENV === "production",
    },
  });
}

export async function getPlayerIdFromSession(req): Promise<ID> {
  let playerId = req.session.get("playerId");
  if (playerId === undefined) {
    playerId = uniqueId();
    req.session.set("playerId", playerId);
    await req.session.save();
  }

  return playerId;
}
