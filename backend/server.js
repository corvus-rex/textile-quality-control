const WebSocket = require("ws");
const crypto = require("crypto");

const wss = new WebSocket.Server({ port: 8080, path: "/ws" });

const sessions = new Map();

/* ---------- SUSUT RANGES (AUTHORITATIVE IN BE) ---------- */
const SUSUT_RANGES = [
  { label: "0–10", min: 0, max: 10 },
  { label: "30–40", min: 30, max: 40 },
  { label: "40–60", min: 41, max: 60 },
  { label: "60–70", min: 61, max: 70 },
  { label: "100+", min: 101, max: Infinity }
];

// SAMPLE SUSUT OBJECT
// susut_table = {
//   columns: ["5", "7", "9", "11", "13", "others"],
//   rows: {
//     "1–10": { "5": 2, "others": 1 },
//     "11–30": { "7": 3 }
//   }
// }

function getRangeLabel(meter) {
  return SUSUT_RANGES.find(r => meter >= r.min && meter <= r.max)?.label ?? null;
}

wss.on("connection", ws => {
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
    if (encoderInterval) {
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

      /* ---------------- START SESSION ---------------- */
      case "start_session": {
        const sessionId = crypto.randomBytes(8).toString("hex");

        const susutRows = {};
        SUSUT_RANGES.forEach(r => susutRows[r.label] = {});

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

          defects: [],

          susut: {
            columns: [],
            rows: susutRows
          }
        });

        console.log("SESSION CREATED:");
        console.dir(sessions.get(sessionId), { depth: null });

        ws.send(JSON.stringify({
          command: "start_session_ack",
          id: sessionId
        }));

        startEncoder();
        break;
      }

      /* ---------------- SEND SUSUT (CORE CHANGE) ---------------- */
      case "send_susut": {
        const session = sessions.get(message.id);
        if (!session) return;

        const susutValue = String(message.susut);
        const meter = Number(message.meter);

        const rangeLabel = getRangeLabel(meter);
        if (!rangeLabel) return;

        let columnKey;

        if (session.susut.columns.includes(susutValue)) {
          columnKey = susutValue;
        } else if (session.susut.columns.length < 5) {
          session.susut.columns.push(susutValue);
          columnKey = susutValue;
        } else {
          columnKey = "others";
        }

        const row = session.susut.rows[rangeLabel];

        if (!row[columnKey]) row[columnKey] = 0;
        row[columnKey] += 1;

        console.log("SUSUT TABLE UPDATED:");
        console.dir(session.susut, { depth: null });
        break;
      }

      /* ---------------- SEND DEFECT ---------------- */
      case "send_defect": {
        const session = sessions.get(message.id);
        if (!session) return;

        session.defects.push({
          jenis_cacat: message.jenis_cacat,
          point: message.point,
          meter: message.meter
        });

        break;
      }

      /* ---------------- DELETE DEFECT ---------------- */
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
        break;
      }

      /* ---------------- END SESSION ---------------- */
      case "end_session": {
        stopEncoder();

        const session = sessions.get(message.sessionId);
        if (session) {
          console.log("SUMMARY SESSION STATE:");
          console.dir(session, { depth: null });

          // generate dummy summary values
          const summary = {
            command: "summary",
            id: message.sessionId,
            "res-meter": +(Math.random() * 10).toFixed(2),
            "res-yard": +(Math.random() * 10).toFixed(2),
            "res-k": +(Math.random() * 10).toFixed(2),
            "res-cmcd": +(Math.random() * 10).toFixed(2),
            "res-tp": Math.floor(Math.random() * 10),
            "res-pg": +(Math.random() * 10).toFixed(2),
            "res-grd": +(Math.random() * 10).toFixed(2)
          };

          ws.send(JSON.stringify(summary));
        }

        break;
      }

      case "update_summary": {
        const session = sessions.get(message.id);
        if (!session) break;

        session.update_summary = {
          cm: message.cm,
          berat: message.berat,
          lf: message.lf,
          sl: message.sl,
          ss: message.ss,
          grade: message.grade,
          ket_ef: message.ket_ef
        };

        ws.send(JSON.stringify({
          command: "final_summary",
          id: message.id,
          session
        }));

        sessions.delete(message.id);
        break;
      }

      default:
        console.warn("Unhandled command:", message.command);
    }
  });

  ws.on("close", stopEncoder);
});

console.log("WebSocket server running on ws://localhost:8080/ws");
