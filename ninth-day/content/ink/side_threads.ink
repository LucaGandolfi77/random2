// NINTH DAY — Optional threads
// Six quiet scenes between the main phases. Each closes a bond and grants a memory.

-> side_mara

=== side_mara ===
# bg:ember_row
The ovens in Ember Row have gone cold twice today. Mara has lit them three times. # id:sm_001 # speaker:Narration
You came back, she says. Good. Hold this. # id:sm_002 # speaker:Mara
She puts a bowl of dough in your hands. It is heavier than it looks. # id:sm_003 # speaker:Narration
The first batch always burns. That is not a failure. That is how you know the oven is awake. # id:sm_004 # speaker:Mara
* [Burn it on purpose.] # flag:side_mara_burn # bond:mara:1
    -> mara_burn
* [Try to save it.] # flag:side_mara_save # bond:mara:1
    -> mara_save

=== mara_burn ===
# bg:ember_row
You hold the loaf over the flame until the crust goes black. Mara watches without stopping you. # id:sm_005 # speaker:Narration
There, she says. Now the second one is ours. # id:sm_006 # speaker:Mara
The second loaf comes out whole. She tears it in half and gives you the larger piece. # id:sm_007 # speaker:Narration
-> END

=== mara_save ===
# bg:ember_row
You pull the loaf early. It is pale in the middle, but it holds. # id:sm_008 # speaker:Narration
Mara laughs. You cannot save everything, she says. But you can save this. # id:sm_009 # speaker:Mara
You eat it standing up, while the ovens cool. # id:sm_010 # speaker:Narration
-> END

=== side_iven ===
# bg:checkpoint
Iven keeps the Watch ledger in a tin under the checkpoint stair. He has never shown it to anyone. # id:si_001 # speaker:Narration
These are not orders, he says. These are the people I let go. # id:si_002 # speaker:Iven
There are more names than pages. Some are crossed out. Some are not. # id:si_003 # speaker:Narration
The Choir knows this ledger. It has been singing from it. # id:si_004 # speaker:Iven
* [Read the names aloud.] # flag:side_iven_read # bond:iven:1
    -> iven_read
* [Tell him to burn it.] # flag:side_iven_burn # bond:iven:1
    -> iven_burn

=== iven_read ===
# bg:checkpoint
You read until your voice gives out. Iven stands at the window and does not turn around. # id:si_005 # speaker:Narration
When you stop, the Choir answers from below. It knows every name now. # id:si_006 # speaker:Narration
Good, Iven says. Let it carry them for a while. # id:si_007 # speaker:Iven
-> END

=== iven_burn ===
# bg:checkpoint
He holds the tin over the stove. The names curl and go white. # id:si_008 # speaker:Narration
The Choir screams. It has lost its hymn. # id:si_009 # speaker:Narration
Iven watches it burn. Then he opens the door. # id:si_010 # speaker:Narration
-> END

=== side_wren ===
# bg:roof
Wren is on the Spire roof with a slate and a piece of chalk. She is counting. # id:sw_001 # speaker:Narration
Not bells, she says. Windows. Lit ones. # id:sw_002 # speaker:Wren
Below, Aurel is going dark one street at a time. She counts anyway. # id:sw_003 # speaker:Narration
Four hundred and six, she says. Yesterday it was four hundred and four. # id:sw_004 # speaker:Wren
* [Count with her.] # flag:side_wren_count # bond:wren:1
    -> wren_count
* [Ask what happens when the number reaches zero.] # flag:side_wren_zero # bond:wren:1
    -> wren_zero

=== wren_count ===
# bg:roof
You count until your eyes ache. The number is not the point. The counting is. # id:sw_005 # speaker:Narration
When you finish, she writes the total on her palm and closes her hand around it. # id:sw_006 # speaker:Narration
Four hundred and nine, she says. We are winning. # id:sw_007 # speaker:Wren
-> END

=== wren_zero ===
# bg:roof
Then we start counting the people, she says. They are harder to see. They are worth more. # id:sw_008 # speaker:Wren
She puts the chalk in your hand. The slate is warm from her holding it. # id:sw_009 # speaker:Narration
-> END

=== side_oria ===
# bg:garden
The memory garden is in bloom. Oria says that is not a good sign. # id:so_001 # speaker:Narration
Roses bloom when they are trying to be remembered, she says. # id:so_002 # speaker:Oria
She walks the rows with a knife, cutting only the flowers that have already begun to fade. # id:so_003 # speaker:Narration
* [Ask her to cut a living one.] # flag:side_oria_living # bond:oria:1
    -> oria_living
* [Help her with the fading ones.] # flag:side_oria_fading # bond:oria:1
    -> oria_fading

=== oria_living ===
# bg:garden
She hesitates. Then she cuts the fullest rose in the garden and gives it to you. # id:so_004 # speaker:Narration
It will not last, she says. That is why it is yours. # id:so_005 # speaker:Oria
You carry it out of the garden. It does not wilt. # id:so_006 # speaker:Narration
-> END

=== oria_fading ===
# bg:garden
You work until the basket is full. Oria does not speak, and neither do you. # id:so_007 # speaker:Narration
At the gate she touches your sleeve. Remember me as I am, she says. Not as what I keep. # id:so_008 # speaker:Oria
The garden closes behind you, quieter than before. # id:so_009 # speaker:Narration
-> END

=== side_toma ===
# bg:wren_house
Toma has filled the last page of the ledger. He is staring at the inside cover as if it owes him something. # id:st_001 # speaker:Narration
I do not know how to write tomorrow, he says. # id:st_002 # speaker:Toma
The house is quiet. Wren is upstairs. Somewhere below, the city is deciding what to forget. # id:st_003 # speaker:Narration
* [Tell him to write nothing.] # flag:side_toma_blank # bond:toma:1
    -> toma_blank
* [Tell him to write what he wants to happen.] # flag:side_toma_want # bond:toma:1
    -> toma_want

=== toma_blank ===
# bg:wren_house
He draws a line under the last entry and closes the book. # id:st_004 # speaker:Narration
A blank page is still a page, he says. Tomorrow can be whatever we put there. # id:st_005 # speaker:Toma
For the first time in nine days, he looks younger than you. # id:st_006 # speaker:Narration
-> END

=== toma_want ===
# bg:wren_house
He writes one line. Then another. He does not let you read them. # id:st_007 # speaker:Narration
It is not a prophecy, he says. It is a request. # id:st_008 # speaker:Toma
He closes the book and presses it flat with both hands. # id:st_009 # speaker:Narration
-> END

=== side_vey ===
# bg:sanctuary
Vey's sanctuary is empty. The inner door is open, and the dark beyond it is breathing. # id:sv_001 # speaker:Narration
She left this for you, Vey says. A remnant. A last argument. # id:sv_002 # speaker:Vey
Sera Vane steps out of the dark with a pike and no rank left to give orders with. # id:sv_003 # speaker:Narration
* [Meet her alone.] # flag:side_vey_alone # bond:vey:1
    -> vey_alone
* [Ask Vey to stand with you.] # flag:side_vey_together # bond:vey:1
    -> vey_together

=== vey_alone ===
# bg:sanctuary
You step forward. Sera does not salute. She does not need to. # id:sv_004 # speaker:Narration
One last order, she says. Survive it. # id:sv_005 # speaker:Sera
The door closes behind you. The pike comes up. # id:sv_006 # speaker:Narration
-> END

=== vey_together ===
# bg:sanctuary
Vey takes her place at your shoulder. Sera's face does something complicated. # id:sv_007 # speaker:Narration
You brought the keeper, she says. Good. Now it is a fair fight. # id:sv_008 # speaker:Sera
The dark behind the door begins to move. # id:sv_009 # speaker:Narration
-> END

=== side_ledger ===
# bg:ember_row
Elias keeps the ledger open on the bakery table. Iven sits across from him with a pen he does not use. # id:sl_001 # speaker:Narration
Every debt in Ember Row is in this book, Elias says. Including the ones the Watch invented. # id:sl_002 # speaker:Elias
Iven turns a page. His name is there. So is yours. # id:sl_003 # speaker:Narration
* [Read the last page.] # flag:ledger_last_page # bond:iven:1
    -> ledger_last
* [Tell Elias to write a new page.] # flag:ledger_new_page # bond:iven:1
    -> ledger_new

=== ledger_last ===
# bg:ember_row
The last page is blank except for one line: *Paid in full, by the living.* # id:sl_004 # speaker:Narration
Iven reads it twice. Then he signs beneath it without asking what it costs. # id:sl_005 # speaker:Narration
Elias closes the book. Some debts are only numbers, he says. Some are people. # id:sl_006 # speaker:Elias
-> END

=== ledger_new ===
# bg:ember_row
Elias turns to a clean page and writes the date. Iven puts the pen down. # id:sl_007 # speaker:Narration
No more ledgers, Iven says. We remember what we owe. # id:sl_008 # speaker:Iven
Elias looks at the empty page for a long time. Then he writes a single name: *Aurel.* # id:sl_009 # speaker:Narration
-> END

=== side_ninth_name ===
# bg:garden
Wren is standing where the roses are oldest. Oria has not cut a single one. # id:sn_001 # speaker:Narration
There were nine Bellkeepers before me, Wren says. Eight are in the garden. The ninth is still walking. # id:sn_002 # speaker:Wren
She means Orra. The name is a root under the city. # id:sn_003 # speaker:Narration
* [Say Orra's name aloud.] # flag:ninth_name_spoken # bond:wren:1
    -> ninth_spoken
* [Leave the name unspoken.] # flag:ninth_name_kept # bond:oria:1
    -> ninth_kept

=== ninth_spoken ===
# bg:garden
Orra Vane, you say. The garden goes still. Every rose turns toward the Spire at once. # id:sn_004 # speaker:Narration
Wren exhales. Good, she says. Now she knows we remember. # id:sn_005 # speaker:Wren
Somewhere above, the Bell gives a sound like a held breath. # id:sn_006 # speaker:Narration
-> END

=== ninth_kept ===
# bg:garden
You keep the name behind your teeth. Oria watches you do it and nods once. # id:sn_007 # speaker:Narration
A name is a door, she says. Do not open it until you are ready to go through. # id:sn_008 # speaker:Oria
The roses stay closed. The garden keeps its ninth root. # id:sn_009 # speaker:Narration
-> END

=== side_remnant ===
# bg:checkpoint
The checkpoint is empty. Sera stands in the middle of it with her pike across her knees. # id:sv2_001 # speaker:Narration
The Watch did not all agree with the coup, she says. Some of them are still following the last order. # id:sv2_002 # speaker:Sera
A remnant forms at the gate: iron, old rank, and a hymn the Choir left behind. # id:sv2_003 # speaker:Narration
* [Stand with Sera.] # flag:remnant_sera # bond:sera:1
    -> remnant_sera
* [Stand with the Watch.] # flag:remnant_watch # bond:iven:1
    -> remnant_watch

=== remnant_sera ===
# bg:checkpoint
You take the left side. Sera takes the right. The remnant does not salute. # id:sv2_004 # speaker:Narration
Last order, Sera says. Survive it. # id:sv2_005 # speaker:Sera
The gate closes behind you. # id:sv2_006 # speaker:Narration
-> END

=== remnant_watch ===
# bg:checkpoint
You raise the Watch's old sign. The remnant hesitates, and that is enough. # id:sv2_007 # speaker:Narration
It still remembers what it was, Iven says. Make it remember the rest. # id:sv2_008 # speaker:Iven
The gate closes behind you. # id:sv2_009 # speaker:Narration
-> END
