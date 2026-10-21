# PokéSurvivor Bot

A local Python bot that plays [PokéSurvivor](https://pokesurvivor.com/)
with real WASD keyboard events. It starts a temporary browser session, uses a
guest account by default or logs in with supplied credentials, avoids enemies
and telegraphed attacks, collects nearby rewards, and chooses level-up and item
cards automatically.

It reads the game's current player/enemy state without changing it, and sends
movement through the same keyboard input path used by a human player.

During level-ups it prioritizes the attack in slot 1, other attack moves, and
the Power/damage upgrade before generic stats. After every level-up choice it
presses `1` to reactivate attack slot 1. Movement also avoids liquid tiles,
raised wall formations, trees, rocks, chests, and other solid terrain props.

After every run the bot goes back to the main menu and presses the game's
**Guardar** (Save) button, which uploads the finished run to the cloud, and
reports the message the game answers with. The game only shows that button
for a signed-in account whose save mode is the cloud, so a guest session logs
`no save button to press` instead of failing.

At startup, the browser response for the published game bundle is given a
read-only probe name so the bot can access the existing game object. The bot
does not replace gameplay methods or write player state.

## Setup

From this directory:

```bash
python3 -m venv .venv
source .venv/bin/activate
python3 -m pip install -r requirements.txt
python3 -m playwright install chromium
```

## Run

Open a visible browser and play for up to three minutes:

```bash
python3 bot.py --duration 180
```

The bot opens the game on its own site, `https://pokesurvivor.com/`. The
game refuses to start inside another site's frame, so the guide page at
`pokesurvivor.org/play/` is not a usable target.

For an existing username/password account, pass only the username. The
password is requested interactively without echoing it:

```bash
python3 bot.py --username YOUR_USERNAME --duration 180
```

The password is never accepted as a command-line argument, written to logs, or
included in the bot configuration representation. Omitting `--username` keeps
the guest flow.

After account login, the bot automatically selects the optional email-link
dialog's **Do not ask me again** action. It falls back to **Not now** on older
game builds. It does not link or change the account email.

Useful options:

```text
--duration SECONDS   maximum time for each run (default: 180)
--runs COUNT         play multiple runs (default: 1)
--username NAME      log in with a username/password account
--headless           run Chromium without a window
--tick SECONDS       movement decision interval (default: 0.10)
--debug              enable verbose logging
--url URL            override the game page
```

The page is intentionally opened in a fresh, temporary browser context, so
the bot does not reuse or modify a personal account session.

## Tests

The movement strategy has no browser dependency and can be checked with:

```bash
python3 -m unittest discover -s tests -v
```

The real browser run requires the Playwright package and its Chromium binary.
