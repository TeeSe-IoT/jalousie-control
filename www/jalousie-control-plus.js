## www/jalousie-control-plus.js
# Add this resource in your Lovelace resources (or via HACS). Then use the card in a dashboard.

```
class JalousieControlPlus extends HTMLElement {
  static getConfigElement() { return document.createElement("jcp-card-editor"); }
  static getStubConfig() {
    return {
      title: "Jalousie Control Plus",
      up_switch: "switch.jalousie_up",
      down_switch: "switch.jalousie_down",
      last_position_helper: "input_number.jcp_blind1_last_position",
      last_tilt_helper: "input_number.jcp_blind1_last_tilt",
      full_up_ms: 18000,
      full_down_ms: 18000,
      tilt_ms_per_15: 250,
      safety_ms: 150
    };
  }

  setConfig(config) {
    if (!config.up_switch || !config.down_switch) {
      throw new Error("Please set up_switch and down_switch");
    }
    this._config = config;
    this.render();
  }

  set hass(hass) {
    this._hass = hass;
    this.render();
  }

  getCardSize() { return 3; }

  _service(domain, service, data) {
    this._hass.callService(domain, service, data);
  }

  _callScript(name, data) {
    this._service("script", name.replace("script.", ""), data);
  }

  _pulseSwitch(entity_id, on) {
    this._service("switch", on ? "turn_on" : "turn_off", { entity_id });
  }

  _readState(entity_id, fallback=0) {
    const st = this._hass.states?.[entity_id];
    if (!st) return fallback;
    const v = parseFloat(st.state);
    return isNaN(v) ? fallback : v;
    }

  render() {
    if (!this._hass || !this._config) return;
    const c = this._config;
    const pos = this._readState(c.last_position_helper, 0);
    const tilt = this._readState(c.last_tilt_helper, 0);

    if (!this.card) {
      this.card = document.createElement("ha-card");
      this.card.header = c.title || "Jalousie Control Plus";
      this.card.style.padding = "12px";
      this.container = document.createElement("div");
      this.container.style.display = "grid";
      this.container.style.gridTemplateColumns = "1fr 1fr";
      this.container.style.gridTemplateRows = "auto auto auto";
      this.container.style.gap = "8px";

      // Buttons
      this.btnOpen = this._mkButton("Öffnen");
      this.btnClose = this._mkButton("Schließen");
      this.btnUp = this._mkButton("Hoch (halten)");
      this.btnDown = this._mkButton("Runter (halten)");

      // Info
      this.info = document.createElement("div");
      this.info.style.gridColumn = "1 / span 2";
      this.info.style.display = "flex";
      this.info.style.justifyContent = "space-between";
      this.info.style.fontSize = "0.95em";

      // Tilt selector
      this.tilt = document.createElement("select");
      this.tilt.style.gridColumn = "1 / span 2";
      for (let a = 0; a <= 180; a += 15) {
        const opt = document.createElement("option");
        opt.value = a;
        opt.textContent = `${a}°`;
        this.tilt.appendChild(opt);
      }
      this.tilt.addEventListener("change", () => this._setTilt(parseInt(this.tilt.value, 10)));

      // Layout positions
      this.container.appendChild(this.btnOpen);  // (0,0)
      this.container.appendChild(this.btnClose); // (0,1)
      this.container.appendChild(this.btnUp);    // (1,0)
      this.container.appendChild(this.btnDown);  // (1,1)
      this.container.appendChild(this.info);     // (2,0-1)
      this.container.appendChild(this.tilt);     // (3,0-1)

      this.card.appendChild(this.container);
      this.appendChild(this.card);

      // Wire events
      this.btnOpen.addEventListener("click", () => this._open());
      this.btnClose.addEventListener("click", () => this._close());

      const down = (e, up) => {
        e.preventDefault();
        this._pulseSwitch(up ? c.up_switch : c.down_switch, true);
      };
      const up = (e, upb) => {
        e.preventDefault();
        this._pulseSwitch(upb ? c.up_switch : c.down_switch, false);
      };

      // Mouse
      this.btnUp.addEventListener("mousedown", (e) => down(e, true));
      this.btnUp.addEventListener("mouseup", (e) => up(e, true));
      this.btnDown.addEventListener("mousedown", (e) => down(e, false));
      this.btnDown.addEventListener("mouseup", (e) => up(e, false));
      // Touch
      this.btnUp.addEventListener("touchstart", (e) => down(e, true));
      this.btnUp.addEventListener("touchend", (e) => up(e, true));
      this.btnDown.addEventListener("touchstart", (e) => down(e, false));
      this.btnDown.addEventListener("touchend", (e) => up(e, false));
    }

    this.info.textContent = `Position: ${Math.round(pos)}%    |    Winkel: ${Math.round(tilt)}°`;
    this.tilt.value = String(Math.round(tilt));
  }

  _mkButton(label){
    const b = document.createElement("mwc-button");
    b.raised = true;
    b.label = label;
    return b;
  }

  _open(){ this._callScript("script.jcp_open", this._commonScriptArgs()); }
  _close(){ this._callScript("script.jcp_close", this._commonScriptArgs()); }

  _setTilt(angle){
    const c = this._config;
    this._callScript("script.jcp_tilt_to_angle", {
      up_switch: c.up_switch,
      down_switch: c.down_switch,
      tilt_ms_per_15: c.tilt_ms_per_15 || 250,
      last_tilt_helper: c.last_tilt_helper,
      target_angle: angle,
      safety_ms: c.safety_ms || 120
    });
  }

  _commonScriptArgs(){
    const c = this._config;
    return {
      up_switch: c.up_switch,
      down_switch: c.down_switch,
      full_up_ms: c.full_up_ms || 18000,
      full_down_ms: c.full_down_ms || 18000,
      last_position_helper: c.last_position_helper,
      safety_ms: c.safety_ms || 150
    };
  }
}

customElements.define("jalousie-control-plus", JalousieControlPlus);

// Simple editor (optional)
class JcpCardEditor extends HTMLElement {
  setConfig(config){ this._config = config; this.render(); }
  set hass(hass){ this._hass = hass; }
  render(){
    if (!this._root){ this._root = this.attachShadow({mode:"open"}); }
    this._root.innerHTML = `
      <style> label{display:block;margin:6px 0 2px;} input{width:100%;} </style>
      <div>
        <label>Title</label><input id="title">
        <label>Up switch</label><input id="up_switch">
        <label>Down switch</label><input id="down_switch">
        <label>Last position helper</label><input id="pos">
        <label>Last tilt helper</label><input id="tilt">
        <label>Full up (ms)</label><input id="fup" type="number">
        <label>Full down (ms)</label><input id="fdown" type="number">
        <label>Tilt per 15° (ms)</label><input id="t15" type="number">
        <label>Safety (ms)</label><input id="safe" type="number">
      </div>`;
    const c = this._config || {};
    const $ = (id)=> this._root.getElementById(id);
    $("title").value = c.title || "";
    $("up_switch").value = c.up_switch || "";
    $("down_switch").value = c.down_switch || "";
    $("pos").value = c.last_position_helper || "";
    $("tilt").value = c.last_tilt_helper || "";
    $("fup").value = c.full_up_ms || 18000;
    $("fdown").value = c.full_down_ms || 18000;
    $("t15").value = c.tilt_ms_per_15 || 250;
    $("safe").value = c.safety_ms || 150;

    this._root.querySelectorAll("input").forEach(inp => {
      inp.addEventListener("change", () => this._onChange());
    });
  }
  _onChange(){
    const $ = (id)=> this._root.getElementById(id).value;
    const config = {
      type: "custom:jalousie-control-plus",
      title: $("title"),
      up_switch: $("up_switch"),
      down_switch: $("down_switch"),
      last_position_helper: $("pos"),
      last_tilt_helper: $("tilt"),
      full_up_ms: Number($("fup")),
      full_down_ms: Number($("fdown")),
      tilt_ms_per_15: Number($("t15")),
      safety_ms: Number($("safe"))
    };
    this.dispatchEvent(new CustomEvent("config-changed", {detail: {config}}));
  }
}
customElements.define("jcp-card-editor", JcpCardEditor);
