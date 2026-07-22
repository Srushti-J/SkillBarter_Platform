"""
SkillBarter — AI Recommendation Engine
========================================
FastAPI microservice using TF-IDF + Cosine Similarity.

Algorithm:
  1. Build a text document for each user:
       "[offered skills] [wanted skills] [wanted skills]"
       (wanted skills repeated twice to give them higher weight)
  2. TF-IDF vectorize all documents (unigrams + bigrams)
  3. Cosine similarity: current user vs every candidate
  4. Complementary overlap score: directly count mutual skill matches
       → "I offer what you want" + "you offer what I want"
  5. Final score = 0.6 × overlap + 0.4 × tfidf + reputation_bonus (max 5%)
  6. Return top 5, sorted descending

Run:
  pip install -r requirements.txt
  uvicorn main:app --host 0.0.0.0 --port 8000 --reload
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

app = FastAPI(
    title="SkillBarter AI Engine",
    description="TF-IDF + Cosine Similarity skill partner recommender",
    version="2.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Request / Response models ─────────────────────────────────────────────────

class CurrentUser(BaseModel):
    id: str
    skillsOffered: List[str] = []
    skillsWanted:  List[str] = []


class CandidateUser(BaseModel):
    id:              str
    name:            str = ""
    bio:             str = ""
    profileImage:    str = ""
    skillsOffered:   List[str] = []
    skillsWanted:    List[str] = []
    reputationScore: float = 0.0
    reviewCount:     int   = 0
    lastSeen:        Optional[str] = None


class RecommendRequest(BaseModel):
    currentUser: CurrentUser
    allUsers:    List[CandidateUser]


# ── Helpers ───────────────────────────────────────────────────────────────────

def build_document(offered: List[str], wanted: List[str]) -> str:
    """
    Combine skill lists into a single TF-IDF document string.
    Skills with spaces become underscored tokens: "Machine Learning" → "machine_learning"
    Wanted skills are doubled to weight them more heavily in matching.
    """
    def normalise(skills):
        return " ".join(s.lower().replace(" ", "_") for s in skills if s.strip())

    offered_text = normalise(offered)
    wanted_text  = normalise(wanted)
    # Repeat wanted to give it 2x weight
    doc = f"{offered_text} {wanted_text} {wanted_text}".strip()
    return doc if doc else "no_skills"


def complementary_score(
    my_offered:    List[str],
    my_wanted:     List[str],
    their_offered: List[str],
    their_wanted:  List[str],
) -> float:
    """
    Direct mutual match score (0.0 → 1.0).

    Counts:
      - How many of MY offered skills appear in THEIR wanted list  (I teach them)
      - How many of THEIR offered skills appear in MY wanted list  (they teach me)

    Normalised by total distinct skills in play.
    """
    my_off  = {s.lower() for s in my_offered   if s.strip()}
    my_wan  = {s.lower() for s in my_wanted     if s.strip()}
    thr_off = {s.lower() for s in their_offered if s.strip()}
    thr_wan = {s.lower() for s in their_wanted  if s.strip()}

    i_teach_them  = len(my_off  & thr_wan)   # I offer something they want
    they_teach_me = len(thr_off & my_wan)     # They offer something I want

    denom = max(len(my_off | thr_off), 1)
    return min((i_teach_them + they_teach_me) / denom, 1.0)


# ── Main recommendation endpoint ──────────────────────────────────────────────

@app.post("/recommend")
def recommend(payload: RecommendRequest):
    """
    Returns the top-5 most compatible skill exchange partners
    for the current user, sorted by blended match score.
    """
    current    = payload.currentUser
    candidates = payload.allUsers

    if not candidates:
        return {"matches": [], "total_candidates": 0}

    # ── TF-IDF vectorisation ──────────────────────────────────────────────────
    current_doc   = build_document(current.skillsOffered, current.skillsWanted)
    candidate_docs = [build_document(u.skillsOffered, u.skillsWanted) for u in candidates]
    all_docs       = [current_doc] + candidate_docs

    tfidf_scores: dict = {}
    try:
        vectoriser = TfidfVectorizer(ngram_range=(1, 2), min_df=1)
        tfidf_mat  = vectoriser.fit_transform(all_docs)
        # Row 0 = current user, rows 1..N = candidates
        sims       = cosine_similarity(tfidf_mat[0], tfidf_mat[1:])[0]
        tfidf_scores = {candidates[i].id: float(sims[i]) for i in range(len(candidates))}
    except Exception as exc:
        # If vectorisation fails (e.g. all documents identical), fall back to 0
        print(f"TF-IDF error: {exc}")

    # ── Score each candidate ──────────────────────────────────────────────────
    results = []
    for candidate in candidates:
        tfidf  = tfidf_scores.get(candidate.id, 0.0)
        comp   = complementary_score(
            current.skillsOffered, current.skillsWanted,
            candidate.skillsOffered, candidate.skillsWanted,
        )

        # Blend: complementary overlap is the more meaningful signal
        blended = 0.6 * comp + 0.4 * tfidf

        # Tiny reputation bonus — max +5 percentage points
        rep_bonus = (min(candidate.reputationScore, 5.0) / 5.0) * 0.05
        final     = min(blended + rep_bonus, 1.0)

        results.append({
            "id":                 candidate.id,
            "name":               candidate.name,
            "bio":                candidate.bio,
            "profileImage":       candidate.profileImage,
            "skillsOffered":      candidate.skillsOffered,
            "skillsWanted":       candidate.skillsWanted,
            "reputationScore":    candidate.reputationScore,
            "reviewCount":        candidate.reviewCount,
            "lastSeen":           candidate.lastSeen,
            "matchScore":           round(final  * 100, 1),
            "tfidfScore":           round(tfidf  * 100, 1),
            "complementaryScore":   round(comp   * 100, 1),
        })

    # Sort descending, return top 5
    results.sort(key=lambda x: x["matchScore"], reverse=True)

    return {
        "matches":          results[:5],
        "total_candidates": len(candidates),
    }


@app.get("/health")
def health():
    return {
        "status":  "ok",
        "service": "SkillBarter AI Engine",
        "version": "2.0.0",
    }
