// NINTH DAY — Day 8: The Spire
// The stair to the Bell. Choose what the city carries into the ninth day.

VAR carried_ember = false
VAR carried_orra = false
VAR carried_watch = false

-> day_08_morning

=== day_08_morning ===
# bg:spire_ascent
The Spire stair has more steps than the city has names. You climb anyway. # id:d8m_001 # speaker:Narration
Below you, Aurel is a map of small fires. Above you, the Bell is a dark mouth. # id:d8m_002 # speaker:Narration
The crack is wider now. You can see it from the inside. # id:d8m_003 # speaker:Narration
One district's memory can be carried up, Vey said. The rest will be waiting on the other side of the ninth day. # id:d8m_004 # speaker:Narration
Mara stops on the landing. She does not look at you. # id:d8m_005 # speaker:Narration
Choose, she says. Whatever we carry, we carry together. # id:d8m_006 # speaker:Mara
* [Carry Ember Row.] # flag:carried_ember # bond:mara:1
    ~ carried_ember = true
    -> ember
* [Carry Saint Orra.] # flag:carried_orra # bond:oria:1
    ~ carried_orra = true
    -> orra
* [Carry the Watch.] # flag:carried_watch # bond:sera:1
    ~ carried_watch = true
    -> watch

=== ember ===
# bg:spire_ascent
You carry the market at dawn. The bread, the soot, the argument two streets over that never gets resolved. # id:d8m_007 # speaker:Narration
Mara exhales. Good choice, she says. It is the only one I know how to cook. # id:d8m_008 # speaker:Mara
-> END

=== orra ===
# bg:spire_ascent
You carry the memory gardens. Every name on every tag, every rose that remembers having a scent. # id:d8m_009 # speaker:Narration
Oria will be glad, Wren says. Then she adds, quieter: I will be too. # id:d8m_010 # speaker:Wren
-> END

=== watch ===
# bg:spire_ascent
You carry the Watch. The gate, the ledger, the stubborn belief that a line can be held. # id:d8m_011 # speaker:Narration
Sera is not here. You carry her anyway. # id:d8m_012 # speaker:Narration
-> END

=== day_08_afternoon ===
# bg:clockwork
At the top of the stair, the Unbound Saint is waiting. It has taken the Bell's shape. # id:d8a_001 # speaker:Narration
Its clockwork skin hangs open. Inside, the crack is ringing. # id:d8a_002 # speaker:Narration
It was built to guard the ninth day, Wren says. It does not know how to stop. # id:d8a_003 # speaker:Wren
Then we teach it, Mara says. # id:d8a_004 # speaker:Mara
* [Strike the heart together.] # flag:strike_unbound # bond:mara:1
    -> strike
* [Hold the stair and let it come.] # flag:hold_stair # bond:iven:1
    -> hold
* [Let Wren read the pattern.] # flag:wren_pattern # bond:wren:1
    -> pattern

=== strike ===
# bg:clockwork
You step in beside Mara. The Saint's shadow falls over both of you. # id:d8a_005 # speaker:Narration
On my count, she says. # id:d8a_006 # speaker:Mara
You do not need a count. You have done this eight times. # id:d8a_007 # speaker:Narration
-> END

=== hold ===
# bg:clockwork
Iven plants a bolt in the stair and braces. You hold the high ground. # id:d8a_008 # speaker:Narration
Let it climb, he says. I will make the climbing expensive. # id:d8a_009 # speaker:Iven
-> END

=== pattern ===
# bg:clockwork
Wren watches the gears for nine heartbeats. Then she points. There, she says. It turns backward before it strikes. # id:d8a_010 # speaker:Wren
You have nine heartbeats. Use them. # id:d8a_011 # speaker:Narration
-> END

=== day_08_night ===
# bg:spire_night
The Bell chamber is open. The crack runs from the crown to the lip. # id:d8n_001 # speaker:Narration
Mara stands on your left. Iven on your right. Wren is already counting under her breath. # id:d8n_002 # speaker:Narration
Nine days, she says. Nine choices. This is the last one that gets to be small. # id:d8n_003 # speaker:Wren
The Bell waits. It has waited for you before. # id:d8n_004 # speaker:Narration
* [Decide to ring the Bell.] # flag:ending_ring # bond:oria:1
    -> ring
* [Decide to break the Bell.] # flag:ending_break # bond:mara:1
    -> break
* [Decide to become the Bell.] # flag:ending_become # bond:wren:1
    -> become

=== ring ===
# bg:spire_night
You put your hand on the crown. The metal is warm. It has been waiting to be touched. # id:d8n_005 # speaker:Narration
Tomorrow, you tell them, we ring it together. # id:d8n_006 # speaker:Cael
Mara nods. Wren writes it down. Iven does not argue. # id:d8n_007 # speaker:Narration
-> END

=== break ===
# bg:spire_night
You put your hand on the crack. It fits the shape of your palm. # id:d8n_008 # speaker:Narration
If we break it, Mara says, the city moves forward. Some of us will not remember the way back. # id:d8n_009 # speaker:Mara
Then we leave a map. # id:d8n_010 # speaker:Cael
-> END

=== become ===
# bg:spire_night
You put your hand inside the Bell. The dark is not empty. It is full of every version of the city. # id:d8n_011 # speaker:Narration
Wren stops counting. Whatever you are about to do, she says, do it as yourself. # id:d8n_012 # speaker:Wren
The Bell rings once, though no one has struck it. # id:d8n_013 # speaker:Narration
-> END
