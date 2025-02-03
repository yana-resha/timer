require("dotenv").config();

const express = require("express");
const bodyParser = require("body-parser");

const cookieParser = require("cookie-parser");
const nunjucks = require("nunjucks");

const cookie = require("cookie");
const http = require("http");
const WebSocket = require("ws");

const {
  auth,
  findUserByUsername,
  findUserBySessionId,
  createUser,
  hash,
  createSession,
  getTimersList,
  createTimer,
  stopTimer,
  deleteSession,
  sendSocketTimersList,
} = require("./providers");

const { mapTimersList } = require("./service");

const app = express();
nunjucks.configure("views", {
  autoescape: true,
  express: app,
  tags: {
    blockStart: "[%",
    blockEnd: "%]",
    variableStart: "[[",
    variableEnd: "]]",
    commentStart: "[#",
    commentEnd: "#]",
  },
});

app.set("view engine", "njk");
app.use(cookieParser());

app.use(express.json());
app.use(express.static("public"));

const server = http.createServer(app);
const wss = new WebSocket.Server({ clientTracking: false, noServer: true });
const clients = new Map();

app.get("/", auth(), (req, res) => {
  res.render("index", {
    user: req.user,
    authError: req.query.authError === "true" ? "Wrong username or password" : req.query.authError,
  });
});

app.get("/logout", auth(), async (req, res) => {
  if (!req.user) {
    return res.redirect("/");
  }
  await deleteSession(req.sessionId);
  res.clearCookie("sessionId").redirect("/");
});

app.post("/login", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.redirect("/?authError=true");
  }
  const user = await findUserByUsername(username);
  if (!user || user.password !== hash(password)) {
    return res.redirect("/?authError=true");
  }
  const sessionId = await createSession(user.id);
  res.cookie("sessionId", sessionId, { httpOnly: true, signed: false }).redirect("/");
});

app.post("/signup", bodyParser.urlencoded({ extended: false }), async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.redirect("/?authError=true");
  }
  const user = await findUserByUsername(username);

  if (user && user.password === hash(password)) {
    const sessionId = await createSession(user.id);
    res.cookie("sessionId", sessionId, { httpOnly: true, signed: false }).redirect("/");
    return;
  }

  if (user && user.password !== hash(password)) {
    return res.redirect("/?authError=true");
  }

  const response = await createUser(username, password);
  if (response) {
    const sessionResponse = await createSession(response);
    res.cookie("sessionId", sessionResponse, { httpOnly: true, signed: false }).redirect("/");
  } else {
    res.redirect("/?authError=true");
  }
});

app.post("/api/timers", auth(), async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  const { description } = req.body;
  const timer = await createTimer(req.user.id, description);
  res.json(timer);
  wss.emit("update_list", { userId: req.user.id });
});

app.post("/api/timers/:id/stop", auth(), async (req, res) => {
  if (!req.user) {
    return res.sendStatus(401);
  }
  const id = req.params.id;
  res.json(stopTimer(req.user.id, id));
  wss.emit("update_list", { userId: req.user.id });
});

server.on("upgrade", async (req, socket, head) => {
  const cookies = cookie.parse(req.headers["cookie"]);

  const sessionId = cookies && cookies["sessionId"];
  const userData = sessionId ? await findUserBySessionId(sessionId) : undefined;

  if (!userData?.id) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  req.user = {
    ...userData,
    sessionId,
  };
  wss.handleUpgrade(req, socket, head, (ws) => {
    wss.emit("connection", ws, req);
  });
});

const separator = "_ID_";
wss.on("connection", async (ws, req) => {
  const { sessionId, id } = req.user;

  clients.set(sessionId + separator + id, ws);
  const allTimersList = mapTimersList(await getTimersList(id));
  sendSocketTimersList(ws, allTimersList);

  const timerInterval = setInterval(async () => {
    const allTimersList = mapTimersList(await getTimersList(id));
    sendSocketTimersList(ws, allTimersList);
  }, 1000);

  ws.on("close", () => {
    clients.delete(sessionId);
    clearInterval(timerInterval);
  });

  ws.on("message", (data) => {
    console.log(data, "data");
  });
});

// если создали новый таймер или остановили таймер, то вызывается это событие
wss.on("update_list", async (data) => {
  const clientKeys = Array.from(clients.keys()).filter((key) => key.split(separator)[1] === data.userId.toString());
  for (let [key, ws] of clients.entries()) {
    if (clientKeys.some((el) => el === key)) {
      const allTimersList = mapTimersList(await getTimersList(data.userId));
      sendSocketTimersList(ws, allTimersList);
    }
  }
});

const port = process.env.PORT || 3000;

server.listen(port, () => {
  console.log(`  Listening on http://localhost:${port}`);
});
