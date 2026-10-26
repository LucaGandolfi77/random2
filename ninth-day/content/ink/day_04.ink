// NINTH DAY — Day 4: Saint Orra
// The memory gardens remember every name the Bell has taken.

-> day_04_morning

=== day_04_morning ===
# bg:garden
The memory gardens sit behind Saint Orra's chapel, where the ash cannot reach. # id:d4m_001 # speaker:Narration
Every rose has a name written on its tag. Every name has a date. # id:d4m_002 # speaker:Narration
Sister Oria moves between the rows with a watering can and a patience older than the Bell. # id:d4m_003 # speaker:Narration
You are late, Bellkeeper, she says. You were late the last time too. # id:d4m_004 # speaker:Oria
You do not ask how she knows. # id:d4m_005 # speaker:Narration
The garden is for what the Bell takes, she says. We keep the names so the city has somewhere to look. # id:d4m_006 # speaker:Oria
A small wren lands on the chapel roof. It watches you the way a person would. # id:d4m_007 # speaker:Narration
* [Kneel and receive her blessing.] # flag:oria_blessing # bond:oria:1
    -> kneel
* [Ask Oria about the wren.] # flag:asked_wren # bond:oria:1
    -> ask
* [Refuse the blessing. Ask what the garden costs.] # flag:refused_blessing
    -> refuse

=== kneel ===
# bg:garden
Oria touches your brow. Her hand smells of soil and cold tea. # id:d4m_008 # speaker:Narration
Remember one name a day, she says. That is all the Bell cannot take. # id:d4m_009 # speaker:Oria
You tell her you will try. # id:d4m_010 # speaker:Narration
-> END

=== ask ===
# bg:garden
The wren? Oria does not look up. It has been here longer than the garden. # id:d4m_011 # speaker:Oria
Longer than the Bell? # id:d4m_012 # speaker:Cael
She waters a rose before she answers. Longer than the name for it. # id:d4m_013 # speaker:Oria
-> END

=== refuse ===
# bg:garden
Every name here was taken from someone, you say. What do you charge them to remember? # id:d4m_014 # speaker:Cael
Oria sets down the watering can. Nothing, she says. That is the cost. # id:d4m_015 # speaker:Oria
-> END

=== day_04_afternoon ===
# bg:clockwork
The Clockwork Saint kneels at the center of the garden, built into the root of the chapel. # id:d4a_001 # speaker:Narration
It has been still for a hundred years. Today its eyes are open. # id:d4a_002 # speaker:Narration
Do not break it, Oria says. Break the bell heart. It will remember how to sleep. # id:d4a_003 # speaker:Oria
The Saint rises. Brass hands unfold like a prayer. # id:d4a_004 # speaker:Narration
Somewhere inside it, a small bell begins to ring. # id:d4a_005 # speaker:Narration
The roses turn their heads toward the sound. # id:d4a_006 # speaker:Narration
* [Stand between the Saint and Oria.] # flag:shield_oria # bond:oria:1
    -> shield
* [Go for the bell heart.] # flag:strike_heart # bond:mara:1
    -> strike

=== shield ===
# bg:clockwork
You put yourself in front of Oria. The Saint's shadow falls over both of you. # id:d4a_007 # speaker:Narration
It is not the Saint we are fighting, Oria says. It is the thing that wound it. # id:d4a_008 # speaker:Oria
Then we unwind it together. # id:d4a_009 # speaker:Cael
-> END

=== strike ===
# bg:clockwork
The heart is a knot of gears behind the Saint's ribs. You can see it through the brass. # id:d4a_010 # speaker:Narration
Mara sees it too. She plants her feet and waits for your word. # id:d4a_011 # speaker:Narration
Break the heart, not the Saint, you say. # id:d4a_012 # speaker:Cael
-> END

=== day_04_night ===
# bg:roof
The wren is waiting on the Spire roof. Up close, it is a girl. # id:d4n_001 # speaker:Narration
She is counting under her breath. Eight. Nine. She stops when she sees you. # id:d4n_002 # speaker:Narration
You are the Bellkeeper, she says. You look tired for someone who gets to try again. # id:d4n_003 # speaker:Wren
My name is Wren. I have been on this roof for four loops. # id:d4n_004 # speaker:Wren
The Bell takes most things, she says. It does not take me. I have not decided if that is a gift. # id:d4n_005 # speaker:Wren
* [Ask Wren to come down with you.] # flag:wren_trust # bond:wren:1
    -> come
* [Ask how she remembers.] # flag:wren_memory # bond:wren:1
    -> remember
* [Leave her on the roof.] # flag:wren_left
    -> leave

=== come ===
# bg:roof
Wren looks at the drop, then at you. She does not take your hand, but she follows. # id:d4n_006 # speaker:Narration
One condition, she says. When it gets bad, you do not decide for me. # id:d4n_007 # speaker:Wren
Agreed. # id:d4n_008 # speaker:Cael
-> END

=== remember ===
# bg:roof
I write it down, she says. Every morning. The same nine things. # id:d4n_009 # speaker:Wren
She shows you a slate covered in chalk. Your name is at the top. # id:d4n_010 # speaker:Narration
You do not remember writing it. # id:d4n_011 # speaker:Narration
-> END

=== leave ===
# bg:roof
You leave her counting. On the way down, you hear her start again from one. # id:d4n_012 # speaker:Narration
The Bell rings once, quietly, as if it has won something small. # id:d4n_013 # speaker:Narration
-> END
