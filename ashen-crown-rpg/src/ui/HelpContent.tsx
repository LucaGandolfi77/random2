export function HelpContent() {
  return (
    <div className="help-content">
      <section>
        <h3>Exploring Elarion</h3>
        <p>
          Click or tap the ground to walk. Glowing markers are people, doors, relics, and dangers. Click a marker to
          interact. Use <strong>WASD</strong> or the arrow keys on desktop, or the joystick on touch screens. The mouse
          wheel zooms the camera.
        </p>
      </section>
      <section>
        <h3>Checks &amp; Consequences</h3>
        <p>
          Dialogue choices marked with a skill and DC trigger a d20 check: die + attribute modifier + proficiency
          against the difficulty class. A natural 20 always succeeds; a natural 1 always fails. Failures are not dead
          ends — they are different roads.
        </p>
      </section>
      <section>
        <h3>Tactical Combat</h3>
        <p>
          Combat is turn-based. Each turn a character has <strong>3 Action Points</strong> and a movement allowance.
          Moving costs movement, not AP. Abilities cost AP plus class resource. Click a reachable tile to move, an enemy
          to attack, or choose an ability and then a target.
        </p>
        <ul>
          <li><strong>Cover</strong> from walls, trees, and rubble raises a target’s AC against ranged attacks.</li>
          <li><strong>Surfaces</strong> matter: lightning spreads through water, cold freezes it, fire burns in oil.</li>
          <li><strong>Shove</strong> and statuses can change the shape of a fight without dealing damage.</li>
          <li><strong>Downed</strong> allies sit out the rest of the battle. Rest, potions, or healing after combat can restore them.</li>
        </ul>
      </section>
      <section>
        <h3>Party &amp; Companions</h3>
        <p>
          Up to four characters fight at once. Recruited companions wait in reserve and can be swapped from the Party
          screen. Their approval changes with your choices, and each has a personal quest that matters in the final
          chapter.
        </p>
      </section>
      <section>
        <h3>Saving</h3>
        <p>
          The game autosaves before battles, after victories, and when you travel. You can also keep three manual
          chronicles. Saves live in your browser — no account, no server.
        </p>
      </section>
      <section>
        <h3>Keyboard</h3>
        <div className="key-list">
          <span><kbd>I</kbd> Inventory</span>
          <span><kbd>J</kbd> Journal</span>
          <span><kbd>C</kbd> Character</span>
          <span><kbd>P</kbd> Party</span>
          <span><kbd>M</kbd> Map</span>
          <span><kbd>F</kbd> Search</span>
          <span><kbd>R</kbd> Rest</span>
          <span><kbd>H</kbd> Help</span>
          <span><kbd>Esc</kbd> Close / Settings</span>
          <span><kbd>1–6</kbd> Combat abilities</span>
          <span><kbd>Space</kbd> End turn</span>
        </div>
      </section>
    </div>
  );
}
