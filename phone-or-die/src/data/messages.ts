import type { MessageDef } from '@/core/types';

export const messages: MessageDef[] = [
  {
    id: 'msg_intro_unknown',
    contactId: 'unknown',
    from: 'UNKNOWN',
    at: 6,
    text: 'They only come when you’re alone.',
    effects: [{ type: 'flag', id: 'received_first_message' }]
  },
  {
    id: 'msg_sophie_1',
    contactId: 'sophie',
    from: 'Sophie',
    at: 8,
    text: 'Are you walking home? Call me when you reach Lantern Avenue. I have a bad feeling.',
    effects: [{ type: 'trust', id: 'sophie', amount: 1 }]
  },
  {
    id: 'msg_mom_1',
    contactId: 'mom',
    from: 'Mom',
    at: 4,
    text: 'You should have let Daniel drive you. I left the porch light on at home anyway.',
    effects: [{ type: 'trust', id: 'mom', amount: 1 }]
  },
  {
    id: 'msg_daniel_1',
    contactId: 'daniel',
    from: 'Daniel',
    at: 11,
    text: 'I’m sorry about tonight. I should have walked you home. Call me when you’re on Home Lane.',
    effects: [{ type: 'trust', id: 'daniel', amount: 1 }]
  },
  {
    id: 'msg_origin_work',
    contactId: 'priya',
    from: 'Priya',
    at: 9,
    text: 'Shift over? Text me when you’re inside. The buses stop early and the old quarter is not a good walk.',
    effects: [{ type: 'trust', id: 'priya', amount: 1 }]
  },
  {
    id: 'msg_origin_appointment',
    contactId: 'daniel',
    from: 'Daniel',
    at: 9,
    text: 'I know you said you wanted to walk. If the road starts feeling wrong, call me. I mean it.',
    effects: [{ type: 'trust', id: 'daniel', amount: 1 }]
  },
  {
    id: 'msg_shift',
    contactId: 'system',
    from: 'Shift Roster',
    at: 10,
    text: 'NIGHT OWL COPY — Emma Mercer, 6:00 PM–10:00 PM. CLOSED. Next bus: 10:02 PM. Do not walk through the old quarter alone.',
    effects: [
      { type: 'clue', id: 'shift_roster', text: 'The roster warns against walking through the old quarter alone.' },
      { type: 'flag', id: 'found_shift_roster' }
    ]
  },
  {
    id: 'msg_missing',
    contactId: 'system',
    from: 'Missing Poster',
    at: 22,
    text: 'MISSING: Mara Vale, 26. Last seen walking home from the night bus. If you have seen her, call the number below. The phone number has been scratched away.',
    effects: [
      { type: 'clue', id: 'mara_missing', text: 'A missing woman, Mara Vale, was last seen walking home from the night bus.' },
      { type: 'flag', id: 'found_missing_poster' }
    ]
  },
  {
    id: 'msg_payphone',
    contactId: 'system',
    from: 'Payphone',
    at: 60,
    text: 'A recorded voice: “The line you are using has been disconnected since 1987. Please stay on the line.”',
    effects: [
      { type: 'clue', id: 'payphone_disconnected', text: 'The payphone has been disconnected since 1987, but it still rings.' },
      { type: 'flag', id: 'payphone_disconnected' }
    ]
  },
  {
    id: 'msg_bus',
    contactId: 'system',
    from: 'Night Bus',
    at: 90,
    text: 'Next bus: 10:02 PM. Next bus: 10:02 PM. Next bus: 10:02 PM. The display has not changed in forty minutes.',
    effects: [
      { type: 'clue', id: 'bus_loop', text: 'The night-bus display is stuck on 10:02 PM.' },
      { type: 'flag', id: 'found_bus_message' }
    ]
  },
  {
    id: 'msg_route',
    contactId: 'system',
    from: 'Route Map',
    at: 95,
    text: 'The route map shows three ways home. Someone has crossed out the park cut in red pen and written: “THE LINE RUNS UNDER IT.”',
    effects: [
      { type: 'clue', id: 'line_under_park', text: 'A note on the route map says the old line runs under the park cut.' },
      { type: 'flag', id: 'found_route' }
    ]
  },
  {
    id: 'msg_old_house',
    contactId: 'system',
    from: 'Photo (back)',
    at: 14,
    text: 'On the back of a photograph: “The second line is not for us. — E.M.” The house in the picture has a porch light that is not on the real house.',
    effects: [
      { type: 'clue', id: 'second_line', text: 'An old photograph mentions a “second line” that was not for the family.' },
      { type: 'flag', id: 'found_photo_message' }
    ]
  },
  {
    id: 'msg_mirror',
    contactId: 'system',
    from: 'Shop Window',
    at: 130,
    text: 'DONT LOOK AT THE REFLECTIONS AFTER MIDNIGHT.',
    effects: [{ type: 'clue', id: 'mirror_message', text: 'A message on a fogged shop window: DONT LOOK AT THE REFLECTIONS AFTER MIDNIGHT.' }]
  },
  {
    id: 'msg_wiring',
    contactId: 'system',
    from: 'Damp Note',
    at: 80,
    text: 'The line under the road was moved in 1987. Do not reconnect it. If the house starts calling, cut the line while someone is speaking.',
    effects: [
      { type: 'clue', id: 'cut_old_line', text: 'Cut the old line while someone is speaking to break the house’s connection.' },
      { type: 'flag', id: 'found_wiring' }
    ]
  },
  {
    id: 'msg_broadcast',
    contactId: 'system',
    from: 'Emergency Broadcast',
    at: 150,
    text: 'IF YOU ARE RECEIVING THIS MESSAGE, KEEP A HUMAN VOICE ON THE LINE. DO NOT TAKE UNMARKED SHORTCUTS. DAWN WILL RELEASE THE CONNECTION.',
    effects: [{ type: 'clue', id: 'broadcast', text: 'An emergency broadcast says dawn will release the connection.' }]
  },
  {
    id: 'msg_daniel_email',
    contactId: 'daniel',
    from: 'Unsent draft',
    at: 150,
    text: 'Emma — the road answers me when I call. Not my phone. The road. I think it wants me to bring you outside. I won’t. I’m sorry I didn’t tell you sooner.',
    effects: [{ type: 'clue', id: 'daniel_email', text: 'Daniel wrote that the road answers him when he calls.' }]
  },
  {
    id: 'msg_radio',
    contactId: 'system',
    from: 'Kitchen radio',
    at: 220,
    text: 'They are not outside. They are in the line.',
    effects: [{ type: 'clue', id: 'in_the_line', text: 'A radio voice: “They are not outside. They are in the line.”' }]
  },
  {
    id: 'msg_footprints',
    contactId: 'system',
    from: 'Wet Pavement',
    at: 210,
    text: 'Bare footprints follow your route. They stop at every streetlight. They are your size.',
    effects: [{ type: 'clue', id: 'footprints', text: 'Bare footprints the size of Emma’s follow her route.' }]
  },
  {
    id: 'msg_sophie_dad',
    contactId: 'sophie',
    from: 'Sophie',
    at: 270,
    text: 'Your mom called. She says your dad took the car to find you hours ago and hasn’t come back. Please tell me you’re okay.',
    effects: [{ type: 'clue', id: 'dad_missing', text: 'Dad took the car to find Emma and never came back.' }]
  },
  {
    id: 'msg_grandmother',
    contactId: 'system',
    from: 'Mom',
    at: 200,
    text: 'I found Grandma’s diary. She wrote: “The line is not a door. It is a promise. Do not let it be answered by the wrong voice.”',
    effects: [
      { type: 'clue', id: 'grandmother_line', text: 'Grandmother’s diary: the line is a promise, and it can be answered by the wrong voice.' },
      { type: 'flag', id: 'grandmother_line' }
    ]
  },
  {
    id: 'msg_dad_line',
    contactId: 'dad',
    from: 'Dad',
    at: 90,
    text: 'The old line is under the road, near the porch. I cut it once. It screamed in Mom’s voice. Don’t reconnect it.',
    effects: [{ type: 'clue', id: 'old_line', text: 'The old line is under the road near the porch. It once screamed in Mom’s voice.' }]
  },
  {
    id: 'msg_empty_door',
    contactId: 'system',
    from: 'Bus shelter',
    at: 330,
    text: 'Wet handprints on the glass. No car on the road. The prints are your father’s size.',
    effects: [{ type: 'clue', id: 'empty_door', text: 'Wet handprints at the shelter after a voice claiming to be Dad.' }]
  },
  {
    id: 'msg_daniel_deadline',
    contactId: 'daniel',
    from: 'Daniel',
    at: 160,
    text: 'Your name and 6:00 AM. That’s all it said. Don’t let it be right.',
    effects: [{ type: 'clue', id: 'deadline', text: 'Daniel received Emma’s name and the time 6:00 AM.' }]
  },
  {
    id: 'msg_alex_drawing',
    contactId: 'alex',
    from: 'Alex',
    at: 250,
    text: 'I sent you the drawing. Look at the woman at the other end of the line. It’s not a monster. It’s a name with a body missing.',
    effects: [{ type: 'clue', id: 'scarred_woman', text: 'The drawing shows a woman with a crown-shaped scar at the other end of the line.' }]
  },
  {
    id: 'msg_unknown_followup',
    contactId: 'unknown',
    from: 'UNKNOWN',
    at: 300,
    text: 'You called me. That means you are beginning to understand. There is a name under your name. I can hear it. It sounds like a door at the end of a road.',
    effects: [{ type: 'flag', id: 'unknown_followup' }]
  },
  {
    id: 'msg_last_message',
    contactId: 'system',
    from: 'Unsent / 5:59 AM',
    at: 470,
    text: 'If you are reading this, I did not make it home. But you did. Keep walking. Keep my name. — Emma',
    effects: [{ type: 'clue', id: 'last_message', text: 'A message from a version of Emma who did not make it home.' }]
  },
  {
    id: 'msg_power_out',
    contactId: 'system',
    from: 'Street',
    at: 190,
    text: 'The streetlights have gone out. The junction box is in the old quarter.',
    effects: [{ type: 'flag', id: 'power_outage_notified' }]
  },
  {
    id: 'msg_wrong_number',
    contactId: 'system',
    from: 'Unknown caller',
    at: 150,
    text: '“This is the operator. The line you are using has been disconnected since 1987. Please hold.”',
    effects: [{ type: 'clue', id: 'disconnected_line', text: 'An operator says the line has been disconnected since 1987.' }]
  },
  {
    id: 'msg_missed_call',
    contactId: 'system',
    from: 'Missed Call',
    at: 200,
    text: 'Missed call: Sophie Hale. 7 minutes from now.',
    effects: [{ type: 'clue', id: 'seven_minutes', text: 'The missed-call notification is stamped seven minutes in the future.' }]
  },
  {
    id: 'msg_voicemail_jessica',
    contactId: 'jessica',
    from: 'Jessica',
    at: 280,
    text: 'Voicemail: “Emma, if you hear this, don’t call the house line. Keep walking. I’m sorry. I’m so sorry.”',
    effects: [{ type: 'clue', id: 'jessica_voicemail', text: 'Jessica left a voicemail warning not to call the house line.' }]
  }
];

export const messageById = Object.fromEntries(messages.map((message) => [message.id, message]));

export const initialMessages = [
  'msg_intro_unknown',
  'msg_sophie_1',
  'msg_mom_1',
  'msg_daniel_1',
  'msg_origin_work'
];
