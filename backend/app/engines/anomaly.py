import logging
import math
from typing import List, Dict, Any, Optional

logger = logging.getLogger("engines.anomaly")

def detect_score_anomalies(
    scores: List[Dict[str, Any]], 
    threshold: float = 2.0
) -> List[Dict[str, Any]]:
    """
    Analyzes submitted scores for a single team and flags anomalies.
    
    Checks:
    1. Overall Score Divergence:
       Checks if any judge's total score deviates from the team's average score by > `threshold`.
    2. Criterion-level Variance Analysis:
       Checks standard deviation of criteria across judges. If standard deviation of a single criterion is > 2.5,
       flags it as high criterion variance.
    3. Sentiment-Score Semantic Inconsistency:
       Leverages previously run or pre-flagged AI consistency checkers.
       
    Parameters:
      - scores: List of dicts representing scores, containing:
        id, evaluator_id, evaluator_name, score_value (float), criteria_breakdown (dict), notes (str),
        ai_consistency_flag (bool), ai_consistency_note (str)
        
    Returns:
      - List of anomaly dictionaries containing severity, divergence_score, details, etc.
    """
    if len(scores) < 2:
        return []

    anomalies = []
    
    # Calculate overall average
    score_values = [float(s["score_value"]) for s in scores]
    avg_score = sum(score_values) / len(score_values)
    
    # 1. Check overall divergence
    for s in scores:
        dev = abs(float(s["score_value"]) - avg_score)
        if dev > threshold:
            severity = "high" if dev > (threshold * 1.5) else "medium"
            anomalies.append({
                "type": "score_divergence",
                "evaluator_id": str(s["evaluator_id"]),
                "evaluator_name": s.get("evaluator_name", "Unknown Judge"),
                "score_value": float(s["score_value"]),
                "divergence_score": round(dev, 2),
                "severity": severity,
                "ai_reasoning": (
                    f"Judge {s.get('evaluator_name', 'Unknown')} gave a score of {s['score_value']:.2f}, "
                    f"which deviates from the team average of {avg_score:.2f} by {dev:.2f} points (threshold: {threshold})."
                )
            })

    # 2. Check criterion-level variance
    # Extract criteria keys from first score's breakdown
    criteria_keys = []
    if scores[0].get("criteria_breakdown"):
        criteria_keys = list(scores[0]["criteria_breakdown"].keys())
        
    for criterion in criteria_keys:
        crit_values = []
        for s in scores:
            breakdown = s.get("criteria_breakdown") or {}
            val = breakdown.get(criterion)
            if val is not None:
                crit_values.append(float(val))
                
        if len(crit_values) >= 2:
            # Calculate standard deviation
            crit_avg = sum(crit_values) / len(crit_values)
            variance = sum((x - crit_avg) ** 2 for x in crit_values) / (len(crit_values) - 1)
            std_dev = math.sqrt(variance)
            
            if std_dev > 2.2:  # High spread in a single rubric category
                anomalies.append({
                    "type": "criterion_variance",
                    "criterion": criterion,
                    "divergence_score": round(std_dev, 2),
                    "severity": "medium",
                    "ai_reasoning": (
                        f"Significant judge disagreement detected in category '{criterion}'. "
                        f"The score spread shows a high standard deviation of {std_dev:.2f}."
                    )
                })

    # 3. Check AI semantic inconsistency
    for s in scores:
        if s.get("ai_consistency_flag"):
            anomalies.append({
                "type": "semantic_inconsistency",
                "evaluator_id": str(s["evaluator_id"]),
                "evaluator_name": s.get("evaluator_name", "Unknown Judge"),
                "score_value": float(s["score_value"]),
                "divergence_score": 1.5,
                "severity": "medium",
                "ai_reasoning": f"AI Semantic Auditor flagged inconsistency: {s.get('ai_consistency_note')}"
            })

    return anomalies


def check_evaluator_agreement(scores: List[Dict[str, Any]]) -> float:
    """
    Approximates evaluator agreement (inter-rater reliability).
    Returns a percentage agreement score between 0 and 100.
    """
    if len(scores) < 2:
        return 100.0
        
    score_values = [float(s["score_value"]) for s in scores]
    avg = sum(score_values) / len(score_values)
    
    # Mean absolute deviation (MAD)
    mad = sum(abs(x - avg) for x in score_values) / len(score_values)
    
    # 0 MAD -> 100% agreement, 10 MAD (max spread) -> 0% agreement
    agreement = max(0.0, min(100.0, 100.0 - (mad * 10.0)))
    return round(agreement, 2)
