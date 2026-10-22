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
      desc: 'Matriarch ziggurats gain <b>+5%</b> CpS for each wrinkler feeding on the big cookie.', q: 'Visible from three universes over. The neighbours have started complaining about the smell.' },
    { name: 'The last step', price: 1.6e19, icon: 5,
      desc: 'Each grandma who climbs has a <b>5%</b> chance to come back down as a wrinkler.', q: 'She went up. Something came down. It is wearing her glasses.' },
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
  const ourUpgrades = [];       // saved by position: rite, research, tiers, Willing grandmas, synergies, cookies
  const ourAchievements = [];   // saved by position: tiers, then the special five
  let state = freshState();
  let urls = null;
  let tick = 0;
  let lastFeeding = -1;
  let shownInStore = null;

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
      SYNERGIES.map(s => s.name), COOKIES.map(c => c.name));
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
  function feeding() { let n = 0; for (const w of Game.wrinklers) if (w.phase === 2) n++; return n; }

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
      for (let i = 0; i < n; i++) if (Math.random() < WRINKLER_CHANCE && Game.SpawnWrinkler()) wrinklers++;
      if (wrinklers) { state.wrinklers += wrinklers; Game.Win('She came back down'); }
    }
    if (state.climbed >= 666) Game.Win('The steps are warm');
    if (warmBonus() >= WARM_CAP) Game.Win('The Basalt Ziggurat');
    const emptied = g.amount === 0 && me.amount > 0;
    if (emptied) Game.Win('Empty nest');
    Game.recalculateGains = 1; Game.storeToRefresh = 1;
    if (why === 'tithe' && TITHE_NOTES) {
      Game.Notify('The tithe', plural(n, 'grandma climbs', 'grandmas climb') + ' the ziggurats.' +
        (wrinklers ? ' ' + plural(wrinklers, 'thing', 'things') + ' came back down.' : '') +
        (emptied ? ' <b>That was the last of them.</b>' : ''), icon(1, 3), 4, 1);
    } else if (why === 'surge') {
      Game.Notify('Chaos is a ramp', 'Grandmas rush the ramp: <b>' + Beautify(n) + '</b> climb at once, and count double.' +
        (wrinklers ? ' ' + plural(wrinklers, 'thing', 'things') + ' came back down.' : ''), icon(6, 1));
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
      Game.registerHook('logic', onLogic);
      Game.registerHook('draw', onDraw);
      Game.registerHook('check', vanillaBuildingChecks);
      Game.registerHook('reset', function () {
        state = freshState();
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
window.__ZIGGURAT_ART = {"row": "data:image/png;base64,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", "bg": "data:image/png;base64,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", "store": "data:image/png;base64,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", "icons": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAtAAAADACAYAAAAtHlQuAACSGklEQVR4nO2df1xUVf7/XwPDACPyW0T8EZomkRmZmaGZa/tVP65bbqslblt+2rK0tvpYGWm2W5aZlWtuWetWS+6uWFn5K1M3jUzJNTMyJX+lKIqAgDjCAMPM3O8fd86dc889d34wAzPUefrgMXPvPffcM8cL85r3vM/rDQgEAoFAIFAh5fZbHuoxBIIYf2gR4w8tHTH+iPa+gEAgEAgEAoFAIBAIBAKB4CeMlNtPCvUYAkGMP7SI8YeWjhi/iEALBAKBQCAQBInKrAwJo+2hHkabIeOvzMrolCK6o8YtBLRAIOAize3TKf94EsT4Qwd5A+vUb8CdXUB0YgEHAJ15/rvfagSKjJ32d7j7rUZgfC/5sRPS/VYjsCi93ee/XQV0Z715CGL8oaUzj1+a20eSduR26vFjfK9O+38gxh9aut9qhLQjV+rUb8DjeyH9UIUh1GNpC2T8nfX+Ifd/Z7x/lDlflK7e7iSw4+3s429P2k1Ad/Y3ADL+To2Y/5BiGFVs6Kzzb1h4ykA/CgS+8lN5Aya/v511/D8VOtvrMSw8ZRB/N8OH9rx/RAqHFzrbLy8hlOOW9l4VNPuYzjj/yofHHbmSYeGpTieiQx09ny5NCuj+UX346oQfIjv7+AGAHn9H8/TcLYH//XH9/nbaD/GucYfi788Xq18O2u9vKIToh+s2BDx+5e+n63V0lt9hZZzM729Hjl+yrQ7K7y/92F7jbxcB3dnfAMT4A7i2LJ5nBiKi2fF3Vgyjig2dOY2DjL8j7x+XeJ4ZqIgGAAycAcOo4k4bCeqMY1f97g6cIT924N8gl3ie2VYRLc3tIymiLQTjDxR2/jv6Q4BLPM9sq4jWG39Hzb9LPM9sq4hm7x/DqGJDp3sP4/z+dhQu8TyzLSJaI/6Z8bfHPdS+EWjyAjoZmj+gnZUQjN8w9LtZAN5wPQaGa/yd5c0LUL8BSFUFyi90Z3kN3NSZDvwDWmBYOwvAG65HvyHjJ+Kzo9+AA0Xv/ukshPqr62cXjpsF4A3XY5vozB969eio+//GqY/NAvCG67HT8dtbfj0LwBuuR7+gv3nUvPd2gr9Bqsi/6++nYVSxgXwI6IjxG0xTZf0gP7YdMv/t/CGgXf7YKX+ABs4ADq+QL9RJoimqsRM60WsQ4w8tYvyhRYw/dKiEJ2f8QHi/BjH+0NKZx687dkKYvwYx/rYR9Ai05g2ARBF/gp/qBQIarvihtsP9d0CMP7R09vEr6Iy/0yDGH1o6+/gFPxuC+kkiO6OPtHvPF7rHhw+7EaUV4bs69QbTEGlHyU7d46NyRuJL276wHX9k/1xp14FdusdHDBoBx7Hw+/RIuCET0o7vi3SPj7pyNL4sa59vTYLBNVlmae/3pbrHh16ZjW8OWcN2/H2y0qXde4p0jw8fNhqnDlWG7fjjMuKkO6ffqXt8ZcFKNFQ0hO34c80x0q7GJt3jI7rEotjaHLbjz+hvknbtXaF7fMTQGag4Zgvf8SeMlrZv+Vz3+Jhxv0DFhaKwHX92nFHa9PRtuscnPPs+ShvsYTv+WZOHS69/8JXu8QemXI/la3aH7fgz+2dJq/+1Wvf41DumouzYobAdvyl7grR/3ye6xwcP+RVspZvCdvxzp2VKz//7hO7xeb/ri4WryoI6fuHCIRAIBAKBQCAQ+IEQ0AKBQCAQCAQCgR+0m4DuOuMmdK37O7rOuKm9LtG+PDYIsD8nP3ZCrrv1Ulx3ZB6uu/XSUA+lbdx+N3Biq/zYGbllDPDDCvmxE9Jj6gT0KFuJHlMnhHoobeL1ks14fWoiXi/ZHOqhtI1fXQp8P09+7IRkTnsWmaeOIHPas6EeSpsY+OylGGieh4HPds75v6RoNy4Zn4lLinaHeihto5Pf/9c9eyuuM7+P6569NdRDaRMDb70UA4/Mw8DOqh866P5p3wh0vn4+UKdAjD+0iPGHFjH+0CLGH1rE+EOLGH9oEeP3SsCF5rMz/PMG5LUP5cLCG0xD/Bo/r30oFxZG9vdvZT6vfSgXFt6QCf/mn9M+lAsLr8ky+zV+XvtQLizsk5Xu1/h57UO5sDAuI86v8fPah3JhYa45xq/x89qHcmFhRn+TX+PntQ/lwsKMhNH+jZ/TPpQLC7PjjP69/3Lah3Jh4azJw/0aP699KBcWZvbP8mv8vPahXFhoyp7g1/h57UO5sHDutEy/xs9rH8jCwoAENO268cHa9Zgy6WaP7fUcOoYPu1EKhYj25rrBotd2VM5IKRQimrhubH2vEGNvz/PannXoMBoAuwSMGDRCCoWIviET0o4DuwCp1af2eg4do64cLYVCRHtz3WBRt40A4AQADL0yWwqFiKZdN9Z+sNFre9ahY+0HGzFpykQMHzZaCoWI9ua6waLXdmXBSikUItqb6waLXtsRXWKlUIhob64bLHptRwydIYVCRGckjJZmPzoDE8d6/9sJAHoOHWPG/UIKhYj25rrBotd2wrPvS6EQ0d5cN1h02065XgqFiCauG0ajEXa73Wv71f9aja1bPwUAjB37P8r+qXdMlUIhor25brDotR085FdSKES0N9cNFv22faW2iug2p3CwlnXexLMeby59ta1DCAiNeI40yD8+UvjJ+wCA9+74V7CH5hO0ZR0Rz1vfK/SrD7sEjHn2vaCPzRduyIQ08+n5PotnPbY8Pz5II/KPa7LM0qPzFrXxbLd4/vviScEakl+wlnWTpkzEpCkT/epj0pSJWPjXPwd3YD4SlxEnzXpAXawqrkuc1/OOHjyq2l5bsDaYw/IZWjwXFvr3e0vz0ktvBGtIfpHR3yQ9kR/4+oQ5f54bhNH4D7Gs81U863Hf7HlBGpF/+Cue9Zi77KMgjMZ/iHgO5N4HgB3vvRKkEfkHbVnni3gm0MIZAJYtXxbUcfmKv+JZjyHL1gVhNP7jr3jW4/CW3wR0fpsi0HqR5379rkBuvEnVtthiw3Gdfu6/bxZyLh/YliEEBDfy7JDQLSeVO/5znD7yfnVbSMXzn+Y/CACq6POye+/B3kfVoqLYYoNebDGU4pkXee6WMsHn+QdCK555keduXbK541+2ej3ypt4Mt3AOL/FMIsmDU4dwx7/f9TzCEAmn5FCOPblodgeMVguJPDc0Nqj2v/PMa8r4b3HtK7bYcFuOu82AKwbg6MGjGHDFAKwtWIvk5GRY6iwdM3AXbOQ5L0/+/e0W3UX3/i8sLFTaEUIpnnnR5GvTZnHH/7VOP3P+PBenDvsegQ8Wen7PI0fx53/n00CkEXAwOuk3d05CWuoV7TlULnrieehTa7nj3zta28f6kjLs3rEPZVaH9mA7Q0ee6Xva0/3PI9TieevWT1WCeOKoXO74Nz6tPp+cEy7iOdIAOCRgZLzO/a/TTziJ58LCQjw0/R6/7p9XnrwWE0cHVuK7zSkcR779BgBw1SU9lecAMHtQBvZUu9+Qii11quM0OZcPRMkPh9s6hMDYcAGFJR8jL0f9CYQ3fmy40NGj88rTN+Th6QoA5BFAKvjjH17B78Pc7qP0wKFZgDEJsJ9H4ZZ65P2qLwCd+T/8cKhGqUv10b+qtj/65BAA/vhvuuak0v6jTw7h1l9lddxAddjxzRZER8WipbUJyf2isOObLQD44yfHCOS8rl3icbGxY8UnoaSoRLWdmJgIgD9+ti19fl1dXTuN0DOHD5dz9/PGf/hwOYYMGamcs3HjOkyceAv3/I7iP7tf4+7njV+vLQD0GRiL8qONQR+fN1at38rdzxu/XttQiGfC1vc+4+7njf+5NzZiWHIM9tQ1Y1hyDAAgxnU80xyJEpvvEdRgUV9ewt3PG399eQnWrJPddCbfEpqgCcuZqnJccdUgnKlS/x7zxl9zvgotNpuq3Zc79AvOdQQv6PyX88av1zaktKqDf3mTI/DQdB390MoPFAYqnoEAc6Bf+Osb6L7/G1QNvkbZt+SAVq298FdtpOTJP84E4BLR3x4MZBht5vNdxdj5+Vy0mtxfXS85UIHFmzdjznj3L+qM1x/XnPuLEbmIgBG76vZ0yFh5mB6YgXu+/QBvXT1F2cebf+NvbkJEhtrOJf7NFbC2+wg983C+Oyd795cVAKK48//wU6Wwl3SBMcf9Rvvqc9kdOVQuj859X3ledlqeTd78s+127dqPVxbehj3fncewq5Laf6A6zHlgAVIzEgAAiQnyOHjz/+riv6vOq6m4gAVLHwuZeCaUlJTAZHJHHIzgz39pqfbbguzs0N8/8+blK8/Ly8sA8OefbkeYOPEWlJTsbfcxeuJvLx3T7OPNP92ursqG5O4m3Pd4/3Ydmy+sfm+pZh9v/nntpt7+CACguiY0710A8Nbx88rzWpsTQDR3/vfXN2F/fZPyvNbmxC/SunTUMHV5fsHzAIAffizH5Zf2BsCff9IOAJ7fLwfj5s2XU2eiomM7argaXnxBm8LHm/9nn1FbOSYmJuK+mffjww8/brex+ULhXQ+otuPBn3+2HQDkvft6ew/PK1NufgKDL1O/f/Lmf8Fj2v+n+S/nY2PR6YBFdJtzoI2maEUET6k+rDyfPSgDI9PilB9AFsvkp7yySmkbalY88BIA4KbkIuX54s2b0SuzHxZv3qyMf8UDLyk/P1rLsOKBl5TI9YjkYaEZPADb6/LXqCvPfqo8582//eNtsL2+Qmlje30Fajr+mzsNRAS/+ly28pw3/+RYbmV31Xao+cuL/wsAeGXhbfhw5XQA/Pl/ZeFtyk9mLzNeWSh//RpK8QwAC5Y+BgB4eM69uOu+yQD48//wnHuVn8SEJOW8rl3iQzNwF6NHjwYgi+Hc3FwA/PnPzs5WtSGPANDU1PEpBIAcRX7+efkP+/PPL8LKlXI+JW/+n39+kfJTXl6G66+/HgCQkzMUOTlDQzJ+AIoIvu/x/spz3vxffW2y0oaI5xhTYqiGrUBE8NTbH1Ge8+afHKfbE0IZhR6cGIuh0V1wT78kPJGVAoA///f0S1J+am1OPJGVokSiQwkRwf8qeFN5zpv/efPnKT/0eQDQ2hKa318AeOLJfOWRPOfNPzlO2tw38/7QDJiBiOC8d1/H8IkjAfDnP+/d15Ufsn3iAzl3PTXWxOm5Y/hg/YsAZDE8/2X9+ZeP/0lpQx4nju6FjUWnAxqDXxFoPcu6/guWKs95nwAI79x7D3pT0Wpf+g6mOwfPgq7VNBHOy91vqLM/qgewDwBgrG5gm+NSc6bPfQPBtbjTWNCtl2/iqR+5v0byNP9+9e0imO4cvljW8ea/cEs9Xt94CQCg+KkqVfuiUofHvoPpzsFa0Dkdjegan6xq423+SaTaW9+EYLpz+GJZ5+n+37XtG9RfOI9d277BiJuuUUWg9foOpjsHa0FXX18PQI7okOee5p+0IY8AEBsbi1a06trhBdOdg7ag00vB8Pb3p3fvTO65enZ4wXTn8MWyjjf/w0a7f0fqquSvsptt9T71HUx3Dl8s67zNPwAcOPg5Bl3xC5/6DqY7B2tBNyw5BiVnbIh3mGCJlOfV29+fFJM6ZkZyoPXs8ILpzuGLZZ3e/BsijJCcdvzwo/u9Lio6Fp9uL/bYdzDdOXyxrNOb/2iTSZPG4UvfwXTn4FnQOcvlRdWDb8tD6X33+HT/A0DfKXko+8enqGmy6fYNBNfizhfLOr35L1y9HXlTR2j2TxzdCytX1uj27c2dw2cBzbpuHPn2GzmFA3KKRnyC/FUwN4fGlcLRHXK0+oW/vqGKQtP9frB2PW679TeQnA58sHY9Xln4SlAs7jQLBzdcUFIzPt9VjLf+s0o5VH30v0gbcB1GpsWh2FKnSeGY8frjSsQa4Njbkaz8SANGXTkiKBZ3tOsGAAyvAEyuhTCmB2Yo+3nzTx93VvwI0wMzlGg0oLW3A9yLE4NlcXdDJiSVDd2Pf1ZSOB5+inzFHgVAO/+7v6xwpXhAaU+i0KOzI/HCv/+juV7hB9uQN+WmoFncEdcNeTGgnANNUjPoFA3e/D869310jU/GRUud0p5EoQHW3k5NsCzu2IWDO77ZoqRmvPu3Nai/4P46mJ1/NoVj7zf7MOIm9wdh2gqPOHkE2+KOtawrKSpRUjOKi+U3USP488+mcFRVVaF79+5ITk5GXV2drr0dEDyLO3bh4LFjZ5CfPweANkWDnX/2+Lx5+Xj++UUoKdmLnJyhuvZ2QPAs7tiFg//Z/RpeeKwUyd1NqhQN3vzTx0l7OoVj9zcr4ZCaVdeLNMTAITUHzeKOXTi4av1WJTVj9XtLkZScoBxj558cP18nr4U5U1GGQVTgmV2QuHGrHNiYODYvaBZ37MLBre99hhcP1WJc165YcpIEFaK480+negBy6sc9/eRvvzLNkViYr62Wt76kDDfnZAbN4o61rKsvL1FSM+gUDUA7//Txyy/tjecXPI958+ehtaUJvxxxNUbd7mExf5As7mjXDUDOgZ7z6KNISe2mSuXgzf+LLyxCbc05pKR2AyCnfpBodNmJ46D7JZAFisGyuGMXDr5gl1MzInoPUFI0yPeJ7Pz/549PoMbiFtOFdz2AvHdfV8SzJzePYFncaRYOtr6npGbQKRq8+V/w2CLsP3Iex/Z+CXNcEhY8tkiJQgOe7O0AbxZ3PgloVjx/sHY9rrqkJ4YMvhLjKCG8Yd1m3U8AT/5xJt659x70X7AUQ77YiS1f7HTJJTVTJt0MySl/Kq4tC9ymBND3e6ZFMAB0my/nCacNuA4AsJP6BKZqGxsBNDk1/RV+8j7yfnWbLJ4BvJf3z4DHDmjFMwBgfSFsr6/AclCr4bP+rTv/ttdXIDUSXlM3iHAee3te0Fw6NOIZAOznNakYq3LlT8O8+fc3bSNvyk1Bc+nQc92gRTAAbN70hu78/zn/l3hmzNv4cPsfVPv3fHce9wIoVJw6AOLWESyXDlY8Ex6ec69q+8FtTwLgzz/blgdtgzdpysSguXTo+T3Tecw1NTWoKzvNnX+bzYbRo0erIs+A9wWEwbK40/N7JikchJEb5Ovx5p9tC8Br+kawXDr0LOuefDkbMaZEJZo898tS3fvfU84zK57JvmBZ3Om5bky9/RFVNHn5d+sB8Oe/Z0Ymxv2/X2j64EGs8YJlcZcdZ5Tuv1mbKkjSNnJgQkxiCmZ/eVJ3/olg9pWbczKDZnGn5/dMp2IAQMG7mwBo5/+HH8vxr4I3dfunHWro508/dEfgg4daPNPOG4tfUbuA3Dfldt35Z9sqffftx90/duz/BM2lQ8+yjs1j/iS5AIB2/mssDdycZ3vJDhhzRuled/Ddj7Z1yCr0LOtoEQwAy968W3f+SbqHP/hicec1B5oVz4Db83ncjSM17Xk5KOWVVTCaopU2424cqZx7/yN8h4Vg+UPfYBoi7fheG2HVo2TpZIxeew9Klk5Wxq+BEs+3/8v9S5r3K7egCpbFHVc8A8DNfP9S3vwDANYXcsXz9qdvV20TS7xgi+fCD7b51N6n+acYN28zd397i2cCcd8g6M6/i8+nqef17//mrcZuX/HsqWiK3vxHR/EX67yQv4S7v73FM+B23khMTERqaioA/vybTCYcO3ZMdQ5h0vRJ3L7bWzw7HNoP4ID/9//jj6vXkxBf3WCK5117V+DmycMByJFhGjYVw9v9z7L4zwuV5+vX7Fau0d7imUDEs7mLnMvJm/+LDRWalA1AXkD4tyXq6CmJPgdTPG96+jbcnJOpObanzv3Bo7m+FoB/819mdWDhQ/zoc3uLZ0BOy2DhzT9ZYMhj1O2Pqqzw8vLyUFhYiB3vvYJfjrg6wNFrI8+sjzOLt/ln3TcemvUQt59gi+eNTI0IksPM4unvD3uOMWcU9j0kp5Ox/Q9Zts6juPYVPcu6wtV8Tefv35+B4/gLOX31h/YYgeaJZwAwRERq9o3/7Z3IjTch/eV3sNO1grPYYsPmD1cCAOy2Ftz997dU59DimfaTDqp4LtmpRIS5uKLJ3eZfqngI7qxuwFCzEYuP1eHcgh81pxD7O1o8K9FndIB4JqwvVIR0alYX7vzXHOJbRKVGAhsZ8Uxoj8hz3pSbPLbtlnuUP//FA7SNjXI0hRXPJG3j86XBiTzwxLMcKZ6kbBNLuity3uDO/8ESt8D5ExN9vnfOWuW5O/os+0MHw6FDL/I8acpEjTXdg+Oe5M5/3pzJGHHTNWhpbcKubfIKeJK+cd2lYwCoUzeA9hPPcV3iVN7P9fX1qKmpUaLPvPm/bGiOqk86Ct0R4vnBt97hejizjBycxZ3/nfsP6Z7DimdAFhBEPMfGBrZQjOf3zIsWA8Dcm0u5879wvf43R4v/vBDr1+xWxPnNk4dj/Zrd2HlgfUDjVsbvRTwTDhz8HDs+Xcad/1mP6TslfLxyrWbfxLF5QRXPm1/4A5xNFxER2xXOpouq4/RCwLnfN/Dn/0p9EbEqf4pmH/GHDgbeKg1KTrc/2oD+I7jzf/SY/P63Zt1mlYXdmnWbcc+DWncaAOgZ0bZ1QCx6kWce9025nTv/d/xxFm4YdaPS7oZRN+LLHV/ghlE3Iqu/9r1t69ZPcejYUc3+tkBHnidSlYojDXIOM80nyV248/+rOrd+YM8h4pntP1j+0EQ8s38/8/LygFZ17Ldb3N3c+T/X8I5u/4GKZwD6uaFEPBsiIpV85CmTbtYt2d2v3xXYWbwdvTL74XTZcay/czIWH6vD8eP+2fyw4rlg1UdtWkioStsgOcl6RBrQ7coUrMnNVOXPLD5Wh3Pf13o+l4EVz68feLNNCwm9iWeSakHKcU+M78Kd/40W/zxWWfHc8v6yNi0k5KZteKBbygT+/NduAgxRgNSqCGRPsJHn51c3t2khoTvneRIAJ5Ni4Ybs79Ylmzv/5xp9L/UNqIur7PnuPL7dfw7fHLIaqkofXd49+5VZ+meqYct0e6syODh1CHf+99f492Y69fdT0feKDGX784/2tWkhob9lut9/uYA7/7c9Nl33HFJQhYYVzxZY2rSQkIhnb8KZ0C26C//+b2nkfkWtJ8qJeC4p2Yvrrx+JwidmodjabKjvjuWJVfD5/mHFMy10eVybNos7//vOvaMrumlI/2zkedfGmjYtJGTF88athR6rDo4cxZ//nTs8//1kC6yw4vnowWJUXCgyPD13y/JnF47zef5p8azH+pIyAHK6xdCn1nLnf+9zk7xeixbnbOS5pN6O0ga7YcU1actnfFPt8/h54pl3z5JvTB6afo/u/e8PbHGV99asadNCQjby7ElAb936KZY9t4D//rujWNOeLv3NlvZmI8/FxcUoO3bI8OG6Dct/e8uvfZ5/OvI88fY8jQRit0fG69z/Lv1A+vHG4LsfVUWe7QUrYCvdZJBePLvc8EQPn8fva6VBck91i+brH737R+/vJy2eI03x+MdbOzwuJPQYgaYLoJCCKXThlC1f7FSlcaxcsh9w1S074Mqfoftg23sj4CIrVAEUVdEUnRxmbv7M2nr3c53z9AjUI1qvAAoA4IY8LKty5zSngj//HvsAVFFsILjFVQqX3YW8cYlyoRTqUQ/u/B9+WIk44+wJ4HBwolO+IBdAedX1XFs8hd3Pm//qo3/FR58cwuSbr4HT0ahbSIW3f9hVSfh2/zlUlT66HMDMqtJH4YuIXv35q8vnzHxBiTLThVI8wZt/X86jocVzoPCKpbB5zDS8+ecVUfF0jWBCFz/xBd78Hzt2BtdeO0rpZ8iQkXjlldcwceItOHbsjG4qSE7OUDQ1ycK1vjuWA5hZ3x3wRUSv2Dx0+Z8f3K8UQIkxJSK2Vz3+s9uz7zRv/jd/9bK3ywEAYntB03+gVQpXrd9K5TinMNtuN40DB2WhzZt/vSIqnkhI7IIL9e437qfnblkOYObTc7fAFxG94pq05UsP12FzgWefYBJ/3npYTk/izb9ewRUAqsIq3sYDYOaKa9Lgi4j+YvXLy99bs0ZVLIVEkNkCKv8z8nLlOW/+33ptUciKp9BFUnhFU+hjAH/+9c5hz/XU7sN1G5YDmPnhug3wRURLL55dHv3uH+QCKL/Nw/c+FkLh1vAg5/rQT1cDuGkb0otnlwOYKb14Fr6IaMm2evm86fm6BVAIhat3yc4arna8+dfrI29yhNf+HTbvdQ68LiLkFUEhxCckYB9z/OiZ/RjQc7CygpM9f9/+77l9lVdWYfnzf1btI0VWArG4ox00Pt/l/jT4o7VMY0nHW8HJK6KiB7sokRCIxR3toMFiAcC6MLLznzF3NmouqO1o7vn2A6wd/b/u/a5IDe3MQdNWi7u8cYmKwwZx0aDdNNTwV5C7HTrg5Xz1QkNTl1TYGmsAtN3i7qNPDmHXrv2emqDstBWZvdwfO9j5Jw4ddD/0c/p8vQqFE259g3xXP/OaLLPyvb2eO8fUXzw8q09W+kxAWwTFE7z59+d8vYWGgVjc8Yqg2Fx2UD169EBtrZz7Sf6QsfNPn2+z2VSFV1j0iqsEYnE3b14+ysvL0Lt3prIvPr4rLBZtZJE3/8Spg+Wrr9TRvfLyMsVLGoDi0AEAEy7GKPdPrhnK/aPnzjFj/N5ZGf1NMwFtsRRSCEUPdv7Z8xMTUlB/oZZ7LrvQkFQpDMTi7sCB73DgwHcqF40DB75THSfw5p84ddDn60H8oWnxDABvvf6CMv8ZCaOV+ddz55jxTfWs7DjjTAAaBw195CX57Px7O58UWAH0FxouPVynjJ+MC9C3uLtx6mOzZk0ePhPgF0HpEhePxgatOOFW4dz/jXKeN9hFiYS2Wtx9ueMLFO/ST0Eh1Na4i0Wz888rtqIHceZgefRRJVdrZmb/LGX+9dw5DE/0mGXKnjATcBdBuWfXKrw1YprutePBn/9/jxmLtCuuVlw4nOVHEdGbk1YJ/eIq0e/+QRk/GRegb3FnME2dNXda5kyAXwRl/5HzSgGVBXu/VB1j5584cNAFV9htArsokeDJ4o4roEn6xpFvv8GTf5ypsZ0jvHPvPXjAldf8RZF8ow3oORiAewUnfZ5ePy/89Q2NeCbwcrAJw4fdyLW4U9I3NlzAigdewk0vTcG2xz8AADzwl8vx+v/9AEBtR/fx/I+4n8DI8cKSj/H5rmKseOAlTQlw1taOMCJ5GJZtWibnR998u+o7k8JP3gfmLeNa3JH0jeEVsqhlbecAAOsLYdryuXt/1r8BaOe/YuESJcqs9JP7AZYc+kDxjzb+5ibYP5YX+dkP7oLxCrdfIp1GQtJFlNenY3GnpG8cfhivPpetsp2jofevyj3KnX/6vIefKsWri0YAdvWbwv/84QA+fXuQah8Rz5o0Elc6CABdizuS+1x99K+YfPM1+L8n/qFx3ABkO7oPV05HRGQXbN4kR9rY+SfnETGu1w/Zz+Y+t8XijqRv7PhmCx6ecy9eXfx3PDznXqUEN4HsB2QHDt7806KYbk/D20/KfPNysL1Z3JH0jZKiEmRnZ6O0tJQrbun9R/aWANDOP32eXj8lJSXIycnR7AfQJos7snDw8OFyPP/8IsV2jmXevHylKMoXG9Zy5//6669XfJ899UOLZxqygJGXBqJncUfSN/6z+zXc93h/je0cgd4/90v5PmXnnz7vby8dw+0zkgDI93fJ9GPIKdDvHwDYHGwaPYs7kr6xav1WTL39Eax+bynG/b//VY6TyPPq95Zi0KCrMOiKX2D5y19w558umrL6vaWqbRK5PnDgO9V+QF5gmJZ6BWY/OgMTx+YpKSRkkeEtE/Jw4018izuycHDre5/hnn5JKDljgy3WqYkW03Z0c7+X55udf1oU0+31+qEpszpw/83DuAsYAeha3JH0jfryEsybP0+xnWN5fsHzGDj4Gky+ZTwK3t3EnX/6vDum349/FbypyYdm+/9s17fKAkJeDrbyu6BjcUfSN1Z/8C888WS+ynaOQMS1UhxliryeiJ3/J57MV3Ke6X623fd73PQ32aWL13/ZiePI7NuPa3FHUkD0LO5I+sYLdlnUEhG98sf1+HSnO9JN7OgA2YGDN/+5M/9XyX0uvOsB/G67+huZrgZgxZ0PqMQz7c7RFos7JX2j9T3MfzkfCx5bhP5Db9D4ONN2dMvelF2C2PmnRTHpZ/7L+v2weLO407hwsAsHt3yhtX+j9x2b/4jyvGDtbCSWPIuCtbN9WgHJ6z+2C7/EKLtwUW+hIc+y7lJzJgpLPkZhifyV2HuF11IXdE/B7EEZSgUedvy0YKaf66Gkb0QaVNZ2hIhCvqm6Jvd5PX+1LM+FQ3f+OW2V4ivrC1VlvmnxDMi51gRaPOstNPQ395nG0/w/MPGkaxDaiMplPfTNZDTuH1IrYIjSdelgFw46HY26xU/oNoDn+59ElyMi5fubde8g6C0cLFytTl3Rc+nQWzgIQBHPZDEgi6f59xe6yEqEQf2768nijpf7nJLisus6Xoqamhrda7bl7w8Aj1FpPfQWGuq5bgBAZKT6Po2P74qJE29RBDJv/smxjRv9W5iTkzNUVeqbXYSj59LBWzjIsqeIb//XlvmPz6/0qR3gdukAoOvS4cvCQdpRg37u7/0/6IpfcN05AG2FQpJ/PXFsHiaOzcM9D/GjpazfM+GXCd6rfnqb/8SUVK990GSatWYBhGmLPuDu97RwcM069aJv64bPVEJYb/6JW8fll/bGmnWbMeU3EzV9rVm3WbPvs13fcseRl5eHr9Yu5x6jc5/pxX+EaNffCt4xvfknbelINQC0/kkdTKQdOvTs7QDAbrfrunQQ8RzJie0S8dyVOUa2efPPLhxkuciJzbJpHLyx6C005OU+m+OSuEVQWHz5+6PuJ1p1TM/ZgwfJlVa9NL1iKYTyyir0Tu+ubHff/w2qBl+D+IQEbFi3WVnFSSi22HDj6OsRn5AAywX+11/0sSf/OBPbKUE9c/ZsxROa59LBLjDkFUu56aUpqlSNKNtGtJrkBVVxyV3RUCd/lfpx5UeqJPQ548ej2GLDb9K1Nj8ENg1kxQMv4b33Nijbt//rDu4CRrLQkF1gyCuWYvzNTSqBq0f8tn9z599y0+8AyAVUIjIuRWpCHCYV/QNvXT1F2Uewvb4C5rfcwjh/oFOxtaMh4pldYHhDJqSZT88HILtuFC67S5VyEZeQioYLfAG0ansUd/6njZGjxfaSLhiVHofi9Cru+YAcrd6y5rCSvlF32ePcRYdEPLMLDFnxTIql0GkWXeOT8X3paVXaBgBs3lTLnf/xE1I012fTPgivLLwN6z52C37apcNNBP6+WP49+Ns/j6jSODwVSyEkJiSh/sJ5XP3taXx7dS9l++i249z5v/bWa1RFVjzx8Jx78el/3DnTLz75KpyS1juRiGd2gSGvWEpVVZWSpjEtBhiVHof7y7QVsoxWG3f+7WZ5X0pKitIPDb0/OzsbZWVlyjFvLh3sAkNWPB8+XK4qgqKXugHIEWje/N/4a/4YeDz//CKsX++2KOS5dADuhYZr/zxblcbBK5ZCp2B4Sr84+SV//i+5wfcPJ/c93h//2ez+e0Fb3NEQ8cwuMCTimUR76WIp3qgr/4I7/8m9tUJJj0GDrsIPP/ygiGfW4o5AFhqSBYZkP69Yii8pHLU2Jy60RnPnv1+XVp/Hf0+/JBRVuT/4LnzoVq77B1loSBYYkv2eiqXwsG74DKPS47D32uEoeHcTd/6n3zXB5/HPmz8P+4vlv5+f7foWzy7ju2GRhYbsAsPM/lnSmtVrlAV+Z6rKVSkYiYmJ+PHYUaUgCs3xfd/y53/I1aoiKoShZQexN1P9IeuJJ/Px4YfuvHdvFndkgSHZzy4cJMVSUuPjMOnTFZoUjtT4OCU1I35DAXf+Lb+ezh0DgU7pyHv3dXywXBbGqbEmbL3Xvegy0gCsWy2Pi4hnssCQtNEWS1mLBY89o5tyoZqTN49w5/+h+y/zeB7N/JfzcXi7O+Kv59LxypPXuioYlrhzoPUs69iUC700jA3rNnNzaADggTvl/zijKRp2W4tuP7RX9P2PPKyIZwAq8Vzyw2HkXD5Qda5esRSSukF44C8bNekWhSUf4+MPP1IloZMcGoCf2zzj9cc1fdMoFnc64pmFFs/EYQOAklpB4KZzAEDWv7nzn5oQJ6dxuKgAgNx/YOXZTzH1Y/2FC6w/NMFT5Hnm0/Nl4fzBNtkxY1yiZtHgw0/VcNM5VuUe1Z3/V5/LxgMTT+L2t1JwO1Jc/fDTQgA5fYNY3NHOHYUfbEPyEX6euq/FUkjaBsvmTW/o3v9sH8+MeRuWXvJ+vUWFbvFMopbyYjEinll8LZZC0i125P0JD5+tR/S8h9DS2oQHtz3Jnf/6C+d9TtsA3KkbL+Qv0RXPJw5WaBYbxmXESddfK6cz0HZ13bt3R/fu8of2EgCrdNIwjuwt0Z1/0p70A7jTOWpqajT9NTU1IW9mHo4edNtJEbcOfyPPzz+/CMtGD8ZDRfK86qVhjNywVvf+10vb4O0neBPPLLzIc4wpUZNa8beXarnpFnO/LNWdf2/pHzy8iWfN+BNGS7MfldeL3DIhT3HGYFMr6DQMVRGVl7/Qnf+7754Da6NN1Z5N5yDUnotAdc1BrsUdoO8PzYs876lr1qRWvHX8PAYnxmJUv56K9zMgp3DozT/bR0xiCl7bd0w357lrciqevEOOIhLxTCoTTlv0ATcyTYtnkiJhiDBqUjfodIt5Gz7D+I2fYpzTjoJ3N+nOP0nz0OuHBy2eidNHXl6exqWDQCLPRDwTckdcr4o289ItADmFQ2/+F7/yipLGAchR7GefeVY35xnw3x+atawjUV+SWtGIF5EHddoGzSfJBbrzn/fu6+hqkKPNJz4oRN8pebr9EGjxDMgyiBbPLHzXjRZNaoVeOseyN+/WnX+5j2gALap+ePsJA8d9zE17Yy3uIgB98UxDi1s9lhyowM7qBuWHhYhnQI5mA+oUDnJcr7jK/ffJCzh9Fc88Wk0TlVQOAp2ScfSMfAPxxu8rtD80jS/iGQA36ktITdB+NZHq+nvGm/+aCw1IjXS3IdzZg7rBmTSRtojnHd8XKUI1b8pNqshv4ZZ61aMn9Ob/9Y2XaBsb+W8AtD903m3uP7z+imd/8Xb/00wskz9YseJ5z3fnNZHnwtXyNvGHZumTlS7lP/6Ysu2pUAphVOEziH7taVVONOD7/V9Tob+gyltxFZ54vnP6nYpI/XaP+qtXT2kbNN7mn9cPKcBCQ4vnAVcMaLN4pimZmutt+AB8m382FYSFiGciHAi+iGc6TYItkuINf+5/lhhTovLcm3hm3TlI5JmkSTjUGkgpkkIgucu89At2/pOSE2BttCntyblsXzTrV60F4C6qQrhv9jwkJGpTFPXSNvQcMoYlxyjimS6mwpt/Om2DtKWFN48rBvVRbUfEdlUqExLxXGZ1fzhmI89EdEhOuyatgub5PZ+rvKAB7/c/rz9236jb1RXw8vLyvIrnNavXcI/xUjVo6LQLT/c/3U+LjZ++SaDFs9HoXqbmi3gm+OG8q0Jv/kmqhl5KB50W8mx3fsqjf+IZYFMsCHrpHJ7//sjakk7TkJ+rxfPGotNK5JlNeyPieeLoXsp+gyfxTFvQeWP8b+/k+ghu/nClX/Z13508w/WZ5uU8F6z6CCk1qdATz4ULCpB3/W99sp7rNv9SzJi8VNlOLHlWVUiFXTioy68TuLtZ8RydGIMlO5eiuE8M9Pye/bGgS83i+ziyhVTYct6pkUDNx+5+duu4kPHEc8v7y5BrL9Yu1IMr8jvYd8u5brlH+fPPK6RCX4e1xhuovU/0Is/Pr26GNcasu1Cv5vg7Hq3nCB99cgjz533OnX+6kArhmTFva4qqENIG/NE9bsp7mpfz/Ld/HsE5xHMX6gH+WdA9OO5J7vy/tuUFVTuyEJFdkEgYdc04bv905Jk8fv7RPtRZGjQL9UgE2leLOVJIhTf/bCEVb+SMVrcnY+GJZwssGFxvh554Pny4HJGREfjLDYPwUNF+REZG6NrOjRycxZ1/T4VUNm5cp+RIEwYO5FdtY8VzbGwMCp+YhbIMp+5Cvf/sfg17iuowbHQyACjP6fLdhLk3l3LnnxRSofvxRNPpoUpBFeI7rVdcZdfGGuBcLvRynlet3wpzF5MigD2x/OXfcOefV0iFtcIbNmycco1pN4/l9s+LPB89WIxEx07wxDOgb0HHs5+b+30Df/6vjENMYopX0UzajL39l9zjvMqEJfV2jB4/lLtQD/DPgm5A/xHc+T96bJdm0SDBEGHEBx9vVB1L7J2jPPcWeX5vzRpsKqnnLtTbuvVTxWLOF+6bcjt3/v/2gfy+SUegPdGzO//3lyeei4uLUWHqpyzUI6kbdAqHr3yS3IU7/3QhFW+c+KAQb0/L44p3nni2F6zAYzml+gv1vNjM0XSLu5vvI+6hkAqXKH7wkFdcZeXKEhgsp0/49FmFLaTywdr1uO3W30ByOtCv3xXc/BO2iApbhEWvKAt7Tm2Ze4Jju3RBU6Nr0daqj3DwM/03GAJdJZC33S0nFbnxJuy12jHUbMReqx02uxPnSnyLfHm7rl7k+fUDb+Ili28fUui0DpaJ8V24869XRMVTX7y2iw67I16pXaJR0yh/amt5fxns37qjRb4UOuHRLWUCf/5rN/FPoJw0fLnmk7/7fwCA0dnqMPzzq5sxc8EyboEUX6CLqPDm/1xjqaYAS+Hq9dj5+NN4vXw/Clev9enaRDzHmJPQbHVHoP/2zyPYsMf3QidsQRWyPTh1CHf+/S2ioneN//64XdWGpHl8/tE+DBx4paaYib+8/3IBd/49FVEB+IVUeMf1Is8WWHDxjH6hC8IDPZLw+ll+LmthYSEemn4P//73s4gEr2/egsHY2Bg0NTVj7Z9nY/XZAnz8QZHHIikskYYYVXGUa9Nmcef/62r+Qi1vsEVb9NI2dm2swfZ/tXgtkuKNkaO6cOc//6m3AuqXoJe2cfRgMYrnaSMWJF3CV4Y+tZY7//4WUdGDiOcyq0OVvlFSb8fBi77nWNPQX493i+bPvy/3vy9VPnniOSo6Fv/69z9x52Nvqgqb+ApdWGXiqFz++y+niIq/fQPA7McfURYVdu3aFRcvyv9fxcXF2HzgB9W5vhQ8IcuyyOPIeP787/SjCJun6479+6eoadJ+iLUXrEDLQX2XDk/QH47I/UNTbLF5vH946Rl66FUmXLmyBMa/Ln1ViQ4bTdH45D/buNFitpBKZdkJLFuyRGnLyz9hI9h0ERYAqCw7oVuUhT5nOyWgiXhW2KD/VTIhD+NU7cg2HVWmxz8S8qcXX/r257o82CgzGyFWuCEPT1dAU/gEkIuo8OZfN4JN+vKFG/JgPuz+JEjEs8Jhd7pN3mCgcNlKj8VS9ODO/2FtKo8m4ny2XlNchW1DhDPtDU34f8NquAVSIiK7KO4aesduugZ4c+kDmvED8vzXHH8HN13TiOqjf1Wdc9P2P6D66Ku6xVn0aLae19jc+RNl7jEwXtWeLrDCm3+67a5t3yglvGnYSHRyvyi8sHih0ja5XxTwo/oc2qGj8VxjUIqZ8Obfl35Jm5qaGlU6B9n+bI1+IQoAqkIpJMLMRoYfKtqvW1BlyBDt308y//Q5vGizN/QKuXz11U5cf7183c1fvYzYXsCX+44pUWVehNkbvPlnI9g0vP3kuryiKnrIhU5SVAVP6KgzHS3mQVIwePNvaU7B3Bee9Hg+2xdJ8/D1nOfe2KiJJsfAXRxFDzYKzZv/re99prTzJQrtDV7uM1sYhQdJsSCRYkOEEf8z8nLVubz55xViYWmsPYn68hIYIoyqdBC99oTWFvlvlrdCJzR0FJkUViGuHLz5P1NV7jHyrHeMLdqS2befYmtHxDNBE2V2FTwhucoAlPxlArvNjp/M/wtMP4B2m70uD554Vmh9T0mrcKdmRKNw9XZOqoY7XzlvshzUK/znQ5rxA678Z24EW+5DLqSylnruW7Q70hSvKrBiHHfjSJ+LnRBo5wzSllvFxkMRFvZa3fd/gxc4133yjzO5iwZpfCl2EpfcFQDw3envFeeMH61lSnEV3vj9KaJCrkFcPQi/GJGLCC/1akwPzEBqQhxqLjRwi6No4HxlyRu/pyIsvkIvWKSjzzRssZMD+226bht8ovgexE+V4shZp8amji2mQrbptmTfq89lo6jUgdHZkYp4poW009GoctroGp+Mixa+TRcPYnHHG///PfEPn/pgrxm/+yIsw+X7lV2AyLO586fYCQvJZeZ6cC/+u+LSAQB7v/E9Ir33m32oqbiABUsf89qWVyzFH4zgj5/0Oy0GWOW9mjSqq6sBuAuuVFdXIzs7Gw0NnvN5aacNAl3ohC2kwoPrgUv1233XJsyj+oyP74rYT99D1QitS0H3XZuU/byFhnSVQsBdLMVbkRR/x0/6PXFETpCsv1Crusa3X3v+PUtMSEHfy+R3+lOHm9BnYCy3Hc9p42JDBbrGydFduliKP+Mn/fpyPoG0JY/sQkO2SuGw5BjFaSMxJRX1tb7/3XQXQeH//Xzr+HnU2pyudr4WZFGjt9CQzoH25LRB46kgCm/8d0y/H5df6k5pIOf/8GM5dz/veryFhp/t+hb/M8a9JoE4bdCVTvWqnhbv+orrqsEbP+mXdw7Z3rBuvaYvui1ZaOjJ1o74PLPs3ujburB4nfEX3vUAnOVHNf2QbbY4C+3IQRw+PC00JBxzFUN55dABWBvc9ylbJKXy/TKk35bJ7YM3fl4RFV4fnlw+2EWMbHVCw94NayRA7YpBosFbvtiJffu/57puvL5yleKu4Sn/mW1PO3EYTdFY8MpSPPnHmXjn3nswKj0O/RcsBRnP/EcfAQBs/Q/j5Qu3hZ304lkJgFIshc1Vpouo0NDFT7rNv5SfP7PgR257hdgIzHj5Ua/FVWhrO2U+iIXdcUkCKHcNJsKs57pB7/cl/9lb/2zk2/TADMS/uQI1Dqis7QjEwk7ae5UEaF0xHph4Eq9vvERT5IREh+n23XKP8uefyn/2pRiLgjEJ/3PXl8p1t6xRl4Q3dUnFn94+jS/LYKgqfVQC1MVMaPT2//bOAvzu9uG49VdZuCLnDa/5z39e9BkGXykvPqA9of904zJNPvQzY97GqPQ4/GKVnI+17uNtyuJBIqCJhd3qz1+VALUrRnRULLZv3okRN12DHXl/wqjCZzTjf3Xx3zH0miEYcdM1eHDck9zx0/nPrOsG6deXIi20tR2BWNjl5spVLukiJ3Q02NciKp7yn3OOl2JUehyWmft47IdQU1OjiGcAKms7ArGwO3TolARoXTE2blyHW275DfLz53h10Rg5OIs7fjr/ednowRiVHoec1cW6+0iUmuy/5oPdcDicKms7ArGwW7F5qATwXTFiTIl49fm93ouoeMl/BoAXHivFky+7t0kE2pciLbS1HQDEd0nGp+8dQcUxm+HpuVskwO2KwUZ/6WIpNLSLxvKXf8MdP53/TNrXvHM7Uu+W/x4eOPg5t4gK2/8XRdo1RsTCbsU1aRIgi90Hh/TXRIl9KX7iKf+Z135PXbPi4uFL/7S1HYFY2J0/9a0EMO4aw36B5/fIQR5PRVTI/gH9R3DHf/SYHJlcs24zDlNimI426/VPiq4AUKztaIiF3YfrNkiA2l0j2mRSFvrxXDeIiwZx6PCW/+ytH54bB92etrYjEAu7uxpk/aDnikH2s1FndREVvn7I/ttb6DslDyc+KMTujTs1/Xfpn4RR6XGq4iy8/om1HQ2xsJNsqyWAV8xEjhTT+x/ocz9Gpcfh9j0vq/b7kv9M2tN9aK/rjnDT+2lrO8LKlSVYuKrMwF3OTVIpPC38Y32dva3AJu1pJw76+d1/f0sRz/Rxug0AlPxwWOX/TBw1SFSZXejHluvWw68V5KT4CrU4kb0uiXjzYP2fVQ4ZlLidlZukPa6Dz+PnFFXRg5tKAq3/sx7v3VOriR6T1IojZ+W5I84cgazg17hx2M8r1y3cUg9TF7XTAhHPnrp8ZszbHi+Z2cuMW3+VpRRG0Rs/Of596Wnc+qss1TkkReTzaeoPKH/a/gdszJSHRwquDLsqSSOe9cbW0tqkTrf4P/cHv13bvkF0lBzJo9vojZ8uuqIpwEL1S4tn0j+PEwcrNP7PhJqaGiQmJqpSKWw2m8o9gzyfxhgUeLt/eN7RerDOHE1N6kWCrP8zj1tu+Y3ugkEe3sZfNWICclYXawqqfHCpu2gBSfF4qGg/Prh0lOr6sbHuCWP9n/XwJ43D2/jZyLYvCwoBftEWIp557XmpE8OG8Re20vjy94eke2Rv+oNumgbPlYMmIbGLxv+ZEEiKhafx004dgNrFo9Ym3yMlZ7wvtCSw/s88ttz8a9W2JzcOwPP46dQPABrnDh4kQs27Lu3/TLtoEFiXjGim0BI5Tqdf+Pr+te2+34Nc19t19GD9n098oFNsDXIkGOAXPKHP442fpGr0nZIHZ/lRbQcA7rxUu4bH03gArf8znxYUrt4Fc5z6vf32PS9zC574Ov+vn3pTtw89Ik1yEaONRacBuMUz4IpA66VasIVT9Pii6CvuJ4AbR1/f5j4JT/5xJpa8+TZyLh+Ikh8Oo+Tbg6riKdKLZyW9VAteSgVv38eVH3HH76mICoEUU+H1C6iLq+yq24OSin0q8YzjkqSXanHPtx9gVHoc7pAu81hMJX7bv7njJ0VUfIUtrAJoi6uw4lnae5X08FOliEtIxb5D1R6rAuqxansUd/wzfiM7mtDpIJ6KsfAgxVUIbPGUqtJHpUfnvq85L373RYxKj1OErF7xE0AuosIbP6+ICk3ZaSsGn3Yo6RqANp2DLa7CiufVn78qBZLCAQBHtx3njn/ATfpfG1797Wn8p3tXpGbI/0d0qgcNW1yFFc+5ubmSvykcNpsN0+NNSlEVo9XGHT8pohIIbHEVVjwfOnRK4qVwkDQKvfQNsr+8vAzHS/gRdG9FVOhUDb3rsMVVWPG8YvNQydcUDr1CKie/5M+/P0VU9K7DFldhi6c8PXeLtOU//8D5OjlAQ6duEH7Z+BU+66J9LwJkm7ofv1vPHT9bROViQwV+YziJj6VLNNdg25HjU29/RBWBZsXzimvSJF+KpbDU2pxIMcl/a4838v9+9uvSqpsWwu4fGi0XqlpyUl2oii2uworn86e+lXxN4QC06RcAUPDuJu742SIqXeLi0digjYYDclEW86+1DiJ0cRVAWzzlw3UbJLpYCg0vVYPH8X3f8ud/yNWatkPLZGMFtohKbc05XNp/gCZthC6uUnbiOCrOVqrE84ONkrTiTn4KB51S4Yn4DQV8/cAUUfG1P7r977ZvVUWgWfEs2VZLCx7Tzr85LkmVzuGJZW8e4Y7/ofsv86kfT6khbHEVWjwDgHHLFztVKRqe0jZe+OsbGDL4SiUyTVI9vij6ipuDAmgLsZB+vO2nUz1I/jMrnglsagU33cK1f0ne05r9H8//SHf8qn5iI4Amp8f+ee0JGvEM16JBOs84ErDcL6dVLMcK0OvY6bQKFVn/1h0/L20jY+5sVXEVun9eugjJfdaLPL/6XDYKt9Tj+cfllAk6rYKkcrD7aVblHuWOv+ECKbqSptr/8FM1sJd00XhDeyquAmjFM4FXLAUAfrHqdvyC2c9L59i86Q3d+feWFvLMmLeV54/OfR9/zufbSAH6kWc6daOltUm3yAm9n14U+OC2J3XHr9fPqMJnMIqz/+E59yqR6hE3XaOKWutFntkUiqqqKkRGRiI1NVWVzlFSUoKcnBy50fFSLDP3QXa2nMKhN37Sd87xUpT0k5+zaRvkGnrpIgS9yDOborFs9GAAwJQfd6hSLubNy8eiRYs1kemRg7N0x+85/WORZv/111+vu9hQL/KsLZYip0+wC/3YdAuy6G/ul6W64/eniAq9f0+RhFFj+6mi4Kx4BuSI728m3aeyqtvyn39g3P/7X2W75p2v8GzX7/H0xSu56RzLv1uvO342PaPmndvRNS5D6YdesKhXXIWgF3lmUzd8Saugmft9g+74Jyc4EHOJtv/JCQ4gwd1XyRkb5h09iyey9D/060We582fp1oo6Cltg6RV0BS8u0l3/L6mbczb8BmGfr0b49bLwSreIkJWPBPYFIq/vfEm7pt5v2Yscx59FItf0Tp63Dfldu74a2vOadqTCPTs5pOIekYduHzxhUV4+k9Po8Vm4y4wZMUzIEeW6dQKkm4xfOJI9J2iTrkovOsB1/48VUrHJ8kFuvPPSwv595ix+N32rap9XQ3Aijs9F1fRizzziqU8+uf75DGv3qUsJiRpFfQ+QC6iojf+jKxBmsWIbLrIA+/fj8t21ODIqFTNWAA58kwqD9LiGQAi6DQNuqgJ4C6eQhdRocUzzexBGUoNdb065Ow5nqBTN9i0DRa2MIoeP1rLdI/5Mn40OX2+FmlPYNM2CEQMkzQNXtoEncKhOk4VQPE4fl/SNtZzvnZx7avcs91j2obGGYPhvXt0vpqkUi98mn9f+tUprqInnvXQ82kG5LQMklpB8DZ+tr0v16HxlrYBgOvLTFNTcUGVvkGnWvDGn0i9wRIh7Ck9gzBm/EhFnJNHT2kbLLW1tYpoptMpTNRXnEQMexo/y0PWU9z9RKjzSExMBOBb2gYLLZ4Jemkdvt7/bAoHW1Tlllu0lkuxsTE+p23Q6LlnEGhx68v4eekYNIkJbvE2bHSyV/EMyCkbrM8ziUYTUu9+D6UT3lba8/A2flKMpc8fP1b1Q67NFmth0RPPgO+pGyTdgk7JIM89jd8XD+icniYlos3DW9rG5FvG++z5zMPb/HtL23h+z+f4Z3JP1Xho9MQzj/r6em5qBy8aTdrxxs9rf9Pf/gkAiHrmDW7KBp0eQvouO3Fck7ahB512wZIaH6fs57lw+Pr+y4tCe0sR8ZS2oZdOwQplAm+f3vj1iq6wkJxo3rj0xDNALSKk8afwCSAvIuT58NGLCL3h6Zp33jdbVzyTRYT+QC/4Kyz5GA99+BjfR5BaRBgIo+b/iiueAYAsIuSha2nHtsvi+yDiaKOqSEpbiRw7Qlc8S3uvkrwJaE8UbqnHQ8+c48+/pyIqxiTA7ttXPKMmf6crnskiwkC4IucN7vjpRYTeirHwIKL7rbc/1xXPZBEhoLaU07OdY9m17RsULl7DHT9bREXvfG/XmTPzBa54BuQUDq8XccFazRGO7C3hjv+yoTnKOXQE2l/2l+3XFc9kESFrM0fKd5PFhJ7yoUcOzuKO/6uDR/zKo9bj7iGX6YpnsoiQVzCFht1Hb8+9uZQ7fnoRoTc8Wef9+cH9ujnPZBFhICx/+Tfc8c967GMl19nXgiws5i4mLFv8jK54JosIWfyxnZv7fQN//q/U+SDDKcTiiaWH63TF89//+oIUiHAG5EWEvPGTRYTeYC3sWObNnqkrnskiwkC4b8rt3PHTiwhptt33e0VIEzzZ3T366OO64pksImThWdURWCu6T5L5+sGfIiqeKBz2K13xLNlWS3pC2TNyULdw9XY8dM/bfP3Q8I6uCPeHedPzueIZcFUiDKTz6poaTf4JIOegpHHe7NqCnngG5DLegfT9Aw7pjv9y+Cd49NAVz5DLeAfSd9Ipbf4kII//fJ+cQLpW8LRg8IZMBDb/FWb9+c/glwT1F0+R52uyzAGN/+Rx6I7/Ev0UYr/wFHnuk5Ue0Pitxy264zf3iw+kawU98QzIZbwD6Tumxqk7/uZUd0TtTqcRKyP8K5ZA8BR5zjXHBDT+I/YI3fFfZgxcPAPwGHnO6G8KaPy2U0bd8Zv6tG2+WfTEMyCX8Q6kb1vTHv3xxw4LpGsFPfEMyGW8A+m72mbSf/81+S/4eXiKPM+aPDyg8b+/fr/u+G+7eXAgXSt4ijxn9s8KaPwNp07pjj+uj9b1py14ijybsicENP74Y0W647f0Hx1I1wqeFgzOnZYZ0PhXrKnWHf+MyWk6Z/mHnngG4PtX2p6Qcvs9ZCg+zi/U3g7ndVaijWapxe75a3hB50bK7bfcUHx8VluPhwopt1+in6fYDMXHg/MJRyAQCASCTobnCh+CoBFtNEvrNm/HLePHCBHdzoTyg4qh+PgsPZEcTuKZI5j9tkyQcvvR5whBLRAIBIKfDUER0Ibi48v8jSb/XKLP0UY5RWDd5u0gj0JEtx/RRrOUYopALeR5F/PshhHNrGD2beWmG43ZJiWohZgWCAQCwU+ado9A/1yEMg8SdaZZudL3hZWCtkNWlNcidNHoyqwMqfutRlR9ZEf6oYqQCXlKONOimSeY/YlCs+erBLVLTAshLRAIBIKfJEF9U+eJZSm3325D8fHh3tr9lGCjzoBbOH+4qiDkUdGfci62EoF2WT6R58F+vb7kOmO0XbHh8Cai2yO9gyOcTVCL5LZGoXmlnmzUo43dJ4S0QCAQCH5K+F82zjPTgtyuw4g2miX6J5B+1m3erhHPH64qCBvxvOCphQj0dXYGWuxWQ3uIZ8Cd66zbgIjn8b0AAN1vNaIyK4M738EWz1JuPzMjnk2QxTErpMn+OOq4Lz/sObw+abFuco2JX8pRIBAIBIJORptTOHhRZEPx8eG8iDNzHvd4KKPS0UazdM3Cpap938x9xO8oLZuyccv4MfjttOlhIZxZ1q3ZhP0lJZj/3NxOlSvsb/S8PV8XLaJpASzN5VtDdr/VCCx0b/PODRSXSFWJV+a53j72uT+Y4I48e+rDJuX2M3eWaPRP+ZsagUAgEARGmyPQroWDu6XcfrvZY1Juv93TYmKkaTEx0u/2VVxHnuu1dYnqkKd05Iwdi5yxY/0+j0Rz2ahzuIlnEn2mWfDUQpCIdIiG5TMkPYMXPQ9VRJ0Wv5VZGZIinouMwPheMIwqNpAoNCCLazoS3c7imRch9hRpJud4+vEWmeZdj95GZ4hERxvN0ne7t3eK3wuBQCAQdDy6EWgpt99DgCyU9dqQiDMdVf7dvorrAGBJprYMLDlGXWM36cfTIH0ZS6jQWyj44aoCAOEZ2R2ck4P9JSXK9vzn5oblOPVgFwgSYR0qDMXHZ5EFgwqL0gEA0g5XoZzxvYDNpwG40jk+ypAMxceDNuc64pnAE8p6CwpNMXsqP+Rdo3lY+m+Zcz1VaiDRaJur/wb6vHCLRJNoMxHM3+3ejl6Z/fDd7u24arhwzREIBAKBGl0BTcQqEa/0PqbdcACYFiNX5CLCufuiTE2fS/JdT8rqJNe5nhZVebxuqPFloaAvUdGOemPmRZ87K6oFggiteNaka1DRZoX8SllQk2ObT6P7rUZIkM81LNSvtOkHntIy9MSzsi9mT+UGckLzsPS7eBeghXXzsPRfM9cBtCkctIg2MceDUyYtQKRZuUNiVpR80zwj596YFSVS84ycN2JWlMxcuWQ/gP2qtuR3WYhpgUAgEHjNgabFq0vUTnPtV6LG02JiJDriTIvnnpP34MyaYcr+qvwyd3S6rE5a1ewuM0uleKwKR9FM8CXqHG00S+MmTPXa1/r177THEHXp7NFnQovdaiBez6HCJ/E8cAawaAU07TafVoSzNLePFIiIZlIiePnPnsSzKWZP5Ycc0azJZabbxOyp3EBFpFlhzBPR9LYy7lBHoQ3Li/cBMMSsKJEAIGZFieKccvTMfgzoKZcTjjaapQWXJWOFLRnlZcdERFogEAh+5vgVujMUH19mKD4+nE7dYPOauy/KBEbLkc6ek/eoHpXjFHQ/pO9wEc+sMwcv1/mW8WMU8dxitxrC8Y21M0Sf25JrSuabRKQJ7eW8wWJYeMqgCF898Uw/kvNcedHS3D5SoOLZBU8o67VTteeIZ9Zlg5f7jOZh6Xe5ItJ6CxYDGWeHIM3KzQLc917zjJwn6eNEPAPAgsvkD/0zTHUdN0CBQCAQhC0Biww6+sxGnllIJBoAqvLLAACzy+pAR6FDAXHhIAsIS7ZuxSQvsfnBgwd79HaONpql3pn9vV772LH97f7aiYAO1+gz693Mm0vyXM/XmW7T3q9JFXl2LRSUduRKqseqAvdCwe7T5e3DciSatFP6cEWj2yKmmdxnT9FnNudZTzzrCVwbOB7PMXsq33VFonnHve0LuT80WSx41fAxANzfHpH7LMUUgUcyE5X2rgh0WPzeCAQCgSB0tHslwp8q4b5QkNAZos8EXvVAXxcIdtT/gSKeaWcNSjxj4AxIVTNU0XSpqkBSRDQAaQc0qR/S+F6SYVRxR7wGvcivJ8HNQuc08/oJi/xmHl4WCwJwpweRqDNhhU27MFogEAgEP098FtB0/jPN7/ZVBDwInr0dQpwHPX/OI8rzcK0o6A/hGn2mYRcHkufhgjS3j8RN1YDLbYNJ1VAdpyLSGDgDJBqt6QNQ5UcLgoPeYsGy19ajjGlL8p0JQjgLBAKBgMVnAe0SsxpBS9w3AsGbjV2o8LRQkBDOPrGdKfpMINE/OkoYDqhSLlg8CGev53CEdAdHpAneosbcFI7OgqfFgv8tP4rreg8AIMSzQCAQCHxDpHC4SLzsMpSVlSnPb1qzCcsamtWNbr0NN916m7K5bfIEj04bpaV722OoftMZos80ZGxETNNR6I5aIMjiWcwWK8+iIqOlX9/yB92WG9a9jVZHS0eM32t6RfOw9N8yedDefJ295T/T7cJGcEuzcrMMy4sPSbNyJ8WsKEHzjJwnY1aUvECOE/EMuBcLAkI8CwQCgUCfQEp5k7SL//5uX8V1SzKTUZVfpiwkPLNmmGohod4Cwn8PyfjvvwGfCqoIfCdU0Wd/yh/7EmFm7eoCEc8/xdLMhuLjVim3H7tbL39Z48OsI6L1SnIrIlhHPAO+iXD2nHbFsLz4ULTRLBmWFxvgikKTbzjufn+ZslhQiGeBQCAQ+IpfAtqTDzR5zhPRPPFMoPvpLD7QNOESZdajI6PP0UazdO50Mbr10qY78FwzfM1vbst4eeL86P6PMGDwre0uog8e5KX0dxhEmPIW85l4x5uHpf+aU0hFI3Bj9lS+S7X5NXM9QK42SPbpRaU7HMppQ6KtJnmLBYVwFggEAoEveBXQnIqAGmG7qrnZQKoL8iLRBDryrJxHwYjpDqlE6G+e7ejjRwAARf0ua5fxBINQ5z6fO12s2ceK6mAuDtQTy6Hm0KX1wKKpQP5qZP2Y2G7XYaLQ3ir+mQDYYvZUfs7ri0SkvV2TEdzj4Fk8s482Mm5v12kLvpblFvnOAoFAIGgrugKaCFhv4pVEjZWy3ERI52vbssKZOleTusGpgBh0Ie2toiCP0YuXAgC2TZ4QzKEEhN6HAF70mW3fUSkNrKjO6jeyTf2Eq1jWJX91R16Nji43QPZ7pvcDAGL2VH7dI70Pt4OYPac+pKLL9DkbPJyzpXlY+rXUtVjRzIrrdkHPaePZfSuBfe525B4S4lkgEAgEbUVXQPsiVnkC+N9DMv4LAL/bV3Ed254cW1V8nFxjOF2FMJCx+AuvouBvp03XLYoS7OsHAjueLpxo7qLFT2n28dqBKYfdUYL60PGdKhF96PhOdOuV63Wuw1UsR0VG+3yPsG2DsajQFYU2QyuiiaczWfj3XY/0PjhR/gMAoKpR3c/wrMsRs+fUBldUGa5ztvhwztfNw9Ivp3brpXEo4w3g5XLx5LRxZn8Zeg7OBKAWzoAQzwKBQCDwn0AWET6kJ3rZvGayvar4uMbzmRxz9dfuec9EoLHezp7EM89pg+xrrxxoT0KSFcLj49tuprLZYmf26F832OL60PGdqm02Sl1fVxnMy7UbUZHR0vUjFL2JqqrTum3pdoSvdm2R2klE05hi9lT+QIQwK4IJuw/9QATxFrLPj3N+aB6Wfqlrt64LR3uIZ29OGzzxLISzQCAQCNpKUASRP9E3PTrC2stbygZPILICeuRo+bPBziL5c0CgAppXyjvaaJZunzZL03bjmjcBBCaYvUEE9cTJ92uOvbdquUcRTRYRBov2ENADBt8a1A8CrHgG3AL60KX1yj6SA20wGJCW1lPZX1JSjKbGi0G9/10iGqDKesfsqazqkd4Huw/94FMfw7PcwWR/zjlbeQrNw9K7u3Z1iHgGtA4rdB40ryx3IOJZlPIWCAQCQcBKjCcgCCuWzMWM2Z4Xs1VXn0FaWs+gReF46EWdAd8qCtIiOVSuGx0hnkn/my12bFzzJldEC9zQns/l5UfRu/cAlJcfRe2JQ8iNN+GWWnfbWkslRk2cjvLyo0hN7YXS0v+iouJku4yLiFQptx9i9lQ2AnIUuSPokd4HMXtOVQFA87D0LuyY2gPWZQNQfxiutTlF5FkgEAgEQSUgNeZNPPfK7OdVRKel9URJSfCilixtiTqHIxMn34+Na97EZos9ZBFof1m9skC1PfXO6QH36QubN25WbY+fOL7drrV37zbl+YkTBwDLBazJzcSeaouyf/GxOpjTeyttq6pOtdt4aGL2VDYS4Xy28pTfIjrQc2L2nFKSPqKN5qD9rrXVZQMQ4lkgEAgEwaHNSkyv4tqOjQVYk5sJeuX7xJp9WHysDqMmTle1rak5jfLyw0hJScHpxottHYou/iwUDDf27dup2ZfRbxAAoLi+XtlnqTutEtTFxnTlea7dewoEmwNNrsG7vr+wgpkV1HrtfIEVyTTtKZh5nD17EpGR8v9BHIAlByo0baqrzwAAUlNTUFNTq0rjaA+ijWapR3ofnK2UxXqL3Wo4W3lKGp51udeUjOFZl2PUmImqbX/PAYAd2zcq+zZu/DdgQUAe3HouG7M/qofKZgPCok4gEAgE7UtAocy9e7chOTkJdXXnAQBWqxx1W3KgAnFwr3xnI3A09fW1mn2B4u9CQfqccKehvh67D/3wX7I9POvy6zbXyTm38cm9NMcsdfoL2gC3YO4I9ISyL5Hqjowq+8sVV+Tg0KEDSEvrCWtlOWYPylBFoIstdSrB3N7iGXALZhKppfPqPQlinhAeNWai3+eQ8wCXeA4Cnlw2qo/+F2kDZOMfIZ4FAoFA0N4EJKCTk5Nw8GCJEn0D5Ajc7EEZWAH3ynfAHYED2jcKF4yFgizhUm2QFc8AsPvQD/8dnnX5deQ571hcYmIHjtJ/fIlAh4Ng1lssSz5AEngR6Lb2TWjL+gAintkFqUQQ8+AJ4baeEyzhDHh32SDiGRBOGwKBQCBof/wW0PQbfV3defTocQmqq88gK2sQTp8+CVguYMmBCux9ZCWGmo3Ya5VTBGixTBYOeuqbxhfxEOhCwXCixW41HD20XxqQNTjUQ1E4emi/33P4U8qBJvn+5N4lj2Vlh5UPh9XVZ5QPkGwEmk3hiIvrqhzXW0eQkBCPCxfkfvxdZEt+H3huLoC+6PWEP+cEUzwDgGF58aFoo1kyLC82wBWFJh8QSpZOVlw2hHgWCAQCQUfgl4BmFw2WlR1WntfVnYfZHA+r5YJKQIyEvIjKarXAbI7X7VtPRADexUMwFgqGS5TZE3GJiRiedfl1bJoGiTB7OhYKfio50PR9n5bWEwkJ6vuY/jBorSznRqCJ6I6IiFHaNzZWICoqWmlDf7Ckv7EpLz8Mf4g2mqXemf0BAMXFW/06N1Dq6s61S7+s0wbttlELsVhQIBAIBB2LzwKa57hhtVrQ0CAv/iNv+GQR1eLNmzFnvFvINDRcVNqS9r6kcHhz6OjMCwV9pV+/bBw/XgrALaLJMVogezoWDnTGHGj6vicRYRIV1oMXgeb2HRWNnJxcZZv3+/D115+rRPbPhbY6bQjhLBAIBIKOwCcBrWdXZzbHq6LKVqsFsFzA4s2b0SuzHxZv3oz1d05WBERcXFdte0AlIgC3uPbF3q7FbjXcMn6MtG7zdq8LBTsTdBrH8eOlGhGtR3uI5rakb/hDuOZA0/c9HRH2hl4ONCuQ2fuebVtSUvyzE896Thsrl+wHsF/VVohngUAgEIQKrwKajcAdPfqDbuRYSeGgbKWM1Q2q4wCUdA6zOR7Z2QM1/bTFG9qXlI3O4rTxU6Ez50CzNo2pqb247VJTeylFVADZxpEXge7evY9SaKV37wGIj4+DxdLA7bOm5nS7eqOHM56cNo6e2Y8BPeV1AUI8CwQCgSCUeBTQPK/n7Gz3aneeqNixsQCA21ZqZFocii11uPLK6xWR4Ym2iIcWu9Xw4aoCjx6zncVpQw82Ct0Z6Ow50KztYnJyEk6fPsnN5a+qOgVrZTly402qCHSxxQZzem9UVZ2S21gtSiEVb+sCfm54c9og4lnkOwsEAoEg1OgKaOKIwfNu5sGKAWIrtdMVgSYCwhvJyUkex0NDLyzs7CkbPMLBjSOY6RudIQeavc+qq88ozhkkjYPO5QcAh8OOyEijVwcOQHbhoLfpvkg/5Bue1tYWVQqHt9+Bzo5hefEh1+NaME4bBWtnK04bj2QmAhDCWSAQCAShg/vmS6dt0DZdLOQNnxDndGJNbiam7TmFRzITsbSsHja7Ew0RET4PKC6uK2y2VpV40MsV/WrXFp8FBO1MEE4cO7bfJ4s+IqI7Mgrtr3iONpqlc6eDl3pQX+e9kqK/DBh8q+5r0nOZ0Vvwyu4nEWgaEoG2Wi24cEG2fVTauz508vpnCwzl5OQqixjp9jt2rOf6mofqXvfkwtFoudDmD2PhlLJRXnbsJ/mBXSAQCAS+o4lAsznPAFS+txNtVdho6q60p9/MiYXXULMRO6sbMNRsRLHFhrS0nsrX3w0NF7lixOlsRnOzDWZzPGy2Wq+Lp36uOaKdKZWjM+VAs+KZtqpzOOy8U1QkJyfpViEE5Px/NnJtNscjOTnJ4wJF+oMkcf/gWd39VCHrFsJFPAsEAoFAAHjJgdaz61qc3Ig5dV24x3gCgrht0CKCTvmYaKvCO/V2rrAm0We6qMTPDTaVoyNEdDBSNzpLDnRUZLR06QB1SXNyr1VXn0FkpFFXrLJFVHgOHPS51dVnVN/cnD17UtM//XsQFRWNjAw5as3+DgwYcDkOHfrGn5faqWCjzoAQzwKBQCAID1QCWs+ujhYJSDTi9wdrANQoIsBfD2giGhoaLsrRvZQYFGQlYvqhM6oKbTk5uaprE2HhyRv3p+q00ZEiur1s68IxB1rvniewH+o8pXMA/A+QrH1jcnISDh06oOonOTkJdXXnlTUAJIWDTl9iP0D+lD9QhlPKhkAgEAgELIqA5gkJIgroN/qNACIjz2hEASCncOh5QJM0jrq680r7s2dPIiEhCUAT5tR1QVZWL7kcONzimRUrnrxxO7vThjf0RDR5HgzaKp6jjWbpD2ltEzkd6QP9h7RkvF0NxbHFk3gG/HfK4EWg2fPp3wEAqt8L+hib+89GoH+qaUxCPAsEAoEg3PGYwpGW1lNVrpvgcNg1ETXyxk8XPDhQrfa5JW2IKKEXIJLjtDe0L5UKf27wRDQARUjT+/wlGJHn/CETVdtvV9chmAsL/WHA4FvRVlFPYMVvVtYgjQAG5HvVUw40oP49oe9ttj+r1YIbbxzvMeLcmcRzo+UCAO9OOSLfWSAQCASdBSPA93sGgPj4ODQ1Nfnk39yvn9sDmhQ8IB7QEybcqWpbXn4UV1xxtVJIohLAUJ1+SeEJ2h+atfei6exRZl8gIhoAuqVnAAD27duhHB8yZJRq2xvnKiuUfoM5TkCO+NKi+u1qWVAGW1QPGHyrcj362t7o1y9Lt6AJz+e8vPwohg4dwm2/Y2MBNwI9dOhN1PX0x0IXZJGvr418d7YiK746b4h8Z4FAIBB0JgyALKB79MxscyckomytLMeMyUuV/Qe2zlFsvNj0jbb0z1p7NTVeVNnYhatVnSd8sbHTI9poloiADoRzlRVBEc9s/rkvAtaToNazseOJZV+uQaBfa2pqD6lXr0uU/GNf7lFeWoe1shxrcjNV0efFx+oUCzt/C6Z4Oof+PbBYasLSxs7XqDPQ+VI2hI2dQCAQCFQCOhBbLIfDjgRDBEzGCMUD+pHMRCw+VqfrA836SHtqk5bWUwhohnAT0CyBCGoAOLr/I0Us+3o+2wfgWcTFxMQFZdFpnNPJ9YCm7/27E414p55viUeKtXhrm5U1CMePH1O2w1FA++P33NnEMyAEtEAgEAg4EWjewj2r1aL4N3vzgdYrJEE4e/akqpgErx/AnS9K76cFNCueASGg20p7CWiWtghqb7BiGfAvFSUmJk5SFUOhipv44p6hnKcTgb4gOZX7faKtCqPS47CjsgHrjQmIiIhR+iWRb9pvfVR6HB487VAVW7FaLbDZWgHIqUxNTRe5rzWUbjT+3ktERM8/ov2/DEeEeBYIBAKB5/CvC7YIBPGBtlotSpEJX7/Cjow0ar6eJj7Rets0ra0tsNtsP6kSxm2lxW41nKusCFgodZQgYK/zdjUCilDz+vSXuxON2Eht0/flbcYmbIR721t6By//mf6GZaOpO4qRhFwcwsupDsyp89zvnLouMJtlge10Nivjs9nkD5JRUdFoarrIPbczibwWu9Uw/4jbGUUgEAgEgnDH7xQOva+WPX2FzaZqsF9X0+ildZAUDl7kmfBzi0D/1OBFqIMtmFlmpSdKo9LjMP1QPQD1vXl3ohF6x1hIGXv2A6Re+pKnvjy1Y1OZeCkcAoFAIBAI2pd2efPNjJeFUJlFLXaktaOjDZOKWqS1ozMNk4rKpLWjhxgmFe2T1o4eZphUtEdaOzrbMKmoVFo7OtUwqaimPcYWDKS5fSSM7wVsPg3DwlMhETAZxkQJAD75xd240NCMBqsNTTY77HYnYACMkRGIjTaiqzkaiXExSOoag8SuMegSY4LBYEBDUwtOV1vwy61/BwBU2OuFEBMIBAKBQCDwgaCLpsx4szR3UD+UlNVjU0MdT0T3NkwqKieimYjtEyuH/cIwqaiIEtEJhklFF4I9vmAgze0jGRaeMpDHjr5+hjFRWjFoMirOX0RVqxXn7U246LChRXLALjkBAEZDBGIMRnSNNCHZGIP0qDj0Su2KXmkJ6JEah4S4GEgScO58I344eQ537C0UIlogEAgEAoHAB4IqmGjxTKBFNIksk8hzZrxZOnFqOQCgb59ZtIi+1DCp6Edp7egow6Si1mCOMVCU6DOhA6PQJOr8x+6jcKrFgupWKy46WtAsOeCQnGCToQ0AIg0RiI0wIiEyGulRXdA3OhEDUpMxoHcKenWLhzkmChcamnHoZA1u3bUSgIhGCwQCgUAgEHjCp0WEvkDEM0sfZwwQD+nEymExLvF8mSKen8pU2p14KhN979zzubR29HWudI7uhklFVcEaX9AZOAM4vKLDLpdhTJQe6n4jjjbXYYelHBedNjglCVGGCJgjohAbYUS0IRJGg5xza5ecaJEcsDpb0ey046LDhsrWRpS1WHC8pR5n6i7iysw0DOyTiuT4WFzRLw0fG+7CzmOn8Erl55IQ0QKBQCAQCAR8giKgafFMR58BYFC8GbAAfe/c0yytHZ1umFR0RFo7eljfO/dw+3KJ58tc7aINk4pagjHGYGFYeMogje/lDvaO7wUJaNdUjgxjojQl6RrsvHga9XbZjaFrpAndosxIizKjm9GMRGMMuhijYIqKBADYWh1obG3FeUczqlsbUdXaiHP2JtTarbjgaMY5uxU1x6xosNowuH93pCXH4fLMVLTaHbjfORJvVu8UIlogEAgEAoGAQ0ACieQv64lnlgMWK05FNKPMYjVIa0eP7nvnns9JFLrvc2VkP1lYGHYLCaUdubJwHjjDvdMVhTaMKm4XsZlhTJR+GX8FylsssEkOxEdGo7cpHv1iEpHZJQE9UrsiJSEWXc3RiDEZERkpR6AdDieabXZYGltQU2/F6WoLfmw6jx+bz+NMawOanXakGmNxpTkNI3r0wpCBGeie3AW1libsOXgaW8+cwPt1e0U6h0AgEAgEAgFDm8URm+/8fo33Igi3pco+v0RIA4A5Tra+szbYcGLlMJK+0dswqai8rWNrD7jimdBOIjrDmCiNjBuIClsDIg0R6GWKQ1ZsKrITU3FpzySkp3RFQlw0oqMiYTAYIEmA5MqENsAAgwFwShJabHacv9iM8qoLOHyqBt81VuNwcx3O25uRaIzB1ebuGN37ElyTlYHErjE4VVmPon1l2HrhBIou/iBEtEAgEAgEAgFF0HKgAeBA6V4AQNH2fRg9Zojq+aDsoUq7ZZOzMOmjEgDA7n1FKN27FVOn/ZmkbxCLu7BK3zCMKjZERUZLv75Fm3qyYd037VbY5YztIswRURgQk4Sru6Tjysw09M1IQnJ8LIyREWhpdaDuYjMarC2YsLnAJZ8l7oJCWVYDLw38FeIro/GttQrnWq3Yb62G+YwR8V2icVX/7uiR2hXZfbuh7NAFFPHrdHQo0ybkeC0Ws2pTiRD5AoFAIBAIOoSgCuiiuVMxfvZsjB8MoEYWmuMHA5vnTvXpfFfkuUxaOzrWMKmoKZhj62xkGBOlvqYMxEWacEVsNwxPzsBVA9LRp3sCYkxGWJtbcbragjPnLJix7yNIkFQRaL6AlmCAAY8d3ggDDJiaOARfN5xFrb0J+63n0O2EGakJZvTtmYTMHom4vCIVv2y5Ap9ZDnZ4PjQtmt9atd6HE25W2gsxLRAIBAKBoD0JqoDOL7Yhv3gRAGBRrgn5xTa/znf5Q0eHs3g+eHB3u18jw5go9TP1RGyEEVfGdsPItN4YMrAHMrrFQ5IknDlnwY+nz+NIRS2WnNsBSZJkAQ1GQBNJaXDn6hgAGCT5sbB+HybFD8behrM429qA/dZz6F2egG5JZiR1jcWlPZOQaUlAVkwfoBkdJqKnTciRWNEcm9AbANB0gZ/Zo2o/7WYpGCJ6QrY54DLpwWJTqShzLRAIBAJBuBBUAQ0AJ1KbgaVL0feOfNVzXwmntA09Dl1aDyyaCuSvRtaPie1yjShDBLJiU3B9ai9ck5WBnt26oqXVgRMV57H/WBX2W6rxseU7OF1RZ0VAS3QE2qX/JINbQLvENBHSay3fYWTsAPzQVIuylnocqq7BpbVJGNA7BRnduqLv8QQctHbMWk4SdSZimIhmQF8483hr1XolIt1WIT0h2yy9s2x6W05VsfKdTbjz7gkB93P3QwWSENECgUAgEIQHEcHsbHP+GPStiUHfO/I1z39y5K9ul27l1I2euCQ6AcO69sDVl6Ujo1tXNNvs+KHsHL48cArbastc4lmWzU5IcEquH7INJ7XP6d5PtZNc2zubjiLJGIN6ewuOtZzHqaoLaGqxIykuFr26JaBblBl9TRlKIZf2gESdafHcdKFc+fEX0pcv+dMswRLPweSdZdPDKiIuEAgEAsHPmaAK6JIdO7E5f4wimMnzkh07g3mZkBAVGe1RvERFRkvkJ9BrpUbF4ipzGq4akI7e3RPQanfi8KlaFB8ux5cXy7Gz6agr8gxZCNPCWeKIac4+SRHRgFMCjtkrIAE4a2vAqeoLuNDYjGhTJNKSu6B7lBkmQ2SgL0sXOmUjNqG3Ip6Dgb8iOlzEc/eht2n2CREtEAgEAkF4EFQB/eDaY4pYHj+3AIAsqh9ce0zV7qE1h4J52XYnKjJaun7EOFw/Yhz3ODlGftoqojOMidJl0b3RPzoJg3t2R98eSYgwGFB2th5fHzmD3Q0V2NdSpiwWVAlhSYJTcmqjz2wUWnKqzyHpHxJwHudR72jBGdtF1FmaYDAYkNQ1Bt2MZsRGGHFZdO+gR6FZ8dzWiLMn2hqJ9oWV72xqj27x0qzp7dKvQCAQCASCwAmagCYez0RELxrfXyWeyfEZY/sE65IdAhHPvlJSUhzQ9dKizLjCnIoBvZIRZzahur4R3x+rxN6GSpyyWah8Z4kjhOES0vJ2+WNxKP8sC+WPxcnpHpKkiVq7FyDK/1qcDpxrbcJ5SxPsDie6xJiQFB0Lc2QU7JIzoNcWKKeO7fO4LRAIBAKBQNARtGkRIVtEhUBE8o6ddZp9hBVbTynlvUkxlXBF9n3+A+Lj42CxNGDHxgLkxptwS618vNhiw6iJ4wEANTWnAxbPAJAZnYDLeqUgLTkOzTY7jpXX4dv6KhxvqUeNVKdEnxXhq0rLoBYUMvFWJyS3A4drKVqEBEgGyOcZAEky4LzhPCyOJFxobEGr3YlokxFxZhNiDEY4NeZ4gcG6bfgSeW6raCYLC9uyqLDseJnfx3cUlfp8vqd+M/tltulcgUAgEAgE7UdALhw5mYley3ezbGqow+aF05XtijUrkBjIINqZvXu3qbZnD8rAnmoLAKDYUocdOz6G2RwftOv1j0lCn+4JiI6KxMnKevxw+hwON9XB6mxVu22wPxJUEeXKxxOA8b3kTsf3QgVOo8dLFhgMQIRkkAWzph+57yZnK6zNrbA7HDBFGRFrMiI6ov1yoH2lT/8hIbmuJxG7o6hUc5xN6/B0vp5LB69fgUAgEAgE4UFQc6B9hV1UGO6LDKurz6C6+gwAYMmBCuysbsDO6gYAQEPDReVYIGQYE6WbE3NwSbdEpCSY0dLqwMnKCzjUVItzdiu6RpooseyOPutFoxUGzkC3MQeQ9lK9OmWD+yj33yo5YWt1wOGQEGEAjJERMBrkW+Wm+Ox2dePg4S3qHG6pHLQgDoaFnUAgEAgEgvAi6D7Q3pgQl+xK8ZBFc/7mYyizhK+/rdVqQVpaT0UksxFoAEhL66m0b21tu411hikOGaldERsdherzDSg7ex6nbBY4JCfKHdVUigYbNVb/q348ERjfC8lj9qPuDHBu+yD5AptPI/2lC8z5BnVfkgGHWs8AGOgeWBj874RSJLclRWPU6GzdY576Z/sVUWiBQCAQCMKPoAjoAxarnNfsYd8BixV3DM5QUj527KzDAYs1RDFw32HTM5YcqPDYPioqGnabfxUYCRlRcUhJiAUAnKu34mSzBXX2ZsRGRKHOCdAFut2C153CQSLJJHWj7sxrcuOBM4DDK4DxvSC9VA+JpHBIgGSQXNnR7p4lGGCMjEREhAGSBDgcTjhcSdWRIfgPC1XqBiGQFA1v0KkawexXIBAIBAJB++G3GqIXEPqb/7zwwHHV9qmI5rCNPhMrOqvVokrRmD0oAyPT4jAyLQ4A4HDYVcdJBLotvtCp8WZ0NUfDZneg+nwjzrY2oMVpR7IxBnRtQblMt3qbRKbPbb9S7mzgDHXnru2qbYNUUWy4+lJtQ4I5xghjZATsDieabQ60SA75dRmCK6D3792ue8zfqLOn9p6u4y/tlaIhUj8EAoFAIOgctDkC3ZYFhBPi3I4c4Rx9pq3rysoOK1Foa2W5JgKdkJCkilJHRUXjkksuU6V1fLVri9TqaPH6QSGpayyio4ywNttQU29FnV12KUk1mgFOUFtinkkAUsZ8j4uSDb++ZY+m/YZ13yAhIhqRMLhaG3R9NeK7xCDKGInGJhsarC1odtphgAHmiChvLyOohEN+c6ApGjz0UkDYfkUUWiAQCASC8KPDcqAHxZu5qR7hBi2eExK07hq8HGianJxc1bY/1nZdzSYYIw2wtrSivqkZDU4bjIYIpBhj/HkJQSGpawyMkRFobLbhfEszGp2tMBoM6BppCqhfuqDJW6vWY//e7di/dzsGD9WWew9W6kag0edgi1iRqiEQCAQCQeemwxcRhjPE95lHcnISNwJtNsfDarXAbI7HL3/pLr9cU3Ma5eWHkZKSgtONF326fqwpCgaDAc0tdlx0tsDmdCDKEIkEHQFtUD1z+Ty79hw8uNuHc/TXB6YkyB90zl9sxrlWK5qcrYiJMCLZGOvTa+HB+j4DwHU33YX/bntXV0QHChHPy5YsRVs8oNuDO++eoIhokaohEAgEAkHnQwhoBtb3mVBXdx6A5wg0e259fa1f146KknNabHYHmpwO2CUnYiKMMEcYoRHJBnkVINk2wAADJFgkd67HoUvrgUVTgfzVyPoxUR6T0+0S0j2yi/zEYFCJb0Au4d3SakdVXQMqWxthczqQajIjLdr/bxBI1Jku2U2gi6cQsRsMIR3MnOe2pml4wtcUEBGdFggEAoEg/GiTgM55YhKKtmzHdPI4bgyKtmzHaC+PdDsAuO33S4L6YoKF09mMmppaOBx2REbKUxTndCI33qREoIstNjRERKDBtYCwocEdZU5NTUFEhP9pF5ERsoB2OCTYJSecACINBkQZIql4saQ8M8AAg0FSqgued7SApJ9UVZ2WO81frfTPliT/atcWZBi7MlFoWUzHRkfhbG0DyqstqG61yq/LGIv0lDjgpO+viY06xyb01lQcHDx0jErwBhqNZsVzoNFnIWIFAoFAIBDQtElA+yKWvT0CwPv/nI3bfr9ECjcnDiJ+e/S4RNlnrSzXRJ/j4roqCwirq88gLa0nrFZLm8QzANWCPhIRJg4bn99yL25ctwIGSY40qyPPQI3DqhHIniC52QbVjwEGA/Df22fB7nDiTLUFPzafR52jCbERUehl6or05Difr0GLZxJ11ivXzRPR9DFv6EWcwyl1QyAQCAQCwU8DnwU0bV+3ceUhJJZYUFZWj4K1BThgsaJs7SlsaqjD6HFjsPxfJdi48hAGxZtRsLYAAFTtCI+tXN6hThyZ8WaPlnJnGh0ez+flP7PQOdE0rJ0d68pRYa83jNywXDozY65S+c9gABySBJvTgVa70y10DQYl6myQgCpHA373+4dhscjVEXdsLMCa3Ey8VCancyw+VodRE8cDkHOz6YWNBoPBJZzdaRxxsSZU1jXgaHktTrRcQIvTgUui49DXnIixn72FCnu9V0HKimc94UxDhDIrhtuSjrFsyVIACIp4bo8UDl8R0W+BQCAQCMKPgHOgO4OzBiCL59XPTtLs37qvDGOHZOKGRz/E9SPGoazssOLrfPbsSXcKB7T5z2wJb3qbFtC8yLAnaztTVCRiI4wwIgKtkgONzlY021qVaLM6Ai2zffs6VR+s2N+7dxuSk5OUXG6CJgINA5paWvHj6TocaDiHytYGREdEIjM6AX0zkoAy3ogD49SxfSrHjcTERNTX17e5v2BHnYWIFQgEAoFAQBP0RYQkPSOc0BPPAFTimUB7OANuYcyrQnh3ohEbTd1V+6xWi8fxlJcf1j3mlCTEmIyIjzQhJsKIC44W1DtaYGlswYG7HsYV7y6V0zhc0WcDJRPJOHli/+zZk0qaCY07+iz3uf/3D+FIeS2+O1WFw011aHLacUl0Ai6PTUGf9ASPr4vA5j37En1m/Z7ptA1fItAk4gwEJ+osEAgEAoFAoIdPAjoz3ixtXjgdALBwbgEmxCfrFlEhKRzhQma8WSp6awYiorvA2dKI0feswLSRmQCAVTvLcKbRoYkQ81IwAFmUpr/8DtbfOVnlwLE4uRFz6roo2ySNA5B9oRMS4nHhgrztzRfa4XAiNiYKieZYxFlMqLU3oc7ehNoLTWhpdVBRaFk8n7ZdUM5NS+upK/YjI40a8QwAp1rd5w+ITkF5tQXfHqnEvsZKVNkb0TXShKyYZGRdkorUxPb5psGb37O3HOh7pt3c7qK5+9DbULX3/fa8hEAgEAgEgk6CzxnIJTt2Ks9zMhO5bcosVsNtv18SduW531+7E6vf24L318qvYcb0sbh5bA5XPAPa3GYiPNNffge9Mvvh5pVrlP0bTd1V4hmQPaN79bpEKariq3iusNcbMt95EbEmI1ITzEg2xsAAA2pam3C25qIShTYY5MjxSVs9rh8xjvsaFm/erCo5Dmgj4+Rc8nO0pRZ7D1Vg94UzON5Sj0gYcGl0Eq5K7Y6+PZPQ950Xfcp/9hVvVQbDoQohoa3iufvQ27w3EggEAoFA0KnwKQJdZrEa8jcfk7D5GOYO6qfbblZGL3mhXFyydMBiDc4IA4BeNLi2+Jiyf0XBVry05Ufwiqakpvbi9rVjYwFWLtkPYL+yb+jQmwAA8fFxygI+HuzCPW9EGSPRLdGM9KguiImIRL2jGWUtF1BZ24DUBDN23Xo/uhcu1AhnEn3eWbxdEfpzxo9Xjjc0XFQ+HOhVTPyyphw/NNWi1elE35hEXNMlHYP6piElvu0FVDwRTiKZULJ7P3KGDw5KX8GMWpfs3u+9kUAgEAgEgnbH5xzoMovV4M3FIpyg85537DmCSbn9sXxjKYremoHKimq8tOVHbtEU3kI7mqNn9mNAT1lckfPpc5KTk3D69EluCogvVNjrDb3+vlDaN/kh9IlOQLIxFmdsF1HWcgEnKs6jd/cEdC9ciF/f8geUlx8FAPTuPQBlZYeVSDkt9EemxaHYUqdK32ArJtLi/mDTOTQ7Heht6opru6RjyGU90Lt7Anr9/YWgRp+B4JXqbg+CKaKDgRDPAoFAIBCED+1WiXBQvFnj0MHuGxRvBiwA4hFUL+jMeLO05qXfAwDsTeoy2isKtirPrVaLqgAKAI2zBiAXRiEQ8Uy3pc8hzh10v1lZg1BfX4vW1hZERUX79BoS42JwSXoCejV2RVVrIypsDfjhfA0yKxMBqKsenjhxQBHs1kp5wR4R+ouP1aFX9mDVhwK9aosAYJMcuCQ6Htd26YHrLu2FAb1TYDT67zXoqRgK67rhDU/tg1lxkEWIVoFAIBAIBDzaJKD1FhCGA2TRoEJSLIAjyuaM6WOVCLTZHA+zOZ7rTgFAs79g7WwMNRux12oH4M6NJhHo6uozSEhI0kSfiXhlxXNUZDTXyq7CXm/oV7BY2jlxJgacScKJlgs419qIQ021uOSE2wmDFu4NDRd1hf6hQweU53R1RQCIi+sKAEhJScHpxovY3XwMu5uBDywAzgIt2QvQa8XCoEefwzF1AwA2lVoNWLVPemha+EXHl63aJ49PIBAIBAJBSGlbKe/MxLAW0Ru2HUDTxXruMToCTaCFpydWDeuDPdUWjIRcnIS4ddDRXV9SN1pb3SW3d+xYz21TYa83jNz4hvTPa/LwY3M96u3NKLddxF0n3lf8qonrRlbWINUY9IQ+oP1QAAA2Wy1qa2u5ixGj/zZfU/TFV/Si0MFK3Wiv6HM4imghngUCgUAgCB/aLYUjFJC852Xv70ZZRR23zYzpYzEg7w1lu7r6jCYqS0N7K7PWcA0NF31KASFRXkAWz9de+wufXg8A9O+VjCuruqGytRHvW77hilw2Z5sV+jz0rPpoge3PwkfV9TeVGICl0kOzH/GYyhEIRDy3V6luIqKD3W9bEeJZIBAIBILw4ScjoOlFgzmZycjJTMba4mOYlNtfabN8YykG5L2hiFB64R2BF6G1VpZjTW6mUphk8bE6mNN7w8y0J6kcyclJOHTogKqfxsYKREVF+yWeK+z1huvXvS6tv3E67i36UNd1gxbtPKGvVzGxoeGiMkbiyhGoeOZBxG4whHR75jyzCNEqEAgEAoGAx09CQHuqNFhSVoeczGTMe+97ANqy2nQk1mq1wOGwc/thRSkbwaWdOOiIMGkXFRWtso7zVaBW2OsN1xe9IV0/YpwifInIZVM3zp49CRgiNFUI6XN46FnaBQIdhSYEGo1mxXN7RZ8FAoFAIBAIPOGzgM6MN0tzB/ULu9xnT+KZRJ/nvfe94vlMezaXlR1WiWCyqJAHK0pJOyJM2TQKsp+0I9ZxfntCR0ZLZOy0RzV53o+y5d60aSXgdHJLjhPPapby8qPo1y8LFksDampO4+uvP/fZKcQbeiKa4IuY1os4C/EsEAgEAoEgVPgdgQ72AsJArexUjhsubpuUpjxfv/MwAK11W3JykhId9ub9DGgj0J7g5RfT1yd2dq2tLT7158l2jiYtrSesleUasZ+W1pP7+slrrqo6pewPlngmEBENALSQBtqWjrFsyVKqX4FAIBAIBIKOp9OncJDy3L5A5wLTecC8hX80cdBGoNlzUlNTUFNTq2yziwsJaWk9FZGanp6BEycO+z12b2NlxT7xpvbWH4ma++NX7QtusauORvuLiDoLBAKBQCAIBzq9gAbUZboBoKbRhtQuJk07Yvvmi+czvR/gR6DZ9nT/bHVCdlEhANTW1sJXsrIGqfqgo9zkmp4WOxIm2qrwTr1dM0bSJ+COQjc1XmyzhR0POhoNaCPSPEjE2X2+QCAQCAQCQWjxS0AvPHBcuzMCONXQzD+Bd0xnXyBMyu2PtcXHkDduqMb/mYhrPds2IiLpxYO8tryFeZ5SP2jx7C09xBu8PvRST3hCn309BVmJmFOnzds2m+Nhs8miPtjimaAWwUu92sQJ0SwQCAQCgSDcCEicZMabJbNd1uCj0zOwqeYU6DzmzHizNCG1D4oqZVFnNdoRzJLdALB42lAJgMayjrC2+Bi+Lm9Cj56ZPqdB0DgcdiQYIpAb745oF1tsaIjwT/UTgZ6QkASbrVXZb7HUeJyPqMhoydexxzmdmgg0Gacnr2tCWlpP1NfXtpt4FggEAoFAIPgp0OYUDlo8A5BFMqc3Ip4BwGw3IjPe3KbFgt7giWey/2uXhR2bQnH27En06HGJ5hw2nUNvYZ5ee2/7SZTXH+LiuqqiyHp+1WwEmpxXXX1G0wevHyGeBQKBQCAQCDwTUA601cj3TPa3TSAs31jarv0TvLlwJCcnAXCnRZB8YrYNOd7UyF9kyNLqaDGcPVMmAcCF8+qqgmfPlKm2EyIjNUL/wvk65Tz6uV4/QjwLBAKBQCAQeEaIJYHAD6QJGQbIWfsG14/8vD5mGQAgsfn/qGPAhZglSGieTU4HIKE+5i+utg+59jmVY4DTsKkibEqICwQCgUAg0BLg8j2B4OeBNCHDIE3IiAAQCfn3JhLyNzjyY2LzYzAgAkAU+ak6DgtutN9TdRwWej8MiEBi82Oq86l+pQkZES6hLhAIBAKBIAwRAlog8AIVdSY/kXALXyKMjUhozseFmL9AFs+13W81AuN7ofutRlQdRy2AKFyI+QsSmvM157r7VK4jRLRAIBAIBOGJENACAEC00SzRz8lPKMcUDjDiORL1Ma9BFrzsjyyGJUwHIFu2lNjZFaom13FaOKt/5P4VIS1EtEAgEAgE4cfP8s1Zmpa937CqdHCgbfxpFy7oieIvxk7HjVsLAAALbstU9s9/vwwt9uC7pnQGdCPPcpRZPpbQ/CR1TG5XH3Mco12LZ4uMUD1PbO4HOefZCcABwIkLMS+A5EEnNP+fa7+DaifyogUCgUAgCCN+EpUI/UGalr3XB/HstQ2FLQjDCgq+RIy/GDu9A0bS+XGJZ3X0mfwkND8BksJxIXoxAAMSWv4EIBI5xiOASzCP7wWMd3W4qOwKjMZBwHgcJfbLADhwIXohZNGcD/kkh6tfzXCkCRkQIlogEAgEgvDgZyWgpWnZxYZVpUN9aOqPKA4LAR1tNEt05HhU/eg29bPgtkz0SUvEqer6n3X0GWrxrBbQ9OK/hJY/Q07t+FGJNAOyeF5Udg3yM78BAORnHsSishzkGEuQYzziikbLQtr9e8jOtUQ9OqltgUAgEAgEIeRnI6CladlFhlWluT4291kUG1aV5rr6Ht22kXUsmTk53P1lJSV490H+sZ8bOtFn2nmD/YnUiGcAyM/8BgNnAIdXkO0SbD4tPx9tB0oQBbUlHi2gJbij0RLkKLRBRKEFAoFAIAg9YSOgeekHQY5++iOKR0vTsrcaVpWObY/2wYZEn/ukJSr7MjNzuG3LSkq4+2/cWgBsVec//4wxMD9sBJoV0lHKmSX2kRiPnQCARWVj8A9sx6KyMcjP3A5AFtdERMuLDd113d1e0PSPkxmLENACgUAgEISYDhXQnnJ0v/jXQ5p9N96xTAqiiPYr1cKwqnSsNC17o2FV6cT2aN9enKqux6j60ShDSSiHERC5GRnc+6S4oqLd00k40Wf2hxXRUcgxfqtEnYl4HjgD+Ae2u7qNUUWiS+w3Ij/zC+D0tyixX00uDXeahpO5piKoRRRaIBAIBILQE3QB7a9I7igMq0onStOyPzKsKr21Hc8JaT70qep6r230Ujjo6HOftETc9VpJh+c/E+G8fuMaSA4HnA6H+9HpxJRpd0tAhwhpNvrMS+WQBXR+5reaswfOUG//Y+EmZf/hFZDFM8giw2+xqCwHlOOGq29aRNNRaIFAIBAIBCHGbwHtzekhlCLZG4ZVpbdK07JXG1aVTvXjtE61oHD++2X4YqznXGceocx/JsL5k81rFdEsSRIgSe5HpxPvrVwBp8OBvP+d2Z5Cmk3fUJfspgV0fmaJ5mxWPPOOk0g0IT+zBIvKroTb2o4tF87+iAi0QCAQCAQhhCtAwimKfOMdy4IeCZWmZa80rCq9M5ht/ekzmNDuGyQHOvNIjt/93Li1ICT+z7kZGdKn2z7Bzs2fyWLZ6YTT6QQADBs5XBWF/nrXfyERUe10YslbBUEX0VS5bl6eM/1jYn6iAZhMW2rX//qWP+j2v2Hd27CNS7kZ8oetFtcj/dPK/NipHwcAh2FThTOYr1kgEAgEAoF/aCLQ0UazFM5R5CAR1KiyNC37rVCIZx53vVaCL8bm6B73lMLR0eRmZEhPPfEodm7ZhtxfjlanbDgc+OqLXYDTCcnphCRJuOa6ayA5ncrxd3Nexl0PPiYFS0RT+c+A+sOlp2g0m+LhC6qS3Ux/7LXoMQCAQeRBCwQCgUAQWsLGhWPwL/X057L2uJxPAlqalr3csKr0nkDbdBSnquuVQin+pnB0dP5zbkaGtKVos0o0q1I2JAnXjbgOTqdTJaolp1PV7h9LF+F/H8kPmoh2QYtovX71BDYOHtztS/96Almvrac2AoFAIBAIOhCNgG6xWw033rGsXaLQ+iK545CmZS81rCqd5UObR7y1cxGyvGe2eArJfwb0hTKPsstK0AeJQR2bL/DynFkRDVf02VO79hga9ah3AYl5rml76NJ6YNFUIH81sn5MZM9l23u6juSljUAgEAgEgg4k6BHocBDJekjTshcbVpU+4kPTTrVwEJAjx+8+mAMc8dyOF5nORA5Wli1tj2FxIdFnvcWCrIgmKRyqH2rf319agHsfnx9wFNqwqUKSJmTwxCrPm5k8OgE4TVtqN3E7zV+t2WXaUvsxvW0bl3It068ngS2J9A2BQCAQCEJLmwR0OItkPaRp2c8ZVpXO8bG5P0VX5rj6fqqNQwsadP6zPykcOxKLlOftvXgwNyND2rpjq5ySwYpinR9NVJp6dDrln+UL/4RZc58JdioHTziz4tlh2lL7+fUjxiknVVWd1vbkgm5HMG3Z8rVtXMqVnGtwI9sCgUAgEAhCi66Abg+R/NzTz6m2n3q2QzVnu0WVDatKn/Jm76dHW8Uqm75B8pZv3FogfTF2ul8pHAS6kmF7smPTVowcOwaSJOHq8Xeoji178A44XeJ46PXXqlI5vtmzD4+9/aGq/ScvPg7JJaSDBK8aIBt1dkBe8Ocwban95voR41BdfQZpaT39vlhJSTF56nD90NfRG4tAIBAIBIIQEvQUDlYk07RFMJ+v3Iuk9KHBqEjoT1T5WWladr5hVekiX9pHG83SuyMz2zSoqUWlbTpPbxze2uilcBRZC4I2Dm/cMP6XuHLMbQCA3Yd+UB0bnnU5AGDXv5Ziz87dSkrH7L9/4LH9c1PHB3OIvKizSjgDiDBtqS0hlnWpqb2Uk0t3f4adxdtxy3j3mGotlRg1cbqyXVNzmhbPgFpAk0deNFogEAgEAkGIaZOADrZI7iD8jSovkqZlzzasKl3SXgMKFkr+M+GI/y4cpxLrgz0sDbkZGdLWL7Zg0C+mYPehH9C9C1DVqG5DBPLwrMvxZcHLkJxOjLp7jk/tVz+dj9nPLgoojYPKg6ar/7EimljOYe/ebarzrZXl2Fm8Hb0y+2Hx5s1Yf+dkLD5WB3N6b1Vbq9XCXtoBtYjm/Yj8Z4FAIBAIwgCfBTQtmsNYJOtChLA0LftBw6rS13w9x9f2T50OrSPgXa+VUFsl+ALT/e6jI4qnSJRrBiuGWW6Y/phq21t7uu8A4aVvEOGssaCrrj6jnBgHoOy19Shzbe+sbtC0AYC0tJ6w2WrpXUqhFGjTOUQEWiAQCASCMIKr+lrsVkNS+lDpfOVeZV9nFM08DKtKX5OmZc8wrCpd4b01gDBx2aDRy3+mj+udq1tIpQQACoIyPk/4I3J3vLMYTocDo+99Muh9e4IThYbr0UHamLbUKisF09J6KjnQ1spyAMB/y4/iut4DMDItDsWWOiU/2mq1wGyO10SgTVtqy9hx2MalmCGizwKBQCAQhB0dlgMdZgK809nUectvZo/7m8JB99MeUejcjAxpyxdbIDkc3hu78Nfn2emU8MITs/Hki0uC4cbBCmhaPNcQN42yssO8dAxc13sAAHcEGnCLZwAwm+OVCDTPmUO+zharbVyKCe5ItEAgEAgEgjDg55QDrWBYVVrQHm3bi2ijWVLlOEOuOkhgjwFAkbUAmUe0+z3xxdjpKLusBHe9VtIuIvrLT/8DOJ14/dE/KIv/9BYFLplxm+LAsX35s17br5p7PxwOJ44ePR6Usbqi0IAsXhVMW2otxHVjwAD52jExJjQ0yGkacQDufn8ZHslMxNKyejySmYhiS52SwtHQcBGAHLVubW1BVFS06rokkk0tMBTRZ4FAIBAIwoyfTQ50W2mrPV17QovnjrKeCwYjx46R/Z+dTrzmKoRCBDBh5z//opTu3vvV10oUevH0Sci56gpN+2dvGw9JcuLIkWNwOiX063dJ0MbrEtGKgDZtqW0m0eK0tJ64cMGiRJWVFI3Kcgw1G3HzyjXYOX68EoGm0zwIUVHRyMnJVV2TEc8A4BTiWSAQCASC8MJnAR0s0dwWL+ggWtn5hT/2dE/p187oVMhR65J26ZsugnL9mFFwOhzYc8P1iqh2Ohyq6oRDhg1RxDR5/PSlfDgcDjgcDtjtDu7zYEJEtGlLrZ1OtSARaJKSQbN482aVC0expY7bNy2eOZFn5fpBeikCgUAgEAiCRLtYR/ib4vH+oDGq7dsObA/6mH5K+Bp1LrusxGMaR9llJfwDW/0ekm9QRVF8KeHNbSc5IUlOOKlS3k6npHoebExbap3E75lAfJ+HDr1JtX/HxgI8u28lsE/ebnBFoNl2PFjxLBAIBAKBIDxps4AORh40K5zZ/eEgpENtTxcMdIVyB+NVHPsgotWCmS+k24Pjx/ehru68sk0vCORxZn8Zeg7OVFw4WL9ogUAgEAgEnRdddcizsgtmHrSeeGbbhIOIDjUtdqvhrtdKFGVILOzmv1/mw9klHiPKvL7aLVWGEsGSSzBLfu5jo808Id0e1NWdVxYCpqamoKHhorIgkCbO9dhzcCYAfR9oAHA47IiMlH8F9cqAR0VGq15Qq6OlQ9OYBAKBQCAQaPErvBqsPGhWPGelJ6u2D1XWqdoKES2LWtb/meYPwxL97vPtPfXK8wW3ZbZ7IZWdW7crIvq6UbmqaPOenbtVkWhJknD1kMGq6PN33x2E0+mE00nEsxP9+/dVCekTJ04GdcxRkdHS9SPGobT0a2UhYEREjEbwVlefQZzTiTW5mZj2yErFhcNmd6JX9mCcPn1SFbGurj6DHj3UCx5TUlJQW+sursKzt/tq1xZJiGiBQCAQCEJLh+ZA8wQ4Ec8rj5ThzssylX20iBbwaYto9nT+H4Yl4u09st9wu3hB33Sjsljwq+07ZKHslE0urs0dplosKDmd+GbPPiWNw+l0YtCgLDgcTtWCwR9+OOrKi5ZFdZ8+vYI2XiKeAWjSNZKTk1QpHYQlByow1GzEzuoGDDUbUWyxoa7uvG66R3JykiKuafGck5Orce34+uvPg/GyBAKBQCAQBEiH50DT0Wc28kxDi2hf0j38JRzt6XjQ4wxUMPsCuQYR0kAQxTSV53zdqFy1wwab/+x04uohg5XjRDDLqRpOJRLdv39fjRtHMKDFM4GkYVRXn+GmZADA7EEZSH/5Hay/czIAqDygWeh+aIFN3Dlo8VxSUoyoqGjYbWFR10cgEAgEgp81fgno9vCCXnmkTPOcRKJpgmll11ns6aKNZslX0UynY/iKp77pY2/vQcDzXlxRYZg44VZp/fr3VYsF/cl9JqkanhYRLlz+NwRahZCIZzYCzKZtnD17UpWGYa0sR/rL76BXZj/cvHIN5owfrzqvuvoMsrIGcSPXyclJqK+v1fhCA7J4ZtM7BAKBQCAQhI6Q5EDTELFMp3D83CFRZ2/imRbNbRG4b++BtCDT8zXIOIKV2sGKYz0Xjjun3a85d/nyF70uIgyUqMhoiVjWEas6wF2ym44UkwWANLM/qgfxsBvtcuCgz+OJZ7L/l7+8TbWvpua0EM8CgUAgEIQhncajLSl9aFDzcsPVns5T1PntPfUggjcYC/5a7FbD/PfLlIWJtCDn5UfLbQKLRmt9ndWP3a67AmP7DAcAbD21m/t8yZJndYV0MNCznGPzmPWcM6qP/hdpA65THDjIeXrtST613nVZ8Uw7c4gFhQKBQCAQdDweVSTPyi5Q7qux4G+psqA4VFmnmwdNLyK8r8bSru4Q4YKeeCbCVs+BI1jQThwk4qy30LAt/x/FFRWGSZOmSk88NAvDRlynijh/s3svXn7xrwBksXxZ2mBcljYYR6r3q56P7TMcs2c/jXvuuQOS5MQll/RRhPTC5SsCTt8g6OUte4JY2KUNuA4AFA9oui/auo7gdDajpkYtklNTU9DcrM13ZvOyd+xY7/c4BQKBQCAQBEa7hGGT0of63JaIaDp9QzhwyBDhTCzsOvLaRCDrCelAuO6G67H7i12yuwZVttsf+vfPhN3uxLFjx4NWgTAqMlq6dMAgWK0NimUdGzVOTk7CwYMlGgs6QM6BLlk6GUPNRuy12mE0u3+92H6sVgsaGi4q++njxCqvV68eOH78WMCvSyAQCAQCQXBps4D2JJK9RSfvq4FEotCAZ8H8c4k+s7y9pz4sXjctpOXoc+DjkiQJ1464TuXCkXfrdABAWbMVl6UNVtrynmfGmJGf/xwWLMhHZmZv2O1OOByBuW/QrhtlZYc1x0kec13dedybEoONOv2sGtZH48LBw2yO5xZioWHzpXkLDAUCgUAgEHQ8PgkhXvQzUBEVbTSrRDSPtohnXyO1vTP7+9Ntu3Hs2H7V6yPj571u+rUFU1z72m+00RwUF5TcjAzpg1XvqHyfp/32fwHIAtobmTFmAMCzzz6hWNg9/3rb3TdYy7rS0q91xa3DYce9KTEYlR6H6YfqlX2RkUbEOZ3YWbwdvTL74XTZccwZPx7FFhsaIiK4/fAWIdKkpfVEfb2c2qHnzmGx1IT8Q5ZAIBAIBD83fIpAt0cktMVuNdxXI6cHsEL6vhpLm67bWezpPOHpNbdXRNrXfoN1/eKKCsOUaXdL761coSwebAtk8WAwxTMgR4fZBYPV1WcQF9cVZnM8NgLYWAekpXVRKgpaK8uxJjcTK5fsB7Bffp0WG8zpvWHW6YftPy2tpxLptlotyjE98SwQCAQCgSA0aENjHUiL3WqQhbQF9A/ZH8qxCdof2oHjn6tXAHBHl/VwR5/zg5L7fOmAQT63NZvjkZycpHt8yYEKAMDRM/t126SmpqjEM9sfEc+kjRDPAoFAIBCEH2Hh5fZzsKcTqCmuqDBMves+adXbr0OSJHy7t0Q5lhlj5qZy0OL6+PEyOJ0SVq7fEJDzRnb2dZp9tP8zj379tPt2bCzA7EEZ2ApgQE933vbQoTcpz+Pj42CxNPjUH6G8/Ch69x4AwO0LLRAIBAKBILT8pKK80UazFC65zb7C5kD/3MjNyJBm3zMdOUMGQ3I4cNfvH/B6zoIF+bDbHXjm1dcDtq1LTe0hsekUbcFaWY7ceBP2Wu2KC4fN7oQ5vbeqXXJyEk6fPqmJQrMLBtmiLQSSE00QOdACgUAgEHQ8P6k3XyGgOye5GRkSABQsWwzJIS8KvOee2Zp2ixbNh8PhwLyXlgJAUDyfY2Li2pwDQi8EjHM6sSY3E3uq3bnLi4/VoSEiQmmXmpqi8nu+O9GId+rtPl+PXlQIACkpKThx4vDP/v4RCAQCgaCj+Um9+QoB3bkhQvrvLy1Q3DUcDofruRNzFr4EIDjCmdCnz0Dp7NmTXF9nng+03n4SgaYhiwj1+ploq8Ko9DjMqevi03UBEYEWCAQCgSAcEAnDgrCBCON7H5/PjQoHUzj7i15KBc3sQRmqCDTtAa13Piue/aGp0bOPtEAgEAgEgvbhJxW9EhFogb8EksJBE+d0ciPQrAc0nbZxd6IR640JmjLeAN8nOi2tJ86dq0BUVDSaGi+i1dEi7h2BQCAQCELA/wd3iaJIGjPdUQAAAABJRU5ErkJggg==", "grandma": "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAEAAAABACAYAAACqaXHeAAAEVklEQVR4nO2aQWgbRxSG/w1urCxma4wgxSRi1ZZQigjGBxdyCEsOrfFpD8WEEhufegihh1wqRI7F+ORDCD3oUEzTk8lhT0LuwVmMMUUE44MIpaiVcEtoQQizmK3rGk8PmtnsrqRoVc3MKng/MG92NLt+782bN2+0AhISEhISEhISEhISEkYIYhlMjlP5Tpz6SMVndJrKq1S+G6deUiCWcYXK61TeoPIDKtPxaccJXVOJrqkk3O+beZ3KWSrnqPyYyrfXCbqmkuKtHLk/fS3gBN+aZzM/x8brmkqIZRi0nznh7VsOfuPZX8gJbM3PsvHkaIOQo42wE9hyGDoxXhr2AVHRNZUUcu939GfOU6DGjSum3SSWcUMx7X1dU0n9ke6Nqz/SkV2uPCeWMaeY9q/EMq4qpv3vsHpJcYDf+IPGUeCznKYic55CdrlyQo36hYV/NxTTrlAn/cVyxjAowz7gTbDw7mV8mKrj4vDSCRqOqxDLMLLLlecsCrLfNFj/rGLa+8Qy0oppN4fVUZgD2Kwzozebrb73LKanALx2BACoE5cBAO7xKerfz31CI+C6Ytq/E8uAYtpD6SktBwBA9eULVF++wJMnxY62n8eff+S1f9q38V2xAMALf50aPz6s8YBkB9iFu0g1K5i/eYZUs+K17cLdSPfTmW8Qy7iimPY/PHQa4/GQqOT3TpHfWwMArN26jPze6UD3+2b+b146SY0AAKinT1D/YQ35vVOvHRW65rnMPEOqA8r5O8g2U8jey3e0o8BjzYeRugQOdnYDxrL2wc6uTDUCSI2AB1bNM3a+sAGgbfwDqxYY99Wzn6XpJM0BbI9nTlib/zBgPPv8y08zslQCIGgJhIsgBjNyZ7fV0cco/niInKYCDrxiSCRCc8CMPtm3/A1TOm6hvLriXb96VsQkV62CSN8GoxBOiiKTpNRdIAoLE1N0ibSNzpdraDiusDOLlAioOm7fvqrjYkaf9K53dlv4tvSHaNX4O8CfAAdd/6vV3wLX7GjMUb0OhEWAfzajsjDxekfoFjUiGJkkmNNUaUb7GRkHxMWFd4CQbXDmaxP21jZWmPzsDuytbRh9pH8cACwurYtQL4CQCIhibD9pb21j8+lDdHuDxBNuW4x/+6s6Lu7dnPa2warjIqepKB23sPn0IRaX1pE5T7Vrfh9snP9a9FYoPAeEjRo1pCdBe2tb9r98I1wcoGsqKa+u4PYXt1E6biGnqT2rQJbgRgVuEeA/sfWqAhuOqywurQsvbweByzbYcFwlX64RlGvo9gKUcX/6WjujT0yROKq+bnCLgFGa1UGIrRLsVvuH+9ibY5G1gBAHDHoMjhMhDvg/R+G4uPCHocQBcSsQN9yOw71ehow63COAdwIUvRVe+CVw4R3A9QsRXs/qhYhyW/jvBNWzdp413ptGqXkYMELXVLKQzsD+8xUAwB07k36mEPo7QWY8I2xglDGiEfpy1B074zImQSD/AUIFOO7EuYMsAAAAAElFTkSuQmCC"};
