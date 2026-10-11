import unittest
from research import synthetic, analyze, kappa


class ResearchTests(unittest.TestCase):
    def test_reproducible(self):
        rows = synthetic(8, 1)
        self.assertEqual(rows, synthetic(8, 1))
        a = analyze(rows, draws=50)
        self.assertTrue(a["label"].startswith("SYNTHETIC"))
        self.assertEqual(len(a["estimates"]), 32)
        self.assertEqual(len(a["contrasts"]), 24)

    def test_reliability(self):
        self.assertEqual(kappa([(0, 0), (4, 4)]), 1)
        self.assertIsNone(kappa([(2, 2)]))

    def test_duplicate(self):
        rows = synthetic(1)
        self.assertRaises(ValueError, analyze, [rows[0], rows[0]])

    def test_missing(self):
        rows = synthetic(4)
        rows[0]["score"] = None
        self.assertEqual(analyze(rows, draws=10)["missing_ratings"], 1)

    def test_coordinator_join(self):
        from join_ratings import join

        packet = {
            "synthetic": True,
            "responses": [{"blindId": "b", "response": "A premise."}],
        }
        key = {
            "b": dict(
                participantId="p",
                itemId="i",
                phase="pre",
                method="neutral",
                implementation="deterministic",
            )
        }
        rating = dict(
            blindId="b",
            raterId="A",
            criterion="reconstruction",
            score=2,
            evidence="A premise.",
            rubricVersion="lab-general-1.0",
        )
        rows = join(packet, key, [rating])
        self.assertTrue(rows[0]["synthetic"])
        self.assertEqual(rows[0]["condition"], "neutral")
        self.assertRaises(ValueError, join, packet, key, [rating, rating])
