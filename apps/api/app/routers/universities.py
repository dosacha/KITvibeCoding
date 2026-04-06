from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import Role, UniversityScorePolicy
from ..schemas import UniversityPolicyCreate, UniversityPolicyRead, UniversityPolicyUpdate
from ..services.university_policies import create_policy, list_policies, update_policy


router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("/policies", response_model=list[UniversityPolicyRead])
def list_policies_endpoint(
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> list[UniversityPolicyRead]:
    return [UniversityPolicyRead.model_validate(item) for item in list_policies(db)]


@router.post("/policies", response_model=UniversityPolicyRead)
def create_policy_endpoint(
    payload: UniversityPolicyCreate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> UniversityPolicyRead:
    policy = create_policy(db, payload, actor_user_id=current_user.id)
    return UniversityPolicyRead.model_validate(policy)


@router.put("/policies/{policy_id}", response_model=UniversityPolicyRead)
def update_policy_endpoint(
    policy_id: int,
    payload: UniversityPolicyUpdate,
    current_user=Depends(require_roles(Role.ADMIN, Role.INSTRUCTOR)),
    db: Session = Depends(get_db),
) -> UniversityPolicyRead:
    policy = db.get(UniversityScorePolicy, policy_id)
    if policy is None:
        raise HTTPException(status_code=404, detail="대학 정책 정보를 찾지 못했어.")
    updated_policy = update_policy(db, policy, payload, actor_user_id=current_user.id)
    return UniversityPolicyRead.model_validate(updated_policy)
