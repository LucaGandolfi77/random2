# ADR 0004 — Web checkout at launch

## Status
Accepted.

## Context
The game is free to download and earns only through in-game microtransactions. Web/PWA is the first platform, so the web build needs a purchase path from day one.

## Decision
Ship an in-game store at launch. Web purchases use Lemon Squeezy Checkout, validated by a Cloudflare Worker, with a signed entitlement token stored locally. Mobile uses Apple/Google IAP via RevenueCat. No external checkout links inside the iOS app.

## Consequences
- The PWA can monetize immediately instead of being demo-only.
- We need a license/restore flow and a 30-day offline grace period.
- Two payment integrations, one entitlement schema.
- Apple anti-steering rules must be respected.
