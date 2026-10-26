// NINTH DAY — Day 3: The Bellows
// Beneath the foundry, the counterweights are failing. The Choir makes its offer.

-> day_03_morning

=== day_03_morning ===
# bg:foundry
The stair below the foundry goes down farther than the maps admit. # id:d3m_001 # speaker:Narration
Mara counts the steps. Iven counts the exits. You count the times you have done this before. # id:d3m_002 # speaker:Narration
The counterweights are still moving. That is the first bad sign. # id:d3m_003 # speaker:Narration
They should have stopped when the Bell cracked. # id:d3m_004 # speaker:Mara
The second bad sign is the singing. # id:d3m_005 # speaker:Narration
It comes up through the floor, low and patient, a hymn with no words. # id:d3m_006 # speaker:Narration
Iven stops at the lock mechanism. Give me ten minutes, he says. I can slow the drop. # id:d3m_007 # speaker:Iven
Ten minutes is a long time in a burning building. # id:d3m_008 # speaker:Narration
* [Trust Iven with the lock.] # flag:iven_lead # bond:iven:1
    -> trust
* [Take the lead down the stair.] # flag:cael_lead # bond:mara:1
    -> lead

=== trust ===
# bg:bellows
Iven opens the panel. His hands are steady. They are always steady when there is something to fix. # id:d3m_009 # speaker:Narration
Mara watches the dark below. You watch Iven. # id:d3m_010 # speaker:Narration
Nine minutes, he says. Then we run. # id:d3m_011 # speaker:Iven
-> END

=== lead ===
# bg:bellows
You go first. The stair groans under each step. # id:d3m_012 # speaker:Narration
Mara follows close enough that you can hear her breathing. # id:d3m_013 # speaker:Narration
If the floor goes, Iven says from behind, I am blaming you. # id:d3m_014 # speaker:Iven
Noted. # id:d3m_015 # speaker:Cael
-> END

=== day_03_afternoon ===
# bg:bellows
The counterweight hall is a cathedral built for machines. Chains hang from the dark like roots. # id:d3a_001 # speaker:Narration
At the bottom, the Ashwright is waiting. It has rebuilt itself from the foundry's bones. # id:d3a_002 # speaker:Narration
The Hollow Choir circles above it, a ring of notes with no mouths. # id:d3a_003 # speaker:Narration
You came back, the Ashwright says. Good. The Bell needs a witness. # id:d3a_004 # speaker:The Ashwright
The main chain is exposed. If it goes, the whole hall comes down. # id:d3a_005 # speaker:Narration
Including us, Iven says. # id:d3a_006 # speaker:Iven
Including the Bell, Mara says. # id:d3a_007 # speaker:Mara
* [Cut the counterweight chain.] # flag:cut_chain # bond:mara:1
    -> cut
* [Face the Ashwright in the ring.] # flag:face_ashwright # bond:iven:1
    -> face

=== cut ===
# bg:bellows
Mara swings. The chain opens with a sound like a bell being born. # id:d3a_008 # speaker:Narration
The Ashwright turns, too late, and the hall begins to fall. # id:d3a_009 # speaker:Narration
Good, it says. Again. # id:d3a_010 # speaker:The Ashwright
-> END

=== face ===
# bg:bellows
You step into the ring. The Choir tightens around you like a noose of sound. # id:d3a_011 # speaker:Narration
The Ashwright lifts its hammer. The Bell in your chest answers. # id:d3a_012 # speaker:Narration
This time, you say, I am not here to watch. # id:d3a_013 # speaker:Cael
-> END

=== day_03_night ===
# bg:spire_night
The Choir finds you on the Spire stair. It does not attack. It offers. # id:d3n_001 # speaker:Narration
Give us the loop, it sings. Give us the ninth day. We will make the Bell whole. # id:d3n_002 # speaker:The Hollow Choir
Mara's hand is on her hammer. Iven's hand is on his arbalest. Neither of them moves. # id:d3n_003 # speaker:Narration
No one will remember, the Choir says. No one will have to. # id:d3n_004 # speaker:The Hollow Choir
The crack in the Bell glows faintly. It is waiting for an answer. # id:d3n_005 # speaker:Narration
* [Refuse. Some things must be remembered.] # flag:refused_choir # bond:mara:1
    -> refuse
* [Listen. Ask what the city would lose.] # flag:heard_choir
    -> listen
* [Offer the Choir a different memory.] # flag:bargained_choir # bond:iven:1
    -> bargain

=== refuse ===
# bg:spire_night
No, you say. The word is small. The Bell takes it anyway. # id:d3n_006 # speaker:Narration
The Choir withdraws like a tide. Mara exhales. # id:d3n_007 # speaker:Narration
That was the right answer, she says. I think. # id:d3n_008 # speaker:Mara
-> END

=== listen ===
# bg:spire_night
What would we lose? you ask. # id:d3n_009 # speaker:Cael
Everything that hurts, the Choir says. And everything that made the hurting bearable. # id:d3n_010 # speaker:The Hollow Choir
You listen until the song ends. Then you tell it to leave. # id:d3n_011 # speaker:Narration
-> END

=== bargain ===
# bg:spire_night
Take the foundry, you say. Take every debt in Ember Row. Leave the people. # id:d3n_012 # speaker:Cael
The Choir considers this. It is not mercy, it says. It is arithmetic. # id:d3n_013 # speaker:The Hollow Choir
Iven laughs once, without humor. # id:d3n_014 # speaker:Narration
Arithmetic will do, he says. # id:d3n_015 # speaker:Iven
-> END
