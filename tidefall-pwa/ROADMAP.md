# TIDEFALL Roadmap

## Completed

### Milestone 1 - Playable prototype
- [x] Original concept and visual identity: Ashen Meridian / Tidefall.
- [x] Modular offline PWA shell.
- [x] Inertia navigation and tap-to-course.
- [x] Touch helm and action buttons.
- [x] Camera-following open sea with islands and port.
- [x] AI state machine for merchants, pirates and hunters.
- [x] Captain traits: aggression, courage, tactics, greed, loyalty, ambition.
- [x] Targeting, cannon shots, cooldowns, damage and sinking.
- [x] Salvage collection, HUD and minimap.
- [x] IndexedDB persistence with a fallback.

### Milestone 2 - Story and extended gameplay (vertical slice)
- [x] Three-chapter campaign with five sequential contracts.
- [x] Four ports, dockside dialogue, market, shipyard and cargo hold.
- [x] Trade, sell, repair, cannon upgrades and captain levels.
- [x] Captain journal with faction standing, relationships and save import/export.
- [x] Campaign, inventory and relationship persistence.
- [x] Four ammunition types, limited stock, port resupply and field repair ability.
- [x] Sea monster hunts, timed treasure charts and captain bounties.
- [x] Dynamic world event notices and persistent monster/bounty state.
- [x] Explorable landmarks with lore, salvageable wrecks and charted discovery log.
- [x] Region-based sea identity and threat level in the HUD.
- [x] Shared math utilities and camera-bounded wave rendering.

## Completion criteria for the next milestones

### Milestone 2 - Gameplay and AI
- 4 ammunition families with cost and damage profiles.
- Mission contracts, inventory and captain XP.
- Relationship journal with hostility, trust, bounty and memory events.
- Combat AI with flank/retreat/reinforce decisions.

### Milestone 3 - Living world
- 5 factions, 6 regions, ports and trade routes.
- Abstract distant simulation and deterministic world event journal.
- Dynamic faction war and territory control.

### Milestone 4 - Advanced progression
- 10 original vessels, equipment slots and upgrade comparisons.
- Boss patterns, recruitable companions and fleet orders.
- Market prices driven by local supply and demand.

### Milestone 5 - Persistence
- Versioned IndexedDB schema and migration.
- Export/import validation and offline elapsed-time simulation.
- Save recovery and conflict-free autosave.

### Milestone 6 - Release
- Mobile performance budget and memory profiling.
- Automated smoke tests at desktop and landscape phone sizes.
- PWA install/update flow and accessibility pass.
