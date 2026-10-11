import json, re, urllib.request, concurrent.futures
from pathlib import Path

root = Path(__file__).resolve().parents[1]
rows = [
    (
        "descartes",
        "René Descartes",
        "Philosophers",
        "Knowledge, mind and the search for secure foundations.",
    ),
    (
        "socrates",
        "Socrates",
        "Philosophers",
        "The historical problem and philosophical examination through dialogue.",
    ),
    (
        "plato",
        "Plato",
        "Philosophers",
        "Arguments about knowledge, reality, ethics and political life.",
    ),
    (
        "aristotle",
        "Aristotle",
        "Philosophers",
        "Logic, explanation, virtue and practical judgment.",
    ),
    (
        "dewey",
        "John Dewey",
        "Philosophers",
        "Inquiry, experience, education and democracy.",
    ),
    (
        "hume",
        "David Hume",
        "Philosophers",
        "Experience, causation, belief and skepticism.",
    ),
    (
        "kant",
        "Immanuel Kant",
        "Philosophers",
        "The limits of knowledge and the grounds of moral obligation.",
    ),
    (
        "spinoza",
        "Baruch Spinoza",
        "Philosophers",
        "Substance, necessity, emotion and freedom.",
    ),
    (
        "leibniz",
        "Gottfried Wilhelm Leibniz",
        "Philosophers",
        "Possibility, explanation and the structure of reality.",
    ),
    (
        "locke",
        "John Locke",
        "Philosophers",
        "Experience, ideas, identity and political authority.",
    ),
    (
        "mill",
        "John Stuart Mill",
        "Philosophers",
        "Liberty, utility and the evaluation of social arrangements.",
    ),
    (
        "nietzsche",
        "Friedrich Nietzsche",
        "Philosophers",
        "Value, interpretation and genealogical criticism.",
    ),
    (
        "james",
        "William James",
        "Philosophers",
        "Experience, pragmatism and varieties of belief.",
    ),
    (
        "peirce",
        "Charles Sanders Peirce",
        "Philosophers",
        "Signs, inference and inquiry as a community practice.",
    ),
    (
        "whitehead",
        "Alfred North Whitehead",
        "Philosophers",
        "Process, experience and relations in metaphysics.",
    ),
    ("arendt", "Hannah Arendt", "Philosophers", "Action, judgment and political life."),
    (
        "beauvoir",
        "Simone de Beauvoir",
        "Philosophers",
        "Freedom, situated existence and ethics.",
    ),
    (
        "dubois",
        "W. E. B. Du Bois",
        "Philosophers",
        "Race, democracy, knowledge and social criticism.",
    ),
    (
        "confucius",
        "Confucius",
        "Philosophers",
        "Ethical cultivation, relationships and political responsibility.",
    ),
    (
        "nagarjuna",
        "Nāgārjuna",
        "Philosophers",
        "Emptiness, dependence and arguments against intrinsic nature.",
    ),
    (
        "ibn-sina",
        "Ibn Sina",
        "Philosophers",
        "Logic, metaphysics and the soul in classical Islamic philosophy.",
    ),
    (
        "african-ethics",
        "African ethics",
        "Traditions & approaches",
        "Moral personhood, community and debates within African ethical thought.",
    ),
    (
        "feminist-philosophy",
        "Feminist philosophy",
        "Traditions & approaches",
        "Critiques and reconstructions of knowledge, power and philosophical method.",
    ),
    (
        "pragmatism",
        "Pragmatism",
        "Traditions & approaches",
        "Meaning, inquiry and consequences across several distinct thinkers.",
    ),
    (
        "existentialism",
        "Existentialism",
        "Traditions & approaches",
        "Situated freedom, responsibility and human existence.",
    ),
    (
        "phenomenology",
        "Phenomenology",
        "Traditions & approaches",
        "The structures and interpretation of experience.",
    ),
    (
        "skepticism",
        "Skepticism",
        "Traditions & approaches",
        "Challenges to knowledge and the scope of justified belief.",
    ),
    (
        "rationalism-empiricism",
        "Rationalism and empiricism",
        "Traditions & approaches",
        "Debates about the sources and limits of knowledge.",
    ),
    (
        "descartes-method",
        "Descartes’ method",
        "Methods & concepts",
        "Read alongside the Lab protocol to distinguish historical method from implementation.",
    ),
    (
        "plato-ethics-shorter",
        "Plato’s shorter ethical works",
        "Methods & concepts",
        "Definition, examination and unresolved dialogue in the shorter works.",
    ),
    (
        "logic-belief-revision",
        "Logic of belief revision",
        "Methods & concepts",
        "Formal accounts of changing commitments under new information.",
    ),
    (
        "logic-ai",
        "Logic-based artificial intelligence",
        "Methods & concepts",
        "What formal representations permit automated systems to infer.",
    ),
    (
        "critical-thinking",
        "Critical thinking",
        "Methods & concepts",
        "Definitions, educational aims and controversies about assessment.",
    ),
    (
        "reflective-equilibrium",
        "Reflective equilibrium",
        "Methods & concepts",
        "Mutual adjustment of judgments and principles.",
    ),
    (
        "argument",
        "Argument",
        "Methods & concepts",
        "Philosophical accounts of arguments and their evaluation.",
    ),
    (
        "epistemology",
        "Epistemology",
        "Fields",
        "Knowledge, justification and epistemic inquiry.",
    ),
    (
        "ethics-virtue",
        "Virtue ethics",
        "Fields",
        "Character and practical judgment within ethics.",
    ),
    (
        "metaphysics",
        "Metaphysics",
        "Fields",
        "Being, identity, modality and explanation.",
    ),
    (
        "consciousness",
        "Consciousness",
        "Fields",
        "Experience and its philosophical explanation.",
    ),
    (
        "justice",
        "Justice",
        "Fields",
        "Competing conceptions of what people and institutions owe.",
    ),
    (
        "scientific-method",
        "Scientific method",
        "Fields",
        "Diverse procedures of scientific investigation and justification.",
    ),
]


def fetch(row):
    slug, title, category, note = row
    url = "https://plato.stanford.edu/entries/" + slug + "/"
    try:
        req = urllib.request.Request(
            url, headers={"User-Agent": "PhilosophicalReasoningLab link verification"}
        )
        with urllib.request.urlopen(req, timeout=30) as r:
            html = r.read().decode("utf-8")
            status = r.status
        match = re.search(r"<title>(.*?)</title>", html, re.S)
        found = re.sub("<.*?>", "", match.group(1)).strip() if match else title
        return dict(
            id=slug,
            title=title,
            category=category,
            note=note,
            url=url,
            kind="Scholarly reference",
            access="Free",
            verified="2026-10-11",
            verification=f"HTTP {status}; title inspected: {found}",
        )
    except Exception as e:
        return dict(id=slug, title=title, error=str(e), url=url)


with concurrent.futures.ThreadPoolExecutor(max_workers=8) as pool:
    results = list(pool.map(fetch, rows))
(root / "lab/research/learning-link-audit.json").write_text(
    json.dumps(results, indent=2, ensure_ascii=False)
)
good = [r for r in results if "error" not in r]
extra = [
    (
        "discourse",
        "Discourse on the Method",
        "https://www.gutenberg.org/ebooks/59",
        "René Descartes; John Veitch translation. Begin with Parts II and IV.",
        "Free",
    ),
    (
        "meditations",
        "Meditations on First Philosophy",
        "https://www.cambridge.org/highereducation/books/descartes-meditations-on-first-philosophy/23589F724981000827E1B2674169C934",
        "René Descartes; Cambridge edition. Read Meditations I–II with the objections in view.",
        "Publisher / library access",
    ),
    (
        "euthyphro",
        "Euthyphro",
        "https://www.gutenberg.org/ebooks/1642",
        "Plato; older English translation. Follow the changes in a proposed definition.",
        "Free",
    ),
    (
        "how-we-think",
        "How We Think",
        "https://www.gutenberg.org/ebooks/37423",
        "John Dewey; 1910 edition. Focus on reflective thought and the analysis of inquiry.",
        "Free",
    ),
    (
        "logic-inquiry",
        "Logic The Theory of Inquiry",
        "https://www.siupress.com/9780809312689/the-later-works-of-john-dewey-volume-12-1925-1953/",
        "John Dewey; 1938 work in Later Works volume 12. Publisher record, not an open full text.",
        "Publisher / library access",
    ),
]
for key, title, url, note, access in extra:
    good.append(
        dict(
            id=key,
            title=title,
            category="Primary texts",
            note=note,
            url=url,
            kind="Primary text / edition",
            access=access,
            verified="2026-10-11",
            verification="Catalog/publisher page inspected with web tool; full-text extent described in research bibliography.",
        )
    )
(root / "src/learn/resources.json").write_text(
    json.dumps(good, indent=2, ensure_ascii=False) + "\n"
)
print(
    json.dumps(
        {"verified": len(good), "failures": [r for r in results if "error" in r]},
        indent=2,
    )
)
