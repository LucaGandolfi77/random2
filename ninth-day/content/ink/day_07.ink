// NINTH DAY — Day 7: The Offer
// Vey's sanctuary is a day without combat. The Saint of Ash is the price of refusing it.

VAR accepted_sanctuary = false
VAR questioned_vey = false
VAR refused_sanctuary = false
VAR accepted_mercy = false

-> day_07_morning

=== day_07_morning ===
# bg:sanctuary
There is a place beneath Saint Orra where the Bell cannot be heard. # id:d7m_001 # speaker:Narration
Vey keeps it. They are old, and patient, and they do not cast a shadow. # id:d7m_002 # speaker:Narration
You are the Bellkeeper, Vey says. You look like someone who has been carrying a city uphill. # id:d7m_003 # speaker:Vey
People come here to forget, they say. Not everything. Just the parts that will not stop hurting. # id:d7m_004 # speaker:Vey
Mara's hand is not on her hammer. Iven is looking at the door. Wren is looking at you. # id:d7m_005 # speaker:Narration
The Bell cannot reach this room, Vey says. Stay. Let the city have one quiet day. # id:d7m_006 # speaker:Narration
* [Accept the sanctuary.] # flag:accepted_sanctuary # bond:vey:1
    ~ accepted_sanctuary = true
    -> accept
* [Ask what the sanctuary costs.] # flag:questioned_vey
    ~ questioned_vey = true
    -> ask
* [Refuse. The city cannot forget its way out of this.] # flag:refused_sanctuary # bond:mara:1
    ~ refused_sanctuary = true
    -> refuse

=== accept ===
# bg:sanctuary
You sit. The chair is warm. The quiet is so complete that you can hear your own heart deciding to slow down. # id:d7m_007 # speaker:Narration
One day, Vey says. That is all I ask. # id:d7m_008 # speaker:Vey
-> END

=== ask ===
# bg:sanctuary
Nothing you will miss, Vey says. That is the cost. # id:d7m_009 # speaker:Vey
Toma writes it down. Wren takes the pen away from him. # id:d7m_010 # speaker:Narration
-> END

=== refuse ===
# bg:sanctuary
Then you will meet the Saint, Vey says. They do not sound angry. They sound tired. # id:d7m_011 # speaker:Vey
Mara picks up her hammer. Good, she says. I was starting to like the quiet too much. # id:d7m_012 # speaker:Mara
-> END

=== day_07_afternoon ===
# bg:ash
Vey leads you to the inner door. Beyond it, the sanctuary's guardian waits in a field of ash. # id:d7a_001 # speaker:Narration
The Saint of Ash is what the sanctuary does with the memories it cannot keep. # id:d7a_002 # speaker:Narration
Accept my offer, Vey says, and you will never have to fight it. Refuse, and it will fight for the city's forgetting. # id:d7a_003 # speaker:Vey
The door is open. The ash is warm under your feet. # id:d7a_004 # speaker:Narration
* [Accept Vey's mercy. Let the Saint sleep.] # flag:accepted_mercy # bond:vey:1
    ~ accepted_mercy = true
    -> mercy
* [Refuse. Face the Saint of Ash.] # flag:refused_mercy # bond:mara:1
    ~ accepted_mercy = false
    -> fight

=== mercy ===
# bg:sanctuary
You step back from the door. Vey closes it without a sound. # id:d7a_005 # speaker:Narration
For one day, the Bell is only a sound in another room. # id:d7a_006 # speaker:Narration
Mara sits down. Iven does not. Wren watches the door. # id:d7a_007 # speaker:Narration
-> END

=== fight ===
# bg:ash
You step into the ash. The Saint rises. Somewhere behind you, Vey does not move. # id:d7a_008 # speaker:Narration
The Bell in your chest rings once, clear and bright and terrible. # id:d7a_009 # speaker:Narration
Then we remember, you say. Even this. # id:d7a_010 # speaker:Cael
-> END

=== day_07_night ===
{ accepted_mercy:
    -> night_mercy
}
{ not accepted_mercy:
    -> night_fight
}

=== night_mercy ===
# bg:quiet
The day passes without a Bell. No one fights. No one dies. It is the kindest day you can remember. # id:d7n_001 # speaker:Narration
That is the problem. You cannot remember why you came. # id:d7n_002 # speaker:Narration
Mara is laughing at something Toma said. Iven is asleep in a chair. Wren is drawing the ceiling. # id:d7n_003 # speaker:Narration
Vey stands beside you. One day is almost over, they say. You may keep it. Or you may keep the reason you came. # id:d7n_004 # speaker:Vey
* [Keep the memory of this quiet day.] # flag:kept_quiet_day # bond:vey:1
    -> keep_day
* [Keep the reason. Take the day back.] # flag:kept_reason # bond:mara:1
    -> keep_reason
* [Ask Vey to keep both.] # flag:asked_both
    -> both

=== night_fight ===
# bg:quiet
The Saint of Ash comes apart into a hundred memories. None of them are yours. # id:d7n_005 # speaker:Narration
Vey watches from the doorway. You have made the sanctuary smaller, they say. And the city larger. # id:d7n_006 # speaker:Vey
Mara is bleeding. Iven is steady. Wren is already writing down what happened. # id:d7n_007 # speaker:Narration
* [Keep the memory of the fight.] # flag:kept_fight # bond:mara:1
    -> keep_fight
* [Let Vey take the ash.] # flag:gave_ash # bond:vey:1
    -> give_ash
* [Ask Wren to write it all down.] # flag:wren_record # bond:wren:1
    -> record

=== keep_day ===
# bg:quiet
You keep the quiet. The reason fades like a word held too long. # id:d7n_008 # speaker:Narration
It is enough. It has to be. # id:d7n_009 # speaker:Narration
-> END

=== keep_reason ===
# bg:quiet
You take the reason back. It hurts immediately. # id:d7n_010 # speaker:Narration
Good, Mara says. That means it is yours. # id:d7n_011 # speaker:Mara
-> END

=== both ===
# bg:quiet
Vey is silent for a long time. Then they smile, and it is the first honest thing you have seen them do. # id:d7n_012 # speaker:Narration
No one has asked for both before, they say. I do not know if I can give it. # id:d7n_013 # speaker:Vey
Try. # id:d7n_014 # speaker:Cael
-> END

=== keep_fight ===
# bg:quiet
You keep the fight. The ash, the noise, the moment the Saint came apart. # id:d7n_015 # speaker:Narration
Mara takes your hand. You do not let go until the Bell rings. # id:d7n_016 # speaker:Narration
-> END

=== give_ash ===
# bg:quiet
Vey takes the ash. The sanctuary grows a little larger. The city forgets a little more. # id:d7n_017 # speaker:Narration
You tell yourself it is a fair trade. You are not sure who you are telling. # id:d7n_018 # speaker:Narration
-> END

=== record ===
# bg:quiet
Wren writes it all down. Every page. Every name. # id:d7n_019 # speaker:Narration
When she is finished, she reads it back to you. You only have to remember once. # id:d7n_020 # speaker:Narration
-> END
