import { connect, send } from "./ws.js";
import { setEnabled, clearDefectList, appendDefectRow, onSessionStart, onSessionStop, setCurPos, resetDefectSelection, initPointButtons, initDefectButtons, setSessionId } from "./ui.js";

const backendURL = 'localhost:8080'
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const sendDefectBtn = document.getElementById("send-defect-btn");
const stopBtn = document.getElementById("stopBtn");

var kpField = document.getElementById("kpField");
var texCodeField = document.getElementById("texCodeField");
var operatorField = document.getElementById("operatorField");

let sessionId = null;
let encoderPos = 0;
let defectSent = null;

let defectPoint = null;
let defectType = null;

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
    switch (message.command) {
      case "start_session_ack":
        sessionId = message.id;
        // setSessionId(sessionId);
        onSessionStart(); 
        initPointButtons(point => {
          defectPoint = point;
        });
        initDefectButtons(type => {
          defectType = type;
        }); 
        break;

      case "update_meter":
        encoderPos = message.meter;
        setCurPos(encoderPos);
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
  encoderPos = "0";    
  setCurPos(encoderPos);

  resetDefectState();
  clearDefectList();
  onSessionStop();
};

sendDefectBtn.onclick = () => {
  send("send_defect", {
    'id': sessionId,
    'jenis_cacat': defectType,
    'point': defectPoint,
    'meter': encoderPos
  });
  appendDefectRow(
    encoderPos,
    defectType,
    defectPoint
  );
  resetDefectState();
};

function resetDefectState() {
  defectType = null;
  defectPoint = null;
  resetDefectSelection();
}