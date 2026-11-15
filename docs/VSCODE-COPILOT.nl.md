<!-- lang-selector -->
<p align="center">
  <a href="VSCODE-COPILOT.md">English</a> ·
  <a href="VSCODE-COPILOT.fr.md">Français</a> ·
  <a href="VSCODE-COPILOT.de.md">Deutsch</a> ·
  <a href="VSCODE-COPILOT.es.md">Español</a> ·
  <a href="VSCODE-COPILOT.pt.md">Português</a> ·
  <a href="VSCODE-COPILOT.ru.md">Русский</a> ·
  <a href="VSCODE-COPILOT.zh-cn.md">简体中文</a> ·
  <a href="VSCODE-COPILOT.ko.md">한국어</a> ·
  <a href="VSCODE-COPILOT.ja.md">日本語</a> ·
  <a href="VSCODE-COPILOT.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="VSCODE-COPILOT.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# De Poznote MCP-server gebruiken met VS Code Copilot

Deze handleiding legt uit hoe je de Poznote MCP-server configureert en gebruikt met VS Code Copilot.

## Vereisten

- Visual Studio Code geïnstalleerd
- **GitHub Copilot-abonnement:** je hebt een betaald abonnement (of proefabonnement) op [GitHub Copilot](https://github.com/features/copilot) nodig, met de extensie Copilot Chat ingeschakeld in VS Code
- Poznote MCP-server actief (via Docker Compose)
- MCP-server bereikbaar op 127.0.0.1 (standaardpoort: 8045)

## Configuratie

### 1. Controleer of de MCP-server draait

Controleer of je MCP-servercontainer draait:

```bash
docker ps | grep mcp
```

Je zou de MCP-server moeten zien draaien. Noteer het poortnummer in de uitvoer (standaard 8045).

### 2. Configureer VS Code

Voeg de Poznote MCP-server toe aan je bestand `mcp.json`. De locatie hangt af van je besturingssysteem:

- **Windows:** `C:\Users\YOUR-USERNAME\AppData\Roaming\Code\User\mcp.json`
- **Linux:** `~/.config/Code/User/mcp.json`
- **macOS:** `~/Library/Application Support/Code/User/mcp.json`

Bestaat het bestand niet, maak het dan aan met de volgende configuratie:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    }
  }
}
```

> **Opmerking:** vervang `8045` door de werkelijke poort van je MCP-server als je die in je `docker-compose.yml` hebt aangepast.

#### Een authenticatietoken gebruiken

Is de MCP-server gestart met `POZNOTE_MCP_AUTH_TOKEN` (zie [Inkomend authenticatietoken](MCP-SERVER.nl.md#inkomend-authenticatietoken)), voeg dan de bijbehorende header toe, anders wordt elke aanroep geweigerd met `401 Unauthorized`:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp",
      "headers": {
        "Authorization": "Bearer YOUR_TOKEN"
      }
    }
  }
}
```

Wil je het token niet in `mcp.json` zetten, dan kan VS Code er ook om vragen: declareer een item in `inputs` met `"password": true` en verwijs ernaar als `"Authorization": "Bearer ${input:poznote-token}"`.

### 3. Herlaad VS Code

Herlaad VS Code na het aanpassen van `mcp.json`, zodat de wijzigingen effect hebben:
- Druk op `Ctrl+Shift+P` (of `Cmd+Shift+P` op een Mac)
- Typ "Reload Window" en druk op Enter

## Een externe server instellen

Draait je Poznote-instantie op een externe server, gebruik dan SSH-port forwarding om veilig verbinding te maken.

### 1. Zet een SSH-tunnel op

Werk je liever op de commandoregel, maak dan een klassieke SSH-tunnel:

```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Houd deze verbinding open zolang je VS Code Copilot met Poznote gebruikt.

Ben je via VS Code Remote SSH, Dev Containers of Codespaces al met de externe machine verbonden, dan kun je de tunnel ook rechtstreeks vanuit VS Code maken in de weergave `PORTS`:

1. Open het paneel `PORTS` in VS Code.
2. Stuur de externe poort `8045` door.
3. Houd de doorgestuurde poort actief zolang je Copilot gebruikt.
4. Kent VS Code een andere lokale poort toe dan `8045`, gebruik dan die lokale poort in `mcp.json`.

### 2. Configureer VS Code

Gebruik dezelfde configuratie in `mcp.json` als bij een lokale installatie:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    }
  }
}
```

De SSH-tunnel of de doorgestuurde poort van VS Code maakt de externe MCP-server beschikbaar op je lokale machine, dus VS Code maakt verbinding met `127.0.0.1`.

## Gebruiksvoorbeelden

Na de configuratie kun je rechtstreeks vanuit VS Code met je Poznote-instantie werken, in gewone taal in Copilot Chat:

### Basishandelingen

```
# Alle notities tonen
@poznote Toon al mijn notities

# Notities zoeken
@poznote Zoek naar notities over "docker"

# Een bepaalde notitie ophalen
@poznote Laat me notitie 123 zien

# Werkruimtes tonen
@poznote Welke werkruimtes heb ik?

# Mappen tonen
@poznote Laat me alle mappen in mijn werkruimte zien
```

### Notities maken en bijwerken

> **Werkruimte**: noem de doelwerkruimte in je verzoek, bijvoorbeeld *"in werkruimte 'Projets'"*. Zonder werkruimte valt de server terug op de instelling `mcp_default_workspace`, of op de enige werkruimte van het account, en weigert hij de aanroep als het account er meerdere heeft en die instelling leeg is.

```
@poznote Maak een notitie met de titel "Vergadernotities" in werkruimte "Projets" met inhoud over de nieuwe functie

@poznote Werk notitie 456 bij met nieuwe inhoud over het deploymentproces

@poznote Verwijder notitie 456 (verplaatst haar naar de prullenbak)

@poznote Maak een notitie "Paspoort verlengen" in werkruimte "Perso" en herinner me op 1 september om 9 uur

@poznote Maak een map met de naam "Projecten"
```

### Herinneringen

```
@poznote Herinner me volgende maandag om 8 uur aan notitie 123

@poznote Stel een wekelijkse herinnering in op notitie 123, elke maandag om 9 uur

@poznote Heeft notitie 123 een herinnering?

@poznote Verwijder de herinnering van notitie 123
```

### Takenlijsten

```
@poznote Laat me de taken van notitie 123 zien

@poznote Voeg aan notitie 123 een taak "Melk kopen" toe, morgen om 18:30 uur te doen, met een herinnering

@poznote Voeg aan notitie 123 een taak "Weekrapport" toe, elke vrijdag te doen

@poznote Markeer de taak "Melk kopen" in notitie 123 als afgerond

@poznote Verplaats de vervaldatum van de taak "Melk kopen" in notitie 123 naar volgende maandag

@poznote Verwijder de taak "Melk kopen" uit notitie 123
```

### Geavanceerde handelingen

```
@poznote Dupliceer notitie 789

@poznote Markeer notitie 123 als favoriet

@poznote Verplaats notitie 456 naar de map "Projecten"

@poznote Zet notitie 123 om naar Markdown

@poznote Welke notities linken naar notitie 123?

@poznote Zet openbaar delen aan voor notitie 123

@poznote Toon al mijn openbaar gedeelde notities en mappen

@poznote Welke versie van Poznote draai ik?
```

### Mappen en werkruimtes

```
@poznote Hernoem map 12 naar "Archief"

@poznote Verwijder map 12 en verplaats de notities ervan naar de prullenbak

@poznote Maak een werkruimte met de naam "Werk"

@poznote Hernoem de werkruimte "Werk" naar "Baan"

@poznote Verwijder de werkruimte "Baan"
```

### Prullenbak en herstellen

```
@poznote Laat me alle notities in de prullenbak zien

@poznote Herstel notitie 123 uit de prullenbak

@poznote Leeg de prullenbak
```

### Git-synchronisatie

```
@poznote Wat is de status van de Git-synchronisatie?

@poznote Push mijn notities naar Git

@poznote Pull notities uit Git
```

### Back-ups en instellingen

```
@poznote Toon alle back-ups

@poznote Maak een back-up van mijn gegevens

@poznote Herstel de back-up poznote_backup_2026-02-02_15-30-00.zip

@poznote Verwijder de back-up poznote_backup_2026-02-02_15-30-00.zip

@poznote Wat is de instelling "timezone"?

@poznote Zet de instelling "timezone" op "Europe/Paris"
```

### Met inhoud werken

```
@poznote Kun je al mijn notities met de tag "important" samenvatten?

@poznote Help me mijn notities op onderwerp in mappen te ordenen

@poznote Maak een weekrapport op basis van mijn vergadernotities
```

## Problemen oplossen

### Verbindingsproblemen

Als VS Code Copilot geen verbinding kan maken met de MCP-server:

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

4. **Controleer de syntaxis van mcp.json:**
   Zorg dat je JSON geldig is (geen komma's aan het eind, juiste aanhalingstekens, enz.)

### MCP-server niet herkend

Als VS Code de Poznote MCP-server niet herkent:

1. Controleer of je VS Code hebt herladen na het aanpassen van `mcp.json`
2. Controleer of GitHub Copilot ingeschakeld en actief is
3. Kijk in het uitvoerpaneel van VS Code of er foutmeldingen staan:
   - View → Output
   - Kies "GitHub Copilot" in de keuzelijst

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

## Beschikbare MCP-tools

De server biedt tools voor notities, taken, herinneringen, mappen, werkruimtes, tags, bijlagen, revisies, delen, Git-synchronisatie en back-ups. Ze staan een voor een beschreven, met wat elke tool doet, in de [documentatie van de MCP-server](MCP-SERVER.nl.md#functies). Dat is de enige plek waar die lijst actueel wordt gehouden.

### Ondersteuning voor meerdere gebruikers

De meeste tools accepteren een optionele parameter `user_id` om een bepaald gebruikersprofiel aan te spreken. De uitzonderingen zijn de systeemtools `get_system_info`, `list_backups`, `create_backup` en `delete_backup`, die geen `user_id` aannemen. Je kunt dit in je prompts aangeven:

```
@poznote Toon de notities van gebruiker 2
```

## Geavanceerde configuratie

### Meerdere Poznote-instanties

Draai je meerdere Poznote-instanties, dan kun je ze met verschillende namen configureren:

```json
{
  "servers": {
    "poznote-personal": {
      "type": "http",
      "url": "http://127.0.0.1:8045/mcp"
    },
    "poznote-work": {
      "type": "http",
      "url": "http://127.0.0.1:9045/mcp"
    }
  }
}
```

Verwijs er daarna expliciet naar:
```
@poznote-work Toon mijn werknotities
```

### Een aangepaste poort configureren

Draait je MCP-server op een andere poort, pas dan de URL in `mcp.json` aan:

```json
{
  "servers": {
    "poznote": {
      "type": "http",
      "url": "http://127.0.0.1:YOUR_PORT/mcp"
    }
  }
}
```

## Beveiligingsopmerkingen

⚠️ **Belangrijk:** iedereen die het MCP-endpoint kan bereiken, kan alle notities beheren. Standaard is het alleen bereikbaar vanaf 127.0.0.1. Stel je het verder open, zet dan `POZNOTE_MCP_AUTH_TOKEN` zodat clients een bearer-token moeten meesturen (zie [Een authenticatietoken gebruiken](#een-authenticatietoken-gebruiken)).

**Standaardconfiguratie (veilig):**
```yaml
ports:
  - "127.0.0.1:8045:8045"  # Only accessible from 127.0.0.1
```

**Gebruik voor toegang op afstand altijd een SSH-tunnel**, zoals beschreven in de sectie [Een externe server instellen](#een-externe-server-instellen).

Alle details: [Beveiliging van de MCP-server](MCP-SERVER.nl.md#beveiliging).

## Bronnen

- [Hoofddocumentatie van de MCP-server](MCP-SERVER.nl.md)
- [Officiële documentatie over MCP in VS Code](https://code.visualstudio.com/docs/copilot/customization/mcp-servers)
- [Claude CLI instellen](CLAUDE-CLI.nl.md)
- [Beveiligingsoverwegingen](MCP-SERVER.nl.md#beveiliging)

## Ondersteuning

Bij problemen of vragen:
- Raadpleeg de [hoofddocumentatie van MCP](MCP-SERVER.nl.md)
- Bekijk de logs van de MCP-server: `docker compose logs mcp-server`
- Controleer of de Poznote-API bereikbaar is
- Kijk in het uitvoerpaneel van VS Code of er fouten staan
