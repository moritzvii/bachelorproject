from __future__ import annotations
import os
from abc import ABC, abstractmethod
from typing import Dict, Final, Optional
import torch
from dotenv import load_dotenv
from transformers import AutoModelForSequenceClassification, AutoTokenizer

load_dotenv()

ScoreDict = Dict[str, float]

DEFAULT_MODEL_NAME: Final[str] = "microsoft/deberta-large-mnli"


class NliScorer(ABC):
    def __init__(self, *, model_name: str, backend: str) -> None:
        self.model_name = model_name
        self.backend = backend

    @abstractmethod
    def score(self, premise: str, hypothesis: str) -> ScoreDict:
        raise NotImplementedError


class LocalNliScorer(NliScorer):
    def __init__(self, model_name: str = DEFAULT_MODEL_NAME) -> None:
        super().__init__(model_name=model_name, backend="local")
        self._tokenizer: Optional[AutoTokenizer] = None
        self._model: Optional[AutoModelForSequenceClassification] = None

    def _ensure_model(self) -> tuple[AutoTokenizer, AutoModelForSequenceClassification]:
        if self._tokenizer is None or self._model is None:
            print(f"➡️ Lade NLI-Modell lokal: {self.model_name}")
            self._tokenizer = AutoTokenizer.from_pretrained(self.model_name)
            self._model = AutoModelForSequenceClassification.from_pretrained(
                self.model_name
            )
            self._model.eval()
        return self._tokenizer, self._model

    def score(self, premise: str, hypothesis: str) -> ScoreDict:
        tokenizer, model = self._ensure_model()
        encoded = tokenizer(
            premise,
            hypothesis,
            return_tensors="pt",
            truncation=True,
            max_length=512,
        )
        with torch.inference_mode():
            logits = model(**encoded).logits[0]
        probs = torch.softmax(logits, dim=-1).tolist()
        id2label = model.config.id2label
        mapping = {id2label[i].upper(): probs[i] for i in range(len(probs))}
        return {
            "CONTRADICTION": float(mapping.get("CONTRADICTION", 0.0)),
            "ENTAILMENT": float(mapping.get("ENTAILMENT", 0.0)),
            "NEUTRAL": float(mapping.get("NEUTRAL", 0.0)),
        }


def _model_name_from_env() -> str:
    return os.getenv("NLI_MODEL_NAME", DEFAULT_MODEL_NAME)


_NLI_SCORER: Optional[NliScorer] = None


def get_nli_scorer() -> NliScorer:
    global _NLI_SCORER
    if _NLI_SCORER is None:
        _NLI_SCORER = LocalNliScorer(model_name=_model_name_from_env())
    return _NLI_SCORER


def nli_probs(premise: str, hypothesis: str) -> ScoreDict:
    return get_nli_scorer().score(premise, hypothesis)
