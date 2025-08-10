# Repository: TeeSe-IoT/jalousie-control-plus

This package gives you a quick, good-looking Jalousie control in Home Assistant with:
- Up/Down (press & hold)
- Open / Close (one-tap)
- Lamella tilt (0–180° in 15° steps)
- Persistent last position & tilt (via helpers)

Works today without a custom Python integration. Later, it can be migrated into an integration.

---

## Folder structure
```
jalousie-control-plus/
  ├── blueprints/
  │    └── package_jcp_scripts.yaml        # HA package: scripts + example helpers
  ├── www/
  │    └── jalousie-control-plus.js        # Lovelace Custom Card
  ├── hacs.json
  ├── README.md
  └── LICENSE
```

---

## blueprints/package_jcp_scripts.yaml
# Put this file into your HA config under `config/packages/` (enable packages in configuration.yaml)
# It defines:
#  - Generic scripts (re-usable for any blind)
#  - Example helpers you can duplicate per blind

```
# =====================
# Jalousie Control Plus – Generic Scripts & Example Helpers
# =====================

# --- Example helpers for ONE blind (duplicate per blind) ---
input_number:
  jcp_blind1_last_position:
    name: JCP Blind1 Last Position
    min: 0
    max: 100
    step: 1
    unit_of_measurement: "%"
    icon: mdi:percent
    mode: box

  jcp_blind1_last_tilt:
    name: JCP Blind1 Last Tilt
    min: 0
    max: 180
    step: 15
    unit_of_measurement: "°"
    icon: mdi:angle-acute
    mode: slider

# --- Generic scripts (re-use for any blind) ---
script:
  # Turn a relay on for a duration (ms), then off. Safety waits are supported.
  jcp_pulse:
    alias: JCP Pulse Relay
    mode: parallel
    fields:
      switch_entity:
        description: Up or Down switch entity_id
        example: switch.blind1_up
      duration_ms:
        description: Pulse duration in milliseconds
        example: 250
      safety_ms:
        description: Optional safety pause before actuation (ms)
        example: 150
    sequence:
      - choose:
          - conditions: "{{ safety_ms|int > 0 }}"
            sequence:
              - delay: "{{ (safety_ms|int / 1000) | float }}"
      - service: switch.turn_on
        target:
          entity_id: "{{ switch_entity }}"
      - delay: "{{ (duration_ms|int / 1000) | float }}"
      - service: switch.turn_off
        target:
          entity_id: "{{ switch_entity }}"

  # Move blind to absolute position [0..100] using time-based calculation.
  jcp_move_to_percent:
    alias: JCP Move To Percent
    mode: parallel
    fields:
      up_switch:
        description: Switch entity that drives UP movement
      down_switch:
        description: Switch entity that drives DOWN movement
      full_up_ms:
        description: Time for full travel from bottom (0%) to top (100%) in ms
      full_down_ms:
        description: Time for full travel from top (100%) to bottom (0%) in ms
      last_position_helper:
        description: input_number that stores last known position (0..100)
      target_percent:
        description: Desired absolute position (0..100)
      safety_ms:
        description: Pause between direction changes (ms), default 150
    sequence:
      - variables:
          target: "{{ target_percent | int }}"
          safety: "{{ safety_ms | default(150) | int }}"
          current: "{{ states(last_position_helper) | float(default=0) }}"
          going_up: "{{ target > current }}"
          distance: "{{ (target - current) if (target > current) else (current - target) }}"
          # Calculate duration proportional to distance
          duration_ms: >
            {% if going_up %}
            {{ (full_up_ms | int) * (distance | float) / 100.0 | round(0) }}
            {% else %}
            {{ (full_down_ms | int) * (distance | float) / 100.0 | round(0) }}
            {% endif %}
      - choose:
          - conditions: "{{ duration_ms | int > 0 }}"
            sequence:
              - service: script.jcp_pulse
                data:
                  switch_entity: "{{ up_switch if going_up else down_switch }}"
                  duration_ms: "{{ duration_ms | int }}"
                  safety_ms: "{{ safety }}"
      - service: input_number.set_value
        data:
          value: "{{ target }}"
        target:
          entity_id: "{{ last_position_helper }}"

  # Tilt control: move lamellas to absolute angle [0..180] in 15° steps.
  jcp_tilt_to_angle:
    alias: JCP Tilt To Angle
    mode: parallel
    fields:
      up_switch:
        description: Switch entity that tilts in positive direction
      down_switch:
        description: Switch entity that tilts in negative direction
      tilt_ms_per_15:
        description: Pulse duration for 15° tilt step in ms
      last_tilt_helper:
        description: input_number that stores last known tilt angle (0..180)
      target_angle:
        description: Desired absolute tilt angle (0..180)
      safety_ms:
        description: Pause between direction changes (ms), default 120
    sequence:
      - variables:
          target: "{{ (target_angle | int // 15) * 15 }}"  # snap to 15°
          safety: "{{ safety_ms | default(120) | int }}"
          current: "{{ (states(last_tilt_helper) | int(default=0) // 15) * 15 }}"
          going_up: "{{ target > current }}"
          steps: "{{ (target - current) | abs // 15 }}"
          duration_ms: "{{ (tilt_ms_per_15 | int) * (steps | int) }}"
      - choose:
          - conditions: "{{ steps | int > 0 }}"
            sequence:
              - service: script.jcp_pulse
                data:
                  switch_entity: "{{ up_switch if going_up else down_switch }}"
                  duration_ms: "{{ duration_ms | int }}"
                  safety_ms: "{{ safety }}"
      - service: input_number.set_value
        data:
          value: "{{ target }}"
        target:
          entity_id: "{{ last_tilt_helper }}"

  # Convenience: fully open (position 100) or close (position 0)
  jcp_open:
    alias: JCP Open (100%)
    mode: parallel
    fields:
      up_switch: {}
      down_switch: {}
      full_up_ms: {}
      full_down_ms: {}
      last_position_helper: {}
      safety_ms: {}
    sequence:
      - service: script.jcp_move_to_percent
        data:
          up_switch: "{{ up_switch }}"
          down_switch: "{{ down_switch }}"
          full_up_ms: "{{ full_up_ms }}"
          full_down_ms: "{{ full_down_ms }}"
          last_position_helper: "{{ last_position_helper }}"
          target_percent: 100
          safety_ms: "{{ safety_ms | default(150) }}"

  jcp_close:
    alias: JCP Close (0%)
    mode: parallel
    fields:
      up_switch: {}
      down_switch: {}
      full_up_ms: {}
      full_down_ms: {}
      last_position_helper: {}
      safety_ms: {}
    sequence:
      - service: script.jcp_move_to_percent
        data:
          up_switch: "{{ up_switch }}"
          down_switch: "{{ down_switch }}"
          full_up_ms: "{{ full_up_ms }}"
          full_down_ms: "{{ full_down_ms }}"
          last_position_helper: "{{ last_position_helper }}"
          target_percent: 0
          safety_ms: "{{ safety_ms | default(150) }}"
```

---

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
```

---

## hacs.json
```
{
  "name": "Jalousie Control Plus",
  "render_readme": true,
  "content_in_root": false
}
```

---

## README.md
```
# Jalousie Control Plus (TeeSe-IoT)

Eine schlanke Lovelace-Card + generische HA-Skripte, um Jalousien präzise zu steuern:
- Hoch/Runter gedrückt halten
- Öffnen/Schließen in einem Klick
- Lamellenwinkel 0–180° in 15°-Schritten
- Speichert letzte Position & Tilt (Helpers)

## Installation
1. **Packages aktivieren** (falls noch nicht):
   ```yaml
   homeassistant:
     packages: !include_dir_named packages
   ```
2. Datei `blueprints/package_jcp_scripts.yaml` nach `/config/packages/` kopieren und HA neu starten.
3. Datei `www/jalousie-control-plus.js` nach `/config/www/` kopieren.
4. In Lovelace **Ressource** hinzufügen:
   - URL: `/local/jalousie-control-plus.js`
   - Typ: `module`
5. **Helpers** pro Jalousie anlegen/duplizieren:
   - `input_number.jcp_blindX_last_position` (0..100)
   - `input_number.jcp_blindX_last_tilt` (0..180, Schritt 15)
   (oder die Beispiel-Helpers aus dem Paket umbenennen)

## Card verwenden
```yaml
type: custom:jalousie-control-plus
title: Wohnzimmer Jalousie
up_switch: switch.living_blind_up
down_switch: switch.living_blind_down
last_position_helper: input_number.jcp_blind1_last_position
last_tilt_helper: input_number.jcp_blind1_last_tilt
full_up_ms: 18000
full_down_ms: 18000
tilt_ms_per_15: 250
safety_ms: 150
```

## Hinweise
- **Zeitbasierte Steuerung**: Die Skripte rechnen Dauer ~ Distanz. Miss die realen Zeiten deiner Jalousie aus (voll hoch/ runter) und trage sie ein.
- **Taster halten**: Die Card schaltet direkt die Switches (on beim Drücken, off beim Loslassen) – unabhängig von den Skripten.
- **State-Persistenz**: Position/Tilt werden in `input_number`-Helpers gespeichert. Falls es eine echte `cover`-Entität gibt, kannst du stattdessen deren Werte anzeigen.

## Lizenz
MIT
```

---

## LICENSE
```
MIT License

Copyright (c) 2025 TeeSe-IoT

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.

