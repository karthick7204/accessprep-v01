---
name: Government Accessibility Portal
colors:
  surface: '#f9f9ff'
  surface-dim: '#cfdaf2'
  surface-bright: '#f9f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f0f3ff'
  surface-container: '#e7eeff'
  surface-container-high: '#dee8ff'
  surface-container-highest: '#d8e3fb'
  on-surface: '#111c2d'
  on-surface-variant: '#434655'
  inverse-surface: '#263143'
  inverse-on-surface: '#ecf1ff'
  outline: '#747686'
  outline-variant: '#c4c5d7'
  surface-tint: '#2151da'
  primary: '#0037b0'
  on-primary: '#ffffff'
  primary-container: '#1d4ed8'
  on-primary-container: '#cad3ff'
  inverse-primary: '#b7c4ff'
  secondary: '#565e74'
  on-secondary: '#ffffff'
  secondary-container: '#dae2fd'
  on-secondary-container: '#5c647a'
  tertiary: '#004f35'
  on-tertiary: '#ffffff'
  tertiary-container: '#006948'
  on-tertiary-container: '#76eab6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dce1ff'
  primary-fixed-dim: '#b7c4ff'
  on-primary-fixed: '#001551'
  on-primary-fixed-variant: '#0039b5'
  secondary-fixed: '#dae2fd'
  secondary-fixed-dim: '#bec6e0'
  on-secondary-fixed: '#131b2e'
  on-secondary-fixed-variant: '#3f465c'
  tertiary-fixed: '#85f8c4'
  tertiary-fixed-dim: '#68dba9'
  on-tertiary-fixed: '#002114'
  on-tertiary-fixed-variant: '#005137'
  background: '#f9f9ff'
  on-background: '#111c2d'
  surface-variant: '#d8e3fb'
typography:
  headline-xl:
    fontFamily: Inter
    fontSize: 36px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-lg:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 38px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: 0em
  headline-md:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '600'
    lineHeight: 30px
    letterSpacing: 0em
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
    letterSpacing: 0.01em
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 26px
    letterSpacing: 0.01em
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 22px
    letterSpacing: 0.02em
  label-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: 0.02em
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.03em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2rem
---

## Brand & Style

This design system delivers a standardized, resilient, and rigorous testing environment engineered specifically for candidates preparing for civil service and government competitive examinations, with full optimization for blind, low-vision, and assistive-technology-reliant users. The interface embodies institutional trust, unwavering stability, and non-distracting functional efficiency. 

Drawing from modern public sector design standards, the aesthetic balances high-contrast utilitarianism with precise digital clarity. Decorative ornaments, ambiguous metaphors, and ungrounded motion are entirely rejected in favor of structured linear reading paths, predictable visual hierarchy, and robust keyboard/screen-reader feedback. The visual atmosphere is calm, authoritative, and focused—instilling confidence and reducing cognitive fatigue during high-stakes study and assessment sessions.

## Colors

The color palette is engineered around WCAG 2.1 Level AAA (7:1 contrast) standards for key transactional flows and Level AA (4.5:1) minimums for all secondary interface elements. The primary sapphire blue (`#1D4ED8`) commands action zones, critical focus rings, and confirmed selections, maintaining exceptional readability against pure white and neutral slate backgrounds. Deep slate and navy tones (`#0F172A` and `#1E293B`) establish text authority and structural grounding, ensuring that low-vision users do not struggle with light-gray text washouts.

Color is never utilized as the sole carrier of meaning:
- **Primary Action & Focus (`#1D4ED8`):** High-contrast anchor for interactive elements, focus states, and primary navigation links.
- **Structural Text & Badges (`#0F172A` / `#1E293B`):** Maximizes optical legibility against bright backgrounds.
- **Alert - Success / Mastery (`#059669`):** Accompanied by checkmark iconography and persistent text confirmation.
- **Alert - Review Needed (`#D97706`):** Paired with triangular caution glyphs and high-contrast dark text overlays.
- **Alert - Error / Incorrect (`#E11D48`):** Paired with octagonal cross glyphs and explicit screen-reader live announcements.
- **Structural Outlines (`#CBD5E1` and `#94A3B8`):** Crisp boundary markers separating complex exam options and time indicators.

## Typography

Typography prioritizes unmistakable character distinction, generous line heights (1.5x minimum for body text), and open letter spacing to assist candidates with visual fatigue or dyslexia. Inter's tall x-height, clear differentiation between glyphs (e.g., lowercase 'l', uppercase 'I', numeral '1'), and open apertures satisfy strict optical readability requirements.

All text dimensions are relative and respond dynamically to system-level zoom configurations up to 200% without truncating labels or breaking component containers. Headlines leverage medium-to-bold weights to maintain visible stroke weight under high-magnification software.

## Layout & Spacing

The layout is structured around an accessible 12-column responsive fluid grid with strict container constraints (maximum 1280px on desktop) to prevent uncomfortably long reading line lengths. For examination modules and long-form comprehension passages, line lengths are restricted to a maximum of 75 characters per line to guarantee ease of tracking with screen magnifiers.

- **Desktop (1024px and up):** 12-column grid, 2rem margins, 1.5rem gutters. Exam split-views keep navigation/timer panels pinned to the side, allowing uninterrupted central question processing.
- **Tablet (768px - 1023px):** 8-column grid, 1.5rem margins, 1rem gutters. Sidebars fold into high-contrast persistent toolbars.
- **Mobile (Below 768px):** 4-column linear vertical flow, 1rem margins, 1rem gutters. Elements stack vertically to ensure no horizontal scrolling occurs during exam navigation.
- **Target Sizes:** Touch and click target sizes adhere to a strict 48x48px physical bounding box with at least 8px spacing separation between adjacent targets to mitigate mis-taps.

## Elevation & Depth

To avoid visual noise, disorientation for low-contrast vision, and blurred raster artifacts under screen magnifiers, depth is communicated through distinct structural borders and high-contrast tonal layering rather than diffused drop shadows.

- **Baseline Canvas:** Solid `#FFFFFF` or `#F8FAFC` foundation.
- **Card and Interactive Containers:** Raised using clean 1.5px to 2px solid strokes (`#CBD5E1` or `#94A3B8`) against `#FFFFFF` surfaces.
- **Active Selection & Modals:** Highlighted via 2px solid sapphire borders (`#1D4ED8`) or dual high-contrast inner-offset outlines.
- **Focus Indication:** A persistent 3px solid focus perimeter (`#1D4ED8` or `#4338CA`) with a 2px light offset buffer (`#FFFFFF`) ensures that focused elements remain distinct regardless of background brightness. Shadows are strictly restricted to a single crisp focus perimeter without blur.

## Shapes

The design system implements a soft, disciplined corner radius (`roundedness: 1`, mapping to a base 0.25rem / 4px). This subtle rounding preserves the rigorous, formal identity demanded of national certification portals while softening sharp corners to assist visual tracking. 

- Form inputs, segmented answer options, and audio utility controls utilize `0.25rem` corners to retain clean geometric edges.
- Modal panels, alert banners, and master assessment cards use `rounded-lg` (0.5rem / 8px).
- Badges and status pills leverage `rounded-xl` (0.75rem / 12px) strictly to demarcate non-interactive categorical metadata from action buttons.

## Components

### Buttons & Interactive Triggers
- **Primary Buttons:** High-contrast sapphire background (`#1D4ED8`) with solid white text (`#FFFFFF`), 48px minimum height, and 16px horizontal padding. On focus, displays a 3px ring (`#1D4ED8`) with a 2px offset.
- **Secondary Buttons:** White background with a 2px border (`#1E293B`) and dark navy text (`#0F172A`).
- **Skip Navigation Links:** Hidden off-screen until focused; instantly animates to the top-center viewport with high-contrast `#0F172A` background and `#FFFFFF` bold text to allow immediate bypass to exam questions.

### Question & Multiple-Choice Options
- **Answer Selection Boxes:** Rendered as full-width interactive cards with an integrated ARIA radio role (`role="radio"`). 
- **States:** Default state features a 2px border (`#CBD5E1`). Focused state activates the 3px primary ring. Checked state transitions background to `#EFF6FF` with a 2px solid `#1D4ED8` border and an explicit high-contrast checked indicator icon alongside an audible screen-reader state update (`aria-checked="true"`).

### Voice-First & Audio Controls
- **Audio Toolbar:** Dedicated, sticky action bar providing "Read Question," "Push to Talk," and "Adjust Speed" controls.
- **Button Anatomy:** Tactile, distinct 48px square buttons featuring bold icons paired with persistent text captions below (e.g., "Read Aloud (Alt+R)"). Visual indicators pulsate with an accessible border-state change when audio is actively playing.

### Form Inputs & Text Fields
- Standard inputs display a 2px solid border (`#94A3B8`) on `#FFFFFF` with persistent label text placed strictly above the input field (never relying on placeholder text alone).
- Error states render a 2px border in `#E11D48` paired with an inline error message and `aria-invalid="true"`.

### Live Region Banners & Alerts
- Positioned above primary workflows using `role="status"` or `role="alert"` with `aria-live="polite"` (or `"assertive"` for countdown reminders).
- Styled with a left 6px accent border matching the semantic status token (`#059669`, `#D97706`, `#E11D48`) and accompanied by a corresponding high-contrast icon.

### Linear Data Tables
- Structured strictly with clean, high-contrast grid lines (1px `#CBD5E1`), explicit `<caption>` elements, and row/column headers (`<th scope="col">` and `<th scope="row">`) to enable screen-reader tabular navigation without structural ambiguity.