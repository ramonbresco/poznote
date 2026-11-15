<!-- lang-selector -->
<p align="center">
  <a href="TRANSCRIPTION.md">English</a> ·
  <a href="TRANSCRIPTION.fr.md">Français</a> ·
  <a href="TRANSCRIPTION.de.md">Deutsch</a> ·
  <a href="TRANSCRIPTION.es.md">Español</a> ·
  <a href="TRANSCRIPTION.pt.md">Português</a> ·
  <a href="TRANSCRIPTION.ru.md">Русский</a> ·
  <a href="TRANSCRIPTION.zh-cn.md">简体中文</a> ·
  <a href="TRANSCRIPTION.ko.md">한국어</a> ·
  <a href="TRANSCRIPTION.ja.md">日本語</a> ·
  <a href="TRANSCRIPTION.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="TRANSCRIPTION.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# Transcriptie in Poznote (spraak naar tekst)

Dicteer in een notitie, of zet een audiobijlage om in tekst, met een spraak-naar-tekstserver die je zelf draait.

Poznote bevat zelf geen spraakmodel. Het stuurt de audio naar een server die de audio-API van OpenAI aanbiedt, `POST /v1/audio/transcriptions`, zoals een zelf gehoste Whisper. Draai die server naast Poznote en de audio verlaat je machine nooit.

> [!TIP]
> Dit staat los van de [AI-assistent](AI-ASSISTANT.nl.md). De twee worden apart geconfigureerd en kunnen verschillende servers gebruiken, of je schakelt de ene in zonder de andere.

- [Snel aan de slag](#snel-aan-de-slag)
- [Wat het doet](#wat-het-doet)
- [Instellingen](#instellingen)
- [Een transcriptieserver draaien](#een-transcriptieserver-draaien)
- [De server bereiken vanuit Poznote](#de-server-bereiken-vanuit-poznote)
- [Grenzen](#grenzen)
- [Browservereisten](#browservereisten)
- [Persoonlijke servers](#persoonlijke-servers)
- [Privacy en wat er wordt opgeslagen](#privacy-en-wat-er-wordt-opgeslagen)
- [Problemen oplossen](#problemen-oplossen)
- [Verwijderen](#verwijderen)

## Snel aan de slag

De kortste weg, met [Speaches](https://github.com/speaches-ai/speaches) in hetzelfde Docker Compose-project als Poznote. Elke opdracht hieronder is precies zo uitgevoerd als ze er staat.

**1. Voeg de server toe aan je `docker-compose.yml`**, als nieuwe service naast `webserver`, en declareer het volume onderaan het bestand:

```yaml
services:
  # ... webserver and mcp-server stay as they are ...

  speaches:
    image: ghcr.io/speaches-ai/speaches:latest-cpu
    restart: always
    volumes:
      - "speaches-cache:/home/ubuntu/.cache/huggingface"

volumes:
  speaches-cache:
```

Er staat bewust geen `ports:`-sectie in: Poznote bereikt de server via het interne netwerk van het project, en niets wordt naar buiten opengezet. Zie [waarom dat belangrijk is](#de-server-bereiken-vanuit-poznote).

**2. Start hem:**

```bash
docker compose up -d speaches
```

De image is ongeveer 2 GB.

**3. Download een model.** Speaches start zonder enig model en haalt er zelf geen op: een transcriptie met een model dat niet is gedownload mislukt met `Model '...' is not installed locally`. Download er een via de Poznote-container, die op hetzelfde netwerk zit:

```bash
docker compose exec webserver curl -X POST http://speaches:8000/v1/models/Systran/faster-whisper-small
```

Na een paar seconden antwoordt hij `Model 'Systran/faster-whisper-small' downloaded` (ongeveer 480 MB). Het model blijft bij een herstart in het volume `speaches-cache` staan.

**4. Configureer Poznote.** Ga naar **Instellingen → Beheertools → Transcriptie** en:

- zet **Transcriptie inschakelen** aan;
- kies **Speaches (local)** en stel de URL in op `http://speaches:8000`;
- klik op **Toegang controleren en modellen tonen** en kies daarna `Systran/faster-whisper-small` bij **Model**;
- vink de gebruikers aan die het mogen gebruiken (als beheerder mag je dat altijd);
- sla op.

**5. Probeer het.** Laad een notitie opnieuw via HTTPS (of via `localhost`, zie [browservereisten](#browservereisten)), typ `/dict`, sta de microfoon toe, spreek en stop.

## Wat het doet

Eenmaal geconfigureerd verschijnt transcriptie op twee plekken.

### Dicteren

Dicteren gaat via **Audio opnemen**, onder **Invoegen** en **Media** in het slash-menu van elke notitie, zowel rich text als Markdown, en in de bewerkingsbalk boven het toetsenbord op een telefoon. Typ `/dict`, `/voice` of `/transcribe` en je vindt het meteen, want het filter doorzoekt ook submenu's.

Er opent een venster, en de opname begint als je op **Starten** drukt. Dat is ook het moment waarop de browser de eerste keer om de microfoon vraagt. Een niveaubalk laat zien dat de microfoon echt iets oppikt, en de timer toont de verstreken tijd ten opzichte van de maximale duur die de beheerder heeft ingesteld, bijvoorbeeld `1:12 / 10:00`.

Als transcriptie beschikbaar is, staat er onder de timer een menu **Gesproken taal**. Het begint op de taal uit de configuratie, gemarkeerd als standaard, en een wijziging geldt alleen voor deze opname. Met **Automatisch detecteren** bepaalt de server zelf de taal, ook als de configuratie er een instelt.

Wat er met de opname gebeurt, kies je als je stopt. **De audio invoegen** zet hem als audiospeler in de notitie, zonder transcriptie. **Transcriberen** stuurt hem naar de server, en verschijnt alleen als transcriptie voor jou beschikbaar is. Bereikt de opname de maximale duur, dan stopt hij vanzelf en wacht op een van de twee knoppen.

De transcriptie komt terug in een tekstvak waarin je hem kunt corrigeren voordat hij in de notitie belandt. **Invoegen** zet hem op de plek van je cursor. Mislukt de transcriptie, dan komen beide knoppen terug, zodat de opname alsnog als audio kan worden ingevoegd of opnieuw kan worden verstuurd.

Het vakje **De opname ook aan deze notitie toevoegen** staat standaard uit, en dan wordt de audio weggegooid zodra de tekst terugkomt. Vink het aan en de opname wordt ook opgeslagen als gewone bijlage met de naam `dictation-<date>.<ext>`, zodat je hem later opnieuw kunt beluisteren of met een beter model kunt transcriberen.

**Annuleren**, Esc of een klik buiten het venster zet de microfoon uit en gooit de opname weg, ook halverwege.

### Een audiobijlage transcriberen

Op de pagina **Bijlagen** van een notitie krijgt elk audiobestand een grijze microfoonknop, tussen downloaden en verwijderen. Die is bedoeld voor een spraakmemo die je op je telefoon hebt opgenomen en naar Poznote hebt geüpload.

Hij brengt je terug naar de notitie en opent hetzelfde venster: het bestand wordt vanuit de opslag getranscribeerd, zonder opnieuw te worden geüpload, en de tekst wordt je ter controle voorgelegd. **Invoegen** zet hem direct na de bijlage als de notitie ernaar verwijst, en anders aan het einde van de notitie.

Een bestand telt als audio als de naam eindigt op `mp3`, `wav`, `ogg`, `oga`, `opus`, `m4a`, `flac` of `aac`, of als het geregistreerde type `audio/...` is. De extensie gaat bewust boven het type: Windows uploadt een `.m4a` van Voicerecorder als `video/mp4`. Videobestanden (`mp4`, `webm`) worden niet aangeboden, ook al bevatten ze geluid.

Is de notitie ergens anders geopend en wordt ze daar bewerkt, dan wordt de tekst niet ingevoegd: hij blijft in het vak staan zodat je hem kunt kopiëren.

## Instellingen

Alles staat onder **Instellingen → Beheertools → Transcriptie** (alleen voor beheerders).

| Instelling | Wat het doet |
|---|---|
| **Transcriptie inschakelen** | Hoofdschakelaar voor de configuratie van de instantie hieronder. |
| **Toegestane gebruikers** | Profielen die de server van de instantie mogen gebruiken. Niemand heeft toegang tot hij is aangevinkt, ook nieuwe profielen niet. Beheerders hebben altijd toegang, dus hun rij is aangevinkt en grijs. |
| **Transcriptieserver** | Voorinstellingen die de URL invullen en de API-sleutel tonen of verbergen: Speaches, whisper.cpp, LocalAI, OpenAI of Andere. |
| **Server-URL** | Basis-URL van de server, bijvoorbeeld `http://speaches:8000`. `/v1` en het volledige pad `/v1/audio/transcriptions` worden ook geaccepteerd. |
| **API-sleutel** | Wordt verstuurd als `Authorization: Bearer`. Lokale servers hebben er meestal geen nodig, OpenAI wel. |
| **Toegang controleren en modellen tonen** | Bevestigt dat de server antwoordt en vult de modelsuggesties. |
| **Model** | De modelnaam die bij elk verzoek wordt meegestuurd. Verplicht voor elke server, ook voor de servers die hem negeren. |
| **Gesproken taal** | Code van twee letters zoals `en`, `fr` of `de`, of leeg om de server de taal te laten detecteren. Het opnamevenster selecteert deze taal vooraf, en het menu daar kan haar voor één opname overschrijven. |
| **Maximale opnameduur** | In minuten, van 1 tot 60, standaard 10. **Audio opnemen** stopt vanzelf als die grens is bereikt, en wacht dan op **De audio invoegen** of **Transcriberen**. Zonder transcriptie wordt de audio meteen ingevoegd. Bijlagen vallen hier niet onder. |
| **Persoonlijke transcriptieservers toestaan** | Laat elke gebruiker een eigen server instellen, zie [Persoonlijke servers](#persoonlijke-servers). |

### Een model kiezen

Het modelveld is vrije tekst met suggesties in plaats van een keuzelijst, omdat niet elke server zijn modellen opsomt (whisper.cpp doet dat niet). Bij Speaches toont de controle alleen spraakherkenningsmodellen, en laat het eventuele tekst-naar-spraakstemmen die je hebt gedownload weg.

Grotere modellen zijn nauwkeuriger en trager. Op een CPU is `small` het gebruikelijke compromis. Het verschil is niet subtiel: op dezelfde Franse zin gaf `Systran/faster-whisper-tiny` "ceci est en test de dicter vocale d'opposnade" terug, waar `Systran/faster-whisper-small` "ceci est un test de dictée vocale" teruggaf. Grotere modellen zoals `large-v3` kunnen nog beter overweg met accenten en ruis, maar hebben een GPU nodig om prettig te blijven werken.

Ter vergelijking, op een CPU met 4 kernen en `small`: een korte zin duurt ongeveer 6 seconden, en het eerste verzoek na het starten van de server ongeveer 20, terwijl het model in het geheugen wordt geladen. Speaches gebruikt ongeveer 1,5 GB RAM met `small` geladen.

### Gesproken taal

Laat **Gesproken taal** leeg en de server detecteert de taal, waar Whisper goed in is. Stel een code in als je altijd in dezelfde taal dicteert en korte zinnen voor een andere taal worden aangezien.

## Een transcriptieserver draaien

Poznote heeft een server nodig die `POST /v1/audio/transcriptions` accepteert als multipart-formulierdata met de velden `file`, `model`, `response_format=json` en eventueel `language`, en antwoordt met `{"text": "..."}`.

### Speaches (aanbevolen)

De meest complete optie: het toont zijn modellen, kan er meerdere bewaren, en leest WebM (wat Chrome en Firefox opnemen), M4A en WAV zonder extra configuratie. [Snel aan de slag](#snel-aan-de-slag) zet het op met Docker Compose.

Modellen beheren, vanuit de Poznote-container:

```bash
# Browse what can be downloaded
docker compose exec webserver curl "http://speaches:8000/v1/registry?task=automatic-speech-recognition"

# Download, list, delete
docker compose exec webserver curl -X POST http://speaches:8000/v1/models/Systran/faster-whisper-small
docker compose exec webserver curl http://speaches:8000/v1/models
docker compose exec webserver curl -X DELETE http://speaches:8000/v1/models/Systran/faster-whisper-small
```

Downloaden vereist internettoegang vanuit de Speaches-container. Transcriberen niet.

Met een NVIDIA-GPU gebruik je de CUDA-image in plaats van `latest-cpu` en geef je de service toegang tot de GPU; zie de [documentatie van Speaches](https://speaches.ai).

### whisper.cpp

Lichter dan Speaches, met één model per server en geen modellijst. Het werkt goed met Poznote, maar alleen met de juiste opties: standaard spreekt het de OpenAI-route niet, verstaat het alleen Engels en accepteert het alleen WAV.

**1. Voeg de service toe** aan `docker-compose.yml`:

```yaml
services:
  whisper:
    image: ghcr.io/ggml-org/whisper.cpp:main
    restart: always
    volumes:
      - "whisper-models:/models"
    command: ["/app/build/bin/whisper-server -m /models/ggml-small.bin -l auto --convert --host 0.0.0.0 --port 8080 --inference-path /v1/audio/transcriptions"]

volumes:
  whisper-models:
```

> [!WARNING]
> Houd `command` een lijst met één element, precies zoals hierboven. De image voert zijn opdracht uit via `bash -c`, en de gewone tekstvorm wordt in losse argumenten opgesplitst, waardoor `bash` `whisper-server` zonder enige optie start. Hij start dan stilletjes met zijn standaardwaarden: alleen Engels, alleen WAV, luisterend op `127.0.0.1` binnen zijn container, op `/inference`. Niets in de logs wijst erop dat er iets misging.

**2. Download een meertalig model** in het volume, voordat je de service start: de server weigert te starten zonder zijn modelbestand, en de image bevat alleen `ggml-base.en.bin`, dat Engels verstaat en verder niets.

```bash
docker compose run --rm --entrypoint bash whisper -c "cd /app && ./models/download-ggml-model.sh small /models"
```

**3. Start hem:**

```bash
docker compose up -d whisper
```

Waar elke optie voor dient:

| Optie | Standaard | Waarom Poznote hem nodig heeft |
|---|---|---|
| `-m /models/ggml-small.bin` | `models/ggml-base.en.bin` | Het meegeleverde model kent alleen Engels. |
| `-l auto` | `en` | Zonder deze optie komt spraak in elke andere taal verminkt als Engels terug. |
| `--convert` | uit | Browsers nemen WebM op, telefoons maken M4A; zonder deze optie wordt alleen WAV geaccepteerd. Gebruikt de ffmpeg die in de image zit. |
| `--host 0.0.0.0` | `127.0.0.1` | Anders kan niets buiten de container hem bereiken. |
| `--inference-path /v1/audio/transcriptions` | `/inference` | De route die Poznote aanroept. |

**4. Kies in Poznote** **whisper.cpp (local)**, stel de URL in op `http://whisper:8080` en typ een willekeurige modelnaam: whisper.cpp negeert hem en gebruikt het bestand waarmee het is gestart, maar het veld is verplicht. **Toegang controleren en modellen tonen** meldt dan dat de server geen model opsomt, en dat is precies het antwoord dat je van een werkende whisper.cpp verwacht.

### OpenAI

Kies **OpenAI**: de URL wordt voor je ingevuld en een API-sleutel is verplicht. Gebruik een van de transcriptiemodellen van OpenAI, bijvoorbeeld `whisper-1`. De audio wordt naar OpenAI gestuurd.

### LocalAI en andere servers

LocalAI en andere OpenAI-compatibele servers werken via de voorinstellingen **LocalAI** of **Andere**, zolang ze voldoen aan het verzoekformaat bovenaan deze sectie. Hun installatie wordt hier niet doorlopen; zie hun eigen documentatie, bijvoorbeeld [die van LocalAI](https://localai.io).

## De server bereiken vanuit Poznote

Poznote roept de transcriptieserver aan vanuit zijn eigen container, nooit vanuit je browser. De URL moet dus bereikbaar zijn vanuit de Poznote-container, en `localhost` betekent daar de Poznote-container zelf.

**Aanbevolen: hetzelfde Docker-netwerk, geen gepubliceerde poort.** Services van één Compose-project delen een netwerk en bereiken elkaar via de servicenaam. Zo bereikt de service `mcp-server` uit de standaard `docker-compose.yml` `http://webserver:80`, en zo bereikt Poznote hierboven `http://speaches:8000` of `http://whisper:8080`.

> [!CAUTION]
> Voeg geen `ports: - "8000:8000"` toe aan de transcriptieserver op een machine met een publiek IP-adres. Speaches en whisper.cpp hebben standaard geen authenticatie, dus daarmee zet je een gratis transcriptiedienst open voor het hele internet. Hem aan `127.0.0.1:8000:8000` binden is veilig, maar dan kan de Poznote-container hem niet bereiken; het gedeelde netwerk heeft geen van beide nodig.

Draait de server als losse `docker run`-container, koppel hem dan aan het netwerk van Poznote in plaats van een poort te publiceren. Zoek de netwerknaam op met:

```bash
docker inspect <poznote-webserver-container> --format '{{range $k, $v := .NetworkSettings.Networks}}{{$k}} {{end}}'
```

start de server daarna met `--network <that-network>` en gebruik zijn containernaam in de URL.

Voor een server op een andere machine, of op de Docker-host buiten Docker, gebruik je een adres dat de Poznote-container kan bereiken. Dezelfde regels als voor de AI-assistent gelden, zie [Lokale servers en Docker-netwerken](AI-ASSISTANT.nl.md#lokale-servers-en-docker-netwerken).

Om te controleren dat de server antwoordt vanaf de plek waar Poznote staat:

```bash
docker compose exec webserver curl http://speaches:8000/v1/models   # Speaches
docker compose exec webserver curl -s -o /dev/null -w '%{http_code}\n' http://whisper:8080/   # whisper.cpp, expect 200
```

## Grenzen

- **Opnameduur:** de instelling **Maximale opnameduur**, standaard 10 minuten. Die wordt in de browser afgedwongen.
- **Uploadgrootte:** 100 MB per opname of bijlage die voor transcriptie wordt verstuurd.
- **Transcriptietijd:** Poznote wacht tot 570 seconden op de server, net onder de 600 seconden die zijn eigen nginx een verzoek toestaat, zodat een trage transcriptie eindigt met een leesbare melding in plaats van een kale foutpagina.
- **Time-out van de reverse proxy:** een proxy voor Poznote kan het verzoek veel eerder afbreken. nginx staat standaard op 60 seconden, Nginx Proxy Manager op 90. Een transcriptie die langer duurt, mislukt dan met `HTTP 504`, hoewel ze zou zijn afgerond. Verhoog de leestime-out van de proxy voor je Poznote-host (voor nginx en het tabblad **Advanced** van Nginx Proxy Manager: `proxy_read_timeout 600s;`), of houd opnamen kort genoeg om binnen die tijd te worden getranscribeerd.

## Browservereisten

**HTTPS.** Browsers geven een pagina alleen toegang tot de microfoon op een veilige origin: HTTPS, of `localhost`. Via gewone `http` op elk ander adres meldt **Audio opnemen** dat HTTPS nodig is en neemt het niets op. Het transcriberen van een bijlage werkt wel gewoon, want er wordt niets opgenomen.

**De header `Permissions-Policy`.** Poznote stuurt `microphone=(self)`, wat de eigen origin toestaat en elke andere weigert. Voegt een reverse proxy ervoor zijn eigen `Permissions-Policy`-header toe, dan kan die die van Poznote overschrijven, en met `microphone=()` daar weigert de browser de microfoon, wat de sitetoestemming ook zegt. Het venster toont dan "Poznote mocht de microfoon niet gebruiken". Verwijder de header bij de proxy, of stel daar ook `microphone=(self)` in.

## Persoonlijke servers

De beheerder kan **Persoonlijke transcriptieservers toestaan** aanvinken. Elke gebruiker krijgt dan een kaart **Mijn transcriptieserver** in de eigen instellingen, met dezelfde velden voor server, URL, sleutel, model en taal. Schakelt een gebruiker die in, dan gaat zijn audio naar zijn eigen server in plaats van naar die van de instantie, of hij nu in de lijst met toegestane gebruikers staat of niet.

De maximale opnameduur blijft de instelling van de beheerder.

Persoonlijke API-sleutels worden versleuteld opgeslagen met het geheim van de instantie, net als de sleutels van de AI-assistent en Git Sync.

## Privacy en wat er wordt opgeslagen

De opname wordt naar Poznote geüpload en vandaar doorgestuurd naar de transcriptieserver. Dat is bewust: de transcriptieserver staat meestal op een netwerk dat de browser niet kan bereiken, en zijn API-sleutel hoort niet in een pagina terecht te komen.

Poznote bewaart geen kopie. De audio staat alleen voor de duur van één verzoek in het tijdelijke uploadbestand van PHP, tenzij je **De opname ook aan deze notitie toevoegen** aanvinkt, waarmee hij als gewone bijlage wordt opgeslagen die meetelt voor je opslag.

Met Speaches of whisper.cpp ingericht zoals hierboven beschreven, wordt alles op je eigen machine verwerkt en gaat er niets online:

- De browser neemt op met MediaRecorder, niet met de ingebouwde spraakherkenning van de browser, die de audio naar Google of Apple zou sturen.
- De opname gaat alleen naar je Poznote-server, en Poznote stuurt hem alleen door naar de URL die op de pagina Transcriptie is ingesteld. Er wordt geen enkele andere host benaderd.
- De enige internettoegang is het downloaden van het model, één keer, bij de installatie. Transcriberen werkt ook als de container van het internet is afgesloten.
- De getranscribeerde tekst komt in je notitie terecht zoals tekst die je zelf hebt getypt, en nergens anders.

> [!WARNING]
> De voorinstelling **OpenAI** is de uitzondering: elke opname wordt naar de servers van OpenAI gestuurd. Het is de enige voorinstelling die dat doet, en de enige waarvan de URL vastligt en verborgen is. Toont de pagina Transcriptie een URL-veld, dan blijft de audio bij de server op die URL.

## Problemen oplossen

**"Poznote mocht de microfoon niet gebruiken", maar de browser zegt dat het mag**
Iets weigert de microfoon voordat de toestemming wordt geraadpleegd. Controleer de header die de browser bereikt:

```bash
curl -sI https://your-poznote/login.php | grep -i permissions-policy
```

Er moet `microphone=(self)` staan. Zie [Browservereisten](#browservereisten).

**"De microfoon vereist HTTPS"**
Je zit op gewone `http` op een ander adres dan `localhost`. Bied Poznote aan via HTTPS.

**Geen knop Transcriberen bij het opnemen**
Transcriptie staat uit, je profiel staat niet in de lijst met toegestane gebruikers, of de configuratie heeft geen URL of geen model. **Audio opnemen** zelf is er altijd, onder **Invoegen** en **Media**; `/dict` vindt het.

**Geen microfoonknop bij een bijlage**
Het bestand wordt niet als audio herkend (zie de lijst in [Een audiobijlage transcriberen](#een-audiobijlage-transcriberen)), of transcriptie is niet beschikbaar voor je profiel.

**"Failed to connect to ..."**
De URL klopt niet, de server draait niet, of hij zit niet op een netwerk dat Poznote kan bereiken. Zie [De server bereiken vanuit Poznote](#de-server-bereiken-vanuit-poznote).

**"HTTP 404: Model '...' is not installed locally"**
Speaches heeft dat model niet gedownload. Download het, zie stap 3 van [Snel aan de slag](#snel-aan-de-slag).

**"HTTP 404" bij de toegangscontrole, met whisper.cpp**
Kies de voorinstelling **whisper.cpp** in plaats van **Andere**: whisper.cpp heeft geen modellijst, en alleen zijn eigen voorinstelling leest die 404 als een werkende server. Geven de transcripties zelf 404 terug, dan draait de server zonder `--inference-path /v1/audio/transcriptions`, wat meestal betekent dat `command` als tekst is geschreven, zie de waarschuwing onder [whisper.cpp](#whispercpp).

**Frans (of andere niet-Engelse) spraak komt terug als Engels, of als onzin**
whisper.cpp draait zonder `-l auto`, of met het meegeleverde model `ggml-base.en.bin`. Gebruik een meertalig model en `-l auto`.

**Opnamen mislukken maar WAV-bestanden werken, met whisper.cpp**
`--convert` ontbreekt.

**"HTTP 504" bij langere opnamen**
Een reverse proxy heeft het verzoek afgebroken voordat de transcriptie klaar was. Zie de time-out van de reverse proxy onder [Grenzen](#grenzen).

**"De transcriptieserver antwoordde niet binnen 570 seconden"**
De opname is te lang voor dit model op deze hardware. Neem minder tegelijk op, verlaag de **Maximale opnameduur**, of gebruik een kleiner model of een GPU.

**"De server hoorde niets in deze opname"**
Whisper gaf lege tekst terug, zijn eerlijke antwoord op stilte. Let tijdens het opnemen op de niveaubalk: beweegt die nooit, dan gebruikt de browser het verkeerde invoerapparaat.

**"Deze notitie kan hier nu niet worden bewerkt"**
De notitie wordt ergens anders bewerkt, dus de tekst is niet ingevoegd. Kopieer hem uit het vak, of sluit de andere editor en probeer het opnieuw.

**De eerste transcriptie is traag, de volgende zijn snel**
De server laadt het model bij het eerste gebruik in het geheugen, ongeveer 20 seconden voor `small` op een CPU.

## Verwijderen

Zet **Transcriptie inschakelen** uit in de instellingen, verwijder daarna de service uit `docker-compose.yml` en:

```bash
docker compose rm -sf speaches                 # or: whisper
docker volume rm <project>_speaches-cache      # or: <project>_whisper-models
```

`docker volume ls` toont de exacte naam van het volume, voorafgegaan door de naam van je project.
