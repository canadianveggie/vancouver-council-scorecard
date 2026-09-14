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
- [ ] Verify the site at the repository’s default Pages URL.

Acceptance criteria:

- [x] The app runs locally with one documented command.
- [x] A clean build succeeds without manual file copying.
- A push to `main` can publish the site automatically.

## Phase 2: Data model and validation

Goal: make the current files reliable inputs for the application.

- [x] Define the canonical schema for parties, councillors, and votes.
- [x] Decide to keep vote categories comma-separated in the CSV and split them
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
- [ ] Sort parties by score or grade, with the sorting rule documented.
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

- [ ] Generate a report showing raw score ranges by category and party.
- [ ] Compare fixed grade thresholds with normalized scores.
- [ ] Test the effect of scoring absences as zero.
- [ ] Test party totals against averaged and normalized alternatives.
- [ ] Inspect the effect of party size and councillor turnover.
- [ ] Choose initial fixed grade thresholds.
- [ ] Document the grade calculation in the design document.
- [ ] Add tests for grade boundaries.

This phase should not block the first interactive prototype. Raw scores can be
shown while the grade model is being evaluated.

## Phase 6: User overrides and sharing

Goal: make the report card personal and shareable.

- [ ] Allow users to edit each selected vote's desired outcome.
- [ ] Allow users to edit each selected vote's weight.
- [ ] Recalculate results immediately after edits.
- [ ] Add a visible modified-from-defaults indicator.
- [ ] Add `Reset to Defaults`.
- [ ] Encode selected categories and vote overrides in the URL.
- [ ] Add a `Share` button using the Clipboard API with a fallback.
- [ ] Version the URL format for future compatibility.
- [ ] Add tests for parsing, serializing, and invalid shared URLs.

## Phase 7: Visual refinement and accessibility

Goal: make the tool feel like a polished report card without sacrificing
clarity.

- [ ] Finalize party colours and available logo assets.
- [ ] Add grade colour treatments with text labels, not colour alone.
- [ ] Add responsive table/card layouts for small screens.
- [ ] Optimize the mobile party column, including compact party-logo treatment
  where appropriate and line-breaking long party names such as Vote Vancouver.
- [ ] Reduce the visual jump when expanding vote columns.
- [ ] Use shorter vote-column labels with accessible, mobile-friendly details or
  tooltips.
- [ ] Add a documented councillor sort control or default, such as alphabetical
  order or score descending.
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

## Phase 8: Data expansion and release

Goal: prepare the first public release.

- [ ] Add more votes across the viable categories.
- [ ] Review every vote’s desired outcome, weight, and source.
- [ ] Resolve spelling, amendment, and outcome inconsistencies.
- [ ] Confirm councillor service periods and party affiliations.
- [ ] Add or replace party logos where usage is appropriate.
- [ ] Review the report card for misleading comparisons.
- [ ] Add a release checklist and data timestamp.
- [ ] Add the custom domain when ready.

## Recommended immediate sequence

The next implementation tasks should be:

1. Commit the current data and documentation changes.
2. Scaffold the Vite application.
3. Define and validate the transformed data model.
4. Implement and test the scoring engine.
5. Render the first basic party/category report card.
6. Use the real output to choose grade normalization and thresholds.

The first milestone should be a plain but functional report card. Branding,
logos, animation, and URL sharing can follow once the data and scoring behavior
are visible and testable.
