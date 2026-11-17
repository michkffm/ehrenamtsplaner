# Ehrenamtsplaner

Gemeinsame Aufgaben für Vereine und ehrenamtliche Teams. Eine Expo-Anwendung mit TypeScript für Web, Android und iOS.

## Erste Version

- Registrierung per E-Mail und Passwort, E-Mail-Bestätigung und Anmeldung über Supabase
- Vereinsbereiche erstellen und per vertraulichem Einladungscode beitreten
- Aufgaben mit Beschreibung und optionalem Termin erstellen und bearbeiten
- Aufgaben übernehmen, freigeben, erledigen und wieder öffnen
- Filter nach Bearbeitungsstand und manuelles Aktualisieren gemeinsamer Daten
- Suche in Titel und Beschreibung, kombinierbar mit Status und „Meine Aufgaben“ (selbst übernommene Aufgaben)
- Kennzeichnung überfälliger und heute fälliger Aufgaben anhand des lokalen Kalendertags; erledigte Aufgaben werden nicht als überfällig markiert
- Sichtbare Tastaturfokussierung, umbrechende Kopfzeilen und Schaltflächen für schmale Ansichten
- Verständliche Meldungen bei veralteten Aufgabenständen und ungültigen Einladungen; Speicherfehler erscheinen direkt im Aufgabenformular
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

1. Ein Supabase-Projekt in einer geeigneten Region erstellen. Es wurde noch kein Cloud-Projekt für diese Anwendung eingerichtet und kein Tarif gebucht.
2. Die Datei `supabase/migrations/202611170001_initial.sql` im SQL-Editor dieses neuen, leeren Projekts ausführen. Bei späterer Nutzung der Supabase CLI dieselbe Migration nicht erneut ausführen; zuerst den Migrationsstand abgleichen.
3. Unter Authentication E-Mail-Anmeldung und E-Mail-Bestätigung aktivieren, Mindestpasswortlänge 12 konfigurieren. Die Site URL auf die tatsächliche Webadresse setzen (lokal beispielsweise die beim Start ausgegebene Adresse). Der Bestätigungslink bestätigt das Konto; danach erfolgt die Anmeldung mit Passwort in der App. Kein automatischer Login über den Link.
4. Projekt-URL und **Publishable Key** in `.env.local` eintragen:
   - `EXPO_PUBLIC_SUPABASE_URL`
   - `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`
5. Expo neu starten. Ein Konto registrieren, E-Mail bestätigen, anmelden und Verein erstellen. Ein zweites bestätigtes Konto kann über den Einladungscode beitreten.

`EXPO_PUBLIC_*` ist im ausgelieferten Client lesbar. Hier ausschließlich den öffentlichen Publishable Key verwenden, **niemals** einen Secret Key, Service-Role-Key oder ein Datenbankpasswort. Die Datenbankregeln schützen Vereinsdaten. Einladungscodes nur an gewünschte Mitglieder weitergeben; sie erlauben den Beitritt zum jeweiligen Verein.

Passwörter werden ausschließlich von Supabase Auth verwaltet. Sitzungen bleiben in dieser Version im Arbeitsspeicher; nach Neuladen oder Neustart ist eine erneute Anmeldung nötig. Keine lokale Ablage von Zugangsdaten. Die öffentliche Registrierung und deren Missbrauchsschutz werden vor einem öffentlichen Betrieb im Supabase-Projekt konfiguriert.

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
