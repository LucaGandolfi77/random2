import type { CallDef } from '@/core/types';

export const calls: CallDef[] = [
  // ── Sophie ────────────────────────────────────────────────────────────────
  {
    id: 'sophie_first',
    contactId: 'sophie',
    title: 'The First Call',
    minChapter: 0,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        id: 'start',
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Emma? It’s ten at night. You only call this late when something’s wrong or you’ve found a new true-crime documentary.',
        choices: [
          {
            id: 'outside',
            text: 'There’s someone walking behind me. They’ve been there since I left the shop.',
            next: 'serious',
            effects: [
              { type: 'trust', id: 'sophie', amount: 1 },
              { type: 'flag', id: 'sophie_believes' }
            ]
          },
          {
            id: 'joke',
            text: 'Nothing. I just needed to hear a human voice.',
            next: 'soft',
            effects: [{ type: 'trust', id: 'sophie', amount: 1 }, { type: 'flag', id: 'sophie_calmed' }]
          },
          {
            id: 'message',
            text: 'I got a message. It says they only come when I’m alone.',
            next: 'message',
            effects: [{ type: 'clue', id: 'same_message', text: 'Sophie has received the same anonymous message.' }]
          }
        ]
      },
      serious: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Okay. Stay under the streetlights. Don’t take the park cut. I’m putting my shoes on. Tell me exactly what you see.',
        choices: [
          {
            id: 'shape',
            text: 'It’s tall. Too thin. It moved when I looked at my phone, not when I looked at it.',
            next: 'rules',
            effects: [{ type: 'clue', id: 'shadow_light', text: 'The shadows react to the phone light, not to being watched.' }]
          },
          {
            id: 'stay',
            text: 'Stay on the line with me. Please.',
            next: 'rules',
            effects: [{ type: 'trust', id: 'sophie', amount: 1 }]
          }
        ]
      },
      soft: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'You’re doing that thing where you make your voice smaller so no one asks follow-up questions. I’m asking. What happened?',
        choices: [
          { id: 'outside', text: 'There’s someone behind me.', next: 'serious' },
          { id: 'message', text: 'This message. I think it knows I’m alone.', next: 'message' }
        ]
      },
      message: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Read it to me again. … Emma. That’s the exact message I got three nights ago. I thought it was spam. I deleted it.',
        effects: [
          { type: 'flag', id: 'sophie_same_message' },
          { type: 'clue', id: 'same_message', text: 'Sophie received the same message three nights ago.' }
        ],
        choices: [
          { id: 'who', text: 'Did you answer the number?', next: 'answered' },
          { id: 'help', text: 'What do I do?', next: 'rules' }
        ]
      },
      answered: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Once. There was no voice. Just breathing. And under it, a street tone. Rain. A bus shelter with no bus. Like my own street, Emma. I hung up and slept with the lights on.',
        effects: [{ type: 'flag', id: 'sophie_answered_unknown' }, { type: 'trust', id: 'sophie', amount: 1 }],
        choices: [{ id: 'continue', text: 'Then we keep each other on the line.', next: 'end' }]
      },
      rules: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Keep me on the phone. Not a text. A voice. Every time I go quiet for too long, you call me back. And Emma — if a number you don’t know calls, let it ring.',
        effects: [
          { type: 'clue', id: 'sophie_rule', text: 'A live voice keeps the shadows back. Do not let the unknown number hear you hesitate.' },
          { type: 'flag', id: 'sophie_gave_rule' }
        ],
        choices: [{ id: 'end', text: 'I will. I promise.', next: 'end' }]
      },
      end: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'I’m here. I’m not going anywhere. Call me back the second you feel alone.',
        choices: []
      }
    }
  },
  {
    id: 'sophie_late',
    contactId: 'sophie',
    title: 'A Voice in the Dark',
    minChapter: 2,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'I’ve been calling every ten minutes. Your line kept going to a street with no sound in it. Emma, tell me you’re still walking.',
        choices: [
          {
            id: 'inside',
            text: 'I’m here. But the street keeps repeating.',
            next: 'inside',
            effects: [{ type: 'trust', id: 'sophie', amount: 1 }]
          },
          {
            id: 'truth',
            text: 'I think the calls are doing something. Every time someone answers, the shadows move back.',
            next: 'theory',
            effects: [{ type: 'flag', id: 'call_theory' }]
          }
        ]
      },
      inside: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Then you listen to me. Do not hang up. I don’t care if your battery dies. I will talk until my throat gives out. You are not alone on that road.',
        effects: [
          { type: 'clue', id: 'voice_ward', text: 'A sustained human voice can hold a shadow at the edge of the light.' },
          { type: 'trust', id: 'sophie', amount: 1 }
        ],
        choices: [{ id: 'go', text: 'Then talk. Please.', next: 'story' }]
      },
      theory: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'That’s why you keep calling. That’s why the line goes strange when no one answers. It isn’t the phone they hate. It’s the proof that someone else exists.',
        effects: [
          { type: 'clue', id: 'connection', text: 'The shadows feed on isolation. Connection is the only ward.' },
          { type: 'trust', id: 'sophie', amount: 1 }
        ],
        choices: [{ id: 'go', text: 'Then I need more voices.', next: 'story' }]
      },
      story: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'There’s something else. I called your mother. She said your father took the car to find you hours ago. He never came back. Emma—',
        effects: [
          { type: 'flag', id: 'dad_missing' },
          { type: 'clue', id: 'dad_missing', text: 'Dad took the car to find Emma earlier tonight and never came back.' },
          { type: 'message', id: 'msg_sophie_dad' }
        ],
        choices: [{ id: 'end', text: 'I’ll find him.', next: 'end' }]
      },
      end: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Keep breathing. Keep talking. I’ll be here when the sun comes up. Even if I have to drive every street myself.',
        choices: []
      }
    }
  },
  {
    id: 'sophie_repeat',
    contactId: 'sophie',
    title: 'Still Here',
    minChapter: 0,
    maxChapter: 5,
    requiresFlag: 'called_sophie',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Still here. Still listening. What do you need — a voice, a plan, or the world’s worst joke?',
        choices: [
          {
            id: 'voice',
            text: 'Just talk. Anything.',
            next: 'talk',
            effects: [{ type: 'trust', id: 'sophie', amount: 1 }]
          },
          {
            id: 'plan',
            text: 'Tell me what to do next.',
            next: 'plan'
          },
          {
            id: 'joke',
            text: 'Make it quick. The shadows have standards.',
            next: 'joke'
          }
        ]
      },
      talk: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'When we were twelve, you told me the alley behind the copy shop was breathing. I laughed at you for a week. I still won’t walk past it.',
        choices: [{ id: 'end', text: 'It was breathing.', next: 'end' }]
      },
      plan: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Call the people you trust. Then call the ones you don’t. The shadows hate being named.',
        effects: [{ type: 'clue', id: 'naming', text: 'Naming the shadows makes them hesitate.' }],
        choices: [{ id: 'end', text: 'I’ll do that.', next: 'end' }]
      },
      joke: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'What do you call a ghost with a great data plan? A phantom caller. Okay. Bad. But you smiled. I’m counting it.',
        choices: [{ id: 'end', text: 'I didn’t smile.', next: 'end' }]
      },
      end: {
        speaker: 'Sophie Hale',
        portrait: 'sophie',
        text: 'Keep the line open. I’ll be right here.',
        choices: []
      }
    }
  },

  // ── Mom ───────────────────────────────────────────────────────────────────
  {
    id: 'mom_first',
    contactId: 'mom',
    title: 'Mother Knows the Road',
    minChapter: 0,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'Emma? Why are you calling this late? Are you still walking? I told you to take a cab, not the old quarter.',
        choices: [
          {
            id: 'scared',
            text: 'There’s someone outside, Mom. I’m scared.',
            next: 'scared',
            effects: [
              { type: 'trust', id: 'mom', amount: 1 },
              { type: 'flag', id: 'mom_coming' }
            ]
          },
          {
            id: 'house',
            text: 'You grew up on this road. What happened to the old line?',
            next: 'house',
            effects: [{ type: 'trust', id: 'mom', amount: 1 }]
          },
          {
            id: 'calm',
            text: 'I just needed to hear you.',
            next: 'calm',
            effects: [{ type: 'trust', id: 'mom', amount: 1 }]
          }
        ]
      },
      scared: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I’m getting dressed. Stay under the lights. Don’t stop for anyone. Not even your father. Do you hear me? Not even him.',
        effects: [{ type: 'flag', id: 'mom_warned_not_dad' }, { type: 'clue', id: 'not_dad', text: 'Mom warned: do not stop for Dad on the road.' }],
        choices: [
          { id: 'why', text: 'Why would Dad come here?', next: 'dad' },
          { id: 'end', text: 'I’ll keep walking.', next: 'end' }
        ]
      },
      house: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'Your grandmother inherited it. She used to sit on the porch with the phone off the hook all night. She called it “keeping the line.” I thought it was an old woman’s superstition.',
        effects: [
          { type: 'clue', id: 'grandmother', text: 'Grandmother kept a phone off the hook all night to “keep the line.”' },
          { type: 'message', id: 'msg_grandmother' }
        ],
        choices: [
          { id: 'why', text: 'What was she keeping out?', next: 'dad' },
          { id: 'end', text: 'Thank you, Mom.', next: 'end' }
        ]
      },
      calm: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I’m here. You’re my girl, and I’m here. If the lights go out, sit on the floor and keep talking. I don’t care who hears.',
        effects: [{ type: 'trust', id: 'mom', amount: 1 }],
        choices: [{ id: 'end', text: 'I love you.', next: 'end' }]
      },
      dad: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'He never told you. When he was young, he heard the line too. He tried to cut it. The road took something from him and gave it back wrong. He’s been afraid of that porch ever since.',
        effects: [
          { type: 'flag', id: 'dad_history' },
          { type: 'clue', id: 'dad_fear', text: 'Dad cut the old phone line once. The road “took something” and gave it back wrong.' }
        ],
        choices: [{ id: 'end', text: 'Then I need to find him before he does it again.', next: 'end' }]
      },
      end: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'Keep the line. You are Mercer blood. We do not break easily.',
        choices: []
      }
    }
  },
  {
    id: 'mom_late',
    contactId: 'mom',
    title: 'The Line on the Road',
    minChapter: 3,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I’m on the road. The lights are on at the end of your street but I can’t get the car past the hedge. Emma, the road keeps turning back to the same place.',
        choices: [
          {
            id: 'trap',
            text: 'That’s not the road. It’s the line. Turn around.',
            next: 'turn',
            effects: [{ type: 'flag', id: 'mom_turned_back' }]
          },
          {
            id: 'keep',
            text: 'Keep driving. Don’t stop for anyone.',
            next: 'drive',
            effects: [{ type: 'flag', id: 'mom_on_road' }]
          }
        ]
      },
      turn: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I see it now. The same street sign. The same porch light. I’m going home. I hate it. I hate leaving you.',
        effects: [{ type: 'clue', id: 'house_loops', text: 'The line can bend the road outside.' }, { type: 'trust', id: 'mom', amount: 1 }],
        choices: [{ id: 'end', text: 'I’m not alone. I promise.', next: 'end' }]
      },
      drive: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I’m not stopping. But I can’t see the road anymore. Keep talking. If I stop hearing you, I don’t know what I’ll do.',
        effects: [{ type: 'clue', id: 'house_loops', text: 'The line can bend the road outside.' }],
        choices: [{ id: 'end', text: 'Then hear me. I’m still here.', next: 'end' }]
      },
      end: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'Dawn is coming. I can almost feel it. Do not let go of the line.',
        choices: []
      }
    }
  },
  {
    id: 'mom_repeat',
    contactId: 'mom',
    title: 'Mercer Blood',
    minChapter: 0,
    maxChapter: 5,
    requiresFlag: 'called_mom',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'What is it now? Is it your father? Is it the road? Tell me the truth and I will not panic until after we hang up.',
        choices: [
          {
            id: 'truth',
            text: 'It’s bad, Mom. Worse than before.',
            next: 'truth',
            effects: [{ type: 'trust', id: 'mom', amount: 1 }]
          },
          {
            id: 'okay',
            text: 'I’m okay. I just needed a voice.',
            next: 'okay'
          }
        ]
      },
      truth: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'Then I will keep being angry at the road for you. That is what mothers are for.',
        choices: [{ id: 'end', text: 'That’s enough.', next: 'end' }]
      },
      okay: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'You are a terrible liar. You get it from your father. Keep talking anyway.',
        choices: [{ id: 'end', text: 'Okay.', next: 'end' }]
      },
      end: {
        speaker: 'Elaine Mercer',
        portrait: 'mom',
        text: 'I’m not going anywhere.',
        choices: []
      }
    }
  },

  // ── Dad ───────────────────────────────────────────────────────────────────
  {
    id: 'dad_first',
    contactId: 'dad',
    title: 'The Breaker and the Line',
    minChapter: 0,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'You saw the streetlights? That whole block has been eating electricity since your grandmother passed.',
        choices: [
          {
            id: 'outside',
            text: 'It’s not the lights. There are things outside.',
            next: 'outside',
            effects: [{ type: 'flag', id: 'dad_told' }, { type: 'trust', id: 'dad', amount: 1 }]
          },
          {
            id: 'line',
            text: 'What is the old phone line under the road?',
            next: 'line',
            effects: [{ type: 'clue', id: 'old_line', text: 'A dead phone line runs under the road near the porch. Dad cut it once.' }]
          },
          {
            id: 'panel',
            text: 'Tell me how to keep the streetlights on.',
            next: 'secure',
            effects: [{ type: 'flag', id: 'dad_advice' }]
          }
        ]
      },
      outside: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Then stay in the light. Do not use the landline. I’m serious. I cut that line because of what it did to my mother.',
        effects: [
          { type: 'clue', id: 'landline_warning', text: 'Do not use the old landline. It once “did something” to Dad’s mother.' },
          { type: 'flag', id: 'dad_line_warning' }
        ],
        choices: [{ id: 'end', text: 'What can I use?', next: 'secure' }]
      },
      line: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'It was here before the first houses. The workers found it in the road bed. Copper with no end. I cut it with a bolt cutter. It bled. Not blood. Sound. A street full of voices.',
        effects: [
          { type: 'message', id: 'msg_dad_line' },
          { type: 'clue', id: 'line_in_foundation', text: 'The old phone line was found in the foundation and “bled sound” when cut.' }
        ],
        choices: [
          { id: 'secure', text: 'The line is why they come.', next: 'secure' },
          { id: 'end', text: 'I’m sorry I didn’t know.', next: 'secure' }
        ]
      },
      secure: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Keep to the main avenue. Under the lights. If the block goes dark, find the junction box in the old quarter. Do not cut through the park.',
        effects: [
          { type: 'clue', id: 'house_security', text: 'Stay under streetlights, avoid the park cut, and reset the junction box after an outage.' },
          { type: 'trust', id: 'dad', amount: 1 }
        ],
        choices: [{ id: 'end', text: 'I remember.', next: 'end' }]
      },
      end: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Good. And Emma— if someone knocks and sounds like me, make them say the name of your first dog. I will too.',
        choices: []
      }
    }
  },
  {
    id: 'dad_late',
    contactId: 'dad',
    title: 'A Knock at the Shelter',
    minChapter: 3,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Emma, is that you? I’m at the bus shelter. Come out. I left the car running. We can go.',
        effects: [{ type: 'flag', id: 'dad_at_door' }, { type: 'clue', id: 'dad_double', text: 'A voice at the bus shelter claims to be Dad.' }],
        choices: [
          {
            id: 'check',
            text: 'What was the name of my first dog?',
            next: 'check',
            effects: [{ type: 'flag', id: 'tested_dad' }]
          },
          {
            id: 'open',
            text: 'I’m coming out.',
            next: 'open',
            effects: [{ type: 'flag', id: 'opened_for_dad' }, { type: 'threat', amount: 12 }]
          },
          {
            id: 'stay',
            text: 'Don’t come closer. Call me from the car.',
            next: 'call',
            effects: [{ type: 'trust', id: 'dad', amount: 1 }]
          }
        ]
      },
      check: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Juniper. She was a grey dog with one torn ear. Emma, listen. I’m not at the shelter. I’m in the car. Something is using my voice. Do not come out.',
        effects: [
          { type: 'flag', id: 'dad_truth' },
          { type: 'clue', id: 'voices_copied', text: 'The shadows can copy voices. A test question breaks the copy.' },
          { type: 'trust', id: 'dad', amount: 2 }
        ],
        choices: [{ id: 'end', text: 'I won’t.', next: 'end' }]
      },
      open: {
        speaker: 'Narrator',
        portrait: 'narrator',
        text: 'The shelter glass slides open. There is no car. No father. On the bench is a pair of wet shoes, arranged as if someone is still standing in them.',
        effects: [{ type: 'message', id: 'msg_empty_door' }, { type: 'clue', id: 'empty_door', text: 'Something can copy Dad’s voice. It left wet shoes at the shelter.' }],
        choices: [{ id: 'end', text: 'Back away.', next: 'end' }]
      },
      call: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'I can hear them on the road. Emma, keep walking. I love you. If I don’t— if the line goes dead— do not answer the last call.',
        effects: [
          { type: 'flag', id: 'dad_last_warning' },
          { type: 'clue', id: 'last_call_warning', text: 'Dad warned: do not answer the last call.' }
        ],
        choices: [{ id: 'end', text: 'I love you too.', next: 'end' }]
      },
      end: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Good girl. Keep the line.',
        choices: []
      }
    }
  },
  {
    id: 'dad_repeat',
    contactId: 'dad',
    title: 'Practical Advice',
    minChapter: 0,
    maxChapter: 5,
    requiresFlag: 'called_dad',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Still awake. Still scared. Right. Tell me what part of the road is wrong.',
        choices: [
          {
            id: 'doors',
            text: 'The streetlights. Something is switching them off.',
            next: 'doors'
          },
          {
            id: 'line',
            text: 'The phone keeps going quiet.',
            next: 'line'
          }
        ]
      },
      doors: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Then make the light work for you. Cross at the next lamp, keep the phone in your hand, and do not stop between pools of light.',
        effects: [{ type: 'clue', id: 'fortify', text: 'Keeping to lit crossings measurably slows the shadows.' }],
        choices: [{ id: 'end', text: 'Okay.', next: 'end' }]
      },
      line: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'Silence is how they travel. When the line goes quiet, say something true. Anything. They hate a sentence they cannot finish.',
        effects: [{ type: 'clue', id: 'truth_ward', text: 'Speaking something true makes the shadows hesitate.' }],
        choices: [{ id: 'end', text: 'Something true.', next: 'end' }]
      },
      end: {
        speaker: 'Robert Mercer',
        portrait: 'dad',
        text: 'You’re doing fine. I mean it.',
        choices: []
      }
    }
  },

  // ── Daniel ────────────────────────────────────────────────────────────────
  {
    id: 'daniel_first',
    contactId: 'daniel',
    title: 'The One Who Didn’t Come',
    minChapter: 0,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Emma. I’m sorry. I know I said I’d walk you home. Something happened. I’m— I’m not far.',
        choices: [
          {
            id: 'where',
            text: 'Where are you? I can hear the road in your voice.',
            next: 'where',
            effects: [{ type: 'flag', id: 'daniel_suspected' }]
          },
          {
            id: 'come',
            text: 'Meet me on Lantern Avenue. Right now.',
            next: 'come'
          },
          {
            id: 'why',
            text: 'Why didn’t you answer any of my messages?',
            next: 'why',
            effects: [{ type: 'trust', id: 'daniel', amount: 1 }]
          }
        ]
      },
      where: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'I can’t tell you. If I say it out loud, it finds the road. Emma, I was there earlier. I saw the inside of your house before I ever reached the porch.',
        effects: [
          { type: 'clue', id: 'daniel_vision', text: 'Daniel saw the inside of the house before reaching the porch.' },
          { type: 'flag', id: 'daniel_inside_vision' }
        ],
        choices: [{ id: 'end', text: 'Then stay on the line with me.', next: 'promise' }]
      },
      come: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'If I come, I need you to leave the porch light on. And if I knock twice, then once—? No. If I knock at all, don’t open it. I don’t know which one of us will be standing there.',
        effects: [{ type: 'flag', id: 'daniel_coming' }, { type: 'clue', id: 'daniel_double', text: 'Daniel is not sure he can trust himself on the road.' }],
        choices: [{ id: 'end', text: 'I’ll leave the light on.', next: 'promise' }]
      },
      why: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Because the messages deleted themselves after I read them. Yours too. I thought I was losing my mind. Then I got one that said your name and a time. 6:00 AM. It didn’t say what happens at 6:00 AM.',
        effects: [
          { type: 'flag', id: 'daniel_deadline' },
          { type: 'clue', id: 'deadline', text: 'Daniel received a message with Emma’s name and the time 6:00 AM.' },
          { type: 'message', id: 'msg_daniel_deadline' }
        ],
        choices: [{ id: 'end', text: 'Then we both have until morning.', next: 'promise' }]
      },
      promise: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'I’m going to tell you one true thing, and then I’m going to hang up before you ask me how I know. The shadows are not afraid of the phone. They are afraid of being remembered. Keep remembering, Emma.',
        effects: [
          { type: 'clue', id: 'memory_ward', text: 'The shadows fear being remembered by more than one person.' },
          { type: 'flag', id: 'daniel_memory_truth' },
          { type: 'trust', id: 'daniel', amount: 1 }
        ],
        choices: [{ id: 'end', text: 'I’ll remember you.', next: 'end' }]
      },
      end: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Keep the porch light on. If you see me, make me say your middle name.',
        choices: []
      }
    }
  },
  {
    id: 'daniel_late',
    contactId: 'daniel',
    title: 'The Road Answers',
    minChapter: 2,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Emma. I’m at the corner. No— don’t look. If you look, it will know I came.',
        choices: [
          {
            id: 'trust',
            text: 'I trust you. What do you need me to do?',
            next: 'trust',
            effects: [{ type: 'trust', id: 'daniel', amount: 2 }]
          },
          {
            id: 'test',
            text: 'What’s my middle name?',
            next: 'test',
            effects: [{ type: 'flag', id: 'tested_daniel' }]
          }
        ]
      },
      trust: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'The old line under the road, near your porch. It is still connected. Not to the phone company. To them. If you cut it while someone is on the line, they will have to choose between you and the voice. Choose the voice.',
        effects: [
          { type: 'flag', id: 'daniel_cut_line' },
          { type: 'clue', id: 'cut_line', text: 'The old line under the road connects to the shadows. Cut it while connected to someone.' }
        ],
        choices: [{ id: 'end', text: 'I can do that.', next: 'end' }]
      },
      test: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Rose. You hate it. You made me promise never to use it at work. Emma, it’s me. I’m not at the corner. I’m in the car. Don’t look at the corner.',
        effects: [
          { type: 'flag', id: 'daniel_truth' },
          { type: 'clue', id: 'window_lie', text: 'Daniel is in the car. Something is imitating him at the corner.' },
          { type: 'threat', amount: 4 }
        ],
        choices: [{ id: 'end', text: 'I’m not looking.', next: 'end' }]
      },
      end: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'Whatever happens, don’t answer the phone at 6:00. Promise me.',
        choices: []
      }
    }
  },
  {
    id: 'daniel_repeat',
    contactId: 'daniel',
    title: 'One More Voice',
    minChapter: 0,
    maxChapter: 5,
    requiresFlag: 'called_daniel',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'I’m still here. Still in the car. Still afraid. What do you need?',
        choices: [
          {
            id: 'talk',
            text: 'Tell me something that happened before tonight.',
            next: 'talk'
          },
          {
            id: 'warn',
            text: 'If I don’t call again, warn them.',
            next: 'warn',
            effects: [{ type: 'trust', id: 'daniel', amount: 1 }]
          }
        ]
      },
      talk: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'The first time you brought me down Lantern Avenue, you stopped under the broken light and said, “This street is always listening.” I thought you were being dramatic. I keep hearing that sentence now.',
        choices: [{ id: 'end', text: 'I wasn’t being dramatic.', next: 'end' }]
      },
      warn: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'I’ll call every number you gave me. I’ll tell them your name. I’ll keep saying it until someone answers.',
        choices: [{ id: 'end', text: 'Thank you.', next: 'end' }]
      },
      end: {
        speaker: 'Daniel Reyes',
        portrait: 'daniel',
        text: 'I love you. That’s still true. Keep it.',
        choices: []
      }
    }
  },

  // ── Alex ──────────────────────────────────────────────────────────────────
  {
    id: 'alex_first',
    contactId: 'alex',
    title: 'The Road That Calls Back',
    minChapter: 1,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Emma? Oh, thank God. I’ve been trying to reach you since I saw the thing under the streetlight outside the copy shop. Tell me you haven’t answered the phone.',
        choices: [
          {
            id: 'what',
            text: 'What thing? What do you know?',
            next: 'what',
            effects: [{ type: 'trust', id: 'alex', amount: 1 }]
          },
          {
            id: 'answer',
            text: 'The phone keeps ringing. Should I answer?',
            next: 'answer'
          }
        ]
      },
      what: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'The old stories call them the Quiet. They gather around people who have been forgotten. The old roads have a line running under them. The Quiet use it like a drain. Every unanswered call is a door opening.',
        effects: [
          { type: 'clue', id: 'quiet', text: 'The creatures are called the Quiet. They gather around forgotten people.' },
          { type: 'flag', id: 'alex_rules' }
        ],
        choices: [
          { id: 'weak', text: 'How do I hurt them?', next: 'weak' },
          { id: 'origin', text: 'Why the old quarter?', next: 'origin' }
        ]
      },
      answer: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Not the unknown number. Never the unknown number. Answer people who know your name. The Quiet can copy a voice, but they cannot remember a history.',
        effects: [
          { type: 'clue', id: 'quiet_copy', text: 'The Quiet can copy voices but cannot remember a shared history.' },
          { type: 'flag', id: 'alex_rules' }
        ],
        choices: [
          { id: 'weak', text: 'How do I hurt them?', next: 'weak' },
          { id: 'end', text: 'I’ll remember that.', next: 'end' }
        ]
      },
      weak: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Names. True names. A voice that knows you. And the old line— cut it or break its connection, and the Quiet lose their road. There is a reason your family never moved away from the old quarter.',
        effects: [
          { type: 'clue', id: 'shadow_weakness', text: 'True names, shared memories, and cutting the old line can repel the Quiet.' },
          { type: 'flag', id: 'knows_weakness' }
        ],
        choices: [{ id: 'end', text: 'Then I’ll make them remember me.', next: 'end' }]
      },
      origin: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Because your grandmother made a promise to something in the foundation. A promise that every generation would keep one line open. Your family has been feeding it for a hundred years. Tonight it wants the rest of you.',
        effects: [
          { type: 'clue', id: 'family_promise', text: 'Grandmother made a promise to something in the foundation. The family has kept the line open for generations.' },
          { type: 'flag', id: 'family_promise' }
        ],
        choices: [{ id: 'end', text: 'It won’t get the rest of me.', next: 'end' }]
      },
      end: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Keep a voice on the line. I’ll be here. And Emma— if you hear me asking you to answer the last call, it isn’t me.',
        choices: []
      }
    }
  },
  {
    id: 'alex_late',
    contactId: 'alex',
    title: 'The Tree with Teeth',
    minChapter: 2,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'I found the drawing. The one I made when I was eight. I drew your street with all the windows black and a telephone under the pavement. I drew something holding the other end.',
        effects: [{ type: 'message', id: 'msg_alex_drawing' }, { type: 'clue', id: 'drawing', text: 'Alex drew the street and a telephone under the pavement as a child.' }],
        choices: [
          {
            id: 'thing',
            text: 'What was holding the other end?',
            next: 'thing'
          },
          {
            id: 'help',
            text: 'Can you meet me on the road?',
            next: 'help',
            effects: [{ type: 'flag', id: 'alex_coming' }]
          }
        ]
      },
      thing: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'A woman made of the space where a name should be. She had a crown. No— not a crown. A scar. Emma, I think your grandmother promised her a body. And she has been waiting for one ever since.',
        effects: [
          { type: 'clue', id: 'scarred_woman', text: 'A woman made of absence, marked with a crown-shaped scar, waits on the other end of the line.' },
          { type: 'flag', id: 'scarred_woman' }
        ],
        choices: [{ id: 'end', text: 'Then I’ll make her wait forever.', next: 'end' }]
      },
      help: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'I’m halfway there. If I see a light on, I’ll follow it. If the light moves, I’m running. Don’t hang up if I start screaming. That’s how they get people. They make you hang up.',
        effects: [{ type: 'clue', id: 'dont_hang_up', text: 'Do not hang up when someone screams; the Quiet rely on broken calls.' }],
        choices: [{ id: 'end', text: 'I won’t hang up.', next: 'end' }]
      },
      end: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'The sun is a few hours away. We can do a few hours.',
        choices: []
      }
    }
  },
  {
    id: 'alex_repeat',
    contactId: 'alex',
    title: 'Lore Keeper',
    minChapter: 1,
    maxChapter: 5,
    requiresFlag: 'called_alex',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'What do you need to know? I have about twenty years of bad sleep and a notebook full of worse stories.',
        choices: [
          {
            id: 'names',
            text: 'Do the creatures have names?',
            next: 'names',
            effects: [{ type: 'clue', id: 'no_names', text: 'The Quiet have no names people can read. Naming them aloud makes them wince.' }]
          },
          {
            id: 'calls',
            text: 'Why does calling keep them away?',
            next: 'calls',
            effects: [{ type: 'clue', id: 'connection', text: 'The shadows feed on isolation. Connection is the only ward.' }]
          }
        ]
      },
      names: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'They have names. They just don’t have anyone left who remembers them. Say a name with enough love in it and the whole street remembers for a second. That hurts them.',
        choices: [{ id: 'end', text: 'Good.', next: 'end' }]
      },
      calls: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Because a call is proof that you exist to someone. They can imitate a voice. They can’t imitate being remembered.',
        choices: [{ id: 'end', text: 'Keep remembering me.', next: 'end' }]
      },
      end: {
        speaker: 'Alex Chen',
        portrait: 'alex',
        text: 'Try not to become a story. Try to stay a person.',
        choices: []
      }
    }
  },

  // ── Jessica ───────────────────────────────────────────────────────────────
  {
    id: 'jessica_first',
    contactId: 'jessica',
    title: 'The Sister Who Left',
    minChapter: 2,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'You’re calling because the road is awake. I wondered which night it would be. I hoped you would take a cab.',
        choices: [
          {
            id: 'know',
            text: 'You knew about this. You left us here.',
            next: 'know',
            effects: [{ type: 'flag', id: 'jessica_confronted' }]
          },
          {
            id: 'why',
            text: 'Why did you never tell me?',
            next: 'why',
            effects: [{ type: 'trust', id: 'jessica', amount: 1 }]
          },
          {
            id: 'help',
            text: 'I’m not calling to fight. I need help.',
            next: 'help',
            effects: [{ type: 'trust', id: 'jessica', amount: 1 }]
          }
        ]
      },
      know: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'I left because it asked me to stay. It curled around my window at night and said my name in Mom’s voice. I was sixteen. I ran. I left you because I was afraid if I stayed, it would take us both.',
        effects: [
          { type: 'clue', id: 'jessica_house', text: 'The road spoke to Jessica in their mother’s voice.' },
          { type: 'trust', id: 'jessica', amount: 1 }
        ],
        choices: [{ id: 'why', text: 'What does it want with me?', next: 'why' }]
      },
      why: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'Because you stayed. Because you kept the line open. Because it has had a hundred years to learn what love sounds like, and you are the first person in this family who still picks up.',
        effects: [
          { type: 'clue', id: 'jessica_line', text: 'The old line has learned to imitate love by listening to the family’s calls.' },
          { type: 'flag', id: 'jessica_line' }
        ],
        choices: [{ id: 'help', text: 'Tell me how to end it.', next: 'help' }]
      },
      help: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'There is a final call at dawn. It will sound like the person you miss most. Do not answer it until you know your own name. It can copy anyone, Emma. It cannot copy you if you refuse to be a memory.',
        effects: [
          { type: 'clue', id: 'jessica_truth', text: 'At dawn, the road makes a final call in the voice of the person you miss most. Do not answer until you know your own name.' },
          { type: 'flag', id: 'jessica_truth' },
          { type: 'trust', id: 'jessica', amount: 1 }
        ],
        choices: [{ id: 'end', text: 'Then I’ll remember who I am.', next: 'end' }]
      },
      end: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'You were always braver than me. I’m sorry I made you find that out alone.',
        choices: []
      }
    }
  },
  {
    id: 'jessica_late',
    contactId: 'jessica',
    title: 'The Night You Were Born',
    minChapter: 3,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'I’m going to tell you something I have never said. The night you were born, the old house at the end of the road was full of people. By morning it was empty. Mom said they left. I remember the line was off the hook.',
        effects: [
          { type: 'clue', id: 'birth_night', text: 'The night Emma was born, the house at the end of the road was full of people; by morning it was empty.' },
          { type: 'flag', id: 'jessica_birth_night' }
        ],
        choices: [
          {
            id: 'question',
            text: 'Who were the people?',
            next: 'people'
          },
          {
            id: 'forgive',
            text: 'You were a child. I don’t blame you for leaving.',
            next: 'forgive',
            effects: [{ type: 'trust', id: 'jessica', amount: 2 }, { type: 'flag', id: 'jessica_forgiven' }]
          }
        ]
      },
      people: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'I thought they were family. They all had our faces. Mom was in the kitchen. Dad was in the hall. You were asleep. And then there was a woman in my room who looked like me but older. She told me to leave before she became me.',
        effects: [
          { type: 'clue', id: 'copied_family', text: 'Jessica saw copies of the family in the house the night Emma was born.' },
          { type: 'flag', id: 'copies_exist' }
        ],
        choices: [{ id: 'end', text: 'And you left.', next: 'end' }]
      },
      forgive: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'I have spent twenty years being angry at a road because I could not be angry at myself. Thank you.',
        choices: [{ id: 'end', text: 'Stay on the line.', next: 'end' }]
      },
      end: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'If you see a copy of me, ask it about the scar on my left knee. It won’t know. It never knows.',
        choices: []
      }
    }
  },
  {
    id: 'jessica_repeat',
    contactId: 'jessica',
    title: 'Still Your Sister',
    minChapter: 2,
    maxChapter: 5,
    requiresFlag: 'called_jessica',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'I’m here. I’m not good at this, but I’m here. What is it?',
        choices: [
          {
            id: 'line',
            text: 'The phone is getting hot.',
            next: 'line',
            effects: [{ type: 'clue', id: 'hot_phone', text: 'The phone heats up when the shadows are close to the line.' }]
          },
          {
            id: 'name',
            text: 'Tell me my name. The way you used to.',
            next: 'name',
            effects: [{ type: 'trust', id: 'jessica', amount: 1 }]
          }
        ]
      },
      line: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'Put it down. Don’t hang up, just put it down and step back. If the screen goes dark, come back and say my name. I’ll still be here.',
        choices: [{ id: 'end', text: 'Okay.', next: 'end' }]
      },
      name: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'Emma Rose Mercer. My little sister. The one who used to hide in the closet with a flashlight so the dark would not feel empty. I remember you. Keep remembering me.',
        choices: [{ id: 'end', text: 'I remember.', next: 'end' }]
      },
      end: {
        speaker: 'Jessica Mercer',
        portrait: 'jessica',
        text: 'Keep the line. Let dawn do the rest.',
        choices: []
      }
    }
  },

  // ── Mike ──────────────────────────────────────────────────────────────────
  {
    id: 'mike_first',
    contactId: 'mike',
    title: 'The Neighbor across the Road',
    minChapter: 0,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'Emma? What’s going on over there? Your porch light keeps turning on by itself. I was going to call you.',
        choices: [
          {
            id: 'garden',
            text: 'There’s something under the streetlight. Can you see it from your porch?',
            next: 'garden',
            effects: [{ type: 'trust', id: 'mike', amount: 1 }]
          },
          {
            id: 'come',
            text: 'Can you drive down and meet me? Please.',
            next: 'come'
          },
          {
            id: 'stay',
            text: 'Stay on the line. I don’t want to be alone.',
            next: 'stay',
            effects: [{ type: 'trust', id: 'mike', amount: 1 }]
          }
        ]
      },
      garden: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I can see the next streetlight from here. There’s a shape under it. It— it just got taller. Emma, I’m going to turn on all my porch lights. Stay where I can see you.',
        effects: [
          { type: 'flag', id: 'mike_lights' },
          { type: 'clue', id: 'garden_shape', text: 'Mike sees a shape under the streetlight that grows taller when observed.' }
        ],
        choices: [{ id: 'end', text: 'Stay under the light.', next: 'end' }]
      },
      come: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’ll try. If I stop answering, don’t call the police. They came last year and said the road didn’t exist. My wife thinks I imagined it. I didn’t.',
        effects: [{ type: 'flag', id: 'mike_coming' }, { type: 'clue', id: 'road_missing', text: 'Police once failed to find the road to Emma’s street.' }],
        choices: [{ id: 'end', text: 'Be careful.', next: 'end' }]
      },
      stay: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’m here. My wife’s asleep. I can keep the porch light on. If you see more than one shadow, tell me and I’ll make noise. They don’t like noise.',
        effects: [{ type: 'clue', id: 'noise', text: 'The shadows dislike sudden noise.' }],
        choices: [{ id: 'end', text: 'Thank you, Mike.', next: 'end' }]
      },
      end: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'You’ve got this. Keep the light on.',
        choices: []
      }
    }
  },
  {
    id: 'mike_late',
    contactId: 'mike',
    title: 'The Road That Isn’t There',
    minChapter: 3,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’m on your street. I don’t remember driving here. The road is gone. There’s only streetlights and your house and a sky that doesn’t have any stars.',
        choices: [
          {
            id: 'inside',
            text: 'Get to the porch. Now. I can see the light from here.',
            next: 'inside',
            effects: [{ type: 'trust', id: 'mike', amount: 2 }, { type: 'flag', id: 'mike_inside' }]
          },
          {
            id: 'run',
            text: 'Run. Don’t look at the streetlights.',
            next: 'run',
            effects: [{ type: 'flag', id: 'mike_ran' }]
          }
        ]
      },
      inside: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’m at the end of your road. I see you under the light. If I call and you don’t recognize my voice, don’t answer. I’m not sure how much of me drove here.',
        effects: [{ type: 'clue', id: 'mike_arrived', text: 'Mike reached the end of the road. He is not sure how much of himself arrived.' }],
        choices: [{ id: 'end', text: 'I’m coming.', next: 'end' }]
      },
      run: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’m running. The trees keep moving ahead of me. Emma, if I don’t call back, don’t look for me. The line is more important.',
        effects: [{ type: 'clue', id: 'mike_lost', text: 'Mike tried to run; the trees moved ahead of him.' }],
        choices: [{ id: 'end', text: 'Find the road, Mike.', next: 'end' }]
      },
      end: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'Keep talking. The road listens.',
        choices: []
      }
    }
  },
  {
    id: 'mike_repeat',
    contactId: 'mike',
    title: 'A Light on the Road',
    minChapter: 0,
    maxChapter: 5,
    requiresFlag: 'called_mike',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'Nothing new on my side. Same streetlight. Same not-stars. Your voice is the only thing that sounds real.',
        choices: [
          {
            id: 'stay',
            text: 'Then stay. Tell me about the road.',
            next: 'stay'
          },
          {
            id: 'check',
            text: 'Check the street again.',
            next: 'check',
            effects: [{ type: 'trust', id: 'mike', amount: 1 }]
          }
        ]
      },
      stay: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'There was a turnout by the old oak. My dad used to take us there to fish. If the road comes back, that’s where it will be. I’ll keep looking.',
        choices: [{ id: 'end', text: 'Keep looking.', next: 'end' }]
      },
      check: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'One shadow. It’s standing under the streetlight at the corner. It has its hands folded like it’s praying. I don’t think it’s praying.',
        choices: [{ id: 'end', text: 'Get away from the corner.', next: 'end' }]
      },
      end: {
        speaker: 'Mike Boyd',
        portrait: 'mike',
        text: 'I’m still here.',
        choices: []
      }
    }
  },

  // ── Priya ─────────────────────────────────────────────────────────────────
  {
    id: 'priya_first',
    contactId: 'priya',
    title: 'Six Roads, Six Silences',
    minChapter: 1,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Emma. Before you say anything: I got the same message. I’ve been reading about disappearances. Six night roads. Six families. Every single one had an old telephone line that should not exist.',
        choices: [
          {
            id: 'pattern',
            text: 'Tell me the pattern.',
            next: 'pattern',
            effects: [{ type: 'trust', id: 'priya', amount: 1 }]
          },
          {
            id: 'people',
            text: 'Who disappeared?',
            next: 'people'
          },
          {
            id: 'why',
            text: 'Why are you helping me?',
            next: 'why'
          }
        ]
      },
      pattern: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Each family kept a phone line active for generations. Each disappearance happened when the line went silent for more than a few hours. The survivors all said the same thing: a voice kept them alive until dawn.',
        effects: [
          { type: 'clue', id: 'priya_pattern', text: 'Six disappearances linked to old phone lines. Survivors say a voice kept them alive until dawn.' },
          { type: 'flag', id: 'priya_pattern' }
        ],
        choices: [{ id: 'people', text: 'Did anyone survive?', next: 'people' }]
      },
      people: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'One. A woman in her eighties. She called her sister every hour until sunrise. She said the shadows are just lonely. That is the part I cannot stop thinking about. They are not hunting. They are trying to be let in.',
        effects: [
          { type: 'clue', id: 'lonely_shadows', text: 'A survivor says the shadows are lonely, not malicious. They want to be let in.' },
          { type: 'flag', id: 'shadows_lonely' }
        ],
        choices: [{ id: 'end', text: 'That is worse.', next: 'end' }]
      },
      why: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Because my cousin disappeared from a road like yours two years ago. No body. No file. A phone line that no one could explain. I am not letting this story end the same way.',
        effects: [{ type: 'clue', id: 'priya_cousin', text: 'Priya’s cousin disappeared from a similar night road two years ago.' }, { type: 'trust', id: 'priya', amount: 2 }],
        choices: [{ id: 'end', text: 'Then help me write a different ending.', next: 'end' }]
      },
      end: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Keep calling. I’m correlating everything you tell me. We can find the pattern before dawn.',
        choices: []
      }
    }
  },
  {
    id: 'priya_late',
    contactId: 'priya',
    title: 'The Last Call',
    minChapter: 3,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'I found it. The line under your road is not a phone line. It’s a boundary. Someone made it to keep something in. Every call you make is a tiny permission for the outside to listen.',
        choices: [
          {
            id: 'then',
            text: 'Then why do the calls keep me safe?',
            next: 'then'
          },
          {
            id: 'break',
            text: 'How do I close the boundary?',
            next: 'break',
            effects: [{ type: 'flag', id: 'priya_boundary' }]
          }
        ]
      },
      then: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Because a voice is still a boundary. As long as someone knows you are out there, the road cannot pretend you were never here. That is the horror of it. Love is infrastructure.',
        effects: [{ type: 'clue', id: 'love_infrastructure', text: 'Human connection is the boundary keeping the road from remaking Emma.' }],
        choices: [{ id: 'break', text: 'Then how do I survive until dawn?', next: 'break' }]
      },
      break: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'Do not let the call end on the road’s terms. Make your own last call. Choose who gets to remember you. If you close the boundary, the line will try to make a final call in the voice of someone you cannot refuse.',
        effects: [
          { type: 'clue', id: 'final_call', text: 'Choose your own last call. The road will try to answer in the voice of someone you cannot refuse.' },
          { type: 'flag', id: 'priya_final_warning' }
        ],
        choices: [{ id: 'end', text: 'I will choose.', next: 'end' }]
      },
      end: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'I’ll be awake. If you need a witness, call me. I will remember you.',
        choices: []
      }
    }
  },
  {
    id: 'priya_repeat',
    contactId: 'priya',
    title: 'The Archive',
    minChapter: 1,
    maxChapter: 5,
    requiresFlag: 'called_priya',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'I’m still here. Still reading. What do you need?',
        choices: [
          {
            id: 'names',
            text: 'Is there a way to make them stop permanently?',
            next: 'names',
            effects: [{ type: 'clue', id: 'names_permanent', text: 'A true name spoken by someone who remembers can close the line permanently.' }]
          },
          {
            id: 'voice',
            text: 'Talk to me about anything else.',
            next: 'voice',
            effects: [{ type: 'trust', id: 'priya', amount: 1 }]
          }
        ]
      },
      names: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'A name. Not a label. A name someone remembers being called. If you can give the thing at the other end a true name, it may remember what it was before it became hungry.',
        choices: [{ id: 'end', text: 'I might know one.', next: 'end' }]
      },
      voice: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'I have a cat named Tofu. He is asleep on my keyboard. He is the only thing in this apartment that has never once been scary.',
        choices: [{ id: 'end', text: 'Tell Tofu I said hi.', next: 'end' }]
      },
      end: {
        speaker: 'Priya Nair',
        portrait: 'priya',
        text: 'I’m listening.',
        choices: []
      }
    }
  },

  // ── Unknown ───────────────────────────────────────────────────────────────
  {
    id: 'unknown_incoming',
    contactId: 'unknown',
    title: 'No Area Code',
    minChapter: 1,
    maxChapter: 5,
    once: true,
    start: 'start',
    nodes: {
      start: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'Emma. You answered. Good. The others are listening to us now. Do not be afraid. They only come when you are alone. I am not going to let that happen.',
        choices: [
          {
            id: 'who',
            text: 'Who are you?',
            next: 'who',
            effects: [{ type: 'flag', id: 'unknown_spoke' }]
          },
          {
            id: 'liar',
            text: 'You’re the one sending the messages. You’re one of them.',
            next: 'liar',
            effects: [{ type: 'flag', id: 'unknown_confronted' }]
          },
          {
            id: 'hang',
            text: 'I’m not talking to you.',
            next: 'hang',
            effects: [{ type: 'flag', id: 'unknown_declined' }, { type: 'threat', amount: 8 }]
          }
        ]
      },
      who: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'I am the thing on the other end of the line. I was a woman once. I had a name that someone forgot. If you keep calling, I can remember enough of it to keep the road from closing. But I need something from you.',
        effects: [
          { type: 'clue', id: 'unknown_truth', text: 'The voice on the line was once a woman whose name was forgotten.' },
          { type: 'flag', id: 'unknown_truth' }
        ],
        choices: [
          { id: 'what', text: 'What do you need?', next: 'what' },
          { id: 'no', text: 'You don’t get anything from me.', next: 'hang' }
        ]
      },
      what: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'Your name. Not the one your family gave you. The one you gave yourself when you were small and the dark was already in the house at the end of the road. Give me that name at dawn, and I will let you go.',
        effects: [{ type: 'flag', id: 'unknown_invitation' }, { type: 'clue', id: 'unknown_invitation', text: 'The unknown caller wants the secret name Emma gave herself as a child.' }],
        choices: [
          { id: 'end', text: 'I’ll think about it.', next: 'end' },
          { id: 'refuse', text: 'I’ll find another way.', next: 'end', effects: [{ type: 'flag', id: 'unknown_refused' }] }
        ]
      },
      liar: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'Yes. And no. I am the reason they come, and the reason they stop. Your grandmother gave me a home. You can call that evil if you need to. I call it a bargain that has lasted a hundred years.',
        effects: [{ type: 'flag', id: 'unknown_truth_partial' }, { type: 'clue', id: 'grandmother_bargain', text: 'The unknown caller made a bargain with Emma’s grandmother.' }],
        choices: [
          { id: 'what', text: 'What did you promise her?', next: 'what' },
          { id: 'end', text: 'I’m ending it.', next: 'end', effects: [{ type: 'flag', id: 'unknown_refused' }] }
        ]
      },
      hang: {
        speaker: 'Narrator',
        portrait: 'narrator',
        text: 'The line goes dead. Every streetlight on the block dims at once. The silence that follows is not empty. It has a shape.',
        effects: [{ type: 'call', id: 'unknown_declined' }],
        choices: [{ id: 'end', text: 'Put the phone down.', next: 'end' }]
      },
      end: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'At dawn, I will call you one last time. Remember: I only need a name. You have so many.',
        choices: []
      }
    }
  },
  {
    id: 'unknown_return',
    contactId: 'unknown',
    title: 'Calling Back',
    minChapter: 2,
    maxChapter: 5,
    once: true,
    requiresFlag: 'unknown_contact_unlocked',
    start: 'start',
    nodes: {
      start: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'You called me. That was brave. Or lonely. With you they are often the same thing.',
        choices: [
          {
            id: 'name',
            text: 'Did my grandmother give you a name?',
            next: 'name'
          },
          {
            id: 'deal',
            text: 'What happens if I give you my name?',
            next: 'deal'
          },
          {
            id: 'save',
            text: 'Can you keep my friends alive?',
            next: 'save',
            effects: [{ type: 'flag', id: 'unknown_asked_save' }]
          }
        ]
      },
      name: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'She called me Mara. It was not my name. It was the name of the daughter she lost. I wore it for sixty years. I am tired of wearing a dead girl.',
        effects: [
          { type: 'clue', id: 'mara_name', text: 'Grandmother called the thing on the line “Mara,” after a daughter she lost.' },
          { type: 'flag', id: 'unknown_mara' }
        ],
        choices: [{ id: 'end', text: 'Then I will find your real name.', next: 'end' }]
      },
      deal: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'You will forget the road. You will forget the line. You will remember only that you were loved. It is not nothing, Emma. Most people would take it.',
        effects: [{ type: 'flag', id: 'unknown_offered_escape' }],
        choices: [{ id: 'end', text: 'I am not most people.', next: 'end' }]
      },
      save: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'I can keep them from crossing my line. I cannot keep them from being forgettable. Tell them what you know. Make them remember each other. That is the only thing I cannot unmake.',
        effects: [
          { type: 'clue', id: 'unknown_save', text: 'The unknown caller can hold the line, but only remembered connections can save the others.' },
          { type: 'flag', id: 'warn_contacts_for_secret' }
        ],
        choices: [{ id: 'end', text: 'Then I will make them remember.', next: 'end' }]
      },
      end: {
        speaker: 'Unknown',
        portrait: 'unknown',
        text: 'If you choose the last call, I will be listening. I have been listening for a very long time.',
        choices: []
      }
    }
  }
];

export const callById = Object.fromEntries(calls.map((call) => [call.id, call]));

export const callsForContact = (contactId: string): CallDef[] =>
  calls.filter((call) => call.contactId === contactId);
