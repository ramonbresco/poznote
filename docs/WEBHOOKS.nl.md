<!-- lang-selector -->
<p align="center">
  <a href="WEBHOOKS.md">English</a> ·
  <a href="WEBHOOKS.fr.md">Français</a> ·
  <a href="WEBHOOKS.de.md">Deutsch</a> ·
  <a href="WEBHOOKS.es.md">Español</a> ·
  <a href="WEBHOOKS.pt.md">Português</a> ·
  <a href="WEBHOOKS.ru.md">Русский</a> ·
  <a href="WEBHOOKS.zh-cn.md">简体中文</a> ·
  <a href="WEBHOOKS.ko.md">한국어</a> ·
  <a href="WEBHOOKS.ja.md">日本語</a> ·
  <a href="WEBHOOKS.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="WEBHOOKS.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# Webhooks

Poznote kan externe diensten op de hoogte brengen wanneer er iets op de instantie gebeurt, door **uitgaande webhooks** te versturen: HTTP POST-verzoeken met een JSON-payload, afgeleverd bij de endpoints die je registreert. Zo koppel je Poznote eenvoudig aan automatiseringstools zoals n8n, Zapier of je eigen scripts.

Poznote **verstuurt** alleen webhooks. Wat het ontvangende endpoint ermee doet (een e-mail sturen, een workflow starten, de gebeurtenis loggen, ...) is helemaal aan de ontvanger en speelt zich buiten Poznote af.

## Inhoudsopgave

- [Overzicht](#overzicht)
- [Webhooks beheren](#webhooks-beheren)
- [Levering](#levering)
  - [Verzoekformaat](#verzoekformaat)
  - [Payload-envelop](#payload-envelop)
  - [De handtekening controleren](#de-handtekening-controleren)
  - [Leveringsgaranties](#leveringsgaranties)
- [Directe links naar notities (Instantie-URL)](#directe-links-naar-notities-instantie-url)
- [Gemeenschappelijke payload-objecten](#gemeenschappelijke-payload-objecten)
  - [Het object data.user](#het-object-datauser)
  - [Het object data.note](#het-object-datanote)
- [Overzicht van gebeurtenissen](#overzicht-van-gebeurtenissen)
  - [Instantiegebeurtenissen](#instantiegebeurtenissen)
  - [Gebruikersgebeurtenissen](#gebruikersgebeurtenissen)
  - [Testping](#testping)
- [Privacy en beveiliging](#privacy-en-beveiliging)
- [Voorbeeld van een ontvanger](#voorbeeld-van-een-ontvanger)

## Overzicht

Er zijn twee onafhankelijke niveaus van webhooks:

| Niveau | Beheerd via | Wie | Gebeurtenissen |
|---|---|---|---|
| **Beheerderswebhooks** | **Instellingen > Beheertools > Beheerderswebhooks** | Alleen beheerders | Instantiegebeurtenissen: `user.created`, `user.updated`, `user.activated`, `user.deactivated`, `user.deleted`, `settings.language_changed`, `signup.cap_reached`, `quota.notes_reached`, `quota.storage_reached`, `backup.completed`, `backup.failed` |
| **Gebruikerswebhooks** | **Instellingen > Gebruikerswebhooks** | Elk account (tenzij geblokkeerd door de isolatie van accounts) | Gebeurtenissen over de eigen inhoud van het account: `note.created`, `note.shared`, `reminder.due`, `reminder.due_title`, `reminder.due_minimal` |

De isolatieregel is strikt: een gebruikersgebeurtenis wordt alleen afgeleverd bij de endpoints die geregistreerd zijn door het account dat de gebeurtenis heeft veroorzaakt. De notities en herinneringen van de ene gebruiker bereiken nooit de endpoints van een andere gebruiker. Instantiegebeurtenissen gaan naar elke geabonneerde beheerderswebhook.

## Webhooks beheren

Op de webhookpagina (voor beheerders of gebruikers) bestaat elke webhook uit:

- **Endpoint-URL**: moet beginnen met `http://` of `https://`.
- **Beschrijving** (optioneel): een korte notitie over waar het endpoint voor dient, bijvoorbeeld "n8n-workflow die nieuwe notities in Notion opslaat". Deze wordt in de lijst getoond om verschillende endpoints uit elkaar te houden en wordt nooit naar het endpoint gestuurd.
- **Geheim** (optioneel): als dit is ingesteld, wordt elke levering ondertekend met HMAC-SHA256, zodat de ontvanger de afzender kan verifiëren. Zie [De handtekening controleren](#de-handtekening-controleren).
- **Gebeurtenissen**: de gebeurtenissen waarop dit endpoint geabonneerd is.

Elke geregistreerde webhook heeft een actiemenu (de knop **...** op zijn rij) met:

- **Bewerken**: de endpoint-URL, beschrijving, het geheim en de geabonneerde gebeurtenissen wijzigen. Het formulier opent direct onder de webhook, ingevuld met de huidige waarden.
- **Test versturen**: verstuurt direct een [ping](#testping)-gebeurtenis en toont het HTTP-resultaat.
- **Uitschakelen** / **Inschakelen**: leveringen stoppen of hervatten zonder de registratie te verwijderen.
- **Verwijderen**: de webhook verwijderen, na bevestiging.

De pagina toont ook de uitkomst van de laatste levering voor elke webhook (HTTP-statuscode, of de fout als het endpoint niet bereikbaar was) en het tijdstip ervan.

Je mag dezelfde URL twee keer registreren, maar elke vermelding krijgt dan een eigen levering voor elke gebeurtenis waarop ze geabonneerd is, dus het endpoint ziet dubbele berichten.

## Levering

### Verzoekformaat

Elke levering is een HTTP `POST` met een JSON-body en de volgende headers:

| Header | Waarde |
|---|---|
| `Content-Type` | `application/json` |
| `User-Agent` | `Poznote-Webhook` |
| `X-Poznote-Event` | De naam van de gebeurtenis, bijvoorbeeld `note.created` |
| `X-Poznote-Delivery` | Het unieke id van de levering (dezelfde waarde als `delivery_id` in de body) |
| `X-Poznote-Signature-256` | `sha256=<hex HMAC>` van de onbewerkte body. Alleen aanwezig als de webhook een geheim heeft |

### Payload-envelop

Elke payload heeft dezelfde envelop; alleen `data` verschilt per gebeurtenis:

```json
{
  "event": "note.created",
  "delivery_id": "f3a1c9e2b4d86f70a1b2c3d4e5f60718",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": { }
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `event` | string | Naam van de gebeurtenis, zie het [overzicht van gebeurtenissen](#overzicht-van-gebeurtenissen) |
| `delivery_id` | string | 32 hexadecimale tekens, uniek per levering. Twee webhooks die dezelfde gebeurtenis ontvangen, krijgen verschillende id's |
| `created_at` | string | ISO 8601-tijdstempel (UTC) van de levering |
| `data` | object | Payload die per gebeurtenis verschilt, hieronder per gebeurtenis beschreven |

### De handtekening controleren

Als de webhook een geheim heeft, stuurt Poznote `X-Poznote-Signature-256: sha256=<signature>`, waarbij de handtekening de HMAC-SHA256 is van de **onbewerkte body van het verzoek**, met het geheim als sleutel (hetzelfde schema als GitHub-webhooks). Controleer hem tegen de onbewerkte bytes, vóór het parsen van de JSON, en gebruik een vergelijking in constante tijd:

```js
// Node.js
const crypto = require('crypto');

function verify(rawBody, signatureHeader, secret) {
  const expected = 'sha256=' + crypto.createHmac('sha256', secret).update(rawBody).digest('hex');
  return signatureHeader
    && expected.length === signatureHeader.length
    && crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signatureHeader));
}
```

```python
# Python
import hashlib, hmac

def verify(raw_body: bytes, signature_header: str, secret: str) -> bool:
    expected = "sha256=" + hmac.new(secret.encode(), raw_body, hashlib.sha256).hexdigest()
    return hmac.compare_digest(expected, signature_header or "")
```

Weiger verzoeken zonder geldige handtekening: iedereen die de endpoint-URL ontdekt, kan er nepgebeurtenissen naartoe POSTen.

### Leveringsgaranties

- Levering gebeurt **naar beste vermogen en synchroon**, met een time-out van 5 seconden voor verbinding en antwoord. Een traag of falend endpoint breekt nooit de actie (een registratie, het aanmaken van een notitie) die de gebeurtenis veroorzaakte.
- Een levering geldt als geslaagd bij elk **2xx**-antwoord. Omleidingen worden **niet gevolgd**.
- Mislukte leveringen van instantiegebeurtenissen, `note.created` en `note.shared` worden **niet opnieuw geprobeerd**.
- **Herinneringsgebeurtenissen zijn de uitzondering**: die worden *minstens één keer* afgeleverd. Een herinnering wordt pas als verzonden gemarkeerd wanneer elk geabonneerd endpoint haar heeft geaccepteerd; anders probeert de achtergrondworker de hele gebeurtenis opnieuw (maximaal 5 pogingen, met 5 minuten ertussen). Gezonde endpoints kunnen een herinneringsgebeurtenis dus dubbel ontvangen en moeten ontdubbelen op `data.reminder.id`.
- Herinneringen die al verlopen waren voordat het account zijn eerste herinneringswebhook registreerde, worden overgeslagen, zodat het inschakelen van webhooks het endpoint niet overspoelt met de hele achterstand.

## Directe links naar notities (Instantie-URL)

Payloads die naar een notitie verwijzen, kunnen een directe link bevatten in `data.note.url`, in deze vorm:

```
https://poznote.example.com/index.php?note=42&workspace=Poznote
```

De link wordt opgebouwd uit de **Instantie-URL**, de openbare URL van je Poznote-instantie, die je instelt in de sectie **Instantie-URL** van **Instellingen > Beheertools > Beheerderswebhooks** (alleen beheerders). Het is dezelfde waarde als de instantie-URL van de herinneringsmails, dus als je hem op de ene plek instelt, geldt hij voor beide. Je kunt hem ook instellen via de REST API (instelling `smtp_app_url`) of, als terugvaloptie, met de omgevingsvariabele `POZNOTE_APP_URL` (of `APP_URL`). Chat-apps die via Poznote inloggen bij de [MCP-server](MCP-SERVER.nl.md) worden ook naar dit adres gestuurd. Zolang hij leeg is, wordt hij ingevuld vanuit de browser van een beheerder, de eerste keer dat die Poznote gebruikt; daarna verandert hij alleen als hij hier wordt gewijzigd.

Als er geen Instantie-URL is geconfigureerd, is `data.note.url` gelijk aan `null` en bevatten payloads geen link.

## Gemeenschappelijke payload-objecten

### Het object data.user

Instantiegebeurtenissen beschrijven het betrokken account met een object `user`:

```json
{
  "user": {
    "id": 7,
    "username": "nina",
    "email": "nina@example.com",
    "first_name": "Nina",
    "last_name": "Martin",
    "source": "admin"
  }
}
```

| Veld | Type | Beschrijving |
|---|---|---|
| `id` | integer | Gebruikers-id in Poznote |
| `username` | string | Gebruikersnaam om in te loggen |
| `email` | string of null | E-mailadres, `null` als het profiel er geen heeft |
| `first_name` | string | Voornaam, kan leeg zijn |
| `last_name` | string | Achternaam, kan leeg zijn |
| `source` | string | Wie of wat de gebeurtenis veroorzaakte. Aanwezig bij `user.*`-gebeurtenissen, afwezig bij quotumgebeurtenissen. Waarden: `admin` (beheerinterface), `api` (REST API), `oidc` (SSO-login of automatische aanmaak), `self` (de gebruiker die iets aan zijn eigen account doet) |

Het gebruikersobject bevat nooit wachtwoorden, wachtwoordhashes of OIDC-tokens.

### Het object data.note

Gebruikersgebeurtenissen beschrijven de betrokken notitie met een object `note`. Welke velden er precies in staan, hangt af van de gebeurtenis (elke gebeurtenis hieronder toont een eigen voorbeeld), gekozen uit:

| Veld | Type | Beschrijving |
|---|---|---|
| `id` | integer | Id van de notitie, bruikbaar met de [REST API](API-REST.md) (`GET /api/v1/notes/{id}`) |
| `heading` | string | Titel van de notitie |
| `type` | string | `note` (HTML) of `markdown` |
| `workspace` | string | Werkruimte waarin de notitie staat |
| `folder` | string | Map waarin de notitie staat |
| `created` | string | Tijdstempel van aanmaak |
| `url` | string of null | Directe link naar de notitie, `null` als er geen [Instantie-URL](#directe-links-naar-notities-instantie-url) is geconfigureerd |

De **inhoud van de notitie wordt nooit verstuurd**, alleen metadata.

## Overzicht van gebeurtenissen

### Instantiegebeurtenissen

Beheerd via **Instellingen > Beheertools > Beheerderswebhooks**. Afgeleverd bij elke geabonneerde beheerderswebhook.

#### user.created

Er is een gebruikersaccount aangemaakt: door een beheerder, via de REST API, of door een registratie met automatische aanmaak via SSO.

```json
{
  "event": "user.created",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "user": {
      "id": 7,
      "username": "nina",
      "email": "nina@example.com",
      "first_name": "Nina",
      "last_name": "Martin",
      "language": "fr",
      "source": "oidc"
    }
  }
}
```

`data.user.source` is `admin`, `api` of `oidc`.

`data.user.language` is de opgeslagen taalcode van de interface van het account, standaard `en` als het account nog geen taalvoorkeur heeft.

#### user.updated

Een gebruikersprofiel is gewijzigd: gebruikersnaam, e-mailadres, voornaam, achternaam of beheerdersrol. Wordt niet verstuurd als er in werkelijkheid niets is veranderd.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "admin" },
    "changed_fields": ["email", "is_admin"]
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.user` | Het profiel **na** de wijziging |
| `data.changed_fields` | Array met wat er is veranderd, uit `username`, `email`, `first_name`, `last_name`, `is_admin` |

`data.user.source` is `admin`, `api`, `oidc` of `self`.

#### settings.language_changed

De interfacetaal van een gebruiker is uitdrukkelijk gewijzigd in de instellingen (of via de REST API, `PUT /api/v1/settings/language`). Het overnemen van de browsertaal bij het inloggen verstuurt deze gebeurtenis niet vanzelf, maar het bevestigen van die gedetecteerde taal in de startgids wel. Buiten de startgids wordt er niets verstuurd als de gekozen taal al in gebruik is. De gebeurtenis wordt afgeleverd bij elke geabonneerde beheerderswebhook.

```json
{
  "data": {
    "user": {
      "id": 7,
      "username": "nina",
      "email": "nina@example.com",
      "first_name": "Nina",
      "last_name": "Martin"
    },
    "language": "fr",
    "previous_language": "en",
    "source": "ui"
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.user` | Het profiel van het account dat zijn taal heeft gewijzigd |
| `data.language` | De nieuwe taalcode van de interface (`en`, `fr`, `de`, `es`, `pt`, `ru`, `zh-cn`, ...) |
| `data.previous_language` | De taal vóór de wijziging, `null` als het account er nog geen had opgeslagen |
| `data.source` | `ui` (webinterface) of `api` (REST API-client, geverifieerd met Basic- of Bearer-gegevens) |

#### user.activated / user.deactivated

Een gebruikersaccount is weer ingeschakeld, of uitgeschakeld en kan niet meer inloggen. Als de actief-vlag samen met andere profielvelden verandert, verstuurt Poznote `user.activated`/`user.deactivated` voor de vlag en een aparte `user.updated` voor de rest.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "admin" }
  }
}
```

#### user.deleted

Een gebruikersaccount is verwijderd. De payload bevat het profiel **zoals het vóór de verwijdering was**. `data.user.source` is `admin`, `api` of `self` (de gebruiker heeft zijn eigen account verwijderd).

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin", "source": "self" }
  }
}
```

#### signup.cap_reached

Een registratie via SSO is geweigerd omdat de instantie haar maximale aantal gebruikers heeft bereikt, zodat de beheerder direct hoort van gemiste registraties.

```json
{
  "data": {
    "max_users": 10,
    "attempted": {
      "username": "newcomer",
      "email": "newcomer@example.com"
    }
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.max_users` | Het ingestelde maximale aantal gebruikers |
| `data.attempted.username` | Gebruikersnaam die de geweigerde registratie zou hebben gebruikt, `null` als die onbekend is |
| `data.attempted.email` | E-mailadres van de geweigerde registratie, `null` als dat onbekend is |

#### quota.notes_reached

Een actie van een gebruiker is geblokkeerd omdat het account zijn notitiequotum heeft bereikt (prullenbak inbegrepen).

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin" },
    "quota": {
      "max_notes": 500,
      "note_count": 500
    }
  }
}
```

#### quota.storage_reached

Een actie van een gebruiker (een notitie opslaan of een bijlage uploaden) is geblokkeerd omdat het account zijn opslagquotum heeft bereikt.

```json
{
  "data": {
    "user": { "id": 7, "username": "nina", "email": "nina@example.com", "first_name": "Nina", "last_name": "Martin" },
    "quota": {
      "max_storage_bytes": 1073741824,
      "used_bytes": 1073700000,
      "requested_bytes": 250000
    }
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.quota.max_storage_bytes` | De ingestelde limiet in bytes |
| `data.quota.used_bytes` | Huidig gebruik in bytes |
| `data.quota.requested_bytes` | Grootte van de geweigerde schrijfactie |
| `data.quota.pool` | Alleen aanwezig, met de waarde `"s3"`, als de geblokkeerde upload het S3-quotum voor bijlagen betrof in plaats van de lokale opslag |

> **Beperking:** quotumgebeurtenissen worden beperkt tot maximaal één levering per gebruiker, per type gebeurtenis, per uur, zodat een gebruiker die steeds tegen de limiet aanloopt het endpoint niet overspoelt. `data.user` heeft geen veld `source` bij quotumgebeurtenissen.

#### backup.completed / backup.failed

Een automatische back-up (S3-bucket of lokale map, volgens het schema op hun instellingenpagina's) of een back-up die een beheerder heeft gestart met **Nu een back-up maken** is klaar. Er wordt één gebeurtenis per back-up verstuurd, niet per gebruiker: `backup.completed` als van elke geselecteerde gebruiker zonder fouten een back-up is gemaakt, `backup.failed` als dat bij minstens één gebruiker mislukte, een oud archief niet kon worden opgeruimd, de bestemming onbereikbaar was of van niemand een back-up is gemaakt. Back-ups die een gebruiker van zijn eigen account maakt, versturen deze gebeurtenissen niet.

```json
{
  "event": "backup.failed",
  "delivery_id": "…",
  "created_at": "2026-10-16T03:00:12+00:00",
  "data": {
    "backup": {
      "target": "s3",
      "trigger": "auto",
      "users": 3,
      "backed_up": 2,
      "errors": ["nina: Access Denied"]
    }
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.backup.target` | `s3` (S3-bucket voor back-ups) of `local` (lokale back-upmap) |
| `data.backup.trigger` | `auto` (geplande back-up) of `manual` (gestart door een beheerder) |
| `data.backup.users` | Aantal gebruikers dat voor de back-up is geselecteerd |
| `data.backup.backed_up` | Aantal geschreven archieven |
| `data.backup.errors` | Foutmeldingen, voorafgegaan door de gebruikersnaam als ze één gebruiker betreffen, maximaal 10. Leeg bij `backup.completed` |

> **Bewaken met healthchecks.io:** registreer twee webhooks: de ping-URL van de check (`https://hc-ping.com/<uuid>`), geabonneerd op `backup.completed`, en dezelfde URL gevolgd door `/fail`, geabonneerd op `backup.failed`. Stel de periode van de check in op de back-upfrequentie: als de worker stopt of halverwege crasht, wordt er geen gebeurtenis verstuurd en zorgt de ontbrekende ping voor de waarschuwing.

### Gebruikersgebeurtenissen

Beheerd via **Instellingen > Gebruikerswebhooks**. Alleen afgeleverd bij de endpoints die geregistreerd zijn door het account dat de gebeurtenis veroorzaakte. Daarom bevatten deze payloads geen object `user`: de endpoints horen bij het account, en het id van de notitie geeft het doel aan.

Een beheerder kan deze functie blokkeren voor gebruikers die geen beheerder zijn, met de optie **Webhooks van gebruikers** van de isolatie van accounts (**Instellingen > Beheertools > Isolatie van accounts**). Als die geblokkeerd is, kunnen gewone gebruikers de pagina niet openen en worden hun gebeurtenissen niet verstuurd; beheerders worden nooit beperkt.

#### note.created

Er is een notitie aangemaakt in het account, via de interface of via de REST API.

```json
{
  "event": "note.created",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "type": "markdown",
      "workspace": "Poznote",
      "folder": "Work",
      "created": "2026-08-09 12:34:56",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "source": "ui"
  }
}
```

`data.source` is `ui` (webinterface) of `api` (REST API-client, geverifieerd met Basic- of Bearer-gegevens).

#### note.shared

Er is een openbare link gepubliceerd voor een van de notities van het account.

```json
{
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "workspace": "Poznote",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "share": {
      "token": "d41d8cd98f00b204e9800998ecf8427e",
      "url": "https://poznote.example.com/share/d41d8cd98f00b204e9800998ecf8427e",
      "has_password": false,
      "updated": false
    }
  }
}
```

| Veld | Beschrijving |
|---|---|
| `data.share.token` | Openbaar token van de gedeelde link |
| `data.share.url` | Openbare URL van de gedeelde link |
| `data.share.has_password` | Of de link met een wachtwoord is beveiligd |
| `data.share.updated` | `false` voor een notitie die net gedeeld is, `true` als de notitie al gedeeld was en de link opnieuw is aangemaakt |

#### reminder.due / reminder.due_title / reminder.due_minimal

Een van de herinneringen bij de notities van het account heeft zijn tijdstip bereikt. De gebeurtenis wordt verstuurd door de achtergrondworker voor herinneringen, los van het e-mailkanaal, dus ook als SMTP niet is geconfigureerd.

Met de drie varianten kies je hoeveel gegevens de instantie verlaten; abonneer je op de variant die bij de ontvanger past:

**`reminder.due`**, de volledige payload, bevat de titel van de notitie en het bericht van de herinnering:

```json
{
  "data": {
    "note": {
      "id": 42,
      "heading": "Meeting notes",
      "workspace": "Poznote",
      "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote"
    },
    "reminder": {
      "id": 17,
      "message": "Prepare the agenda",
      "trigger_at": "2026-08-09 14:00:00"
    }
  }
}
```

**`reminder.due_title`**, hetzelfde moment, maar zonder het bericht van de herinnering:

```json
{
  "data": {
    "note": { "id": 42, "heading": "Meeting notes", "url": "https://poznote.example.com/index.php?note=42&workspace=Poznote" },
    "reminder": { "id": 17, "trigger_at": "2026-08-09 14:00:00" }
  }
}
```

**`reminder.due_minimal`**, alleen id's, er verlaat geen inhoud van de notitie de instantie. De ontvanger kan de details zo nodig ophalen via de [REST API](API-REST.md):

```json
{
  "data": {
    "note": { "id": 42 },
    "reminder": { "id": 17, "trigger_at": "2026-08-09 14:00:00" }
  }
}
```

> **Minstens één keer afgeleverd:** herinneringsgebeurtenissen worden opnieuw geprobeerd tot elk geabonneerd endpoint ze accepteert (maximaal 5 pogingen, met 5 minuten ertussen), dus een endpoint kan dezelfde herinnering meer dan eens ontvangen. Ontdubbel op `data.reminder.id`.

### Testping

De knop **Test versturen** op de webhookpagina's stuurt een `ping`-gebeurtenis naar het gekozen endpoint en meldt het HTTP-resultaat. Daarvoor gelden dezelfde regels voor envelop en handtekening als voor echte gebeurtenissen:

```json
{
  "event": "ping",
  "delivery_id": "…",
  "created_at": "2026-08-09T12:34:56+00:00",
  "data": {
    "message": "Poznote webhook test"
  }
}
```

## Privacy en beveiliging

- **De inhoud van notities verlaat de instantie nooit.** Payloads bevatten alleen metadata: id's, titels, werkruimte, map, tijdstempels. Gebruik `reminder.due_minimal` als zelfs titels het endpoint niet mogen bereiken.
- **Geen inloggegevens in payloads.** Gebruikersobjecten bevatten nooit wachtwoorden, hashes of tokens.
- **Strikt per account afgebakend.** Gebruikersgebeurtenissen worden alleen afgeleverd bij de endpoints van het account dat ze veroorzaakte.
- **Verifieer de afzender.** Stel een geheim in en controleer de header `X-Poznote-Signature-256` bij elk verzoek; een endpoint-URL alleen moet je als openbaar beschouwen.
- **Isolatie van accounts.** De optie "Webhooks van gebruikers" van de isolatie van accounts voorkomt dat gebruikers die geen beheerder zijn de metadata van hun notities naar externe endpoints doorsturen. Dit wordt zowel in de interface als bij het versturen afgedwongen.
- Mislukte leveringen worden in het PHP-foutlogboek vastgelegd, met de endpoint-URL en de foutstatus.

## Voorbeeld van een ontvanger

Een minimale ontvanger in Node.js die de handtekening controleert en op gebeurtenissen reageert:

```js
const crypto = require('crypto');
const http = require('http');

const SECRET = process.env.POZNOTE_WEBHOOK_SECRET;

http.createServer((req, res) => {
  let chunks = [];
  req.on('data', c => chunks.push(c));
  req.on('end', () => {
    const raw = Buffer.concat(chunks);
    const sig = req.headers['x-poznote-signature-256'] || '';
    const expected = 'sha256=' + crypto.createHmac('sha256', SECRET).update(raw).digest('hex');
    if (sig.length !== expected.length || !crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
      res.writeHead(401).end();
      return;
    }

    const payload = JSON.parse(raw.toString());
    switch (payload.event) {
      case 'note.created':
        console.log(`New note #${payload.data.note.id}: ${payload.data.note.heading}`);
        break;
      case 'reminder.due':
        console.log(`Reminder: ${payload.data.reminder.message} (note ${payload.data.note.id})`);
        break;
    }

    res.writeHead(200).end('ok');
  });
}).listen(9099);
```

Laat een webhook wijzen naar `http://your-host:9099/` met het bijbehorende geheim, klik op **Test versturen**, en je zou de `ping`-levering moeten zien binnenkomen.
