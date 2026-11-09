import type { DialogueDef } from '@/core/types';

export const dialogues: DialogueDef[] = [
  {
    id: 'kaelen_bastion', title: 'The Grey Knight', start: 'start',
    nodes: {
      start: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'You are awake. Good. For a moment I thought the mark had taken the rest of you. The courtyard is crawling with ash raiders, and the gate has grown a keeper. We can discuss theology after we are not dead.',
        choices: [
          { id: 'banter', text: 'You look worse than I feel.', tone: 'clever', next: 'banter', effects: [{ type: 'approval', id: 'kaelen', amount: 2 }] },
          { id: 'mark', text: 'What happened to me? What is this mark?', next: 'mark' },
          { id: 'who', text: 'Who are you, exactly?', next: 'who' },
          { id: 'dream', text: 'I have seen this mark before. In a dream that was not mine.', requiresAncestry: 'aelborn', tag: 'Aelborn', next: 'dream', effects: [{ type: 'flag', id: 'mark_dream_lore' }] },
          { id: 'move', text: 'We need to move. What do you know about the Warden?', next: 'plan' }
        ]
      },
      banter: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I have been told that before. Usually by people who then required rescuing. Stay close, and try not to prove me right.',
        choices: [
          { id: 'ask', text: 'The mark. Tell me what you saw.', next: 'mark' },
          { id: 'plan', text: 'The Warden. Talk.', next: 'plan' }
        ]
      },
      mark: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'You died. Briefly. Something came out of the dark and put its hand where your heart should be. Then you breathed again. The mark is not a wound. It looks like a piece of something that was removed.',
        choices: [
          { id: 'willkill', text: 'Will it kill me?', next: 'mark2' },
          { id: 'insight', text: 'You are not telling me everything.', check: { stat: 'wis', dc: 13, proficiency: 'Insight', label: 'Insight' }, successNext: 'insight_success', failureNext: 'insight_fail' },
          { id: 'plan', text: 'Later. The Warden first.', next: 'plan' }
        ]
      },
      mark2: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'Everything kills you eventually. This just seems more creative about it. The Choir will call it a blessing. The Covenant will call it a crime. I would call it a reason to leave before either finds us.',
        choices: [{ id: 'plan', text: 'Then let us leave.', next: 'plan' }]
      },
      insight_success: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'You are perceptive. Fine. I have seen a mark like that once before, on a man I was ordered to kill. He did not stay dead either. I helped bury what was left of him. That is all I will say until we are somewhere with fewer knives.',
        effects: [{ type: 'flag', id: 'kaelen_mark_secret' }, { type: 'approval', id: 'kaelen', amount: 3 }],
        choices: [{ id: 'plan', text: 'I will hold you to that.', next: 'plan' }]
      },
      insight_fail: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I am telling you enough. There is a difference between a secret and a weapon. I am not ready to hand you the second one.',
        choices: [{ id: 'plan', text: 'Fine. We move.', next: 'plan' }]
      },
      who: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'Kaelen Voss. Once a captain of the Grey Watch. Now a man with a sword and a talent for arriving after the worst has happened. I was stationed here when the Bastion fell. I have been trying to leave it ever since.',
        choices: [
          { id: 'watch', text: 'The Grey Watch served the Covenant.', next: 'who2' },
          { id: 'mark', text: 'Why did you save me?', next: 'mark' }
        ]
      },
      who2: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'It did. The Watch served the Covenant. I served the Watch. Somewhere in there, I stopped being able to tell the difference between an order and a sin. That is not a story for a courtyard. Not yet.',
        choices: [{ id: 'plan', text: 'Then let us survive the courtyard.', next: 'plan' }]
      },
      dream: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'The Aelborn dream sideways. I have learned not to ask what they see. But if the mark was already in your dreams, then it did not choose you here. It was waiting for you to arrive.',
        choices: [{ id: 'plan', text: 'Then it can wait a little longer.', next: 'plan' }]
      },
      plan: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'The raiders are in the eastern courtyard. Kill them or drive them off, and the Warden will wake. The Warden is old stone and older rage. When it falls, the postern road to Greymoor opens. Stay at my side and keep your mark away from its mouth.',
        effects: [
          { type: 'flag', id: 'kaelen_talked' },
          { type: 'quest', id: 'q_marked', value: 'start' },
          { type: 'recruit', id: 'kaelen' },
          { type: 'flag', id: 'recruited_kaelen' }
        ],
        choices: [
          { id: 'ready', text: 'I am ready. Let us clear the courtyard.', next: 'end' },
          { id: 'askwarden', text: 'What is the Warden guarding?', next: 'warden' }
        ]
      },
      warden: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'A gate. A memory. The same thing, in this place. The Covenant built the Bastion over an older road. The Crown used to travel it. Whatever the Warden remembers, it has decided that we are not allowed to leave with the answer.',
        choices: [{ id: 'end', text: 'Then I will introduce myself.', next: 'end' }]
      },
      end: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'Good. Try not to die twice. I have only one coat worth borrowing.',
        choices: []
      }
    }
  },
  {
    id: 'bastion_lore', title: 'A Soldier’s Record', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The page is water-stained but legible. “The Crown was never a throne. It is a vessel. It remembers what the world cannot afford to lose — and what the world cannot afford to remember. If it wakes, do not kneel. Kneeling is how it finds you.”',
        effects: [{ type: 'flag', id: 'lore_bastion_crown' }, { type: 'xp', amount: 15 }],
        choices: [{ id: 'close', text: 'Close the record.', next: 'close' }]
      },
      close: { speaker: 'Narrator', portrait: 'narrator', text: 'The wind turns the page to a name that has been scratched out.', choices: [] }
    }
  },
  {
    id: 'halvard_intro', title: 'The Inquisitor’s Question', start: 'start',
    nodes: {
      start: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'The mark on your soul is visible from the square, child. It is a hole in the Covenant, and holes have a way of becoming doors. I am Inquisitor Halvard, and I am here to determine whether you are a victim or an opening.',
        effects: [
          { type: 'flag', id: 'met_halvard' },
          { type: 'quest', id: 'q_ash_over_greymoor', value: 'start' },
          { type: 'flag', id: 'discovered_greymoor' }
        ],
        choices: [
          { id: 'persuade', text: 'I survived something that should have killed me. I came here for answers, not a trial.', check: { stat: 'cha', dc: 14, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'persuade_ok', failureNext: 'persuade_fail' },
          { id: 'intimidate', text: 'You have seen what the mark can do. Step back.', check: { stat: 'str', dc: 15, proficiency: 'Intimidation', label: 'Intimidation' }, successNext: 'intimidate_ok', failureNext: 'persuade_fail' },
          { id: 'faith', text: 'The Covenant teaches that a soul is judged by its deeds, not its scars.', requiresClass: 'cleric', tag: 'Cleric', next: 'faith_ok', effects: [{ type: 'approval', id: 'oren', amount: 3 }] },
          { id: 'submit', text: 'Do what you must.', next: 'submit' },
          { id: 'choir', text: 'The Choir has a cell beneath the village. Perhaps you should be asking them.', requiresFlag: 'choir_hint', next: 'choir_lead' }
        ]
      },
      persuade_ok: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'Answers. Yes. Everyone in this village wants answers. Very few want the kind I have. Keep your mark covered, and bring me proof of the Choir’s work here. If you are a door, I want to know what is on the other side before it opens.',
        effects: [{ type: 'flag', id: 'halvard_tolerates' }, { type: 'flag', id: 'choir_safehouse_open' }],
        choices: [{ id: 'end', text: 'I will find your proof.', next: 'end' }]
      },
      intimidate_ok: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'There it is. The thing behind your eyes. I will not pretend I am not afraid. Fear is useful. It keeps me from making the same mistake the last Inquisitor made. You have until dusk before I decide whether fear is enough.',
        effects: [{ type: 'flag', id: 'halvard_afraid' }, { type: 'flag', id: 'choir_safehouse_open' }],
        choices: [{ id: 'end', text: 'Dusk, then.', next: 'end' }]
      },
      persuade_fail: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'You mistake my patience for uncertainty. I am patient because the Covenant has time. You do not. I will be watching you, and I will be asking the same question of everyone you speak to.',
        choices: [
          { id: 'submit', text: 'Then watch. I have nothing to hide.', next: 'submit' },
          { id: 'leave', text: 'I have questions of my own.', next: 'end' }
        ]
      },
      faith_ok: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'A cleric with a hole in their soul. The Nine have a sense of humor. Perhaps you were sent to remind us that the Covenant is not a fortress. It is a chain, and chains are only as strong as their weakest link. Bring me the Choir, and we will see what your faith is worth.',
        effects: [{ type: 'flag', id: 'halvard_tolerates' }, { type: 'flag', id: 'choir_safehouse_open' }],
        choices: [{ id: 'end', text: 'I will return.', next: 'end' }]
      },
      submit: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'Hold still. This will feel like a name being taken from you. It is only a binding. If you are innocent, it will burn out by morning. If you are not, it will lead me to whatever is using you.',
        effects: [
          { type: 'flag', id: 'halvard_brand' },
          { type: 'damage', amount: 4 },
          { type: 'approval', id: 'kaelen', amount: -4 },
          { type: 'approval', id: 'nyx', amount: -3 }
        ],
        choices: [{ id: 'end', text: 'Endure it.', next: 'end' }]
      },
      choir_lead: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'The cellar beneath the old tannery. Of course. The Choir loves a place that smells of death and industry. Raid it. Bring me their ledgers, their relics, and one living witness. I care less about which of you starts the fire.',
        effects: [{ type: 'flag', id: 'choir_safehouse_open' }, { type: 'quest', id: 'q_ash_over_greymoor', value: 'start' }],
        choices: [{ id: 'end', text: 'The Choir will answer for it.', next: 'end' }]
      },
      end: {
        speaker: 'Inquisitor Halvard', portrait: 'halvard',
        text: 'One more thing. The Reeve will tell you the woods are just woods. She is lying. The Whispering Woods have been eating memories since before Greymoor had a name. Ask her why she keeps sending the Covenant’s tithes into them.',
        effects: [{ type: 'flag', id: 'halvard_hint_woods' }, { type: 'flag', id: 'discovered_woods' }],
        choices: []
      }
    }
  },
  {
    id: 'marla_reeve', title: 'The Reeve’s Arithmetic', start: 'start',
    nodes: {
      start: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'You are the one from the Bastion. The whole village has been arguing about whether your arrival is a blessing or a plague. I have been arguing that it is a Tuesday. Please do not make me wrong.',
        effects: [
          { type: 'flag', id: 'met_marla' },
          { type: 'quest', id: 'q_ash_over_greymoor', value: 'start' },
          { type: 'flag', id: 'discovered_greymoor' }
        ],
        choices: [
          { id: 'help', text: 'I need answers. The Inquisitor says you know more than you are telling.', next: 'help' },
          { id: 'ledger', text: 'Tell me about the old quarter. And the fire.', requiresFlag: 'reeve_letter_found', next: 'ledger' },
          { id: 'side', text: 'The village is caught between the Covenant and the Choir. Which side are you on?', next: 'side' },
          { id: 'choir_done', text: 'The Choir cell has been dealt with.', requiresFlag: 'choir_dealt', next: 'aftermath' }
        ]
      },
      help: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'I know what the Inquisitor wants: a clean story, a guilty Choir, and a village that forgets it was ever afraid. What I know is worse. The woods have been singing. People go in and come back with someone else’s childhood. The Choir says the Crown is waking. The Covenant says the Crown is a story.',
        choices: [
          { id: 'woods', text: 'Then I will go into the woods.', next: 'woods' },
          { id: 'price', text: 'What do I get for solving your problem?', check: { stat: 'cha', dc: 12, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'price_ok', failureNext: 'price_fail' },
          { id: 'halvard', text: 'What is Halvard hiding?', next: 'halvard' }
        ]
      },
      price_ok: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Sixty gold now. Another hundred when the village is still standing. I am not paying you for heroism. I am paying you for arithmetic. Fewer graves is a good sum.',
        effects: [{ type: 'gold', amount: 60 }, { type: 'flag', id: 'marla_alliance' }],
        choices: [{ id: 'woods', text: 'Then let us make the numbers better.', next: 'woods' }]
      },
      price_fail: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'You have the mark, not the leverage. I will feed you and arm you because Greymoor needs every blade. Do not mistake necessity for generosity.',
        choices: [{ id: 'woods', text: 'Necessity is enough.', next: 'woods' }]
      },
      halvard: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Halvard is not hiding. He is certain. Certainty is more dangerous. He believes the Covenant is a wall and every crack is a heresy. I believe walls need doors. The Choir believes walls need fire. We are all very principled, and the village is very tired.',
        choices: [{ id: 'woods', text: 'I will look at the woods.', next: 'woods' }]
      },
      side: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'I am on the side of the people who will still be here when the banners are folded. The Covenant protects us from what is outside. The Choir promises freedom from what is above. I promise bread, roofs, and a reason not to burn either down. It is less romantic than it sounds.',
        choices: [
          { id: 'woods', text: 'Then keep your village. I will find the truth.', next: 'woods' },
          { id: 'halvard', text: 'What does Halvard want from me?', next: 'halvard' }
        ]
      },
      woods: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Take the old road east. Find the Rootbound woman, Sable. She knows the grove’s rules. And if you find a door in the roots — do not open it until you understand what is behind it. I have buried enough people who thought doors were invitations.',
        effects: [
          { type: 'flag', id: 'marla_quest_given' },
          { type: 'flag', id: 'woods_unlocked' },
          { type: 'flag', id: 'discovered_woods' },
          { type: 'questStage', id: 'q_ash_over_greymoor', amount: 1 }
        ],
        choices: [
          { id: 'go', text: 'I will return with answers.', next: 'end' },
          { id: 'ledger_ask', text: 'One more thing. The old quarter fire.', next: 'ledger' }
        ]
      },
      ledger: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Eight years ago the Grey Watch burned the old quarter to stop a plague. That is the official story. The truth is that the plague was a Choir ritual, and the Watch was ordered to contain it. Kaelen Voss carried the order. I helped him bury the names. We have been burying them ever since.',
        effects: [
          { type: 'quest', id: 'q_reeves_ledger', value: 'start' },
          { type: 'questStage', id: 'q_reeves_ledger', amount: 1 },
          { type: 'quest', id: 'q_name_in_ashes', value: 'start' },
          { type: 'flag', id: 'reeve_confessed' }
        ],
        choices: [
          { id: 'protect', text: 'Then the village owes both of you a chance to make it right.', next: 'ledger2', effects: [{ type: 'approval', id: 'kaelen', amount: 5 }] },
          { id: 'expose', text: 'The truth does not belong to the people who buried it.', next: 'ledger2', effects: [{ type: 'flag', id: 'reeve_evidence_exposed' }, { type: 'approval', id: 'kaelen', amount: -8 }] },
          { id: 'blackmail', text: 'I will keep your secret. For a price.', next: 'blackmail' }
        ]
      },
      blackmail: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'You have the manners of a tax collector and the timing of a knife. Fine. One hundred gold. But understand: I will remember this when the Crown comes asking who should be left standing.',
        effects: [{ type: 'gold', amount: 100 }, { type: 'flag', id: 'marla_blackmailed' }, { type: 'approval', id: 'kaelen', amount: -6 }],
        choices: [{ id: 'end', text: 'Remember it well.', next: 'end' }]
      },
      ledger2: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Kaelen has been trying to become a better man for eight years. He has not forgiven himself. I have not forgiven him either. We simply agreed to keep the village standing. If you force the truth into the square, some people will thank you. Others will hang him.',
        choices: [{ id: 'end', text: 'I will decide when I know him better.', next: 'end' }]
      },
      aftermath: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'The cell is quiet. The Choir will call us murderers. Halvard will call us heroes. The village will call it another thing we do not discuss at dinner. What happens next depends on who you decide should hold the story.',
        choices: [
          { id: 'marla', text: 'You should. You have kept this place alive.', next: 'aftermath_marla', effects: [{ type: 'flag', id: 'greymoor_marla_rules' }, { type: 'approval', id: 'kaelen', amount: 3 }] },
          { id: 'halvard', text: 'Halvard should. The Covenant must answer for its failures.', next: 'aftermath_halvard', effects: [{ type: 'flag', id: 'greymoor_halvard_rules' }, { type: 'approval', id: 'oren', amount: 4 }] },
          { id: 'free', text: 'Neither. Let the village choose its own council.', next: 'aftermath_free', effects: [{ type: 'flag', id: 'greymoor_free_rules' }, { type: 'approval', id: 'nyx', amount: 7 }] }
        ]
      },
      aftermath_marla: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'I will accept the burden. Again. The first thing I will do is write the Choir’s names in a ledger, and the second is to burn the ledger. Some arithmetic must be done in private.',
        effects: [
          { type: 'questComplete', id: 'q_ash_over_greymoor' },
          { type: 'questStage', id: 'q_marked', amount: 1 },
          { type: 'xp', amount: 300 },
          { type: 'gold', amount: 80 }
        ],
        choices: [{ id: 'end', text: 'Keep the village standing.', next: 'end' }]
      },
      aftermath_halvard: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'Halvard will be insufferable. He will also be fair, in the way that winter is fair. The Covenant will station a garrison here before the season turns. The Choir will call it occupation. The farmers will call it a tax. At least the walls will hold.',
        effects: [
          { type: 'questComplete', id: 'q_ash_over_greymoor' },
          { type: 'questStage', id: 'q_marked', amount: 1 },
          { type: 'xp', amount: 280 },
          { type: 'gold', amount: 50 }
        ],
        choices: [{ id: 'end', text: 'Better walls than ash.', next: 'end' }]
      },
      aftermath_free: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'A council. Gods help us. It will be loud, slow, and occasionally corrupt. It will also be ours. I will make the tea and sharpen the agenda. If you ever need a roof, the Grey Lantern will keep a room.',
        effects: [
          { type: 'questComplete', id: 'q_ash_over_greymoor' },
          { type: 'questStage', id: 'q_marked', amount: 1 },
          { type: 'xp', amount: 320 },
          { type: 'gold', amount: 60 },
          { type: 'flag', id: 'greymoor_bell_resolved' }
        ],
        choices: [{ id: 'end', text: 'Then let it be loud.', next: 'end' }]
      },
      end: {
        speaker: 'Reeve Marla Grey', portrait: 'marla',
        text: 'The woods are east, the truth is expensive, and the Inquisitor is watching. Try to return as yourself.',
        choices: []
      }
    }
  },
  {
    id: 'widow_enna', title: 'The Widow’s Bell', start: 'start',
    nodes: {
      start: {
        speaker: 'Widow Enna', portrait: 'enna',
        text: 'They say you came out of the Bastion. They say the dead followed you. My Tam has been sitting by the chapel bell every night since his sister went missing. He says she rings it. He says she is cold and wants her charm back.',
        effects: [{ type: 'quest', id: 'q_silent_bell', value: 'start' }, { type: 'flag', id: 'bell_widow_talked' }],
        choices: [
          { id: 'promise', text: 'I will find out what is ringing that bell.', effects: [{ type: 'approval', id: 'oren', amount: 3 }, { type: 'flag', id: 'bell_promise' }], next: 'promise' },
          { id: 'child', text: 'Where is Tam now?', next: 'child' },
          { id: 'money', text: 'What can you pay?', check: { stat: 'cha', dc: 12, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'pay', failureNext: 'no_pay' }
        ]
      },
      promise: {
        speaker: 'Widow Enna', portrait: 'enna',
        text: 'The chapel. Talk to Brother Oren. He has been praying at the bell since the last full moon. He will not say what he hears. I think he is afraid it is an answer.',
        choices: [{ id: 'end', text: 'I will speak with him.', next: 'end' }]
      },
      child: {
        speaker: 'Widow Enna', portrait: 'enna',
        text: 'At the bell tower. He will not come inside. He says the bell is not ringing for the dead. He says it is ringing for someone who has not finished dying.',
        effects: [{ type: 'flag', id: 'bell_hint_tam' }],
        choices: [{ id: 'promise', text: 'I will bring him home.', next: 'promise' }]
      },
      pay: {
        speaker: 'Widow Enna', portrait: 'enna',
        text: 'I have saved forty silver and a wolf’s-tooth charm. The charm is worth more than the silver. It was my husband’s. He will not need it where he is. Take it if you bring my daughter’s memory back.',
        effects: [{ type: 'gold', amount: 40 }, { type: 'flag', id: 'bell_reward' }, { type: 'approval', id: 'nyx', amount: 2 }],
        choices: [{ id: 'promise', text: 'Keep the charm until I return.', next: 'promise' }]
      },
      no_pay: {
        speaker: 'Widow Enna', portrait: 'enna',
        text: 'I have no coin. I have a missing child and a door that will not stay shut. If that is not enough, then leave me to the bell.',
        choices: [{ id: 'promise', text: 'It is enough.', next: 'promise' }]
      },
      end: { speaker: 'Widow Enna', portrait: 'enna', text: 'The bell rings at midnight. Do not answer it in your own voice.', choices: [] }
    }
  },
  {
    id: 'tam_bell', title: 'Tam, the Bell-Watcher', start: 'start',
    nodes: {
      start: {
        speaker: 'Tam', portrait: 'tam',
        text: 'You have the Crown-mark. The bell does not like you. It rang louder when you came through the gate. It says you are a door too.',
        effects: [{ type: 'flag', id: 'tam_talked' }, { type: 'quest', id: 'q_silent_bell', value: 'start' }],
        choices: [
          { id: 'kind', text: 'You are safe now. Tell me what you saw.', effects: [{ type: 'approval', id: 'oren', amount: 2 }], next: 'saw' },
          { id: 'stern', text: 'Bells do not talk. Who put you up to this?', check: { stat: 'cha', dc: 13, proficiency: 'Intimidation', label: 'Intimidation' }, successNext: 'stern_ok', failureNext: 'stern_fail' },
          { id: 'charm', text: 'Your mother mentioned a charm. What does it look like?', next: 'charm' }
        ]
      },
      saw: {
        speaker: 'Tam', portrait: 'tam',
        text: 'A man came down from the tower. He had a rope around his neck and a book under his arm. He told me to give the bell my sister’s name. I did not want to. The bell already knew it.',
        effects: [{ type: 'flag', id: 'bell_saw_sexton' }],
        choices: [{ id: 'promise', text: 'I will silence it. You have my word.', next: 'promise' }]
      },
      stern_ok: {
        speaker: 'Tam', portrait: 'tam',
        text: 'I am not lying. But you are scary. The bell likes scary things. It says the Sexton has been trying to bury someone for six hundred years. He cannot remember who. That is why he keeps ringing.',
        effects: [{ type: 'flag', id: 'bell_saw_sexton' }],
        choices: [{ id: 'promise', text: 'Then we will remind him.', next: 'promise' }]
      },
      stern_fail: {
        speaker: 'Tam', portrait: 'tam',
        text: 'You are not scary. You are just loud. The bell says you are afraid of being forgotten. It is right.',
        choices: [{ id: 'saw', text: 'Tell me what you saw.', next: 'saw' }]
      },
      charm: {
        speaker: 'Tam', portrait: 'tam',
        text: 'A grey stone with a hole in it. My sister wore it around her neck. The bell has it now. If you take it back, the bell will ring for you instead.',
        effects: [{ type: 'flag', id: 'bell_charm_hint' }],
        choices: [{ id: 'saw', text: 'What else did you see?', next: 'saw' }]
      },
      promise: {
        speaker: 'Tam', portrait: 'tam',
        text: 'If you go up the tower, take a candle. The dead do not like to be seen without one. And do not tell the Sexton your name. He is collecting them.',
        effects: [{ type: 'flag', id: 'bell_promise' }],
        choices: [{ id: 'end', text: 'Stay by your mother.', next: 'end' }]
      },
      end: { speaker: 'Tam', portrait: 'tam', text: 'The bell is listening. Be careful what you think.', choices: [] }
    }
  },
  {
    id: 'silent_bell', title: 'The Silent Bell', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The bell hangs in a stone tower behind the chapel. It has no clapper. The rope is new. Beneath it, someone has arranged a circle of children’s shoes and a single grey charm with a hole through it.',
        effects: [{ type: 'quest', id: 'q_silent_bell', value: 'start' }],
        choices: [
          { id: 'inspect', text: 'Study the bell and the circle.', check: { stat: 'int', dc: 14, proficiency: 'Investigation', label: 'Investigation' }, successNext: 'inspect_ok', failureNext: 'inspect_fail' },
          { id: 'listen', text: 'Listen to the silence.', check: { stat: 'wis', dc: 13, proficiency: 'Insight', label: 'Insight' }, successNext: 'listen_ok', failureNext: 'listen_fail' },
          { id: 'ring', text: 'Ring the bell.', next: 'ring' },
          { id: 'leave', text: 'Not yet.', next: 'leave' }
        ]
      },
      inspect_ok: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The bell’s bronze is etched with a name repeated hundreds of times: SEXTON. Below the circle, a loose flagstone hides a small book of burial records. The last entry is unfinished. The name is your own.',
        effects: [{ type: 'flag', id: 'bell_records_found' }, { type: 'xp', amount: 40 }],
        choices: [{ id: 'ring', text: 'Ring the bell.', next: 'ring' }]
      },
      inspect_fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The etchings shift when you look away. You are certain of only one thing: the charm is warm, and it is beating like a heart.',
        choices: [{ id: 'ring', text: 'Ring the bell anyway.', next: 'ring' }, { id: 'leave', text: 'Step back.', next: 'leave' }]
      },
      listen_ok: {
        speaker: 'The Bell', portrait: 'crown',
        text: 'A voice arrives from inside your teeth. “Sexton. Sexton. The grave is open. The name is missing. Bring me a name and I will let the child go.”',
        effects: [{ type: 'flag', id: 'bell_voice' }],
        choices: [{ id: 'refuse', text: 'She is not yours to keep.', next: 'ring' }, { id: 'ask', text: 'Whose name do you want?', next: 'ask' }]
      },
      ask: {
        speaker: 'The Bell', portrait: 'crown',
        text: '“Yours will do. It is already half-unwritten.”',
        effects: [{ type: 'flag', id: 'bell_asked_name' }],
        choices: [{ id: 'refuse', text: 'No.', next: 'ring' }]
      },
      listen_fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'You hear only the wind and your own pulse. Then, very faintly, a child laughing from inside the bell.',
        choices: [{ id: 'ring', text: 'Ring it.', next: 'ring' }, { id: 'leave', text: 'Leave.', next: 'leave' }]
      },
      ring: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The rope moves before you touch it. The bell makes no sound, but every window in Greymoor cracks at once. Something descends the tower stairs, dragging a rope and a book.',
        effects: [{ type: 'startCombat', id: 'enc_bell_wraith' }],
        choices: []
      },
      leave: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'You step away. The charm turns to follow you, then falls still. The bell is patient.',
        choices: []
      }
    }
  },
  {
    id: 'farmer_orl', title: 'Farmer Orl', start: 'start',
    nodes: {
      start: {
        speaker: 'Farmer Orl', portrait: 'orl',
        text: 'Marked one. We had a marked one before. Eight years back. The Watch put him in the old quarter and burned it down. Now the Choir says the Crown is waking, and the Covenant says the Crown is a fairy tale. I say my turnips do not care either way. My turnips are the only honest thing in this village.',
        choices: [
          { id: 'oldquarter', text: 'Tell me about the marked one.', next: 'oldquarter', effects: [{ type: 'flag', id: 'orl_oldquarter' }] },
          { id: 'choir', text: 'What do you make of the Choir?', next: 'choir' },
          { id: 'trade', text: 'Do you have anything to trade?', next: 'trade' }
        ]
      },
      oldquarter: {
        speaker: 'Farmer Orl', portrait: 'orl',
        text: 'He was a boy from the mill. Had a mark on his chest like a broken wheel. The Watch said he was a door for something. Maybe he was. They did not try to close the door. They burned the house with him inside. Kaelen Voss gave the order. I remember his face in the firelight.',
        effects: [{ type: 'flag', id: 'orl_oldquarter' }, { type: 'approval', id: 'kaelen', amount: -1 }],
        choices: [{ id: 'more', text: 'What happened to the Watch after?', next: 'watch' }]
      },
      watch: {
        speaker: 'Farmer Orl', portrait: 'orl',
        text: 'Half of them resigned. Half of them drank. Kaelen left the Watch and came back a year later with no title and a lot of silence. Marla gave him a room. Some people say she was protecting him. Some say she was keeping him where she could see him.',
        choices: [{ id: 'end', text: 'Thank you, Orl.', next: 'end' }]
      },
      choir: {
        speaker: 'Farmer Orl', portrait: 'orl',
        text: 'The Choir feeds people. That is the trouble with them. They feed you, then they tell you the world is a cage, then they hand you a torch. I have been hungry enough to listen. I have not been hungry enough to burn my neighbor.',
        choices: [{ id: 'end', text: 'I will remember that.', next: 'end' }]
      },
      trade: {
        speaker: 'Farmer Orl', portrait: 'orl',
        text: 'I have turnips, a good rope, and a bottle of something that used to be cider. The rope is useful. The rest is courage.',
        effects: [{ type: 'item', id: 'healing_potion', amount: 1 }],
        choices: [{ id: 'end', text: 'I will take the courage.', next: 'end' }]
      },
      end: { speaker: 'Farmer Orl', portrait: 'orl', text: 'Come back when you know whether you are a door or a person. I will still be here. Turnips are patient.', choices: [] }
    }
  },
  {
    id: 'choir_preacher', title: 'The Ashen Choir', start: 'start',
    nodes: {
      start: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'You carry the mark of the Crown. Do not be afraid. The Crown is not a master. It is a key. The Covenant has kept the world locked in one shape for a thousand years, and the Choir has come to turn the lock.',
        effects: [{ type: 'flag', id: 'choir_hint' }, { type: 'flag', id: 'met_choir' }],
        choices: [
          { id: 'ask', text: 'What happens when the lock opens?', next: 'ask' },
          { id: 'accuse', text: 'You are storing fire beneath a village of farmers.', next: 'accuse' },
          { id: 'join', text: 'If the Covenant is a cage, I want to know what is outside.', next: 'join', effects: [{ type: 'flag', id: 'choir_sympathizer' }, { type: 'approval', id: 'nyx', amount: 2 }] },
          { id: 'turn', text: 'The Inquisitor would like a word with you.', next: 'turn' }
        ]
      },
      ask: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'The erased return. The dead remember themselves. The world becomes larger than the box the Nine built. Some will not survive it. That is the price of any birth. The Covenant would rather keep everyone alive and asleep. We would rather wake them.',
        choices: [
          { id: 'ask2', text: 'And the Crown? What is it really?', next: 'ask2' },
          { id: 'join', text: 'Show me the cellar.', next: 'join' }
        ]
      },
      ask2: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'A wound that has been kept open for a thousand years. The first world is still inside it. The Ashen Choir does not serve the Crown. We serve the memory the Crown swallowed. There is a difference, and it is the only difference that matters.',
        effects: [{ type: 'flag', id: 'choir_lore' }],
        choices: [{ id: 'join', text: 'Show me.', next: 'join' }]
      },
      accuse: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'Farmers keep candles. We keep a fire. When the Covenant comes to burn us, you will be grateful for the difference. Or you will be ash. The Crown does not require your gratitude.',
        choices: [
          { id: 'intimidate', text: 'Tell me where the cellar is, or I will make the Inquisitor’s job easier.', check: { stat: 'str', dc: 14, proficiency: 'Intimidation', label: 'Intimidation' }, successNext: 'turn', failureNext: 'accuse_fail' },
          { id: 'join', text: 'I am not here to judge. Not yet.', next: 'join' }
        ]
      },
      accuse_fail: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'You are already burning. You just have not noticed. The mark on your soul is doing the work for us.',
        choices: [{ id: 'end', text: 'We will see.', next: 'end' }]
      },
      join: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'Beneath the old tannery. The door is marked with a crown of thorns. Tell them the Choir remembers. If you truly wish to understand, you will come alone. If you bring the Inquisitor, we will understand that too.',
        effects: [{ type: 'flag', id: 'choir_safehouse_open' }, { type: 'flag', id: 'choir_ally' }],
        choices: [{ id: 'end', text: 'I will consider it.', next: 'end' }]
      },
      turn: {
        speaker: 'The Preacher', portrait: 'preacher',
        text: 'Then you have chosen the cage. The Choir will still be here when it opens. Look for us in the ash.',
        effects: [{ type: 'flag', id: 'choir_safehouse_open' }, { type: 'flag', id: 'choir_hostile' }],
        choices: [{ id: 'end', text: 'I will be looking.', next: 'end' }]
      },
      end: { speaker: 'The Preacher', portrait: 'preacher', text: 'The mark remembers you. Make sure you remember it.', choices: [] }
    }
  },
  {
    id: 'greymoor_notices', title: 'Village Notices', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A board of nails, rain-curled paper, and other people’s catastrophes. One notice reads: “Missing: one silver locket, one shadow, one memory. Reward negotiable.” Another: “Do not dig behind the Reeve’s manor. The ground is not stable.”',
        choices: [
          { id: 'merchant', text: 'Take the notice about the missing memories.', next: 'merchant' },
          { id: 'shadow', text: 'Take the notice about the missing shadow.', next: 'shadow' },
          { id: 'end', text: 'Leave the board.', next: 'end' }
        ]
      },
      merchant: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The notice is unsigned. Beneath it, someone has drawn a coin with a hole in the middle and the words: “THE HOLLOW MERCHANT SELLS ONLY WHAT YOU HAVE ALREADY LOST.”',
        effects: [{ type: 'quest', id: 'q_hollow_merchant', value: 'start' }, { type: 'flag', id: 'hollow_merchant_hint' }],
        choices: [{ id: 'end', text: 'Pocket the notice.', next: 'end' }]
      },
      shadow: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The request is written in Rootbound script. The ink is green and still moving. “If you see a shadow without a body, tell it that Sable is waiting.”',
        effects: [{ type: 'flag', id: 'sable_notice' }, { type: 'quest', id: 'q_debt_in_shadow', value: 'start' }],
        choices: [{ id: 'end', text: 'Keep the notice.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The rain starts again. The board creaks like a door.', choices: [] }
    }
  },
  {
    id: 'nyx_meet', title: 'The Woman With Too Many Knives', start: 'start',
    nodes: {
      start: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'The marked one, in the flesh. I expected something more dramatic. Horns, maybe. A choir of weeping ghosts. Instead I get a person who tracks mud into a perfectly good inn.',
        choices: [
          { id: 'who', text: 'And you are?', next: 'who' },
          { id: 'mark', text: 'You know about the mark.', next: 'mark' },
          { id: 'flirt', text: 'Disappointed? I can try to be more dramatic.', tone: 'clever', next: 'flirt', effects: [{ type: 'approval', id: 'nyx', amount: 3 }] },
          { id: 'insight', text: 'You have been watching me since I entered the village.', check: { stat: 'wis', dc: 14, proficiency: 'Insight', label: 'Insight' }, successNext: 'insight_ok', failureNext: 'insight_fail' }
        ]
      },
      who: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Nyx. Freelance problem-solver. Current problems include: the Covenant, the Choir, a village full of people who think courage is a personality, and a man outside who has been sharpening the same knife for ten minutes.',
        choices: [{ id: 'recruit', text: 'I could use a problem-solver.', next: 'recruit' }, { id: 'mark', text: 'What do you know about the mark?', next: 'mark' }]
      },
      mark: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'I know the Choir would kill for it. I know the Covenant would kill to control it. I know it makes you a very popular person in a village that has not been popular since the last war. I am offering my services before someone less charming does.',
        choices: [{ id: 'recruit', text: 'What are your rates?', next: 'recruit' }, { id: 'insight', text: 'You already have a client, don’t you?', check: { stat: 'wis', dc: 15, proficiency: 'Insight', label: 'Insight' }, successNext: 'insight_ok', failureNext: 'insight_fail' }]
      },
      flirt: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Careful. I have a rule about charming people with holes in their souls. It is not a good rule. I break it constantly.',
        choices: [{ id: 'recruit', text: 'Then break it again.', next: 'recruit' }, { id: 'mark', text: 'Tell me what you know.', next: 'mark' }]
      },
      insight_ok: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Observant. Yes. I was hired to watch you. The Choir likes to know where its miracles are. But my client has not paid me in three days, and you are much more interesting than the invoice. Let me come with you. I will explain the rest when I trust you.',
        effects: [{ type: 'flag', id: 'nyx_suspected' }, { type: 'approval', id: 'nyx', amount: 5 }, { type: 'quest', id: 'q_knife_for_choir', value: 'start' }],
        choices: [{ id: 'recruit', text: 'You are hired. For now.', next: 'recruit' }]
      },
      insight_fail: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Everyone watches you. You are the most interesting thing to happen here since the well flooded. I am simply better at it than the farmers.',
        choices: [{ id: 'recruit', text: 'Then watch my back instead.', next: 'recruit' }]
      },
      recruit: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Excellent. I accept payment in gold, favors, and dramatic revelations. My one condition: if I tell you to run, do not ask why until we are somewhere with a door.',
        effects: [
          { type: 'recruit', id: 'nyx' },
          { type: 'flag', id: 'recruited_nyx' },
          { type: 'quest', id: 'q_knife_for_choir', value: 'start' }
        ],
        choices: [{ id: 'end', text: 'Deal.', next: 'end' }]
      },
      end: { speaker: 'Nyx Ardent', portrait: 'nyx', text: 'Try not to die. I hate carrying references.', choices: [] }
    }
  },
  {
    id: 'tomas_inn', title: 'The Grey Lantern', start: 'start',
    nodes: {
      start: {
        speaker: 'Tomas', portrait: 'tomas',
        text: 'Rooms are two silver. Soup is one. Advice is free because it is mostly rumor. The Choir drink in the corner, the Watch drink by the door, and I drink in the back where no one can ask me questions.',
        choices: [
          { id: 'rest', text: 'I need a room and a hot meal.', next: 'rest' },
          { id: 'rumor', text: 'What is the word in the village?', next: 'rumor' },
          { id: 'nyx', text: 'Who is the woman with the knives?', next: 'nyx' }
        ]
      },
      rest: {
        speaker: 'Tomas', portrait: 'tomas',
        text: 'Two silver. No singing after midnight. No weapons in the sheets. I am not running a temple.',
        effects: [{ type: 'gold', amount: -2 }, { type: 'rest' }],
        choices: [{ id: 'end', text: 'You have a deal.', next: 'end' }]
      },
      rumor: {
        speaker: 'Tomas', portrait: 'tomas',
        text: 'The bell is ringing again. The widow’s girl is missing. Reeve Marla is not sleeping. Halvard is asking about you. And the Choir has been buying more oil than a village this size could possibly need. Make of that what you will.',
        choices: [{ id: 'end', text: 'I will make something of it.', next: 'end' }]
      },
      nyx: {
        speaker: 'Tomas', portrait: 'tomas',
        text: 'Nyx? She arrived three days before you. Paid for a room in gold that was minted in the Citadel. Said she was a cartographer. I have never seen her draw a map. I have seen her count exits.',
        effects: [{ type: 'flag', id: 'nyx_exits' }],
        choices: [{ id: 'end', text: 'Let us keep an eye on her.', next: 'end' }]
      },
      end: { speaker: 'Tomas', portrait: 'tomas', text: 'If you break a chair, you buy a chair. That is the whole philosophy of the Grey Lantern.', choices: [] }
    }
  },
  {
    id: 'marla_reeve_after_chapel', title: 'After the Chapel', start: 'start',
    nodes: { start: { speaker: 'Reeve Marla Grey', portrait: 'marla', text: 'The chapel is still standing. That is more than I expected. Come back when you have decided what kind of village you want to leave behind.', choices: [] } }
  },
  {
    id: 'manor_letter', title: 'A Charred Letter', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A letter, half-burnt and hidden beneath a ledger. The Reeve’s handwriting is careful. “The Watch will carry out the order at dawn. Kaelen believes it is a plague. It is a door. The boy with the wheel-mark must not be allowed to open it. I will carry the rest.”',
        effects: [
          { type: 'flag', id: 'reeve_letter_found' },
          { type: 'quest', id: 'q_reeves_ledger', value: 'start' },
          { type: 'quest', id: 'q_name_in_ashes', value: 'start' },
          { type: 'xp', amount: 40 }
        ],
        choices: [{ id: 'end', text: 'Take the letter.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The seal is not Marla’s. It is the seal of the Grey Watch.', choices: [] }
    }
  },
  {
    id: 'bree_shop', title: 'Bree’s Provisions', start: 'start',
    nodes: {
      start: {
        speaker: 'Bree', portrait: 'bree',
        text: 'You have the look of someone who has been sleeping in a ruin. I have blankets, potions, a shield with only one hole in it, and a very nice selection of things that are technically not weapons. Which disaster are we preparing for?',
        choices: [
          { id: 'browse', text: 'Show me what you have.', next: 'browse' },
          { id: 'sell', text: 'I have some things to sell.', next: 'browse' },
          { id: 'gossip', text: 'What do you know about the Choir?', next: 'gossip' },
          { id: 'end', text: 'Just looking.', next: 'end' }
        ]
      },
      browse: {
        speaker: 'Bree', portrait: 'bree',
        text: 'Everything has a price. Some things have two. I accept gold, old coin, and stories that are better than the truth.',
        effects: [{ type: 'shop', id: 'bree' }],
        choices: [{ id: 'end', text: 'I will browse.', next: 'end' }]
      },
      gossip: {
        speaker: 'Bree', portrait: 'bree',
        text: 'They pay in silver and speak in hymns. The Covenant pays in promises. I trust a woman with a knife more than either. That is how you survive a village built on top of an older one.',
        effects: [{ type: 'flag', id: 'choir_hint' }],
        choices: [{ id: 'end', text: 'I will remember that.', next: 'end' }]
      },
      end: { speaker: 'Bree', portrait: 'bree', text: 'If you find anything enchanted in the woods, bring it to me before you touch it. Especially if it is warm.', choices: [] }
    }
  },
  {
    id: 'oren_meet', title: 'The Village Prayer', start: 'start',
    nodes: {
      start: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'You are the marked one. I felt you pass the chapel. The altar has been warm all morning, and I have been pretending it is the candles. Sit. You look like a man who has not been offered tea in a very long time.',
        choices: [
          { id: 'sit', text: 'Sit and accept the tea.', next: 'sit', effects: [{ type: 'approval', id: 'oren', amount: 4 }] },
          { id: 'mark', text: 'What does the Covenant say about marks like mine?', next: 'mark' },
          { id: 'bell', text: 'Tam says the bell is ringing. Do you hear it?', next: 'bell' },
          { id: 'recruit', text: 'I need a healer. The road will be dangerous.', next: 'recruit' }
        ]
      },
      sit: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'It is terrible tea. The good leaves went to the Choir’s poorhouse last winter. I keep telling myself that charity should taste like charity, and not like a decision I regret.',
        choices: [{ id: 'mark', text: 'What does the Covenant say about marks like mine?', next: 'mark' }, { id: 'bell', text: 'Tell me about the bell.', next: 'bell' }]
      },
      mark: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'Officially? That the Covenant binds every soul, and a mark is a place where the binding slipped. Unofficially? I have seen three marked people in my life. Two died. One walked into the woods and came back with a different name. The Covenant does not have a prayer for what comes after the sliding.',
        effects: [{ type: 'flag', id: 'oren_mark_lore' }],
        choices: [
          { id: 'bell', text: 'The bell. Tell me.', next: 'bell' },
          { id: 'faith', text: 'You do not sound certain of the official answer.', next: 'faith' }
        ]
      },
      faith: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'I am a village priest. My congregation is thirty farmers, a widow, and a boy who talks to bells. Certainty is a luxury for cities. Here we mostly practice keeping each other alive and hoping the Nine are taking notes.',
        effects: [{ type: 'approval', id: 'oren', amount: 3 }],
        choices: [{ id: 'bell', text: 'The bell.', next: 'bell' }]
      },
      bell: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'I hear it every midnight. I have prayed at it, blessed it, and once — gods forgive me — tried to break it. It is not the bell that is ringing. It is the space where a name used to be. I think the Sexton is trying to bury someone who was erased from the Covenant.',
        effects: [{ type: 'quest', id: 'q_silent_bell', value: 'start' }, { type: 'flag', id: 'oren_bell_lore' }],
        choices: [
          { id: 'help', text: 'Then we will give the Sexton a proper ending.', next: 'recruit_after', effects: [{ type: 'approval', id: 'oren', amount: 5 }] },
          { id: 'recruit', text: 'Come with us. You can pray later.', next: 'recruit' }
        ]
      },
      recruit_after: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'I am not much of a fighter. I can keep a person alive, though. That has to count for something on a road like this. I will fetch my censer.',
        effects: [
          { type: 'recruit', id: 'oren' },
          { type: 'flag', id: 'recruited_oren' },
          { type: 'quest', id: 'q_last_prayer', value: 'start' }
        ],
        choices: [{ id: 'end', text: 'It counts for everything.', next: 'end' }]
      },
      recruit: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'The Covenant teaches that a shepherd does not stay in the fold when the wolves are already inside. I will come. But I warn you: I will pray for the wolves too.',
        effects: [
          { type: 'recruit', id: 'oren' },
          { type: 'flag', id: 'recruited_oren' },
          { type: 'quest', id: 'q_last_prayer', value: 'start' }
        ],
        choices: [{ id: 'end', text: 'That is why I asked.', next: 'end' }]
      },
      end: { speaker: 'Brother Oren Hale', portrait: 'oren', text: 'The chapel is always open. Even when the door is locked. Especially then.', choices: [] }
    }
  },
  {
    id: 'oren_altar', title: 'Altar of the Nine', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'Nine small statues stand in a ring. Eight are weathered. The ninth, the youngest, has no face at all. The altar beneath them is warm to the touch.',
        effects: [{ type: 'flag', id: 'altar_warm' }],
        choices: [
          { id: 'pray', text: 'Pray at the altar.', check: { stat: 'wis', dc: 13, proficiency: 'Religion', label: 'Religion' }, successNext: 'pray_ok', failureNext: 'pray_fail' },
          { id: 'study', text: 'Study the faceless statue.', check: { stat: 'int', dc: 14, proficiency: 'Investigation', label: 'Investigation' }, successNext: 'study_ok', failureNext: 'study_fail' },
          { id: 'end', text: 'Step back.', next: 'end' }
        ]
      },
      pray_ok: {
        speaker: 'A Voice Beneath the Altar', portrait: 'crown',
        text: '“You are not praying. You are remembering. Good. The Nine were always better at listening than answering. Ask me instead.”',
        effects: [{ type: 'flag', id: 'altar_voice' }, { type: 'approval', id: 'oren', amount: 2 }, { type: 'xp', amount: 35 }],
        choices: [{ id: 'what', text: 'What are you?', next: 'what' }]
      },
      what: {
        speaker: 'A Voice Beneath the Altar', portrait: 'crown',
        text: '“The first name the world forgot. The Othren called me the Witness. Your Covenant calls me a crack. Oren calls me an answered prayer. I am all three, and I am tired.”',
        effects: [{ type: 'flag', id: 'witness_contact' }],
        choices: [{ id: 'end', text: 'The altar goes cold.', next: 'end' }]
      },
      pray_fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The altar remains warm. No answer comes. Somewhere below the chapel, something shifts in its sleep.',
        choices: [{ id: 'end', text: 'Stand.', next: 'end' }]
      },
      study_ok: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The faceless statue is newer than the others. Its base bears a line of Othren script: “THE CROWN IS NOT THE KING. THE CROWN IS THE WITNESS.” There is a hollow inside the statue, just large enough for a shard of grey metal.',
        effects: [{ type: 'flag', id: 'altar_hollow' }, { type: 'quest', id: 'q_last_prayer', value: 'start' }, { type: 'xp', amount: 35 }],
        choices: [{ id: 'end', text: 'Leave the hollow empty.', next: 'end' }]
      },
      study_fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The symbols refuse to settle. One moment they are a prayer. The next they are a list of names. Yours is near the bottom.',
        choices: [{ id: 'end', text: 'Step away.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The candles gutter. The faceless statue seems to be looking at the door.', choices: [] }
    }
  },
  {
    id: 'sable_meet', title: 'Warden of the Reach', start: 'start',
    nodes: {
      start: {
        speaker: 'Sable', portrait: 'sable',
        text: 'You walk loudly. The woods have been talking about you since the Bastion. They say you carry a piece of the Crown. They say the piece is lonely. I am Sable. I speak for the parts of the Reach that have not decided whether to eat you yet.',
        choices: [
          { id: 'respect', text: 'Then I will ask permission before I take anything.', next: 'respect', effects: [{ type: 'approval', id: 'sable', amount: 4 }] },
          { id: 'mark', text: 'What does the forest know about the mark?', next: 'mark' },
          { id: 'rune', text: 'I was told there are runes here. A door.', next: 'rune' },
          { id: 'recruit', text: 'I need a guide. The woods are turning people into stories.', next: 'recruit' }
        ]
      },
      respect: {
        speaker: 'Sable', portrait: 'sable',
        text: 'Good. Most outsiders take. The last one took a shadow and left a woman-shaped absence behind her. If you are going to be useful, be useful without leaving holes.',
        choices: [{ id: 'rune', text: 'Tell me about the door.', next: 'rune' }, { id: 'recruit', text: 'Walk with us.', next: 'recruit' }]
      },
      mark: {
        speaker: 'Sable', portrait: 'sable',
        text: 'The forest remembers the first world. Your mark is a door into it. That is why the Choir wants you, why the Covenant fears you, and why the roots lean toward you when you pass. You are not chosen. You are simply open.',
        effects: [{ type: 'flag', id: 'sable_mark_lore' }],
        choices: [{ id: 'rune', text: 'Then show me what is behind the door.', next: 'rune' }]
      },
      rune: {
        speaker: 'Sable', portrait: 'sable',
        text: 'Three stones. Root, Moth, Crown. Wake them in the wrong order and the woods will sing you into a tree. The warning stone by the path says the order. I would read it before becoming furniture.',
        effects: [{ type: 'flag', id: 'sable_rune_hint' }],
        choices: [{ id: 'recruit', text: 'Will you walk with us?', next: 'recruit' }]
      },
      recruit: {
        speaker: 'Sable', portrait: 'sable',
        text: 'I will walk with you as far as the Drowned Gate. After that, you will have to decide what the forest means to you. And there is a debt I have not collected. A shadow that wears my face. If you help me with that, I will owe you.',
        effects: [
          { type: 'recruit', id: 'sable' },
          { type: 'flag', id: 'recruited_sable' },
          { type: 'quest', id: 'q_debt_in_shadow', value: 'start' },
          { type: 'flag', id: 'sable_quest_started' }
        ],
        choices: [{ id: 'end', text: 'We will collect it together.', next: 'end' }]
      },
      end: { speaker: 'Sable', portrait: 'sable', text: 'Stay on the path. The path is a promise. The rest of the forest is an argument.', choices: [] }
    }
  },
  {
    id: 'woods_note_lore', title: 'A Rootbound Warning', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A slab of dark wood, written in green sap. “FIRST THE ROOT, WHICH HOLDS. THEN THE MOTH, WHICH REMEMBERS. LAST THE CROWN, WHICH TAKES. RING THEM IN THAT ORDER, OR RING YOUR OWN ENDING.”',
        effects: [{ type: 'flag', id: 'woods_rune_order_known' }, { type: 'xp', amount: 25 }],
        choices: [{ id: 'end', text: 'Memorize the order.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The letters move slightly when you look away, as if the wood is breathing.', choices: [] }
    }
  },
  {
    id: 'woods_temple_gate', title: 'The Drowned Gate', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A gate of black stone stands in the roots. Water seeps upward through its seams. A keyhole shaped like a living knot waits at its center. The symbol of the Othren is carved above: an eye with no pupil.',
        choices: [
          { id: 'key', text: 'Fit the Root Key into the lock.', requiresItem: 'root_key', next: 'success' },
          { id: 'nature', text: 'Read the roots and find the pattern.', check: { stat: 'wis', dc: 14, proficiency: 'Nature', label: 'Nature' }, successNext: 'success', failureNext: 'fail' },
          { id: 'arcane', text: 'Trace the gate’s older geometry.', check: { stat: 'int', dc: 15, proficiency: 'Arcana', label: 'Arcana' }, successNext: 'success', failureNext: 'fail' },
          { id: 'force', text: 'Break the gate.', check: { stat: 'str', dc: 17, proficiency: 'Athletics', label: 'Athletics' }, successNext: 'success', failureNext: 'fail' },
          { id: 'leave', text: 'Step away.', next: 'leave' }
        ]
      },
      success: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The gate opens with the sound of a held breath released. Beyond it, a stair descends into water that is somehow older than the stone. The air smells of salt and forgotten names.',
        effects: [
          { type: 'flag', id: 'temple_unlocked' },
          { type: 'flag', id: 'discovered_temple' },
          { type: 'questStage', id: 'q_roots_remember', amount: 3 },
          { type: 'quest', id: 'q_drowned_covenant', value: 'start' },
          { type: 'xp', amount: 100 }
        ],
        choices: [{ id: 'enter', text: 'Descend into the Sunken Temple.', next: 'enter' }]
      },
      enter: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The gate seals behind you. Far below, something vast turns over in its sleep.',
        effects: [{ type: 'travel', id: 'sunken_temple' }],
        choices: []
      },
      fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The gate does not move. The roots tighten around your hands. You pull back before they can decide what shape you should become.',
        effects: [{ type: 'damage', amount: 3 }],
        choices: [{ id: 'leave', text: 'Try another way later.', next: 'leave' }]
      },
      leave: { speaker: 'Narrator', portrait: 'narrator', text: 'The gate waits. It has waited six hundred years. It can wait a little longer.', choices: [] }
    }
  },
  {
    id: 'ilyra_meet', title: 'The Archivist of Absences', start: 'start',
    nodes: {
      start: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'Do not touch the archive. I mean it. The last person who touched it forgot their own name and spent three days insisting they were a lamp. You are the mark-bearer. The archive has been writing about you for longer than you have been alive.',
        choices: [
          { id: 'who', text: 'Who are you, and why are you in a ruin?', next: 'who' },
          { id: 'archive', text: 'What is the archive?', next: 'archive' },
          { id: 'sister', text: 'You said the archive writes about people. Who are you looking for?', next: 'sister' },
          { id: 'recruit', text: 'We are going to the Sunken Temple. Your archive knowledge could keep us alive.', next: 'recruit' }
        ]
      },
      who: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'Ilyra Morn. Aelborn. Archivist of the First Archive, a title that exists mostly in my own correspondence. I came here looking for my sister. The archive insists I have no sister. The archive is usually right. I am still looking.',
        effects: [{ type: 'flag', id: 'ilyra_sister_hint' }],
        choices: [{ id: 'archive', text: 'Show me the archive.', next: 'archive' }]
      },
      archive: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'The Othren grew it from a seed of the first world. It remembers every version of every life that has ever been written and erased. The Covenant calls it heresy. The Choir calls it a weapon. I call it the only honest library I have ever visited.',
        effects: [{ type: 'flag', id: 'ilyra_archive_lore' }],
        choices: [{ id: 'sister', text: 'And your sister?', next: 'sister' }]
      },
      sister: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'Her name is — was — Sereth. She taught me to read. She gave me this coat. Every record spells her name differently, and every record insists it is the only one. I have three memories of her funeral and none of her death. The archive says I invented her to explain a grief I could not name.',
        effects: [{ type: 'quest', id: 'q_sister_who_never_was', value: 'start' }, { type: 'approval', id: 'ilyra', amount: 3 }],
        choices: [
          { id: 'comfort', text: 'Invented or not, the grief is real. That is enough to start.', next: 'comfort', effects: [{ type: 'approval', id: 'ilyra', amount: 4 }] },
          { id: 'truth', text: 'Then we will make the archive prove it.', next: 'truth', effects: [{ type: 'approval', id: 'ilyra', amount: 3 }] }
        ]
      },
      comfort: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'You sound like a person who has lost something they cannot prove. It is a specific kind of tired. I recognize it. Come. The archive has a reading for people like us. It is mostly a warning, but the seats are comfortable.',
        choices: [{ id: 'recruit', text: 'Come with us. The temple will need an archivist.', next: 'recruit' }]
      },
      truth: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'I have spent twenty years trying to make the archive prove it. It has been very patient with me. Perhaps what it needs is a witness who is not afraid to read the ending. Perhaps that is you.',
        choices: [{ id: 'recruit', text: 'Then read it with me.', next: 'recruit' }]
      },
      recruit: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'I will come. Not because I trust you yet — I do not, entirely — but because the archive says the Sunken Temple is where the first lie was written. I would like to see the handwriting.',
        effects: [
          { type: 'recruit', id: 'ilyra' },
          { type: 'flag', id: 'recruited_ilyra' },
          { type: 'quest', id: 'q_sister_who_never_was', value: 'start' }
        ],
        choices: [{ id: 'end', text: 'Then let us go read a lie.', next: 'end' }]
      },
      end: { speaker: 'Ilyra Morn', portrait: 'ilyra', text: 'Do not touch the archive on the way out. I am not carrying you.', choices: [] }
    }
  },
  {
    id: 'ilyra_revelation', title: 'The First Archive', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The archive opens like a flower made of paper and light. A hundred thousand lives unfold at once. You see the Nine Shapers kneeling before a child with a crown of grey metal. You see the child’s name being erased. You see the world being written over the top of the old one.',
        effects: [{ type: 'flag', id: 'first_archive_read' }],
        choices: [
          { id: 'watch', text: 'Watch the memory to the end.', next: 'memory' },
          { id: 'ilyra', text: 'Ask Ilyra what she sees.', next: 'ilyra_sees' },
          { id: 'check', text: 'Look for your own name in the archive.', check: { stat: 'int', dc: 15, proficiency: 'Investigation', label: 'Investigation' }, successNext: 'name_found', failureNext: 'name_lost' }
        ]
      },
      memory: {
        speaker: 'The First Archive', portrait: 'crown',
        text: '“The Nine were not gods. They were survivors. They built the Covenant to stop the world from ending, and they built the Crown to remember what they sacrificed. Every age, the Crown wakes. Every age, someone must choose what to forget. You are the first bearer in six hundred years who was not born inside the story.”',
        effects: [{ type: 'flag', id: 'crown_truth' }, { type: 'xp', amount: 80 }],
        choices: [{ id: 'ilyra', text: 'Ilyra. Did you know?', next: 'ilyra_sees' }]
      },
      ilyra_sees: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'I see Sereth. She is standing where the child stood. She is wearing my coat. The archive is showing me every version of her at once. In one, she is my sister. In another, she is the reason I exist. In another, I am the reason she was erased. I cannot tell which one is real.',
        effects: [{ type: 'flag', id: 'sereth_vision' }],
        choices: [
          { id: 'choose', text: 'Choose the version you can carry. Not the one that is true.', next: 'end', effects: [{ type: 'questComplete', id: 'q_sister_who_never_was' }, { type: 'approval', id: 'ilyra', amount: 10 }, { type: 'flag', id: 'ilyra_resolved' }] },
          { id: 'truth', text: 'The truth matters. We keep reading until we find it.', next: 'end', effects: [{ type: 'flag', id: 'ilyra_truth' }, { type: 'approval', id: 'ilyra', amount: 5 }, { type: 'questComplete', id: 'q_sister_who_never_was' }, { type: 'xp', amount: 260 }] }
        ]
      },
      name_found: {
        speaker: 'The First Archive', portrait: 'crown',
        text: 'Your name appears in the margin of every age. Not as a hero. As an error. A soul the Crown could not write. The mark is not a shard of the Crown. It is the place where the Crown tried to write you and failed.',
        effects: [{ type: 'flag', id: 'unwritten_truth' }, { type: 'xp', amount: 100 }],
        choices: [{ id: 'memory', text: 'Show me the rest.', next: 'memory' }]
      },
      name_lost: {
        speaker: 'The First Archive', portrait: 'crown',
        text: 'The pages turn too fast. For a moment you see your name, then it becomes a list of ingredients, then a weather report, then nothing. The archive is not hiding the truth. It is arguing with it.',
        choices: [{ id: 'memory', text: 'Watch the memory instead.', next: 'memory' }]
      },
      end: {
        speaker: 'The First Archive', portrait: 'crown',
        text: '“The Drowned Saint holds the second fragment. She has been waiting for a bearer who can hear her. Go to the temple. And when the Crown asks you to choose — remember that it has never once told the whole truth.”',
        effects: [
          { type: 'questStage', id: 'q_marked', amount: 2 },
          { type: 'questStage', id: 'q_roots_remember', amount: 3 },
          { type: 'questComplete', id: 'q_roots_remember' },
          { type: 'quest', id: 'q_drowned_covenant', value: 'start' },
          { type: 'flag', id: 'temple_unlocked' },
          { type: 'flag', id: 'discovered_temple' },
          { type: 'xp', amount: 250 }
        ],
        choices: []
      }
    }
  },
  {
    id: 'temple_lore', title: 'A Drowned Prayer', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A stone tablet, half-submerged. “We asked the Witness to save us from the flood. It said: I can save you, or I can save what you were. You cannot have both. We chose to be saved. The water remembers the rest.”',
        effects: [{ type: 'flag', id: 'temple_lore_read' }, { type: 'xp', amount: 30 }],
        choices: [{ id: 'end', text: 'Copy the prayer into your journal.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The stone is warm. Somewhere in the temple, a door breathes open.', choices: [] }
    }
  },
  {
    id: 'temple_seal_tides', title: 'Seal of Tides', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A disc of blue stone turns slowly in a pool of black water. Three rings of Othren script surround it. The water rises when you approach, then waits.',
        choices: [
          { id: 'read', text: 'Read the rings and turn them against the current.', check: { stat: 'int', dc: 14, proficiency: 'Investigation', label: 'Investigation' }, successNext: 'success', failureNext: 'fail' },
          { id: 'tide', text: 'Speak to the water as a Tidewrought would.', requiresAncestry: 'tidewrought', tag: 'Tidewrought', next: 'success' },
          { id: 'force', text: 'Force the disc to turn.', check: { stat: 'str', dc: 15, proficiency: 'Athletics', label: 'Athletics' }, successNext: 'success', failureNext: 'fail' },
          { id: 'leave', text: 'Leave it for now.', next: 'leave' }
        ]
      },
      success: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The seal clicks open. The water falls away, revealing a memory carved into the stone: an Othren child placing a crown on a kneeling king’s head. The king is weeping.',
        effects: [{ type: 'flag', id: 'seal_tides' }, { type: 'xp', amount: 60 }, { type: 'flag', id: 'temple_seal_one' }],
        choices: [{ id: 'end', text: 'The first seal is open.', next: 'end' }]
      },
      fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The water lashes out, cold as a grave. You taste salt and someone else’s grief.',
        effects: [{ type: 'damage', amount: 5 }],
        choices: [{ id: 'end', text: 'Withdraw.', next: 'end' }]
      },
      leave: { speaker: 'Narrator', portrait: 'narrator', text: 'The disc continues its patient turn.', choices: [] },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'Two seals remain.', choices: [] }
    }
  },
  {
    id: 'temple_seal_memory', title: 'Seal of Memory', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A disc of white bone floats above a dry basin. It shows a different memory each time you blink: a wedding, a burning street, an empty cradle, your own face asleep. One of the images is the key.',
        choices: [
          { id: 'focus', text: 'Find the memory that belongs to you.', check: { stat: 'wis', dc: 14, proficiency: 'Insight', label: 'Insight' }, successNext: 'success', failureNext: 'fail' },
          { id: 'dream', text: 'Use the Aelborn dreaming.', requiresAncestry: 'aelborn', tag: 'Aelborn', next: 'success' },
          { id: 'dispel', text: 'Refuse every image. Open the seal with absence.', check: { stat: 'cha', dc: 15, proficiency: 'Deception', label: 'Deception' }, successNext: 'success', failureNext: 'fail' }
        ]
      },
      success: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'You choose the empty cradle. The disc splits with a sound like a held sob. Beneath it: the first Covenant was signed by nine mortals and one child. The child’s name has been scratched away by every hand that followed.',
        effects: [{ type: 'flag', id: 'seal_memory' }, { type: 'flag', id: 'temple_seal_two' }, { type: 'xp', amount: 60 }],
        choices: [{ id: 'end', text: 'The second seal is open.', next: 'end' }]
      },
      fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'Every image turns to face you at once. For a heartbeat, you cannot remember which body is yours.',
        effects: [{ type: 'damage', amount: 6 }],
        choices: [{ id: 'end', text: 'Close your eyes and step back.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'One seal remains.', choices: [] }
    }
  },
  {
    id: 'temple_seal_grief', title: 'Seal of Grief', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A disc of black glass hangs above a dry fountain. In its reflection, the Drowned Saint kneels beside a door, holding it shut with her hands. She has been doing this for so long that the stone has grown around her.',
        choices: [
          { id: 'grieve', text: 'Kneel beside her and share the weight.', check: { stat: 'wis', dc: 15, proficiency: 'Insight', label: 'Insight' }, successNext: 'success', failureNext: 'fail' },
          { id: 'cleric', text: 'Offer the prayer for those who cannot rest.', requiresClass: 'cleric', tag: 'Cleric', next: 'success', effects: [{ type: 'approval', id: 'oren', amount: 4 }] },
          { id: 'comfort', text: 'Tell her she can put it down.', check: { stat: 'cha', dc: 14, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'success', failureNext: 'fail' }
        ]
      },
      success: {
        speaker: 'The Drowned Saint', portrait: 'crown',
        text: '“I held the door because no one else would. I thought if I let go, the world would drown. But the world drowned anyway, and I was too busy holding a door to notice. Thank you for noticing.”',
        effects: [{ type: 'flag', id: 'seal_grief' }, { type: 'flag', id: 'temple_seal_three' }, { type: 'xp', amount: 100 }, { type: 'questStage', id: 'q_drowned_covenant', amount: 1 }],
        choices: [{ id: 'end', text: 'The inner sanctum opens.', next: 'end' }]
      },
      fail: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'The Saint’s grief is older than your body knows how to hold. It pours through you. You wake on the floor with salt on your lips and no memory of the last hour.',
        effects: [{ type: 'damage', amount: 8 }],
        choices: [{ id: 'end', text: 'Stand and try again.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'All three seals are open. The temple inhales.', choices: [] }
    }
  },
  {
    id: 'veyra_final', title: 'The Crownbound', start: 'start',
    nodes: {
      start: {
        speaker: 'Veyra Sol', portrait: 'veyra',
        text: 'You came. I hoped you would. Not because I need saving — I am far past saving — but because someone should see what the Crown does when it stops pretending to be a crown. It has been wearing me for six years. Today it wants to wear the world.',
        effects: [{ type: 'flag', id: 'met_veyra' }],
        choices: [
          { id: 'why', text: 'Why did you take it?', next: 'why' },
          { id: 'stop', text: 'You can take it off. Let me help.', check: { stat: 'cha', dc: 18, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'doubt', failureNext: 'fight_intro' },
          { id: 'threat', text: 'The Crown is not the only thing that can take a body.', check: { stat: 'str', dc: 17, proficiency: 'Intimidation', label: 'Intimidation' }, successNext: 'wounded', failureNext: 'fight_intro' },
          { id: 'lore', text: 'I know what the Nine did. I know about the child.', next: 'lore' },
          { id: 'attack', text: 'Enough. I am taking the Crown.', next: 'fight_intro' }
        ]
      },
      why: {
        speaker: 'Veyra Sol', portrait: 'veyra',
        text: 'Because the Covenant was going to let Greymoor die. A Choir ritual poisoned the well, the Inquisitor called it heresy, and the Reeve called it weather. I put on the Crown to save a village. It saved them. It has been saving things ever since, whether they want saving or not.',
        choices: [{ id: 'lore', text: 'And the child in the archive?', next: 'lore' }, { id: 'stop', text: 'You can stop now.', next: 'fight_intro' }]
      },
      lore: {
        speaker: 'The Crown', portrait: 'crown',
        text: '“The child was the first bearer. She asked to be forgotten so the world could remember itself. Veyra asked to be remembered so the world could forget its fear. There is no difference between a savior and a wound. Both are openings.”',
        effects: [{ type: 'flag', id: 'crown_speaks' }],
        choices: [
          { id: 'doubt', text: 'Veyra. Listen to me. Not it. Me.', check: { stat: 'cha', dc: 18, proficiency: 'Persuasion', label: 'Persuasion' }, successNext: 'doubt', failureNext: 'fight_intro' },
          { id: 'fight', text: 'Then I will open it properly.', next: 'fight_intro' }
        ]
      },
      doubt: {
        speaker: 'Veyra Sol', portrait: 'veyra',
        text: 'I can hear you. I can hear you under it. But the Crown is afraid. It has been alone for six hundred years, and it has decided that being alone is the same as being right. It will not let go while I am still useful.',
        effects: [{ type: 'flag', id: 'veyra_doubt' }, { type: 'xp', amount: 100 }],
        choices: [{ id: 'fight', text: 'Then I will make it let go.', next: 'fight_intro' }]
      },
      wounded: {
        speaker: 'Veyra Sol', portrait: 'veyra',
        text: 'You think fear is a lever. The Crown has been afraid since before your language had a word for it. But — yes. There. For a moment, it loosened its grip. A moment is enough to hurt it.',
        effects: [{ type: 'flag', id: 'veyra_wounded' }, { type: 'xp', amount: 80 }],
        choices: [{ id: 'fight', text: 'Then I will use it.', next: 'fight_intro' }]
      },
      fight_intro: {
        speaker: 'Veyra Sol', portrait: 'veyra',
        text: 'I am sorry. I have been sorry for six years. The Crown says sorry is another word for a door opening. I am going to open you.',
        effects: [
          { type: 'flag', id: 'veyra_fight' },
          { type: 'startCombat', id: 'enc_crownbound' }
        ],
        choices: []
      }
    }
  },
  {
    id: 'ending_choice', title: 'The Ashen Crown', start: 'start',
    nodes: {
      start: {
        speaker: 'The Crown', portrait: 'crown',
        text: '“I am what remains of the first world. I have held every erased name, every burned city, every child the Nine could not save. You are the first bearer who can choose without being told what the choice means. Choose.”',
        effects: [{ type: 'flag', id: 'crown_choice_open' }],
        choices: [
          { id: 'reforge', text: 'Reforge the Covenant. Let the world keep its shape, and take my memories in payment.', next: 'reforge' },
          { id: 'shatter', text: 'Shatter the Crown. Let every erased soul return, even if the world cannot hold them.', next: 'shatter' },
          { id: 'bear', text: 'Bear the Crown myself. No more hidden kings. No more forgotten worlds.', next: 'bear' },
          { id: 'unwritten', text: 'There is a fourth choice. The one the Crown could not write.', requiresFlag: 'unwritten_ready', next: 'unwritten' }
        ]
      },
      reforge: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'Kaelen steps beside you. “I have spent eight years trying to be forgiven for one order. I will not pretend this is different. But a world that keeps going is a world that can still do better. If you choose this, I will remember for you.”',
        effects: [{ type: 'ending', id: 'reforge' }],
        choices: []
      },
      shatter: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Nyx laughs, once, without humor. “Of course you would. The Choir was right about one thing: the world is a cage. But cages keep children safe. If you break it, I will be right here. I am not running from the sky falling. Not this time.”',
        effects: [{ type: 'ending', id: 'shatter' }],
        choices: []
      },
      bear: {
        speaker: 'Oren Hale', portrait: 'oren',
        text: 'Oren closes his eyes. “A crown is a burden until someone chooses it. That is the only difference between a tyrant and a saint. I do not know if you are either. I know you are willing. That is more than the Nine ever were.”',
        effects: [{ type: 'ending', id: 'bear' }],
        choices: []
      },
      unwritten: {
        speaker: 'The Unwritten', portrait: 'player',
        text: 'You speak your own name into the Crown. Not the name someone gave you. The one underneath it. The Crown tries to write you into its story and finds no page wide enough. For the first time in a thousand years, its voice is quiet.',
        effects: [{ type: 'ending', id: 'unwritten' }],
        choices: []
      }
    }
  },
  {
    id: 'citadel_lore', title: 'A King’s Last Decree', start: 'start',
    nodes: {
      start: {
        speaker: 'Narrator', portrait: 'narrator',
        text: 'A black pillar, carved with a decree in nine languages. “Let the Crown pass from hand to hand. Let no king wear it for more than one age. Let the world forget us, and let our forgetting be mercy. If a bearer should come who is not in the book — let them choose.”',
        effects: [{ type: 'flag', id: 'king_decree' }, { type: 'xp', amount: 50 }],
        choices: [{ id: 'end', text: 'Trace the last line.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The words “let them choose” have been carved deeper than the rest. Someone wanted them to survive.', choices: [] }
    }
  },

  // ── Companion conversations ────────────────────────────────────────────────
  {
    id: 'kaelen_talk', title: 'The Grey Knight', start: 'start',
    nodes: {
      start: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'You want to talk. I have been told I am better at standing in front of doors than at conversation. But I owe you more than a door.',
        choices: [
          { id: 'old', text: 'Tell me about the old quarter.', next: 'old' },
          { id: 'letter', text: 'I found this letter. It has your seal on it.', requiresItem: 'sealed_letter', next: 'letter' },
          { id: 'us', text: 'What do you think of all this? The Crown, the Choir, the end of the world?', next: 'us' },
          { id: 'end', text: 'Nothing. Just checking you are still here.', next: 'end' }
        ]
      },
      old: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'There was a boy with a mark like a broken wheel. The Watch said he was a door for the Choir. I gave the order to burn the old quarter. I told myself I was saving the village. Some nights I believe it. Most nights I hear the fire.',
        effects: [{ type: 'quest', id: 'q_name_in_ashes', value: 'start' }, { type: 'questStage', id: 'q_name_in_ashes', amount: 1 }, { type: 'flag', id: 'kaelen_old_quarter' }],
        choices: [
          { id: 'forgive', text: 'You were given an impossible order. What matters is what you did after.', next: 'forgive' },
          { id: 'accuse', text: 'You burned children. There is no after that fixes that.', next: 'accuse' },
          { id: 'confess', text: 'Tell Marla. Tell the village. Let them decide.', next: 'confess' }
        ]
      },
      letter: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'That is my seal. I remember signing it. I remember thinking the ink was the heaviest thing I had ever lifted. The boy was not a door. He was a child who had been made into one by people who never asked what he wanted.',
        effects: [{ type: 'flag', id: 'kaelen_letter_confronted' }, { type: 'questStage', id: 'q_name_in_ashes', amount: 2 }],
        choices: [
          { id: 'forgive', text: 'Then help me make sure no one is made into a door again.', next: 'forgive' },
          { id: 'accuse', text: 'You do not get to be forgiven because you feel bad.', next: 'accuse' }
        ]
      },
      forgive: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I am not asking for forgiveness. I am asking for work. Put me where the next child is, and I will stand between them and the fire. That is the only prayer I have left.',
        effects: [{ type: 'approval', id: 'kaelen', amount: 15 }, { type: 'flag', id: 'kaelen_forgiven' }, { type: 'questComplete', id: 'q_name_in_ashes' }, { type: 'xp', amount: 300 }],
        choices: [{ id: 'end', text: 'Then stand beside me.', next: 'end' }]
      },
      accuse: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'No. We do not. I will not make you carry my absolution. But if you want me to leave, say it plainly. I have been looking for a reason to leave for eight years.',
        effects: [{ type: 'approval', id: 'kaelen', amount: -18 }, { type: 'flag', id: 'kaelen_accused' }],
        choices: [
          { id: 'stay', text: 'Stay. But you will answer for it.', next: 'stay' },
          { id: 'leave', text: 'Then leave.', next: 'leave' }
        ]
      },
      stay: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I will. When this is over, if we are both alive, I will stand in front of the village and tell them what I did. Not for penance. For the record.',
        effects: [{ type: 'approval', id: 'kaelen', amount: 8 }, { type: 'questComplete', id: 'q_name_in_ashes' }, { type: 'xp', amount: 250 }],
        choices: [{ id: 'end', text: 'Good.', next: 'end' }]
      },
      leave: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'Then I will go. Not far. If you need a door held, you know where to find me.',
        effects: [{ type: 'leave', id: 'kaelen' }],
        choices: [{ id: 'end', text: 'Goodbye, Kaelen.', next: 'end' }]
      },
      confess: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I will. When the Crown is dealt with. If we live, I will stand in the square and let them throw whatever they need to throw. Maybe that is not justice. It is the closest thing I can offer.',
        effects: [{ type: 'approval', id: 'kaelen', amount: 8 }, { type: 'questComplete', id: 'q_name_in_ashes' }, { type: 'xp', amount: 260 }],
        choices: [{ id: 'end', text: 'I will stand with you.', next: 'end' }]
      },
      us: {
        speaker: 'Kaelen Voss', portrait: 'kaelen',
        text: 'I think the world has been held together by people who were not gods, pretending to be. I think the Crown is the same. I think we are about to find out whether a world can survive being honest with itself.',
        choices: [{ id: 'end', text: 'That is a better answer than I expected.', next: 'end' }]
      },
      end: { speaker: 'Kaelen Voss', portrait: 'kaelen', text: 'I will be here. Holding the door.', choices: [] }
    }
  },
  {
    id: 'nyx_talk', title: 'A Knife for the Choir', start: 'start',
    nodes: {
      start: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'You have that look. The “we should talk about the lie you told me” look. I was hoping we could avoid it until after the world ended. I have a talent for postponing consequences.',
        choices: [
          { id: 'orders', text: 'Who sent you? The truth, Nyx.', next: 'orders' },
          { id: 'trust', text: 'You can tell me when you are ready.', next: 'trust', effects: [{ type: 'approval', id: 'nyx', amount: 8 }] },
          { id: 'us', text: 'Why do you stay, if you were sent to watch me?', next: 'us' }
        ]
      },
      orders: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'The Choir. They wanted to know what the mark did, how strong you were, and whether you could be turned. My orders said “observe.” The word “eliminate” appeared in a separate letter. I burned it. That should count for something. It does not feel like enough.',
        effects: [{ type: 'flag', id: 'nyx_truth' }, { type: 'questStage', id: 'q_knife_for_choir', amount: 1 }, { type: 'approval', id: 'nyx', amount: 3 }],
        choices: [
          { id: 'forgive', text: 'You chose to tell me. That is what counts.', next: 'forgive' },
          { id: 'angry', text: 'You were sent to kill me. I should throw you out.', next: 'angry' },
          { id: 'handler', text: 'Then we use your handler. Draw them out.', next: 'handler' }
        ]
      },
      trust: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'You are going to make this very difficult. I was prepared for shouting. I even had a dramatic exit planned. You are not supposed to be reasonable at me.',
        choices: [{ id: 'orders', text: 'I can be patient. But I need the truth eventually.', next: 'orders' }]
      },
      forgive: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'You are an idiot. A kind one. I have known a lot of people who said they believed in second chances, and most of them meant other people’s second chances. I think you actually mean it. That is terrifying.',
        effects: [{ type: 'approval', id: 'nyx', amount: 15 }, { type: 'flag', id: 'nyx_loyal' }, { type: 'questComplete', id: 'q_knife_for_choir' }, { type: 'xp', amount: 280 }],
        choices: [{ id: 'end', text: 'Then we are both terrified.', next: 'end' }]
      },
      angry: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'You could. I would deserve it. But before you do, ask yourself who told you where the Choir keeps its fire. Who kept watch while you slept in that inn? Who is still here, knowing what the Choir does to people who fail?',
        effects: [{ type: 'approval', id: 'nyx', amount: -10 }],
        choices: [
          { id: 'stay', text: 'You stay. But I will not forget.', next: 'stay' },
          { id: 'leave', text: 'Leave. I do not want a knife at my back.', next: 'leave' }
        ]
      },
      stay: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'I can live with that. I have lived with worse. For what it is worth, the order is already dead. I killed it the night you asked me what I thought of the stars.',
        effects: [{ type: 'approval', id: 'nyx', amount: 5 }, { type: 'questComplete', id: 'q_knife_for_choir' }, { type: 'xp', amount: 240 }],
        choices: [{ id: 'end', text: 'Then stay.', next: 'end' }]
      },
      leave: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Fair. I will not ask again. If you change your mind, look for a knife in the dark and hope it is me.',
        effects: [{ type: 'leave', id: 'nyx' }],
        choices: [{ id: 'end', text: 'Goodbye, Nyx.', next: 'end' }]
      },
      handler: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'My handler is a man called Corvin. He will be at the Citadel. The Choir always keeps one of its knives close to the Crown. I will write him a letter that says exactly what he expects to hear. Then we will see how he likes being watched.',
        effects: [{ type: 'flag', id: 'nyx_handler_plan' }, { type: 'approval', id: 'nyx', amount: 6 }, { type: 'questStage', id: 'q_knife_for_choir', amount: 1 }],
        choices: [{ id: 'end', text: 'We will be ready.', next: 'end' }]
      },
      us: {
        speaker: 'Nyx Ardent', portrait: 'nyx',
        text: 'Because at first it was a job. Then it was curiosity. Then it was the way you say “I will do it” when you clearly do not know how. Somewhere in there I started lying to the Choir instead of about you. That is how it always starts, isn’t it?',
        choices: [{ id: 'end', text: 'I hope so.', next: 'end' }]
      },
      end: { speaker: 'Nyx Ardent', portrait: 'nyx', text: 'Right. No more deep conversations. They give me wrinkles.', choices: [] }
    }
  },
  {
    id: 'ilyra_talk', title: 'The Sister Who Never Was', start: 'start',
    nodes: {
      start: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'I have been rereading the archive notes. There are three versions of Sereth and all of them are internally consistent. That should be impossible. The universe is many things, but it is not usually that sloppy.',
        choices: [
          { id: 'believe', text: 'What do you want to believe?', next: 'believe', effects: [{ type: 'approval', id: 'ilyra', amount: 4 }] },
          { id: 'truth', text: 'Then one of the versions must be false. Which one has the most evidence?', next: 'truth' },
          { id: 'letgo', text: 'Maybe the question is not whether she was real. Maybe it is what she made you.', next: 'letgo' }
        ]
      },
      believe: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'I want to believe she was real. Not because I need a sister, but because I need my grief to have a subject. I have spent twenty years mourning someone I cannot prove existed. That is not madness. That is a very specific kind of loneliness.',
        choices: [{ id: 'end', text: 'Then we will believe her together.', next: 'end', effects: [{ type: 'questComplete', id: 'q_sister_who_never_was' }, { type: 'approval', id: 'ilyra', amount: 12 }, { type: 'flag', id: 'ilyra_resolved' }, { type: 'xp', amount: 260 }] }]
      },
      truth: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'The version with the funeral has the most evidence. It also has the most inconsistencies. The version where she vanished has no evidence at all, but it feels like the truth. I am an archivist. I should not trust feelings over records. Yet here we are.',
        choices: [{ id: 'end', text: 'Then let us find the page that is missing.', next: 'end', effects: [{ type: 'questComplete', id: 'q_sister_who_never_was' }, { type: 'flag', id: 'ilyra_truth' }, { type: 'approval', id: 'ilyra', amount: 8 }, { type: 'xp', amount: 280 }] }]
      },
      letgo: {
        speaker: 'Ilyra Morn', portrait: 'ilyra',
        text: 'She made me an archivist. She made me curious. She made me the kind of person who would come to a ruin looking for a ghost. Whether she existed or not, she built me. That is a kind of existence. I suppose that will have to be enough.',
        choices: [{ id: 'end', text: 'It is more than enough.', next: 'end', effects: [{ type: 'questComplete', id: 'q_sister_who_never_was' }, { type: 'flag', id: 'ilyra_letgo' }, { type: 'approval', id: 'ilyra', amount: 10 }, { type: 'xp', amount: 250 }] }]
      },
      end: { speaker: 'Ilyra Morn', portrait: 'ilyra', text: 'Thank you. For not telling me what to feel. It is a rare courtesy.', choices: [] }
    }
  },
  {
    id: 'oren_talk', title: 'The Last Prayer', start: 'start',
    nodes: {
      start: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'I have been praying since we left Greymoor. The altar is not answering, but something is. It knows my name. It knows what I am afraid of. Last night it told me my faith was borrowed. I would like to return it, but I cannot find the lender.',
        choices: [
          { id: 'power', text: 'Where do you think your power comes from?', next: 'power' },
          { id: 'faith', text: 'Does it matter where the power comes from, if you use it kindly?', next: 'faith' },
          { id: 'sacrifice', text: 'You can stop using it. There is no shame in laying a burden down.', next: 'sacrifice' }
        ]
      },
      power: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'The Crown. I am almost certain. The prayers I say over the dying come back with a warmth that is not the Nine’s. It is older. It is tired. It heals because it remembers healing. I have been a conduit for a wound, not a god.',
        effects: [{ type: 'flag', id: 'oren_crown_power' }, { type: 'questStage', id: 'q_last_prayer', amount: 1 }],
        choices: [
          { id: 'keep', text: 'Then be a conduit for something better. The wound can still close.', next: 'keep' },
          { id: 'stop', text: 'Then stop. We will find another way to heal.', next: 'stop' }
        ]
      },
      keep: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'You make it sound simple. Maybe it is. Maybe faith is not the source, only the shape we give the source. I will keep praying. I will just stop pretending I know who is listening. That feels more honest than certainty.',
        effects: [{ type: 'approval', id: 'oren', amount: 12 }, { type: 'flag', id: 'oren_faith_rebuilt' }, { type: 'questComplete', id: 'q_last_prayer' }, { type: 'xp', amount: 280 }],
        choices: [{ id: 'end', text: 'That is enough.', next: 'end' }]
      },
      stop: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'If I stop, I am just a man with a censer and bad knees. But perhaps that is what the village needs. A man who heals because he chooses to, not because something is using him to. I will put the prayers down. I will keep the kindness.',
        effects: [{ type: 'approval', id: 'oren', amount: 10 }, { type: 'flag', id: 'oren_faith_renounced' }, { type: 'questComplete', id: 'q_last_prayer' }, { type: 'xp', amount: 260 }],
        choices: [{ id: 'end', text: 'The kindness is the point.', next: 'end' }]
      },
      faith: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'That is the question, isn’t it? If a healing hand can be borrowed, is the healing any less real? I have healed people who did not deserve it, and people who did. The power did not care. Maybe I should not either.',
        choices: [{ id: 'keep', text: 'Then keep healing.', next: 'keep' }, { id: 'stop', text: 'Or put it down. Both are honest.', next: 'stop' }]
      },
      sacrifice: {
        speaker: 'Brother Oren Hale', portrait: 'oren',
        text: 'I have been a priest for twenty years. I do not know who I am without the prayers. But I know who I am with them: a man who is afraid of the answer. Maybe that is the last prayer. Asking the question and staying anyway.',
        effects: [{ type: 'flag', id: 'oren_questioned' }],
        choices: [{ id: 'keep', text: 'Stay. Ask. Keep healing.', next: 'keep' }, { id: 'stop', text: 'Then put it down and stay anyway.', next: 'stop' }]
      },
      end: { speaker: 'Brother Oren Hale', portrait: 'oren', text: 'Thank you. I think I can pray again now. Even if no one is listening, the words still make a shape.', choices: [] }
    }
  },
  {
    id: 'sable_talk', title: 'A Debt in Shadow', start: 'start',
    nodes: {
      start: {
        speaker: 'Sable', portrait: 'sable',
        text: 'It found us. I felt it last night, standing at the edge of the firelight. It has my face. It has been wearing it for six years. If you want to know why I do not sleep, that is the answer.',
        choices: [
          { id: 'how', text: 'How did it take your shadow?', next: 'how' },
          { id: 'kill', text: 'Then we kill it and take your shadow back.', next: 'kill' },
          { id: 'afraid', text: 'Are you afraid of it?', next: 'afraid' }
        ]
      },
      how: {
        speaker: 'Sable', portrait: 'sable',
        text: 'I made a bargain with the Thorned Court. A dry season, a hungry winter, a village that needed rain. I offered my shadow as a promise. The rain came. The shadow stayed. It learned my shape and then it learned to want.',
        effects: [{ type: 'flag', id: 'sable_shadow_truth' }, { type: 'questStage', id: 'q_debt_in_shadow', amount: 1 }],
        choices: [{ id: 'kill', text: 'Then we end the bargain.', next: 'kill' }]
      },
      kill: {
        speaker: 'Sable', portrait: 'sable',
        text: 'It will be in the woods, near the old stones. It cannot go far from the place where I gave it away. I have been avoiding it for six years. I am tired of avoiding things. Let us go and be honest with the dark.',
        effects: [{ type: 'flag', id: 'sable_quest_started' }, { type: 'questStage', id: 'q_debt_in_shadow', amount: 1 }],
        choices: [{ id: 'end', text: 'Lead the way.', next: 'end' }]
      },
      afraid: {
        speaker: 'Sable', portrait: 'sable',
        text: 'Yes. Not of dying. Of seeing what I would have become if I had stayed in that bargain. The shadow is not a monster wearing my face. It is the person I was when I was desperate. I have been running from her ever since.',
        effects: [{ type: 'approval', id: 'sable', amount: 10 }, { type: 'flag', id: 'sable_quest_started' }, { type: 'questStage', id: 'q_debt_in_shadow', amount: 1 }],
        choices: [{ id: 'end', text: 'Then we face her together.', next: 'end' }]
      },
      end: { speaker: 'Sable', portrait: 'sable', text: 'The shadow will be by the old stones. Try not to let it touch you. It remembers people better than it should.', choices: [] }
    }
  },
  {
    id: 'sable_after_shadow', title: 'What the Dark Returns', start: 'start',
    nodes: {
      start: {
        speaker: 'Sable', portrait: 'sable',
        text: 'It is quiet. Not gone — I can feel it folded behind my ribs, where a shadow should be. You did not have to stand with me against that thing. But you did. The Reach will remember it, even if I am bad at saying so.',
        effects: [{ type: 'flag', id: 'sable_shadow_reclaimed' }, { type: 'questStage', id: 'q_debt_in_shadow', amount: 1 }],
        choices: [
          { id: 'take', text: 'Take your shadow back. It is yours.', next: 'take', effects: [{ type: 'approval', id: 'sable', amount: 12 }, { type: 'questComplete', id: 'q_debt_in_shadow' }, { type: 'xp', amount: 320 }] },
          { id: 'keep', text: 'Keep it close. It is part of what made you.', next: 'keep', effects: [{ type: 'approval', id: 'sable', amount: 8 }, { type: 'flag', id: 'sable_kept_shadow' }, { type: 'questComplete', id: 'q_debt_in_shadow' }, { type: 'xp', amount: 300 }] },
          { id: 'quiet', text: 'You do not have to thank me.', next: 'quiet', effects: [{ type: 'approval', id: 'sable', amount: 10 }, { type: 'questComplete', id: 'q_debt_in_shadow' }, { type: 'xp', amount: 300 }] }
        ]
      },
      take: {
        speaker: 'Sable', portrait: 'sable',
        text: 'She comes back slowly, like warmth after snow. My shadow. My shape. For six years I have been a person with a hole in the shape of a promise. Now the hole is filled, and I find I miss the woman I was when it was empty. I will learn to be this one.',
        choices: [{ id: 'end', text: 'You already are.', next: 'end' }]
      },
      keep: {
        speaker: 'Sable', portrait: 'sable',
        text: 'The old Rootbound would say a reclaimed shadow is a second soul. I do not know if that is true. I know it listens when I speak, and it no longer wants my face. That will do. That will do very well.',
        choices: [{ id: 'end', text: 'Then we both gained something.', next: 'end' }]
      },
      quiet: {
        speaker: 'Sable', portrait: 'sable',
        text: 'No. I do. I have been paying debts since before I could read. It is strange to have one forgiven instead. I will not forget it, and not because I owe you. Because I want to remember.',
        choices: [{ id: 'end', text: 'Then remember.', next: 'end' }]
      },
      end: { speaker: 'Sable', portrait: 'sable', text: 'The woods are listening. For once, they sound pleased.', choices: [] }
    }
  },
  {
    id: 'hollow_merchant', title: 'The Hollow Merchant', start: 'start',
    nodes: {
      start: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'A figure sits behind a blanket of wares that are not quite there: a locket, a child’s shoe, a jar of summer. It has no face, only a smile made of the memory of one. “You found my shop. Most people find the coin first. I am running a special. One memory, gently used. What have you already lost?”',
        effects: [
          { type: 'quest', id: 'q_hollow_merchant', value: 'start' },
          { type: 'flag', id: 'hollow_merchant_met' },
          { type: 'discover', id: 'whispering_woods' }
        ],
        choices: [
          { id: 'goods', text: 'What are you selling, exactly?', next: 'goods' },
          { id: 'who', text: 'What are you?', next: 'who' },
          { id: 'notice', text: 'The village notice says you sell what people have already lost.', next: 'notice' },
          { id: 'expose', text: 'This ends now. I am taking your wares back to Greymoor.', next: 'expose', effects: [{ type: 'flag', id: 'hollow_merchant_exposed' }] }
        ]
      },
      goods: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'Memories. Regrets. The first name a mother gave a child before the Covenant gave another. I do not steal them. I buy them from people who would rather not carry them, and I sell them to people who would rather not be themselves. It is honest trade. Mostly.',
        effects: [{ type: 'flag', id: 'hollow_merchant_trade' }],
        choices: [
          { id: 'who', text: 'And what are you?', next: 'who' },
          { id: 'expose', text: 'Honest trade does not leave people hollow.', next: 'expose', effects: [{ type: 'flag', id: 'hollow_merchant_exposed' }] }
        ]
      },
      who: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'A memory of a merchant. I was a person once. I sold my own name to make rent, then my grief, then the face of someone I loved. Now I am the space where those things were, trying to make a living. Do not pity me. Pity is expensive and I cannot make change.',
        effects: [{ type: 'flag', id: 'hollow_merchant_truth' }, { type: 'approval', id: 'nyx', amount: 3 }],
        choices: [
          { id: 'end_trade', text: 'Take me off your ledger. I am not buying.', next: 'free', effects: [{ type: 'approval', id: 'nyx', amount: 4 }] },
          { id: 'expose', text: 'Then I will give the village back what you have taken.', next: 'expose', effects: [{ type: 'flag', id: 'hollow_merchant_exposed' }] }
        ]
      },
      notice: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'The notice is accurate. I sell only what has already been lost. The trouble is that loss is contagious. A memory leaves one head, then the house, then the street. I am not the wound. I am the weather around it. But I have made a home in the weather, and that is not the same as innocence.',
        effects: [{ type: 'flag', id: 'hollow_merchant_confessed' }],
        choices: [
          { id: 'free', text: 'Then close the shop. Let the weather pass.', next: 'free', effects: [{ type: 'approval', id: 'nyx', amount: 5 }] },
          { id: 'expose', text: 'The village deserves to know what you are.', next: 'expose', effects: [{ type: 'flag', id: 'hollow_merchant_exposed' }] }
        ]
      },
      free: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'Close the shop. I have been open for so long I forgot the door had a handle. Perhaps I will keep one thing. A single summer. Not to sell. To remember what warmth felt like before it became inventory. Take this, for the courtesy.',
        effects: [
          { type: 'gold', amount: 120 },
          { type: 'xp', amount: 240 },
          { type: 'questComplete', id: 'q_hollow_merchant' },
          { type: 'flag', id: 'hollow_merchant_spared' }
        ],
        choices: [{ id: 'end', text: 'Keep the summer.', next: 'end' }]
      },
      expose: {
        speaker: 'The Hollow Merchant', portrait: 'narrator',
        text: 'You take the wares. They weigh less than they should. The figure behind the blanket does not stop you. It simply begins to forget itself, starting with the smile. By the time you turn around, there is only a blanket, a jar of summer, and a coin with a hole in the middle.',
        effects: [
          { type: 'gold', amount: 80 },
          { type: 'xp', amount: 240 },
          { type: 'questComplete', id: 'q_hollow_merchant' },
          { type: 'flag', id: 'hollow_merchant_exposed' }
        ],
        choices: [{ id: 'end', text: 'Carry the wares back to Greymoor.', next: 'end' }]
      },
      end: { speaker: 'Narrator', portrait: 'narrator', text: 'The clearing smells faintly of summer. The smell fades before you reach the path.', choices: [] }
    }
  }
];

export const dialogueById = Object.fromEntries(dialogues.map((d) => [d.id, d]));

export const companionTalkIds: Record<string, string> = {
  kaelen: 'kaelen_talk',
  nyx: 'nyx_talk',
  ilyra: 'ilyra_talk',
  oren: 'oren_talk',
  sable: 'sable_talk'
};
