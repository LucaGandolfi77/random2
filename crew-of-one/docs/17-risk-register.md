# 17 — Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Core loop isn’t fun | Medium | High | 3-day rectangle prototype; playtest; iterate before art |
| Ghosts feel like a cutscene | Medium | High | Make echoes active decoys; noise; multiple objectives; player agency |
| Puzzle design bottleneck | High | Medium | Tiled pipeline; mechanic ladder; solution tapes; level agent candidates |
| Mobile controls feel fiddly | Medium | High | Floating joystick vs tap-to-move test; generous radii; no twitch |
| Pixel art looks amateur | Medium | High | Art bible; one-vault vertical slice; commission a professional |
| Low-end performance | Low | Medium | Simple art; pre-render; pools; DPR cap; test week 2 |
| iOS PWA quirks | High | Medium | Test early; fallbacks; no vibration/orientation reliance |
| App Store rejects WebView wrapper | Medium | High | Native IAP, haptics, push, achievements; polished shell; Android first |
| Leaderboard cheating | Medium | High | Server replay validation; rate limits; tape hashes |
| Microtransaction conversion low | High | High | Free daily + share; bundle price tests; soft launch before spend |
| Content feels thin | Medium | High | 15 vaults + challenge modes + daily; add “Send a Ghost” |
| Replay bugs | Medium | High | Sim/render split; transforms/events; unit tests; solution tapes |
| Scope creep | High | High | v1 scope locked; “Send a Ghost” is v1.1 |
| AI-generated code quality | Medium | Medium | Tests, types, CI, human review, small PRs |
| AI art IP/licensing | Medium | High | Safe policy: AI drafts only; human/commissioned final; ledger |
| Legal/privacy gaps | Low | High | Terms, privacy, IAP policy, trademark, contractor agreements |
| Burnout (one human) | High | High | Agents for grunt work; fixed scope; weekly off; playtest energy |

## Kill/pivot criteria

- Prototype not fun after 3 iterations → change the mechanic.
- Art gate not met → fix style before producing 15 vaults.
- Demo conversion <2% after soft launch → rethink price/content.
- Backend validation too slow/costly → simplify to signed runs + spot checks.
