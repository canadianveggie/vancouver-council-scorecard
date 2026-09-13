# Vancouver Council Scorecard

A voter-focused report card for Vancouver's mayor and city councillors based on
their voting records.

The site will let users compare party scores among the issues that matter most to them.

## Project status

This is still in active development.

See the project documents for the current decisions and plan:

- [Design notes](docs/DESIGN.md)
- [Development plan](docs/DEVELOPMENT.md)

## Repository layout

```text
data/
  councillors.json  # councillor metadata and party references
  parties.json      # party metadata and logo references
  votes.csv         # human-editable voting records
docs/
  DESIGN.md        # product, scoring, and architecture decisions
  DEVELOPMENT.md   # implementation milestones
```

## Development conventions

- Node.js 22 LTS
- pnpm for dependency management
- React, TypeScript, and Vite for the web application
- CSV as the editable vote source; generated JSON for browser consumption

The application commands will be added when the Vite scaffold is created.

## Licensing

The source code is licensed under the MIT License. Curated data and original
non-code content are intended to be licensed under CC BY 4.0; see
[LICENSE-DATA.md](LICENSE-DATA.md).
