import numpy as np

import app.embeddings as embeddings


class FakeBgeM3:
    def __init__(self):
        self.received_texts = None
        self.kwargs = None

    def encode(self, texts, **kwargs):
        self.received_texts = texts
        self.kwargs = kwargs
        return {"dense_vecs": np.asarray([[3.0, 4.0] for _ in texts], dtype=np.float32)}


def test_multilingual_embedding_is_normalized_and_query_is_not_english_prefixed(monkeypatch):
    fake = FakeBgeM3()
    monkeypatch.setattr(embeddings, "get_model", lambda: fake)

    vector = embeddings.embed_query("Où se trouve le guide utilisateur ?")

    assert fake.received_texts == ["Où se trouve le guide utilisateur ?"]
    assert np.allclose(vector, [0.6, 0.8])
    assert fake.kwargs["return_dense"] is True
    assert fake.kwargs["return_sparse"] is False


def test_embed_documents_handles_empty_input():
    assert embeddings.embed_documents([]) == []
