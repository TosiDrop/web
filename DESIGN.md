---
name: TosiDrop
description: Existing navy, cream and cyan rewards interface
colors:
  surface-base: "#0B1120"
  surface-raised: "#161B2E"
  surface-overlay: "#1C2237"
  surface-inset: "#0F1524"
  surface-sidebar: "#070D1A"
  border-subtle: "rgba(56, 78, 128, 0.35)"
  border-default: "rgba(56, 78, 128, 0.50)"
  border-strong: "rgba(56, 78, 128, 0.75)"
  text-primary: "#EDEEF2"
  text-secondary: "#C5C8D2"
  text-muted: "#8F95A8"
  text-faint: "#6F768C"
  cream: "#DCCFA8"
  cream-light: "#EDE4CB"
  accent: "#22D3EE"
  accent-light: "#67E8F9"
  accent-deep: "#06B6D4"
  accent-contrast: "#06181A"
  status-success: "#22C55E"
  status-error: "#EF4444"
  status-pending: "#F59E0B"
  status-pending-light: "#FBBF24"
typography:
  body:
    fontFamily: "Geist, ui-sans-serif, system-ui, -apple-system, Segoe UI, Helvetica, Arial, sans-serif"
  mono:
    fontFamily: "Geist Mono, ui-monospace, SFMono-Regular, Menlo, monospace"
  eyebrow:
    fontFamily: "Geist, ui-sans-serif, system-ui, sans-serif"
    fontSize: "11px"
    fontWeight: 600
    letterSpacing: "0.08em"
rounded:
  lg: "8px"
  xl: "12px"
  2xl: "16px"
spacing:
  card: "20px"
  section: "24px"
components:
  button-primary:
    backgroundColor: "{colors.accent}"
    textColor: "{colors.accent-contrast}"
    rounded: "{rounded.xl}"
    height: "44px"
    padding: "0 20px"
  button-secondary:
    backgroundColor: "rgba(255,255,255,0.04)"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.xl}"
    height: "44px"
    padding: "0 20px"
  card-inset:
    backgroundColor: "{colors.surface-inset}"
    rounded: "{rounded.2xl}"
---

# Design System: TosiDrop

## Overview

This is a scan of the incumbent interface, extended for reward discovery and planning. Blue-tinted navy layers carry the application; cream carries the umbrella identity and cyan marks actions. Geist keeps dense rewards information readable, with Geist Mono for values and asset identifiers. The user requested friendly, polished UI and preservation of this brand.

No new creative metaphor or visual identity was selected. Use the implemented tokens and component vocabulary as the authority. The original visual-world launcher failed with a permission error; code supplied the incumbent evidence.

## Colors

Cream belongs to the logo and identity. Cyan marks interactive actions and active navigation. Navy base, raised, inset, overlay and sidebar roles establish depth. Subtle, default and strong blue-tinted hairlines separate surfaces; preserve their source alpha values.

Primary and secondary text establish hierarchy; muted is the CSS-defined readable floor. Faint is reserved by the stylesheet for decorative or disabled content. Status colors carry success, errors and pending conditions. Certainty labels also use words so calendar meaning survives color differences.

## Typography

Use Geist for headings, body text, labels and controls. Use Geist Mono for quantities, addresses and asset identity; numeric values use tabular figures. The stylesheet declares an intended size vocabulary of 11, 12, 13, 14, 16, 20 and 30 pixels. Current components also contain exceptions, including the sidebar wordmark. Treat that vocabulary as incumbent guidance, with exceptions requiring inspection.

Eyebrow labels use uppercase text, semibold weight and spaced lettering. Page headings use semibold weight and tight tracking; supporting prose uses a relaxed line height and bounded width where implemented.

## Layout

The desktop shell has a fixed sidebar (240px), sticky top bar (64px) and centered content capped at Tailwind's max-w-6xl. Main content uses 20px horizontal padding and 32px vertical padding, increasing to 36px and 40px at the large breakpoint. At that breakpoint (1024px), the sidebar becomes persistent; smaller layouts use a dialog drawer.

Cards commonly use 20px content padding or 24px section padding. Responsive grids, wrapping controls and breakable asset identifiers accommodate narrow widths. Source-defined responsive behavior still requires rendered verification at 320 and 390 CSS pixels.

## Elevation & Depth

Raised cards use a subtle vertical navy gradient, hairline border, inset highlight and soft shadow. Inset wells use the recessed navy role. Menus and drawers use the pop shadow. The top bar layers translucent navy over a blurred background; the shell has a restrained blue radial glow.

Global keyboard focus uses a cyan outline (2px with 2px offset). The button primitive supplies its own cyan focus ring. Reduced-motion preferences shorten animations and transitions globally. Skeletons use the existing subtle shimmer.

## Shapes

Raised and inset cards use gently rounded corners (16px). Standard content buttons use 12px corners; compact buttons, navigation links and calendar fields use 8px corners. Account and connect-wallet controls use pill silhouettes. Preserve these contextual distinctions.

## Components

Buttons come from GradientButton and its shared class helper: primary, secondary, ghost and danger variants. Content actions are 44px tall; compact actions are 36px. Disabled buttons reduce opacity and use a disabled cursor. Calendar controls currently have a local outlined style with a 44px minimum height.

Card is the shared raised/inset surface. Navigation groups wallet tasks, discovery, participation and resources. Current links have an active background, cyan icon and aria-current; the mobile drawer includes labelled open/close controls.

Fields use inset backgrounds, default borders and primary text. Calendar rows expose expansion state and label dates as Announced date or Epoch estimate. NFT cards use artwork, explicit identity, selection and recovery fallbacks. These feature patterns extend existing cards and controls.

## Do's and Don'ts

- Do preserve the navy, cream and cyan identity and existing logo.
- Do use words with status colors, maintain visible keyboard focus and respect reduced motion.
- Do reuse shared buttons and card surfaces when extending the application.
- Do reserve faint text for decorative or disabled content, following the stylesheet's role definition.
- Don't replace brand cream with an action color or invent a competing visual identity.
- Don't treat synthetic desktop captures as approval of mobile layouts or production flows.

Sources: `src/index.css`, `src/lib/button.ts`, `src/components/common/{Card,GradientButton}.tsx`, the shell/navigation components and current reward extension components. Full UI review remains pending.
