# Account resume: @gandolfi_luca

Portable snapshot for the Instagram skill pack. Keep this in the repo so a
fresh install on another machine has the account context without logging in.

**Snapshot date:** 2026-10-23
**Profile:** https://www.instagram.com/gandolfi_luca/
**Source:** screenshot of the logged-in profile supplied by the account owner.
No login was performed by the agent, and this file contains no credentials.

> Security: never add the password, 2FA codes, backup codes, session cookies, or
> recovery email here. This file is meant to be committed.

---

## Identity

| Field | Value |
| --- | --- |
| Name field | `Luca Gandolfi` plus a small badge (not a searchable description) |
| Handle | `@gandolfi_luca` |
| Threads chip | `@gandolfi_luca` |
| Location | Fidenza (PR), Italy |
| Account type | Professional (dashboard/insights present) |
| Category | not visible in the snapshot |
| Contact | no public email or contact button seen |

## Stats at snapshot

| Metric | Value |
| --- | --- |
| Posts | 891 |
| Followers | 1,334 |
| Following | 1,655 |
| Views, last 30 days | 77,457 |
| Best recent reel | the rose-bite reel, 12k plays |

Following exceeds followers, and the 30-day view count is the strongest signal
that the account is active.

## Current bio (verbatim)

```text
Fidenza(PR), Italy 🇮🇹
Computer Engineering student 💻
@alten__group Aerospace&Defence 🚀
Film producer 🎥
Pianist 🎹
#spreadingmadness
#spreadingbeauty
```

## Highlights (visible, left to right)

```text
Nuova · Escapril2024 · Escapril2023 · Torneo Bellezza · Escapril2022 · (one cut off, "S…")
```

Event archives, not buyer questions. Covers are consistent.

## Pinned / top of grid

1. Napoleon-style painting with a green bottle, comedic costume edit.
2. Shirtless man in a field with a gin bottle balanced on his shoulder.
3. Man in a suit biting a rose, holding a glass, 12k plays.

Two posts show pushpin icons and the first shows a badge. All three are comedy
proof; none explains an offer or introduces the person.

## Grid and photo

- Covers are faces, costumes and props. No text, chosen as stills rather than
  designed covers. The humour reads at thumbnail size; the account's purpose
  does not.
- Profile photo: stylised portrait, side angle, one arm raised, face roughly
  35% of the circle.

## Style and themes

- Absurdist comedy shot with film-production polish.
- Recurring signatures: `#spreadingmadness`, `#spreadingbeauty`.
- Background facts used in the bio: computer engineering student, aerospace and
  defence (Alten), film producer, pianist.
- Language: profile text is English with Italian location; audience appears
  Italian. Pick one language for copy and stay in it.

## Offer status

No offer is defined. Decide one of these before rewriting the link or the
pinned posts:

1. **Creator account** - the goal is reach and follows. The link is then a
   showreel or a hub, and the CTA is "follow".
2. **Video work** - the goal is inbound production jobs. The link is a single
   showreel, the CTA is "DM", and one pin must explain what a client gets.

The audit assumes option 2.

## Audit score at snapshot: 38/100

| Item | Score | Note |
| --- | --- | --- |
| name field | 3/12 | name and badge, no words anyone searches |
| bio first line | 1/12 | location, not who it is for or what changes |
| bio body | 2/8 | four identities, emoji, hashtags, no proof or offer |
| pinned three | 4/10 | 2-3 pinned, all comedy bits, no offer, no intro |
| link | 0/8 | no link at all |
| highlights | 4/8 | consistent, but named for old events |
| grid legibility | 3/8 | joke reads, account purpose does not |
| photo | 3/6 | face small in the circle, side angle |
| handle | 5/6 | readable, sayable, one underscore |
| category/contact | 3/6 | professional, but no category or email visible |
| recent activity | 8/10 | 77.4k views in 30 days |
| story presence | 2/6 | not verifiable from own profile |

## Recommended rewrites (copy-ready)

Name field, pick one (30 characters max):

```text
Luca Gandolfi | Video comici
Luca Gandolfi | Film comici
Luca Gandolfi | Comic films
Luca Gandolfi | Absurd on film
```

Bio, Italian:

```text
Comicità assurda, girata come un film.
La rosa ha fatto 12mila visualizzazioni.
Giro anche video per brand. Scrivimi.
```

Bio, English:

```text
Absurd comedy, shot like a film.
The rose one did 12k plays, which still feels fake.
I shoot brand videos too. So DM me.
```

Highlights:

```text
Chi sono · Dietro le quinte · Video / Lavori · Collab · 2024 (archive)
```

Pinned jobs:

```text
1. Proof      the rose reel (12k plays) - already pinned
2. The work   a 15-30s showreel: three clips, one sentence on what is delivered
3. The person a 30s talking-head "who I am"
```

Link: one destination, not a link tree. Showreel or a single page with the reel
and a contact. Add a category that matches the offer and an email that is read.

Grid covers: same font, same corner, three or four words, e.g. `ROSA IN BOCCA`,
`NAPOLEONE`, `GIN IN CAMPO`.

Projected re-score if all field changes are made: **76/100**. The rest needs a
new intro reel, a week of stories, redesigned covers, and a link.

## Checklist

- [ ] Change the name field to include searchable words
- [ ] Replace the bio with the proof + offer version
- [ ] Add one link
- [ ] Rename and trim the highlights
- [ ] Pin a showreel and a talking-head intro
- [ ] Redesign the first nine covers with short text
- [ ] Crop the profile photo closer
- [ ] Set category and contact email
- [ ] Decide creator vs video-work positioning
- [ ] Fill `voice.md` (see below)

## Restore on another computer

1. Clone the repository and install the pack:

   ```bash
   git clone <this-repo>
   cd random2/instagram-agent-opencode
   ./install.sh
   ```

2. Restart opencode.

3. Give the skills the account context. Either keep this file in the repo and
   reference it, or copy it into the state directory:

   ```bash
   mkdir -p ~/.config/opencode/instagram
   cp accounts/gandolfi_luca.md ~/.config/opencode/instagram/account.md
   ```

4. Fill in `~/.config/opencode/instagram/voice.md`. The installer seeds a blank
   template and never overwrites an existing one. Paste three reels or captions
   and ask: "write my voice.md from these".

5. Run `/ig-profile` and paste this file to resume with the same context.

## The short version to paste into a new chat

```text
Account @gandolfi_luca (Luca Gandolfi, Fidenza, Italy). Professional account.
891 posts, 1,334 followers, 1,655 following. 77,457 views in the last 30 days.
Absurdist comedy with film-production polish. Signatures: #spreadingmadness,
#spreadingbeauty. Bio is an identity list (engineering student, Alten
Aerospace & Defence, film producer, pianist) with no link and no offer.
Top pins are comedy bits; best proof is a 12k-play rose reel. Audit 38/100.
Undecided: creator account vs selling video work. Copy in Italian or English,
not both.
```
