// NINTH DAY — Day 5: The Quiet
// Wren's house holds the first crack. Toma has been copying it for years.

-> day_05_morning

=== day_05_morning ===
# bg:wren_house
Wren's house is smaller than it looks from the street. Every wall is covered in paper. # id:d5m_001 # speaker:Narration
Maps of Aurel. Lists of names. Nine circles drawn over the same three streets. # id:d5m_002 # speaker:Narration
Toma is at the table when you come in, ink to the elbows, copying a page he has already copied four times. # id:d5m_003 # speaker:Narration
You are the Bellkeeper, he says. I have been writing you down for six years. # id:d5m_004 # speaker:Toma
Wren closes the door behind you. Mara and Iven fill the room until it feels like a held breath. # id:d5m_005 # speaker:Narration
The first crack was not an accident, Wren says. Someone rang the Bell on the wrong day. # id:d5m_006 # speaker:Wren
Toma sets down his pen. The Quiet is not a thing that came to Aurel, he says. It is what the city has been carrying. # id:d5m_007 # speaker:Toma
* [Ask Wren who rang it.] # flag:wren_truth # bond:wren:1
    -> who
* [Ask Toma what he remembers.] # flag:toma_truth # bond:toma:1
    -> remember
* [Keep the discovery between the four of you.] # flag:kept_quiet
    -> quiet

=== who ===
# bg:wren_house
The first Bellkeeper, Wren says. My mother. She rang it to save someone she loved. # id:d5m_008 # speaker:Wren
The Bell listened. It has been listening ever since. # id:d5m_009 # speaker:Wren
Toma writes this down. His hand is shaking. # id:d5m_010 # speaker:Narration
-> END

=== remember ===
# bg:wren_house
Everything, Toma says. That is the problem. Every loop, all at once. # id:d5m_011 # speaker:Toma
He turns the page. It is your handwriting. You do not remember writing it. # id:d5m_012 # speaker:Narration
The first crack was a door, he says. Someone opened it and could not close it. # id:d5m_013 # speaker:Toma
-> END

=== quiet ===
# bg:wren_house
You close the curtains. The four of you sit in the small dark and breathe. # id:d5m_014 # speaker:Narration
No one says it, but you all understand: the Quiet already knows. # id:d5m_015 # speaker:Narration
-> END

=== day_05_afternoon ===
# bg:wren_house
The knock comes at noon. It is not a knock. It is a bell, struck once, exactly the way you strike it. # id:d5a_001 # speaker:Narration
The door opens. The Hollow Bellkeeper steps in wearing your face. # id:d5a_002 # speaker:Narration
It holds an iron rod. It moves like a memory of you. # id:d5a_003 # speaker:Narration
Toma grabs the papers. Wren does not move. # id:d5a_004 # speaker:Narration
It is not here for them, Mara says. It is here for you. # id:d5a_005 # speaker:Mara
* [Fight it inside the house.] # flag:house_fight # bond:toma:1
    -> inside
* [Draw it out into the garden.] # flag:garden_fight # bond:wren:1
    -> garden

=== inside ===
# bg:wren_house
You plant your feet. The Hollow Bellkeeper mirrors you, perfectly, a half-beat late. # id:d5a_006 # speaker:Narration
Toma pulls the papers into his arms. Wren stands between him and the door. # id:d5a_007 # speaker:Narration
Break the mirror, Iven says. I will keep the walls standing. # id:d5a_008 # speaker:Iven
-> END

=== garden ===
# bg:wren_house
You go through the back door. The Hollow Bellkeeper follows, exactly as you knew it would. # id:d5a_009 # speaker:Narration
The garden is full of names. The thing wearing your face does not look at them. # id:d5a_010 # speaker:Narration
Wren locks the house behind you. Smart girl. # id:d5a_011 # speaker:Wren
-> END

=== day_05_night ===
# bg:quiet
The Hollow Bellkeeper falls. Its face comes apart into a hundred sheets of paper. # id:d5n_001 # speaker:Narration
Each sheet has the same name on it. Yours. # id:d5n_002 # speaker:Narration
Toma is crying. Wren is not. Mara is holding her hammer like she forgot she put it down. # id:d5n_003 # speaker:Narration
The first Bellkeeper is still alive, Wren says. She is the Quiet. She has been ringing the Bell from the other side. # id:d5n_004 # speaker:Wren
The crack widens. The room goes very still. # id:d5n_005 # speaker:Narration
* [Tell Mara and Iven everything.] # flag:shared_truth # bond:mara:1
    -> share
* [Carry it alone.] # flag:alone_truth
    -> alone
* [Ask Wren what she wants to do.] # flag:wren_choice # bond:wren:1
    -> choice

=== share ===
# bg:quiet
You tell them. All of it, from the first bell to the ninth. # id:d5n_006 # speaker:Narration
Mara listens without interrupting. Iven writes nothing down. # id:d5n_007 # speaker:Narration
Then we end it, Mara says. Together. # id:d5n_008 # speaker:Mara
-> END

=== alone ===
# bg:quiet
You keep the last piece to yourself. It sits behind your teeth like a second tongue. # id:d5n_009 # speaker:Narration
Iven watches you. He does not ask. That is worse. # id:d5n_010 # speaker:Narration
-> END

=== choice ===
# bg:quiet
Wren looks at the papers, then at you. I want to meet her, she says. Before we decide. # id:d5n_011 # speaker:Wren
Toma closes his eyes. Mara closes her hand around the hammer. # id:d5n_012 # speaker:Narration
-> END
