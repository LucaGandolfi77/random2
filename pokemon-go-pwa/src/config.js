import { DEX_DATA } from './dex-data.js';

/* Palette per tipo: colori del fallback procedurale quando lo sprite
   non è disponibile (prima visita offline). */
const PAL = {
  normal:   ['#c8c0a8', '#a8a078', '#e0d8c0', '#706850'],
  fire:     ['#f08050', '#e06838', '#f8b088', '#a03810'],
  water:    ['#5890e8', '#3868c8', '#98b8f8', '#183878'],
  electric: ['#f0d048', '#d8b020', '#f8e888', '#a08010'],
  grass:    ['#70c860', '#48a038', '#a8e090', '#287018'],
  ice:      ['#a8e0e0', '#78c8c8', '#d0f0f0', '#4890a0'],
  fighting: ['#d07058', '#b84028', '#e8a890', '#782018'],
  poison:   ['#a868c0', '#8040a0', '#c898e0', '#581878'],
  ground:   ['#e0c078', '#c8a048', '#f0dca8', '#886828'],
  flying:   ['#a8b0e8', '#7880c0', '#c8d0f8', '#485088'],
  psychic:  ['#f07898', '#d04868', '#f8b0c0', '#901840'],
  bug:      ['#b8c050', '#909828', '#d8e080', '#586008'],
  rock:     ['#c0b088', '#988058', '#e0d8b0', '#605028'],
  ghost:    ['#8068a8', '#584880', '#a898c8', '#302858'],
  dragon:   ['#8058e8', '#5830c0', '#b098f8', '#301880'],
  fairy:    ['#f0a8c0', '#e078a0', '#f8d0e0', '#a83868'],
  steel:    ['#b0b8d0', '#8890b0', '#d0d8e8', '#586080'],
};

const CONFIG = {
  language: 'en',
  version: '3.0',
  types: {
    normal:   { en: 'Normal',   it: 'Normale',   color: '#A8A878' },
    fire:     { en: 'Fire',     it: 'Fuoco',     color: '#F08030' },
    water:    { en: 'Water',    it: 'Acqua',     color: '#6890F0' },
    electric: { en: 'Electric', it: 'Elettro',   color: '#F8D030' },
    grass:    { en: 'Grass',    it: 'Erba',      color: '#78C850' },
    ice:      { en: 'Ice',      it: 'Ghiaccio',  color: '#98D8D8' },
    fighting: { en: 'Fighting', it: 'Lotta',     color: '#C03028' },
    poison:   { en: 'Poison',   it: 'Veleno',    color: '#A040A0' },
    ground:   { en: 'Ground',   it: 'Terra',     color: '#E0C068' },
    flying:   { en: 'Flying',   it: 'Volante',   color: '#A890F0' },
    psychic:  { en: 'Psychic',  it: 'Psico',     color: '#F85888' },
    bug:      { en: 'Bug',      it: 'Coleottero',color: '#A8B820' },
    rock:     { en: 'Rock',     it: 'Roccia',    color: '#B8A038' },
    ghost:    { en: 'Ghost',    it: 'Spettro',   color: '#705898' },
    dragon:   { en: 'Dragon',   it: 'Drago',     color: '#7038F8' },
    dark:     { en: 'Dark',     it: 'Buio',      color: '#705848' },
    steel:    { en: 'Steel',    it: 'Acciaio',   color: '#B8B8D0' },
    fairy:    { en: 'Fairy',    it: 'Folletto',  color: '#EE99AC' },
  },

  pokeballs: {
    poke:  { en: 'Poké Ball',  it: 'Poké Ball',  multiplier: 1.0,  color: '#ef5350', accent: '#ffffff' },
    great: { en: 'Great Ball', it: 'Mega Ball',  multiplier: 1.5,  color: '#42a5f5', accent: '#ffffff' },
    ultra: { en: 'Ultra Ball', it: 'Ultra Ball', multiplier: 2.0,  color: '#ffca28', accent: '#212121' },
    master:{ en: 'Master Ball',it: 'Master Ball',multiplier: 255,  color: '#ab47bc', accent: '#ffffff' },
  },

  berries: {
    razz:  { en: 'Razz Berry',  it: 'Bacca Melon',  effect: 'ease',   color: '#e91e63', desc: { en: 'Makes Pokémon easier to catch', it: 'Rende il Pokémon più facile da catturare' } },
    nanab: { en: 'Nanab Berry', it: 'Bacca Banana', effect: 'steady', color: '#ff9800', desc: { en: 'Calms Pokémon, reduces movement', it: 'Calma il Pokémon, riduce i movimenti' } },
    pinap: { en: 'Pinap Berry', it: 'Bacca Ananas', effect: 'candy',  color: '#ffeb3b', desc: { en: 'Doubles candy on catch', it: 'Raddoppia le caramelle alla cattura' } },
    golden:{ en: 'Golden Razz', it: 'Bacca Gmela',  effect: 'great',  color: '#ffd700', desc: { en: 'Greatly increases catch rate', it: 'Aumenta enormemente la probabilità' } },
  },

  /* palette per tipo: fallback procedurale quando manca lo sprite */
  PALETTE: PAL,

  biomes: {
    grass:   { en: 'Tall Grass',    it: 'Erba Alta',     color: '#1b4d1b', pokemon: ['bulbasaur','caterpie','weedle','pidgey','rattata','oddish','paras','bellsprout','eevee:0.8','snorlax:0.4','mew:0.08'] },
    forest:  { en: 'Deep Forest',   it: 'Foresta',       color: '#0f2e0f', pokemon: ['caterpie','weedle','pidgey','oddish','paras','venonat','bellsprout','pikachu:0.7','gastly:0.8','tangela:0.5','mew:0.1'] },
    cave:    { en: 'Mystic Cave',   it: 'Grotta',        color: '#1a1225', pokemon: ['zubat','geodude','diglett','sandshrew','abra','onix:0.9','cubone:0.8','rhyhorn:0.7','omanyte:0.4','kabuto:0.4','aerodactyl:0.2'] },
    beach:   { en: 'Sandy Beach',   it: 'Spiaggia',      color: '#1a2a3a', pokemon: ['squirtle','magikarp','psyduck','poliwag','slowpoke','krabby:1.5','shellder:1.2','staryu:1.0','seel:0.8'] },
    city:    { en: 'Urban City',    it: 'Città',         color: '#1e1e2e', pokemon: ['pidgey','rattata','meowth','magnemite','abra','jigglypuff:0.9','voltorb:1.0','grimer:0.9','electabuzz:0.4','mrmime:0.3','jynx:0.3','ditto:0.5'] },
    mountain:{ en: 'Rocky Mountain',it: 'Montagna',      color: '#2a1e10', pokemon: ['geodude','diglett','machop','sandshrew','ponyta','onix:0.8','rhyhorn:0.9','cubone:0.6','tauros:0.8','dragonair:0.3','dragonite:0.12'] },
    volcano: { en: 'Volcano',       it: 'Vulcano',       color: '#2e1010', pokemon: ['charmander','vulpix','growlithe','ponyta','koffing:0.9','magmar:0.5','moltres:0.12'] },
    psychic: { en: 'Psychic Ruins', it: 'Rovine Psico',  color: '#2e1038', pokemon: ['abra','slowpoke','jigglypuff','clefairy','drowzee:1.2','exeggcute:0.9','mrmime:0.4','hypno:0.3','mewtwo:0.15'] },
    lago:    { en: 'Lakeside',      it: 'Lago',          color: '#12314a', pokemon: ['squirtle','poliwag','magikarp','psyduck','horsea:1.4','goldeen:1.4','seel:0.7','lapras:0.35','omanyte:0.3','tentacool:0.6'] },
    cielo:   { en: 'Open Sky',      it: 'Cielo Aperto',  color: '#1a2440', pokemon: ['pidgey','spearow:1.6','zubat:1.2','doduo:1.4','farfetchd:0.5','scyther:0.5','articuno:0.12','zapdos:0.12','dragonite:0.1','aerodactyl:0.15'] },
  },

  levels: [
    0,1000,3000,6000,10000,15000,21000,28000,36000,45000,
    55000,65000,75000,85000,100000,115000,130000,150000,175000,200000,
    250000,300000,350000,400000,500000,600000,700000,800000,900000,1000000,
  ],

  getLevel(xp) {
    let lvl = 1;
    for (let i = 0; i < this.levels.length; i++) {
      if (xp >= this.levels[i]) lvl = i + 1;
      else break;
    }
    return Math.min(lvl, 40);
  },

  shinyChance: 1 / 4096,

  /* ---- costruttore compatto di specie ----
     Le creature si appoggiano agli sprite reali (PokeAPI/sprites) tramite il
     numero di Pokédex nazionale `dex`; archetype+palette servono solo come
     disegno procedurale di riserva offline. weight 0 = non appare in natura
     (si ottiene solo per evoluzione). */
  pokedex: [
    /* ---- linee iniziali ---- */
    [1,'bulbasaur','Bulbasaur','Bulbasaur',['grass','poison'],3,15,'quadruped','A strange seed was planted on its back at birth.','Un seme strano gli è stato piantato sulla schiena alla nascita.',25,'ivysaur',{primary:'#5dae63',secondary:'#4a8f4f',accent:'#7bc67f',detail:'#8fd694'}],
    [2,'ivysaur','Ivysaur','Ivysaur',['grass','poison'],5,0,'quadruped','The bud on its back grows by absorbing nutrients.','Il bocciolo sulla schiena cresce assorbendo nutrienti.',100,'venusaur'],
    [3,'venusaur','Venusaur','Venusaur',['grass','poison'],7,0,'quadruped','Its flower releases a soothing scent after rain.','Il suo fiore rilascia un profumo lenitivo dopo la pioggia.',0,null],
    [4,'charmander','Charmander','Charmander',['fire'],3,15,'biped','The flame on its tail indicates its life force.','La fiamma sulla coda indica la sua forza vitale.',25,'charmeleon',{primary:'#ff7043',secondary:'#ffab91',accent:'#d84315',detail:'#ffccbc'}],
    [5,'charmeleon','Charmeleon','Charmeleon',['fire'],5,0,'biped','It lashes about with its fiery tail when agitated.','Scuote la coda infuocata quando è agitato.',100,'charizard'],
    [6,'charizard','Charizard','Charizard',['fire','flying'],7,0,'biped','Its wings can carry it near 1,400 meters up.','Le sue ali lo portano fino a 1.400 metri di quota.',0,null],
    [7,'squirtle','Squirtle','Squirtle',['water'],3,15,'biped','Shoots water at prey while in the water.','Spara acqua alla preda mentre è in acqua.',25,'wartortle',{primary:'#4fc3f7',secondary:'#81d4fa',accent:'#8d6e63',detail:'#b3e5fc'}],
    [8,'wartortle','Wartortle','Wartortle',['water'],5,0,'biped','Its long furry tail is a symbol of longevity.','La lunga coda folta è simbolo di longevità.',100,'blastoise'],
    [9,'blastoise','Blastoise','Blastoise',['water'],7,0,'biped','The water cannons on its shell are very precise.','I cannoni d\'acqua sul guscio sono precissimi.',0,null],

    /* ---- c,e,b & w,p ---- */
    [10,'caterpie','Caterpie','Caterpie',['bug'],1,5,'serpent','Its short feet are tipped with suction pads.','I suoi corti piedi sono dotati di ventose.',12,'metapod',{primary:'#aed581',secondary:'#7cb342',accent:'#dcedc8',detail:'#33691e'}],
    [11,'metapod','Metapod','Metapod',['bug'],3,0,'blob','It hardens into a shell while waiting to evolve.','Si indurisce in un guscio aspettando di evolversi.',50,'butterfree'],
    [12,'butterfree','Butterfree','Butterfree',['bug','flying'],5,0,'bird','It collects honey with its sensitive feet.','Raccoglie miele con i piedi sensitivi.',0,null],
    [13,'weedle','Weedle','Weedle',['bug','poison'],1,5,'serpent','The barb on its head oozes a strong poison.','L\'aculeo sulla testa cola veleno potente.',12,'kakuna'],
    [14,'kakuna','Kakuna','Kakuna',['bug','poison'],3,0,'blob','It stays nearly motionless while it metamorphoses.','Resta quasi immobile durante la metamorfosi.',50,'beedrill'],
    [15,'beedrill','Beedrill','Beedrill',['bug','poison'],5,0,'insect','It attacks in swarms with poison stingers.','Attacca in sciami con aculei velenosi.',0,null],

    /* ---- uccelli ---- */
    [16,'pidgey','Pidgey','Pidgey',['normal','flying'],1,5,'bird','A common sight in forests and woods.','Comune nelle foreste e nei boschi.',12,'pidgeotto',{primary:'#bcaaa4',secondary:'#8d6e63',accent:'#d7ccc8',detail:'#5d4037'}],
    [17,'pidgeotto','Pidgeotto','Pidgeotto',['normal','flying'],3,0,'bird','It fiercely guards a very large territory.','Difende ferocemente un territorio vastissimo.',50,'pidgeot'],
    [18,'pidgeot','Pidgeot','Pidgeot',['normal','flying'],5,0,'bird','It flies at Mach 2 in search of prey.','Vola a Mach 2 in cerca di prede.',0,null],
    [21,'spearow','Spearow','Spearow',['normal','flying'],1,5,'bird','It flaps its short wings busily to stay aloft.','Batte ali corte e frettolose per restare in volo.',50,'fearow'],
    [22,'fearow','Fearow','Fearow',['normal','flying'],3,0,'bird','It soars high, circling until it spots prey.','Vola in cerchio in alto finché non avvista una preda.',0,null],
    [84,'doduo','Doduo','Doduo',['normal','flying'],2,8,'bird','It races across plains at high speed.','Corre nelle pianure a grande velocità.',50,'dodrio'],
    [85,'dodrio','Dodrio','Dodrio',['normal','flying'],4,0,'bird','Its three heads take turns to watch for danger.','Le tre teste si alternano a fare la guardia.',0,null],
    [83,'farfetchd','Farfetch’d','Farfetch’d',['normal','flying'],4,10,'bird','It carries a leek stalk like a sword.','Porta uno stelo di porro come una spada.',0,null],

    /* ---- rodenti & serpenti ---- */
    [19,'rattata','Rattata','Rattata',['normal'],1,5,'quadruped','Will chew on anything with its fangs.','Morde qualsiasi cosa con i suoi incisivi.',25,'raticate',{primary:'#b39ddb',secondary:'#7e57c2',accent:'#ede7f6',detail:'#512da8'}],
    [20,'raticate','Raticate','Raticate',['normal'],3,0,'quadruped','Its fangs are long and very sharp.','I suoi incisivi sono lunghi e affilatissimi.',0,null],
    [23,'ekans','Ekans','Ekans',['poison'],2,6,'serpent','It coils up and ambushes from behind.','Si arriccia e tende agguati alle spalle.',50,'arbok'],
    [24,'arbok','Arbok','Arbok',['poison'],4,0,'serpent','The pattern on its belly frightens foes.','Il disegno sul ventre terrorizza i nemici.',0,null],

    /* ---- elettrici ---- */
    [25,'pikachu','Pikachu','Pikachu',['electric'],4,20,'biped','It keeps its tail raised to monitor its surroundings.','Tiene la coda sollevata per controllare i dintorni.',50,'raichu',{primary:'#fdd835',secondary:'#fbc02d',accent:'#212121',detail:'#fff9c4'}],
    [26,'raichu','Raichu','Raichu',['electric'],5,0,'biped','Its tail discharges electricity to the ground.','La sua coda scarica elettricità a terra.',0,null],
    [81,'magnemite','Magnemite','Magnemite',['electric','steel'],4,15,'blob','It is attracted by electromagnetic waves.','È attratto dalle onde elettromagnetiche.',50,'magneton',{primary:'#b0bec5',secondary:'#90a4ae',accent:'#cfd8dc',detail:'#455a64'}],
    [82,'magneton','Magneton','Magneton',['electric','steel'],6,0,'blob','Three Magnemite linked by a strong magnetism.','Tre Magnemite legati da un fortissimo magnetismo.',0,null],
    [100,'voltorb','Voltorb','Voltorb',['electric'],2,8,'blob','It explodes at the slightest provocation.','Esplode alla minima provocazione.',50,'electrode'],
    [101,'electrode','Electrode','Electrode',['electric'],5,0,'blob','It stores enormous electrical energy inside.','Immagazzina un\'enorme energia elettrica.',0,null],
    [125,'electabuzz','Electabuzz','Electabuzz',['electric'],6,8,'biped','It feeds on electricity from power plants.','Si nutre dell\'elettricità delle centrali.',0,null],

    /* ---- terra & roccia ---- */
    [27,'sandshrew','Sandshrew','Sandshrew',['ground'],3,12,'biped','It burrows and lives underneath the ground.','Scava e vive sottoterra.',50,'sandslash',{primary:'#d7ccc8',secondary:'#a1887f',accent:'#efebe9',detail:'#795548'}],
    [28,'sandslash','Sandslash','Sandslash',['ground'],5,0,'quadruped','It curls into a ball of sharp spines.','Si arrotola in una sfera di spine affilate.',0,null],
    [50,'diglett','Diglett','Diglett',['ground'],2,8,'blob','Lives about one yard underground.','Vive circa un metro sottoterra.',50,'dugtrio',{primary:'#a1887f',secondary:'#8d6e63',accent:'#d7ccc8',detail:'#5d4037'}],
    [51,'dugtrio','Dugtrio','Dugtrio',['ground'],4,0,'blob','Three Diglett triggering earthquakes as one.','Tre Diglett che insieme causano terremoti.',0,null],
    [74,'geodude','Geodude','Geodude',['rock','ground'],3,12,'blob','It flies along rolling paths as if levitating.','Vola lungo i sentieri rocciosi come se levitasse.',25,'graveler',{primary:'#bdbdbd',secondary:'#9e9e9e',accent:'#e0e0e0',detail:'#616161'}],
    [75,'graveler','Graveler','Graveler',['rock','ground'],5,0,'blob','It rolls down mountain paths crushing all.','Rotola lungo i sentieri di montagna schiacciando tutto.',100,'golem'],
    [76,'golem','Golem','Golem',['rock','ground'],7,0,'blob','Its boulder-like body can survive dynamite.','Il suo corpo roccioso resiste alla dinamite.',0,null],
    [95,'onix','Onix','Onix',['rock','ground'],6,10,'serpent','It burrows through the ground at 50 mph.','Scava nel terreno a 80 km/h.',0,null],
    [111,'rhyhorn','Rhyhorn','Rhyhorn',['ground','rock'],3,10,'quadruped','It charges in a straight line, forgetting why.','Carica in linea retta dimenticandone il motivo.',50,'rhydon'],
    [112,'rhydon','Rhydon','Rhydon',['ground','rock'],6,0,'quadruped','Its drill horn can crush solid rock.','Il corno trapano sfonda la roccia solida.',0,null],
    [104,'cubone','Cubone','Cubone',['ground'],3,10,'biped','It wears the skull of its deceased mother.','Indossa il teschio di sua madre defunta.',50,'marowak'],
    [105,'marowak','Marowak','Marowak',['ground'],5,0,'biped','It throws its bone club like a boomerang.','Lancia il suo ossolotto come un boomerang.',0,null],

    /* ---- velenosi ---- */
    [29,'nidoran♀','Nidoran♀','Nidoran♀',['poison'],3,10,'quadruped','A small but toxic Pokémon.','Un Pokémon piccolo ma tossico.',25,'nidorina',{primary:'#90caf9',secondary:'#64b5f6',accent:'#bbdefb',detail:'#1565c0'}],
    [30,'nidorina','Nidorina','Nidorina',['poison'],4,0,'quadruped','It does not like to use its horn in fights.','Non ama usare il corno nei combattimenti.',100,'nidoqueen'],
    [31,'nidoqueen','Nidoqueen','Nidoqueen',['poison','ground'],6,0,'quadruped','Its hard scales shield its whole body.','Le squame dure proteggono tutto il corpo.',0,null],
    [32,'nidoran♂','Nidoran♂','Nidoran♂',['poison'],3,10,'quadruped','It raises big ears to check its surroundings.','Alza le grandi orecchie per sorvegliare i dintorni.',25,'nidorino'],
    [33,'nidorino','Nidorino','Nidorino',['poison'],4,0,'quadruped','It is quick to anger and charges with its horn.','Si arrabbia presto e carica con il corno.',100,'nidoking'],
    [34,'nidoking','Nidoking','Nidoking',['poison','ground'],6,0,'biped','Its thick tail smashes power lines.','La sua coda robusta spezza i pali della luce.',0,null],
    [41,'zubat','Zubat','Zubat',['poison','flying'],2,8,'bird','Forms colonies in perpetually dark places.','Forma colonie in luoghi perennemente bui.',50,'golbat',{primary:'#7e57c2',secondary:'#5e35b1',accent:'#d1c4e9',detail:'#311b92'}],
    [42,'golbat','Golbat','Golbat',['poison','flying'],4,0,'bird','It drinks over 10 ounces of blood daily.','Beve più di 300 ml di sangue al giorno.',0,null],
    [43,'oddish','Oddish','Oddish',['grass','poison'],2,8,'blob','During the day, it keeps its face buried in the ground.','Durante il giorno tiene la faccia sotterrata.',25,'gloom',{primary:'#5c6bc0',secondary:'#3949ab',accent:'#c5cae9',detail:'#1a237e'}],
    [44,'gloom','Gloom','Gloom',['grass','poison'],4,0,'blob','Its honey drool smells absolutely horrid.','La sua bava di miele sa davvero orribile.',100,'vileplume'],
    [45,'vileplume','Vileplume','Vileplume',['grass','poison'],6,0,'blob','Its petals hold the world\'s largest flower.','I suoi petali formano il fiore più grande del mondo.',0,null],
    [46,'paras','Paras','Paras',['bug','grass'],2,8,'insect','Mushrooms called tochukaso grow on its back.','Funghi tochukaso crescono sulla sua schiena.',50,'parasect',{primary:'#ffab91',secondary:'#ff8a65',accent:'#d7ccc8',detail:'#bf360c'}],
    [47,'parasect','Parasect','Parasect',['bug','grass'],4,0,'insect','The giant mushroom has taken over its body.','Il fungo gigante ha preso il controllo del corpo.',0,null],
    [48,'venonat','Venonat','Venonat',['bug','poison'],3,10,'blob','Its eyes function as radar in the dark.','I suoi occhi funzionano come radar nel buio.',50,'venomoth',{primary:'#9575cd',secondary:'#7e57c2',accent:'#d1c4e9',detail:'#4527a0'}],
    [49,'venomoth','Venomoth','Venomoth',['bug','poison'],5,0,'bird','It scatters toxic dust with every wing beat.','Sparge polvere tossica a ogni battito d\'ali.',0,null],
    [88,'grimer','Grimer','Grimer',['poison'],2,8,'blob','It was born from sludge in polluted rivers.','Nacque dal fango dei fiumi inquinati.',50,'muk'],
    [89,'muk','Muk','Muk',['poison'],5,0,'blob','Its body is filled with poisonous waste.','Il suo corpo è pieno di scarti velenosi.',0,null],
    [109,'koffing','Koffing','Koffing',['poison'],2,8,'blob','Its thin skin is filled with toxic gas.','La pelle sottile è piena di gas tossico.',50,'weezing'],
    [110,'weezing','Weezing','Weezing',['poison'],5,0,'blob','Two Koffing fused into a shared body.','Due Koffing fusi in un corpo unico.',0,null],

    /* ---- acqua ---- */
    [54,'psyduck','Psyduck','Psyduck',['water'],3,10,'biped','When its headache intensifies, it starts using strange powers.','Quando il mal di testa si intensifica, usa strani poteri.',50,'golduck',{primary:'#ffe082',secondary:'#ffca28',accent:'#fff8e1',detail:'#ff6f00'}],
    [55,'golduck','Golduck','Golduck',['water'],5,0,'biped','It swims gracefully at high speed.','Nuota con eleganza ad alta velocità.',0,null],
    [60,'poliwag','Poliwag','Poliwag',['water'],2,8,'blob','The direction of the spiral on its belly differs by area.','La direzione della spirale sulla pancia varia per zona.',25,'poliwhirl',{primary:'#42a5f5',secondary:'#1e88e5',accent:'#bbdefb',detail:'#0d47a1'}],
    [61,'poliwhirl','Poliwhirl','Poliwhirl',['water'],4,0,'blob','Its highly developed muscles never tire.','I suoi muscoli evoluti non si stancano mai.',100,'poliwrath'],
    [62,'poliwrath','Poliwrath','Poliwrath',['water','fighting'],6,0,'blob','It can swim across the Pacific Ocean.','Sa traversare a nuoto l\'intero Pacifico.',0,null],
    [79,'slowpoke','Slowpoke','Slowpoke',['water','psychic'],3,10,'quadruped','It is always vacantly lost in thought.','È sempre perso nei suoi pensieri.',50,'slowbro',{primary:'#f48fb1',secondary:'#f06292',accent:'#f8bbd0',detail:'#c2185b'}],
    [80,'slowbro','Slowbro','Slowbro',['water','psychic'],5,0,'quadruped','A Shellder bit its tail and will not let go.','Uno Shellder ha morso la coda e non la lascia.',0,null],
    [90,'shellder','Shellder','Shellder',['water','ice'],2,8,'blob','It clamps onto prey with its hard shell.','Afferra le prede col suo guscio durissimo.',50,'cloyster'],
    [91,'cloyster','Cloyster','Cloyster',['water','ice'],5,0,'blob','Its shell is covered in deadly spikes.','Il suo guscio è coperto di spine letali.',0,null],
    [98,'krabby','Krabby','Krabby',['water'],2,8,'insect','It bubbles foam from its mouth when angry.','Soffia schiuma dalla bocca quando è arrabbiato.',50,'kingler'],
    [99,'kingler','Kingler','Kingler',['water'],5,0,'insect','Its oversized claw can snap through steel.','La chela gigantesca taglia l\'acciaio.',0,null],
    [116,'horsea','Horsea','Horsea',['water'],2,8,'fish','It shoots ink to escape from enemies.','Spara inchiostro per fuggire dai nemici.',50,'seadra'],
    [117,'seadra','Seadra','Seadra',['water'],5,0,'fish','Its spines secrete a strong venom.','Le spine secernono un veleno potente.',0,null],
    [118,'goldeen','Goldeen','Goldeen',['water'],2,8,'fish','Its tail fin billows elegantly in water.','La pinna caudale ondeggia elegante in acqua.',50,'seaking'],
    [119,'seaking','Seaking','Seaking',['water'],4,0,'fish','It drills holes in riverbeds for its nest.','Trapano i letti dei fiumi per fare il nido.',0,null],
    [120,'staryu','Staryu','Staryu',['water'],3,10,'blob','It regenerates limbs if a piece is lost.','Rigenera gli arti se ne perde un pezzo.',50,'starmie'],
    [121,'starmie','Starmie','Starmie',['water','psychic'],5,0,'blob','Its core glows in seven different colors.','Il suo nucleo brilla in sette colori diversi.',0,null],
    [129,'magikarp','Magikarp','Magikarp',['water'],1,3,'fish','In the distant past, it was somewhat stronger than the horribly weak descendants.','Nel lontano passato era più forte degli orribili discendenti deboli.',400,'gyarados',{primary:'#ef9a9a',secondary:'#e57373',accent:'#ffeb3b',detail:'#c62828'}],
    [130,'gyarados','Gyarados','Gyarados',['water','flying'],8,0,'fish','Once it appears, it goes on a rampage until destroyed.','Quando appare, scatena una furia senza fine.',0,null],
    [131,'lapras','Lapras','Lapras',['water','ice'],7,6,'quadruped','A gentle soul that carries people on its back.','Un\'anima gentile che porta le persone in groppa.',0,null],
    [86,'seel','Seel','Seel',['water','ice'],2,8,'quadruped','It sleeps in the daytime under shallow water.','Dorme di giorno negli acque basse.',50,'dewgong'],
    [87,'dewgong','Dewgong','Dewgong',['water','ice'],5,0,'quadruped','It glides through cold seas at speed.','Scivola veloce nei mari gelidi.',0,null],

    /* ---- psico & spettro ---- */
    [63,'abra','Abra','Abra',['psychic'],5,20,'biped','Using its psychic power is such a strain that it sleeps 18 hours daily.','Usare i poteri psichici è così faticoso che dorme 18 ore al giorno.',25,'kadabra',{primary:'#ffe082',secondary:'#ffca28',accent:'#fff8e1',detail:'#ffd54f'}],
    [64,'kadabra','Kadabra','Kadabra',['psychic'],6,0,'biped','Its alpha waves cause headaches in onlookers.','Le sue onde alfa causano mal di testa a chi guarda.',100,'alakazam'],
    [65,'alakazam','Alakazam','Alakazam',['psychic'],8,0,'biped','Its IQ exceeds 5,000; it never forgets anything.','Il suo QI supera 5.000: non dimentica mai nulla.',0,null],
    [96,'drowzee','Drowzee','Drowzee',['psychic'],2,8,'biped','It eats the dreams of sleeping people.','Mangia i sogni delle persone che dormono.',50,'hypno'],
    [97,'hypno','Hypno','Hypno',['psychic'],5,0,'biped','It swings its pendulum to hypnotize foes.','Oscilla il pendolo per ipnotizzare i nemici.',0,null],
    [102,'exeggcute','Exeggcute','Exeggcute',['grass','psychic'],3,10,'blob','Six heads chatter constantly among themselves.','Le sei teste chiacchierano continuamente tra loro.',50,'exeggutor'],
    [103,'exeggutor','Exeggutor','Exeggutor',['grass','psychic'],6,0,'blob','Its heads fall off and become Exeggcute.','Le sue teste cadono e diventano Exeggcute.',0,null],
    [122,'mrmime','Mr. Mime','Mr. Mime',['psychic','fairy'],6,8,'biped','It mimes invisible walls that are very real.','Mima muri invisibili che sono davvero reali.',0,null],
    [92,'gastly','Gastly','Gastly',['ghost','poison'],3,10,'blob','It envelops foes in a gas of 0.2 micron thickness.','Avvolge i nemici in un gas spesso 0,2 micron.',25,'haunter'],
    [93,'haunter','Haunter','Haunter',['ghost','poison'],5,0,'blob','Its tongue chills the victim it licks.','La sua lingua congela la vittima che lecca.',100,'gengar'],
    [94,'gengar','Gengar','Gengar',['ghost','poison'],7,0,'blob','It pretends to be your shadow, then laughs.','Fa finta di essere la tua ombra, poi ride.',0,null],

    /* ---- combattenti &Normali forti ---- */
    [56,'mankey','Mankey','Mankey',['fighting'],4,15,'biped','It flies into a rage if you meet its eyes.','Va in bestia se incroci il suo sguardo.',50,'primeape',{primary:'#d7ccc8',secondary:'#efebe9',accent:'#a1887f',detail:'#5d4037'}],
    [57,'primeape','Primeape','Primeape',['fighting'],5,0,'biped','It is always furious, even when it wins.','È sempre furioso, anche quando vince.',0,null],
    [66,'machop','Machop','Machop',['fighting'],4,15,'biped','Its muscles never tire however much it exercises.','I suoi muscoli non si stancano mai.',25,'machoke',{primary:'#90caf9',secondary:'#64b5f6',accent:'#e3f2fd',detail:'#1565c0'}],
    [67,'machoke','Machoke','Machoke',['fighting'],6,0,'biped','It can lift a sumo wrestler with one finger.','Solleva un lottatore di sumo con un dito.',100,'machamp'],
    [68,'machamp','Machamp','Machamp',['fighting'],8,0,'biped','Its four arms land over a thousand punches.','Le sue quattro braccia sferrano mille pugni.',0,null],
    [106,'hitmonlee','Hitmonlee','Hitmonlee',['fighting'],6,8,'biped','Its legs stretch freely like rubber.','Le sue gambe si allungano come gomma.',0,null],
    [107,'hitmonchan','Hitmonchan','Hitmonchan',['fighting'],6,8,'biped','It punches faster than a boxing champion.','Colpisce più veloce di un campione di boxe.',0,null],
    [115,'kangaskhan','Kangaskhan','Kangaskhan',['normal'],6,12,'quadruped','It raises its baby in the belly pouch.','Cresce il cucciolo nella tasca del ventre.',0,null],
    [127,'pinsir','Pinsir','Pinsir',['bug'],6,8,'insect','It grips prey with its huge pincers.','Stringe le prede con le sue chele enormi.',0,null],
    [128,'tauros','Tauros','Tauros',['normal'],5,8,'quadruped','It whips itself with its tails to charge.','Si sferza con le code per caricare.',0,null],
    [113,'chansey','Chansey','Chansey',['normal'],6,8,'blob','It lays nutritious eggs every day.','Depone uova nutritissime ogni giorno.',0,null],
    [108,'lickitung','Lickitung','Lickitung',['normal'],5,10,'biped','Its tongue is twice the length of its body.','La sua lingua è lunga il doppio del corpo.',0,null],
    [132,'ditto','Ditto','Ditto',['normal'],5,6,'blob','It rearranges its cells to copy anything.','Riorganizza le sue cellule per copiare qualsiasi cosa.',0,null],
    [143,'snorlax','Snorlax','Snorlax',['normal'],8,10,'blob','It is not satisfied unless it eats 400 kg daily.','Non è sazio se non mangia 400 kg al giorno.',0,null],
    [114,'tangela','Tangela','Tangela',['grass'],4,10,'blob','Its vines keep growing throughout its life.','Le sue liane crescono per tutta la vita.',0,null],
    [137,'porygon','Porygon','Porygon',['normal'],6,6,'blob','A man-made Pokémon that can move in cyberspace.','Un Pokémon artificiale che si muove nel cyberspazio.',0,null],

    /* ---- ghiaccio ---- */
    [124,'jynx','Jynx','Jynx',['ice','psychic'],6,8,'biped','It walks by wiggling its hips in rhythm.','Cammina ondeggiando i fianchi a ritmo.',0,null],

    /* ---- fossili ---- */
    [138,'omanyte','Omanyte','Omanyte',['rock','water'],4,6,'blob','It was restored from a living fossil helix.','Ricostruito dall\'elica di un fossile vivente.',50,'omastar'],
    [139,'omastar','Omastar','Omastar',['rock','water'],6,0,'blob','Its sharp beak crushes shells with ease.','Il becco affilato frantuma i gusci con facilità.',0,null],
    [140,'kabuto','Kabuto','Kabuto',['rock','water'],4,6,'insect','It is a safely restored fossil Pokémon.','È un Pokémon fossile rimesso in salvo.',50,'kabutops'],
    [141,'kabutops','Kabutops','Kabutops',['rock','water'],6,0,'insect','It slashes prey with its sharp scythes.','Affetta le prede con le sue falci affilate.',0,null],
    [142,'aerodactyl','Aerodactyl','Aerodactyl',['rock','flying'],7,6,'bird','A fierce Pokémon from the age of dinosaurs.','Un Pokémon feroce dell\'era dei dinosauri.',0,null],

    /* ---- varie gen 1 (ripristino) ---- */
    [35,'clefairy','Clefairy','Clefairy',['fairy'],4,15,'biped','Its adorable behavior makes it very popular.','Il suo comportamento adorabile lo rende molto popolare.',50,'clefable',{primary:'#f8bbd0',secondary:'#f48fb1',accent:'#fce4ec',detail:'#c2185b'}],
    [36,'clefable','Clefable','Clefable',['fairy'],6,0,'biped','It steps lightly on moonlit nights to drink spring water.','Cammina leggera nelle notti di luna per bere acqua di sorgente.',0,null],
    [37,'vulpix','Vulpix','Vulpix',['fire'],4,15,'quadruped','While young, it has six gorgeous tails.','Da giovane ha sei magnifiche code.',50,'ninetales',{primary:'#ffab91',secondary:'#ff8a65',accent:'#ffccbc',detail:'#bf360c'}],
    [38,'ninetales','Ninetales','Ninetales',['fire'],6,0,'quadruped','Nine tails, each holding a mystical power.','Nove code, ognuna con un potere mistico.',0,null],
    [39,'jigglypuff','Jigglypuff','Jigglypuff',['normal','fairy'],3,12,'blob','It captivates foes with its huge, round eyes.','Intriga i nemici con i suoi grandi occhi rotondi.',50,'wigglytuff',{primary:'#f48fb1',secondary:'#f06292',accent:'#f8bbd0',detail:'#880e4f'}],
    [40,'wigglytuff','Wigglytuff','Wigglytuff',['normal','fairy'],5,0,'blob','Its fur feels wonderful to the touch.','Il suo pelo è una goduria al tatto.',0,null],
    [52,'meowth','Meowth','Meowth',['normal'],3,10,'quadruped','It loves anything that shines.','Ama tutto ciò che brilla.',50,'persian',{primary:'#fff9c4',secondary:'#fff59d',accent:'#fbc02d',detail:'#f57f17'}],
    [53,'persian','Persian','Persian',['normal'],4,0,'quadruped','A proud, elegant feline of noble air.','Un felino orgoglioso ed elegante dall\'aria nobile.',0,null],
    [58,'growlithe','Growlithe','Growlithe',['fire'],4,15,'quadruped','It has a brave and trustworthy nature.','Ha un carattere coraggioso e affidabile.',50,'arcanine',{primary:'#ff8a65',secondary:'#ff7043',accent:'#ffccbc',detail:'#3e2723'}],
    [59,'arcanine','Arcanine','Arcanine',['fire'],6,0,'quadruped','A legendary loyal Pokémon that runs 6,200 miles.','Un Pokémon leggendario e leale che corre 10.000 km.',0,null],
    [69,'bellsprout','Bellsprout','Bellsprout',['grass','poison'],2,8,'blob','Even though its body is extremely thin, it is very flexible.','Nonostante il corpo estremamente sottile, è molto flessibile.',25,'weepinbell',{primary:'#a5d6a7',secondary:'#81c784',accent:'#c8e6c9',detail:'#388e3c'}],
    [70,'weepinbell','Weepinbell','Weepinbell',['grass','poison'],4,0,'blob','It spits a corrosive fluid to melt its foes.','Sputa un liquido corrosivo che scioglie i nemici.',100,'victreebel'],
    [71,'victreebel','Victreebel','Victreebel',['grass','poison'],6,0,'blob','It lures prey with honey-scented acid.','Attira le prede con acida profumata a miele.',0,null],
    [72,'tentacool','Tentacool','Tentacool',['water','poison'],2,6,'blob','Its body is almost entirely made of water.','Il suo corpo è fatto quasi tutto d\'acqua.',50,'tentacruel'],
    [73,'tentacruel','Tentacruel','Tentacruel',['water','poison'],5,0,'blob','Its 80 tentacles can ensnare a whole ship.','I suoi 80 tentacoli possono avvinghiare una nave.',0,null],
    [77,'ponyta','Ponyta','Ponyta',['fire'],4,15,'quadruped','Its mane is made of fire that flares up when excited.','La sua criniera è fatta di fuoco che si infiamma quando è eccitato.',50,'rapidash',{primary:'#ffcc80',secondary:'#ffb74d',accent:'#ffe0b2',detail:'#e65100'}],
    [78,'rapidash','Rapidash','Rapidash',['fire'],6,0,'quadruped','It gallops at 150 mph, mane ablaze.','Galoppa a 240 km/h con la criniera in fiamme.',0,null],
    [123,'scyther','Scyther','Scyther',['bug','flying'],6,8,'insect','It moves so fast it appears to be a blur.','È talmente veloce che sembra una sfocatura.',0,null],
    [126,'magmar','Magmar','Magmar',['fire'],6,8,'biped','It was found near the crater of a volcano.','È stato avvistato vicino al cratere di un vulcano.',0,null],

    /* ---- leggendari ---- */
    [144,'articuno','Articuno','Articuno',['ice','flying'],10,0.3,'bird','Its blue wings freeze the moisture in the air.','Le sue ali azzurre gelano l\'umidità dell\'aria.',0,null],
    [145,'zapdos','Zapdos','Zapdos',['electric','flying'],10,0.3,'bird','It lives among thunderclouds and controls lightning.','Vive tra i nembi e controlla i fulmini.',0,null],
    [146,'moltres','Moltres','Moltres',['fire','flying'],10,0.3,'bird','It dives and flashes flames from its body.','Si tuffa in picchiata sprigionando fiamme.',0,null],
    [147,'dratini','Dratini','Dratini',['dragon'],4,6,'serpent','It continually sheds skin, growing larger.','Cambia pelle di continuo, crescendo senza sosta.',25,'dragonair'],
    [148,'dragonair','Dragonair','Dragonair',['dragon'],6,0,'serpent','Its aura can alter the weather around it.','La sua aura altera il tempo atmosferico.',100,'dragonite'],
    [149,'dragonite','Dragonite','Dragonite',['dragon','flying'],9,0,'biped','It circles the globe in just sixteen hours.','Gira il mondo in sole sedici ore.',0,null],
    [133,'eevee','Eevee','Eevee',['normal'],4,12,'biped','Its genetic code is highly unstable.','Il suo codice genetico è molto instabile.',25,['vaporeon','jolteon','flareon']],
    [134,'vaporeon','Vaporeon','Vaporeon',['water'],6,0,'quadruped','Its cell structure is similar to water molecules.','La sua struttura cellulare ricorda le molecole d\'acqua.',0,null],
    [135,'jolteon','Jolteon','Jolteon',['electric'],6,0,'quadruped','Its fur bristles with 10,000 volts.','Il suo pelo si erge a 10.000 volt.',0,null],
    [136,'flareon','Flareon','Flareon',['fire'],6,0,'quadruped','Its internal flame sac reaches 1,650 degrees.','La sacca di fiamma interna tocca 900 gradi.',0,null],
    [150,'mewtwo','Mewtwo','Mewtwo',['psychic'],10,0.2,'biped','A Pokémon created by recombining Mew\'s genes.','Un Pokémon creato ricombinando i geni di Mew.',0,null],
    [151,'mew','Mew','Mew',['psychic'],10,0.1,'biped','It has the DNA of every Pokémon within it.','Ha al suo interno il DNA di ogni Pokémon.',0,null],
  ].map(([dex, id, en, it, types, difficulty, weight, archetype, descEn, descIt, candy, evo, colors]) => {
    const p = PAL[types[0]] || PAL.normal;
    return {
      id, dex,
      name: { en, it },
      types, difficulty, weight, archetype,
      colors: colors || { primary: p[0], secondary: p[1], accent: p[2], detail: p[3] },
      desc: { en: descEn, it: descIt },
      candyToEvolve: candy || 0,
      evolvesTo: evo || null,
    };
  }),

  /** Specie per id. */
  byId(id) {
    return BY_ID.get(id) || null;
  },
};

/* ============================================================
 * FUSIONE: le 151 curate + tutte le specie delle 9 generazioni
 * ============================================================ */

const CURATED_DEX = new Set(CONFIG.pokedex.map(p => p.dex));

for (const [dex, slug, en, it, t1, t2, difficulty, weight, , gen, flags] of DEX_DATA) {
  if (CURATED_DEX.has(dex)) continue;
  const types = t2 ? [t1, t2] : [t1];
  const pal = PAL[types[0]] || PAL.normal;
  CONFIG.pokedex.push({
    id: slug, dex,
    name: { en, it },
    types, difficulty, weight,
    archetype: 'blob',
    colors: { primary: pal[0], secondary: pal[1], accent: pal[2], detail: pal[3] },
    desc: null,
    candyToEvolve: 0,
    evolvesTo: null,
    gen,
    legendary: flags === 1,
    mythical: flags === 2,
  });
}

// lookup O(1) per id
const BY_ID = new Map(CONFIG.pokedex.map(p => [p.id, p]));

// catene evolutive dai dati (compresi i ponti oltre il confine 151/152+:
// scyther→scizor, golbat→crobat, slowpoke→slowking, porygon→porygon2…)
const dexToSlug = new Map(DEX_DATA.map(d => [d[0], d[1]]));
for (const [dex, slug, , , , , , , fromDex] of DEX_DATA) {
  if (!fromDex) continue;
  const parent = CONFIG.pokedex.find(p => p.dex === fromDex);
  const child = BY_ID.get(slug);
  if (!parent || !child) continue;
  const targets = parent.evolvesTo == null ? []
    : (Array.isArray(parent.evolvesTo) ? parent.evolvesTo : [parent.evolvesTo]);
  if (!targets.includes(slug)) {
    parent.evolvesTo = targets.length ? [...targets, slug] : slug;
  }
  if (!child.candyToEvolve) {
    const grandchild = DEX_DATA.find(d => d[8] === dex);
    child.candyToEvolve = grandchild ? 100 : 50;
  }
}

// generazione per le curate (tutte Gen 1)
CONFIG.pokedex.forEach(p => { p.gen = p.gen || 1; });

// assegnazione automatica ai biomi per tipo primario (solo specie generate)
const TYPE_BIOMES = {
  normal: ['grass', 'city'], fire: ['volcano'], water: ['lago', 'beach'],
  electric: ['city'], grass: ['grass', 'forest'], ice: ['lago', 'cielo'],
  fighting: ['mountain'], poison: ['cave', 'forest'], ground: ['mountain', 'cave'],
  flying: ['cielo'], psychic: ['psychic'], bug: ['forest'], rock: ['cave', 'mountain'],
  ghost: ['cave', 'psychic'], dragon: ['mountain', 'cielo'], dark: ['city'],
  steel: ['city', 'mountain'], fairy: ['grass', 'psychic'],
};
CONFIG.autoSpecies = {};
for (const p of CONFIG.pokedex) {
  if (CURATED_DEX.has(p.dex)) continue;
  for (const b of TYPE_BIOMES[p.types[0]] || ['grass']) {
    (CONFIG.autoSpecies[b] ??= []).push({ id: p.id, w: p.weight });
  }
}

export default CONFIG;
