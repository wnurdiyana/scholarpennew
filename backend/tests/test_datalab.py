"""DataLab backend integration tests.
Tests: /api/manuscripts/{mid}/datalab/upload, /datalab/suggest, /datalab/plot,
       /figure/critique, /datalab/datasets.
Auth: demo user (jwt). Uses /tmp/biodiesel.csv.
"""
import base64
import io
import os
import struct
import zlib

import pytest
import requests

BASE_URL = os.environ["REACT_APP_BACKEND_URL"].rstrip("/")
DEMO_EMAIL = "demo@manuscriptforge.app"
DEMO_PW = "Demo123!"
CSV_PATH = "/tmp/biodiesel.csv"


def _make_minimal_png() -> bytes:
    # Minimal valid 1x1 black PNG
    sig = b"\x89PNG\r\n\x1a\n"
    def chunk(t, d):
        return struct.pack(">I", len(d)) + t + d + struct.pack(">I", zlib.crc32(t + d) & 0xffffffff)
    ihdr = struct.pack(">IIBBBBB", 1, 1, 8, 2, 0, 0, 0)
    raw = b"\x00\x00\x00\x00"  # filter byte + 1 black RGB pixel
    idat = zlib.compress(raw)
    return sig + chunk(b"IHDR", ihdr) + chunk(b"IDAT", idat) + chunk(b"IEND", b"")


@pytest.fixture(scope="module")
def token():
    r = requests.post(f"{BASE_URL}/api/auth/login", json={"email": DEMO_EMAIL, "password": DEMO_PW}, timeout=20)
    assert r.status_code == 200, r.text
    return r.json()["token"]


@pytest.fixture(scope="module")
def headers(token):
    return {"Authorization": f"Bearer {token}"}


@pytest.fixture(scope="module")
def manuscript_id(headers):
    r = requests.get(f"{BASE_URL}/api/manuscripts", headers=headers, timeout=20)
    assert r.status_code == 200
    items = r.json()
    assert items, "demo user should have at least one manuscript"
    return items[0]["manuscript_id"]


@pytest.fixture(scope="module")
def uploaded_dataset(headers, manuscript_id):
    with open(CSV_PATH, "rb") as f:
        files = {"file": ("biodiesel.csv", f, "text/csv")}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/upload",
            headers=headers, files=files, timeout=60,
        )
    assert r.status_code == 200, r.text
    return r.json()


# ---------- Upload tests ----------

class TestUpload:
    def test_upload_csv_success(self, uploaded_dataset):
        d = uploaded_dataset
        assert "dataset_id" in d and d["dataset_id"].startswith("ds_")
        assert d["filename"] == "biodiesel.csv"
        s = d["summary"]
        assert s["shape"]["rows"] == 25 and s["shape"]["cols"] == 8
        assert isinstance(s["columns"], list) and len(s["columns"]) == 8
        assert "numeric_summary" in s and "head" in s and "correlations" in s
        # numeric_summary should contain viscosity_cSt
        assert "viscosity_cSt" in s["numeric_summary"]

    def test_upload_invalid_extension(self, headers, manuscript_id):
        files = {"file": ("data.json", io.BytesIO(b'{"a":1}'), "application/json")}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/upload",
            headers=headers, files=files, timeout=15,
        )
        assert r.status_code == 400

    def test_upload_empty_file(self, headers, manuscript_id):
        files = {"file": ("empty.csv", io.BytesIO(b""), "text/csv")}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/upload",
            headers=headers, files=files, timeout=15,
        )
        assert r.status_code == 400

    def test_upload_non_owned_manuscript_404(self, headers):
        with open(CSV_PATH, "rb") as f:
            files = {"file": ("biodiesel.csv", f, "text/csv")}
            r = requests.post(
                f"{BASE_URL}/api/manuscripts/ms_doesnotexist/datalab/upload",
                headers=headers, files=files, timeout=15,
            )
        assert r.status_code == 404

    def test_datasets_list_grew(self, headers, manuscript_id, uploaded_dataset):
        r = requests.get(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/datasets",
            headers=headers, timeout=15,
        )
        assert r.status_code == 200
        ids = [d["dataset_id"] for d in r.json()["datasets"]]
        assert uploaded_dataset["dataset_id"] in ids


# ---------- Plot tests ----------

class TestPlot:
    def test_boxplot_success(self, headers, manuscript_id, uploaded_dataset):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/plot",
            headers=headers, timeout=30,
            json={"dataset_id": uploaded_dataset["dataset_id"], "plot_type": "boxplot",
                  "x": "blend", "y": "viscosity_cSt", "hue": "nanoparticle"},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["plot_type"] == "boxplot"
        assert d["plot_base64"] and len(d["plot_base64"]) > 500
        # verify it's actually a PNG
        png_bytes = base64.b64decode(d["plot_base64"])
        assert png_bytes.startswith(b"\x89PNG")
        assert d["caption"]

    def test_invalid_plot_type_400(self, headers, manuscript_id, uploaded_dataset):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/plot",
            headers=headers, timeout=15,
            json={"dataset_id": uploaded_dataset["dataset_id"], "plot_type": "piechart"},
        )
        assert r.status_code == 400

    def test_boxplot_missing_y_column_400(self, headers, manuscript_id, uploaded_dataset):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/plot",
            headers=headers, timeout=15,
            json={"dataset_id": uploaded_dataset["dataset_id"], "plot_type": "boxplot",
                  "x": "blend"},
        )
        assert r.status_code == 400

    def test_correlation_heatmap_no_xy_needed(self, headers, manuscript_id, uploaded_dataset):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/plot",
            headers=headers, timeout=30,
            json={"dataset_id": uploaded_dataset["dataset_id"], "plot_type": "correlation_heatmap"},
        )
        assert r.status_code == 200, r.text
        assert r.json()["plot_base64"]


# ---------- Suggest test (slow: Claude) ----------

class TestSuggest:
    def test_suggest_returns_structured(self, headers, manuscript_id, uploaded_dataset):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/suggest",
            headers=headers, timeout=120,
            json={"dataset_id": uploaded_dataset["dataset_id"]},
        )
        assert r.status_code == 200, r.text
        d = r.json()
        assert isinstance(d["analyses"], list) and len(d["analyses"]) >= 1
        assert isinstance(d["figures"], list)
        if d["figures"]:
            allowed = {"boxplot", "violin", "histogram", "scatter", "bar", "correlation_heatmap", "line"}
            for f in d["figures"]:
                assert f.get("plot_type") in allowed, f
        assert "missing_analyses" in d and "impact_notes" in d and "raw_summary" in d

    def test_suggest_bad_dataset_404(self, headers, manuscript_id):
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/datalab/suggest",
            headers=headers, timeout=15,
            json={"dataset_id": "ds_nope"},
        )
        assert r.status_code == 404


# ---------- Figure critique tests (slow: Claude vision) ----------

class TestFigureCritique:
    def test_critique_with_dataset(self, headers, manuscript_id, uploaded_dataset):
        png = _make_minimal_png()
        files = {"image": ("fig.png", png, "image/png")}
        data = {"dataset_id": uploaded_dataset["dataset_id"]}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/figure/critique",
            headers=headers, files=files, data=data, timeout=120,
        )
        assert r.status_code == 200, r.text
        d = r.json()
        for k in ("critique", "improvements", "suggested_replacement", "additional_analyses", "impact_notes", "replacement_plot"):
            assert k in d, f"missing {k}"
        assert isinstance(d["improvements"], list)
        assert isinstance(d["additional_analyses"], list)

    def test_critique_empty_image_400(self, headers, manuscript_id):
        files = {"image": ("empty.png", io.BytesIO(b""), "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/figure/critique",
            headers=headers, files=files, timeout=15,
        )
        assert r.status_code == 400

    def test_critique_oversized_image_400(self, headers, manuscript_id):
        big = b"\x89PNG\r\n\x1a\n" + b"\x00" * (8 * 1024 * 1024 + 100)
        files = {"image": ("big.png", big, "image/png")}
        r = requests.post(
            f"{BASE_URL}/api/manuscripts/{manuscript_id}/figure/critique",
            headers=headers, files=files, timeout=30,
        )
        assert r.status_code == 400
