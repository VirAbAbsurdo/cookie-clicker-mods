// Matriarch ziggurat, and the Elder Apotheosis.
//
// Once the Elder Pact is researched, the store offers a third answer beside the
// Elder Pledge and the Elder Covenant: the Elder Apotheosis. It costs cookies and
// 66 grandmas, who climb first. For the rest of the run the elders' wrath stays at
// its peak, the Pledge and Covenant are no longer offered, and a new building
// appears between Chancemaker and Fractal engine: the Matriarch ziggurat.
//
// The tithe: every 5 game-minutes, about one grandma per 10 ziggurats climbs the
// steps and is gone. Every grandma who has climbed this run gives ziggurats +1% CpS
// (the warm steps), up to +500%. With no grandmas left, ziggurats produce nothing.
// A six-step research branch, the climb, opens with the rite.
//
// Summit offerings (1.1): at 66 ziggurats an upgrade unlocks that turns some wrath
// cookies into Elder Frenzy: 1% per 10 ziggurats, up to 20% at 200. It stands aside
// when another mod (Ouroboros, the Singularity) already decides golden cookies.
//
// Ebon wrinklers (1.2): wrinklers black as basalt. Grandmas who come back down the
// steps (The last step) return as Ebons, and while you own ziggurats some ordinary
// arrivals do too: 1% per 20 ziggurats, up to 10% at 200. An Ebon's belly fills twice
// as fast, it takes as many clicks as a shiny, and when it bursts it fills up to two
// empty wrinkler slots. It counts twice for Summit fires.
//
// Built on the game's own systems: Game.Object for the building, Game.TieredUpgrade
// tiers, the game's synergy and grandma-type helpers, and the official mod API for
// saving. The game keeps mod content out of its main save, so removing this
// mod can't damage your vanilla save; the ziggurat's own data stays stored in
// case you come back.

(function () {
  'use strict';

  // ---- settings -------------------------------------------------------------
  const TITHE_MINUTES = 5;            // a tithe every 5 game-minutes...
  const ZIGGURATS_PER_GRANDMA = 10;   // ...of about one grandma per 10 ziggurats
  const WARM_PER_GRANDMA = 1;         // % ziggurat CpS per grandma who has climbed this run
  const WARM_PER_GRANDMA_HYMNS = 1.5; // with Hymns of ascent
  const WARM_CAP = 500;               // the warm steps stop at +500%
  const STAIRLIFT_RATE = 1.25;        // Stairlifts: grandmas climb 25% more often
  const SURGE_CHANCE = 0.10;          // Chaos is a ramp: chance per game-minute of a surge...
  const SURGE_SIZE = 10;              // ...of ten times a minute's usual tithe...
  const SURGE_WEIGHT = 2;             // ...whose climbers count double toward the warm steps
  const WRINKLER_CHANCE = 0.05;       // The last step: per climbing grandma
  const SUMMIT_FIRES = 0.05;          // Summit fires: +5% per wrinkler feeding on the big cookie
  const TITHE_NOTES = true;           // a brief note each time the tithe climbs
  const OFFERINGS_AT = 66;            // Summit offerings unlocks at 66 ziggurats...
  const OFFERINGS_PER_ZIGGURAT = 0.001; // ...then each ziggurat turns 0.1% of wrath cookies into Elder Frenzy...
  const OFFERINGS_CAP = 0.20;         // ...up to 20%, reached at 200 ziggurats
  const EBON_PER_ZIGGURAT = 0.0005;   // each ziggurat makes 0.05% of arriving wrinklers Ebon...
  const EBON_CAP = 0.10;              // ...up to 10%, reached at 200 ziggurats
  const EBON_BELLY = 2;               // an Ebon wrinkler's belly fills twice as fast
  const EBON_ARMOR = 6;               // clicks it shrugs off first (9 in all to pop, as many as a shiny)
  const EBON_REFILL = 2;              // empty wrinkler slots it fills when it bursts

  // ---- constants ------------------------------------------------------------
  const NAME = 'Matriarch ziggurat';
  const STORE_NAME = 'Ziggurat';
  const RITE = 'Elder Apotheosis';
  const MOD_ID = 'ziggurat';
  const TAG = '[Ziggurat]';
  const DESC = 'A stepped temple of black basalt, tall enough to be seen from other universes. Grandmas climb it. Cookies come down.';
  const BASE_PRICE = 1e17;            // 100 quadrillion, between Chancemaker and Fractal engine
  const BASE_CPS = 7e10;              // 70 billion
  const RITE_PRICE = 666e15;          // 666 quadrillion...
  const RITE_GRANDMAS = 66;           // ...and 66 grandmas
  const BLOCKED = ['Elder Pledge', 'Elder Covenant', 'Revoke Elder Covenant'];

  const TIER_UPGRADES = [
    ['Step stools', 'For the first few steps. After that, they\'re on their own.'],
    ['Handrails', 'Installed after a very short safety review.'],
    ['Sensible shoes', 'Orthopedic, non-slip, rated for the ascent.'],
    ['Rest landings', 'Every hundred steps: a bench, a doily and a bowl of hard candies.'],
    ['Votive doilies', 'Hand-crocheted. Faintly humming.'],
    ['Terrace gardens', 'Mostly rhubarb. Something else grows between the stones.'],
    ['Ceremonial cardigans', 'Buttoned to the very top, as the rite demands.'],
    ['Stone casseroles', 'Brought to every ascent. Nobody has ever seen one eaten.'],
    ['Echoing stairwells', 'Every step answers back, usually with \'speak up, dear.\''],
    ['Moonlit processions', 'They set out at midnight and arrive at dawn. They always arrive at dawn.'],
    ['Knitted banners', 'WELCOME HOME, in letters three stories tall.'],
    ['Lavender incense', 'Covers the other smell. Mostly.'],
    ['Bottomless tea service', 'Served at the summit. The cups are never empty and never quite warm.'],
    ['Large-print hymnals', 'For the long climb.'],
    ['The topmost step', 'There is always one more.'],
  ];
  const TIER_ACHIEVEMENTS = [
    ['Ground floor', 'Everyone starts at the bottom.'],
    ['Mind the steps', 'Some of them are new. Some of them are warm.'],
    ['One step at a time', 'And there are so many steps.'],
    ['Altitude sickness', 'Grandma insists it\'s just the thin air.'],
    ['Grand staircase', 'Grand, as in grandma. Probably.'],
    ['Ziggurat upon ziggurat', 'It\'s ziggurats all the way up.'],
    ['Stepped pyramid scheme', 'The ones at the top did very well.'],
    ['The long way up', 'There is no elevator. There was a petition.'],
    ['Above the clouds', 'On a clear day you can see the next universe.'],
    ['Summit meeting', 'The grandmatriarchs will see you now.'],
    ['Steep learning curve', 'Steeper every year.'],
    ['Upward mobility', 'The bakery\'s social programs have never been more effective.'],
    ['Highest calling', 'They answered it. All of them.'],
    ['Stairs all the way down', 'Wait, which way were we going?'],
    ['Topped out', 'There is still one more step.'],
  ];
  // the climb: research opened by the rite, each step unlocking the next
  const RESEARCH = [
    { name: 'Stairlifts', price: 1e18, icon: 1,
      desc: 'Grandmas climb the ziggurats <b>25%</b> more often.', q: 'Accessibility matters, right up to the end.' },
    { name: 'Ancestral mortar', price: 2e18, icon: 2,
      desc: 'Matriarch ziggurats are <b>twice</b> as efficient.', q: 'Grandma\'s secret recipe. The secret is grandma.' },
    { name: 'Hymns of ascent', price: 4e18, icon: 3,
      desc: 'Each grandma who has climbed gives <b>+1.5%</b> ziggurat CpS instead of +1%, up to the same <b>+500%</b> cap.', q: 'Mostly the same four notes, sung very, very slowly.' },
    { name: 'Summit fires', price: 8e18, icon: 4,
      desc: 'Matriarch ziggurats gain <b>+5%</b> CpS for each wrinkler feeding on the big cookie. <b>Ebon wrinklers</b> count twice.', q: 'Visible from three universes over. The neighbours have started complaining about the smell.' },
    { name: 'The last step', price: 1.6e19, icon: 5,
      desc: 'Each grandma who climbs has a <b>5%</b> chance to come back down as an <b>Ebon wrinkler</b>.', q: 'She went up. Something came down. It is wearing her glasses.' },
    { name: 'Chaos is a ramp', price: 3.2e19, icon: 6,
      desc: 'Grandmas rush the ramp: each minute, a <b>10%</b> chance that <b>ten times</b> a minute\'s usual tithe climbs at once. Grandmas who climb in a surge count <b>double</b> toward the warm steps.', q: 'The last step wasn\'t.' },
  ];
  const SYNERGIES = [
    { name: 'Old-time religion', q: 'The temples were the warm-up act.', icon: 1, other: 'Temple', tier: 'synergy1' },
    { name: 'Gates of the elders', q: 'They don\'t come through the portals anymore. They take the stairs.', icon: 2, other: 'Portal', tier: 'synergy2' },
  ];
  const COOKIES = [
    { name: 'Communion wafers', q: 'Unleavened, unsweetened, unexplained.', icon: 3, price: 6.66e18, at: 1 },
    { name: 'Hymnal shortbread', q: 'Pressed with the first verse. Do not eat the second verse.', icon: 4, price: 6.66e23, at: 100 },
  ];
  // 1.1: wrath cookies sometimes answer with an Elder Frenzy. Saved after the cookies.
  const OFFERINGS = { name: 'Summit offerings', price: 6.66e21, icon: 5,
    q: 'Leave a tin of biscuits on the top step. Something leaves a frenzy in return.' };
  // other mods that already decide every golden cookie's effect; Summit offerings stands aside for them
  const GOLDEN_TAKEOVERS = ['__ouroboros', '__quadfectaSingularity'];
  // [name, how, quote, icon column] (icon row 3)
  const SPECIAL_ACHIEVEMENTS = [
    ['The Last Recipe', 'Choose the <b>Elder Apotheosis</b>.', 'we<br>remember<br>your offering', 0],
    ['The steps are warm', 'Have <b>666</b> grandmas climb the ziggurats in one ascension.', 'the steps<br>are<br>warm', 1],
    ['Empty nest', 'Have your last grandma climb while you own ziggurats.', 'The house is so quiet now.', 2],
    ['She came back down', 'Have a climbing grandma come back down as a <b>wrinkler</b>.', 'Wearing her glasses.', 3],
    ['The Basalt Ziggurat', 'Fill the warm steps to their <b>+500%</b> cap.', 'Black stone, warm to the touch. Finished at last, until the next one.', 4],
  ];
  const TICKER = [
    'News : town council approves "very tall church"; zoning board last seen climbing it.',
    'News : local grandmas report never having felt more needed.',
    'News : stairlift maker posts record quarter, declines to say who is buying.',
    'News : "she said she was just popping up to the top," says family of grandma, four weeks later.',
    'News : ziggurat visible from orbit; astronauts report it waving back.',
    'News : summit bake sale declared a success; nobody remembers bringing anything down.',
    'News : hymn tops the charts for its 400th week; nobody remembers voting.',
    'News : survey finds 9 in 10 grandmas "would climb again"; the tenth could not be reached.',
  ];
  // vanilla achievements and unlocks for owning "X of every building"
  const EVERY_BUILDING = [[100, 'Centennial', 'Milk chocolate butter biscuit'], [150, 'Centennial and a half', 'Dark chocolate butter biscuit'],
    [200, 'Bicentennial', 'White chocolate butter biscuit'], [250, 'Bicentennial and a half', 'Ruby chocolate butter biscuit'],
    [300, 'Tricentennial', 'Lavender chocolate butter biscuit'], [350, 'Tricentennial and a half', 'Synthetic chocolate green honey butter biscuit'],
    [400, 'Quadricentennial', 'Royal raspberry chocolate butter biscuit'], [450, 'Quadricentennial and a half', 'Ultra-concentrated high-energy chocolate butter biscuit'],
    [500, 'Quincentennial', 'Pure pitch-black chocolate butter biscuit'], [550, 'Quincentennial and a half', 'Cosmic chocolate butter biscuit'],
    [600, 'Sexcentennial', 'Butter biscuit (with butter)'], [650, 'Sexcentennial and a half', 'Everybutter biscuit'],
    [700, 'Septcentennial', 'Personal biscuit']];

  let me = null, rite = null;
  const research = [];
  const ourUpgrades = [];       // saved by position: rite, research, tiers, Willing grandmas, synergies, cookies, Summit offerings
  const ourAchievements = [];   // saved by position: tiers, then the special five
  let state = freshState();
  let urls = null;
  let tick = 0;
  let lastFeeding = -1;
  let shownInStore = null;
  let ebon = {};                // Ebon wrinklers by wrinkler slot: { armor, hitT }
  let spawnEbon = false;        // the next spawn comes down the steps
  const ebonArt = {};           // recolored wrinkler sprites, by the game's picture name
  let ebonIconCache = null;

  function freshState() {
    return { active: false, climbed: 0, warm: 0, titheT: 0, minuteT: 0, researchT: -1, researchNext: -1, surges: 0, wrinklers: 0 };
  }
  const icon = (col, row) => [col, row, urls.icons];
  const plural = (n, one, many) => Beautify(n) + ' ' + (n === 1 ? one : many);

  function dataToBlobUrl(dataUrl) {
    const b64 = dataUrl.split(',')[1];
    const bin = atob(b64); const bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    return URL.createObjectURL(new Blob([bytes], { type: 'image/png' }));
  }

  function userGesture() {
    const e = window.event;
    return !!(e && e.isTrusted && /^(click|touchend|mouseup|pointerup|keydown)$/.test(e.type));
  }

  // ---- creation ---------------------------------------------------------------
  function create() {
    if (Game.Objects[NAME]) { console.warn(TAG + ' A building named ' + NAME + ' already exists. Not loading twice.'); return false; }
    const art = window.__ZIGGURAT_ART;
    if (!art) { console.error(TAG + ' Art missing; not loading.'); return false; }
    if (!Game.Upgrades['Elder Pact'] || !Game.Objects['Chancemaker'] || !Game.Objects['Temple'] || !Game.Objects['Portal']) {
      console.error(TAG + ' This version of the game is missing something the ziggurat needs; not loading.'); return false;
    }
    const names = [RITE].concat(RESEARCH.map(r => r.name), TIER_UPGRADES.map(t => t[0]), ['Willing grandmas'],
      SYNERGIES.map(s => s.name), COOKIES.map(c => c.name), [OFFERINGS.name]);
    const achNames = TIER_ACHIEVEMENTS.map(t => t[0]).concat(SPECIAL_ACHIEVEMENTS.map(t => t[0]));
    const clash = names.filter(n => Game.Upgrades[n]).concat(achNames.filter(n => Game.Achievements[n]));
    if (clash.length) { console.error(TAG + ' Name clash with existing content, not loading:', clash); return false; }

    urls = { row: dataToBlobUrl(art.row), bg: dataToBlobUrl(art.bg), store: dataToBlobUrl(art.store),
             icons: dataToBlobUrl(art.icons), grandma: dataToBlobUrl(art.grandma) };
    Game.Loader.Load([urls.row, urls.bg, urls.grandma]);

    // plural-aware string the building tooltip asks for
    if (typeof locStrings !== 'undefined' && !locStrings['%1 ziggurat']) locStrings['%1 ziggurat'] = ['%1 ziggurat', '%1 ziggurats'];

    // The constructor appends its row by rewriting #rows' innerHTML, which would rebuild
    // every existing row (and break minigame displays). Point it at a scratch container
    // instead, then move the finished row into place.
    const realRows = document.getElementById('rows');
    const scratch = document.createElement('div');
    realRows.id = 'rows-ziggurat-real';
    scratch.id = 'rows'; scratch.style.display = 'none';
    document.body.appendChild(scratch);
    try {
      me = new Game.Object(NAME, 'ziggurat|ziggurats|brought down|[X] step added|[X] steps added', DESC, 0, 0,
        { pic: urls.row, bg: urls.bg, xV: 12, yV: 24, w: 56, rows: 1, x: 0, y: -4, frames: 4 }, 1,
        function (b) {
          if (!state.active || Game.Objects['Grandma'].amount <= 0) return 0;   // no vessels
          let mult = 1;
          mult *= Game.GetTieredCpsMult(b);
          mult *= Game.magicCpS(b.name);
          if (Game.Has('Ancestral mortar')) mult *= 2;
          mult *= 1 + warmBonus() / 100;
          if (Game.Has('Summit fires')) mult *= 1 + SUMMIT_FIRES * feeding();
          return BASE_CPS * mult;
        },
        function () { checkUnlocks(); });
    } finally {
      // the row goes between Chancemaker's and Fractal engine's
      const after = document.getElementById('row' + Game.Objects['Chancemaker'].id);
      while (scratch.firstChild) {
        const el = scratch.firstChild;
        if (after && after.parentNode === realRows) after.after(el); else realRows.appendChild(el);
      }
      scratch.remove();
      realRows.id = 'rows';
    }
    me.baseCps = BASE_CPS;
    me.basePrice = BASE_PRICE; me.price = me.basePrice; me.bulkPrice = me.price;
    me.desc = DESC; me.dname = NAME; me.displayName = STORE_NAME;

    // row canvas and hover tracking, as the game does for its own buildings
    me.canvas = document.getElementById('rowCanvas' + me.id);
    me.ctx = me.canvas.getContext('2d', { alpha: false });
    me.pics = [];
    AddEvent(me.canvas, 'mouseover', function () { me.mouseOn = true; });
    AddEvent(me.canvas, 'mouseout', function () { me.mouseOn = false; });
    AddEvent(me.canvas, 'mousemove', function (e) { const box = this.getBounds(); me.mousePos[0] = e.pageX - box.left; me.mousePos[1] = e.pageY - box.top; });

    // icon in the "Muted:" bar
    const mute = document.getElementById('buildingsMute');
    if (mute) {
      const html = '<div class="tinyProductIcon" id="mutedProduct' + me.id + '" style="display:none;background-position:0px 0px;" ' +
        Game.clickStr + '="Game.ObjectsById[' + me.id + '].mute(0);PlaySound(\'snd/clickOn2.mp3\');" ' +
        Game.getDynamicTooltip('Game.mutedBuildingTooltip(' + me.id + ')', 'this') + '></div>';
      const prev = document.getElementById('mutedProduct' + Game.Objects['Chancemaker'].id);
      if (prev && prev.parentNode === mute) prev.insertAdjacentHTML('afterend', html); else mute.insertAdjacentHTML('beforeend', html);
      document.getElementById('mutedProduct' + me.id).style.backgroundImage = 'url(' + urls.store + ')';
    } else {
      const stub = document.createElement('div'); stub.id = 'mutedProduct' + me.id; stub.style.display = 'none'; document.body.appendChild(stub);
    }

    // store entry, between Chancemaker and Fractal engine; other store elements are untouched
    const products = document.getElementById('products');
    const tag = Game.prefs.screenreader ? 'button' : 'div';
    const productHtml = '<' + tag + (Game.prefs.screenreader ? ' aria-labelledby="ariaReader-product-' + me.id + '"' : '') +
      ' class="product toggledOff" style="display:none;" ' + Game.getDynamicTooltip('Game.ObjectsById[' + me.id + '].tooltip', 'store') + ' id="product' + me.id + '">' +
      '<div class="icon off" id="productIconOff' + me.id + '" style=""></div><div class="icon" id="productIcon' + me.id + '" style=""></div>' +
      '<div class="content"><div class="lockedTitle">???</div><div class="title productName" id="productName' + me.id + '"></div>' +
      '<span class="priceMult" id="productPriceMult' + me.id + '"></span><span class="price" id="productPrice' + me.id + '"></span>' +
      '<div class="title owned" id="productOwned' + me.id + '"></div>' +
      (Game.prefs.screenreader ? '<label class="srOnly" style="width:64px;left:-64px;" id="ariaReader-product-' + me.id + '"></label>' : '') +
      '</div></' + tag + '>';
    const prevProduct = document.getElementById('product' + Game.Objects['Chancemaker'].id);
    if (prevProduct && prevProduct.parentNode === products) prevProduct.insertAdjacentHTML('afterend', productHtml);
    else products.insertAdjacentHTML('beforeend', productHtml);
    me.l = document.getElementById('product' + me.id);
    AddEvent(me.l, Game.touchEvents ? 'touchend' : 'click', function (e) { Game.ClickProduct(me.id); e.preventDefault(); });
    document.getElementById('productIcon' + me.id).style.backgroundImage = 'url(' + urls.store + ')';
    document.getElementById('productIconOff' + me.id).style.backgroundImage = 'url(' + urls.store + ')';
    shownInStore = false;

    // golden cookie "building special" names for this building
    if (Game.goldenCookieBuildingBuffs && !Game.goldenCookieBuildingBuffs[NAME]) Game.goldenCookieBuildingBuffs[NAME] = ['Procession', 'Vertigo'];

    // the rite: a third answer to the Elder Pact, next to the Pledge and the Covenant
    rite = new Game.Upgrade(RITE,
      'Embrace the Grandmapocalypse for the rest of this run. The elders\' wrath stays at its peak, the <b>Elder Pledge</b> and <b>Elder Covenant</b> are no longer offered, and <b>Matriarch ziggurats</b> become available.<br>Costs <b>' + RITE_GRANDMAS + ' grandmas</b> as well as cookies. They climb first.' +
      '<div class="warning">Lasts until you ascend.</div>' +
      '<q>This is a short ceremony involving a hymn, a casserole dish and sixty-six volunteers who were not asked.</q>',
      RITE_PRICE, icon(0, 1), riteChosen);
    rite.pool = 'toggle'; rite.order = 15005;
    rite.ddesc = BeautifyInText(rite.desc);
    rite.priceFunc = function () { return RITE_PRICE; };
    rite.canBuyFunc = function () { return Game.cookies >= this.getPrice() && Game.Objects['Grandma'].amount >= RITE_GRANDMAS; };
    rite.clickFunction = function () { if (this.canBuy() && userGesture()) confirmRite(); return false; };
    rite.descFunc = function () {
      const g = Game.Objects['Grandma'].amount;
      return '<div style="text-align:center;">' + (g >= RITE_GRANDMAS
        ? 'You have <b>' + Beautify(g) + '</b> grandmas. Sixty-six will climb first.'
        : '<span style="color:#ff8a7a;">Needs <b>' + RITE_GRANDMAS + '</b> grandmas. You have <b>' + Beautify(g) + '</b>.</span>') +
        '<div class="line"></div></div>' + this.ddesc;
    };
    ourUpgrades.push(rite);

    // the climb: research, each step unlocking the next after the game's research time
    RESEARCH.forEach(function (def, i) {
      const u = new Game.Upgrade(def.name, def.desc + '<q>' + def.q + '</q>', def.price, icon(def.icon, 1),
        function () { if (i + 1 < RESEARCH.length) startResearch(i + 1); me.refresh(); });
      u.pool = 'tech'; u.order = 15010 + i; u.ddesc = BeautifyInText(u.desc);
      research.push(u); ourUpgrades.push(u);
    });

    // tiered upgrades: same tiers, prices and doubling as every other building
    TIER_UPGRADES.forEach(function (t, i) {
      const u = Game.TieredUpgrade(t[0], '<q>' + t[1] + '</q>', NAME, i + 1);
      u.pool = ''; u.order = 31000 + i;
      u.icon = icon(i, 0);
      u.ddesc = BeautifyInText(u.desc);
      ourUpgrades.push(u);
    });

    // Willing grandmas: the game's own grandma type, plus a robed grandma for the Grandma row
    const willing = Game.GrandmaSynergy('Willing grandmas', 'They were always going to go up.', NAME);
    willing.pool = ''; willing.order = 31020; willing.icon = icon(0, 2); willing.ddesc = BeautifyInText(willing.desc);
    ourUpgrades.push(willing);
    const grandmaArt = Game.Objects['Grandma'].art;
    const originalPic = grandmaArt.pic;
    if (typeof originalPic === 'function') {
      grandmaArt.pic = function () {
        const picked = originalPic.apply(this, arguments);
        if (Game.Has('Willing grandmas')) {
          // an equal share with the other grandma types you own
          let types = 1 + (Game.season === 'christmas' || Game.season === 'easter' ? 1 : 0);
          for (const n of Game.GrandmaSynergies) if (Game.Has(n)) types++;
          if (Math.random() < 1 / types) return urls.grandma;
        }
        return picked;
      };
    }

    // synergies, in the game's own synergy tiers (they need Synergies Vol. I / Vol. II)
    SYNERGIES.forEach(function (def, i) {
      const u = Game.SynergyUpgrade(def.name, '<q>' + def.q + '</q>', def.other, NAME, def.tier);
      u.pool = ''; u.order = 31030 + i; u.icon = icon(def.icon, 2); u.ddesc = BeautifyInText(u.desc);
      ourUpgrades.push(u);
    });
    // flavor cookies, +5% each
    COOKIES.forEach(function (def, i) {
      const c = Game.NewUpgradeCookie({ name: def.name, desc: def.q, icon: icon(def.icon, 2), power: 5, price: def.price, locked: true });
      c.order = 31040 + i; c.ddesc = BeautifyInText(c.desc); c.zigAt = def.at;
      if (Game.cookieUpgrades && Game.cookieUpgrades.indexOf(c) === -1) Game.cookieUpgrades.push(c);
      ourUpgrades.push(c);
    });
    // Summit offerings (1.1)
    const offerings = new Game.Upgrade(OFFERINGS.name,
      'Each ziggurat you own gives wrath cookies a <b>0.1%</b> chance to be an <b>Elder Frenzy</b> (<b>1%</b> per 10 ziggurats), up to <b>' +
      Math.round(OFFERINGS_CAP * 100) + '%</b> at ' + Math.round(OFFERINGS_CAP / OFFERINGS_PER_ZIGGURAT) + ' ziggurats.<q>' + OFFERINGS.q + '</q>',
      OFFERINGS.price, icon(OFFERINGS.icon, 2));
    offerings.pool = ''; offerings.order = 31050; offerings.ddesc = BeautifyInText(offerings.desc);
    offerings.descFunc = function () {
      return '<div style="text-align:center;">With <b>' + plural(me.amount, 'ziggurat', 'ziggurats') + '</b>: <b>' +
        Beautify(offeringsChance() * 100, 1) + '%</b> of wrath cookies.' + (takenOver() ? '<br><small>Another mod is deciding golden cookies, so this stands aside.</small>' : '') +
        '<div class="line"></div></div>' + this.ddesc;
    };
    ourUpgrades.push(offerings);

    // achievements for owning ziggurats, at the game's usual thresholds
    TIER_ACHIEVEMENTS.forEach(function (t, i) {
      const n = Game.Tiers[i + 1].achievUnlock;
      const a = new Game.Achievement(t[0], 'Have <b>' + Beautify(n) + '</b> ' + (n === 1 ? 'ziggurat' : 'ziggurats') + '.<q>' + t[1] + '</q>', icon(i, 0));
      a.pool = 'normal'; a.order = 31000 + i;
      a.ddesc = BeautifyInText(a.desc);
      Game.SetTier(NAME, i + 1);
      ourAchievements.push(a);
    });
    SPECIAL_ACHIEVEMENTS.forEach(function (t, i) {
      const a = new Game.Achievement(t[0], t[1] + '<q>' + t[2] + '</q>', icon(t[3], 3));
      a.pool = 'normal'; a.order = 31100 + i; a.ddesc = BeautifyInText(a.desc);
      ourAchievements.push(a);
    });

    // the climb in the building's tooltip
    const originalTooltip = me.tooltip;
    me.tooltip = function () {
      let html = originalTooltip.call(this);
      html = html.replace(/<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;[^"]*"/,
        '<div class="icon" style="float:left;margin-left:-8px;margin-top:-8px;background-image:url(\'' + urls.icons + '\');background-position:-192px -144px;"');
      const g = Game.Objects['Grandma'].amount;
      const per = Game.Has('Hymns of ascent') ? WARM_PER_GRANDMA_HYMNS : WARM_PER_GRANDMA;
      const secs = Math.max(0, Math.ceil(state.titheT / (Game.Has('Stairlifts') ? STAIRLIFT_RATE : 1) / Game.fps));
      const expected = this.amount / ZIGGURATS_PER_GRANDMA;
      let block = '<div class="line"></div><div class="descriptionBlock" style="color:#ffb49a;"><b>The climb:</b> ' +
        plural(state.climbed, 'grandma has', 'grandmas have') + ' climbed this run.' +
        '<br>Warm steps: <b>+' + Beautify(warmBonus(), 1) + '%</b> of +' + WARM_CAP + '% (+' + per + '% per grandma' +
        (state.warm > state.climbed ? ', surges count double' : '') + ').';
      if (this.amount > 0 && g > 0) block += '<br>Next tithe in <b>' + Game.sayTime(secs * Game.fps, -1) + '</b>: about <b>' + Beautify(expected, expected < 10 ? 1 : 0) + '</b> ' + (expected === 1 ? 'grandma' : 'grandmas') + '.';
      if (g <= 0) block += '<br><span style="color:#ff8a7a;"><b>No vessels:</b> with no grandmas, ziggurats produce nothing.</span>';
      if (state.researchT > 0 && research[state.researchNext]) block += '<br>Research: <b>' + research[state.researchNext].dname + '</b> in ' + Game.sayTime(state.researchT, -1) + '.';
      if (state.active && this.amount > 0) {
        const ec = ebonCount();
        block += '<br>Ebon wrinklers: <b>' + Beautify(ebonChance() * 100, 2) + '%</b> of arriving wrinklers' +
          (ec ? ' (<b>' + Beautify(ec) + '</b> on the big cookie now)' : '') + '.';
      }
      block += '</div>';
      const at = html.lastIndexOf('</div>');
      return at === -1 ? html + block : html.slice(0, at) + block + html.slice(at);
    };

    setActive(false, true);
    return true;
  }

  // ---- the rite ---------------------------------------------------------------
  function confirmRite() {
    Game.Prompt('<id ElderApotheosis><div class="icon" style="background-image:url(\'' + urls.icons + '\');background-position:0px -48px;margin:0px auto;display:block;"></div>' +
      '<h3>' + RITE + '</h3><div class="block">Sixty-six grandmas will climb first.' +
      '<div class="line"></div>For the rest of this run the elders\' wrath stays at its peak, and the Elder Pledge and Elder Covenant will not be offered. ' +
      'Matriarch ziggurats become available.<div class="line"></div><small>It lasts until you ascend.</small></div>',
      [['Begin the rite', 'Game.ClosePrompt();Game.UpgradesById[' + rite.id + '].buy(1);'], 'Not yet']);
  }

  function riteChosen() {
    climb(Math.min(RITE_GRANDMAS, Game.Objects['Grandma'].amount), 1, 'rite');
    setActive(true);
    if (!research[0].unlocked && !research[0].bought) Game.Unlock(research[0].name);
    Game.Win('The Last Recipe');
    Game.Notify(RITE, 'Sixty-six grandmas climb into the dark. The elders will not be calmed again this run.<br><b>Matriarch ziggurats</b> are now available.', icon(0, 1));
  }

  // switches the building and the wrath lock on or off; quiet = restoring, not choosing
  function setActive(on, quiet) {
    state.active = !!on;
    me.basePrice = on ? BASE_PRICE : Infinity;   // unbuyable and locked in the store until the rite
    if (on) {
      Game.pledgeT = 0;
      if (Game.Objects['Grandma'].amount > 0) Game.elderWrath = 3;
      for (const n of BLOCKED) { const u = Game.Upgrades[n]; if (u && (u.unlocked || u.bought)) Game.Lock(n); }
      if (!quiet) { state.titheT = titheFrames(); state.minuteT = 0; }
    }
    me.refresh();
    Game.storeToRefresh = 1; Game.upgradesToRebuild = 1; Game.recalculateGains = 1;
  }

  function updateOffer() {
    const offer = !state.active && Game.Has('Elder Pact') && !Game.Has('Elder Covenant');
    if (offer && !rite.unlocked) Game.Unlock(RITE);
    else if (!offer && rite.unlocked && !rite.bought) Game.Lock(RITE);
  }

  // ---- the climb -----------------------------------------------------------------
  const titheFrames = () => Game.fps * 60 * TITHE_MINUTES;
  const warmBonus = () => Math.min(WARM_CAP, state.warm * (Game.Has('Hymns of ascent') ? WARM_PER_GRANDMA_HYMNS : WARM_PER_GRANDMA));
  // wrinklers feeding on the big cookie, for Summit fires; Ebons count twice
  function feeding() { let n = 0; for (const w of Game.wrinklers) if (w.phase === 2) n += ebon[w.id] ? 2 : 1; return n; }

  // ---- Summit offerings ----------------------------------------------------------
  const offeringsChance = () => Math.min(OFFERINGS_CAP, me.amount * OFFERINGS_PER_ZIGGURAT);
  function takenOver() {
    const golden = Game.shimmerTypes && Game.shimmerTypes.golden;
    return !!golden && GOLDEN_TAKEOVERS.some(f => golden[f]);
  }
  // Runs just before the game resolves a golden cookie. The game honours a cookie's
  // `force` field, so everything after this (duration, stats, achievements) is its own.
  function offer(shimmer, golden) {
    if (!shimmer || !shimmer.wrath || shimmer.force) return;          // golden cookies, storm drops and chains pass through
    if (!state.active || !Game.Has(OFFERINGS.name) || takenOver()) return;
    if (golden && golden.chain > 0) return;                           // don't break a chain in progress
    if (Math.random() < offeringsChance()) shimmer.force = 'blood frenzy';
  }

  // ---- Ebon wrinklers -----------------------------------------------------------------
  // To the game an Ebon is an ordinary wrinkler (type 0), so its own save never sees
  // anything new. Which ones are Ebon lives here and in this mod's save.
  const ebonChance = () => (me && state.active) ? Math.min(EBON_CAP, me.amount * EBON_PER_ZIGGURAT) : 0;
  function ebonCount(feedingOnly) {
    let n = 0;
    for (const w of Game.wrinklers) if (ebon[w.id] && (feedingOnly ? w.phase === 2 : w.phase > 0)) n++;
    return n;
  }
  function makeEbon(w) { if (w && w.type === 0) ebon[w.id] = { armor: EBON_ARMOR, hitT: 0 }; return w; }
  function spawnFromTheSteps() {
    spawnEbon = true;
    try { return Game.SpawnWrinkler(); } finally { spawnEbon = false; }
  }

  // The game's own wrinkler picture, turned to basalt with ember cracks and burning eyes.
  // Done in the browser from the picture the game already loaded, so no game art ships here.
  function recolor(img) {
    const W = img.naturalWidth || img.width, H = img.naturalHeight || img.height;
    const c = document.createElement('canvas'); c.width = W; c.height = H;
    const cx = c.getContext('2d'); cx.drawImage(img, 0, 0);
    const im = cx.getImageData(0, 0, W, H), d = im.data;
    const L = new Float32Array(W * H), A = new Uint8Array(W * H);
    for (let i = 0; i < W * H; i++) { A[i] = d[i * 4 + 3] ? 1 : 0; L[i] = A[i] ? (0.299 * d[i * 4] + 0.587 * d[i * 4 + 1] + 0.114 * d[i * 4 + 2]) / 255 : 0; }
    // summed-area tables, for local averages and for "is this pixel near the outline"
    const S = new Float64Array((W + 1) * (H + 1)), N = new Float64Array((W + 1) * (H + 1));
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const k = (y + 1) * (W + 1) + x + 1;
      S[k] = L[y * W + x] + S[k - 1] + S[k - W - 1] - S[k - W - 2];
      N[k] = A[y * W + x] + N[k - 1] + N[k - W - 1] - N[k - W - 2];
    }
    const box = (T, x0, y0, x1, y1) => {
      x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W - 1, x1); y1 = Math.min(H - 1, y1);
      return T[(y1 + 1) * (W + 1) + x1 + 1] - T[y0 * (W + 1) + x1 + 1] - T[(y1 + 1) * (W + 1) + x0] + T[y0 * (W + 1) + x0];
    };
    const eyes = [[0.32 * W, 0.175 * H], [0.68 * W, 0.175 * H]], erx = 0.055 * W, ery = 0.015 * H;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const i = y * W + x, p = i * 4;
      if (!A[i]) continue;
      const r = d[p], g = d[p + 1], b = d[p + 2], l = L[i];
      const t = Math.min(1, Math.pow(l / 0.70, 1.15));
      let o = [8 + t * 78, 7 + t * 76, 11 + t * 92];                       // basalt
      const n = box(N, x - 3, y - 3, x + 3, y + 3);
      const crease = (n ? box(S, x - 3, y - 3, x + 3, y + 3) / n : 0) - l;
      const inner = x >= 2 && y >= 2 && x < W - 2 && y < H - 2 && box(N, x - 2, y - 2, x + 2, y + 2) === 25;
      if (crease > 0.05 && y > 0.11 * H && inner) {                         // ember in the folds
        const k = Math.pow(Math.min(1, (crease - 0.05) / 0.08), 0.8);
        o = [o[0] * (1 - k) + 200 * k, o[1] * (1 - k) + 36 * k, o[2] * (1 - k) + 20 * k];
      }
      if (g > r && b >= r * 0.8) o = [118, 26, 20];                          // rim light
      if (y < 0.12 * H && l > 0.42) o = [120 + l * 90, 114 + l * 86, 104 + l * 80];   // teeth stay bone
      for (const [ex, ey] of eyes) {
        const e = Math.pow((x - ex) / erx, 2) + Math.pow((y - ey) / ery, 2);
        if (e <= 1 && l < 0.30) o = [255, 70 + 120 * (1 - e), 30 + 40 * (1 - e)];        // eyes
      }
      d[p] = o[0]; d[p + 1] = o[1]; d[p + 2] = o[2];
    }
    cx.putImageData(im, 0, 0);
    return c;
  }
  function ebonPic(what, originalPic) {
    if (ebonArt[what]) return ebonArt[what];
    // the game loads pictures the first time they're asked for; until then it hands back a blank
    if (!Game.Loader || Game.Loader.assetsLoaded.indexOf(what) === -1) { originalPic(what); return null; }
    const img = originalPic(what);
    if (!img || !img.naturalWidth) return null;
    try { ebonArt[what] = recolor(img); } catch (e) { console.warn(TAG + ' Could not paint an Ebon wrinkler.', e); ebonArt[what] = img; }
    return ebonArt[what];
  }
  function ebonIcon() {
    if (ebonIconCache) return ebonIconCache;
    const art = ebonPic(Game.WINKLERS ? 'winkler.png' : 'wrinkler.png', Pic);
    if (!art || !art.getContext) return icon(5, 1);
    const c = document.createElement('canvas'); c.width = c.height = 48;
    c.getContext('2d').drawImage(art, 10, 0, 80, 80, 0, 0, 48, 48);
    ebonIconCache = [0, 0, c.toDataURL()];
    return ebonIconCache;
  }
  const EBON_PICS = ['wrinkler.png', 'winterWrinkler.png', 'winkler.png', 'winterWinkler.png'];

  // An Ebon bursts: it leaves room for more.
  function refill(bursts) {
    let n = 0;
    for (let i = 0; i < bursts * EBON_REFILL; i++) if (Game.SpawnWrinkler()) n++;
    if (n) Game.Notify('Ebon wrinkler', 'It burst, and ' + plural(n, 'more wrinkler crawls', 'more wrinklers crawl') + ' out of the dark.', ebonIcon(), 4, 1);
    return n;
  }

  function installEbon() {
    const originalSpawn = Game.SpawnWrinkler;
    Game.SpawnWrinkler = function () {
      const w = originalSpawn.apply(this, arguments);
      if (w) {
        delete ebon[w.id];
        if (w.type === 0 && (spawnEbon || Math.random() < ebonChance())) makeEbon(w);
      }
      return w;
    };

    const originalUpdate = Game.UpdateWrinklers;
    Game.UpdateWrinklers = function () {
      let any = false;
      for (const k in ebon) { any = true; break; }
      if (!any) return originalUpdate.apply(this, arguments);
      // The hide: the game gives a click to the first wrinkler under the pointer. If that
      // one is an Ebon with hide left, the hide takes the click instead.
      if (Game.Click && Game.CanClick && Game.lastClickedEl === l('backgroundLeftCanvas')) {
        for (const w of Game.wrinklers) {
          if (w.phase > 0 && w.selected) {
            const e = ebon[w.id];
            if (e && e.armor > 0) {
              e.armor--; e.hitT = Game.T; w.hurt = 1; w.clicks++;
              Game.playWrinklerSquishSound();
              if (Game.prefs.particles && !Game.prefs.notScary && !Game.WINKLERS) {
                const x = w.x + Math.sin(w.r * Math.PI / 180) * 90, y = w.y + Math.cos(w.r * Math.PI / 180) * 90;
                for (let i = 0; i < 3; i++) { const part = Game.particleAdd(x, y, Math.random() * 4 - 2, Math.random() * -2 - 2, 1, 1, 2, 'wrinklerBits.png'); if (part) part.r = -w.r; }
              }
              Game.Click = 0;
            }
            break;
          }
        }
      }
      const alive = [];
      for (const w of Game.wrinklers) if (ebon[w.id] && w.phase > 0) alive.push([w, w.clicks]);
      const result = originalUpdate.apply(this, arguments);
      let burst = 0;
      for (const [w, clicks] of alive) {
        const e = ebon[w.id];
        if (!e) continue;
        if (w.phase === 0) { delete ebon[w.id]; burst++; continue; }
        if (w.clicks !== clicks) e.hitT = Game.T;                     // hit through the hide: it stays open
        // the belly: the elders feed it as much again as the game does
        if (w.phase === 2) w.sucked += (Game.cookiesPs / Game.fps) * Game.cpsSucked * (EBON_BELLY - 1);
        // the hide closes again, a click's worth each second it isn't hit
        if (e.armor < EBON_ARMOR && Game.T - e.hitT >= Game.fps) { e.armor++; e.hitT = Game.T; }
      }
      if (burst && !Game.OnAscend && !(Game.AscendTimer > 0)) refill(burst);
      return result;
    };

    // Drawn in two passes through the game's own wrinkler drawing: everything else, then
    // the Ebons with their picture swapped for the basalt one.
    const originalDraw = Game.DrawWrinklers;
    Game.DrawWrinklers = function () {
      let any = false;
      for (const w of Game.wrinklers) if (ebon[w.id] && w.phase > 0) { any = true; break; }
      if (!any) return originalDraw.apply(this, arguments);
      const parked = [];
      const park = (keepEbon) => { for (const w of Game.wrinklers) if (w.phase > 0 && !!ebon[w.id] !== keepEbon) { parked.push([w, w.phase]); w.phase = 0; } };
      const unpark = () => { while (parked.length) { const [w, p] = parked.pop(); w.phase = p; } };
      park(false);
      try { originalDraw.apply(this, arguments); } finally { unpark(); }
      park(true);
      const originalPic = window.Pic;
      window.Pic = function (what) { return (EBON_PICS.indexOf(what) !== -1 && ebonPic(what, originalPic)) || originalPic(what); };
      try { originalDraw.apply(this, arguments); } finally { window.Pic = originalPic; unpark(); }
    };
  }

  function restoreEbon(count) {
    ebon = {};
    for (const w of Game.wrinklers) {
      if (count <= 0) break;
      if (w.phase > 0 && w.type === 0) { makeEbon(w); count--; }
    }
  }

  // n grandmas climb the steps and are gone; weight is how much each counts toward the warm steps
  function climb(n, weight, why) {
    const g = Game.Objects['Grandma'];
    n = Math.min(Math.floor(n), g.amount);
    if (n <= 0) return 0;
    // not a sale: skip the Grandma's sell hook (it awards "Just wrong" and pops every wrinkler)
    const sellFunction = g.sellFunction; g.sellFunction = null;
    try { g.sacrifice(n); } finally { g.sellFunction = sellFunction; }
    state.climbed += n; state.warm += n * weight;
    let wrinklers = 0;
    if (Game.Has('The last step')) {
      for (let i = 0; i < n; i++) if (Math.random() < WRINKLER_CHANCE && spawnFromTheSteps()) wrinklers++;
      if (wrinklers) { state.wrinklers += wrinklers; Game.Win('She came back down'); }
    }
    if (state.climbed >= 666) Game.Win('The steps are warm');
    if (warmBonus() >= WARM_CAP) Game.Win('The Basalt Ziggurat');
    const emptied = g.amount === 0 && me.amount > 0;
    if (emptied) Game.Win('Empty nest');
    Game.recalculateGains = 1; Game.storeToRefresh = 1;
    if (why === 'tithe' && TITHE_NOTES) {
      Game.Notify('The tithe', plural(n, 'grandma climbs', 'grandmas climb') + ' the ziggurats.' +
        (wrinklers ? ' ' + plural(wrinklers, 'thing', 'things') + ' came back down, black as basalt.' : '') +
        (emptied ? ' <b>That was the last of them.</b>' : ''), icon(1, 3), 4, 1);
    } else if (why === 'surge') {
      Game.Notify('Chaos is a ramp', 'Grandmas rush the ramp: <b>' + Beautify(n) + '</b> climb at once, and count double.' +
        (wrinklers ? ' ' + plural(wrinklers, 'thing', 'things') + ' came back down, black as basalt.' : ''), icon(6, 1));
    } else if (emptied) {
      Game.Notify('Empty nest', 'That was the last of your grandmas. Ziggurats produce nothing until more arrive.', icon(2, 3));
    }
    return n;
  }

  function tithe() {
    const expected = me.amount / ZIGGURATS_PER_GRANDMA;
    let n = Math.floor(expected);
    if (Math.random() < expected - n) n++;
    return climb(n, 1, 'tithe');
  }

  function surge() {
    const perMinute = me.amount / ZIGGURATS_PER_GRANDMA / TITHE_MINUTES * (Game.Has('Stairlifts') ? STAIRLIFT_RATE : 1);
    const expected = perMinute * SURGE_SIZE;
    let n = Math.floor(expected);
    if (Math.random() < expected - n) n++;
    if (n <= 0) return 0;
    state.surges++;
    return climb(n, SURGE_WEIGHT, 'surge');
  }

  // ---- research ---------------------------------------------------------------------
  function startResearch(i) {
    let t = Game.baseResearchTime;
    if (Game.Has('Persistent memory')) t = Math.ceil(Game.baseResearchTime / 10);
    if (Game.Has('Ultrascience')) t = Game.fps * 5;
    state.researchT = t; state.researchNext = i;
    Game.Notify('Research has begun', 'Your grandmas are studying the climb.', icon(research[i].icon[0], 1));
  }

  function completeResearch() {
    const u = research[state.researchNext];
    state.researchT = -1; state.researchNext = -1;
    if (u && !u.bought && !u.unlocked) {
      Game.Unlock(u.name);
      Game.Notify('Research complete', 'You have discovered: <b>' + u.dname + '</b>.', u.icon);
    }
    Game.recalculateGains = 1;
  }

  // ---- checks ----------------------------------------------------------------------
  function checkUnlocks() {
    if (!me || !state.active) return;
    Game.UnlockTiered(me);
    for (const c of ourUpgrades) if (c.zigAt && me.amount >= c.zigAt) Game.Unlock(c.name);
    if (me.amount >= OFFERINGS_AT) Game.Unlock(OFFERINGS.name);
    if (me.amount >= Game.SpecialGrandmaUnlock && Game.Objects['Grandma'].amount > 0) Game.Unlock('Willing grandmas');
    if (warmBonus() >= WARM_CAP) Game.Win('The Basalt Ziggurat');
    if (state.climbed >= 666) Game.Win('The steps are warm');
  }

  // The game's "have X of every building" checks loop over every building, mod ones
  // included, so a building you can't own yet would block them. Re-run them over the
  // game's own twenty buildings (this also covers other mods' buildings, like Nothing).
  function vanillaBuildingChecks() {
    const v = Game.ObjectsById.filter(o => o.vanilla);
    if (v.length === Game.ObjectsById.length || !v.length) return;
    const n = v.length; let min = Infinity, mathematician = 1, base10 = 1;
    for (const o of v) {
      min = Math.min(min, o.amount);
      if (o.amount < Math.min(128, Math.pow(2, (n - o.id) - 1))) mathematician = 0;
      if (o.amount < (n - o.id) * 10) base10 = 0;
    }
    if (min >= 1) Game.Win('One with everything');
    if (mathematician) Game.Win('Mathematician');
    if (base10) Game.Win('Base 10');
    for (const [k, ach, biscuit] of EVERY_BUILDING) if (min >= k) { Game.Win(ach); Game.Unlock(biscuit); }
  }

  function onLogic() {
    if (!me || Game.OnAscend || Game.AscendTimer > 0) return;
    tick++;
    if (state.researchT > 0) { state.researchT--; if (state.researchT === 0) completeResearch(); }
    if (state.active) {
      state.titheT -= Game.Has('Stairlifts') ? STAIRLIFT_RATE : 1;
      if (state.titheT <= 0) { state.titheT += titheFrames(); tithe(); }
      if (++state.minuteT >= Game.fps * 60) {
        state.minuteT = 0;
        if (Game.Has('Chaos is a ramp') && Math.random() < SURGE_CHANCE) surge();
      }
      if (Game.Has('Summit fires')) { const f = feeding(); if (f !== lastFeeding) { lastFeeding = f; Game.recalculateGains = 1; } }
    }
    if (tick % Game.fps === 0) { updateOffer(); checkUnlocks(); }
  }

  function onDraw() {
    // hidden from the store until the rite; the game's own refresh decides the rest
    if (!me || !me.l) return;
    if (shownInStore !== state.active) { me.l.style.display = state.active ? '' : 'none'; shownInStore = state.active; }
  }

  // ---- saving ------------------------------------------------------------------
  // A golden cookie "building special" on the ziggurat must not reach the game's save.
  // The game restores buffs while it loads, before any mod has added its building, and
  // an unknown building there stops it mid-load (the page never finishes starting).
  // These buffs last half a minute, so leaving them out of the save costs nothing.
  function keepBuildingBuffsOutOfSave() {
    const originalWriteSave = Game.WriteSave;
    Game.WriteSave = function () {
      const hidden = [];
      for (const k in Game.buffs) {
        const b = Game.buffs[k];
        // arg1 is the power, arg2 the building
        if (b && b.type && me && (b.type.name === 'building buff' || b.type.name === 'building debuff') && +b.arg2 === me.id) {
          hidden.push([b, b.type]);
          b.type = { name: b.type.name, vanilla: 0 };
        }
      }
      try { return originalWriteSave.apply(this, arguments); }
      finally { for (const [b, t] of hidden) b.type = t; }
    };
  }

  function recount() {
    let b = 0; for (const o of Game.ObjectsById) b += o.amount;
    Game.BuildingsOwned = b;
    let u = 0; for (const x of Object.values(Game.UpgradesById)) if (x && x.bought && Game.CountsAsUpgradeOwned(x.pool)) u++;
    Game.UpgradesOwned = u;
    let a = 0; for (const i in Game.AchievementsById) { const x = Game.AchievementsById[i]; if (x.won && Game.CountsAsAchievementOwned(x.pool)) a++; }
    Game.AchievementsOwned = a;
  }

  const mod = {
    init: function () {
      // the wrath stays at its peak while the rite holds
      const originalUpdate = Game.UpdateGrandmapocalypse;
      Game.UpdateGrandmapocalypse = function () {
        if (state.active) { Game.pledgeT = 0; if (Game.Objects['Grandma'].amount > 0) Game.elderWrath = 3; }
        return originalUpdate.apply(this, arguments);
      };
      // ...and the Pledge and Covenant stay off the table
      const originalUnlock = Game.Unlock;
      Game.Unlock = function (what) {
        if (state.active && typeof what === 'string' && BLOCKED.indexOf(what) !== -1) return;
        return originalUnlock.apply(this, arguments);
      };
      const originalLock = Game.Lock;
      Game.Lock = function (what) {
        if (state.active && typeof what === 'string' && BLOCKED.indexOf(what) !== -1) {
          const u = Game.Upgrades[what];
          if (u && !u.unlocked && !u.bought) return;   // already off; skip the store rebuild
        }
        return originalLock.apply(this, arguments);
      };
      keepBuildingBuffsOutOfSave();
      installEbon();
      // Summit offerings: a look at each wrath cookie before the game picks its effect
      const golden = Game.shimmerTypes && Game.shimmerTypes.golden;
      if (golden && typeof golden.popFunc === 'function') {
        const originalPop = golden.popFunc;
        golden.popFunc = function (shimmer) {
          try { offer(shimmer, this); } catch (e) { console.warn(TAG + ' Summit offerings skipped a cookie.', e); }
          return originalPop.apply(this, arguments);
        };
      }
      Game.registerHook('logic', onLogic);
      Game.registerHook('draw', onDraw);
      Game.registerHook('check', vanillaBuildingChecks);
      Game.registerHook('reset', function () {
        state = freshState();
        ebon = {};
        lastFeeding = -1;
        setActive(false, true);
      });
      Game.registerHook('ticker', function () {
        if (!me || me.amount <= 0) return [];
        return TICKER.slice();
      });
    },
    save: function () {
      if (!me) return;
      return JSON.stringify({
        v: 1,
        t: Date.now(),
        b: [me.amount, me.bought, Math.floor(me.totalCookies), me.level, me.muted ? 1 : 0, me.highest],
        u: ourUpgrades.map(u => (u.unlocked ? 1 : 0) + (u.bought ? 2 : 0)),
        a: ourAchievements.map(a => (a.won ? 1 : 0)),
        s: state,
        // Ebon wrinklers the game will restore (it keeps only those that have eaten something)
        e: Game.wrinklers.filter(w => ebon[w.id] && w.phase > 0 && w.type === 0 && w.sucked > 0.5).length,
      });
    },
    load: function (str) {
      if (!me || !str) return;
      let d;
      try { d = JSON.parse(str); } catch (e) { console.warn(TAG + ' Could not read saved data.', e); return; }
      if (d.b) {
        me.amount = d.b[0] | 0; me.bought = d.b[1] | 0; me.totalCookies = +d.b[2] || 0;
        me.level = d.b[3] | 0; me.highest = d.b[5] | 0;
        me.mute(d.b[4] ? 1 : 0);
      }
      (d.u || []).forEach(function (f, i) { if (ourUpgrades[i]) { ourUpgrades[i].unlocked = f & 1 ? 1 : 0; ourUpgrades[i].bought = f & 2 ? 1 : 0; } });
      (d.a || []).forEach(function (f, i) { if (ourAchievements[i]) ourAchievements[i].won = f ? 1 : 0; });
      state = Object.assign(freshState(), d.s || {});
      // research carries on while the game is closed, as the game's own does
      if (state.researchT > 0 && d.t) state.researchT = Math.max(1, state.researchT - Math.ceil((Date.now() - d.t) / 1000 * Game.fps));
      setActive(state.active, true);
      restoreEbon(d.e | 0);
      recount();
      me.pics = [];
      me.refresh();
      checkUnlocks();
      Game.Objects['Grandma'].redraw();
      Game.recalculateGains = 1; Game.upgradesToRebuild = 1; Game.storeToRefresh = 1;
    },
    // for testing from the console
    state: function () { return Object.assign({ warmBonus: warmBonus(), feeding: feeding() }, state); },
    tithe: function () { return tithe(); },
    surge: function () { return surge(); },
    climb: function (n, weight) { return climb(n, weight || 1, 'test'); },
    finishResearch: function () { if (state.researchT > 0) { state.researchT = 1; } },
    offerings: function () { return { chance: offeringsChance(), owned: Game.Has(OFFERINGS.name), standingAside: takenOver() }; },
    ebon: function () {
      const live = Game.wrinklers.filter(w => ebon[w.id] && w.phase > 0);
      return { chance: ebonChance(), count: live.length, feeding: ebonCount(true), slots: live.map(w => w.id), armor: live.map(w => ebon[w.id].armor) };
    },
    spawnEbon: function () { return spawnFromTheSteps(); },
  };

  // Nothing (if installed) prices itself from its position as the 21st building, so let it go first.
  const started = Date.now();
  const waitForGame = setInterval(function () {
    if (!(window.Game && Game.ready && Game.Object && Game.ObjectsById && Game.ObjectsById.length >= 20 && document.getElementById('products'))) return;
    if (window.__NOTHING_ART && !Game.Objects['Nothing'] && Date.now() - started < 15000) return;
    clearInterval(waitForGame);
    try {
      if (!create()) return;
      Game.registerMod(MOD_ID, mod);
      console.log(TAG + ' The steps are ready. Research the Elder Pact to be offered the Elder Apotheosis.');
    } catch (e) {
      console.error(TAG + ' Failed to load:', e);
    }
  }, 250);
})();

// ---- art ------------------------------------------------------------------
// Matriarch ziggurat art: original procedural pixel art (see make_art.py), as data URLs.
window.__ZIGGURAT_ART = {"row": "data:image/png;base64,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", "bg": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAIAAAACACAYAAADDPmHLAAA2iElEQVR4nLV9SYwlyXneF5H5lqp63VVdUz0zPV0zY8okLVPDTWySQ1IQTC8yLAmaNgWODAM++SLAPPjgi333yRcfBNgX381FYlOUoIMtmbYhcXEBomySokgLsDw9w1l6qep+XVVvyQwfIv6IL/6IfFVDwNF4nVnvZcby7/8ff0SYiR05C6AxBm34GMB/6F4XB6B3Dq5y3zmHXn3nADjn4rsAYI1BE66gdvRV3uG2egBr59Aag5ExmFqL7cZiZCwAoIdD7/K+9Kpf8rfUi9BHB8DEb4Dbhwf44mv3YCsw4T4a1U8Zcx9+4/FaBWNdF9R3jr774NUtHB3PAQBNGK9+Rv7mMUs/nLQNwIwDAQgRjI1BY0w5UEPdY8Cp+7VqkAERgRyuloBStEGdTc2GukP98q4QwFbTwJrYxUgEGgixbxcQwBoGbfhl6RISh5BfAJ+Q4Gi8AuuIBD/4jfVJnR8KyB8Zm/UbKAlAxilMYOk5IQLbM1ABdJWKjPoMdZaRU0M+d5i5JQMUfXq6ds6ho/oNAzQQrIsIT8jXHHmZ8vG9HQ8o57AML736/AE+//zBpZAv3wmXC9FoIoSGkZaY6hORbxvdXFE0bEXaCLyEGExrWgckThQpMLI2RzyJaaZqua4D93eEfPkN1AkGkPzWVLhKUzYT0qevzYoB/3C+wJjq0aop4/gLJID8tXSp32ORLBV0VwnAmNhfhgeQpIAQ8CBRKYm46jsAiNzP8NH3vTCMSB9CujzXO4fWGhP1I4yBcQ4rADboV34hcq3S5Rr5AlwWNdqWMMZEVSLifNOAGPmi/7jc2vNE8ZdPltnzEZ0VFVQrt/Z2cHQ8x8rlfe9g0MDhHx4+ha/eve/HMFBHZBZBrohgBeuhOiJzBEn34d1tAMhE/1CJkgZJArCK99UGNWcMzJYdOTaMmiAJWmMwsTbTVVIYsMu+j8gX9SF1DdkQzKXMFVXuV6JyEh7qkXRpawwWgTuEEH40X6T3BoxVbaR+bHcbR8dzrGEKvZ2I2OH24QHuBCIoEGDqZKENUBkz2wMMG75fux4A0BrmYYKRuo/qUlQl4ZSlXe8crCC8Cbph7RzW8Fy97Ht0A3pp7RzO+x7LwP1raVgQiqSfBYBCiQJMeUY6Uxhjqu3PBNHfwWRqyQHYalrMmhZHx3McHc/x/tkk2RRUB9S9FEF+bFv6WTCAwZ2793D78KnsfRPskKHC42U1qolC9/MjgfuHkK8LG7hArtptYJYRe3y/uL+30Tb67skpxkESuEBZnVj7RGkiaoxR1u1FHVbvc9H2w9gAa5gCmELE8veTbg3AS4MfPD6PdWTEoAijD1wm3A8kA06IVvfu9uEBvvb6g0uMMiGE7YEonsUmUGrh5wNRsqs35B1I3cKEPcFFpOSHrm4V75pt224kABGpgCcGQZhGvPZtLyos2jNjBTl3CvJF969hcilCwGuo7VMigu89Oot11QhAAN0F5NfGFAHGtorr3zURsHVecw+FCEQiWWMLpNdczproF8T/PNkQuphnx1sR3p1zWIWPcPmYWhNi+ObDeaQwbc2yqxhGXRhfGgnaSoZ6XnM/f6J6qSDrnOyC//XorGj3owQYBxOBB6ovuksVonZBaphLiueam1cjgo8HQ9RewPmxXiSmFBXcGINPBneWEb/TtJkrb24QAUhlS9btgZpGihC+c/wkEkBD3Mf+/ZAlrjmAn+/V4DT3awKQNkX9aFRo4/C7J6cAvG5NgDFVicYShfvDpQ9S4HeVFKiJVe12am/KAPhUGKuDyQzjWttSROTLVWwlGd9WQLqGmQFgbk62Y18ZSQsiAo4kCSEIQP/88XkUWxrJNSKI0bwKMBgQ3CeRQgs3MIjKdxbIpNAqcKvo0464l8PFACFf+qMQocsQEUSYxOeGYQN4xIkLyhJ1KFYAIEP8y4rjJ7Yp7TINt0MiAOmwU0SwDNZ0K5YkEAF6a2+WuVxAHemspwoCUDEDTfkNfFhWu4TazawRBAOtd30k3KPjOYyxRXi45pZdFK8HPEHdPjzA119/UHB/NNIqLqj8/hmKb9zam+FPHs5zIqj0g+2xl4PakDKyTWYYF8iX+xemJAFcEs8u2ALi6jnnMDIGY2sxMn6+4NF6FTsMeN+7yvnhno0Uboe5QOtz0YcOJgOYFqFMEIx4jTip5dbeDEfHTzIOEsMpQ74CHNely9r1g5MzbPkzTF59/gB35+cReT7GcC8zvr91/KSwexDq+7jieofk6hlTTjrJffz+xemOS3o7xc/7IP7PFAFMrMWYwsQAcEKEEIlAEUAHRNdxKFrIEiAZYCKWUwRMTywNiVQtITSX3Nqb4VvHT6rBKI1wtjUARQQhqrkKEkbsDO4jE73cD0U1dbm1N8M3H84zJH5CIX7lgi0WkM822ZAUsIYIAMgnUN4NARgAx0QEfzFfFNE38SwY+cJ1qf3cmBMCaDZEwKp2BkoiYf0qZWRyzwYEIBnXkH1R8wqWZHD+2clpYe3z2D+lkN+FVhuSGyINpE4u/O7S5RHcdoD7S3sgEEACaE4AQypgYm0GJCksCX74+DxS/Krvo4ui/d8YzRsIjLggVjcZYRAgo04MwvkyucP9FgNTuAzUpyEjU0/iSBGPQ+r7s0dncVwydu2aac8m9c339PbhAX777v2MMKTITKXAS5Cv3fJhO6BiA7COWjoXDUFNAAxEuTqgsAu+e3Iakc+6ljsFILPCxb0U/a/DoKIufvXmfgEULnfn5xHYXdD+2vVySPMLLA0uQwSNIoLzvsPUNln8QRfN9QXyqU6JTt4+PMBX794vcjCA3GWVwA/DV8dnCgJ4XrmB3MCy77EIkkC8gHFQA9rC5joA4HEgBKDuY3OnhHs5iNGE2kbGgqdFf+W5a/FexONlyu3Dg3j/lTCRo+MOlyUEq4hAjLKzbo3txqeQnIVIpC5L56VOh+GsIIEJkNxVmYDSoWSOxYwqon6IAGJb4gbWXLhF32PR91iHBmUSYWLtoB4EvMj3Oj+5XX/ycB45Rusi8Q50FEuSHwyAXw6IZ6SPLQlG0vlACvQ0wXgUbhJgAsCXX7uXpUlJ0YQAeEtcgMaI4xnJ00AAH7gyBZBz+ypI1994XvS6KewKXbhPawo7c6aPofbbGnxNHjqHySVvDAQ5AqJw5KLvsSICEPdibC2ynBRyS8TYE6RKSpW4XazfBfD8joNIgKQDgYT4CWXDaDdL+v8RNYnCz9UI4Uuv1SVJLQy+qRwdz8M4E+JvHx7gK3fvo3POIwpC5JuZKOu3k6SbPvb5d0KdAq+WJMBGvQ9EIgAA81wIBWu3qnN+OngVvAGHZGSIJECokHU8c7N0pCEi+P7j82zCxyHlFEg74h6xFTxVaVAF8sP1w5dImPRqLieELw8QAZCHwS9TxGjtQjtCBD666GKQRhdt5tUIXAJwMneRCAsYiWRG3fIHSrstzgVkBBCQIchfK0qTj46icUxaT0Wyi/RDnqJFUhkiacYK4IJ8NjY1kOQq7bSK+/U7QqyCXOGsr9y9v9HjqKlK4ayR8Ykq3E+ZUJMoYed6bDdttU6pd2hsTAQsvQwSc0Y1W9H9oL+lmGfHW053QMQyp3ol0YzI/dogYR3+6yphAkDh04qruA4exyvBqmeu3zi1rAI/H6SkSW3ta0DqeXMRzbcPD/A7G1K+tL0g7YvNwvMVUpjI7ty9hxkRwCZirnksiUGTcfjl1+5dmNbPRMBjM8+Mt5xuSPvunXOYjHewWp3GCBNP5bKF//nnc53N5fbhAb7x5kkWNJJyOJtm71hjfZJnxd8uAOZk7iIkTdomMwprV00APvCUiODO3fuFp6OvyOpLorlHakNUptgeV9tRJiEiAQ/0V4e7Zbzes0pE8NtBxdSSeTOjT64ytuujaeYGAinjp3MOo/EVnC4e4emrz+Odx3fx1OwGZpNdnJw/wPGTt6Pv/qpC/JV2lOmfh6tl7Cw/VysdTIw6DgE9A6BzeClwf/QM3iUBpNm/RARff/3BoD7VuvXReoXtpk35kUGFWpMWrpx2a+y1o5DCXiK3iuzac0iRWkP9/erd+3HCbpPrx8UcVAiAB9EDeGb3Rcwmu5hNdtH3HTrX4XuvfwsvPPV+nJw9wC89lYvtGCo2eZLG/UAE0mFNBD18TqL4tBMVctYDYICI3z22TfptQA3UVYB2Tb2e/YM3HmaeSxHHCB26t1ziqdE4Ss9TCqCNrcUrN/dDLuEB/utbj1K/KpFL/R2Q2xxsp4mUFjsDAH7v9QfV2dFaJrJ5ajR1mlt4dc90uofd6T5mk13sbu3jlX/0z/G1//hvcXL2APPFCU7OH2Bx/hCAd9HGyhK1oV2D5Pa9s1zEDuy2o+hyLoIxKAQgq5RqyK8RwITiAhqQQwTAtk2WvGp8pvHtwwP84ZsnlQBLGpMxwFuLBZ4eTyL8nnQdzoN3492z1Ivbhwf4b289GkR4jeNrBMATbA7Jbb19eFAQQYF4IYZr7YThk6z5QASzraewu7WPv7r/I3zw5stoTANrG8wXJ5gvTnDv5P/AGhujhLUQZLw3COHmfM7BEQEsSWxONhCANow2EUDt+RoBSFSPufy0W0fO+sZbj4rVPkIIP1mc48ZkEhgHmHcdzroOy2AHWDjM2hHGxuDBaon90bjK3bGPFYTrv3sgS9jRxiwA/P7rD4rgD5ciI1SnZz86u4/j03vYnz0TkX4yfwPXrjyPh49fw2h8FVg/iTNQGlFsxDuXc6M869Tf8Xn1bO1v/d1PW2rZzAbArGmjqrp9eID//tajINFIshmqI8Q/eBGoGMiCKAD4xWeuRikgC3JqY7yw36FdBHXThXFwnwFPCK5iUJvdZpzZADxb1wOZO5dZ6aMduPVZlhMo89Ha+uRVP74dWrcXgMIqAPALPkch+WTIAJSrcw7nffeuJACLzuhCgdVWLglkkuv24QH++O3HuRowwBvn53huOo3jOe16nAYJ8OuHT+HO3XsY2QYT4yOpD1bLaA8MqYHBv8O9zLFwMitb+Z4Qc4kQDVt57h+/8Kz7eshlcwB+Tc2waUNNz2Dp2TFZfCCuVTKUkvMjkqCmAtZhgBx2zt9OhUXoJgLQ79QyaC8iAIuU83D78ADffOdxgEGdAM66Hmddh4Vz0b0U13ZsvcoUIvjGW4/eFQHowBsv/ZYxshTjSCZPigHw6wL4y5p7JkujARRinolBL9QQgojEYFAgXwawdi6beGIC2CgBAhLP+w639mb4n7wGYMALuAwBaFtGvntA7uy3AhHc3Brh6HiOG5MpgEQA532PX37uGu7cvReWmueSTfIn9tpRIaE0x3MCbbZammIwnFsBAB//1Kv4zje/lBGEjrIWC0OEwzlrJz5cud80b16sGTDJEwAPiiiaCUCIgA3BDJmEYAkCXSYO8NNKAPnuviKCNxeLiPxklHoCkND0yiFKRl6adbJe4fbhAf7LmyeX4v5uAPlsdFfVnoKHQNQunU+3XoaPUBeLlZoFKTYCTwJJ6FgWlyydw8L5rKLz3ovEs3B/Hn5fxqnjfDrXURsMDI18KTJLWFv+pMtljc6h7w7GY1wfT3Dn7j28fP1KeI5FtH9OprDXMDEdrFfwutqOcOfuPXz22d2srb93Yw+/dGMvUw3ZXg4K+dEWIxXciiQGsu+zxNexHQWGKTmmNkd9mWVfUh/XpfXSprokhCodZ0NQI4TrX1bWz9dshtrqWWmvttJok2v7dohpiF0g9f/C01ejOu1g0Lm0o4k2mmUt4+3DA/znnxzDIa1vnAaJ1rt8AW4N+UOu3ibbwmzbkXPqIbaOpVTFf+U7oERsNbCBOpFI0bOJQwtH9furYAvUMnPl2lcIgIEp7Wl1kBm9wQMAUmCrZkvJwpO1y5dqi20k96dEBPz+7cMD/P4bD4vorFV1FdnKgoMBOygSwJVm7BghbF3q5MfM8Kvo/loSQtYo1c+EpkW8IwJkItClRgQrmnb+U0UEnJdfqDhls2QzaxUCkM97dsaDqd1j2xTJLhppfB1KIxMiYrxwKpisgrpINmvD2QEwVwMByBc18ciDB3KEM9CGYuZSejh0Lp9r4C1l2OisRelEzA2pAc6cAVJCiNafnJIeAaHHZMo0a03cBsCDlZ8D4MJ2EEfqOucK+Aj8uE5xaf28Qoc+2BDyviCd+yV42VQKaegcbBYUoA8/WPP32UoXtyYlJYgLiOzTGoOxTVu6Ta3/jMnabwg4IMQxF/GAosVPvwniP7q7HYm6Zjxx6BcgoxZp2xtZGpdtlKHay9Qn8sxqLkY96yr96uElh4R5AeBzh09lyI9qUUmjd/0xBmavnTg2DhjYPFXK6cZMvTU9aQPyfUMmU0diLcv2bYIg3mZGLGUxepjqhTMlqFBTA1IkKfXbYfVPNG6J82p2Se25JiPwxHUn6xX2SALILB2PRy8+rUlWzXzynpizvPJHr/mTcpGBXrO5rHQom+emypiK2Z/XJVn2TGVBCkDURCAI1UbcuoQkSdSVyFfAigHnNiBfiArwiZqf3NvJ1v6xSuEUtxbJV7fGxADVGj5DaiEubHBd3zebRBjJZ8ht1f2sEZ1IAE7EWYQXGPl6j0FzWWmgVVnASaHbNHUNDaZeEnEIMfDWJ5FAiFDibyhF3Odf+ULk1AggIQLVN6d+X4faj47n+My1WeGGiSU+ok9MegViH2ShbIxvBCI4Op5jq2lLFaPUhYZMzR2T/Yw4TiCqCvBqQPqeYFkiVJiYP/x98d5+UAHcMdGBQ2nHtegYT49a4XzSr5JG5o2wNCUcJ56YC1xamKLXDOjQbGZkVuqQ/rZw0TModjNBbuAOxdrLDSQcjLEZMUHe0+8il1pa9Me2B9oBvG2gmVUbgENqYCjbyBY5d8oy1YaPrgxUWdlo6drpp43RN7k04CAMUEEy2REsPtnQ83mMFkfHc3x0d7sqPpljJLdhy1pMTVoSLx8grfGLhqLMZvZ9wd0FXDAgBVBDfjJqNyF/SBpsEv9JBVR0Cn/HOqpWoiWOhHT/CVyeDfry6oT3IIp9gSICqC1SRFJkADTBA2lwdDzHh65uZW5rAoZJBBE+I2s9IYRV0UIEsmVNDIEDmZoQjr+oMGPUkZ8kyz947lodyQOIHxL/mQS8Ppq6GjXqlHA2lmrRMa0GxABMlOr/jzFzVyLTEeA4szbbiFKJdiEK/T1b71rky8zhnz8+zwCYepnua8aln7nsAOQxfnlHT8zUOL7WXjW2T/1b9N3m/X6kzooaqLqtwcOSt7IXGLk1Y2tTGlPviPudcKpDDy0lSlUSu6P7gaSWWBLETwV42leW33fChpJ/88o0j/nL+/KevodnhA+GCSeZ12+RCE2Yhw3VWtHIiFFJUnkS4ePy92/sDXP+JjVQYQRjDMzTIgGQc55DWhsgmbqyNbvO+rlMvJyHUdWBNUmAZJSyZdwPcJKO4tVSuHnwj9cr3Nqb4X8/WVYNKo0ohP4cr1e4Gubw185FOPUD/YuMpLjQqHstuVi6iuQCwlZvSn1pKebpJrWQqWaCtc3EhTYuBuwA7eIUxEOSwAPDBQmAIAVcoXI2GUxDOi92G8Nicwj5Fj4R4+h4jvfujCmIRdxiKJoZfn9v8P2lrgbAhOIXOrkUyNPs9Nhq49MpdFK2wooixlFAFMFBYMGGrUiyNP74fLXCSqdqyCo+NSIAoirwnoSoCEK4MpaGVIK2ftOg84mRTdZwbW7j6HiO9+yMM8BFlQAfujIBeEfHc1wbjQsmYRuJ4wxMCIPjAttPdeRz+bs39or3E/eL5MjD8LUgnBBMRkFcMh8eud5lkVgjgkj1RBRZnBw5oWipAnWv+xc5xwxEx9RAh+4luePoeI4Xt0cl0IRrYPCenXHqhyJGlo4FckgagZ4pkI+Lyw5lKWtGiH2lPkcbhvrC71pdEZdCCrDhV9Hftb9jAGToAwx+pNREp/RPczwuQLimfuEKwHP34dYoAMzE36wBXtz26uJgTERA/el5PCroouMmhq41qXaZ8nee3a18a+guSa3UlpYWSKuDe+o8i3HZOl5v38Jz5TUg6wGWXSwtYU1Uepp4aKIqz0Auw9kX3fPiDgC4OZ1m/eudw5th5Y92V9cA1rwJVoX49VgZFmz4QcOTxxPuLVK20G5YaKrdcGOC6iJgRxi6hOvehelgjRgumQSgj9b1rB60oaiBUqgC53Lko0Icqi0tnarAgyJGvtdSwCTE35i22fOHW6MMHlJ0mLiAj5YECq4aflw22Ucztb9A8Q4QDG2kT/WNy6mdTHdUxXYF6VrnRxE5oAZq7xdSgT5DOg30ndwXBEK6Evw3gBe2/CrjZwMRPDf1MYNnJ5MMJs6VSS1Dm2Bqna+ZbUjlFd8pafJZUgPyS0EE8V9BSwAAqxvTjWrxzdxe6Hn9u0JuzQi80CgMbbOKAkpuL1zYSt9R+ZstY5kCBhCJ4Oh4jueCZJAiyRryYeTXxlDrC0tVhrc2fLU0lDIL2cTZ+y5dSyaV+5yI6rJEFT2AGmVnFEpc55yLv0cpohtwDj93iXRuXY7CHrrSBwzcl7/VFV7vHFpr4kZPR8dz3JxOY5o3EM5UoL2TOKWtGgDa0H8DYh5lK+kidUaYB1h/9tldfOPNkyjOnDw5JPOR/2SeHW+5jJuZa12aaRs6IURnDrO41d8BJUBeCoi/zJ65utR27vr+o7OqIViNWpKxZAE8O22zvtzam+GN83VUcevexfWLK7J32AbQBHlRlg7vU8yzsFIH97m4D9FMWV6WDGH/dmlwp4ig4DduEcNf1oI5rOu09VqbTMmuFer+UAXxem8fFv/6DDzZcUuXGlH8eL5QAPTgsQZ4ngw87svhdIq75+e4MZnCwWHZu+wgjdq6vCGbZFOpMRUTLNerJ9/k/vF6FXceyQ3d1E5UD8hx2/KXoCsbX1KMMWkZcxBbWjTp4uDFFXPHh+m0jhFl7tYs4lrfpB45T0cIctl3G88UrBX9vHgCMvXt4HAuyA8bPvAUtEH92LcaAdQMPT3OSEwuP0vRBHjre8Hs31KqQH4asjOiquLJoJoqkI+eiMmygaSTSh3U7j9KyNe7gFeBomIA2UQJ8gmgmti3SEu7a+Xp8aQImEg/3lwscKUdZfslcj+YE3mcJkNCadTxVU8l6zg9j7E24WaQxwVAv9WKNlBbbdBpDtSFPYHiniz0wkBEOp0L8NxbQ7juKKsjGRSLXDhXANwQdzhj4s5cpVhNFjIDTJANAKddl+3FI1PCGhEyVl2EU1my8nilL1HiyDiN3wjSIjGB5EY2xoRO+7pnTYt5t8Znn93FH715krVRg2/moVwfTV3hxpEdIC/UsnE1x2kgaAPoMqds1cLIgnANNI6h807ZQ5zC9gjXB+R5gNG9c33M+uHJJuZIbeSC6hXPqMpkKmags61yXU72C7WvZx2fhO1s/ujNk6wO7pPumzkYTV2N27jT+cxe+k1bp7pwB27F0zqCiCuIox5XkHok2aKWWMlz6LUQ9UXA4GieGJuyVf0alEGMHOhMULWo30VMVVsvoPsWx6nGxCpB0sZkadmM9iKU92vSFYDfJeyijhYBHTLqahm2NYAn3g2/D0QWawTGs2iFEUN94Ozci4yxYlzK1pgYwKFcO6Cnd2uIHhqPDpuzay3jyPpJRMUQ3CQVZEPp//ST442GaISfpIVXOV91oiaWueNDBPBxxf0FIrBZspjK87q/LJoZSRsBoII4omflOJeRbeKytdbmk7niT18W6VrNagJgQ/aiPjMstCoU66sxtjCQC9g755eGoTII1o0F8JUYlqLFuvzVwKFn7h8AlpYoOsYQATEAcKAeUJF3inEgEQGnkklLV9tRcTrKILNcAulMcBxc4343pkYCm/vP8DPwewLJzqGFlNaqcUa7hMXGFGKGgK91CwNKyqfpsCZNIKxKCuQrqmWRXkOg5uJaJs5lJIec2XttNM6TTJJjEd4to2pDor5GGLzghYmvMKovIuIB+012DpXdz3PvJ0lssxV2COEypAL4qjvJ/i5XODaI69uAnJO4QzrBkZ+tWfFSaitweIMLJtKa7RDz5oyJbqpHPsDpVZkEcHWRPiQN9EynTnLVa/2ZU2uwjnBWY9ftNfAnnH8xbClfq9d2CKtpAvA4sYGBelHhdGqxSj8dzrCNIhnAq698oZAaAlguNaplQpE6ZRXPiFK0JS9P1tk5Gov0Ry8SzWIUlf75fmzW0dVS078Vsc0w0tZ+lqJOzzZh7NOweEX2IBS7BfA7jYjxCqh1Fs7BNKZ1RQdR+qE6TFsVJwogcuTrv/jNf41/8+/+1aAUqQ648jv3R+51v2WAen1fTdqwaye7jO2HhE9zoQRwSRKg5PpNakoHlnhDp1qGlYbvpgkmB99BqX8Z9jsG/DEzuo9mZPw2cZsmNPSgasjTzwP1M3/lauhaW7xx2UBOrV0O6MiVVYIYiIJ8OWhCsn01AYRmEWAbbQDe7fRSBqHql/RJUuyGjDUNZx4zlyF7jTehkkOnog2kw7YxuDDQyFDjGYUiLZ4c6mT2HVnxWZ0aIBooSOIxisgg0vWuIwae+6SuBv5wKUb+pv46VxqA+rlNn9pzPAZ25bRtsmn1kl65FAmcYLYTUsju3L2HV27uZ5tcmJFpnZ7ilY7pQWirvYaQREyuelgjE5t8pyeWOJjDHHsZNaARt1DJGzbYCbfoHOG9dpRJlpzrtRvqiBAu4H71N2840bl02FO2ta70Q+GilvFUG2/NeJe/5yQJ7ty9jw7wewV/6bV7OZUF4NZcjCF9qm0FA+/71wDBAxiyyC86+0YDggHCwOiBOJsnO3aNjIFMRdUmirJ6qWLh+iEEA5sJYGjBbbHvwsaxM0nymF3Zv0q85Inajs5s29atnJpgIODVJi2yziInBoc06zdEAAxkJohiYWcVABVE1SztgDHRuwuXUrkk0tcav+yb1+FB163rVADeBHD9O0siA2RH8BWp3QP3YbgF/AalkpJAfqubdMZxC6SDnn739QcRATG6ZkzcA1/raS0JLDyhiGj9XOXkMF349E4uF9kEtb913xz97sLft2iSxwDxhBJp06hrrU8XIV+/I8Bn44s30i4kKVgaeI6vbboV23CAM6Fuh5Co441UP+edcOmny23cgMqM7cjpUyYA4A/eeFhszFSLtPH1V+h419qZQLVy+/AgntyZSQDk++BtUgWXFdfvDZs6dvBnEwkHToLvPCRNcmC7nBAu+d2Q+NenrOTJLYCNyDfRHeXx8jhlWb7c6wSfuCM72SFmakdOAL6qHKv6bkoN4aIGapM9THhffO1eNrW56Qi0QjUoY00KG22yo+fUNvFA7D7YA3KqVzNABJGrBxCd/V37TuwPpKX2snV8S2csZUylkC8SQFLXG2OiIdk5B2MAPoYnuw99kNPgeXNus21Hjrdok4GfbEijGiqzpkUHf35PY2x15QwUMvlEiy+FAxB5k+hailchDTaoAoe0rm9/NEbnHM5Cfh+fTjK2Nh2KPVCPvl4K+UhhX30Cq3D/kETNiQAR2SMreDJY9j1aa7DuExH4TTkkUJU24zoPp8GLNGqMgeUdwKI7Zgx22xF2mhYT24T0LYM1DBbOb7/mYGCNxcQ22Gla7LYjNMbg58LJ2TVARgLIdLNBB4M7d+/h1ecPcmDyyxXRnKzidM8re1/YHkXkXx9PIhDHJi3jdvDhb9n+TbfP/dDIL56rIF+khnhS5jIf4XagQP7YWgq3A9PGwsJgZA2cC88bhn2IgSAdMdM7l2I919qJm7D4i4ihPW+V3pCwJUuOUQDmg9WyOECxdrKFjjdIOIp3xIwWsn6H7nlBZJIC/n9Z7PnMZJJm7gJCeMNHGZNw5TjO/eclWdyXUwUIY+bQL++0wgkmHPCRbXY5Ba2PyE/SQWDX9X4P5h4O655sAMX9ZxQTiQkuss+NUJue0In6VnGgSIroy9q0ozfPagHI3pO/2dq1xsR8gc+LFHBpx68A9SpSfF/YQvbG0s0tH/26MZnmBBLGESOFoR9CrBIvqEoC5wY5f+g7ndTKYx4ybhlmXqwHsW8kSJaYL26CZfzCFWYIKXFORHF/awzasRHrsvQzYw4cAZ87mow1E6kWoAkdFzJ0w/t6sBxLkBbu3L2H3iHlABIw+J4Rj4h8//eNsKbv5nQaODHwigGsA/qgW0fGoDMm41ITJB4CcJnwNqmC+DeSNNBTtVrUF/4cwViuzgGtNRE/AkP5IxK383hY9a6oJ06QhT5JiDyoQvY3EzClf2uTkMkVRyqyIZJl0qRPskwTADUAtOvjqdSrAgGkAFDnysG5DHjM4YL8DAgGkQgchNgdRtZ60Rx0/5r7HIiAlUFGAIrr5ftNLqFO9rhMMcYbeGOb3orqLIh4Qc2qT14Bl0IFmXQgV2sJeMxFAr4GrjDohPu98WijFdpaUgEiAQhA8m5M4iQV0ypg9QBsoFpGthBSTSEYpCDUodrkIQE00Y9xnhvWJm1j24UfDQD0fSRurmuTscfIH9rNLI5GEXKtOCeBKgc5KjoGeRzi3w6lBHBAjH5KTGcM2bY/qP7kaojbIUjy19YmfRUHQHbC2BpYmHBmsH8qGjcacWJrgPz98B0fC/Mbzx/kIWiFyISIHKiyuPNQLedmCSF/S2F3UyKCkkgi3kGM4pENoLN8tA3Au3Bk0i/AUj+fIT2DWTo8Q/oWXT1HPr/zEiClz/vnOfws8B6bdDB3K1wvksC5PNgQLXcFUNH9rS3FWmuBpi/fYTeTt3MTALbGoIf1dgBAqsFbrY65k4AkwNHr/LTOzkuSI2LIypjXjuRqaLdILwOqXM99KqQP/Z7xvXNxnWVRV8DHqncY2YSbbPzOT3ix+HfwC1o56CPBJzmLUYz+iBjn0jxAa00EfJxzR6LgmMVigMYaNNZgd2SzTusBC+Fwnr2uswnvWCSfVeu0nOs8B9wI3C+GXw2QZS0JMTwlK4THq6LFiIpt89/6o37Txu9gIeR5GkxSRIhASwDnXIZ8/7xvl4/kS/slh4Cf8SrfJs5PSB9ZD4iRNdFt4I4n8c9BCb+B8geuzrDdNiGpMhXm/DgFapK7KM+KK2kN7cOLJAbLMKu/CvdHwCjkM8JrEiGqI5NUnk405W3gNZezfcDr/Apup+cHP06MvDy8G4kAHul94PKc8z0BLbo+O+pGYg8J+R7vrYh9MeTG1ia7xAEjCyz6ZARFD8B4359Dlh6QAGya5RJAcAAkOxBajEW6AinxMeb2kXTIgC0DAMIuXi66T1WgO3k3r0valPG5ANSeDDXnXCbZdF9qCI7DVL+ZUK8T8a+vcHDOhFm+ZJuIV2DpKsiXmP/auRjyzSz/YPj5/vhxtCL2173DpLG52A7ukxZdwXhIIUsy4GzoPNfTAxghD17437w4q4lGqTPbCl7aCYDQ3NfDwUh/K55jQgzpbjKwJOYRcx4IqNI2p5Vx0YmzQhBD4p/VQ00K9PwjXPLQQvtiBzDni8G56MP+xRXuT30KcBYKGtsEuLyzjv4nhEtlRASQ35B+lwiYJeRHAwSmCkwAeOXmfiQqEcFr4jKtb31bgagA5JZyIsRa5oz009HYeMaxptc1x+t+yb0e2ZDNwFfeECuOBaT/QR+XbKW1czjr0kYWzP0y78GgNgBasXylWBjwtu5L5Vca+kSRWhERvEsY635BvoGPyBmpmBAB+IigNTapARHJJAXiaEgEGpeCSTxYjfQM8NQFnZjBHCrWOleaLdRAHfmxLkXojuqLnB/6IFLHqwqQZHOFEbPq05xNPKiS+tDDu4PGOTQu2VlAuJdkSUkoEIDJVON5iJTJYPQAvMWaBi4ULItNxM/vnYMzgIGN4qxACvxeQau+y8QwS4ERI54REPoTEacAxcjZlMefIS7YGL2qgxrNoqDSDyl6DkXXkUmg0JYLBrAhvBi4TCWzd1I7pk7aZA/K9D0sLGyQ9s4EG8AE67K1wLpzMaIktkHnEkfDJH+1c4DpHWABySVZ9z0656lSjKhR4N41gMZTQEIsiTAWfQIcng0TKSBzFMKVQgTvnU3w4/kiAZZEuCArI4IBQoiIE0CG+9i3ioGhJYn0PQIf9cIw7SPCXfSQ2ObogwfQE/LjOYvIdzARzhemiTDoPaK2Gq+AWwm5GpNmk1bKuuRIlAyuc97VQGN9xwJQVr3Dk1UXd9MS7pUZNtP3MbZQO0KWl3AJIRRSACnOEIkA3hWUgxyMQrj0O7uKzgUKKSBIY2kQ360Rgapfi/+hZyH9NMnSt0ESdPRs3/dFgg2vfJKIpmQbsQSWTKTYHBFB6yNMBib8rpHOyGHAdQ4YW4NF12NsDYKniCerDqddj7Owt44JjcdOG7/3TdMlQuKMIc1FUox6X+a0pcg+Oe+fTfAX80UpqrlO1ZYmBGnP8VWpgkEiEEJHLv5rhi73UbgeILFN/eSsbJEWgvgxUiq9EAHnYohdw7EUqbd90nWYOhu9AKFX4R0R5R/b3S4G8JPzNaxBCEb47+YB+efBEm1JZUhceuXSLlsMOAZMJrrDAIWQTBiYAamCUI6O5xduphyJrALgTAIEpDP3a5WiJ6pqttKQ+NfvaKNlaI4BCF4VUgJtTMwJySxxPoPgvYaXBkvn4PreR3zPgr+4djZQT965nwmHJGzaf+/u2QpnneeN066LIUihxgQJE/XV0jnAlYEVKQ1yAhCdGvUkkrEjhLTdtDjt1vjZK1P84PH5IMALCYAS+UAuBYBEEFDfx7pJesiV3chNxmDt+5ptwgtoROyPJKuZDODGGozgDcjWOazDJperoEKXwkw+LTxP72qNqSJ+4VJAoaMM4lt7M/zg8TlOuzUA4ynOpNw7TnuSDNloI0hHFEBHJh39yoXTqjiDWIw12Sjp1t4M3yciYMOSgVsjBimbYgC1xbS1hTNQ9dVK1U6hfkk71qRNJOLJ7SZFY2PSiCnb6h3iTqeSGr5yYV1AH0R1Y0wU9YL4iW1imhTn0gty5wRw2QkEQJZqnSchGMy7HuddF2PV2gYw8BtLLF0JOAFQo4DBFrecrjW1TR24HsIbbY4MQRtUBRMBT/3qfgOlHcDqpEagjHhRd2Ll6xVFJhBALbEnjV/WBngiWPY92pEx8dTLT9CCydbYODOY5eYRIJbOoTUWa9fH9xzSzBp/ZOawc4g5/2KNyhwAA3cjQqgPcA6SwC7Dtcaidz1eurqFPz05zd7T9TDwa+3oIpIGGmEK+VqaAMiyqrL6UCKeI5FxwSySpN5kV/h6yxVEcAatAZomTcK1k9DIJwn5HbyojjtVqg7Kb8kaTTpZqJRX90o/ehqqUHRmVQNxXhxwBXAYaDJJI0Yh/yZ3R8dz3Nqb4X8cPykANERcFz3DBiJzrYzHD6XU90N1asNRc71GfpEeR+3XitF/hNQ42fyqnViLl2aTuJjTuwppZornwLlBFtuCfF7dy1Z+sl7zRE8ZoAMiVyXLomJkqQH3igu15W2NV2Uf35vhmw/nVVdsUxmSDNwmkMYc276gnYIIlEoBSqRKZrY8r/d1EIckgBlG1WDoRp4dW4v2fQH5ouuB5Ps7abgygI46LdEqXmIeZ8eEkBTHZFRv0lSwJSKIgFTEJxJGA1SL9KXztsTR8RyfujbDHz9UyaKXKBdJitj/d1Gn1BvrVirFIeRD0vjZ7WXbgXcOTymvYufUDcJQJV7cHvnl4ddG48G98GWQAGLgIS4fr7gnYpyltCNaIxAGyhIky1mnepvRNlar0wQUlwIfDdWrganduWg0wuFWkAQ1wzDiogKsod9qY7+o1JhgqP+8iEbgro/uLRbLmDDLanI7wlA7Mqv49nIRJtaQ0rT4GDYRazoKWLPamQO4MU7u5AybbMKEru1oBgNgd7oPA2B/dgMvPvWzuDZ7JjuoWXLbeFes2l6+Uvc62ASfupbODrgI+UZ/jMk+P03hRTacgFKsdEKFSYDoOkf4Ioezc37q2F/LCKv8/cJ22Fr+5mTbMVL1WThcCYCC67TBwj56bcUL1PucPSuEtn/1Bcwmu5hNdtH3HTrX4QdvfBuH++/DydkDuOVxlh2kY+RcrwbSyHiX9U+UJKghXyNOF47KXVYCDJVNq4t0G+JF1ZbK5es88riAr9MjXxbLWi0y9Rp1RnDsLHLOh7oXpHDyJAdSdKo3I2I02YU1DaxpMGrGePWf/Etsj2d43zMfRReIIQU/KMik+zOAjKXzNsGnSRJchPz/H4WN4GjpmxTY4vWCQC4J5MRyNtC1lJUZXFk84v/Oke8AmBvh5FDmmmwpkdLNQOm2aJdF654aUsrkTt/OZLqP3a19/N/7P8JLN19GYxpY22C+OMF8cYL1k9fBiSBCUHHSSrmoNY5yACYkCTRiCmQNENNPKwGqjENeUE19yj27hcUSegVzbZz+TNgjQXZEc86lo2O1y6cJgDuBgUZqK3/1vju66MGK+rk2ewa7033MFydYnb2NyfYN4PwtzM0UV9x59j5PKcu8eKZekItTkV5jIoKh/tWQL+JUE4Ce4KrWh5Ipam9oxmNcaCLItn1DDnP5vDd4e3vhWJkoxeXMIACFFIjbxtL3HBjSRovmfO4EKgNlw1Lakilkn9TgsNO0GFuLE4xwDSuKbnk0OEebLyIRUIZ85NzP/RAi+ObDcrJLEJT9rWAFoDA6h4hAG5UMk9obNeSzd7aJCGJ7xuBvBORfbUdF/fmZQRwHQHmiReYZEKEw5evTrqQhQxwoHCS/6VQmiXWvXVgTD2DfrKJRwyB1BnEChqdugZzANPL5OfEOvkURQwm2XLbw2GpFIwYVZFXfCcQlcYAYNg+EHlPLQ5/Z+HYAPhCQDyQ8Zm0cyKlh4Uc+DlUIQDidF4hou0GkA6//y6JjlQEKcUlak1C0bNz0pFt7S9Uk37YmRdZ98l7SeT+lF1MDtiC5DXGCb1XCxhnAqF2Ok2Tr/alefq+mNo16RkScjrwCOUPWNu1iaSD1nvcdtik/wqg6LWfvRheQGmPXo7aok/1uAYpw9KDPChQ62yAtG5PlSwlwtJoF2gPIF6/WXCke+KuvfGHQlz86nuPlgS1uuY5aGWo3jaH+AZD6wgxTUQ+CXEZ23OaGYL5yDi9d3YqnssZ8y4pHZq61E5dZ0UgpSWzc6MibFD0noOfK2UPgxRPaqJHBTYyJPu7xeoWD8RiyUVJtfb2Dz1qSSOay7yNRfe7X/hm+9LXfyoC4ySiVyWPZ4laXjMiUWqlxdvW7DZJiSH1lfyO3DQo1HXHm/x7bZnC8AGCztGIQNyoqGwrscJiSD20CcveMpYoWX5wvEF2pcP2Fp6/GuW4NtOT+5MAR5Hzpa7+VEMTukvpI6cJfn9zbKX5jxNTCzbXva2VI9Ou2LiJYgXcWeIOH8SeCFHMwxRnHWlLZaEE7V0V+FntGElcaiDqIIUSB0PDHXv58EaxgySIhXl1k78GoAkxari12gxg8WrqwXbIJ8fxdBx8ylt3Oa1xZQ5QW/TVCKJD8LozMocIwtMbgM2Eb3KVD5ll1ogLounaUEQSqiAmgVjLKv0BE1cSlICYi31Bqk3wf7h+slnh2MslUEO9Isu4dbh0Mnw1cK3fu3s/6rO9FfHaEsiGPQsbTbF1Fd/YoE/NFRBWKGDeoI263CJr5jhRSiE89kWyqTAUj9+J6hKVhQH5uDe/UfWEJHCmAYIPFCBGYfLfQzFsIyC44Jrg4APDy9Sv4zj05crZE+mW2pOXCu6DeCadoMCf3MCgPtq0jv9m5hu7JQ0x3rmN+9gjb+y9isr2P8/k7WJ28vtmdpDFuKgLbi8rR8RyyjYw1ySC38DiQJWdAUgdmZFrHyYa59Y1qB2sUOST6tDSQ3IGaF1G7PlwtAZRb12qkj20Tt0Hl8RR6npJZpV4tETyRerfw28Et3GT47Vx/Hybb+5hs76Pv13B9h7d+9IfYfe6DOJu/A8zfrs72Abm1Xys1yVP7Ww7lNsZmRjm7wFpd9gDMxI4cG3uXEU9aBGkjSANTvudz8ljN1CQCz/nfD0TA5a9tb2Hdez32eN3hNCQ5GuOnjKUODooU/QnEIMQl0kCes8gPvaghv50dYLpzHZPtfWztXMdv/uo/xb//vf+AsyfvYHH6AOdP3gHmdB7DgBcwRAQa4XoMDgn5NpzJzNK25plFAxDwewXXkB8pdFOnVEdqRDBonJmU5ybUOSQF0q6Z4g566bns/b6/p12HRSAsyZbVmcJsm/DV3+eE8NVACJchgNGVZ7A1u45HP/kenn7f34axDaxtsTh9gMXpAzx558eZXVWD70WuIFCRuqE/H1HI5/dqcyHcf2tMSQBZWBeXIABV+dBqFm0cDkoAKGlAf0d3zyGueDkP/n/vfNhY4gicOqWTWHTuQOp7IgR/6qYngGryixLlo92bmM6uY3H6AGcP/grbB38dT+79Jdqda3Cnx5lnVJ0pBQ2wBvMBtbt2PRpTWixDRCCwj7jetiMX56IrnRtc06aQWpMCmvLkI4aJljw5slMnedJEBsHbunbOpfPzmgYTK0anCpsS4hkg2o4BXDzvQE49q3IPIU8zhZleQXf2KP5eZEtrW4DgWxBDTaoC+HA48GoTAQAoxp3BWc4LkHyzLFgyoJ9YL9VcvUEOo+cAbCS6mr/OBMShT5k72LYWO20TB929SwKQMXlE+29WDgXyL5PpxJKHVZyMGVQPw/gin4DrX/UdGtL7+jkZT21ORPr0/wCp7eNMwm+FEQAAAABJRU5ErkJggg==", "store": "data:image/png;base64,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", "icons": "data:image/png;base64,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", "grandma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEVklEQVR4nO2aQWgbRxSG/w1urCxma4wgxSRi1ZZQigjGBxdyCEsOrfFpD8WEEhufegihh1wqRI7F+ORDCD3oUEzTk8lhT0LuwVmMMUUE44MIpaiVcEtoQQizmK3rGk8PmtnsrqRoVc3MKng/MG92NLt+782bN2+0AhISEhISEhISEhISEkYIYhlMjlP5Tpz6SMVndJrKq1S+G6deUiCWcYXK61TeoPIDKtPxaccJXVOJrqkk3O+beZ3KWSrnqPyYyrfXCbqmkuKtHLk/fS3gBN+aZzM/x8brmkqIZRi0nznh7VsOfuPZX8gJbM3PsvHkaIOQo42wE9hyGDoxXhr2AVHRNZUUcu939GfOU6DGjSum3SSWcUMx7X1dU0n9ke6Nqz/SkV2uPCeWMaeY9q/EMq4qpv3vsHpJcYDf+IPGUeCznKYic55CdrlyQo36hYV/NxTTrlAn/cVyxjAowz7gTbDw7mV8mKrj4vDSCRqOqxDLMLLLlecsCrLfNFj/rGLa+8Qy0oppN4fVUZgD2Kwzozebrb73LKanALx2BACoE5cBAO7xKerfz31CI+C6Ytq/E8uAYtpD6SktBwBA9eULVF++wJMnxY62n8eff+S1f9q38V2xAMALf50aPz6s8YBkB9iFu0g1K5i/eYZUs+K17cLdSPfTmW8Qy7iimPY/PHQa4/GQqOT3TpHfWwMArN26jPze6UD3+2b+b146SY0AAKinT1D/YQ35vVOvHRW65rnMPEOqA8r5O8g2U8jey3e0o8BjzYeRugQOdnYDxrL2wc6uTDUCSI2AB1bNM3a+sAGgbfwDqxYY99Wzn6XpJM0BbI9nTlib/zBgPPv8y08zslQCIGgJhIsgBjNyZ7fV0cco/niInKYCDrxiSCRCc8CMPtm3/A1TOm6hvLriXb96VsQkV62CSN8GoxBOiiKTpNRdIAoLE1N0ibSNzpdraDiusDOLlAioOm7fvqrjYkaf9K53dlv4tvSHaNX4O8CfAAdd/6vV3wLX7GjMUb0OhEWAfzajsjDxekfoFjUiGJkkmNNUaUb7GRkHxMWFd4CQbXDmaxP21jZWmPzsDuytbRh9pH8cACwurYtQL4CQCIhibD9pb21j8+lDdHuDxBNuW4x/+6s6Lu7dnPa2warjIqepKB23sPn0IRaX1pE5T7Vrfh9snP9a9FYoPAeEjRo1pCdBe2tb9r98I1wcoGsqKa+u4PYXt1E6biGnqT2rQJbgRgVuEeA/sfWqAhuOqywurQsvbweByzbYcFwlX64RlGvo9gKUcX/6WjujT0yROKq+bnCLgFGa1UGIrRLsVvuH+9ibY5G1gBAHDHoMjhMhDvg/R+G4uPCHocQBcSsQN9yOw71ehow63COAdwIUvRVe+CVw4R3A9QsRXs/qhYhyW/jvBNWzdp413ptGqXkYMELXVLKQzsD+8xUAwB07k36mEPo7QWY8I2xglDGiEfpy1B074zImQSD/AUIFOO7EuYMsAAAAAElFTkSuQmCC"};
