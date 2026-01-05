let ws = null;
let onStateChange = () => {};
let onMessage = () => {};

export function connect(url, stateCallback, messageCallback) {
  onStateChange = stateCallback;
  onMessage = messageCallback;

  ws = new WebSocket(url);

  ws.onopen = () => onStateChange(true);
  ws.onclose = () => onStateChange(false);
  ws.onerror = () => onStateChange(false);

  ws.onmessage = event => {
    try {
      const msg = JSON.parse(event.data);
      onMessage(msg);
    } catch {
      // ignore invalid JSON
    }
  };
}

export function send(command, params = {}) {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;

  ws.send(JSON.stringify({
    command,
    ...params
  }));
}
