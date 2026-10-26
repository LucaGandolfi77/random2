// NINTH DAY — Day 1
// Every line carries an id and presentation tags. Flags and bonds live on choices.

-> day_01_morning

=== day_01_morning ===
# bg:spire
You wake to the sound of a bell that should not be ringing. # id:d1m_001 # speaker:Narration
The Spire room is cold. Dust hangs in the light. On the sill, a cup of tea has gone entirely still. # id:d1m_002 # speaker:Narration
Ninth day. # id:d1m_003 # speaker:Cael
You do not know how you know. The words are already there, the way a bruise is already there. # id:d1m_004 # speaker:Narration
Cael. The Bell is cracking. # id:d1m_005 # speaker:Mara
Mara Voss stands in the doorway with soot on her sleeves and her jaw set. Below the Spire, all of Aurel is holding its breath. # id:d1m_006 # speaker:Narration
If it rings again, the day starts over. You know that. You always know that. # id:d1m_007 # speaker:Mara
Then we have until noon. # id:d1m_008 # speaker:Cael
Mara holds out her hand. Above you, the Bell gives a sound like a tooth breaking. # id:d1m_009 # speaker:Narration
* [Take her hand.] # flag:mara_trust # bond:mara:1
    -> hand
* [Look up at the Bell.] # flag:bell_curious
    -> bell

=== hand ===
# bg:spire
Good. We do this together, or not at all. # id:d1m_010 # speaker:Mara
Her hand is warm. The Bell cracks again, and somewhere below, a choir begins to sing. # id:d1m_011 # speaker:Narration
That is not a hymn. # id:d1m_012 # speaker:Cael
No. It is the Hollow Choir. It has come to finish the crack. # id:d1m_013 # speaker:Mara
-> END

=== bell ===
# bg:spire
The Bell hangs above you like a held breath. A hairline of white runs through the brass, bright as frost. # id:d1m_014 # speaker:Narration
Nine days. Nine chances. # id:d1m_015 # speaker:Cael
Then stop counting and move. The Hollow Choir is already inside the wall. # id:d1m_016 # speaker:Mara
-> END

=== day_01_afternoon ===
# bg:ember_row
Ember Row is usually loud by afternoon. Today the stalls stand empty, their awnings ticking in the wind. # id:d1a_001 # speaker:Narration
You are late, Bellkeeper. # id:d1a_002 # speaker:Iven
Iven Sorn lowers his arbalest. He has the patient eyes of a man who has been counting exits. # id:d1a_003 # speaker:Narration
Where is everyone? # id:d1a_004 # speaker:Cael
The Watch closed the checkpoint at noon. Said the ashfall was unhealthy. # id:d1a_005 # speaker:Iven
He tilts his chin toward the foundry. Black smoke is rising in a column that does not bend. # id:d1a_006 # speaker:Narration
Elias went in to fix a counterweight. He has not come out. # id:d1a_007 # speaker:Iven
The foundry gates are shut. Somewhere inside, something heavy is striking metal. # id:d1a_008 # speaker:Narration
* [Ask Iven to come with you.] # flag:iven_joined # bond:iven:1
    -> together
* [Follow the ashfall alone.] # flag:went_alone
    -> alone

=== together ===
# bg:foundry
I thought you would never ask. # id:d1a_009 # speaker:Iven
He checks his bow, then the door, then you. It is, you think, the closest thing to affection he allows himself. # id:d1a_010 # speaker:Narration
Stay behind me. # id:d1a_011 # speaker:Cael
Not a chance. # id:d1a_012 # speaker:Iven
-> END

=== alone ===
# bg:foundry
You go in through the ash door. The heat presses against your face like a hand. # id:d1a_013 # speaker:Narration
Behind you, Iven curses softly and follows anyway. # id:d1a_014 # speaker:Narration
You are going to get us both killed. # id:d1a_015 # speaker:Iven
Probably. # id:d1a_016 # speaker:Cael
-> END

=== day_01_night ===
# bg:spire_night
Night comes to Aurel the way water comes to a hull. Slowly, then all at once. # id:d1n_001 # speaker:Narration
The crack held. For now. # id:d1n_002 # speaker:Mara
And tomorrow? # id:d1n_003 # speaker:Iven
Tomorrow the Bell rings again, and we begin again. # id:d1n_004 # speaker:Mara
The three of you sit beneath the great brass mouth. Somewhere in the city, a child is laughing. It sounds very far away. # id:d1n_005 # speaker:Narration
We should remember this. # id:d1n_006 # speaker:Cael
The Bell will take the day when it rings. You can anchor one thing against the dark. # id:d1n_007 # speaker:Narration
* [Keep the warmth of this room.] # flag:anchored_warmth # bond:mara:1
    -> warmth
* [Keep the crack in the Bell.] # flag:anchored_crack
    -> crack
* [Keep nothing. Let it go.] # flag:anchored_nothing
    -> nothing

=== warmth ===
# bg:spire_night
You hold on to the tea, the soot, the two people beside you. It is not a grand memory. It is enough. # id:d1n_008 # speaker:Narration
Whatever happens tomorrow, this happened. # id:d1n_009 # speaker:Mara
-> END

=== crack ===
# bg:spire_night
You fix the crack in your mind: its whiteness, its angle, the exact note the Bell made when it split. # id:d1n_010 # speaker:Narration
Next time, we go straight for the source. # id:d1n_011 # speaker:Cael
-> END

=== nothing ===
# bg:spire_night
You let the day go. It leaves quietly, without ceremony, like a guest who knows they were never invited. # id:d1n_012 # speaker:Narration
That is either wisdom or surrender. # id:d1n_013 # speaker:Iven
Ask me on the ninth day. # id:d1n_014 # speaker:Cael
-> END
