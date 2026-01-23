import { connect, send } from "./ws.js";
import { setEnabled, clearDefectList, clearSusutList, appendSusutRow, onSessionStart, onSessionStop, setCurPos, resetDefectSelection, initPointButtons, initDefectButtons, setSessionId } from "./ui.js";

const SUSUT_RANGES = [
  { label: "0–10", min: 0, max: 10 },
  { label: "30–40", min: 30, max: 40 },
  { label: "40–60", min: 41, max: 60 },
  { label: "60–70", min: 61, max: 70 },
  { label: "100+", min: 101, max: Infinity }
];

const backendURL = 'localhost:8776'
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const sendDefectBtn = document.getElementById("send-defect-btn");
const sendSusutBtn = document.getElementById("send-susut-btn");
const stopBtn = document.getElementById("stopBtn");
const submitSummaryBtn = document.getElementById("submitSummaryBtn");
const newSessionBtn = document.getElementById("newSessionBtn");

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
const cmField = document.getElementById("cmField");
const beratField = document.getElementById("beratField");
const lfField = document.getElementById("lfField");
const slField = document.getElementById("slField");
const ssField = document.getElementById("ssField");
const gradeField = document.getElementById("gradeField");
const ketEfField = document.getElementById("ketEfField");

let sessionId = null;
let encoderPos = 0;
let defectSent = null;

let lastReceivedGrade = null;

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

      case "end_session_ack": {
        console.log("SUMM")

        const meter = Number(message["total_meter"]);
        const yard  = Number(message["total_yard"]);
        const tp    = Number(message["total_point"]);
        const pg    = Number(message["point_grade"]);

        document.getElementById("res-meter").textContent =
          Number.isFinite(meter) ? meter.toFixed(1) : "";

        document.getElementById("res-yard").textContent =
          Number.isFinite(yard) ? yard.toFixed(1) : "";

        document.getElementById("res-tp").textContent =
          Number.isFinite(tp) ? Math.trunc(tp) : "";

        document.getElementById("res-pg").textContent =
          Number.isFinite(pg) ? pg.toFixed(2) : "";
        
        document.getElementById("res-grd").textContent =
          message["grade"] ?? "";

        lastReceivedGrade = message["grade"] ?? null;

        break;
      }

      case "submit_summary_ack": {
        const rollRows = document.querySelectorAll(
          "#sub-container-roll-summary td"
        );

        rollRows[0].textContent = dateField.value || "";
        rollRows[1].textContent =
          typeField.value === "Custom"
            ? customTypeField.value
            : typeField.value || "";
        rollRows[2].textContent = kpField.value || "";
        rollRows[3].textContent = texCodeField.value || "";
        rollRows[4].textContent = operatorField.value || "";

        const weavingRows = document.querySelectorAll(
          "#sub-container-weaving-summary td"
        );

        [
          nbField.value,
          mcField.value,
          tglNaikField.value,
          tglPotField.value,
          potField.value,
          insPotField.value,
          paField.value,
          lebarField.value,
          baField.value,
          tagIdField.value,
          insGrField.value
        ].forEach((val, i) => {
          weavingRows[i].textContent = val || "";
        });

        const bbsfRows = document.querySelectorAll(
          "#sub-container-bbsf-summary td"
        );

        [
          shiftField.value,
          insField.value,
          tglProsesField.value
        ].forEach((val, i) => {
          bbsfRows[i].textContent = val || "";
        });

        const defectBody = document.querySelector(
          ".defect-summary-table tbody"
        );
        defectBody.innerHTML = "";

        document.querySelectorAll("#dynamic-input-list .defect-row")
          .forEach(row => {
            const meter = row.querySelector(".encoder-col")?.textContent || "";
            const type = row.querySelector(".type-col")?.textContent || "";
            const point = row.querySelector(".point-col")?.textContent || "";

            const tr = document.createElement("tr");
            tr.innerHTML = `
              <td>${meter}</td>
              <td>${type}</td>
              <td>${point}</td>
            `;
            defectBody.appendChild(tr);
          }
        );

        const susutTableEl = document.querySelector(".susut-summary-table");
        const theadRow = susutTableEl.querySelector("thead tr");

        // clear old headers except "Range"
        while (theadRow.cells.length > 1) {
          theadRow.deleteCell(1);
        }

        // add FE-defined columns
        susutColumns.forEach(col => {
          const th = document.createElement("th");
          th.textContent = col;
          theadRow.appendChild(th);
        });
        const susutBody = susutTableEl.querySelector("tbody");

        Array.from(susutBody.rows).forEach(row => {
          const rangeLabel = row.cells[0].textContent.trim();
          const rowData = susutTable[rangeLabel] || {};

          // clear old cells
          while (row.cells.length > 1) {
            row.deleteCell(1);
          }

          // fill values in FE column order
          susutColumns.forEach(col => {
            const td = document.createElement("td");
            td.textContent = rowData[col] ?? "";
            row.appendChild(td);
          });
        });

        sessionId = null;
        encoderPos = 0;
        setCurPos("0.0");

        resetDefectState();
        clearDefectList();
        clearSusutList();
        resetSusutTable();

        document.getElementById("grid-4").hidden = true;
        document.getElementById("grid-5").hidden = false;
      }

      default:
        console.warn("Unhandled message:", message);
    }
  }
);

startBtn.onclick = () => {
  send("start_session", {
    /* ===== Roll Section ===== */
    date: dateField.value,
    tex_type: typeField.value,
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
    shift_bbsf: shiftField.value,
    ins_bbsf: insField.value,
    tgl_proses: tglProsesField.value
  });
};

stopBtn.onclick = () => {
  if (!sessionId) return;

  send("end_session", { sessionId });

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

submitSummaryBtn.onclick = () => {
  send("submit_summary", {
    'id': sessionId,
    'cm': Number(cmField.value) || "",
    'berat': Number(beratField.value) || "",
    'lf': Number(lfField.value) || "",
    'sl': Number(slField.value) || "",
    'ss': ssField.value || "",
    'grade': gradeField.value || lastReceivedGrade || "",
    'ket_ef': ketEfField.value || ""
  });
};

newSessionBtn.onclick = () => {
  // hide summary
  const grid5 = document.getElementById("grid-5");
  if (grid5) grid5.hidden = true;

  // show roll section
  const grid2 = document.getElementById("roll-section");
  if (grid2) grid2.hidden = false;
};

function resetDefectState() {
  defectType = null;
  defectPoint = null;
  resetDefectSelection();
}

sendSusutBtn.onclick = () => {
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
  
  send("update_susut", {
    'id': sessionId,
    'panjang': Number(susutField.value),
    'meter_start': Number(encoderPos),
    'meter_end': Number(encoderPos) + Number(susutField.value),
    'jumlah': 1
  });
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
