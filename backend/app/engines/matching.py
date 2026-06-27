import logging
from typing import List, Dict, Any, Tuple
from app.models.evaluator import Evaluator
from app.models.team import Team
from app.models.participant import Participant

logger = logging.getLogger("engines.matching")

# ─── 🎯 DOMAIN MAPPING TAXONOMY ───
DOMAIN_MAPPING = {
    "ai": "Artificial Intelligence & Machine Learning",
    "developer": "Artificial Intelligence & Machine Learning",
    "data": "Artificial Intelligence & Machine Learning",
    "devs": "Artificial Intelligence & Machine Learning",
    "artificial intelligence & machine learning": "Artificial Intelligence & Machine Learning",
    "machine learning": "Artificial Intelligence & Machine Learning",
    
    "business": "FinTech & Decentralized Payments",
    "pm": "FinTech & Decentralized Payments",
    "biz": "FinTech & Decentralized Payments",
    "fintech & decentralized payments": "FinTech & Decentralized Payments",
    "finance": "FinTech & Decentralized Payments",
    "payment": "FinTech & Decentralized Payments",
    
    "cyber": "CyberSecurity & Zero-Trust Architecture",
    "security": "CyberSecurity & Zero-Trust Architecture",
    "cybersecurity & zero-trust architecture": "CyberSecurity & Zero-Trust Architecture",
    
    "design": "HealthTech & Digital Patient Care",
    "ux": "HealthTech & Digital Patient Care",
    "ui": "HealthTech & Digital Patient Care",
    "designer": "HealthTech & Digital Patient Care",
    "healthtech & digital patient care": "HealthTech & Digital Patient Care",
    "health": "HealthTech & Digital Patient Care",
    "medical": "HealthTech & Digital Patient Care",
    
    "web3": "Web3 & Blockchain Infrastructure",
    "blockchain": "Web3 & Blockchain Infrastructure",
    "web3 & blockchain infrastructure": "Web3 & Blockchain Infrastructure",
    "crypto": "Web3 & Blockchain Infrastructure"
}

def normalize_to_domain(text: str) -> str:
    if not text:
        return "General Track"
    text_lower = text.lower().strip()
    if text_lower in DOMAIN_MAPPING:
        return DOMAIN_MAPPING[text_lower]
    for keyword, standardized_domain in DOMAIN_MAPPING.items():
        if keyword in text_lower:
            return standardized_domain
    return "General Track"

def compute_compatibility_score(evaluator: Evaluator, team_members: List[Participant], team_challenge: str) -> Tuple[float, str]:
    """
    Computes a matching score between 0 and 100 representing how compatible an evaluator is for a team.
    Also returns a detailed, professional explainability breakdown.
    
    Checks:
    1. Institutional Conflict (Strict Conflict Penalty):
       If evaluator.institution matches any team member's institution, score is 0.0 (Hard conflict).
    2. Preferred Track Alignment (Weight 50%):
       Checks if evaluator's preferred track matches the team's challenge category.
    3. Domain Alignment (Weight 30%):
       Checks if evaluator's domains align with team members' domains or challenge keywords.
    4. Skill Tags Overlap (Weight 20%):
       Checks intersection of evaluator's skills with team members' skill tags.
    """
    # 1. Institutional Conflict Check
    eval_inst = (evaluator.institution or "").strip().lower()
    if eval_inst and eval_inst != "industry" and eval_inst != "none":
        for member in team_members:
            member_inst = (member.institution or "").strip().lower()
            if member_inst == eval_inst:
                return 0.0, f"CONFLICT: Hard institutional conflict detected. Evaluator and team member {member.first_name} both belong to '{member.institution}'."

    score = 0.0
    explanations = []

    # 1.5. Expertise / Preferred Track Alignment (Max 50 points)
    pref_score = 0.0
    pref_cats = []
    for c in (evaluator.preferred_categories or []):
        if c:
            pref_cats.extend([normalize_to_domain(sub) for sub in c.split(",") if sub.strip()])
            
    # Normalize team challenge
    normalized_challenge_domain = normalize_to_domain(team_challenge)
    
    # Check if direct domain track matches
    if normalized_challenge_domain != "General Track" and normalized_challenge_domain in pref_cats:
        pref_score = 50.0
        explanations.append(f"Preferred Track Match: Evaluator specializes in track '{normalized_challenge_domain}' (+50.0 pts)")
    else:
        # Fallback keyword matching in raw challenge text
        challenge_lower = (team_challenge or "").strip().lower()
        if challenge_lower:
            for cat in pref_cats:
                cat_lower = cat.lower()
                if cat_lower in challenge_lower or any(kw in challenge_lower for kw in DOMAIN_MAPPING if DOMAIN_MAPPING[kw] == cat):
                    pref_score = 50.0
                    explanations.append(f"Preferred Track Match (Keyword): Evaluator specializes in track '{cat}' (+50.0 pts)")
                    break
    score += pref_score

    # 2. Domain Alignment (Max 40 points)
    domain_score = 0.0
    eval_domains = set()
    if evaluator.domain:
        for sub in evaluator.domain.split(","):
            eval_domains.add(normalize_to_domain(sub))
    for cat in pref_cats:
        eval_domains.add(cat)
        
    # Standardize member domains
    matching_member_domains = 0
    for m in team_members:
        if m.domain:
            for sub in m.domain.split(","):
                m_normalized = normalize_to_domain(sub)
                if m_normalized != "General Track" and m_normalized in eval_domains:
                    matching_member_domains += 1
                    break  # Count once per member
                    
    if matching_member_domains > 0:
        domain_score = min(40.0, 20.0 + (matching_member_domains * 10.0))
        explanations.append(f"Domain alignment with {matching_member_domains} team members (+{domain_score:.1f} pts)")
        
    # Check if any evaluator domain matches team challenge domain
    if normalized_challenge_domain != "General Track" and normalized_challenge_domain in eval_domains:
        domain_score = min(40.0, domain_score + 15.0)
        explanations.append(f"Evaluator domain alignment with challenge track '{normalized_challenge_domain}' (+15.0 pts)")
    else:
        # Check if evaluator domain terms appear in challenge description
        challenge_lower = (team_challenge or "").strip().lower()
        for d in eval_domains:
            if d.lower() in challenge_lower:
                domain_score = min(40.0, domain_score + 15.0)
                explanations.append(f"Evaluator domain '{d}' matches challenge keywords (+15.0 pts)")
                break
                
    score += domain_score

    # 3. Skill Tags Overlap (Max 40 points)
    skill_score = 0.0
    eval_skills = set()
    for s in (evaluator.skill_tags or []):
        if s:
            eval_skills.update([sub.strip().lower() for sub in s.split(",") if sub.strip()])
            
    if eval_skills:
        member_skills = set()
        for m in team_members:
            for s in (m.skill_tags or []):
                if s:
                    member_skills.update([sub.strip().lower() for s in s.split(",") if s.strip()])
                    
        intersection = eval_skills.intersection(member_skills)
        if intersection:
            overlap_count = len(intersection)
            skill_score = min(40.0, overlap_count * 10.0)
            explanations.append(f"Tech stack overlaps on {overlap_count} skills: {', '.join(list(intersection)[:3])} (+{skill_score:.1f} pts)")
            
        # Check if skills are in challenge description
        challenge_lower = (team_challenge or "").strip().lower()
        challenge_overlap_count = 0
        for skill in eval_skills:
            if skill in challenge_lower:
                challenge_overlap_count += 1
        if challenge_overlap_count > 0 and skill_score < 40.0:
            additional_skills = challenge_overlap_count * 5.0
            skill_score = min(40.0, skill_score + additional_skills)
            explanations.append(f"Expertise matches {challenge_overlap_count} challenge keywords (+{additional_skills:.1f} pts)")

    score += skill_score

    # 4. Experience & Balance (Max 20 points)
    experience_score = 10.0 # Baseline
    eval_exp = (evaluator.experience_level or "intermediate").strip().lower()
    
    if eval_exp == "advanced":
        experience_score += 5.0
        explanations.append("High experience level multiplier (+5.0 pts)")
    else:
        experience_score += 2.0
        explanations.append("Standard experience profile (+2.0 pts)")
        
    score += experience_score
    
    # Ensure final score is bounded in [10, 100] if no conflict
    final_score = max(10.0, min(100.0, score))
    explanation_str = " | ".join(explanations) if explanations else "Standard matching assignment based on baseline parameters."
    
    return round(final_score, 2), explanation_str


def generate_compatibility_matrix(evaluators: List[Evaluator], teams: List[Tuple[Team, List[Participant]]]) -> Dict[str, Dict[str, Tuple[float, str]]]:
    """
    Generates a full compatibility score matrix:
    Matrix[evaluator_id][team_id] -> (score, reasoning)
    """
    matrix = {}
    for eval in evaluators:
        matrix[str(eval.id)] = {}
        for team, members in teams:
            score, reason = compute_compatibility_score(eval, members, team.challenge or "")
            matrix[str(eval.id)][str(team.id)] = (score, reason)
    return matrix


def explain_assignment(evaluator: Evaluator, team_members: List[Participant], team_challenge: str) -> str:
    """
    Generates a simple, human-readable paragraph explaining why the match is perfect for UI display.
    """
    score, breakdown = compute_compatibility_score(evaluator, team_members, team_challenge)
    if score == 0:
        return "Not eligible due to institutional conflict of interest."
    
    parts = breakdown.split(" | ")
    domain_desc = ""
    skill_desc = ""
    
    for p in parts:
        if "Domain" in p or "domain" in p:
            domain_desc = "strong conceptual alignment in " + (evaluator.domain or "domain")
        if "skills" in p or "overlaps" in p:
            skill_desc = "deep technology overlap in skillsets"
            
    reconciliation = []
    if domain_desc:
        reconciliation.append(domain_desc)
    if skill_desc:
        reconciliation.append(skill_desc)
        
    match_quality = "Synergistic match"
    if score >= 85:
        match_quality = "Exemplary match"
    elif score >= 70:
        match_quality = "Strong thematic match"
    elif score < 40:
        match_quality = "Baseline match"
        
    reconciliation_str = ", featuring ".join(reconciliation) if reconciliation else "aligned core skills"
    return f"{match_quality} ({score}%): Designed for {reconciliation_str}. No conflicts found. {evaluator.name} is ideally suited."
