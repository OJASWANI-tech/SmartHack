from typing import List, Dict

def team_rationale_prompt(team_members: List[Dict], team_name: str) -> str:
    """
    Generate prompt for team formation rationale
    
    Args:
        team_members: List of dicts with keys: name, skills, institution, experience_years
        team_name: Name of the team
    
    Returns:
        Formatted prompt string
    """
    
    members_info = []
    for member in team_members:
        skills_str = ", ".join(member.get('skills', []))
        info = f"- {member['name']}: {skills_str} | {member.get('institution', 'N/A')} | {member.get('experience_years', 0)} years experience"
        members_info.append(info)
    
    members_text = "\n".join(members_info)
    
    prompt = f"""You are an expert event organizer explaining team compositions to participants.

Team Name: {team_name}

Team Members:
{members_text}

Generate a concise, encouraging rationale (2-3 sentences) explaining why these participants form a well-balanced team. Focus on:
1. Complementary skill sets
2. Diverse backgrounds or institutions (if applicable)
3. Experience balance
4. Potential synergies

Keep the tone professional but warm. Make participants excited to work together.

Rationale:"""
    
    return prompt


def team_rationale_system_prompt() -> str:
    """System prompt for team rationale generation"""
    return """You are an experienced hackathon organizer and team formation expert. 
Your goal is to help participants understand why they've been grouped together and feel confident about their team composition.
Write clear, encouraging explanations that highlight team strengths without being overly verbose."""


def evaluation_rubric_prompt(team_name: str, challenge_description: str) -> str:
    """
    Generate evaluation rubric for judges
    
    Args:
        team_name: Name of the team being evaluated
        challenge_description: The challenge/problem statement assigned to this team
    
    Returns:
        Prompt for generating structured evaluation criteria
    """
    
    prompt = f"""You are creating an evaluation rubric for judges assessing a hackathon project.

Team: {team_name}
Challenge: {challenge_description}

Generate a structured evaluation rubric with 4-5 criteria. For each criterion:
1. Name of the criterion (e.g., "Innovation", "Technical Execution")
2. Brief description (1 sentence) of what judges should evaluate
3. Scoring range: 1-10 points

Format the output as a clear, numbered list that judges can easily follow.

Evaluation Rubric:"""
    
    return prompt


def communication_draft_prompt(
    stage: str,
    recipient_name: str,
    context: Dict
) -> str:
    """
    Generate personalized communication for participants
    
    Args:
        stage: Current event stage (e.g., "team_assignment", "evaluation_reminder")
        recipient_name: Participant's name
        context: Dict with relevant info (team_name, team_members, deadline, etc.)
    
    Returns:
        Prompt for drafting the email
    """
    
    stage_templates = {
        "team_assignment": f"""Draft a welcome email for {recipient_name} who has been assigned to team "{context.get('team_name', 'N/A')}".

Team Members: {', '.join(context.get('team_members', []))}
Challenge: {context.get('challenge', 'To be announced')}
Evaluator: {context.get('evaluator', 'TBA')}
Submission Deadline: {context.get('deadline', 'TBA')}

The email should:
- Welcome them warmly
- Introduce their team members
- Explain the challenge briefly
- Mention key dates
- Encourage collaboration
- Include a call-to-action to connect with teammates

Keep it concise (150-200 words) and energizing.

Email:""",

        "evaluation_reminder": f"""Draft a reminder email for {recipient_name} about their upcoming project evaluation.

Team: {context.get('team_name', 'N/A')}
Submission Deadline: {context.get('deadline', 'TBA')}
Hours Remaining: {context.get('hours_remaining', 'N/A')}

The email should:
- Remind them of the approaching deadline
- Encourage them to finalize their submission
- Mention what judges will be looking for
- Keep the tone supportive, not stressful

Keep it brief (100-150 words).

Email:"""
    }
    
    return stage_templates.get(stage, "Draft a professional event communication email.")


def anomaly_explanation_prompt(
    team_name: str,
    scores: List[Dict],
    divergent_score: float,
    mean_score: float
) -> str:
    """
    Generate explanation for score anomaly
    
    Args:
        team_name: Name of the team
        scores: List of dicts with 'evaluator' and 'score' keys
        divergent_score: The outlier score
        mean_score: Average of other scores
    
    Returns:
        Prompt for explaining the anomaly
    """
    
    scores_text = "\n".join([f"- {s['evaluator']}: {s['score']}/10" for s in scores])
    
    prompt = f"""You are analyzing a scoring anomaly in a hackathon evaluation.

Team: {team_name}

Scores received:
{scores_text}

The score {divergent_score} diverges significantly from the mean of {mean_score:.2f}.

Provide a brief (2-3 sentences) professional explanation of:
1. Why this discrepancy might have occurred
2. What the committee should verify before publishing results

Keep the tone neutral and solution-focused.

Analysis:"""
    
    return prompt