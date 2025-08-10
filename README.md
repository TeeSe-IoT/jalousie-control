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
