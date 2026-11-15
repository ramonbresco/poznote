<!-- lang-selector -->
<p align="center">
  <a href="CLAUDE-CLI.md">English</a> ·
  <a href="CLAUDE-CLI.fr.md">Français</a> ·
  <a href="CLAUDE-CLI.de.md">Deutsch</a> ·
  <a href="CLAUDE-CLI.es.md">Español</a> ·
  <a href="CLAUDE-CLI.pt.md">Português</a> ·
  <a href="CLAUDE-CLI.ru.md">Русский</a> ·
  <a href="CLAUDE-CLI.zh-cn.md">简体中文</a> ·
  <a href="CLAUDE-CLI.ko.md">한국어</a> ·
  <a href="CLAUDE-CLI.ja.md">日本語</a> ·
  <a href="CLAUDE-CLI.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="CLAUDE-CLI.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# De Poznote MCP-server gebruiken met Claude CLI

Deze handleiding legt uit hoe je de Poznote MCP-server configureert en gebruikt met Claude CLI (Command Line Interface).

## Vereisten

- **Een Anthropic-account:** Claude CLI logt in met een Claude-abonnement of met een [Anthropic API-sleutel](https://console.anthropic.com/). Gebruik je een API-sleutel, stel die dan in voordat je de CLI gebruikt:
  ```bash
  export ANTHROPIC_API_KEY=sk-ant-...
  ```
- Claude CLI geïnstalleerd (`npm install -g @anthropic-ai/claude-code`)
- Poznote MCP-server actief (via Docker Compose)
- MCP-server bereikbaar op 127.0.0.1 (standaardpoort: 8045)

## Installatie

### 1. Controleer of de MCP-server draait

Controleer of je MCP-servercontainer draait:

```bash
docker ps | grep mcp
```

Je zou de MCP-server moeten zien draaien. Noteer het poortnummer in de uitvoer (standaard 8045).

### 2. Voeg de MCP-server toe aan Claude CLI

Voeg de Poznote MCP-server toe met het HTTP-transport:

```bash
claude mcp add --transport http poznote http://127.0.0.1:8045/mcp
```

> **Opmerking:** vervang `8045` door de werkelijke poort van je MCP-server als je die in je `docker-compose.yml` hebt aangepast.

#### Een authenticatietoken gebruiken

Is de MCP-server gestart met `POZNOTE_MCP_AUTH_TOKEN` (zie [Inkomend authenticatietoken](MCP-SERVER.nl.md#inkomend-authenticatietoken)), geef dan hetzelfde token mee als header, anders wordt elke aanroep geweigerd met `401 Unauthorized`:

```bash
claude mcp add --transport http poznote http://127.0.0.1:8045/mcp \
  --header "Authorization: Bearer YOUR_TOKEN"
```

Waar de configuratie wordt opgeslagen, hangt af van de optie `--scope`:
- **Local (standaard):** `~/.claude.json`, alleen beschikbaar in de map waar je het commando hebt uitgevoerd
- **User (`--scope user`):** `~/.claude.json`, beschikbaar in al je projecten
- **Project (`--scope project`):** `.mcp.json` in de hoofdmap van het project, bedoeld om te committen en met je team te delen

### 3. Controleer de configuratie

Toon alle geconfigureerde MCP-servers:
```bash
claude mcp list
```

Je zou `poznote` in de lijst moeten zien, met de HTTP-URL.

### 4. Bekijk de serverdetails

Vraag gedetailleerde informatie over de Poznote MCP-server op:
```bash
claude mcp get poznote
```

## Gebruiksvoorbeelden

Na de configuratie kun je met je Poznote-instantie werken via opdrachten in gewone taal:

### Eenvoudige vragen

```bash
# Alle notities tonen
claude "Toon al mijn notities uit Poznote"

# Notities zoeken
claude "Zoek in Poznote naar notities over 'docker'"

# Een bepaalde notitie ophalen
claude "Laat me notitie 123 uit Poznote zien"

# Werkruimtes tonen
claude "Welke werkruimtes heb ik in Poznote?"

# Mappen tonen
claude "Laat me alle mappen in mijn Poznote-werkruimte zien"
```

### Notities maken en bijwerken

```bash
# Een nieuwe notitie maken
# BELANGRIJK: noem altijd de doelwerkruimte. Zonder werkruimte gebruikt de server de
# instelling mcp_default_workspace, of de enige werkruimte van het account, en weigert hij
# de aanroep als het account er meerdere heeft en die instelling leeg is.
claude "Maak in Poznote een notitie met de titel 'Vergadernotities' in werkruimte 'Projets' met als inhoud 'Bespreking van de nieuwe functie'"

# Een bestaande notitie bijwerken
claude "Werk notitie 456 in Poznote bij met nieuwe inhoud over het deploymentproces"

# Een notitie verwijderen (verplaatst haar naar de prullenbak)
claude "Verwijder notitie 456 in Poznote"

# Een notitie met een herinnering maken, in één stap
claude "Maak in Poznote een notitie 'Paspoort verlengen' in werkruimte 'Perso' en herinner me op 1 september om 9 uur"

# Een map maken
claude "Maak in Poznote een map met de naam 'Projecten'"
```

### Herinneringen

```bash
# Een herinnering instellen op een bestaande notitie
claude "Herinner me volgende maandag om 8 uur aan notitie 123 in Poznote"

# Een terugkerende herinnering instellen
claude "Stel in Poznote een wekelijkse herinnering in op notitie 123, elke maandag om 9 uur"

# Een herinnering controleren
claude "Heeft notitie 123 in Poznote een herinnering?"

# Een herinnering verwijderen
claude "Verwijder de herinnering van notitie 123 in Poznote"
```

### Takenlijsten

```bash
# De taken van een takenlijstnotitie tonen
claude "Laat me de taken van notitie 123 in Poznote zien"

# Een taak met vervaldatum en herinnering toevoegen
claude "Voeg aan notitie 123 in Poznote een taak 'Melk kopen' toe, morgen om 18:30 uur te doen, met een herinnering"

# Een terugkerende taak toevoegen
claude "Voeg aan notitie 123 in Poznote een taak 'Weekrapport' toe, elke vrijdag te doen"

# Een taak afronden
claude "Markeer de taak 'Melk kopen' in notitie 123 in Poznote als afgerond"

# Een taak bijwerken of verwijderen
claude "Verplaats de vervaldatum van de taak 'Melk kopen' in notitie 123 in Poznote naar volgende maandag"
claude "Verwijder de taak 'Melk kopen' uit notitie 123 in Poznote"
```

### Geavanceerde handelingen

```bash
# Een notitie dupliceren
claude "Dupliceer notitie 789 in Poznote"

# Favoriet aan- of uitzetten
claude "Markeer notitie 123 in Poznote als favoriet"

# Een notitie naar een map verplaatsen
claude "Verplaats notitie 456 in Poznote naar de map 'Projecten'"

# Een notitie omzetten tussen HTML en Markdown
claude "Zet notitie 123 in Poznote om naar Markdown"

# De notities vinden die naar een notitie linken
claude "Welke notities linken in Poznote naar notitie 123?"

# Een notitie delen
claude "Zet openbaar delen aan voor notitie 123 in Poznote"

# Alles tonen wat openbaar gedeeld is
claude "Toon al mijn openbaar gedeelde notities en mappen in Poznote"

# Systeeminformatie opvragen
claude "Welke versie van Poznote draai ik?"
```

### Mappen en werkruimtes

```bash
# Een map hernoemen of verwijderen
claude "Hernoem map 12 in Poznote naar 'Archief'"
claude "Verwijder map 12 in Poznote en verplaats de notities ervan naar de prullenbak"

# Werkruimtes beheren
claude "Maak in Poznote een werkruimte met de naam 'Werk'"
claude "Hernoem in Poznote de werkruimte 'Werk' naar 'Baan'"
claude "Verwijder in Poznote de werkruimte 'Baan'"
```

### Instellingen

```bash
# Een instelling lezen
claude "Wat is de instelling 'timezone' in Poznote?"

# Een instelling bijwerken
claude "Zet in Poznote de instelling 'timezone' op 'Europe/Paris'"
```

### Prullenbak en herstellen

```bash
# Prullenbak bekijken
claude "Laat me alle notities in de prullenbak van Poznote zien"

# Een notitie herstellen
claude "Herstel notitie 123 uit de prullenbak van Poznote"

# Prullenbak legen
claude "Leeg de prullenbak van Poznote"
```

### Git-synchronisatie

```bash
# De status van Git-synchronisatie controleren
claude "Wat is de status van de Git-synchronisatie in Poznote?"

# Naar Git pushen
claude "Push mijn Poznote-notities naar Git"

# Uit Git pullen
claude "Pull notities uit Git naar Poznote"
```

### Back-ups

```bash
# Back-ups tonen
claude "Toon alle back-ups van Poznote"

# Een back-up maken
claude "Maak een back-up van mijn Poznote-gegevens"

# Een back-up herstellen (⚠️ vervangt alle huidige gegevens van de gebruiker)
claude "Herstel de Poznote-back-up poznote_backup_2026-02-02_15-30-00.zip"

# Een back-upbestand verwijderen
claude "Verwijder de Poznote-back-up poznote_backup_2026-02-02_15-30-00.zip"
```

## Interactieve modus

Start een interactieve sessie waarin je met Claude een gesprek over je notities kunt voeren:

```bash
claude
```

Stel daarna gewoon je vragen:
- "Kun je me al mijn notities met de tag 'important' laten zien?"
- "Maak een samenvatting van al mijn vergadernotities van vorige week"
- "Help me mijn notities in mappen te ordenen"

## Configuratieopties

### Een aangepaste poort gebruiken

Draait je MCP-server op een andere poort (kijk in je `docker-compose.yml` naar de instelling `POZNOTE_MCP_PORT`):
```bash
claude mcp add --transport http poznote http://127.0.0.1:YOUR_PORT/mcp
```

### De server verwijderen

Om de Poznote MCP-server uit Claude CLI te verwijderen:
```bash
claude mcp remove poznote
```

### Meerdere instanties

Draai je meerdere Poznote-instanties op verschillende poorten, dan kun je ze met verschillende namen configureren:
```bash
claude mcp add --transport http poznote-personal http://127.0.0.1:8045/mcp
claude mcp add --transport http poznote-work http://127.0.0.1:9045/mcp
```

Geef daarna in je vragen aan welke instantie je wilt gebruiken:
```bash
claude "Toon de notities uit poznote-work"
```

## Problemen oplossen

### Verbindingsproblemen

Als Claude CLI geen verbinding kan maken met de MCP-server:

1. **Controleer of de MCP-server draait:**
   ```bash
   curl http://127.0.0.1:8045/mcp
   ```
   (Vervang `8045` door je geconfigureerde poort)

2. **Controleer de status van de Docker-container:**
   ```bash
   docker ps | grep mcp
   docker compose logs mcp-server
   ```

3. **Controleer de poortbinding:**
   Zorg dat de poort in `docker-compose.yml` aan 127.0.0.1 is gebonden:
   ```yaml
   ports:
     - "127.0.0.1:${POZNOTE_MCP_PORT:-8045}:8045"
   ```

### Authenticatiefouten

De MCP-server authenticeert zich bij Poznote met het gedeelde token dat in `data/.mcp_token` staat.

Controleer deze punten:
- `./data/.mcp_token` bestaat op de Poznote-host
- de service `mcp-server` koppelt `./data:/var/www/html/data:ro`
- de webservercontainer is na de update naar de MCP-configuratie met token minstens één keer opnieuw aangemaakt

### Debugmodus

Schakel debuglogging voor de MCP-server in door de container opnieuw aan te maken met een omgevingsvariabele op de commandoregel:
```bash
POZNOTE_DEBUG=true docker compose up -d --force-recreate mcp-server
```

Alleen de exacte waarden `true` en `false` in kleine letters worden herkend. Elke andere waarde wordt als `false` behandeld en er komt een waarschuwing in de MCP-logs.

Bekijk daarna de logs:
```bash
docker compose logs -f mcp-server
```

## Beveiligingsopmerkingen

⚠️ **Belangrijk:** iedereen die het MCP-endpoint kan bereiken, kan alle notities beheren. Standaard is het alleen bereikbaar vanaf 127.0.0.1. Stel je het verder open, zet dan `POZNOTE_MCP_AUTH_TOKEN` zodat clients een bearer-token moeten meesturen (zie [Een authenticatietoken gebruiken](#een-authenticatietoken-gebruiken)).

**Standaardconfiguratie (veilig):**
```yaml
ports:
  - "127.0.0.1:8045:8045"  # Only accessible from 127.0.0.1
```

**Gebruik voor toegang op afstand een SSH-tunnel:**
```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Alle details: [Beveiliging van de MCP-server](MCP-SERVER.nl.md#beveiliging).

## Beschikbare MCP-tools

De server biedt tools voor notities, taken, herinneringen, mappen, werkruimtes, tags, bijlagen, revisies, delen, Git-synchronisatie en back-ups. Ze staan een voor een beschreven, met wat elke tool doet, in de [documentatie van de MCP-server](MCP-SERVER.nl.md#functies). Dat is de enige plek waar die lijst actueel wordt gehouden.

### Ondersteuning voor meerdere gebruikers

De meeste tools accepteren een optionele parameter `user_id` om een bepaald gebruikersprofiel aan te spreken. De uitzonderingen zijn de systeemtools `get_system_info`, `list_backups`, `create_backup` en `delete_backup`, die geen `user_id` aannemen.
```bash
claude "Toon de notities van gebruiker 2 in Poznote"
```

## Gerelateerde documentatie

- [Hoofddocumentatie van de MCP-server](MCP-SERVER.nl.md)
- [VS Code Copilot instellen](VSCODE-COPILOT.nl.md)
- [Beveiligingsoverwegingen](MCP-SERVER.nl.md#beveiliging)

## Ondersteuning

Bij problemen of vragen:
- Raadpleeg de [hoofddocumentatie van MCP](MCP-SERVER.nl.md)
- Bekijk de logs van de MCP-server: `docker compose logs mcp-server`
- Controleer of de Poznote-API bereikbaar is
