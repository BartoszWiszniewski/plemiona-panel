// ==UserScript==
// @name         Efekt Motyla: panel plemienia
// @namespace    efekt-motyla
// @version      3.10.2
// @description  Panel zarządzania plemieniem: skan członu, listy do selekcji, eksport i tabelki na mapie.
// @homepageURL  https://github.com/BartoszWiszniewski/plemiona-panel
// @updateURL    https://raw.githubusercontent.com/BartoszWiszniewski/plemiona-panel/main/efekt_panel_plemienia.user.js
// @downloadURL  https://raw.githubusercontent.com/BartoszWiszniewski/plemiona-panel/main/efekt_panel_plemienia.user.js
// @match        https://*.plemiona.pl/game.php*
// @grant        none
// @run-at       document-end
// ==/UserScript==

// Plik generowany. Nie edytuj go ręcznie: źródła są w panel/src, a build robi "npm run build".

(() => {
  // src/ui/dom.js
  function el(tag, wlasciwosci = {}, ...dzieci) {
    const element = Object.assign(document.createElement(tag), wlasciwosci);
    element.append(...dzieci.filter((d) => d !== null && d !== void 0));
    return element;
  }
  function przycisk(tekst, akcja, klasa = "") {
    const element = el("button", { type: "button", className: `ep-btn ${klasa}`.trim(), textContent: tekst });
    element.addEventListener("click", akcja);
    return element;
  }
  function formatLiczby(wartosc2) {
    if (wartosc2 === null || wartosc2 === void 0) return "—";
    return typeof wartosc2 === "number" ? wartosc2.toLocaleString("pl-PL") : String(wartosc2);
  }
  function formatDaty(iso) {
    return new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" });
  }

  // src/ui/postepObstawy.js
  var KOLORY_STANU = {
    pelna: "#2e7d32",
    "domknie sie": "#1f6fd0",
    brakuje: "#c0392b",
    "brak danych": "#8a7a65"
  };
  function opisStanu(p) {
    if (p.stan === "pelna") return "Gotowa";
    if (p.stan === "domknie sie") return "Domknie się po wejściach";
    if (p.stan === "brakuje") return `Brakuje ${formatLiczby(p.brakuje)}`;
    return "Brak danych";
  }
  function pasekObstawy(p, wysokosc = 10) {
    const pasek = el("div", { title: `Gotowe ${formatLiczby(p.gotowe)}, w drodze ${formatLiczby(p.wDrodze)}, plan ${formatLiczby(p.plan)}` });
    pasek.style.cssText = `display:flex;height:${wysokosc}px;min-width:90px;overflow:hidden;border-radius:${wysokosc / 2}px;background:#f1d6cf;box-shadow:inset 0 0 0 1px rgba(90,50,20,.18)`;
    if (p.stan === "brak danych") {
      pasek.style.background = "#e8dfcd";
      return pasek;
    }
    if (p.brakuje === 0) pasek.style.background = "#e8dfcd";
    const gotowe = el("i");
    gotowe.style.cssText = `display:block;width:${p.procentGotowe}%;background:#2e7d32;transition:width .3s`;
    const droga = el("i");
    droga.style.cssText = `display:block;width:${p.procentWDrodze}%;background:repeating-linear-gradient(135deg,#2f80ed 0 5px,#6aa8f4 5px 10px);transition:width .3s`;
    pasek.append(gotowe, droga);
    return pasek;
  }
  function kafel(tytul, wartosc2, kolor) {
    const pudelko = el("div");
    pudelko.style.cssText = "flex:1;min-width:64px;padding:5px 8px;border-radius:6px;background:rgba(255,255,255,.65);box-shadow:inset 0 0 0 1px rgba(90,50,20,.14)";
    const liczba7 = el("div", { textContent: wartosc2 });
    liczba7.style.cssText = `font-size:16px;font-weight:bold;line-height:1.2;color:${kolor}`;
    const opis2 = el("div", { textContent: tytul });
    opis2.style.cssText = "font-size:10px;color:#6d5a43";
    pudelko.append(liczba7, opis2);
    return pudelko;
  }
  function kafleObstawy(p) {
    const rzad = el(
      "div",
      {},
      kafel("Plan", formatLiczby(p.plan), "#4a2c17"),
      kafel("Gotowe", formatLiczby(p.gotowe), "#2e7d32"),
      kafel("W drodze", formatLiczby(p.wDrodze), "#1f6fd0"),
      kafel("Brakuje", formatLiczby(p.brakuje), p.brakuje ? "#c0392b" : "#2e7d32")
    );
    rzad.style.cssText = "display:flex;gap:6px;flex-wrap:wrap;margin:4px 0";
    const stan = el("div", { textContent: opisStanu(p) });
    stan.style.cssText = `margin:4px 0 3px;font-weight:bold;color:${KOLORY_STANU[p.stan]}`;
    return el("div", { className: "efekt-postep-obstawy" }, stan, rzad, pasekObstawy(p, 12));
  }
  function liniaObstawy(p) {
    const opis2 = p.stan === "brak danych" ? "Obstawa: brak danych" : `Obstawa ${formatLiczby(p.razem)} z ${formatLiczby(p.plan)}: gotowe ${formatLiczby(p.gotowe)}, w drodze ${formatLiczby(p.wDrodze)}`;
    const linia = el("div", { textContent: opis2 });
    linia.style.cssText = "font-weight:bold;margin-bottom:3px";
    const stan = el("div", { textContent: opisStanu(p) });
    stan.style.cssText = `font-weight:bold;margin-top:3px;color:${KOLORY_STANU[p.stan]}`;
    return el("div", {}, linia, pasekObstawy(p, 8), stan);
  }

  // src/rdzen/konfiguracja.js
  var OPOZNIENIE_MS = 700;
  var PROBY_429 = 3;
  var STARE_DANE_H = 24;
  var TRYBY = {
    troops: { tryb: "members_troops", nazwa: "wojsko" },
    defense: { tryb: "members_defense", nazwa: "obrona" },
    buildings: { tryb: "members_buildings", nazwa: "budynki" }
  };
  var JEDNOSTKI = {
    spear: "Pik",
    sword: "Miecz",
    axe: "Topór",
    archer: "Łuk",
    spy: "Zwiad",
    light: "LK",
    marcher: "ŁK",
    heavy: "CK",
    ram: "Taran",
    catapult: "Kat",
    knight: "Rycerz",
    snob: "Szl"
  };
  var BUDYNKI = {
    main: "Ratusz",
    barracks: "Koszary",
    stable: "Stajnia",
    garage: "Warsztat",
    church: "Kościół",
    church_f: "Pierwszy kościół",
    watchtower: "Wieża",
    snob: "Pałac",
    smith: "Kuźnia",
    place: "Plac",
    statue: "Piedestał",
    market: "Rynek",
    wood: "Tartak",
    stone: "Cegielnia",
    iron: "Huta",
    farm: "Zagroda",
    storage: "Spichlerz",
    hide: "Schowek",
    wall: "Mur"
  };
  var KOSZTY = {
    spear: { wood: 50, stone: 30, iron: 10 },
    sword: { wood: 30, stone: 30, iron: 70 },
    axe: { wood: 60, stone: 30, iron: 40 },
    spy: { wood: 50, stone: 50, iron: 20 },
    light: { wood: 125, stone: 100, iron: 250 },
    heavy: { wood: 200, stone: 150, iron: 600 },
    ram: { wood: 300, stone: 200, iron: 200 },
    catapult: { wood: 320, stone: 400, iron: 100 },
    snob: { wood: 4e4, stone: 5e4, iron: 5e4 }
  };
  var LUDNOSC = { spear: 1, sword: 1, axe: 1, spy: 2, light: 4, heavy: 6, ram: 5, catapult: 8, snob: 100 };
  var JEDNOSTKI_DEFF = ["spear", "sword", "archer", "heavy"];
  var JEDNOSTKI_OFF = ["axe", "light", "marcher", "ram", "catapult"];
  var MAKS_MIGAWEK = 60;
  var POWTORKA_WPISU_DNI = 7;
  var PRZEJECIA_DNI = 7;
  var MAKS_MIGAWEK_OBSTAW = 20;
  var MAKS_MIGAWEK_PULSU = 45;
  var PROSBA_DOMYSLNA = {
    temat: "Obstawa {koord}: dośli {uzupelnic}",
    tresc: "Cześć {gracz},\n\nwioska [coord]{koord}[/coord] ([player]{wlasciciel}[/player]): stoi {stoi} z {plan} paczek, brakuje {brakuje}. Od Ciebie stoi {odGracza}.\nProszę, dośli {uzupelnic}, czyli np. {przyklad}. Powód: {powod}.\n\nDzięki!"
  };
  var CAPTCHA = "#bot_check, #bot_protect, #bot_protection, #botcheck, #botprotection_quest, .bot_check, .h-captcha, .g-recaptcha";
  var USTAWIENIA_DOMYSLNE = {
    czlony: ["Efekt?", "Efekt!", "Efekt.", "Efekt-", "Efekt@", "Efekt*", "Efekt,"],
    wrogowie: ["RP", "RP2", "RP3", "MadHat"],
    front: 15,
    // Wątek na forum plemienia z tabelą obstaw.
    forumObstaw: "https://pl234.plemiona.pl/game.php?screen=forum&screenmode=view_thread&forum_id=776&thread_id=1811",
    // Lista Kiszenie: wioska poza frontem, w której stoi co najmniej tyle paczek własnego deffu.
    kiszeniePaczek: 5,
    // Ile jednostek daje 1 paczkę. 50 pików i 10 CK to 0,5 + 0,5 = 1 paczka.
    paczka: { spear: 100, sword: 100, heavy: 20 },
    // Ocena rozwoju między skanami: minimalny odstęp w dniach, poniżej ilu punktów wzrost nie liczy się
    // jako rozwój, od ilu ludności ubytek wojska to „straty”, od ilu ludności przyrost offu to „nowy OFF”,
    // a od ilu nowych pokonanych (RA + RO + RW) gracz „walczy”.
    stagnacja: { dni: 3, punkty: 100, straty: 500, nowyOff: 1e3, walka: 1e3 },
    // Ile dni po dołączeniu do plemienia nie wolno wysyłać ani dostawać wsparcia.
    blokadaDni: 3,
    // Selekcja liczy zestawem reguł z zakładki Reguły. Tu tylko, którego używa ten radny.
    selekcja: { aktywne: null },
    // Pochwała za obstawy, gdy gracz wysłał co najmniej taki procent swojego deffu na wioski z planu.
    pochwalaUdzial: 50,
    prosba: PROSBA_DOMYSLNA,
    // Wysyłka próśb: odstęp między wiadomościami w „Wyślij do wszystkich”, blokada ponownej prośby zbiorczej do tego
    // samego gracza o tę samą wioskę i maksymalny wiek odczytu, przy którym wysyłka zbiorcza jeszcze prosi.
    wysylka: { odstepS: 5, blokadaH: 24, maksWiekH: 24 }
  };

  // src/rdzen/paczki.js
  function liczPaczki(jednostki, paczka) {
    if (!jednostki) return 0;
    const razem = Object.entries(paczka).reduce((suma3, [jednostka2, ile]) => suma3 + (jednostki[jednostka2] || 0) / ile, 0);
    return Math.floor(razem * 10 + 1e-9) / 10;
  }

  // src/rdzen/typ.js
  var ludnosc = (wojsko2, jednostki) => jednostki.reduce((suma3, j) => suma3 + (wojsko2[j] || 0) * LUDNOSC[j], 0);
  function typWioski(wojsko2) {
    if (!wojsko2) return null;
    const off = ludnosc(wojsko2, ["axe", "light", "ram", "catapult"]);
    const deff = ludnosc(wojsko2, ["spear", "sword", "heavy"]);
    if (off + deff < 500) return null;
    if (off > deff * 1.5) return "off";
    if (deff > off * 1.5) return "deff";
    return "mix";
  }

  // src/rdzen/model.js
  var suma = (lista, funkcja) => lista.reduce((razem, element) => razem + funkcja(element), 0);
  function odlegloscDoWroga(wioska, wrogowie) {
    return wrogowie.reduce(
      (najblizszy, [x, y]) => Math.min(najblizszy, Math.hypot(x - wioska.x, y - wioska.y)),
      Infinity
    );
  }
  function deffWDomu(wioska) {
    if (!wioska.wlasne || !wioska.wWiosce) return null;
    return Object.fromEntries(JEDNOSTKI_DEFF.map((j) => [j, Math.min(wioska.wlasne[j] || 0, wioska.wWiosce[j] || 0)]));
  }
  function modelWioski(czlon, gracz, wioska, u, wrogowie) {
    const wlasne = wioska.wlasne || null;
    const odleglosc = odlegloscDoWroga(wioska, wrogowie);
    const bezpieczna = wrogowie.length ? odleglosc > u.front : null;
    const wDomu = deffWDomu(wioska);
    const paczkiWDomu = wDomu ? liczPaczki(wDomu, u.paczka) : null;
    const kiszenie2 = paczkiWDomu !== null && bezpieczna === true && paczkiWDomu >= u.kiszeniePaczek;
    let wsparcie = null;
    if (wlasne && wioska.wWiosce) {
      wsparcie = {
        spear: Math.max(0, wioska.wWiosce.spear - wlasne.spear),
        sword: Math.max(0, wioska.wWiosce.sword - wlasne.sword),
        spy: Math.max(0, wioska.wWiosce.spy - wlasne.spy),
        heavy: Math.max(0, wioska.wWiosce.heavy - wlasne.heavy)
      };
    }
    return {
      czlon: czlon.tag,
      nick: gracz.nick,
      idGracza: gracz.id,
      id: wioska.id,
      nazwa: wioska.nazwa,
      x: wioska.x,
      y: wioska.y,
      koord: `${wioska.x}|${wioska.y}`,
      punkty: wioska.punkty,
      wlasne,
      wWiosce: wioska.wWiosce || null,
      wDrodze: wioska.wDrodze || null,
      budynki: wioska.budynki || null,
      wsparcie,
      odleglosc: Number.isFinite(odleglosc) ? Math.round(odleglosc) : null,
      bezpieczna,
      wDomu,
      paczkiWDomu,
      kiszenie: kiszenie2,
      typ: typWioski(wlasne)
    };
  }
  function kryteria(gracz, wioski3, wrogowieZnalezieni) {
    const dostepy = Object.keys(TRYBY).map((klucz2) => gracz.dostep[klucz2]);
    let dostep = true;
    if (dostepy.includes("nie")) dostep = false;
    else if (dostepy.includes("błąd") || dostepy.includes(void 0)) dostep = null;
    return {
      dostep,
      deff: wioski3.some((w) => w.wlasne && w.wWiosce) && wrogowieZnalezieni ? !wioski3.some((w) => w.kiszenie) : null
    };
  }
  function modelGracza(czlon, gracz, wioski3, wrogowieZnalezieni) {
    const zWojskiem = wioski3.filter((w) => w.wlasne);
    const razem = (jednostka2) => zWojskiem.length ? suma(zWojskiem, (w) => w.wlasne[jednostka2] || 0) : null;
    const braki = Object.entries(TRYBY).filter(([klucz2]) => gracz.dostep[klucz2] !== "tak").map(([klucz2, { nazwa }]) => gracz.dostep[klucz2] === "błąd" ? `${nazwa} (błąd odczytu)` : nazwa);
    const glowna = wioski3.filter((w) => w.budynki).sort((a, b) => b.punkty - a.punkty)[0];
    return {
      czlon: czlon.tag,
      nick: gracz.nick,
      id: gracz.id,
      wioski: wioski3.length || null,
      punkty: wioski3.length ? suma(wioski3, (w) => w.punkty) : null,
      spear: razem("spear"),
      sword: razem("sword"),
      heavy: razem("heavy"),
      axe: razem("axe"),
      light: razem("light"),
      ram: razem("ram"),
      snob: razem("snob"),
      braki,
      kiszone: wioski3.filter((w) => w.kiszenie).length,
      eko: glowna ? ["wood", "stone", "iron"].map((b) => glowna.budynki[b] || 0).join("/") : null,
      kryteria: kryteria(gracz, wioski3, wrogowieZnalezieni)
    };
  }
  function zbudujModel(dane2, u, wrogowie) {
    const wioski3 = [];
    const gracze2 = [];
    const czlony = [];
    for (const czlon of Object.values(dane2.czlony)) {
      const graczeCzlonu = Object.values(czlon.gracze);
      let wioskiCzlonu = 0;
      let bezDostepu = 0;
      for (const gracz of graczeCzlonu) {
        const jego = Object.values(gracz.wioski).map((w) => modelWioski(czlon, gracz, w, u, wrogowie));
        const model = modelGracza(czlon, gracz, jego, wrogowie.length > 0);
        wioski3.push(...jego);
        gracze2.push(model);
        wioskiCzlonu += jego.length;
        if (model.braki.length) bezDostepu += 1;
      }
      czlony.push({
        tag: czlon.tag,
        gracze: graczeCzlonu.length,
        wioski: wioskiCzlonu,
        bezDostepu,
        data: czlon.data,
        skanowal: czlon.skanowal,
        kompletny: czlon.kompletny
      });
    }
    const zeskanowane = new Set(czlony.map((c) => c.tag));
    return {
      wioski: wioski3,
      gracze: gracze2,
      czlony,
      brakujaceCzlony: u.czlony.filter((tag) => !zeskanowane.has(tag)),
      wrogowieZnalezieni: wrogowie.length > 0
    };
  }

  // src/rdzen/historiaObstaw.js
  var pusta = () => ({ migawki: [], wzorzec: null });
  var historiaWioski = (dane2, koord) => (dane2.historiaObstaw || {})[koord] || pusta();
  function przytnij(wpis) {
    if (wpis.migawki.length <= MAKS_MIGAWEK_OBSTAW) return;
    const chronione = wpis.wzorzec ? wpis.wzorzec.data : null;
    while (wpis.migawki.length > MAKS_MIGAWEK_OBSTAW) {
      const indeks = wpis.migawki.findIndex((m) => m.data !== chronione);
      if (indeks < 0) return;
      wpis.migawki.splice(indeks, 1);
    }
  }
  function dopiszMigawkeObstawy(dane2, koord, rekord) {
    if (!rekord || !rekord.widoczne || !rekord.data) return false;
    dane2.historiaObstaw = dane2.historiaObstaw || {};
    const wpis = dane2.historiaObstaw[koord] || pusta();
    if (wpis.migawki.some((m) => m.data === rekord.data)) return false;
    wpis.migawki.push({
      data: rekord.data,
      skanowal: rekord.skanowal || null,
      wiersze: rekord.wiersze.map(({ nick, idGracza, zKoord, jednostki }) => ({ nick, idGracza, zKoord, jednostki: { ...jednostki } }))
    });
    wpis.migawki.sort((a, b) => a.data.localeCompare(b.data));
    przytnij(wpis);
    dane2.historiaObstaw[koord] = wpis;
    return true;
  }
  function ustawWzorzec(dane2, koord, dataMigawki, kto) {
    dane2.historiaObstaw = dane2.historiaObstaw || {};
    const wpis = dane2.historiaObstaw[koord] || pusta();
    if (dataMigawki === null) {
      wpis.wzorzec = null;
    } else {
      if (!wpis.migawki.some((m) => m.data === dataMigawki)) throw new Error("Nie ma takiej migawki w historii tej wioski.");
      wpis.wzorzec = { data: dataMigawki, ustawiono: (/* @__PURE__ */ new Date()).toISOString(), kto: kto || null };
    }
    dane2.historiaObstaw[koord] = wpis;
    return wpis;
  }
  var migawkaWzorca = (wpis) => wpis.wzorzec ? wpis.migawki.find((m) => m.data === wpis.wzorzec.data) || null : null;
  function usunHistorieObstaw(dane2, koord) {
    if (dane2.historiaObstaw) delete dane2.historiaObstaw[koord];
  }
  function polaczHistorieObstaw(moja, obca) {
    let zmiany2 = 0;
    for (const [koord, cudzy] of Object.entries(obca || {})) {
      const wpis = moja[koord] || pusta();
      for (const m of cudzy.migawki || []) {
        if (wpis.migawki.some((x) => x.data === m.data)) continue;
        wpis.migawki.push(m);
        zmiany2 += 1;
      }
      wpis.migawki.sort((a, b) => a.data.localeCompare(b.data));
      if (cudzy.wzorzec && (!wpis.wzorzec || (cudzy.wzorzec.ustawiono || "") > (wpis.wzorzec.ustawiono || "")) && wpis.migawki.some((m) => m.data === cudzy.wzorzec.data)) {
        wpis.wzorzec = cudzy.wzorzec;
        zmiany2 += 1;
      }
      przytnij(wpis);
      moja[koord] = wpis;
    }
    return zmiany2;
  }

  // src/rdzen/postepObstawy.js
  var zaokraglij = (liczba7) => Math.round(liczba7 * 10) / 10;
  function postepObstawy(plan, gotowe, wDrodze2) {
    const droga = wDrodze2 ?? 0;
    if (gotowe === null || gotowe === void 0) {
      return {
        plan,
        gotowe: null,
        wDrodze: droga,
        razem: null,
        brakuje: null,
        procentGotowe: null,
        procentWDrodze: null,
        procentRazem: null,
        stan: "brak danych"
      };
    }
    const razem = zaokraglij(gotowe + droga);
    const brakuje = Math.max(0, zaokraglij(plan - razem));
    const procentGotowe = Math.min(100, Math.round(gotowe / plan * 100));
    const procentRazem = Math.round(razem / plan * 100);
    let stan = "brakuje";
    if (gotowe >= plan) stan = "pelna";
    else if (brakuje === 0) stan = "domknie sie";
    return {
      plan,
      gotowe,
      wDrodze: droga,
      razem,
      brakuje,
      procentGotowe,
      procentWDrodze: Math.max(0, Math.min(100, procentRazem) - procentGotowe),
      procentRazem,
      stan
    };
  }

  // src/rdzen/wsparcie.js
  function liczbaJednostek(wiersz, jednostka2) {
    const komorka = wiersz.querySelector(`td.unit-item-${jednostka2}`);
    if (!komorka) return 0;
    const atrybut = komorka.getAttribute("data-unit-count");
    return Number(atrybut ?? komorka.textContent.replace(/\D/g, "")) || 0;
  }
  function czytajWiersz(wiersz) {
    const kotwica = wiersz.querySelector("td.village-anchor") || wiersz.querySelector('td a[href*="screen=info_village"]')?.closest("td");
    if (!kotwica) return null;
    const wioska = kotwica.querySelector('a[href*="screen=info_village"]');
    const gracz = kotwica.querySelector('a[href*="screen=info_player"]');
    const koord = /(\d{1,3}\|\d{1,3})/.exec((wioska || kotwica).textContent);
    if (!koord) return null;
    const idGracza = gracz ? /[?&]id=(\d+)/.exec(gracz.getAttribute("href") || "") : null;
    const nawias = /\(([^)]+)\)\s*$/.exec(kotwica.textContent);
    const jednostki = {};
    for (const jednostka2 of Object.keys(JEDNOSTKI)) {
      const ile = liczbaJednostek(wiersz, jednostka2);
      if (ile) jednostki[jednostka2] = ile;
    }
    return {
      nick: gracz ? gracz.textContent.trim() : nawias ? nawias[1].trim() : null,
      idGracza: idGracza ? idGracza[1] : null,
      zKoord: koord[1],
      jednostki
    };
  }
  function czytajWlasne(tabela2) {
    const wiersz = [...tabela2.querySelectorAll("tr")].find((w) => /^\s*Z tej wioski/i.test(w.cells[0]?.textContent || ""));
    if (!wiersz) return null;
    const wlasne = {};
    for (const jednostka2 of Object.keys(JEDNOSTKI)) {
      if (wiersz.querySelector(`td.unit-item-${jednostka2}`)) wlasne[jednostka2] = liczbaJednostek(wiersz, jednostka2);
    }
    return Object.keys(wlasne).length ? wlasne : null;
  }
  function czytajWsparcie(strona, koordCelu) {
    const tabela2 = strona.querySelector("#withdraw_selected_units_village_info > table");
    if (!tabela2) return { widoczne: false, wiersze: [], wlasne: null };
    const wiersze = [...tabela2.querySelectorAll("tr")].map(czytajWiersz).filter((w) => w && w.zKoord !== koordCelu && w.nick);
    return { widoczne: true, wiersze, wlasne: czytajWlasne(tabela2) };
  }
  function czytajRozkaz(wiersz, wlasnyNick) {
    const ikona = wiersz.querySelector("[data-command-id]");
    const etykieta = (wiersz.querySelector(".quickedit-label")?.textContent || "").trim();
    const dwukropek = etykieta.indexOf(":");
    const wlasny = dwukropek <= 0;
    const koniec = wiersz.querySelector("[data-endtime]")?.getAttribute("data-endtime");
    return {
      id: ikona?.getAttribute("data-command-id") || null,
      typ: ikona?.getAttribute("data-command-type") || null,
      nick: wlasny ? wlasnyNick || null : etykieta.slice(0, dwukropek).trim(),
      wioska: wlasny ? etykieta || null : etykieta.slice(dwukropek + 1).trim(),
      wlasny,
      wejscie: koniec && /^\d+$/.test(koniec) ? new Date(Number(koniec) * 1e3).toISOString() : null
    };
  }
  var WLASNE_ROZKAZY = "własne rozkazy";
  function czytajNadciagajace(strona, { wlasnyNick = null } = {}) {
    let suma3 = null;
    const tabela2 = strona.querySelector("#support_sum");
    if (tabela2) {
      suma3 = {};
      for (const komorka of tabela2.querySelectorAll("td[data-unit]")) {
        const jednostka2 = komorka.getAttribute("data-unit");
        if (jednostka2 in JEDNOSTKI) suma3[jednostka2] = Number(komorka.textContent.replace(/\D/g, "")) || 0;
      }
      if (!Object.keys(suma3).length) suma3 = null;
    }
    const kontener = strona.querySelector("#commands_outgoings");
    const rozkazy = kontener ? [...kontener.querySelectorAll("tr.command-row")].map((w) => czytajRozkaz(w, wlasnyNick)).filter((r) => r.typ === "support" && r.wioska) : null;
    return { suma: suma3, rozkazy };
  }
  function rozbijRozkazy(rozkazy, paczka = null) {
    const naGraczy = /* @__PURE__ */ new Map();
    for (const r of rozkazy || []) {
      const nick = r.nick || WLASNE_ROZKAZY;
      const wpis = naGraczy.get(nick) || { nick, rozkazy: 0, pierwsze: null, ostatnie: null, jednostki: {}, bezDanych: 0 };
      wpis.rozkazy += 1;
      if (r.jednostki) for (const [j, ile] of Object.entries(r.jednostki)) wpis.jednostki[j] = (wpis.jednostki[j] || 0) + ile;
      else wpis.bezDanych += 1;
      if (r.wejscie && (!wpis.pierwsze || r.wejscie < wpis.pierwsze)) wpis.pierwsze = r.wejscie;
      if (r.wejscie && (!wpis.ostatnie || r.wejscie > wpis.ostatnie)) wpis.ostatnie = r.wejscie;
      naGraczy.set(nick, wpis);
    }
    return [...naGraczy.values()].map((w) => ({ ...w, paczki: paczka ? liczPaczki(w.jednostki, paczka) : null })).sort((a, b) => b.rozkazy - a.rozkazy || a.nick.localeCompare(b.nick, "pl"));
  }
  function paczkiOdGraczy(nadawcy, nadciagajacy) {
    const gracze2 = /* @__PURE__ */ new Map();
    const wpis = (nick, idGracza = null) => {
      const obecny = gracze2.get(nick) || { nick, idGracza, stoi: 0, wDrodze: 0, rozkazy: 0, bezDanych: 0, pierwsze: null, ostatnie: null };
      obecny.idGracza = obecny.idGracza || idGracza;
      gracze2.set(nick, obecny);
      return obecny;
    };
    for (const n of nadawcy) {
      const g = wpis(n.nick, n.idGracza);
      g.stoi = Math.round((g.stoi + n.paczki) * 10) / 10;
    }
    for (const n of nadciagajacy) {
      Object.assign(wpis(n.nick), { wDrodze: n.paczki || 0, rozkazy: n.rozkazy, bezDanych: n.bezDanych, pierwsze: n.pierwsze, ostatnie: n.ostatnie });
    }
    return [...gracze2.values()].map((g) => ({ ...g, razem: Math.round((g.stoi + g.wDrodze) * 10) / 10 })).filter((g) => g.razem > 0 || g.rozkazy > 0).sort((a, b) => b.razem - a.razem || a.nick.localeCompare(b.nick, "pl"));
  }

  // src/rdzen/straty.js
  var dziesiate = (x) => Math.round(x * 10) / 10;
  function sumyGraczy(wiersze, paczka) {
    const gracze2 = /* @__PURE__ */ new Map();
    for (const w of wiersze || []) {
      const wpis = gracze2.get(w.nick) || { nick: w.nick, idGracza: w.idGracza || null, jednostki: {}, paczki: 0, wioski: 0 };
      for (const [j, ile] of Object.entries(w.jednostki || {})) wpis.jednostki[j] = (wpis.jednostki[j] || 0) + ile;
      wpis.paczki = dziesiate(wpis.paczki + liczPaczki(w.jednostki, paczka));
      wpis.wioski += 1;
      if (!wpis.idGracza && w.idGracza) wpis.idGracza = w.idGracza;
      gracze2.set(w.nick, wpis);
    }
    return gracze2;
  }
  function doPelnejPaczki(paczki2) {
    if (paczki2 === null || paczki2 === void 0) return null;
    const reszta = dziesiate(Math.ceil(paczki2 - 1e-9) - paczki2);
    return reszta > 0 ? reszta : 0;
  }
  function przykladJednostek(paczki2, paczka) {
    if (!paczki2) return "";
    const [a, b] = Object.entries(paczka).filter(([j]) => j in JEDNOSTKI).slice(0, 2);
    if (!b) return `${Math.ceil(paczki2 * a[1])} ${JEDNOSTKI[a[0]]}`;
    return `${Math.ceil(paczki2 * a[1] / 2)} ${JEDNOSTKI[a[0]]} i ${Math.ceil(paczki2 * b[1] / 2)} ${JEDNOSTKI[b[0]]}`;
  }
  var OPISY_STRAT = {
    "brak wzorca": "rada nie oznaczyła jeszcze stanu wzorcowego",
    "nie wiadomo": "brak aktualnego odczytu stacjonujących po dacie wzorca",
    "bez strat": "stoi tyle samo lub więcej niż we wzorcu",
    "stoi mniej": "stoi mniej niż we wzorcu",
    "nie stoi": "we wzorcu był, teraz nie stoi",
    nowy: "nie było go we wzorcu"
  };
  function porownajZeWzorcem(historia2, obecny, paczka) {
    const wzorzec = migawkaWzorca(historia2);
    const aktualny = Boolean(obecny?.widoczne && obecny.data && (!wzorzec || obecny.data >= wzorzec.data));
    const teraz2 = aktualny ? sumyGraczy(obecny.wiersze, paczka) : /* @__PURE__ */ new Map();
    const przed = wzorzec ? sumyGraczy(wzorzec.wiersze, paczka) : /* @__PURE__ */ new Map();
    const wDrodze2 = new Map(rozbijRozkazy(obecny?.nadciaga?.rozkazy).map((r) => [r.nick, r]));
    const nicki = [.../* @__PURE__ */ new Set([...przed.keys(), ...teraz2.keys(), ...wDrodze2.keys()])];
    const gracze2 = nicki.map((nick) => {
      const p = przed.get(nick) || null;
      const t = teraz2.get(nick) || null;
      const paczkiPrzed = p ? p.paczki : null;
      const paczkiTeraz = aktualny ? t ? t.paczki : 0 : null;
      let status;
      if (!wzorzec) status = "brak wzorca";
      else if (!aktualny) status = "nie wiadomo";
      else if (!p) status = "nowy";
      else if (!t || paczkiTeraz === 0) status = "nie stoi";
      else if (paczkiTeraz < paczkiPrzed) status = "stoi mniej";
      else status = "bez strat";
      const jednostki = {};
      for (const j of Object.keys(JEDNOSTKI)) {
        const a = p ? p.jednostki[j] || 0 : null;
        const b = aktualny ? t ? t.jednostki[j] || 0 : 0 : null;
        if ((a ?? 0) || (b ?? 0)) jednostki[j] = { przed: a, teraz: b, strata: a !== null && b !== null ? Math.max(0, a - b) : null };
      }
      const doWzorca = wzorzec && aktualny && p ? dziesiate(Math.max(0, paczkiPrzed - paczkiTeraz)) : null;
      const doPelnej = doPelnejPaczki(paczkiTeraz);
      return {
        nick,
        idGracza: t?.idGracza || p?.idGracza || null,
        paczkiPrzed,
        paczkiTeraz,
        strata: status === "stoi mniej" || status === "nie stoi" ? dziesiate(paczkiPrzed - paczkiTeraz) : status === "bez strat" ? 0 : null,
        jednostki,
        status,
        rozkazyWDrodze: wDrodze2.get(nick)?.rozkazy || 0,
        wejscie: wDrodze2.get(nick)?.pierwsze || null,
        doWzorca,
        doPelnej,
        niepelna: paczkiTeraz !== null && paczkiTeraz > 0 && doPelnej > 0,
        uzupelnic: doWzorca !== null ? doWzorca : doPelnej,
        powod: doWzorca ? "strata" : doPelnej ? "niepełna paczka" : null
      };
    });
    const kolejnosc = { "nie stoi": 0, "stoi mniej": 1, nowy: 2, "bez strat": 3, "nie wiadomo": 4, "brak wzorca": 5 };
    gracze2.sort((a, b) => kolejnosc[a.status] - kolejnosc[b.status] || (b.uzupelnic || 0) - (a.uzupelnic || 0) || a.nick.localeCompare(b.nick, "pl"));
    return {
      wzorzec: wzorzec ? { data: wzorzec.data, paczki: dziesiate([...przed.values()].reduce((s, g) => s + g.paczki, 0)), nadawcow: przed.size } : null,
      aktualny,
      dataOdczytu: obecny?.data || null,
      gracze: gracze2
    };
  }

  // src/rdzen/obstawyModel.js
  function modelCelu(cel, dane2, wioski3, u) {
    const skan = dane2.obstawy[cel.koord];
    const wioska = wioski3.find((w) => w.koord === cel.koord);
    const nadawcy = (skan?.widoczne ? skan.wiersze : []).map((w) => ({
      ...w,
      paczki: liczPaczki(w.jednostki, u.paczka)
    }));
    let stoi = null;
    let zrodlo = null;
    if (skan?.widoczne) {
      stoi = Math.round(nadawcy.reduce((suma3, n) => suma3 + n.paczki, 0) * 10) / 10;
      zrodlo = "skan";
    } else if (wioska?.wsparcie) {
      stoi = liczPaczki(wioska.wsparcie, u.paczka);
      zrodlo = "obrona";
    }
    const wDrodze2 = wioska?.wDrodze ? liczPaczki(wioska.wDrodze, u.paczka) : null;
    const nadciaga = skan?.nadciaga || null;
    const historia2 = historiaWioski(dane2, cel.koord);
    const straty = porownajZeWzorcem(historia2, skan || null, u.paczka);
    const zeStrata = straty.gracze.filter((g) => g.status === "stoi mniej" || g.status === "nie stoi");
    const nadciagaNadawcy = rozbijRozkazy(nadciaga?.rozkazy, u.paczka);
    const nadciagaPaczki = nadciaga?.suma ? liczPaczki(nadciaga.suma, u.paczka) : null;
    const postep = postepObstawy(cel.paczek, stoi, nadciagaPaczki ?? wDrodze2);
    return {
      ...cel,
      stoi,
      zrodlo,
      postep,
      wDrodze: wDrodze2,
      historia: historia2,
      straty,
      stratyPaczki: straty.wzorzec && straty.aktualny ? Math.round(zeStrata.reduce((s, g) => s + g.strata, 0) * 10) / 10 : null,
      doUzupelnienia: straty.gracze.filter((g) => g.uzupelnic > 0),
      nadciagaPaczki,
      nadciagaRozkazy: nadciaga?.rozkazy ? nadciaga.rozkazy.length : null,
      nadciagaNadawcy,
      naGraczy: paczkiOdGraczy(nadawcy, nadciagaNadawcy),
      dataNadciaga: nadciaga?.data || null,
      brakuje: postep.brakuje,
      procent: stoi === null ? null : Math.round(stoi / cel.paczek * 100),
      nadawcy,
      dataSkanu: skan?.data || null,
      widoczne: Boolean(skan?.widoczne)
    };
  }
  function modelAktywnosci(gracz, cele, wioski3, pelne, u) {
    const wyslane = cele.flatMap((c) => c.nadawcy.filter((n) => n.idGracza === gracz.id));
    const paczki2 = Math.round(wyslane.reduce((suma3, n) => suma3 + n.paczki, 0) * 10) / 10;
    const odGracza = cele.flatMap((c) => c.naGraczy.filter((n) => n.nick === gracz.nick));
    const rozkazy = odGracza.reduce((suma3, n) => suma3 + n.rozkazy, 0);
    const paczkiWDrodze = Math.round(odGracza.reduce((suma3, n) => suma3 + n.wDrodze, 0) * 10) / 10;
    const jego = wioski3.filter((w) => w.idGracza === gracz.id);
    const zOcena = jego.filter((w) => w.bezpieczna !== null);
    const naFroncie = zOcena.length > 0 && zOcena.every((w) => w.bezpieczna === false);
    const wDomu = jego.reduce((suma3, w) => suma3 + (w.paczkiWDomu ?? liczPaczki(w.wlasne, u.paczka)), 0);
    const razem = wDomu + paczki2 + paczkiWDrodze;
    let status = "brak danych";
    if (paczki2 > 0) status = "wysyła";
    else if (rozkazy > 0) status = "w drodze";
    else if (naFroncie) status = "front";
    else if (pelne) status = "ignoruje";
    return {
      czlon: gracz.czlon,
      nick: gracz.nick,
      id: gracz.id,
      paczki: paczki2,
      paczkiWDrodze,
      rozkazy,
      cele: odGracza.length,
      wDomu: Math.floor(wDomu * 10) / 10,
      udzial: razem > 0 && jego.length ? Math.round((paczki2 + paczkiWDrodze) / razem * 100) : null,
      status
    };
  }
  function zbudujObstawy(dane2, model, u) {
    const cele = Object.values(dane2.plan).map((cel) => modelCelu(cel, dane2, model.wioski, u));
    const pelne = cele.length > 0 && cele.every((c) => c.widoczne) && model.brakujaceCzlony.length === 0;
    const aktywnosc2 = model.gracze.map((g) => modelAktywnosci(g, cele, model.wioski, pelne, u));
    const znane = new Set(aktywnosc2.map((a) => a.id));
    const nasi = new Set(aktywnosc2.map((a) => a.nick));
    const obcy = /* @__PURE__ */ new Map();
    for (const cel of cele) {
      for (const n of cel.naGraczy) {
        if (nasi.has(n.nick) || n.idGracza && znane.has(n.idGracza)) continue;
        const wpis = obcy.get(n.nick) || { czlon: "?", nick: n.nick, id: n.idGracza, paczki: 0, paczkiWDrodze: 0, rozkazy: 0, cele: 0, wDomu: null, udzial: null, status: "wysyła" };
        wpis.paczki = Math.round((wpis.paczki + n.stoi) * 10) / 10;
        wpis.paczkiWDrodze = Math.round((wpis.paczkiWDrodze + n.wDrodze) * 10) / 10;
        wpis.rozkazy += n.rozkazy;
        wpis.cele += 1;
        obcy.set(n.nick, wpis);
      }
    }
    return {
      cele,
      aktywnosc: [...aktywnosc2, ...obcy.values()],
      pelne,
      wymaganePaczki: cele.reduce((s, c) => s + c.paczek, 0),
      stojacePaczki: Math.round(cele.reduce((s, c) => s + (c.stoi || 0), 0) * 10) / 10
    };
  }

  // src/rdzen/historia.js
  var dzien = (iso) => iso.slice(0, 10);
  var suma2 = (lista, funkcja) => lista.reduce((razem, element) => razem + funkcja(element), 0);
  var ludnosc2 = (wojsko2, jednostki) => wojsko2 ? jednostki.reduce((razem, j) => razem + (wojsko2[j] || 0) * (LUDNOSC[j] || 0), 0) : null;
  function migawkaCzlonu(czlon) {
    const gracze2 = {};
    for (const gracz of Object.values(czlon.gracze)) {
      const wioski3 = Object.values(gracz.wioski);
      const zWojskiem = wioski3.filter((w) => w.wlasne);
      gracze2[gracz.id] = {
        nick: gracz.nick,
        dostep: { ...gracz.dostep },
        wioski: wioski3.length || null,
        punkty: wioski3.length ? suma2(wioski3, (w) => w.punkty) : null,
        wojsko: zWojskiem.length ? Object.fromEntries(Object.keys(JEDNOSTKI).map((j) => [j, suma2(zWojskiem, (w) => w.wlasne[j] || 0)])) : null
      };
    }
    return { data: czlon.data, skanowal: czlon.skanowal, kompletny: Boolean(czlon.kompletny), gracze: gracze2 };
  }
  var KLUCZE_DOSTEPU = Object.keys(TRYBY);
  var KODY_DOSTEPU = { tak: "t", nie: "n", błąd: "b" };
  var WARTOSCI_DOSTEPU = { t: "tak", n: "nie", b: "błąd" };
  var JEDNOSTKI_KOLEJNO = Object.keys(JEDNOSTKI);
  function spakujGracza(g) {
    const dostep = KLUCZE_DOSTEPU.map((k) => KODY_DOSTEPU[g.dostep?.[k]] || "-").join("");
    return [g.nick, dostep, g.wioski, g.punkty, g.wojsko ? JEDNOSTKI_KOLEJNO.map((j) => g.wojsko[j] || 0) : null];
  }
  function rozpakujGracza(g) {
    if (!Array.isArray(g)) return g;
    const [nick, dostep, wioski3, punkty, wojsko2] = g;
    return {
      nick,
      dostep: Object.fromEntries(KLUCZE_DOSTEPU.map((k, i) => [k, WARTOSCI_DOSTEPU[dostep[i]]]).filter(([, v]) => v)),
      wioski: wioski3,
      punkty,
      wojsko: wojsko2 ? Object.fromEntries(JEDNOSTKI_KOLEJNO.map((j, i) => [j, wojsko2[i]])) : null
    };
  }
  var naHistorii = (historia2, funkcja) => Object.fromEntries(Object.entries(historia2 || {}).map(([tag, lista]) => [tag, lista.map((m) => ({
    ...m,
    gracze: Object.fromEntries(Object.entries(m.gracze).map(([id, g]) => [id, funkcja(g)]))
  }))]));
  var spakujHistorie = (historia2) => naHistorii(historia2, spakujGracza);
  var rozpakujHistorie = (historia2) => naHistorii(historia2, rozpakujGracza);
  function dopiszGotowaMigawke(dane2, tag, nowa) {
    if (!nowa || !nowa.data) return false;
    dane2.historia = dane2.historia || {};
    const lista = dane2.historia[tag] || [];
    const indeks = lista.findIndex((m) => dzien(m.data) === dzien(nowa.data));
    if (indeks >= 0) {
      const stara = lista[indeks];
      if (stara.data === nowa.data && stara.kompletny === nowa.kompletny) return false;
      const lepsza = nowa.kompletny && !stara.kompletny || nowa.kompletny === stara.kompletny && nowa.data >= stara.data;
      if (!lepsza) return false;
      lista.splice(indeks, 1);
    }
    lista.push(nowa);
    lista.sort((a, b) => a.data.localeCompare(b.data));
    dane2.historia[tag] = lista.slice(-MAKS_MIGAWEK);
    return true;
  }
  var dopiszMigawke = (dane2, czlon) => czlon.data ? dopiszGotowaMigawke(dane2, czlon.tag, migawkaCzlonu(czlon)) : false;
  function uzupelnijHistorie(dane2) {
    dane2.historia = dane2.historia || {};
    for (const czlon of Object.values(dane2.czlony || {})) dopiszMigawke(dane2, czlon);
    return dane2;
  }
  function migawkaBazowa(lista, okres, teraz2 = Date.now()) {
    if (!lista || lista.length < 2) return null;
    const starsze = [...lista].sort((a, b) => a.data.localeCompare(b.data)).slice(0, -1);
    if (okres === "poprzedni") return starsze[starsze.length - 1];
    const granica = teraz2 - Number(okres) * 864e5;
    const pasujace = starsze.filter((m) => new Date(m.data).getTime() <= granica);
    return pasujace.length ? pasujace[pasujace.length - 1] : null;
  }
  var roznica = (a, b) => a === null || a === void 0 || b === null || b === void 0 ? null : b - a;
  function porownajGracza(stary, nowy) {
    if (!stary || !nowy) return null;
    const wojsko2 = {};
    for (const j of Object.keys(JEDNOSTKI)) {
      wojsko2[j] = stary.wojsko && nowy.wojsko ? (nowy.wojsko[j] || 0) - (stary.wojsko[j] || 0) : null;
    }
    return {
      punkty: roznica(stary.punkty, nowy.punkty),
      wioski: roznica(stary.wioski, nowy.wioski),
      wojsko: wojsko2,
      deff: roznica(ludnosc2(stary.wojsko, JEDNOSTKI_DEFF), ludnosc2(nowy.wojsko, JEDNOSTKI_DEFF)),
      off: roznica(ludnosc2(stary.wojsko, JEDNOSTKI_OFF), ludnosc2(nowy.wojsko, JEDNOSTKI_OFF)),
      snob: stary.wojsko && nowy.wojsko ? (nowy.wojsko.snob || 0) - (stary.wojsko.snob || 0) : null
    };
  }
  function ocenRozwoj(porownanie, godziny, u) {
    if (!porownanie) return { ocena: null, powod: "brak wcześniejszej migawki" };
    const { punkty, wioski: wioski3, deff, off } = porownanie;
    if ([punkty, wioski3, deff, off].includes(null)) return { ocena: null, powod: "brak danych w jednym ze skanów" };
    const s = u.stagnacja;
    if (wioski3 < 0 || deff + off <= -s.straty) return { ocena: "straty", powod: null };
    if (godziny < s.dni * 24) return { ocena: null, powod: `odstęp krótszy niż ${s.dni} dni` };
    if (punkty < s.punkty && wioski3 <= 0 && deff <= 0 && off <= 0) return { ocena: "bez rozwoju", powod: null };
    if (off >= s.nowyOff) return { ocena: "nowy OFF", powod: null };
    return { ocena: "rozwija się", powod: null };
  }
  function porownajCzlony(dane2, model, u, okres, teraz2 = Date.now()) {
    const bazowe = Object.fromEntries(Object.entries(dane2.historia || {}).map(([tag, lista]) => [tag, migawkaBazowa(lista, okres, teraz2)]));
    return model.gracze.map((gracz) => {
      const czlon = dane2.czlony[gracz.czlon];
      const kandydatka = bazowe[gracz.czlon];
      const bazowa = kandydatka && czlon && kandydatka.data < czlon.data ? kandydatka : null;
      const nowa = czlon ? migawkaCzlonu(czlon).gracze[gracz.id] : null;
      const stara = bazowa ? bazowa.gracze[gracz.id] : null;
      const porownanie = porownajGracza(stara, nowa);
      const godziny = bazowa && czlon ? (new Date(czlon.data) - new Date(bazowa.data)) / 36e5 : null;
      const { ocena: ocena2, powod } = ocenRozwoj(porownanie, godziny, u);
      return {
        czlon: gracz.czlon,
        nick: gracz.nick,
        id: gracz.id,
        dataBazowa: bazowa ? bazowa.data : null,
        dataNowa: czlon ? czlon.data : null,
        godziny: godziny === null ? null : Math.round(godziny),
        nowyWCzlonie: Boolean(bazowa && !stara),
        punkty: porownanie ? porownanie.punkty : null,
        wioski: porownanie ? porownanie.wioski : null,
        deff: porownanie ? porownanie.deff : null,
        off: porownanie ? porownanie.off : null,
        snob: porownanie ? porownanie.snob : null,
        wojsko: porownanie ? porownanie.wojsko : null,
        ocena: ocena2,
        powod
      };
    });
  }
  function przebiegGracza(dane2, tag, idGracza) {
    return (dane2.historia?.[tag] || []).filter((m) => m.gracze[idGracza]).map((m) => {
      const g = m.gracze[idGracza];
      return {
        data: m.data,
        kompletny: m.kompletny,
        punkty: g.punkty,
        wioski: g.wioski,
        deff: ludnosc2(g.wojsko, JEDNOSTKI_DEFF),
        off: ludnosc2(g.wojsko, JEDNOSTKI_OFF),
        snob: g.wojsko ? g.wojsko.snob || 0 : null
      };
    });
  }
  var PRESETY_ZMIAN = {
    wszyscy: { nazwa: "Wszyscy", filtr: () => true },
    rozwoj: { nazwa: "Rozwija się", filtr: (w) => w.ocena === "rozwija się" || w.ocena === "nowy OFF" },
    bezRozwoju: { nazwa: "Bez rozwoju", filtr: (w) => w.ocena === "bez rozwoju" },
    straty: { nazwa: "Straty", filtr: (w) => w.ocena === "straty" },
    nowyOff: { nazwa: "Nowy OFF", filtr: (w) => w.ocena === "nowy OFF" },
    wzrostDeffu: { nazwa: "Wzrost deffu", filtr: (w) => w.deff !== null && w.deff > 0 },
    spadekWojska: { nazwa: "Spadek wojska", filtr: (w) => w.deff !== null && w.off !== null && w.deff + w.off < 0 },
    noweWioski: { nazwa: "Nowe wioski", filtr: (w) => w.wioski !== null && w.wioski > 0 },
    brakDanych: { nazwa: "Brak danych", filtr: (w) => w.ocena === null }
  };
  var OKRESY_ZMIAN = [
    ["poprzedni", "poprzedni skan"],
    ["1", "1 dzień"],
    ["3", "3 dni"],
    ["7", "7 dni"],
    ["14", "14 dni"],
    ["30", "30 dni"]
  ];

  // src/rdzen/pamiec.js
  var kluczDanych = (swiat) => `efekt_panel_dane_${swiat}`;
  var kluczUstawien = (swiat) => `efekt_panel_ustawienia_${swiat}`;
  function wczytajDane(swiat) {
    const tekst = localStorage.getItem(kluczDanych(swiat));
    const dane2 = {
      swiat,
      czlony: {},
      plan: {},
      obstawy: {},
      historia: {},
      dziennik: {},
      historiaObstaw: {},
      wysylki: {},
      puls: { migawki: [], nicki: {} },
      reguly: {},
      dolaczenia: {},
      ...tekst ? JSON.parse(tekst) : {}
    };
    dane2.historia = rozpakujHistorie(dane2.historia);
    return uzupelnijHistorie(dane2);
  }
  function zapiszDane(swiat, dane2) {
    const tekst = JSON.stringify({ ...dane2, historia: spakujHistorie(dane2.historia) });
    try {
      localStorage.setItem(kluczDanych(swiat), tekst);
    } catch (blad) {
      const mb = (tekst.length / 1048576).toFixed(1);
      throw new Error(`Pamięć przeglądarki jest pełna (dane panelu: ${mb} MB). Pobierz JSON i wyczyść stare dane. Nic nie zapisano. ${blad.name || ""}`.trim());
    }
    window.dispatchEvent(new Event("efekt:dane"));
  }
  function wyczyscDane(swiat) {
    localStorage.removeItem(kluczDanych(swiat));
    window.dispatchEvent(new Event("efekt:dane"));
  }
  function wczytajUstawienia(swiat) {
    const tekst = localStorage.getItem(kluczUstawien(swiat));
    const zapisane = tekst ? JSON.parse(tekst) : {};
    return {
      ...USTAWIENIA_DOMYSLNE,
      ...zapisane,
      stagnacja: { ...USTAWIENIA_DOMYSLNE.stagnacja, ...zapisane.stagnacja || {} },
      prosba: { ...USTAWIENIA_DOMYSLNE.prosba, ...zapisane.prosba || {} },
      wysylka: { ...USTAWIENIA_DOMYSLNE.wysylka, ...zapisane.wysylka || {} },
      selekcja: { aktywne: zapisane.selekcja?.aktywne || null }
    };
  }
  function zapiszUstawienia(swiat, ustawienia) {
    localStorage.setItem(kluczUstawien(swiat), JSON.stringify(ustawienia));
  }

  // src/mapa/indeks.js
  function zbudujIndeksMapy(swiat) {
    const dane2 = wczytajDane(swiat);
    const ustawienia = wczytajUstawienia(swiat);
    const model = zbudujModel(dane2, ustawienia, []);
    const { cele } = zbudujObstawy(dane2, model, ustawienia);
    const dataCzlonu = Object.fromEntries(Object.values(dane2.czlony).map((c) => [c.tag, c.data]));
    const wpisy = /* @__PURE__ */ new Map();
    for (const wioska of model.wioski) {
      wpisy.set(wioska.koord, { x: wioska.x, y: wioska.y, id: wioska.id, wioska, data: dataCzlonu[wioska.czlon], cel: null });
    }
    for (const cel of cele) {
      const [x, y] = cel.koord.split("|").map(Number);
      const wpis = wpisy.get(cel.koord) || { x, y, id: cel.id, wioska: null, data: null };
      wpisy.set(cel.koord, { ...wpis, cel });
    }
    const klucze = /* @__PURE__ */ new Map();
    for (const wpis of wpisy.values()) {
      klucze.set(String(wpis.id), wpis);
      klucze.set(`${wpis.x}${String(wpis.y).padStart(3, "0")}`, wpis);
    }
    return { wpisy: [...wpisy.values()], klucze, paczka: ustawienia.paczka };
  }

  // src/ui/ikony.js
  function baza() {
    return (window.image_base || "https://dspl.innogamescdn.com/asset/4b5375f7/graphic/").replace(/\/+$/, "/");
  }
  function obrazek(src, opis2) {
    const img = el("img", { src, alt: opis2, title: opis2, className: "ep-ikona" });
    img.style.cssText = "width:16px;height:16px;vertical-align:middle";
    img.addEventListener("error", () => img.replaceWith(document.createTextNode(opis2)));
    return img;
  }
  var ikonaJednostki = (id) => obrazek(`${baza()}unit/unit_${id}.webp`, JEDNOSTKI[id] || id);
  var ikonaBudynku = (id) => obrazek(`${baza()}buildings/${id}.png`, BUDYNKI[id] || id);

  // src/mapa/karty.js
  var STYL_KART = `
.efekt-karta { font: 11px Verdana, Arial, sans-serif; color: #2e2013; background: #fbf3e0; border-top: 2px solid #6b2a14; }
.efekt-karta .em-gora { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; padding: 5px 8px; background: #efe0c2; font-weight: bold; }
.efekt-karta .em-znak { padding: 1px 6px; border-radius: 999px; color: #fff; font-size: 10px; }
.efekt-karta .em-off { background: #b3261e; }
.efekt-karta .em-deff { background: #1f5fa8; }
.efekt-karta .em-mix { background: #8a5a00; }
.efekt-karta .em-data { margin-left: auto; font-weight: normal; color: #6d5a43; }
.efekt-karta .em-stare { color: #b3261e; }
.efekt-karta table { width: 100%; border-collapse: collapse; }
.efekt-karta td, .efekt-karta th { padding: 2px 3px; text-align: right; background: none; border: 0; font-size: 11px; }
.efekt-karta td:first-child, .efekt-karta th:first-child { text-align: left; color: #6d5a43; white-space: nowrap; }
.efekt-karta th { color: #4a2c17; border-bottom: 1px solid #e3d3b1; }
.efekt-karta tr.em-naglowek td { text-align: center; }
.efekt-karta .em-sekcja { padding: 4px 8px; border-top: 1px solid #e3d3b1; }
.efekt-karta .em-tytul { display: block; margin-bottom: 3px; color: #4a2c17; font-weight: bold; }
.efekt-karta .em-budynki { display: grid; grid-template-columns: repeat(7, 1fr); gap: 2px 4px; }
.efekt-karta .em-budynek { display: flex; align-items: center; gap: 2px; }
.efekt-karta .em-szary { color: #6d5a43; font-weight: normal; }
.efekt-karta .em-zle { color: #b3261e; }
.efekt-karta .em-dobrze { color: #1d6b2c; }
.efekt-karta .em-lista { display: flex; flex-wrap: wrap; gap: 3px 10px; margin-top: 3px; }
.efekt-karta .em-wiersz { display: flex; align-items: center; gap: 6px; flex-wrap: wrap; margin-top: 4px; }
.efekt-karta input.em-pole { width: 60px; padding: 2px 4px; border: 1px solid #c9ad7f; border-radius: 3px; font: inherit; }
.efekt-karta button.em-btn { padding: 2px 8px; border: 1px solid #8a6a3f; border-radius: 3px; background: #fff; color: #4a2c17; font: inherit; font-weight: bold; cursor: pointer; }
.efekt-karta button.em-btn:hover { background: #f4e4bc; }
.efekt-karta .em-bb { display: block; box-sizing: border-box; width: 100%; margin-top: 4px; font: 11px monospace; }
.efekt-karta button.em-maly { margin-left: 4px; padding: 0 5px; font-size: 10px; font-weight: normal; }
.efekt-karta .em-podglad { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; padding: 6px; border: 1px solid #c9ad7f; border-radius: 4px; background: #fffdf8; }
.efekt-karta .em-podglad textarea, .efekt-karta .em-podglad input.em-pole { width: 100%; box-sizing: border-box; }
.efekt-karta-szeroka { margin: 8px 0; border: 1px solid #c9ad7f; border-radius: 4px; overflow: hidden; }
.efekt-karta-szeroka .em-dwie { display: grid; grid-template-columns: 1fr 1fr; gap: 8px; }
@media (max-width: 700px) { .efekt-karta-szeroka .em-dwie { grid-template-columns: 1fr; } }
`;
  function znakTypu(typ) {
    return typ ? el("span", { className: `em-znak em-${typ}`, textContent: typ.toUpperCase() }) : null;
  }
  function tabelaWojsk(wioska, dodatkowe = []) {
    const zrodla = [...dodatkowe, ["Własne", wioska?.wlasne], ["W wiosce", wioska?.wWiosce], ["W drodze", wioska?.wDrodze]].filter(([, dane2]) => dane2);
    const jednostki = Object.keys(JEDNOSTKI).filter((j) => zrodla.some(([, dane2]) => dane2[j] > 0));
    if (!jednostki.length) return el("div", { className: "em-szary", textContent: "Brak danych o wojsku ze skanu." });
    const tabela2 = el("table");
    const glowa = tabela2.insertRow();
    glowa.className = "em-naglowek";
    glowa.insertCell();
    for (const j of jednostki) glowa.insertCell().appendChild(ikonaJednostki(j));
    for (const [nazwa, dane2] of zrodla) {
      const wiersz = tabela2.insertRow();
      wiersz.insertCell().textContent = nazwa;
      for (const j of jednostki) wiersz.insertCell().textContent = formatLiczby(dane2[j] || 0);
    }
    return tabela2;
  }
  function siatkaBudynkow(budynki2) {
    const pozycje = Object.keys(BUDYNKI).filter((id) => budynki2 && budynki2[id] !== void 0).map((id) => el("span", { className: "em-budynek" }, ikonaBudynku(id), String(budynki2[id])));
    return pozycje.length ? el("div", { className: "em-budynki" }, ...pozycje) : null;
  }

  // src/mapa/znaczniki.js
  var stylZnacznikow = `
.efekt-sektor { position: absolute; left: 0; top: 0; overflow: visible; pointer-events: none; z-index: 11; }
.efekt-sektor:has(.efekt-najechana) { z-index: 12; }
.efekt-pole { position: absolute; width: 0; height: 0; }
.efekt-stare { opacity: .55; }
.efekt-najechana { opacity: 1; z-index: 2; }
.efekt-znak { position: absolute; left: -8px; top: -8px; width: 16px; height: 16px; box-sizing: border-box; display: flex;
  align-items: center; justify-content: center; border-radius: 50%; background: rgba(30,18,8,.86);
  box-shadow: 0 1px 2px rgba(0,0,0,.65); transform: translate(var(--x), var(--y));
  transition: transform .3s cubic-bezier(.2, 1.6, .4, 1) var(--opoznienie), box-shadow .3s ease; }
.efekt-najechana .efekt-znak { transform: translate(var(--szer-x), var(--szer-y)) scale(1.7);
  box-shadow: 0 0 5px 1px rgba(255,255,255,.75); }
.efekt-znak img { position: relative; width: 11px !important; height: 11px !important; }
.efekt-typ-off { background: #b3261e; }
.efekt-typ-deff { background: #1f5fa8; }
.efekt-typ-mix { background: #8a5a00; }
.efekt-znak-obstawa { left: -9px; top: -9px; width: 18px; height: 18px;
  background: conic-gradient(#43a047 0 var(--gotowe), #4a9bf5 0 var(--razem), #6b1d18 0); }
.efekt-znak-obstawa::before { content: ''; position: absolute; inset: 3px; border-radius: 50%; background: #2a1a0c; }
.efekt-znak-obstawa img { width: 9px !important; height: 9px !important; }
.efekt-znak-nieznany { background: #6d5a43; }
.efekt-wartosc { position: absolute; right: -5px; bottom: -4px; padding: 0 2px; border-radius: 3px; background: #2a1a0c;
  color: #fff; font: bold 8px/10px Verdana, sans-serif; white-space: nowrap; }
.efekt-plan-pelny { background: #2e7d32; }
.efekt-plan-czesc { background: #c77700; }
.efekt-plan-brak { background: #b3261e; }
.efekt-plan-droga { background: #1f6fd0; }
.efekt-plan-nieznany { background: #6d5a43; }
.efekt-tylko-najazd { opacity: 0; transition: opacity .2s ease; }
.efekt-najechana .efekt-tylko-najazd { opacity: 1; }
`;
  var JEDNOSTKA_TYPU = { off: "axe", deff: "spear", mix: "sword" };
  var NAZWA_TYPU = { off: "OFF", deff: "DEFF", mix: "MIX" };
  var KAT_STARTU = -135;
  var OPOZNIENIE_MS2 = 25;
  var PROMIEN = [0.55, 0.62];
  var PROMIEN_SZEROKI = [0.95, 1.2];
  function stanPlanu(cel) {
    const { stan, procentRazem } = cel.postep;
    if (stan === "brak danych") return "nieznany";
    if (stan === "pelna") return "pelny";
    if (stan === "domknie sie") return "droga";
    return procentRazem >= 50 ? "czesc" : "brak";
  }
  function czyStare(data) {
    return Boolean(data) && (Date.now() - new Date(data).getTime()) / 36e5 > STARE_DANE_H;
  }
  function liczbaSzlachty(wioska) {
    return wioska.wWiosce?.snob ?? wioska.wlasne?.snob ?? 0;
  }
  function znak(klasa, ikona, wartosc2, klasaWartosci = "") {
    const napis = wartosc2 === void 0 ? null : el("span", { className: `efekt-wartosc ${klasaWartosci}`.trim(), textContent: String(wartosc2) });
    return el("div", { className: `efekt-znak ${klasa}`.trim() }, ikona, napis);
  }
  function znakObstawy(cel) {
    const { procentGotowe, procentWDrodze, procentRazem, stan } = cel.postep;
    const stanKoloru = stanPlanu(cel);
    const tekst = procentRazem === null ? "?" : `${procentRazem}%`;
    const ikona = obrazek(`${baza()}unit/def.png`, "Obstawa");
    const wynik = znak(`efekt-znak-obstawa ${stan === "brak danych" ? "efekt-znak-nieznany" : ""}`, ikona, tekst, `efekt-plan-${stanKoloru}`);
    wynik.style.setProperty("--gotowe", `${Math.min(100, procentGotowe || 0)}%`);
    wynik.style.setProperty("--razem", `${Math.min(100, (procentGotowe || 0) + (procentWDrodze || 0))}%`);
    return wynik;
  }
  function znakiWioski({ wioska, cel }, paczka) {
    const znaki = [];
    if (cel) znaki.push(znakObstawy(cel));
    if (wioska?.typ) {
      znaki.push(znak(`efekt-typ-${wioska.typ}`, ikonaJednostki(JEDNOSTKA_TYPU[wioska.typ]), NAZWA_TYPU[wioska.typ], "efekt-tylko-najazd"));
    }
    if (!wioska) return znaki;
    const szlachta = liczbaSzlachty(wioska);
    if (szlachta > 0) znaki.push(znak("efekt-znak-szlachta", ikonaJednostki("snob"), szlachta));
    const mur = wioska.budynki?.wall;
    if (mur !== void 0) znaki.push(znak("efekt-znak-mur", ikonaBudynku("wall"), mur));
    const obce = liczPaczki(wioska.wsparcie, paczka);
    if (!cel && obce > 0) znaki.push(znak("efekt-znak-wsparcie", obrazek(`${baza()}command/support.png`, "Wsparcie"), formatLiczby(obce)));
    return znaki;
  }
  function ulozWOkregu(znaki, szer, wys) {
    znaki.forEach((znakIkony, numer) => {
      const kat = (KAT_STARTU + 360 * numer / znaki.length) * Math.PI / 180;
      const punkt = ([rx, ry]) => [Math.cos(kat) * szer * rx, Math.sin(kat) * wys * ry].map((v) => `${Math.round(v)}px`);
      const [x, y] = punkt(PROMIEN);
      const [szerX, szerY] = punkt(PROMIEN_SZEROKI);
      znakIkony.style.setProperty("--x", x);
      znakIkony.style.setProperty("--y", y);
      znakIkony.style.setProperty("--szer-x", szerX);
      znakIkony.style.setProperty("--szer-y", szerY);
      znakIkony.style.setProperty("--opoznienie", `${numer * OPOZNIENIE_MS2}ms`);
    });
  }
  function rysujSektor(sektor, indeks) {
    const mapa = window.TWMap.map;
    if (!sektor || typeof sektor.appendElement !== "function") return;
    sektor.efektKorzen?.remove();
    const [szer, wys] = mapa.scale || [53, 38];
    const rozmiar = Number(mapa.sectorSize) || 5;
    const korzen = el("div", { className: "efekt-sektor" });
    korzen.style.width = `${szer * rozmiar}px`;
    korzen.style.height = `${wys * rozmiar}px`;
    for (const wpis of indeks.wpisy) {
      const { x, y, data } = wpis;
      if (x < sektor.x || x >= sektor.x + rozmiar || y < sektor.y || y >= sektor.y + rozmiar) continue;
      const znaki = znakiWioski(wpis, indeks.paczka);
      if (!znaki.length) continue;
      ulozWOkregu(znaki, szer, wys);
      const pole2 = el("div", { className: `efekt-pole ${czyStare(data) ? "efekt-stare" : ""}`.trim() }, ...znaki);
      pole2.dataset.efektKoord = `${x}|${y}`;
      pole2.style.left = `${(x - sektor.x + 0.5) * szer}px`;
      pole2.style.top = `${(y - sektor.y + 0.5) * wys}px`;
      korzen.appendChild(pole2);
    }
    sektor.efektKorzen = korzen;
    if (korzen.childElementCount) sektor.appendElement(korzen, 0, 0);
  }
  function podswietl(koord) {
    document.querySelectorAll(".efekt-najechana").forEach((pole2) => pole2.classList.remove("efekt-najechana"));
    if (koord) document.querySelector(`[data-efekt-koord="${koord}"]`)?.classList.add("efekt-najechana");
  }
  function sledzKursor() {
    let ostatni = null;
    document.addEventListener("mousemove", (zdarzenie) => {
      const mapa = window.TWMap.map;
      const naMapie = zdarzenie.target?.closest?.("#map");
      const pole2 = naMapie ? mapa.coordByEvent?.(zdarzenie) : null;
      const koord = pole2 ? `${pole2[0]}|${pole2[1]}` : null;
      if (koord === ostatni) return;
      ostatni = koord;
      podswietl(koord);
    }, true);
  }
  function rysujZnaczniki(indeks) {
    const mapa = window.TWMap;
    const uchwyt = mapa.mapHandler || mapa.map?.handler;
    const widoczne = () => Object.values(mapa.map?._visibleSectors || {});
    if (uchwyt && typeof uchwyt.spawnSector === "function") {
      const oryginal = uchwyt.spawnSector;
      uchwyt.spawnSector = function opakowanie(dane2, sektor) {
        const wynik = oryginal.apply(this, arguments);
        rysujSektor(sektor, indeks());
        return wynik;
      };
    }
    const odswiez = () => widoczne().forEach((sektor) => rysujSektor(sektor, indeks()));
    odswiez();
    return { odswiez };
  }

  // src/mapa/dymek.js
  var STYL = `${STYL_KART}
#efekt-mapa { width: 300px; }
`;
  function sekcjaPlanu(cel) {
    const najwieksi = cel.naGraczy.slice(0, 3).map((n) => `${n.nick} ${formatLiczby(n.razem)}`).join(", ");
    return el(
      "div",
      { className: "em-sekcja" },
      liniaObstawy(cel.postep),
      najwieksi ? el("div", { textContent: najwieksi }) : null
    );
  }
  function tresc({ wioska, cel, data }) {
    const gora = el("div", { className: "em-gora" });
    if (wioska?.typ) gora.appendChild(znakTypu(wioska.typ));
    gora.appendChild(document.createTextNode(wioska ? `${wioska.nick} (${wioska.czlon})` : `${cel.nick}`));
    if (data) gora.appendChild(el("span", { className: "em-data", textContent: formatDaty(data) }));
    const pudelko = el("div", { id: "efekt-mapa", className: "efekt-karta" }, gora);
    if (cel) pudelko.appendChild(sekcjaPlanu(cel));
    if (wioska) {
      pudelko.appendChild(el("div", { className: "em-sekcja" }, tabelaWojsk(wioska)));
      const siatka = siatkaBudynkow(wioska.budynki);
      if (siatka) pudelko.appendChild(el("div", { className: "em-sekcja" }, siatka));
    }
    return pudelko;
  }
  function pokaz(indeks, argumenty) {
    const wioska = argumenty.find((a) => a && typeof a === "object" && (a.id || a.xy));
    const dymek = document.querySelector("#map_popup");
    if (!wioska || !dymek) return;
    dymek.querySelector("#efekt-mapa")?.remove();
    const wpis = indeks.klucze.get(String(wioska.id)) || indeks.klucze.get(String(wioska.xy));
    if (wpis) {
      dymek.prepend(tresc(wpis));
      window.TWMap.popup.calcPos?.();
    }
  }
  function podepnij(swiat) {
    const mapa = window.TWMap;
    const popup = mapa && mapa.popup;
    if (!popup) return false;
    if (popup.efektPodpiety) return true;
    popup.efektPodpiety = true;
    document.head.appendChild(el("style", { id: "efekt-mapa-styl", textContent: STYL + stylZnacznikow }));
    let indeks = zbudujIndeksMapy(swiat);
    const znaczniki = rysujZnaczniki(() => indeks);
    window.addEventListener("efekt:dane", () => {
      indeks = zbudujIndeksMapy(swiat);
      znaczniki.odswiez();
    });
    sledzKursor();
    for (const nazwa of ["displayForVillage", "receivedPopupInformationForSingleVillage"]) {
      const oryginal = popup[nazwa];
      if (typeof oryginal !== "function") continue;
      popup[nazwa] = function opakowanie(...argumenty) {
        const wynik = oryginal.apply(this, argumenty);
        window.setTimeout(() => pokaz(indeks, argumenty), 0);
        return wynik;
      };
    }
    return true;
  }
  function uruchomMape(swiat) {
    if (podepnij(swiat)) return;
    let proby = 0;
    const zegar = window.setInterval(() => {
      proby += 1;
      if (podepnij(swiat) || proby > 20) window.clearInterval(zegar);
    }, 500);
  }

  // src/rdzen/prosba.js
  var paczki = (x) => x === null || x === void 0 ? "brak danych" : formatLiczby(x);
  function wypelnijSzablon(szablon, pola) {
    return szablon.replace(/\{(\w+)\}/g, (calosc, klucz2) => klucz2 in pola ? String(pola[klucz2]) : calosc);
  }
  function zbudujProsbe(u, cel, gracz) {
    const uzupelnic = gracz.uzupelnic || cel.brakuje || 0;
    const paczkiTekst2 = uzupelnic === 1 ? "1 paczkę" : `${formatLiczby(uzupelnic)} paczki`;
    const powod = gracz.powod === "strata" ? `strata ${formatLiczby(gracz.strata)} paczki względem stanu wzorcowego` : gracz.powod === "niepełna paczka" ? "niepełna paczka" : "brak do planu wioski";
    const pola = {
      gracz: gracz.nick,
      koord: cel.koord,
      wlasciciel: cel.nick,
      plan: formatLiczby(cel.paczek),
      stoi: paczki(cel.stoi),
      brakuje: paczki(cel.brakuje),
      odGracza: paczki(gracz.paczkiTeraz),
      uzupelnic: paczkiTekst2,
      przyklad: przykladJednostek(uzupelnic, u.paczka) || "wg ustaleń",
      powod
    };
    return {
      do: gracz.nick,
      temat: wypelnijSzablon(u.prosba.temat, pola),
      tresc: wypelnijSzablon(u.prosba.tresc, pola),
      uzupelnic
    };
  }
  function urlProsby(prosba, { origin = location.origin, village = window.game_data?.village?.id } = {}) {
    const url2 = new URL("/game.php", origin);
    if (village) url2.searchParams.set("village", village);
    url2.searchParams.set("screen", "mail");
    url2.searchParams.set("mode", "new");
    const czesc = new URLSearchParams({ to: prosba.do, subject: prosba.temat, message: prosba.tresc });
    url2.hash = `efekt&${czesc.toString()}`;
    return url2.toString();
  }
  function czytajProsbeZAdresu(hash) {
    if (!hash || !hash.startsWith("#efekt&")) return null;
    const czesc = new URLSearchParams(hash.slice("#efekt&".length));
    const prosba = { do: czesc.get("to") || "", temat: czesc.get("subject") || "", tresc: czesc.get("message") || "" };
    return prosba.do || prosba.temat || prosba.tresc ? prosba : null;
  }
  function otworzProsbe(prosba) {
    const okno = window.open(urlProsby(prosba), "_blank", "noopener");
    return Boolean(okno);
  }
  function wypelnijFormularz(dokument, prosba) {
    const pola = [
      ["do", dokument.querySelector('input[name="to"], #to')],
      ["temat", dokument.querySelector('input[name="subject"], #subject')],
      ["tresc", dokument.querySelector('textarea[name="text"], #message, textarea[name="message"]')]
    ];
    const wypelnione = [];
    for (const [klucz2, pole2] of pola) {
      if (!pole2 || !prosba[klucz2]) continue;
      pole2.value = prosba[klucz2];
      pole2.dispatchEvent(new Event("input", { bubbles: true }));
      pole2.dispatchEvent(new Event("change", { bubbles: true }));
      wypelnione.push(klucz2);
    }
    return wypelnione;
  }

  // src/mapa/nowaWiadomosc.js
  function uruchomNowaWiadomosc({ dokument = document, hash = location.hash } = {}) {
    const prosba = czytajProsbeZAdresu(hash);
    if (!prosba) return null;
    if (!dokument.head.querySelector("#efekt-wiadomosc-styl")) dokument.head.appendChild(el("style", { id: "efekt-wiadomosc-styl", textContent: STYL_KART }));
    const wypelnione = wypelnijFormularz(dokument, prosba);
    const nazwy = { do: "odbiorca", temat: "temat", tresc: "treść" };
    const karta2 = el("div", { id: "efekt-wiadomosc", className: "efekt-karta efekt-karta-szeroka" });
    if (wypelnione.length === 3) {
      karta2.appendChild(el("div", { className: "em-gora", textContent: "Panel wypełnił odbiorcę, temat i treść. Sprawdź je i sam kliknij Wyślij. Panel niczego nie wysyła." }));
    } else {
      karta2.appendChild(el("div", { className: "em-gora em-zle", textContent: `Panel nie znalazł wszystkich pól formularza${wypelnione.length ? ` (wypełnione: ${wypelnione.map((p) => nazwy[p]).join(", ")})` : ""}. Skopiuj brakujące ręcznie:` }));
      karta2.appendChild(el("div", { className: "em-sekcja" }, el("b", { textContent: `Do: ${prosba.do}` }), el("br"), el("b", { textContent: `Temat: ${prosba.temat}` })));
      karta2.appendChild(el("div", { className: "em-sekcja" }, el("textarea", { readOnly: true, rows: 8, style: "width:100%", value: prosba.tresc })));
    }
    const kotwica = dokument.querySelector("#content_value") || dokument.body;
    kotwica.prepend(karta2);
    return karta2;
  }

  // src/rdzen/gra.js
  function czekaj(ms) {
    return new Promise((gotowe) => window.setTimeout(gotowe, ms));
  }
  function urlGry(parametry) {
    const url2 = new URL(location.href);
    url2.search = "";
    url2.hash = "";
    url2.searchParams.set("village", window.game_data.village.id);
    for (const [klucz2, wartosc2] of Object.entries(parametry)) url2.searchParams.set(klucz2, wartosc2);
    return url2.toString();
  }
  function urlTrybu(tryb, idGracza) {
    const obecny = new URL(location.href);
    const url2 = new URL(location.href);
    url2.search = "";
    url2.searchParams.set("village", window.game_data.village.id);
    url2.searchParams.set("screen", "ally");
    url2.searchParams.set("mode", tryb);
    if (idGracza) url2.searchParams.set("player_id", idGracza);
    if (obecny.searchParams.has("t")) url2.searchParams.set("t", obecny.searchParams.get("t"));
    return url2.toString();
  }
  async function pobierzTekst(url2, opoznienie = OPOZNIENIE_MS, headers = {}) {
    for (let proba = 0; proba <= PROBY_429; proba += 1) {
      const odpowiedz = await fetch(url2, { credentials: "same-origin", redirect: "manual", headers });
      if (odpowiedz.status === 429) {
        await czekaj(opoznienie * 4 * (proba + 1));
        continue;
      }
      if (odpowiedz.type === "opaqueredirect") return null;
      if (!odpowiedz.ok) throw new Error(`Gra zwróciła błąd HTTP ${odpowiedz.status}.`);
      return odpowiedz.text();
    }
    throw new Error("Gra ogranicza zapytania (HTTP 429). Spróbuj później.");
  }
  async function pobierzStrone(url2, opoznienie = OPOZNIENIE_MS) {
    const tekst = await pobierzTekst(url2, opoznienie);
    if (tekst === null) return null;
    const strona = new DOMParser().parseFromString(tekst, "text/html");
    if (strona.querySelector(CAPTCHA)) {
      const blad = new Error("Gra poprosiła o CAPTCHA. Rozwiąż ją i uruchom skan ponownie.");
      blad.captcha = true;
      throw blad;
    }
    return strona;
  }

  // src/rdzen/dziennikPlemienia.js
  var WPIS = /^(\d\d)\.(\d\d)\.(\d\d):(\d\d)\s+(.+) przyjął zaproszenie do plemienia\.$/;
  var DATA = /^(\d\d)\.(\d\d)\.(\d\d):(\d\d)\s/;
  var NA_STRONIE = 15;
  var MAKS_STRON = 8;
  var DOBA = 864e5;
  function naDate([dzien3, miesiac, godzina2, minuta], teraz2) {
    const rok = new Date(teraz2).getFullYear();
    const data = new Date(rok, Number(miesiac) - 1, Number(dzien3), Number(godzina2), Number(minuta));
    if (data.getTime() > teraz2 + DOBA) data.setFullYear(rok - 1);
    return data;
  }
  function czytajDziennik(strona, teraz2 = Date.now()) {
    const wpisy = [...strona.querySelectorAll("tr")].filter((w) => w.cells.length === 2).map((w) => `${w.cells[0].textContent.trim()} ${w.cells[1].textContent.replace(/\s+/g, " ").trim()}`).filter((t) => DATA.test(t));
    const dolaczenia = wpisy.map((t) => WPIS.exec(t)).filter(Boolean).map((m) => ({ nick: m[5].trim(), data: naDate(m.slice(1, 5), teraz2).toISOString() }));
    const ostatni = wpisy.length ? DATA.exec(wpisy[wpisy.length - 1]).slice(1, 5) : null;
    return { dolaczenia, najstarszy: ostatni ? naDate(ostatni, teraz2).getTime() : null, pelna: wpisy.length >= NA_STRONIE };
  }
  async function wczytajDolaczenia(dane2, dni2, { opoznienie = OPOZNIENIE_MS, teraz: teraz2 = Date.now() } = {}) {
    dane2.dolaczenia = dane2.dolaczenia || {};
    const granica = teraz2 - dni2 * DOBA;
    for (let numer = 0; numer < MAKS_STRON; numer += 1) {
      const strona = await pobierzStrone(urlGry({ screen: "ally", mode: "overview", filter: 3, start: numer * NA_STRONIE }), opoznienie);
      if (!strona) return;
      const { dolaczenia, najstarszy, pelna } = czytajDziennik(strona, teraz2);
      for (const { nick, data } of dolaczenia) if (!dane2.dolaczenia[nick] || dane2.dolaczenia[nick] < data) dane2.dolaczenia[nick] = data;
      if (!pelna || najstarszy === null || najstarszy < granica) return;
      await czekaj(opoznienie);
    }
  }
  function polaczDolaczenia(obecne, nowe) {
    let dodane = 0;
    for (const [nick, data] of Object.entries(nowe || {})) {
      if (!obecne[nick] || obecne[nick] < data) {
        obecne[nick] = data;
        dodane += 1;
      }
    }
    return dodane;
  }
  function blokadaGracza(ruchy2, idGracza) {
    return ruchy2.find((r) => r.id === String(idGracza) && r.blokadaTrwa) || null;
  }
  function blokadaCelu(dane2, ruchy2, { nick, idGracza }, dni2, teraz2 = Date.now()) {
    const dolaczyl = dane2.dolaczenia?.[nick];
    if (dolaczyl) {
      const koniec = new Date(dolaczyl).getTime() + dni2 * DOBA;
      if (koniec > teraz2) return { koniecBlokady: new Date(koniec).toISOString(), dokladna: true };
    }
    return blokadaGracza(ruchy2, idGracza);
  }

  // src/rdzen/puls.js
  var PUNKTY = 0;
  var WIOSKI = 1;
  var RA = 2;
  var RO = 3;
  var RW = 4;
  var GODZINA = 36e5;
  var ODSWIEZANIE_MS = GODZINA;
  var dzien2 = (data) => data.slice(0, 10);
  function migawkaPulsu({ plemiona, gracze: gracze2 }, ranking4, tagi, teraz2 = /* @__PURE__ */ new Date()) {
    const czlony = Object.fromEntries(tagi.map((tag) => [tag, {}]));
    const nicki = {};
    for (const [id, gracz] of gracze2) {
      const czlon = czlony[plemiona.get(gracz.idPlemienia)];
      if (!czlon) continue;
      czlon[id] = [gracz.punkty, gracz.wioski, ranking4.ra.get(id) || 0, ranking4.ro.get(id) || 0, ranking4.rw.get(id) || 0];
      nicki[id] = gracz.nick;
    }
    return { migawka: { data: teraz2.toISOString(), czlony }, nicki };
  }
  function wstaw(lista, migawka) {
    const numer = lista.findIndex((m) => dzien2(m.data) === dzien2(migawka.data));
    if (numer < 0) lista.push(migawka);
    else if (lista[numer].data < migawka.data) lista[numer] = migawka;
    else return false;
    lista.sort((a, b) => a.data.localeCompare(b.data));
    lista.splice(0, Math.max(0, lista.length - MAKS_MIGAWEK_PULSU));
    return true;
  }
  function dopiszPuls(dane2, { migawka, nicki }) {
    dane2.puls = dane2.puls || { migawki: [], nicki: {} };
    const ostatnia = dane2.puls.migawki[dane2.puls.migawki.length - 1];
    if (ostatnia && new Date(migawka.data) - new Date(ostatnia.data) < ODSWIEZANIE_MS) return false;
    if (!Object.values(migawka.czlony).some((czlon) => Object.keys(czlon).length)) return false;
    Object.assign(dane2.puls.nicki, nicki);
    return wstaw(dane2.puls.migawki, migawka);
  }
  function polaczPuls(obecny, nowy) {
    if (!nowy?.migawki) return 0;
    Object.assign(obecny.nicki, { ...nowy.nicki, ...obecny.nicki });
    return nowy.migawki.filter((migawka) => wstaw(obecny.migawki, migawka)).length;
  }
  function czlonyGraczy(migawka) {
    const wynik = /* @__PURE__ */ new Map();
    for (const [tag, gracze2] of Object.entries(migawka.czlony)) {
      for (const [id, stan] of Object.entries(gracze2)) wynik.set(id, { tag, stan });
    }
    return wynik;
  }
  function plemieTeraz(slownik, id) {
    if (!slownik) return null;
    const gracz = slownik.gracze.get(id);
    if (!gracz) return "konto usunięte";
    return gracz.idPlemienia ? slownik.plemiona.get(gracz.idPlemienia) : "bez plemienia";
  }
  function ruchyCzlonow(puls, u, slownik = null, teraz2 = Date.now()) {
    const migawki = puls?.migawki || [];
    const ostatni = migawki.length ? czlonyGraczy(migawki[migawki.length - 1]) : /* @__PURE__ */ new Map();
    const ruchy2 = [];
    for (let numer = 1; numer < migawki.length; numer += 1) {
      const stara = czlonyGraczy(migawki[numer - 1]);
      const nowa = czlonyGraczy(migawki[numer]);
      for (const id of /* @__PURE__ */ new Set([...stara.keys(), ...nowa.keys()])) {
        const z = stara.get(id)?.tag || null;
        const na = nowa.get(id)?.tag || null;
        if (z === na) continue;
        let rodzaj = "przeniósł się";
        if (!z) rodzaj = "dołączył";
        else if (!na) rodzaj = "odszedł";
        const po = migawki[numer].data;
        const koniec = na ? new Date(new Date(po).getTime() + u.blokadaDni * 864e5).toISOString() : null;
        ruchy2.push({
          id,
          nick: puls.nicki[id] || id,
          rodzaj,
          czlon: na || z,
          z,
          na: na || plemieTeraz(slownik, id),
          odDaty: migawki[numer - 1].data,
          doDaty: po,
          koniecBlokady: koniec,
          blokadaTrwa: Boolean(koniec) && new Date(koniec).getTime() > teraz2 && ostatni.get(id)?.tag === na
        });
      }
    }
    return ruchy2.sort((a, b) => b.doDaty.localeCompare(a.doDaty));
  }
  function bilansCzlonow(ruchy2) {
    const bilans = {};
    const licz = (tag, pole2) => {
      if (!tag) return;
      bilans[tag] = bilans[tag] || { doszlo: 0, ubylo: 0 };
      bilans[tag][pole2] += 1;
    };
    for (const ruch of ruchy2) {
      if (ruch.rodzaj !== "odszedł") licz(ruch.czlon, "doszlo");
      if (ruch.z) licz(ruch.z, "ubylo");
    }
    return bilans;
  }
  function ocenPuls(w, pelnyOkres, u) {
    if (w.punkty === null) return null;
    if (w.walka >= u.stagnacja.walka) return "walczy";
    if (w.punkty >= u.stagnacja.punkty || w.wioski > 0) return "rozwija się";
    if (w.wioski < 0) return "traci wioski";
    return pelnyOkres ? "bez ruchu" : null;
  }
  function rankingCzlonow(puls, u, okres, teraz2 = Date.now()) {
    const migawki = puls?.migawki || [];
    if (!migawki.length) return [];
    const nowa = migawki[migawki.length - 1];
    const baza2 = migawkaBazowa(migawki, okres, teraz2) || (migawki.length > 1 ? migawki[0] : null);
    const bazowi = baza2 ? czlonyGraczy(baza2) : /* @__PURE__ */ new Map();
    const godziny = baza2 ? (new Date(nowa.data) - new Date(baza2.data)) / GODZINA : null;
    const pelnyOkres = godziny !== null && godziny >= u.stagnacja.dni * 24;
    return [...czlonyGraczy(nowa)].map(([id, { tag, stan }]) => {
      const stary = bazowi.get(id)?.stan || null;
      const roznica2 = (pole2) => stary ? stan[pole2] - stary[pole2] : null;
      const wiersz = {
        id,
        nick: puls.nicki[id] || id,
        czlon: tag,
        punktyTeraz: stan[PUNKTY],
        wioskiTeraz: stan[WIOSKI],
        raTeraz: stan[RA],
        roTeraz: stan[RO],
        rwTeraz: stan[RW],
        punkty: roznica2(PUNKTY),
        wioski: roznica2(WIOSKI),
        ra: roznica2(RA),
        ro: roznica2(RO),
        rw: roznica2(RW),
        walka: stary ? roznica2(RA) + roznica2(RO) + roznica2(RW) : null,
        dataBazowa: stary ? baza2.data : null,
        pelnyOkres,
        nowy: Boolean(baza2) && !stary
      };
      return { ...wiersz, ocena: ocenPuls(wiersz, pelnyOkres, u) };
    });
  }
  var PRESETY_RANKINGU = {
    wszyscy: { nazwa: "Wszyscy", filtr: () => true },
    walczy: { nazwa: "Walczy", filtr: (w) => w.ocena === "walczy" },
    rozwoj: { nazwa: "Rozwija się", filtr: (w) => w.ocena === "rozwija się" },
    bezRuchu: { nazwa: "Bez ruchu", filtr: (w) => w.ocena === "bez ruchu" },
    traci: { nazwa: "Traci wioski", filtr: (w) => w.ocena === "traci wioski" },
    brakDanych: { nazwa: "Brak danych", filtr: (w) => w.ocena === null }
  };

  // src/rdzen/rozkazy.js
  function czytajRozkaz2(tekst) {
    try {
      const jednostki = JSON.parse(tekst)?.response?.units;
      if (!jednostki) return null;
      return Object.fromEntries(Object.entries(jednostki).map(([id, { count }]) => [id, Number(count)]).filter(([, ile]) => ile > 0));
    } catch {
      return null;
    }
  }
  async function pobierzRozkaz(id, opoznienie) {
    const url2 = new URL(location.href);
    url2.search = "";
    url2.searchParams.set("village", window.game_data.village.id);
    url2.searchParams.set("screen", "info_command");
    url2.searchParams.set("ajax", "details");
    url2.searchParams.set("id", id);
    const tekst = await pobierzTekst(url2.toString(), opoznienie, { "TribalWars-Ajax": "1", "X-Requested-With": "XMLHttpRequest" });
    return tekst === null ? null : czytajRozkaz2(tekst);
  }
  function dopiszZnaneRozkazy(rozkazy, stare) {
    const znane = new Map((stare || []).filter((r) => r.jednostki).map((r) => [r.id, r.jednostki]));
    return rozkazy?.map((r) => r.jednostki || !znane.has(r.id) ? r : { ...r, jednostki: znane.get(r.id) }) ?? rozkazy;
  }

  // src/rdzen/stronaWioski.js
  var zaokraglij2 = (x) => Math.round(x * 10) / 10;
  function koordZeStrony(dokument) {
    for (const selektor of ["#content_value h2", "#content_value table.vis", "#content_value"]) {
      const tekst = dokument.querySelector(selektor)?.textContent || "";
      const koord = /(\d{1,3})\|(\d{1,3})/.exec(tekst);
      if (koord) return `${koord[1]}|${koord[2]}`;
    }
    return null;
  }
  function rozbijNaGraczy(nadawcy) {
    const naGraczy = /* @__PURE__ */ new Map();
    for (const n of nadawcy) {
      const wpis = naGraczy.get(n.nick) || { nick: n.nick, idGracza: n.idGracza, paczki: 0, wioski: 0 };
      wpis.paczki = zaokraglij2(wpis.paczki + n.paczki);
      wpis.wioski += 1;
      naGraczy.set(n.nick, wpis);
    }
    return [...naGraczy.values()].sort((a, b) => b.paczki - a.paczki);
  }
  function modelNadciagajacych(nadciaga, paczka) {
    const { suma: suma3 = null, rozkazy = null } = nadciaga || {};
    return {
      suma: suma3,
      paczki: suma3 ? liczPaczki(suma3, paczka) : null,
      rozkazy,
      naGraczy: rozbijRozkazy(rozkazy, paczka)
    };
  }
  function daneWioski(dane2, ustawienia, { id, koord = null, dokument = null, wlasnyNick = null, teraz: teraz2 = Date.now() }) {
    const model = zbudujModel(dane2, ustawienia, []);
    const wioska = model.wioski.find((w) => String(w.id) === String(id)) || (koord ? model.wioski.find((w) => w.koord === koord) : null) || null;
    const cel = Object.values(dane2.plan).find((c) => String(c.id) === String(id)) || (koord ? dane2.plan[koord] : null) || null;
    const koordWioski = wioska?.koord || cel?.koord || koord || null;
    const wsparcie = dokument ? czytajWsparcie(dokument, koordWioski) : { widoczne: false, wiersze: [], wlasne: null };
    const nadawcy = wsparcie.wiersze.map((w) => ({ ...w, paczki: liczPaczki(w.jednostki, ustawienia.paczka) })).sort((a, b) => b.paczki - a.paczki);
    const odczyt = dokument ? czytajNadciagajace(dokument, { wlasnyNick }) : null;
    const zapisane = koordWioski ? dane2.obstawy[koordWioski]?.nadciaga?.rozkazy : null;
    const nadciaga = modelNadciagajacych(odczyt ? { ...odczyt, rozkazy: dopiszZnaneRozkazy(odczyt.rozkazy, zapisane) } : null, ustawienia.paczka);
    let stoi = null;
    let zrodloStoi = null;
    if (wsparcie.widoczne) {
      stoi = zaokraglij2(nadawcy.reduce((suma3, n) => suma3 + n.paczki, 0));
      zrodloStoi = "strona";
    } else if (wioska?.wsparcie) {
      stoi = liczPaczki(wioska.wsparcie, ustawienia.paczka);
      zrodloStoi = "skan obrony";
    }
    const dataSkanu = wioska ? dane2.czlony[wioska.czlon]?.data || null : null;
    const rekord = wsparcie.widoczne ? { widoczne: true, wiersze: nadawcy, data: new Date(teraz2).toISOString(), nadciaga: { suma: nadciaga.suma, rozkazy: nadciaga.rozkazy } } : koordWioski ? dane2.obstawy[koordWioski] || null : null;
    const straty = koordWioski ? porownajZeWzorcem(historiaWioski(dane2, koordWioski), rekord, ustawienia.paczka) : null;
    const wDrodze2 = wioska?.wDrodze ? liczPaczki(wioska.wDrodze, ustawienia.paczka) : null;
    const postep = cel ? postepObstawy(cel.paczek, stoi, nadciaga.paczki ?? wDrodze2) : null;
    return {
      id: String(id),
      koord: koordWioski,
      wioska,
      cel,
      wsparcie: { widoczne: wsparcie.widoczne, nadawcy, naGraczy: rozbijNaGraczy(nadawcy), wlasne: wsparcie.wlasne },
      nadciaga,
      odGraczy: paczkiOdGraczy(nadawcy, nadciaga.naGraczy),
      blokada: blokadaCelu(dane2, ruchyCzlonow(dane2.puls, ustawienia, null, teraz2), { nick: wioska?.nick ?? cel?.nick, idGracza: wioska?.idGracza ?? cel?.idGracza }, ustawienia.blokadaDni, teraz2),
      straty,
      stoi,
      zrodloStoi,
      wDrodze: wDrodze2,
      postep,
      brakuje: postep ? postep.brakuje : null,
      procent: cel && stoi !== null ? Math.round(stoi / cel.paczek * 100) : null,
      dataSkanu,
      wiekH: dataSkanu ? Math.round((teraz2 - new Date(dataSkanu).getTime()) / 36e5) : null
    };
  }
  function zapiszOdczytWioski(dane2, koord, { wsparcie, nadciaga }, skanowal, data = (/* @__PURE__ */ new Date()).toISOString()) {
    const stary = dane2.obstawy[koord] || null;
    const noweNadciaga = nadciaga && (nadciaga.suma || nadciaga.rozkazy) ? { suma: nadciaga.suma, rozkazy: dopiszZnaneRozkazy(nadciaga.rozkazy, stary?.nadciaga?.rozkazy), data } : stary?.nadciaga || null;
    if (wsparcie.widoczne) {
      dane2.obstawy[koord] = { widoczne: true, wiersze: wsparcie.wiersze, data, skanowal, nadciaga: noweNadciaga };
      dopiszMigawkeObstawy(dane2, koord, dane2.obstawy[koord]);
      return true;
    }
    if (stary?.widoczne) {
      dane2.obstawy[koord] = { ...stary, nadciaga: noweNadciaga };
      return Boolean(noweNadciaga);
    }
    dane2.obstawy[koord] = { widoczne: false, wiersze: [], data, skanowal, nadciaga: noweNadciaga };
    return true;
  }
  function zapiszWsparcieZeStrony(swiat, cel, { wsparcie, nadciaga }, skanowal) {
    if (!cel) return false;
    const dane2 = wczytajDane(swiat);
    const wiersze = wsparcie.nadawcy.map(({ nick, idGracza, zKoord, jednostki }) => ({ nick, idGracza, zKoord, jednostki }));
    const zmiana = zapiszOdczytWioski(dane2, cel.koord, { wsparcie: { widoczne: wsparcie.widoczne, wiersze }, nadciaga }, skanowal);
    if (zmiana) {
      dane2.obstawy[cel.koord].zrodlo = "strona";
      zapiszDane(swiat, dane2);
    }
    return zmiana;
  }

  // src/rdzen/skanObstaw.js
  function urlWioski(id) {
    const url2 = new URL(location.href);
    url2.search = "";
    url2.searchParams.set("village", window.game_data.village.id);
    url2.searchParams.set("screen", "info_village");
    url2.searchParams.set("id", id);
    return url2.toString();
  }
  async function doczytajRozkazy(rozkazy, { postep, czyStop, opoznienie, opis: opis2 }) {
    const braki = rozkazy.filter((r) => !r.jednostki && r.id);
    for (const [numer, rozkaz] of braki.entries()) {
      if (czyStop()) return;
      postep(`${opis2}: rozkaz ${numer + 1}/${braki.length}`);
      const jednostki = await pobierzRozkaz(rozkaz.id, opoznienie);
      if (jednostki) rozkaz.jednostki = jednostki;
      await czekaj(opoznienie);
    }
  }
  async function skanujObstawy({ postep = () => {
  }, czyStop = () => false, opoznienie = OPOZNIENIE_MS, koordy = null } = {}) {
    const { world: swiat, player } = window.game_data;
    const cele = Object.values(wczytajDane(swiat).plan).filter((c) => !koordy || koordy.includes(c.koord));
    let wykonane = 0;
    try {
      const dane2 = wczytajDane(swiat);
      await wczytajDolaczenia(dane2, wczytajUstawienia(swiat).blokadaDni, { opoznienie });
      zapiszDane(swiat, dane2);
    } catch (blad) {
      if (blad.captcha) throw blad;
    }
    for (const cel of cele) {
      if (czyStop()) break;
      postep(`Wioska ${cel.koord} (${wykonane + 1}/${cele.length})`, wykonane / cele.length);
      const strona = await pobierzStrone(urlWioski(cel.id), opoznienie);
      const wsparcie = strona ? czytajWsparcie(strona, cel.koord) : { widoczne: false, wiersze: [] };
      const nadciaga = strona ? czytajNadciagajace(strona, { wlasnyNick: player.name }) : null;
      if (nadciaga?.rozkazy) {
        nadciaga.rozkazy = dopiszZnaneRozkazy(nadciaga.rozkazy, wczytajDane(swiat).obstawy[cel.koord]?.nadciaga?.rozkazy);
        await doczytajRozkazy(nadciaga.rozkazy, {
          postep: (tekst) => postep(tekst, wykonane / cele.length),
          czyStop,
          opoznienie,
          opis: `Wioska ${cel.koord}`
        });
      }
      const dane2 = wczytajDane(swiat);
      zapiszOdczytWioski(dane2, cel.koord, { wsparcie, nadciaga }, player.name);
      zapiszDane(swiat, dane2);
      wykonane += 1;
      await czekaj(opoznienie);
    }
    return { wykonane, wszystkie: cele.length };
  }

  // src/rdzen/forumObstaw.js
  var TABELA = /(\[table\]\s*\[\*\*\][^\n]*Cordy[^\n]*\[\/\*\*\])([\s\S]*?)(\[\/table\])/;
  var KOLUMNA_BLOKADY = "Blokada do";
  var PRZYPIS_BLOKADY = /\s*blokada do [\d.]+ [\d:]+/;
  var liczba = (v) => typeof v === "number" ? v.toLocaleString("pl-PL") : "";
  function czytajWiersze(tekst) {
    const tabela2 = TABELA.exec(tekst);
    if (!tabela2) return null;
    return tabela2[2].split("\n").map((l) => l.trim()).filter((l) => l.startsWith("[*]")).map((linia) => {
      const [nr, cordy = "", paczek = "", pozostalo = "", priorytet = "", blokada = ""] = linia.slice(3).split("[|]");
      return { nr: Number(nr), koord: /\d{1,3}\|\d{1,3}/.exec(cordy)?.[0] || null, paczek, pozostalo, priorytet, blokada };
    });
  }
  function formatBlokady(koniec) {
    const d = new Date(koniec);
    const dwa = (v) => String(v).padStart(2, "0");
    return `${dwa(d.getDate())}.${dwa(d.getMonth() + 1)} ${dwa(d.getHours())}:${dwa(d.getMinutes())}`;
  }
  function komorkaPriorytetu(cel, stary) {
    const baza2 = cel.priorytet === void 0 ? (stary || "").replace(PRZYPIS_BLOKADY, "").trim() : cel.priorytet ? "[b]PRIORYTET[/b]" : "";
    return ` ${baza2}`.trimEnd() || " ";
  }
  var pozostaloCelu = (cel) => cel.pozostalo ?? cel.postep?.brakuje ?? null;
  var czyObstawiona = (cel) => (cel.pozostalo ?? cel.postep?.brakuje ?? null) === 0;
  function uloz(cele, stare) {
    const zPosta = new Map(stare.filter((w) => w.koord).map((w) => [w.koord, w.nr]));
    const miejsce = (cel) => zPosta.get(cel.koord) ?? cel.nr ?? Infinity;
    return cele.map((cel, numer) => ({ cel, numer })).sort((a, b) => miejsce(a.cel) - miejsce(b.cel) || a.numer - b.numer).map(({ cel }) => cel);
  }
  function zbudujWiersze(tekst, wszystkieCele, ruchy2) {
    const stare = czytajWiersze(tekst);
    if (!stare) return null;
    const obstawione = wszystkieCele.filter(czyObstawiona).map((c) => c.koord);
    const wiersze = uloz(wszystkieCele.filter((c) => !obstawione.includes(c.koord)), stare).map((cel, numer) => {
      const nr = numer + 1;
      const stary = stare.find((w) => w.koord === cel.koord) || null;
      const pozostalo = cel.postep?.stan === "brak danych" && (cel.pozostalo ?? null) === null ? stary?.pozostalo ?? "" : liczba(pozostaloCelu(cel));
      const priorytet = komorkaPriorytetu(cel, stary?.priorytet);
      const koniec = cel.blokada ?? blokadaGracza(ruchy2, cel.idGracza);
      const blokada = koniec ? formatBlokady(koniec.koniecBlokady) : "";
      const paczek = String(cel.paczek);
      let zmiana = "nowa";
      if (stary) zmiana = stary.nr === nr && stary.paczek === paczek && stary.pozostalo === pozostalo && stary.priorytet === priorytet && stary.blokada === blokada ? "bez zmian" : "zmieniona";
      return { nr, koord: cel.koord, paczek, pozostalo, priorytet, blokada, zmiana, linia: `[*]${nr}[|][coord]${cel.koord}[/coord][|]${paczek}[|]${pozostalo}[|]${priorytet}[|]${blokada}` };
    });
    const nrPustego = wiersze.length + 1;
    wiersze.push({ nr: nrPustego, koord: null, zmiana: "pusta", linia: `[*]${nrPustego}[|][|]0[|]0[|] [|]` });
    for (const stary of stare.filter((w) => w.koord && !wiersze.some((x) => x.koord === w.koord))) {
      wiersze.push({ nr: stary.nr, koord: null, usunieta: stary.koord, zmiana: obstawione.includes(stary.koord) ? "obstawiona" : "usunięta", linia: null });
    }
    return wiersze;
  }
  function podmienWiersze(tekst, wiersze) {
    return tekst.replace(TABELA, (_, staryPoczatek, __, koniec) => {
      const poczatek = staryPoczatek.includes(KOLUMNA_BLOKADY) ? staryPoczatek : staryPoczatek.replace("[/**]", `[||]${KOLUMNA_BLOKADY}[/**]`);
      return `${poczatek}

${wiersze.filter((w) => w.linia).map((w) => w.linia).join("\n")}
${koniec}`;
    });
  }
  function czytajLinkWatku(link) {
    const url2 = new URL(link, location.href);
    const watek = url2.searchParams.get("thread_id");
    const forum = url2.searchParams.get("forum_id");
    if (!watek || !forum) throw new Error("Link wątku musi zawierać thread_id i forum_id.");
    return { watek, forum };
  }
  var urlWatku = ({ watek, forum }, reszta = {}) => urlGry({
    screen: "forum",
    screenmode: "view_thread",
    forum_id: forum,
    thread_id: watek,
    ...reszta
  });
  async function czytajEdycje(miejsce, idPosta) {
    const strona = await pobierzStrone(urlWatku(miejsce, { edit_post_id: idPosta, page: 0 }));
    const formularz2 = strona && [...strona.querySelectorAll("form")].find((f) => f.querySelector("textarea[name=message]"));
    if (!formularz2) throw new Error("Gra nie dała formularza edycji tego posta. Edytować może tylko jego autor albo moderator.");
    return { adres: formularz2.getAttribute("action"), tekst: formularz2.querySelector("textarea[name=message]").value };
  }
  function znajdzPost(strona) {
    for (const post of strona.querySelectorAll(".post")) {
      const naglowek3 = post.querySelector(".bbcodetable tr")?.textContent || "";
      const id = /edit_post_id=(\d+)/.exec(post.innerHTML)?.[1];
      if (/Cordy/.test(naglowek3) && id) return id;
    }
    return null;
  }
  function daneDoTabeli(swiat) {
    const dane2 = wczytajDane(swiat);
    const ustawienia = wczytajUstawienia(swiat);
    const { cele } = zbudujObstawy(dane2, zbudujModel(dane2, ustawienia, []), ustawienia);
    const ruchy2 = ruchyCzlonow(dane2.puls, ustawienia);
    return {
      dane: dane2,
      ustawienia,
      ruchy: ruchy2,
      cele: cele.map((cel) => ({ ...cel, blokada: blokadaCelu(dane2, ruchy2, cel, ustawienia.blokadaDni) }))
    };
  }
  async function przygotujPost(swiat, { puste = false } = {}) {
    const { ustawienia, cele, ruchy: ruchy2 } = daneDoTabeli(swiat);
    if (!cele.length && !puste) throw new Error("plan obstaw jest pusty, więc tabeli nie ruszam.");
    const miejsce = czytajLinkWatku(ustawienia.forumObstaw);
    const watek = await pobierzStrone(urlWatku(miejsce));
    const idPosta = watek ? znajdzPost(watek) : null;
    if (!idPosta) throw new Error("Nie znalazłem w wątku Twojego posta z tabelą obstaw (kolumna Cordy).");
    const { adres, tekst } = await czytajEdycje(miejsce, idPosta);
    const wiersze = zbudujWiersze(tekst, cele, ruchy2);
    if (!wiersze) throw new Error("W treści posta nie ma tabeli z kolumną Cordy.");
    return { miejsce, idPosta, adres, stary: tekst, nowy: podmienWiersze(tekst, wiersze), wiersze };
  }
  async function aktualizujPost(swiat, { koordy = null, postep = () => {
  }, puste = false } = {}) {
    if (!koordy || koordy.length) await skanujObstawy({ postep, koordy });
    const przygotowany = await przygotujPost(swiat, { puste });
    const zmienione = przygotowany.nowy !== przygotowany.stary;
    if (zmienione) await zapiszPost(swiat, przygotowany);
    return { ...przygotowany, zmienione };
  }
  async function zapiszPost(swiat, przygotowany) {
    const { miejsce, idPosta, stary, nowy, wiersze } = przygotowany;
    const obecny = await czytajEdycje(miejsce, idPosta);
    if (obecny.tekst !== stary) throw new Error("Ktoś zmienił post po przygotowaniu podglądu. Nic nie zapisano, przygotuj podgląd jeszcze raz.");
    let odpowiedz;
    try {
      odpowiedz = await fetch(obecny.adres, {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ do: "send", message: nowy, send: "Wyślij" }).toString()
      });
    } catch {
      throw new Error("zapis został zablokowany. W laboratorium trzeba najpierw włączyć tryb zapisu.");
    }
    if (!odpowiedz.ok) throw new Error(`Gra zwróciła błąd HTTP ${odpowiedz.status}.`);
    const po = await czytajEdycje(miejsce, idPosta);
    if (po.tekst.trim() !== nowy.trim()) throw new Error("Gra nie potwierdziła zapisu: post ma inną treść niż wysłana. Sprawdź wątek.");
    const dane2 = wczytajDane(swiat);
    for (const w of wiersze) {
      const cel = w.koord ? dane2.plan[w.koord] : null;
      if (!cel) continue;
      cel.nr = w.nr;
      if (cel.priorytet === void 0) cel.priorytet = w.priorytet.includes("PRIORYTET");
    }
    zapiszDane(swiat, dane2);
    return true;
  }

  // src/ui/forumObstaw.js
  function opisAktualizacji(w) {
    if (!w.zmienione) return "Tabela na forum jest aktualna.";
    const pozostalo = w.wiersze.filter((x) => x.koord).map((x) => `${x.nr}. ${x.koord}: pozostało ${x.pozostalo || "?"}`).join(", ");
    const licz = (rodzaj) => w.wiersze.filter((x) => x.zmiana === rodzaj).length;
    const czesci = [["nowa", "nowe"], ["zmieniona", "zmienione"], ["obstawiona", "obstawione, zdjęte"], ["usunięta", "zdjęte"]].filter(([rodzaj]) => licz(rodzaj)).map(([rodzaj, nazwa]) => `${nazwa}: ${licz(rodzaj)}`);
    return `Zaktualizowano tabelę na forum (${czesci.join(", ") || "wyrównane wiersze"}). ${pozostalo}`.trim();
  }
  function panelForum(swiat, klasaPrzycisku, poZapisie = () => {
  }) {
    const stan = el("span");
    const przycisk2 = el("button", { type: "button", className: klasaPrzycisku, textContent: "Aktualizuj tabelę na forum" });
    przycisk2.addEventListener("click", async () => {
      przycisk2.disabled = true;
      stan.textContent = "Czytam stan wiosek…";
      try {
        const wynik = await aktualizujPost(swiat, { postep: (tekst) => {
          stan.textContent = tekst;
        } });
        stan.textContent = opisAktualizacji(wynik);
        if (wynik.zmienione) poZapisie();
      } catch (blad) {
        stan.textContent = `Nie zaktualizowano: ${blad.message}`;
      }
      przycisk2.disabled = false;
    });
    return el("div", { style: "display:flex;gap:6px;align-items:center;flex-wrap:wrap" }, przycisk2, stan);
  }

  // src/mapa/watekObstaw.js
  function uruchomWatekObstaw(swiat, { adres = location.href, dokument = document, poZapisie = () => location.reload() } = {}) {
    let miejsce;
    try {
      miejsce = czytajLinkWatku(wczytajUstawienia(swiat).forumObstaw);
    } catch {
      return null;
    }
    if (new URL(adres).searchParams.get("thread_id") !== miejsce.watek) return null;
    const post = [...dokument.querySelectorAll(".post")].find((p) => /Cordy/.test(p.querySelector(".bbcodetable tr")?.textContent || "") && p.querySelector('a[href*="edit_post_id="]'));
    if (!post) return null;
    const tabela2 = post.querySelector(".bbcodetable");
    const panel = panelForum(swiat, "btn", poZapisie);
    panel.id = "efekt-forum-obstawy";
    panel.style.margin = "6px 0";
    tabela2.parentNode.insertBefore(panel, tabela2);
    return panel;
  }

  // src/rdzen/bbPaczek.js
  var liczba2 = (v) => typeof v === "number" ? v.toLocaleString("pl-PL") : "—";
  var zaokraglij3 = (v) => Math.round(v * 10) / 10;
  function wDrodze(g) {
    if (g.rozkazy && g.bezDanych === g.rozkazy) return "?";
    return `${g.bezDanych ? "min. " : ""}${liczba2(g.wDrodze)}`;
  }
  function tabela(naglowki, wiersze) {
    return ["[table]", `[**]${naglowki.join("[||]")}[/**]`, ...wiersze.map((w) => `[*]${w.join("[|]")}`), "[/table]"].join("\n");
  }
  var posortowani = (gracze2) => [...gracze2].sort((a, b) => b.razem - a.razem || a.nick.localeCompare(b.nick, "pl"));
  function bbPaczekWioski(cel, postep, gracze2) {
    const stan = postep ? `: plan ${liczba2(cel.paczek)}, gotowe ${liczba2(postep.gotowe)}, w drodze ${liczba2(postep.wDrodze)}, brakuje ${liczba2(postep.brakuje)}` : "";
    const wlasciciel = cel.nick ? ` ([player]${cel.nick}[/player])` : "";
    const naglowek3 = `[b]Obstawa [coord]${cel.koord}[/coord]${wlasciciel}${stan}[/b]`;
    if (!gracze2.length) return `${naglowek3}
Brak znanych paczek od graczy.`;
    return `${naglowek3}
${tabela(
      ["Gracz", "Stoi", "W drodze", "Razem"],
      posortowani(gracze2).map((g) => [`[player]${g.nick}[/player]`, liczba2(g.stoi), wDrodze(g), `[b]${liczba2(g.razem)}[/b]`])
    )}`;
  }
  function bbPaczekPlanu(cele) {
    const gracze2 = /* @__PURE__ */ new Map();
    for (const cel of cele) {
      for (const g of cel.naGraczy) {
        const wpis = gracze2.get(g.nick) || { nick: g.nick, stoi: 0, wDrodze: 0, razem: 0, rozkazy: 0, bezDanych: 0, wioski: 0 };
        wpis.stoi = zaokraglij3(wpis.stoi + g.stoi);
        wpis.wDrodze = zaokraglij3(wpis.wDrodze + g.wDrodze);
        wpis.razem = zaokraglij3(wpis.razem + g.razem);
        wpis.rozkazy += g.rozkazy;
        wpis.bezDanych += g.bezDanych;
        wpis.wioski += 1;
        gracze2.set(g.nick, wpis);
      }
    }
    const zbiorcza = gracze2.size ? tabela(
      ["Gracz", "Stoi", "W drodze", "Razem", "Wioski"],
      posortowani(gracze2.values()).map((g) => [`[player]${g.nick}[/player]`, liczba2(g.stoi), wDrodze(g), `[b]${liczba2(g.razem)}[/b]`, String(g.wioski)])
    ) : "Brak znanych paczek od graczy.";
    return [`[b]Paczki na obstawach: ${cele.length} wiosek, ${gracze2.size} graczy[/b]`, zbiorcza, ...cele.map((c) => bbPaczekWioski(c, c.postep, c.naGraczy))].join("\n\n");
  }

  // src/rdzen/mapy.js
  var pliki = null;
  var przejecia = null;
  var ranking = null;
  function dekoduj(tekst) {
    return decodeURIComponent(tekst.replace(/\+/g, " "));
  }
  async function wczytajPliki() {
    if (!pliki) {
      pliki = Promise.all(["/map/ally.txt", "/map/player.txt", "/map/village.txt"].map(async (url2) => {
        const odpowiedz = await fetch(url2);
        if (!odpowiedz.ok) throw new Error(`Nie udało się pobrać ${url2}.`);
        return (await odpowiedz.text()).split("\n").map((linia) => linia.split(","));
      }));
      pliki.catch(() => {
        pliki = null;
      });
    }
    return pliki;
  }
  async function slownikMapy() {
    const [plemiona, gracze2, wioski3] = await wczytajPliki();
    return {
      plemiona: new Map(plemiona.filter((p) => p.length > 2).map((p) => [p[0], dekoduj(p[2])])),
      gracze: new Map(gracze2.filter((g) => g.length > 2).map((g) => [g[0], {
        nick: dekoduj(g[1]),
        idPlemienia: g[2] !== "0" ? g[2] : null,
        wioski: Number(g[3]),
        punkty: Number(g[4])
      }])),
      wioski: new Map(wioski3.filter((w) => w.length > 5).map((w) => [w[0], {
        koord: `${w[2]}|${w[3]}`,
        nazwa: dekoduj(w[1]),
        idGracza: w[4],
        punkty: Number(w[5])
      }]))
    };
  }
  function czytajRanking(tekst) {
    return new Map(tekst.split("\n").map((linia) => linia.split(",")).filter((p) => p.length > 2).map((p) => [p[1], Number(p[2])]));
  }
  async function wczytajRanking() {
    if (!ranking) {
      ranking = Promise.all(["kill_att", "kill_def", "kill_sup"].map(async (plik) => {
        const url2 = `/map/${plik}.txt`;
        const odpowiedz = await fetch(url2);
        if (!odpowiedz.ok) throw new Error(`Nie udało się pobrać ${url2}.`);
        return czytajRanking(await odpowiedz.text());
      })).then(([ra, ro, rw]) => ({ ra, ro, rw }));
      ranking.catch(() => {
        ranking = null;
      });
    }
    return ranking;
  }
  async function wczytajPrzejecia() {
    if (!przejecia) {
      przejecia = fetch("/map/conquer.txt").then(async (odpowiedz) => {
        if (!odpowiedz.ok) throw new Error("Nie udało się pobrać /map/conquer.txt.");
        return odpowiedz.text();
      });
      przejecia.catch(() => {
        przejecia = null;
      });
    }
    return przejecia;
  }
  async function tagPlemienia(idPlemienia) {
    const [plemiona] = await wczytajPliki();
    const wiersz = plemiona.find((pola) => pola[0] === String(idPlemienia));
    if (!wiersz) throw new Error("Nie rozpoznano plemienia konta.");
    return dekoduj(wiersz[2]);
  }
  async function wioskiPlemion(tagi) {
    const [plemiona, gracze2, wioski3] = await wczytajPliki();
    const idPlemion = new Set(plemiona.filter((p) => p.length > 2 && tagi.includes(dekoduj(p[2]))).map((p) => p[0]));
    const idGraczy = new Set(gracze2.filter((g) => g.length > 2 && idPlemion.has(g[2])).map((g) => g[0]));
    return wioski3.filter((w) => w.length > 4 && idGraczy.has(w[4])).map((w) => [Number(w[2]), Number(w[3])]);
  }
  async function wioskaPoKoord(koord) {
    const [plemiona, gracze2, wioski3] = await wczytajPliki();
    const [x, y] = koord.split("|");
    const wioska = wioski3.find((w) => w[2] === x && w[3] === y);
    if (!wioska) return null;
    const gracz = gracze2.find((g) => g[0] === wioska[4]);
    const plemie = gracz && plemiona.find((p) => p[0] === gracz[2]);
    return {
      id: wioska[0],
      koord,
      nick: gracz ? dekoduj(gracz[1]) : "barbarzyńska",
      idGracza: gracz ? gracz[0] : null,
      czlon: plemie ? dekoduj(plemie[2]) : null
    };
  }

  // src/rdzen/planObstaw.js
  function czytajWpisy(tekst) {
    const wpisy = [];
    const bledy = [];
    for (const linia of tekst.split("\n").map((l) => l.trim()).filter(Boolean)) {
      const dopasowanie = /^(\d{1,3}\|\d{1,3})\D+?(\d+)(?:\s+(p|priorytet))?$/i.exec(linia);
      if (dopasowanie && Number(dopasowanie[2]) > 0) {
        wpisy.push({ koord: dopasowanie[1], paczek: Number(dopasowanie[2]), ...dopasowanie[3] ? { priorytet: true } : {} });
      } else bledy.push(linia);
    }
    return { wpisy, bledy };
  }
  async function dodajDoPlanu(swiat, tekst) {
    const { wpisy, bledy } = czytajWpisy(tekst);
    const dodane = [];
    for (const { koord, ...reszta } of wpisy) {
      const wioska = await wioskaPoKoord(koord);
      if (!wioska) {
        bledy.push(koord);
        continue;
      }
      dodane.push({ ...wioska, ...reszta, zmieniono: (/* @__PURE__ */ new Date()).toISOString() });
    }
    const dane2 = wczytajDane(swiat);
    for (const cel of dodane) dane2.plan[cel.koord] = { ...dane2.plan[cel.koord], ...cel };
    zapiszDane(swiat, dane2);
    return { dodane: dodane.length, bledy };
  }
  function zmienCel(swiat, koord, zmiany2) {
    const dane2 = wczytajDane(swiat);
    if (!dane2.plan[koord]) return false;
    dane2.plan[koord] = { ...dane2.plan[koord], ...zmiany2, zmieniono: (/* @__PURE__ */ new Date()).toISOString() };
    zapiszDane(swiat, dane2);
    return true;
  }
  function usunZPlanu(swiat, koord) {
    const dane2 = wczytajDane(swiat);
    delete dane2.plan[koord];
    delete dane2.obstawy[koord];
    usunHistorieObstaw(dane2, koord);
    zapiszDane(swiat, dane2);
  }

  // src/rdzen/wysylka.js
  var LICZY_SIE_DO_BLOKADY = /* @__PURE__ */ new Set(["wysłano", "nieznany"]);
  function urlPoczty(akcja) {
    const url2 = new URL(location.href);
    url2.search = "";
    url2.hash = "";
    url2.searchParams.set("village", window.game_data.village.id);
    url2.searchParams.set("screen", "mail");
    url2.searchParams.set("mode", "new");
    if (akcja) url2.searchParams.set("action", akcja);
    return url2.toString();
  }
  var urlNowejWiadomosci = () => urlPoczty(null);
  var urlWysylki = () => urlPoczty("send");
  async function tokenCsrf({ opoznienie = OPOZNIENIE_MS, wymusStrone = false } = {}) {
    const csrf = window.game_data?.csrf;
    if (csrf && !wymusStrone) return csrf;
    const strona = await pobierzStrone(urlNowejWiadomosci(), opoznienie);
    const h = strona?.querySelector('form[action*="action=send"] input[name="h"]')?.value;
    if (!h) throw new Error("Nie znaleziono tokenu h na stronie nowej wiadomości.");
    return h;
  }
  async function wyslijWiadomosc({ do: odbiorca, temat, tresc: tresc2 }, { opoznienie = OPOZNIENIE_MS, fetchFn = (...a) => fetch(...a) } = {}) {
    if (!odbiorca || !temat || !tresc2) throw new Error("Wiadomość musi mieć odbiorcę, temat i treść.");
    const h = await tokenCsrf({ opoznienie });
    const body = new URLSearchParams({ to: odbiorca, subject: temat, text: tresc2, extended: "0", send: "Wyślij", h });
    const odpowiedz = await fetchFn(urlWysylki(), { method: "POST", body, credentials: "same-origin", redirect: "manual" });
    if (odpowiedz.type === "opaqueredirect" || odpowiedz.status >= 300 && odpowiedz.status < 400) {
      return { wynik: "wysłano", szczegoly: "przekierowanie po wysłaniu (rozpoznanie niesprawdzone w grze)" };
    }
    if (odpowiedz.status === 429) return { wynik: "nieznany", szczegoly: "HTTP 429: gra ogranicza zapytania" };
    if (!odpowiedz.ok) return { wynik: "nieznany", szczegoly: `HTTP ${odpowiedz.status}` };
    const strona = new DOMParser().parseFromString(await odpowiedz.text(), "text/html");
    if (strona.querySelector(CAPTCHA)) return { wynik: "CAPTCHA", szczegoly: "gra poprosiła o CAPTCHA; rozwiąż ją w grze" };
    const blad = strona.querySelector(".error_box, .error");
    if (blad) return { wynik: "błąd", szczegoly: blad.textContent.trim().slice(0, 200) };
    return { wynik: "nieznany", szczegoly: "odpowiedź 200 bez przekierowania; nie wiadomo, czy wysłano" };
  }
  async function wyslijKolejke(wiadomosci, {
    odstepMs = 5e3,
    limit = Infinity,
    czyStop = () => false,
    postep = () => {
    },
    wyslij = wyslijWiadomosc,
    zapisz = () => {
    }
  } = {}) {
    const wyniki = [];
    let powodStopu = null;
    for (let i = 0; i < wiadomosci.length; i += 1) {
      const w = wiadomosci[i];
      if (powodStopu) {
        wyniki.push({ ...w, wynik: "zatrzymano", szczegoly: powodStopu });
        continue;
      }
      if (i >= limit) {
        powodStopu = `limit ${limit} wiadomości na uruchomienie`;
        wyniki.push({ ...w, wynik: "zatrzymano", szczegoly: powodStopu });
        continue;
      }
      if (czyStop()) {
        powodStopu = "STOP";
        wyniki.push({ ...w, wynik: "zatrzymano", szczegoly: powodStopu });
        continue;
      }
      postep(`Wysyłam ${i + 1} z ${Math.min(wiadomosci.length, limit)}: ${w.do}`, i / Math.min(wiadomosci.length, limit));
      let r;
      try {
        r = await wyslij(w);
      } catch (blad) {
        r = { wynik: "nieznany", szczegoly: blad.message };
      }
      const wpis = { ...w, ...r, data: (/* @__PURE__ */ new Date()).toISOString() };
      wyniki.push(wpis);
      zapisz(wpis);
      if (r.wynik !== "wysłano") powodStopu = `poprzednia wiadomość: ${r.wynik} (${r.szczegoly})`;
      else if (i < wiadomosci.length - 1 && i < limit - 1) await czekaj(odstepMs);
    }
    postep("Koniec kolejki.", 1);
    return wyniki;
  }
  function dodajWysylke(swiat, wpis) {
    const dane2 = wczytajDane(swiat);
    const id = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    const rekord = {
      id,
      nick: wpis.do,
      idGracza: wpis.idGracza || null,
      koord: wpis.koord,
      paczki: wpis.uzupelnic ?? null,
      powod: wpis.powod || null,
      temat: wpis.temat,
      tresc: wpis.tresc,
      wynik: wpis.wynik,
      szczegoly: wpis.szczegoly || "",
      autor: window.game_data?.player?.name || null,
      data: wpis.data || (/* @__PURE__ */ new Date()).toISOString(),
      zmieniono: (/* @__PURE__ */ new Date()).toISOString()
    };
    dane2.wysylki[id] = rekord;
    zapiszDane(swiat, dane2);
    return rekord;
  }
  var listaWysylek = (dane2) => Object.values(dane2.wysylki || {}).sort((a, b) => b.data.localeCompare(a.data));
  function polaczWysylki(moje, obce) {
    let zmiany2 = 0;
    for (const [id, wpis] of Object.entries(obce || {})) {
      if (!moje[id] || (wpis.zmieniono || "") > (moje[id].zmieniono || "")) {
        moje[id] = wpis;
        zmiany2 += 1;
      }
    }
    return zmiany2;
  }
  function blokadaProsby(dane2, nick, koord, blokadaH, teraz2 = Date.now()) {
    const ostatnia = listaWysylek(dane2).find((w) => w.nick === nick && w.koord === koord && LICZY_SIE_DO_BLOKADY.has(w.wynik));
    if (!ostatnia) return { zablokowana: false, ostatnia: null, do: null };
    const koniec = new Date(ostatnia.data).getTime() + blokadaH * 36e5;
    return { zablokowana: koniec > teraz2, ostatnia, do: new Date(koniec).toISOString() };
  }
  function przygotujProsby(obstawy2, dane2, u, { teraz: teraz2 = Date.now(), pomijajBlokade = false } = {}) {
    const maksWiekMs = u.wysylka.maksWiekH * 36e5;
    const lista = [];
    for (const cel of obstawy2.cele) {
      const wzorzec = migawkaWzorca(cel.historia);
      const zeSkanu = /* @__PURE__ */ new Set([...cel.nadawcy.map((n) => n.nick), ...wzorzec ? wzorzec.wiersze.map((w) => w.nick) : []]);
      const wiekMs = cel.dataSkanu ? teraz2 - new Date(cel.dataSkanu).getTime() : null;
      for (const gracz of cel.straty.gracze) {
        if (!(gracz.uzupelnic > 0) && gracz.status !== "nie wiadomo") continue;
        const prosba = zbudujProsbe(u, cel, gracz);
        const blokada = blokadaProsby(dane2, gracz.nick, cel.koord, u.wysylka.blokadaH, teraz2);
        let pominieta = null;
        if (!zeSkanu.has(gracz.nick)) pominieta = "odbiorca spoza odczytu tej wioski";
        else if (gracz.paczkiTeraz === null) pominieta = "brak aktualnego odczytu stacjonujących";
        else if (cel.stoi === null) pominieta = "brak danych o stojących paczkach";
        else if (wiekMs === null || wiekMs > maksWiekMs) pominieta = `odczyt starszy niż ${u.wysylka.maksWiekH} h`;
        else if (gracz.rozkazyWDrodze > 0) pominieta = `wsparcie w drodze (${gracz.rozkazyWDrodze} rozk.)`;
        else if (blokada.zablokowana && !pomijajBlokade) pominieta = `prośba wysłana ${blokada.ostatnia.data.slice(0, 16).replace("T", " ")}, blokada do ${blokada.do.slice(0, 16).replace("T", " ")}`;
        lista.push({
          klucz: `${cel.koord}|${gracz.nick}`,
          koord: cel.koord,
          wlasciciel: cel.nick,
          nick: gracz.nick,
          idGracza: gracz.idGracza || null,
          uzupelnic: prosba.uzupelnic,
          powod: gracz.powod,
          status: gracz.status,
          do: prosba.do,
          temat: prosba.temat,
          tresc: prosba.tresc,
          pominieta,
          blokada: blokada.zablokowana ? blokada : null
        });
      }
    }
    return lista.sort((a, b) => Number(Boolean(a.pominieta)) - Number(Boolean(b.pominieta)) || b.uzupelnic - a.uzupelnic || a.nick.localeCompare(b.nick, "pl"));
  }

  // src/mapa/widokWioski.js
  var STARE_H = 24;
  function sekcja(tytul, ...tresc2) {
    return el("div", { className: "em-sekcja" }, el("span", { className: "em-tytul", textContent: tytul }), ...tresc2);
  }
  function naglowek(w) {
    const gora = el("div", { className: "em-gora" });
    if (w.wioska?.typ) gora.appendChild(znakTypu(w.wioska.typ));
    const nazwa = w.wioska ? `${w.wioska.nick} (${w.wioska.czlon})` : w.cel ? `${w.cel.nick}${w.cel.czlon ? ` (${w.cel.czlon})` : ""}` : "Wioska spoza skanów";
    gora.appendChild(document.createTextNode(`${nazwa}${w.koord ? `, ${w.koord}` : ""}`));
    if (w.dataSkanu) {
      const stare = w.wiekH > STARE_H;
      gora.appendChild(el("span", { className: `em-data${stare ? " em-stare" : ""}`, textContent: `Skan ${formatDaty(w.dataSkanu)}, ${w.wiekH} h temu` }));
    } else {
      gora.appendChild(el("span", { className: "em-data", textContent: "Brak skanu tej wioski" }));
    }
    return gora;
  }
  var stanForum = el("span", { className: "em-szary" });
  async function naForum(swiat, koord) {
    stanForum.textContent = "Aktualizuję forum…";
    try {
      stanForum.textContent = opisAktualizacji(await aktualizujPost(swiat, { koordy: [koord] }));
    } catch (blad) {
      stanForum.textContent = `Zapisano plan, ale nie forum: ${blad.message}`;
    }
  }
  function sekcjaObstawy(w, { swiat, naDodaj }) {
    if (!w.cel) {
      const paczki2 = el("input", { type: "number", className: "em-pole", min: "1", value: "10" });
      const dodaj = el("button", { type: "button", className: "em-btn", textContent: "Dodaj do planu obstaw" });
      const stan = el("span", { className: "em-szary" });
      dodaj.addEventListener("click", async () => {
        dodaj.disabled = true;
        try {
          let { koord } = w;
          if (!koord) koord = (await slownikMapy()).wioski.get(w.id)?.koord || null;
          if (!koord) throw new Error("nie znam współrzędnych tej wioski");
          const wynik = await dodajDoPlanu(swiat, `${koord} ${Number(paczki2.value)}`);
          if (!wynik.dodane) throw new Error(`nie rozpoznano wioski ${koord} w plikach mapy`);
          naDodaj();
          await naForum(swiat, koord);
          naDodaj();
        } catch (blad) {
          stan.textContent = `Nie dodano: ${blad.message}.`;
          dodaj.disabled = false;
        }
      });
      return sekcja("Obstawa", el("div", { className: "em-szary", textContent: "Tej wioski nie ma w planie obstaw." }), el("div", { className: "em-wiersz" }, "Paczek:", paczki2, dodaj, stan));
    }
    const zrodlo = { strona: "z tabeli wsparcia na tej stronie", "skan obrony": "ze skanu obrony: w wiosce minus własne" }[w.zrodloStoi] || "strona nie pokazuje wsparcia, a skan obrony nie objął tej wioski";
    const celDoProsby = { ...w.cel, stoi: w.stoi, brakuje: w.brakuje };
    const wzorzec = w.straty?.wzorzec || null;
    const nieStoja = (w.straty?.gracze || []).filter((g) => g.status === "nie stoi");
    const paczek = el("input", { type: "number", className: "em-pole", min: "1", value: String(w.cel.paczek) });
    const priorytet = el("input", { type: "checkbox", checked: w.cel.priorytet === void 0 ? true : Boolean(w.cel.priorytet) });
    const zapisz = el("button", { type: "button", className: "em-btn", textContent: "Zapisz" });
    const pozostalo = el("input", {
      type: "number",
      className: "em-pole",
      min: "0",
      step: "any",
      value: w.cel.pozostalo ?? "",
      placeholder: w.brakuje ?? "",
      title: "Puste: liczy panel. 0 usuwa wioskę z tabeli na forum."
    });
    zapisz.addEventListener("click", async () => {
      const reczne = pozostalo.value.trim() === "" ? null : Number(pozostalo.value);
      zmienCel(swiat, w.cel.koord, { paczek: Number(paczek.value) || w.cel.paczek, priorytet: priorytet.checked, pozostalo: reczne });
      naDodaj();
      await naForum(swiat, w.cel.koord);
      naDodaj();
    });
    return sekcja(
      "Obstawa",
      kafleObstawy(w.postep),
      el("div", { className: "em-wiersz" }, "Paczek:", paczek, "Pozostało:", pozostalo, el("label", {}, priorytet, " priorytet"), zapisz, stanForum),
      w.blokada ? el("div", { className: "em-zle", textContent: `Właściciel ma blokadę wsparcia ${w.blokada.dokladna ? "do" : "najpóźniej do"} ${formatDaty(w.blokada.koniecBlokady)}.` }) : null,
      w.brakuje > 0 ? el("div", { className: "em-szary", textContent: `Brakuje np. ${przykladJednostek(w.brakuje, w.paczka)}.` }) : null,
      el("div", { className: "em-szary", textContent: `Źródło: ${zrodlo}.${wzorzec ? ` Wzorzec z ${formatDaty(wzorzec.data)}: ${formatLiczby(wzorzec.paczki)} paczek.` : " Bez wzorca strat nie liczymy, tylko brak do pełnej paczki."}` }),
      nieStoja.length ? el("div", { className: "em-lista" }, el("span", { className: "em-zle", textContent: "Nie stoją, a byli we wzorcu:" }), ...nieStoja.map((g) => {
        const wiersz = el("span", {}, el("b", { textContent: g.nick }), ` było ${formatLiczby(g.paczkiPrzed)}${g.rozkazyWDrodze ? `, w drodze ${g.rozkazyWDrodze} rozk.` : ""}`);
        wiersz.appendChild(przyciskProsby(w, celDoProsby, g));
        return wiersz;
      })) : null
    );
  }
  async function wyslijJedna(w, cel, gracz, { temat, tresc: tresc2 }) {
    const prosba = zbudujProsbe(w.ustawienia, cel, gracz);
    const wiadomosc = { do: prosba.do, temat: temat || prosba.temat, tresc: tresc2 || prosba.tresc, koord: cel.koord, idGracza: gracz.idGracza || null, uzupelnic: prosba.uzupelnic, powod: gracz.powod };
    let r;
    try {
      r = await wyslijWiadomosc(wiadomosc);
    } catch (blad) {
      r = { wynik: "nieznany", szczegoly: blad.message };
    }
    try {
      dodajWysylke(w.swiat, { ...wiadomosc, ...r });
    } catch (blad) {
      r.szczegoly += ` Nie zapisano do dziennika: ${blad.message}`;
    }
    return r;
  }
  var wynikDoStanu = (stan, r) => {
    stan.textContent = `${r.wynik}: ${r.szczegoly}`;
    stan.className = r.wynik === "wysłano" ? "em-dobrze" : "em-zle";
  };
  function przyciskProsby(w, cel, gracz) {
    const stan = el("span", { className: "em-szary" });
    const wyslij = el("button", { type: "button", className: "em-btn em-maly", textContent: "Wyślij wiadomość" });
    const informacja = blokadaProsby(w.dane, gracz.nick, cel.koord, w.ustawienia.wysylka.blokadaH);
    wyslij.title = `Wysyła jedną prośbę o dosłanie do ${gracz.nick}.${gracz.rozkazyWDrodze ? ` Ma wsparcie w drodze (${gracz.rozkazyWDrodze} rozk.).` : ""}${informacja.zablokowana ? ` Poproszony ${formatDaty(informacja.ostatnia.data)}.` : ""}`;
    wyslij.addEventListener("click", async () => {
      wyslij.disabled = true;
      wynikDoStanu(stan, await wyslijJedna(w, cel, gracz, {}));
    });
    const pokaz2 = el("button", { type: "button", className: "em-btn em-maly", textContent: "Podgląd" });
    pokaz2.addEventListener("click", () => {
      const stary = pokaz2.closest("#efekt-wioska")?.querySelector(".em-podglad");
      if (stary) stary.remove();
      pokaz2.closest(".em-sekcja")?.appendChild(podgladProsby(w, cel, gracz));
    });
    return el("span", {}, wyslij, pokaz2, stan);
  }
  function podgladProsby(w, cel, gracz) {
    const prosba = zbudujProsbe(w.ustawienia, cel, gracz);
    const temat = el("input", { type: "text", className: "em-pole", value: prosba.temat, style: "width:100%" });
    const tresc2 = el("textarea", { value: prosba.tresc, rows: 6, style: "width:100%;font:inherit" });
    const stan = el("span", { className: "em-szary" });
    const wyslij = el("button", { type: "button", className: "em-btn", textContent: "Wyślij wiadomość" });
    wyslij.addEventListener("click", async () => {
      wyslij.disabled = true;
      wynikDoStanu(stan, await wyslijJedna(w, cel, gracz, { temat: temat.value.trim(), tresc: tresc2.value.trim() }));
    });
    const otworz = el("button", { type: "button", className: "em-btn", textContent: "Otwórz w grze bez wysyłania" });
    otworz.addEventListener("click", () => {
      stan.textContent = otworzProsbe({ do: prosba.do, temat: temat.value, tresc: tresc2.value }) ? "otwarto nową kartę" : "przeglądarka zablokowała kartę";
    });
    const zamknij = el("button", { type: "button", className: "em-btn", textContent: "Zamknij" });
    const karta2 = el(
      "div",
      { className: "em-podglad" },
      el("div", {}, el("b", { textContent: `Do: ${prosba.do}` }), gracz.rozkazyWDrodze ? el("span", { className: "em-szary", textContent: ` (wsparcie w drodze: ${gracz.rozkazyWDrodze} rozk.)` }) : null),
      temat,
      tresc2,
      el("div", { className: "em-wiersz" }, wyslij, otworz, zamknij, stan)
    );
    zamknij.addEventListener("click", () => karta2.remove());
    return karta2;
  }
  var godzina = (iso) => iso ? new Date(iso).toLocaleTimeString("pl-PL", { hour: "2-digit", minute: "2-digit" }) : "?";
  function prosbaDoGracza(w, g) {
    if (!w.cel) return { opis: "", przycisk: null };
    const s = w.straty?.gracze.find((x) => x.nick === g.nick) || null;
    const uzupelnic = s ? s.uzupelnic : doPelnejPaczki(g.razem);
    if (!(uzupelnic > 0)) return { opis: "", przycisk: null };
    const opis2 = s?.status === "stoi mniej" ? `strata ${formatLiczby(s.strata)}` : `do pełnej ${formatLiczby(uzupelnic)}`;
    const gracz = s || { nick: g.nick, paczkiTeraz: g.stoi, uzupelnic, powod: "niepełna paczka", strata: null };
    return { opis: opis2, przycisk: przyciskProsby(w, { ...w.cel, stoi: w.stoi, brakuje: w.brakuje }, gracz) };
  }
  function sekcjaGraczy(w) {
    if (!w.odGraczy.length) return null;
    const tabela2 = el("table", { className: "em-nadawcy em-od-graczy" });
    const glowa = tabela2.createTHead().insertRow();
    for (const tytul of ["Gracz", "Stoi", "W drodze", "Razem", "Wejścia", ""]) glowa.appendChild(el("th", { textContent: tytul }));
    const cialo = tabela2.createTBody();
    for (const g of w.odGraczy) {
      const wiersz = cialo.insertRow();
      wiersz.insertCell().appendChild(el("b", { textContent: g.nick }));
      wiersz.insertCell().textContent = formatLiczby(g.stoi);
      wiersz.insertCell().textContent = g.bezDanych === g.rozkazy && g.rozkazy ? "?" : `${g.bezDanych ? "min. " : ""}${formatLiczby(g.wDrodze)}`;
      wiersz.insertCell().appendChild(el("b", { textContent: formatLiczby(g.razem) }));
      wiersz.insertCell().textContent = g.rozkazy ? `×${g.rozkazy}, ${godzina(g.pierwsze)}${g.rozkazy > 1 ? `–${godzina(g.ostatnie)}` : ""}` : "";
      const { opis: opis2, przycisk: przycisk2 } = prosbaDoGracza(w, g);
      wiersz.insertCell().append(...[opis2 ? `${opis2} ` : null, przycisk2].filter(Boolean));
    }
    const razem = w.odGraczy.reduce((s, g) => s + g.razem, 0);
    const poleBB = el("textarea", { className: "em-bb", readOnly: true, rows: 8, hidden: true });
    const stanBB = el("span", { className: "em-szary" });
    const kopiuj = el("button", { type: "button", className: "em-btn", textContent: "BB-kody: kto ile paczek" });
    kopiuj.addEventListener("click", async () => {
      poleBB.value = bbPaczekWioski({ koord: w.koord, nick: w.cel?.nick || w.wioska?.nick || null, paczek: w.cel?.paczek ?? null }, w.postep, w.odGraczy);
      poleBB.hidden = false;
      poleBB.select();
      try {
        await navigator.clipboard.writeText(poleBB.value);
        stanBB.textContent = "Skopiowano.";
      } catch {
        stanBB.textContent = "Zaznaczono. Skopiuj przez Ctrl+C.";
      }
    });
    return sekcja(`Paczki od graczy: ${formatLiczby(Math.round(razem * 10) / 10)} od ${w.odGraczy.length}`, tabela2, el("div", { className: "em-wiersz" }, kopiuj, stanBB), poleBB);
  }
  function dopiszPaczkiDoTabeli(dokument, paczka) {
    const tabela2 = dokument.querySelector("#withdraw_selected_units_village_info > table");
    if (!tabela2) return;
    tabela2.querySelectorAll(".efekt-paczki").forEach((komorka) => komorka.remove());
    [...tabela2.rows].forEach((wiersz, numer) => {
      const dane2 = numer ? czytajWiersz(wiersz) : null;
      const tekst = numer ? dane2 ? formatLiczby(liczPaczki(dane2.jednostki, paczka)) : "" : "Paczki";
      const komorka = el(numer ? "td" : "th", { className: "efekt-paczki", textContent: tekst });
      if (numer) komorka.style.cssText = "text-align:right;font-weight:bold";
      wiersz.appendChild(komorka);
    });
  }
  function sekcjaNadciagajacych(w) {
    const { suma: suma3, paczki: paczki2, rozkazy, naGraczy } = w.nadciaga;
    const tresc2 = [];
    if (suma3) {
      const jednostki = Object.keys(JEDNOSTKI).filter((j) => suma3[j] > 0);
      tresc2.push(el("div", {}, el("b", { textContent: `Znane wojska w drodze: ${formatLiczby(paczki2)} paczek` }), el("span", { className: "em-szary", textContent: " (gra zlicza tylko znane wojska, więc to dolna granica)" })));
      if (jednostki.length) {
        tresc2.push(el("div", { className: "em-lista" }, ...jednostki.map((j) => el("span", {}, ikonaJednostki(j), ` ${formatLiczby(suma3[j])}`))));
      }
    } else {
      tresc2.push(el("div", { className: "em-szary", textContent: "Strona nie pokazuje sumy nadciągającego wsparcia." }));
    }
    if (rozkazy === null) {
      tresc2.push(el("div", { className: "em-szary", textContent: "Strona nie pokazuje listy rozkazów." }));
    } else if (!rozkazy.length) {
      tresc2.push(el("div", { className: "em-szary", textContent: "Brak widocznych rozkazów wsparcia w drodze." }));
    } else {
      const nieznane = naGraczy.reduce((s, g) => s + g.bezDanych, 0);
      tresc2.push(el("div", { className: "em-szary", textContent: `Rozkazy wsparcia: ${rozkazy.length} od ${naGraczy.length} graczy.${nieznane ? ` Zawartości ${nieznane} nie znamy: odczyta ją skan obstaw w panelu.` : ""}` }));
    }
    return sekcja("Nadciąga", ...tresc2);
  }
  function sekcjaNadawcow(w) {
    if (!w.wsparcie.widoczne) {
      return sekcja("Pochodzenie wojska", el("div", { className: "em-szary", textContent: "Strona nie pokazuje wsparcia tej wioski. To nie znaczy, że nikogo tu nie ma." }));
    }
    if (!w.wsparcie.nadawcy.length) return sekcja("Pochodzenie wojska", el("div", { className: "em-szary", textContent: "Nikt obcy nie stoi w tej wiosce." }));
    const jednostki = Object.keys(JEDNOSTKI).filter((j) => w.wsparcie.nadawcy.some((n) => n.jednostki[j] > 0));
    const tabela2 = el("table", { className: "em-nadawcy" });
    const glowa = tabela2.createTHead().insertRow();
    for (const tytul of ["Gracz", "Z wioski", "Paczki"]) glowa.appendChild(el("th", { textContent: tytul }));
    for (const j of jednostki) glowa.appendChild(el("th", {}, ikonaJednostki(j)));
    const cialo = tabela2.createTBody();
    for (const n of w.wsparcie.nadawcy) {
      const wiersz = cialo.insertRow();
      wiersz.insertCell().textContent = n.nick;
      wiersz.insertCell().textContent = n.zKoord;
      wiersz.insertCell().textContent = formatLiczby(n.paczki);
      for (const j of jednostki) wiersz.insertCell().textContent = formatLiczby(n.jednostki[j] || 0);
    }
    return sekcja(`Pochodzenie wojska: ${w.wsparcie.nadawcy.length} wysyłek od ${w.wsparcie.naGraczy.length} graczy`, tabela2);
  }
  function zbudujPanelWioski(w, opcje) {
    const budynki2 = siatkaBudynkow(w.wioska?.budynki);
    return el(
      "div",
      { id: "efekt-wioska", className: "efekt-karta efekt-karta-szeroka" },
      naglowek(w),
      el(
        "div",
        { className: "em-sekcja em-dwie" },
        el("div", {}, el("span", { className: "em-tytul", textContent: "Wojsko" }), tabelaWojsk(w.wioska, w.wsparcie.wlasne ? [["Własne (ta strona)", w.wsparcie.wlasne]] : [])),
        el("div", {}, el("span", { className: "em-tytul", textContent: "Budynki" }), budynki2 || el("div", { className: "em-szary", textContent: "Brak danych o budynkach ze skanu." }))
      ),
      sekcjaObstawy(w, opcje),
      sekcjaGraczy(w),
      sekcjaNadciagajacych(w),
      sekcjaNadawcow(w)
    );
  }
  function uruchomWidokWioski(swiat, { id = new URL(location.href).searchParams.get("id"), dokument = document } = {}) {
    const tresc2 = dokument.querySelector("#content_value");
    if (!id || !tresc2) return null;
    if (!dokument.head.querySelector("#efekt-wioska-styl")) dokument.head.appendChild(el("style", { id: "efekt-wioska-styl", textContent: STYL_KART }));
    const rysuj = () => {
      const dane2 = wczytajDane(swiat);
      const ustawienia = wczytajUstawienia(swiat);
      const wlasnyNick = window.game_data?.player?.name || null;
      const w = daneWioski(dane2, ustawienia, { id, koord: koordZeStrony(dokument), dokument, wlasnyNick });
      w.ustawienia = ustawienia;
      w.paczka = ustawienia.paczka;
      w.dane = dane2;
      w.swiat = swiat;
      let blad = null;
      try {
        zapiszWsparcieZeStrony(swiat, w.cel, { wsparcie: w.wsparcie, nadciaga: w.nadciaga }, wlasnyNick);
      } catch (e) {
        blad = e.message;
      }
      dopiszPaczkiDoTabeli(dokument, ustawienia.paczka);
      const panel = zbudujPanelWioski(w, { swiat, naDodaj: rysuj });
      if (blad) panel.appendChild(el("div", { className: "em-sekcja em-zle", textContent: blad }));
      const stary = dokument.querySelector("#efekt-wioska");
      if (stary) stary.replaceWith(panel);
      else {
        const tabela2 = dokument.querySelector("#withdraw_selected_units_village_info");
        const tytul = tresc2.querySelector("h2");
        if (tytul) tytul.after(panel);
        else if (tabela2) tabela2.parentNode.insertBefore(panel, tabela2);
        else tresc2.prepend(panel);
      }
      return panel;
    };
    return rysuj();
  }

  // src/rdzen/dziennik.js
  var TYPY = { pochwala: "Pochwała", kara: "Kara", notatka: "Notatka" };
  var PUNKTY_DOMYSLNE = { pochwala: 1, kara: -1, notatka: 0 };
  var POWODY = [
    "obstawy",
    "brak obstawy",
    "kiszenie deffu",
    "brak dostępu do danych",
    "brak eko",
    "bez rozwoju",
    "samowolka",
    "strata wioski",
    "akcja",
    "nieobecność",
    "inne"
  ];
  var teraz = () => (/* @__PURE__ */ new Date()).toISOString();
  var dni = (iso) => (Date.now() - new Date(iso).getTime()) / 864e5;
  function nowyWpis({ idGracza, nick, czlon, typ, powod, punkty, tekst = "", dowod = "", autor }) {
    if (!TYPY[typ]) throw new Error(`Nieznany typ wpisu: ${typ}.`);
    if (!idGracza || !nick) throw new Error("Wpis musi wskazywać gracza.");
    const chwila = teraz();
    return {
      id: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`,
      idGracza: String(idGracza),
      nick,
      czlon: czlon || null,
      typ,
      powod: powod || "inne",
      punkty: Number.isFinite(punkty) ? punkty : PUNKTY_DOMYSLNE[typ],
      tekst: tekst.trim(),
      dowod,
      autor: autor || null,
      data: chwila,
      zmieniono: chwila,
      usunieto: false
    };
  }
  function zapiszWpis(swiat, wpis) {
    const dane2 = wczytajDane(swiat);
    dane2.dziennik[wpis.id] = wpis;
    zapiszDane(swiat, dane2);
    return wpis;
  }
  function usunWpis(swiat, id) {
    const dane2 = wczytajDane(swiat);
    const wpis = dane2.dziennik[id];
    if (!wpis) return false;
    wpis.usunieto = true;
    wpis.zmieniono = teraz();
    zapiszDane(swiat, dane2);
    return true;
  }
  var aktywneWpisy = (dane2) => Object.values(dane2.dziennik || {}).filter((w) => !w.usunieto).sort((a, b) => b.data.localeCompare(a.data));
  var wpisyGracza = (dane2, idGracza) => aktywneWpisy(dane2).filter((w) => w.idGracza === String(idGracza));
  function saldo(wpisy, maksDni = null) {
    const brane = maksDni === null ? wpisy : wpisy.filter((w) => dni(w.data) <= maksDni);
    return {
      pochwaly: brane.filter((w) => w.typ === "pochwala").length,
      kary: brane.filter((w) => w.typ === "kara").length,
      notatki: brane.filter((w) => w.typ === "notatka").length,
      saldo: brane.reduce((razem, w) => razem + (w.punkty || 0), 0),
      ostatni: brane.length ? brane[0].data : null
    };
  }
  function ranking2(dane2, model, maksDni = 30) {
    const wpisy = aktywneWpisy(dane2);
    const gracze2 = new Map(model.gracze.map((g) => [g.id, { id: g.id, nick: g.nick, czlon: g.czlon }]));
    for (const w of wpisy) if (!gracze2.has(w.idGracza)) gracze2.set(w.idGracza, { id: w.idGracza, nick: w.nick, czlon: w.czlon || "?" });
    return [...gracze2.values()].map((g) => ({ ...g, ...saldo(wpisy.filter((w) => w.idGracza === g.id), maksDni) }));
  }
  var jestPowtorka = (dane2, idGracza, typ, powod) => aktywneWpisy(dane2).some((w) => w.idGracza === idGracza && w.typ === typ && w.powod === powod && dni(w.data) <= POWTORKA_WPISU_DNI);
  function proponujWpisy(dane2, model, obstawy2, u) {
    const propozycje = [];
    const dodaj = (gracz, typ, powod, dowod) => {
      if (jestPowtorka(dane2, gracz.id, typ, powod)) return;
      propozycje.push({ idGracza: gracz.id, nick: gracz.nick, czlon: gracz.czlon, typ, powod, punkty: PUNKTY_DOMYSLNE[typ], dowod });
    };
    const data = (tag) => {
      const iso = dane2.czlony[tag]?.data;
      return iso ? new Date(iso).toLocaleString("pl-PL", { dateStyle: "short", timeStyle: "short" }) : "brak daty";
    };
    for (const gracz of model.gracze) {
      const a = obstawy2.aktywnosc.find((x) => x.id === gracz.id);
      const skan = data(gracz.czlon);
      if (gracz.kryteria.dostep === false) {
        dodaj(gracz, "kara", "brak dostępu do danych", `Nie udostępnia plemieniu: ${gracz.braki.join(", ")}. Skan ${skan}.`);
      }
      if (gracz.kryteria.deff === false) {
        dodaj(gracz, "kara", "kiszenie deffu", `Kiszenie w ${gracz.kiszone} wioskach dalej niż ${u.front} pól od wroga. Skan ${skan}.`);
      }
      if (a && a.status === "ignoruje") {
        dodaj(gracz, "kara", "brak obstawy", `0 paczek na wioskach z planu przy ${a.wDomu} paczkach w domu. Skan ${skan}.`);
      }
      if (a && a.status === "wysyła" && a.udzial !== null && a.udzial >= u.pochwalaUdzial) {
        dodaj(gracz, "pochwala", "obstawy", `${a.paczki} paczek na ${a.cele} wioskach z planu, ${a.udzial}% swojego deffu. Skan ${skan}.`);
      }
    }
    return propozycje;
  }
  function polaczDzienniki(moj, obcy) {
    let zmiany2 = 0;
    for (const [id, wpis] of Object.entries(obcy || {})) {
      const u = moj[id];
      if (!u || (wpis.zmieniono || "") > (u.zmieniono || "")) {
        moj[id] = wpis;
        zmiany2 += 1;
      }
    }
    return zmiany2;
  }

  // src/ui/kolumny.js
  var formatRoznicy = (w) => w === null || w === void 0 ? "—" : w > 0 ? `+${formatLiczby(w)}` : formatLiczby(w);
  var klasaRoznicy = (w) => w === null || w === void 0 ? "ep-szary" : w > 0 ? "ep-plus" : w < 0 ? "ep-minus" : "ep-zero";
  var kolRoznica = (klucz2, tytul, wartosc2, reszta = {}) => ({
    klucz: klucz2,
    tytul,
    wartosc: wartosc2,
    liczbowa: true,
    tekst: (w) => formatRoznicy(wartosc2(w)),
    klasa: (w) => klasaRoznicy(wartosc2(w)),
    ...reszta
  });
  var kolData = (klucz2, tytul, wartosc2) => ({
    klucz: klucz2,
    tytul,
    wartosc: wartosc2,
    tekst: (w) => wartosc2(w) ? formatDaty(wartosc2(w)) : "—"
  });
  var kolCzlon = {
    klucz: "czlon",
    tytul: "Człon",
    wartosc: (w) => w.czlon,
    bb: (w) => `[ally]${w.czlon}[/ally]`
  };
  var kolGracz = {
    klucz: "nick",
    tytul: "Gracz",
    wartosc: (w) => w.nick,
    bb: (w) => `[player]${w.nick}[/player]`
  };
  var kolWioska = {
    klucz: "koord",
    tytul: "Wioska",
    wartosc: (w) => w.koord,
    bb: (w) => `[coord]${w.koord}[/coord]`
  };
  var kolLiczba = (klucz2, tytul, wartosc2) => ({ klucz: klucz2, tytul, wartosc: wartosc2, liczbowa: true });
  var kolJednostka = (id, wartosc2, klucz2 = id) => ({
    klucz: klucz2,
    tytul: JEDNOSTKI[id],
    bbTytul: `[unit]${id}[/unit]`,
    ikona: () => ikonaJednostki(id),
    wartosc: wartosc2,
    liczbowa: true
  });
  var kolBudynek = (id) => ({
    klucz: id,
    tytul: BUDYNKI[id] || id,
    bbTytul: `[building]${id}[/building]`,
    ikona: () => ikonaBudynku(id),
    wartosc: (w) => w.budynki?.[id] ?? null,
    liczbowa: true
  });
  var kolTyp = {
    klucz: "typ",
    tytul: "Typ",
    wartosc: (w) => w.typ,
    tekst: (w) => w.typ ? w.typ.toUpperCase() : "—",
    klasa: (w) => w.typ ? `ep-typ-${w.typ}` : "ep-szary"
  };

  // src/ui/sladSelekcji.js
  var liczba3 = (v) => typeof v === "number" ? v.toLocaleString("pl-PL") : String(v);
  function opisWyniku(r) {
    if (r.s === "brak") return `brak danych${r.p ? `: ${r.p}` : ""}`;
    if (r.s === "wylaczone") return `pominięte${r.p ? `: ${r.p}` : ""}`;
    const wartosc2 = r.w === true ? "tak" : r.w === false ? "nie" : liczba3(r.w);
    return r.p ? `${wartosc2} (${r.p})` : wartosc2;
  }
  function klasaWyniku(r) {
    if (r.s !== "ok") return "ep-szary";
    if (r.w === true) return "ep-dobrze";
    return r.w === false ? "ep-zle" : "";
  }
  var krotko = (r) => {
    if (r.s === "brak") return "brak danych";
    if (r.s === "wylaczone") return "pominięte";
    if (r.w === true) return "tak";
    if (r.w === false) return typeof r.st === "number" ? `nie, ${Math.round(r.st * 100)}%` : "nie";
    return liczba3(r.w);
  };
  var kolWezla = (klucz2, tytul, wyniki) => ({
    klucz: klucz2,
    tytul,
    wartosc: (w) => krotko(wyniki(w)),
    klasa: (w) => klasaWyniku(wyniki(w))
  });
  function pozycja(wezel) {
    const naglowek3 = el(
      "div",
      { className: "ep-slad-wiersz" },
      el("span", { className: "ep-slad-nazwa", textContent: wezel.waga === null ? wezel.nazwa : `${wezel.nazwa} (waga ${wezel.waga})` }),
      el("span", { className: klasaWyniku(wezel), textContent: opisWyniku(wezel) })
    );
    const dzieci = wezel.typ === "grupa" ? [] : wezel.dzieci.filter((d) => d.typ !== "stala");
    return el("li", {}, naglowek3, dzieci.length ? el("ul", { className: "ep-slad" }, ...dzieci.map(pozycja)) : null);
  }
  function drzewoSladu(slad) {
    return el("ul", { className: "ep-slad ep-slad-glowny" }, pozycja(slad));
  }
  function liniaSladu(slad) {
    const punkty = slad.dzieci[0];
    return (punkty?.dzieci || []).map((d) => `${d.nazwa}: ${opisWyniku(d)}`);
  }

  // src/ui/tabela.js
  function przygotujKolumny(kolumny) {
    return kolumny.map((k) => ({ ...k, tekst: k.tekst || ((w) => formatLiczby(k.wartosc(w))) }));
  }
  function posortuj(wiersze, kolumna, malejaco) {
    const kierunek = malejaco ? -1 : 1;
    return [...wiersze].sort((a, b) => {
      const x = kolumna.wartosc(a);
      const y = kolumna.wartosc(b);
      const xPusty = x === null || x === void 0;
      const yPusty = y === null || y === void 0;
      if (xPusty || yPusty) return Number(xPusty) - Number(yPusty);
      if (typeof x === "number" && typeof y === "number") return (x - y) * kierunek;
      return String(x).localeCompare(String(y), "pl") * kierunek;
    });
  }
  function stworzTabele({ kolumny, sort, naWiersz, pusty = "Brak wierszy." }) {
    const kol = przygotujKolumny(kolumny);
    let klucz2 = sort && kol.some((k) => k.klucz === sort.klucz) ? sort.klucz : kol[0].klucz;
    let malejaco = sort ? Boolean(sort.malejaco) : false;
    let wiersze = [];
    const glowa = el("thead");
    const cialo = el("tbody");
    const tabela2 = el("table", { className: "ep-tabela" }, glowa, cialo);
    function rysuj() {
      const komorki = kol.map((k) => {
        const th = el("th", { title: k.tytul });
        if (k.ikona) th.appendChild(k.ikona());
        else th.textContent = k.tytul;
        if (k.liczbowa) th.classList.add("ep-liczba");
        if (k.klucz === klucz2) th.classList.add(malejaco ? "ep-malejaco" : "ep-rosnaco");
        th.addEventListener("click", () => {
          malejaco = k.klucz === klucz2 ? !malejaco : Boolean(k.liczbowa);
          klucz2 = k.klucz;
          rysuj();
        });
        return th;
      });
      glowa.replaceChildren(el("tr", {}, ...komorki));
      const kolumna = kol.find((k) => k.klucz === klucz2);
      cialo.replaceChildren(...wiersze.length ? posortuj(wiersze, kolumna, malejaco).map((w) => {
        const tr = el("tr");
        if (naWiersz) {
          tr.classList.add("ep-klikalny");
          tr.addEventListener("click", () => naWiersz(w));
        }
        for (const k of kol) {
          const td = el("td", { textContent: k.tekst(w) });
          if (k.element) {
            const zawartosc = k.element(w);
            if (zawartosc) td.replaceChildren(zawartosc);
          }
          if (k.tlo) {
            const pasek = k.tlo(w);
            if (pasek !== null) td.appendChild(el("div", { className: "ep-postep" }, el("i", { style: `width:${Math.min(100, pasek)}%` })));
          }
          if (k.liczbowa) td.classList.add("ep-liczba");
          const klasa = k.klasa && k.klasa(w);
          if (klasa) td.classList.add(klasa);
          tr.appendChild(td);
        }
        return tr;
      }) : [el("tr", {}, el("td", { colSpan: kol.length, className: "ep-pusto", textContent: pusty }))]);
    }
    return {
      element: el("div", { className: "ep-tabela-ramka" }, tabela2),
      pokaz(nowe) {
        wiersze = nowe;
        rysuj();
      },
      kolumny: kol,
      uporzadkowane: () => posortuj(wiersze, kol.find((k) => k.klucz === klucz2), malejaco)
    };
  }

  // src/rdzen/eksport.js
  function polaczDane(obecne, nowe, swiat) {
    if (nowe.swiat !== swiat) throw new Error(`Plik jest ze świata ${nowe.swiat}, a grasz na ${swiat}.`);
    const dodane = [];
    obecne.historia = obecne.historia || {};
    obecne.dziennik = obecne.dziennik || {};
    for (const czlon of Object.values(nowe.czlony || {})) {
      const moj = obecne.czlony[czlon.tag];
      if (!moj || new Date(czlon.data) > new Date(moj.data)) {
        obecne.czlony[czlon.tag] = czlon;
        dodane.push(czlon.tag);
      }
      dopiszMigawke(obecne, czlon);
    }
    let migawki = 0;
    for (const [tag, lista] of Object.entries(nowe.historia || {})) {
      for (const migawka of lista) if (dopiszGotowaMigawke(obecne, tag, migawka)) migawki += 1;
    }
    if (migawki) dodane.push(`historia: ${migawki}`);
    const wpisy = polaczDzienniki(obecne.dziennik, nowe.dziennik);
    if (wpisy) dodane.push(`dziennik: ${wpisy}`);
    obecne.historiaObstaw = obecne.historiaObstaw || {};
    const stany = polaczHistorieObstaw(obecne.historiaObstaw, nowe.historiaObstaw);
    if (stany) dodane.push(`historia obstaw: ${stany}`);
    obecne.wysylki = obecne.wysylki || {};
    const wysylki = polaczWysylki(obecne.wysylki, nowe.wysylki);
    if (wysylki) dodane.push(`wysyłki: ${wysylki}`);
    obecne.reguly = obecne.reguly || {};
    for (const [id, zestaw] of Object.entries(nowe.reguly || {})) {
      const moj = obecne.reguly[id];
      if (!moj || new Date(zestaw.zmieniono) > new Date(moj.zmieniono)) {
        obecne.reguly[id] = zestaw;
        dodane.push(`reguły: ${zestaw.nazwa}`);
      }
    }
    obecne.dolaczenia = obecne.dolaczenia || {};
    const dolaczenia = polaczDolaczenia(obecne.dolaczenia, nowe.dolaczenia);
    if (dolaczenia) dodane.push(`dołączenia: ${dolaczenia}`);
    obecne.puls = obecne.puls || { migawki: [], nicki: {} };
    const puls = polaczPuls(obecne.puls, nowe.puls);
    if (puls) dodane.push(`puls: ${puls}`);
    for (const [koord, cel] of Object.entries(nowe.plan || {})) {
      const moj = obecne.plan[koord];
      if (!moj || new Date(cel.zmieniono) > new Date(moj.zmieniono)) {
        obecne.plan[koord] = cel;
        dodane.push(koord);
      }
    }
    for (const [koord, skan] of Object.entries(nowe.obstawy || {})) {
      const moj = obecne.obstawy[koord];
      if (!moj || new Date(skan.data) > new Date(moj.data)) {
        obecne.obstawy[koord] = skan;
        dodane.push(koord);
      }
    }
    return [...new Set(dodane)];
  }
  function poleCSV(wartosc2) {
    const tekst = String(wartosc2 ?? "");
    const bezpieczny = /^[=+\-@]/.test(tekst) ? `'${tekst}` : tekst;
    return `"${bezpieczny.replace(/"/g, '""')}"`;
  }
  function generujCSV(dane2) {
    const jednostki = Object.keys(JEDNOSTKI);
    const wszystkie = Object.values(dane2.czlony).flatMap((czlon) => Object.values(czlon.gracze).flatMap((gracz) => Object.values(gracz.wioski).map((w) => ({ czlon, gracz, w }))));
    const budynki2 = [...new Set(wszystkie.flatMap(({ w }) => Object.keys(w.budynki || {})))];
    const wiersze = [[
      "człon",
      "gracz",
      "wioska",
      "x",
      "y",
      "punkty",
      "skan",
      ...jednostki.map((j) => `własne_${j}`),
      ...jednostki.map((j) => `w_wiosce_${j}`),
      ...jednostki.map((j) => `w_drodze_${j}`),
      ...budynki2.map((b) => `budynek_${b}`)
    ]];
    for (const { czlon, gracz, w } of wszystkie) {
      wiersze.push([
        czlon.tag,
        gracz.nick,
        w.nazwa,
        w.x,
        w.y,
        w.punkty,
        czlon.data,
        ...jednostki.map((j) => w.wlasne ? w.wlasne[j] : ""),
        ...jednostki.map((j) => w.wWiosce ? w.wWiosce[j] : ""),
        ...jednostki.map((j) => w.wDrodze ? w.wDrodze[j] : ""),
        ...budynki2.map((b) => w.budynki ? w.budynki[b] : "")
      ]);
    }
    return `\uFEFF${wiersze.map((w) => w.map(poleCSV).join(";")).join("\n")}`;
  }
  function tabelaBB(tytul, kolumny, wiersze) {
    const linie = [`[b]${tytul}: ${wiersze.length}[/b]`];
    if (wiersze.length) {
      linie.push("[table]", `[**]${kolumny.map((k) => k.bbTytul || k.tytul).join("[||]")}[/**]`);
      for (const wiersz of wiersze) {
        linie.push(`[*]${kolumny.map((k) => k.bb ? k.bb(wiersz) : k.tekst(wiersz)).join("[|]")}`);
      }
      linie.push("[/table]");
    }
    return linie.join("\n");
  }
  function znacznikCzasu() {
    const teraz2 = /* @__PURE__ */ new Date();
    const lokalny = new Date(teraz2.getTime() - teraz2.getTimezoneOffset() * 6e4);
    return lokalny.toISOString().slice(0, 16).replace(/[:T]/g, "-");
  }
  function pobierzPlik(nazwa, tresc2, typ) {
    const link = document.createElement("a");
    link.href = URL.createObjectURL(new Blob([tresc2], { type: typ }));
    link.download = nazwa;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(link.href);
  }

  // src/ui/widokListy.js
  function widokListy({
    kontekst,
    tytul,
    opis: opis2,
    kolumny,
    wiersze,
    szukajW,
    sort,
    naWiersz,
    pusty,
    dodatki = [],
    akcje = [],
    bezCzlonow = false
  }) {
    const szukaj = el("input", {
      type: "search",
      className: "ep-pole",
      placeholder: "Szukaj…",
      value: kontekst.opcje.szukaj || ""
    });
    const czlony = [...new Set(wiersze.map((w) => w.czlon).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pl"));
    const filtr = el(
      "select",
      { className: "ep-pole", hidden: bezCzlonow },
      el("option", { value: "", textContent: "Wszystkie człony" }),
      ...czlony.map((c) => el("option", { value: c, textContent: c }))
    );
    if (kontekst.opcje.czlon && czlony.includes(kontekst.opcje.czlon)) filtr.value = kontekst.opcje.czlon;
    const licznik = el("span", { className: "ep-licznik" });
    const tabela2 = stworzTabele({ kolumny, sort, naWiersz, pusty });
    const pole2 = el("textarea", { className: "ep-bb", readOnly: true, rows: 8, hidden: true });
    const widoczne = () => {
      const fraza = szukaj.value.trim().toLocaleLowerCase("pl");
      return wiersze.filter((w) => (!filtr.value || w.czlon === filtr.value) && (!fraza || szukajW(w).toLocaleLowerCase("pl").includes(fraza)));
    };
    const odswiez = () => {
      const lista = widoczne();
      tabela2.pokaz(lista);
      licznik.textContent = `${lista.length} z ${wiersze.length}`;
      pole2.hidden = true;
    };
    const pokazBB = async () => {
      pole2.value = tabelaBB(tytul, tabela2.kolumny, tabela2.uporzadkowane());
      pole2.hidden = false;
      pole2.select();
      try {
        await navigator.clipboard.writeText(pole2.value);
        kontekst.komunikat("Skopiowano BB-kody.");
      } catch {
        kontekst.komunikat("Zaznaczono BB-kody. Skopiuj je przez Ctrl+C.");
      }
    };
    szukaj.addEventListener("input", odswiez);
    filtr.addEventListener("change", odswiez);
    odswiez();
    return el(
      "div",
      { className: "ep-widok" },
      opis2 ? el("p", { className: "ep-opis", textContent: opis2 }) : null,
      el(
        "div",
        { className: "ep-pasek" },
        szukaj,
        filtr,
        ...dodatki,
        licznik,
        el("span", { className: "ep-odstep" }),
        ...akcje,
        przycisk("BB-kody", pokazBB)
      ),
      tabela2.element,
      pole2
    );
  }

  // src/rdzen/normy.js
  var BUDYNEK_JEDNOSTKI = {
    spear: "barracks",
    sword: "barracks",
    axe: "barracks",
    spy: "stable",
    light: "stable",
    heavy: "stable",
    ram: "garage",
    catapult: "garage"
  };
  var NAZWY_SUROWCOW = { wood: "drewno", stone: "glina", iron: "żelazo" };
  var NAZWY_BUDYNKOW = { barracks: "koszary", stable: "stajnia", garage: "warsztat" };
  var DOBA_S = 86400;
  var czasRekrutacji = (jednostka2, poziom, s) => s.jednostki[jednostka2].buildTime * (2 / 3) * 1.06 ** -poziom;
  var produkcjaKopalni = (poziom, s) => poziom > 0 ? Math.round(s.baseProduction * 1.163118 ** (poziom - 1) * s.speed) : 0;
  var pojemnoscZagrody = (poziom) => poziom > 0 ? Math.floor(240 * 100 ** ((poziom - 1) / 29)) : 0;
  function ludnoscBudynkow(budynki2, s) {
    return Object.entries(budynki2).reduce((suma3, [id, poziom]) => {
      const budynek = s.budynki[id];
      return suma3 + (budynek && poziom > 0 ? Math.round(budynek.pop * budynek.popFactor ** (poziom - 1)) : 0);
    }, 0);
  }
  function ludnoscWojska(wojsko2, s) {
    return Object.entries(wojsko2).reduce((suma3, [id, ile]) => suma3 + (ile || 0) * (s.jednostki[id]?.pop || 0), 0);
  }
  function zagrodaWioski(wioska, s) {
    if (!wioska.budynki || !wioska.wlasne) return null;
    const naWojsko = pojemnoscZagrody(wioska.budynki.farm || 0) - ludnoscBudynkow(wioska.budynki, s);
    return { naWojsko, wolne: naWojsko - ludnoscWojska(wioska.wlasne, s) };
  }
  function maksProdukcji(wioska, sklad, s, udzial, dni2 = 7) {
    const zagroda = zagrodaWioski(wioska, s);
    if (!zagroda) return null;
    if (zagroda.wolne <= 0) return { ludnoscNaDobe: 0, ogranicza: "zagroda pełna", wolne: zagroda.wolne };
    const wykonalne = Object.entries(sklad).filter(([id, ile]) => ile > 0 && (wioska.budynki[BUDYNEK_JEDNOSTKI[id]] || 0) > 0);
    if (!wykonalne.length) return { ludnoscNaDobe: 0, ogranicza: "brak budynku rekrutacji", wolne: zagroda.wolne };
    const czas = {};
    const koszt = { wood: 0, stone: 0, iron: 0 };
    let ludnosc3 = 0;
    for (const [id, ile] of wykonalne) {
      const budynek = BUDYNEK_JEDNOSTKI[id];
      czas[budynek] = (czas[budynek] || 0) + ile * czasRekrutacji(id, wioska.budynki[budynek], s);
      for (const surowiec of Object.keys(koszt)) koszt[surowiec] += ile * KOSZTY[id][surowiec];
      ludnosc3 += ile * s.jednostki[id].pop;
    }
    const limity = [
      ...Object.entries(czas).map(([budynek, sekundy]) => [DOBA_S / sekundy, NAZWY_BUDYNKOW[budynek]]),
      ...Object.entries(koszt).map(([surowiec, ile]) => [
        produkcjaKopalni(wioska.budynki[surowiec] || 0, s) * 24 * (udzial / 100) / ile,
        NAZWY_SUROWCOW[surowiec]
      ]),
      [zagroda.wolne / (ludnosc3 * dni2), "zagroda"]
    ];
    const [zestawow, ogranicza] = limity.reduce((a, b) => b[0] < a[0] ? b : a);
    return { ludnoscNaDobe: Math.round(zestawow * ludnosc3), ogranicza, wolne: zagroda.wolne };
  }
  function czytajSklad(tekst) {
    return Object.fromEntries(String(tekst).split(",").map((p) => p.trim().split("=")).filter(([id, ile]) => BUDYNEK_JEDNOSTKI[id] && Number(ile) > 0).map(([id, ile]) => [id, Number(ile)]));
  }

  // src/rdzen/zrodla.js
  var DOBA2 = 864e5;
  var WSZYSTKIE = Object.keys(JEDNOSTKI);
  var ok = (w, reszta = {}) => ({ s: "ok", w, ...reszta });
  var brak = (p) => ({ s: "brak", w: null, p });
  var wartosc = (w, powod, reszta) => w === null || w === void 0 ? brak(powod) : ok(w, reszta);
  function zbudujKontekst({ model, obstawy: obstawy2, dane: dane2, ustawienia, stale = null, przejecia: przejecia3 = [], teraz: teraz2 = Date.now() }) {
    const wiosek = /* @__PURE__ */ new Map();
    for (const w of model.wioski) wiosek.set(w.idGracza, [...wiosek.get(w.idGracza) || [], w]);
    const aktywnosc2 = new Map(obstawy2.aktywnosc.map((a) => [a.id, a]));
    const rankingi = /* @__PURE__ */ new Map();
    const migawki = /* @__PURE__ */ new Map();
    const zdobyte = /* @__PURE__ */ new Map();
    for (const p of przejecia3) zdobyte.set(p.idWioski, Math.max(zdobyte.get(p.idWioski) || 0, p.czas));
    const ruchy2 = ruchyCzlonow(dane2.puls, ustawienia, null, teraz2);
    return {
      teraz: teraz2,
      stale,
      dane: dane2,
      ustawienia,
      gracze: model.gracze.map((g) => ({ ...g, wioskiLista: wiosek.get(g.id) || [], aktywnosc: aktywnosc2.get(g.id) || null })),
      ruchy: ruchy2,
      zdobyte,
      rankingWiersz(id, okres) {
        if (!rankingi.has(okres)) rankingi.set(okres, new Map(rankingCzlonow(dane2.puls, ustawienia, String(okres), teraz2).map((w) => [w.id, w])));
        return rankingi.get(okres).get(id) || null;
      },
      migawkaObecna(tag) {
        if (!migawki.has(tag)) migawki.set(tag, dane2.czlony[tag] ? migawkaCzlonu(dane2.czlony[tag]) : null);
        return migawki.get(tag);
      }
    };
  }
  function okresSkanow(g, k, okres) {
    const lista = k.dane.historia?.[g.czlon];
    const nowa = k.migawkaObecna(g.czlon);
    if (!nowa || !lista?.length) return null;
    const baza2 = migawkaBazowa(lista, String(okres), k.teraz) || lista[0];
    if (baza2.data >= nowa.data || !baza2.gracze[g.id] || !nowa.gracze[g.id]) return null;
    return { stary: baza2.gracze[g.id], nowy: nowa.gracze[g.id], dni: (new Date(nowa.data) - new Date(baza2.data)) / DOBA2 };
  }
  function roznicaWojska(g, k, okres, jednostki) {
    const o = okresSkanow(g, k, okres);
    if (!o) return brak("potrzebne dwa skany z różnych dni");
    const stare = ludnosc2(o.stary.wojsko, jednostki);
    const nowe = ludnosc2(o.nowy.wojsko, jednostki);
    return stare === null || nowe === null ? brak("brak wojska w jednym ze skanów") : ok(nowe - stare);
  }
  function produkcja(g, k, okres, jednostki) {
    const o = okresSkanow(g, k, okres);
    if (!o) return brak("potrzebne dwa skany z różnych dni");
    if (o.dni < 0.9) return brak("skany z odstępem krótszym niż doba");
    const stare = ludnosc2(o.stary.wojsko, jednostki);
    const nowe = ludnosc2(o.nowy.wojsko, jednostki);
    if (stare === null || nowe === null) return brak("brak wojska w jednym ze skanów");
    const walka = k.rankingWiersz(g.id, okres)?.walka ?? null;
    const stracilWioske = o.nowy.wioski !== null && o.stary.wioski !== null && o.nowy.wioski < o.stary.wioski;
    if (nowe < stare) return brak(`spadek wojska o ${stare - nowe} ludności${walka ? `, pokonanych w okresie ${walka}` : ""}: straty zasłaniają rekrutację`);
    const naDobe = Math.round((nowe - stare) / o.dni);
    if (walka === 0 && !stracilWioske) return ok(naDobe, { pewnosc: "wysoka", p: `${Math.round(o.dni)} dni, bez walki` });
    return ok(naDobe, { pewnosc: "dolna", p: `co najmniej, ${walka === null ? "walka nieznana" : "walka lub straty"} w okresie` });
  }
  function zPulsu(pole2, g, k, okres) {
    const w = k.rankingWiersz(g.id, okres);
    if (!w) return brak("brak gracza w dziennych migawkach");
    return wartosc(w[pole2], "potrzebne dwie dzienne migawki");
  }
  function ciaglosc(g, k, okres) {
    const dni2 = [];
    const migawki = (k.dane.puls?.migawki || []).slice(-(okres + 1));
    const stan = (m) => m.czlony[g.czlon]?.[g.id] || Object.values(m.czlony).map((c) => c[g.id]).find(Boolean) || null;
    for (let i = 1; i < migawki.length; i += 1) {
      const a = stan(migawki[i - 1]);
      const b = stan(migawki[i]);
      if (a && b) dni2.push(a.some((v, j) => v !== b[j]));
    }
    return dni2;
  }
  var MIN_DNI_CIAGLOSCI = 7;
  function glownaWioska(g) {
    return g.wioskiLista.filter((w) => w.budynki).sort((a, b) => b.punkty - a.punkty)[0] || null;
  }
  function zajetaZagroda(g, k) {
    if (!k.stale) return brak("brak danych świata");
    const stany = g.wioskiLista.map((w) => zagrodaWioski(w, k.stale)).filter(Boolean);
    if (!stany.length) return brak("brak skanu budynków i wojska");
    const naWojsko = stany.reduce((s, z) => s + z.naWojsko, 0);
    const wolne = stany.reduce((s, z) => s + Math.max(0, z.wolne), 0);
    return naWojsko > 0 ? ok(Math.round((naWojsko - wolne) / naWojsko * 100)) : brak("brak miejsca na wojsko");
  }
  var OBSTAWY = { wysyła: true, "w drodze": true, ignoruje: false };
  var POLA = {
    "dostep.pelny": { nazwa: "Pełny dostęp do danych", czytaj: (g) => wartosc(g.kryteria.dostep, g.braki.join(", ") || "brak skanu") },
    "wioski.liczba": { nazwa: "Liczba wiosek", czytaj: (g) => wartosc(g.wioski, "brak wiosek w skanie") },
    "wioski.delta": { nazwa: "Przyrost wiosek", okres: true, czytaj: (g, k, o) => zPulsu("wioski", g, k, o) },
    "punkty.suma": { nazwa: "Punkty", czytaj: (g) => wartosc(g.punkty, "brak wiosek w skanie") },
    "punkty.delta": { nazwa: "Przyrost punktów", okres: true, czytaj: (g, k, o) => zPulsu("punkty", g, k, o) },
    "wojsko.ludnosc": { nazwa: "Wojsko (ludność)", czytaj: (g) => wartosc(wojskoGracza(g, WSZYSTKIE), "brak skanu wojska") },
    "wojsko.deff": { nazwa: "Deff (ludność)", czytaj: (g) => wartosc(wojskoGracza(g, JEDNOSTKI_DEFF), "brak skanu wojska") },
    "wojsko.off": { nazwa: "OFF (ludność)", czytaj: (g) => wartosc(wojskoGracza(g, JEDNOSTKI_OFF), "brak skanu wojska") },
    "wojsko.delta": { nazwa: "Zmiana wojska (ludność)", okres: true, czytaj: (g, k, o) => roznicaWojska(g, k, o, WSZYSTKIE) },
    "produkcja.dzienna": { nazwa: "Produkcja wojska (ludność na dobę)", okres: true, czytaj: (g, k, o) => produkcja(g, k, o, WSZYSTKIE) },
    "produkcja.deff": { nazwa: "Produkcja deffu (ludność na dobę)", okres: true, czytaj: (g, k, o) => produkcja(g, k, o, JEDNOSTKI_DEFF) },
    "produkcja.off": { nazwa: "Produkcja OFF (ludność na dobę)", okres: true, czytaj: (g, k, o) => produkcja(g, k, o, JEDNOSTKI_OFF) },
    "zagroda.zajete": { nazwa: "Zagrody zajęte wojskiem (%)", czytaj: (g, k) => zajetaZagroda(g, k) },
    "eko.min": {
      nazwa: "Najsłabsza kopalnia głównej wioski",
      czytaj: (g) => {
        const glowna = glownaWioska(g);
        return glowna ? ok(Math.min(glowna.budynki.wood || 0, glowna.budynki.stone || 0, glowna.budynki.iron || 0)) : brak("brak skanu budynków");
      }
    },
    "obstawy.aktywny": { nazwa: "Obstawia", czytaj: (g) => wartosc(OBSTAWY[g.aktywnosc?.status], g.aktywnosc?.status === "front" ? "gracz na froncie" : "dane obstaw niepełne") },
    "obstawy.paczki": { nazwa: "Paczki na obstawach", czytaj: (g) => wartosc(g.aktywnosc?.paczki, "brak danych obstaw") },
    "obstawy.udzial": { nazwa: "Udział deffu na obstawach (%)", czytaj: (g) => wartosc(g.aktywnosc?.udzial, "brak danych obstaw") },
    "kiszenie.procent": {
      nazwa: "Deff stojący w domu poza frontem (%)",
      czytaj: (g, k) => {
        const dane2 = kiszenieGracza(g, k);
        if (dane2.s) return dane2;
        return dane2.razem > 0 ? ok(Math.round(dane2.poza / dane2.razem * 100)) : brak("gracz nie ma deffu");
      }
    },
    "kiszenie.paczki": {
      nazwa: "Paczki deffu w domu poza frontem",
      czytaj: (g, k) => {
        const dane2 = kiszenieGracza(g, k);
        return dane2.s ? dane2 : ok(Math.round(dane2.poza * 10) / 10);
      }
    },
    "kiszenie.brak": { nazwa: "Nie kisi deffu", czytaj: (g) => wartosc(g.kryteria.deff, "brak wojska albo wiosek wroga") },
    "walka.delta": { nazwa: "Nowi pokonani (RA + RO + RW)", okres: true, czytaj: (g, k, o) => zPulsu("walka", g, k, o) },
    "ra.delta": { nazwa: "Nowi pokonani w ataku", okres: true, czytaj: (g, k, o) => zPulsu("ra", g, k, o) },
    "ro.delta": { nazwa: "Nowi pokonani w obronie", okres: true, czytaj: (g, k, o) => zPulsu("ro", g, k, o) },
    "rw.delta": { nazwa: "Nowi pokonani we wsparciu", okres: true, czytaj: (g, k, o) => zPulsu("rw", g, k, o) },
    "aktywnosc.procentDni": {
      nazwa: "Dni z aktywnością (%)",
      okres: true,
      czytaj: (g, k, o) => {
        const dni2 = ciaglosc(g, k, o);
        if (dni2.length < MIN_DNI_CIAGLOSCI) return brak(`dziennych migawek ${dni2.length}, potrzeba ${MIN_DNI_CIAGLOSCI}`);
        return ok(Math.round(dni2.filter(Boolean).length / dni2.length * 100));
      }
    },
    "aktywnosc.przerwa": {
      nazwa: "Najdłuższa przerwa (dni)",
      okres: true,
      czytaj: (g, k, o) => {
        const dni2 = ciaglosc(g, k, o);
        if (dni2.length < MIN_DNI_CIAGLOSCI) return brak(`dziennych migawek ${dni2.length}, potrzeba ${MIN_DNI_CIAGLOSCI}`);
        let najdluzsza = 0;
        let obecna = 0;
        for (const aktywny of dni2) {
          obecna = aktywny ? 0 : obecna + 1;
          najdluzsza = Math.max(najdluzsza, obecna);
        }
        return ok(najdluzsza);
      }
    },
    "wiek.wCzlonach": {
      nazwa: "Dni od dołączenia",
      czytaj: (g, k) => {
        const ruch = k.ruchy.find((r) => r.id === g.id && r.rodzaj === "dołączył");
        return ruch ? ok(Math.floor((k.teraz - new Date(ruch.doDaty).getTime()) / DOBA2)) : brak("dołączył przed pierwszą migawką");
      }
    },
    "szlachta.potencjal": {
      nazwa: "Ma Pałac",
      czytaj: (g) => {
        const zBudynkami = g.wioskiLista.filter((w) => w.budynki);
        return zBudynkami.length ? ok(zBudynkami.some((w) => (w.budynki.snob || 0) > 0)) : brak("brak skanu budynków");
      }
    },
    "dziennik.saldo": {
      nazwa: "Saldo dziennika",
      czytaj: (g, k) => ok(wpisyGracza(k.dane, g.id).reduce((s, w) => s + (w.punkty || 0), 0))
    }
  };
  function kiszenieGracza(g, k) {
    const znane = g.wioskiLista.filter((w) => w.paczkiWDomu !== null && w.bezpieczna !== null);
    if (!znane.length) return brak("brak skanu obrony albo wiosek wroga");
    const paczka = k.ustawienia.paczka;
    return {
      poza: znane.filter((w) => w.bezpieczna).reduce((s, w) => s + w.paczkiWDomu, 0),
      razem: g.wioskiLista.reduce((s, w) => s + liczPaczki(w.wlasne, paczka), 0)
    };
  }
  function wojskoGracza(g, jednostki) {
    const zWojskiem = g.wioskiLista.filter((w) => w.wlasne);
    return zWojskiem.length ? zWojskiem.reduce((s, w) => s + ludnosc2(w.wlasne, jednostki), 0) : null;
  }
  function czytajPole(pole2, g, k, okres) {
    const definicja = POLA[pole2];
    return definicja ? definicja.czytaj(g, k, Number(okres) || 7) : brak(`nieznane pole ${pole2}`);
  }
  function wioskiDoNormy(g, k, wiekWioskiMin) {
    const granica = k.teraz - wiekWioskiMin * DOBA2;
    const swieze = g.wioskiLista.filter((w) => (k.zdobyte.get(String(w.id)) || 0) > granica);
    const brane = g.wioskiLista.filter((w) => !swieze.includes(w) && w.budynki && w.wlasne);
    return { brane, swieze: swieze.length, bez: g.wioskiLista.length - swieze.length - brane.length };
  }
  var opisNormy = ({ brane, swieze, bez }, reszta = "") => [
    `z ${brane.length} wiosek`,
    reszta,
    swieze ? `pominięte świeżo przejęte: ${swieze}` : "",
    bez ? `bez skanu: ${bez}` : ""
  ].filter(Boolean).join(", ");
  var NORMY = {
    produkcja: {
      nazwa: "Produkcja wojska, którą wioski mogą utrzymać (ludność na dobę)",
      czytaj(g, k, { udzial, wiekWioskiMin, skladOff, okres }) {
        if (!k.stale) return brak("brak danych świata");
        const wioski3 = wioskiDoNormy(g, k, wiekWioskiMin);
        if (!wioski3.brane.length) return brak(wioski3.swieze ? "same świeżo przejęte wioski" : "brak skanu budynków i wojska");
        const off = czytajSklad(skladOff);
        const wyniki = wioski3.brane.map((w) => maksProdukcji(w, w.typ === "off" ? off : k.ustawienia.paczka, k.stale, udzial, okres));
        const ograniczenia = {};
        for (const r of wyniki) ograniczenia[r.ogranicza] = (ograniczenia[r.ogranicza] || 0) + r.ludnoscNaDobe + 1;
        const glowne = Object.entries(ograniczenia).sort((a, b) => b[1] - a[1])[0][0];
        return ok(wyniki.reduce((s, r) => s + r.ludnoscNaDobe, 0), { p: opisNormy(wioski3, `ogranicza: ${glowne}`) });
      }
    },
    wojsko: {
      nazwa: "Wojsko, które mieści się w zagrodach (ludność)",
      czytaj(g, k, { wiekWioskiMin }) {
        if (!k.stale) return brak("brak danych świata");
        const wioski3 = wioskiDoNormy(g, k, wiekWioskiMin);
        if (!wioski3.brane.length) return brak("brak skanu budynków i wojska");
        const miejsce = wioski3.brane.reduce((s, w) => s + Math.max(0, zagrodaWioski(w, k.stale).naWojsko), 0);
        return ok(miejsce, { p: opisNormy(wioski3) });
      }
    }
  };

  // src/rdzen/reguly.js
  var brak2 = (p) => ({ s: "brak", w: null, p });
  var wylaczone = (p) => ({ s: "wylaczone", w: null, p });
  var ogranicz = (v) => Math.min(1, Math.max(0, v));
  var liczba4 = (v) => typeof v === "number" ? v.toLocaleString("pl-PL") : String(v);
  var wybory = (obiekt) => Object.entries(obiekt).map(([id, d]) => [id, d.nazwa || d]);
  var TYPY2 = {
    zrodlo: {
      nazwa: "Dane o graczu",
      pola: [
        { klucz: "pole", nazwa: "Dane", rodzaj: "wybor", opcje: wybory(POLA) },
        { klucz: "okres", nazwa: "Okres (dni albo parametr)", rodzaj: "tekst", gdy: (w) => POLA[w.pole]?.okres }
      ],
      wejscia: { min: 0, max: 0 },
      nowy: { pole: "wioski.liczba", okres: "okres" }
    },
    norma: {
      nazwa: "Norma z wiosek",
      pola: [
        { klucz: "rodzaj", nazwa: "Co", rodzaj: "wybor", opcje: wybory(NORMY) },
        { klucz: "udzial", nazwa: "Surowce na wojsko (% albo parametr)", rodzaj: "tekst", gdy: (w) => w.rodzaj === "produkcja" },
        { klucz: "skladOff", nazwa: "Skład wioski OFF", rodzaj: "tekst", gdy: (w) => w.rodzaj === "produkcja" }
      ],
      wejscia: { min: 0, max: 0 },
      nowy: { rodzaj: "produkcja", udzial: "udzialSurowcow", skladOff: "axe=700,light=75,ram=5" }
    },
    grupa: {
      nazwa: "Poziom w grupie graczy",
      pola: [
        { klucz: "grupa", nazwa: "Grupa", rodzaj: "wybor", opcje: [["czlon", "ten sam człon"], ["plemie", "wszystkie człony"], ["podobni", "podobne punkty (±30%)"]] },
        { klucz: "procent", nazwa: "Poziom (50 to mediana)", rodzaj: "liczba" }
      ],
      wejscia: { min: 1, max: 1, etykiety: ["Czego"] },
      nowy: { grupa: "podobni", procent: 50 }
    },
    porownanie: {
      nazwa: "Porównanie",
      pola: [
        { klucz: "operator", nazwa: "Warunek", rodzaj: "wybor", opcje: [[">=", "A co najmniej B"], ["<=", "A najwyżej B"]] },
        { klucz: "mnoznik", nazwa: "B razy", rodzaj: "liczba" },
        { klucz: "dodaj", nazwa: "B plus", rodzaj: "liczba" }
      ],
      wejscia: { min: 2, max: 2, etykiety: ["A", "B"] },
      nowy: { operator: ">=", mnoznik: 1, dodaj: 0 }
    },
    stala: {
      nazwa: "Liczba",
      pola: [{ klucz: "wartosc", nazwa: "Wartość albo parametr", rodzaj: "tekst" }],
      wejscia: { min: 0, max: 0 },
      nowy: { wartosc: 1 }
    },
    logika: {
      nazwa: "Logika",
      pola: [
        { klucz: "operator", nazwa: "Warunek", rodzaj: "wybor", opcje: [["i", "wszystkie"], ["lub", "którykolwiek"], ["nie", "odwrotność"], ["kzn", "co najmniej k"]] },
        { klucz: "k", nazwa: "k", rodzaj: "liczba", gdy: (w) => w.operator === "kzn" }
      ],
      wejscia: { min: 1, max: 20 },
      nowy: { operator: "i", k: 1 }
    },
    bramka: {
      nazwa: "Wyjątek",
      pola: [
        { klucz: "gdy", nazwa: "Pomiń, gdy warunek", rodzaj: "wybor", opcje: [["tak", "jest spełniony"], ["nie", "nie jest spełniony"]] },
        { klucz: "komunikat", nazwa: "Powód w ocenie", rodzaj: "tekst" }
      ],
      wejscia: { min: 2, max: 2, etykiety: ["Co oceniamy", "Warunek"] },
      nowy: { gdy: "tak", komunikat: "wyjątek" }
    },
    wagi: {
      nazwa: "Punkty z wag",
      pola: [{ klucz: "czesciowe", nazwa: "Punkty częściowe za niepełną normę", rodzaj: "wybor", opcje: [["tak", "tak"], ["nie", "nie"]] }],
      wejscia: { min: 1, max: 30 },
      nowy: { czesciowe: "tak", wagi: {} }
    },
    etykieta: {
      nazwa: "Wynik",
      pola: [
        { klucz: "progi", nazwa: "Progi (punkty nazwa; punkty nazwa)", rodzaj: "tekst" },
        { klucz: "minPokrycie", nazwa: "Minimalne pokrycie (% albo parametr)", rodzaj: "tekst" },
        { klucz: "ochronaTekst", nazwa: "Wynik przy ochronie", rodzaj: "tekst" }
      ],
      wejscia: { min: 1, max: 2, etykiety: ["Punkty", "Ochrona (opcjonalnie)"] },
      nowy: { progi: "70 zostaje; 40 do rozmowy; 0 do wyrzucenia", minPokrycie: "minPokrycie", ochronaTekst: "nowy" }
    }
  };
  var nazwaWezla = (wezel) => wezel.nazwa || TYPY2[wezel.typ]?.nazwa || wezel.typ;
  function czytajProgi(tekst) {
    return String(tekst).split(";").map((p) => p.trim()).filter(Boolean).map((p) => {
      const [, prog, nazwa] = p.match(/^(-?\d+(?:[.,]\d+)?)\s+(.+)$/) || [];
      return [Number(String(prog).replace(",", ".")), nazwa];
    }).filter(([prog, nazwa]) => Number.isFinite(prog) && nazwa).sort((a, b) => b[0] - a[0]);
  }
  function percentyl(wartosci, procent) {
    const lista = [...wartosci].sort((a, b) => a - b);
    const miejsce = (lista.length - 1) * (procent / 100);
    const dol = Math.floor(miejsce);
    const gora = Math.min(lista.length - 1, dol + 1);
    return lista[dol] + (lista[gora] - lista[dol]) * (miejsce - dol);
  }
  function silnikReguly(zestaw, kontekst) {
    const pamiec = /* @__PURE__ */ new Map();
    const parametr = (v) => {
      if (typeof v === "string" && Object.hasOwn(zestaw.parametry || {}, v)) return zestaw.parametry[v];
      return typeof v === "string" && v.trim() !== "" && Number.isFinite(Number(v)) ? Number(v) : v;
    };
    const grupaGracza = (wezel, g) => {
      if (wezel.grupa === "czlon") return kontekst.gracze.filter((x) => x.czlon === g.czlon);
      if (wezel.grupa === "podobni") {
        if (g.punkty === null) return [];
        return kontekst.gracze.filter((x) => x.punkty !== null && x.punkty >= g.punkty * 0.7 && x.punkty <= g.punkty * 1.3);
      }
      return kontekst.gracze;
    };
    const OBLICZ = {
      zrodlo: (w, g) => czytajPole(w.pole, g, kontekst, parametr(w.okres)),
      norma: (w, g) => NORMY[w.rodzaj]?.czytaj(g, kontekst, {
        udzial: Number(parametr(w.udzial)) || 40,
        skladOff: w.skladOff || "",
        wiekWioskiMin: Number(parametr("wiekWioskiMin")) || 0,
        okres: Number(parametr("okres")) || 7
      }) || brak2("nieznana norma"),
      stala: (w) => {
        const v = Number(parametr(w.wartosc));
        return Number.isFinite(v) ? { s: "ok", w: v } : brak2(`nieznany parametr ${w.wartosc}`);
      },
      grupa(w, g) {
        const wartosci = grupaGracza(w, g).map((x) => licz(w.wejscia[0], x)).filter((r) => r.s === "ok" && typeof r.w === "number").map((r) => r.w);
        const minimum = Number(parametr("minGrupa")) || 1;
        if (wartosci.length < minimum) return brak2(`w grupie danych od ${wartosci.length} graczy, potrzeba ${minimum}`);
        return { s: "ok", w: Math.round(percentyl(wartosci, Number(w.procent) || 50) * 10) / 10, p: `grupa ${wartosci.length} graczy` };
      },
      porownanie(w, g) {
        const a = licz(w.wejscia[0], g);
        if (a.s !== "ok") return a;
        const b = licz(w.wejscia[1], g);
        if (b.s !== "ok") return b;
        const prog = b.w * (Number(w.mnoznik) || (w.mnoznik === 0 ? 0 : 1)) + (Number(w.dodaj) || 0);
        const wiecej = w.operator !== "<=";
        const spelnia = wiecej ? a.w >= prog : a.w <= prog;
        const opis2 = `${liczba4(a.w)} wobec ${liczba4(Math.round(prog * 10) / 10)}${a.p ? ` (${a.p})` : ""}${b.p ? `; norma: ${b.p}` : ""}`;
        if (!spelnia && wiecej && a.pewnosc === "dolna") return brak2(`${opis2}: to tylko dolna granica`);
        const st = wiecej ? prog > 0 ? ogranicz(a.w / prog) : 1 : a.w > 0 ? ogranicz(prog / a.w) : 1;
        return { s: "ok", w: spelnia, st, p: opis2 };
      },
      logika(w, g) {
        const wyniki = w.wejscia.map((id) => licz(id, g)).filter((r) => r.s !== "wylaczone");
        if (!wyniki.length) return wylaczone("wszystkie wejścia pominięte");
        const braki = wyniki.filter((r) => r.s === "brak");
        const prawdy = wyniki.filter((r) => r.s === "ok" && r.w === true).length;
        const powodBraku = braki[0]?.p;
        if (w.operator === "nie") return wyniki[0].s === "ok" ? { s: "ok", w: wyniki[0].w !== true } : brak2(powodBraku);
        if (w.operator === "lub") {
          if (prawdy) return { s: "ok", w: true };
          return braki.length ? brak2(powodBraku) : { s: "ok", w: false };
        }
        const k = w.operator === "kzn" ? Number(w.k) || 1 : wyniki.length;
        if (prawdy >= k) return { s: "ok", w: true };
        return prawdy + braki.length >= k ? brak2(powodBraku) : { s: "ok", w: false };
      },
      bramka(w, g) {
        const warunek = licz(w.wejscia[1], g);
        if (warunek.s !== "ok") return brak2(`nie wiadomo, czy wyjątek obowiązuje: ${warunek.p}`);
        if (warunek.w === true === (w.gdy !== "nie")) return wylaczone(w.komunikat || "wyjątek");
        return licz(w.wejscia[0], g);
      },
      wagi(w, g) {
        let wszystkie = 0;
        let znane = 0;
        let zdobyte = 0;
        for (const id of w.wejscia) {
          const r = licz(id, g);
          const waga = Number(w.wagi?.[id] ?? 1);
          if (r.s === "wylaczone") continue;
          wszystkie += waga;
          if (r.s !== "ok") continue;
          znane += waga;
          const czesc = w.czesciowe === "tak" && typeof r.st === "number" ? r.st : 0;
          zdobyte += waga * (r.w === true ? 1 : czesc);
        }
        const pokrycie = wszystkie ? Math.round(znane / wszystkie * 100) : 0;
        if (!znane) return { ...brak2("żadne kryterium nie ma danych"), pokrycie };
        return { s: "ok", w: Math.round(zdobyte / znane * 100), pokrycie, p: `pokrycie ${pokrycie}%` };
      },
      etykieta(w, g) {
        const ochrona = w.wejscia[1] ? licz(w.wejscia[1], g) : null;
        if (ochrona?.s === "ok" && ochrona.w === true) return { s: "ok", w: w.ochronaTekst || "chroniony", p: ochrona.p };
        const punkty = licz(w.wejscia[0], g);
        const minimum = Number(parametr(w.minPokrycie)) || 0;
        if (punkty.s !== "ok" || (punkty.pokrycie ?? 100) < minimum) return { s: "ok", w: "za mało danych", p: `pokrycie ${punkty.pokrycie ?? 0}%, potrzeba ${minimum}%` };
        const prog = czytajProgi(w.progi).find(([wartosc2]) => punkty.w >= wartosc2);
        return { s: "ok", w: prog ? prog[1] : "bez wyniku", p: `${punkty.w} punktów` };
      }
    };
    function licz(id, g) {
      const klucz2 = `${g.id}|${id}`;
      if (pamiec.has(klucz2)) return pamiec.get(klucz2);
      const wezel = zestaw.wezly[id];
      const wynik = wezel && OBLICZ[wezel.typ] ? OBLICZ[wezel.typ](wezel, g) : brak2(`brak węzła ${id}`);
      pamiec.set(klucz2, wynik);
      return wynik;
    }
    function slad(g, id = zestaw.wynik) {
      const wezel = zestaw.wezly[id];
      return { id, nazwa: nazwaWezla(wezel), typ: wezel.typ, waga: null, ...licz(id, g), dzieci: (wezel.wejscia || []).map((dziecko) => ({ ...slad(g, dziecko), waga: wezel.typ === "wagi" ? Number(wezel.wagi?.[dziecko] ?? 1) : null })) };
    }
    return { licz, slad };
  }
  function osiagalne(zestaw, start = zestaw.wynik, zbior = /* @__PURE__ */ new Set()) {
    if (zbior.has(start) || !zestaw.wezly[start]) return zbior;
    zbior.add(start);
    for (const id of zestaw.wezly[start].wejscia || []) osiagalne(zestaw, id, zbior);
    return zbior;
  }
  function walidujZestaw(zestaw) {
    const bledy = [];
    const wezly = zestaw.wezly || {};
    if (!wezly[zestaw.wynik]) return ["Zestaw nie ma węzła wyniku."];
    if (wezly[zestaw.wynik].typ !== "etykieta") bledy.push("Wyjście zestawu musi być węzłem Wynik.");
    for (const [id, wezel] of Object.entries(wezly)) {
      const typ = TYPY2[wezel.typ];
      const nazwa = nazwaWezla(wezel);
      if (!typ) {
        bledy.push(`${id}: nieznany typ ${wezel.typ}.`);
        continue;
      }
      const wejscia = wezel.wejscia || [];
      if (wejscia.length < typ.wejscia.min) bledy.push(`${nazwa}: za mało wejść (potrzeba ${typ.wejscia.min}).`);
      if (wejscia.length > typ.wejscia.max) bledy.push(`${nazwa}: za dużo wejść (najwyżej ${typ.wejscia.max}).`);
      for (const wejscie2 of wejscia) if (!wezly[wejscie2]) bledy.push(`${nazwa}: wejście wskazuje nieistniejący węzeł.`);
      if (wezel.typ === "zrodlo" && !POLA[wezel.pole]) bledy.push(`${nazwa}: nieznane dane ${wezel.pole}.`);
      if (wezel.typ === "etykieta" && !czytajProgi(wezel.progi).length) bledy.push(`${nazwa}: progi nie dają się odczytać.`);
      if (wezel.typ === "etykieta" && wezly[wejscia[0]] && wezly[wejscia[0]].typ !== "wagi") bledy.push(`${nazwa}: pierwsze wejście musi być węzłem Punkty z wag.`);
    }
    const stan = {};
    const odwiedz = (id) => {
      if (stan[id] === "teraz") return true;
      if (stan[id] === "gotowe" || !wezly[id]) return false;
      stan[id] = "teraz";
      const cykl = (wezly[id].wejscia || []).some(odwiedz);
      stan[id] = "gotowe";
      return cykl;
    };
    if (Object.keys(wezly).some(odwiedz)) bledy.push("Węzły tworzą cykl.");
    return bledy;
  }

  // src/moduly/selekcja.js
  var KLASY_ETYKIET = { zostaje: "ep-dobrze", "do rozmowy": "ep-typ-mix", "do wyrzucenia": "ep-zle" };
  var selekcja = {
    id: "selekcja",
    tytul: "Selekcja",
    grupa: "Kontrola",
    widok(k) {
      if (!k.selekcja) return el("div", { className: "ep-uwaga", textContent: "Selekcji nie udało się policzyć. Sprawdź zestaw w zakładce Reguły." });
      const { zestaw, wiersze, kolumny } = k.selekcja;
      return widokListy({
        kontekst: k,
        tytul: `Selekcja: ${zestaw.nazwa}`,
        opis: `Zestaw reguł „${zestaw.nazwa}”. Wynik liczą klocki z zakładki Reguły: normy z budynków każdej wioski, porównania z podobnymi graczami i wyjątki. Punkty liczą tylko kryteria ze znanym wynikiem, więc brak danych nikogo nie obniża, a Pokrycie mówi, ile z nich znamy. Decyzja należy do rady. Kliknij wiersz: akta pokażą, skąd wziął się wynik.`,
        wiersze,
        szukajW: (g) => `${g.nick} ${g.etykieta}`,
        sort: { klucz: "punktySelekcji", malejaco: false },
        naWiersz: (g) => k.przejdz("akta", { id: g.id }),
        akcje: [przycisk("Reguły", () => k.przejdz("reguly"))],
        kolumny: [
          kolCzlon,
          kolGracz,
          { klucz: "etykieta", tytul: "Propozycja", wartosc: (g) => g.etykieta, klasa: (g) => KLASY_ETYKIET[g.etykieta] || "ep-szary" },
          { klucz: "punktySelekcji", tytul: "Punkty", wartosc: (g) => g.punktySelekcji, liczbowa: true, tlo: (g) => g.punktySelekcji },
          kolLiczba("pokrycie", "Pokrycie %", (g) => g.pokrycie),
          ...kolumny.map((id) => kolWezla(`w_${id}`, nazwaWezla(zestaw.wezly[id]), (g) => g.kolumny[id])),
          { klucz: "braki", tytul: "Czego brakuje", wartosc: (g) => g.braki.length ? g.braki.join(", ") : null }
        ]
      });
    }
  };

  // src/moduly/zmiany.js
  var KLASY_OCEN = { "rozwija się": "ep-dobrze", "nowy OFF": "ep-typ-off", "bez rozwoju": "ep-zle", straty: "ep-typ-mix" };
  var kolOcena = {
    klucz: "ocena",
    tytul: "Ocena",
    wartosc: (w) => w.ocena,
    tekst: (w) => w.ocena || "brak danych",
    klasa: (w) => KLASY_OCEN[w.ocena] || "ep-szary"
  };
  function wybor(wartosc2, opcje, zmien) {
    const pole2 = el("select", { className: "ep-pole" }, ...opcje.map(([id, nazwa]) => el("option", { value: id, textContent: nazwa })));
    pole2.value = wartosc2;
    pole2.addEventListener("change", () => zmien(pole2.value));
    return pole2;
  }
  var zmiany = {
    id: "zmiany",
    tytul: "Zmiany",
    grupa: "Kontrola",
    widok(k) {
      const okres = OKRESY_ZMIAN.some(([id]) => id === k.opcje.okres) ? k.opcje.okres : "7";
      const preset = PRESETY_ZMIAN[k.opcje.preset] ? k.opcje.preset : "wszyscy";
      const wszystkie = porownajCzlony(k.dane, k.model, k.ustawienia, okres);
      const wiersze = wszystkie.filter(PRESETY_ZMIAN[preset].filtr);
      const s = k.ustawienia.stagnacja;
      const liczby = Object.entries(PRESETY_ZMIAN).filter(([id]) => id !== "wszyscy").map(([id, p]) => [id, `${p.nazwa} (${wszystkie.filter(p.filtr).length})`]);
      const zmien = (pole2) => (wartosc2) => k.przejdz("zmiany", { ...k.opcje, [pole2]: wartosc2 });
      return widokListy({
        kontekst: k,
        tytul: `Zmiany: ${PRESETY_ZMIAN[preset].nazwa}, okres ${OKRESY_ZMIAN.find(([id]) => id === okres)[1]}`,
        opis: `Bieżący skan każdego członu porównany z jego migawką z wybranego okresu. Deff i OFF to ludność jednostek. „Bez rozwoju” dostaje gracz z pełnymi danymi w obu skanach, odstępem co najmniej ${s.dni} dni, wzrostem poniżej ${s.punkty} punktów i bez przyrostu wojska ani wiosek. „Straty” to utrata wioski albo co najmniej ${s.straty} ludności wojska. „Nowy OFF” to przyrost offu o ${s.nowyOff} ludności.`,
        wiersze,
        szukajW: (w) => `${w.nick} ${w.ocena || ""}`,
        sort: { klucz: "punkty", malejaco: true },
        pusty: wszystkie.some((w) => w.dataBazowa) ? "Nikt nie pasuje do wybranego presetu." : "Brak wcześniejszej migawki. Historia rośnie z każdym skanem, jedna migawka na dzień na człon.",
        naWiersz: (w) => k.przejdz("akta", { id: w.id }),
        dodatki: [
          wybor(okres, OKRESY_ZMIAN, zmien("okres")),
          wybor(preset, [["wszyscy", "Wszyscy"], ...liczby], zmien("preset"))
        ],
        kolumny: [
          kolCzlon,
          kolGracz,
          kolData("dataBazowa", "Porównano z", (w) => w.dataBazowa),
          kolLiczba("godziny", "Odstęp (h)", (w) => w.godziny),
          kolRoznica("punkty", "Punkty", (w) => w.punkty),
          kolRoznica("wioski", "Wioski", (w) => w.wioski),
          kolRoznica("deff", "Deff (lud.)", (w) => w.deff),
          kolRoznica("off", "OFF (lud.)", (w) => w.off),
          kolRoznica("snob", "Szlachcice", (w) => w.snob),
          kolOcena,
          { klucz: "powod", tytul: "Uwaga", wartosc: (w) => w.nowyWCzlonie ? "nowy w członie" : w.powod, klasa: () => "ep-szary" }
        ]
      });
    }
  };

  // src/moduly/akta.js
  var JEDNOSTKI_AKT = ["spear", "sword", "heavy", "spy", "axe", "light", "ram", "catapult", "snob"];
  var znacznik = (tekst, klasa = "") => el("span", { className: `ep-znacznik ${klasa}`.trim(), textContent: tekst });
  var fakt = (nazwa, ...wartosc2) => el(
    "div",
    { className: "ep-fakt" },
    el("span", { className: "ep-fakt-nazwa", textContent: nazwa }),
    el("span", { className: "ep-fakt-wartosc" }, ...wartosc2)
  );
  var sekcja2 = (tytul, ...tresc2) => el("section", { className: "ep-sekcja" }, el("h3", { textContent: tytul }), ...tresc2);
  function zbierzAkta(k, id) {
    const gracz = k.model.gracze.find((g) => g.id === String(id));
    if (!gracz) return null;
    const czlon = k.dane.czlony[gracz.czlon];
    const wioski3 = k.model.wioski.filter((w) => w.idGracza === gracz.id);
    const aktywnosc2 = k.obstawy.aktywnosc.find((a) => a.id === gracz.id) || null;
    const wpisy = wpisyGracza(k.dane, gracz.id);
    const kandydatka = migawkaBazowa(k.dane.historia[gracz.czlon], "7");
    const bazowa = kandydatka && czlon && kandydatka.data < czlon.data ? kandydatka : null;
    const nowa = czlon ? migawkaCzlonu(czlon).gracze[gracz.id] : null;
    const porownanie = porownajGracza(bazowa ? bazowa.gracze[gracz.id] : null, nowa);
    const godziny = bazowa && czlon ? (new Date(czlon.data) - new Date(bazowa.data)) / 36e5 : null;
    return {
      gracz,
      czlon,
      wioski: wioski3,
      aktywnosc: aktywnosc2,
      wpisy,
      saldo: saldo(wpisy),
      saldo30: saldo(wpisy, 30),
      przebieg: przebiegGracza(k.dane, gracz.czlon, gracz.id),
      porownanie,
      dataBazowa: bazowa ? bazowa.data : null,
      rozwoj: ocenRozwoj(porownanie, godziny, k.ustawienia),
      obstawyGracza: k.obstawy.cele.flatMap((c) => c.naGraczy.filter((n) => n.nick === gracz.nick).map((n) => ({ ...n, koord: c.koord, wlasciciel: c.nick, plan: c.paczek }))),
      selekcja: k.selekcja?.wiersze.find((w) => w.id === gracz.id) || null,
      slad: k.selekcja?.slad(gracz.id) || null,
      publiczne: rankingCzlonow(k.dane.puls, k.ustawienia, "7").find((w) => w.id === gracz.id) || null,
      ruchy: ruchyCzlonow(k.dane.puls, k.ustawienia, k.slownik).filter((r) => r.id === gracz.id),
      typy: ["off", "deff", "mix"].map((typ) => [typ, wioski3.filter((w) => w.typ === typ).length])
    };
  }
  function aktaBB(a) {
    const { gracz, aktywnosc: aktywnosc2, saldo: s } = a;
    const linie = [
      `[b]Akta: [player]${gracz.nick}[/player] ([ally]${gracz.czlon}[/ally])[/b]`,
      `Punkty: ${formatLiczby(gracz.punkty)}, wioski: ${formatLiczby(gracz.wioski)}, eko głównej: ${gracz.eko || "brak danych"}`,
      `Wojsko: ${JEDNOSTKI_AKT.map((j) => `[unit]${j}[/unit] ${formatLiczby(gracz[j])}`).join(" ")}`,
      `Selekcja: ${a.selekcja ? `${a.selekcja.etykieta}, punkty ${formatLiczby(a.selekcja.punktySelekcji)}, pokrycie ${a.selekcja.pokrycie}%` : "brak danych"}`,
      ...a.slad ? liniaSladu(a.slad) : [],
      `Obstawy: ${aktywnosc2 ? `stoi ${formatLiczby(aktywnosc2.paczki)}, w drodze ${formatLiczby(aktywnosc2.paczkiWDrodze)} paczek na ${aktywnosc2.cele} wioskach, status ${aktywnosc2.status}` : "brak danych"}`,
      `Dziennik: ${s.pochwaly} pochwał, ${s.kary} kar, saldo ${formatRoznicy(s.saldo)}`
    ];
    return linie.join("\n");
  }
  function naglowek2(k, a) {
    const { gracz } = a;
    const dostep = gracz.braki.length ? `brak: ${gracz.braki.join(", ")}` : "pełny";
    const pole2 = el("textarea", { className: "ep-bb", readOnly: true, rows: 7, hidden: true });
    const bb = przycisk("BB-kody akt", async () => {
      pole2.value = aktaBB(a);
      pole2.hidden = false;
      pole2.select();
      try {
        await navigator.clipboard.writeText(pole2.value);
        k.komunikat("Skopiowano BB-kody.");
      } catch {
        k.komunikat("Zaznaczono BB-kody. Skopiuj je przez Ctrl+C.");
      }
    });
    return el(
      "section",
      { className: "ep-sekcja" },
      el(
        "div",
        { className: "ep-naglowek-gracza" },
        el("h2", { textContent: gracz.nick }),
        znacznik(gracz.czlon),
        znacznik(`selekcja: ${a.selekcja?.etykieta || "brak danych"}`, KLASY_ETYKIET[a.selekcja?.etykieta] || "ep-szary"),
        znacznik(`saldo ${formatRoznicy(a.saldo.saldo)}`, klasaRoznicy(a.saldo.saldo)),
        el("span", { className: "ep-odstep" }),
        przycisk("Inny gracz", () => k.przejdz("akta")),
        przycisk("Wioski", () => k.przejdz("wioski", { szukaj: gracz.nick })),
        bb
      ),
      el(
        "div",
        { className: "ep-fakty" },
        fakt("Punkty", formatLiczby(gracz.punkty)),
        fakt("Wioski", formatLiczby(gracz.wioski)),
        fakt("Dostęp do danych", el("span", { className: gracz.braki.length ? "ep-zle" : "ep-dobrze", textContent: dostep })),
        fakt("Eko głównej", gracz.eko || "—"),
        fakt("Wioski z kiszeniem", el("span", { className: gracz.kiszone ? "ep-zle" : "", textContent: String(gracz.kiszone) })),
        fakt("Skan", a.czlon ? formatDaty(a.czlon.data) : "—")
      ),
      pole2
    );
  }
  function kryteriaIObstawy(a) {
    const { aktywnosc: aktywnosc2 } = a;
    const statusKlasa = { wysyła: "ep-dobrze", "w drodze": "ep-typ-deff", ignoruje: "ep-zle", front: "ep-typ-off" }[aktywnosc2?.status] || "ep-szary";
    return el(
      "div",
      { className: "ep-sekcje" },
      a.slad ? sekcja2("Selekcja: skąd ten wynik", drzewoSladu(a.slad)) : null,
      sekcja2(
        "Obstawy",
        el(
          "div",
          { className: "ep-fakty" },
          fakt("Status", znacznik(aktywnosc2 ? aktywnosc2.status : "brak danych", statusKlasa)),
          fakt("Paczki stoją", formatLiczby(aktywnosc2?.paczki ?? null)),
          fakt("Paczki w drodze", formatLiczby(aktywnosc2?.paczkiWDrodze ?? null)),
          fakt("Wioski z planu", formatLiczby(aktywnosc2?.cele ?? null)),
          fakt("Rozkazy w drodze", formatLiczby(aktywnosc2?.rozkazy ?? null)),
          fakt("Paczki w domu", formatLiczby(aktywnosc2?.wDomu ?? null)),
          fakt("Udział", aktywnosc2?.udzial === null || aktywnosc2?.udzial === void 0 ? "—" : `${aktywnosc2.udzial}%`)
        )
      )
    );
  }
  function wojsko(a) {
    const { gracz, typy } = a;
    return sekcja2(
      "Wojsko we wszystkich wioskach",
      el(
        "div",
        { className: "ep-fakty" },
        ...JEDNOSTKI_AKT.map((j) => fakt(JEDNOSTKI[j], ikonaJednostki(j), formatLiczby(gracz[j]))),
        fakt("Typy wiosek", ...typy.map(([typ, ile]) => znacznik(`${typ.toUpperCase()} ${ile}`, `ep-typ-${typ}`)))
      )
    );
  }
  var zRoznica = (teraz2, roznica2) => [
    formatLiczby(teraz2),
    " ",
    el("span", { className: klasaRoznicy(roznica2), textContent: formatRoznicy(roznica2) })
  ];
  function obstawyGracza(a) {
    if (!a.obstawyGracza.length) return null;
    const tabela2 = stworzTabele({
      sort: { klucz: "razem", malejaco: true },
      kolumny: [
        kolWioska,
        { klucz: "wlasciciel", tytul: "Właściciel", wartosc: (o) => o.wlasciciel },
        kolLiczba("stoi", "Stoi", (o) => o.stoi),
        kolLiczba("wDrodze", "W drodze", (o) => o.wDrodze),
        kolLiczba("razem", "Razem", (o) => o.razem),
        kolLiczba("plan", "Plan wioski", (o) => o.plan)
      ]
    });
    tabela2.pokaz(a.obstawyGracza);
    return sekcja2("Paczki na obstawach, wioska po wiosce", tabela2.element);
  }
  function publiczne({ publiczne: p, ruchy: ruchy2 }) {
    if (!p) return null;
    const opisRuchu = (r) => `${r.rodzaj}: ${r.z || "—"} → ${r.na || "—"}, wykryto ${formatDaty(r.doDaty)}${r.blokadaTrwa ? `, blokada do ${formatDaty(r.koniecBlokady)}` : ""}`;
    return sekcja2(
      "Dane publiczne, różnica 7 dni",
      el(
        "div",
        { className: "ep-fakty" },
        fakt("Punkty", ...zRoznica(p.punktyTeraz, p.punkty)),
        fakt("Wioski", ...zRoznica(p.wioskiTeraz, p.wioski)),
        fakt("RA", ...zRoznica(p.raTeraz, p.ra)),
        fakt("RO", ...zRoznica(p.roTeraz, p.ro)),
        fakt("RW", ...zRoznica(p.rwTeraz, p.rw)),
        fakt("Ocena", znacznik(p.ocena || "brak danych"))
      ),
      ...ruchy2.map((r) => el("p", { className: "ep-opis", textContent: opisRuchu(r) }))
    );
  }
  function historia(a) {
    const { porownanie, rozwoj } = a;
    const roznica2 = (nazwa, w) => fakt(nazwa, el("span", { className: klasaRoznicy(w), textContent: formatRoznicy(w) }));
    const tabela2 = stworzTabele({
      sort: { klucz: "data", malejaco: true },
      pusty: "Brak migawek. Historia rośnie z każdym skanem.",
      kolumny: [
        kolData("data", "Skan", (m) => m.data),
        kolLiczba("punkty", "Punkty", (m) => m.punkty),
        kolLiczba("wioski", "Wioski", (m) => m.wioski),
        kolLiczba("deff", "Deff (lud.)", (m) => m.deff),
        kolLiczba("off", "OFF (lud.)", (m) => m.off),
        kolLiczba("snob", "Szlachcice", (m) => m.snob),
        { klucz: "kompletny", tytul: "Skan", wartosc: (m) => m.kompletny ? "pełny" : "przerwany", klasa: (m) => m.kompletny ? "ep-dobrze" : "ep-zle" }
      ]
    });
    tabela2.pokaz(a.przebieg);
    return el(
      "div",
      { className: "ep-dwie-kolumny" },
      sekcja2(
        "Zmiany od ostatnich 7 dni",
        el(
          "div",
          { className: "ep-fakty" },
          fakt("Porównano z", a.dataBazowa ? formatDaty(a.dataBazowa) : "—"),
          fakt("Ocena", znacznik(rozwoj.ocena || `brak danych: ${rozwoj.powod}`, KLASY_OCEN[rozwoj.ocena] || "ep-szary")),
          roznica2("Punkty", porownanie?.punkty ?? null),
          roznica2("Wioski", porownanie?.wioski ?? null),
          roznica2("Deff (lud.)", porownanie?.deff ?? null),
          roznica2("OFF (lud.)", porownanie?.off ?? null),
          roznica2("Szlachcice", porownanie?.snob ?? null)
        )
      ),
      sekcja2("Historia skanów", tabela2.element)
    );
  }
  function wioski(a) {
    const tabela2 = stworzTabele({
      sort: { klucz: "punkty", malejaco: true },
      pusty: "Brak wiosek w skanie.",
      kolumny: [
        kolWioska,
        { klucz: "nazwa", tytul: "Nazwa", wartosc: (w) => w.nazwa },
        kolLiczba("punkty", "Punkty", (w) => w.punkty),
        kolTyp,
        ...["spear", "sword", "heavy", "axe", "light", "ram", "snob"].map((id) => kolJednostka(id, (w) => w.wlasne ? w.wlasne[id] || 0 : null)),
        kolLiczba("odleglosc", "Do wroga", (w) => w.odleglosc),
        { klucz: "kiszenie", tytul: "Kiszenie", wartosc: (w) => w.kiszenie ? "tak" : null, tekst: (w) => w.kiszenie ? "tak" : "—", klasa: (w) => w.kiszenie ? "ep-zle" : "ep-szary" }
      ]
    });
    tabela2.pokaz(a.wioski);
    return sekcja2("Wioski", tabela2.element);
  }
  function kartaWpisu(k, wpis) {
    const usun = el("button", { type: "button", className: "ep-usun", textContent: "usuń" });
    usun.addEventListener("click", async () => {
      if (usun.textContent !== "na pewno?") {
        usun.textContent = "na pewno?";
        return;
      }
      usunWpis(k.swiat, wpis.id);
      await k.odswiez();
    });
    return el(
      "div",
      { className: `ep-wpis ep-wpis-${wpis.typ}` },
      el("span", {}, znacznik(`${TYPY[wpis.typ]} ${formatRoznicy(wpis.punkty)}`, { pochwala: "ep-dobrze", kara: "ep-zle" }[wpis.typ] || "ep-szary"), ` ${wpis.powod}`),
      el("span", { className: "ep-wpis-meta", textContent: `${formatDaty(wpis.data)}${wpis.autor ? `, ${wpis.autor}` : ""}` }),
      usun,
      wpis.tekst ? el("div", { className: "ep-wpis-tresc", textContent: wpis.tekst }) : null,
      wpis.dowod ? el("div", { className: "ep-wpis-dowod", textContent: `Dowód: ${wpis.dowod}` }) : null
    );
  }
  function listaWpisow(k, wpisy, pusty = "Brak wpisów.") {
    return el(
      "div",
      { className: "ep-wpisy" },
      ...wpisy.length ? wpisy.map((w) => kartaWpisu(k, w)) : [el("p", { className: "ep-opis", textContent: pusty })]
    );
  }
  function formularzWpisu(k, a) {
    const typ = el("select", { className: "ep-pole" }, ...Object.entries(TYPY).map(([id, nazwa]) => el("option", { value: id, textContent: nazwa })));
    const powod = el("select", { className: "ep-pole" }, ...POWODY.map((p) => el("option", { value: p, textContent: p })));
    const punkty = el("input", { type: "number", className: "ep-pole", value: PUNKTY_DOMYSLNE.notatka });
    const tekst = el("textarea", { className: "ep-bb", rows: 2, placeholder: "Treść wpisu dla rady" });
    typ.value = k.opcje.typ && TYPY[k.opcje.typ] ? k.opcje.typ : "notatka";
    if (k.opcje.powod && POWODY.includes(k.opcje.powod)) powod.value = k.opcje.powod;
    punkty.value = PUNKTY_DOMYSLNE[typ.value];
    if (k.opcje.dowod) tekst.value = k.opcje.dowod;
    typ.addEventListener("change", () => {
      punkty.value = PUNKTY_DOMYSLNE[typ.value];
    });
    const dodaj = przycisk("Dodaj wpis", async () => {
      try {
        zapiszWpis(k.swiat, nowyWpis({
          idGracza: a.gracz.id,
          nick: a.gracz.nick,
          czlon: a.gracz.czlon,
          typ: typ.value,
          powod: powod.value,
          punkty: Number(punkty.value),
          tekst: tekst.value,
          autor: window.game_data?.player?.name
        }));
        await k.odswiez();
        k.przejdz("akta", { id: a.gracz.id });
        k.komunikat("Dodano wpis.");
      } catch (blad) {
        k.komunikat(`Błąd: ${blad.message}`);
      }
    }, "ep-glowny");
    return el(
      "div",
      { className: "ep-formularz-wpisu" },
      el("label", {}, "Typ", typ),
      el("label", {}, "Powód", powod),
      el("label", {}, "Punkty", punkty),
      tekst,
      el("div", { className: "ep-szeroki ep-wiersz" }, dodaj)
    );
  }
  function wyborGracza(k) {
    const szukaj = el("input", { type: "search", className: "ep-pole", placeholder: "Nick gracza…", value: k.opcje.szukaj || "" });
    const lista = el("div", { className: "ep-lista-graczy" });
    const rysuj = () => {
      const fraza = szukaj.value.trim().toLocaleLowerCase("pl");
      const gracze2 = k.model.gracze.filter((g) => !fraza || g.nick.toLocaleLowerCase("pl").includes(fraza)).sort((a, b) => a.nick.localeCompare(b.nick, "pl"));
      lista.replaceChildren(...gracze2.map((g) => {
        const b = el("button", { type: "button" }, g.nick, el("span", { className: "ep-mini", textContent: `${g.czlon}, ${formatLiczby(g.punkty)} pkt` }));
        b.addEventListener("click", () => k.przejdz("akta", { id: g.id }));
        return b;
      }));
    };
    szukaj.addEventListener("input", rysuj);
    rysuj();
    return el(
      "div",
      { className: "ep-widok ep-widok-przewijany" },
      el("p", { className: "ep-opis", textContent: "Akta gracza: selekcja, obstawy, wojsko, wioski, historia skanów i wpisy rady na jednej stronie. Wybierz gracza." }),
      el("div", { className: "ep-wybor-gracza" }, szukaj),
      lista
    );
  }
  var akta = {
    id: "akta",
    tytul: "Akta",
    grupa: "Kontrola",
    widok(k) {
      const a = k.opcje.id ? zbierzAkta(k, k.opcje.id) : null;
      if (!a) return wyborGracza(k);
      return el(
        "div",
        { className: "ep-widok ep-widok-przewijany" },
        naglowek2(k, a),
        kryteriaIObstawy(a),
        obstawyGracza(a),
        wojsko(a),
        publiczne(a),
        historia(a),
        wioski(a),
        sekcja2("Wpisy rady", formularzWpisu(k, a), el("div", { style: "height:10px" }), listaWpisow(k, a.wpisy, "Brak wpisów o tym graczu."))
      );
    }
  };

  // src/moduly/aktywnosc.js
  var KLASY = { wysyła: "ep-dobrze", "w drodze": "ep-typ-deff", ignoruje: "ep-zle", front: "ep-typ-off" };
  var aktywnosc = {
    id: "aktywnosc",
    tytul: "Aktywność",
    grupa: "Obrona",
    widok(k) {
      const o = k.obstawy;
      const nasi = new Set(k.model.gracze.map((g) => g.id));
      return el(
        "div",
        { className: "ep-widok" },
        o.pelne ? null : el("div", {
          className: "ep-uwaga",
          textContent: "Dane są niepełne, więc nikt nie dostaje statusu „ignoruje”. Potrzebny jest skan wszystkich członów i widoczne wsparcie w każdej wiosce z planu."
        }),
        widokListy({
          kontekst: k,
          tytul: "Aktywność na obstawach",
          opis: "Liczone są paczki stojące w wioskach z planu. „W drodze” to gracz z widocznym rozkazem wsparcia na wioskę z planu, bez paczek na miejscu. Status „front” mają gracze, których wszystkie wioski są blisko wroga. Kliknij wiersz, żeby otworzyć akta.",
          wiersze: o.aktywnosc,
          szukajW: (a) => a.nick,
          sort: { klucz: "paczki", malejaco: true },
          naWiersz: (a) => {
            if (nasi.has(a.id)) k.przejdz("akta", { id: a.id });
          },
          kolumny: [
            kolCzlon,
            kolGracz,
            kolLiczba("paczki", "Paczki stoją", (a) => a.paczki),
            kolLiczba("paczkiWDrodze", "Paczki w drodze", (a) => a.paczkiWDrodze),
            kolLiczba("cele", "Wioski", (a) => a.cele),
            kolLiczba("rozkazy", "Rozkazy w drodze", (a) => a.rozkazy),
            kolLiczba("wDomu", "Paczki w domu", (a) => a.wDomu),
            {
              klucz: "udzial",
              tytul: "Udział",
              wartosc: (a) => a.udzial,
              tekst: (a) => a.udzial === null ? "—" : `${a.udzial}%`,
              tlo: (a) => a.udzial
            },
            { klucz: "status", tytul: "Status", wartosc: (a) => a.status, klasa: (a) => KLASY[a.status] || "ep-szary" }
          ]
        })
      );
    }
  };

  // src/moduly/budynki.js
  var budynki = {
    id: "budynki",
    tytul: "Budynki",
    grupa: "Dane",
    widok(k) {
      const zBudynkami = k.model.wioski.filter((w) => w.budynki);
      const obecne = new Set(zBudynkami.flatMap((w) => Object.keys(w.budynki)));
      return widokListy({
        kontekst: k,
        tytul: "Budynki",
        wiersze: zBudynkami,
        szukajW: (w) => `${w.nick} ${w.koord}`,
        sort: { klucz: "main", malejaco: true },
        pusty: "Brak danych o budynkach. Uruchom skan w zakładce Dane.",
        kolumny: [
          kolCzlon,
          kolGracz,
          kolWioska,
          ...Object.keys(BUDYNKI).filter((id) => obecne.has(id)).map(kolBudynek)
        ]
      });
    }
  };

  // src/rdzen/parsery.js
  function liczba5(komorka) {
    return komorka ? Number(komorka.textContent.replace(/\D/g, "")) || 0 : 0;
  }
  function czytajGraczy(strona) {
    return [...strona.querySelectorAll('select[name="player_id"] option[value]')].map((opcja) => ({
      id: opcja.value,
      nick: opcja.textContent.replace(/\(brak dostępu\)/i, "").trim(),
      dostep: !opcja.disabled
    }));
  }
  function czytajKolumny(tabela2) {
    const kolumny = [];
    [...tabela2.rows[0].cells].forEach((komorka, indeks) => {
      const ikona = komorka.querySelector("img");
      if (!ikona) return;
      const plik = (ikona.getAttribute("src") || "").split("/").pop();
      const nazwa = plik.replace(/\.(?:webp|png|gif|jpe?g).*$/i, "").replace(/^unit_/, "");
      if (nazwa) kolumny.push({ nazwa, indeks });
    });
    return kolumny;
  }
  function czytajWioske(wiersz) {
    const link = wiersz.querySelector('a[href*="screen=info_village"]');
    if (!link) return null;
    const id = /[?&]id=(\d+)/.exec(link.getAttribute("href"));
    const opis2 = /^(.*)\((\d+)\|(\d+)\)\s*K\d+\s*$/s.exec(link.textContent.trim());
    if (!id || !opis2) return null;
    return {
      id: id[1],
      nazwa: opis2[1].trim(),
      x: Number(opis2[2]),
      y: Number(opis2[3]),
      punkty: liczba5(wiersz.cells[1])
    };
  }
  function czytajTabele(strona, klucz2) {
    const tabela2 = strona.querySelector("#ally_content table.vis.w100, #content_value table.vis.w100");
    if (!tabela2 || !tabela2.rows.length) return null;
    const kolumny = czytajKolumny(tabela2);
    if (!kolumny.length) return null;
    const wioski3 = [];
    for (let i = 1; i < tabela2.rows.length; i += 1) {
      const wiersz = tabela2.rows[i];
      const wioska = czytajWioske(wiersz);
      if (!wioska) continue;
      const wartosci = {};
      for (const { nazwa, indeks } of kolumny) wartosci[nazwa] = liczba5(wiersz.cells[indeks]);
      if (klucz2 === "defense") {
        const drugi = tabela2.rows[i + 1];
        if (!drugi || !/w drodze/i.test(drugi.cells[0].textContent)) return null;
        const wDrodze2 = {};
        for (const { nazwa, indeks } of kolumny) {
          if (nazwa in JEDNOSTKI) wDrodze2[nazwa] = liczba5(drugi.cells[indeks - 2]);
        }
        wioski3.push({ ...wioska, wWiosce: wartosci, wDrodze: wDrodze2 });
        i += 1;
      } else {
        wioski3.push({ ...wioska, [klucz2 === "troops" ? "wlasne" : "budynki"]: wartosci });
      }
    }
    return wioski3;
  }

  // src/rdzen/skan.js
  async function skanuj({ postep = () => {
  }, czyStop = () => false, opoznienie = OPOZNIENIE_MS } = {}) {
    const { world: swiat, player } = window.game_data;
    const tag = await tagPlemienia(player.ally);
    const gracze2 = /* @__PURE__ */ new Map();
    const zadania = [];
    for (const [klucz2, { tryb, nazwa }] of Object.entries(TRYBY)) {
      postep(`Pobieram listę graczy: ${nazwa}`, 0);
      const strona = await pobierzStrone(urlTrybu(tryb), opoznienie);
      if (!strona) throw new Error(`Brak uprawnień do strony: ${nazwa}.`);
      const lista = czytajGraczy(strona);
      if (!lista.length) throw new Error(`Nie rozpoznano strony: ${nazwa}. Nic nie zapisano.`);
      for (const { id, nick, dostep } of lista) {
        if (!gracze2.has(id)) gracze2.set(id, { id, nick, dostep: {}, wioski: {} });
        gracze2.get(id).dostep[klucz2] = dostep ? "tak" : "nie";
        if (dostep) zadania.push({ klucz: klucz2, tryb, nazwa, id });
      }
      await czekaj(opoznienie);
    }
    let wykonane = 0;
    let przerwane = false;
    for (const { klucz: klucz2, tryb, nazwa, id } of zadania) {
      if (czyStop()) {
        przerwane = true;
        break;
      }
      const gracz = gracze2.get(id);
      postep(`${gracz.nick}: ${nazwa} (${wykonane + 1}/${zadania.length})`, wykonane / zadania.length);
      const strona = await pobierzStrone(urlTrybu(tryb, id), opoznienie);
      const wioski3 = strona ? czytajTabele(strona, klucz2) : null;
      if (wioski3) {
        for (const wioska of wioski3) gracz.wioski[wioska.id] = { ...gracz.wioski[wioska.id], ...wioska };
      } else {
        gracz.dostep[klucz2] = "błąd";
      }
      wykonane += 1;
      await czekaj(opoznienie);
    }
    const dane2 = wczytajDane(swiat);
    if (!przerwane || !dane2.czlony[tag]) {
      dane2.czlony[tag] = {
        tag,
        skanowal: player.name,
        data: (/* @__PURE__ */ new Date()).toISOString(),
        kompletny: !przerwane,
        gracze: Object.fromEntries(gracze2)
      };
      dopiszMigawke(dane2, dane2.czlony[tag]);
      zapiszDane(swiat, dane2);
    }
    return { tag, wykonane, wszystkie: zadania.length, przerwane };
  }

  // src/moduly/dane.js
  function pole(etykieta, wejscie2) {
    return el("label", {}, etykieta, wejscie2);
  }
  function wejscie(wartosc2, typ = "number") {
    return el("input", { type: typ, className: "ep-pole", value: wartosc2 });
  }
  function sekcjaSkanu(k) {
    const opis2 = el("div", { className: "ep-opis", textContent: "Skan czyta strony Twojego członu po kolei i zajmuje kilka minut. Przerywa się przy CAPTCHA." });
    const wypelnienie = el("div");
    const pasek = el("div", { className: "ep-pasek-postepu", hidden: true }, wypelnienie);
    let stop = false;
    const stopBtn = przycisk("STOP", () => {
      stop = true;
    });
    stopBtn.disabled = true;
    const start = przycisk("Skanuj mój człon", async () => {
      stop = false;
      start.disabled = true;
      stopBtn.disabled = false;
      pasek.hidden = false;
      try {
        const wynik = await skanuj({
          postep: (tekst, ulamek) => {
            opis2.textContent = tekst;
            wypelnienie.style.width = `${Math.round(ulamek * 100)}%`;
          },
          czyStop: () => stop
        });
        await k.odswiez();
        k.komunikat(wynik.przerwane ? `Przerwano po ${wynik.wykonane} z ${wynik.wszystkie} stron.` : `Zeskanowano ${wynik.tag}.`);
      } catch (blad) {
        opis2.textContent = `${blad.message} Niczego nie zapisano.`;
        opis2.className = "ep-uwaga";
        start.disabled = false;
        stopBtn.disabled = true;
      }
    }, "ep-glowny");
    return el("section", { className: "ep-sekcja" }, el("h3", { textContent: "Skan" }), el("div", { className: "ep-wiersz" }, start, stopBtn), opis2, pasek);
  }
  function sekcjaPlikow(k) {
    const wybor3 = el("input", { type: "file", accept: ".json", hidden: true });
    wybor3.addEventListener("change", async () => {
      const plik = wybor3.files[0];
      if (!plik) return;
      try {
        const dane2 = wczytajDane(k.swiat);
        const dodane = polaczDane(dane2, JSON.parse(await plik.text()), k.swiat);
        zapiszDane(k.swiat, dane2);
        await k.odswiez();
        k.komunikat(`Zaimportowano: ${dodane.join(", ") || "nic nowego"}.`);
      } catch (blad) {
        k.komunikat(`Błąd importu: ${blad.message}`);
      }
    });
    const wyczysc = przycisk("Wyczyść dane", async () => {
      if (wyczysc.textContent !== "Na pewno wyczyścić?") {
        wyczysc.textContent = "Na pewno wyczyścić?";
        return;
      }
      wyczyscDane(k.swiat);
      await k.odswiez();
    });
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Pliki" }),
      el(
        "div",
        { className: "ep-wiersz" },
        przycisk("Pobierz JSON", () => pobierzPlik(`plemie_${k.swiat}_${znacznikCzasu()}.json`, JSON.stringify(wczytajDane(k.swiat)), "application/json")),
        przycisk("Pobierz CSV", () => pobierzPlik(`plemie_${k.swiat}_${znacznikCzasu()}.csv`, generujCSV(wczytajDane(k.swiat)), "text/csv")),
        przycisk("Importuj JSON", () => wybor3.click()),
        wyczysc,
        wybor3
      )
    );
  }
  function sekcjaUstawien(k) {
    const u = k.ustawienia;
    const czlony = wejscie(u.czlony.join(" "), "text");
    const wrogowie = wejscie(u.wrogowie.join(" "), "text");
    const front = wejscie(u.front);
    const kiszeniePaczek = wejscie(u.kiszeniePaczek);
    const forumObstaw = wejscie(u.forumObstaw, "text");
    const paczkaPik = wejscie(u.paczka.spear);
    const paczkaMiecz = wejscie(u.paczka.sword);
    const paczkaCk = wejscie(u.paczka.heavy);
    const stagnacjaDni = wejscie(u.stagnacja.dni);
    const stagnacjaPunkty = wejscie(u.stagnacja.punkty);
    const stagnacjaStraty = wejscie(u.stagnacja.straty);
    const stagnacjaOff = wejscie(u.stagnacja.nowyOff);
    const stagnacjaWalka = wejscie(u.stagnacja.walka);
    const blokadaDni = wejscie(u.blokadaDni);
    const pochwalaUdzial = wejscie(u.pochwalaUdzial);
    const prosbaTemat = wejscie(u.prosba.temat, "text");
    const prosbaTresc = el("textarea", { className: "ep-bb", rows: 6, value: u.prosba.tresc });
    const odstepS = wejscie(u.wysylka.odstepS);
    const blokadaH = wejscie(u.wysylka.blokadaH);
    const maksWiekH = wejscie(u.wysylka.maksWiekH);
    const tagi = (p) => p.value.split(/\s+/).filter(Boolean);
    const zapisz = przycisk("Zapisz ustawienia", async () => {
      zapiszUstawienia(k.swiat, {
        ...u,
        czlony: tagi(czlony),
        wrogowie: tagi(wrogowie),
        front: Number(front.value),
        kiszeniePaczek: Number(kiszeniePaczek.value),
        forumObstaw: forumObstaw.value.trim(),
        paczka: { spear: Number(paczkaPik.value), sword: Number(paczkaMiecz.value), heavy: Number(paczkaCk.value) },
        stagnacja: {
          dni: Number(stagnacjaDni.value),
          punkty: Number(stagnacjaPunkty.value),
          straty: Number(stagnacjaStraty.value),
          nowyOff: Number(stagnacjaOff.value),
          walka: Number(stagnacjaWalka.value)
        },
        blokadaDni: Number(blokadaDni.value),
        pochwalaUdzial: Number(pochwalaUdzial.value),
        prosba: { temat: prosbaTemat.value.trim() || PROSBA_DOMYSLNA.temat, tresc: prosbaTresc.value.trim() || PROSBA_DOMYSLNA.tresc },
        wysylka: {
          odstepS: Math.max(1, Number(odstepS.value) || 5),
          blokadaH: Math.max(0, Number(blokadaH.value) || 0),
          maksWiekH: Math.max(1, Number(maksWiekH.value) || 24)
        }
      });
      await k.odswiez();
      k.komunikat("Zapisano ustawienia.");
    }, "ep-glowny");
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Ustawienia" }),
      el(
        "div",
        { className: "ep-formularz" },
        pole("Nasze człony (tagi)", czlony),
        pole("Wrogowie (tagi)", wrogowie),
        pole("Front do pól", front),
        pole("Lista Kiszenie: od paczek deffu w domu", kiszeniePaczek),
        pole("Wątek z tabelą obstaw (link)", forumObstaw),
        pole("1 paczka: piki", paczkaPik),
        pole("1 paczka: miecze", paczkaMiecz),
        pole("1 paczka: CK", paczkaCk),
        pole("Bez rozwoju: minimalny odstęp skanów (dni)", stagnacjaDni),
        pole("Bez rozwoju: wzrost punktów poniżej", stagnacjaPunkty),
        pole("Straty: ubytek ludności wojska od", stagnacjaStraty),
        pole("Nowy OFF: przyrost ludności offu od", stagnacjaOff),
        pole("Walczy: nowych pokonanych (RA + RO + RW) od", stagnacjaWalka),
        pole("Blokada wsparcia po dołączeniu (dni)", blokadaDni),
        pole("Pochwała za obstawy od udziału (%)", pochwalaUdzial)
      ),
      el("h3", { textContent: "Prośba o uzupełnienie obstawy", style: "margin-top:14px" }),
      el("p", { className: "ep-opis", textContent: "Szablon wiadomości wysyłanej przyciskiem „Wyślij wiadomość” i „Wyślij do wszystkich”. Pola: {gracz} {koord} {wlasciciel} {plan} {stoi} {brakuje} {odGracza} {uzupelnic} {przyklad} {powod}. BB-kody gry działają. Puste pole przywraca domyślny tekst." }),
      el("div", { className: "ep-formularz" }, pole("Temat", prosbaTemat)),
      el("label", { style: "display:block;margin-top:8px;color:#6d5a43" }, "Treść", prosbaTresc),
      el(
        "div",
        { className: "ep-formularz", style: "margin-top:10px" },
        pole("Wyślij do wszystkich: odstęp między wiadomościami (s)", odstepS),
        pole("Wyślij do wszystkich: pomiń poproszonych w ciągu (h)", blokadaH),
        pole("Wyślij do wszystkich: odczyt nie starszy niż (h)", maksWiekH)
      ),
      el("div", { className: "ep-wiersz", style: "margin-top:12px" }, zapisz)
    );
  }
  function sekcjaHistorii(k) {
    const puls = k.dane.puls.migawki;
    const wiersze = Object.entries(k.dane.historia || {}).map(([tag, lista]) => `${tag}: ${lista.length} (od ${formatDaty(lista[0].data)})`);
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Historia skanów" }),
      el("p", {
        className: "ep-opis",
        textContent: wiersze.length ? `Migawki na człon, jedna na dzień, najwyżej ${MAKS_MIGAWEK} dni: ${wiersze.join("; ")}. Plik JSON zawiera historię i dziennik, więc import od innego radnego dokłada brakujące dni i wpisy.` : "Brak migawek. Pierwsza powstaje po skanie."
      }),
      el("p", {
        className: "ep-opis",
        textContent: puls.length ? `Dane publiczne (Ranking, Ruchy): ${puls.length} z ${MAKS_MIGAWEK_PULSU} dni, od ${formatDaty(puls[0].data)}. Migawka powstaje przy otwarciu panelu, więc żeby historia nie miała dziur, ktoś z rady otwiera panel codziennie.` : "Dane publiczne (Ranking, Ruchy): brak migawek."
      }),
      el("p", {
        className: "ep-opis",
        textContent: `Dane panelu zajmują ${(JSON.stringify(k.dane).length / 1048576).toFixed(1)} MB przed spakowaniem historii; przeglądarka mieści około 5 MB.`
      })
    );
  }
  var dane = {
    id: "dane",
    tytul: "Dane",
    grupa: "Dane",
    widok(k) {
      return el("div", { className: "ep-dane" }, sekcjaSkanu(k), sekcjaPlikow(k), sekcjaHistorii(k), sekcjaUstawien(k));
    }
  };

  // src/moduly/dziennik.js
  var OKRESY = [["7", "7 dni"], ["30", "30 dni"], ["90", "90 dni"], ["wszystko", "cały zapis"]];
  var znacznik2 = (tekst, klasa = "") => el("span", { className: `ep-znacznik ${klasa}`.trim(), textContent: tekst });
  function zapiszPropozycje(k, lista) {
    const autor = window.game_data?.player?.name;
    for (const p of lista) zapiszWpis(k.swiat, nowyWpis({ ...p, autor }));
  }
  function sekcjaPropozycji(k) {
    const propozycje = proponujWpisy(k.dane, k.model, k.obstawy, k.ustawienia);
    const karty = propozycje.map((p) => {
      const dodaj = przycisk("Dodaj", async () => {
        zapiszPropozycje(k, [p]);
        await k.odswiez();
        k.komunikat(`Dodano wpis: ${p.nick}, ${p.powod}.`);
      });
      return el(
        "div",
        { className: `ep-wpis ep-wpis-${p.typ}` },
        el("span", {}, znacznik2(`${TYPY[p.typ]} ${formatRoznicy(p.punkty)}`, p.typ === "kara" ? "ep-zle" : "ep-dobrze"), ` ${p.powod}`),
        el("span", { className: "ep-wpis-meta" }, el("b", { textContent: p.nick }), ` (${p.czlon})`),
        dodaj,
        el("div", { className: "ep-wpis-dowod", textContent: `Dowód: ${p.dowod}` })
      );
    });
    const wszystkie = przycisk(`Dodaj wszystkie (${propozycje.length})`, async () => {
      zapiszPropozycje(k, propozycje);
      await k.odswiez();
      k.komunikat(`Dodano ${propozycje.length} wpisów.`);
    }, "ep-glowny");
    wszystkie.disabled = !propozycje.length;
    return el(
      "section",
      { className: "ep-sekcja" },
      el("div", { className: "ep-wiersz" }, el("h3", { textContent: "Propozycje z bieżących danych" }), el("span", { className: "ep-odstep" }), wszystkie),
      el("p", {
        className: "ep-opis",
        textContent: `Kara pojawia się tylko na kompletnych danych: brak dostępu to wyraźne „nie” z gry, kiszenie wymaga wiosek wrogów, brak obstawy wymaga skanu wszystkich członów i widocznego wsparcia w każdej wiosce z planu. Pochwała za obstawy od ${k.ustawienia.pochwalaUdzial}% deffu na planie. Propozycja nie powtarza się przez 7 dni od takiego samego wpisu. Nic nie zapisuje się bez kliknięcia.`
      }),
      k.obstawy.pelne ? null : el("div", { className: "ep-uwaga", textContent: "Dane obstaw są niepełne, więc nie ma propozycji „brak obstawy”." }),
      el("div", { className: "ep-wpisy", style: "margin-top:10px" }, ...karty.length ? karty : [el("p", { className: "ep-opis", textContent: "Brak nowych propozycji." })])
    );
  }
  function sekcjaRankingu(k) {
    const okres = OKRESY.some(([id]) => id === k.opcje.okres) ? k.opcje.okres : "30";
    const wiersze = ranking2(k.dane, k.model, okres === "wszystko" ? null : Number(okres)).filter((w) => w.pochwaly || w.kary || w.notatki);
    const wybor3 = el("select", { className: "ep-pole" }, ...OKRESY.map(([id, nazwa]) => el("option", { value: id, textContent: nazwa })));
    wybor3.value = okres;
    wybor3.addEventListener("change", () => k.przejdz("dziennik", { ...k.opcje, okres: wybor3.value }));
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Ranking" }),
      widokListy({
        kontekst: k,
        tytul: `Ranking dziennika, ${OKRESY.find(([id]) => id === okres)[1]}`,
        wiersze,
        szukajW: (w) => w.nick,
        sort: { klucz: "saldo", malejaco: true },
        pusty: "Brak wpisów w wybranym okresie.",
        naWiersz: (w) => k.przejdz("akta", { id: w.id }),
        dodatki: [wybor3],
        kolumny: [
          kolCzlon,
          kolGracz,
          kolLiczba("pochwaly", "Pochwały", (w) => w.pochwaly),
          kolLiczba("kary", "Kary", (w) => w.kary),
          kolLiczba("notatki", "Notatki", (w) => w.notatki),
          kolRoznica("saldo", "Saldo", (w) => w.saldo),
          kolData("ostatni", "Ostatni wpis", (w) => w.ostatni)
        ]
      })
    );
  }
  function sekcjaWpisow(k) {
    const wpisy = aktywneWpisy(k.dane);
    const szukaj = el("input", { type: "search", className: "ep-pole", placeholder: "Nick, powód, treść…", value: k.opcje.szukaj || "" });
    const typ = el("select", { className: "ep-pole" }, el("option", { value: "", textContent: "Wszystkie typy" }), ...Object.entries(TYPY).map(([id, n]) => el("option", { value: id, textContent: n })));
    const licznik = el("span", { className: "ep-licznik" });
    const pole2 = el("textarea", { className: "ep-bb", readOnly: true, rows: 8, hidden: true });
    const lista = el("div");
    const widoczne = () => {
      const fraza = szukaj.value.trim().toLocaleLowerCase("pl");
      return wpisy.filter((w) => (!typ.value || w.typ === typ.value) && (!fraza || `${w.nick} ${w.powod} ${w.tekst}`.toLocaleLowerCase("pl").includes(fraza)));
    };
    const rysuj = () => {
      const w = widoczne();
      licznik.textContent = `${w.length} z ${wpisy.length}`;
      lista.replaceChildren(listaWpisow(k, w));
      pole2.hidden = true;
    };
    szukaj.addEventListener("input", rysuj);
    typ.addEventListener("change", rysuj);
    rysuj();
    const kolumny = przygotujKolumny([
      kolGracz,
      kolCzlon,
      { klucz: "typ", tytul: "Typ", wartosc: (w) => TYPY[w.typ] },
      { klucz: "powod", tytul: "Powód", wartosc: (w) => w.powod },
      kolRoznica("punkty", "Punkty", (w) => w.punkty),
      { klucz: "data", tytul: "Data", wartosc: (w) => formatDaty(w.data) },
      { klucz: "tekst", tytul: "Treść", wartosc: (w) => w.tekst || "" }
    ]);
    const bb = przycisk("BB-kody wpisów", async () => {
      pole2.value = tabelaBB("Dziennik", kolumny, widoczne());
      pole2.hidden = false;
      pole2.select();
      try {
        await navigator.clipboard.writeText(pole2.value);
        k.komunikat("Skopiowano BB-kody.");
      } catch {
        k.komunikat("Zaznaczono BB-kody. Skopiuj je przez Ctrl+C.");
      }
    });
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Wszystkie wpisy" }),
      el("div", { className: "ep-pasek" }, szukaj, typ, licznik, el("span", { className: "ep-odstep" }), bb),
      el("div", { style: "height:10px" }),
      lista,
      pole2
    );
  }
  var dziennik = {
    id: "dziennik",
    tytul: "Dziennik",
    grupa: "Kontrola",
    widok(k) {
      return el(
        "div",
        { className: "ep-widok ep-widok-przewijany" },
        el("p", {
          className: "ep-opis",
          textContent: "Pochwały, kary i notatki rady. Wpisy zapisują się lokalnie i podróżują w pliku JSON z zakładki Dane; usunięty wpis znika też u innych po imporcie. Kliknij gracza w rankingu, żeby otworzyć jego akta."
        }),
        sekcjaPropozycji(k),
        sekcjaRankingu(k),
        sekcjaWpisow(k)
      );
    }
  };

  // src/moduly/gracze.js
  var gracze = {
    id: "gracze",
    tytul: "Gracze",
    grupa: "Kontrola",
    widok(k) {
      return widokListy({
        kontekst: k,
        tytul: "Gracze",
        opis: "Własne wojska we wszystkich wioskach gracza. Kliknij wiersz, żeby otworzyć akta gracza.",
        wiersze: k.model.gracze,
        szukajW: (g) => g.nick,
        sort: { klucz: "punkty", malejaco: true },
        naWiersz: (g) => k.przejdz("akta", { id: g.id }),
        kolumny: [
          kolCzlon,
          kolGracz,
          kolLiczba("wioski", "Wioski", (g) => g.wioski),
          kolLiczba("punkty", "Punkty", (g) => g.punkty),
          ...["spear", "sword", "heavy", "axe", "light", "ram", "snob"].map((id) => kolJednostka(id, (g) => g[id])),
          { klucz: "eko", tytul: "Eko głównej", wartosc: (g) => g.eko }
        ]
      });
    }
  };

  // src/moduly/kiszenie.js
  var kiszenie = {
    id: "kiszenie",
    tytul: "Kiszenie",
    grupa: "Obrona",
    widok(k) {
      const { front, kiszeniePaczek, wrogowie } = k.ustawienia;
      return widokListy({
        kontekst: k,
        tytul: "Możliwe kiszenie deffu",
        opis: `Wioski dalej niż ${front} pól od ${wrogowie.join(", ")}, w których stoi co najmniej ${kiszeniePaczek} paczek własnego deffu. Liczy się tylko wojsko w domu, a wysłane wsparcie nie. To lista do sprawdzenia, nie wyrok.`,
        wiersze: k.model.wioski.filter((w) => w.kiszenie),
        szukajW: (w) => `${w.nick} ${w.koord}`,
        sort: { klucz: "paczki", malejaco: true },
        pusty: "Nikt nie spełnia warunków kiszenia.",
        kolumny: [
          kolCzlon,
          kolGracz,
          kolWioska,
          kolLiczba("paczki", "Paczki w domu", (w) => w.paczkiWDomu),
          kolLiczba("piki", "Piki w domu", (w) => w.wDomu.spear),
          kolLiczba("miecze", "Miecze w domu", (w) => w.wDomu.sword),
          kolLiczba("ciezcy", "CK w domu", (w) => w.wDomu.heavy),
          kolLiczba("odleglosc", "Do wroga", (w) => w.odleglosc)
        ]
      });
    }
  };

  // src/moduly/obstawy.js
  var KLASY_STRAT = { "nie stoi": "ep-zle", "stoi mniej": "ep-zle", "bez strat": "ep-dobrze", nowy: "ep-typ-deff" };
  function opisZrodla(cel) {
    if (cel.zrodlo === "skan") return `Skan ${formatDaty(cel.dataSkanu)}`;
    if (cel.zrodlo === "obrona") return "Z obrony, bez nadawców";
    return "Brak danych";
  }
  var paczkiTekst = (x) => x === null || x === void 0 ? "—" : formatLiczby(x);
  function przyciskProsby2(k, cel, gracz) {
    const wyslij = przycisk("Wyślij wiadomość", async () => {
      wyslij.disabled = true;
      const prosba = zbudujProsbe(k.ustawienia, cel, gracz);
      const wiadomosc = { ...prosba, koord: cel.koord, idGracza: gracz.idGracza || null, powod: gracz.powod };
      let r;
      try {
        r = await wyslijWiadomosc(wiadomosc);
      } catch (blad) {
        r = { wynik: "nieznany", szczegoly: blad.message };
      }
      try {
        dodajWysylke(k.swiat, { ...wiadomosc, ...r });
      } catch (blad) {
        r.szczegoly += ` Nie zapisano do dziennika: ${blad.message}`;
      }
      k.komunikat(`${gracz.nick}: ${r.wynik}. ${r.szczegoly}`);
      await k.odswiez();
      k.przejdz("obstawy", { cel: cel.koord });
    });
    wyslij.classList.add("ep-maly");
    const pokaz2 = przycisk("Podgląd", () => k.przejdz("prosby", { podglad: `${cel.koord}|${gracz.nick}` }));
    pokaz2.classList.add("ep-maly");
    const akcje = el("span", { className: "ep-wiersz" }, wyslij, pokaz2);
    akcje.addEventListener("click", (z) => z.stopPropagation());
    return akcje;
  }
  function sekcjaHistorii2(k, cel) {
    const { migawki, wzorzec } = cel.historia;
    const zapiszStan = przycisk("Zapisz stan", async () => {
      const dane2 = wczytajDane(k.swiat);
      const rekord = dane2.obstawy[cel.koord];
      if (!rekord?.widoczne) {
        k.komunikat("Brak widocznego wsparcia do zapisania. Zeskanuj obstawy albo otwórz wioskę w grze.");
        return;
      }
      try {
        const dodano = dopiszMigawkeObstawy(dane2, cel.koord, { ...rekord, data: (/* @__PURE__ */ new Date()).toISOString(), skanowal: window.game_data?.player?.name });
        zapiszDane(k.swiat, dane2);
        await k.odswiez();
        k.przejdz("obstawy", { cel: cel.koord });
        k.komunikat(dodano ? "Zapisano stan." : "Ten stan jest już w historii.");
      } catch (blad) {
        k.komunikat(blad.message);
      }
    });
    const wiersze = [...migawki].reverse().map((m) => {
      const jestWzorcem = wzorzec && wzorzec.data === m.data;
      const paczki2 = Math.round(m.wiersze.reduce((s, w) => s + (cel.nadawcy.find((n) => n.zKoord === w.zKoord && n.nick === w.nick)?.paczki ?? 0), 0) * 10) / 10;
      const akcja = przycisk(jestWzorcem ? "Zdejmij wzorzec" : "Ustaw jako wzorzec", async () => {
        try {
          const dane2 = wczytajDane(k.swiat);
          ustawWzorzec(dane2, cel.koord, jestWzorcem ? null : m.data, window.game_data?.player?.name);
          zapiszDane(k.swiat, dane2);
          await k.odswiez();
          k.przejdz("obstawy", { cel: cel.koord });
        } catch (blad) {
          k.komunikat(blad.message);
        }
      });
      akcja.classList.add("ep-maly");
      return el(
        "div",
        { className: `ep-wpis ${jestWzorcem ? "ep-wpis-pochwala" : "ep-wpis-notatka"}` },
        el("span", {}, el("b", { textContent: formatDaty(m.data) }), ` ${m.wiersze.length} wysyłek od ${new Set(m.wiersze.map((w) => w.nick)).size} graczy${m.skanowal ? `, odczyt: ${m.skanowal}` : ""}`),
        el("span", { className: "ep-wpis-meta" }, jestWzorcem ? el("span", { className: "ep-znacznik ep-dobrze", textContent: "wzorzec" }) : el("span", { className: "ep-szary", textContent: paczki2 ? `${formatLiczby(paczki2)} paczek wg obecnych wysyłek` : "" })),
        akcja
      );
    });
    return el(
      "div",
      {},
      el("div", { className: "ep-wiersz" }, el("h4", { className: "ep-podtytul", textContent: "Historia stanów" }), el("span", { className: "ep-odstep" }), zapiszStan),
      el("p", { className: "ep-opis", textContent: "Każdy skan obstaw i każde otwarcie wioski w grze z widoczną tabelą dopisuje migawkę nadawców. Wzorzec to stan pełnej obstawy sprzed strat, od którego liczymy braki." }),
      el("div", { className: "ep-wpisy" }, ...wiersze.length ? wiersze : [el("p", { className: "ep-opis", textContent: "Brak migawek. Pierwsza powstaje po skanie obstaw albo po otwarciu wioski w grze." })])
    );
  }
  function sekcjaStrat(k, cel) {
    const { straty } = cel;
    const tabela2 = stworzTabele({
      sort: { klucz: "uzupelnic", malejaco: true },
      pusty: "Brak nadawców do porównania.",
      kolumny: [
        kolGracz,
        { klucz: "status", tytul: "Status", wartosc: (g) => g.status, klasa: (g) => KLASY_STRAT[g.status] || "ep-szary" },
        kolLiczba("przed", "Wzorzec", (g) => g.paczkiPrzed),
        kolLiczba("teraz", "Teraz", (g) => g.paczkiTeraz),
        kolLiczba("strata", "Strata", (g) => g.strata),
        kolLiczba("rozkazy", "W drodze", (g) => g.rozkazyWDrodze),
        kolLiczba("doWzorca", "Do wzorca", (g) => g.doWzorca),
        { ...kolLiczba("doPelnej", "Do pełnej paczki", (g) => g.doPelnej), klasa: (g) => g.niepelna ? "ep-typ-mix" : null },
        { klucz: "uzupelnic", tytul: "Uzupełnić", wartosc: (g) => g.uzupelnic, liczbowa: true, tekst: (g) => g.uzupelnic ? `${formatLiczby(g.uzupelnic)} (${przykladJednostek(g.uzupelnic, k.ustawienia.paczka)})` : "—" },
        { klucz: "prosba", tytul: "Wiadomość", wartosc: () => "", tekst: () => "", element: (g) => g.uzupelnic > 0 ? przyciskProsby2(k, cel, g) : null }
      ]
    });
    tabela2.pokaz(straty.gracze);
    const opisWzorca = straty.wzorzec ? `Wzorzec z ${formatDaty(straty.wzorzec.data)}: ${formatLiczby(straty.wzorzec.paczki)} paczek od ${straty.wzorzec.nadawcow} graczy. ${straty.aktualny ? `Porównanie z odczytem ${formatDaty(straty.dataOdczytu)}.` : "Brak odczytu po dacie wzorca, więc straty są nieznane, nie zerowe."}` : "Bez wzorca liczymy tylko brak do najbliższej pełnej paczki. Oznacz migawkę jako wzorzec w historii powyżej.";
    return el(
      "div",
      {},
      el("h4", { className: "ep-podtytul", textContent: "Straty i uzupełnienia" }),
      el("p", { className: "ep-opis", textContent: `${opisWzorca} Statusy: ${Object.entries(OPISY_STRAT).map(([s, o]) => `${s}: ${o}`).join("; ")}.` }),
      tabela2.element
    );
  }
  async function naForum2(k, opcje) {
    try {
      return opisAktualizacji(await aktualizujPost(k.swiat, opcje));
    } catch (blad) {
      return `Zapisano plan, ale nie forum: ${blad.message}`;
    }
  }
  async function kopiujBB(k, pole2, tekst) {
    pole2.value = tekst;
    pole2.hidden = false;
    pole2.select();
    try {
      await navigator.clipboard.writeText(tekst);
      k.komunikat("Skopiowano BB-kody.");
    } catch {
      k.komunikat("Zaznaczono BB-kody. Skopiuj je przez Ctrl+C.");
    }
  }
  function szczegoly(k, cel) {
    const odGraczy = stworzTabele({
      sort: { klucz: "razem", malejaco: true },
      pusty: "Nikt jeszcze nie stoi ani nie idzie na tę wioskę.",
      naWiersz: (g) => {
        if (k.model.gracze.some((x) => x.nick === g.nick)) k.przejdz("akta", { id: k.model.gracze.find((x) => x.nick === g.nick).id });
      },
      kolumny: [
        kolGracz,
        kolLiczba("stoi", "Stoi", (g) => g.stoi),
        kolLiczba("wDrodze", "W drodze", (g) => g.wDrodze),
        kolLiczba("razem", "Razem", (g) => g.razem),
        kolLiczba("rozkazy", "Rozkazów", (g) => g.rozkazy),
        { klucz: "bezDanych", tytul: "Nieznane", wartosc: (g) => g.bezDanych || null, liczbowa: true, klasa: () => "ep-szary" },
        kolData("ostatnie", "Ostatnie wejście", (g) => g.ostatnie)
      ]
    });
    odGraczy.pokaz(cel.naGraczy);
    const poleBB = el("textarea", { className: "ep-bb", readOnly: true, rows: 8, hidden: true });
    const tabela2 = stworzTabele({
      sort: { klucz: "paczki", malejaco: true },
      pusty: cel.widoczne ? "Nikt nie stoi w tej wiosce." : "Gra nie pokazała wsparcia tej wioski. Uruchom skan obstaw z konta, które je widzi.",
      kolumny: [
        kolGracz,
        kolLiczba("paczki", "Paczki", (n) => n.paczki),
        { klucz: "zKoord", tytul: "Z wioski", wartosc: (n) => n.zKoord },
        ...["spear", "sword", "heavy", "spy"].map((id) => kolJednostka(id, (n) => n.jednostki[id] || 0))
      ]
    });
    tabela2.pokaz(cel.nadawcy);
    const nadciaga = stworzTabele({
      sort: { klucz: "rozkazy", malejaco: true },
      pusty: cel.nadciagaRozkazy === null ? "Brak danych o rozkazach w drodze. Skan obstaw czyta je ze strony wioski." : "Brak widocznych rozkazów wsparcia w drodze.",
      kolumny: [
        kolGracz,
        kolLiczba("rozkazy", "Rozkazów", (n) => n.rozkazy),
        kolData("pierwsze", "Pierwsze wejście", (n) => n.pierwsze),
        kolData("ostatnie", "Ostatnie wejście", (n) => n.ostatnie)
      ]
    });
    nadciaga.pokaz(cel.nadciagaNadawcy);
    const usun = przycisk("Usuń z planu", async () => {
      usunZPlanu(k.swiat, cel.koord);
      await k.odswiez();
      k.przejdz("obstawy");
      k.komunikat(await naForum2(k, { koordy: [], puste: true }));
    });
    return el(
      "section",
      { className: "ep-sekcja ep-szczegoly" },
      el("div", { className: "ep-wiersz" }, el("h3", { textContent: `${cel.koord}: ${cel.nick}` }), el("span", { className: "ep-odstep" }), usun, przycisk("Zamknij", () => k.przejdz("obstawy"))),
      el("p", { className: "ep-opis", textContent: `Stoi ${paczkiTekst(cel.stoi)} z ${cel.paczek} paczek, brakuje ${paczkiTekst(cel.brakuje)}. ${opisZrodla(cel)}.` }),
      el("div", { className: "ep-wiersz" }, el("h4", { className: "ep-podtytul", textContent: "Paczki od graczy" }), el("span", { className: "ep-odstep" }), przycisk("BB-kody: kto ile paczek", () => kopiujBB(k, poleBB, bbPaczekWioski(cel, cel.postep, cel.naGraczy)))),
      odGraczy.element,
      poleBB,
      el("h4", { className: "ep-podtytul", textContent: "Stoi, po wioskach nadawców" }),
      tabela2.element,
      el("p", {
        className: "ep-opis",
        textContent: `Nadciąga (nie wlicza się do „stoi”): ${cel.nadciagaPaczki === null ? "brak danych o sumie" : `${formatLiczby(cel.nadciagaPaczki)} paczek znanych wojsk, dolna granica`}${cel.dataNadciaga ? `, odczyt ${formatDaty(cel.dataNadciaga)}` : ""}.`
      }),
      nadciaga.element,
      sekcjaHistorii2(k, cel),
      sekcjaStrat(k, cel)
    );
  }
  function formularz(k) {
    const pole2 = el("textarea", { className: "ep-bb", rows: 3, placeholder: "500|500 20\n501|498 10 p (p to priorytet)" });
    const zapisz = przycisk("Dodaj do planu", async () => {
      try {
        const { dodane, bledy } = await dodajDoPlanu(k.swiat, pole2.value);
        const wpisyDodane = czytajWpisy(pole2.value).wpisy.map((w) => w.koord).filter((koord) => !bledy.includes(koord));
        await k.odswiez();
        const forum = dodane ? await naForum2(k, { koordy: wpisyDodane }) : "";
        k.komunikat(`${bledy.length ? `Dodano ${dodane}. Nie rozpoznano: ${bledy.join(", ")}.` : `Dodano ${dodane}.`} ${forum}`.trim());
      } catch (blad) {
        k.komunikat(`Błąd: ${blad.message}`);
      }
    }, "ep-glowny");
    const postep = el("span", { className: "ep-licznik" });
    let stop = false;
    const skan = przycisk("Skanuj obstawy", async () => {
      stop = false;
      skan.disabled = true;
      try {
        const w = await skanujObstawy({ postep: (t) => {
          postep.textContent = t;
        }, czyStop: () => stop });
        await k.odswiez();
        k.komunikat(`Sprawdzono ${w.wykonane} z ${w.wszystkie} wiosek.`);
      } catch (blad) {
        postep.textContent = blad.message;
        skan.disabled = false;
      }
    });
    const { spear, sword, heavy } = k.ustawienia.paczka;
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Plan obstaw" }),
      el(
        "p",
        { className: "ep-opis" },
        "1 paczka = ",
        ikonaJednostki("spear"),
        ` ${spear} albo `,
        ikonaJednostki("sword"),
        ` ${sword} albo `,
        ikonaJednostki("heavy"),
        ` ${heavy}. Mieszane liczą się same, np. 50 pików i 50 mieczy to 1 paczka. W każdej linii: współrzędne i liczba paczek.`
      ),
      pole2,
      el("div", { className: "ep-wiersz" }, zapisz, skan, przycisk("STOP", () => {
        stop = true;
      }), postep)
    );
  }
  function bbBrakow(cele) {
    const kolumny = przygotujKolumny([
      kolWioska,
      kolGracz,
      kolLiczba("paczek", "Plan", (c) => c.paczek),
      kolLiczba("stoi", "Stoi", (c) => c.stoi),
      kolLiczba("brakuje", "Brakuje", (c) => c.brakuje),
      kolLiczba("straty", "Straty", (c) => c.stratyPaczki),
      { klucz: "kto", tytul: "Do uzupełnienia", wartosc: (c) => c.doUzupelnienia.map((g) => `${g.nick} ${formatLiczby(g.uzupelnic)} (${g.powod})`).join(", ") || "—", bb: (c) => c.doUzupelnienia.map((g) => `[player]${g.nick}[/player] ${formatLiczby(g.uzupelnic)} (${g.powod})`).join(", ") || "—" }
    ]);
    const brakujace = cele.filter((c) => c.brakuje !== null && c.brakuje > 0 || c.doUzupelnienia.length);
    return tabelaBB("Braki na obstawach", kolumny, brakujace);
  }
  var obstawy = {
    id: "obstawy",
    tytul: "Obstawy",
    grupa: "Obrona",
    widok(k) {
      const o = k.obstawy;
      const cel = k.opcje.cel && o.cele.find((c) => c.koord === k.opcje.cel);
      const wiersze = o.cele.map((c) => ({ ...c, czlon: c.czlon || "—" }));
      const poleBrakow = el("textarea", { className: "ep-bb", readOnly: true, rows: 8, hidden: true });
      const braki = przycisk("BB-kody braków", () => kopiujBB(k, poleBrakow, bbBrakow(o.cele)));
      const paczkiBB = przycisk("BB-kody: kto ile paczek", () => kopiujBB(k, poleBrakow, bbPaczekPlanu(o.cele)));
      return el(
        "div",
        { className: "ep-widok ep-widok-przewijany" },
        formularz(k),
        el("section", { className: "ep-sekcja" }, panelForum(k.swiat, "ep-btn")),
        cel ? szczegoly(k, cel) : null,
        widokListy({
          kontekst: k,
          tytul: "Plan obstaw",
          wiersze,
          szukajW: (c) => `${c.nick} ${c.koord}`,
          sort: { klucz: "postep" },
          pusty: "Plan jest pusty. Dodaj wioski powyżej.",
          naWiersz: (c) => k.przejdz("obstawy", { cel: c.koord }),
          akcje: [paczkiBB, braki],
          kolumny: [
            kolWioska,
            kolGracz,
            { klucz: "czlon", tytul: "Człon", wartosc: (c) => c.czlon },
            kolLiczba("paczek", "Plan", (c) => c.paczek),
            { ...kolLiczba("stoi", "Gotowe", (c) => c.stoi), klasa: () => "ep-dobrze" },
            { ...kolLiczba("droga", "W drodze", (c) => c.postep.wDrodze), klasa: () => "ep-typ-deff" },
            { ...kolLiczba("brakuje", "Brakuje", (c) => c.brakuje), klasa: (c) => c.brakuje ? "ep-zle" : "ep-dobrze" },
            {
              klucz: "postep",
              tytul: "Postęp",
              wartosc: (c) => c.postep.procentRazem,
              tekst: (c) => c.postep.procentRazem === null ? "—" : `${c.postep.procentRazem}%`,
              element: (c) => pasekObstawy(c.postep)
            },
            {
              klucz: "stan",
              tytul: "Stan",
              wartosc: (c) => opisStanu(c.postep),
              klasa: (c) => ({ pelna: "ep-dobrze", "domknie sie": "ep-typ-deff", brakuje: "ep-zle" })[c.postep.stan] || "ep-szary"
            },
            kolLiczba("rozkazy", "Rozkazy", (c) => c.nadciagaRozkazy),
            { ...kolLiczba("straty", "Straty", (c) => c.stratyPaczki), klasa: (c) => c.stratyPaczki ? "ep-zle" : null },
            { klucz: "nadawcy", tytul: "Nadawcy", wartosc: (c) => c.widoczne ? c.nadawcy.length : null, liczbowa: true },
            { klucz: "wzorzec", tytul: "Wzorzec", wartosc: (c) => c.historia.wzorzec ? c.historia.wzorzec.data : null, tekst: (c) => c.historia.wzorzec ? formatDaty(c.historia.wzorzec.data) : "—" },
            { klucz: "zrodlo", tytul: "Dane", wartosc: opisZrodla }
          ]
        }),
        poleBrakow
      );
    }
  };

  // src/moduly/przeglad.js
  var DOBA3 = 864e5;
  function statusCzlonu(czlon) {
    if (!czlon.kompletny) return "niekompletny";
    const godziny = (Date.now() - new Date(czlon.data).getTime()) / 36e5;
    return godziny > STARE_DANE_H ? "stary" : "aktualny";
  }
  function karta(liczba7, opis2, { alarm = false, akcja } = {}) {
    const tresc2 = [
      el("div", { className: "ep-karta-liczba", textContent: formatLiczby(liczba7) }),
      el("div", { className: "ep-karta-opis", textContent: opis2 })
    ];
    const klasa = `ep-karta${alarm ? " ep-karta-alarm" : ""}`;
    if (!akcja) return el("div", { className: klasa }, ...tresc2);
    const przycisk2 = el("button", { type: "button", className: klasa }, ...tresc2);
    przycisk2.addEventListener("click", akcja);
    return przycisk2;
  }
  var przeglad = {
    id: "przeglad",
    tytul: "Przegląd",
    widok(k) {
      const { model } = k;
      const braki = model.gracze.filter((g) => g.braki.length).length;
      const kiszenie2 = model.wioski.filter((w) => w.kiszenie).length;
      const doWyrzucenia = (k.selekcja?.wiersze || []).filter((g) => g.etykieta === "do wyrzucenia").length;
      const ignoruje = k.obstawy.aktywnosc.filter((a) => a.status === "ignoruje").length;
      const bezRozwoju = porownajCzlony(k.dane, model, k.ustawienia, "7").filter((w) => w.ocena === "bez rozwoju").length;
      const bezRuchu = rankingCzlonow(k.dane.puls, k.ustawienia, "7").filter((w) => w.ocena === "bez ruchu").length;
      const ruchy7 = ruchyCzlonow(k.dane.puls, k.ustawienia).filter((r) => Date.now() - new Date(r.doDaty).getTime() <= 7 * DOBA3).length;
      const wpisy7 = aktywneWpisy(k.dane).filter((w) => Date.now() - new Date(w.data).getTime() <= 7 * DOBA3).length;
      const straty = k.przejecia ? k.przejecia.filter((p) => p.ocena.startsWith("strata")).length : null;
      const doSprawdzenia = k.przejecia ? k.przejecia.filter((p) => p.ocena === "obce plemię" || p.ocena === "wewnętrzne").length : null;
      const tabela2 = stworzTabele({
        sort: { klucz: "tag" },
        pusty: "Brak danych. Uruchom skan w zakładce Dane.",
        kolumny: [
          { klucz: "tag", tytul: "Człon", wartosc: (c) => c.tag },
          { klucz: "gracze", tytul: "Gracze", wartosc: (c) => c.gracze, liczbowa: true },
          { klucz: "wioski", tytul: "Wioski", wartosc: (c) => c.wioski, liczbowa: true },
          { klucz: "bezDostepu", tytul: "Bez dostępu", wartosc: (c) => c.bezDostepu, liczbowa: true, klasa: (c) => c.bezDostepu ? "ep-zle" : null },
          { klucz: "data", tytul: "Skan", wartosc: (c) => c.data, tekst: (c) => formatDaty(c.data) },
          { klucz: "skanowal", tytul: "Skanował", wartosc: (c) => c.skanowal },
          { klucz: "status", tytul: "Stan", wartosc: statusCzlonu, klasa: (c) => statusCzlonu(c) === "aktualny" ? "ep-dobrze" : "ep-zle" }
        ]
      });
      tabela2.pokaz(model.czlony);
      return el(
        "div",
        { className: "ep-widok" },
        model.brakujaceCzlony.length ? el("div", { className: "ep-uwaga", textContent: `Brak danych z członów: ${model.brakujaceCzlony.join(", ")}. Listy obejmują tylko zeskanowane człony.` }) : null,
        !model.wrogowieZnalezieni ? el("div", { className: "ep-uwaga", textContent: "Nie znaleziono wiosek wrogów, więc kiszenie nie jest oceniane. Sprawdź tagi w zakładce Dane." }) : null,
        el(
          "div",
          { className: "ep-karty" },
          karta(model.gracze.length, "graczy", { akcja: () => k.przejdz("gracze") }),
          karta(model.wioski.length, "wiosek", { akcja: () => k.przejdz("wioski") }),
          karta(braki, "bez pełnego dostępu", { alarm: braki > 0, akcja: () => k.przejdz("selekcja") }),
          karta(kiszenie2, "wiosek: możliwe kiszenie", { alarm: kiszenie2 > 0, akcja: () => k.przejdz("kiszenie") }),
          karta(doWyrzucenia, "do wyrzucenia wg selekcji", { alarm: doWyrzucenia > 0, akcja: () => k.przejdz("selekcja") }),
          karta(ignoruje, "ignoruje obstawy", { alarm: ignoruje > 0, akcja: () => k.przejdz("aktywnosc") }),
          karta(bezRozwoju, "bez rozwoju od 7 dni", { alarm: bezRozwoju > 0, akcja: () => k.przejdz("zmiany", { okres: "7", preset: "bezRozwoju" }) }),
          karta(bezRuchu, "bez ruchu: punkty, wioski, walka", { alarm: bezRuchu > 0, akcja: () => k.przejdz("ranking", { okres: "7", preset: "bezRuchu" }) }),
          karta(ruchy7, "ruchów w członach, 7 dni", { akcja: () => k.przejdz("ruchy") }),
          karta(straty, "straconych wiosek, 7 dni", { alarm: straty > 0, akcja: () => k.przejdz("przejecia", { ocena: "strata" }) }),
          karta(doSprawdzenia, "przejęć do sprawdzenia, 7 dni", { alarm: doSprawdzenia > 0, akcja: () => k.przejdz("przejecia") }),
          karta(wpisy7, "wpisów w dzienniku, 7 dni", { akcja: () => k.przejdz("dziennik") })
        ),
        tabela2.element
      );
    }
  };

  // src/moduly/prosby.js
  var edycje = /* @__PURE__ */ new Map();
  var KLASY_WYNIKU = { wysłano: "ep-dobrze", błąd: "ep-zle", CAPTCHA: "ep-zle", nieznany: "ep-typ-mix", zatrzymano: "ep-szary" };
  var zEdycja = (p) => ({ ...p, ...edycje.get(p.klucz) || {} });
  async function wyslijJedna2(k, p) {
    let r;
    try {
      r = await wyslijWiadomosc(p);
    } catch (blad) {
      r = { wynik: "nieznany", szczegoly: blad.message };
    }
    try {
      dodajWysylke(k.swiat, { ...p, ...r });
    } catch (blad) {
      r.szczegoly += ` Nie zapisano do dziennika: ${blad.message}`;
    }
    return r;
  }
  function podglad(k, p) {
    const temat = el("input", { type: "text", className: "ep-pole", value: p.temat, style: "width:100%" });
    const tresc2 = el("textarea", { className: "ep-bb", rows: 7, value: p.tresc });
    const aktualna = () => ({ ...p, temat: temat.value.trim() || p.temat, tresc: tresc2.value.trim() || p.tresc });
    const zapisz = przycisk("Zapisz zmiany", () => {
      edycje.set(p.klucz, { temat: aktualna().temat, tresc: aktualna().tresc });
      k.komunikat("Zapisano treść.");
    });
    const stan = el("span", { className: "ep-licznik" });
    const wyslij = przycisk("Wyślij wiadomość", async () => {
      wyslij.disabled = true;
      const r = await wyslijJedna2(k, aktualna());
      stan.textContent = `${r.wynik}: ${r.szczegoly}`;
      await k.odswiez();
      k.przejdz("prosby", { ...k.opcje, podglad: null });
      k.komunikat(`${p.do}: ${r.wynik}.`);
    }, "ep-glowny");
    return el(
      "section",
      { className: "ep-sekcja ep-szczegoly" },
      el("div", { className: "ep-wiersz" }, el("h3", { textContent: `Do: ${p.do}, wioska ${p.koord} (${p.wlasciciel})` }), el("span", { className: "ep-odstep" }), przycisk("Zamknij", () => k.przejdz("prosby", { ...k.opcje, podglad: null }))),
      p.pominieta ? el("p", { className: "ep-opis", textContent: `W wysyłce do wszystkich ta prośba jest pomijana: ${p.pominieta}. Przycisk poniżej wysyła mimo to.` }) : null,
      el("label", { style: "display:block;color:#6d5a43" }, "Temat", temat),
      el("label", { style: "display:block;color:#6d5a43;margin-top:8px" }, "Treść (BB-kody gry)", tresc2),
      el("div", { className: "ep-wiersz", style: "margin-top:8px" }, wyslij, zapisz, przycisk("Otwórz w grze bez wysyłania", () => {
        k.komunikat(otworzProsbe(aktualna()) ? "Otwarto nową wiadomość w nowej karcie." : "Przeglądarka zablokowała nową kartę.");
      }), stan)
    );
  }
  function sekcjaWysylki(k, prosby2) {
    const u = k.ustawienia.wysylka;
    const gotowe = prosby2.filter((p) => !p.pominieta).map(zEdycja);
    const wypelnienie = el("div");
    const pasek = el("div", { className: "ep-pasek-postepu", hidden: true }, wypelnienie);
    const opis2 = el("div", { className: "ep-opis" });
    let stop = false;
    const stopBtn = przycisk("STOP", () => {
      stop = true;
    });
    stopBtn.disabled = true;
    const doWszystkich = przycisk(`Wyślij do wszystkich (${gotowe.length})`, async () => {
      if (!gotowe.length) {
        k.komunikat("Nikt nie jest gotowy do wysyłki.");
        return;
      }
      doWszystkich.disabled = true;
      stop = false;
      stopBtn.disabled = false;
      pasek.hidden = false;
      try {
        const wyniki = await wyslijKolejke(gotowe, {
          odstepMs: u.odstepS * 1e3,
          czyStop: () => stop,
          postep: (t, ulamek) => {
            opis2.textContent = t;
            wypelnienie.style.width = `${Math.round(ulamek * 100)}%`;
          },
          zapisz: (wpis) => dodajWysylke(k.swiat, wpis)
        });
        const wyslane = wyniki.filter((w) => w.wynik === "wysłano").length;
        const zle = wyniki.find((w) => w.wynik !== "wysłano" && w.wynik !== "zatrzymano");
        await k.odswiez();
        k.przejdz("prosby", k.opcje);
        k.komunikat(zle ? `Wysłano ${wyslane}. Zatrzymano po: ${zle.do}, ${zle.wynik}.` : `Wysłano ${wyslane} z ${gotowe.length}.`);
      } catch (blad) {
        opis2.textContent = blad.message;
        stopBtn.disabled = true;
        doWszystkich.disabled = false;
      }
    }, "ep-glowny");
    doWszystkich.disabled = !gotowe.length;
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Wysyłka do wszystkich" }),
      el("p", { className: "ep-opis", textContent: `Po kolei do każdego gotowego gracza, z jego liczbą paczek do dosłania, co ${u.odstepS} s. Pomija graczy ze wsparciem w drodze, wiersze bez aktualnych danych (odczyt starszy niż ${u.maksWiekH} h) i poproszonych w ciągu ${u.blokadaH} h. Zatrzymuje się przy CAPTCHA i każdej nierozpoznanej odpowiedzi, bez ponawiania. Rozpoznanie sukcesu jest niesprawdzone w grze; pierwszy test to jedna wiadomość do własnego konta rady.` }),
      el("div", { className: "ep-wiersz" }, doWszystkich, stopBtn, el("span", { className: "ep-licznik", textContent: `gotowe: ${gotowe.length}, pominięte: ${prosby2.length - gotowe.length}` })),
      opis2,
      pasek
    );
  }
  function tabelaProsb(k, prosby2) {
    const tabela2 = stworzTabele({
      sort: { klucz: "stan" },
      pusty: "Brak próśb. Prośby powstają z braków względem wzorca albo niepełnych paczek na wioskach z planu.",
      kolumny: [
        kolWioska,
        { klucz: "wlasciciel", tytul: "Właściciel", wartosc: (p) => p.wlasciciel },
        { ...kolGracz, tytul: "Do gracza" },
        kolLiczba("uzupelnic", "Dosłać (paczki)", (p) => p.uzupelnic || null),
        { klucz: "powod", tytul: "Powód", wartosc: (p) => p.powod || (p.status === "nie wiadomo" ? "brak danych" : "brak do planu") },
        { klucz: "stan", tytul: "W wysyłce do wszystkich", wartosc: (p) => p.pominieta ? `pominięta: ${p.pominieta}` : "gotowa", klasa: (p) => p.pominieta ? "ep-szary" : "ep-dobrze" },
        { klucz: "edycja", tytul: "Treść", wartosc: (p) => edycje.has(p.klucz) ? "zmieniona" : "z szablonu" },
        {
          klucz: "akcje",
          tytul: "Akcje",
          wartosc: () => "",
          tekst: () => "",
          element: (p) => {
            const wyslij = przycisk("Wyślij wiadomość", async () => {
              wyslij.disabled = true;
              const r = await wyslijJedna2(k, zEdycja(p));
              await k.odswiez();
              k.przejdz("prosby", k.opcje);
              k.komunikat(`${p.do}: ${r.wynik}. ${r.szczegoly}`);
            });
            wyslij.classList.add("ep-maly");
            const pokaz2 = przycisk("Podgląd", () => k.przejdz("prosby", { ...k.opcje, podglad: p.klucz }));
            pokaz2.classList.add("ep-maly");
            const akcje = el("span", { className: "ep-wiersz" }, wyslij, pokaz2);
            akcje.addEventListener("click", (z) => z.stopPropagation());
            return akcje;
          }
        }
      ]
    });
    tabela2.pokaz(prosby2);
    return tabela2.element;
  }
  function sekcjaDziennika(k) {
    return el(
      "section",
      { className: "ep-sekcja" },
      el("h3", { textContent: "Dziennik wysyłek" }),
      widokListy({
        kontekst: { ...k, opcje: {} },
        tytul: "Wysłane prośby",
        wiersze: listaWysylek(k.dane),
        szukajW: (w) => `${w.nick} ${w.koord} ${w.wynik}`,
        sort: { klucz: "data", malejaco: true },
        bezCzlonow: true,
        pusty: "Jeszcze nic nie wysłano.",
        kolumny: [
          kolData("data", "Kiedy", (w) => w.data),
          kolGracz,
          kolWioska,
          kolLiczba("paczki", "Paczki", (w) => w.paczki),
          { klucz: "powod", tytul: "Powód", wartosc: (w) => w.powod || "—" },
          { klucz: "wynik", tytul: "Wynik", wartosc: (w) => w.wynik, klasa: (w) => KLASY_WYNIKU[w.wynik] || "ep-szary" },
          { klucz: "szczegoly", tytul: "Szczegóły", wartosc: (w) => w.szczegoly || "" },
          { klucz: "autor", tytul: "Kto", wartosc: (w) => w.autor || "—" }
        ]
      })
    );
  }
  var prosby = {
    id: "prosby",
    tytul: "Prośby",
    grupa: "Obrona",
    widok(k) {
      const pomijajBlokade = Boolean(k.opcje.pomijajBlokade);
      const prosby2 = przygotujProsby(k.obstawy, k.dane, k.ustawienia, { pomijajBlokade });
      const wybrana = k.opcje.podglad ? prosby2.find((p) => p.klucz === k.opcje.podglad) : null;
      const blokada = el("input", { type: "checkbox", checked: pomijajBlokade });
      blokada.addEventListener("change", () => k.przejdz("prosby", { ...k.opcje, pomijajBlokade: blokada.checked }));
      return el(
        "div",
        { className: "ep-widok ep-widok-przewijany" },
        el("p", { className: "ep-opis", textContent: "Prośby o dosłanie obstawy liczone ze strat względem wzorca i z niepełnych paczek na wioskach z planu. Odbiorcą jest tylko gracz z odczytu stacjonujących albo z wzorca tej wioski. Każda wiadomość mówi, która wioska, ile stoi i ile ten gracz ma dosłać. „Wyślij wiadomość” wysyła od razu; „Podgląd” pozwala zmienić treść." }),
        wybrana ? podglad(k, zEdycja(wybrana)) : null,
        sekcjaWysylki(k, prosby2),
        el("div", { className: "ep-wiersz" }, el("label", { className: "ep-mini" }, blokada, ` w wysyłce do wszystkich pomiń blokadę ${k.ustawienia.wysylka.blokadaH} h`), el("span", { className: "ep-licznik", textContent: `${formatLiczby(prosby2.length)} próśb` })),
        tabelaProsb(k, prosby2),
        sekcjaDziennika(k)
      );
    }
  };

  // src/rdzen/przejecia.js
  function czytajPrzejecia(tekst) {
    return tekst.split("\n").map((l) => l.trim()).filter(Boolean).map((linia) => {
      const [idWioski, czas, nowy, stary] = linia.split(",");
      return { idWioski, czas: Number(czas) * 1e3, nowy, stary };
    }).filter((p) => p.idWioski && Number.isFinite(p.czas));
  }
  function ocena(nasiNowy, nasiStary, plemieStarego, plemieNowego, stary, u) {
    if (nasiNowy && nasiStary) return "wewnętrzne";
    if (nasiNowy && stary === "0") return "barbarzyńska";
    if (nasiNowy && plemieStarego && u.wrogowie.includes(plemieStarego)) return "wróg";
    if (nasiNowy) return "obce plemię";
    if (nasiStary && plemieNowego && u.wrogowie.includes(plemieNowego)) return "strata: wróg";
    if (nasiStary) return "strata";
    return null;
  }
  function ocenPrzejecia(przejecia3, slownik, u, { dni: dni2 = PRZEJECIA_DNI, teraz: teraz2 = Date.now() } = {}) {
    const granica = teraz2 - dni2 * 864e5;
    const gracz = (id) => slownik.gracze.get(id) || null;
    const plemie = (g) => g && g.idPlemienia ? slownik.plemiona.get(g.idPlemienia) || null : null;
    const nasi = (g) => Boolean(plemie(g) && u.czlony.includes(plemie(g)));
    return przejecia3.filter((p) => p.czas >= granica).map((p) => {
      const nowy = gracz(p.nowy);
      const stary = p.stary === "0" ? null : gracz(p.stary);
      const wioska = slownik.wioski.get(p.idWioski) || null;
      const wynik = ocena(nasi(nowy), nasi(stary), plemie(stary), plemie(nowy), p.stary, u);
      if (!wynik) return null;
      return {
        czas: new Date(p.czas).toISOString(),
        idWioski: p.idWioski,
        koord: wioska ? wioska.koord : null,
        nazwa: wioska ? wioska.nazwa : null,
        punkty: wioska ? wioska.punkty : null,
        nowyNick: nowy ? nowy.nick : p.nowy === "0" ? "barbarzyńska" : `gracz ${p.nowy}`,
        nowyId: p.nowy,
        nowyCzlon: plemie(nowy),
        staryNick: p.stary === "0" ? "barbarzyńska" : stary ? stary.nick : `gracz ${p.stary}`,
        staryId: p.stary,
        staryCzlon: plemie(stary),
        ocena: wynik,
        // Wiersz w listach ma pole czlon, więc filtr członu działa po naszym graczu.
        czlon: nasi(nowy) ? plemie(nowy) : plemie(stary),
        nick: nasi(nowy) ? nowy.nick : stary ? stary.nick : null,
        idGracza: nasi(nowy) ? p.nowy : p.stary
      };
    }).filter(Boolean).sort((a, b) => b.czas.localeCompare(a.czas));
  }
  var OCENY_PRZEJEC = {
    barbarzyńska: { klasa: "ep-szary", opis: "wioska barbarzyńska" },
    wróg: { klasa: "ep-dobrze", opis: "wioska wroga" },
    wewnętrzne: { klasa: "ep-typ-mix", opis: "od gracza z naszych członów, sprawdź czy uzgodnione" },
    "obce plemię": { klasa: "ep-typ-mix", opis: "od gracza spoza listy wrogów, sprawdź czy to nie samowolka" },
    strata: { klasa: "ep-zle", opis: "nasz gracz stracił wioskę" },
    "strata: wróg": { klasa: "ep-zle", opis: "nasz gracz stracił wioskę na rzecz wroga" }
  };

  // src/moduly/przejecia.js
  var OKRESY2 = [["1", "24 godziny"], ["3", "3 dni"], [String(PRZEJECIA_DNI), `${PRZEJECIA_DNI} dni`]];
  function wybor2(wartosc2, opcje, zmien) {
    const pole2 = el("select", { className: "ep-pole" }, ...opcje.map(([id, nazwa]) => el("option", { value: id, textContent: nazwa })));
    pole2.value = wartosc2;
    pole2.addEventListener("change", () => zmien(pole2.value));
    return pole2;
  }
  var zPlemieniem = (nick, czlon) => czlon ? `${nick} [${czlon}]` : nick;
  var przejecia2 = {
    id: "przejecia",
    tytul: "Przejęcia",
    grupa: "Kontrola",
    widok(k) {
      if (k.przejecia === null) {
        return el("div", { className: "ep-widok" }, el("div", {
          className: "ep-uwaga",
          textContent: "Nie udało się pobrać publicznego pliku przejęć (/map/conquer.txt). Otwórz panel ponownie albo sprawdź połączenie."
        }));
      }
      const okres = OKRESY2.some(([id]) => id === k.opcje.okres) ? k.opcje.okres : String(PRZEJECIA_DNI);
      const granica = Date.now() - Number(okres) * 864e5;
      const wOkresie = k.przejecia.filter((p) => new Date(p.czas).getTime() >= granica);
      const ocena2 = k.opcje.ocena && OCENY_PRZEJEC[k.opcje.ocena] ? k.opcje.ocena : "";
      const wiersze = ocena2 ? wOkresie.filter((p) => p.ocena === ocena2) : wOkresie;
      const liczby = Object.keys(OCENY_PRZEJEC).map((o) => [o, `${o} (${wOkresie.filter((p) => p.ocena === o).length})`]);
      const zmien = (pole2) => (wartosc2) => k.przejdz("przejecia", { ...k.opcje, [pole2]: wartosc2 });
      const nasz = (p) => k.model.gracze.find((g) => g.id === p.idGracza);
      return widokListy({
        kontekst: k,
        tytul: `Przejęcia naszych członów, ${OKRESY2.find(([id]) => id === okres)[1]}`,
        opis: "Z publicznego pliku przejęć świata, bez skanu. Plemię gracza jest według aktualnej mapy, więc po zmianie plemienia może się różnić od stanu z chwili przejęcia. „Obce plemię” i „wewnętrzne” to sygnał do sprawdzenia, nie wyrok: kliknij wiersz, żeby otworzyć akta z gotowym wpisem o samowolce.",
        wiersze,
        szukajW: (p) => `${p.nowyNick} ${p.staryNick} ${p.koord || ""} ${p.ocena}`,
        sort: { klucz: "czas", malejaco: true },
        pusty: "Brak przejęć naszych członów w wybranym okresie.",
        naWiersz: (p) => {
          const gracz = nasz(p);
          if (!gracz) return;
          const samowolka = p.ocena === "obce plemię" || p.ocena === "wewnętrzne";
          k.przejdz("akta", samowolka ? { id: gracz.id, typ: "kara", powod: "samowolka", dowod: `Przejęcie ${p.koord || p.idWioski} od ${zPlemieniem(p.staryNick, p.staryCzlon)}, ${p.czas.slice(0, 16).replace("T", " ")} UTC. Sprawdź, czy uzgodnione.` } : { id: gracz.id });
        },
        dodatki: [wybor2(okres, OKRESY2, zmien("okres")), wybor2(ocena2, [["", "Wszystkie oceny"], ...liczby], zmien("ocena"))],
        kolumny: [
          kolData("czas", "Kiedy", (p) => p.czas),
          { klucz: "koord", tytul: "Wioska", wartosc: (p) => p.koord, bb: (p) => p.koord ? `[coord]${p.koord}[/coord]` : "—" },
          kolLiczba("punkty", "Punkty", (p) => p.punkty),
          { klucz: "nowy", tytul: "Kto przejął", wartosc: (p) => zPlemieniem(p.nowyNick, p.nowyCzlon), bb: (p) => `[player]${p.nowyNick}[/player]` },
          { klucz: "stary", tytul: "Od kogo", wartosc: (p) => zPlemieniem(p.staryNick, p.staryCzlon), bb: (p) => p.staryId === "0" ? "barbarzyńska" : `[player]${p.staryNick}[/player]` },
          { klucz: "ocena", tytul: "Ocena", wartosc: (p) => p.ocena, klasa: (p) => OCENY_PRZEJEC[p.ocena]?.klasa || "ep-szary" },
          { klucz: "opis", tytul: "Co to znaczy", wartosc: (p) => OCENY_PRZEJEC[p.ocena]?.opis || "", klasa: () => "ep-szary" }
        ]
      });
    }
  };

  // src/moduly/ranking.js
  var OKRESY3 = OKRESY_ZMIAN.filter(([id]) => id !== "poprzedni");
  var KLASY2 = { walczy: "ep-dobrze", "rozwija się": "ep-dobrze", "bez ruchu": "ep-zle", "traci wioski": "ep-typ-mix" };
  var ranking3 = {
    id: "ranking",
    tytul: "Ranking",
    grupa: "Kontrola",
    widok(k) {
      const okres = OKRESY3.some(([id]) => id === k.opcje.okres) ? k.opcje.okres : "7";
      const preset = PRESETY_RANKINGU[k.opcje.preset] ? k.opcje.preset : "wszyscy";
      const wszystkie = rankingCzlonow(k.dane.puls, k.ustawienia, okres);
      const wiersze = wszystkie.filter(PRESETY_RANKINGU[preset].filtr);
      const s = k.ustawienia.stagnacja;
      const nasi = new Set(k.model.gracze.map((g) => g.id));
      const opcjePresetow = Object.entries(PRESETY_RANKINGU).map(([id, p]) => [id, id === "wszyscy" ? p.nazwa : `${p.nazwa} (${wszystkie.filter(p.filtr).length})`]);
      const zmien = (pole2) => (wartosc2) => k.przejdz("ranking", { ...k.opcje, [pole2]: wartosc2 });
      return widokListy({
        kontekst: k,
        tytul: `Ranking: ${PRESETY_RANKINGU[preset].nazwa}, okres ${OKRESY3.find(([id]) => id === okres)[1]}`,
        opis: `Wszyscy z naszych członów, także bez skanu i bez dostępu: publiczne punkty, wioski oraz pokonani w ataku (RA), obronie (RO) i wsparciu (RW). „Walczy” to co najmniej ${s.walka} nowych pokonanych, „rozwija się” to ${s.punkty} punktów albo nowa wioska, a „bez ruchu” to nic z tego przez co najmniej ${s.dni} dni. Różnice ruszają od drugiego dnia migawek; gdy historia jest krótsza niż okres, porównanie idzie do najstarszej migawki.`,
        wiersze,
        szukajW: (w) => `${w.nick} ${w.ocena || ""}`,
        sort: { klucz: "walka", malejaco: true },
        pusty: "Brak migawki. Powstaje przy otwarciu panelu.",
        naWiersz: (w) => {
          if (nasi.has(w.id)) k.przejdz("akta", { id: w.id });
        },
        dodatki: [wybor(okres, OKRESY3, zmien("okres")), wybor(preset, opcjePresetow, zmien("preset"))],
        kolumny: [
          kolCzlon,
          kolGracz,
          kolLiczba("punktyTeraz", "Punkty", (w) => w.punktyTeraz),
          kolRoznica("punkty", "Punkty +/-", (w) => w.punkty),
          kolLiczba("wioskiTeraz", "Wioski", (w) => w.wioskiTeraz),
          kolRoznica("wioski", "Wioski +/-", (w) => w.wioski),
          kolLiczba("raTeraz", "RA", (w) => w.raTeraz),
          kolRoznica("ra", "RA +", (w) => w.ra),
          kolLiczba("roTeraz", "RO", (w) => w.roTeraz),
          kolRoznica("ro", "RO +", (w) => w.ro),
          kolLiczba("rwTeraz", "RW", (w) => w.rwTeraz),
          kolRoznica("rw", "RW +", (w) => w.rw),
          kolRoznica("walka", "Razem +", (w) => w.walka),
          { klucz: "ocena", tytul: "Ocena", wartosc: (w) => w.ocena, tekst: (w) => w.ocena || "brak danych", klasa: (w) => KLASY2[w.ocena] || "ep-szary" },
          { klucz: "uwaga", tytul: "Uwaga", wartosc: (w) => w.nowy ? "nowy w członach" : null, klasa: () => "ep-szary" },
          kolData("dataBazowa", "Porównano z", (w) => w.dataBazowa)
        ]
      });
    }
  };

  // src/rdzen/regulyDomyslne.js
  var ID_DOMYSLNEGO = "domyslny";
  function zestawDomyslny() {
    const wezly = {};
    const dodaj = (id, typ, reszta = {}) => {
      wezly[id] = { typ, wejscia: [], ...reszta };
      return id;
    };
    const pole2 = (id, poleGry, reszta = {}) => dodaj(id, "zrodlo", { pole: poleGry, okres: "okres", ...reszta });
    const grupa = (id, wejscie2, zakres, procent) => dodaj(id, "grupa", { grupa: zakres, procent, wejscia: [wejscie2] });
    const stala = (id, wartosc2) => dodaj(id, "stala", { wartosc: wartosc2 });
    const porownaj = (id, a, b, reszta = {}) => dodaj(id, "porownanie", { operator: ">=", mnoznik: 1, dodaj: 0, wejscia: [a, b], ...reszta });
    const logika = (id, operator, wejscia, reszta = {}) => dodaj(id, "logika", { operator, wejscia, ...reszta });
    const kryterium = { kolumna: true };
    pole2("walkaDelta", "walka.delta", { nazwa: "Nowi pokonani" });
    grupa("walkaCzlon", "walkaDelta", "czlon", 50);
    porownaj("walkaMediana", "walkaDelta", "walkaCzlon", { nazwa: "Co najmniej mediana członu" });
    porownaj("walkaJest", "walkaDelta", stala("walkaZero", 1), { nazwa: "Ktokolwiek pokonany" });
    logika("walczy", "i", ["walkaMediana", "walkaJest"], { nazwa: "Walczy" });
    pole2("dostep", "dostep.pelny", { nazwa: "Dostęp", ...kryterium });
    pole2("obstawy", "obstawy.aktywny", { nazwa: "Obstawy", ...kryterium });
    pole2("kiszenieProcent", "kiszenie.procent", { nazwa: "Deff w domu poza frontem (%)" });
    porownaj("kiszenieUdzial", "kiszenieProcent", stala("kiszenieProg", "kiszenieProcent"), { nazwa: "Większość deffu pracuje", operator: "<=" });
    pole2("kiszeniePaczki", "kiszenie.paczki", { nazwa: "Paczki w domu poza frontem" });
    porownaj("kiszenieMalo", "kiszeniePaczki", stala("kiszenieMaloProg", "kiszenieMaloPaczek"), { nazwa: "Tyle co nic w domu", operator: "<=" });
    logika("kiszenie", "lub", ["kiszenieUdzial", "kiszenieMalo"], { nazwa: "Deff pracuje", ...kryterium });
    pole2("produkcjaFakt", "produkcja.dzienna", { nazwa: "Produkcja wojska" });
    dodaj("produkcjaNorma", "norma", { nazwa: "Co wioski mogą produkować", rodzaj: "produkcja", udzial: "udzialSurowcow", skladOff: "axe=700,light=75,ram=5" });
    porownaj("produkcja", "produkcjaFakt", "produkcjaNorma", { nazwa: "Produkcja", mnoznik: 0.5, ...kryterium });
    pole2("zagrodaFakt", "zagroda.zajete", { nazwa: "Zagrody zajęte wojskiem" });
    porownaj("zagrodaOk", "zagrodaFakt", stala("zagrodaProg", "zagrodaProcent"), { nazwa: "Zagrody w większości zajęte" });
    pole2("wojskoFakt", "wojsko.ludnosc", { nazwa: "Wojsko gracza" });
    grupa("wojskoGrupa", "wojskoFakt", "podobni", 30);
    porownaj("wojskoOk", "wojskoFakt", "wojskoGrupa", { nazwa: "Wojsko wobec podobnych" });
    logika("wojsko", "lub", ["zagrodaOk", "wojskoOk"], { nazwa: "Ilość wojska", ...kryterium });
    pole2("punktyDelta", "punkty.delta", { nazwa: "Przyrost punktów" });
    grupa("punktyGrupa", "punktyDelta", "podobni", 25);
    porownaj("punktyOk", "punktyDelta", "punktyGrupa", { nazwa: "Punkty wobec podobnych" });
    pole2("wioskiDelta", "wioski.delta", { nazwa: "Przyrost wiosek" });
    porownaj("noweWioski", "wioskiDelta", "walkaZero", { nazwa: "Nowa wioska" });
    logika("rozwoj", "lub", ["punktyOk", "noweWioski", "walczy"], { nazwa: "Rozwój", ...kryterium });
    dodaj("walkaPlus", "bramka", { nazwa: "Walka", gdy: "nie", komunikat: "brak walki nie jest karą", wejscia: ["walczy", "walczy"], ...kryterium });
    pole2("dniAktywne", "aktywnosc.procentDni", { nazwa: "Dni z aktywnością", okres: "okresDlugi" });
    porownaj("dniOk", "dniAktywne", stala("dniProg", "aktywneDniProcent"), { nazwa: "Aktywny większość dni" });
    pole2("przerwa", "aktywnosc.przerwa", { nazwa: "Najdłuższa przerwa", okres: "okresDlugi" });
    porownaj("przerwaOk", "przerwa", stala("przerwaProg", "maksPrzerwa"), { nazwa: "Bez długiej przerwy", operator: "<=" });
    logika("ciaglosc", "i", ["dniOk", "przerwaOk"], { nazwa: "Ciągłość", ...kryterium });
    pole2("wioskiLiczba", "wioski.liczba", { nazwa: "Liczba wiosek" });
    grupa("wioskiGrupa", "wioskiLiczba", "podobni", 25);
    porownaj("wioskiOk", "wioskiLiczba", "wioskiGrupa", { nazwa: "Wioski wobec podobnych" });
    pole2("palac", "szlachta.potencjal", { nazwa: "Ma Pałac" });
    dodaj("wioski", "bramka", { nazwa: "Wioski", gdy: "nie", komunikat: "bez Pałacu nie ma jak przejmować", wejscia: ["wioskiOk", "palac"], ...kryterium });
    pole2("ekoFakt", "eko.min", { nazwa: "Najsłabsza kopalnia głównej" });
    grupa("ekoGrupa", "ekoFakt", "podobni", 50);
    porownaj("eko", "ekoFakt", "ekoGrupa", { nazwa: "Eko", dodaj: -3, ...kryterium });
    const wagi = { dostep: 3, obstawy: 3, produkcja: 3, kiszenie: 2, wojsko: 2, rozwoj: 2, ciaglosc: 2, walkaPlus: 1, wioski: 1, eko: 1 };
    dodaj("punkty", "wagi", { nazwa: "Punkty selekcji", czesciowe: "tak", wejscia: Object.keys(wagi), wagi });
    pole2("wiek", "wiek.wCzlonach", { nazwa: "Dni od dołączenia" });
    porownaj("nowy", "wiek", stala("ochrona", "ochronaNowych"), { nazwa: "Nowy w plemieniu", operator: "<=" });
    dodaj("wynik", "etykieta", {
      nazwa: "Propozycja",
      progi: "70 zostaje; 40 do rozmowy; 0 do wyrzucenia",
      minPokrycie: "minPokrycie",
      ochronaTekst: "nowy",
      wejscia: ["punkty", "nowy"]
    });
    return {
      wersja: 1,
      id: ID_DOMYSLNEGO,
      nazwa: "Selekcja domyślna",
      autor: null,
      zmieniono: null,
      parametry: {
        okres: 7,
        okresDlugi: 14,
        ochronaNowych: 7,
        wiekWioskiMin: 5,
        udzialSurowcow: 40,
        minGrupa: 5,
        minPokrycie: 50,
        zagrodaProcent: 60,
        aktywneDniProcent: 60,
        maksPrzerwa: 3,
        kiszenieProcent: 50,
        kiszenieMaloPaczek: 2
      },
      wezly,
      wynik: "wynik"
    };
  }

  // src/rdzen/selekcja.js
  function wszystkieZestawy(dane2) {
    return [zestawDomyslny(), ...Object.values(dane2.reguly || {})];
  }
  function aktywnyZestaw(dane2, ustawienia) {
    const wybrany = dane2.reguly?.[ustawienia.selekcja?.aktywne];
    return wybrany && !walidujZestaw(wybrany).length ? wybrany : zestawDomyslny();
  }
  function ocenSelekcje(wejscie2, zestaw = aktywnyZestaw(wejscie2.dane, wejscie2.ustawienia)) {
    const kontekst = zbudujKontekst(wejscie2);
    const silnik = silnikReguly(zestaw, kontekst);
    const idPunktow = zestaw.wezly[zestaw.wynik].wejscia[0];
    const kolumny = Object.entries(zestaw.wezly).filter(([, w]) => w.kolumna).map(([id]) => id);
    const wiersze = kontekst.gracze.map((g) => {
      const punkty = silnik.licz(idPunktow, g);
      return {
        czlon: g.czlon,
        nick: g.nick,
        id: g.id,
        braki: g.braki,
        etykieta: silnik.licz(zestaw.wynik, g).w,
        punktySelekcji: punkty.s === "ok" ? punkty.w : null,
        pokrycie: punkty.pokrycie ?? 0,
        kolumny: Object.fromEntries(kolumny.map((id) => [id, silnik.licz(id, g)]))
      };
    });
    return {
      zestaw,
      wiersze,
      kolumny,
      slad: (id) => {
        const gracz = kontekst.gracze.find((g) => g.id === String(id));
        return gracz ? silnik.slad(gracz) : null;
      }
    };
  }

  // src/ui/edytorRegul.js
  var nowyId = () => `n${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  function poleEdycji(definicja, wezel, zmiana) {
    const opis2 = el("span", { textContent: definicja.nazwa });
    let pole2;
    if (definicja.rodzaj === "wybor") {
      pole2 = el("select", { className: "ep-pole" }, ...definicja.opcje.map(([id, nazwa]) => el("option", { value: id, textContent: nazwa })));
      pole2.value = String(wezel[definicja.klucz] ?? "");
    } else {
      pole2 = el("input", { className: "ep-pole", type: definicja.rodzaj === "liczba" ? "number" : "text", step: "any", value: wezel[definicja.klucz] ?? "" });
    }
    pole2.addEventListener("change", () => {
      wezel[definicja.klucz] = definicja.rodzaj === "liczba" ? Number(pole2.value) : pole2.value;
      zmiana(definicja.rodzaj === "wybor");
    });
    return el("label", { className: "ep-klocek-pole" }, opis2, pole2);
  }
  function edytorRegul(zestaw, zmiana, otwarte) {
    const widziane = /* @__PURE__ */ new Set();
    const odwolania = () => {
      const licznik = {};
      for (const w of Object.values(zestaw.wezly)) for (const id of w.wejscia || []) licznik[id] = (licznik[id] || 0) + 1;
      return licznik;
    };
    function dodajWejscie(rodzic, wybor3) {
      const [rodzaj, wartosc2] = wybor3.split(":");
      let id = wartosc2;
      if (rodzaj === "typ") {
        id = nowyId();
        zestaw.wezly[id] = { typ: wartosc2, wejscia: [], ...structuredClone(TYPY2[wartosc2].nowy) };
      }
      rodzic.wejscia.push(id);
      if (rodzic.typ === "wagi") rodzic.wagi[id] = 1;
      zmiana(true);
    }
    function dodawanie(id, wezel) {
      const opis2 = TYPY2[wezel.typ].wejscia;
      if ((wezel.wejscia || []).length >= opis2.max) return null;
      const istniejace = Object.entries(zestaw.wezly).filter(([kandydat, w]) => w.nazwa && !wezel.wejscia.includes(kandydat) && !osiagalne(zestaw, kandydat).has(id));
      const pole2 = el(
        "select",
        { className: "ep-pole" },
        el("option", { value: "", textContent: "+ dodaj wejście…" }),
        el("optgroup", { label: "Nowy klocek" }, ...Object.entries(TYPY2).filter(([typ]) => typ !== "etykieta").map(([typ, t]) => el("option", { value: `typ:${typ}`, textContent: t.nazwa }))),
        el("optgroup", { label: "Istniejący klocek" }, ...istniejace.map(([kandydat, w]) => el("option", { value: `wezel:${kandydat}`, textContent: nazwaWezla(w) })))
      );
      pole2.addEventListener("change", () => {
        if (pole2.value) dodajWejscie(wezel, pole2.value);
      });
      return pole2;
    }
    function przyciskUsun(id, rodzic, numer) {
      return przycisk("Usuń", () => {
        rodzic.wejscia.splice(numer, 1);
        if (rodzic.wagi) delete rodzic.wagi[id];
        zmiana(true);
      });
    }
    function wskazanie(id, rodzic, numer) {
      return el(
        "div",
        { className: "ep-klocek ep-klocek-wskazanie" },
        el("div", { className: "ep-klocek-glowa" }, el("span", { className: "ep-odstep", textContent: `→ ${nazwaWezla(zestaw.wezly[id])} (ten sam klocek co wyżej)` }), przyciskUsun(id, rodzic, numer))
      );
    }
    function klocek(id, rodzic, numer, sciezka, licznik) {
      if (widziane.has(id)) return wskazanie(id, rodzic, numer);
      widziane.add(id);
      const wezel = zestaw.wezly[id];
      const typ = TYPY2[wezel.typ];
      const nazwa = el("input", { className: "ep-pole ep-klocek-nazwa", value: wezel.nazwa || "", placeholder: typ.nazwa });
      nazwa.addEventListener("change", () => {
        wezel.nazwa = nazwa.value.trim();
        zmiana(false);
      });
      const kolumna = el("input", { type: "checkbox", checked: Boolean(wezel.kolumna) });
      kolumna.addEventListener("change", () => {
        wezel.kolumna = kolumna.checked;
        zmiana(false);
      });
      const glowa = el(
        "div",
        { className: "ep-klocek-glowa" },
        el("span", { className: "ep-klocek-typ", textContent: typ.nazwa }),
        nazwa,
        el("label", { className: "ep-klocek-znacznik" }, kolumna, " kolumna"),
        licznik[id] > 1 ? el("span", { className: "ep-klocek-znacznik", textContent: `używany ${licznik[id]} razy` }) : null
      );
      if (rodzic?.typ === "wagi") {
        const waga = el("input", { className: "ep-pole ep-klocek-waga", type: "number", step: "any", min: 0, value: rodzic.wagi[id] ?? 1, title: "Waga" });
        waga.addEventListener("change", () => {
          rodzic.wagi[id] = Math.max(0, Number(waga.value) || 0);
          zmiana(false);
        });
        glowa.append(el("label", { className: "ep-klocek-znacznik" }, "waga ", waga));
      }
      if (rodzic) glowa.append(przyciskUsun(id, rodzic, numer));
      const pola = typ.pola.filter((p) => !p.gdy || p.gdy(wezel)).map((p) => poleEdycji(p, wezel, zmiana));
      const wejscia = (wezel.wejscia || []).map((dziecko, n) => {
        if (sciezka.includes(dziecko)) return el("div", { className: "ep-uwaga", textContent: "Cykl: ten klocek wskazuje sam siebie." });
        const etykieta = typ.wejscia.etykiety?.[n];
        return el("div", {}, etykieta ? el("div", { className: "ep-klocek-etykieta", textContent: etykieta }) : null, klocek(dziecko, wezel, n, [...sciezka, dziecko], licznik));
      });
      const rozwiniete = el(
        "details",
        { className: "ep-klocek-rozwin", open: sciezka.length < 3 || otwarte.has(id) },
        el("summary", { textContent: `Wejścia: ${wejscia.length}` }),
        el("div", { className: "ep-klocek-wejscia" }, ...wejscia),
        dodawanie(id, wezel)
      );
      rozwiniete.addEventListener("toggle", () => {
        if (rozwiniete.open) otwarte.add(id);
        else otwarte.delete(id);
      });
      return el(
        "div",
        { className: `ep-klocek ep-klocek-${wezel.typ === "etykieta" ? "etykieta-typ" : wezel.typ}` },
        glowa,
        pola.length ? el("div", { className: "ep-klocek-pola" }, ...pola) : null,
        typ.wejscia.max ? rozwiniete : null
      );
    }
    return klocek(zestaw.wynik, null, 0, [zestaw.wynik], odwolania());
  }
  function edytorParametrow(zestaw, zmiana) {
    const pola = Object.keys(zestaw.parametry).map((nazwa2) => {
      const pole2 = el("input", { className: "ep-pole", type: "number", step: "any", value: zestaw.parametry[nazwa2] });
      pole2.addEventListener("change", () => {
        zestaw.parametry[nazwa2] = Number(pole2.value);
        zmiana(false);
      });
      return el("label", { className: "ep-klocek-pole" }, el("span", { textContent: nazwa2 }), pole2);
    });
    const nazwa = el("input", { className: "ep-pole", placeholder: "nowy parametr" });
    const dodaj = przycisk("Dodaj", () => {
      const klucz2 = nazwa.value.trim();
      if (!/^[a-zA-Z]\w*$/.test(klucz2) || klucz2 in zestaw.parametry) return;
      zestaw.parametry[klucz2] = 0;
      zmiana(true);
    });
    return el("div", {}, el("div", { className: "ep-klocek-pola" }, ...pola), el("div", { className: "ep-wiersz", style: "margin-top:8px" }, nazwa, dodaj));
  }

  // src/moduly/reguly.js
  var sekcja3 = (tytul, ...tresc2) => el("section", { className: "ep-sekcja" }, el("h3", { textContent: tytul }), ...tresc2);
  var nowyIdZestawu = () => `z${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
  function usunNieuzywane(zestaw) {
    const uzywane = osiagalne(zestaw);
    for (const id of Object.keys(zestaw.wezly)) if (!uzywane.has(id)) delete zestaw.wezly[id];
  }
  function zapiszZestaw(k, szkic, uzyj) {
    const zestaw = structuredClone(szkic);
    usunNieuzywane(zestaw);
    if (zestaw.id === ID_DOMYSLNEGO) {
      zestaw.id = nowyIdZestawu();
      zestaw.nazwa = zestaw.nazwa === zestawDomyslny().nazwa ? "Selekcja rady" : zestaw.nazwa;
    }
    zestaw.zmieniono = (/* @__PURE__ */ new Date()).toISOString();
    zestaw.autor = window.game_data?.player?.name || null;
    const dane2 = wczytajDane(k.swiat);
    dane2.reguly[zestaw.id] = zestaw;
    zapiszDane(k.swiat, dane2);
    if (uzyj) zapiszUstawienia(k.swiat, { ...k.ustawienia, selekcja: { aktywne: zestaw.id } });
    return zestaw;
  }
  async function importuj(k, plik) {
    const zestaw = JSON.parse(await plik.text());
    if (!zestaw.wezly || !zestaw.wynik) throw new Error("To nie jest plik reguł.");
    const dane2 = wczytajDane(k.swiat);
    const moj = dane2.reguly[zestaw.id];
    if (moj && moj.zmieniono >= zestaw.zmieniono) return moj;
    zestaw.id = zestaw.id && zestaw.id !== ID_DOMYSLNEGO ? zestaw.id : nowyIdZestawu();
    dane2.reguly[zestaw.id] = zestaw;
    zapiszDane(k.swiat, dane2);
    return zestaw;
  }
  function liczniki(wiersze) {
    const licznik = {};
    for (const w of wiersze) licznik[w.etykieta] = (licznik[w.etykieta] || 0) + 1;
    return Object.entries(licznik).sort((a, b) => b[1] - a[1]);
  }
  var reguly = {
    id: "reguly",
    tytul: "Reguły",
    grupa: "Kontrola",
    widok(k) {
      const zestawy = wszystkieZestawy(k.dane);
      const aktywne = k.selekcja?.zestaw.id || ID_DOMYSLNEGO;
      const wybrany = zestawy.find((z) => z.id === k.opcje.zestaw) || zestawy.find((z) => z.id === aktywne) || zestawy[0];
      const szkic = structuredClone(wybrany);
      const otwarte = /* @__PURE__ */ new Set();
      const wejscie2 = {
        model: k.model,
        obstawy: k.obstawy,
        dane: k.dane,
        ustawienia: k.ustawienia,
        stale: k.stale,
        przejecia: k.przejeciaSurowe
      };
      const bledy = el("div");
      const podglad2 = el("div");
      const drzewo = el("div");
      const parametry = el("div");
      const gracze2 = [...k.model.gracze].sort((a, b) => a.nick.localeCompare(b.nick, "pl"));
      const wyborGracza2 = el("select", { className: "ep-pole" }, ...gracze2.map((g) => el("option", { value: g.id, textContent: `${g.nick} (${g.czlon})` })));
      if (k.opcje.gracz) wyborGracza2.value = k.opcje.gracz;
      function przelicz() {
        const lista = walidujZestaw(szkic);
        bledy.replaceChildren(...lista.map((b) => el("div", { className: "ep-uwaga", textContent: b })));
        if (lista.length) {
          podglad2.replaceChildren(el("p", { className: "ep-opis", textContent: "Popraw błędy, żeby zobaczyć wynik." }));
          return;
        }
        const ocena2 = ocenSelekcje(wejscie2, szkic);
        const slad = wyborGracza2.value ? ocena2.slad(wyborGracza2.value) : null;
        podglad2.replaceChildren(
          el("p", { className: "ep-opis", textContent: `Cały skład według tego zestawu: ${liczniki(ocena2.wiersze).map(([e, n]) => `${e} ${n}`).join(", ") || "brak graczy"}.` }),
          slad ? drzewoSladu(slad) : el("p", { className: "ep-opis", textContent: "Brak graczy w danych. Uruchom skan w zakładce Dane." })
        );
      }
      function rysuj() {
        drzewo.replaceChildren(edytorRegul(szkic, zmiana, otwarte));
        parametry.replaceChildren(edytorParametrow(szkic, zmiana));
      }
      function zmiana(strukturalna) {
        if (strukturalna) rysuj();
        przelicz();
      }
      const wyborZestawu = el("select", { className: "ep-pole" }, ...zestawy.map((z) => el("option", {
        value: z.id,
        textContent: `${z.nazwa}${z.id === aktywne ? " (w użyciu)" : ""}`
      })));
      wyborZestawu.value = wybrany.id;
      wyborZestawu.addEventListener("change", () => k.przejdz("reguly", { zestaw: wyborZestawu.value }));
      const nazwa = el("input", { className: "ep-pole", value: szkic.nazwa, title: "Nazwa zestawu" });
      nazwa.addEventListener("change", () => {
        szkic.nazwa = nazwa.value.trim() || szkic.nazwa;
      });
      wyborGracza2.addEventListener("change", przelicz);
      const zapisz = (uzyj) => async () => {
        if (walidujZestaw(szkic).length) {
          k.komunikat("Zestaw ma błędy, popraw je przed zapisem.");
          return;
        }
        const zapisany = zapiszZestaw(k, szkic, uzyj);
        await k.odswiez();
        k.przejdz("reguly", { zestaw: zapisany.id, gracz: wyborGracza2.value });
        k.komunikat(uzyj ? "Zapisano. Selekcja liczy tym zestawem." : "Zapisano.");
      };
      const plik = el("input", { type: "file", accept: ".json", hidden: true });
      plik.addEventListener("change", async () => {
        try {
          const zestaw = await importuj(k, plik.files[0]);
          await k.odswiez();
          k.przejdz("reguly", { zestaw: zestaw.id });
          k.komunikat(`Zaimportowano: ${zestaw.nazwa}. Nie jest w użyciu, dopóki go nie włączysz.`);
        } catch (blad) {
          k.komunikat(`Błąd importu: ${blad.message}`);
        }
      });
      const usun = przycisk("Usuń zestaw", async () => {
        if (usun.textContent !== "Na pewno usunąć?") {
          usun.textContent = "Na pewno usunąć?";
          return;
        }
        const dane2 = wczytajDane(k.swiat);
        delete dane2.reguly[wybrany.id];
        zapiszDane(k.swiat, dane2);
        if (k.ustawienia.selekcja.aktywne === wybrany.id) zapiszUstawienia(k.swiat, { ...k.ustawienia, selekcja: { aktywne: null } });
        await k.odswiez();
        k.przejdz("reguly");
      });
      usun.hidden = wybrany.id === ID_DOMYSLNEGO;
      rysuj();
      przelicz();
      return el(
        "div",
        { className: "ep-widok ep-widok-przewijany" },
        el("p", { className: "ep-opis", textContent: "Selekcję układasz z klocków: dane o graczu, normy liczone z budynków każdej wioski, poziomy w grupie podobnych graczy, porównania, logika, wyjątki i wagi. Klocek z nazwą można podpiąć w kilku miejscach. Zaznacz „kolumna”, żeby widzieć go w tabeli Selekcji. Zmiany od razu liczą podgląd, a do selekcji trafiają po zapisie." }),
        el(
          "div",
          { className: "ep-pasek" },
          wyborZestawu,
          nazwa,
          przycisk("Zapisz i używaj", zapisz(true), "ep-glowny"),
          przycisk("Zapisz", zapisz(false)),
          przycisk("Kopia", () => {
            szkic.id = nowyIdZestawu();
            szkic.nazwa = `${szkic.nazwa} (kopia)`;
            nazwa.value = szkic.nazwa;
            k.komunikat("Kopia powstanie przy zapisie.");
          }),
          przycisk("Pobierz reguły", () => pobierzPlik(`reguly_${k.swiat}_${znacznikCzasu()}.json`, JSON.stringify(szkic, null, 1), "application/json")),
          przycisk("Importuj reguły", () => plik.click()),
          usun,
          plik
        ),
        bledy,
        el(
          "div",
          { className: "ep-reguly" },
          el("div", { className: "ep-reguly-drzewo" }, sekcja3("Klocki", drzewo), sekcja3("Parametry", parametry)),
          el("div", { className: "ep-reguly-podglad" }, sekcja3("Podgląd na graczu", wyborGracza2, podglad2))
        )
      );
    }
  };

  // src/moduly/ruchy.js
  var KLASY3 = { dołączył: "ep-dobrze", odszedł: "ep-zle", "przeniósł się": "ep-typ-deff" };
  function opis(k, ruchy2) {
    const pierwsza = k.dane.puls.migawki[0];
    const start = pierwsza ? `Skład śledzony od ${formatDaty(pierwsza.data)}, jedna migawka publicznych plików dziennie przy otwarciu panelu. ` : "";
    const bilans = Object.entries(bilansCzlonow(ruchy2)).sort(([a], [b]) => a.localeCompare(b, "pl")).map(([tag, { doszlo, ubylo }]) => `${tag} +${doszlo} -${ubylo}`).join(", ");
    return `${start}Ruch zaszedł między dwiema datami, a koniec blokady to najpóźniejszy możliwy termin ${k.ustawienia.blokadaDni} dni od wykrycia.${bilans ? ` Bilans: ${bilans}.` : ""}`;
  }
  var ruchy = {
    id: "ruchy",
    tytul: "Ruchy",
    grupa: "Kontrola",
    widok(k) {
      const wiersze = ruchyCzlonow(k.dane.puls, k.ustawienia, k.slownik);
      const nasi = new Set(k.model.gracze.map((g) => g.id));
      return widokListy({
        kontekst: k,
        tytul: "Ruchy w członach",
        opis: opis(k, wiersze),
        wiersze,
        szukajW: (r) => `${r.nick} ${r.rodzaj} ${r.z || ""} ${r.na || ""}`,
        sort: { klucz: "doDaty", malejaco: true },
        pusty: "Na razie bez ruchów. Porównanie zaczyna się od drugiego dnia migawek.",
        naWiersz: (r) => {
          if (nasi.has(r.id)) k.przejdz("akta", { id: r.id });
        },
        kolumny: [
          kolCzlon,
          kolGracz,
          { klucz: "rodzaj", tytul: "Ruch", wartosc: (r) => r.rodzaj, klasa: (r) => KLASY3[r.rodzaj] },
          { klucz: "z", tytul: "Skąd", wartosc: (r) => r.z },
          { klucz: "na", tytul: "Dokąd", wartosc: (r) => r.na },
          kolData("odDaty", "Po", (r) => r.odDaty),
          kolData("doDaty", "Przed", (r) => r.doDaty),
          {
            klucz: "koniecBlokady",
            tytul: "Koniec blokady",
            wartosc: (r) => r.koniecBlokady,
            tekst: (r) => r.koniecBlokady ? formatDaty(r.koniecBlokady) : "—",
            klasa: (r) => r.blokadaTrwa ? "ep-zle" : "ep-szary"
          }
        ]
      });
    }
  };

  // src/moduly/wioski.js
  var UDZIAL_SUROWCOW = 40;
  var SKLAD_OFF = czytajSklad("axe=700,light=75,ram=5");
  var jednostka = (w, id) => w.wlasne ? w.wlasne[id] || 0 : null;
  var wioski2 = {
    id: "wioski",
    tytul: "Wioski",
    grupa: "Dane",
    widok(k) {
      const pojemnosc = (w) => k.stale ? zagrodaWioski(w, k.stale) : null;
      const produkcja2 = (w) => k.stale ? maksProdukcji(w, w.typ === "off" ? SKLAD_OFF : k.ustawienia.paczka, k.stale, UDZIAL_SUROWCOW) : null;
      return widokListy({
        kontekst: k,
        tytul: "Wioski",
        opis: `Wolne to miejsce w zagrodzie po budynkach i wojsku. Maks. na dobę to ludność wojska, którą wioska utrzyma przy ${UDZIAL_SUROWCOW}% surowców na wojsko; obok, co ją ogranicza.`,
        wiersze: k.model.wioski,
        szukajW: (w) => `${w.nick} ${w.koord} ${w.nazwa} ${w.typ || ""}`,
        sort: { klucz: "punkty", malejaco: true },
        kolumny: [
          kolCzlon,
          kolGracz,
          kolWioska,
          kolTyp,
          kolLiczba("punkty", "Punkty", (w) => w.punkty),
          ...["spear", "sword", "axe", "spy", "light", "heavy", "ram", "catapult", "snob"].map((id) => kolJednostka(id, (w) => jednostka(w, id))),
          kolLiczba("wolne", "Wolne", (w) => pojemnosc(w)?.wolne ?? null),
          kolLiczba("maks", "Maks. na dobę", (w) => produkcja2(w)?.ludnoscNaDobe ?? null),
          { klucz: "ogranicza", tytul: "Ogranicza", wartosc: (w) => produkcja2(w)?.ogranicza ?? null },
          kolLiczba("odleglosc", "Do wroga", (w) => w.odleglosc)
        ]
      });
    }
  };

  // src/moduly/index.js
  var MODULY = [
    przeglad,
    gracze,
    akta,
    selekcja,
    reguly,
    ranking3,
    ruchy,
    zmiany,
    dziennik,
    przejecia2,
    obstawy,
    prosby,
    aktywnosc,
    kiszenie,
    wioski2,
    budynki,
    dane
  ];

  // src/rdzen/swiat.js
  var WAZNOSC_MS = 7 * 864e5;
  var klucz = (swiat) => `efekt_panel_swiat_${swiat}`;
  function xml(tekst) {
    const dokument = new DOMParser().parseFromString(tekst, "text/xml");
    if (!dokument.documentElement || dokument.querySelector("parsererror")) throw new Error("Nieczytelna odpowiedź API świata.");
    return dokument.documentElement;
  }
  var liczba6 = (wezel, nazwa) => Number(wezel.querySelector(`:scope > ${nazwa}`)?.textContent);
  function czytajStaleSwiata({ config, units, buildings }) {
    const konfiguracja = xml(config);
    const stale = {
      speed: liczba6(konfiguracja, "speed"),
      baseProduction: Number(konfiguracja.querySelector("base_production")?.textContent),
      jednostki: Object.fromEntries([...xml(units).children].map((j) => [j.tagName, {
        buildTime: liczba6(j, "build_time"),
        pop: liczba6(j, "pop")
      }])),
      budynki: Object.fromEntries([...xml(buildings).children].map((b) => [b.tagName, {
        pop: liczba6(b, "pop"),
        popFactor: liczba6(b, "pop_factor"),
        maxLevel: liczba6(b, "max_level")
      }]))
    };
    if (!stale.speed || !stale.baseProduction || !stale.jednostki.spear || !stale.budynki.farm) throw new Error("Niepełne dane świata.");
    return stale;
  }
  async function pobierz(func) {
    const odpowiedz = await fetch(`/interface.php?func=${func}`);
    if (!odpowiedz.ok) throw new Error(`Nie udało się pobrać ${func}.`);
    return odpowiedz.text();
  }
  async function wczytajSwiat(swiat, teraz2 = Date.now()) {
    const zapisane = JSON.parse(localStorage.getItem(klucz(swiat)) || "null");
    if (zapisane && teraz2 - zapisane.pobrano < WAZNOSC_MS) return zapisane;
    try {
      const [config, units, buildings] = await Promise.all(["get_config", "get_unit_info", "get_building_info"].map(pobierz));
      const stale = { ...czytajStaleSwiata({ config, units, buildings }), pobrano: teraz2 };
      localStorage.setItem(klucz(swiat), JSON.stringify(stale));
      return stale;
    } catch (blad) {
      if (zapisane) return zapisane;
      throw blad;
    }
  }

  // src/ui/style.js
  var STYL2 = `
:host { all: initial; }
* { box-sizing: border-box; }
[hidden] { display: none !important; }
.ep-start, .ep-okno, .ep-btn, .ep-pole, .ep-bb { font-family: Verdana, Arial, sans-serif; font-size: 12px; }
.ep-start { position: fixed; right: 16px; bottom: 16px; z-index: 99998; padding: 8px 14px; border: 0; border-radius: 6px;
  background: linear-gradient(180deg,#7a3418,#5a2410); color: #fff; font-weight: bold; cursor: pointer; box-shadow: 0 3px 10px rgba(0,0,0,.4); }
.ep-start:hover { background: #8b0000; }
.ep-tlo { position: fixed; inset: 0; z-index: 99999; display: flex; align-items: center; justify-content: center; background: rgba(30,18,8,.55); }
.ep-okno { display: flex; flex-direction: column; width: min(1240px, 96vw); height: 90vh; overflow: hidden; border-radius: 8px;
  background: #fbf3e0; color: #2e2013; box-shadow: 0 12px 40px rgba(0,0,0,.45); }
.ep-gora { display: flex; align-items: center; gap: 12px; padding: 12px 18px; background: linear-gradient(100deg,#3f2412,#6b2a14); color: #fff; }
.ep-tytul { font-size: 15px; font-weight: bold; }
.ep-stan { flex: 1; font-size: 11px; color: #e6d5b8; }
.ep-zamknij { border: 0; background: none; color: #fff; font-size: 20px; line-height: 1; cursor: pointer; }
.ep-zakladki { display: flex; flex-wrap: wrap; gap: 2px; padding: 8px 12px; background: #efe0c2; border-bottom: 1px solid #d7bf95; overflow-x: auto; }
.ep-zakladka { padding: 7px 10px; border: 0; border-radius: 999px; background: none; color: #5c3a1e;
  font: inherit; font-weight: bold; cursor: pointer; white-space: nowrap; }
.ep-zakladka:hover { background: #e3cfa6; }
.ep-zakladka.ep-aktywna { background: #6b2a14; color: #fff; }
.ep-tresc { flex: 1; min-height: 0; overflow: auto; padding: 14px 16px; }
.ep-widok { display: flex; flex-direction: column; gap: 10px; height: 100%; min-height: 0; }
.ep-opis { margin: 0; color: #6d5a43; line-height: 1.45; }
.ep-pasek { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
.ep-odstep { flex: 1; }
.ep-licznik { color: #6d5a43; }
.ep-pole { padding: 6px 8px; border: 1px solid #c9ad7f; border-radius: 4px; background: #fff; color: #2e2013; }
input[type=search].ep-pole { width: 220px; }
.ep-btn { padding: 6px 12px; border: 1px solid #8a6a3f; border-radius: 4px; background: #fff; color: #4a2c17; font-weight: bold; cursor: pointer; }
.ep-btn:hover:not(:disabled) { background: #f4e4bc; }
.ep-btn:disabled { opacity: .5; cursor: default; }
.ep-glowny { background: #6b2a14; border-color: #6b2a14; color: #fff; }
.ep-glowny:hover:not(:disabled) { background: #8b0000; }
.ep-tabela-ramka { flex: 1; min-height: 120px; overflow: auto; border: 1px solid #d7bf95; border-radius: 6px; background: #fff; }
.ep-tabela { width: 100%; border-collapse: collapse; }
.ep-tabela th { position: sticky; top: 0; z-index: 1; padding: 7px 8px; background: #f3e7cd; border-bottom: 1px solid #c9ad7f;
  color: #4a2c17; text-align: left; white-space: nowrap; cursor: pointer; user-select: none; }
.ep-tabela th.ep-rosnaco::after { content: ' ▲'; font-size: 9px; }
.ep-tabela th.ep-malejaco::after { content: ' ▼'; font-size: 9px; }
.ep-tabela td { padding: 5px 8px; border-bottom: 1px solid #f0e6d2; white-space: nowrap; }
.ep-tabela tbody tr:hover td { background: #fbf3e0; }
.ep-klikalny { cursor: pointer; }
.ep-liczba { text-align: right !important; font-variant-numeric: tabular-nums; }
.ep-pusto { padding: 28px !important; text-align: center; color: #6d5a43; }
.ep-dobrze { color: #1d6b2c; font-weight: bold; }
.ep-zle { color: #b3261e; font-weight: bold; }
.ep-typ-off { color: #b3261e; font-weight: bold; }
.ep-typ-deff { color: #1f5fa8; font-weight: bold; }
.ep-typ-mix { color: #8a5a00; font-weight: bold; }
.ep-postep { height: 4px; margin-top: 3px; min-width: 70px; overflow: hidden; border-radius: 2px; background: #efe3c9; }
.ep-postep i { display: block; height: 100%; background: #2e7d32; }
.ep-widok-przewijany { height: auto; }
.ep-widok-przewijany .ep-tabela-ramka { flex: none; max-height: 420px; }
.ep-szczegoly { display: flex; flex-direction: column; gap: 8px; border-color: #8a6a3f; }
.ep-szczegoly h3 { margin: 0; }
.ep-szary { color: #8a7a65; }
.ep-karty { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 10px; }
.ep-karta { padding: 12px 14px; border: 1px solid #d7bf95; border-radius: 6px; background: #fff; text-align: left; font: inherit; color: inherit; }
button.ep-karta { cursor: pointer; }
button.ep-karta:hover { border-color: #8b0000; }
.ep-karta-liczba { font-size: 24px; font-weight: bold; color: #4a2c17; }
.ep-karta-alarm .ep-karta-liczba { color: #b00000; }
.ep-karta-opis { margin-top: 2px; color: #6d5a43; }
.ep-uwaga { padding: 8px 12px; border-left: 4px solid #b00000; border-radius: 4px; background: #fdeee8; line-height: 1.45; }
.ep-sekcja { padding: 14px; border: 1px solid #d7bf95; border-radius: 6px; background: #fff; }
.ep-sekcja h3 { margin: 0 0 10px; font-size: 13px; color: #4a2c17; }
.ep-dane { display: flex; flex-direction: column; gap: 12px; }
.ep-wiersz { display: flex; gap: 8px; flex-wrap: wrap; align-items: center; }
.ep-sekcja .ep-opis, .ep-sekcja .ep-uwaga { margin-top: 10px; }
.ep-pasek-postepu { height: 8px; margin-top: 10px; overflow: hidden; border-radius: 4px; background: #efe3c9; }
.ep-pasek-postepu div { height: 100%; width: 0; background: #8b0000; transition: width .2s; }
.ep-formularz { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 10px 16px; }
.ep-formularz label { display: flex; flex-direction: column; gap: 4px; color: #6d5a43; }
.ep-bb { width: 100%; padding: 8px; border: 1px solid #c9ad7f; border-radius: 4px; }
.ep-komunikat { position: absolute; left: 50%; bottom: 24px; transform: translateX(-50%); padding: 8px 14px; border-radius: 6px; background: #2e2013; color: #fff; }
.ep-grupa { align-self: center; margin: 0 4px 0 10px; font-size: 10px; font-weight: bold; letter-spacing: .04em; text-transform: uppercase; color: #8a6a3f; }
.ep-grupa:first-child { margin-left: 0; }
.ep-plus { color: #1d6b2c; font-weight: bold; }
.ep-minus { color: #b3261e; font-weight: bold; }
.ep-zero { color: #8a7a65; }
.ep-sekcje { display: flex; flex-direction: column; gap: 12px; }
.ep-reguly { display: grid; grid-template-columns: minmax(0, 3fr) minmax(320px, 2fr); gap: 12px; align-items: start; }
.ep-reguly-drzewo { display: flex; flex-direction: column; gap: 12px; min-width: 0; }
.ep-reguly-podglad { position: sticky; top: 0; min-width: 0; }
.ep-klocek { margin-top: 6px; padding: 8px 10px; border: 1px solid #d7bf95; border-left: 4px solid #8a6a3f; border-radius: 6px; background: #fffaf0; }
.ep-klocek-zrodlo { border-left-color: #2f80ed; }
.ep-klocek-norma { border-left-color: #2e7d32; }
.ep-klocek-grupa { border-left-color: #7b4fb5; }
.ep-klocek-porownanie { border-left-color: #c77700; }
.ep-klocek-logika { border-left-color: #00838f; }
.ep-klocek-bramka { border-left-color: #b3261e; }
.ep-klocek-wagi, .ep-klocek-etykieta-typ { border-left-color: #4a2c17; }
.ep-klocek-glowa { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
.ep-klocek-typ { font-size: 10px; font-weight: bold; text-transform: uppercase; letter-spacing: .4px; color: #6d5a43; }
.ep-klocek-nazwa { flex: 1 1 140px; min-width: 120px; font-weight: bold; }
.ep-klocek-znacznik { display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: #6d5a43; }
.ep-klocek-waga { width: 56px; }
.ep-klocek-pola { display: grid; grid-template-columns: repeat(auto-fit, minmax(170px, 1fr)); gap: 6px 10px; margin-top: 6px; }
.ep-klocek-pole { display: flex; flex-direction: column; gap: 2px; font-size: 11px; color: #6d5a43; }
.ep-klocek-wejscia { margin: 6px 0 6px 6px; padding-left: 10px; border-left: 2px dashed #d7bf95; }
.ep-klocek-wskazanie { border-left-style: dashed; background: #fff; font-size: 11px; color: #6d5a43; }
.ep-klocek-rozwin { margin-top: 6px; }
.ep-klocek-rozwin > summary { cursor: pointer; font-size: 11px; font-weight: bold; color: #6d5a43; }
.ep-klocek-etykieta { margin-top: 6px; font-size: 11px; font-weight: bold; color: #6d5a43; }
.ep-slad { margin: 0; padding-left: 14px; list-style: none; border-left: 1px solid #e4d3b0; }
.ep-slad-glowny { padding-left: 0; border-left: 0; }
.ep-slad-wiersz { display: flex; flex-wrap: wrap; gap: 2px 8px; padding: 2px 0; }
.ep-slad-nazwa { font-weight: bold; color: #4a2c17; }
.ep-znacznik { display: inline-block; padding: 2px 8px; border-radius: 999px; font-size: 11px; font-weight: bold; background: #efe3c9; color: #4a2c17; }
.ep-znacznik.ep-dobrze { background: #e3f1e4; color: #1d6b2c; }
.ep-znacznik.ep-zle { background: #fbe4e1; color: #b3261e; }
.ep-znacznik.ep-szary { background: #eee8dc; color: #6d5a43; }
.ep-znacznik.ep-typ-mix { background: #f7ebcf; color: #8a5a00; }
.ep-znacznik.ep-typ-off { background: #fbe4e1; color: #b3261e; }
.ep-znacznik.ep-typ-deff { background: #e2ecf8; color: #1f5fa8; }
.ep-naglowek-gracza { display: flex; align-items: baseline; gap: 12px; flex-wrap: wrap; }
.ep-naglowek-gracza h2 { margin: 0; font-size: 20px; color: #4a2c17; }
.ep-fakty { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 8px 16px; margin-top: 10px; }
.ep-fakt { display: flex; flex-direction: column; gap: 2px; }
.ep-fakt-nazwa { font-size: 11px; color: #6d5a43; }
.ep-fakt-wartosc { font-size: 15px; font-weight: bold; color: #2e2013; display: flex; align-items: center; gap: 5px; }
.ep-dwie-kolumny { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
@media (max-width: 900px) { .ep-dwie-kolumny { grid-template-columns: 1fr; } }
.ep-wpisy { display: flex; flex-direction: column; gap: 8px; }
.ep-wpis { display: grid; grid-template-columns: auto 1fr auto; gap: 6px 12px; align-items: start; padding: 8px 10px; border: 1px solid #e3d3b1; border-left-width: 4px; border-radius: 4px; background: #fffdf8; }
.ep-wpis-pochwala { border-left-color: #1d6b2c; }
.ep-wpis-kara { border-left-color: #b3261e; }
.ep-wpis-notatka { border-left-color: #8a6a3f; }
.ep-wpis-tresc { grid-column: 1 / -1; white-space: pre-wrap; line-height: 1.4; }
.ep-wpis-dowod { grid-column: 1 / -1; font-size: 11px; color: #6d5a43; }
.ep-wpis-meta { font-size: 11px; color: #6d5a43; }
.ep-usun { border: 0; background: none; color: #8a7a65; cursor: pointer; font: inherit; text-decoration: underline; }
.ep-usun:hover { color: #b3261e; }
.ep-formularz-wpisu { display: grid; grid-template-columns: 1fr 1fr 90px; gap: 8px; align-items: end; }
.ep-formularz-wpisu label { display: flex; flex-direction: column; gap: 4px; color: #6d5a43; }
.ep-formularz-wpisu textarea, .ep-formularz-wpisu .ep-szeroki { grid-column: 1 / -1; }
.ep-opis-ocen { display: flex; flex-wrap: wrap; gap: 6px 14px; margin: 0; color: #6d5a43; }
.ep-mini { font-size: 11px; color: #6d5a43; }
.ep-wybor-gracza { display: flex; gap: 8px; align-items: center; flex-wrap: wrap; }
.ep-lista-graczy { display: grid; grid-template-columns: repeat(auto-fill, minmax(160px, 1fr)); gap: 6px; }
.ep-lista-graczy button { padding: 6px 10px; border: 1px solid #d7bf95; border-radius: 4px; background: #fff; font: inherit; color: #2e2013; text-align: left; cursor: pointer; }
.ep-lista-graczy button:hover { border-color: #8b0000; }
.ep-lista-graczy .ep-mini { display: block; }
.ep-podtytul { margin: 14px 0 6px; font-size: 12px; color: #4a2c17; }
.ep-btn.ep-maly { padding: 3px 8px; font-weight: normal; }
`;

  // src/ui/powloka.js
  function uruchomPowloke(moduly) {
    const swiat = window.game_data.world;
    const host = el("div", { id: "efekt-panel-host" });
    const cien = host.attachShadow({ mode: "open" });
    const start = el("button", { type: "button", className: "ep-start", textContent: "Panel plemienia" });
    cien.append(el("style", { textContent: STYL2 }), start);
    const stan = el("div", { className: "ep-stan" });
    const zakladki = el("nav", { className: "ep-zakladki" });
    const tresc2 = el("main", { className: "ep-tresc" });
    const zamknij = el("button", { type: "button", className: "ep-zamknij", textContent: "×", title: "Zamknij" });
    const okno = el(
      "div",
      { className: "ep-okno" },
      el("header", { className: "ep-gora" }, el("div", { className: "ep-tytul", textContent: "Panel plemienia" }), stan, zamknij),
      zakladki,
      tresc2
    );
    const tlo = el("div", { className: "ep-tlo", hidden: true }, okno);
    cien.append(tlo);
    document.body.appendChild(host);
    let aktywny = moduly[0].id;
    let opcje = {};
    let model = null;
    let dane2 = null;
    let ustawienia = null;
    let obstawy2 = null;
    let przejecia3 = null;
    let slownik = null;
    let stale = null;
    let przejeciaSurowe = [];
    let selekcja2 = null;
    let czasKomunikatu = null;
    function komunikat(tekst) {
      okno.querySelector(".ep-komunikat")?.remove();
      const dymek = el("div", { className: "ep-komunikat", textContent: tekst });
      okno.style.position = "relative";
      okno.appendChild(dymek);
      window.clearTimeout(czasKomunikatu);
      czasKomunikatu = window.setTimeout(() => dymek.remove(), 2500);
    }
    async function przelicz() {
      dane2 = wczytajDane(swiat);
      ustawienia = wczytajUstawienia(swiat);
      let wrogowie = [];
      try {
        wrogowie = await wioskiPlemion(ustawienia.wrogowie);
      } catch {
        komunikat("Nie udało się pobrać mapy. Kiszenie zostaje bez oceny.");
      }
      try {
        slownik = await slownikMapy();
        if (dopiszPuls(dane2, migawkaPulsu(slownik, await wczytajRanking(), ustawienia.czlony))) zapiszDane(swiat, dane2);
      } catch (blad) {
        komunikat(`Nie zapisano dziennej migawki: ${blad.message}`);
      }
      model = zbudujModel(dane2, ustawienia, wrogowie);
      obstawy2 = zbudujObstawy(dane2, model, ustawienia);
      try {
        przejeciaSurowe = czytajPrzejecia(await wczytajPrzejecia());
        przejecia3 = ocenPrzejecia(przejeciaSurowe, await slownikMapy(), ustawienia);
      } catch {
        przejeciaSurowe = [];
        przejecia3 = null;
      }
      try {
        stale = await wczytajSwiat(swiat);
      } catch {
        stale = null;
      }
      try {
        selekcja2 = ocenSelekcje({ model, obstawy: obstawy2, dane: dane2, ustawienia, stale, przejecia: przejeciaSurowe });
      } catch (blad) {
        selekcja2 = null;
        komunikat(`Błąd selekcji: ${blad.message}`);
      }
      const czlony = model.czlony.length;
      stan.textContent = czlony ? `Człony w danych: ${czlony}. Najstarszy skan: ${formatDaty(model.czlony.map((c) => c.data).sort()[0])}` : "Brak danych";
    }
    function rysuj() {
      const elementy = [];
      let grupa = null;
      for (const modul2 of moduly) {
        if (modul2.grupa && modul2.grupa !== grupa) {
          grupa = modul2.grupa;
          elementy.push(el("span", { className: "ep-grupa", textContent: grupa }));
        }
        const przyciskZakladki = el("button", {
          type: "button",
          className: `ep-zakladka${modul2.id === aktywny ? " ep-aktywna" : ""}`,
          textContent: modul2.tytul
        });
        przyciskZakladki.addEventListener("click", () => przejdz(modul2.id));
        elementy.push(przyciskZakladki);
      }
      zakladki.replaceChildren(...elementy);
      const modul = moduly.find((m) => m.id === aktywny);
      try {
        tresc2.replaceChildren(modul.widok({
          swiat,
          dane: dane2,
          ustawienia,
          model,
          obstawy: obstawy2,
          przejecia: przejecia3,
          przejeciaSurowe,
          slownik,
          stale,
          selekcja: selekcja2,
          opcje,
          przejdz,
          odswiez,
          komunikat
        }));
      } catch (blad) {
        tresc2.replaceChildren(el("div", { className: "ep-uwaga", textContent: `Błąd zakładki ${modul.tytul}: ${blad.message}` }));
      }
      tresc2.scrollTop = 0;
    }
    function przejdz(id, noweOpcje = {}) {
      aktywny = id;
      opcje = noweOpcje;
      rysuj();
    }
    async function odswiez() {
      await przelicz();
      rysuj();
    }
    function pokazOkno(widoczne) {
      tlo.hidden = !widoczne;
      start.hidden = widoczne;
    }
    start.addEventListener("click", async () => {
      pokazOkno(true);
      await odswiez();
    });
    zamknij.addEventListener("click", () => pokazOkno(false));
    tlo.addEventListener("click", (zdarzenie) => {
      if (zdarzenie.target === tlo) pokazOkno(false);
    });
    document.addEventListener("keydown", (zdarzenie) => {
      if (zdarzenie.key === "Escape") pokazOkno(false);
    });
  }

  // src/main.js
  var url = new URL(location.href);
  var ekran = url.searchParams.get("screen");
  if (window.game_data && window.game_data.player) {
    if (ekran === "ally" || ekran === "map") uruchomPowloke(MODULY);
    if (ekran === "map") uruchomMape(window.game_data.world);
    if (ekran === "info_village") uruchomWidokWioski(window.game_data.world);
    if (ekran === "forum") uruchomWatekObstaw(window.game_data.world);
    if (ekran === "mail" && url.searchParams.get("mode") === "new") uruchomNowaWiadomosc();
  }
})();
