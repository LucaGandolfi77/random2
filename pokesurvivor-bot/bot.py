#!/usr/bin/env python3
"""Play PokéSurvivor with real WASD input from a browser automation session.

The bot uses a guest session by default, or a supplied username with a hidden
password prompt. It reads the game's current state through a small, read-only
browser evaluation and drives movement through keyboard events, just as a
human player would.

After every run it goes back to the main menu and presses the game's Save
button, so the finished run is uploaded to the cloud.

Install:

    python3 -m pip install -r requirements.txt
    python3 -m playwright install chromium

Run visibly:

    python3 bot.py --duration 180
"""

from __future__ import annotations

import argparse
import asyncio
import csv
import getpass
import logging
import os
import re
import sys
import time
import unicodedata
from dataclasses import dataclass, field
from datetime import datetime
from typing import Any, Callable

from strategy import Snapshot, SurvivalStrategy


LOGGER = logging.getLogger("pokesurvivor-bot")
# The game only runs on its own site: pokesurvivor.com refuses to start
# inside another site's frame, so the guide page is not a usable target.
DEFAULT_URL = "https://pokesurvivor.com/"
GAME_FRAME_RE = re.compile(r"https://pokesurvivor\.com(?:/|$)")
# The game's "Guardar" button lives in the top bar of the game frame.  The
# game only shows that bar outside a run, and only shows the button for a
# signed-in account whose save mode is the cloud.
SAVE_BUTTON_SELECTOR = "#btn-save"
TOAST_SELECTOR = ".toast"
# Mystery Dungeon orbs use the 5-8 keys (slot 1 is key 5).  The game enforces
# a short internal cooldown between two orb uses.
ORB_KEY_OFFSET = 5
ORB_COOLDOWN_S = 1.1
LOW_HEALTH_THRESHOLD = 0.45
# When health is low, spend the most defensive orbs first.  `quick` helps
# escaping a horde, the buffs come last because they do not stop damage.
DEFENSIVE_ORB_PRIORITY = (
    "blowback", "slumber", "slow", "quick", "focus", "luminous",
)
# One row per finished run in the CSV report (see --csv).
CSV_FIELDS = (
    "run",
    "started_at",
    "ended_at",
    "duration_s",
    "outcome",
    "hp_end_pct",
    "max_enemies",
    "summary",
)


@dataclass(frozen=True)
class BotConfig:
    url: str = DEFAULT_URL
    duration: float = 180.0
    runs: int = 1
    headless: bool = False
    tick: float = 0.10
    timeout_ms: int = 30_000
    csv_path: str = "runs.csv"
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
  // Single-use Mystery Dungeon orbs sit in four inventory slots and are used
  // with the 5-8 keys.  Each entry is {id, n} or null.
  const orbs = player && Array.isArray(player.orbs)
    ? player.orbs.map(orb => orb ? {
        id: String(orb.id || ""), n: finite(orb.n, 1)
      } : null)
    : [];
  // A rift is the timed gateway to a legendary boss arena.  `rift` holds its
  // world position while it is open; `inArena` is true during the boss fight.
  const rift = root && root.Rift && root.Rift.rift ? root.Rift.rift : null;
  return {
    state: game ? game.state : "unknown",
    player: player ? {
      x: finite(player.x), y: finite(player.y), r: finite(player.r, 16),
      hp: finite(player.hp), maxHp: finite(player.maxHp, 1), dead: !!player.dead,
      slotOneMove,
      attackMoves,
      orbs
    } : null,
    rift: rift ? {
      x: finite(rift.x), y: finite(rift.y),
      ttl: finite(rift.ttl), t: finite(rift.t)
    } : null,
    inArena: !!(root && root.Rift && root.Rift.inArena),
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
        self._orb_pending: set[tuple[int, str]] = set()
        self._orb_cooldown_until = 0.0

    async def run(self) -> None:
        await self._initialize_session()
        for run_number in range(1, self.config.runs + 1):
            LOGGER.info("starting run %d/%d", run_number, self.config.runs)
            await self._start_run()
            info = await self._play_run(run_number)
            await self._finish_run(run_number)
            self._write_run_record(run_number, info)

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

    async def _dismiss_recovery_prompt(self) -> bool:
        """Permanently dismiss the optional email-link prompt after login.

        Returns True when the prompt was visible and got dismissed.
        """

        if not await self._visible("#scr-recover"):
            return False
        # Current builds expose "Do not ask me again" as #rec-never. Keep the
        # temporary "Not now" button as a compatibility fallback. The buttons
        # can lag behind the overlay itself, so poll briefly for either one.
        selector = None
        deadline = time.monotonic() + 5.0
        while time.monotonic() < deadline:
            if await self._visible("#rec-never"):
                selector = "#rec-never"
                LOGGER.info("choosing the permanent email-link dismissal")
                break
            if await self._visible("#rec-later"):
                selector = "#rec-later"
                LOGGER.info("choosing the temporary email-link dismissal")
                break
            await asyncio.sleep(0.10)
        if selector is None:
            LOGGER.warning("recovery prompt visible but no dismissal button found; leaving it alone")
            return False
        await self.frame.locator(selector).click()
        await self._wait_hidden("#scr-recover", timeout_ms=5_000)
        return True

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
        # The recovery prompt can reappear between runs (e.g. right after a
        # cloud save); it overlays the menu and would block the play click.
        await self._dismiss_recovery_prompt()
        await self.frame.locator('#scr-menu [data-go="play"]').click()
        await self._wait_hidden("#scr-menu")
        self.strategy.reset()
        self._orb_pending.clear()
        self._orb_cooldown_until = 0.0
        await self._focus_game()

    async def _play_run(self, run_number: int) -> dict[str, Any]:
        """Play one run and return the stats collected for the CSV report."""
        started = time.monotonic()
        started_at = datetime.now().isoformat(timespec="seconds")
        self._last_log = started
        max_enemies = 0
        last_hp_pct = ""
        outcome = "unknown"
        summary = ""

        while True:
            elapsed = time.monotonic() - started
            if elapsed >= self.config.duration:
                LOGGER.info("run %d reached %.1f seconds", run_number, elapsed)
                outcome = "timeout"
                await self._stop_run()
                break

            if await self._visible("#scr-over"):
                LOGGER.info("run %d ended", run_number)
                outcome = "died"
                await self._release_keys()
                summary = await self._over_summary()
                break

            if await self._handle_overlay():
                await asyncio.sleep(0.06)
                continue

            try:
                snapshot = Snapshot.from_payload(await self.frame.evaluate(SNAPSHOT_SCRIPT))
            except Exception as exc:  # frame can briefly reload after a fatal run error
                LOGGER.warning("could not read game state: %s", exc)
                await asyncio.sleep(0.25)
                continue

            max_enemies = max(
                max_enemies, sum(1 for enemy in snapshot.enemies if not enemy.dead)
            )
            if snapshot.player is not None:
                last_hp_pct = f"{100.0 * snapshot.player.hp / max(1.0, snapshot.player.max_hp):.1f}"

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
            await self._use_orb_when_ready(snapshot)

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

        return {
            "run": run_number,
            "started_at": started_at,
            "ended_at": datetime.now().isoformat(timespec="seconds"),
            "duration_s": f"{time.monotonic() - started:.1f}",
            "outcome": outcome,
            "hp_end_pct": last_hp_pct,
            "max_enemies": max_enemies,
            "summary": summary,
        }

    async def _over_summary(self) -> str:
        """Grab the result screen text for the CSV report (best effort)."""
        try:
            over = self.frame.locator("#scr-over")
            if await over.count() == 0:
                return ""
            text = await over.first.inner_text()
        except Exception:
            return ""
        return " ".join((text or "").split())[:300]

    def _write_run_record(self, run_number: int, info: dict[str, Any]) -> None:
        """Append one row per finished run to the CSV report file."""
        path = self.config.csv_path
        if not path:
            return
        new_file = not os.path.exists(path) or os.path.getsize(path) == 0
        try:
            with open(path, "a", newline="", encoding="utf-8") as handle:
                writer = csv.writer(handle)
                if new_file:
                    writer.writerow(CSV_FIELDS)
                writer.writerow([info.get(name, "") for name in CSV_FIELDS])
        except OSError as exc:
            LOGGER.warning("run %d: could not update %s: %s", run_number, path, exc)
            return
        LOGGER.info("run %d: stats appended to %s", run_number, path)

    async def _finish_run(self, run_number: int) -> None:
        """Return to the menu and press the game's Save button.

        The game keeps the top bar hidden while a run is on screen, and the
        Save button lives in that top bar, so the bot goes back to the menu
        first and saves from there.  The run's results are already in the
        save slot; pressing the button uploads them to the cloud.
        """

        try:
            await self._return_to_menu()
        except BotError as exc:
            LOGGER.warning("run %d: could not reach the menu to save: %s", run_number, exc)
            return
        await self._save_run(run_number)

    async def _save_run(self, run_number: int) -> None:
        """Press the game's Save button once the run is over.

        The game keeps the finished run in its local save slot and only
        uploads it to the cloud when the player presses "Guardar".  A guest
        session or a browser-only save mode has no such button, so there is
        nothing to press and nothing to report beyond a short log line.
        """

        if not await self._wait_for_optional(SAVE_BUTTON_SELECTOR, timeout_ms=3_000):
            LOGGER.info(
                "run %d: no save button to press (guest session or local save mode)",
                run_number,
            )
            return

        previous = await self._toast_text()
        try:
            await self.frame.locator(SAVE_BUTTON_SELECTOR).click(timeout=5_000)
        except Exception as exc:
            LOGGER.warning("run %d: could not press the save button: %s", run_number, exc)
            return

        LOGGER.info("run %d: pressed the save button", run_number)
        message = await self._wait_for_toast_change(previous)
        if message:
            LOGGER.info("run %d: %s", run_number, message)

    async def _handle_overlay(self) -> bool:
        if await self._visible("#scr-recover"):
            # Only claim the overlay when a known dismissal button exists,
            # otherwise fall through so the run loop keeps making progress.
            if await self._dismiss_recovery_prompt():
                return True
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
        await self._wait_for_cards("#cards")
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
        await self._wait_for_cards("#item-cards")
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
            await self._wait_for_cards("#bond-cards")
            await cards.first.click()
            await asyncio.sleep(0.08)
        await self._wait_hidden("#scr-bond", timeout_ms=5_000)

    async def _wait_for_cards(self, container: str, timeout_ms: int = 3_000) -> None:
        """Wait until the game stops guarding freshly shown cards.

        The game ignores clicks on the cards it has just shown for a short
        moment, so the bot waits for the guard to clear before choosing one.
        """

        deadline = time.monotonic() + timeout_ms / 1000.0
        while time.monotonic() < deadline:
            try:
                if await self.frame.locator(f"{container}.guard").count() == 0:
                    return
            except Exception:
                return
            await asyncio.sleep(0.05)
        LOGGER.warning("cards in %s stayed guarded", container)

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
        # Same overlay that can block the play click can also block the
        # top-bar save button right after a run.
        await self._dismiss_recovery_prompt()

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

    async def _use_orb_when_ready(self, snapshot: Snapshot) -> None:
        """Spend a carried orb, saving the defensive ones for low health.

        Orbs are single-use pickups stored in four slots and activated with
        the 5-8 keys.  The game ignores a second use while its own cooldown is
        running, so the bot uses at most one orb per cooldown.  A slot that
        was already pressed stays pending until the game removes or changes
        it, which avoids burning two orbs on the same stale snapshot.
        """

        player = snapshot.player
        if player is None or player.dead or snapshot.state != "playing":
            self._orb_pending.clear()
            return

        available = {(orb.slot, orb.orb_id) for orb in player.orbs}
        self._orb_pending &= available
        pending = [slot for slot in available if slot not in self._orb_pending]
        if not pending:
            return

        now = time.monotonic()
        if now < self._orb_cooldown_until:
            return

        hp_ratio = player.hp / max(1.0, player.max_hp)
        if hp_ratio < LOW_HEALTH_THRESHOLD:
            rank = {orb_id: index for index, orb_id in enumerate(DEFENSIVE_ORB_PRIORITY)}
            pending.sort(key=lambda entry: (rank.get(entry[1], len(rank)), entry[0]))
            reason = "low health"
        else:
            pending.sort(key=lambda entry: entry[0])
            reason = "available"

        slot, orb_id = pending[0]
        try:
            await self.page.keyboard.press(str(slot + ORB_KEY_OFFSET))
        except Exception as exc:
            LOGGER.warning("could not use orb %s: %s", orb_id, exc)
            return
        self._orb_pending.add((slot, orb_id))
        self._orb_cooldown_until = now + ORB_COOLDOWN_S
        LOGGER.info(
            "using orb %s from slot %d (%s, hp=%.0f%%)",
            orb_id,
            slot + 1,
            reason,
            hp_ratio * 100.0,
        )

    async def _visible(self, selector: str) -> bool:
        try:
            return await self.frame.locator(selector).is_visible()
        except Exception:
            return False

    async def _wait_for_optional(self, selector: str, timeout_ms: int) -> bool:
        """Wait for a selector to show up without raising when it never does."""

        deadline = time.monotonic() + timeout_ms / 1000.0
        while True:
            if await self._visible(selector):
                return True
            if time.monotonic() >= deadline:
                return False
            await asyncio.sleep(0.10)

    async def _toast_text(self) -> str:
        """Read the game's toast message, even while it is fading out."""

        try:
            toast = self.frame.locator(TOAST_SELECTOR)
            if await toast.count() == 0:
                return ""
            return (await toast.first.text_content() or "").strip()
        except Exception:
            return ""

    async def _wait_for_toast_change(self, previous: str, timeout_ms: int = 6_000) -> str:
        """Wait for the toast to report something new after the save button."""

        deadline = time.monotonic() + timeout_ms / 1000.0
        while time.monotonic() < deadline:
            text = await self._toast_text()
            if text and text != previous:
                return text
            await asyncio.sleep(0.10)
        return ""

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
    parser.add_argument(
        "--csv",
        default="runs.csv",
        help="CSV file where finished-run stats are appended (empty string disables)",
    )
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
        csv_path=args.csv,
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
