import type { EventDef } from '@/core/types';

export const events: EventDef[] = [
  {
    id: 'unknown_call',
    title: 'The Payphone Rings',
    kicker: 'Incoming Call',
    text: 'A payphone on the corner starts ringing as you pass. At the same moment, your phone lights up with a number that has no area code. The street is empty, but the ringing has a rhythm, as if someone is waiting for you to decide.',
    minChapter: 1,
    maxChapter: 5,
    weight: 10,
    once: true,
    incoming: true,
    choices: [
      {
        id: 'answer',
        label: 'Answer the call',
        description: 'A voice is better than an empty street. Even this voice.',
        effects: [
          { type: 'unlockContact', id: 'unknown' },
          { type: 'flag', id: 'unknown_contact_unlocked' },
          { type: 'call', id: 'unknown_incoming' }
        ]
      },
      {
        id: 'decline',
        label: 'Let it ring',
        description: 'Sophie told you not to answer numbers you don’t know.',
        effects: [
          { type: 'unlockContact', id: 'unknown' },
          { type: 'flag', id: 'unknown_contact_unlocked' },
          { type: 'flag', id: 'unknown_declined' },
          { type: 'threat', amount: 7 },
          { type: 'message', id: 'msg_unknown_followup' }
        ]
      },
      {
        id: 'listen',
        label: 'Answer but say nothing',
        description: 'Let it speak first.',
        effects: [
          { type: 'unlockContact', id: 'unknown' },
          { type: 'flag', id: 'unknown_contact_unlocked' },
          { type: 'flag', id: 'unknown_listened' },
          { type: 'threat', amount: 3 },
          { type: 'clue', id: 'unknown_heard', text: 'The unknown caller breathes in time with the streetlights.' },
          { type: 'message', id: 'msg_unknown_followup' }
        ]
      }
    ]
  },
  {
    id: 'window_shadow',
    title: 'Headlights Behind You',
    kicker: 'A Car With No Lights',
    text: 'A car comes around the corner with its headlights off. It slows to your pace and stays there, six steps behind. The phone in your pocket grows warm. When you stop, the engine idles. When you walk, it follows.',
    minChapter: 1,
    maxChapter: 4,
    weight: 8,
    once: true,
    choices: [
      {
        id: 'look',
        label: 'Turn and look directly at it',
        description: 'Maybe it will pass. Maybe it wants to be seen.',
        effects: [
          { type: 'threat', amount: 8 },
          { type: 'clue', id: 'shadow_face', text: 'The car has no driver, only a dashboard light shaped like a mouth.' },
          { type: 'flag', id: 'looked_at_shadow' }
        ]
      },
      {
        id: 'curtain',
        label: 'Step under the next streetlight',
        description: 'Get out of the dark. Make the road show its face.',
        effects: [
          { type: 'threat', amount: -4 },
          { type: 'flag', id: 'curtains_closed' }
        ]
      },
      {
        id: 'call',
        label: 'Call someone while it follows',
        description: 'A voice may make the road remember there are witnesses.',
        effects: [
          { type: 'shield', amount: 25 },
          { type: 'threat', amount: -6 },
          { type: 'clue', id: 'watcher_retreats', text: 'The car pulls away as soon as you speak a name aloud.' }
        ]
      }
    ]
  },
  {
    id: 'wrong_number',
    title: 'The Wrong Emma',
    kicker: 'Phone Disturbance',
    text: 'Your phone answers before you dial. A man’s voice says, “Emma? Is that you?” You do not recognize him. He says he has been waiting for your call since 1987. Ahead, a payphone hangs off the hook.',
    minChapter: 1,
    maxChapter: 4,
    weight: 6,
    once: true,
    choices: [
      {
        id: 'who',
        label: 'Ask who he is',
        description: 'Keep him talking. Write down everything.',
        effects: [
          { type: 'clue', id: 'wrong_emma', text: 'A man claims to have been waiting for an Emma since 1987.' },
          { type: 'message', id: 'msg_wrong_number' },
          { type: 'threat', amount: 3 }
        ]
      },
      {
        id: 'hang',
        label: 'Hang up immediately',
        description: 'Do not let the wrong voice onto the street.',
        effects: [{ type: 'threat', amount: -2 }, { type: 'flag', id: 'hung_up_wrong_number' }]
      },
      {
        id: 'trace',
        label: 'Trace the call on your phone',
        description: 'If the number is real, there will be a record.',
        effects: [
          { type: 'clue', id: 'wrong_number_trace', text: 'The call originated from the old line under the road.' },
          { type: 'flag', id: 'traced_old_line' }
        ]
      }
    ]
  },
  {
    id: 'power_outage',
    title: 'The Streetlights Go Out',
    kicker: 'Blackout',
    text: 'Every streetlight on the block dies at once. The phone is the only bright thing left. The rain keeps falling, but the road is suddenly wider than it was. Somewhere ahead, a junction box ticks like a clock.',
    minChapter: 2,
    maxChapter: 5,
    weight: 7,
    once: true,
    choices: [
      {
        id: 'breaker',
        label: 'Follow the ticking to the junction box',
        description: 'Dad told you what to do. Do not walk in the dark.',
        effects: [
          { type: 'power', value: true },
          { type: 'flag', id: 'power_on' },
          { type: 'time', amount: 4 },
          { type: 'threat', amount: -4 },
          { type: 'clue', id: 'breaker_answer', text: 'The breaker did not trip. Something outside pulled the streetlights dark.' }
        ]
      },
      {
        id: 'flashlight',
        label: 'Use the flashlight',
        description: 'Light a path through the dark.',
        effects: [
          { type: 'flashlight' },
          { type: 'battery', amount: -3 },
          { type: 'shield', amount: 15 },
          { type: 'flag', id: 'power_outage_survived' }
        ]
      },
      {
        id: 'wait',
        label: 'Stay still and listen',
        description: 'Maybe the dark will pass.',
        effects: [
          { type: 'threat', amount: 10 },
          { type: 'clue', id: 'dark_listens', text: 'In the dark, the road breathes like a person trying to remember how.' }
        ]
      }
    ]
  },
  {
    id: 'missed_call',
    title: 'Missed Call',
    kicker: 'One Ring',
    text: 'Your phone vibrates once. A missed call from Sophie, stamped with the current time — except the current time is exactly seven minutes from now. The screen says you are standing at a corner you have not reached yet.',
    minChapter: 2,
    maxChapter: 5,
    weight: 5,
    once: true,
    choices: [
      {
        id: 'callback',
        label: 'Call her back',
        description: 'A missed call is still a connection.',
        effects: [
          { type: 'shield', amount: 20 },
          { type: 'trust', id: 'sophie', amount: 1 },
          { type: 'clue', id: 'seven_minutes', text: 'Missed-call notifications arrive seven minutes before they happen.' },
          { type: 'message', id: 'msg_missed_call' }
        ]
      },
      {
        id: 'ignore',
        label: 'Leave it',
        description: 'You cannot afford to chase every ghost.',
        effects: [{ type: 'threat', amount: 3 }, { type: 'flag', id: 'ignored_missed_call' }]
      }
    ]
  },
  {
    id: 'silent_room',
    title: 'The Silent Block',
    kicker: 'Sudden Quiet',
    text: 'The rain stops. The traffic lights freeze. Even your footsteps stop arriving from the right direction. The street is holding its breath, and it wants you to hold yours.',
    minChapter: 2,
    maxChapter: 5,
    weight: 8,
    once: true,
    choices: [
      {
        id: 'name',
        label: 'Say your own name out loud',
        description: 'Break the silence with something true.',
        effects: [
          { type: 'threat', amount: -8 },
          { type: 'shield', amount: 18 },
          { type: 'clue', id: 'own_name', text: 'Speaking your own name makes the silence flinch.' },
          { type: 'flag', id: 'spoke_own_name' }
        ]
      },
      {
        id: 'wait',
        label: 'Wait for the silence to break',
        description: 'Do not give it the satisfaction of a reaction.',
        effects: [{ type: 'threat', amount: 11 }, { type: 'flag', id: 'silence_waited' }]
      },
      {
        id: 'call',
        label: 'Call someone immediately',
        description: 'Make a human noise in the empty street.',
        effects: [{ type: 'shield', amount: 28 }, { type: 'threat', amount: -5 }, { type: 'clue', id: 'voice_answer', text: 'The silence retreats when someone answers.' }]
      }
    ]
  },
  {
    id: 'voicemail',
    title: 'Voicemail from Jessica',
    kicker: 'One New Message',
    text: 'A voicemail from Jessica, left at 3:12 AM. Her voice is careful, as if she is reading from a script. “Don’t call the house line. Don’t let it answer in my voice.” Your own house is still six blocks away.',
    minChapter: 2,
    maxChapter: 5,
    weight: 6,
    once: true,
    choices: [
      {
        id: 'listen',
        label: 'Listen to the voicemail',
        description: 'Her voice is shaking.',
        effects: [
          { type: 'message', id: 'msg_voicemail_jessica' },
          { type: 'clue', id: 'jessica_voicemail', text: 'Jessica left a voicemail warning not to call the house line.' },
          { type: 'trust', id: 'jessica', amount: 1 }
        ]
      },
      {
        id: 'delete',
        label: 'Delete it without listening',
        description: 'Some messages are doors.',
        effects: [{ type: 'threat', amount: -2 }, { type: 'flag', id: 'deleted_voicemail' }]
      }
    ]
  },
  {
    id: 'last_message',
    title: 'The Last Message',
    kicker: '5:59 AM',
    text: 'A message from your own number. The timestamp is 5:59 AM. It has not happened yet. “If you are reading this, I did not make it home. But you did. Keep walking.”',
    minChapter: 4,
    maxChapter: 5,
    weight: 5,
    once: true,
    choices: [
      {
        id: 'save',
        label: 'Save the message',
        description: 'Keep it. Read it. Refuse it.',
        effects: [
          { type: 'message', id: 'msg_last_message' },
          { type: 'clue', id: 'last_message', text: 'A future version of Emma sent a message from 5:59 AM.' },
          { type: 'flag', id: 'saved_last_message' }
        ]
      },
      {
        id: 'call',
        label: 'Call the number back',
        description: 'If the future is calling, answer it.',
        effects: [
          { type: 'threat', amount: 9 },
          { type: 'clue', id: 'future_voice', text: 'The future Emma’s voicemail says: “Do not let the road choose who you become.”' },
          { type: 'message', id: 'msg_last_message' }
        ]
      }
    ]
  },
  {
    id: 'door_knock',
    title: 'Someone at the Bus Shelter',
    kicker: 'Three Knocks',
    text: 'Three knocks on the glass of the bus shelter. Then your father’s voice, tired and close: “Emma. It’s me. I brought the car around.” Outside, the road behind the shelter is empty.',
    minChapter: 2,
    maxChapter: 5,
    weight: 8,
    once: true,
    choices: [
      {
        id: 'question',
        label: 'Ask him the name of your first dog',
        description: 'Dad told you to test him.',
        effects: [
          { type: 'flag', id: 'tested_dad_event' },
          { type: 'clue', id: 'dad_copy_confirmed', text: 'The voice at the shelter did not know Juniper. It is not Dad.' },
          { type: 'threat', amount: -3 },
          { type: 'trust', id: 'dad', amount: 1 }
        ]
      },
      {
        id: 'open',
        label: 'Step closer to the glass',
        description: 'He sounds so much like himself.',
        effects: [
          { type: 'threat', amount: 16 },
          { type: 'flag', id: 'opened_door_event' },
          { type: 'clue', id: 'door_empty', text: 'There was no one at the shelter. Only wet footprints and the smell of rain.' }
        ]
      },
      {
        id: 'ignore',
        label: 'Stay away from the shelter',
        description: 'A locked door is a kind of answer.',
        effects: [{ type: 'threat', amount: 4 }, { type: 'flag', id: 'ignored_door' }]
      }
    ]
  },
  {
    id: 'interference',
    title: 'Interference',
    kicker: 'The Line Is Full',
    text: 'The phone fills with static. Beneath it, a voice is repeating a conversation you have not had yet. You hear yourself say: “Don’t take the shortcut.”',
    minChapter: 2,
    maxChapter: 5,
    weight: 6,
    once: true,
    choices: [
      {
        id: 'reset',
        label: 'Restart the phone',
        description: 'Clear the interference. Lose some battery.',
        effects: [
          { type: 'battery', amount: -6 },
          { type: 'threat', amount: -2 },
          { type: 'flag', id: 'reset_phone' }
        ]
      },
      {
        id: 'listen',
        label: 'Listen through the static',
        description: 'The voice is saying something important.',
        effects: [
          { type: 'clue', id: 'future_conversation', text: 'The static contains a future conversation. You tell yourself not to take the shortcut.' },
          { type: 'threat', amount: 4 },
          { type: 'flag', id: 'heard_future' }
        ]
      },
      {
        id: 'off',
        label: 'Turn the phone off',
        description: 'Silence the line. Face the street.',
        effects: [{ type: 'threat', amount: 9 }, { type: 'flag', id: 'turned_phone_off' }]
      }
    ]
  },
  {
    id: 'mirror_hand',
    title: 'The Shop Window',
    kicker: 'Reflection',
    text: 'In the dark shop window, your reflection raises its hand before you do. When you stop, it keeps walking. There is a phone in its hand. It is calling you.',
    minChapter: 1,
    maxChapter: 4,
    weight: 5,
    once: true,
    choices: [
      {
        id: 'touch',
        label: 'Touch the glass',
        description: 'Meet the reflection halfway.',
        effects: [
          { type: 'threat', amount: 5 },
          { type: 'clue', id: 'reflection_phone', text: 'The reflection holds a phone connected to the old line under the road.' },
          { type: 'flag', id: 'touched_mirror' }
        ]
      },
      {
        id: 'cover',
        label: 'Look away',
        description: 'Do not give it a face.',
        effects: [{ type: 'threat', amount: -3 }, { type: 'flag', id: 'covered_mirror' }]
      },
      {
        id: 'call',
        label: 'Answer the reflection’s call',
        description: 'If it is calling, someone is on the other end.',
        effects: [
          { type: 'shield', amount: 20 },
          { type: 'clue', id: 'reflection_voice', text: 'A voice under the reflection says: “You are almost ready to be remembered.”' },
          { type: 'flag', id: 'answered_reflection' }
        ]
      }
    ]
  },
  {
    id: 'garden_figure',
    title: 'The Figure Under the Lamp',
    kicker: 'Movement Ahead',
    text: 'The streetlight ahead snaps on. A figure stands beneath it, facing you. It is holding a phone to its ear. Your phone rings once, then stops. The rain moves through the figure without touching it.',
    minChapter: 1,
    maxChapter: 4,
    weight: 7,
    once: true,
    choices: [
      {
        id: 'investigate',
        label: 'Walk toward the figure',
        description: 'See what is holding the phone.',
        effects: [
          { type: 'threat', amount: 7 },
          { type: 'clue', id: 'garden_phone', text: 'The figure under the lamp held a phone with no screen.' },
          { type: 'flag', id: 'went_to_garden' }
        ]
      },
      {
        id: 'mike',
        label: 'Call Mike and warn him',
        description: 'He can turn on his lights.',
        effects: [
          { type: 'trust', id: 'mike', amount: 1 },
          { type: 'shield', amount: 22 },
          { type: 'threat', amount: -3 },
          { type: 'flag', id: 'mike_warned' }
        ]
      },
      {
        id: 'ignore',
        label: 'Cross the street and keep walking',
        description: 'Let it stand there. Do not give it your attention.',
        effects: [{ type: 'threat', amount: 3 }, { type: 'flag', id: 'ignored_garden_figure' }]
      }
    ]
  },
  {
    id: 'wrong_voice',
    title: 'A Voice That Knows Too Much',
    kicker: 'Incoming Call',
    text: 'Your mother’s name appears on the screen. When you answer, she says: “Emma, I’m already at the house. Why won’t you come inside?” Her voice is coming from the empty street behind you.',
    minChapter: 3,
    maxChapter: 5,
    weight: 7,
    once: true,
    incoming: true,
    choices: [
      {
        id: 'test',
        label: 'Ask her what she called you as a child',
        description: 'A copy cannot remember a nickname.',
        effects: [
          { type: 'threat', amount: -4 },
          { type: 'flag', id: 'tested_mom_voice' },
          { type: 'clue', id: 'mom_copy', text: 'The voice claiming to be Mom did not know the nickname “Little Bird.”' }
        ]
      },
      {
        id: 'answer',
        label: 'Walk toward the voice',
        description: 'She sounds so tired.',
        effects: [
          { type: 'threat', amount: 14 },
          { type: 'flag', id: 'went_to_hall_voice' },
          { type: 'clue', id: 'mom_empty_hall', text: 'The street behind you is empty. The phone is warm where a hand was holding it.' }
        ]
      },
      {
        id: 'hang',
        label: 'Hang up and call the real Mom',
        description: 'Trust the number, not the voice.',
        effects: [{ type: 'shield', amount: 26 }, { type: 'threat', amount: -6 }, { type: 'trust', id: 'mom', amount: 1 }]
      }
    ]
  },
  {
    id: 'breaker_trip',
    title: 'The Lights Stutter',
    kicker: 'Electrical Failure',
    text: 'The streetlights fold inward, go out, and come back on. Every clock on the block now shows a different time. The phone battery drops five percent in one breath. The pavement ahead looks wetter than the rain can explain.',
    minChapter: 3,
    maxChapter: 5,
    weight: 5,
    once: true,
    choices: [
      {
        id: 'breaker',
        label: 'Trace the fault to the junction box',
        description: 'Keep the street alive.',
        effects: [
          { type: 'power', value: true },
          { type: 'flag', id: 'power_on' },
          { type: 'time', amount: 3 },
          { type: 'threat', amount: -3 }
        ]
      },
      {
        id: 'phone',
        label: 'Keep the phone on and ignore the lights',
        description: 'The battery is a resource. The dark is a risk.',
        effects: [
          { type: 'battery', amount: -4 },
          { type: 'shield', amount: 18 },
          { type: 'flag', id: 'held_the_line' }
        ]
      },
      {
        id: 'off',
        label: 'Let the street go dark',
        description: 'Maybe the shadows prefer the light.',
        effects: [{ type: 'power', value: false }, { type: 'flag', id: 'house_dark' }, { type: 'threat', amount: 6 }]
      }
    ]
  }
];

export const eventById = Object.fromEntries(events.map((event) => [event.id, event]));
