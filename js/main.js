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
// const backendURL = 'localhost:8080'
const statusEl = document.getElementById("status");
const startBtn = document.getElementById("startBtn");
const sendDefectBtn = document.getElementById("send-defect-btn");
const sendSusutBtn = document.getElementById("send-susut-btn");
const stopBtn = document.getElementById("stopBtn");
const submitSummaryBtn = document.getElementById("submitSummaryBtn");
const newSessionBtn = document.getElementById("newSessionBtn");

var kpField          = document.querySelector("#kpField input");
var texCodeField     = document.querySelector("#texCodeField input");
var operatorField    = document.querySelector("#operatorField input");

var dateField        = document.querySelector("#dateField input");
var typeField        = document.querySelector("#typeField select");
var customTypeField  = document.querySelector("#customTypeField input");

var nbField          = document.querySelector("#nbField input");
var mcField          = document.querySelector("#mcField input");
var tglNaikField     = document.querySelector("#tglNaikField input");
var tglPotField      = document.querySelector("#tglPotField input");
var potField         = document.querySelector("#potField input");
var insPotField      = document.querySelector("#insPotField input");
var paField          = document.querySelector("#paField input");
var lebarField       = document.querySelector("#lebarField input");
var baField          = document.querySelector("#baField input");
var tagIdField       = document.querySelector("#tagIdField input");
var insGrField       = document.querySelector("#insGrField input");

var shiftField       = document.querySelector("#shiftField input");
var insField         = document.querySelector("#insField input");
var tglProsesField   = document.querySelector("#tglProsesField input");

var susutField       = document.getElementById("susut-input");

const cmField = document.getElementById("cmField");
const beratField = document.getElementById("beratField");
const lfField = document.getElementById("lfField");
const slField = document.getElementById("slField");
const ssField = document.getElementById("ssField");
const gradeField = document.getElementById("gradeField");
const ketEfField = document.getElementById("ketEfField");

let sessionId = null;
let encoderPos = 0;
let defectSummary = {};

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

        const meter = Number(message["total_meter"]);
        const yard  = Number(message["total_yard"]);
        const tp    = Number(message["total_point"]);
        const pg    = Number(message["point_grade"]);

        document.getElementById("res-k").textContent = "0"
        document.getElementById("res-cmcd").textContent = "0"

        document.getElementById("res-meter").textContent =
          Number.isFinite(meter) ? meter.toFixed(1) : "0";

        document.getElementById("res-yard").textContent =
          Number.isFinite(yard) ? yard.toFixed(1) : "0";

        document.getElementById("res-tp").textContent =
          Number.isFinite(tp) ? Math.trunc(tp) : "0";

        document.getElementById("res-pg").textContent =
          Number.isFinite(pg) ? pg.toFixed(2) : "0";
        
        document.getElementById("res-grd").textContent =
          message["grade"] ?? "";

        lastReceivedGrade = message["grade"] ?? null;
        let gradeFromBE = message["grade"] ?? null;

        const gradeSelect = document.getElementById("gradeField");

        if (gradeFromBE) {
          // check if option already exists
          let opt = gradeSelect.querySelector(
            `option[value="${gradeFromBE}"]`
          );

          // if not, create a temporary option
          if (!opt) {
            opt = document.createElement("option");
            opt.value = gradeFromBE;
            opt.textContent = gradeFromBE;
            opt.dataset.dynamic = "true"; // mark as injected
            gradeSelect.appendChild(opt);
          }

          gradeSelect.value = gradeFromBE;
        } else {
          gradeSelect.value = "";
        }
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

        const meter = Number(document.getElementById("res-meter")?.textContent) || 0;
        const yard  = Number(document.getElementById("res-yard")?.textContent) || 0;
        const tp    = document.getElementById("res-tp")?.textContent || "";
        const pg    = document.getElementById("res-pg")?.textContent || "";
        const grd   = document.getElementById("res-grd")?.textContent || "";

        // values from summary inputs
        const berat = Number(beratField.value) || 0;
        const cm    = Number(cmField.value) || 0;
        const lf    = lfField.value || "";
        const sl    = slField.value || "";
        const ss    = ssField.value || "";

        const kValue   = berat > 0 ? (yard / berat) : 0;

        // fill summary table
        setText("sum-k",    kValue ? kValue.toFixed(2) : "");
        setText("sum-yard", yard ? `${yard.toFixed(1)} yard` : "");
        setText("sum-berat", berat ? `${berat.toFixed(2)} kg` : "");
        setText("sum-meter", meter ? `${meter.toFixed(1)} meter` : "");
        setText("sum-lf", lf);
        setText("sum-sl", sl);
        setText("sum-ss", ss);
        setText("sum-tp", tp);
        setText("sum-pg", pg);
        setText("sum-grd", grd);

        const defectSummaryBody = document.querySelector(
          ".defect-point-summary-table tbody"
        );

        defectSummaryBody.innerHTML = "";

        Object.entries(defectSummary).forEach(([type, data]) => {
          const tr = document.createElement("tr");
          tr.innerHTML = `
            <td>${type}</td>
            <td>${data.count}</td>
            <td>${data.totalPoint}</td>
          `;
          defectSummaryBody.appendChild(tr);
        });

        document.getElementById("grid-4").hidden = true;
        document.getElementById("grid-5").hidden = false;
      }

      default:
        console.warn("Unhandled message:", message);
    }
  }
);

if (kpField && startBtn) {

  kpField.addEventListener("input", () => {
    // hard limit to 4 chars
    if (kpField.value.length > 4) {
      kpField.value = kpField.value.slice(0, 4);
    }

    // enable start only if exactly 4 chars
    startBtn.disabled = kpField.value.length !== 4;
  });

  kpField.addEventListener("paste", e => {
    e.preventDefault();
    const text = (e.clipboardData || window.clipboardData)
      .getData("text")
      .slice(0, 4);

    kpField.value = text;
    startBtn.disabled = text.length !== 4;
  });
}

startBtn.onclick = () => {
  send("start_session", {
    /* ===== Roll Section ===== */
    date: document.querySelector("#dateField input")?.value || null,

    tex_type:
      document.querySelector("#typeField select")?.value === "Custom"
        ? document.querySelector("#customTypeField input")?.value || null
        : document.querySelector("#typeField select")?.value || null,

    kp: document.querySelector("#kpField input")?.value || null,
    tex_code: document.querySelector("#texCodeField input")?.value || null,
    operator: document.querySelector("#operatorField input")?.value || null,

    /* ===== Weaving Section ===== */
    nb: document.querySelector("#nbField input")?.value || null,
    mc: document.querySelector("#mcField input")?.value || null,
    tgl_naik: document.querySelector("#tglNaikField input")?.value || null,
    tgl_pot: document.querySelector("#tglPotField input")?.value || null,
    pot: document.querySelector("#potField input")?.value || null,
    ins_pot: document.querySelector("#insPotField input")?.value || null,
    pa: document.querySelector("#paField input")?.value || null,
    lebar: document.querySelector("#lebarField input")?.value || null,
    ba: document.querySelector("#baField input")?.value || null,
    tag_id: document.querySelector("#tagIdField input")?.value || null,
    ins_gr: document.querySelector("#insGrField input")?.value || null,

    /* ===== BBSF Section ===== */
    shift_bbsf: document.querySelector("#shiftField input")?.value || null,
    ins_bbsf: document.querySelector("#insField input")?.value || null,
    tgl_proses: document.querySelector("#tglProsesField input")?.value || null
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
  if (!defectSummary[defectType]) {
    defectSummary[defectType] = {
      totalPoint: 0,
      count: 0
    };
  }

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

  // show start button
  document.getElementById("startBtn").hidden = false;

  // Show roll section
  const rollHeader = document.getElementById("roll-header");
  if (rollHeader) rollHeader.hidden = true;

  // Show weaving section
  const weavingHeader = document.getElementById("weaving-header");
  const weavingSection = document.getElementById("weaving-section");
  if (weavingHeader) weavingHeader.hidden = false;
  if (weavingSection) weavingSection.hidden = false;

  // Show weaving section
  const bbsfHeader = document.getElementById("bbsf-header");
  const bbsfSection = document.getElementById("bbsf-section");
  if (bbsfHeader) bbsfHeader.hidden = false;
  if (bbsfSection) bbsfSection.hidden = false;

  const texCodeField = document.getElementById("texCodeField");
  if (texCodeField) {
    texCodeField.style.gridColumn = "span 2";
  }

  const operatorField = document.getElementById("operatorField");
  if (operatorField) {
    operatorField.style.gridColumn = "span 2";
  }
  // Reset Defect Summary
  defectSummary = {};
  // ===== Reset Update Summary fields =====
  const cmField = document.getElementById("cmField");
  const beratField = document.getElementById("beratField");
  const lfField = document.getElementById("lfField");
  const slField = document.getElementById("slField");
  const ssField = document.getElementById("ssField");
  const gradeField = document.getElementById("gradeField");
  const ketEfField = document.getElementById("ketEfField");

  if (cmField) cmField.value = "";
  if (beratField) beratField.value = "";
  if (lfField) lfField.value = "";
  if (slField) slField.value = "";
  if (ssField) ssField.value = "";
  if (gradeField) gradeField.value = "";
  if (ketEfField) ketEfField.value = "";
  document
  .querySelectorAll('#gradeField option[data-dynamic="true"]')
  .forEach(opt => opt.remove());
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
};

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

  /* ---------- header ---------- */
  const headerRow = document.createElement("tr");
  headerRow.innerHTML = "<th></th>";

  const headers = susutColumns
    .slice(0, 5)
    .sort((a, b) => Number(a) - Number(b));
  headers.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });

  table.appendChild(headerRow);

  /* ---------- body ---------- */
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

      const value = susutTable[r.label]?.[h] ?? 0;
      input.value = value;

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
  
  const range = getSusutRangeByEncoder(encoderPos);

  if (!range) {
    console.warn("Encoder position out of SUSUT ranges:", encoderPos);
    return;
  }

  send("update_susut", {
    id: sessionId,
    panjang: Number(susutField.value),
    meter_start: range.min,
    meter_end: range.max === Infinity ? null : range.max,
    jumlah: 1
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

  /* ---------- CASE 1: row already exists (same meter) ---------- */
  if (row) {
    const oldType = row.dataset.jenisCacat;
    const oldPoint = row.dataset.point;

    // If same meter already has a defect then DO NOT increment summary
    // but we must adjust summary if the defect type/point changes
    if (oldType !== defectType || oldPoint !== String(defectPoint)) {
      removeFromDefectSummary(oldType, oldPoint);
      addToDefectSummary(defectType, defectPoint);
    }

    row.dataset.jenisCacat = defectType;
    row.dataset.point = defectPoint;

    row.querySelector(".type-col").textContent = defectType;
    row.querySelector(".point-col").textContent = defectPoint;
    return;
  }

  /* ---------- CASE 2: new row ---------- */
  addToDefectSummary(defectType, defectPoint);

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

  /* ---------- delete button ---------- */
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
    console.log(defectSummary);
    removeFromDefectSummary(
      row.dataset.jenisCacat,
      row.dataset.point
    );

    row.remove();
    console.log(defectSummary);
  };

  colDelete.appendChild(deleteBtn);

  row.appendChild(colPos);
  row.appendChild(colType);
  row.appendChild(colPoint);
  row.appendChild(colDelete);

  list.appendChild(row);
}

const resK = document.getElementById("res-k");

beratField.addEventListener("input", () => {
  const yard = getNumber("res-yard");
  const berat = Number(beratField.value) || 0;

  if (yard > 0 && berat > 0) {
    resK.textContent = (yard / berat).toFixed(2);
  } else {
    resK.textContent = "0";
  }
});

const resCMCD = document.getElementById("res-cmcd");

cmField.addEventListener("input", () => {
  const meter = getNumber("res-meter");
  const cm = Number(cmField.value) || 0;

  if (meter > 0 && cm > 0) {
    resCMCD.textContent = (cm / meter).toFixed(2);
  } else {
    resCMCD.textContent = "0";
  }
});

function getNumber(id) {
  return Number(document.getElementById(id)?.textContent) || 0;
}

const setText = (id, value) => {
  const el = document.getElementById(id);
  if (el) el.textContent = value ?? "";
};

function getSusutRangeByEncoder(pos) {
  const p = Number(pos);

  return SUSUT_RANGES.find(r => p >= r.min && p <= r.max) || null;
}

function addToDefectSummary(type, point) {
  if (!defectSummary[type]) {
    defectSummary[type] = { count: 0, totalPoint: 0 };
  }

  defectSummary[type].count += 1;
  defectSummary[type].totalPoint += Number(point);
}

function removeFromDefectSummary(type, point) {
  if (!defectSummary[type]) return; 
  console.log("aaa",defectSummary[type].count);

  defectSummary[type].count -= 1;
  defectSummary[type].totalPoint -= Number(point);
  console.log("aaa",defectSummary[type].count);

  if (
    defectSummary[type].count <= 0 ||
    defectSummary[type].totalPoint <= 0
  ) {
    delete defectSummary[type];
  }
}
