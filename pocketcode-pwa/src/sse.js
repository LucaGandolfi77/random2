function sleep(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
}

export class SseClient {
  constructor({ urlFactory, headers = {}, onEvent, onStatus, onError, retryMs = 1200 }) {
    this.urlFactory = urlFactory;
    this.headers = headers;
    this.onEvent = onEvent || (() => {});
    this.onStatus = onStatus || (() => {});
    this.onError = onError || (() => {});
    this.retryMs = retryMs;
    this.lastId = "";
    this.controller = null;
    this.stopped = false;
    this.attempt = 0;
    this.opened = false;
  }

  start() {
    if (!this.stopped) this._loop();
    return this;
  }

  stop() {
    this.stopped = true;
    this.controller?.abort();
    this.controller = null;
    this.onStatus("closed");
  }

  async _loop() {
    while (!this.stopped) {
      const controller = new AbortController();
      this.controller = controller;
      let sawData = false;
      try {
        const response = await fetch(this.urlFactory(this.lastId), {
          headers: { accept: "text/event-stream", ...this.headers },
          signal: controller.signal,
          cache: "no-store",
        });
        if (!response.ok) {
          const error = new Error(`Event stream failed (${response.status})`);
          error.status = response.status;
          throw error;
        }
        if (!response.body) throw new Error("This browser cannot stream events.");
        const reconnect = this.opened;
        this.opened = true;
        this.attempt = 0;
        this.onStatus("open", { reconnect });
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let data = [];
        let eventId = "";
        while (!this.stopped) {
          const { value, done } = await reader.read();
          if (done) break;
          sawData = true;
          buffer += decoder.decode(value, { stream: true });
          let index;
          while ((index = buffer.search(/\r?\n\r?\n/)) >= 0) {
            const chunk = buffer.slice(0, index);
            const match = buffer.slice(index).match(/^\r?\n\r?\n/);
            buffer = buffer.slice(index + (match ? match[0].length : 2));
            eventId = "";
            data = [];
            for (const line of chunk.split(/\r?\n/)) {
              if (!line || line.startsWith(":")) continue;
              const colon = line.indexOf(":");
              const field = colon >= 0 ? line.slice(0, colon) : line;
              const raw = colon >= 0 ? line.slice(colon + 1) : "";
              const valueText = raw.startsWith(" ") ? raw.slice(1) : raw;
              if (field === "data") data.push(valueText);
              else if (field === "id") eventId = valueText;
              else if (field === "retry") {
                const ms = Number(valueText);
                if (Number.isFinite(ms) && ms > 100) this.retryMs = Math.min(ms, 15_000);
              }
            }
            if (!data.length) continue;
            const text = data.join("\n");
            let event;
            try {
              event = JSON.parse(text);
            } catch {
              continue;
            }
            if (eventId) this.lastId = eventId;
            else if (event.seq !== undefined) this.lastId = String(event.seq);
            else if (event.id) this.lastId = String(event.id);
            this.onEvent(event);
          }
        }
        if (!this.stopped) throw new Error("Event stream closed.");
      } catch (error) {
        if (this.stopped || error.name === "AbortError") break;
        this.attempt += 1;
        this.onStatus("reconnecting", { attempt: this.attempt, error });
        if (!sawData && this.attempt === 1) this.onError(error);
        await sleep(Math.min(this.retryMs * this.attempt, 12_000), controller.signal);
      }
    }
  }
}
