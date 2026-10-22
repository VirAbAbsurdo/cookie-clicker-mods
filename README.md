# Cookie Clicker mods: Nothing and the Matriarch Ziggurat

Two new buildings for the web version of [Cookie Clicker](https://orteil.dashnet.org/cookieclicker/). Each mod works by itself, and the two work together.

**Made with Claude.** I came up with the ideas and made the design calls. Claude, Anthropic's AI, wrote the code and drew the pixel art.

## Nothing

> *You have reached the ontological limit of the ultimate ensemble. You can now make cookies from the void itself.*

A 21st building, after You. It has its own tiered upgrades, achievements, a grandma-free synergy pair, a cookie and news ticker lines.

- **The void phage.** Once a game-minute, the phage may come through your Nothings and take something: cookies from your bank, buildings, Nothings themselves, an upgrade, an active buff, stock market shares, unspent heavenly chips, a sugar lump, or (rarely) a heavenly upgrade. The more Nothing you own, and the more of your CpS comes from it, the hungrier it gets. The building's tooltip shows the current odds.
- **Vacuum decay.** Past 100 Nothings, the vacuum is metastable. Each extra Nothing adds a small chance per minute that the run ends in a reverse ascension: this run's cookies are erased before heaven counts them, so it earns no prestige and no heavenly chips. You're warned once before buying past 100, and selling back to 100 makes it stable.
- **Bought by hand only.** Auto-buyers can't feed the void for you. To allow them, set `MANUAL_BUY_ONLY` to `false` at the top of `nothing.js`.

## The Matriarch Ziggurat

> *A stepped temple of black basalt, tall enough to be seen from other universes. Grandmas climb it. Cookies come down.*

Once you've researched the Elder Pact, the store offers a third answer next to the Elder Pledge and the Elder Covenant: the **Elder Apotheosis**. It costs 666 quadrillion cookies and 66 grandmas, who climb first.

- **For the rest of the run** the elders' wrath stays at its peak, the Pledge and Covenant are no longer offered, and the Matriarch ziggurat appears in the store.
- **The tithe.** Every 5 game-minutes, about one grandma per 10 ziggurats climbs the steps and is gone.
- **The warm steps.** Every grandma who has climbed this run gives ziggurats +1% CpS, up to +500%. With no grandmas left, ziggurats produce nothing.
- **The climb.** A six-step research branch opens with the rite: Stairlifts, Ancestral mortar, Hymns of ascent, Summit fires, The last step and Chaos is a ramp.
- **Summit offerings.** At 66 ziggurats an upgrade unlocks that turns some wrath cookies into an Elder Frenzy: 1% per 10 ziggurats, up to 20% at 200. Its tooltip shows the current rate. If another mod already decides every golden cookie's effect, it stays out of the way.
- **Ebon wrinklers.** Wrinklers black as basalt, with burning eyes. Grandmas who come back down via *The last step* return as Ebons, and while you own ziggurats some ordinary arrivals do too: 1% per 20 ziggurats, up to 10% at 200. An Ebon's belly fills twice as fast, so it pays about double when popped. It takes as many clicks as a shiny, and when it bursts it fills up to two empty wrinkler slots. It counts twice for *Summit fires*. The ziggurat's tooltip shows the current rate.

## Installing

Back up your save first: Options, then Export save.

### From a bookmark (any browser)

Make a new bookmark, paste one of these lines in as its URL, and click it once the game has loaded. Do it again each time you open the game.

Nothing:

```
javascript:Game.LoadMod('https://virababsurdo.github.io/cookie-clicker-mods/nothing/nothing.js');
```

Matriarch Ziggurat:

```
javascript:Game.LoadMod('https://virababsurdo.github.io/cookie-clicker-mods/matriarch-ziggurat/ziggurat.js');
```

Both:

```
javascript:Game.LoadMod('https://virababsurdo.github.io/cookie-clicker-mods/nothing/nothing.js',function(){Game.LoadMod('https://virababsurdo.github.io/cookie-clicker-mods/matriarch-ziggurat/ziggurat.js')});
```

If you use both, load Nothing first, or use the "Both" bookmark. Nothing prices itself as the 21st building.

Instead of a bookmark, you can paste the line without the `javascript:` part into the browser console (F12).

### As a Chrome extension (loads by itself)

1. Click **Code**, then **Download ZIP**, and unzip it.
2. Open `chrome://extensions` and turn on **Developer mode**.
3. Click **Load unpacked** and choose the `nothing` folder, the `matriarch-ziggurat` folder, or each in turn.

The extensions run on `orteil.dashnet.org/cookieclicker` and load automatically every time.

## Saves

Both mods save through the game's own mod system, which keeps their data apart from your vanilla save. Removing them can't damage it. If you play a session without them, their data is kept for the next time you load them.

Made for game version 2.058, the web version. The Steam version isn't supported.

## Changes

- **Nothing 1.2.3 and Matriarch Ziggurat 1.2.1:** fixed a freeze when the mods were loaded after Cookie Monster. Cookie Monster can't take in a building added after it starts, and its next refresh stopped the game; the mods now wait until it has caught up before they finish loading, so they work in any order. An error in either mod can no longer stop the game either: it's reported in the console and the game carries on.
- **Matriarch Ziggurat 1.2.0:** Ebon wrinklers.
- **Matriarch Ziggurat 1.1.0:** Summit offerings. Also fixes a bug where a golden cookie's building special on the ziggurat, if it was still running when the game saved, stopped the game from loading on your next visit.
- **Nothing 1.2.2:** the same loading fix, for building specials on Nothing.

## License

MIT. See [LICENSE](LICENSE).
