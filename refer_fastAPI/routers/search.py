from fastapi import APIRouter
from pydantic import BaseModel
import faiss, json, numpy as np
from utils.embedding import get_openai_embedding

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
    index = faiss.read_index(f"question_index_{channel_num}.faiss")
    with open(f"questions_meta_{channel_num}.json", "r", encoding="utf-8") as f:
        metadata = json.load(f)
    return index, metadata

@router.post("/search_similar_questions/")
async def search_similar_questions(query: QueryInput, top_k: int = 3):
    query_embedding = get_openai_embedding(query.question)
    all_results = []

    for channel_num in range(1, 8):
        index, metadata = load_faiss_index(channel_num)
        query_vector = np.array(query_embedding, dtype=np.float32).reshape(1, -1)
        distances, indices = index.search(query_vector, top_k)

        for dist, idx in zip(distances[0], indices[0]):
            all_results.append({
                "distance": float(dist),
                "question": metadata[idx]["question"],
                "id": metadata[idx]["id"],
                "channel": channel_names[channel_num]
            })

    return {"query": query.question, "results": all_results}
