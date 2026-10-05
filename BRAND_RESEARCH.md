# Brand research: lottie.org public site

This is research for **Ayo Ahmed's independent audition prototype**. The prototype is not affiliated with or endorsed by Lottie, and it uses only synthetic data.

The aim was to make the Eliza Handoff Lab look like it could sit in Lottie's product family, while making clear it is *not* a Lottie product. Everything below was observed on Lottie's public home page. No Lottie assets were copied into this repo: no logo, illustrations, photos, pictograms or fonts.

## Sources

| What | Where | How |
| --- | --- | --- |
| Public home page | https://lottie.org/ | Loaded on 28 Sep 2026 in Chrome, using Playwright over CDP |
| Desktop viewport | 1440 × 900 | Above-the-fold and full-page screenshots, with the cookie dialog hidden in the DOM (not accepted) |
| Mobile viewport | 390 × 844, mobile UA, touch emulation | Above-the-fold, full-page and hamburger-menu screenshots |
| Computed styles | `getComputedStyle` on body, h1–h3, p, buttons, sections and cards | Font family, size, weight, line-height, colour, background, radius and padding |
| Design tokens | `:root` CSS custom properties, plus the site's Tailwind `lottie*` colour utilities from its loaded stylesheets | Listed below |

The screenshots are attached to the PR for review. They are not committed to the repo.

## Observed tokens

### Colour
The site pairs a soft pink with a mint secondary, on white, with near-black ink.

| Token (site name) | Value | Observed use |
| --- | --- | --- |
| `--primary` / `lottiePink700` | `#EE2F7B` | Primary: cookie "Accept all" button, focus ring (`--ring`) |
| `lottiePink500` | `#F68EB7` | Wordmark fill (sampled from the pixels), "Search" button, round chevron buttons, active segmented tab |
| `lottiePink300` | `#FBD0E1` | Hero section background |
| `lottiePink200` | `#FDE3ED` | Value-prop strip under the hero, "Meet Lottie" video frame, "Find the right care" CTA note |
| `lottiePink100` / `--accent` | `#FEECF3` | Soft accent surface |
| `lottieMint200` | `#CAF7E8` | "Free personalised shortlist" feature card, testimonial cards |
| `lottieMint500` | `#82EDC9` | "View All" button, "Excellent rating" chip |
| `lottiePastel500` | `#FFEBCE` | "Organise urgent care" feature card, category card |
| `lottieBlue50` | `#D1E7FF` | "Free Expert Support" feature card, nursing-care card |
| `lottieBlue500` | `#0065D0` | Info icons ("What is residential care?") |
| `lottieGrey900` | `#101828` | Headline ink, dark CTA buttons ("Request free shortlist →") |
| `lottieGrey700` | `#344054` | Secondary text in controls |
| `lottieGrey300` | `#D0D5DD` | Card borders |
| `lottieGrey200` | `#EAECF0` | Hairline dividers, borders (the most common background/border value on the page) |
| `--surface` | `#FAF8F6` | Footer band |
| `--success` / `--success-bg` | `#117856` / `#C0F6E4` | Success state |
| `--destructive` / `--destructive-bg` | `#DC2626` / `#FEE2E2` | Error state |
| `--warning` / `--warning-bg` | `#D97706` / `#FEF3C7` | Warning state |
| Trustpilot green | `#00B67A` (approximate, from its badge) | Third-party badge only. Not used here. |

### Type
- **Family:** `elzaFont` (weights 400, 600, 700 and 900 loaded) is used for everything. Elza is a commercial typeface, so it is **not** used here. The prototype uses **Figtree** (SIL OFL 1.1, bundled in `public/vendor/`). It is a similar geometric grotesque with a 900 weight.
- **H1:** 36/40 px, weight 900, `#101828`. On mobile, 28/36 px.
- **Section H2:** 28/36 px, weight 900. Display H2s ("Meet Lottie", "Why do families love Lottie?") are 48/56 px, weight 900.
- **H3 (card titles):** 18–20/24 px, weight 900. Value-prop H3s are 16–18 px.
- **Body:** 16/24 px, weight 400, black. Card copy is 14/20 px, and small print is 12/18 px.
- **Buttons and nav:** 14–16 px, weights 500–700. Nav links are bold, sentence-case labels with a chevron.
- **Tone:** very heavy headlines against light body text. Headlines are short and plain-English ("Organise urgent care", "Free Expert Support").

### Shape and spacing
- `--radius` is 10 px. Feature and testimonial cards use **16 px** (`rounded-2xl`), buttons use 4–6 px, and segmented pills and chips are fully rounded (`9999px`).
- Cards are **flat, with no shadows**. They use either a pastel fill with no border (feature and testimonial cards) or white with a 1 px `#EAECF0`/`#D0D5DD` border (link cards and "Why families love Lottie" cards).
- The container is about 1366 px wide with about 27 px side padding. Sections have 40 / 80 / 128 px top padding at the sm / md / lg breakpoints, separated by full-width 1 px hairlines.
- The header is white, about 80 px tall, with the pink wordmark on the left and bold nav links on the right. Vertical hairline separators set apart "Partner With Lottie" and "Account".

### Components and visual cues
- **Hero:** a full-bleed pink band with a centred 900-weight headline, then a white search bar with segmented pill toggles and a pink search button.
- **Value-prop strip:** three columns on a lighter pink band, each with a line pictogram, a bold title and a short line of copy.
- **Feature cards:** three pastel cards (mint, pastel peach, blue), each with a bold title, a sentence and a full-width **dark `#101828` button ending in "→"**.
- **Link cards:** white bordered rows with a label on the left and a **round pink chevron button** on the right.
- **Sticky-note tiles:** pink square tiles holding black line icons (heart, house, smiley), overlaid on photography. One CTA card is slightly rotated with a dashed outline, like a note pinned to a board.
- **Pictograms:** black line drawings with small pink fill accents (piggy bank, house with people, "OPEN" sign, filter panel).
- **Illustrations:** loose hand-drawn line art of older people and carers, spot-filled with pink and bright yellow, on pastel cards.
- **Mobile:** a hamburger on the left, the wordmark centred and the account icon on the right. The menu is a full-screen white sheet with large bold links, chevrons and hairline dividers. Cards stack in one column, and the dark CTA buttons go full width.
- **Footer:** a warm `#FAF8F6` band with round black social icons.

## How this was applied, and what was deliberately not copied

| Observed cue | Used in the prototype | Kept distinct on purpose |
| --- | --- | --- |
| Pink 300/200/500/700 plus mint, peach and blue pastels, and `#101828` ink | Used as the palette in `public/style.css` (`--pink-*`, `--mint-*`, `--peach`, `--blue-*`, `--ink`) | — |
| Heavy 900 headlines over 400 body text | Figtree 900/800 for headings, 400 for body | Not the Elza typeface |
| Pink hero band and lighter value strip | Home hero and the "at a glance" strip | — |
| Pastel feature cards with dark "→" buttons | Home cards for the Playground, Provider setup and Evals | — |
| Round pink chevron link cards | Home "Start with these cases" and docs links | — |
| Sourced claims in product copy | Superscript source markers [1] and [2] on Home, plus a Sources list | Lottie facts are quoted only from public pages |
| Sticky-note pink icon tiles and the rotated note | Original inline-SVG icons on pink tiles, and the rotated disclaimer note | The icons were drawn for this repo. None of Lottie's pictograms are used. |
| Flat 16 px cards and hairlines | All panels | — |
| Mobile hamburger and full-screen menu | The same pattern for the app's nav | — |
| Wordmark | **Used at Ayo's explicit request** (see "Lottie logo asset" below). The official Lottie wordmark appears in the header, mobile menu and footer, separated by a hairline from the distinct "Eliza Handoff Lab / Independent prototype" name. | Lottie is not presented as the maker or endorser. Every disclaimer is kept, and the footer states that the logo is Lottie's mark and implies no endorsement. |
| Photos, illustrations, Trustpilot and press logos | **Not used** | These are Lottie's or third parties' assets and trust signals |

## Product language (public sources, read 28 Sep 2026)
Colour alone is not enough. The Home copy and the workflow labels were revised to match how Lottie publicly describes its products. Every business claim in the app links to one of these sources.

| Source | What it says (quoted or closely paraphrased) | Where it shows up in the app |
| --- | --- | --- |
| [Eliza role posting](https://jobs.ashbyhq.com/lottie/a11d79e7-a108-4128-9666-7410707b428d) | "Families use our marketplace to find care homes and home care. Care providers use Found, our software, to manage enquiries, occupancy and finances. Eliza is the AI agent inside Found. She answers calls and live chats from families enquiring about care, on behalf of the care provider, any time of day." | Home journey steps 1–2 and the "Answered on the provider's behalf" value |
| Posting | "a third of enquiries to care providers go unanswered", with the example of a family calling at 7pm | Home hero |
| Posting | "their phone trees, their out-of-hours cover, their weekend rotas, their CRM" | Journey step 3; Provider setup subtitle |
| Posting | "Knowing when to hand over… so neither side drops the family in between" | Journey step 4; handoff packet framing |
| Posting | "labelled call sets, automated scoring, regression tests before every release, and a human review loop"; metrics "containment, resolution, escalation, enquiry conversion, and provider trust"; "when a faster model is worth a slightly worse answer" | Journey step 5, the Evals subtitle, the Evals feature card and the v3 policy card |
| Posting | Call tracking: "number provisioning, routing, recording, transcription, and the attribution" | Journey step 2 (tracked synthetic numbers and sources) |
| [lottie.org](https://lottie.org/) | "The only directory to showcase care services with confirmed availability and detailed pricing"; free shortlists; urgent care requests | Journey step 1, marked "Context, not modelled" |
| [lottie.org/services-for-care-providers](https://lottie.org/services-for-care-providers/) | The partner portal lets providers "view enquiries … including contact details, residency requirements and funding information" | Informs the handoff-packet fields (caller, funding, source). Not presented as Lottie's format. |

### Wording corrections made in this pass
- "15 hand-labelled" is now "15 labelled synthetic enquiries". The labels are synthetic, not labelled by a care team.
- "Handoffs are only offered to people who are actually on shift" was true only of v2. It now says v2 checks the rota and v1 does not.
- "v3 is 700 ms faster" is now "declared latency budget 700 ms lower". Latency is a declared budget, not a measurement.
- "Playground: run a labelled synthetic conversation" is reframed around a family's enquiry and the provider team's handoff packet.
- The Home note now says explicitly that nothing here describes how Eliza or Found actually work.
- Not claimed anywhere: Lottie's customer numbers, Trustpilot ratings, funding, awards or partner quotes. They are real, but they are not needed to explain the handoff problem, and repeating them could read as endorsement.

## Lottie logo asset
- **What:** Lottie's official pink wordmark, `public/brand/lottie-logo.svg`.
- **Source:** the inline SVG `<symbol id="lottie-logo" viewBox="0 0 200 63">` embedded in the live https://lottie.org/ page and used there through `<svg viewBox="0 0 200 63"><use href="#lottie-logo"></use></svg>` in the header and footer. Fetched 28 Sep 2026.
- **Extraction:** the symbol's single `<path>` (`fill="#f68eb7"`, `fill-rule="evenodd"`) was copied byte for byte into a standalone `<svg viewBox="0 0 200 63">`. It was not redrawn, recoloured or modified. SHA-256 of the path `d` attribute: `db6428156c1c00cadf7b14a5602a03da5cb79ca51d1c09228cec133d7e8a1dc6`.
- **Ownership:** the mark belongs to Lottie (Lottie Organisation Ltd). It is used at Ayo's request to identify the product this prototype studies. This is not a licence, and it does not mean Lottie endorses the prototype.
- **Placement:** the header lockup (Lottie logo, hairline, "Eliza Handoff Lab / Independent prototype"), the mobile-menu header and the footer. The header link goes to this app's Home, not to lottie.org. The disclaimer banner, the Home note, the mobile-menu note and the footer disclaimer are unchanged.

## Disclaimer placement
Every view (Home, Playground, Provider setup, Evals and Docs) shares the same header. That header includes a high-contrast disclaimer bar: *Ayo Ahmed's independent audition prototype. Not affiliated with or endorsed by Lottie. Synthetic data only.* The footer repeats it, and the Home hero includes it as a pinned note.
