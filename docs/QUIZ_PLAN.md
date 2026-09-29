# Council Voting Quiz Plan

Status: proposed

This document describes a static, shareable quiz at `quiz.html` that asks a
visitor how they would vote on 12 major issues that divided Vancouver City
Council during the previous term. It will produce a party match and a
shareable URL of the form:

```text
results-{party}.html?votes=SOASSSSASA
```

The result page will be designed so that a social preview can show the matched
party's logo, while the browser can still recalculate the ranking from the
encoded answers.

## Product flow

1. `quiz.html` opens with a short explanation of the quiz, its relationship to
   the scorecard, and a clear start button.
2. The quiz presents every issue exactly once in the fixed order stored in
   `data/key_issues.json`.
3. Each issue appears as a focused card containing:
   - issue title;
   - short context;
   - image, when provided;
   - concise argument for;
   - concise argument against;
   - two choices: `Support` and `Oppose`.
4. The visitor can move forward and backward, with progress such as `3 of 12`.
   An answer is required before advancing; there is no skip option in the
   first release.
5. The final action calculates party similarity and navigates to the matching
   result page.
6. The results page shows:
   - `Your voting record would be most similar to`;
   - the top party, logo, and percentage match;
   - the remaining parties ranked by match percentage;
   - a short explanation of the method;
   - a prominent `Share` button;
   - a link to `index.html` for the full scorecard and councillor records.

## Data model

Add a quiz-specific source file, probably `data/key_issues.json`, rather than
overloading the existing `data/votes.csv`. The source should be valid JSON,
with quoted property names and JSON `null` values:

```json
{
  "id": "safeway-towers",
  "title": "Safeway Towers",
  "context": "3 rental towers with more than 1,000 homes beside Commercial-Broadway Station",
  "argumentFor": "Adds density and homes next to the most connected public transit nodes in Vancouver.",
  "argumentAgainst": "Major affordability and scale concerns. Neighbourhood opposition captured by the 'No Megatowers' lawn signs.",
  "image": {
    "src": "public/images/safeway-towers.png",
    "source": {
      "name": "Image source name",
      "url": "https://example.com/source"
    }
  },
  "partyPositions": {
    "onecity": "Support",
    "green": "Oppose",
    "cope": "Support"
  },
  "newsLink": ""
}
```

The currently proposed issue set is:

- Villages Plan — Housing
- Renters Office — Housing
- Safeway Towers — Housing
- Beach Avenue Bike Lane — Transportation
- Natural Gas in New Construction — Environment
- Bitcoin-Friendly City — Governance
- Abolishing the Park Board — Governance
- Increasing Police Budgets — Safety
- Zero-Means-Zero Budget — Affordability
- OPS in Downtown Vancouver — Safety
- Lower Speed Limits — Safety
- Floating Hotel — Urbanism

This is 12 issues as currently listed, and the first release will use all 12.
Each issue is equally weighted; the UI rounds the resulting approximately 8.3%
increments to whole percentages.

Recommended validation rules:

- exactly the approved issue count for the first release;
- unique, URL-safe issue IDs;
- non-empty title, context, and both arguments;
- `image` is optional; when present, `src`, source name, and source URL are
  required, and the local path resolves correctly from the public site root;
- each party position is `Support` or `Oppose`;
- party IDs must exist in the existing metadata files;
- every supported party has a position for every issue, so every issue counts
  toward every party's percentage.

The data build step can generate a browser-friendly
`data/generated/quiz.json`, keeping authoring data separate from runtime data.

## Matching algorithm

Normalize every answer to one of two values:

| Quiz answer | Numeric value |
| --- | ---: |
| Support | 1 |
| Oppose | -1 |

For each party and issue:

- `Supported` = `1`;
- `Opposed` = `-1`;
- editorialized `Support` = `1`;
- editorialized `Oppose` = `-1`.

The initial similarity model should be explicit and easy to explain:

```text
issue agreement = 1 when user answer equals party position
                  0 otherwise

party match = matching issues / total issues
```

All 12 issues count equally in the denominator. Each correct answer is worth
1/12 (approximately 8.3%); the UI will display rounded whole percentages. Ties should be
deterministic, using the party order in `data/parties.json` as the final
tie-breaker.

## URL and result pages

The quiz answer string uses one character per issue in the fixed presentation
order stored in `data/key_issues.json`:

```text
S = Support
O = Oppose
```

For example, `votes=SOOSSSSOOSOSO` contains 12 answers. Because the quiz and
results page use the same fixed issue order, each character always maps to the
issue the visitor was asked about.

`results-{party}.html` is a static entry point for each supported party. The
page reads `votes`, validates it, identifies the party slug from the filename,
recalculates all party matches, and displays the ranking. Invalid or incomplete
answers should fall back to `quiz.html` with a clear message rather than
silently showing a fabricated result.

The result filename is a presentation/share target, not the source of truth for
the result. The page should recalculate the ranking from `votes`, identify the
actual winner, and redirect or update the displayed result if the filename
party is stale or does not match the winner.

The result page's HTML metadata must be party-specific at build time so social
platforms can read the correct logo without executing JavaScript. This likely
means generating one HTML entry per party with:

- party-specific `<title>`;
- `og:title`, `og:description`, and `og:image`;
- Twitter card metadata;
- a canonical result URL template.

The share interaction should use `navigator.share` when available and copy the
URL as a fallback, matching the existing scorecard behavior.

## Technical implementation

### Entry points

- Add `quiz.html` as a Vite HTML entry point.
- Add one results HTML entry point per party, or generate those files during
  the build if Vite's multi-page setup is cleaner.
- Keep `index.html` unchanged except for a link to the quiz.

### React modules

Likely modules:

- `src/quiz/QuizApp.tsx` — introduction, fixed-order card flow, navigation,
  progress, and answer state.
- `src/quiz/ResultsApp.tsx` — URL parsing, matching, ranking, and sharing.
- `src/quiz/types.ts` — quiz issue, answer, and result types.
- `src/quiz/matching.ts` — pure similarity functions with unit tests.
- `src/quiz/url.ts` — answer encoding/decoding and party-slug validation.
- `src/quiz.css` — quiz-specific responsive presentation, reusing existing
  design tokens where practical.

### Build/data work

- Extend the data build/validation pipeline to read `key_issues.json`.
- Normalize the source vote labels and emit generated quiz data.
- Add a check that every issue has enough valid councillor records to produce
  a useful result.
- Add party logo paths suitable for both the result page UI and social
  metadata.

### Testing

- data validation tests for malformed issues, duplicate IDs, bad vote labels,
  and invalid party references;
- matching tests for exact matches, mixed answers, complete party positions,
  percentages, and ties;
- URL tests for valid answer strings of the approved issue length, malformed strings, unknown party
  slugs, and round trips;
- component or browser checks for fixed issue order, required answers,
  back-navigation, refresh/share links, mobile layout, and reduced motion;
- production build verification that `quiz.html` and every result entry point
  contain the correct asset paths under the GitHub Pages base path.

## Suggested execution order

1. Confirm the editorialized party positions and issue copy.
2. Add the 12-issue source data and validation/build output.
3. Implement and test the pure URL, shuffle, and matching modules.
4. Add the quiz page and card interaction.
5. Add result entry points, ranking, share behavior, and social metadata.
6. Link the quiz from the scorecard and refine responsive styling.
7. Run formatting, tests, data validation, and a production build; inspect the
   quiz and result pages in the built site.

## Confirmed decisions

- Matching is against editorialized, aggregated party positions.
- Users choose only `Support` or `Oppose`.
- There is no skip option in the first release.
- All 12 issues count in the denominator; displayed results are rounded to
  whole percentages, producing approximately 8% increments.
- Quiz order is fixed in `data/key_issues.json`, so the answer slug always
  corresponds to the presentation order.
- The Green party slug is `green`.
- Result pages recalculate from the query string rather than trusting the
  filename.
- Images will be added later.

## Decisions still needed before implementation

1. Please provide the editorialized `Support`/`Oppose` position for each party
   on each issue. The build should reject an issue with a missing party
   position so every issue remains countable.
2. Should the first result page show party matches only, or also show
   councillor-level context as a secondary, editorial section? The primary
   match will remain party-level to avoid turnover and seat-count problems.
3. Should the final issue text include source links now, or should sources be
   added alongside the later images?
