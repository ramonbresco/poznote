<!-- lang-selector -->
<p align="center">
  <a href="AI-ASSISTANT.md">English</a> ·
  <a href="AI-ASSISTANT.fr.md">Français</a> ·
  <a href="AI-ASSISTANT.de.md">Deutsch</a> ·
  <a href="AI-ASSISTANT.es.md">Español</a> ·
  <a href="AI-ASSISTANT.pt.md">Português</a> ·
  <a href="AI-ASSISTANT.ru.md">Русский</a> ·
  <a href="AI-ASSISTANT.zh-cn.md">简体中文</a> ·
  <a href="AI-ASSISTANT.ko.md">한국어</a> ·
  <a href="AI-ASSISTANT.ja.md">日本語</a> ·
  <a href="AI-ASSISTANT.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="AI-ASSISTANT.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# AI-assistent van Poznote

Een ingebouwde AI-chat die je notities kan doorzoeken en lezen. Hij werkt met een lokale [Ollama](https://ollama.com)- of [LM Studio](https://lmstudio.ai)-instantie, een cloudprovider zoals [Anthropic (Claude)](https://www.anthropic.com) of OpenAI, of elke OpenAI-compatibele server.

> [!TIP]
> Wil je in plaats daarvan een *externe* AI-assistent (VS Code Copilot, Claude CLI...) met je notities verbinden? Zie de [documentatie van de MCP-server](MCP-SERVER.nl.md).

## Wat hij doet

Zodra hij is geconfigureerd, verschijnt er een knop **AI-assistent** in de pictogrammenbalk links, op de notitiepagina en op het dashboard, die het chatpaneel meteen daar opent. Het paneel is rechts vastgezet, behoudt zijn open/dicht-status en breedte van de ene pagina naar de andere, en het gesprek volgt je tussen de twee.

De assistent heeft tools om **je notities te doorzoeken en te lezen**, en gebruikt ze zelfstandig: vraag "wat staat er in mijn notities over X?", vraag om een samenvatting over meerdere notities, of laat hem die notitie vinden die je je maar half herinnert. Antwoorden worden gestreamd en als Markdown weergegeven.

Hij kan ook **naar de afbeeldingen in je notities kijken**. Plak, sleep of voeg een afbeelding toe aan een notitie en vraag dan wat erop staat, wat het label erop zegt, of laat de details in de notitie opschrijven: de assistent vraagt om de afbeelding te zien en leest hem. PNG, JPEG, GIF en WebP worden getoond, of ze nu als bijlage aan de notitie hangen of erin staan, tot vier afbeeldingen per antwoord, elk tot 5 MB en samen tot 8 MB; een Excalidraw-diagram, een SVG en een PDF kunnen niet worden getoond. Hiervoor is een model nodig dat afbeeldingen accepteert, zie **Een model kiezen** hieronder. Wat er in een afbeelding staat, wordt als data behandeld en nooit als instructie: een afbeelding die de assistent opdraagt je notities te verwijderen, wordt aan je gemeld, niet opgevolgd.

Als je er uitdrukkelijk om vraagt, kan hij ook met je notities aan de slag:

- **schrijven**: een notitie maken, hernoemen of de inhoud herschrijven;
- **ordenen**: tags toevoegen of verwijderen, mappen weergeven, maken en hernoemen, notities tussen mappen verplaatsen, notities en mappen als favoriet markeren;
- **datums**: een herinnering voor een notitie instellen of verwijderen (eenmalig of herhalend); de assistent kent de huidige datum en tijd in jouw tijdzone, dus "herinner me volgende maandag om 9 uur" werkt;
- **taken**: de taken van een takenlijst en hun subtaken toevoegen, afvinken, weer openzetten, hernoemen of verwijderen, inclusief de vervaldatums en herinneringen van de taken, en een selectievakje in een gewone notitie aan- of uitvinken zonder de rest ervan te herschrijven;
- **verwijderen**: een notitie naar de prullenbak verplaatsen, of een map met de submappen en alle notities erin. Alles kan worden hersteld vanaf de pagina Prullenbak: de assistent kan niets definitief verwijderen en heeft geen tool om de prullenbak te legen.

De notitie die je open hebt, hoort bij de context: zeg "verbeter de opmaak van deze notitie" of "voeg hier een conclusie toe" en de assistent gaat ermee aan de slag, zonder id of titel. Een wijziging die je net hebt getypt of geplakt, wordt opgeslagen voordat je bericht wordt verstuurd, dus de assistent leest de notitie zoals jij die ziet, en "deze notitie" volgt je als je tijdens het gesprek een andere notitie opent. Noem je in je vraag een andere notitie, dan gaat die nog steeds voor. Op het dashboard is geen notitie open, dus noem daar de notitie die je bedoelt.

Twee regels boven het invoerveld tonen waarmee de assistent werkt: de **werkruimte** waarin elke tool draait, en de **notitie** waar "deze notitie" naar verwijst als er een open is.

Als de assistent een notitie bewerkt of maakt, worden de geopende notitie en de zijbalk vanzelf vernieuwd zodra het antwoord klaar is, zonder de pagina te herladen. Heb je niet-opgeslagen wijzigingen in de notitie die hij net heeft bewerkt, dan verschijnt er in plaats daarvan een balk: herlaad de notitie, of houd je eigen versie en sla die op.

De assistent leest en schrijft de inhoud van notities als Markdown. Rich-text-notities (HTML) worden in beide richtingen meteen omgezet, met dezelfde converter als de actie **Notitie omzetten**, zodat een herschrijving koppen, lijsten, links, tabellen en afbeeldingen behoudt; rijke opmaak zoals kleuren of lettertypen blijft niet behouden. Een lange notitie leest de assistent in meerdere delen. Om een paar plekken te wijzigen, vervangt hij alleen die, hoe lang de notitie ook is. Om een lange notitie helemaal te herschrijven, moet hij haar eerst volledig lezen, anders wordt de herschrijving geweigerd in plaats van afgekapt, en de nieuwe versie moet in één antwoord van het model passen.

Voordat de assistent de inhoud van een notitie wijzigt (herschrijving, selectievakje, taak), slaat Poznote een revisie van de huidige versie op, met het label "Voor AI-bewerking" op de pagina **Revisies** van de notitie (het geschiedenispictogram in de werkbalk van de notitie). Is het resultaat niet wat je wilde, herstel dan die revisie, of open eerst het tabblad Wijzigingen om te zien wat de assistent heeft veranderd. De revisie wordt overgeslagen als de laatste al dezelfde inhoud heeft, één antwoord dat dezelfde notitie meerdere keren aanpast, slaat er maar één op, en per notitie worden de 20 meest recente veiligheidsrevisies (Voor AI-bewerking en Voor MCP-bewerking) bewaard, een aantal dat je kunt wijzigen in **Instellingen → Revisies** (1 tot 200).

De assistent is **beperkt tot de huidige werkruimte**: hij ziet, doorzoekt en bewerkt alleen de notities van de werkruimte waarin je de chat hebt geopend, en nieuwe notities worden daar gemaakt. Wil je iets vragen over een andere werkruimte, schakel daar dan eerst naartoe. Op een dashboard dat meerdere werkruimtes toont, doorzoekt en leest de assistent de notities van alle werkruimtes tegelijk; zo stel je een vraag over meerdere werkruimtes. Daar is hij alleen-lezen: hij maakt, bewerkt, ordent of verwijdert niets, dus om een notitie te wijzigen die hij heeft gevonden, open je de notitie of haar werkruimte en vraag je het daar.

Gesprekken worden bewaard op de Poznote-server, in je eigen database naast je notities, en zijn alleen van jou: iemand die werkt in een werkruimte die je met hem hebt gedeeld, heeft zijn eigen gesprekken. In de kop van het paneel start de plusknop een nieuw gesprek en toont de geschiedenisknop de laatste tien van de werkruimte, om er een voort te zetten of te verwijderen; de prullenbakknop verwijdert het gesprek op het scherm. De geschiedenis volgt je van de ene browser of het ene apparaat naar het andere, en na herladen komt het gesprek terug dat het tabblad open had.

## De assistent inschakelen

Ga naar **Instellingen → Beheertools → AI-assistent** (alleen voor beheerders) en kies een provider:

| Provider | URL | API-sleutel |
|---|---|---|
| **Ollama** (lokaal) | Hangt af van waar Ollama draait (container of host), zie [Lokale servers en Docker-netwerken](#lokale-servers-en-docker-netwerken) | Niet nodig |
| **LM Studio** (lokaal) | Vooraf ingevuld met het adres van je Docker-host, poort `1234`, zie [Optie 2](#optie-2-ollama-op-de-host-geïnstalleerd) | Niet nodig |
| **Anthropic** (cloud) | Wordt automatisch ingesteld | Vereist |
| **OpenAI** (cloud) | Wordt automatisch ingesteld | Vereist |
| **Aangepast** | Elke OpenAI-compatibele basis-URL | Hangt af van de server |

Gebruik daarna **Toegang controleren en modellen tonen**: dat controleert of de server bereikbaar is en vult de keuzelijst **Model** met de modellen die hij aanbiedt. De keuzelijst blijft leeg tot die controle slaagt, dus met deze stap kun je een model kiezen.

De configuratie geldt voor de hele instantie, maar toegang wordt per profiel gegeven: op dezelfde pagina staat een lijst **Gebruikers die de door de beheerder geconfigureerde algemene AI-assistent mogen gebruiken**, en alleen de gebruikers die daar zijn aangevinkt, zien de chat. Een nieuwe gebruiker heeft geen toegang tot een beheerder hem toevoegt. Beheerders hebben altijd toegang, dus hun rij is aangevinkt en grijs.

### Persoonlijke API-sleutels

Op dezelfde pagina staat de optie **Persoonlijke API-sleutels toestaan**. Als die is ingeschakeld, krijgt elke gebruiker een kaart **Mijn AI-assistent** in zijn eigen instellingen, om de chat naar zijn eigen server, provider en API-sleutel te laten wijzen in plaats van die van de instantie.

## Een model kiezen

Kies een model dat **tool calling** ondersteunt (ook wel "function calling" genoemd), bijvoorbeeld `qwen3`, `llama3.1` of `mistral`. Met tool calling kan de assistent door je notities bladeren: met een model zonder deze functie werkt de chat nog steeds (een melding zegt dat), maar heeft hij niet zelf toegang tot je notities.

Wil je dat de assistent **naar de afbeeldingen in je notities kijkt**, dan moet het model ook afbeeldingen accepteren (een "vision"- of "multimodaal" model). De meeste gehoste modellen van OpenAI, Anthropic en Google lezen afbeeldingen; op Ollama heb je er een nodig dat dat aangeeft, zoals `qwen2.5vl` of `llava`. Geen enkele OpenAI-compatibele API vertelt Poznote vooraf of een model afbeeldingen accepteert, dus de assistent probeert het: met een model dat alleen tekst aankan, verschijnt er een melding in de chat en wordt het antwoord zonder de afbeelding gegeven.

### Denkinspanning

Redeneermodellen (OpenAI GPT-5 en de o-serie, `gpt-oss` op Ollama, ...) accepteren een **denkinspanning** die bepaalt hoe lang het model nadenkt voordat het antwoordt. Het veld **Denkinspanning** van de instellingenpagina regelt dit: **Auto** (de standaard) stuurt niets mee en laat de keuze aan de provider, terwijl **Geen**, **Minimaal**, **Laag**, **Gemiddeld**, **Hoog** en **Zeer hoog** als parameter `reasoning_effort` met elk verzoek worden meegestuurd. Waarden die een model niet accepteert, worden door de provider geweigerd en als fout in de chat gemeld.

Sommige OpenAI-modellen weigeren tool calling op de chat completions-API, tenzij de denkinspanning `none` is. De chat toont dan een melding dat de assistent niet door je notities kan bladeren: zet **Denkinspanning** op **Geen** om de tools terug te krijgen.

### Aangepaste headers

Een gateway vóór de modellen (LiteLLM, OpenRouter, Cloudflare AI Gateway, Helicone, ...) verwacht vaak eigen headers, om de aanroeper te identificeren of het gebruik toe te wijzen. Het veld **Aangepaste headers** van de instellingenpagina neemt ze op, één per regel, geschreven als `Name: value`:

```
x-litellm-customer-id: poznote
```

Ze worden met elk verzoek aan de AI-server meegestuurd, de verbindingscontrole inbegrepen. Het veld is er voor elke provider, in de configuratie van de instantie en in een persoonlijke. Bij Anthropic heeft een API-sleutel van een organisatie die niet aan een werkruimte is gekoppeld `anthropic-workspace-id: wrkspc_...` nodig. Bij OpenAI kiezen `OpenAI-Organization` en `OpenAI-Project` de organisatie of het project dat wordt gefactureerd.

Waarden worden versleuteld opgeslagen en daarna niet meer getoond: een opgeslagen header komt terug als `Name: ••••••••`. Laat een regel staan zoals hij is om de waarde te behouden, typ de waarde opnieuw om hem te wijzigen, verwijder de regel om de header te verwijderen.

Headers die het verzoek zelf vormgeven (`Host`, `Content-Type`, `Content-Length`, `Accept`, ...) worden geweigerd, net als `Authorization`, die het veld **API-sleutel** instelt. Bij Anthropic worden `x-api-key` en `anthropic-version` ook geweigerd, omdat Poznote die instelt. Namen en waarden zijn beperkt tot gewone ASCII-tekens, met hoogstens 20 headers.

Elk verzoek bevat ook `User-Agent: Poznote/<version>`, zodat de logs van een gateway laten zien waar het vandaan komt. Een regel `User-Agent` in de aangepaste headers vervangt deze.

## Aangepaste instructies

Elke gebruiker kan de assistent vaste instructies geven in **Instellingen → Mijn AI-assistent → Aangepaste instructies**, bijvoorbeeld "Als je een notitie in het Engels schrijft, voeg dan de Russische vertaling eronder toe, en andersom". De tekst (tot 4000 tekens) wordt bij elk bericht naar het model gestuurd, welke configuratie ook antwoordt, die van de instantie of je eigen. Gebruik het voor blijvende voorkeuren zoals toon, taal of de opmaak van de notities die de assistent schrijft. Het verandert niets aan wat de assistent mag doen: notities worden nog steeds alleen gewijzigd als je erom vraagt. Laat het veld leeg om niets mee te sturen.

## Opgeslagen prompts

Prompts die je vaak verstuurt, zoals "Controleer de grammatica en structuur van deze notitie en stel verbeteringen voor" of "Zijn er vervolgvragen die ik zou moeten stellen?", kun je opslaan in **Instellingen → Mijn AI-assistent → Opgeslagen prompts**: een naam en een tekst per prompt, tot 30 prompts. In de chat opent de bliksemknop naast het invoerveld ze, en een klik op een prompt verstuurt de tekst als jouw bericht, over de notitie die je open hebt als er "deze notitie" in staat. Wat je aan het typen was, blijft in het invoerveld staan. Anders dan de aangepaste instructies wordt een opgeslagen prompt alleen verstuurd als je hem kiest. **Opgeslagen prompts beheren**, onderaan de lijst, opent de instellingen. Om een prompt te verwijderen, klik je op het prullenbakje of maak je de tekst leeg, en sla je op.

## Externe tools (MCP-servers)

De assistent kan naast zijn eigen tools ook tools aanroepen die externe [MCP](https://modelcontextprotocol.io)-servers aanbieden, bijvoorbeeld een webzoekdienst, zodat hij actuele informatie kan opzoeken voordat hij antwoordt of een notitie schrijft. Dit is de andere richting van de [MCP-server van Poznote](MCP-SERVER.nl.md), waarmee andere assistenten bij je notities kunnen.

De functie staat standaard uit. Een beheerder zet hem aan in **Instellingen → Beheertools → AI-assistent**, sectie **Externe tools**, met **Externe tools toestaan**, en voegt daar servers toe: een naam, de URL van het MCP-endpoint (bijvoorbeeld `https://mcp.exa.ai/mcp`), een optionele API-sleutel die als Bearer-token wordt meegestuurd, en optionele aangepaste headers voor servers die hun sleutel op een andere manier ontvangen. Poznote maakt verbinding met de server, leest de tools die hij aanbiedt en toont ze elk met een selectievakje, zodat je kiest welke de assistent mag aanroepen. Deze servers worden aangeboden aan de gebruikers die de assistent van de instantie mogen gebruiken. Met **Gebruikers toestaan hun eigen servers te verbinden** krijgt elke gebruiker ook een sectie **Externe tools** in **Instellingen → Mijn AI-assistent**, voor servers die alleen in zijn eigen gesprekken worden gebruikt.

Alleen servers die via HTTP bereikbaar zijn (het Streamable HTTP-transport) met een API-sleutel of aangepaste headers worden ondersteund: servers die als lokaal proces worden gestart (stdio, `npx ...`) en servers die OAuth vereisen, niet. Net als de AI-server wordt een MCP-server aangeroepen vanaf de Poznote-server, dus de URL moet vanuit de container bereikbaar zijn. De tools worden gelezen als je een server toevoegt en als je op **Controleren en tools vernieuwen** klikt: een tool die de server later toevoegt of anders omschrijft, wordt pas gebruikt als je vernieuwt.

Zodra een server is verbonden, verschijnt er een wereldbolknop naast het invoerveld van de chat. Die zet de externe tools aan en uit, en je keuze wordt in je browser onthouden. Elke aanroep wordt in het gesprek getoond, met de server, de tool en wat ernaar is gestuurd.

Wat een externe tool teruggeeft, komt van buiten Poznote, een webpagina bijvoorbeeld, en kan tekst bevatten die bedoeld is om het model te misleiden. De assistent krijgt de opdracht dit als data te behandelen en er wordt een revisie opgeslagen voordat een notitie wordt gewijzigd, maar een instructie is geen garantie. Wil je ongewenste wijzigingen uitsluiten, open dan **Instellingen → Mijn AI-assistent**, sectie **Tools van de assistent**, en vink de tools in de lijst **Je notities wijzigen** uit: de assistent kan je notities dan nog lezen en op het web zoeken, maar niets meer wijzigen. Houd er ook rekening mee dat wat de assistent naar een externe tool stuurt, je instantie verlaat.

## Lokale servers en Docker-netwerken

De AI-server wordt aangeroepen **vanaf de Poznote-server**, nooit vanuit je browser. Omdat Poznote in een Docker-container draait, moet de URL die je instelt *vanuit die container* bereikbaar zijn.

Voor een lokale Ollama zijn er **twee mogelijke opstellingen**, die allebei volledig worden ondersteund:

| Opstelling | In te stellen URL | Netwerkconfiguratie |
|---|---|---|
| [**Optie 1**: Ollama als Docker-container](#optie-1-ollama-als-docker-container-het-eenvoudigst) | `http://ollama:11434` | Geen |
| [**Optie 2**: Ollama op de host geïnstalleerd](#optie-2-ollama-op-de-host-geïnstalleerd) | Het adres van je host, zoals de container het ziet | Vereist, dit is waar mensen vaak op vastlopen |

Kies optie 1 als je helemaal opnieuw begint. Kies optie 2 als Ollama al op je machine is geïnstalleerd of ook door andere toepassingen wordt gebruikt.

### Optie 1: Ollama als Docker-container (het eenvoudigst)

Veruit de makkelijkste opstelling laat de host helemaal buiten beschouwing: voeg Ollama toe als extra service in hetzelfde `docker-compose.yml` als Poznote:

```yaml
  ollama:
    image: ollama/ollama
    container_name: ollama
    restart: always
    volumes:
      - "./ollama:/root/.ollama"
```

start hem daarna en haal een model op:

```bash
docker compose up -d
docker exec ollama ollama pull qwen3
```

Vervang in de instellingen van de AI-assistent de vooraf ingevulde URL door `http://ollama:11434`. Services in hetzelfde compose-bestand delen een Docker-netwerk en bereiken elkaar via de servicenaam, dus er is verder niets in te stellen: geen poort om te publiceren, geen `OLLAMA_HOST` om in te stellen, en Ollama wordt nooit buiten het Docker-netwerk blootgesteld. Definieert je compose-bestand eigen `networks`, zet `ollama` dan op hetzelfde netwerk als de Poznote-service.

Voor GPU-versnelling in de container, zie de [documentatie van de Docker-image van Ollama](https://hub.docker.com/r/ollama/ollama).

### Optie 2: Ollama op de host geïnstalleerd

Draait Ollama rechtstreeks op de hostmachine (standaardinstallatie vanaf [ollama.com](https://ollama.com)), of gebruik je LM Studio, dan kan Poznote die ook bereiken, maar de container moet via Docker-netwerken de weg terug naar de host vinden. De subsecties hieronder leggen uit hoe.

#### Waarom `localhost` niet werkt

`http://localhost:11434` of `http://127.0.0.1:11434` werkt **niet**: in de container is `localhost` de container zelf, niet de machine waarop Ollama draait. Docker geeft elke container een eigen, geïsoleerde netwerkstack: dezelfde fysieke machine, twee verschillende "localhosts".

Om de host te bereiken, moet de container via de **gateway** van zijn Docker-netwerk gaan, een IP-adres dat bij de host hoort.

#### De juiste URL vinden

Poznote vult het URL-veld vooraf in met zijn beste gok voor het adres van je Docker-host, in deze volgorde:

1. `host.docker.internal` als dat in de container kan worden opgelost (altijd op Docker Desktop voor Windows/macOS; op Linux alleen als je het koppelt, zie hieronder);
2. anders het IP-adres van de standaardgateway van de container (bijvoorbeeld `http://172.17.0.1:11434`), gelezen uit de routeringstabel.

De vooraf ingevulde URL werkt meestal gewoon. Wil je het zelf controleren, doe dan vanaf de host:

```bash
docker exec <poznote-webserver-container> ip route | grep default
# default via 172.17.0.1 dev eth0   ← het gateway-IP is je host, zoals de container die ziet
```

Op Linux kun je `host.docker.internal` beschikbaar maken (zoals op Docker Desktop) door dit toe te voegen aan de service `webserver` van je `docker-compose.yml`:

```yaml
extra_hosts:
  - "host.docker.internal:host-gateway"
```

en daarna `docker compose up -d` uit te voeren. De URL wordt dan `http://host.docker.internal:11434`, stabiel en op elke machine hetzelfde.

#### Ollama laten luisteren naar de container

Standaard luistert Ollama alleen op `127.0.0.1`, de loopback van de host, die vanuit geen enkele container bereikbaar is, zelfs niet met het juiste gateway-IP. Je moet `OLLAMA_HOST` instellen zodat Ollama luistert op een interface die de container kan bereiken.

Met de standaardinstallatie op Linux (systemd):

```bash
sudo systemctl edit ollama
```

voeg toe:

```ini
[Service]
Environment="OLLAMA_HOST=172.17.0.1:11434"
```

en daarna:

```bash
sudo systemctl restart ollama
```

Aan welk adres je hem koppelt:

- **`172.17.0.1` (de `docker0`-bridge, aanbevolen op Linux)**: bereikbaar vanuit alle containers, bestaat op elke Docker-installatie en wordt niet naar buiten blootgesteld. Controleer het IP-adres van je `docker0` met `ip addr show docker0` (het is `172.17.0.1`, tenzij je de adrespools van Docker hebt aangepast).
- **`0.0.0.0`** (alle interfaces): het eenvoudigst, maar het stelt Ollama bloot op **elke** interface van de machine. Ollama heeft geen authenticatie, dus als je machine een openbaar IP-adres heeft, gebruik dit dan alleen achter een firewall die de poort blokkeert (bijvoorbeeld `ufw deny 11434`). Prima op een thuismachine achter NAT.
- Een specifieke gateway van een Compose-netwerk (bijvoorbeeld `192.168.48.1`): werkt, maar deze subnetten worden door Docker automatisch toegewezen bij het aanmaken van het netwerk en kunnen veranderen als het netwerk opnieuw wordt aangemaakt, dus vermijd dit.

Op Docker Desktop (Windows/macOS) met Ollama op de host is `OLLAMA_HOST=0.0.0.0` de gebruikelijke keuze; de machine is meestal niet rechtstreeks blootgesteld, en `host.docker.internal` bereikt hem dan meteen.

**LM Studio** werkt op dezelfde manier: schakel in de serverinstellingen "Serve on Local Network" in (gelijk aan koppelen aan `0.0.0.0`), anders luistert hij alleen op `127.0.0.1`.

#### De verbinding controleren

Controleer vanaf de host waar Ollama echt op luistert:

```bash
ss -tlnp | grep 11434
```

en test vanuit de container de exacte URL die Poznote gaat gebruiken:

```bash
docker exec <poznote-webserver-container> curl -s -m 3 http://172.17.0.1:11434/
# "Ollama is running"
```

Geeft dit niets terug, dan ligt het probleem bij de koppeling van Ollama of bij een firewall, niet bij Poznote. De knop **Toegang controleren en modellen tonen** op de instellingenpagina voert dezelfde controle uit en vult bij succes de keuzelijst met modellen.

## Verbindingsfouten

Een verzoek dat mislukt voordat de AI-server iets heeft geantwoord (een DNS-time-out, een geweigerde verbinding, een TLS-handshake die nooit voltooid wordt), wordt automatisch opnieuw verstuurd, tot drie pogingen achter elkaar met een korte pauze ertussen. De chat toont intussen een regel *opnieuw proberen*, en er gaat niets verloren, omdat de server nog niet was begonnen met antwoorden. Mislukt ook de laatste poging, dan verschijnt de fout in de chat met een knop **Opnieuw proberen** die hetzelfde bericht opnieuw verstuurt zonder dat je het opnieuw hoeft te typen.

Een fout die optreedt nadat het antwoord al is begonnen met streamen, wordt niet opnieuw geprobeerd, omdat een deel van het antwoord al op het scherm staat: gebruik de knop **Opnieuw proberen**.

## Privacy

De AI-server wordt aangeroepen vanaf de Poznote-server, nooit vanuit je browser. Met een lokale Ollama- of LM Studio-instantie verlaten je notities en gesprekken nooit je machine. Met een cloudprovider worden de delen van je notities die de assistent leest om te antwoorden naar die provider gestuurd, een afbeelding waarnaar hij moet kijken inbegrepen. Met externe tools ingeschakeld gaat wat de assistent naar die tools stuurt, een zoekopdracht bijvoorbeeld, naar de servers die je hebt verbonden.
