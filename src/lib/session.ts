import { getIronSession } from "iron-session";
import { ID, uniqueId } from "~/lib/id";

const sessionOptions = {
  password: "8asduz83890asdf09asdi393hasdfiausdf390asdf9asdie",
  cookieName: "hanabi_session",
  cookieOptions: {
    secure: process.env.NODE_ENV === "production",
  },
};

export default function withSession(handler) {
  return async function (context) {
    const session = await getIronSession(context.req, context.res, sessionOptions);
    context.req.session = session;
    return handler(context);
  };
}

export async function getPlayerIdFromSession(req): Promise<ID> {
  const session = req.session;
  let playerId = session.playerId;
  if (playerId === undefined) {
    playerId = uniqueId();
    session.playerId = playerId;
    await session.save();
  }

  return playerId;
}
