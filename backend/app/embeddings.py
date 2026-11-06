from functools import lru_cache

import numpy as np

from app.core.config import get_settings


@lru_cache(maxsize=1)
def get_model():
    """Load BGE-M3 once. FlagEmbedding's dense output is multilingual."""
    try:
        from FlagEmbedding import BGEM3FlagModel
    except ImportError as exc:
        raise RuntimeError(
            "FlagEmbedding is not installed. Run `pip install -r requirements.txt`."
        ) from exc

    settings = get_settings()
    # use_fp16=False is deliberate: this project targets CPU-only Windows machines.
    return BGEM3FlagModel(settings.embedding_model, use_fp16=False)


def _encode(texts: list[str]) -> list[list[float]]:
    if not texts:
        return []

    settings = get_settings()
    output = get_model().encode(
        texts,
        batch_size=settings.embedding_batch_size,
        max_length=settings.embedding_max_length,
        return_dense=True,
        return_sparse=False,
        return_colbert_vecs=False,
    )
    vectors = np.asarray(output["dense_vecs"], dtype=np.float32)
    if vectors.ndim != 2 or vectors.shape[0] != len(texts):
        raise RuntimeError("BGE-M3 returned an unexpected embedding shape.")
    if not np.all(np.isfinite(vectors)):
        raise RuntimeError("BGE-M3 returned non-finite embedding values.")

    # Store normalized vectors so cosine similarity is a simple dot product.
    norms = np.linalg.norm(vectors, axis=1, keepdims=True)
    vectors = vectors / np.maximum(norms, 1e-12)
    return vectors.tolist()


def embed_documents(texts: list[str]) -> list[list[float]]:
    """Create multilingual dense embeddings for English, French, and other languages."""
    return _encode(texts)


def embed_query(query: str) -> list[float]:
    """BGE-M3 does not require an English-only query instruction prefix."""
    return _encode([query])[0]
