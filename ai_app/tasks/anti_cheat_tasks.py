# ai_app/tasks/anti_cheat_tasks.py

import os
import sys
import logging
import ast
import numpy as np
from typing import Dict
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.metrics.pairwise import cosine_similarity

from ai_app.celery_app import celery_app
from ai_app.services.code_analyzer import extract_structural_tokens
from app.core.config import settings
from app.models.anti_cheat import AntiCheatReport

logger = logging.getLogger(__name__)

# --- ⚙️ PRODUCTION CALIBRATION CONSTANTS ---
STRICT_SAME_LANG_THRESHOLD = 0.80   # Strict gate for identical language matching
CROSS_LANG_THRESHOLD = 0.45         # Lowered gate capturing translation logic transformations


def sync_save_plagiarism_results(report_id: int, status_str: str, matches_list: list):
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker

    SYNC_DATABASE_URL = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")
    sync_engine = create_engine(SYNC_DATABASE_URL, pool_pre_ping=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    
    session = SessionLocal()
    try:
        report = session.query(AntiCheatReport).filter(AntiCheatReport.id == report_id).first()
        if report:
            report.status = status_str
            report.matches = {"matches": matches_list}
            session.commit()
            logger.info(f"💾 Saved {len(matches_list)} matches to Report ID {report_id} successfully.")
    except Exception as e:
        logger.error(f"❌ Failed to commit transaction back to DB row: {e}")
        session.rollback()
    finally:
        session.close()


@celery_app.task(bind=True, name='ai_app.tasks.anti_cheat_tasks.run_plagiarism_scan')
def run_plagiarism_scan(self, report_id: int, event_id: str) -> Dict:
    from sqlalchemy import create_engine
    from sqlalchemy.orm import sessionmaker
    
    SYNC_DATABASE_URL = str(settings.DATABASE_URL).replace("postgresql+asyncpg://", "postgresql://")
    sync_engine = create_engine(SYNC_DATABASE_URL, pool_pre_ping=False)
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=sync_engine)
    
    db_session = SessionLocal()
    try:
        logger.info(f"🔍 Fetching ingestion row from DB for Plagiarism Scan ID: {report_id}")
        report = db_session.query(AntiCheatReport).filter(AntiCheatReport.id == report_id).first()
        
        if not report or not report.matches or "raw_submissions" not in report.matches:
            logger.error(f"❌ Aborting scan. Record dataset structure target missing for ID {report_id}")
            return {"status": "failed", "reason": "Target record dataset not found"}

        submission_dataset = report.matches["raw_submissions"]
        file_names = list(submission_dataset.keys())
        
        global_structures = []
        valid_file_names = []

        for f_name in file_names:
            item = submission_dataset[f_name]
            raw_code = item.get("code", "")
            file_extension = str(item.get("ext", ".py")).lower()

            if isinstance(raw_code, bytes):
                source_code_str = raw_code.decode("utf-8", errors="ignore")
            else:
                source_code_str = str(raw_code).strip()

            if source_code_str.startswith("b'") or source_code_str.startswith('b"'):
                try:
                    source_code_str = ast.literal_eval(source_code_str)
                    if isinstance(source_code_str, bytes):
                        source_code_str = source_code_str.decode("utf-8", errors="ignore")
                except Exception:
                    source_code_str = source_code_str[2:-1].replace("\\n", "\n").replace("\\t", "\t")

            try:
                structural_tokens = extract_structural_tokens(source_code_str, file_extension)
                if structural_tokens:
                    global_structures.append(structural_tokens)
                    valid_file_names.append(f_name)
                    logger.info(f"✨ Universally normalized AST tokens for: {f_name}")
            except Exception as parse_err:
                logger.error(f"❌ Parser skipped {f_name}: {parse_err}")

        n_files = len(valid_file_names)
        if n_files < 2:
            logger.info("⏩ Too few valid files across all languages to run comparison.")
            sync_save_plagiarism_results(report_id, "COMPLETED", [])
            return {"status": "success", "flagged_count": 0}

        # --- ⚡ RUN UNIFIED CROSS-LANGUAGE TF-IDF ---
        logger.info(f"🔮 Computing unified cross-language comparison matrix for {n_files} files...")
        vectorizer = TfidfVectorizer(
            ngram_range=(1, 3), 
            token_pattern=r'\S+', 
            min_df=1
        )
        
        tfidf_matrix = vectorizer.fit_transform(global_structures)
        similarity_matrix = cosine_similarity(tfidf_matrix)

        flagged_matches = []
        for i in range(n_files):
            for j in range(i + 1, n_files):
                file_A = valid_file_names[i]
                file_B = valid_file_names[j]
                score = float(np.round(similarity_matrix[i][j], 4))
                
                # Safe fallback parsing using exact file names
                ext_A = os.path.splitext(file_A.lower())[1]
                ext_B = os.path.splitext(file_B.lower())[1]
                
                is_cross_lang = ext_A != ext_B
                target_threshold = CROSS_LANG_THRESHOLD if is_cross_lang else STRICT_SAME_LANG_THRESHOLD
                
                logger.info(f"🔬 Matrix: [{file_A}] vs [{file_B}] -> Score: {score} (Cross-Lang: {is_cross_lang}, Threshold: {target_threshold})")

                if score >= target_threshold:
                    if is_cross_lang:
                        severity = "CRITICAL" if score >= 0.75 else "HIGH" if score >= 0.55 else "WARNING"
                    else:
                        severity = "CRITICAL" if score >= 0.93 else "HIGH" if score >= 0.88 else "WARNING"

                    flagged_matches.append({
                        "file_A": file_A,
                        "file_B": file_B,
                        "similarity_score": score,
                        "severity": severity
                    })

        sorted_matches = sorted(flagged_matches, key=lambda x: x['similarity_score'], reverse=True)
        
        logger.info(f"💾 Saving unified findings to DB. Flagged pairs: {len(sorted_matches)}")
        sync_save_plagiarism_results(report_id, "COMPLETED", sorted_matches)
        
        return {"status": "success", "flagged_count": len(sorted_matches)}

    except Exception as e:
        logger.error(f"❌ Plagiarism task runner execution failure: {str(e)}", exc_info=True)
        try:
            sync_save_plagiarism_results(report_id, "FAILED", [])
        except Exception as db_err:
            logger.error(f"Failed logging failure state: {str(db_err)}")
        raise self.retry(exc=e, countdown=15, max_retries=2)
        
    finally:
        db_session.close()