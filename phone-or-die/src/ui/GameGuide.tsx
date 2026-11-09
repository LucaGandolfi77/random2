export function GameGuide() {
  return (
    <div className="guide">
      <section>
        <h3>The loop</h3>
        <p>
          Every step brings the shadows closer. Call people to push them back and to gain a short shield measured in steps.
          The shield is consumed as you walk; an active call also makes the street hesitate.
        </p>
      </section>
      <section>
        <h3>Distance is not safety</h3>
        <p>
          At 20% footsteps follow you. At 40% the street starts repeating. At 60% the shadows walk beside you. At 100%
          they take you. Watch the shadow distance, the streetlights, and the sky.
        </p>
      </section>
      <section>
        <h3>Battery</h3>
        <p>
          Every call drains the phone. The all-night kiosk has two charges. A power bank waits in a lost-and-found box,
          and spare batteries can be found in the alley. The flashlight also drains the battery slowly.
        </p>
      </section>
      <section>
        <h3>Trust and secrets</h3>
        <p>
          Different contacts provide different protection. Repeated calls to the same person are less effective.
          Asking real questions can reveal clues. Streetlights slow the shadows, but never stop them. Standing still is only
          safe for a few seconds before the road notices.
        </p>
      </section>
      <section>
        <h3>Controls</h3>
        <div className="guide-keys">
          <span><kbd>WASD</kbd> / arrows move</span>
          <span><kbd>E</kbd> interact</span>
          <span><kbd>Tab</kbd> phone</span>
          <span><kbd>F</kbd> flashlight</span>
          <span><kbd>Esc</kbd> pause</span>
          <span>Touch: joystick + buttons</span>
        </div>
      </section>
    </div>
  );
}
