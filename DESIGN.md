---
version: alpha
name: "LLMGate"
description: "A focused operations console for model routing, usage, and tenant budgets."
colors:
  background: "#09090b"
  surface: "#18181b"
  border: "#27272a"
  text: "#f4f4f5"
  muted: "#a1a1aa"
  primary: "#2563eb"
  focus: "#3b82f6"
  success: "#10b981"
  warning: "#f59e0b"
  danger: "#f87171"
typography:
  sans:
    fontFamily: "Geist, Arial, sans-serif"
  mono:
    fontFamily: "Geist Mono, ui-monospace, monospace"
rounded:
  DEFAULT: "0.5rem"
  lg: "0.75rem"
spacing:
  page-gutter: "2rem"
  section-gap: "1.5rem"
components:
  button: {}
  card: {}
  input: {}
  table: {}
---

# LLMGate Design System

## Overview

LLMGate is an operations console for the person administering an AI gateway. Its job is to make traffic, routing, spend, and access visible at a glance. The public entry and playground use the same dark zinc identity to let a visitor inspect one request without reaching private data. The routing trace is the signature across public and private surfaces, with a restrained color map for provider and query categories. Forms and account controls remain familiar and quiet.

The interface is English and desktop-first, but its forms and navigation must remain usable on a narrow screen. The public home can explain the product; operational views stay direct and data-led. Avoid decorative gradients outside the brand mark, chart colors without meaning, and promotional copy in operational views.

The frontmatter mirrors the Tailwind zinc and blue utilities used by the application. `src/app/globals.css` owns global font and scrollbar rules; Tailwind utility classes own component colors and spacing. A durable token change must update both this file and those runtime owners.

## Colors

Zinc 950 is the application background, zinc 900 the card surface, and zinc 800 the separator. Blue is the primary action and focus cue. Emerald marks successful states, amber warns, and red signals deactivation or failure. Never use color alone to communicate state; pair it with a label.

## Typography

Geist is the interface face and Geist Mono is reserved for API keys, IDs, prices, and other technical values. Headings use a modest size step; tables favor readable density over large display type. Avoid uppercase body copy; compact uppercase table labels are acceptable.

## Layout

The sidebar is the stable navigation owner on wide screens. Main content uses a maximum width and a two-rem page gutter. Cards use a 1.5-rem gap. Forms stack at narrow widths. Wide tables may scroll horizontally, with visible overflow and readable cell values.

## Elevation & Depth

Borders and tonal surfaces carry hierarchy. Shadows are reserved for overlays and the sign-in card; routine dashboard cards stay flat.

## Shapes

Inputs and buttons use a half-rem radius; cards use three-quarter-rem. Charts and tables follow the same card edge language.

## Components

Actions name their effect: Create tenant, Generate key, Deactivate, Reactivate, Save budget. Busy buttons keep their width and show a textual state. Errors appear near the operation with a corrective hint; API keys appear only immediately after creation. Loading states reserve the eventual layout. Empty states explain the next action. Focus must remain visible on controls and links.

The tenant picker uses a native Select/Listbox. Its operating-system popup is acceptable here because option labels are short and no custom popup geometry is part of the interface.

The public trace uses the same zinc surfaces, blue focus/action color, and monospace data labels as the admin dashboard. Its numbered steps describe the actual access → route → response sequence. Saved scenarios and public sample metrics must display their illustrative status wherever they appear. Live request telemetry must reflect the completed request rather than the initially selected route when failover occurs.

Model routing labels use human-readable names alongside the exact model ID. The overview states the configured simple, code, and complex routes; request rows and traces show the model that actually answered, including fallback.

## Do's and Don'ts

- Do show remaining budget as a balance, not an original allocation.
- Do keep one-time keys visually distinct from ordinary table data.
- Don't silently clear form input after a failed request.
- Don't describe soft deactivation as permanent deletion.
