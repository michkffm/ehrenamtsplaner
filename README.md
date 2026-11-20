# Ehrenamtsplaner

Gemeinsame Aufgaben für Vereine und ehrenamtliche Teams. Eine Expo-Anwendung mit TypeScript für Web, Android und iOS.

## Erste Version

- Registrierung per E-Mail und Passwort, E-Mail-Bestätigung und Anmeldung über Supabase
- Vereinsbereiche erstellen und per vertraulichem Einladungscode beitreten
- Aufgaben mit Beschreibung und optionalem Termin erstellen und bearbeiten
- Aufgaben übernehmen, freigeben, erledigen und wieder öffnen
- Kanbanboard mit den Spalten Offen, Geplant, In Arbeit und Erledigt; alternativ Listenansicht. Auf kleinen Bildschirmen stehen die Spalten untereinander. Statuswechsel erfolgen per Schaltfläche, nicht durch Ziehen der Karten.
- Wichtigkeit Niedrig/Normal/Hoch/Dringend, Sortierung nach Wichtigkeit und Termin sowie Wichtigkeitsfilter
- Pro Aufgabe eine wählbare Farbe (Standard, Grün, Blau, Gelb, Rot, Violett), mit zusätzlicher Textbeschriftung
- Zuständige Personen aus echten Vereinsmitgliedern; nur die Vereinsleitung kann anderen Personen Aufgaben zuweisen. Eigene Anzeigenamen sind für Mitglieder desselben Vereins sichtbar, E-Mail-Adressen werden dabei nicht offengelegt.
- Fortschritt von 0 bis 100 Prozent, Anfangen, Pausieren und Beenden. 100 Prozent oder Beenden schließt die Aufgabe ab. Pausieren erhält den Fortschritt; Freigeben, Wiederöffnen und Neuzuweisen setzen ihn zurück.
- Deutsch/Englisch und Hell/Dunkel/System für die gesamte Oberfläche einschließlich Dialogen und Fehlermeldungen. Die Auswahl bleibt auf diesem Gerät nach einem Neustart erhalten (Browser: lokaler Browserspeicher; Android/iOS: App-Datei). Beim Löschen der Website- oder App-Daten wird sie zurückgesetzt. Speicherfehler werden angezeigt; Aufgabentexte werden nicht automatisch übersetzt.
- Anhänge pro Aufgabe: JPG, PNG, WebP, HEIC/HEIF und PDF bis 10 MB pro Datei. Vereinsmitglieder können Dateien hinzufügen und öffnen. Dateiname und Dateigröße werden angezeigt; Dateien liegen in einem privaten Supabase-Storage-Bucket.
- Filter nach Bearbeitungsstand und manuelles Aktualisieren gemeinsamer Daten
- Suche in Titel und Beschreibung, kombinierbar mit Status und „Meine Aufgaben“ (selbst übernommene Aufgaben)
- Kennzeichnung überfälliger und heute fälliger Aufgaben anhand des lokalen Kalendertags; erledigte Aufgaben werden nicht als überfällig markiert
- Sichtbare Tastaturfokussierung, umbrechende Kopfzeilen und Schaltflächen für schmale Ansichten
- Verständliche Meldungen bei veralteten Aufgabenständen und ungültigen Einladungen; Speicherfehler erscheinen direkt im Aufgabenformular
- Aufgabenformular als eigener Dialog, unabhängig von der Scrollposition der Liste. Ungespeicherte Eingaben werden beim Abbrechen erst nach Bestätigung verworfen; während des Speicherns bleibt der Dialog geöffnet.
- Bestätigungen nach Speichern, Übernehmen und Statuswechseln. Falls die Änderung gespeichert wurde, aber das Neuladen scheitert, weist die App ausdrücklich darauf hin; die Schreibaktion wird nicht automatisch wiederholt.
- Getrennte Vereinsdaten durch Datenbank-Zugriffsregeln (Row Level Security)
- Gleichzeitige Änderungen werden anhand einer Versionsnummer abgesichert

Keine Beispieldaten. Ohne konfigurierte Datenbank erscheint ein Einrichtungshinweis. Konten und Zusammenarbeit sind erst nach der Supabase-Einrichtung nutzbar.

## Lokal starten

Node.js 24 LTS und npm verwenden. Die Lockdatei legt die installierten Paketversionen fest.

```sh
npm ci
cp .env.example .env.local
npm run web
```

Für Android oder iOS: `npm start`, anschließend die zur Expo-Version passende Expo-Go-App verwenden. Ein Simulator benötigt Android Studio beziehungsweise Xcode. Native Geräte und Browser jeweils separat testen.

## Supabase verbinden

1. Für neue Installationen ein Supabase-Projekt in einer geeigneten Region erstellen. Der Entwicklungsstand vom 20.11.2026 verwendet das Projekt `ehrenamtsplaner` in Frankfurt im Free-Tarif. Die fünf unten genannten Migrationen sind dort ausgeführt und in `supabase_migrations.schema_migrations` erfasst; nicht erneut ausführen. Die lokale Verbindung steht in der von Git ignorierten `.env.local`.
2. Die Migrationen in `supabase/migrations/` in Dateinamen-Reihenfolge ausführen: `202611170001_initial.sql`, `202611170002_task_planning.sql`, `202611180003_task_attachments.sql`, `202611180004_attachment_deletion.sql`, `202611180005_attachment_recovery.sql`. Die zweite Migration ergänzt Wichtigkeit, Aufgabenfarben, Fortschritt, Anzeigenamen und Zuweisungsfunktionen. Vorhandene erledigte Aufgaben erhalten 100 Prozent; andere bestehende Aufgaben starten mit Wichtigkeit Normal, Standardfarbe und 0 Prozent. Die dritte Migration benötigt das Supabase-Storage-Schema und erstellt den privaten Bucket `task-attachments`, Metadaten und Zugriffsregeln. Die vierte Migration ergänzt das berechtigte Löschen, die fünfte das Wiederfinden eigener offener Uploads. Bestehende Migrationen nicht erneut ausführen; bei Nutzung der Supabase CLI zuerst den Migrationsstand abgleichen.
3. Unter Authentication E-Mail-Anmeldung und E-Mail-Bestätigung aktivieren, Mindestpasswortlänge 12 konfigurieren. Die Site URL auf die tatsächliche Webadresse setzen (lokal derzeit `http://localhost:8081`). Der Bestätigungslink bestätigt das Konto; danach erfolgt die Anmeldung mit Passwort in der App. Kein automatischer Login über den Link.
4. Projekt-URL und **Publishable Key** in `.env.local` eintragen:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Expo neu starten (für die konfigurierte lokale Adresse: `npx expo start --web --localhost --port 8081`). Ein Konto registrieren, E-Mail bestätigen, anmelden und Verein erstellen. Ein zweites bestätigtes Konto kann über den Einladungscode beitreten.

`EXPO_PUBLIC_*` ist im ausgelieferten Client lesbar. Hier ausschließlich den öffentlichen Publishable Key verwenden, **niemals** einen Secret Key, Service-Role-Key oder ein Datenbankpasswort. Die Datenbankregeln schützen Vereinsdaten. Einladungscodes nur an gewünschte Mitglieder weitergeben; sie erlauben den Beitritt zum jeweiligen Verein.

Passwörter werden ausschließlich von Supabase Auth verwaltet. Sitzungen bleiben in dieser Version im Arbeitsspeicher; nach Neuladen oder Neustart ist eine erneute Anmeldung nötig. Keine lokale Ablage von Zugangsdaten. Die öffentliche Registrierung und deren Missbrauchsschutz werden vor einem öffentlichen Betrieb im Supabase-Projekt konfiguriert.

Der Supabase-Standard-Mailversand ist nur für Tests mit den E-Mail-Adressen der Organisationsmitglieder vorgesehen. Für Registrierungen weiterer Ehrenamtlicher muss ein eigener SMTP-Versand eingerichtet werden; die E-Mail-Bestätigung bleibt aktiviert. Siehe [Supabase SMTP](https://supabase.com/docs/guides/auth/auth-smtp). Echte Registrierung, vereinsübergreifende Abläufe und Datei-Uploads sind nach der Einrichtung noch gemeinsam zu prüfen.

## Prüfungen

```sh
npm run typecheck
npm run lint
npm test
npm run build:web
npx expo-doctor
npm audit
```

Die Tests prüfen Eingabevalidierung und fehlerhafte API-Daten sowie die Migration mit lokalem PostgreSQL (PGlite, ausschließlich Testabhängigkeit). Dabei werden synthetische Authentifizierungskontexte verwendet: Vereinsgrenzen, verweigerte Fremdzugriffe, Schreibrechte, Aufgabenzustände und konkurrierende Versionsstände. Sie ersetzen keine Prüfung von Supabase Auth, E-Mail-Zustellung, API-Konfiguration und echten parallelen Netzwerkzugriffen. Die GitHub-Prüfung führt Typprüfung, Lint, Tests und Web-Export aus; Gerätetests erfolgen separat.

Das Aufgabenformular wurde zusätzlich in einer getrennten lokalen Komponentenprüfung im Browser bei 320 und 390 Pixeln Breite geprüft: kein seitlicher Überlauf, Tab-/Enter-Bedienung, Pflichtfeld- und Datumsvalidierung sowie ein simulierter Speicherkonflikt mit erhaltenen Eingaben. Diese Prüfung verwendet keine Konten oder Vereinsdaten und ersetzt keinen vollständigen Anwendungstest mit Supabase.

Der Aufgabendialog wurde ebenfalls isoliert geprüft: Öffnen aus gescrollter Ansicht, Fokus auf dem Titel, Tab-Begrenzung im Dialog, Escape und Rückkehr zum Auslöser, Rückfrage bei ungespeicherten Änderungen, Weiterbearbeiten mit erhaltenen Eingaben, bewusstes Verwerfen sowie verhindertes Schließen während einer simulierten Speicheranfrage. Die tatsächliche Bildschirmtastatur und Android-Zurück-Taste müssen auf Geräten geprüft werden.

Die Planungsfunktionen werden mit den Migrationen geprüft, einschließlich Bestandsdatenübernahme, privaten Anzeigenamen, fremden Vereinszugriffen, unberechtigten Zuweisungen, Versionskonflikten, ungültigen Prozentwerten, Start/Pause/Abschluss und dem Zurücksetzen bei Neuzuweisung. Sprachtests vergleichen alle Übersetzungsschlüssel und Platzhalter. Die getrennte Browser-Testkopie nutzt ausdrücklich synthetische Testdaten und keine echten Vereinsdaten.

Die Anhangstests prüfen Dateikennungen, Größen, Namen und Storage-Zugriffsregeln. Das Storage-Metadatenschema wird für die lokalen PostgreSQL-Tests nachgebildet. Die Browser-Dateiauswahl und die Ablehnung leerer Dateien beziehungsweise als PDF getarnter HTML-Inhalte wurden in der isolierten Testoberfläche geprüft, auch mit englischen Fehlermeldungen und Dunkelmodus bei 320 Pixeln Breite. Der tatsächliche Supabase-Dateidienst, signierte Downloads und die Geräte-Dateiauswahl müssen nach der Cloud-Einrichtung separat geprüft werden.

## Dateianhänge

`expo-document-picker` wird für die plattformübergreifende System-Dateiauswahl verwendet. `expo-file-system` liest native Dateien als Binärdaten für den Supabase-Upload. Im Browser wird das gewählte File-Objekt direkt gelesen. Andere Dateitypen, insbesondere HTML und SVG, werden nicht angeboten; die App prüft zusätzlich die Dateikennung. Diese Prüfung ist kein Virenscan.

Vor jedem Upload wird ein zu Aufgabe und Verein gehörender Datensatz reserviert. Erst nach erfolgreichem Upload sowie serverseitigem Abgleich von Besitzer, Dateityp und Größe wird der Anhang für die übrigen Vereinsmitglieder sichtbar. Offene Uploads werden beim Öffnen oder Aktualisieren der Anhänge vom Server geladen, auch nach einem Neustart und erneuter Anmeldung. Nur die hochladende Person sieht ihre offenen Einträge, solange sie Vereinsmitglied ist. Bereits übertragene Dateien lassen sich mit „Upload abschließen“ bestätigen. Fehlt die Datei, wird die ursprüngliche Datei erneut ausgewählt und mit gleicher Reservierung von vorne übertragen (keine Fortsetzung ab Byteposition). Name, erkannter Typ und Größe müssen übereinstimmen; dies ist kein kryptografischer Inhaltsvergleich. Bestehende Dateien werden niemals überschrieben. Fehlgeschlagenes Neuladen wird von einem fehlgeschlagenen Speichern unterschieden.

Zum Öffnen werden nach Zugriffsprüfung kurzlebige, fünf Minuten gültige URLs erstellt. Wer eine solche URL erhält, kann sie bis zum Ablauf benutzen. Die Links werden nicht als dauerhafte öffentliche Links gespeichert. Bestätigte Anhänge können nach ausdrücklicher Rückfrage von der hochladenden Person oder der Vereinsleitung endgültig gelöscht werden. Die Datei wird zuerst über die Storage-API entfernt; erst danach wird ihr Listeneintrag gelöscht. Schlägt der zweite Schritt fehl, kann der Vorgang wiederholt werden. Bereits heruntergeladene Kopien bleiben erhalten. Die serverseitige Bereinigung verwaister Uploadreservierungen beziehungsweise unbestätigter Dateien ist vor einem öffentlichen Betrieb noch zu ergänzen. Fehlgeschlagene Uploads können solche Reservierungen hinterlassen; nach erneuter Anmeldung können eigene offene Reservierungen wiedergefunden werden. Wird bereits die Antwort auf die Reservierung unterbrochen, vor einem neuen Upload die Liste aktualisieren.

## Struktur

- `src/app`: Expo-Router-Einstieg und Seiten
- `src/screens`: Anmeldung und Aufgabenübersicht
- `src/components`: Formulare und gemeinsame Bedienelemente
- `src/lib`: Datenzugriff, Datenmodelle und Validierung
- `supabase/migrations`: Tabellen, Zugriffsregeln und abgesicherte Schreibfunktionen
- `tests`: automatisierte Prüfungen

## Noch offen vor einem öffentlichen Betrieb

- Supabase-Projekt verbinden und Anmeldung einschließlich E-Mail-Zustellung prüfen
- Die lokal geprüften Vereinsgrenzen und Aufgabenzustände zusätzlich über die echte Supabase-API mit zwei Konten und parallelen Anfragen testen
- Passwortzurücksetzung, Austritt, Mitgliederverwaltung, Widerruf von Einladungen und Kontolöschung ergänzen
- Datenschutzinformationen, Aufbewahrung, Backups und Missbrauchsschutz festlegen
- Webbereitstellung, Android-/iOS-Gerätetests und Store-Veröffentlichung

Das Template enthält Expo-Standardgrafiken. Eigene App-Icons und endgültige Store-Kennungen werden vor Veröffentlichung festgelegt. Die mitgelieferte MIT-Lizenz ist der Lizenzhinweis des Expo-Templates; eine eigene Projektlizenz wurde noch nicht gewählt.

## Bekannte Paketmeldungen (17.11.2026)

`npm audit` meldet nach kompatiblen Korrekturen weiterhin Schwachstellen bei den indirekten Glob-Matching-Paketen `picomatch` und `minimatch`, mit Folgemeldungen entlang der Expo-, Metro-, React-Native- und Lint-Abhängigkeiten. Der angebotene automatische Komplettfix würde Expo auf eine ältere Hauptversion zurücksetzen und wurde nicht ausgeführt. Diese Meldungen sind offen; vor öffentlichem Betrieb den dann aktuellen Stand prüfen und kompatible Upstream-Korrekturen übernehmen. Keine eigenen Paket-Overrides ohne Kompatibilitätsprüfung.

Erneute Prüfung am 17.11.2026: 43 Meldungen (41 hoch, 2 mittel), die auf zwei zugrunde liegende Advisories zurückgehen. [Picomatch GHSA-fc5q-39xc-vjpf](https://github.com/advisories/GHSA-fc5q-39xc-vjpf) nennt noch keine korrigierte Version. [Minimatch GHSA-g3hv-75wg-m249](https://github.com/advisories/GHSA-g3hv-75wg-m249) ist ab 11.0.1 korrigiert; im Expo-Fingerprint-Abhängigkeitspfad ist noch 10.2.6 installiert. Eine erzwungene Umstellung auf eine andere Hauptversion wurde nicht vorgenommen. Die Anwendung importiert diese Pakete in `src/` nicht direkt; das allein beweist jedoch keine Nichtbetroffenheit indirekter Laufzeitpfade.
