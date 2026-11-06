import numpy as np

from app.core.config import get_settings
from app.db import connect

def embed_query(question: str):
    from app.embeddings import embed_query as _embed_query
    return _embed_query(question)


def retrieve(question: str, top_k: int, tenant_id: str) -> list[dict]:
    """Exact cosine search over locally stored, normalized float32 vectors.

    This deliberately uses a simple in-process scan: it avoids a separate vector
    database and is appropriate for a small, self-hosted document collection.
    """
    query_vector = np.asarray(embed_query(question), dtype=np.float32)
    query_norm = float(np.linalg.norm(query_vector))
    if query_norm == 0:
        return []
    query_vector /= query_norm

    with connect() as conn:
        rows = conn.execute(
            """SELECT c.document_id, d.filename, c.chunk_index, c.heading,
                      c.content, c.embedding, c.embedding_dim
               FROM document_chunks c
               JOIN documents d ON d.document_id = c.document_id
               WHERE d.status = 'indexed' AND d.tenant_id IN (?, '__GLOBAL__')"""
            , (tenant_id,)
        ).fetchall()

    candidates = []
    for row in rows:
        if int(row[6]) != query_vector.size:
            # Skip stale vectors if an embedding model/dimension was changed.
            continue
        vector = np.frombuffer(row[5], dtype=np.float32)
        if vector.size != query_vector.size:
            continue
        candidates.append((row, vector))

    if not candidates:
        return []

    matrix = np.vstack([item[1] for item in candidates])
    # Ingestion normalizes embeddings; normalize defensively for old/corrupt rows.
    norms = np.linalg.norm(matrix, axis=1)
    valid = norms > 0
    if not np.any(valid):
        return []
    similarities = np.full(len(candidates), -1.0, dtype=np.float32)
    similarities[valid] = (matrix[valid] / norms[valid, None]) @ query_vector

    count = min(max(int(top_k), 1), len(candidates))
    selected = np.argpartition(-similarities, count - 1)[:count]
    selected = sorted(selected, key=lambda idx: float(similarities[idx]), reverse=True)
    threshold = get_settings().min_similarity

    results = []
    for idx in selected:
        similarity = float(similarities[idx])
        if similarity < threshold:
            continue
        row = candidates[idx][0]
        results.append({
            "document_id": row[0],
            "filename": row[1],
            "chunk_index": row[2],
            "heading": row[3],
            "content": row[4],
            "similarity": similarity,
        })
    return results
