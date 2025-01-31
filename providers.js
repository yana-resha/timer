const { nanoid } = require("nanoid");
const crypto = require("crypto");

const db = require("./db");

const auth = () => async (req, res, next) => {
  if (!req.cookies["sessionId"]) {
    return next();
  }
  const user = await findUserBySessionId(req.cookies["sessionId"]);
  req.user = user;
  req.sessionId = user ? req.cookies["sessionId"] : undefined;
  next();
};

const hash = (d) => crypto.createHash("sha256", d).digest("hex");

const findUserByUsername = async (username) => await db("users").select().where({ username }).first();

const findUserBySessionId = async (sessionId) => {
  const session = await db("sessions").select().where({ session_id: sessionId }).first();

  if (!session) return undefined;
  return await db("users").select().where({ id: session.user_id }).first();
};

const createUser = async (username, password) => {
  const user = {
    username,
    password: hash(password),
  };
  return await db("users")
    .insert(user, "id")
    .then((results) => results[0]);
};

const createSession = async (userId) => {
  const session = {
    session_id: nanoid(),
    user_id: userId,
  };
  return await db("sessions")
    .insert(session, "session_id")
    .then((results) => results[0]);
};

const deleteSession = async (sessionId) =>
  await db("sessions")
    .where({ session_id: sessionId })
    .del("session_id")
    .then((results) => results[0]);

const getTimersList = async (userId, isActive) => {
  const sqlRequest = { user_id: userId };
  if (typeof isActive === "boolean") sqlRequest.isActive = isActive;
  const list = await db("timers").select("*").where(sqlRequest);
  return list;
};

const createTimer = async (userId, description = "") => {
  const timer = {
    description: description,
    is_active: true,
    user_id: userId,
  };
  return await db("timers")
    .insert(timer, ["id", "description"])
    .then((results) => results[0]);
};
const stopTimer = async (userId, id) =>
  await db("timers").where({ user_id: userId, id }).update({ is_active: false, end: db.fn.now() }, ["id"]);

const sendSocketTimersList = (ws, list) =>
  ws.send(
    JSON.stringify({
      type: "all_timers",
      list,
    })
  );

module.exports = {
  auth,
  findUserByUsername,
  findUserBySessionId,
  createUser,
  createSession,
  hash,
  getTimersList,
  createTimer,
  stopTimer,
  deleteSession,
  sendSocketTimersList,
};
