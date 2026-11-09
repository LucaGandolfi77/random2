import type { QuestDef } from '@/core/types';

export const quests: QuestDef[] = [
  {
    id: 'q_marked', title: 'The Marked', type: 'main', act: 1,
    description: 'You survived the Fallen Bastion with a mark on your soul and a hole in your memory. Find out what the mark wants — before someone else decides for you.',
    stages: [
      { title: 'Wake in the Bastion', description: 'Find Kaelen and escape the ruins.', objectives: ['Speak with Kaelen', 'Clear the courtyard', 'Defeat the Ash-Warden', 'Reach Greymoor'] },
      { title: 'A Village Under Two Shadows', description: 'Greymoor is caught between the Covenant and the Ashen Choir. Learn what the village knows about the mark.', objectives: ['Speak with Reeve Marla', 'Speak with Inquisitor Halvard', 'Investigate the Whispering Woods'] },
      { title: 'The Drowned Truth', description: 'The temple beneath the woods holds the first memory of the Crown.', objectives: ['Enter the Sunken Temple', 'Open the three seals', 'Defeat the Drowned Saint'] },
      { title: 'The Crownbound', description: 'Veyra waits in the Ashen Citadel. The Crown is almost awake.', objectives: ['Reach the Ashen Citadel', 'Confront Veyra', 'Decide the fate of the Crown'] }
    ],
    rewardXp: 200
  },
  {
    id: 'q_ash_over_greymoor', title: 'Ash Over Greymoor', type: 'main', act: 1,
    description: 'Reeve Marla wants the woods investigated. Inquisitor Halvard wants the mark confiscated. The Choir wants the village to burn. Everyone wants something from you.',
    stages: [
      { title: 'Choose a Side', description: 'Speak with both powers in Greymoor.', objectives: ['Hear Reeve Marla', 'Hear Inquisitor Halvard'] },
      { title: 'The Choir Cellar', description: 'The Choir has been stockpiling fire and old records beneath the village.', objectives: ['Find the Choir safehouse', 'Resolve the Choir threat'] },
      { title: 'The Village Endures', description: 'Greymoor will remember what you chose.', objectives: ['Return to Marla', 'Decide who governs the aftermath'] }
    ],
    rewardXp: 300, rewardGold: 80
  },
  {
    id: 'q_roots_remember', title: 'What the Woods Keep', type: 'main', act: 2,
    description: 'The Rootbound say the Whispering Woods were old before the Covenant. The runes in the grove may open a door the Othren sealed.',
    stages: [
      { title: 'Walk the Old Path', description: 'Find the Rootbound warden and learn the grove’s rules.', objectives: ['Speak with Sable', 'Find the rune warning'] },
      { title: 'Root, Moth, Crown', description: 'Wake the three runes in the order the forest remembers.', objectives: ['Wake the Rune of the Root', 'Wake the Rune of the Moth', 'Wake the Rune of the Crown'] },
      { title: 'The Rootbound Ruins', description: 'The door is open. What the Othren left behind is still awake.', objectives: ['Enter the Rootbound Ruins', 'Speak with Ilyra', 'Reach the Drowned Gate'] }
    ],
    rewardXp: 350
  },
  {
    id: 'q_drowned_covenant', title: 'The Drowned Covenant', type: 'main', act: 2,
    description: 'The Sunken Temple holds the truth of the Covenant — and a saint who has been keeping it closed for six centuries.',
    stages: [
      { title: 'The Three Seals', description: 'Unbind the temple seals without drowning the party.', objectives: ['Open the Seal of Tides', 'Open the Seal of Memory', 'Open the Seal of Grief'] },
      { title: 'The Saint’s Vigil', description: 'The Drowned Saint guards the Crown fragment.', objectives: ['Defeat the temple guardians', 'Defeat the Drowned Saint', 'Recover the Crown fragment'] },
      { title: 'The Road of Ash', description: 'The Citadel is open. So is the question of who deserves the Crown.', objectives: ['Travel to the Ashen Citadel'] }
    ],
    rewardXp: 500, rewardGold: 160
  },
  {
    id: 'q_crown_of_cinders', title: 'The Crown of Cinders', type: 'main', act: 3,
    description: 'Veyra Sol has carried the Crown’s echo long enough to believe it is her own voice. The Citadel is the last place where the world can be rewritten.',
    stages: [
      { title: 'The Last Road', description: 'Gather your allies and enter the Ashen Citadel.', objectives: ['Reach the Citadel', 'Face the Crown’s echoes'] },
      { title: 'Two Voices, One Crown', description: 'Veyra and the old king are fighting for the same body.', objectives: ['Defeat the Crownbound', 'Reach the Crown'] },
      { title: 'Choose What Remains', description: 'The world is waiting. It has been waiting for a very long time.', objectives: ['Choose the fate of the Crown', 'Witness the ending'] }
    ],
    rewardXp: 1000
  },
  {
    id: 'q_reeves_ledger', title: 'The Reeve’s Ledger', type: 'side', act: 1,
    description: 'Marla Grey keeps Greymoor alive through careful lies. One of those lies has a name, and Kaelen recognizes it.',
    stages: [
      { title: 'A Name Scratched Out', description: 'Find the sealed letter in the manor.', objectives: ['Search the Reeve’s manor', 'Read the sealed letter'] },
      { title: 'What the Captain Knew', description: 'The letter ties Marla to the old purge — and to Kaelen.', objectives: ['Confront Marla or Kaelen', 'Choose what to do with the evidence'] }
    ],
    rewardXp: 220, rewardGold: 70
  },
  {
    id: 'q_silent_bell', title: 'The Silent Bell', type: 'side', act: 1,
    description: 'The chapel bell rings at midnight, though it has no clapper. Children have started leaving offerings beneath it. One child has not come home.',
    stages: [
      { title: 'A Bell With No Voice', description: 'Speak with Tam and the widow Enna. Investigate the bell.', objectives: ['Speak with Tam', 'Inspect the bell', 'Survive the bell-tower'] },
      { title: 'The Sexton’s Debt', description: 'The thing in the tower was once the village sexton. He is still trying to finish a burial.', objectives: ['Defeat the Bell-Wraith', 'Return the child’s charm'] }
    ],
    rewardXp: 280, rewardGold: 60, rewardItems: ['circlet_of_echoes']
  },
  {
    id: 'q_hollow_merchant', title: 'The Hollow Merchant', type: 'hidden', act: 2,
    description: 'Someone in Greymoor has been selling memories. The goods are real. The customers cannot remember buying them.',
    stages: [
      { title: 'The Missing Coin', description: 'Find the hidden cache behind the village.', objectives: ['Discover the hollow cache', 'Follow the coin trail'] },
      { title: 'A Fair Price', description: 'The merchant is not a person. It is a memory of one, still trying to make a living.', objectives: ['Confront the merchant', 'Decide whether to expose them'] }
    ],
    rewardXp: 240, rewardGold: 120
  },
  {
    id: 'q_name_in_ashes', title: 'The Name in the Ashes', type: 'companion', act: 2,
    description: 'Kaelen was the Grey Watch captain who burned Greymoor’s old quarter. He has spent eight years trying to become someone else. The letter in Marla’s manor makes that impossible.',
    stages: [
      { title: 'An Order in His Handwriting', description: 'Find proof of Kaelen’s role in the purge.', objectives: ['Find the sealed letter', 'Ask Kaelen about the old quarter'] },
      { title: 'The Man After the Fire', description: 'Kaelen must choose between confession and another clean lie.', objectives: ['Confront Kaelen', 'Support or condemn him', 'Face the consequences in Greymoor'] }
    ],
    rewardXp: 300
  },
  {
    id: 'q_knife_for_choir', title: 'A Knife for the Choir', type: 'companion', act: 1,
    description: 'Nyx was sent to watch the mark-bearer. Somewhere between the lies, the watching became something else.',
    stages: [
      { title: 'The Wrong Kind of Loyalty', description: 'Nyx’s Choir orders have not stopped. Neither has her conscience.', objectives: ['Earn Nyx’s trust', 'Discover her orders'] },
      { title: 'A Name Worth Keeping', description: 'The Choir wants the Crown. Nyx wants to choose her own side.', objectives: ['Confront the Choir handler', 'Help Nyx decide'] }
    ],
    rewardXp: 280
  },
  {
    id: 'q_sister_who_never_was', title: 'The Sister Who Never Was', type: 'companion', act: 2,
    description: 'Ilyra has spent her life searching for a sister whose records contradict themselves. The truth may be worse than grief.',
    stages: [
      { title: 'Records of a Ghost', description: 'Study the First Archive with Ilyra.', objectives: ['Enter the Rootbound Ruins', 'Read the First Archive'] },
      { title: 'The Shape of a Memory', description: 'Ilyra’s sister was erased from the world — or never existed. Both possibilities are unbearable.', objectives: ['Choose what Ilyra should believe', 'Help her carry it'] }
    ],
    rewardXp: 300
  },
  {
    id: 'q_last_prayer', title: 'The Last Prayer', type: 'companion', act: 2,
    description: 'Oren’s prayers are being answered by something that is not a god. He needs to know whether that makes his compassion a lie.',
    stages: [
      { title: 'An Answer Without a God', description: 'Oren has been hearing the Crown in his prayers.', objectives: ['Speak with Oren', 'Investigate the chapel altar'] },
      { title: 'Faith Without Certainty', description: 'Oren can abandon the Covenant, reshape it, or accept that mercy needs no divine author.', objectives: ['Help Oren choose', 'Support his decision'] }
    ],
    rewardXp: 280
  },
  {
    id: 'q_debt_in_shadow', title: 'A Debt in Shadow', type: 'companion', act: 2,
    description: 'Sable’s shadow was taken by the Thorned Court. It has been wearing her face ever since.',
    stages: [
      { title: 'A Face Without Warmth', description: 'Sable’s shadow has been following the party through the woods.', objectives: ['Speak with Sable', 'Track the shadow'] },
      { title: 'The Thorned Court', description: 'The shadow has made a court of stolen faces. Sable intends to take hers back.', objectives: ['Defeat the Thorned Shade', 'Decide the shadow’s fate'] }
    ],
    rewardXp: 320, rewardItems: ['sable_shadow']
  }
];

export const questById = Object.fromEntries(quests.map((q) => [q.id, q]));
