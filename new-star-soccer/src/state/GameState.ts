import type {
  Player,
  Relationships,
  MatchState,
  MatchEvent,
  WeekLog,
  LeagueEntry,
  ActiveEffect,
  TransferOffer,
  NewsItem,
  Trophy,
  Fixture,
  Screen,
} from '../types/index.ts';
import { CLUBS, CLUB_DATA, ITEMS, clubStrength } from '../types/index.ts';

export const BASE_PLAYER: Player = {
  name: 'New Star',
  age: 16,
  retiringAge: 35,
  club: CLUBS[0],
  nationality: 'England',
  position: 'ST',
  value: 50000,
  salary: 250,
  energy: 100,
  skills: {
    pace: 40,
    power: 35,
    technique: 38,
    vision: 30,
    freeKicks: 25,
  },
  goals: 0,
  assists: 0,
  appearances: 0,
  starAppeal: 10,
  xp: 0,
  level: 1,
  money: 200,
  peakValue: 50000,
  careerEarnings: 0,
};

export const BASE_RELATIONSHIPS: Relationships = {
  boss: 60,
  teammates: 60,
  fans: 50,
  partner: 60,
};

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

/** Round-robin (circle method) for an even number of teams. */
function roundRobinFixtures(teams: string[]): Fixture[][] {
  const t = [...teams];
  const n = t.length;
  const rounds: Fixture[][] = [];
  for (let r = 0; r < n - 1; r++) {
    const round: Fixture[] = [];
    for (let i = 0; i < n / 2; i++) {
      const home = t[i];
      const away = t[n - 1 - i];
      // alternate home/away for variety
      round.push(
        (r + i) % 2 === 0
          ? { week: r + 1, home, away, played: false, hg: null, ag: null }
          : { week: r + 1, home: away, away: home, played: false, hg: null, ag: null }
      );
    }
    rounds.push(round);
    // rotate all but the first
    t.splice(1, 0, t.pop()!);
  }
  // second half: mirrored
  const mirrored = rounds.map((round) =>
    round.map((f) => ({ week: f.week + (n - 1), home: f.away, away: f.home, played: false, hg: null, ag: null }))
  );
  return [...rounds, ...mirrored];
}

/** Poisson-like small goals sample from an expectation. */
function sampleGoals(expected: number): number {
  let goals = 0;
  for (let i = 0; i < 5; i++) {
    if (Math.random() < expected / 5) goals++;
  }
  return goals;
}

export class GameState {
  player: Player;
  relationships: Relationships;
  week = 1;            // absolute week counter
  season = 1;
  weekOfSeason = 1;    // 1–38
  inventory: Map<string, number> = new Map();
  activeEffects: ActiveEffect[] = [];
  history: WeekLog[] = [];
  fixtures: Fixture[][] = [];   // [round][fixture]
  leagueTable: LeagueEntry[] = [];
  seasonGoals = 0;
  seasonAssists = 0;
  seasonRatingSum = 0;
  seasonRatingCount = 0;
  news: NewsItem[] = [];
  trophies: Trophy[] = [];
  pendingOffers: TransferOffer[] = [];
  currentScreen: Screen = 'dashboard';
  currentMatch: MatchState | null = null;
  lastLog: WeekLog | null = null;
  careerBestFinish = 20;
  seasonEnded = false;

  constructor() {
    this.player = structuredClone ? structuredClone(BASE_PLAYER) : JSON.parse(JSON.stringify(BASE_PLAYER));
    this.relationships = structuredClone ? structuredClone(BASE_RELATIONSHIPS) : JSON.parse(JSON.stringify(BASE_RELATIONSHIPS));
    this.newSeason(true);
  }

  // ─── Season & fixtures ───
  newSeason(first = false) {
    this.leagueTable = CLUBS.map((team) => ({
      team,
      played: 0,
      won: 0,
      drawn: 0,
      lost: 0,
      gf: 0,
      ga: 0,
      points: 0,
    }));
    this.fixtures = roundRobinFixtures(CLUBS);
    this.seasonGoals = 0;
    this.seasonAssists = 0;
    this.seasonRatingSum = 0;
    this.seasonRatingCount = 0;
    if (!first) {
      this.pushNews(`Season ${this.season} kicks off. ${this.player.club} target: promotion to the continental stage.`);
    }
  }

  clubName(): string {
    return this.player.club;
  }

  leaguePosition(): number {
    const idx = this.leagueTable.findIndex((e) => e.team === this.player.club);
    return idx === -1 ? 20 : idx + 1;
  }

  playerFixture(round = this.weekOfSeason): Fixture | null {
    const r = this.fixtures[round - 1];
    if (!r) return null;
    return r.find((f) => f.home === this.player.club || f.away === this.player.club) || null;
  }

  /** Simulate every fixture of a round except the player's own. */
  simulateRound(round: number) {
    const r = this.fixtures[round - 1];
    if (!r) return;
    for (const f of r) {
      if (f.played) continue;
      if (f.home === this.player.club || f.away === this.player.club) continue;
      this.simulateFixture(f);
    }
  }

  simulateFixture(f: Fixture) {
    const hs = clubStrength(f.home);
    const as = clubStrength(f.away);
    const homeAdv = 3;
    const hgExp = clamp(0.6 + (hs + homeAdv - as) / 28, 0.2, 3.2);
    const agExp = clamp(0.6 + (as - hs - homeAdv) / 28, 0.2, 3.2);
    f.hg = sampleGoals(hgExp);
    f.ag = sampleGoals(agExp);
    f.played = true;
    this.updateLeagueTable(f.home, f.away, f.hg, f.ag);
  }

  // ─── Stat getters with active effects ───
  getEffectiveSkill(skill: keyof Player['skills']): number {
    let base = this.player.skills[skill];
    for (const eff of this.activeEffects) {
      if (eff.effect.type === skill) base += eff.effect.value;
    }
    return clamp(base, 0, 100);
  }

  getEffectiveEnergy(): number {
    return clamp(this.player.energy, 0, 100);
  }

  /** Match-day sharpness: low energy dulls every minigame. */
  matchSkillModifier(): number {
    const e = this.getEffectiveEnergy();
    if (e < 20) return 0.72;
    if (e < 35) return 0.85;
    if (e < 55) return 0.94;
    return 1;
  }

  teamStrength(): number {
    const skill = (this.getEffectiveSkill('pace') + this.getEffectiveSkill('technique') + this.getEffectiveSkill('vision')) / 3;
    return clamp(clubStrength(this.player.club) * 0.62 + skill * 0.30 + this.relationships.teammates * 0.08, 20, 95);
  }

  // ─── Economy ───
  sponsorIncome(): number {
    const p = this.player;
    return Math.round((this.relationships.fans * 0.14 + p.starAppeal * 0.22) * (1 + p.level * 0.06));
  }

  getWeeklyWage(): number {
    return this.player.salary;
  }

  addMoney(amount: number) {
    this.player.money += amount;
    if (amount > 0) this.player.careerEarnings += amount;
  }

  spendMoney(amount: number): boolean {
    if (this.player.money < amount) return false;
    this.player.money -= amount;
    return true;
  }

  addXP(amount: number) {
    this.player.xp += amount;
    const nextLevel = this.player.level * 150;
    if (this.player.xp >= nextLevel) {
      this.player.level++;
      this.player.xp -= nextLevel;
      this.player.skills.pace = clamp(this.player.skills.pace + 2, 0, 100);
      this.player.skills.technique = clamp(this.player.skills.technique + 2, 0, 100);
      this.pushNews(`⭐ ${this.player.name} reached level ${this.player.level}!`);
    }
  }

  // ─── Weekly decay ───
  applyWeeklyDecay() {
    let recovery = 20;
    if (this.inventory.has('mansion')) recovery += 15;
    else if (this.inventory.has('apartment')) recovery += 10;
    this.player.energy = clamp(this.player.energy + recovery, 0, 100);

    this.activeEffects = this.activeEffects
      .map((e) => ({ ...e, weeksRemaining: e.weeksRemaining - 1 }))
      .filter((e) => e.effect.duration === 0 || e.weeksRemaining > 0);

    this.relationships.partner = clamp(this.relationships.partner - 1, 0, 100);
  }

  pushNews(text: string) {
    this.news.unshift({ week: this.week, text });
    if (this.news.length > 30) this.news.length = 30;
  }

  // ─── Training & life ───
  train(skill: keyof Player['skills'], intensity: 'light' | 'medium' | 'hard'): string {
    const costs = { light: 10, medium: 20, hard: 35 };
    const gains = { light: 1, medium: 3, hard: 6 };
    const cost = costs[intensity];
    const gain = gains[intensity];

    if (this.player.energy < cost) {
      return 'Not enough energy to train!';
    }

    this.player.energy -= cost;
    const before = this.player.skills[skill];
    this.player.skills[skill] = clamp(this.player.skills[skill] + gain, 0, 100);
    const actual = this.player.skills[skill] - before;

    this.relationships.boss = clamp(this.relationships.boss + (intensity === 'hard' ? 3 : 1), 0, 100);
    this.relationships.teammates = clamp(this.relationships.teammates - (intensity === 'hard' ? 2 : 0), 0, 100);
    this.relationships.partner = clamp(this.relationships.partner - (intensity === 'hard' ? 2 : 0), 0, 100);

    return actual > 0 ? `+${actual} ${skill} (-${cost} energy)` : `${skill} is maxed out!`;
  }

  rest(): string {
    const gain = 40;
    this.player.energy = clamp(this.player.energy + gain, 0, 100);
    this.relationships.partner = clamp(this.relationships.partner + 2, 0, 100);
    return `Recovered ${gain} energy. Partner appreciates the downtime.`;
  }

  goOut(): string {
    const cost = 30;
    if (this.player.energy < cost) return 'Too tired to go out!';
    this.player.energy -= cost;
    this.relationships.partner = clamp(this.relationships.partner + 8, 0, 100);
    this.relationships.teammates = clamp(this.relationships.teammates + 4, 0, 100);
    this.relationships.boss = clamp(this.relationships.boss - 2, 0, 100);
    return 'Great night out! Partner & teammates happy, Boss less so.';
  }

  buyItem(itemId: string): string {
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return 'Item not found.';
    if ((item.category === 'gear' || item.category === 'luxury') && this.inventory.has(itemId)) {
      return 'You already own that.';
    }
    if (!this.spendMoney(item.price)) return 'Not enough money!';

    if (item.category === 'consumable') {
      this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + 1);
      return `Bought ${item.name}`;
    }

    if (item.category === 'gift') {
      const relKey = item.effect.type as keyof Relationships;
      if (relKey in this.relationships) {
        this.relationships[relKey] = clamp(this.relationships[relKey] + item.effect.value, 0, 100);
        return `Gifted ${item.name}! +${item.effect.value} ${item.effect.type}`;
      }
    }

    this.inventory.set(itemId, (this.inventory.get(itemId) || 0) + 1);
    this.activeEffects.push({
      itemId: item.id,
      effect: item.effect,
      weeksRemaining: item.effect.duration || 9999,
    });
    this.player.starAppeal = clamp(this.player.starAppeal + (item.effect.type === 'starAppeal' ? item.effect.value : 0), 0, 100);
    if (item.effect.type === 'fans') {
      this.relationships.fans = clamp(this.relationships.fans + item.effect.value, 0, 100);
    }
    this.pushNews(`${item.icon} ${this.player.name} was seen with a new ${item.name}.`);
    return `Acquired ${item.name}!`;
  }

  useItem(itemId: string): string {
    const count = this.inventory.get(itemId) || 0;
    if (count <= 0) return 'You don\'t own that item.';
    const item = ITEMS.find((i) => i.id === itemId);
    if (!item) return 'Item not found.';

    if (item.category === 'consumable') {
      if (item.effect.type === 'energy') {
        this.player.energy = clamp(this.player.energy + item.effect.value, 0, 100);
        this.inventory.set(itemId, count - 1);
        return `Used ${item.name}! +${item.effect.value} Energy`;
      }
      this.activeEffects.push({
        itemId: item.id,
        effect: item.effect,
        weeksRemaining: item.effect.duration || 2,
      });
      this.inventory.set(itemId, count - 1);
      return `Used ${item.name}!`;
    }
    return 'Cannot use this item.';
  }

  // ─── Match engine ───
  generateMatch(): MatchState {
    const fixture = this.playerFixture() || { home: this.player.club, away: CLUBS[1], played: false, hg: null, ag: null, week: this.weekOfSeason };
    const home = fixture.home;
    const away = fixture.away;

    const events: MatchEvent[] = [];
    const eventCount = 3 + Math.floor(Math.random() * 3); // 3–5 minigame events
    const minutes = shuffle([...Array(90).keys()].slice(5, 85)).slice(0, eventCount).sort((a, b) => a - b);

    for (const m of minutes) {
      const r = Math.random();
      let type: MatchEvent['type'] = 'ticker';
      if (r < 0.3) type = 'pass';
      else if (r < 0.58) type = 'shoot';
      else if (r < 0.72) type = 'freekick';
      else if (r < 0.9) type = 'intercept';
      else type = 'ticker';

      const descs: Record<string, string[]> = {
        pass: [
          'A teammate looks for you in the box...',
          'Through ball splits the defence!',
          'Winger overlaps and wants to cut it back...',
        ],
        shoot: [
          'You break into the penalty area...',
          'The ball falls to you on the edge of the box...',
          'One-on-one with the last defender...',
        ],
        freekick: [
          'Free kick opportunity 22 yards out!',
          'Foul on the edge of the D — this is your range.',
          'Dangerous free kick, wall set, keeper ready...',
        ],
        intercept: [
          'A dangerous cross flies towards the far post...',
          'Opposition striker tries to slip past you...',
          'Loose ball in midfield — can you get there first?',
        ],
        ticker: [
          `Corner kick swung in by ${home}...`,
          'Counter-attack building...',
          'Midfield battle rages on...',
        ],
      };

      events.push({
        minute: m,
        type,
        description: descs[type][Math.floor(Math.random() * descs[type].length)],
        resolved: type === 'ticker',
      });
    }

    // A few pure ticker moments
    const tickerMins = shuffle([...Array(90).keys()].slice(5, 85)).slice(0, 4).sort((a, b) => a - b);
    for (const m of tickerMins) {
      events.push({ minute: m, type: 'ticker', description: `${m}' — play continues in the middle of the park.`, resolved: true });
    }
    events.sort((a, b) => a.minute - b.minute);

    // Team selection: a low Boss relationship gets you benched
    const benched =
      this.relationships.boss < 30 ? Math.random() < 0.55 :
      this.relationships.boss < 45 ? Math.random() < 0.2 : false;

    return {
      homeTeam: home,
      awayTeam: away,
      homeScore: 0,
      awayScore: 0,
      events,
      currentEventIndex: 0,
      playerRating: 6.0,
      finished: false,
      playerGoals: 0,
      playerAssists: 0,
      benched,
    };
  }

  resolveMatchEvent(index: number, success: boolean, type: 'goal' | 'assist' | 'save' | 'pass' | 'tackle' | 'miss') {
    if (!this.currentMatch) return;
    const ev = this.currentMatch.events[index];
    ev.resolved = true;
    ev.success = success;

    const isPlayerTeamHome = this.currentMatch.homeTeam === this.player.club;

    if (success) {
      if (type === 'goal') {
        if (isPlayerTeamHome) this.currentMatch.homeScore++;
        else this.currentMatch.awayScore++;
        this.player.goals++;
        this.currentMatch.playerGoals++;
        this.currentMatch.playerRating = Math.min(10, this.currentMatch.playerRating + 1.2);
        ev.xpGain = 60;
        ev.label = `⚽ ${ev.minute}' Goal — ${this.player.name}`;
      } else if (type === 'assist') {
        if (isPlayerTeamHome) this.currentMatch.homeScore++;
        else this.currentMatch.awayScore++;
        this.player.assists++;
        this.currentMatch.playerAssists++;
        this.currentMatch.playerRating = Math.min(10, this.currentMatch.playerRating + 0.8);
        ev.xpGain = 40;
        ev.label = `🅰️ ${ev.minute}' Assist — ${this.player.name}`;
      } else if (type === 'save' || type === 'tackle') {
        this.currentMatch.playerRating = Math.min(10, this.currentMatch.playerRating + 0.5);
        ev.xpGain = 25;
        ev.label = `🛡️ ${ev.minute}' Ball won — ${this.player.name}`;
      } else if (type === 'pass') {
        this.currentMatch.playerRating = Math.min(10, this.currentMatch.playerRating + 0.3);
        ev.xpGain = 15;
        ev.label = `👍 ${ev.minute}' Good pass — ${this.player.name}`;
      }
    } else {
      this.currentMatch.playerRating = Math.max(1, this.currentMatch.playerRating - (type === 'miss' ? 0.4 : 0.2));
      ev.xpGain = 5;
      if (type === 'miss') ev.label = `❌ ${ev.minute}' Chance missed — ${this.player.name}`;
    }

    this.addXP(ev.xpGain || 0);
  }

  finishMatch(): WeekLog {
    if (!this.currentMatch) throw new Error('No active match');
    const m = this.currentMatch;
    m.finished = true;
    this.player.appearances++;

    const isHome = m.homeTeam === this.player.club;
    let playerTeamGoals = isHome ? m.homeScore : m.awayScore;
    let oppGoals = isHome ? m.awayScore : m.homeScore;

    const oppStrength = clubStrength(isHome ? m.awayTeam : m.homeTeam);
    const myStrength = this.teamStrength();

    if (m.benched) {
      // Watched from the stands: the team plays without you
      const diff = myStrength - oppStrength;
      playerTeamGoals = sampleGoals(clamp(1.1 + diff / 30, 0.2, 3));
      oppGoals = sampleGoals(clamp(1.1 - diff / 30, 0.2, 3));
      m.playerRating = 0;
    } else {
      // Simulate the remainder of the match around the minigame results
      const unresolved = m.events.filter((e) => !e.resolved).length;
      const aiChances = Math.floor(unresolved / 2) + Math.floor(Math.random() * 2);
      for (let i = 0; i < aiChances; i++) {
        if (Math.random() < 0.22 + (myStrength - 50) / 220) playerTeamGoals++;
        if (Math.random() < 0.22 + (oppStrength - 50) / 220) oppGoals++;
      }
    }

    if (isHome) {
      m.homeScore = playerTeamGoals;
      m.awayScore = oppGoals;
    } else {
      m.awayScore = playerTeamGoals;
      m.homeScore = oppGoals;
    }
    this.updateLeagueTable(m.homeTeam, m.awayTeam, m.homeScore, m.awayScore);

    const result: WeekLog['result'] = m.benched
      ? 'benched'
      : playerTeamGoals > oppGoals ? 'win' : playerTeamGoals === oppGoals ? 'draw' : 'loss';
    const rating = m.benched ? 0 : m.playerRating;

    // ─── Financials ───
    const winBonus = result === 'win' ? Math.round(this.player.salary * 0.5) : 0;
    const goalBonus = m.playerGoals * (100 + this.player.level * 25);
    const assistBonus = m.playerAssists * 60;
    const sponsor = this.sponsorIncome();
    const total = this.getWeeklyWage() + winBonus + goalBonus + assistBonus + sponsor;
    this.addMoney(total);

    // ─── Relationships ───
    if (!m.benched) {
      if (rating >= 8) {
        this.relationships.boss = clamp(this.relationships.boss + 5, 0, 100);
        this.relationships.fans = clamp(this.relationships.fans + 5, 0, 100);
        this.relationships.teammates = clamp(this.relationships.teammates + 3, 0, 100);
      } else if (rating < 5) {
        this.relationships.boss = clamp(this.relationships.boss - 5, 0, 100);
        this.relationships.fans = clamp(this.relationships.fans - 3, 0, 100);
      } else {
        this.relationships.boss = clamp(this.relationships.boss + 1, 0, 100);
      }
    } else {
      this.relationships.fans = clamp(this.relationships.fans - 1, 0, 100);
      this.relationships.boss = clamp(this.relationships.boss + 2, 0, 100); // made the coach's point
    }

    // ─── Value & season tallies ───
    if (!m.benched) {
      if (rating >= 7.5) this.player.value = Math.floor(this.player.value * 1.05);
      else if (rating < 4.5) this.player.value = Math.max(20000, Math.floor(this.player.value * 0.99));
      this.seasonGoals += m.playerGoals;
      this.seasonAssists += m.playerAssists;
      this.seasonRatingSum += rating;
      this.seasonRatingCount++;
    }
    this.player.peakValue = Math.max(this.player.peakValue, this.player.value);

    const log: WeekLog = {
      week: this.week,
      season: this.season,
      weekOfSeason: this.weekOfSeason,
      opponent: isHome ? m.awayTeam : m.homeTeam,
      result,
      score: `${m.homeScore} - ${m.awayScore}`,
      rating: m.benched ? 0 : parseFloat(rating.toFixed(1)),
      goals: m.playerGoals,
      assists: m.playerAssists,
      moneyDelta: total,
    };
    this.history.unshift(log);
    if (this.history.length > 120) this.history.length = 120;
    this.lastLog = log;

    // ─── Headline ───
    if (m.benched) {
      this.pushNews(`🪑 Benched for the ${result === 'win' ? 'win' : result} against ${log.opponent}. The coach wants to see more in training.`);
    } else if (m.playerGoals >= 3) {
      this.pushNews(`🔥 HAT-TRICK! ${this.player.name} scores ${m.playerGoals} against ${log.opponent}.`);
    } else if (m.playerGoals > 0) {
      this.pushNews(`⚽ ${this.player.name} scores in the ${result} vs ${log.opponent} (${log.score}).`);
    } else if (result === 'win') {
      this.pushNews(`✅ ${this.player.club} beat ${log.opponent} ${log.score}. Rating ${log.rating}.`);
    } else if (result === 'loss') {
      this.pushNews(`😞 Defeat against ${log.opponent} (${log.score}). The press blames the attack.`);
    }

    // Record the player's own fixture as played
    const pf = this.playerFixture();
    if (pf) {
      pf.played = true;
      pf.hg = m.homeScore;
      pf.ag = m.awayScore;
    }
    // Simulate the other nine fixtures of this round
    this.simulateRound(this.weekOfSeason);

    // ─── Advance week / season ───
    this.week++;
    this.weekOfSeason++;
    this.applyWeeklyDecay();
    this.save(true);

    if (this.weekOfSeason > 38) {
      // The final table stays on screen; the season wraps when the
      // player continues (trophies, aging, offers, retirement).
      this.seasonEnded = true;
    }
    return log;
  }

  /** Season end: trophies, aging, retirement, transfer offers. */
  wrapSeason() {
    this.seasonEnded = false;
    // Champion
    const champ = this.leagueTable[0];
    if (champ.team === this.player.club) {
      this.trophies.push({ season: this.season, kind: 'league', detail: `${this.player.club} — League Champions` });
      this.pushNews(`🏆 CHAMPIONS! ${this.player.club} win the league!`);
    } else {
      this.pushNews(`🏆 ${champ.team} win the league with ${champ.points} points.`);
    }
    this.careerBestFinish = Math.min(this.careerBestFinish, this.leaguePosition());

    // Top scorer race: simulated league best vs the player's season
    const topClub = CLUB_DATA.reduce((a, b) => (a.strength > b.strength ? a : b));
    const rivalGoals = Math.round(16 + topClub.strength / 5 + Math.random() * 8);
    if (this.seasonGoals > rivalGoals) {
      this.trophies.push({ season: this.season, kind: 'topscorer', detail: `Golden Boot — ${this.seasonGoals} goals` });
      this.pushNews(`🥇 GOLDEN BOOT! ${this.player.name}, ${this.seasonGoals} league goals.`);
    }

    // Aging & decline
    this.player.age++;
    if (this.player.age >= 30) {
      const decline = 1 + Math.floor(Math.random() * 2) + (this.player.age >= 33 ? 2 : 0);
      this.player.skills.pace = clamp(this.player.skills.pace - decline, 20, 100);
      this.player.skills.power = clamp(this.player.skills.power - Math.floor(decline / 2), 20, 100);
      this.pushNews(`⏳ Age ${this.player.age}: the legs are a step slower. Adapt or fade.`);
    }

    // Salary grows with value even without a transfer
    if (this.player.value > 200000) this.player.salary = Math.floor(this.player.salary * 1.15);

    const retired = this.player.age >= this.player.retiringAge;

    // Transfer offers for players doing well at a smaller club
    this.pendingOffers = retired ? [] : this.buildTransferOffers();
    if (this.pendingOffers.length) {
      this.pushNews(`📰 Transfer window: ${this.pendingOffers.length} offer${this.pendingOffers.length > 1 ? 's' : ''} on the table for ${this.player.name}.`);
    }

    this.season++;
    this.weekOfSeason = 1;
    this.newSeason();

    if (retired) {
      this.currentScreen = 'retired';
    } else if (this.pendingOffers.length) {
      this.currentScreen = 'transfers';
    }
  }

  buildTransferOffers(): TransferOffer[] {
    const myStrength = clubStrength(this.player.club);
    const avgRating = this.seasonRatingCount ? this.seasonRatingSum / this.seasonRatingCount : 6;
    const pool = CLUB_DATA.filter((c) => c.strength > myStrength + 6);
    if (!pool.length) return [];
    // Interest grows with value, star appeal and average rating
    const pull = (this.player.value / 100000) + this.player.starAppeal / 40 + (avgRating - 6) * 2;
    const count = pull > 6 ? 2 : pull > 3 ? (Math.random() < 0.8 ? 1 : 0) : Math.random() < 0.25 ? 1 : 0;
    const offers: TransferOffer[] = [];
    const candidates = shuffle(pool).slice(0, count);
    for (const c of candidates) {
      const fee = Math.round(this.player.value * (1.1 + Math.random() * 0.4));
      const salary = Math.round(this.player.salary * (1.4 + (c.strength - myStrength) / 25) * (0.9 + Math.random() * 0.4));
      offers.push({ from: c.name, fee, salary: Math.max(salary, this.player.salary + 150), strength: c.strength });
    }
    return offers;
  }

  acceptOffer(index: number): string {
    const offer = this.pendingOffers[index];
    if (!offer) return 'No such offer.';
    this.player.club = offer.from;
    this.player.salary = offer.salary;
    this.player.value = Math.round(offer.fee * 0.85);
    this.player.peakValue = Math.max(this.player.peakValue, this.player.value);
    this.relationships.boss = 55;
    this.relationships.teammates = 50;
    this.relationships.fans = clamp(30 + Math.round(offer.strength / 3), 30, 80);
    this.player.energy = clamp(this.player.energy + 25, 0, 100);
    this.pendingOffers = [];
    this.pushNews(`✍️ DONE DEAL: ${this.player.name} signs for ${offer.from} for $${offer.fee.toLocaleString()}!`);
    this.currentScreen = 'dashboard';
    this.save(true);
    return `Welcome to ${offer.from}!`;
  }

  rejectOffers(): string {
    this.pendingOffers = [];
    this.currentScreen = 'dashboard';
    this.relationships.fans = clamp(this.relationships.fans + 3, 0, 100);
    this.pushNews(`💙 ${this.player.name} turns down all offers — loyalty rewarded by the fans.`);
    return 'Offers rejected. You stay.';
  }

  /** Career over. */
  retireNow(): string {
    this.player.age = this.player.retiringAge;
    this.wrapSeason();
    this.currentScreen = 'retired';
    return 'Career ended.';
  }

  newGame() {
    this.player = structuredClone ? structuredClone(BASE_PLAYER) : JSON.parse(JSON.stringify(BASE_PLAYER));
    this.relationships = structuredClone ? structuredClone(BASE_RELATIONSHIPS) : JSON.parse(JSON.stringify(BASE_RELATIONSHIPS));
    this.week = 1;
    this.season = 1;
    this.weekOfSeason = 1;
    this.inventory = new Map();
    this.activeEffects = [];
    this.history = [];
    this.news = [];
    this.trophies = [];
    this.pendingOffers = [];
    this.currentMatch = null;
    this.lastLog = null;
    this.careerBestFinish = 20;
    this.seasonEnded = false;
    this.currentScreen = 'dashboard';
    this.newSeason(true);
    try { localStorage.removeItem('nss_save'); } catch { /* ignore */ }
  }

  updateLeagueTable(home: string, away: string, hg: number, ag: number) {
    const homeEntry = this.leagueTable.find((e) => e.team === home);
    const awayEntry = this.leagueTable.find((e) => e.team === away);
    if (!homeEntry || !awayEntry) return;
    homeEntry.played++;
    awayEntry.played++;
    homeEntry.gf += hg;
    homeEntry.ga += ag;
    awayEntry.gf += ag;
    awayEntry.ga += hg;

    if (hg > ag) {
      homeEntry.won++;
      homeEntry.points += 3;
      awayEntry.lost++;
    } else if (hg === ag) {
      homeEntry.drawn++;
      homeEntry.points += 1;
      awayEntry.drawn++;
      awayEntry.points += 1;
    } else {
      awayEntry.won++;
      awayEntry.points += 3;
      homeEntry.lost++;
    }

    this.leagueTable.sort((a, b) => b.points - a.points || (b.gf - b.ga) - (a.gf - a.ga) || b.gf - a.gf);
  }

  // ─── Casino ───
  casinoSlots(bet: number): { result: string; win: number } {
    if (bet > this.player.money) return { result: 'Not enough money!', win: 0 };
    this.player.money -= bet;
    const symbols = ['⚽', '🏆', '⭐', '💰', '🍀'];
    const roll = [symbols[Math.floor(Math.random() * 5)], symbols[Math.floor(Math.random() * 5)], symbols[Math.floor(Math.random() * 5)]];
    let win = 0;
    if (roll[0] === roll[1] && roll[1] === roll[2]) {
      win = bet * 5;
    } else if (roll[0] === roll[1] || roll[1] === roll[2] || roll[0] === roll[2]) {
      win = bet * 2;
    }
    this.player.money += win;
    return { result: `[${roll.join(' ')}]`, win };
  }

  casinoBlackjack(bet: number, action: 'hit' | 'stand', playerHand: number[]): { result: string; win: number; hand: number[]; finished: boolean } {
    if (bet > this.player.money && playerHand.length === 0) {
      return { result: 'Not enough money!', win: 0, hand: [], finished: true };
    }
    if (playerHand.length === 0) this.player.money -= bet;

    const draw = () => Math.floor(Math.random() * 10) + 1;
    let hand = [...playerHand];
    if (action === 'hit') hand.push(draw());

    const sum = hand.reduce((a, b) => a + b, 0);
    if (sum > 21) {
      return { result: `Bust! (${sum})`, win: 0, hand, finished: true };
    }

    if (action === 'stand') {
      let dealer = 0;
      while (dealer < 17) dealer += draw();
      if (dealer > 21 || sum > dealer) {
        this.player.money += bet * 2;
        return { result: `You win! (${sum} vs dealer ${dealer})`, win: bet * 2, hand, finished: true };
      } else if (sum === dealer) {
        this.player.money += bet;
        return { result: `Push (${sum})`, win: bet, hand, finished: true };
      } else {
        return { result: `Dealer wins (${sum} vs ${dealer})`, win: 0, hand, finished: true };
      }
    }

    return { result: `Hand: ${sum}`, win: 0, hand, finished: false };
  }

  // ─── Utilities ───
  setScreen(screen: Screen) {
    this.currentScreen = screen;
  }

  save(silent = false): string {
    const data = JSON.stringify({
      version: 2,
      player: this.player,
      relationships: this.relationships,
      week: this.week,
      season: this.season,
      weekOfSeason: this.weekOfSeason,
      seasonGoals: this.seasonGoals,
      seasonAssists: this.seasonAssists,
      seasonRatingSum: this.seasonRatingSum,
      seasonRatingCount: this.seasonRatingCount,
      inventory: Array.from(this.inventory.entries()),
      activeEffects: this.activeEffects,
      history: this.history,
      fixtures: this.fixtures,
      leagueTable: this.leagueTable,
      news: this.news,
      trophies: this.trophies,
      pendingOffers: this.pendingOffers,
      lastLog: this.lastLog,
      careerBestFinish: this.careerBestFinish,
      seasonEnded: this.seasonEnded,
      currentScreen: this.currentScreen === 'match' ? 'dashboard' : this.currentScreen,
    });
    try {
      localStorage.setItem('nss_save', data);
      return silent ? '' : 'Game saved!';
    } catch {
      return silent ? '' : 'Save failed (storage unavailable).';
    }
  }

  load(): boolean {
    let raw: string | null = null;
    try {
      raw = localStorage.getItem('nss_save');
    } catch {
      return false;
    }
    if (!raw) return false;
    try {
      const data = JSON.parse(raw);
      if (data.version !== 2) return false;
      this.player = data.player;
      this.relationships = data.relationships;
      this.week = data.week;
      this.season = data.season;
      this.weekOfSeason = data.weekOfSeason;
      this.seasonGoals = data.seasonGoals ?? 0;
      this.seasonAssists = data.seasonAssists ?? 0;
      this.seasonRatingSum = data.seasonRatingSum ?? 0;
      this.seasonRatingCount = data.seasonRatingCount ?? 0;
      this.inventory = new Map(data.inventory);
      this.activeEffects = data.activeEffects;
      this.history = data.history;
      this.fixtures = data.fixtures;
      this.leagueTable = data.leagueTable;
      this.news = data.news ?? [];
      this.trophies = data.trophies ?? [];
      this.pendingOffers = data.pendingOffers ?? [];
      this.lastLog = data.lastLog ?? null;
      this.careerBestFinish = data.careerBestFinish ?? 20;
      this.seasonEnded = data.seasonEnded ?? false;
      this.currentScreen = (data.currentScreen as Screen) || 'dashboard';
      return true;
    } catch {
      return false;
    }
  }
}

// Singleton export
export const gameState = new GameState();
