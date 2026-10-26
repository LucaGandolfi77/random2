// NINTH DAY — Day 6: The Watch
// Sera Vane closes the city. Your alliance decides who stands in the street.

VAR allied_watch = false
VAR allied_rebels = false
VAR refused_all = false

-> day_06_morning

=== day_06_morning ===
# bg:checkpoint
The Watch moves before dawn. By the time the Bell rings eight, every district gate is locked. # id:d6m_001 # speaker:Narration
Sera Vane stands on the checkpoint wall with a pike and a ledger of names. # id:d6m_002 # speaker:Narration
The Bellkeeper, she says. I have been ordered to bring you in. I am deciding whether to obey. # id:d6m_003 # speaker:Sera
Mara's hand is on her hammer. Wren is at the back of the room with Toma, both of them very still. # id:d6m_004 # speaker:Narration
The Iron Choir is already inside the walls, Sera says. If we fight each other, it takes the city. # id:d6m_005 # speaker:Sera
She is not lying. That is the worst part. # id:d6m_006 # speaker:Narration
Toma closes his notebook. Wren looks at you and does not blink. # id:d6m_007 # speaker:Narration
* [Ally with Sera and the Watch.] # flag:allied_watch
    ~ allied_watch = true
    -> watch
* [Ally with Wren and the rebels.] # flag:allied_rebels # bond:wren:1
    ~ allied_rebels = true
    -> rebels
* [Refuse both. Trust only the party.] # flag:refused_all # bond:mara:1
    ~ refused_all = true
    -> alone

=== watch ===
# bg:checkpoint
Sera lowers the pike. One hour, she says. Then you answer for the Bell. # id:d6m_008 # speaker:Sera
The gate opens. Watch soldiers fall in behind you. None of them look happy about it. # id:d6m_009 # speaker:Narration
Wren does not follow. Toma does, because Toma always follows the paper. # id:d6m_010 # speaker:Narration
-> END

=== rebels ===
# bg:checkpoint
Then we take the gate, Wren says. Toma, the east lock. Mara, with me. # id:d6m_011 # speaker:Wren
Sera watches you go. I will not ask twice, she says. # id:d6m_012 # speaker:Sera
Neither will I. # id:d6m_013 # speaker:Cael
-> END

=== alone ===
# bg:checkpoint
No, you say. Not the Watch. Not the rebels. Us. # id:d6m_014 # speaker:Cael
Mara nods once. Iven checks his bow. Wren's face closes like a door. # id:d6m_015 # speaker:Narration
Then you are already alone, Sera says. # id:d6m_016 # speaker:Sera
-> END

=== day_06_afternoon ===
{ allied_watch:
    -> afternoon_watch
}
{ allied_rebels:
    -> afternoon_rebels
}
{ refused_all:
    -> afternoon_refused
}

=== afternoon_watch ===
# bg:ember_row
The Iron Choir comes through the east gate singing. The Watch line breaks in three places. # id:d6a_001 # speaker:Narration
Sera holds the center. Hold the gate, she says. I will hold the song. # id:d6a_002 # speaker:Sera
The Choir has no faces. It has the city's old marching songs, sung backward. # id:d6a_003 # speaker:Narration
Mara spits. I hate backwards music. # id:d6a_004 # speaker:Mara
-> END

=== afternoon_rebels ===
# bg:ember_row
Sera Vane finds you at the east barricade. She has brought the Watch's best, and she has brought herself. # id:d6a_005 # speaker:Narration
I gave you a choice, she says. You chose the wrong side of the gate. # id:d6a_006 # speaker:Sera
The Bell is not a side, you say. It is a debt. # id:d6a_007 # speaker:Cael
Then I will collect it. # id:d6a_008 # speaker:Sera
-> END

=== afternoon_refused ===
# bg:ember_row
The Iron Choir corners you in the empty market. No Watch. No rebels. Just the party and the song. # id:d6a_009 # speaker:Narration
You wanted to stand alone, Mara says. Here we are. # id:d6a_010 # speaker:Mara
Iven nocks a bolt. Try to keep up, Bellkeeper. # id:d6a_011 # speaker:Iven
-> END

=== day_06_night ===
# bg:quiet
After the battle, one of them does not answer. # id:d6n_001 # speaker:Narration
The Quiet has been in the city all day. It has learned how to wear a friend. # id:d6n_002 # speaker:Narration
Mara is standing at the window, but her reflection is a half-second late. # id:d6n_003 # speaker:Narration
Iven is checking his arbalest, but he has checked the same bolt nine times. # id:d6n_004 # speaker:Narration
Toma is writing, but the page is blank. # id:d6n_005 # speaker:Narration
You can reach one of them before the Bell rings. # id:d6n_006 # speaker:Narration
* [Reach Mara.] # flag:saved_mara # bond:mara:1
    -> mara
* [Reach Iven.] # flag:saved_iven # bond:iven:1
    -> iven
* [Reach Toma.] # flag:saved_toma # bond:toma:1
    -> toma

=== mara ===
# bg:quiet
You take Mara's hand. The reflection catches up. She exhales like she has been holding the whole city. # id:d6n_007 # speaker:Narration
You are late, she says. You were late the last time too. # id:d6n_008 # speaker:Mara
The Quiet withdraws from the room. Not far. # id:d6n_009 # speaker:Narration
-> END

=== iven ===
# bg:quiet
You put your hand over Iven's. He stops checking the bolt. # id:d6n_010 # speaker:Narration
That was not me, he says. I was here. I was here the whole time. # id:d6n_011 # speaker:Iven
I know. # id:d6n_012 # speaker:Cael
-> END

=== toma ===
# bg:quiet
You take the pen from Toma's hand. The blank page fills with one word, then another. # id:d6n_013 # speaker:Narration
Toma looks at it for a long time. Then he writes the date. # id:d6n_014 # speaker:Toma
The Quiet leaves him alone after that. # id:d6n_015 # speaker:Narration
-> END
