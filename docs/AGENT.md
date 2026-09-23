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
* News Link: Good soures include CBC, Global, CTV, and Vancouver Sun.
* Meeting Minutes: Valid PDF hosted at https://council.vancouver.ca/
* voteId: referenced in the PDF and in council-votes.csv; use the unique vote ID only
* For votes from councillors like Pete Fry and Lucy Maloney, run `pnpm council:reconcile` after updating votes.csv with vote ids.
