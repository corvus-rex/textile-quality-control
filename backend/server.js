const WebSocket = require("ws");
const crypto = require("crypto");

const wss = new WebSocket.Server({ port: 8080, path: "/ws" });

wss.on("connection", ws => {
  let sessionId = null;
  let encoderPos = 0;
  let encoderInterval = null;

  function startEncoder() {
    if (encoderInterval) return;

    encoderPos = 0;

    encoderInterval = setInterval(() => {
      if (ws.readyState !== WebSocket.OPEN) return;

      ws.send(JSON.stringify({
        command: "update_meter",
        meter: encoderPos
      }));

      encoderPos += 0.5;
    }, 2000);
  }

  function stopEncoder() {
    if (encoderInterval !== null) {
      clearInterval(encoderInterval);
      encoderInterval = null;
    }
  }

  ws.on("message", raw => {
    let message;
    try {
      message = JSON.parse(raw);
    } catch {
      return;
    }

    switch (message.command) {
      case "start_session":
        sessionId = crypto.randomBytes(8).toString("hex");

        ws.send(JSON.stringify({
          command: "start_session_ack",
          id: sessionId 
        }));

        startEncoder();
        break;

      case "end_session":
        stopEncoder();
        sessionId = null;
        break;

      case "send_defect":
        // optional: validate sessionId
        console.log("Defect:", message.data);
        break;
    }
  });

  ws.on("close", () => {
    stopEncoder();
  });
});

console.log("WebSocket server running on ws://localhost:8080/ws");
