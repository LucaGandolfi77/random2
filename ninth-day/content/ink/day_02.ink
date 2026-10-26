// NINTH DAY — Day 2: The Debt
// The Watch closes Ember Row. Elias is still missing. A Hound has the scent.

-> day_02_morning

=== day_02_morning ===
# bg:ember_row
Dawn comes grey through the ash. The Watch checkpoint at the end of Ember Row is closed. # id:d2m_001 # speaker:Narration
Two guards stand behind the barrier. Neither of them looks at you. # id:d2m_002 # speaker:Narration
They have been looking at the same spot on the wall for an hour, Iven says. That is not discipline. That is fear. # id:d2m_003 # speaker:Narration
You should not be here, Bellkeeper. # id:d2m_004 # speaker:Watch Guard
I have a ledger with every debt in this district, and a reason to collect. # id:d2m_005 # speaker:Cael
The guard glances at the paper. His hand does not move toward his weapon. # id:d2m_006 # speaker:Narration
Somewhere beyond the gate, something metal scratches stone. # id:d2m_007 # speaker:Narration
That is not a dog, Iven says. # id:d2m_008 # speaker:Narration
The barrier lifts six inches. Enough to crawl through. Enough to regret. # id:d2m_009 # speaker:Narration
* [Show the ledger and walk through.] # flag:watch_bluff # bond:iven:1
    -> bluff
* [Slip through the ash gate while they argue.] # flag:ash_gate
    -> gate

=== bluff ===
# bg:checkpoint
The guard reads a name. Then another. His jaw tightens. # id:d2m_010 # speaker:Narration
Elias Voss, Iven says. You know the name. You wrote it down yourself. # id:d2m_011 # speaker:Narration
The barrier rises. No one salutes. # id:d2m_012 # speaker:Narration
That was either very brave or very stupid, Iven says. # id:d2m_013 # speaker:Iven
Ask me after the Hound. # id:d2m_014 # speaker:Cael
-> END

=== gate ===
# bg:checkpoint
You wait until the guards turn toward the sound. Then you are under the barrier and through. # id:d2m_015 # speaker:Narration
Iven follows a heartbeat later, cursing under his breath. # id:d2m_016 # speaker:Narration
You are going to get us both killed, he says. # id:d2m_017 # speaker:Iven
Probably. # id:d2m_018 # speaker:Cael
-> END

=== day_02_afternoon ===
# bg:foundry
The Hound finds you between the furnace and the wall. There is no room left to run. # id:d2a_001 # speaker:Narration
It is all angles and old iron, a Watch dog built to keep a gate that no longer exists. # id:d2a_002 # speaker:Narration
Its eyes are the color of a bell held too close to a flame. # id:d2a_003 # speaker:Narration
Elias is behind it. Alive. Bleeding. Trying to say something through the smoke. # id:d2a_004 # speaker:Narration
The Hound does not growl. It lowers its head. # id:d2a_005 # speaker:Narration
Iven draws. Mara plants her feet. The Bell in your chest rings once, quietly, waiting. # id:d2a_006 # speaker:Narration
* [Stand your ground.] # flag:hound_stand
    -> stand
* [Lure it toward the furnace.] # flag:hound_furnace # bond:iven:1
    -> furnace

=== stand ===
# bg:foundry
Good, Mara says. The Hound is faster than us. So we make it come to the wall. # id:d2a_007 # speaker:Mara
You put your back to the iron and wait. # id:d2a_008 # speaker:Narration
It comes. # id:d2a_009 # speaker:Narration
-> END

=== furnace ===
# bg:foundry
Iven sees the furnace door before you do. He puts a bolt through the hinge. # id:d2a_010 # speaker:Narration
The Hound turns toward the sound. The door opens. The heat comes out like a hand. # id:d2a_011 # speaker:Narration
Now, Iven says. # id:d2a_012 # speaker:Iven
-> END

=== day_02_night ===
# bg:spire_night
Elias is alive. The Watch will want him back before dawn. # id:d2n_001 # speaker:Narration
He sits on the edge of the Spire stair with the ledger open on his knees. # id:d2n_002 # speaker:Narration
Every debt in Ember Row, he says. And one I cannot pay. # id:d2n_003 # speaker:Elias
You do not ask which one. You already know. # id:d2n_004 # speaker:Narration
The Bell hangs above you. The crack has widened by a hair. # id:d2n_005 # speaker:Narration
What you keep now will survive the reset. What you owe may not. # id:d2n_006 # speaker:Narration
* [Let Elias keep his ledger.] # flag:elias_free # bond:elias:1
    -> keep
* [Give the ledger to Iven.] # flag:ledger_iven # bond:iven:1
    -> give
* [Burn the ledger.] # flag:ledger_burned
    -> burn

=== keep ===
# bg:spire_night
Elias closes the book. Some debts are only numbers, he says. Some are people. # id:d2n_007 # speaker:Elias
You let him keep both. # id:d2n_008 # speaker:Narration
-> END

=== give ===
# bg:spire_night
Iven takes the ledger like it might bite him. He does not open it. # id:d2n_009 # speaker:Narration
I will hold it, he says. Not spend it. # id:d2n_010 # speaker:Iven
-> END

=== burn ===
# bg:spire_night
The pages curl. The names go up in smoke. Elias watches without a word. # id:d2n_011 # speaker:Narration
No one owes anyone now, you say. # id:d2n_012 # speaker:Cael
Elias looks at the empty cover for a long time. # id:d2n_013 # speaker:Narration
-> END
