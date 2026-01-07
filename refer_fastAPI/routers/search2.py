from fastapi import APIRouter
from pydantic import BaseModel
import faiss
import json
import numpy as np
from utils.embedding import get_openai_embedding  # embedding 함수는 따로 정의되어 있어야 함

router = APIRouter()

channel_names = {
    1: "하정훈의 삐뽀삐뽀 119 소아과",
    2: "우리동네 어린이병원, 우리어린이",
    3: "산소형제TV",
    4: "베싸TV, 과학과 Fact로 육아하기",
    5: "삐뽀삐뽀 정유미 TV",
    6: "권향화 원장의 다울아이TV",
    7: "맘똑티비"
}

class QueryInput(BaseModel):
    question: str

def load_faiss_index(channel_num):
    index_path = f"db/index_db{channel_num}.faiss"
    meta_path = f"db/meta_db{channel_num}.json"

    index = faiss.read_index(index_path)
    with open(meta_path, "r", encoding="utf-8") as f:
        metadata = json.load(f)

    return index, metadata

@router.post("/search_similar_questions_v2/")
async def search_similar_questions_v2(query: QueryInput, top_k: int = 3):
    query_embedding = get_openai_embedding(query.question)
    query_vector = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
    all_results = []

    for channel_num in range(1, 8):
        try:
            index, metadata = load_faiss_index(channel_num)
        except Exception as e:
            print(f"⚠️ 채널 {channel_num} 로딩 실패: {e}")
            continue

        distances, indices = index.search(query_vector, top_k)

        for dist, idx in zip(distances[0], indices[0]):
            if 0 <= idx < len(metadata):
                all_results.append({
                    "distance": float(dist),
                    "question": metadata[idx]["question"],
                    "id": metadata[idx]["sources"],
                    "channel": channel_names.get(channel_num, f"채널 {channel_num}")
                })

    all_results.sort(key=lambda x: x["distance"])
    return {"query": query.question, "results": all_results}
