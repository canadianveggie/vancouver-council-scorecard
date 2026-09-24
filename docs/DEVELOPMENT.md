# Vancouver Council Scorecard - Development Plan

This plan is organized around getting a working, data-backed prototype early,
then refining the scoring model and visual presentation with real examples.

## Phase 0: Repository and conventions

Status: in progress

- [x] Initialize the Git repository.
- [x] Connect the repository to GitHub over SSH.
- [x] Add the initial voting CSV.
- [x] Add councillor and party JSON files.
- [x] Document product and scoring decisions.
- [x] Commit the current JSON and documentation changes.
- [x] Add a basic README with local setup and project purpose.
- [x] Decide on Node.js 22 LTS and pnpm as the package manager.

## Phase 1: Application scaffold

Goal: run a minimal static application locally and deploy a placeholder to
GitHub Pages.

- [x] Create a React + TypeScript + Vite application.
- [x] Add the initial responsive page shell.
- [x] Add a simple header, title, introductory text, and About link.
- [x] Add the initial visual tokens: colours, typography, spacing, and grades.
- [x] Add a local development command and production build command.
- [x] Add a GitHub Actions workflow for building and deploying to Pages.
- [x] Verify the site at the repository’s default Pages URL:
  https://canadianveggie.github.io/vancouver-council-scorecard/

Acceptance criteria:

- [x] The app runs locally with one documented command.
- [x] A clean build succeeds without manual file copying.
- A push to `main` can publish the site automatically.

## Phase 2: Data model and validation

Goal: make the current files reliable inputs for the application.

- [x] Define the canonical schema for parties, councillors, and votes.
- [x] Validate one category per vote in the CSV
  into an array during transformation.
- [x] Add stable vote IDs to the source data or generate deterministic IDs.
- [x] Define the accepted vote-value vocabulary.
- [x] Define how `null`, `Absent`, and `Abstained` are represented.
- [x] Create a CSV parser and data transformation script.
- [x] Validate councillor IDs, party IDs, categories, weights, dates, URLs, and
  vote values.
- [x] Produce browser-friendly JSON in a generated directory.
- [x] Fail the build when the source data is invalid.

The source CSV uses strict `YYYY-MM-DD` dates and the vote-value vocabulary is:

```text
Proposed
Supported
Abstained
Absent
Opposed
Amended in Opposition
```

Blank vote cells become `null` in the generated data. Blank weights are not
currently expected in the source data; the transformer defaults them to `1`
with a warning for backwards compatibility.

The `Outcome Details` column is preserved as `outcomeDetails` in the generated
data, while `News Link` becomes `sourceUrl`.

The transformer currently generates browser data at
`data/generated/scorecard.json`, which is ignored by Git and recreated during
the build.

Acceptance criteria:

- The current CSV can be transformed without hand-editing generated output.
- Every vote maps to a known category and every councillor maps to a known
  party.
- Invalid data produces a useful error message.

## Phase 3: Scoring engine

Goal: implement scoring independently from the user interface.

- [x] Implement the base vote-value mapping.
- [x] Implement desired-outcome inversion for `Pass` and `Fail`.
- [x] Apply vote weights.
- [x] Treat `Absent` as zero for the initial version.
- [x] Treat `null` as not eligible and exclude it from applicable-vote counts.
- [x] Calculate councillor vote scores.
- [x] Calculate category totals.
- [x] Calculate selected-category totals.
- [x] Calculate party totals from councillor scores.
- [x] Add unit tests for positive, negative, zero, absent, null, and weighted
  cases.
- [x] Add test fixtures for party and councillor aggregation.

The engine should accept the default vote settings plus a set of user
overrides, and return calculated results without depending on React components.

## Phase 4: First usable report card

Goal: let a user select categories and understand the results.

- [x] Build category selection limited to three categories.
- [x] Display party rows as the primary result.
- [x] Sort parties by average score descending, then party ID alphabetically.
- [x] Expand a party to show councillor records.
- [x] Expand a category to show its votes.
- [x] Display vote-level scores and recorded vote labels.
- [x] Display source links and short explanations when available.
- [x] Show raw scores and applicable-vote counts while grades are still being
  calibrated.
- [x] Add empty, incomplete-data, and no-category-selected states.

Acceptance criteria:

- A user can choose one, two, or three categories.
- All displayed values can be traced back to individual votes.
- The report card remains usable on a narrow mobile viewport.

## Phase 5: Grades and normalization experiments

Goal: choose a grade model based on observed data rather than assumptions.

- [x] Generate a report showing raw score ranges by category and party.
- [x] Compare fixed grade thresholds with normalized scores.
- [x] Test the effect of scoring absences as zero.
- [x] Test party totals against averaged and normalized alternatives.
- [x] Inspect the effect of party size and councillor turnover.
- [x] Choose initial fixed grade thresholds.
- [x] Document the grade calculation in the design document.
- [x] Add tests for grade boundaries.
- [ ] Decide whether `Absent` should remain a zero or become `null`. If it
  remains zero, change Christine Boyle's provincial-election-period absences
  to `null` where appropriate.

Run `pnpm grades:report` to reproduce the Phase 5 comparison against the current
generated dataset. The initial UI uses weighted average score rather than party
rank: each recorded vote contributes its score divided by the total applicable
vote weight. `Absent` remains an applicable zero, while `null` is excluded.

This phase should not block the first interactive prototype. Raw scores can be
shown while the grade model is being evaluated.

## Phase 6: User overrides and sharing

Goal: make the report card personal and shareable.

- [x] Allow users to edit each selected vote's desired outcome.
- [x] Allow users to edit each selected vote's weight.
- [x] Allow users to ignore a selected vote.
- [x] Recalculate results immediately after edits.
- [ ] Add a visible modified-from-defaults indicator.
- [ ] Add `Reset to Defaults`.
- [ ] Encode selected categories and vote overrides in deep links.
- [ ] Add a `Share` button using the Clipboard API with a fallback.
- [ ] Version the URL format for future compatibility.
- [ ] Add tests for parsing, serializing, and invalid shared URLs.

## Phase 7: Visual refinement and accessibility

Goal: make the tool feel like a polished report card without sacrificing
clarity.

- [ ] Finalize party colours and available logo assets.
- [ ] Add grade colour treatments with text labels, not colour alone.
- [ ] Make zero-point votes visually neutral rather than light green.
- [ ] Remove the separate visual state for zero or `null` scores; only the
  vote name should change colour.
- [x] Add responsive table/card layouts for small screens.
- [x] Optimize the mobile party column, including compact party-logo treatment
  where appropriate and line-breaking long party names such as Vote Vancouver.
- [ ] Reduce the visual jump when expanding vote columns.
- [ ] Use shorter vote-column labels with accessible, mobile-friendly details or
  tooltips.
- [x] Add a documented councillor sort default: score descending, then
  councillor ID alphabetically.
- [ ] Revisit the green table headers so they do not compete with the red-green
  score treatment.
- [ ] Make positive and negative scores visually clearer using accessible
  background treatments, text labels, and sufficient contrast.
- [ ] Add restrained expand/collapse animation.
- [ ] Respect `prefers-reduced-motion`.
- [ ] Verify keyboard navigation and focus states.
- [ ] Check colour contrast.
- [ ] Add a clear methodology and data-source section.
- [ ] Add a custom 404 page if needed for GitHub Pages.
- [ ] Add social sharing metadata: icon, media preview, title, and description.
- [ ] Automatically scroll to the report card when the third category is chosen.
- [ ] Clean up the introductory text.
- [ ] Clean up the footer text.
- [ ] Add a real About section with methodology, feedback instructions, and a
  link to canadianveggie.com.

## Phase 8: Data expansion and release

Goal: prepare the first public release.

- [ ] Add more votes across the viable categories.
- [ ] Review outcomes for strike-and-replace amendments so each outcome makes
  sense.
- [ ] Decide whether to split Transportation, move some votes to Urbanism, or
  remove weak examples such as headlight-related votes.
- [ ] Review every news link; null links that are not genuine news sources
  rather than redirecting users to vancouver.ca.
- [ ] Track who proposed each motion and decide how proposer credit affects
  scoring, including the proposed double-points treatment.
- [ ] Review every vote’s desired outcome, weight, and source.
- [ ] Resolve spelling, amendment, and outcome inconsistencies.
- [ ] Confirm councillor service periods and party affiliations.
- [x] Add or replace party logos where usage is appropriate.
- [ ] Review the report card for misleading comparisons.
- [ ] Add a release checklist and data timestamp.
- [ ] Add the custom domain when ready.

## Recommended immediate sequence

The next implementation tasks should be:

1. Add modified-state and reset controls for vote overrides.
2. Add versioned deep links and the share button.
3. Fix the remaining score and responsive styling details.
4. Add social metadata, content, and the About/methodology section.
5. Review and clean the source data before the public release.

The first functional report-card milestone is complete. The remaining work is
focused on personalization and sharing, presentation polish, site content, and
data review.
