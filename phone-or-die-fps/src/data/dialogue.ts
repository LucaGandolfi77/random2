import type { DialogueNode } from './types';

/**
 * Every node is a beat of a simulated phone call. Effects are applied when the
 * player picks a choice, never by waiting: the phone must be an active decision.
 */
export const DIALOGUE: Record<string, DialogueNode> = {
  // ---------------- SOPHIE ----------------
  sophie_1: {
    speaker: 'Sophie',
    line: 'Emma? Oh thank God. I tried calling you like ten times. Are you okay?',
    choices: [
      { text: '"I am scared. Please stay on the line."', next: 'sophie_2', effects: { threat: -7, shieldSec: 46, relationship: 2, flags: ['sophie_comfort'] } },
      { text: '"Did you send me that message?"', next: 'sophie_3', effects: { reveal: 'message_sophie' } },
      { text: '"I have to go."', next: null, effects: { end: true, threat: 2 } }
    ]
  },
  sophie_2: {
    speaker: 'Sophie',
    line: 'I am right here. Listen to my voice. Breathe with me, okay? In... out... That is it.',
    choices: [
      { text: '"I can breathe. Tell me something normal."', next: 'sophie_4', effects: { threat: -4, shieldSec: 30, relationship: 1 } },
      { text: '"Something moved behind me."', next: null, effects: { end: true, threat: -3, shieldSec: 26, relationship: 1 } },
      { text: '"I saw you at the window earlier."', next: 'sophie_5', effects: { reveal: 'sophie_outside' } }
    ]
  },
  sophie_3: {
    speaker: 'Sophie',
    line: 'What message? Emma, you are not making sense. Did someone take your phone?',
    choices: [
      { text: '"It said: they only come when you are alone."', next: 'sophie_5', effects: { reveal: 'message_sophie', threat: -3 } },
      { text: '"Forget it. Just talk to me."', next: 'sophie_2', effects: { shieldSec: 32, threat: -5, relationship: 1 } },
      { text: '"I have to go."', next: null, effects: { end: true } }
    ]
  },
  sophie_4: {
    speaker: 'Sophie',
    line: 'Remember that night at the lake? You told me you would never let the dark win. You are still you.',
    choices: [
      { text: '"I can do this."', next: null, effects: { end: true, threat: -8, shieldSec: 40, flags: ['courage'] } },
      { text: '"I do not feel like me anymore."', next: null, effects: { end: true, relationship: 2, shieldSec: 28, reveal: 'sophie_fear' } }
    ]
  },
  sophie_5: {
    speaker: 'Sophie',
    line: '...Emma, I am in my apartment. There is no window facing your house. Who else is on this line?',
    choices: [
      { text: '"You are the only one I trust."', next: 'sophie_2', effects: { threat: -6, shieldSec: 36, flags: ['sophie_trust'] } },
      { text: '"Maybe I am losing my mind."', next: null, effects: { end: true, relationship: 1, shieldSec: 20 } }
    ]
  },

  // ---------------- MOM ----------------
  mom_1: {
    speaker: 'Mom',
    line: 'Sweetheart? It is past ten. Why are you still awake?',
    choices: [
      { text: '"There is someone outside, Mom."', next: 'mom_2', effects: { threat: -6, shieldSec: 44, relationship: 2 } },
      { text: '"How are you feeling? Are you okay?"', next: 'mom_3', effects: { relationship: 1 } },
      { text: '"Go back to sleep. I love you."', next: null, effects: { end: true, shieldSec: 14 } }
    ]
  },
  mom_2: {
    speaker: 'Mom',
    line: 'Listen to me. Lock the front door. Then the back door. Then turn on every light you can find.',
    choices: [
      { text: '"Okay. I am doing it."', next: null, effects: { end: true, threat: -5, shieldSec: 38, flags: ['secure_advice'] } },
      { text: '"There is a face at the window, Mom."', next: 'mom_4', effects: { reveal: 'mother_knew' } },
      { text: '"Why do you know that phrase?"', next: 'mom_4', effects: { reveal: 'mother_knew', relationship: -1 } }
    ]
  },
  mom_3: {
    speaker: 'Mom',
    line: 'I am fine. I was just thinking about your grandmother. She used to say the same thing you just said.',
    choices: [
      { text: '"What did she mean?"', next: 'mom_4', effects: { reveal: 'grandmother' } },
      { text: '"It does not matter. Stay with me."', next: 'mom_2', effects: { shieldSec: 34, threat: -4 } }
    ]
  },
  mom_4: {
    speaker: 'Mom',
    line: '...I should not have told you. Your grandmother wrote it down. "Keep a voice in the room." Promise me you will.',
    choices: [
      { text: '"I promise."', next: null, effects: { end: true, reveal: 'grandmother', shieldSec: 52, threat: -8, flags: ['mother_confession', 'truth_seeker'] } },
      { text: '"What else did she write?"', next: null, effects: { end: true, reveal: 'mother_knew', shieldSec: 30, flags: ['mother_confession'] } }
    ]
  },

  // ---------------- DAD ----------------
  dad_1: {
    speaker: 'Dad',
    line: 'Emma? It is late. Is everything all right?',
    choices: [
      { text: '"How do I properly lock the doors?"', next: 'dad_2', effects: { shieldSec: 30, threat: -4 } },
      { text: '"There are tracks in the garden."', next: 'dad_3', effects: { reveal: 'garden_tracks' } },
      { text: '"I am fine. Goodnight."', next: null, effects: { end: true } }
    ]
  },
  dad_2: {
    speaker: 'Dad',
    line: 'Deadbolt first. Then the chain. Windows latch from the inside. And never open the door for a voice you cannot see.',
    choices: [
      { text: '"Done. It feels safer already."', next: null, effects: { end: true, threat: -6, shieldSec: 40, flags: ['secured_knowledge'] } },
      { text: '"What if it is already inside?"', next: 'dad_4', effects: { reveal: 'father_knew' } }
    ]
  },
  dad_3: {
    speaker: 'Dad',
    line: 'Tracks? What kind of tracks? ...Emma, stay away from the back garden. I am serious.',
    choices: [
      { text: '"You know what is out there."', next: 'dad_4', effects: { reveal: 'father_knew' } },
      { text: '"Okay. I will stay inside."', next: null, effects: { end: true, shieldSec: 34, threat: -4 } }
    ]
  },
  dad_4: {
    speaker: 'Dad',
    line: 'Your mother made me promise never to tell you. There was an incident when you were nine. You do not remember, thankfully.',
    choices: [
      { text: '"Tell me now."', next: null, effects: { end: true, reveal: 'incident', flags: ['father_confession', 'truth_seeker'], threat: -4, shieldSec: 28 } },
      { text: '"I need you to stay on the line."', next: null, effects: { end: true, shieldSec: 46, relationship: 2 } }
    ]
  },

  // ---------------- DANIEL ----------------
  daniel_1: {
    speaker: 'Daniel',
    line: 'Emma, I have been calling for an hour. Your line was busy. Look at me when I am talking to you, okay?',
    choices: [
      { text: '"Do you believe me? About the Shadows?"', next: 'daniel_2', effects: { reveal: 'daniel_truth', threat: -10, shieldSec: 42, flags: ['daniel_trust'], relationship: 2 } },
      { text: '"Why did you hang up earlier?"', next: 'daniel_3', effects: {} },
      { text: '"I cannot talk. I just needed to hear you."', next: null, effects: { end: true, shieldSec: 34, relationship: 1 } }
    ]
  },
  daniel_2: {
    speaker: 'Daniel',
    line: 'I found your grandmother\'s journal in the attic. The part about the voice... it is real, Emma. It is a rule.',
    choices: [
      { text: '"Read it to me. All of it."', next: 'daniel_4', effects: { reveal: 'journal', flags: ['truth_seeker'] } },
      { text: '"What else does it say about 6 AM?"', next: 'daniel_4', effects: { reveal: 'journal', flags: ['truth_seeker', 'knows_dawn'] } },
      { text: '"Not now. Please, just stay with me."', next: null, effects: { end: true, shieldSec: 48, threat: -6 } }
    ]
  },
  daniel_3: {
    speaker: 'Daniel',
    line: 'The signal is wrong. I can hear myself talking twice. Emma... is there someone breathing in your room?',
    choices: [
      { text: '"There has been someone here all night."', next: 'daniel_2', effects: { threat: -5, shieldSec: 30 } },
      { text: '"Do not say that."', next: null, effects: { end: true, shieldSec: 28, relationship: -1 } }
    ]
  },
  daniel_4: {
    speaker: 'Daniel',
    line: '"When the last voice falls silent, the dark has your name." It says the dawn is a door. You have to choose who walks through it with you.',
    choices: [
      { text: '"Say my name again. I am still here."', next: null, effects: { end: true, shieldSec: 40, threat: -5 } },
      { text: '"I understand. I will hold on until six."', next: null, effects: { end: true, reveal: 'journal', shieldSec: 55, threat: -10, flags: ['knows_dawn'] } }
    ],
    timeout: 14,
    timeoutChoice: 1
  },

  // ---------------- ALEX ----------------
  alex_1: {
    speaker: 'Alex',
    line: 'Whoa, okay, slow down. You are breathing like you ran a marathon. What did you see?',
    choices: [
      { text: '"How do I see them before they get close?"', next: 'alex_2', effects: { reveal: 'detection', shieldSec: 32 } },
      { text: '"What are those things, Alex?"', next: 'alex_3', effects: { reveal: 'shadow_lore' } },
      { text: '"I do not have time to explain."', next: null, effects: { end: true, threat: 2 } }
    ]
  },
  alex_2: {
    speaker: 'Alex',
    line: 'They hate being watched. If you hold your flashlight on one, it stops moving. Well. Mostly. Do not blink.',
    choices: [
      { text: '"So staring at them actually works?"', next: 'alex_4', effects: { flags: ['watcher_knowledge'], shieldSec: 30, threat: -5 } },
      { text: '"I lost the flashlight."', next: null, effects: { end: true, shieldSec: 22 } }
    ]
  },
  alex_3: {
    speaker: 'Alex',
    line: 'My grandmother called them the Uninvited. They are not ghosts. They are the space where a person should be.',
    choices: [
      { text: '"That is not comforting."', next: 'alex_2', effects: { reveal: 'shadow_lore', shieldSec: 24 } },
      { text: '"Do they know my name?"', next: 'alex_4', effects: { reveal: 'shadow_names', flags: ['watcher_knowledge'] } }
    ]
  },
  alex_4: {
    speaker: 'Alex',
    line: 'Do not answer if you hear your name from a room you are not in. That is not a person. That is an invitation.',
    choices: [
      { text: '"I will not answer."', next: null, effects: { end: true, shieldSec: 44, threat: -7, flags: ['name_warning'] } },
      { text: '"Too late. I already did."', next: null, effects: { end: true, threat: 9, reveal: 'shadow_names' } }
    ]
  },

  // ---------------- JESSICA ----------------
  jessica_1: {
    speaker: 'Jessica',
    line: 'You should not be calling me. Not tonight.',
    choices: [
      { text: '"What do you know, Jessica?"', next: 'jessica_2', effects: { reveal: 'family_secret', relationship: -1 } },
      { text: '"I am alone and I am scared."', next: 'jessica_3', effects: { relationship: 2, shieldSec: 40 } },
      { text: '"Then why did you pick up?"', next: 'jessica_2', effects: { reveal: 'family_secret' } }
    ]
  },
  jessica_2: {
    speaker: 'Jessica',
    line: 'The same thing happened to Mom, twenty years ago. She won. Barely. And she never forgave herself for what it cost.',
    choices: [
      { text: '"What did it cost her?"', next: null, effects: { end: true, reveal: 'mother_knew', flags: ['sister_confession', 'truth_seeker'], shieldSec: 38, threat: -6 } },
      { text: '"I am not her. I will not lose."', next: null, effects: { end: true, flags: ['sister_confession', 'courage'], shieldSec: 50, threat: -8 } }
    ]
  },
  jessica_3: {
    speaker: 'Jessica',
    line: 'I am sorry. I am here. I should have called you the moment it started.',
    choices: [
      { text: '"Tell me the truth. All of it."', next: 'jessica_2', effects: { reveal: 'family_secret', shieldSec: 26 } },
      { text: '"Just stay on the line."', next: null, effects: { end: true, shieldSec: 56, threat: -9, relationship: 2 } }
    ]
  },

  // ---------------- MIKE ----------------
  mike_1: {
    speaker: 'Mike',
    line: 'Emma? Yeah, I see your lights on. Everything okay over there?',
    choices: [
      { text: '"There is something in the garden."', next: 'mike_2', effects: { flags: ['mike_watch'], shieldSec: 62, threat: -12 } },
      { text: '"Can you come over right now?"', next: 'mike_3', effects: {} },
      { text: '"No, sorry. Go back inside."', next: null, effects: { end: true, shieldSec: 18 } }
    ]
  },
  mike_2: {
    speaker: 'Mike',
    line: 'I am grabbing my flashlight. Keep your lights on and do not open that back door, you hear me?',
    choices: [
      { text: '"Thank you, Mike."', next: null, effects: { end: true, flags: ['mike_guard'], shieldSec: 58, threat: -10 } },
      { text: '"Do not come closer. Just watch."', next: 'mike_4', effects: { flags: ['mike_warned'] } }
    ]
  },
  mike_3: {
    speaker: 'Mike',
    line: 'I would, Emma, but... there is something standing between my car and your gate. I cannot move. I cannot even blink.',
    choices: [
      { text: '"Mike? Mike, answer me!"', next: null, effects: { end: true, reveal: 'mike_lost', threat: 8, relationship: -1 } },
      { text: '"Stay where you are. I will call someone else."', next: null, effects: { end: true, shieldSec: 20, reveal: 'mike_lost' } }
    ]
  },
  mike_4: {
    speaker: 'Mike',
    line: 'Too late. It turned its head. Emma... it does not have a face. It is wearing your mother\'s smile.',
    choices: [
      { text: '"Get inside, Mike! Lock your door!"', next: null, effects: { end: true, threat: 6, reveal: 'mimic_reveal', flags: ['mike_warned'] } },
      { text: '"Whatever happens, thank you."', next: null, effects: { end: true, shieldSec: 42, threat: -6, flags: ['mike_warned', 'courage'] } }
    ]
  },

  // ---------------- UNKNOWN NUMBER ----------------
  unknown_1: {
    speaker: 'Unknown',
    line: 'Hello, Emma.',
    choices: [
      { text: '"Who is this?"', next: 'unknown_2', effects: {} },
      { text: '"How do I survive tonight?"', next: 'unknown_3', effects: { shieldSec: 54, threat: -15, flags: ['unknown_guidance'] } },
      { text: '"Stop calling me."', next: 'unknown_4', effects: { threat: 6 } }
    ]
  },
  unknown_2: {
    speaker: 'Unknown',
    line: 'Someone who does not want you to die. Not tonight. You have exactly eight hours, Emma.',
    choices: [
      { text: '"What do you want from me?"', next: 'unknown_3', effects: { reveal: 'unknown_purpose' } },
      { text: '"I am hanging up."', next: null, effects: { end: true, threat: 5 } },
      { text: '"How do you know my name?"', next: 'unknown_3', effects: { reveal: 'unknown_knows', threat: 3 } }
    ]
  },
  unknown_3: {
    speaker: 'Unknown',
    line: 'Keep a voice in your ear. Never let the line go quiet. And whatever you do, do not trust the one standing in your garden.',
    choices: [
      { text: '"What one? What is in my garden?"', next: 'unknown_5', effects: { reveal: 'unknown_rule', shieldSec: 40, threat: -8, flags: ['knows_rule'] } },
      { text: '"I will keep talking. I promise."', next: null, effects: { end: true, shieldSec: 60, threat: -14, flags: ['knows_rule'] } },
      { text: '"Answer me! Who are you?!"', next: null, effects: { end: true, threat: 6 } }
    ],
    timeout: 12,
    timeoutChoice: 2
  },
  unknown_4: {
    speaker: 'Unknown',
    line: 'Then die quietly. It will be easier for both of us.',
    choices: [
      { text: '"WAIT!"', next: 'unknown_3', effects: { threat: 6 } },
      { text: '"Never call this number again."', next: null, effects: { end: true, threat: 12, flags: ['unknown_angry'], relationship: -2 } }
    ]
  },
  unknown_5: {
    speaker: 'Unknown',
    line: 'Look out of your kitchen window. Look carefully. Then call your sister and ask her what happened in 1998.',
    choices: [
      { text: '"I am looking."', next: null, effects: { end: true, reveal: 'garden_mimic', event: 'window', shieldSec: 36, flags: ['truth_seeker'] } },
      { text: '"No. I am not looking."', next: null, effects: { end: true, shieldSec: 26, threat: -5 } }
    ]
  }
};

export const LINES = {
  introMessage: 'They only come when you are alone.',
  firstCall: 'Keep talking. Don\'t let them get close.',
  dawn: '6:00 AM. Just hold on until dawn.'
};
