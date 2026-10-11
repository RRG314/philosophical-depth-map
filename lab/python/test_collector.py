import unittest, threading, urllib.request, urllib.error, os, json
from unittest.mock import patch
from http.server import ThreadingHTTPServer
from collector import Handler, hash32, shuffle


class CollectorTests(unittest.TestCase):
    def test_closed_by_default_and_no_public_enrollment(self):
        server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            with patch.dict(os.environ, {"LAB_COLLECTION_ENABLED": "false"}):
                url = f"http://127.0.0.1:{server.server_port}"
                self.assertFalse(
                    json.load(urllib.request.urlopen(url + "/health"))[
                        "researchCollectionEnabled"
                    ]
                )
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(
                        urllib.request.Request(
                            url + "/research/import",
                            data=b"{}",
                            headers={"Content-Type": "application/json"},
                        )
                    )
                self.assertEqual(error.exception.code, 403)
                error.exception.close()
            with patch.dict(
                os.environ,
                {"LAB_COLLECTION_ENABLED": "true", "LAB_COORDINATOR_TOKEN": "x" * 32},
            ):
                with self.assertRaises(urllib.error.HTTPError) as error:
                    urllib.request.urlopen(
                        urllib.request.Request(
                            url + "/research/import",
                            data=b"{}",
                            headers={"Content-Type": "application/json"},
                        )
                    )
                self.assertEqual(error.exception.code, 401)
                error.exception.close()
        finally:
            server.shutdown()
            server.server_close()
            thread.join()

    def test_seed(self):
        self.assertEqual(hash32("abc"), 440920331)
        self.assertEqual(shuffle([1, 2, 3, 4], 42), [3, 4, 1, 2])
