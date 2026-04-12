from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from ..db import get_db
from ..dependencies import require_roles
from ..models import Role
from ..schemas import UniversityPolicyCreate, UniversityPolicyRead, UniversityPolicyUpdate
from ..services import university_policies as policy_service

router = APIRouter(prefix="/universities", tags=["universities"])


@router.get("/policies", response_model=list[UniversityPolicyRead])
def list_policies(db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    return policy_service.list_policies(db, current_user=current_user)


@router.post("/policies", response_model=UniversityPolicyRead)
def create_policy(payload: UniversityPolicyCreate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    return policy_service.create_policy(db, payload=payload, current_user=current_user)


@router.put("/policies/{policy_id}", response_model=UniversityPolicyRead)
def update_policy(policy_id: int, payload: UniversityPolicyUpdate, db: Session = Depends(get_db), current_user=Depends(require_roles(Role.ADMIN))):
    policy, _ = policy_service.update_policy(db, policy_id=policy_id, payload=payload, current_user=current_user)
    return policy
