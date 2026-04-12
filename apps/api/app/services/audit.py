from __future__ import annotations

from typing import Any

from sqlalchemy.orm import Session

from ..models import AuditLog, ChangeHistory, RecalculationJob, RecalculationStatus, RecalculationTrigger
from ..time_utils import utc_now


ENTITY_LABELS = {
    "exams": "시험",
    "questions": "문항",
    "student_profiles": "학생 프로필",
    "student_results": "학생 결과",
    "student_strategies": "전략",
    "target_university_profiles": "목표 대학",
    "university_score_policies": "대학 정책",
    "learning_habit_snapshots": "학습 습관",
}

ACTION_LABELS = {
    "create": "생성",
    "update": "수정",
    "replace": "교체",
    "recalculate": "재계산",
}

TRIGGER_LABELS = {
    RecalculationTrigger.RESULT_CHANGED.value: "학생 결과 변경",
    RecalculationTrigger.POLICY_CHANGED.value: "대학 정책 변경",
    RecalculationTrigger.QUESTION_TAG_CHANGED.value: "문항 단원 태그 변경",
    RecalculationTrigger.MANUAL.value: "수동 재계산",
}

FIELD_LABELS = {
    "subject_id": "과목",
    "class_group_id": "반",
    "name": "이름",
    "exam_date": "시행일",
    "total_score": "총점",
    "time_limit_minutes": "시간 제한",
    "is_retake": "재시험 여부",
    "number": "문항 번호",
    "teacher_difficulty": "초기 난이도",
    "answer_key": "정답",
    "points": "배점",
    "question_type": "문제 유형",
    "problem_style": "문항 스타일",
    "estimated_seconds": "예상 풀이 시간",
    "unit_mappings": "단원 매핑",
    "weekly_available_hours": "주간 가용 시간",
    "preferred_subjects": "선호 과목",
    "disliked_subjects": "비선호 과목",
    "learning_style_preferences": "학습 방식 선호",
    "goals": "목표 대학",
    "academic_year": "학년도",
    "university_name": "대학 이름",
    "admission_type": "전형 유형",
    "subject_weights": "과목 반영 비중",
    "required_subjects": "필수 과목",
    "bonus_rules": "가산점 규칙",
    "grade_conversion_rules": "등급 환산 규칙",
    "target_score": "목표 점수",
    "notes": "메모",
    "raw_score": "원점수",
    "percentile": "백분위",
    "grade": "등급",
    "completed_in_seconds": "응시 시간",
    "result_status": "결과 상태",
    "question_breakdown": "문항 분포",
}

STATUS_LABELS = {
    RecalculationStatus.QUEUED.value: "대기",
    RecalculationStatus.PROCESSING.value: "처리 중",
    RecalculationStatus.COMPLETED.value: "완료",
    RecalculationStatus.FAILED.value: "실패",
}


def _entity_label(entity_type: str) -> str:
    return ENTITY_LABELS.get(entity_type, entity_type)


def _field_label(field_name: str) -> str:
    return FIELD_LABELS.get(field_name, field_name)


def _action_label(action: str) -> str:
    if action.startswith("review:"):
        decision = action.split(":", 1)[1]
        review_map = {"approve": "전략 승인", "hold": "전략 보류", "revise": "전략 수정"}
        return review_map.get(decision, action)
    return ACTION_LABELS.get(action, action)


def _impact_student_count(data: dict[str, Any] | None) -> int:
    if not data:
        return 0
    student_ids = data.get("student_ids")
    if isinstance(student_ids, list):
        return len(student_ids)
    scope = data.get("scope")
    if isinstance(scope, dict):
        scoped_ids = scope.get("student_ids")
        if isinstance(scoped_ids, list):
            return len(scoped_ids)
    details = data.get("details")
    if isinstance(details, dict):
        detail_ids = details.get("student_ids")
        if isinstance(detail_ids, list):
            return len(detail_ids)
    return 0


def _payload_keys(payload: dict[str, Any]) -> list[str]:
    return sorted(str(key) for key in payload.keys())[:5]


def serialize_audit_log(log: AuditLog) -> dict[str, Any]:
    entity_label = _entity_label(log.entity_type)
    action_label = _action_label(log.action)
    payload = log.payload or {}
    impact_student_count = _impact_student_count(payload)
    key_preview = ", ".join(_payload_keys(payload)) if payload else ""
    summary = f"{entity_label} #{log.entity_id or '-'} {action_label}"
    if key_preview:
        summary += f" · 필드 {key_preview}"
    if impact_student_count:
        summary += f" · 영향 학생 {impact_student_count}명"
    return {
        "id": log.id,
        "actor_user_id": log.actor_user_id,
        "entity_type": log.entity_type,
        "entity_id": log.entity_id,
        "action": log.action,
        "payload": payload,
        "created_at": log.created_at,
        "display_entity": entity_label,
        "display_action": action_label,
        "summary": summary,
        "impact_student_count": impact_student_count,
    }


def serialize_change_history(change: ChangeHistory) -> dict[str, Any]:
    entity_label = _entity_label(change.entity_type)
    field_label = _field_label(change.field_name)
    summary = f"{entity_label} #{change.entity_id} · {field_label} 변경"
    return {
        "id": change.id,
        "entity_type": change.entity_type,
        "entity_id": change.entity_id,
        "field_name": change.field_name,
        "old_value": change.old_value,
        "new_value": change.new_value,
        "changed_by_user_id": change.changed_by_user_id,
        "changed_at": change.changed_at,
        "display_entity": entity_label,
        "display_field_name": field_label,
        "summary": summary,
    }


def serialize_recalculation_job(job: RecalculationJob) -> dict[str, Any]:
    entity_label = _entity_label(job.entity_type)
    trigger_label = TRIGGER_LABELS.get(job.trigger.value if hasattr(job.trigger, "value") else job.trigger, job.trigger)
    impact_student_count = _impact_student_count(job.scope or {})
    status_value = job.status.value if hasattr(job.status, "value") else str(job.status)
    status_label = STATUS_LABELS.get(status_value, status_value)
    summary = f"{trigger_label} · {entity_label} #{job.entity_id or '-'} · {status_label}"
    if impact_student_count:
        summary += f" · 대상 {impact_student_count}명"
    return {
        "id": job.id,
        "entity_type": job.entity_type,
        "entity_id": job.entity_id,
        "trigger": job.trigger,
        "scope": job.scope or {},
        "status": job.status,
        "requested_by_user_id": job.requested_by_user_id,
        "created_at": job.created_at,
        "executed_at": job.executed_at,
        "details": job.details or {},
        "display_entity": entity_label,
        "trigger_label": trigger_label,
        "summary": summary,
        "impact_student_count": impact_student_count,
    }


def record_audit(
    db: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int | None,
    action: str,
    payload: dict[str, Any] | None = None,
) -> AuditLog:
    log = AuditLog(
        actor_user_id=actor_user_id,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action,
        payload=payload or {},
    )
    db.add(log)
    db.flush()
    return log


def record_changes(
    db: Session,
    *,
    actor_user_id: int | None,
    entity_type: str,
    entity_id: int,
    before: dict[str, Any],
    after: dict[str, Any],
) -> list[ChangeHistory]:
    changes: list[ChangeHistory] = []
    keys = sorted(set(before) | set(after))
    for key in keys:
        if before.get(key) == after.get(key):
            continue
        item = ChangeHistory(
            entity_type=entity_type,
            entity_id=entity_id,
            field_name=key,
            old_value=None if before.get(key) is None else str(before.get(key)),
            new_value=None if after.get(key) is None else str(after.get(key)),
            changed_by_user_id=actor_user_id,
        )
        db.add(item)
        changes.append(item)
    db.flush()
    return changes


def queue_recalculation(
    db: Session,
    *,
    entity_type: str,
    entity_id: int | None,
    trigger: RecalculationTrigger,
    scope: dict[str, Any],
    requested_by_user_id: int | None,
) -> RecalculationJob:
    job = RecalculationJob(
        entity_type=entity_type,
        entity_id=entity_id,
        trigger=trigger,
        scope=scope,
        requested_by_user_id=requested_by_user_id,
        status=RecalculationStatus.QUEUED,
    )
    db.add(job)
    db.flush()
    return job


def mark_job_processing(job: RecalculationJob) -> None:
    job.status = RecalculationStatus.PROCESSING


def mark_job_completed(job: RecalculationJob, details: dict[str, Any] | None = None) -> None:
    job.status = RecalculationStatus.COMPLETED
    job.executed_at = utc_now()
    job.details = details or {}


def mark_job_failed(job: RecalculationJob, details: dict[str, Any]) -> None:
    job.status = RecalculationStatus.FAILED
    job.executed_at = utc_now()
    job.details = details
