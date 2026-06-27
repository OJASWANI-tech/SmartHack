import json
import logging
from typing import Optional, List, Dict, Any
from app.services.llm_client import llm_client

logger = logging.getLogger("ai_service")

async def generate_team_rationale(team_name: str, members: List[Dict[str, Any]]) -> str:
    """
    Input: team_name, list of member dicts with name, skills, experience, institution
    Output: 2-3 sentence rationale explaining why this team composition works
    """
    prompt = (
        f"Analyze this newly formed hackathon team '{team_name}' and generate a highly professional "
        f"2-3 sentence rationale explaining why their skills and backgrounds are complementary and why they will succeed:\n\n"
        f"Members:\n"
    )
    for m in members:
        prompt += f"- Name: {m.get('first_name')} {m.get('last_name')}, Role/Domain: {m.get('domain')}, Skills: {m.get('skill_tags')}, Level: {m.get('experience_level')}, Inst: {m.get('institution')}\n"
        
    system_prompt = "You are a senior technical coordinator at an elite innovation hackathon. Be concise, insightful, and motivating."
    return await llm_client.complete(prompt, system_prompt)


async def draft_welcome_email(participant: Dict[str, Any], team: Dict[str, Any]) -> Dict[str, str]:
    """
    Input: participant dict, team dict with name and members
    Output: dict with 'subject' and 'body' keys
    """
    prompt = (
        f"Write a welcoming, exciting hackathon email for participant {participant.get('first_name')} "
        f"who has been algorithmically placed into team '{team.get('name')}' based on synergistic profiles.\n\n"
        f"Provide the output as a JSON object with 'subject' and 'body' keys."
    )
    system_prompt = "You are an automated communication assistant for EventFlow hackathons. Keep it inspiring, structured, and helpful."
    try:
        response_text = await llm_client.complete(prompt, system_prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error parsing welcome email: {e}")
        return {
            "subject": f"Welcome to your team {team.get('name')} — EventFlow",
            "body": f"Dear {participant.get('first_name')},\n\nYou have been placed in team {team.get('name')}. Connect with your teammates in the portal!\n\nBest,\nEventFlow Orchestrator"
        }


async def draft_evaluation_guide(team: Dict[str, Any]) -> str:
    """
    Input: team dict with name and challenge
    Output: plain text evaluation guide for judges
    """
    prompt = (
        f"Create a custom 3-bullet-point evaluation rubric guide for judges reviewing team '{team.get('name')}', "
        f"focusing on their proposed project: '{team.get('challenge')}'."
    )
    system_prompt = "You are a chief evaluator. Write brief, high-impact evaluation tips for a judge."
    return await llm_client.complete(prompt, system_prompt)


async def explain_score_anomaly(team_name: str, scores: List[float], avg: float) -> str:
    """
    Input: team_name, list of score values, calculated average
    Output: plain English explanation of the anomaly for committee
    """
    prompt = (
        f"Analyze these divergent judge scores for team '{team_name}':\n"
        f"Scores: {scores}\n"
        f"Average Score: {avg:.2f}\n\n"
        f"Generate a clear, 2-sentence explanation of why such variance might occur (e.g., disagreement on technical execution vs concept), "
        f"and suggest what the committee should check."
    )
    system_prompt = "You are a score governance analyst. Be objective, neutral, and clear."
    return await llm_client.complete(prompt, system_prompt)


async def draft_progression_email(participant: Dict[str, Any], team: Dict[str, Any], rank: int) -> Dict[str, str]:
    """
    Input: participant dict, team dict, rank (position on leaderboard)
    Output: dict with 'subject' and 'body' keys
    """
    prompt = (
        f"Write a progression invitation email to {participant.get('first_name')} "
        f"whose team '{team.get('name')}' placed #{rank} on the leaderboard, qualifying them for the next round of funding/acceleration.\n\n"
        f"Return a JSON object with 'subject' and 'body' keys."
    )
    system_prompt = "You are the EventFlow director. Keep it extremely formal, congratulatory, and clear on next steps."
    try:
        response_text = await llm_client.complete(prompt, system_prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error parsing progression email: {e}")
        return {
            "subject": f"Congratulations! {team.get('name')} has advanced!",
            "body": f"Dear {participant.get('first_name')},\n\nYour team placed #{rank} and advances to the next stage. See details in portal.\n\nBest,\nEventFlow Committee"
        }


# ============================================================
# NEW COMPREHENSIVE WORKFLOW ENHANCEMENTS
# ============================================================

async def generate_project_summary(team_name: str, challenge: str, readme: Optional[str] = None) -> str:
    """
    Input: team name, challenge, optional README text
    Output: AI-synthesized evaluation summary for judges
    """
    prompt = (
        f"Team: {team_name}\n"
        f"Challenge / Topic: {challenge}\n"
        f"README Submitted: {readme[:2000] if readme else 'None provided'}\n\n"
        f"Create an elegant technical overview of the project for judges. "
        f"Synthesize: what they built, their stack, their core innovation, and potential technical risk spots."
    )
    system_prompt = "You are an expert technical auditor summarizing hackathon submissions for high-profile judges. Keep it professional, objective, structured, and brief."
    return await llm_client.complete(prompt, system_prompt)


async def generate_rubric_hints(team_name: str, challenge: str, rubric_criteria: List[str]) -> str:
    """
    Input: team name, challenge, list of rubric criteria names
    Output: Judge suggestions
    """
    prompt = (
        f"Team '{team_name}' is tackling '{challenge}'.\n"
        f"The active rubric criteria are: {', '.join(rubric_criteria)}.\n\n"
        f"Provide specific, actionable hints on what key technical aspects or pitfalls judges should look for "
        f"under these criteria when evaluating this specific project."
    )
    system_prompt = "You are a tech lead guiding evaluators. Provide 3-4 bullet points of highly specific technical elements to probe."
    return await llm_client.complete(prompt, system_prompt)


async def structure_evaluator_feedback(raw_notes: str, criteria_scores: Dict[str, float]) -> Dict[str, str]:
    """
    Input: raw notes text, dictionary of scores per criteria
    Output: JSON mapping criteria names to polished paragraphs of constructive feedback
    """
    prompt = (
        f"Convert these raw judge evaluation remarks into highly polished, constructive, criterion-by-criterion feedback.\n\n"
        f"Scores assigned:\n"
    )
    for k, v in criteria_scores.items():
        prompt += f"- {k}: {v}/10\n"
    prompt += f"\nRaw Judge Notes:\n\"{raw_notes}\"\n\n"
    
    keys_list = list(criteria_scores.keys())
    keys_str = ", ".join(f"'{k}'" for k in keys_list)
    example_json = "{\n" + ",\n".join(f'  "{k}": "Polished feedback paragraph for {k}..."' for k in keys_list) + "\n}"
    
    prompt += (
        f"Your response MUST be a flat JSON object where the keys are exactly and only: {keys_str}.\n"
        f"Each value must be a single string containing a polished paragraph combining the score context and the raw notes into an actionable critique.\n"
        f"Do NOT include any extra keys. Do NOT use nested objects. Do NOT use placeholder values like N/A.\n\n"
        f"Example output structure:\n"
        f"{example_json}"
    )
    
    system_prompt = "You are an AI writing coach for hackathon judges. Polish their raw notes into constructive sandbox feedback. Always return valid JSON."
    try:
        response_text = await llm_client.complete(prompt, system_prompt, json_mode=True)
        raw_data = json.loads(response_text)
        normalized = {}
        for k, v in raw_data.items():
            if isinstance(v, dict):
                normalized[k] = v.get("feedback", v.get("text", str(v)))
            else:
                normalized[k] = str(v)
        return normalized
    except Exception as e:
        logger.error(f"Error structuring evaluator feedback: {e}")
        # Return fallback structured notes
        return {k: f"Score of {v}/10 reflects the project's baseline performance under this category. Notes: {raw_notes}" for k, v in criteria_scores.items()}


async def detect_semantic_inconsistency(score_value: float, notes: str, criteria_scores: Dict[str, float]) -> Optional[Dict[str, Any]]:
    """
    Compares note sentiment vs numerical scores to flag potential accidental scoring errors.
    """
    prompt = (
        f"Inspect whether there is a severe semantic mismatch between this judge's score and comments:\n"
        f"Overall Score: {score_value}/10\n"
        f"Criteria Breakdown: {criteria_scores}\n"
        f"Judge Comments: \"{notes}\"\n\n"
        f"Provide your inspection as a JSON object with 'consistent' (boolean) and 'explanation' (string) fields. "
        f"Flag as inconsistent ONLY if the comments are highly enthusiastic/perfect but scores are very low (e.g., < 4/10), "
        f"or comments are highly critical/negative but scores are extremely high (e.g., > 9/10)."
    )
    system_prompt = "You are a data validation checker analyzing score-text alignment. Be conservative with flagging."
    try:
        response_text = await llm_client.complete(prompt, system_prompt, json_mode=True)
        return json.loads(response_text)
    except Exception as e:
        logger.error(f"Error in semantic consistency validation: {e}")
        return {"consistent": True, "explanation": "Validation system error; defaulted to consistent."}


async def generate_divergence_explanation(team_name: str, scores_detail: List[Dict[str, Any]]) -> str:
    """
    Inputs: team name, list of dictionaries with judge name, score value, and criteria breakdown.
    Outputs: Detailed comparison highlighting differences.
    """
    prompt = (
        f"Provide a governance explanation of score divergence for team '{team_name}':\n\n"
    )
    for idx, sd in enumerate(scores_detail):
        prompt += f"Judge #{idx+1} ({sd.get('judge_name')}): Total Score: {sd.get('score_value')}/10, Breakdown: {sd.get('criteria_breakdown')}, Notes: \"{sd.get('notes')}\"\n"
        
    prompt += (
        "\nProvide a professional consolidation report explaining EXACTLY where the judges diverged. "
        "Explain who was highly critical and why, who was enthusiastic and why, and summarize the core debate."
    )
    system_prompt = "You are a chief audit moderator at a high-stakes hackathon. Write a clean, brief audit synopsis."
    return await llm_client.complete(prompt, system_prompt)


async def generate_assignment_reasoning(evaluator_name: str, evaluator_domain: str, evaluator_skills: List[str], team_name: str, challenge: str) -> str:
    """
    Explains why this judge-team match makes mathematical and logical sense.
    """
    prompt = (
        f"Explain why judge '{evaluator_name}' (Domain: {evaluator_domain}, Skills: {evaluator_skills}) "
        f"was assigned to evaluate team '{team_name}' (Project: '{challenge}').\n\n"
        f"Write a concise, professional 1-sentence explanation of their match."
    )
    system_prompt = "You are an orchestration logic matching explainer. Be technical and precise."
    return await llm_client.complete(prompt, system_prompt)


async def generate_devils_advocate_questions(team_name: str, challenge: str, readme: Optional[str] = None) -> List[str]:
    """
    Input: team name, challenge, optional README
    Output: 3 targeted critical questions for presentation
    """
    prompt = (
        f"Team: {team_name}\n"
        f"Challenge / Topic: {challenge}\n"
        f"README Submitted: {readme[:2000] if readme else 'None'}\n\n"
        f"Generate exactly 3 highly specific, challenging, and critical technical questions "
        f"for a judge to ask this team during their presentation. "
        f"The questions should probe potential flaws, technical limitations, scalability bottlenecks, "
        f"or product-market fit challenges.\n"
        f"Return the output as a JSON array of strings (exactly 3 strings)."
    )
    system_prompt = "You are a senior systems architect and hackathon judge. You ask sharp, critical, and insightful technical questions."
    try:
        response_text = await llm_client.complete(prompt, system_prompt, json_mode=True)
        data = json.loads(response_text)
        if isinstance(data, dict):
            if "questions" in data and isinstance(data["questions"], list):
                return [str(q) for q in data["questions"]]
            for val in data.values():
                if isinstance(val, list):
                    return [str(q) for q in val]
            return [str(v) for v in data.values()]
        elif isinstance(data, list):
            return [str(q) for q in data]
        return [str(data)]
    except Exception as e:
        logger.error(f"Error generating devils advocate questions: {e}")
        return [
            f"How does your implementation of the {challenge} domain scale under high load?",
            "What security mechanisms protect the API endpoints and database queries?",
            "If you had to rewrite one part of the codebase, which architectural decision would you change and why?"
        ]