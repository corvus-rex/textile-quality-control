import { connect, send } from "./ws.js";
import { setEnabled, clearDefectList, clearSusutList, appendSusutRow, onSessionStart, onSessionStop, setCurPos, resetDefectSelection, initPointButtons, initDefectButtons, setSessionId } from "./ui.js";

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
var dateField = document.getElementById("dateField");
var typeField = document.getElementById("typeField");
var customTypeField = document.getElementById("customTypeField");
var nbField = document.getElementById("nbField");
var mcField = document.getElementById("mcField");
var tglNaikField = document.getElementById("tglNaikField");
var tglPotField = document.getElementById("tglPotField");
var potField = document.getElementById("potField");
var insPotField = document.getElementById("insPotField");
var paField = document.getElementById("paField");
var lebarField = document.getElementById("lebarField");
var baField = document.getElementById("baField");
var tagIdField = document.getElementById("tagIdField");
var insGrField = document.getElementById("insGrField");
var shiftField = document.getElementById("shiftField");
var insField = document.getElementById("insField");
var tglProsesField = document.getElementById("tglProsesField");

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
    /* ===== Roll Section ===== */
    date: dateField.value,
    type: typeField.value,
    custom_type: customTypeField.value,
    kp: kpField.value,
    tex_code: texCodeField.value,
    operator: operatorField.value,

    /* ===== Weaving Section ===== */
    nb: nbField.value,
    mc: mcField.value,
    tgl_naik: tglNaikField.value,
    tgl_pot: tglPotField.value,
    pot: potField.value,
    ins_pot: insPotField.value,
    pa: paField.value,
    lebar: lebarField.value,
    ba: baField.value,
    tag_id: tagIdField.value,
    ins_gr: insGrField.value,

    /* ===== BBSF Section ===== */
    shift: shiftField.value,
    ins: insField.value,
    tgl_proses: tglProsesField.value
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
  const container = document.getElementById("sub-container-susut-table");
  if (!container) return;

  container.innerHTML = "<h3>Susut Table</h3>";

  const table = document.createElement("table");
  table.className = "susut-table";

  // header
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

  // body
  SUSUT_RANGES.forEach(r => {
    const tr = document.createElement("tr");

    const labelTd = document.createElement("td");
    labelTd.textContent = r.label;
    tr.appendChild(labelTd);

    headers.forEach(h => {
      const td = document.createElement("td");

      const input = document.createElement("input");
      input.type = "number";
      input.min = 0;

      const value = susutTable[r.label][h] ?? 0;
      input.value = value;

      // write-back on edit
      input.onchange = () => {
        const v = Math.max(0, Number(input.value) || 0);
        input.value = v;

        if (!susutTable[r.label]) susutTable[r.label] = {};
        susutTable[r.label][h] = v;
      };

      td.appendChild(input);
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

function appendDefectRow(encoderPos, defectType, defectPoint) {
  const list = document.getElementById("dynamic-input-list");
  if (!list) return;

  const meterKey = Math.floor(Number(encoderPos));

  let row = list.querySelector(
    `.defect-row[data-meter="${meterKey}"]`
  );

  // update existing row
  if (row) {
    row.dataset.jenisCacat = defectType;
    row.dataset.point = defectPoint;

    row.querySelector(".type-col").textContent = defectType;
    row.querySelector(".point-col").textContent = defectPoint;
    return;
  }

  // create new row
  row = document.createElement("div");
  row.className = "defect-row";
  row.dataset.meter = meterKey;
  row.dataset.jenisCacat = defectType;
  row.dataset.point = defectPoint;

  const colPos = document.createElement("div");
  colPos.className = "defect-col encoder-col";
  colPos.textContent = `${meterKey} m`;

  const colType = document.createElement("div");
  colType.className = "defect-col type-col";
  colType.textContent = defectType;

  const colPoint = document.createElement("div");
  colPoint.className = "defect-col point-col";
  colPoint.textContent = defectPoint;

  // delete column
  const colDelete = document.createElement("div");
  colDelete.className = "defect-col delete-col";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.textContent = "✕";
  deleteBtn.className = "delete-btn";
  deleteBtn.title = "Delete row";

  deleteBtn.onclick = () => {
    send("delete_defect", {
      id: sessionId,
      jenis_cacat: row.dataset.jenisCacat,
      point: row.dataset.point,
      meter: Number(row.dataset.meter)
    });

    row.remove();
  };

  colDelete.appendChild(deleteBtn);

  row.appendChild(colPos);
  row.appendChild(colType);
  row.appendChild(colPoint);
  row.appendChild(colDelete);

  list.appendChild(row);
}