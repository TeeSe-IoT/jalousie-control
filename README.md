Hier ist die passende **README.md** mit den Anweisungen bis zu deinem jetzigen Stand:

---

# Jalousie Control Plus – Installation über HACS

## Voraussetzungen

* **Home Assistant** Version 2025.7 oder neuer
* **HACS** in aktueller Version installiert und eingerichtet

---

## 1. Repository vorbereiten

1. **GitHub-Repository anlegen**
   Name: `jalousie-control-plus`
   Struktur so anlegen, dass HACS es als Dashboard-Custom-Card erkennt:

   * `hacs.json` im Root des Repositories anlegen
   * `dist/`-Ordner für die gebauten JS-Dateien
   * `jalousie-control-plus.js` (kompilierte Version der Karte) in `dist/` ablegen

2. Beispiel für `hacs.json`:

   ```json
   {
     "name": "Jalousie Control Plus",
     "content_in_root": false,
     "filename": "jalousie-control-plus.js",
     "render_readme": true
   }
   ```

---

## 2. Repository in HACS einfügen

1. In Home Assistant → **HACS** → **Integrationen** → **Custom Repositories** öffnen.
2. Repository-URL einfügen:

   ```
   https://github.com/TeeSe-IoT/jalousie-control-plus
   ```
3. **Kategorie**: `Dashboard` auswählen.
4. Speichern.

---

## 3. Repository in HACS finden

1. In HACS → **Dashboard** → **+ Explore & Download repositories**.
2. Nach **Jalousie Control Plus** suchen.
3. Falls es schon vorher fehlerhaft hinzugefügt wurde, sicherstellen, dass alte Einträge entfernt sind (unter **HACS → Custom repositories** prüfen).

---

## 4. Installation

1. Repository auswählen → **Download**.
2. Nach der Installation Home Assistant neu starten.
3. In **Einstellungen → Dashboards → Ressourcen** prüfen, ob die JS-Datei eingebunden wurde:

   ```
   /hacsfiles/jalousie-control-plus/jalousie-control-plus.js
   ```

   Typ: `JavaScript Module`.

---

## 5. Karte in Lovelace hinzufügen

1. **Lovelace**-Editor öffnen.
2. **Custom: Jalousie Control Plus** auswählen.
3. Entsprechend konfigurieren (Details folgen in späterer Dokumentation).

---

💡 **Hinweis**
Falls beim ersten Hinzufügen Fehler auftreten, kann es helfen:

* Repository aus **Custom repositories** in HACS löschen.
* Home Assistant neu starten.
* Erneut hinzufügen.

---

Willst du, dass ich dir jetzt direkt auch die **korrekte Endstruktur** des Repositories so aufschreibe, dass HACS garantiert meckert **nicht mehr**?
Das würde dir den nächsten Fehler sparen.
