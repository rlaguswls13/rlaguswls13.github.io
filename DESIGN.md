# Design System

## Research

The live CSS is the source of truth for this maintenance pass: preserve its calm-blue editorial palette, existing typography, layout, and component anatomy.

## Tokens

- Theme classes are `.theme-light` and `.theme-dark`; semantic colors use `--bg-*`, `--text-*`, `--accent-*`, `--border-color`, and `--card-shadow`.
- The current palette tokens are `--palette-ivory-*`, `--palette-charcoal-*`, `--palette-plum-*`, `--palette-sage-*`, `--palette-terracotta-*`, `--palette-ochre-*`, and `--palette-teal-*`.
- Timing uses `--primitive-duration-300` and `--transition-speed`; reduced motion makes nonessential effects instant.

## Type

`--font-sans` is Inter plus Noto Sans KR; `--font-mono` is JetBrains Mono plus Noto Sans KR. The active scale is `--type-caption`, `--type-meta`, `--type-small`, `--type-body`, `--type-card-title`, `--type-section`, and `--type-page`.

## Spacing

Keep the existing CSS component spacing and responsive breakpoints; no new spacing token is introduced by theme or motion behavior.

## Primitives

Navbar, theme toggle, cards, carousel tracks, loading placeholders, the article table-of-contents disclosure, project detail tabs, and the shared dialog surface remain the reusable primitives.

## States

Theme state is light by default or dark when the stored `theme` value is `dark`; the document class is resolved before hydration. Existing hover, focus-visible, active, loading, and dialog states remain unchanged.

## Motion

Normal preference retains existing transitions. `prefers-reduced-motion: reduce` removes nonessential theme, card, dialog, carousel, and loading animation or transition timing.

## Responsive

The current 375 px, 768 px, and 1280 px layouts are preserved; article table-of-contents content stays at the top of the article in a disclosure panel that defaults open, uses roughly two-thirds of the article width on desktop, and becomes full-width on small screens. Project child pages render as horizontally scrollable tabs with one visible panel. The 375 px hero clips only its off-canvas decorative orbit to prevent horizontal overflow.

## Accessibility

The theme control keeps its existing accessible name and visible focus treatment. Reduced-motion users receive immediate state changes while retaining all content and controls.

## Debt

No accepted design debt for this scoped change.
