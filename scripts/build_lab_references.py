"""Verified source register: manual reading levels plus publisher metadata, never fabricated abstracts."""

import json, urllib.request, urllib.parse, concurrent.futures, pathlib, time

root = pathlib.Path(__file__).resolve().parents[1]
base = json.load(open(root / "research/sources.json"))
keep = [
    "Dewey1910",
    "Facione1990",
    "KingKitchener1994",
    "Kane2013",
    "KooLi2016",
    "Abrami2015",
    "BarnettCeci2002",
    "HoferPintrich1997",
    "Kuhn1991",
    "Yang2024",
    "Lee2024",
]
entries = [x for x in base if x["id"] in keep]
manual = [
    (
        "Descartes1637",
        "Descartes, René",
        1637,
        "Discourse on the Method",
        "Project Gutenberg; John Veitch translation",
        "https://www.gutenberg.org/ebooks/59",
        "Primary text inspected: ordered analysis, caution and review inform a reconstruction, not a generic negative attitude.",
        "Primary text and metadata inspected",
        "book",
    ),
    (
        "Descartes1641",
        "Descartes, René",
        1641,
        "Meditations on First Philosophy",
        "Cambridge University Press; John Cottingham translation",
        "https://www.cambridge.org/highereducation/books/descartes-meditations-on-first-philosophy/23589F724981000827E1B2674169C934",
        "Meditations I–II motivate suspension and reconstruction; the Lab does not implement the cogito or arguments for God.",
        "Publisher description and edition metadata inspected; not full edition",
        "book",
    ),
    (
        "PlatoEuthyphro",
        "Plato",
        None,
        "Euthyphro",
        "Project Gutenberg; Benjamin Jowett translation",
        "https://www.gutenberg.org/ebooks/1642",
        "Definition and counterexample inform commitment-sensitive questions; contradiction cannot identify the uniquely false commitment.",
        "Primary text excerpts and catalog metadata inspected",
        "book",
    ),
    (
        "PlatoGorgias",
        "Plato",
        None,
        "Gorgias",
        "Project Gutenberg; Benjamin Jowett translation",
        "https://www.gutenberg.org/ebooks/1672",
        "Rhetoric, justice and interpersonal examination broaden elenchus beyond question-counting.",
        "Primary text located; catalog metadata and source excerpts inspected",
        "book",
    ),
    (
        "Dewey1938",
        "Dewey, John",
        1938,
        "Logic: The Theory of Inquiry",
        "The Later Works, volume 12; Southern Illinois University Press, 1986 edition, Jo Ann Boydston, editor",
        "https://www.siupress.com/9780809312689/the-later-works-of-john-dewey-volume-12-1925-1953/",
        "Inquiry transforms an indeterminate situation through coordinated conceptual and observational operations. The engine records plans rather than running empirical experiments.",
        "Publisher edition metadata inspected; interpretation cross-checked with SEP Dewey, not a full reading of the book",
        "book",
    ),
    (
        "Vlastos1994",
        "Vlastos, Gregory",
        1994,
        "The Socratic elenchus: method is all",
        "Socratic Studies, chapter 1, pp. 1–38; Cambridge University Press",
        "https://www.cambridge.org/core/books/socratic-studies/socratic-elenchus-method-is-all/E4678880B70286DEB5CDAFE5992638C6",
        "Supports treating elenchus as a substantive interpretive problem, not a synonym for asking questions.",
        "Publisher chapter metadata and excerpt inspected",
        "incollection",
    ),
    (
        "Scott2002",
        "Scott, Gary Alan (editor)",
        2002,
        "Does Socrates Have a Method? Rethinking the Elenchus in Plato’s Dialogues and Beyond",
        "Penn State University Press",
        "https://www.psupress.org/books/titles/0-271-02173-X.html",
        "Scholarly disagreement limits any claim that one dialogue protocol reproduces the historical Socrates.",
        "Publisher description and contents inspected",
        "book",
    ),
    (
        "SEPDescartesMethod",
        "Stanford Encyclopedia of Philosophy",
        2020,
        "Descartes’ Method",
        "Stanford Encyclopedia of Philosophy",
        "https://plato.stanford.edu/entries/descartes-method/",
        "Distinguishes Descartes’s broader method from a narrow operationalization of doubt.",
        "Article inspected; corporate catalog attribution, consult page for contributor credits",
        "misc",
    ),
    (
        "SEPDewey",
        "Stanford Encyclopedia of Philosophy",
        2024,
        "John Dewey",
        "Stanford Encyclopedia of Philosophy",
        "https://plato.stanford.edu/entries/dewey/",
        "Situated inquiry and the continuity of thinking and action prevent a simplistic usefulness metric.",
        "Article inspected; 2024 revision; consult page for contributor credits",
        "misc",
    ),
    (
        "SEPBeliefRevision",
        "Stanford Encyclopedia of Philosophy",
        None,
        "Logic of Belief Revision",
        "Stanford Encyclopedia of Philosophy",
        "https://plato.stanford.edu/entries/logic-belief-revision/",
        "Distinguishes contraction and revision from merely accumulating contradictory commitments.",
        "Article inspected; consult page for contributor credits",
        "misc",
    ),
    (
        "SEPLogicAI",
        "Stanford Encyclopedia of Philosophy",
        None,
        "Logic and Artificial Intelligence",
        "Stanford Encyclopedia of Philosophy",
        "https://plato.stanford.edu/entries/logic-ai/",
        "Formal representation enables explicit inference while requiring representational assumptions.",
        "Article inspected; consult page for contributor credits",
        "misc",
    ),
    (
        "Liang2022",
        "Liang, Percy and others",
        2022,
        "Holistic Evaluation of Language Models",
        "arXiv:2211.09110",
        "https://arxiv.org/abs/2211.09110",
        "Multiple metrics and transparent evaluation artifacts motivate separate quality, fidelity, resource and error records.",
        "Author abstract and metadata inspected",
        "misc",
    ),
    (
        "Zheng2023",
        "Zheng, Lianmin and others",
        2023,
        "Judging LLM-as-a-Judge with MT-Bench and Chatbot Arena",
        "arXiv:2306.05685",
        "https://arxiv.org/abs/2306.05685",
        "Judge biases motivate independent human scoring; model self-evaluation is not an independent outcome.",
        "Author abstract and metadata inspected",
        "misc",
    ),
]
for id, author, year, title, venue, url, note, verification, type_ in manual:
    entries.append(
        dict(
            id=id,
            author=author,
            year=year,
            title=title,
            venue=venue,
            url=url,
            relevance=note,
            verification=verification,
            type=type_,
        )
    )
dois = [
    (
        "Dung1995",
        "10.1016/0004-3702(94)00041-X",
        "Attack relations inspire typed objections. This software does not implement Dung extension semantics.",
    ),
    (
        "AGM1985",
        "10.2307/2274239",
        "Belief change requires explicit policies; recorded revisions here do not satisfy or claim full AGM postulates.",
    ),
    (
        "Cohen1968",
        "10.1037/h0026256",
        "Weighted agreement corrects for marginal agreement; quadratic weights are a declared design choice.",
    ),
    (
        "Schulz2010",
        "10.1136/bmj.c332",
        "Allocation, participant flow and transparent reporting inform the design; this is not a clinical trial or a claim of current CONSORT compliance.",
    ),
]


def fetch(x):
    id, doi, note = x

    for attempt in range(4):
        try:
            request = urllib.request.Request(
                "https://api.crossref.org/works/" + urllib.parse.quote(doi, safe=""),
                headers={
                    "User-Agent": "PhilosophicalReasoningLab/0.2 source-verification"
                },
            )
            data = json.load(urllib.request.urlopen(request, timeout=30))["message"]
            break
        except Exception:
            if attempt == 3:
                raise
            time.sleep(3 + attempt * 2)
    return dict(
        id=id,
        author=" and ".join(
            (a.get("family", "") + ", " + a.get("given", ""))
            if a.get("family")
            else a.get("name", "CONSORT Group")
            for a in data.get("author", [])
        ),
        year=data["published"]["date-parts"][0][0],
        title=data["title"][0],
        venue="; ".join(data.get("container-title", [])),
        doi=doi,
        url="https://doi.org/" + doi,
        relevance=note,
        verification="Crossref publisher-deposited metadata verified; abstract or full text not asserted",
        type="article",
    )


with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
    entries += list(pool.map(fetch, dois))
for x in entries:
    x["checked"] = "2026-10-11"
    x["verification"] = (
        x["verification"]
        if x["id"] not in keep
        else "Inherited verified Depth Map register: " + x["verification"]
    )
# Contributor names verified from SEP article copyright credits on 2026-10-11.
for entry in entries:
    contributors = {
        "SEPDescartesMethod": "Dika, Tarek R.",
        "SEPDewey": "Hildebrand, David",
        "SEPBeliefRevision": "Hansson, Sven Ove",
        "SEPLogicAI": "Thomason, Richmond",
    }
    if entry["id"] in contributors:
        entry["author"] = contributors[entry["id"]]
        entry["verification"] = (
            "Article inspected; author verified from the SEP article copyright credit"
        )
    if entry["id"] == "SEPLogicAI":
        entry["title"] = "Logic-Based Artificial Intelligence"
        entry["year"] = 2024
(root / "lab/research/sources.json").write_text(
    json.dumps(entries, indent=2, ensure_ascii=False) + "\n"
)
md = [
    "# Annotated bibliography\n\nVerification levels distinguish full-text excerpts, publisher descriptions and metadata. No entry is represented as a complete reading when only a catalog or abstract was available. Sources establish conceptual and methodological antecedents, not the effectiveness of this application.\n"
]
bib = []
for x in entries:
    md.append(
        f"## {x['id']}\n\n{x['author']} ({x['year'] or 'date not specified'}). *[{x['title']}]({x['url']})*. {x['venue']}.\n\n{x['relevance']}\n\nVerification: {x['verification']}. Checked {x['checked']}.\n"
    )
    fields = {
        "author": x["author"],
        "title": x["title"],
        "year": x["year"],
        "url": x["url"],
        "note": x["venue"] + "; " + x["verification"],
        "doi": x.get("doi"),
    }
    bib.append(
        "@misc{"
        + x["id"]
        + ",\n"
        + ",\n".join(
            "  " + k + " = {" + str(v).replace("&", r"\&") + "}"
            for k, v in fields.items()
            if v is not None
        )
        + "\n}"
    )
(root / "lab/research/ANNOTATED_BIBLIOGRAPHY.md").write_text("\n".join(md))
(root / "lab/research/references.bib").write_text("\n\n".join(bib) + "\n")
print("Wrote", len(entries), "verified entries")
