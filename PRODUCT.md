# TosiDrop

TosiDrop is a Cardano rewards application. Its existing navigation connects wallet profiles and claims with token discovery, analytics, pools and documentation. Users connect a wallet to review and sign claims; deployment network and wallet network remain explicit.

## Product context

The reward extension adds discovery filters, locally saved watched wallets, a reward calendar and reminders, and NFT reward presentation. The approved direction is polished, friendly UI within the existing TosiDrop identity. This document records the existing application and approved extension; it introduces no new audience research or marketing claims.

- Discovery supports search, project/pool filters, actual added dates and connected-wallet availability. Missing data stays unknown.
- Watched wallets are a separate read-only surface. Local entries are network-scoped; watching an address preserves connected-wallet and signing state. A matching connected wallet signs claims.
- Calendar dates distinguish project announcements from labelled epoch estimates. Estimates support planning; eligibility, amounts and payout timing depend on project rules. Agenda, desktop month view and ICS export support planning outside the app.
- Calendar reminders require an explicit opt-in. Closed-site Web Push and existing wallet reward polling have separate purposes and availability states.
- NFT rewards retain explicit asset identity and metadata, artwork fallbacks, existing selection limits, preferences and wallet signing.

## Data and operational boundaries

Approved project owners publish dated announcements through network-bound wallet signatures. Source availability is visible; unavailable sources produce partial or unavailable states. Browser push implementation requires the calendar migration, VAPID configuration and reminder Worker activation before service can be available. It remains disabled pending that setup.

The SDK's separate `nfts[]` record shape remains unverified. Local implementation and synthetic fixtures establish application behavior within their tested contracts; they establish no production SDK response or live payout result.

## Evidence and remaining validation

Source: `src/layouts/navigation.ts`, the current feature components, and `docs/superpowers/specs/2026-10-29-reward-experience-design.md`.

Desktop browser flows were exercised with synthetic data. Chrome access failed before mobile captures at 320 and 390 CSS pixels. Full UI review remains pending. Code review findings were reported resolved in the implementation handoff; the root agent owns the final suite, build and lint evidence. This documentation records context and does not grant UI approval, deployment approval or production verification.
