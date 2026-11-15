<!-- lang-selector -->
<p align="center">
  <a href="TROUBLESHOOTING.md">English</a> ·
  <a href="TROUBLESHOOTING.fr.md">Français</a> ·
  <a href="TROUBLESHOOTING.de.md">Deutsch</a> ·
  <a href="TROUBLESHOOTING.es.md">Español</a> ·
  <a href="TROUBLESHOOTING.pt.md">Português</a> ·
  <a href="TROUBLESHOOTING.ru.md">Русский</a> ·
  <a href="TROUBLESHOOTING.zh-cn.md">简体中文</a> ·
  <a href="TROUBLESHOOTING.ko.md">한국어</a> ·
  <a href="TROUBLESHOOTING.ja.md">日本語</a> ·
  <a href="TROUBLESHOOTING.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="TROUBLESHOOTING.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# Problemen bij de installatie oplossen

<details>
<summary><strong>"mkdir()-waarschuwingen (permission denied) of Connection failed"</strong></summary>
<br>

Als je fouten ziet zoals:
- `Warning: mkdir(): Permission denied in /var/www/html/db_connect.php`
- `Connection failed: SQLSTATE[HY000] [14] unable to open database file`
- De map `database` wordt aangemaakt met `root:root` in plaats van `www-data:www-data`

Dit is een bekend probleem met Docker-volumemounts in bepaalde omgevingen (Komodo, Portainer, enz.). In sommige configuraties kan de container de rechten van gekoppelde volumes niet wijzigen.

**Oplossing:** zet de juiste rechten op je hostmachine voordat je de container start:

```bash
# Ga naar je Poznote-map
cd poznote

# Maak de structuur van de datamap aan met de juiste rechten
mkdir -p data/database

# Zet de eigenaar op UID 82 (www-data in Alpine Linux)
sudo chown -R 82:82 data

# Start de container
docker compose up -d
```

</details>

<details>
<summary><strong>"Connection failed: SQLSTATE[HY000]: General error: 8 attempt to write a readonly database"</strong></summary>
<br>

Probeer eerst de container te stoppen en opnieuw te starten, en wacht tot de database is geïnitialiseerd (vernieuw de pagina).

Werkt dat niet, stop dan de container en herstel de eigenaar van de map `data` (pas UID/GID aan je eigen situatie aan, het voorbeeld gebruikt 1000:1000):

```bash
docker compose down
sudo chown 1000:1000 -R data
```

> 💡 **Opmerking:** UID 82 hoort bij de gebruiker `www-data` in Alpine Linux, die het Docker-image van Poznote gebruikt.

</details>

<a id="running-rootless"></a>
<details>
<summary><strong>Rootless draaien (docker-compose.rootless.yml)</strong></summary>
<br>

Poznote levert ook een rootless variant van het image, die volledig als gebruiker zonder rechten draait (uid/gid `1000`, gebruikersnaam `poznote`) in plaats van als root. Die is bedoeld voor omgevingen die root in containers verbieden (Kubernetes met de restricted `PodSecurityStandard`, rootless Podman, `docker run --user`, enz.).

Anders dan het standaardimage heeft deze variant bij het opstarten geen rootproces dat de eigenaar van een niet-passende bind mount op de host kan herstellen. Daarom **moet `./data` vóór de eerste start eigendom zijn van uid/gid 1000**:

```bash
mkdir -p data
sudo chown -R 1000:1000 data
```

Sla je deze stap over, dan stopt de container meteen bij het opstarten met een foutmelding die precies uitlegt wat je moet uitvoeren.

`sudo` is voor deze stap vaak niet nodig:

- Heeft je hostgebruiker al uid `1000` (de eerste gebruiker die op de meeste Linux-distributies wordt aangemaakt), dan maakt `mkdir -p data` de map aan met de juiste eigenaar en kun je de `chown` helemaal overslaan.
- Met rootless Podman of rootless Docker voer je de chown uit binnen de user namespace, zonder rootrechten:

```bash
# rootless Podman
podman unshare chown -R 1000:1000 data
# rootless Docker
rootlesskit chown -R 1000:1000 data
```

Voor een nieuwe installatie volg je de [rootless installatiemethode](README.nl.md#rootless) in de README. Om een bestaande Poznote-instantie te migreren, stop je die, maak je een back-up van je datamap en geef je die een nieuwe eigenaar, waarna je de rootless variant start:

```bash
docker compose down
sudo chown -R 1000:1000 data
curl -o docker-compose.rootless.yml https://raw.githubusercontent.com/timothepoznanski/poznote/main/docker-compose.rootless.yml
docker compose -f docker-compose.rootless.yml pull
docker compose -f docker-compose.rootless.yml up -d
```

De rootless webserver luistert intern op poort `8080` in plaats van `80` (alleen poorten zonder speciale rechten). `HTTP_WEB_PORT` uit je `.env` bepaalt nog steeds de poort aan de hostkant, daar verandert niets aan.

Wil je het rootless image zelf uit de broncode bouwen in plaats van het te downloaden, vervang dan de regel `image:` in `docker-compose.rootless.yml` door `build: { context: ., target: rootless }` (daarvoor heb je een kloon van deze repository nodig).

</details>

<a id="running-with-host-network"></a>
<details>
<summary><strong>Draaien met <code>network_mode: host</code></strong></summary>
<br>

Standaard koppelt Docker een hostpoort aan de container: de webserver luistert in de container op poort `80` (`8080` bij het rootless image) en `HTTP_WEB_PORT` kiest de poort op de host. Met `network_mode: host` is er geen koppeling. De container bindt rechtstreeks aan de poorten van de host, waar poort `80` meestal al van een andere webserver of container is.

Stel de poort waarop de webserver luistert in met `POZNOTE_LISTEN_PORT` in `.env` (bij het rootless image een poort boven 1023):

```bash
POZNOTE_LISTEN_PORT=8040
```

Vervang daarna in `docker-compose.yml` (of `docker-compose.rootless.yml`) de sectie `ports:` van beide services door `network_mode: host`. De MCP-server heeft nog twee wijzigingen nodig: hij kan de webserver niet meer via de servicenaam bereiken, en zijn image luistert op alle interfaces, wat in hostmodus alle interfaces van de host betekent. Laat hem naar de nieuwe poort wijzen en bind hem aan localhost:

```yaml
  mcp-server:
    image: ghcr.io/timothepoznanski/poznote-mcp:6
    restart: always
    network_mode: host
    command: ["sh", "-c", "poznote-mcp serve --host=127.0.0.1 --port=$${MCP_PORT}"]
    environment:
      POZNOTE_API_URL: http://127.0.0.1:${POZNOTE_LISTEN_PORT}/api/v1
      MCP_PORT: ${POZNOTE_MCP_PORT:-8045}
      POZNOTE_DEBUG: ${POZNOTE_DEBUG:-false}
      POZNOTE_USER_ID: ${POZNOTE_USER_ID:-1}
      POZNOTE_MCP_AUTH_TOKEN: ${POZNOTE_MCP_AUTH_TOKEN:-}
    volumes:
      - "./data:/var/www/html/data:ro"
    depends_on:
      - webserver
```

Maak de containers opnieuw aan (een herstart laadt de omgevingsvariabelen niet opnieuw):

```bash
docker compose up -d --force-recreate
```

De waarde wordt bij elke start toegepast door het init-script van de container. Een ongeldige waarde wordt in het log gemeld en dan blijft de standaardwaarde van het image gelden. `HTTP_WEB_PORT` wordt niet meer gebruikt, en `POZNOTE_MCP_PORT` bepaalt nu de poort waarop de MCP-server luistert. De health check van de huidige `docker-compose.yml` volgt `POZNOTE_LISTEN_PORT`. Roept die van jou nog `http://127.0.0.1/api/health` aan, download het bestand dan opnieuw of pas de URL aan, anders blijft de container `unhealthy` of controleert hij wat er verder ook op poort `80` antwoordt.

In hostmodus luistert de webserver op alle interfaces van de host: filter de poort met je firewall, of houd hem alleen bereikbaar via je reverse proxy. Binnen de container praten nginx en PHP via een unix-socket, dus Poznote neemt verder geen poort op de host in beslag en meerdere instanties kunnen naast elkaar draaien op verschillende poorten.

</details>

<details>
<summary><strong>"This site can't be reached"</strong></summary>
 <br>

Zie je in je browser "This site can't be reached" (in een Nederlandstalige Chrome: "Kan deze site niet bereiken"), dan heb je mogelijk SELinux ingeschakeld. Bekijk in dat geval de logs van de container:

```bash
docker logs poznote-webserver-1
# of met podman
podman logs poznote-webserver-1
```

Waarschijnlijk vind je:
- `chown: /var/www/html/data: Permission denied`

Dit gebeurt wanneer Docker-volumes niet de juiste SELinux-context hebben, vooral bij een installatie vanuit de map `/root`.

**Oplossing:** we raden sterk aan de suffix `:Z` te gebruiken voor Docker-volumes en de map `/root` te vermijden, zodat alles op alle distributies goed werkt.

Pas je `docker-compose.yml` aan en voeg `:Z` toe aan de volumedefinities:

```yaml
volumes:
  - ./data:/var/www/html/data:Z
```

Je kunt Poznote ook installeren in een map buiten `/root`, zoals `/opt/poznote` of `~/poznote`.

</details>

<details>
<summary><strong>"Onjuiste gebruikersnaam of wachtwoord"</strong></summary>
<br>

1. Probeer in te loggen met "admin" of "admin_change_me" en je wachtwoord.
2. Wachtwoorden worden beheerd in de interface van Poznote, niet via `.env`. Zolang een wachtwoord niet in de interface is gewijzigd, gelden de ingebouwde standaardwaarden: `admin` voor beheerders, `user` voor gewone gebruikers.
3. Kun je wel als beheerder inloggen maar niet als gewone gebruiker, controleer dan in het paneel **Gebruikersbeheer** of het profiel als **actief** is gemarkeerd.

</details>

<details>
<summary><strong>Beheerderswachtwoord kwijt</strong></summary>
<br>

Kan een andere beheerder nog inloggen, dan kan die een nieuw wachtwoord voor je instellen via **Instellingen > Beheertools > Gebruikersbeheer**. Anders reset je het rechtstreeks in de hoofddatabase. Vanuit je Poznote-map, op de host (het commandoregelprogramma `sqlite3` moet daar geïnstalleerd zijn, het zit niet in het Poznote-image):

```bash
sudo sqlite3 data/master.db "UPDATE users SET password_hash=NULL, password_login_disabled=0 WHERE id=1;"
```

Dit wist het opgeslagen wachtwoord van het eerste account (id 1, altijd een beheerder), zodat de ingebouwde standaardwaarde weer geldt: log in met de gebruikersnaam van dat account en het wachtwoord `admin`, en wijzig het meteen in **Instellingen > Wachtwoord wijzigen**. Om een ander account te resetten, vervang je `WHERE id=1` door `WHERE username='its_username'`. Een gewone gebruiker valt terug op het wachtwoord `user`.

Staat tweestapsverificatie aan voor dat account, dan vraagt het inlogformulier na het wachtwoord nog steeds om een code. Zie het volgende onderdeel als je het apparaat ook kwijt bent.

</details>

<a id="two-factor-lockout"></a>
<details>
<summary><strong>Buitengesloten door tweestapsverificatie (apparaat en herstelcodes kwijt)</strong></summary>
<br>

Elke herstelcode die je kreeg toen tweestapsverificatie werd ingeschakeld, laat je één keer inloggen: kies op het codescherm **Een herstelcode gebruiken**. Heb je er geen meer, dan kan een beheerder tweestapsverificatie voor je uitschakelen via **Instellingen > Beheertools > Gebruikersbeheer**, in het wachtwoordvenster van je account.

Ben je de enige beheerder, verwijder dan de tweede factor rechtstreeks in de hoofddatabase. Vanuit je Poznote-map, op de host (het commandoregelprogramma `sqlite3` moet daar geïnstalleerd zijn):

```bash
sudo sqlite3 data/master.db "DELETE FROM user_totp_recovery_codes WHERE user_id=1; DELETE FROM user_totp WHERE user_id=1;"
```

Vervang `1` door het id van het account (`sudo sqlite3 data/master.db "SELECT id, username FROM users;"` toont ze). Het wachtwoord alleen is dan weer genoeg om in te loggen, de ingelogd-blijven-cookies die voor dat account zijn uitgegeven werken niet meer, en tweestapsverificatie kan opnieuw worden ingesteld via **Instellingen > Tweestapsverificatie**.

Is tweestapsverificatie verplicht op de instantie (**Instellingen > Beheertools > Tweestapsverificatie verplichten**), dan vraagt de volgende keer inloggen meteen om het opnieuw in te stellen. Om de verplichting zelf op te heffen:

```bash
sudo sqlite3 data/master.db "UPDATE global_settings SET value='0' WHERE key='two_factor_required';"
```

</details>

<a id="the-app-stops-answering-under-load"></a>
<details>
<summary><strong>De app reageert niet meer onder belasting (fouten bij automatisch opslaan, "server reached pm.max_children")</strong></summary>
<br>

PHP-verzoeken worden afgehandeld door een vaste pool van php-fpm-workers, standaard 10. Korte verzoeken (automatisch opslaan, polls, pagina's laden) vullen die nooit. Lange wel: een antwoord van de AI-chat dat wordt gestreamd, een S3-aanroep, een Git-synchronisatie, een grote upload. Zodra alle workers bezet zijn, wacht elk ander verzoek, toont de browser een netwerkfout bij het opslaan en staat in het containerlog:

```
WARNING: [pool www] server reached pm.max_children setting (10), consider raising it
```

Vergroot de pool op een drukke instantie (meerdere gebruikers, AI-chat, S3 of Git-synchronisatie in gebruik) met de variabele `POZNOTE_PHP_FPM_MAX_CHILDREN` in `.env`, en maak de container daarna opnieuw aan (een herstart laadt de omgevingsvariabelen niet opnieuw):

```bash
POZNOTE_PHP_FPM_MAX_CHILDREN=20
docker compose up -d --force-recreate webserver
```

Elke bezette worker kost ongeveer 25-30 MB geheugen, en er zijn weinig inactieve workers, wat de waarde ook is. 20 is dus veilig op een host met 1 GB, en 10 past op een host met 512 MB. De waarde wordt bij elke start toegepast door het init-script van de container. Een ongeldige waarde wordt in het log gemeld en dan blijft de standaardwaarde van het image gelden.

</details>

<a id="a-request-runs-out-of-memory"></a>
<details>
<summary><strong>Een verzoek mislukt met "Allowed memory size exhausted"</strong></summary>
<br>

Elk PHP-verzoek mag standaard tot 512 MB gebruiken. Dat is een plafond, geen reservering (een inactieve worker weegt ongeveer 25 MB). Het zorgt ervoor dat een op hol geslagen verzoek mislukt met een leesbare regel in het PHP-log, in plaats van de host plat te leggen:

```
PHP Fatal error:  Allowed memory size of 536870912 bytes exhausted (tried to allocate ...) in ...
```

Back-ups, herstelacties, exports en downloads streamen naar schijf en hebben maar een paar MB nodig, hoe groot het account ook is. Dit zou dus alleen moeten gebeuren bij één notitie van tientallen MB. Loopt een back-up of een download hier tegenaan, dan is dat een bug: meld die dan met de regel uit het log.

Om de limiet te verhogen, stel je `POZNOTE_PHP_MEMORY_LIMIT` in `.env` in (een geheel aantal MB) en maak je de container daarna opnieuw aan (een herstart laadt de omgevingsvariabelen niet opnieuw):

```bash
POZNOTE_PHP_MEMORY_LIMIT=1024
docker compose up -d --force-recreate webserver
```

Stel hem nooit hoger in dan het geheugen van de host: een verzoek dat verder gaat dan wat de machine heeft, wordt zonder enige melding door de kernel beëindigd en kan de hele container meenemen. Houd op een host met 512 MB de standaardwaarde aan. De waarde wordt bij elke start toegepast door het init-script van de container. Een ongeldige waarde wordt in het log gemeld en dan blijft de standaardwaarde van het image gelden.

</details>

<a id="this-address-is-not-allowed"></a>
<details>
<summary><strong>"This address is not allowed: it must be a public internet host"</strong></summary>
<br>

Een gebruiker die geen beheerder is, heeft het adres van een machine in je lokale netwerk, of van de server zelf, ingevuld in een webhook, in Git Sync of in zijn eigen AI-, transcriptie- of MCP-server. Alleen beheerders kunnen die adressen bereiken. Een beheerder kan die host toestaan in **Instellingen > Beheertools > Integraties > Toegang tot lokaal netwerk**, zie [Toegang tot het lokale netwerk voor gebruikers zonder beheerdersrechten](README.nl.md#local-network-access).

Staat de host al in de lijst en blijft de melding verschijnen, dan kan de Poznote-container de naam niet omzetten. De melding is in beide gevallen expres hetzelfde, zodat ze niets over het interne netwerk verraadt. Controleer de naam vanuit de container:

```bash
docker compose exec webserver getent hosts ollama.lan
```

Toont het commando niets, vul dan in de lijst het IP-adres of het netwerk van de host in in plaats van de naam.

</details>
