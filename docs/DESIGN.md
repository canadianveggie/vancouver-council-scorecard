# Vancouver Council Scorecard: Design Notes

Status: early design

This document records product and technical decisions for the Vancouver Council
Scorecard. It is intentionally a living document. Decisions marked **TBD** will
be tested against the real voting data before the first public release.

## Purpose

The site will help Vancouver voters compare councillors and political parties
based on council votes from the previous four years. It is not intended to
identify the universally 'best' councillor. Instead, a user will choose up to
three categories that matter to them and receive a report card for those areas.

The first release will cover everyone who served during the period, including
councillors who served before or after a by-election. Party rows will be the
primary view, with expandable rows showing individual councillors.

Initial parties:

- ABC
- Green
- OneCity
- COPE
- Vote Vancouver

## Initial categories

The initial category set is:

- Housing
- Transportation
- Environment
- Safety
- Affordability
- Governance

Categories may be added or removed if the available four-year voting record
does not contain enough meaningful votes in a category.

## User experience

The main screen will present an expandable, spreadsheet-like report card:

1. The user chooses up to three categories.
2. The site displays party scores for those categories.
3. The user can expand a party to see its individual councillors.
4. The user can expand a category to see the selected votes and vote-level
   scores.
5. The interface uses colour-coded grades and responsive layouts for phones.
6. Each vote includes a source link and a short explanatory description when
   available.

The visual direction is a polished infographic rather than a plain data table.
Expandable rows and columns may use subtle animation, provided the result
remains usable on mobile and respects reduced-motion preferences.

The site will include a short About section and a link to
`canadianveggie.com`.

## Scoring model

Each vote has:

- a desired outcome: `Pass` or `Fail`;
- a default weight: `1`, `2`, or `3`;
- a recorded vote for each councillor.

The initial vote-value mapping is:

| Recorded vote | Base value |
| --- | ---: |
| Proposed | 2 |
| Supported | 1 |
| Abstained | 0 |
| Absent | 0 |
| Opposed | -1 |
| Amended | -2 |

The score for a vote is:

```text
vote score = base value * desired-outcome multiplier * weight
```

The desired-outcome multiplier is:

```text
Pass ->  1
Fail  -> -1
```

For example, proposing a motion that should pass with weight `2` produces
`2 * 1 * 2 = +4`. Supporting a motion that should fail with weight `3`
produces `1 * -1 * 3 = -3`.

### Missing and unavailable votes

- `Absent` is currently scored as `0`. Attendance may matter to the report
  card, even though the data cannot reliably distinguish a legitimate absence
  from disengagement.
- `null` means the councillor had not yet been elected or was otherwise not
  eligible for that vote. It is not scored as a zero.
- Other unavailable states may be added later if the source records require
  them.

The effect of scoring absences as zero will be reviewed after testing with the
full dataset. In particular, we will inspect whether it unfairly rewards or
penalizes councillors with different numbers of eligible votes.

### Party scores

For the first version, a party score is the sum of the scores of its
councillors for the selected votes. This intentionally keeps the model simple
while we test the data.

The effect of party size, councillor turnover, absences, and councillors who
were not yet elected will be reviewed before finalizing the public grade model.
Normalized scores and alternative averaging methods remain under consideration.

### Grades

The report card will show a colour-coded grade for:

- each party overall for the selected categories;
- each selected category;
- individual councillors when a party row is expanded.

The initial implementation uses weighted average score for display and sorting.
Fixed thresholds are: A+ above `1`, A above `0.9`, B above `0.75`, C above
`0.4`, D from `0` through `0.4`, and F below `0`. The report card also shows
the raw weighted total and applicable-vote count so readers can see the sample
size behind each grade. `pnpm grades:report` compares relative normalization,
absence exclusion, and party-size effects; relative normalization is not used
because it makes a party's grade depend on who else is included.

## User customization and sharing

The defaults for each vote will be stored with the data. Users may adjust:

- the desired outcome;
- the vote weight;
- potentially the vote-value mapping, if later testing shows that should be
  configurable.

Changes will recalculate scores and grades immediately in the browser.

The current user configuration will be encoded in the URL so that it can be
shared. The interface will provide:

- a `Share` button that copies the current URL;
- a `Reset to Defaults` button;
- a clear indication when the displayed results differ from the defaults.

The application will not require a server or user account. URL encoding should
be compact, stable, and versioned so future changes to the data model can be
handled gracefully.

The exact URL format is **TBD**. A likely structure is a query parameter for
selected categories and a compressed or compact parameter for vote overrides.

## Data and build pipeline

CSV will be the human-editable source format. A build step will validate and
transform the CSV into a browser-friendly JSON structure.

Provisional source files:

```text
data/
  votes.csv
  councillors.json
  parties.json
```

The current collected data is in:

```text
data/votes.csv
```

The current CSV layout is a useful starting point but is not yet the final
schema. It combines vote metadata, party affiliations, councillor names, and
vote records in a wide format. The transformation step should eventually
produce normalized records similar to:

```json
{
  "id": "housing-001",
  "category": "Housing",
  "title": "Example vote",
  "date": "2024-05-01",
  "desiredOutcome": "pass",
  "weight": 2,
  "outcome": "Failed",
  "outcomeDetails": "Short explanation of the final outcome.",
  "sourceUrl": "https://example.com",
  "votes": {
    "councillor-id": "Supported"
  }
}
```

The build step should report malformed categories, unknown vote values,
duplicate identifiers, missing councillors, invalid dates, and invalid weights
before the site is deployed.

## Technical direction

The current recommendation is:

- React
- TypeScript
- Vite
- modern responsive CSS
- a small Node/TypeScript data transformation and validation script

The application will be a static client-side site. There will be no runtime
database or API requirement for the initial release.

## Deployment

The repository will be hosted at:

`https://github.com/canadianveggie/vancouver-council-scorecard`

The remote has not yet been connected to the local repository.

GitHub Actions will eventually:

1. install dependencies;
2. validate and transform the source CSV;
3. build the Vite application;
4. deploy the generated `dist/` directory to GitHub Pages.

The initial site will use the standard repository Pages URL. A custom domain
can be configured later without changing the application architecture.

## Licensing

The proposed licensing split is:

- MIT for source code;
- CC BY 4.0 for curated data, methodology, explanations, and other original
  non-code content.

Source documents, news articles, party names, and party logos may have separate
copyright or trademark considerations and must not automatically be treated as
covered by the project license.

## Open questions

- Should Cycling remain separate from Transportation?
- What fixed grade thresholds best communicate the results?
- Should the first selected category eventually receive more weight than the
  second and third categories?
- Should category scores be equally weighted regardless of how many votes each
  category contains?
- Should party scores remain summed totals, or become normalized/averaged after
  testing with the full council history?
- Which vote-value labels and edge cases are needed once more source data is
  added?
- What URL encoding format gives the best balance of readability, length, and
  compatibility?
