┌──────────────────────────────────────────────────────────────────────────────┐
│                    🟨  STICKER SQUAD — DESIGN DOCUMENT  🟨                    │
│              Low-Poly 3D Command Game — Implementation Ideas                  │
└──────────────────────────────────────────────────────────────────────────────┘


🎮 CORE CONCEPT
═══════════════
You play as GLITCH — a sentient sticker brought to life by spilled glitter-glue.
The world is a child's bedroom (or craft table) seen from sticker-scale.
Everything is low-poly, chunky, and colorful. You are literally flat.

The central mechanic: because you are a STICKER, you can:
  • Walk on floors, walls, and ceilings (stick to any surface)
  • Peel off with a satisfying curl animation
  • Place "decal commands" on objects to interact with them
  • Recruit other stickers into your squad


📐 LOW-POLY AESTHETIC GUIDELINES
════════════════════════════════
  ─ Geometry ─
    • Use faceted shading (flat normals) — no smooth shading
    • Sharp edges, no bevels (or micro-bevels only)
    • Reuse simple primitives: boxes (8 verts), cylinders (6-8 sides), cones (5-6 sides)
    • Emissive "matte" materials, not glossy PBR
    • Palette: bold saturated colors with distinct value ranges per object type

  ─ Level of Detail ─
    • Since the camera is fairly close, keep draw calls low (~50-100 objects visible)
    • Occlusion culling suggested for larger rooms
    • Billboard particles for dust/sparkles instead of 3D meshes

  ─ Shading ─
    • Lambert or Toon (stepped ramp) materials work best
    • Hemisphere sky + single directional with contact shadows
    • Optional: simple vertex color for cheap variation on repeated meshes


🏗️ ARCHITECTURE IDEAS
══════════════════════

Below are stacked tiers from simple (what I built) to advanced:

─────────────────────────────────────────────────────────────────────────────
TIER 1 — Browser-based WebGL (Three.js / Babylon.js)   ← DEMO IMPLEMENTED
─────────────────────────────────────────────────────────────────────────────
Best for: Prototyping, instant sharing, no install
  Stack: Vanilla JS + Three.js (or R3F for React devs)
  Physics: Custom simple AABB+gravity, or Cannon.js/Oimo.js
  Input: PointerLock for FPS feel, or orbit for mobile
  Audio: Web Audio API (procedural beeps + optional Howler.js)

  Player controller structure:
    class StickerController {
      state: 'grounded' | 'air' | 'sticking' | 'peeling'
      surfaceNormal: Vec3    // what we're stuck to
      yaw: number            // facing direction
      pos, vel: Vec3
      peelAnimation: number  // 0..1 progress
      stick(surface, normal) { ... }
      peel() { ... }
      move(input, dt) { ... }
    }

  Surface-sticking trick (the core):
    When you stick to a wall, you don't rotate the player to align with the wall.
    Instead, you ROTATE THE ENTIRE WORLD NODE so the wall becomes "down".
    Then your gravity, movement logic, and camera "just work" with minor tweaks.
    This avoids complex projection math and gimbal lock headaches.

    worldNode.rotation = quaternion_from_vectors(old_up, surface_normal);
    // player now always thinks Y is "up"

    The only wrinkle: spawn placed objects (stickers, particles) in world-space
    before or after the rotation depending on desired behavior.

─────────────────────────────────────────────────────────────────────────────
TIER 2 — Unity (URP with toon shader)
─────────────────────────────────────────────────────────────────────────────
Best for: Shipping to Steam, mobile, consoles
  Rendering: URP + custom HLSL toon shader (ramp-based, with rim light)
  Physics: CharacterController component for player, Rigidbodies for props
  Sticking: Use CharacterController with custom collision flags to detect walls.
    On stick command:
      • Disable standard gravity
      • Set "up" vector to surface normal
      • Rotate camera anchor to match
      • Custom "wall-run" input mapping (WASD becomes planar to surface)

  Unity-specific low-poly tricks:
    • Import meshes with "Normals: Calculate" + angle 0 for faceted look
    • Use ProBuilder for greyboxing rooms directly in editor
    • Timeline for peel animations (shine/curl curve)

  Asset pipeline:
    • Mixamo animations for basic walk cycles → exported as low-poly by
      decimating or using a "blocky" avatar
    • Sprite-based faces projected onto flat avatar face mesh

─────────────────────────────────────────────────────────────────────────────
TIER 3 — Godot 4 (GDScript or C#)
─────────────────────────────────────────────────────────────────────────────
Best for: Open-source development, lightweight iteration
  Rendering: Forward+ with custom ShaderMaterial (cel-shading)
  Physics: CharacterBody3D + move_and_slide with wall-normal queries
  Sticking: Godot's _integrate_forces on RigidBody3D, or raycast-based
    surface-snapping on CharacterBody3D. Godot's basis vectors make
    re-orienting "up" fairly ergonomic:

      var new_up = raycast.get_collision_normal()
      var target_basis = Basis.looking_at(-new_up, Vector3.FORWARD)
      global_transform.basis = global_transform.basis.slerp(target_basis, delta*5)

  Godot advantages:
    • Built-in CSG for rapid level prototyping (CSGBox, CSGPolygon)
    • Excellent 2D-in-3D support for sticker faces/decals (SubViewports)

─────────────────────────────────────────────────────────────────────────────
TIER 4 — Custom Engine / Rust (wgpu + rapier3d)
─────────────────────────────────────────────────────────────────────────────
Best for: Learning, extreme performance, WebGPU future-proofing
  Stack: Rust + wgpu + rapier3d + egui
  Architecture:
    • ECS (hecs or bevy_ecs) for game objects
    • Component: SurfaceAgent { normal: Vec3, adhesion: f32 }
    • System: reorient gravity vector for entities with SurfaceAgent
    • Render: instanced low-poly mesh batching


🎭 THE STICKER CHARACTER — DESIGN DEPTH
════════════════════════════════════════

  Visual Identity:
    • The character is a golden-yellow circle, about 2-3mm thick
    • Slight cylindrical edge visible when viewed from side
    • Eyes and mouth are printed/decal features on the top face
    • Optional: torn/creased edge geometry for personality

  Animation States:
    ┌────────────┬─────────────────────────────────────────────┐
    │ IDLE       │ Subtle breathe (scale Y 0.98..1.02), eyes blink │
    │ WALK       │ Sticker wobbles side-to-side, tiny "leg" stubs pop out  │
    │ JUMP/PEEL  │ Back edge lifts first (curl animation), peeling sound   │
    │ STUCK      │ Flatten completely against surface, slight slide drift  │
    │ COMMAND    │ Hand-drawn "pointer" icon appears above head            │
    │ DAMAGE     │ Crinkle overlay, corner tears, particles of paper bits  │
    │ DEATH      │ Crumple into a ball, roll away                          │
    └────────────┴─────────────────────────────────────────────┘

  Customization:
    • Players unlock different sticker "skins": glitter, holographic,
      matte, puffy (thick edge), torn vintage,neon vinyl, etc.
    • Each skin changes the material properties and sound effects


🧩 GAMEPLAY SYSTEMS — IDEAS TO EXPAND
═══════════════════════════════════════

  1. COMMAND SQUAD
     Recruit other sticker characters you find in the world.
     • Hold Q to bring up a radial command wheel:
       [Follow] [Stay] [Go To] [Attack] [Place Sticker]
     • Squad members inherit your current "sticker type" skin
     • Chain commands: click an object → click a squad member → they execute

  2. DECAL INTERACTIONS
     Placing stickers on objects isn't just cosmetic:
     • Place a "BOMB" sticker → counts down, blows up weak walls
     • Place a "SPRING" sticker → object gains bounce physics
     • Place a "EYE" sticker → reveals hidden paths
     • Place a "MUTE" sticker → silences squeaky toys (stealth)

  3. PAPER PHYSICS PUZZLES
     • Fan obstacles: your flat body gets blown around
     • Spilled liquid: avoid it or you dissolve (game over)
     • Scissors: moving hazard that cuts your path
     • Folded paper mountains: unfold them by finding the crease

  4. SCALE & PERSPECTIVE
     The "room" is the world. Different zones:
     • Desk (wood grain = rough terrain)
     • Bed (soft, bouncy cloth physics)
     • Carpet (tall grass analog)
     • Window sill (ice physics — slippery)
     • Trash bin (dungeon — dark, enemies: mold spores)

  5. PHOTO MODE / STICKER ALBUM
     • Pause game → free camera with stickers you collected
     • Take screenshots, add filters
     • Export as actual PNG with transparent background

  6. MULTIPLAYER (COUCH OR ONLINE)
     • Each player is a different colored sticker
     • Cooperative puzzles requiring two stickers to bridge gaps
     • Competitive: "Sticker Tag" — stick to a moving object without falling

  7. LEVEL EDITOR
     • Players place primitives (blocks, cylinders) to build rooms
     • Texture them with real photos of desk surfaces
     • Share levels as JSON/URL-encoded strings


🗺️ LEVEL DESIGN IDEAS
══════════════════════

  Tutorial — "The Desk"
    • Flat open space with few obstacles
    • Teach: move, jump, stick to first wall (a book spine)
    • Exit: a pencil that acts as a bridge to the next zone

  Zone 2 — "The Bookshelf"
    • Vertical level: climb up book spines and ledges
    • Hazard: bookmark tassels that swing and knock you off
    • Mechanic: stick to vertical book faces to wait for swinging hazard

  Zone 3 — "The Floor"
    • Carpet = tall grass (obscured vision)
    • Legos = platforms with different physics (some slippery, some sticky)
    • Dust bunnies = enemies you must recruit or sneak past

  Zone 4 — "The Window"
    • Light beams = safe zones that recharge your "stickiness meter"
    • Outside skybox visible through glass
    • Raindrop races: jump between raindrops sliding down the glass

  Zone 5 — "The Backpack"
    • Dark, maze-like level inside a school bag
    • Crumpled paper tunnels
    • Flashlight battery = limited light source
    • Boss: a dryer sheet ghost that tries to smooth you out


🔊 AUDIO & SFX DIRECTION
════════════════════════

  Music: Chiptune + acoustic instruments hybrid
    • Toy piano, kalimba, pizzicato strings
    • Lofi beats for slower exploration zones
    • Intensity increases when "peeling" or in danger

  Sound Design:
    • Walk: light "pbbt pbbt" paper-tapping sounds
    • Jump/Peel: adhesive tape peel sound, pitched up
    • Stick to wall: satisfying "thwump" or "shoop"
    • Place decal: rubber-stamp "thok"
    • Damage: paper crumple, tearing
    • Menu/UI: sticker-peel transitions between screens


📦 DATA STRUCTURES (PSEUDO-CODE)
═════════════════════════════════

  SurfaceAgent {
    Vector3 currentNormal;      // what direction is "up" for this entity?
    Vector3 previousNormal;
    float adhesionStrength;     // 0..1, can be weakened by water/oil
    bool isPeeling;
    float peelProgress;         // 0..1 animation
  }

  StickerCharacter {
    SurfaceAgent surface;
    Vector3 position;           // world space
    Vector3 velocity;
    float yaw;                  // facing direction (always around local Y)
    uint skinId;
    array<StickerAbility> abilities;
    float stickinessMeter;      // drains while on ceilings, recharges on floors
  }

  DecalSticker {
    Vector3 position;
    Vector3 normal;             // surface it was placed on
    uint type;                  // bomb, spring, eye, etc.
    float lifetime;             // some stickers are temporary
    Entity* parentObject;       // if placed on moving object
  }

  WorldNode {
    Transform transform;
    Mesh* mesh;
    bool isDynamic;
    array<DecalSticker> decals; // stickers placed on this object
  }

  GameState {
    WorldNode root;             // entire world rotates to match player "up"
    StickerCharacter player;
    array<StickerCharacter> squad;
    array<WorldNode> objects;
    Level currentLevel;
  }


🚀 PERFORMANCE NOTES
════════════════════
  • Character is always the "hero" mesh: reduce polygon count elsewhere
  • Use instancing for repeated objects (trees, rocks, books)
  • Decals: use projected mesh decals (not true deferred decals) for
    compatibility with toon shading. Limit active decals to 64-128.
  • Shadows: directional cascades for sun, contact shadows for proximity
  • Mobile: reduce shadow map resolution, cap physics iterations


✨ QUICK START CHECKLIST
════════════════════════
  ☐ Create flat player mesh (cylinder with very small height)
  ☐ Implement basic WASD + jump on a flat plane
  ☐ Add raycast for wall detection in front of player
  ☐ On interact key: rotate world node so wall normal becomes world +Y
  ☐ Add "peel" animation state that reverses world rotation
  ☐ Build one simple room with books, pencils, erasers (low-poly)
  ☐ Add one collectible and one NPC target
  ☐ Juice: particles, squash-and-stretch, screen shake on land
  ☐ Iterate!


─────────────────────────────────────────────────────────────────────────────
Built by assistant • Play the demo: open `sticker-squad-3d.html` in a browser
─────────────────────────────────────────────────────────────────────────────
