const WebSocket = require("ws");
const crypto = require("crypto");

const wss = new WebSocket.Server({
  port: 8080,
  path: "/ws"
});

/**
 * sessions structure:
 * Map {
 *   sessionId => {
 *     roll: {},
 *     weaving: {},
 *     bbsf: {},
 *     defects: []
 *   }
 * }
 */
const sessions = new Map();

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

      /* ================= START SESSION ================= */
      case "start_session": {
        sessionId = crypto.randomBytes(8).toString("hex");

        sessions.set(sessionId, {
          roll: {
            date: message.date ?? null,
            type: message.type ?? null,
            custom_type: message.custom_type ?? null,
            kp: message.kp ?? null,
            tex_code: message.tex_code ?? null,
            operator: message.operator ?? null
          },

          weaving: {
            nb: message.nb ?? null,
            mc: message.mc ?? null,
            tgl_naik: message.tgl_naik ?? null,
            tgl_pot: message.tgl_pot ?? null,
            pot: message.pot ?? null,
            ins_pot: message.ins_pot ?? null,
            pa: message.pa ?? null,
            lebar: message.lebar ?? null,
            ba: message.ba ?? null,
            tag_id: message.tag_id ?? null,
            ins_gr: message.ins_gr ?? null
          },

          bbsf: {
            shift: message.shift ?? null,
            ins: message.ins ?? null,
            tgl_proses: message.tgl_proses ?? null
          },

          defects: []
        });

        
        console.log("=== SESSION STORED ===");
        console.log("Session ID:", sessionId);
        console.dir(sessions.get(sessionId), { depth: null });
        console.log("======================");

        ws.send(JSON.stringify({
          command: "start_session_ack",
          id: sessionId
        }));

        startEncoder();
        break;
      }

      /* ================= END SESSION ================= */
      case "end_session": {
        stopEncoder();

        if (sessionId) {
          sessions.delete(sessionId);
          sessionId = null;
        }
        break;
      }

      /* ================= ADD DEFECT ================= */
      case "send_defect": {
        const session = sessions.get(message.id);
        if (!session) return;

        session.defects.push({
          jenis_cacat: message.jenis_cacat,
          point: message.point,
          meter: message.meter
        });

        console.log("Defect added:", message);
        break;
      }

      /* ================= DELETE DEFECT ================= */
      case "delete_defect": {
        const session = sessions.get(message.id);
        if (!session) return;

        session.defects = session.defects.filter(d =>
          !(
            d.meter === message.meter &&
            d.jenis_cacat === message.jenis_cacat &&
            d.point === message.point
          )
        );

        console.log("Defect deleted:", message);
        break;
      }

      default:
        break;
    }
  });

  ws.on("close", () => {
    stopEncoder();

    if (sessionId) {
      sessions.delete(sessionId);
      sessionId = null;
    }
  });
});

console.log("WebSocket server running on ws://localhost:8080/ws");
