# ResQ Design System & Style Guidelines
*Permanent Rule for ResQ Emergency Response Platform*

This specification defines the strict visual language and UI architecture for ResQ. All components, screens, workflows, and future steps must strictly comply with these rules.

---

## 1. Color Palette

The interface is engineered to evoke high-trust, mission-critical operational reliability. Colors are deliberate, utilitarian, and calm.

### Core Interface Tokens
| Role | Color Name | Hex Code | Purpose / Application |
| :--- | :--- | :--- | :--- |
| **Header / Heavy Text** | Ink Navy | `#0F2A3D` | Primary headers, top navigation background, strong typography |
| **Primary Accent** | Deep Teal | `#1F6F78` | Primary action buttons, active navigation states, key telemetry indicators |
| **Accent Light** | Teal Light | `#E6F1F2` | Subtle badges, selected tab highlight, alert info backdrops |
| **App Background** | Warm Off-White | `#F7F5F1` | Page background, root canvas behind cards and containers |
| **Surface** | Pure White | `#FFFFFF` | Cards, tables, modal surfaces, sheet panels, dropdowns |
| **Border** | Muted Grey-Beige | `#E2DED6` | 1px borders dividing all operational surfaces, cards, and inputs |
| **Muted Text** | Slate Muted | `#5B6770` | Secondary labels, timestamps, metadata, help captions |

### Severity Spectrum (Muted, Never Saturated)
Alerts, incident priorities, and hazard zones must use muted, disciplined tones to prevent sensory fatigue in command-center settings:

| Level | Hex Code | Tailwind Token | Semantic Meaning |
| :--- | :--- | :--- | :--- |
| **Critical** | `#B42318` | `severity-critical` | Life-threatening hazard, immediate evacuation, trapped civilians |
| **High** | `#B54708` | `severity-high` | Rapidly rising water, road cut off, high priority response |
| **Medium** | `#A16207` | `severity-medium` | Waterlogged road, advisory watch, low-lying caution |
| **Low / Safe** | `#3B7A57` | `severity-low` | Normal drainage, resolved incident, safe shelter operating |

---

## 2. Gradient Usage Rule

- **Allowed Gradient**: Exactly one gradient is permitted across the entire platform:
  `linear-gradient(135deg, #0F2A3D 0%, #1F6F78 100%)`
- **Permitted Locations**:
  1. Top Global Navigation / App Bar
  2. Authentication / Login Hero Container
- **Forbidden**: Any other gradient, mesh gradients, rainbow accents, glowing shadows, or background radial washes are strictly prohibited. Everything else must use flat solid colors.

---

## 3. Typography

- **UI & Body Typography**: **Inter** (`font-sans`)
  - Clean, legible humanist grotesque typeface designed for dense data display.
  - Scale: Clear, modest hierarchy (`text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`). No oversized marketing display headings.
- **Incident IDs & Metrics**: **JetBrains Mono** (`font-mono`)
  - Used for incident identifiers (e.g., `FQ1024`), coordinates, timestamps, water levels, telemetry values, and counts.
  - Ensures clean column alignment and zero visual ambiguity between numerals and letters.

---

## 4. Layout, Spacing & Styling System

- **Borders**: Crisp **1px borders** (`border border-app-border` or `#E2DED6`) instead of heavy, fuzzy drop shadows.
- **Corner Radii**: Strictly **6px to 8px** (`rounded-md` or `rounded-lg`). No pill shapes for cards, no sharp 0px raw edges.
- **Spacing Grid**: Standard **8px grid** (`p-2`, `p-4`, `p-6`, `gap-2`, `gap-4`, `gap-8`).
- **Icons**: Icons are sourced exclusively from **Lucide React**. No emojis, no custom decorative SVG blobs.
- **Buttons**: Solid, tactile buttons with clear hover states and accessible focus rings (`focus:ring-2 focus:ring-teal-deep focus:ring-offset-1`).
- **Prohibited Aesthetics**:
  - No glassmorphism / frosted glass backdrop blurs.
  - No neon glows or pulsating neon rings.
  - No decorative gradients or amorphous blobs.
  - No purple or bright neon colors.
  - No decorative emojis in headers, badges, or buttons.
- **Tone**: Plain, functional, disciplined emergency operations tool built for high stress and clear rapid decision-making.
- **Dark Mode**: Not required.
