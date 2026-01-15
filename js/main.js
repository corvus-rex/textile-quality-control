import { connect, send } from "./ws.js";
import { setEnabled, clearDefectList, clearSusutList, appendDefectRow, appendSusutRow, onSessionStart, onSessionStop, setCurPos, resetDefectSelection, initPointButtons, initDefectButtons, setSessionId } from "./ui.js";

const SUSUT_RANGES = [
  { label: "0–10", min: 0, max: 10 },
  { label: "30–40", min: 30, max: 40 },
  { label: "41–60", min: 41, max: 61 },
  { label: "60–70", min: 60, max: 70 },
  { label: "100+", min: 101, max: Infinity }
];

const backendURL = 'localhost:8080'
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const sendDefectBtn = document.getElementById("send-defect-btn");
const sendSusutBtn = document.getElementById("send-susut-btn");
const stopBtn = document.getElementById("stopBtn");

var kpField = document.getElementById("kpField");
var texCodeField = document.getElementById("texCodeField");
var operatorField = document.getElementById("operatorField");
var susutField = document.getElementById("susut-input");

let sessionId = null;
let encoderPos = 0;
let defectSent = null;

let defectPoint = null;
let defectType = null;

let susutColumns = [];
let susutTable = {};
SUSUT_RANGES.forEach(r => {
  susutTable[r.label] = {};
});

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
        encoderPos = Number(message.meter);
        setCurPos(encoderPos.toFixed(1));
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
  encoderPos = 0;
  setCurPos("0.0");

  resetDefectState();
  clearDefectList();
  clearSusutList();
  resetSusutTable();
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

sendSusutBtn.onclick = () => {
  send("send_susut", {
    'id': sessionId,
    'susut': susutField.value,
    'meter': encoderPos 
  });
  appendSusutRow(
    encoderPos,
    susutField.value
  );
  const value = susutField.value.trim();
  if (!value) return;

  handleSusutSubmit(value, Number(encoderPos));
  resetSusutState();
};

function resetSusutState() {
  susutField.value = 0;
}

function getEncoderRangeLabel(meter) {
  for (const r of SUSUT_RANGES) {
    if (meter >= r.min && meter < r.max) {
      return r.label;
    }
  }
  return null;
}

function renderSusutTable() {
  console.log("SOOO")
  const container = document.getElementById("sub-container-susut-table");
  container.innerHTML = "<h3>Susut Table</h3>";

  const table = document.createElement("table");
  table.className = "susut-table";

  const headerRow = document.createElement("tr");
  headerRow.innerHTML = "<th></th>";

  const headers = [...susutColumns];
  if (susutColumns.length >= 5) headers.push("others");

  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  SUSUT_RANGES.forEach(r => {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.textContent = r.label;
    tr.appendChild(labelTd);

    headers.forEach(h => {
      const td = document.createElement("td");
      td.textContent = susutTable[r.label][h] ?? 0;
      tr.appendChild(td);
    });

    table.appendChild(tr);
  });

  container.appendChild(table);
}

function handleSusutSubmit(susutValue, encoderPos) {
  const rangeLabel = getEncoderRangeLabel(encoderPos);
  if (!rangeLabel) return;

  let columnKey;

  if (susutColumns.includes(susutValue)) {
    columnKey = susutValue;
  } else if (susutColumns.length < 5) {
    susutColumns.push(susutValue);
    columnKey = susutValue;
  } else {
    columnKey = "others";
  }

  // init cell if missing
  if (!susutTable[rangeLabel][columnKey]) {
    susutTable[rangeLabel][columnKey] = 0;
  }

  susutTable[rangeLabel][columnKey] += 1;

  renderSusutTable();
}

function resetSusutTable() {
  // reset columns
  susutColumns = [];

  // reset table data
  susutTable = {};
  SUSUT_RANGES.forEach(r => {
    susutTable[r.label] = {};
  });

  // clear table UI
  const tableContainer = document.getElementById("sub-container-susut-table");
  if (tableContainer) {
    tableContainer.innerHTML = "<h3>Susut Table</h3>";
  }
}
