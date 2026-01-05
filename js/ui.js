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
  document.getElementById("addInputBtn").hidden = false;
}

export function onSessionStop() {
  ["kpField", "texCodeField", "operatorField"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = false;
  });

  document.getElementById("startBtn").hidden = false;
  document.getElementById("stopBtn").hidden = true;
  document.getElementById("addInputBtn").hidden = true;

  const container = document.getElementById("dynamicInputs");
  if (container) container.innerHTML = "";
}
export function setCurPos(curPos) {
    const elements = document.getElementsByClassName('encoder-pos');
    
    for (let i = 0; i < elements.length; i++) {
        elements[i].value = curPos;
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
