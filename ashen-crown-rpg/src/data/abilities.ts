import type { AbilityDef } from '@/core/types';

export const abilities: AbilityDef[] = [
  // ── Warrior ────────────────────────────────────────────────────────────────
  {
    id: 'cleave', name: 'Cleave', description: 'A wide, brutal cut that damages the target and every enemy adjacent to it.',
    classId: 'warrior', level: 1, resourceCost: 1, apCost: 1, range: 1, radius: 1, target: 'enemy',
    damageType: 'physical', dice: '1d8', scaling: 'str', icon: '⚔', cooldown: 0, animation: 'slash',
    tags: ['melee', 'area'], ai: 4
  },
  {
    id: 'shield_bash', name: 'Shield Bash', description: 'Drive your shield into a foe, dealing damage and stunning them for one turn.',
    classId: 'warrior', level: 1, resourceCost: 1, apCost: 1, range: 1, target: 'enemy',
    damageType: 'physical', dice: '1d4', scaling: 'str', status: 'stunned', statusDuration: 1, icon: '🛡',
    cooldown: 2, animation: 'bash', tags: ['melee', 'control'], ai: 5
  },
  {
    id: 'rallying_cry', name: 'Rallying Cry', description: 'A command that refuses despair. Nearby allies gain Blessed for three turns.',
    classId: 'warrior', level: 1, resourceCost: 2, apCost: 1, range: 0, radius: 3, target: 'self',
    status: 'blessed', statusDuration: 3, icon: '❖', cooldown: 3, animation: 'shout', tags: ['support', 'buff'], ai: 6,
    noAttackRoll: true
  },
  {
    id: 'second_wind', name: 'Second Wind', description: 'Breathe through the pain and recover a measure of health.',
    classId: 'warrior', level: 2, resourceCost: 0, apCost: 1, range: 0, target: 'self',
    healing: '1d10', scaling: 'con', icon: '♨', cooldown: 4, animation: 'heal', tags: ['heal'], ai: 3, noAttackRoll: true
  },
  {
    id: 'execute', name: 'Executioner’s Verdict', description: 'Strike a wounded enemy for heavy damage. Deals double damage below 30% health.',
    classId: 'warrior', level: 4, resourceCost: 2, apCost: 2, range: 1, target: 'enemy',
    damageType: 'physical', dice: '2d8', scaling: 'str', icon: '☠', cooldown: 3, animation: 'slash',
    tags: ['melee', 'finisher'], ai: 7
  },
  {
    id: 'blade_storm', name: 'Blade Storm', description: 'Become a whirlwind of steel, striking all enemies within two tiles.',
    classId: 'warrior', level: 6, resourceCost: 3, apCost: 2, range: 0, radius: 2, target: 'self',
    damageType: 'physical', dice: '2d6', scaling: 'str', icon: '✹', cooldown: 4, animation: 'whirl',
    tags: ['melee', 'area'], ai: 6
  },

  // ── Rogue ──────────────────────────────────────────────────────────────────
  {
    id: 'backstab', name: 'Backstab', description: 'Find the gap in armor and memory. Deals heavy damage when the target is engaged.',
    classId: 'rogue', level: 1, resourceCost: 1, apCost: 1, range: 1, target: 'enemy',
    damageType: 'physical', dice: '2d6', scaling: 'dex', icon: '🗡', cooldown: 0, animation: 'stab',
    tags: ['melee', 'burst'], ai: 5
  },
  {
    id: 'smoke_veil', name: 'Smoke Veil', description: 'Vanish into a cloud of ash and stolen breath. Gain Hidden and +3 AC for two turns.',
    classId: 'rogue', level: 1, resourceCost: 2, apCost: 1, range: 0, target: 'self',
    status: 'hidden', statusDuration: 2, icon: '◐', cooldown: 3, animation: 'smoke', tags: ['stealth', 'defense'], ai: 4,
    noAttackRoll: true
  },
  {
    id: 'poisoned_blade', name: 'Poisoned Blade', description: 'Coat your blade in gravewort. The target is poisoned for three turns.',
    classId: 'rogue', level: 1, resourceCost: 1, apCost: 1, range: 1, target: 'enemy',
    damageType: 'physical', dice: '1d4', scaling: 'dex', status: 'poisoned', statusDuration: 3, icon: '☠',
    cooldown: 1, animation: 'stab', tags: ['melee', 'status'], ai: 4
  },
  {
    id: 'shadowstep', name: 'Shadowstep', description: 'Step through a fold in the world to any visible tile within six spaces.',
    classId: 'rogue', level: 3, resourceCost: 2, apCost: 1, range: 6, target: 'ground',
    icon: '➤', cooldown: 3, animation: 'blink', tags: ['movement'], ai: 2, noAttackRoll: true
  },
  {
    id: 'eviscerate', name: 'Eviscerate', description: 'A cruel sequence of cuts. Deals 3d6 damage and applies Bleeding.',
    classId: 'rogue', level: 5, resourceCost: 3, apCost: 2, range: 1, target: 'enemy',
    damageType: 'physical', dice: '3d6', scaling: 'dex', status: 'bleeding', statusDuration: 3, icon: '🩸',
    cooldown: 3, animation: 'stab', tags: ['melee', 'burst'], ai: 8
  },
  {
    id: 'deathmark', name: 'Deathmark', description: 'Mark a target for death. Allies deal bonus damage to it, and it cannot hide.',
    classId: 'rogue', level: 6, resourceCost: 2, apCost: 1, range: 6, target: 'enemy',
    status: 'marked', statusDuration: 3, icon: '◎', cooldown: 3, animation: 'mark', tags: ['control'], ai: 5,
    noAttackRoll: true
  },

  // ── Mage ───────────────────────────────────────────────────────────────────
  {
    id: 'ember_lance', name: 'Ember Lance', description: 'A spear of concentrated flame. Deals fire damage and may leave the target burning.',
    classId: 'mage', level: 1, resourceCost: 2, apCost: 1, range: 6, target: 'enemy',
    damageType: 'fire', dice: '2d8', scaling: 'int', status: 'burning', statusDuration: 2, icon: '🔥',
    cooldown: 0, animation: 'firebolt', tags: ['range', 'fire'], ai: 5
  },
  {
    id: 'frost_nova', name: 'Frost Nova', description: 'A ring of killing frost. Damages and Chills all enemies within two tiles of the target point.',
    classId: 'mage', level: 1, resourceCost: 3, apCost: 2, range: 5, radius: 2, target: 'ground',
    damageType: 'cold', dice: '2d6', scaling: 'int', status: 'chilled', statusDuration: 2, icon: '❄',
    cooldown: 2, animation: 'frost', tags: ['area', 'cold'], ai: 6
  },
  {
    id: 'arcane_ward', name: 'Arcane Ward', description: 'Weave a lattice of force around an ally. Grants Shielded for three turns.',
    classId: 'mage', level: 1, resourceCost: 2, apCost: 1, range: 5, target: 'ally',
    status: 'shielded', statusDuration: 3, icon: '◇', cooldown: 2, animation: 'ward', tags: ['support', 'defense'], ai: 5,
    noAttackRoll: true
  },
  {
    id: 'chain_lightning', name: 'Chain Lightning', description: 'Lightning leaps between foes. Deals lightning damage in a two-tile radius and Shocks survivors.',
    classId: 'mage', level: 3, resourceCost: 3, apCost: 2, range: 6, radius: 2, target: 'ground',
    damageType: 'lightning', dice: '2d8', scaling: 'int', status: 'shocked', statusDuration: 2, icon: '⚡',
    cooldown: 3, animation: 'lightning', tags: ['area', 'lightning'], ai: 7
  },
  {
    id: 'mind_spike', name: 'Mind Spike', description: 'A needle of psychic force. Deals psychic damage and Frightens the target.',
    classId: 'mage', level: 4, resourceCost: 2, apCost: 1, range: 6, target: 'enemy',
    damageType: 'psychic', dice: '2d6', scaling: 'int', status: 'frightened', statusDuration: 2, icon: '◉',
    cooldown: 2, animation: 'psychic', tags: ['range', 'control'], ai: 5
  },
  {
    id: 'meteor', name: 'Ashen Meteor', description: 'Call down a burning fragment of a dead sky. Massive fire damage in a three-tile radius.',
    classId: 'mage', level: 6, resourceCost: 5, apCost: 3, range: 6, radius: 3, target: 'ground',
    damageType: 'fire', dice: '4d8', scaling: 'int', status: 'burning', statusDuration: 3, icon: '☄',
    cooldown: 5, animation: 'meteor', tags: ['area', 'fire', 'ultimate'], ai: 9
  },

  // ── Cleric ─────────────────────────────────────────────────────────────────
  {
    id: 'mend_wounds', name: 'Mend Wounds', description: 'Close flesh and quiet pain with a prayer older than language.',
    classId: 'cleric', level: 1, resourceCost: 2, apCost: 1, range: 5, target: 'ally',
    healing: '2d8', scaling: 'wis', icon: '✚', cooldown: 0, animation: 'heal', tags: ['heal'], ai: 6, noAttackRoll: true
  },
  {
    id: 'bless', name: 'Blessing of the Chain', description: 'Invoke the Covenant’s better promise. Allies near the target gain Blessed.',
    classId: 'cleric', level: 1, resourceCost: 2, apCost: 1, range: 5, radius: 2, target: 'ally',
    status: 'blessed', statusDuration: 3, icon: '✧', cooldown: 2, animation: 'bless', tags: ['support'],
    ai: 5, noAttackRoll: true
  },
  {
    id: 'sacred_flame', name: 'Sacred Flame', description: 'A column of pale fire that ignores cover and burns the guilty and innocent alike.',
    classId: 'cleric', level: 1, resourceCost: 1, apCost: 1, range: 5, target: 'enemy',
    damageType: 'holy', dice: '1d8', scaling: 'wis', status: 'burning', statusDuration: 1, icon: '✦',
    cooldown: 0, animation: 'holy', tags: ['range', 'holy'], ai: 5
  },
  {
    id: 'sanctuary', name: 'Sanctuary', description: 'A shield of remembered mercy. The target gains Warded for two turns.',
    classId: 'cleric', level: 2, resourceCost: 2, apCost: 1, range: 4, target: 'ally',
    status: 'warded', statusDuration: 2, icon: '🕊', cooldown: 3, animation: 'ward', tags: ['support', 'defense'],
    ai: 4, noAttackRoll: true
  },
  {
    id: 'revive', name: 'Call Back the Lost', description: 'Drag a fallen ally back from the threshold. Revives them with a fragment of health.',
    classId: 'cleric', level: 3, resourceCost: 4, apCost: 2, range: 4, target: 'ally',
    healing: '1d8', scaling: 'wis', icon: '✝', cooldown: 5, animation: 'revive', tags: ['heal', 'revive'],
    ai: 8, noAttackRoll: true
  },
  {
    id: 'divine_intervention', name: 'Divine Intervention', description: 'For one breath, the Covenant answers. Heals all allies within three tiles heavily.',
    classId: 'cleric', level: 5, resourceCost: 5, apCost: 2, range: 0, radius: 3, target: 'self',
    healing: '3d8', scaling: 'wis', status: 'regenerating', statusDuration: 3, icon: '☼', cooldown: 6,
    animation: 'holy', tags: ['heal', 'area', 'ultimate'], ai: 9, noAttackRoll: true
  },

  // ── Ranger ─────────────────────────────────────────────────────────────────
  {
    id: 'hunters_mark', name: 'Hunter’s Mark', description: 'Name your prey. It becomes Marked, and your attacks against it cut deeper.',
    classId: 'ranger', level: 1, resourceCost: 1, apCost: 1, range: 7, target: 'enemy',
    status: 'marked', statusDuration: 3, icon: '◎', cooldown: 1, animation: 'mark', tags: ['control'], ai: 5,
    noAttackRoll: true
  },
  {
    id: 'piercing_shot', name: 'Piercing Shot', description: 'A shot aimed through the seam of the world. Ignores cover and deals heavy damage.',
    classId: 'ranger', level: 1, resourceCost: 1, apCost: 1, range: 8, target: 'enemy',
    damageType: 'physical', dice: '2d8', scaling: 'dex', icon: '➶', cooldown: 0, animation: 'arrow',
    tags: ['range', 'pierce'], ai: 5
  },
  {
    id: 'ensnaring_roots', name: 'Ensnaring Roots', description: 'The earth remembers its claim. Roots grip enemies in a two-tile radius, Rooting them.',
    classId: 'ranger', level: 1, resourceCost: 2, apCost: 2, range: 6, radius: 2, target: 'ground',
    damageType: 'nature', dice: '1d6', scaling: 'wis', status: 'rooted', statusDuration: 2, icon: '🌿',
    cooldown: 2, animation: 'roots', tags: ['area', 'nature', 'control'], ai: 6
  },
  {
    id: 'volley', name: 'Ashen Volley', description: 'Loose a storm of arrows at a distant point, striking all enemies in a two-tile radius.',
    classId: 'ranger', level: 3, resourceCost: 3, apCost: 2, range: 8, radius: 2, target: 'ground',
    damageType: 'physical', dice: '2d6', scaling: 'dex', icon: '➷', cooldown: 3, animation: 'arrow',
    tags: ['area', 'range'], ai: 7
  },
  {
    id: 'beast_call', name: 'Call of the Thorn', description: 'A grey wolf answers your cry and fights beside you until the encounter ends.',
    classId: 'ranger', level: 5, resourceCost: 4, apCost: 2, range: 3, target: 'ground',
    icon: '🐺', cooldown: 6, animation: 'summon', tags: ['summon'], ai: 6, noAttackRoll: true
  },
  {
    id: 'camouflage', name: 'Ashen Camouflage', description: 'Sink into the land’s memory. Gain Hidden and Hasted for two turns.',
    classId: 'ranger', level: 6, resourceCost: 2, apCost: 1, range: 0, target: 'self',
    status: 'hidden', statusDuration: 2, icon: '◒', cooldown: 4, animation: 'smoke', tags: ['stealth'],
    ai: 3, noAttackRoll: true
  },

  // ── Warlock ────────────────────────────────────────────────────────────────
  {
    id: 'grave_bolt', name: 'Grave Bolt', description: 'A shard of the space between stars. Deals shadow damage and marks the target with dread.',
    classId: 'warlock', level: 1, resourceCost: 1, apCost: 1, range: 6, target: 'enemy',
    damageType: 'shadow', dice: '2d8', scaling: 'cha', status: 'cursed', statusDuration: 2, icon: '☾',
    cooldown: 0, animation: 'shadow', tags: ['range', 'shadow'], ai: 5
  },
  {
    id: 'hex_of_ruin', name: 'Hex of Ruin', description: 'Speak a name that should not be spoken. The target is Cursed and Weakened.',
    classId: 'warlock', level: 1, resourceCost: 2, apCost: 1, range: 6, target: 'enemy',
    status: 'cursed', statusDuration: 3, icon: '✶', cooldown: 2, animation: 'hex', tags: ['control'], ai: 5,
    noAttackRoll: true
  },
  {
    id: 'shadow_chains', name: 'Shadow Chains', description: 'Bind a foe in chains of their own regrets. The target is Rooted and takes shadow damage.',
    classId: 'warlock', level: 1, resourceCost: 2, apCost: 2, range: 5, target: 'enemy',
    damageType: 'shadow', dice: '1d8', scaling: 'cha', status: 'rooted', statusDuration: 2, icon: '⛓',
    cooldown: 2, animation: 'chains', tags: ['control', 'shadow'], ai: 6
  },
  {
    id: 'soul_siphon', name: 'Soul Siphon', description: 'Tear a thread from the target’s soul and stitch it into your own wounds.',
    classId: 'warlock', level: 3, resourceCost: 3, apCost: 2, range: 5, target: 'enemy',
    damageType: 'shadow', dice: '2d8', scaling: 'cha', healing: '1d8', icon: '♰', cooldown: 3,
    animation: 'siphon', tags: ['range', 'heal'], ai: 6
  },
  {
    id: 'dread_visions', name: 'Dread Visions', description: 'Show your enemies the world as it truly is. Frightens all foes in a two-tile radius.',
    classId: 'warlock', level: 4, resourceCost: 3, apCost: 2, range: 6, radius: 2, target: 'ground',
    damageType: 'psychic', dice: '1d6', scaling: 'cha', status: 'frightened', statusDuration: 2, icon: '👁',
    cooldown: 3, animation: 'psychic', tags: ['area', 'control'], ai: 6
  },
  {
    id: 'dark_pact', name: 'The Price', description: 'Offer your own blood for power. Lose 4 health and recover 3 Pact.',
    classId: 'warlock', level: 5, resourceCost: 0, apCost: 1, range: 0, target: 'self',
    icon: '◈', cooldown: 3, animation: 'pact', tags: ['resource'], ai: 2, noAttackRoll: true
  },

  // ── Specialization abilities ───────────────────────────────────────────────
  {
    id: 'bulwark_stance', name: 'Bulwark Stance', description: 'Plant your feet and become the wall the party stands behind. Gain Warded for three turns.',
    resourceCost: 2, apCost: 1, range: 0, target: 'self', status: 'warded', statusDuration: 3,
    icon: '⛨', cooldown: 3, animation: 'ward', tags: ['subclass', 'defense'], noAttackRoll: true
  },
  {
    id: 'blood_frenzy', name: 'Blood Frenzy', description: 'Let the old forge-heat take the wheel. Deal more damage, but expose yourself in return.',
    resourceCost: 2, apCost: 1, range: 0, target: 'self', status: 'enraged', statusDuration: 3,
    icon: '⚔', cooldown: 4, animation: 'shout', tags: ['subclass', 'rage'], noAttackRoll: true
  },
  {
    id: 'pale_thread', name: 'Pale Thread', description: 'Cut the invisible line between a body and its future. The target Bleeds.',
    resourceCost: 1, apCost: 1, range: 3, target: 'enemy', damageType: 'shadow', dice: '1d8', scaling: 'dex',
    status: 'bleeding', statusDuration: 3, icon: '➶', cooldown: 1, animation: 'stab', tags: ['subclass', 'shadow']
  },
  {
    id: 'mirror_feint', name: 'Mirror Feint', description: 'Show the enemy a death that has not happened yet. Psychic damage and Frightened.',
    resourceCost: 2, apCost: 1, range: 4, target: 'enemy', damageType: 'psychic', dice: '1d8', scaling: 'cha',
    status: 'frightened', statusDuration: 2, icon: '◈', cooldown: 2, animation: 'smoke', tags: ['subclass', 'control']
  },
  {
    id: 'meteor_sigil', name: 'Meteor Sigil', description: 'Write a falling star into the air. It lands as fire and leaves the ground burning.',
    resourceCost: 3, apCost: 2, range: 6, radius: 1, target: 'ground', damageType: 'fire', dice: '2d6', scaling: 'int',
    status: 'burning', statusDuration: 2, icon: '☄', cooldown: 3, animation: 'fire', tags: ['subclass', 'area', 'fire']
  },
  {
    id: 'time_slip', name: 'Time Slip', description: 'Borrow a heartbeat from a version of yourself who already moved. Gain Hasted.',
    resourceCost: 2, apCost: 1, range: 0, target: 'self', status: 'hasted', statusDuration: 2,
    icon: '⧗', cooldown: 4, animation: 'ward', tags: ['subclass', 'movement'], noAttackRoll: true
  },
  {
    id: 'sunburst', name: 'Sunburst', description: 'Open a small, furious dawn. Holy fire burns every enemy in the area.',
    resourceCost: 3, apCost: 2, range: 5, radius: 2, target: 'ground', damageType: 'holy', dice: '1d8', scaling: 'wis',
    icon: '☀', cooldown: 3, animation: 'holy', tags: ['subclass', 'area', 'holy']
  },
  {
    id: 'grave_ward', name: 'Grave Ward', description: 'Promise an ally that this is not their grave. Heal them and grant Regenerating.',
    resourceCost: 2, apCost: 1, range: 4, target: 'ally', healing: '1d8', scaling: 'wis',
    status: 'regenerating', statusDuration: 3, icon: '✝', cooldown: 3, animation: 'heal', tags: ['subclass', 'heal'], noAttackRoll: true
  },
  {
    id: 'thornwall', name: 'Thornwall', description: 'Call up a fence of black roots. Enemies in the area are damaged and Rooted.',
    resourceCost: 3, apCost: 2, range: 5, radius: 2, target: 'ground', damageType: 'nature', dice: '1d6', scaling: 'wis',
    status: 'rooted', statusDuration: 1, icon: '♣', cooldown: 3, animation: 'roots', tags: ['subclass', 'area', 'control']
  },
  {
    id: 'hexblade_cleave', name: 'Hexblade Cleave', description: 'The pact edge drinks. Strike the target and every adjacent enemy, causing Bleeding.',
    resourceCost: 2, apCost: 1, range: 1, radius: 1, target: 'enemy', damageType: 'physical', dice: '1d8', scaling: 'cha',
    status: 'bleeding', statusDuration: 2, icon: '☾', cooldown: 1, animation: 'slash', tags: ['subclass', 'melee']
  },
  {
    id: 'void_rift', name: 'Void Rift', description: 'Tear open the space behind the world. Shadow damage and a curse in a small area.',
    resourceCost: 3, apCost: 2, range: 5, radius: 1, target: 'ground', damageType: 'shadow', dice: '2d6', scaling: 'cha',
    status: 'cursed', statusDuration: 2, icon: '◉', cooldown: 3, animation: 'shadow', tags: ['subclass', 'area', 'shadow']
  },

  // ── Enemy abilities ────────────────────────────────────────────────────────
  {
    id: 'enemy_strike', name: 'Rusted Strike', description: 'A crude melee attack.', classId: 'enemy',
    resourceCost: 0, apCost: 1, range: 1, target: 'enemy', damageType: 'physical', dice: '1d8', icon: '⚔',
    tags: ['melee'], ai: 4
  },
  {
    id: 'enemy_shot', name: 'Hollow Shot', description: 'An arrow fired from a bow of bone.', classId: 'enemy',
    resourceCost: 0, apCost: 1, range: 7, target: 'enemy', damageType: 'physical', dice: '1d8', icon: '➶',
    tags: ['range'], ai: 4
  },
  {
    id: 'enemy_firebolt', name: 'Cinder Bolt', description: 'A bolt of unstable flame.', classId: 'enemy',
    resourceCost: 1, apCost: 1, range: 6, target: 'enemy', damageType: 'fire', dice: '1d8', icon: '🔥',
    status: 'burning', statusDuration: 2, tags: ['range', 'fire'], ai: 5
  },
  {
    id: 'enemy_heal', name: 'Ash Mend', description: 'A dark prayer that knits wounded flesh.', classId: 'enemy',
    resourceCost: 2, apCost: 1, range: 5, target: 'ally', healing: '1d8', icon: '✚', tags: ['heal'],
    ai: 6, noAttackRoll: true
  },
  {
    id: 'enemy_summon', name: 'Call the Hollow', description: 'Tears open a small wound in the world, summoning a Hollow Thrall.', classId: 'enemy',
    resourceCost: 2, apCost: 2, range: 3, target: 'ground', icon: '◌', tags: ['summon'], ai: 6, noAttackRoll: true
  },
  {
    id: 'enemy_curse', name: 'Memory Rot', description: 'A curse that makes the victim forget how to defend themselves.', classId: 'enemy',
    resourceCost: 1, apCost: 1, range: 6, target: 'enemy', damageType: 'shadow', dice: '1d6', status: 'cursed',
    statusDuration: 2, icon: '☾', tags: ['range', 'shadow'], ai: 5
  },
  {
    id: 'enemy_shadowstep', name: 'Shadow Fold', description: 'The assassin steps through darkness.', classId: 'enemy',
    resourceCost: 0, apCost: 1, range: 5, target: 'ground', icon: '➤', tags: ['movement'], ai: 3, noAttackRoll: true
  },
  {
    id: 'boss_sweep', name: 'Grave Sweep', description: 'A sweeping blow that strikes all nearby enemies.', classId: 'enemy',
    resourceCost: 1, apCost: 2, range: 0, radius: 2, target: 'self', damageType: 'physical', dice: '2d8', icon: '✹',
    tags: ['area'], ai: 7
  },
  {
    id: 'boss_wail', name: 'Drowned Wail', description: 'A wail of grief that damages all foes and Frightens them.', classId: 'enemy',
    resourceCost: 2, apCost: 2, range: 0, radius: 4, target: 'self', damageType: 'cold', dice: '1d8',
    status: 'frightened', statusDuration: 2, icon: '◉', tags: ['area', 'control'], ai: 8
  },
  {
    id: 'boss_crownfire', name: 'Crownfire', description: 'The Crown’s memory of every burned city. Huge fire damage in a large radius.', classId: 'enemy',
    resourceCost: 2, apCost: 2, range: 6, radius: 2, target: 'ground', damageType: 'fire', dice: '3d8',
    status: 'burning', statusDuration: 2, icon: '☄', tags: ['area', 'fire'], ai: 9
  },
  {
    id: 'boss_roots', name: 'Thorned Embrace', description: 'The forest itself takes hold of the living.', classId: 'enemy',
    resourceCost: 1, apCost: 1, range: 6, radius: 2, target: 'ground', damageType: 'nature', dice: '1d6',
    status: 'rooted', statusDuration: 2, icon: '🌿', tags: ['area', 'control'], ai: 7
  }
];

export const abilityById = Object.fromEntries(abilities.map((a) => [a.id, a]));

export const classAbilities = (classId: string, level: number): string[] =>
  abilities.filter((a) => a.classId === classId && (a.level ?? 1) <= level).map((a) => a.id);
