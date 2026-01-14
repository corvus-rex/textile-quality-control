let selectedPoint = null;
let selectedDefectType = null;

// ON LOAD
const dateField = document.getElementById("dateField");
if (dateField) {
  dateField.value = new Date().toISOString().split("T")[0];
}

const typeField = document.getElementById("typeField");
const customTypeField = document.getElementById("customTypeField");
typeField.addEventListener("change", () => {
  if (typeField.value === "Custom") {
    customTypeField.hidden = false;
    customTypeField.disabled = false;

    typeField.style.gridColumn = "span 1";   
  } else {
    customTypeField.hidden = true;
    customTypeField.disabled = true;
    customTypeField.value = "";

    typeField.style.gridColumn = "span 2"; 
  }
});

const DEFECT_OPTIONS = [
  'AW','B','BAP','BKRT','BL','BLPT','BLPT GREY','BMC','BP','BR','BTA','BTL','BTS',
  'BTT','BTTS','EXST','J','K','KOTOR','KRT','KTR','LB','LD','LK','LKC','LKI','LKS',
  'LKT','LM','LOSP','LP','LPB','LPT','NODA','P.SLUB','PB','PD','PK','PKI','PKL',
  'PKS','PLC','PM','PP','PS','PSS','PTM','PTR','PTS','RP','SA','SLUB','SMG','SMS',
  'SNL','WP','WT'
];

export function setEnabled(enabled) {
  ["kpField", "texCodeField", "operatorField", "startBtn", "addInputBtn"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = !enabled;
  });
  
}

export function onSessionStart() {
  console.log("FOO");
  ["kpField", "texCodeField", "operatorField"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = true;
  });

  document.getElementById("startBtn").hidden = true;
  document.getElementById("stopBtn").hidden = false;
  document.getElementById("grid-3").hidden = false;

  // Hide weaving section
  const weavingHeader = document.getElementById("weaving-header");
  const weavingSection = document.getElementById("weaving-section");
  if (weavingHeader) weavingHeader.hidden = true;
  if (weavingSection) weavingSection.hidden = true;

  // Hide weaving section
  const bbsfHeader = document.getElementById("bbsf-header");
  const bbsfSection = document.getElementById("bbsf-section");
  if (bbsfHeader) bbsfHeader.hidden = true;
  if (bbsfSection) bbsfSection.hidden = true;

  const texCodeField = document.getElementById("texCodeField");
  if (texCodeField) {
    texCodeField.style.gridColumn = "span 1";
  }

  const operatorField = document.getElementById("operatorField");
  if (operatorField) {
    operatorField.style.gridColumn = "span 1";
  }

  const stopBtn = document.getElementById("stopBtn");
  if (stopBtn) {
    stopBtn.style.gridColumn = "span 2";
  }
}

export function initPointButtons(onSelect) {
  const container = document.querySelector(".point-list");
  container.innerHTML = "";

  selectedPoint = null;

  for (let i = 1; i <= 4; i++) {
    const btn = document.createElement("button");
    btn.textContent = i;
    btn.className = "point-btn";

    btn.onclick = () => {
    
      container.querySelectorAll(".point-btn").forEach(b => {
        b.classList.remove("selected");
      });

       
      btn.classList.add("selected");
      selectedPoint = i;

      onSelect(i);
    };

    container.appendChild(btn);
  }
}

export function initDefectButtons(onSelect) {
  const container = document.querySelector(".defect-list");
  container.innerHTML = "";

  selectedDefectType = null;

  DEFECT_OPTIONS.forEach(defect => {
    const btn = document.createElement("button");
    btn.textContent = defect;
    btn.className = "defect-btn";

    btn.onclick = () => {
      container.querySelectorAll(".defect-btn").forEach(b => {
        b.classList.remove("selected");
      });

      btn.classList.add("selected");
      selectedDefectType = defect;

      onSelect(defect);
    };

    container.appendChild(btn);
  });
}

export function onSessionStop() {
  ["kpField", "texCodeField", "operatorField"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  // Show weaving section
  const weavingHeader = document.getElementById("weaving-header");
  const weavingSection = document.getElementById("weaving-section");
  if (weavingHeader) weavingHeader.hidden = false;
  if (weavingSection) weavingSection.hidden = false;

  // Show BBSF section
  const bbsfHeader = document.getElementById("bbsf-header");
  const bbsfSection = document.getElementById("bbsf-section");
  if (bbsfHeader) bbsfHeader.hidden = false;
  if (bbsfSection) bbsfSection.hidden = false;

  document.getElementById("startBtn").hidden = false;
  document.getElementById("stopBtn").hidden = true;
  document.getElementById("grid-3").hidden = true;
  const texCodeField = document.getElementById("texCodeField");
  if (texCodeField) {
    texCodeField.style.gridColumn = "span 2";
  }

  const operatorField = document.getElementById("operatorField");
  if (operatorField) {
    operatorField.style.gridColumn = "span 2";
  }
}
export function setCurPos(curPos) {
  const elements = document.getElementsByClassName("encoder-pos");
  const formatted = Number(curPos).toFixed(1);

  for (let i = 0; i < elements.length; i++) {
    elements[i].value = `${formatted} m`;
  }
}

export function setSessionId(id) {
  const el = document.getElementById("sessionId");
  el.textContent = id ? `Session ID: ${id}` : "";
}


export function addDynamicInput(onSubmit, curPos) {
  const container = document.getElementById("dynamicInputs");

  const row = document.createElement("div");
  row.className = "dynamic-row";

  const encoderPos = document.createElement("input");
  encoderPos.className = "encoder-pos";
  encoderPos.disabled = true;
  encoderPos.type = "text";
  encoderPos.value = curPos ?? 0;

  const defectType = document.createElement("input");
  defectType.className = "defect-type-input"
  defectType.type = "text";
  defectType.placeholder = "Jenis Cacat";
  const defectPoint = document.createElement("select");
  defectPoint.className = "defect-point-input";

  ["1", "2", "3", "4"].forEach(value => {
  const option = document.createElement("option");
  option.value = value;
  option.textContent = value;
    defectPoint.appendChild(option);
  });

  const sendDefectBtn = document.createElement("button");
  sendDefectBtn.className = "send-defect-btn";
  sendDefectBtn.textContent = "Submit Defect";
  sendDefectBtn.onclick = () => {
    onSubmit(defectType.value, defectPoint.value);

    // change encoder class
    const encoder = row.querySelector(".encoder-pos");
    if (encoder) {
        encoder.classList.remove("encoder-pos");
        encoder.classList.add("encoder-pos-fixed");
    }

    // disable all inputs/buttons/selects in this row
    row.querySelectorAll("input, button, select").forEach(el => {
        el.disabled = true;
    });
  };

  row.appendChild(encoderPos);
  row.appendChild(defectType);
  row.appendChild(defectPoint);
  row.appendChild(sendDefectBtn);
  container.appendChild(row);
}

export function resetDefectSelection() {
  document.querySelectorAll(".defect-btn, .point-btn").forEach(btn => {
    btn.classList.remove("selected");
  });
}

export function appendDefectRow(encoderPos, defectType, defectPoint) {
  const list = document.getElementById("dynamic-input-list");
  if (!list) return;

  const row = document.createElement("div");
  row.className = "defect-row";

  const colPos = document.createElement("div");
  colPos.className = "defect-col encoder-col";
  colPos.textContent = `${Math.floor(Number(encoderPos))} m`;

  const colType = document.createElement("div");
  colType.className = "defect-col type-col";
  colType.textContent = defectType;

  const colPoint = document.createElement("div");
  colPoint.className = "defect-col point-col";
  colPoint.textContent = defectPoint;

  row.appendChild(colPos);
  row.appendChild(colType);
  row.appendChild(colPoint);

  list.appendChild(row);
}

export function clearDefectList() {
  const list = document.getElementById("dynamic-input-list");
  if (list) {
    list.innerHTML = "";
  }
}