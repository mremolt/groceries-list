# Testleitfaden: Einkaufsliste (interne Testversion)

Kurzanleitung für interne Tester. Die App ist nicht öffentlich erreichbar: Sie läuft lokal in Docker Compose, mit einem Test-Identitätsdienst (Keycloak) und einem Mail-Fänger (Mailpit). **Alle Konten und Daten sind erfunden; verwende keine echten Zugangsdaten außer einem Passwort, das du nur für diesen Test benutzt.**

## 1. Was ist die App?

Eine gemeinsame Einkaufsliste für Haushalte und Gruppen. Mehrere Personen bearbeiten dieselben Listen, sehen Änderungen der anderen nach spätestens etwa 6 Sekunden und teilen Listen über einen Link. Nur Deutsch, Hell/Dunkel, nutzbar von 320 px bis Desktop, mit Tastatur und Screenreader bedienbar (Anforderungen: `requirements/`).

## 2. Starten

Voraussetzungen: Docker, Node.js 24, Java 25 (nur zum Bauen des Images).

```sh
# einmalig und nach Code-Änderungen: Image bauen
cd frontend && npm ci && npm run build
cd ../backend && ./mvnw -q spring-boot:build-image -DskipTests \
  -Dfrontend.dist=../frontend/dist/frontend/browser -Dspring-boot.build-image.imageName=groceries:local

# Stack starten (PostgreSQL, Keycloak, Mailpit, App)
docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml up -d --wait

# Demo-Daten anlegen (wiederholbar, legt nichts doppelt an)
cd .. && node tools/seed-demo.mjs
```

| Was | Adresse |
|---|---|
| App | http://localhost:8080 |
| Mailpit (Passwort-zurücksetzen-Mails) | http://localhost:8025 |
| Keycloak (nur Technik) | http://keycloak.localhost:8180 |

Beenden: `docker compose --profile auth --profile mail -f compose.yaml -f compose.app.yaml down` (mit `-v` werden alle Daten gelöscht; danach das Seed-Skript erneut ausführen). Handy im selben WLAN: Die lokale Installation ist nur über `localhost` erreichbar; für Geräte-Tests Port 8080 weiterleiten oder ein zweites Browserprofil benutzen.

## 3. Test-Konten (erfunden)

| Person | E-Mail | Passwort |
|---|---|---|
| Anna | `anna@example.test` | `Demo-Passwort-1` |
| Ben | `ben@example.test` | `Demo-Passwort-2` |

Beide sind Mitglied in den Listen „Wocheneinkauf“, „Grillabend Samstag“ und „WG-Vorrat“ (mit einigen erledigten Artikeln). Neue Konten legst du über „Konto erstellen“ an; E-Mail-Adressen werden nicht bestätigt, Mails (z. B. Passwort zurücksetzen) landen in Mailpit.

Für zwei Personen gleichzeitig: ein zweites Browserprofil oder ein privates Fenster benutzen (eigene Cookies).

## 4. Was ausprobieren?

**Anmelden und Konto**
- [ ] Mit Anna anmelden; abmelden; mit falschem Passwort anmelden (eine allgemeine Fehlermeldung).
- [ ] Neues Konto erstellen (Anzeigename, E-Mail, Passwort mit mindestens 8 Zeichen).
- [ ] „Passwort vergessen“: Mail in Mailpit öffnen, neues Passwort setzen.

**Listen**
- [ ] Neue Liste anlegen, umbenennen, verlassen, löschen (jeweils mit Rückfrage bei Verlassen und Löschen).
- [ ] Listenadresse im Browser neu laden; die Liste bleibt geöffnet. Fremde oder gelöschte Listen zeigen „nicht gefunden“.

**Artikel**
- [ ] Artikel hinzufügen (Enter; das Feld behält den Fokus und leert sich), mehrere hintereinander.
- [ ] Abhaken und wieder aktivieren; per Tastatur springt der Fokus zum nächsten offenen Artikel.
- [ ] Artikel bearbeiten und löschen; „Erledigte entfernen“.
- [ ] Leere Eingabe und mehr als 200 Zeichen werden mit Fehlermeldung abgelehnt.

**Teilen und Beitreten**
- [ ] Als Anna „Liste teilen“, Link kopieren, im zweiten Profil (angemeldet als Ben oder als neues Konto) öffnen: Beitritt mit Hinweis.
- [ ] Link ungültig machen („Link erneuern“): der alte Link zeigt „Dieser Link funktioniert nicht mehr“, Mitglieder bleiben.
- [ ] Link ohne Anmeldung öffnen: Einladungsseite, Konto erstellen und beitreten.

**Synchronisation (zwei Geräte oder Profile)**
- [ ] In beiden Profilen dieselbe Liste öffnen: Hinzufügen, Abhaken, Umbenennen, Löschen erscheinen im anderen Profil nach wenigen Sekunden, ohne dass Eingaben oder Fokus verloren gehen.
- [ ] Liste im einen Profil löschen: das andere zeigt „Diese Liste wurde gelöscht.“
- [ ] Netzwerk abschalten (Flugmodus, oder in den Browser-Entwicklertools „Offline“): nach etwa 10 Sekunden erscheint „Keine Verbindung“, Änderungen sind gesperrt; beim Zurückkehren synchronisiert die App sofort.

**Einstellungen**
- [ ] Anzeigename ändern. Darstellung „System“, „Hell“, „Dunkel“ umschalten; „System“ folgt der Geräteeinstellung.
- [ ] Systemschriftgröße vergrößern bzw. Browser-Zoom 200 %; Fenster auf 320 px verkleinern: nichts darf abgeschnitten sein.
- [ ] Mit Tastatur allein bedienen (Tab, Enter, Esc, Pfeiltasten im Menü).

**Konto löschen** (nur mit einem Wegwerf-Konto, das eine Liste mit einer anderen Person teilt)
- [ ] „Konto löschen“, nochmals anmelden, bestätigen. Die andere Person behält die gemeinsame Liste; eigene Listen ohne weitere Mitglieder verschwinden.

## 5. Bekannte Einschränkungen

Bewusst noch nicht enthalten (`requirements/05-implementation-plan.md`, Abschnitt 5):
- Datenschutz-Maßnahmen für den öffentlichen Betrieb (NFR-PRIV), Löschung aus Backups, Impressum/Datenschutz-Links (FR-SET-05), Betriebsanforderungen wie Verfügbarkeit und Backups (NFR-OPS). Testdaten können jederzeit verloren gehen.
- Kein Offline-Modus: ohne Verbindung sind Änderungen gesperrt.

Technische Lücken der Testversion:
- Die automatischen Browser-Tests laufen nur in Chromium; Firefox und WebKit (Safari) sind in der Konfiguration, wurden aber noch nicht ausgeführt. Safari/iOS und Firefox sind deshalb besonders interessant für manuelle Tests.
- Kein Screenreader-Durchgang (NVDA, VoiceOver, TalkBack) und keine Leistungsmessung auf einem echten Mittelklasse-Handy; automatische Prüfungen (axe) laufen in allen Ansichten.
- „Im Wagen“ merkt sich auf dem Handy nicht, ob die Karte auf- oder zugeklappt war.
- Weitere technische Punkte stehen im Abschnitt „Known issues“ von `implementation-log.md` (u. a. keine Ratenbegrenzungs-Metrik für `/csp-reports`, abgelaufene IdP-Sitzungszeilen werden erst beim nächsten Login bereinigt).
- Die Passwort-Rücksetz-Links älterer Mails werden durch einen neueren Link nicht ungültig; jeder gilt einmalig und 60 Minuten.

## 6. Fehler melden

> Von Team auszufüllen: Wo werden Fehler gemeldet (Tracker, Kanal, Ansprechperson)? Bitte angeben: was du getan hast, was du erwartet hast, was passiert ist, Gerät, Browser und Version, hell/dunkel, Fenstergröße, ungefähre Uhrzeit. **Keine Passwörter, Share-Links oder Sitzungs-IDs in Meldungen oder Screenshots.**
