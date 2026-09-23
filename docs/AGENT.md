## Votes.csv

When gathering data for votes, follow these general principles:
* Aim to have 10-20 votes per category that represent the most impactful and most news worthy items
* Don't make up content. Leave it blank for someone to manually enter when uncertain.
* Vote: brief and to the point
* Description: more detail and ideally why the vote is important. Ends in a period.
* Date: date the vote happened: YYYY-MM-DD
* Desired: Defaults to 'pass' until overritten
* Outcome Detail: 'pass'/'fail' depending on the vote result. If there are several amendments leading to multiple votes, it can be left blank for manual entering.
* Weight: Defaults to 1 until overritten
* News Link: Prefer independent reporting from CBC, Global, CTV, or the Vancouver Sun. Daily Hive is acceptable when stronger coverage is unavailable or less precise. Do not use Vancouver.ca announcements or CityHallWatch as news links.
* Meeting Minutes: Valid PDF hosted at https://council.vancouver.ca/
* voteId: referenced in the PDF and in council-votes.csv; use the unique vote ID only
* For votes from councillors like Pete Fry and Lucy Maloney, run `pnpm council:reconcile` after updating votes.csv with vote ids.

### Recommended data-review additions

Before editing a vote, verify the date, agenda item, amendments, final decision,
and individual votes against the City's voting-record export and the official
minutes PDF. Use the date and meeting type from the official record when building
the minutes URL; do not infer either from a news article or a nearby agenda.

When a motion has amendments or separated clauses, record the relevant vote IDs
for the amendment and final motion and explain the choice in `Outcome Details`.
Keep `News Link` separate from `Meeting Minutes`: the former should be a readable
news or City news page, while the latter must be the official minutes PDF.

For each data pass, record the research date and search window, check for missing
votes by searching the council-vote export by transportation, transit, cycling,
pedestrian, parking, and road-safety terms, and leave unsupported fields blank
rather than preserving an unverified URL or date.
