"""Seed loader: replaces DB rows with the contents of seed/schemes.json.

Run manually with:  python -m app.seed
The app also auto-seeds on startup when the database is empty.
"""

import json
from pathlib import Path

from app.database import Base, SessionLocal, engine
from app.models import (
    EligibilityRule,
    RequiredDocument,
    Scheme,
    SourceRecord,
)

SEED_FILE = Path(__file__).resolve().parent.parent / "seed" / "schemes.json"


def load_schemes() -> int:
    """Delete existing scheme rows and insert everything from the JSON file."""
    data = json.loads(SEED_FILE.read_text(encoding="utf-8"))

    with SessionLocal() as db:
        # Full reset keeps the seed file the single source of truth.
        db.query(EligibilityRule).delete()
        db.query(RequiredDocument).delete()
        db.query(SourceRecord).delete()
        db.query(Scheme).delete()

        for item in data["schemes"]:
            scheme = Scheme(
                slug=item["slug"],
                name_en=item["name_en"],
                name_hi=item["name_hi"],
                description_en=item["description_en"],
                description_hi=item["description_hi"],
                benefits_en=item["benefits_en"],
                benefits_hi=item["benefits_hi"],
                category_en=item["category_en"],
                category_hi=item["category_hi"],
                state=item.get("state", "All India"),
                target_groups=",".join(item.get("target_groups", [])),
                ministry=item["ministry"],
                official_url=item["official_url"],
                application_steps_en=json.dumps(
                    item["application_steps_en"], ensure_ascii=False
                ),
                application_steps_hi=json.dumps(
                    item["application_steps_hi"], ensure_ascii=False
                ),
                last_verified=item["last_verified"],
                verified=item.get("verified", False),
                todo_note=item.get("todo"),
                age_limit_text=item.get("age_limit_text"),
                income_limit_text=item.get("income_limit_text"),
                application_deadline=item.get("application_deadline"),
                deadline_note=item.get("deadline_note"),
            )
            for rule in item.get("rules", []):
                scheme.rules.append(
                    EligibilityRule(
                        criterion=rule["criterion"],
                        label_en=rule["label_en"],
                        label_hi=rule["label_hi"],
                        operator=rule["operator"],
                        threshold=rule["threshold"],
                        pass_explanation_en=rule["pass_explanation_en"],
                        pass_explanation_hi=rule["pass_explanation_hi"],
                        fail_explanation_en=rule["fail_explanation_en"],
                        fail_explanation_hi=rule["fail_explanation_hi"],
                    )
                )
            for i, doc in enumerate(item.get("documents", [])):
                scheme.documents.append(
                    RequiredDocument(
                        name_en=doc["name_en"],
                        name_hi=doc["name_hi"],
                        instructions_en=doc["instructions_en"],
                        instructions_hi=doc["instructions_hi"],
                        mandatory=doc.get("mandatory", True),
                        where_to_get=doc.get("where_to_get"),
                        typical_effort=doc.get("typical_effort"),
                        todo_note=doc.get("todo"),
                        sort_order=i,
                    )
                )
            for source in item.get("sources", []):
                scheme.sources.append(
                    SourceRecord(
                        label=source["label"],
                        url=source["url"],
                        last_verified=source.get(
                            "last_verified", item["last_verified"]
                        ),
                        version=source.get("version", "1.0"),
                    )
                )
            db.add(scheme)

        db.commit()
        count = db.query(Scheme).count()
    return count


def init_db() -> None:
    """Create tables and seed only if the database is empty (startup hook)."""
    Base.metadata.create_all(bind=engine)
    with SessionLocal() as db:
        if db.query(Scheme).count() == 0:
            load_schemes()


if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print(f"Seeded {load_schemes()} schemes from {SEED_FILE.name}")
