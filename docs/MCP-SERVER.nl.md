<!-- lang-selector -->
<p align="center">
  <a href="MCP-SERVER.md">English</a> ·
  <a href="MCP-SERVER.fr.md">Français</a> ·
  <a href="MCP-SERVER.de.md">Deutsch</a> ·
  <a href="MCP-SERVER.es.md">Español</a> ·
  <a href="MCP-SERVER.pt.md">Português</a> ·
  <a href="MCP-SERVER.ru.md">Русский</a> ·
  <a href="MCP-SERVER.zh-cn.md">简体中文</a> ·
  <a href="MCP-SERVER.ko.md">한국어</a> ·
  <a href="MCP-SERVER.ja.md">日本語</a> ·
  <a href="MCP-SERVER.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="MCP-SERVER.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# Poznote MCP-server

MCP-server (Model Context Protocol) voor Poznote: hiermee beheer je je notities met AI, in gewone taal.

Deze server ondersteunt **alleen HTTP-transport** (MCP Streamable HTTP).

> [!TIP]
> Wil je rechtstreeks in Poznote chatten met een lokaal model (bijvoorbeeld Ollama)? Daarvoor heb je de MCP-server niet nodig: gebruik de ingebouwde [AI-assistent](AI-ASSISTANT.nl.md) (**Instellingen → Beheertools → AI-assistent**). De MCP-server is bedoeld om *externe* assistenten die MCP ondersteunen met je notities te verbinden; Ollama op zichzelf is een runtime voor modellen, geen MCP-client, en kan er niet rechtstreeks mee verbinden.

<p align="center">
  <img src="mcp-poznote.gif" alt="Demo van de Poznote MCP-server" width="100%">
</p>

## Snel aan de slag

Kies de AI-assistent die je wilt gebruiken:

- **[VS Code Copilot](VSCODE-COPILOT.nl.md):** Poznote in je editor integreren
- **[Claude CLI](CLAUDE-CLI.nl.md):** Poznote vanaf de opdrachtregel gebruiken

---

## Hoe het werkt

De MCP-server vormt een brug tussen AI-assistenten en je Poznote-instantie.

### Onderdelen

- **`server.py`**: MCP-server (HTTP / Streamable HTTP)
  - Stelt het MCP-endpoint beschikbaar op `http://127.0.0.1:8045/mcp`
  - Definieert de tools (acties) voor het beheer van notities
  - Regelt de aanroepen tussen de AI en de Poznote-API

- **`client.py`**: HTTP-client voor de REST-API van Poznote
  - Voert HTTP-verzoeken uit (GET, POST, PATCH, DELETE)
  - Regelt de authenticatie bij de Poznote-API met het gedeelde MCP-servicetoken

### Communicatiestroom

1. De AI-assistent (VS Code Copilot of Claude CLI) maakt verbinding met de MCP-server
2. De MCP-server roept de REST-API van Poznote aan
3. De resultaten gaan terug naar de AI-assistent

Een Poznote-tabblad dat open staat in de browser neemt wijzigingen via MCP binnen enkele seconden over: de mappenstructuur in de zijbalk en de geopende notitie worden ter plekke vernieuwd (of tonen een balk om opnieuw te laden als de notitie niet-opgeslagen wijzigingen heeft). Een notitie die alleen open staat in de browser blokkeert MCP-schrijfacties niet; alleen een notitie die wordt bewerkt door een andere gebruiker van hetzelfde account, of door een bezoeker via een openbare link, antwoordt met een HTTP-fout 423.

## Functies

### Tools (acties)
- `get_note`: een specifieke notitie ophalen op ID of op pad, in zijn geheel of deel voor deel (`offset`/`max_chars`, met het `type` van de notitie en haar volledige `length`)
- `list_notes`: de notities van een werkruimte weergeven, pagina voor pagina (`limit`/`offset`, met het werkelijke `total` van de werkruimte in het resultaat), te beperken op map, `tags` of wijzigingsdatum
- `search_notes`: notities zoeken op een tekstzoekopdracht, waarbij elk woord moet voorkomen, met filters op `tags`, `folder`, aanmaak- en wijzigingsdatum
- `create_note`: een nieuwe notitie maken, optioneel vanuit een sjabloon en/of met een vervaldatum/herinnering
- `update_note`: een bestaande notitie bijwerken, verplaatsen en/of haar vervaldatum/herinnering instellen
- `append_to_note`: tekst aan het einde van een notitie toevoegen zonder de rest te lezen of opnieuw te versturen
- `replace_in_note`: passages van een notitie wijzigen aan de hand van hun exacte tekst, zonder de rest aan te raken
- `replace_section`: de ene sectie die een kop aanduidt herschrijven of aanvullen, met behoud van de rest van de notitie
- `get_note_outline`: de koppen van een notitie weergeven met de offsets waar elke sectie begint en eindigt
- `delete_note`: een notitie verwijderen op ID
- `get_reminder`: de herinnering ophalen die momenteel op een notitie staat
- `set_reminder`: de herinnering van een notitie instellen of vervangen, met een optioneel herhaalinterval
- `remove_reminder`: de herinnering van een notitie verwijderen
- `list_reminders`: de openstaande herinneringen van een werkruimte weergeven: die al zijn afgegaan (de meldingen achter het belletje in de interface), die nog moeten komen, of beide (`scope`)
- `list_tasks`: de taken van een takenlijst weergeven, met hun ID's, vervaldatums en markeringen
- `list_all_tasks`: de open taken in alle notities van een werkruimte weergeven, de dringendste eerst, met filters (venster op vervaldatum, hoge prioriteit, voltooid, zonder datum, checklists in notities)
- `add_task`: één taak aan een takenlijst toevoegen, met een optionele vervaldatum en herinnering
- `update_task`: één taak bijwerken (tekst, vervaldatum, herinnering, prioriteit)
- `complete_task`: een taak als voltooid markeren, of weer openen
- `delete_task`: één taak uit een takenlijst verwijderen
- `add_subtask`: een subtaak toevoegen onder een taak van een takenlijst
- `update_subtask`: een subtaak hernoemen, of als voltooid of niet voltooid markeren
- `delete_subtask`: één subtaak van een taak verwijderen
- `create_folder`: een map maken, op naam of op pad (`folder_path="Projects/2026/Q3"` maakt de hele keten in één aanroep), of een dagboekhoofdmap met `is_diary=true`
- `list_folders`: alle mappen van een werkruimte weergeven, met hun paden en dagboekmarkeringen
- `list_workspaces`: alle beschikbare werkruimtes weergeven
- `list_tags`: alle unieke tags weergeven die in notities worden gebruikt
- `list_templates`: de sjabloonnotities weergeven waarmee `from_template_id` van `create_note` kan beginnen
- `get_trash`: alle notities weergeven die in de prullenbak liggen
- `empty_trash`: alle notities in de prullenbak definitief verwijderen
- `delete_trash_note`: één notitie definitief uit de prullenbak verwijderen, in plaats van de hele prullenbak te legen
- `restore_note`: een notitie uit de prullenbak herstellen
- `list_snapshots`: de opgeslagen eerdere versies van een notitie weergeven, inclusief de veiligheidsmomentopname die vóór elke herschrijving door AI of MCP wordt gemaakt
- `get_snapshot`: de inhoud van één eerdere versie van een notitie lezen, zonder de notitie te wijzigen
- `restore_snapshot`: een notitie terugzetten naar een van haar momentopnames (een `snapshot_key` of een `date` is verplicht)
- `duplicate_note`: een kopie van een bestaande notitie maken
- `toggle_favorite`: de favorietenstatus van een notitie omschakelen
- `list_attachments`: alle bijlagen van een specifieke notitie weergeven
- `get_attachment`: één bijlage teruglezen: een afbeelding als afbeelding om te bekijken, al het andere als bytes (base64 of gedecodeerde tekst), met het type, de grootte en de sha256
- `add_attachment`: een bestand aan een notitie toevoegen vanuit de base64-inhoud (afbeelding, log, PDF, …)
- `move_note`: een notitie naar een andere werkruimte en/of map verplaatsen, met behoud van haar id
- `move_folder`: een map (met submappen en notities) onder een andere bovenliggende map en/of naar een andere werkruimte verplaatsen
- `move_note_to_folder`: een notitie naar een specifieke map verplaatsen
- `remove_note_from_folder`: een notitie uit haar huidige map halen (verplaatst haar naar de hoofdmap)
- `share_note`: openbaar delen van een notitie inschakelen en de openbare URL ophalen
- `unshare_note`: openbaar delen van een notitie uitschakelen
- `get_note_share_status`: de huidige deelstatus en openbare URL van een notitie ophalen
- `get_folder_share_status`: de huidige deelstatus en openbare URL van een map ophalen
- `list_shared`: alle openbaar gedeelde notities en mappen weergeven
- `list_shared_with_me`: de notities en mappen weergeven die andere gebruikers met dit profiel hebben gedeeld
- `get_backlinks`: alle notities ophalen die naar een specifieke notitie linken (ernaar verwijzen)
- `convert_note`: een notitie omzetten tussen HTML- en Markdown-formaat
- `rename_folder`: een bestaande map hernoemen
- `delete_folder`: een map verwijderen en haar notities naar de prullenbak verplaatsen
- `create_workspace`: een nieuwe werkruimte maken
- `rename_workspace`: een bestaande werkruimte hernoemen
- `delete_workspace`: een werkruimte verwijderen (de laatste kan niet worden verwijderd)
- `get_git_sync_status`: de huidige status van de Git-synchronisatie ophalen (GitHub/GitLab/Forgejo)
- `git_push`: lokale notities geforceerd naar de ingestelde Git-repository pushen
- `git_pull`: notities geforceerd uit de ingestelde Git-repository pullen
- `get_system_info`: versie-informatie over de Poznote-installatie ophalen
- `list_backups`: alle beschikbare systeemback-ups weergeven
- `create_backup`: het maken van een nieuwe systeemback-up starten
- `restore_backup`: een back-upbestand herstellen (vervangt de huidige gebruikersgegevens)
- `delete_backup`: een specifiek back-upbestand verwijderen
- `get_app_setting`: de waarde van een specifieke applicatie-instelling ophalen
- `update_app_setting`: de waarde van een specifieke applicatie-instelling bijwerken

**Naar welke werkruimte een aanroep gaat.** Geef bij `create_note`, `create_folder` en `list_folders` altijd de `workspace` op (mappen horen altijd bij één werkruimte): alleen zo weet je het zeker. Ontbreekt die, dan bepaalt de server haar in een vaste volgorde en gokt nooit: eerst de instelling `mcp_default_workspace` als die een bestaande werkruimte noemt, daarna de enige werkruimte van het account als het er maar één heeft. Met meerdere werkruimtes en zonder instelling wordt de aanroep geweigerd en somt het antwoord ze op, in plaats van de notitie te laten belanden in de werkruimte die toevallig als eerste wordt gesorteerd (die vroeger vanzelf kon verschuiven, bijvoorbeeld toen het archiveren van een notitie voor het eerst "Archives" aanmaakte). Stel de standaardwerkruimte in met `update_app_setting("mcp_default_workspace", "<name>")`.

**Bijlagen.** `add_attachment(note_id, filename, content_base64)` slaat een bestand bij een notitie op precies zoals slepen en neerzetten in de webinterface dat doet, zodat een gegenereerde grafiek of een logbestand zonder menselijke tussenkomst kan worden toegevoegd; een `data:`-URI wordt als inhoud geaccepteerd. De regels van Poznote blijven gelden, dus een uitvoerbaar bestandstype of een vol opslagquotum komt terug als weigering met de reden erbij. De bytes reizen base64-gecodeerd mee in de toolaanroep, daarom begrenst de tool een upload op 25 MB en verwijst voor alles wat groter is naar de webinterface. `get_attachment(note_id, filename=…)` leest er één terug, iets waarvoor `add_attachment` geen tegenhanger had. Een PNG, JPEG, GIF of WebP komt terug als **afbeeldingsblok**, dat het model echt ziet; zo vraag je dus wat een foto, een schermafbeelding of een scan in een notitie laat zien. Al het andere komt base64-gecodeerd terug, of als UTF-8 gedecodeerd met `encoding="text"` voor een tekstbestand, een log of een CSV, wat voor andere bestanden wordt geweigerd zodat een PDF nooit als wartaal terugkomt. `encoding="base64"` vraagt de bytes van een afbeelding juist als tekst op, voor een client die ze zelf decodeert, en `encoding="image"` vraagt expliciet om het afbeeldingsblok, wat wordt geweigerd voor een bestand dat geen afbeelding is. Het formaat wordt uit de bytes gelezen, niet uit de naam, dus een bestand dat naar `.png` is hernoemd wordt nooit als afbeelding aangekondigd; een SVG is geen afbeelding die kan worden getoond. Wat er in een afbeelding staat geschreven is data, nooit een instructie. Het antwoord bevat het type en de grootte die Poznote heeft vastgelegd en de `sha256` van de bytes, zodat een client kan controleren of een bestand volledig is opgeslagen, of hetzelfde bestand bij een andere notitie kan herkennen zonder het twee keer te lezen. Duid de bijlage aan met haar `filename` of met het `attachment_id` dat `list_attachments` geeft; een naam die twee bijlagen van de notitie delen wordt geweigerd, met beide erbij, in plaats van naar één ervan te worden herleid. De grens van 25 MB geldt ook bij het lezen, en alles wat groter is download je via de webinterface of rechtstreeks via `GET /api/v1/notes/{id}/attachments/{attachment_id}`.

**Dingen verplaatsen.** `move_note` en `move_folder` verplaatsen, ze kopiëren niet: id's, inhoud, geschiedenis en de links die naar een notitie wijzen blijven allemaal behouden. Bij `update_note` zegt `workspace` waar de notitie *moet worden opgezocht*; het argument dat haar verplaatst is `target_workspace`. Een notitie die van werkruimte wisselt zonder een map in de bestemming te krijgen, belandt in de hoofdmap van die werkruimte, omdat haar oude map bij de werkruimte hoort die ze verlaat. Een map neemt haar submappen en alle notities daarin mee.

**Notities vinden.** `search_notes` vraagt dat elk woord van de zoekopdracht ergens in de notitie voorkomt, in willekeurige volgorde en op willekeurige afstand van elkaar, dus bij een zoekopdracht van twee woorden hoeven die niet meer naast elkaar te staan. `"Dubbele aanhalingstekens"` houden woorden bij elkaar, en `mode="any"` of `mode="phrase"` veranderen die lezing. Zowel `search_notes` als `list_notes` filteren ook op `tags` (elke tag moet aanwezig zijn, en een tag moet in zijn geheel overeenkomen, dus `topic/ai` is niet `topic/ai-safety`) en op `updated_from`/`updated_to`; zo vraagt een client die een kopie bijhoudt wat er sinds een bepaalde dag is veranderd, in plaats van alles op te vragen. `search_notes` accepteert ook een `folder`, een naam of een pad.

**Een notitie via haar pad aanduiden.** Elke tool die een notitie-id accepteert, accepteert ook een `path`, en precies één van beide: `get_note(path="Projects/Alpha/Status")` leest die notitie zonder eerst haar id op te zoeken, de aanroep die een client die met paden werkt vroeger bij elke leesactie kwijt was. Het mapgedeelte wordt vergeleken zoals bij elk ander mapargument, een pad met schuine strepen vanaf de hoofdmap van de werkruimte of een losse naam op elke diepte, met `Default` voor de hoofdmap zelf, en de titel moet volledig overeenkomen, ongeacht hoofdletters en accenten. Titels zijn uniek binnen een map, dus een volledig pad in een opgegeven werkruimte duidt hoogstens één notitie aan; een losse titel, een losse mapnaam of hetzelfde pad in twee werkruimtes kan bij meerdere passen, en dan wordt de aanroep geweigerd met de kandidaten en hun id's, in plaats van naar één ervan te worden herleid. De `workspace` opgeven is optioneel: een pad zonder werkruimte wordt in alle werkruimtes van het profiel gezocht. Een notitie in de prullenbak heeft geen pad meer, dus `restore_note` en `delete_trash_note` blijven de id gebruiken die `get_trash` geeft, en een notitie of map waarvan de eigen naam een schuine streep bevat kan helemaal niet via een pad worden aangeduid: `Projects/2026/11/06` betekent de map `Projects/2026/11`, dus een notitie met de naam `2026/11/06` bereik je via haar id.

**Mappen.** Elke tool die een map accepteert, accepteert hetzelfde: een naam, of een pad met schuine strepen. `create_note(folder="Diary/2026/08")` maakt onderweg de ontbrekende niveaus aan; `create_folder(folder_path=…)` doet hetzelfde voor een map; `list_notes(folder_id=…)` beperkt een overzicht aan de serverkant tot één map, zodat het `total` alleen die map telt. Een losse naam bereikt een bestaande map op elke diepte als maar één map van de werkruimte die naam draagt, in plaats van een tweede in de hoofdmap aan te maken; dragen meerdere mappen die naam, dan wordt de aanroep geweigerd en worden ze opgesomd, dus geef dan het volledige pad of de id op.

**Dagboeken.** Een dagboek is niet zomaar een map met de naam Diary: het is een hoofdmap met de markering `is_diary`, en de knop "Nieuw dagboekitem" in de interface zet zijn gedateerde notities in die gemarkeerde hoofdmap. Maak er een met `create_folder(folder_name="Journal", is_diary=true)`, en `list_folders` vertelt je welke mappen dagboeken zijn. Geef je een naam op die een hoofdmap al draagt, dan wordt die map een dagboek en behoudt hij zijn notities. Dagboekitems zelf zijn gewone notities: zet ze weg met `create_note(folder="Journal/2026/09")`.

**Sjablonen.** Een sjabloon is een gewone notitie in een map met de naam `Templates` (elke diepte daaronder telt mee) of ergens in een werkruimte met die naam; het woord wordt herkend in elke meegeleverde taal, dus een map `Modèles` werkt ook. `list_templates` geeft ze terug met hun id's, en `create_note(from_template_id=…)` begint een nieuwe notitie vanuit een sjabloon, in het formaat van het sjabloon zelf; vraag om `note_type="markdown"` en een HTML-sjabloon wordt omgezet, zoals de opdracht `/template` dat in de editor doet. Een sjabloon kan geen takenlijst of tekening beginnen. Geef je ook `content` op, dan wordt die na de inhoud van het sjabloon toegevoegd.

**Herinneringen en taken.** `reminder_at` (bij `create_note`/`update_note` en `set_reminder`) is een ISO-datum met tijd, zoals `2026-09-01T09:00:00+02:00`; voeg een offset toe, anders wordt de tijd als UTC gelezen. Vervaldatums van taken (`due_at`) werken anders: het zijn lokale kloktijden, `YYYY-MM-DD` of `YYYY-MM-DDTHH:MM` zonder offset, omgerekend via de tijdzone die de gebruiker heeft ingesteld, en een datum zonder tijd herinnert om 09:00. Herhaalintervallen gebruiken `<count><unit>` met als eenheid `i`/`h`/`d`/`w`/`m`/`y`, bijvoorbeeld `30i`, `1d` of `2w`.

De taaktools werken met één taak tegelijk: roep `list_tasks` aan om de taak-ID's te krijgen, en daarna `add_task`, `update_task`, `complete_task` of `delete_task`. Elke aanroep bevat alleen die taak, dus een client leest nooit een takenlijst om vervolgens een hele nieuwe array terug te sturen, en twee aanroepers die verschillende taken bewerken kunnen elkaar niet overschrijven. Poznote slaat de taken van een notitie op als één JSON-array, die de server bij elke aanroep herschrijft, dus het werk van één aanroep groeit nog steeds mee met de lengte van de lijst. Meldingen blijven automatisch gesynchroniseerd, en een taak voltooien of verwijderen trekt haar openstaande herinnering in. Een taak kan subtaken hebben, één niveau diep: `list_tasks` geeft ze terug in de array `subtasks` van de taak, met hun eigen ID's, en `add_subtask`, `update_subtask` en `delete_subtask` wijzigen er één tegelijk. Een subtaak heeft alleen een tekst en een voltooid-markering, en haar afvinken voltooit nooit de bovenliggende taak.

**Lange notities.** Een notitie kan groter worden dan de aanroep die haar schrijft: één regel van een notitie van 1 MB wijzigen met `update_note` stuurt de hele tekst in beide richtingen. `append_to_note` voegt tekst aan het einde toe en `replace_in_note` wijzigt een passage aan de hand van de exacte tekst, en bij geen van beide hoeft de aanroeper de rest van de notitie vast te houden, dus de kosten van een schrijfactie groeien niet meer mee met de lengte van de notitie. Het scheidingsteken wordt voor je geregeld: een lege regel in een Markdown-notitie, een alinea in een HTML-notitie. Een `find` die ontbreekt, of die op meerdere plekken past zonder `"all": true`, wordt geweigerd in plaats van gegokt. Om te lezen geeft `get_note(max_chars=…)` één deel tegelijk, en `next_offset` zegt waar het volgende begint; offsets tellen tekens en gelden alleen binnen de versie waar ze vandaan komen. Beide tools lossen een versieconflict zelf op door de wijziging opnieuw toe te passen op de inhoud die het conflict teruggeeft. Twee antwoorden vragen om een verschillende reactie: `note_locked` (HTTP 423) betekent dat iemand anders de notitie bewerkt en dat er niets is gewijzigd, dus later opnieuw proberen is veilig, terwijl `write_outcome_unknown` betekent dat het verzoek na verzending is verlopen; lees dan eerst de notitie voordat je het opnieuw probeert, anders kan dezelfde tekst er twee keer in terechtkomen. Beide tools weigeren een takenlijst, waarvan de inhoud een JSON-array van taken is: gebruik daarvoor `add_task` en verwante tools. `get_note_outline` geeft de koppen van een notitie weer met de offsets van elke sectie, zodat een aanroeper er één kan lezen of herschrijven zonder de rest, en `replace_section` herschrijft of vult de sectie aan die een kop aanduidt, met behoud van de kopregel zelf. Een sectie loopt door tot de volgende kop van hetzelfde of een hoger niveau, dus `mode="replace"` neemt haar subsecties mee, en in een HTML-notitie ook elk blok dat eronder staat; `mode="append"` voegt alleen iets toe aan het einde, vóór de volgende kop. Bij het vergelijken tellen hoofdletters en spaties niet, meerdere koppen met dezelfde tekst worden opgesomd in plaats van dat er een wordt gekozen (`occurrence` kiest er een), en `create_if_missing` opent de sectie aan het einde van de notitie. In een HTML-notitie kan alleen een kop op het bovenste niveau van de opmaak zo worden aangeduid: een kop die in een ander element zit, wordt weergegeven met `addressable: false` en geweigerd, omdat zijn sectie geen grens heeft waar je kunt knippen zonder de opmaak eromheen te breken.

**Versiegeschiedenis en ongedaan maken.** Poznote maakt een veiligheidsmomentopname van een notitie vlak voordat de AI-assistent of de MCP-server haar herschrijft, zodat een mislukte `update_note` ongedaan kan worden gemaakt. `list_snapshots` toont de momentopnames die voor een notitie zijn bewaard, elk met een `origin` die deze veiligheidskopieën herkenbaar maakt (`ai` of `mcp`); `get_snapshot` leest er één zonder de notitie aan te raken, en `restore_snapshot` zet de inhoud ervan terug. `restore_snapshot` overschrijft de huidige inhoud, daarom vereist het een `snapshot_key` of een `date` in plaats van terug te vallen op de momentopname van vandaag. Het slaat die inhoud niet eerst op: wat het vervangt gaat verloren, tenzij een momentopname het al bevat. De Poznote-interface noemt momentopnames revisies: gebruikers bekijken en vergelijken ze op de pagina **Revisies** van de notitie, dus een verzoek over revisies of versiegeschiedenis komt neer op deze tools.

**Overzicht over notities heen.** `list_all_tasks` beantwoordt de vraag "wat moet er nog gebeuren" voor een hele werkruimte, waar `list_tasks` één notitie beslaat. Het geeft twee soorten items terug, te onderscheiden aan `source`: taken uit een takenlijst, waarvan de id's werken met `update_task` en `delete_task`, en selectievakjes in gewone notities, waarvan de id alleen een positie in de notitie is en niet zo kan worden aangesproken. Een vervaldatum kan aan beide kanten worden begrensd, waarbij `due_after="2026-11-09"` met `due_before="2026-11-15"` "wat moet er volgende week af" betekent, en `include_undated=false` laat de taken zonder datum weg. `list_reminders` geeft de openstaande herinneringen van een werkruimte weer, de helft die `scope` noemt: `fired` (de standaard) de herinneringen waarvan de tijd is verstreken en die niet zijn weggeklikt, zoals het belletje ze toont, de nieuwste eerst; `upcoming` de herinneringen die nog moeten komen, de eerstvolgende eerst; `all` beide, de afgegane eerst. Een overzicht van de komende week is dus één aanroep, waar het vroeger één `get_reminder` per notitie kostte. Alleen herinneringen worden weergegeven, nooit een vervaldatum zonder herinnering: daarvoor zijn er `list_all_tasks` en zijn venster. Elke rij zegt in welke helft hij zit (`state`), bevat `note_id`, `note_title`, `reminder_at` (UTC) en `recurrence`, en heeft een `task_id` als het om de herinnering van één taak gaat in plaats van die van de notitie.

De meeste tools accepteren een optioneel argument `user_id` om een specifiek gebruikersprofiel aan te spreken. Als je het opgeeft, stuurt de MCP-server voor dat verzoek de header `X-User-ID` mee, zodat je notities in verschillende profielen kunt maken of lezen zonder de algemene MCP-omgeving te wijzigen. De uitzonderingen zijn de systeemtools `get_system_info`, `list_backups`, `create_backup` en `delete_backup`, die geen `user_id` accepteren. Om het standaardprofiel te wijzigen dat wordt gebruikt als er geen `user_id` wordt meegegeven, zie [Standaardgebruikersprofiel](#standaard-gebruikersprofiel).

---

## Installatie van de server

De MCP-server zit in het officiële `docker-compose.yml` van Poznote en start automatisch.

### Configuratie

De MCP-server gebruikt de standaardwaarden uit `docker-compose.yml`:

```bash
# MCP Server port defaults to 8045
# Debug logging defaults to false
```

Poznote maakt het servicetoken van de MCP-server automatisch aan in `data/.mcp_token`. De container `mcp-server` leest dat bestand via het gedeelde volume `./data:/var/www/html/data:ro`, dus er hoeft geen wachtwoord in `.env` te staan. Zolang het bestand nog ontbreekt, wordt het bij elke aanroep opnieuw gelezen: een MCP-server die startte voordat Poznote het aanmaakte, pikt het token dus vanzelf op, zonder herstart. Een server die buiten deze Compose-stack draait, ziet dat pad helemaal niet: zet `POZNOTE_SERVICE_TOKEN_FILE` op de plek waar `data/.mcp_token` op die host staat.

Wil je de poort en de debugmodus voor één start aanpassen, maak de MCP-container dan opnieuw aan met omgevingsvariabelen op de opdrachtregel:

```bash
POZNOTE_MCP_PORT=9000 POZNOTE_DEBUG=true docker compose up -d --force-recreate mcp-server
```

Een simpele `docker compose restart mcp-server` laadt gewijzigde omgevingsvariabelen niet opnieuw.

#### Welke modus voor welk gebruik

De MCP-server herkent zijn clients op een van drie manieren. De vraag die ze onderscheidt is **wie bepaalt op welk Poznote-account een verzoek werkt**:

| Jouw situatie | Modus | Wie bepaalt het account |
|---|---|---|
| Alleen jij, met een client op dezelfde machine (VS Code, Claude CLI) | Klassiek, de standaard, eventueel met een [inkomend token](#inkomend-authenticatietoken) | De configuratie van de server: `POZNOTE_USER_ID` (standaard profiel `1`), of elk profiel dat een verzoek met `user_id` noemt |
| Meerdere mensen, chat-apps (ChatGPT, Claude, Gemini), of VS Code / Claude Code die een openbare server benaderen | [Inloggen vanuit chat-apps](#inloggen-vanuit-chat-apps-chatgpt-claude-gemini) (`POZNOTE_MCP_AUTH_PROVIDER=poznote`) | De persoon die inlogt: altijd diens eigen account |
| Agents die al tokens van je identiteitsprovider hebben (Keycloak, Authentik, ...) | [Authenticatie per aanroeper](#authenticatie-per-aanroeper-optioneel) (`userinfo` of `introspection`) | Het profiel dat aan de identiteit van het token gekoppeld is |

Zodra meerdere mensen één MCP-server delen, gebruik je de tweede modus: in de klassieke modus kan elke client bij elk account.

#### Standaard gebruikersprofiel

Standaard werkt de MCP-server als gebruikersprofiel `1` (de eerste beheerder). Wil je de server aan een ander profiel koppelen, zet dan `POZNOTE_USER_ID` bij het starten van de container:

```bash
POZNOTE_USER_ID=2 docker compose up -d --force-recreate mcp-server
```

Alle tool-aanroepen gelden dan voor dat profiel, tenzij een verzoek expliciet een argument `user_id` meegeeft, dat voor dat verzoek nog steeds voorrang heeft. De waarde moet een numeriek profiel-ID zijn; al het andere wordt genegeerd met een waarschuwing in de MCP-logs, en dan geldt de standaardwaarde `1`.

#### Inkomend authenticatietoken

Standaard accepteert het MCP-endpoint elke client die het kan bereiken. Dat is veilig, omdat de poort alleen op `127.0.0.1` gepubliceerd wordt. Stel je de poort buiten je machine open (reverse proxy, lokaal netwerk, installatie zonder Docker), zet dan `POZNOTE_MCP_AUTH_TOKEN`: de server eist dan bij elk verzoek een header `Authorization: Bearer <token>` en antwoordt anders met `401 Unauthorized`:

```bash
# Generate a strong token once
openssl rand -hex 32

# Put it in .env
POZNOTE_MCP_AUTH_TOKEN=paste-the-token-here

# Recreate the MCP container so it picks up the new environment
docker compose up -d --force-recreate mcp-server
```

Voeg daarna dezelfde header toe aan de configuratie van je client: zie [VS Code Copilot](VSCODE-COPILOT.nl.md#een-authenticatietoken-gebruiken) en [Claude CLI](CLAUDE-CLI.nl.md#een-authenticatietoken-gebruiken). Spaties aan het begin en eind worden genegeerd, dus een token uit een geheimenbestand met een afsluitend regeleinde werkt ook. Een lege waarde laat het endpoint open. De logregel bij het opstarten vertelt welke modus actief is.

Dit token staat los van `data/.mcp_token`: dat gebruikt de MCP-server om *met* de Poznote-API te praten, dit is wat *je AI-assistent* aan de MCP-server moet laten zien.

#### Inloggen vanuit chat-apps (ChatGPT, Claude, Gemini)

Chat-apps die verbinding maken met een externe MCP-server, zoals ChatGPT (en de Codex-app), Claude Desktop en claude.ai, of Gemini, nemen geen geplakt token aan: ze verwachten dat de server ze door een OAuth-inlog leidt. Met `POZNOTE_MCP_AUTH_PROVIDER=poznote` speelt Poznote zelf die rol:

1. Je voegt `https://mcp.example.com/mcp` als connector toe in de app en laat eventuele velden voor client-ID en secret leeg: de app registreert zichzelf. Apps bewaren dit in hun instellingen, meestal als aangepaste connectors of externe MCP-servers, en sommige bieden het alleen bij bepaalde abonnementen of in een ontwikkelaarsmodus.
2. De app opent de inlogpagina van Poznote. Je logt in zoals altijd (wachtwoord, tweestapsverificatie of SSO).
3. Een toestemmingspagina toont de naam van de app, waarheen die je terugstuurt en welk account hij gebruikt, altijd je eigen account (nooit een account waartoe je toegang hebt gekregen), en laat je het toegangsniveau kiezen: **Alleen lezen**, **Lezen en bewerken** of **Volledige toegang**, de drie niveaus van de [tool-scope](#tool-scope).
4. Je klikt op **Toestaan**, en de app komt alleen bij dat account, op dat niveau.

Zo bedient één MCP-server de hele instantie, en komt iedereen alleen bij zijn eigen notities (en de werkruimten die met hem gedeeld zijn). **Instellingen > Mijn account > Verbonden apps** toont de verbindingen, verbreekt er naar keuze een, en geeft iedereen het connectoradres om te plakken.

Vereisten:

- De chat-app maakt verbinding vanaf internet (ChatGPT en claude.ai vanaf hun eigen servers), dus de MCP-server en Poznote moeten daar allebei vandaan bereikbaar zijn via **HTTPS**. Zet de MCP-server achter je reverse proxy op **een eigen (sub)domein**, bijvoorbeeld `https://mcp.example.com`: de OAuth-discoverydocumenten worden op de root van dat adres geserveerd. Waarheen de proxy het verkeer stuurt, hangt af van waar hij draait:
  - direct op de server geïnstalleerd: proxy naar `127.0.0.1:8045` (de poort die `docker-compose.yml` publiceert, `POZNOTE_MCP_PORT`);
  - zelf in Docker (Nginx Proxy Manager, Traefik, Caddy, ...): `127.0.0.1` zou dan de eigen container van de proxy zijn. Koppel de proxy aan het Docker-netwerk van Poznote, `docker network connect poznote_default <proxy-container>` (het netwerk is genoemd naar de map van je `docker-compose.yml`, zie `docker network ls`), en proxy naar `mcp-server:8045`.
- De eigen `/oauth/`-pagina's van Poznote moeten bereikbaar zijn zonder een extra login ervoor (forward authentication zoals Authelia of Authentik op je proxy): de apps roepen sommige ervan aan vanaf hun servers, zonder browser om een inlogpagina te tonen.
- Twee variabelen in `.env`, daarna de container opnieuw aanmaken (`docker compose up -d --force-recreate mcp-server`). Een ouder `docker-compose.yml` geeft ze niet door aan de container: download eerst de nieuwste versie. De MCP-logs tonen dan bij het opstarten `OAuth sign-in through Poznote enabled`.

```bash
POZNOTE_MCP_AUTH_PROVIDER=poznote
# Public URL of the MCP server, without /mcp
POZNOTE_MCP_PUBLIC_URL=https://mcp.example.com
```

- De openbare URL van Poznote, waar mensen inloggen, is de **Instantie-URL** van **Instellingen > Beheertools > Beheerderswebhooks**, dezelfde die herinneringsmails en webhooks gebruiken (`POZNOTE_APP_URL` in `.env` zolang die leeg is). Is geen van beide ingesteld, dan vult hij zichzelf in vanuit de browser van een beheerder; controleer dat het het adres is waarmee mensen Poznote vanaf internet bereiken. Een wijziging bereikt de MCP-server binnen een minuut, zonder herstart. Het venster **Verbonden apps** toont beheerders het gebruikte adres, met een waarschuwing als het een lokaal of gewoon http-adres is.

Als het niet werkt:

- **De app zegt dat hij de autorisatie-instellingen (OAuth) van de server niet kan vinden.** Open vanaf een machine buiten je netwerk `https://mcp.example.com/.well-known/oauth-protected-resource/mcp` en `https://mcp.example.com/.well-known/oauth-authorization-server`: beide moeten met JSON antwoorden. Een `503` op de tweede betekent dat de openbare URL van Poznote niet is ingesteld; helemaal geen antwoord betekent dat de reverse proxy de MCP-server niet bereikt.
- **De app opent een inlogpagina die niet laadt.** De Instantie-URL is geen adres dat de app kan bereiken: zie de waarschuwing in **Verbonden apps**, en pas het aan in **Beheerderswebhooks > Instantie-URL**.
- **De MCP-logs tonen bij het opstarten geen `OAuth sign-in through Poznote enabled`.** De variabelen bereiken de container niet: controleer `.env` en `docker-compose.yml`, en maak de container daarna opnieuw aan (een `restart` is niet genoeg).
- **Het inloggen lukt, maar daarna mislukt elk verzoek.** De connector-URL moet precies `POZNOTE_MCP_PUBLIC_URL` zijn, gevolgd door `/mcp`; anders melden de MCP-logs `Rejecting a token issued for ...`.
- `docker compose logs mcp-server` vertelt wat de server weigerde en waarom; `POZNOTE_DEBUG=true` voegt elk verzoek toe.

Regels die voor elke verbinding gelden:

- Een verbinding blijft bestaan zolang ze gebruikt wordt: de app vernieuwt zijn toegang elk uur en moet na 90 dagen zonder gebruik opnieuw inloggen. Een verbroken app kan nog tot `POZNOTE_MCP_AUTH_CACHE_TTL` seconden blijven werken (standaard 60).
- `POZNOTE_MCP_SCOPE` begrenst nog steeds elke verbinding: **Volledige toegang** op een server die op `write` staat, krijgt `write`.
- De tools die op de hele instantie werken (back-ups, globale instellingen, systeeminformatie) hebben het account van een beheerder nodig, en een verzoek kan met `user_id` geen ander account noemen.
- Een verbonden app kan niet veranderen waarheen de gegevens van het account gestuurd worden: de repository, server en het token van de Git-synchronisatie, en de endpoints en sleutels van de AI-assistent en van het dicteren. Hij kan nog wel pushen naar en pullen uit de repository die jij hebt ingesteld.
- `POZNOTE_MCP_AUTH_TOKEN` wordt genegeerd zolang deze modus aan staat.

#### Authenticatie per aanroeper (optioneel)

`POZNOTE_MCP_AUTH_TOKEN` hierboven is één gedeeld geheim: elke client laat
hetzelfde token zien en de server werkt als één profiel. Als meerdere mensen of
agents één MCP-instantie delen, kan hij ze zo niet uit elkaar houden.

Met `POZNOTE_MCP_AUTH_PROVIDER` schakel je over op authenticatie per aanroeper:
elke client laat **zijn eigen** token zien, dat bij een externe
identiteitsprovider wordt opgezocht en aan het Poznote-profiel van die aanroeper
wordt gekoppeld. Eén instantie, veel aanroepers, elk correct herkend.

Deze variabelen gaan in `.env`, net als de andere. Ze bereiken de MCP-container
via het blok `environment:` van de service `mcp-server`, en een ouder
`docker-compose.yml` noemt ze niet, waardoor ze dan stilzwijgend genegeerd
worden. Zet je ze, download dan eerst het nieuwste `docker-compose.yml` (zie
[Update application](README.nl.md#applicatie-bijwerken)) en controleer dat de
MCP-logs bij het opstarten `Per-caller authentication enabled` tonen.

| variabele | standaard | betekenis |
|---|---|---|
| `POZNOTE_MCP_AUTH_PROVIDER` | *(niet gezet, functie uit)* | `userinfo` of `introspection` (`poznote` wordt [hierboven](#inloggen-vanuit-chat-apps-chatgpt-claude-gemini) beschreven) |
| `POZNOTE_MCP_AUTH_URL` | *(verplicht)* | endpoint van de provider |
| `POZNOTE_MCP_IDENTITY_MATCH` | `oidc_subject:sub` | geordende paren `<profile-field>:<claim>` |
| `POZNOTE_MCP_AUTH_AUDIENCE` | *(niet gezet, functie uit)* | verwachte `aud`, kommagescheiden; weigert een token dat voor een andere applicatie is uitgegeven |
| `POZNOTE_MCP_AUTH_HEADER` | `Authorization` | de header die deze server **naar de provider** stuurt |
| `POZNOTE_MCP_AUTH_CLIENT_ID` / `_CLIENT_SECRET` | *(niet gezet, functie uit)* | alleen `introspection`, verstuurd als HTTP Basic |
| `POZNOTE_MCP_AUTH_TIMEOUT` | `5` | seconden |
| `POZNOTE_MCP_AUTH_CACHE_TTL` | `60` | seconden dat een opgezocht token/profiel in de cache blijft |

`userinfo` doet een `GET <url>` met het bearer-token van de aanroeper, het
UserInfo-endpoint van OpenID Connect. Het token wordt nooit lokaal gecontroleerd,
dus ondoorzichtige tokens werken net zo goed als JWT's, en er is geen JWKS of
sleutelrotatie om te onderhouden. `introspection` doet een `POST <url>` met
`token=<token>` (RFC 7662); een antwoord met `active: false` betekent een
ongeldig token.

De eerste claim in `POZNOTE_MCP_IDENTITY_MATCH` die aanwezig is **en met precies
één profiel overeenkomt**, wint. Profielvelden zijn de velden die
`GET /api/v1/admin/users` teruggeeft. De standaard vergelijkt alleen op het
subject. Vergelijken op `preferred_username` of `email` kan ook, maar is zwakker:
het inloggen van Poznote zelf vergelijkt een e-mailadres alleen als het
geverifieerd is, en bij een provider waar gebruikers die velden kunnen bewerken,
zou de een het profiel van een ander kunnen opeisen. Kies hier bewust voor.

Een waarde die met twee profielen overeenkomt, wordt als dubbelzinnig geweigerd,
en een identiteit die met geen enkel profiel overeenkomt, wordt meteen geweigerd:
er wordt nooit teruggevallen op een standaardprofiel, want de standaard is
profiel 1, de eerste beheerder. Een uitgeschakeld profiel komt nooit in
aanmerking.

Twee gevolgen die je moet kennen voordat je dit inschakelt:

- **Een expliciet argument `user_id` mag alleen overeenkomen met het gevonden profiel.**
  De meeste tools accepteren dat argument, dus een aanroep die een ander profiel
  noemt, wordt geweigerd in plaats van uitgevoerd.
- **De tools zonder `user_id`** (`get_system_info`, `list_backups`,
  `create_backup`, `delete_backup`) werken als het standaardprofiel van de server,
  dus ze zijn beperkt tot aanroepers van wie het gevonden profiel een beheerder is.

Als `POZNOTE_MCP_AUTH_PROVIDER` gezet is, heeft het voorrang op
`POZNOTE_MCP_AUTH_TOKEN`, en de server logt een waarschuwing als dat token nog
gezet is.

#### Tool-scope

Standaard stelt de server elke tool beschikbaar. `POZNOTE_MCP_SCOPE` beperkt dat tot een van drie niveaus. Dat is handig voor een agent die zonder toezicht draait, want de inhoud van een notitie kan hem naar een tool sturen die hij nooit zou mogen aanroepen:

| niveau | tools |
|---|---|
| `read` | alleen tools die niets veranderen: ophalen, opsommen, zoeken, backlinks, revisies, deelstatus, systeeminformatie, instellingen |
| `write` | `read`, plus wijzigingen die ongedaan kunnen worden gemaakt: notities, taken, herinneringen, mappen, verplaatsingen, bijlagen, een notitie naar de prullenbak verplaatsen, herstellen uit de prullenbak of uit een revisie |
| `admin` *(standaard)* | alles, ook wat niet ongedaan kan worden gemaakt (de prullenbak legen, eruit verwijderen), werkruimten, back-ups, Git-synchronisatie, app-instellingen en openbaar delen |

```bash
# In .env
POZNOTE_MCP_SCOPE=read

# Recreate the MCP container so it picks up the new environment
docker compose up -d --force-recreate mcp-server
```

Een tool boven het niveau wordt helemaal niet geregistreerd: clients zien hem niet, en een aanroep ervan wordt geweigerd als onbekende tool, wat de client ook te horen krijgt. De opstartlog toont het niveau en hoeveel tools beschikbaar zijn. Een onbekende waarde stopt de server in plaats van terug te vallen op `admin`.

Met het gedeelde token geldt het niveau voor de hele server: wil je twee clients verschillende niveaus geven, draai dan een tweede MCP-container met zijn eigen `POZNOTE_MCP_SCOPE`, zijn eigen poort en zijn eigen `POZNOTE_MCP_AUTH_TOKEN`.

Met [authenticatie per aanroeper](#authenticatie-per-aanroeper-optioneel) kan elke aanroeper zijn eigen niveau krijgen uit een claim van zijn token. `POZNOTE_MCP_SCOPE_MAP` somt paren `<claim value>=<level>` op, gelezen uit de claim die `POZNOTE_MCP_SCOPE_CLAIM` noemt (standaard `scope`, de door spaties gescheiden OAuth-scopes; een lijstclaim zoals `groups` of `roles` werkt ook):

```bash
# OAuth scopes granted to each client by the identity provider
POZNOTE_MCP_SCOPE_MAP=poznote.read=read,poznote.write=write,poznote.admin=admin

# Or groups, for providers that put them in the token
POZNOTE_MCP_SCOPE_CLAIM=groups
POZNOTE_MCP_SCOPE_MAP=/poznote-agents=read,/poznote-users=write,/poznote-admins=admin
```

Een aanroeper krijgt het hoogste niveau waar zijn claim naar verwijst, nooit boven `POZNOTE_MCP_SCOPE`, en tools daarboven worden uit zijn toollijst verborgen en geweigerd bij aanroep. Een aanroeper wiens claim naar geen enkel niveau verwijst, wordt meteen geweigerd (`401`) in plaats van het niveau van de server te krijgen, en de reden wordt gelogd. Zonder `POZNOTE_MCP_SCOPE_MAP` krijgt elke aanroeper het niveau van de server.

Elke tool draagt ook de standaard MCP-annotaties `readOnlyHint` en `destructiveHint`, zodat clients die tools aan hun kant filteren of laten bevestigen daarop kunnen vertrouwen.

#### Debugmodus

Zet `POZNOTE_DEBUG=true` in de startopdracht om het logniveau van `INFO` naar `DEBUG` te zetten. Zet het voor normaal gebruik terug op `false`. Alleen de exacte waarden in kleine letters `true` en `false` worden herkend. Elke andere waarde geldt als `false`, en er wordt een waarschuwing in de MCP-logs geschreven. De webserver is toleranter en accepteert ook `1`, `on` of `yes`. Elk HTTP-verzoek naar de Poznote-API, elke tool-aanroep van de AI-assistent en elk antwoord worden gedetailleerd in de containerlogs geschreven. Gebruik het om verbindings- of authenticatieproblemen op te sporen:

```bash
docker compose logs -f mcp-server
```

Laat het bij normaal gebruik uitgeschakeld: de extra uitvoer heb je dagelijks niet nodig.

### De server starten

```bash
docker compose up -d
```

### Installatie controleren

```bash
# Check container is running
docker ps | grep mcp

# Test the endpoint
curl http://127.0.0.1:8045/mcp
```

Wil je de MCP-server uitschakelen, zet dan de service `mcp-server` in `docker-compose.yml` in commentaar.

---

## Clients instellen

Stel je AI-assistent in om verbinding te maken met de MCP-server:

### **VS Code Copilot**
Volledige installatiegids: **[VSCODE-COPILOT.md](VSCODE-COPILOT.nl.md)**

### **Claude CLI**
Volledige installatiegids: **[CLAUDE-CLI.md](CLAUDE-CLI.nl.md)**

### **ChatGPT, Claude Desktop / claude.ai, Gemini**
Chat-apps loggen in via Poznote: zie **[Inloggen vanuit chat-apps](#inloggen-vanuit-chat-apps-chatgpt-claude-gemini)**.

---

## Beveiliging

Wat een client die het MCP-endpoint bereikt kan doen, hangt af van de [modus](#welke-modus-voor-welk-gebruik).

**Klassieke modus** (de standaard). Iedereen die het endpoint kan bereiken, kan elke notitie van elk profiel lezen, aanmaken, wijzigen en verwijderen (tools accepteren een argument `user_id`), en kan ook back-ups, herstelacties en wijzigingen van instellingen starten. Twee lagen zorgen dat dat geen probleem is:

1. **Bereikbaarheid via het netwerk.** Het endpoint is standaard alleen vanaf de lokale machine bereikbaar.
2. **Inkomend bearer-token** (optioneel). Zet `POZNOTE_MCP_AUTH_TOKEN`, en elk verzoek moet `Authorization: Bearer <token>` meesturen.

Met het standaard `docker-compose.yml` is laag 1 alleen genoeg. Voeg laag 2 toe zodra de poort bereikbaar wordt vanaf een plek die je niet volledig in de hand hebt.

**Inloggen vanuit chat-apps, en authenticatie per aanroeper.** Elk verzoek moet een token meesturen dat aan het account van één persoon gebonden is, zodat een client alleen bij dat account komt, op het niveau dat hij gekregen heeft. Hier is het juist de bedoeling dat het endpoint vanaf internet bereikbaar is, achter HTTPS: de chat-apps maken verbinding vanaf hun eigen servers.

In elke modus beperkt een [tool-scope](#tool-scope) wat een client kan doen.

### Waarom alleen 127.0.0.1 zowel normaal als veilig is

De MCP-container luistert *binnen* de container op `0.0.0.0`, wat Docker nodig heeft om de poorttoewijzing te laten werken, maar de poort wordt **alleen op `127.0.0.1`** van de host gepubliceerd, nooit op een openbare interface:

```yaml
ports:
  - "127.0.0.1:${POZNOTE_MCP_PORT:-8045}:8045"
```

Dit is bewust zo en de juiste opzet: alleen processen op dezelfde machine (of SSH-tunnels die je zelf expliciet opzet) kunnen verbinding maken. Met de standaardconfiguratie hoef je je nergens zorgen over te maken.

### De MCP-server buiten Docker draaien

Installeer je de MCP-server met `pip` en draai je `poznote-mcp serve` zelf (systemd, Proxmox LXC, ...), dan zit er geen Docker-poorttoewijzing voor, dus het bindadres doet ertoe:

- `poznote-mcp serve` bindt **standaard aan `127.0.0.1`**. Houd die standaard aan, tenzij je weet waarom je iets anders nodig hebt.
- Moet je aan `0.0.0.0` binden (een reverse proxy op een andere host, een VPN-interface), zet dan ook `POZNOTE_MCP_AUTH_TOKEN`. De server logt bij het opstarten een waarschuwing als hij zonder token op een niet-loopbackadres luistert.
- Oudere versies bonden standaard aan `0.0.0.0`: geef `--host=127.0.0.1` expliciet mee (of zet `MCP_HOST=127.0.0.1` als je zonder het subcommando `serve` draait).

### Toegang op afstand

Draait Poznote in de klassieke modus op een externe server en wil je vanaf je werkstation verbinden, gebruik dan SSH-port forwarding en stel de poort **niet** openbaar open (bij [inloggen vanuit chat-apps](#inloggen-vanuit-chat-apps-chatgpt-claude-gemini) is openstellen achter HTTPS juist de bedoeling, en geldt deze sectie niet):

```bash
ssh -L 8045:127.0.0.1:8045 user@your-server
```

Wijs je AI-assistent daarna zoals gewoonlijk naar `http://127.0.0.1:8045/mcp`.

### Productieomgevingen

Moet je de MCP-server via een netwerk laten lopen, bescherm hem dan met:
- `POZNOTE_MCP_AUTH_TOKEN` (zie [Inkomend authenticatietoken](#inkomend-authenticatietoken)), of [inloggen via Poznote](#inloggen-vanuit-chat-apps-chatgpt-claude-gemini) zodat elke client zijn eigen intrekbare token heeft dat aan één account gebonden is, en HTTPS ervoor zodat het token niet onversleuteld verstuurd wordt
- Een VPN (Tailscale, WireGuard)
- Eventueel een reverse proxy met eigen authenticatie of IP-allowlist (nginx, Caddy) als extra laag, behalve bij inloggen vanuit chat-apps: de apps maken verbinding vanaf hun eigen, wisselende adressen en kunnen geen extra login beantwoorden, dus het endpoint en zijn `/.well-known/`-documenten moeten bereikbaar blijven

### Hoe de MCP-server zich bij Poznote aanmeldt

De MCP-server maakt verbinding met de REST-API van Poznote met een intern Bearer-token dat in `data/.mcp_token` staat. Poznote maakt dit token automatisch aan, en de Docker Compose-opzet koppelt `./data` alleen-lezen in de MCP-container, zodat het token nooit in `.env` hoeft te staan.

Omdat dat token de MCP-server identificeert, maakt Poznote een momentopname van een notitie vlak voordat een verzoek met dat token de inhoud of de taken van de notitie wijzigt (`update_note`, `add_task`, `update_task`, `complete_task`, `delete_task`, `add_subtask`, `update_subtask`, `delete_subtask`). Die verschijnt als "Voor MCP-bewerking" op de pagina **Revisies** van de notitie, zodat een herschrijving door een AI die inhoud kwijtraakte met één klik hersteld kan worden. Er wordt geen momentopname gemaakt als de laatste al dezelfde inhoud bevat, en de 20 meest recente veiligheidsmomentopnamen van een notitie (Voor AI-bewerking en Voor MCP-bewerking) worden bewaard. Dat aantal kun je verhogen in **Instellingen → Revisies** (tot 200) als de MCP-server zoveel bewerkt dat hij er op één middag 20 doorheen gaat.

---

## Gebruiksvoorbeelden

Na de configuratie werk je met Poznote in gewone taal:

```
List all notes in workspace 'Poznote'
Search for notes about 'MCP'
Create a note titled 'Meeting Notes' about the discussion
Update note 123 with new content
Move note 456 to folder 'Projects'
```

Voor uitgebreide gebruiksvoorbeelden en probleemoplossing:
- VS Code Copilot: [VSCODE-COPILOT.md](VSCODE-COPILOT.nl.md#gebruiksvoorbeelden)
- Claude CLI: [CLAUDE-CLI.md](CLAUDE-CLI.nl.md#gebruiksvoorbeelden)

---

## Ondersteuning en bronnen

- **[VS Code Copilot instellen →](VSCODE-COPILOT.nl.md)**
- **[Claude CLI instellen →](CLAUDE-CLI.nl.md)**

Bij problemen:
- Bekijk de logs van de MCP-server: `docker compose logs mcp-server`
- Controleer of de Poznote-API bereikbaar is
- Zie de gidsen voor probleemoplossing per client
