# Source verification and discovery audit

Search date: 10 October 2026. This is a targeted discovery review, not an exhaustive or PRISMA-style systematic review. No empirical dataset was collected. All source relevance interpretations are provisional.

## Search services actually used

| Service | Query or route | Outcome |
|---|---|---|
| PhilPapers | `site.philpapers.org instrumental rationality critical thinking philosophical reflection` | Instrumental-reasoning category and Raz record found; DOI/title/year checked in record |
| PhilArchive | Direct `/s/reflective%20equilibrium`; indexed search `site.philarchive.org intellectual humility critical thinking` | Direct request returned HTTP 403; indexed records and manuscripts found. No claim of a complete archive search |
| Stanford Encyclopedia | Reflective equilibrium; value pluralism | Relevant entry passages inspected; author metadata retrieved directly (Carl Knight; Elinor Mason) |
| Internet Encyclopedia | Socrates | Entry passages and author information inspected (James M. Ambury) |
| Crossref | Bibliographic API queries for validity, IRT, critical thinking, argumentation, metacognition, game assessment, factor analysis and AI scoring | JSON discovery saved; exact DOI metadata subsequently checked. Some requests returned HTTP 429 |
| OpenAlex | `epistemic cognition critical thinking`, first three results | Successful API response stored. Muis et al. selected for follow-up; other results are discovery leads, not automatically accepted evidence |
| ERIC | King/Kitchener reflective judgment; Facione expert consensus | ED368925 and ED315423 metadata/abstract verified |
| Books and journals | Publisher pages for Rawls, Habermas, Kuhn, Shute/Ventura; library Horkheimer record; journal Arendt issue | Metadata and descriptions inspected, with reading limitations noted per source |
| Primary empirical/methodological records | Sage, Wiley, PubMed, AAAI and DOI metadata | Abstracts/records inspected; no claim of full-text critical appraisal for every article |

## Important corrections and barriers

Crossref's top result for a Kane title query was a different chapter, not the 2013 Journal of Educational Measurement article. The final bibliography uses exact DOI 10.1111/jedm.12000. A Facione query returned a 2013 article, not the 1990 consensus report; it was excluded and ERIC used. An Abrami query returned the 2008 stage-one meta-analysis; the final source is the separately verified 2015 article, DOI 10.3102/0034654314551063. A Mislevy query returned a 2019 chapter; it was not represented as a 2012 source. These mismatches remain in raw discovery logs to show why search matching cannot be treated as verification.

The web reader could not resolve Samejima and Horn DOI pages; exact-title metadata was retrieved through Crossref. A Frontiers DOI redirect failed in the web reader; Muis et al. metadata was verified in Crossref and OpenAlex but its substantive findings are not summarized. Publisher abstracts or descriptions rather than full books were available for several sources. Access status is distinct from publication quality and from whether a work has been read in full.

## Verification register

`sources.json` is the machine-readable register of 26 accepted sources, with author, year, title, venue, stable URL, relevance and verification status. `annotated-bibliography.md` exposes the same distinctions to readers. `references.bib` contains corresponding records. Years for access-only encyclopedia records are explicitly labeled, not presented as original publication dates. The Kohlberg chapter pagination is corroborated secondarily; its primary chapter has not been inspected. No DOI is invented for a work lacking a verified DOI.

Raw discovery files: `crossref-discovery.json`, `crossref-verified-dois.json`, `openalex-discovery.txt`, `philarchive-discovery.txt`. These are bibliographic service outputs, not participant records or empirical results. Inclusion required identifiable author/title and a stable scholarly or bibliographic source. Search snippets from social media were not used as evidence.

## Next scholarly review

Acquire and closely read primary books and methodological full texts, resolve edition-specific page citations before quotation, critically appraise empirical designs, search citation networks and additional languages, and involve domain specialists. No novelty claim, endorsement by cited authors, comprehensive cultural coverage, or validation is established by this starting bibliography.
