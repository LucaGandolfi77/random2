// NINTH DAY — Day 9: The Quiet
// The last morning, the first Bellkeeper, and the ending you chose on Day 8.

VAR ending_ring = false
VAR ending_break = false
VAR ending_become = false
VAR has_hidden_bell = false

-> day_09_morning

=== day_09_morning ===
# bg:spire_ascent
The ninth morning comes without a Bell. That is how you know it is the last one. # id:d9m_001 # speaker:Narration
Aurel is quiet below you. Not the Quiet. Just quiet. # id:d9m_002 # speaker:Narration
Mara is checking her hammer. Iven is checking the exits. Wren is checking the sky. # id:d9m_003 # speaker:Narration
Toma has filled three pages already. He stops when you look at him. # id:d9m_004 # speaker:Narration
Whatever happens today, Toma says, I am writing it down. # id:d9m_005 # speaker:Toma
Wren does not look away from the sky. There is one thing we have not tried, she says. # id:d9m_006 # speaker:Wren
* [Ask Wren about the hidden bell.] # flag:has_hidden_bell # bond:wren:1
    -> hidden
* [Rally the city one last time.] # flag:rallied_city # bond:mara:1
    -> rally
* [Rest with the party. Save your strength.] # flag:rested_party # bond:iven:1
    -> rest

=== hidden ===
# bg:spire_ascent
My mother kept a second bell, Wren says. Small enough to hold. It remembers the city before the loop. # id:d9m_007 # speaker:Wren
Where is it? # id:d9m_008 # speaker:Cael
She taps her chest. Here, she says. It has been here the whole time. # id:d9m_009 # speaker:Wren
-> END

=== rally ===
# bg:spire_ascent
You go down to the city one last time. You tell them what is coming. # id:d9m_010 # speaker:Narration
Some of them believe you. Some of them are already forgetting. It does not matter. # id:d9m_011 # speaker:Narration
Mara stands beside you the whole way. # id:d9m_012 # speaker:Narration
-> END

=== rest ===
# bg:spire_ascent
You sit on the stair and eat cold bread. Iven complains about the bread. Mara laughs at him. # id:d9m_013 # speaker:Narration
For a few minutes, no one is a Bellkeeper or a rebel or a debt. # id:d9m_014 # speaker:Narration
Then the sky goes dark, and the ninth day begins in earnest. # id:d9m_015 # speaker:Narration
-> END

=== day_09_afternoon ===
# bg:quiet
The Quiet is waiting at the Bell. It is not a monster. It is a woman with a Bellkeeper's hands. # id:d9a_001 # speaker:Narration
The first Bellkeeper, Wren says. My mother. # id:d9a_002 # speaker:Wren
She looks at you with eyes that have seen eight versions of this conversation. # id:d9a_003 # speaker:Narration
You came back, she says. They always come back. # id:d9a_004 # speaker:The Quiet
You are the one who rang it wrong, Mara says. # id:d9a_005 # speaker:Mara
I am the one who rang it at all. # id:d9a_006 # speaker:The Quiet
* [Say her name.] # flag:named_quiet # bond:wren:1
    -> name
* [Strike first.] # flag:struck_first # bond:mara:1
    -> strike
* [Ask what she wants.] # flag:asked_quiet # bond:iven:1
    -> ask

=== name ===
# bg:quiet
Her name is Orra Vane. Wren's mother. Sera's aunt. The first Bellkeeper. # id:d9a_007 # speaker:Narration
The Quiet flinches. For a moment, she is only a woman. # id:d9a_008 # speaker:Narration
Then the Bell rings, and the moment is gone. # id:d9a_009 # speaker:Narration
-> END

=== strike ===
# bg:quiet
Mara moves first. The Quiet turns toward her, and the room fills with a sound like snow. # id:d9a_010 # speaker:Narration
You follow. There is no more time for names. # id:d9a_011 # speaker:Narration
-> END

=== ask ===
# bg:quiet
I wanted one more day, the Quiet says. That is all. One more day with him. # id:d9a_012 # speaker:The Quiet
You have had eight, Iven says. That is not a day. That is a habit. # id:d9a_013 # speaker:Iven
-> END

=== day_09_night ===
# bg:spire_night
The Quiet falls. The Bell is open. The ninth day is yours to end. # id:d9n_001 # speaker:Narration
Mara is on your left. Iven is on your right. Wren is holding the small bell. # id:d9n_002 # speaker:Narration
Toma writes the date. Then he closes the book, because some things do not need a page. # id:d9n_003 # speaker:Narration
{ ending_ring:
    -> end_ring
}
{ ending_break:
    -> end_break
}
{ ending_become:
    -> end_become
}
{ not ending_ring and not ending_break and not ending_become:
    -> end_ring
}

=== end_ring ===
# bg:spire_night
You put your hand on the crown. The Bell is warm. It has been waiting to be touched. # id:d9n_004 # speaker:Narration
Tomorrow, you tell them, we ring it together. # id:d9n_005 # speaker:Cael
The Bell rings. The city remembers how to begin again. # id:d9n_006 # speaker:Narration
-> END

=== end_break ===
# bg:spire_night
You put your hand on the crack. It fits the shape of your palm. # id:d9n_007 # speaker:Narration
If we break it, Mara says, some of us will not remember the way back. # id:d9n_008 # speaker:Mara
Then we leave a map. # id:d9n_009 # speaker:Cael
The Bell breaks. Time moves forward. # id:d9n_010 # speaker:Narration
-> END

=== end_become ===
# bg:spire_night
You put your hand inside the Bell. The dark is full of every version of the city. # id:d9n_011 # speaker:Narration
Wren stops counting. Whatever you are about to do, she says, do it as yourself. # id:d9n_012 # speaker:Wren
You become the thing that holds Aurel together. # id:d9n_013 # speaker:Narration
-> END
