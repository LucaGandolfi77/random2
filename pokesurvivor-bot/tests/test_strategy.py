#!/usr/bin/env python3
"""Focused tests for the WASD movement decisions."""

from __future__ import annotations

import os
import sys
import unittest


HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.dirname(HERE))

from bot import (  # noqa: E402
    BotConfig,
    BotError,
    PokéSurvivorBot,
    _card_score,
    parse_args,
    patch_game_bundle,
)
from strategy import Snapshot, SurvivalStrategy  # noqa: E402


def snapshot(payload: dict) -> Snapshot:
    return Snapshot.from_payload(payload)


class StrategyTests(unittest.TestCase):
    def test_slot_one_attack_upgrade_beats_generic_attack_power(self) -> None:
        slot_one = _card_score("Ember Lv. 1 > 2", False, preferred_attack="Ember")
        power = _card_score("Power +10% damage", False, preferred_attack="Ember")
        self.assertGreater(slot_one, power)

    def test_attack_power_beats_a_generic_survival_stat(self) -> None:
        attack_power = _card_score("Power +10% damage", False)
        health = _card_score("Vigor +20 max health", False)
        self.assertGreater(attack_power, health)

    def test_username_mode_prompts_for_a_hidden_password(self) -> None:
        config = parse_args(
            ["--username", "  trainer  "],
            password_reader=lambda prompt: "secret-value",
        )
        self.assertEqual(config.username, "trainer")
        self.assertEqual(config.password, "secret-value")
        self.assertNotIn("secret-value", repr(config))

    def test_bundle_probe_does_not_depend_on_obfuscated_variable_name(self) -> None:
        original = b"const q7={Flow:{boot:()=>1}};then(()=>q7['Flow']['boot']());"
        patched, installed = patch_game_bundle(original)
        self.assertTrue(installed)
        self.assertIn(b"window.__PS_BOT_G=q7,q7['Flow']['boot']()", patched)

    def test_moves_toward_a_safe_pickup_when_no_enemy_is_near(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 100, "maxHp": 100},
                    "pickups": [{"x": 180, "y": 0, "kind": "xp"}],
                }
            ),
            now=0.0,
        )
        self.assertIn("d", keys)

    def test_moves_away_from_an_enemy_inside_the_danger_radius(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 100, "maxHp": 100},
                    "enemies": [{"x": 35, "y": 0, "r": 16}],
                }
            ),
            now=0.0,
        )
        self.assertIn("a", keys)

    def test_leaves_an_imminent_zone_warning(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 30, "y": 0, "hp": 100, "maxHp": 100},
                    "hazards": [
                        {"kind": "zone", "x": 0, "y": 0, "r": 80, "t": 0.9, "delay": 1.0}
                    ],
                }
            ),
            now=0.0,
        )
        self.assertIn("d", keys)

    def test_dead_player_releases_all_movement_keys(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 0, "maxHp": 100, "dead": True},
                }
            ),
            now=0.0,
        )
        self.assertEqual(keys, frozenset())

    def test_avoids_a_wall_raised_terrain_to_the_right(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 100, "maxHp": 100},
                    "terrain": [{"x": 32, "y": 0, "kind": "wall"}],
                }
            ),
            now=0.0,
        )
        self.assertIn("a", keys)

    def test_avoids_liquid_to_the_right(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 100, "maxHp": 100},
                    "terrain": [{"x": 32, "y": 0, "kind": "liquid"}],
                }
            ),
            now=0.0,
        )
        self.assertIn("a", keys)

    def test_avoids_a_tree_to_the_right(self) -> None:
        strategy = SurvivalStrategy()
        keys = strategy.choose(
            snapshot(
                {
                    "state": "playing",
                    "player": {"x": 0, "y": 0, "hp": 100, "maxHp": 100},
                    "props": [{"x": 32, "y": 0, "type": "tree", "r": 13, "solid": True}],
                }
            ),
            now=0.0,
        )
        self.assertIn("a", keys)


class FakeLoginLocator:
    def __init__(self, frame: "FakeLoginFrame", selector: str) -> None:
        self.frame = frame
        self.selector = selector

    async def fill(self, value: str) -> None:
        self.frame.values[self.selector] = value

    async def click(self) -> None:
        if self.selector in {"#rec-never", "#rec-later"}:
            self.frame.visible["#scr-recover"] = False
            self.frame.recovery_choice = self.selector
            return
        if self.selector != "#btn-auth":
            return
        self.frame.visible["#scr-login"] = False if not self.frame.login_error else True
        self.frame.visible["#scr-menu"] = not self.frame.login_error
        self.frame.error_text = self.frame.login_error

    async def is_visible(self) -> bool:
        return self.frame.visible.get(self.selector, False)

    async def text_content(self) -> str:
        return self.frame.error_text if self.selector == "#login-err" else ""

    async def wait_for(self, state: str, timeout: int) -> None:
        if state == "visible" and not await self.is_visible():
            raise RuntimeError(f"{self.selector} is not visible")


class FakeLoginFrame:
    def __init__(self, login_error: str = "") -> None:
        self.login_error = login_error
        self.error_text = ""
        self.recovery_choice = None
        self.values: dict[str, str] = {}
        self.visible = {
            "#scr-login": True,
            "#scr-menu": False,
            "#login-err": True,
            "#scr-recover": False,
        }

    def locator(self, selector: str) -> FakeLoginLocator:
        return FakeLoginLocator(self, selector)


class LoginFlowTests(unittest.IsolatedAsyncioTestCase):
    async def test_login_fills_form_and_clears_password_after_success(self) -> None:
        frame = FakeLoginFrame()
        bot = PokéSurvivorBot(
            BotConfig(username="trainer", password="secret-value", timeout_ms=500),
            page=None,
            frame=frame,
        )

        await bot._login_with_credentials()

        self.assertEqual(frame.values["#f-user"], "trainer")
        self.assertEqual(frame.values["#f-pass"], "")
        self.assertTrue(frame.visible["#scr-menu"])

    async def test_login_error_is_reported_without_guest_fallback(self) -> None:
        frame = FakeLoginFrame(login_error="Nombre o contraseña incorrectos")
        bot = PokéSurvivorBot(
            BotConfig(username="trainer", password="wrong", timeout_ms=500),
            page=None,
            frame=frame,
        )

        with self.assertRaisesRegex(BotError, "contraseña incorrectos"):
            await bot._login_with_credentials()

        self.assertTrue(frame.visible["#scr-login"])
        self.assertFalse(frame.visible["#scr-menu"])
        self.assertEqual(frame.values["#f-pass"], "")

    async def test_email_link_prompt_chooses_do_not_ask_again(self) -> None:
        frame = FakeLoginFrame()
        frame.visible["#scr-recover"] = True
        frame.visible["#rec-never"] = True
        frame.visible["#rec-later"] = True
        bot = PokéSurvivorBot(
            BotConfig(username="trainer", password="secret-value", timeout_ms=500),
            page=None,
            frame=frame,
        )

        await bot._dismiss_recovery_prompt()

        self.assertEqual(frame.recovery_choice, "#rec-never")
        self.assertFalse(frame.visible["#scr-recover"])

    async def test_email_link_prompt_falls_back_to_not_now(self) -> None:
        frame = FakeLoginFrame()
        frame.visible["#scr-recover"] = True
        frame.visible["#rec-later"] = True
        bot = PokéSurvivorBot(
            BotConfig(username="trainer", password="secret-value", timeout_ms=500),
            page=None,
            frame=frame,
        )

        await bot._dismiss_recovery_prompt()

        self.assertEqual(frame.recovery_choice, "#rec-later")
        self.assertFalse(frame.visible["#scr-recover"])


class FakeSaveLocator:
    def __init__(self, frame: "FakeSaveFrame", selector: str) -> None:
        self.frame = frame
        self.selector = selector

    @property
    def first(self) -> "FakeSaveLocator":
        return self

    async def click(self, timeout: int = 0) -> None:
        self.frame.clicked.append(self.selector)
        if self.selector == "#btn-save":
            self.frame.toast = "¡Partida guardada en la nube!"

    async def count(self) -> int:
        return 1 if self.frame.toast else 0

    async def is_visible(self) -> bool:
        return self.frame.visible.get(self.selector, False)

    async def text_content(self) -> str:
        return self.frame.toast


class FakeSaveFrame:
    def __init__(self, save_visible: bool = True) -> None:
        self.visible = {"#btn-save": save_visible}
        self.clicked: list[str] = []
        self.toast = ""

    def locator(self, selector: str) -> FakeSaveLocator:
        return FakeSaveLocator(self, selector)


class SaveRunTests(unittest.IsolatedAsyncioTestCase):
    async def test_presses_the_save_button_after_a_run(self) -> None:
        frame = FakeSaveFrame(save_visible=True)
        bot = PokéSurvivorBot(BotConfig(timeout_ms=500), page=None, frame=frame)

        await bot._save_run(1)

        self.assertEqual(frame.clicked, ["#btn-save"])

    async def test_skips_the_save_button_when_the_game_hides_it(self) -> None:
        frame = FakeSaveFrame(save_visible=False)
        bot = PokéSurvivorBot(BotConfig(timeout_ms=500), page=None, frame=frame)

        await bot._save_run(1)

        self.assertEqual(frame.clicked, [])

    async def test_finish_run_goes_back_to_the_menu_before_saving(self) -> None:
        frame = FakeSaveFrame(save_visible=True)
        bot = PokéSurvivorBot(BotConfig(timeout_ms=500), page=None, frame=frame)
        order: list[str] = []

        async def fake_return_to_menu() -> None:
            order.append("menu")

        async def fake_save_run(run_number: int) -> None:
            order.append("save")

        bot._return_to_menu = fake_return_to_menu  # type: ignore[method-assign]
        bot._save_run = fake_save_run  # type: ignore[method-assign]

        await bot._finish_run(1)

        self.assertEqual(order, ["menu", "save"])

    async def test_finish_run_survives_a_menu_that_never_appears(self) -> None:
        frame = FakeSaveFrame(save_visible=True)
        bot = PokéSurvivorBot(BotConfig(timeout_ms=500), page=None, frame=frame)

        async def failing_return_to_menu() -> None:
            raise BotError("timed out waiting for visible #scr-menu")

        bot._return_to_menu = failing_return_to_menu  # type: ignore[method-assign]

        await bot._finish_run(1)

        self.assertEqual(frame.clicked, [])


if __name__ == "__main__":
    unittest.main()
