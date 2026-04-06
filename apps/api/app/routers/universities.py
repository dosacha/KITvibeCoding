from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..models import UniversityScorePolicy
from ..schemas import UniversityPolicyRead


router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("/policies", response_model=list[UniversityPolicyRead])
def list_policies(db: Session = Depends(get_db)) -> list[UniversityPolicyRead]:
    return [UniversityPolicyRead.model_validate(item) for item in db.query(UniversityScorePolicy).order_by(UniversityScorePolicy.university_name.asc()).all()]

