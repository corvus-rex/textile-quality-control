import { connect, send } from "./ws.js";
import { setEnabled, onSessionStart, onSessionStop, setCurPos, addDynamicInput, setSessionId } from "./ui.js";

const backendURL = 'localhost:8080'
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const addInputBtn = document.getElementById("addInputBtn");
const stopBtn = document.getElementById("stopBtn");

var kpField = document.getElementById("kpField");
var texCodeField = document.getElementById("texCodeField");
var operatorField = document.getElementById("operatorField");

let sessionId = null;
let curPos = 0;
let defectSent = null;

const protocol = location.protocol === "https:" ? "wss" : "ws";
const WS_URL = `${protocol}://${backendURL}/ws`;

connect(
  WS_URL,
  connected => {
    statusEl.textContent = connected ? "Connected" : "Disconnected";
    setEnabled(connected)
    if (!connected) {
      sessionId = null;
      setSessionId(null);
    }
    console.log(WS_URL, connected)
  },
  message => {
    switch (message.type) {
      case "start_session_ack":
        sessionId = message.data.session_id;
        // setSessionId(sessionId);
        onSessionStart(); 
        break;

      case "update_encoder":
        curPos = message.data.meter;
        setCurPos(curPos);
        break;

      default:
        console.warn("Unhandled message:", message);
    }
  }
);

startBtn.onclick = () => {
  send("start_session", {
    kp: kpField.value,
    tex_code: texCodeField.value,
    operator: operatorField.value
  });
};

stopBtn.onclick = () => {
  if (!sessionId) return;

  send("end_session", { sessionId });

  sessionId = null;
  curPos = null;    

  onSessionStop();
};

addInputBtn.onclick = () => {
  addDynamicInput((defectType, defectPoint, encoderPos) => {
    if (!sessionId) return;
    
    send("send_defect", {
      sessionId,
      defectType,
      defectPoint,
      encoderPos
    });
  }, curPos);
};
