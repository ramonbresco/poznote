<!-- lang-selector -->
<p align="center">
  <a href="CHROME-EXTENSION.md">English</a> ·
  <a href="CHROME-EXTENSION.fr.md">Français</a> ·
  <a href="CHROME-EXTENSION.de.md">Deutsch</a> ·
  <a href="CHROME-EXTENSION.es.md">Español</a> ·
  <a href="CHROME-EXTENSION.pt.md">Português</a> ·
  <a href="CHROME-EXTENSION.ru.md">Русский</a> ·
  <a href="CHROME-EXTENSION.zh-cn.md">简体中文</a> ·
  <a href="CHROME-EXTENSION.ko.md">한국어</a> ·
  <a href="CHROME-EXTENSION.ja.md">日本語</a> ·
  <a href="CHROME-EXTENSION.ca.md">Català</a> ·
  <b>Nederlands</b> ·
  <a href="CHROME-EXTENSION.vi.md">Tiếng Việt</a>
</p>
<!-- /lang-selector -->

# Chrome-extensie van Poznote

De **Poznote URL Saver** is een browserextensie die de huidige pagina met één klik in je Poznote-instantie bewaart: het adres, het adres met een schermafbeelding, of de tekst als Markdown, als nieuwe notitie of aan het einde van een notitie die je al hebt.

<p align="center">
  <img src="../images/chrome-extension.png" alt="Chrome-extensie van Poznote" width="50%">
</p>

Installeer de extensie rechtstreeks vanuit de Chrome Web Store: [Extensie installeren](https://chromewebstore.google.com/detail/bmjclfamahegmgillaghhmnbkjebipbh?utm_source=item-share-cb)

## Verbinden met je instantie

1. Open in Poznote **Instellingen > App-wachtwoorden**, maak er een aan met de naam van de extensie en kopieer het geheim dat wordt getoond. Het wordt maar één keer weergegeven.
2. Klik op het pictogram van de extensie en daarna op **Verbinden**. De instellingenpagina van de extensie opent in een tabblad.
3. Vul het **Poznote-adres** in (bijvoorbeeld `https://notes.example.com`), je **Gebruikersnaam** en het **App-wachtwoord** dat je net hebt gekopieerd, klik dan op **Verbinden** en geef de extensie toegang tot je instantie als Chrome erom vraagt.
4. Kies de **Werkruimte**, en eventueel de **Map**, waar nieuwe notities terecht moeten komen. Je keuze wordt meteen opgeslagen.

Wil je later iets hiervan wijzigen, klik dan op het tandwielpictogram bovenaan de extensie.

Het adres van je instantie, dat ernaast staat, is een link: klik erop om Poznote in een nieuw tabblad te openen, via http of https zoals je het in de instellingen hebt ingevuld.

De extensie gebruikt de taal van Chrome als die Engels, Frans, Duits, Spaans, Portugees, Russisch, Koreaans, Vereenvoudigd Chinees, Japans, Catalaans of Nederlands is, en anders Engels.

Het wachtwoord van je account werkt hier ook, maar een app-wachtwoord is beter geschikt voor een extensie: het geeft alleen toegang tot de API, nooit tot de webinterface of je accountinstellingen, het is beperkt tot je eigen profiel, en als je het in Poznote intrekt, verliest de extensie haar toegang zonder dat er verder iets verandert. Zie [App-wachtwoorden](README.nl.md#app-wachtwoorden) voor de volledige lijst met beperkingen.

> **Werkt je instantie alleen met SSO,** dan is een app-wachtwoord de enige manier om de extensie te verbinden: het inlogformulier dat de extensie nodig heeft, bestaat niet voor jouw account. Maak er een aan via **Instellingen > App-wachtwoorden**, precies zoals hierboven.

## Een pagina bewaren

Klik op het pictogram van de extensie op de pagina die je wilt bewaren en kies waar die naartoe gaat:

- **Nieuwe notitie** maakt een notitie met de naam van de pagina, in de werkruimte en map die je in de instellingen hebt gekozen.
- **Bestaande notitie** voegt de pagina toe aan het einde van een notitie die je in de lijst kiest. Die lijst toont je laatste notities en doorzoekt ze terwijl je typt. Hij toont de notities van de werkruimte die je in de instellingen hebt gekozen; zet **Alle werkruimtes** aan om overal een notitie te kiezen. De extensie onthoudt die notitie voor de volgende pagina, dus links verzamelen in één leeslijst kost maar één klik per pagina. Pagina's kunnen worden toegevoegd aan HTML- en Markdown-notities.

Klik daarna op **Link bewaren** om het adres van de pagina te bewaren, of op **Schermafbeelding** om het adres te bewaren met daaronder een afbeelding van het zichtbare deel van de pagina. De bevestiging bevat een link die de notitie in Poznote opent.

**Paginatekst bewaren** bewaart de tekst van de pagina zelf, omgezet naar Markdown, onder het adres en de datum waarop hij is bewaard: alleen de hoofdinhoud, zonder menu's, zijbalken of voetteksten, met de koppen, lijsten, links, tabellen, codeblokken en afbeeldingen (afbeeldingen blijven links naar de site). Selecteer je eerst wat tekst, dan wordt de knop **Selectie bewaren** en bewaart hij alleen dat deel. Een nieuwe notitie die zo wordt gemaakt, is een Markdown-notitie; voeg je de tekst toe aan een bestaande notitie, dan wordt hij in het formaat van die notitie geschreven. Omdat de tekst in je browser wordt gelezen, werkt het ook voor pagina's achter een login, blijft de tekst in de notitie staan als de pagina verdwijnt, en kunnen de zoekfunctie van Poznote, de API en de MCP-server ermee werken.
