#!/usr/bin/env python3
"""Play PokéSurvivor with real WASD input from a browser automation session.

The bot uses a guest session by default, or a supplied username with a hidden
password prompt. It reads the game's current state through a small, read-only
browser evaluation and drives movement through keyboard events, just as a
human player would.

Install:

    python3 -m pip install -r requirements.txt
    python3 -m playwright install chromium

Run visibly:

    python3 bot.py --duration 180
"""

from __future__ import annotations

import argparse
import asyncio
import getpass
import logging
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from typing import Any, Callable

from strategy import Snapshot, SurvivalStrategy


LOGGER = logging.getLogger("pokesurvivor-bot")
DEFAULT_URL = "https://pokesurvivor.org/play/"
GAME_FRAME_RE = re.compile(r"https://pokesurvivor\.com(?:/|$)")


@dataclass(frozen=True)
class BotConfig:
    url: str = DEFAULT_URL
    duration: float = 180.0
    runs: int = 1
    headless: bool = False
    tick: float = 0.10
    timeout_ms: int = 30_000
    width: int = 1280
    height: int = 720
    username: str | None = None
    password: str | None = field(default=None, repr=False)


SNAPSHOT_SCRIPT = r"""
() => {
  const finite = (value, fallback = 0) =>
    Number.isFinite(value) ? value : fallback;
  // `G` is a global lexical binding in some published builds and a window
  // property in others.  Both forms are read-only from this script.
  const root = typeof G !== "undefined" ? G : (window.G || window.__PS_BOT_G);
  const game = root && root.Game;
  const player = game && game.player;
  // Slot 1 move: try multiple common slot structures and property names
  let slotOneMove = null;
  if (player && Array.isArray(player.slots) && player.slots.length > 0) {
    // Common structures:
    // 1. slots[0][0] - nested array (current assumption)
    // 2. slots[0] - direct move object
    // 3. slots[0].move - move in a wrapper object
    const slot = player.slots[0];
    const move = Array.isArray(slot) ? slot[0] : (slot?.move ?? slot);
    if (move) {
      // Try multiple property names for move identification
      const name = move.name || move.id || move.moveName || move.skillId || move.displayName || move.key || move.species || "";
      if (name) slotOneMove = String(name);
    }
  }
  const attackMoves = player && Array.isArray(player.moves)
    ? player.moves
        .filter(move => move && move.kind !== "buff")
        .map(move => String(move.name || move.id || move.moveName || move.skillId || move.displayName || move.key || move.species || ""))
        .filter(Boolean)
    : [];
  const enemies = root && root.EnemyMgr && root.EnemyMgr.all
    ? root.EnemyMgr.all() : [];
  const pickups = root && root.Pickups && root.Pickups.all
    ? root.Pickups.all() : [];
  const hazards = root && root.Hazards && Array.isArray(root.Hazards.all)
    ? root.Hazards.all : [];
  const terrain = [];
  if (root && root.World && root.World.kindAt && player) {
    const step = 32;
    for (let gy = -4; gy <= 4; gy++) {
      for (let gx = -4; gx <= 4; gx++) {
        const x = player.x + gx * step;
        const y = player.y + gy * step;
        terrain.push({ x, y, kind: String(root.World.kindAt(x, y)) });
      }
    }
  }
  const props = root && root.World && root.Camera && root.World.visibleProps
    ? root.World.visibleProps(root.Camera).map(prop => ({
        x: finite(prop.x), y: finite(prop.y), r: finite(prop.r, 12),
        type: String(prop.type || "tree"), solid: !!prop.solid, flat: !!prop.flat
      }))
    : [];
  return {
    state: game ? game.state : "unknown",
    player: player ? {
      x: finite(player.x), y: finite(player.y), r: finite(player.r, 16),
      hp: finite(player.hp), maxHp: finite(player.maxHp, 1), dead: !!player.dead,
      slotOneMove,
      attackMoves
    } : null,
    enemies: enemies.map(enemy => ({
      x: finite(enemy.x), y: finite(enemy.y), r: finite(enemy.r, 16),
      boss: !!enemy.boss, dead: !!enemy.dead
    })),
    pickups: pickups.map(pickup => ({
      x: finite(pickup.x), y: finite(pickup.y), kind: String(pickup.kind || "xp")
    })),
    hazards: hazards.filter(hazard => !hazard.hit).map(hazard => ({
      kind: String(hazard.kind || "zone"), x: finite(hazard.x), y: finite(hazard.y),
      r: finite(hazard.r), angle: finite(hazard.angle), len: finite(hazard.len),
      w: finite(hazard.w), t: finite(hazard.t), delay: finite(hazard.delay)
    })),
    terrain,
    props
  };
}
"""


def patch_game_bundle(body: bytes) -> tuple[bytes, bool]:
    """Expose the closure-local game object before its boot call.

    The published bundle is minified and obfuscated, so the local variable name
    changes between builds. The stable `Flow.boot()` property path is enough to
    identify the object without depending on one generated identifier.
    """

    if b"window.__PS_BOT_G=" in body:
        return body, True
    pattern = re.compile(rb"(?P<root>[A-Za-z_$][A-Za-z0-9_$]*)\['Flow'\]\['boot'\]\(\)")
    match = pattern.search(body)
    if not match:
        return body, False
    root = match.group("root")
    replacement = b"window.__PS_BOT_G=" + root + b"," + match.group(0)
    return body[: match.start()] + replacement + body[match.end() :], True


def _normalize(text: str) -> str:
    """Lowercase and strip accents for accent-insensitive matching."""
    return "" .join(
        c for c in unicodedata.normalize("NFD", text.lower())
        if unicodedata.category(c) != "Mn"
    )


def _card_score(
    text: str,
    is_evolution: bool,
    preferred_attack: str | None = None,
    attack_moves: tuple[str, ...] = (),
) -> int:
    """Prefer slot-one attack upgrades, attacks, and useful survival cards."""

    normalized = _normalize(text)
    score = 0
    if is_evolution or "evolution" in normalized or "evolucion" in normalized:
        score += 1000
    if preferred_attack and _normalize(preferred_attack) in normalized:
        # The first slot is the bot's main attack. Its upgrades should win over
        # generic stats and over upgrades for later attacks.
        score += 850
    elif any(_normalize(name) in normalized for name in attack_moves):
        score += 420
    if "new" in normalized or "nuevo" in normalized or "learn" in normalized or "aprende" in normalized:
        score += 300
    if "power" in normalized or "potencia" in normalized or "damage" in normalized or "dano" in normalized:
        score += 240
    if "speed" in normalized or "carrera" in normalized or "movement" in normalized or "velocidad" in normalized:
        score += 110
    if "reflex" in normalized or "cooldown" in normalized or "recarga" in normalized:
        score += 100
    if "shield" in normalized or "coraza" in normalized or "reduction" in normalized:
        score += 75
    if "health" in normalized or "vida" in normalized or "vigor" in normalized:
        score += 65
    if "magnet" in normalized or "iman" in normalized:
        score += 50
    if "experience" in normalized or "experiencia" in normalized:
        score += 45
    if "heal" in normalized or "baya" in normalized:
        score += 35
    return score


class BotError(RuntimeError):
    """Raised when the browser cannot reach a playable game state."""


class PokéSurvivorBot:
    def __init__(self, config: BotConfig, page: Any, frame: Any) -> None:
        self.config = config
        self.page = page
        self.frame = frame
        self.strategy = SurvivalStrategy()
        self.held_keys: set[str] = set()
        self._last_log = 0.0

    async def run(self) -> None:
        await self._initialize_session()
        for run_number in range(1, self.config.runs + 1):
            if run_number > 1:
                await self._return_to_menu()
            LOGGER.info("starting run %d/%d", run_number, self.config.runs)
            await self._start_run()
            await self._play_run(run_number)

    async def _initialize_session(self) -> None:
        await self._wait_visible("#game")
        await self._dismiss_start_prompt()

        if await self._visible("#scr-login"):
            if self.config.username:
                await self._login_with_credentials()
            else:
                LOGGER.info("starting a guest session")
                await self.frame.locator("#btn-guest").click()

        if await self._visible("#scr-test"):
            await self._complete_personality_test()

        if await self._visible("#scr-result"):
            await self.frame.locator("#res-ok").click()

        if await self._visible("#scr-starters"):
            # This is a fallback for a future UI flow that skips the result
            # screen.  The first starter is a valid, deterministic choice.
            await self.frame.locator("#starter-grid .cell").first.click()
            await self.frame.locator("#starter-ok").click()

        await self._wait_visible("#scr-menu")
        await self._dismiss_recovery_prompt()

    async def _dismiss_recovery_prompt(self) -> None:
        """Permanently dismiss the optional email-link prompt after login."""

        if not await self._visible("#scr-recover"):
            return
        # Current builds expose "Do not ask me again" as #rec-never. Keep the
        # temporary "Not now" button as a compatibility fallback.
        if await self._visible("#rec-never"):
            selector = "#rec-never"
            LOGGER.info("choosing the permanent email-link dismissal")
        else:
            selector = "#rec-later"
            LOGGER.info("choosing the temporary email-link dismissal")
        await self.frame.locator(selector).click()
        await self._wait_hidden("#scr-recover", timeout_ms=5_000)

    async def _login_with_credentials(self) -> None:
        username = self.config.username
        password = self.config.password
        if not username or password is None:
            raise BotError("username/password mode requires both credentials")

        LOGGER.info("logging in with supplied credentials")
        password_input = self.frame.locator("#f-pass")
        await self.frame.locator("#f-user").fill(username)
        await password_input.fill(password)
        await self.frame.locator("#btn-auth").click()

        deadline = time.monotonic() + self.config.timeout_ms / 1000.0
        try:
            while time.monotonic() < deadline:
                login_succeeded = False
                for selector in ("#scr-menu", "#scr-test", "#scr-result", "#scr-starters"):
                    if await self._visible(selector):
                        login_succeeded = True
                        break
                if login_succeeded:
                    return

                error = (await self.frame.locator("#login-err").text_content() or "").strip()
                if error:
                    raise BotError(f"login failed: {error}")
                await asyncio.sleep(0.10)
            raise BotError("timed out waiting for the login response")
        finally:
            # Successful login currently clears this field itself; clearing it
            # here also covers failed attempts and future UI changes.
            try:
                await password_input.fill("")
            except Exception:
                pass

    async def _dismiss_start_prompt(self) -> None:
        if await self._visible("#tap-start"):
            LOGGER.info("dismissing the audio start prompt")
            await self.frame.locator("#tap-start").click(force=True)
        await self._wait_hidden("#boot", timeout_ms=self.config.timeout_ms)

    async def _complete_personality_test(self) -> None:
        LOGGER.info("completing the personality test")
        while await self._visible("#scr-test"):
            answers = self.frame.locator("#test-a .answer")
            if await answers.count() == 0:
                raise BotError("the personality test has no answer buttons")
            await answers.first.click()
            await asyncio.sleep(0.08)

    async def _start_run(self) -> None:
        await self._wait_visible("#scr-menu")
        await self.frame.locator('#scr-menu [data-go="play"]').click()
        await self._wait_hidden("#scr-menu")
        self.strategy.reset()
        await self._focus_game()

    async def _play_run(self, run_number: int) -> None:
        started = time.monotonic()
        self._last_log = started

        while True:
            elapsed = time.monotonic() - started
            if elapsed >= self.config.duration:
                LOGGER.info("run %d reached %.1f seconds", run_number, elapsed)
                await self._stop_run()
                return

            if await self._visible("#scr-over"):
                LOGGER.info("run %d ended", run_number)
                await self._release_keys()
                return

            if await self._handle_overlay():
                await asyncio.sleep(0.06)
                continue

            try:
                snapshot = Snapshot.from_payload(await self.frame.evaluate(SNAPSHOT_SCRIPT))
            except Exception as exc:  # frame can briefly reload after a fatal run error
                LOGGER.warning("could not read game state: %s", exc)
                await asyncio.sleep(0.25)
                continue

            if snapshot.player is None:
                if time.monotonic() - self._last_log >= 5.0:
                    self._last_log = time.monotonic()
                    LOGGER.info("waiting for a live player state (game state=%s)", snapshot.state)
                await asyncio.sleep(0.10)
                continue

            if snapshot.state == "over" or snapshot.player.dead:
                await self._release_keys()
                await asyncio.sleep(0.10)
                continue

            desired = self.strategy.choose(snapshot, elapsed)
            await self._set_keys(desired)

            if time.monotonic() - self._last_log >= 5.0:
                self._last_log = time.monotonic()
                hp_ratio = snapshot.player.hp / max(1.0, snapshot.player.max_hp)
                LOGGER.info(
                    "run %d t=%5.1fs hp=%3.0f%% enemies=%d pickups=%d keys=%s",
                    run_number,
                    elapsed,
                    hp_ratio * 100.0,
                    len(snapshot.enemies),
                    len(snapshot.pickups),
                    "".join(sorted(desired)) or "-",
                )

            await asyncio.sleep(self.config.tick)

    async def _handle_overlay(self) -> bool:
        if await self._visible("#scr-levelup"):
            await self._choose_level_up()
            return True
        if await self._visible("#scr-item"):
            await self._choose_item()
            return True
        if await self._visible("#scr-bond"):
            await self._choose_bond()
            return True
        if await self._visible("#scr-pause"):
            await self.frame.locator("#btn-resume").click()
            return True
        return False

    async def _choose_level_up(self) -> None:
        cards = self.frame.locator("#cards .card")
        count = await cards.count()
        if count == 0:
            raise BotError("level-up screen has no reward cards")
        texts = await cards.all_inner_texts()
        preferred_attack = None
        attack_moves: tuple[str, ...] = ()
        try:
            current = Snapshot.from_payload(await self.frame.evaluate(SNAPSHOT_SCRIPT))
            if current.player:
                preferred_attack = current.player.slot_one_move
                attack_moves = current.player.attack_moves
                LOGGER.info("level-up: slot 1 move=%r, attack_moves=%s", preferred_attack, attack_moves)
            else:
                LOGGER.warning("level-up: no player in snapshot")
        except Exception as exc:
            LOGGER.warning("could not read attack preference during level-up: %s", exc)
        scores = []
        for index, text in enumerate(texts):
            class_attr = await cards.nth(index).get_attribute("class") or ""
            is_evo = "evo" in class_attr.split()
            score = _card_score(
                text,
                is_evo,
                preferred_attack=preferred_attack,
                attack_moves=attack_moves,
            )
            scores.append(score)
            first_line = text.splitlines()[0]
            LOGGER.debug("level-up card %d/%d score=%d evo=%s: %s", index + 1, count, score, is_evo, first_line)
        index = max(range(count), key=lambda candidate: (scores[candidate], -candidate))
        LOGGER.info(
            "choosing level-up card %d/%d: %s%s",
            index + 1,
            count,
            texts[index].splitlines()[0],
            " (slot 1 priority)" if preferred_attack and preferred_attack.lower() in texts[index].lower() else "",
        )
        await cards.nth(index).click()
        await self._wait_hidden("#scr-levelup", timeout_ms=5_000)
        await self._select_attack_one()

    async def _select_attack_one(self) -> None:
        """Keep the first attack active after every level-up choice."""

        await self._focus_game()
        await self.page.keyboard.press("1")
        LOGGER.debug("selected attack slot 1")

    async def _choose_item(self) -> None:
        cards = self.frame.locator("#item-cards .card")
        count = await cards.count()
        if count == 0:
            raise BotError("item screen has no choice cards")
        # The second card is the newly found item.  Replacing the current item
        # keeps the run from carrying an obsolete reward forever.
        index = 1 if count > 1 else 0
        LOGGER.info("choosing item card %d/%d", index + 1, count)
        await cards.nth(index).click()
        await self._wait_hidden("#scr-item", timeout_ms=5_000)

    async def _choose_bond(self) -> None:
        # Pair bonds show two consecutive card screens; an add-to-group bond
        # only needs one click.  The loop handles both without inspecting the
        # game's private bond selection object.
        for _ in range(2):
            if not await self._visible("#scr-bond"):
                return
            cards = self.frame.locator("#bond-cards .card")
            if await cards.count() == 0:
                raise BotError("bond screen has no movement cards")
            await cards.first.click()
            await asyncio.sleep(0.08)
        await self._wait_hidden("#scr-bond", timeout_ms=5_000)

    async def _stop_run(self) -> None:
        await self._release_keys()
        if await self._visible("#scr-over"):
            return
        await self._focus_game()
        await self.page.keyboard.press("Escape")
        try:
            await self._wait_visible("#scr-pause", timeout_ms=2_000)
        except BotError:
            return
        if await self._visible("#btn-quit"):
            await self.frame.locator("#btn-quit").click()
            await self._wait_visible("#scr-over", timeout_ms=5_000)

    async def _return_to_menu(self) -> None:
        if await self._visible("#scr-over"):
            await self.frame.locator("#btn-again").click()
        await self._wait_visible("#scr-menu")

    async def _focus_game(self) -> None:
        canvas = self.frame.locator("#game")
        await canvas.wait_for(state="visible", timeout=self.config.timeout_ms)
        box = await canvas.bounding_box()
        if not box:
            raise BotError("game canvas has no visible bounds")
        await canvas.click(position={"x": box["width"] / 2, "y": box["height"] / 2})

    async def _set_keys(self, desired: frozenset[str]) -> None:
        for key in sorted(self.held_keys - set(desired)):
            await self.page.keyboard.up(key)
        for key in sorted(set(desired) - self.held_keys):
            await self.page.keyboard.down(key)
        self.held_keys = set(desired)

    async def _release_keys(self) -> None:
        for key in sorted(self.held_keys):
            await self.page.keyboard.up(key)
        self.held_keys.clear()

    async def _visible(self, selector: str) -> bool:
        try:
            return await self.frame.locator(selector).is_visible()
        except Exception:
            return False

    async def _wait_visible(self, selector: str, timeout_ms: int | None = None) -> None:
        try:
            await self.frame.locator(selector).wait_for(
                state="visible", timeout=timeout_ms or self.config.timeout_ms
            )
        except Exception as exc:
            raise BotError(f"timed out waiting for visible {selector}") from exc

    async def _wait_hidden(self, selector: str, timeout_ms: int | None = None) -> None:
        try:
            await self.frame.locator(selector).wait_for(
                state="hidden", timeout=timeout_ms or self.config.timeout_ms
            )
        except Exception as exc:
            raise BotError(f"timed out waiting for hidden {selector}") from exc


async def _find_game_frame(page: Any, timeout_ms: int) -> Any:
    deadline = time.monotonic() + timeout_ms / 1000.0
    while time.monotonic() < deadline:
        for frame in page.frames:
            if GAME_FRAME_RE.match(frame.url):
                try:
                    if await frame.locator("#game").count():
                        return frame
                except Exception:
                    pass
        await asyncio.sleep(0.10)
    raise BotError("could not find the PokéSurvivor game iframe")


async def run_bot(config: BotConfig) -> None:
    try:
        from playwright.async_api import async_playwright
    except ImportError as exc:
        raise BotError(
            "Playwright is not installed; run `python3 -m pip install -r requirements.txt`"
        ) from exc

    async with async_playwright() as playwright:
        browser = await playwright.chromium.launch(
            headless=config.headless,
            args=["--autoplay-policy=no-user-gesture-required"],
        )
        context = await browser.new_context(
            viewport={"width": config.width, "height": config.height},
            locale="en-US",
        )
        page = await context.new_page()
        page.on("pageerror", lambda error: LOGGER.warning("page error: %s", error))

        async def expose_game_object(route: Any) -> None:
            response = await route.fetch()
            body = await response.body()
            body, installed = patch_game_bundle(body)
            if installed:
                LOGGER.debug("installed the read-only game-state probe")
            else:
                LOGGER.warning("could not find the current game bundle probe anchor")
            headers = dict(response.headers)
            headers.pop("content-length", None)
            await route.fulfill(
                status=response.status,
                headers=headers,
                body=body,
            )

        await page.route("**/js/app.min.js*", expose_game_object)
        await page.goto(config.url, wait_until="domcontentloaded", timeout=config.timeout_ms)
        frame = await _find_game_frame(page, config.timeout_ms)
        bot = PokéSurvivorBot(config, page, frame)
        try:
            await bot.run()
        finally:
            await bot._release_keys()
            await context.close()
            await browser.close()


def parse_args(
    argv: list[str] | None = None,
    password_reader: Callable[[str], str] = getpass.getpass,
) -> BotConfig:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--url", default=DEFAULT_URL, help="game page to open")
    parser.add_argument("--duration", type=float, default=180.0, help="maximum seconds per run")
    parser.add_argument("--runs", type=int, default=1, help="number of guest runs")
    parser.add_argument(
        "--username",
        help="game username; prompts for the password without echoing it",
    )
    parser.add_argument("--headless", action="store_true", help="hide the browser window")
    parser.add_argument("--tick", type=float, default=0.10, help="controller interval in seconds")
    parser.add_argument("--debug", action="store_true", help="enable verbose logging")
    args = parser.parse_args(argv)
    if args.duration <= 0:
        parser.error("--duration must be greater than zero")
    if args.runs <= 0:
        parser.error("--runs must be greater than zero")
    if args.tick <= 0:
        parser.error("--tick must be greater than zero")
    username = args.username.strip() if args.username else ""
    password = password_reader("PokéSurvivor password: ") if username else None
    logging.basicConfig(
        level=logging.DEBUG if args.debug else logging.INFO,
        format="%(asctime)s %(levelname)s %(message)s",
        datefmt="%H:%M:%S",
    )
    return BotConfig(
        url=args.url,
        duration=args.duration,
        runs=args.runs,
        headless=args.headless,
        tick=args.tick,
        username=username or None,
        password=password,
    )


def main(argv: list[str] | None = None) -> int:
    config = parse_args(argv)
    try:
        asyncio.run(run_bot(config))
    except KeyboardInterrupt:
        LOGGER.info("stopped by user")
        return 130
    except BotError as exc:
        LOGGER.error("%s", exc)
        return 1
    except Exception:
        LOGGER.exception("bot failed")
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
