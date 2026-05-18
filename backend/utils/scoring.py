from datetime import date
from typing import Optional


def compute_score(
    uom_type: str,
    target: float,
    achievement: float,
    completion_date: Optional[date] = None,
    deadline: Optional[date] = None,
) -> float:
    """
    Computes the achievement score for a goal based on its UoM type.

    Returns a float from 0.0 to 1.0 (may exceed 1.0 for overachievement).
    Multiply by 100 to get a percentage.

    uom_type options:
      min      - Higher actual is better (e.g. revenue, units sold). Score = actual / target.
      max      - Lower actual is better (e.g. TAT, cost). Score = target / actual.
      timeline - Binary pass/fail based on completion date vs deadline. Late completions are penalised.
      zero     - Zero incidents = 100%, anything else = 0%. Used for safety/compliance.
    """
    if uom_type == "min":
        if target == 0:
            return 1.0 if achievement >= 0 else 0.0
        return round(achievement / target, 4)

    elif uom_type == "max":
        if achievement == 0:
            return 1.0
        if target == 0:
            return 0.0
        return round(target / achievement, 4)

    elif uom_type == "timeline":
        if completion_date is None:
            return 0.0
        if deadline is None:
            return 1.0
        if completion_date <= deadline:
            return 1.0
        # Penalty: -3.33% per day late over a 30-day window, floor at 0
        days_late = (completion_date - deadline).days
        penalty = days_late / 30
        return round(max(0.0, 1.0 - penalty), 4)

    elif uom_type == "zero":
        return 1.0 if achievement == 0 else 0.0

    else:
        raise ValueError(f"Unknown UoM type: {uom_type}")


def score_to_percentage(score: float) -> float:
    """Converts a raw score to a display percentage, capped at 150 (overachievement ceiling)."""
    return round(min(score * 100, 150.0), 1)


def compute_weighted_score(goals_with_scores: list) -> float:
    """
    Computes the overall weighted average score across all goals.
    Input: list of (goal, score) tuples where goal.weightage is a numeric weight.
    """
    total_weight = sum(g.weightage for g, _ in goals_with_scores)
    if total_weight == 0:
        return 0.0
    weighted_sum = sum(score * g.weightage for g, score in goals_with_scores)
    return round(weighted_sum / total_weight, 4)
