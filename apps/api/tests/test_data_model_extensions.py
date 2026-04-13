from __future__ import annotations

from app.models import (
    AdmissionDirectionSnapshot,
    DiagnosisSignal,
    GoalGapSubjectDetail,
    GoalReadinessSnapshot,
    LearningHabitSnapshot,
    StudentDiagnosis,
    StudentProfile,
    StudentStrategy,
    StudentStrategyWorkspace,
    StudyRecipeTemplate,
    WeeklyPlan,
    WeeklyPlanItem,
    WeeklyPlanReflection,
)


def test_student_profile_and_habit_hold_self_directed_fields():
    assert hasattr(StudentProfile, "weekday_available_hours")
    assert hasattr(StudentProfile, "weekend_available_hours")
    assert hasattr(StudentProfile, "preferred_study_window")
    assert hasattr(StudentProfile, "student_goal_note")
    assert hasattr(StudentProfile, "last_self_updated_at")

    assert hasattr(LearningHabitSnapshot, "preferred_session_minutes")
    assert hasattr(LearningHabitSnapshot, "preferred_study_slot")
    assert hasattr(LearningHabitSnapshot, "self_reported_obstacles_json")
    assert hasattr(LearningHabitSnapshot, "planner_followthrough_score")
    assert hasattr(LearningHabitSnapshot, "last_reflection_excerpt")


def test_snapshot_signal_and_recipe_tables_exist():
    assert AdmissionDirectionSnapshot.__tablename__ == "admission_direction_snapshots"
    assert GoalReadinessSnapshot.__tablename__ == "goal_readiness_snapshots"
    assert GoalGapSubjectDetail.__tablename__ == "goal_gap_subject_details"
    assert DiagnosisSignal.__tablename__ == "diagnosis_signals"
    assert StudyRecipeTemplate.__tablename__ == "study_recipe_templates"

    assert hasattr(StudentDiagnosis, "admission_direction_snapshot_id")
    assert hasattr(StudentDiagnosis, "goal_readiness_snapshot_id")
    assert hasattr(StudentDiagnosis, "confidence_level")
    assert hasattr(StudentDiagnosis, "low_confidence_reason_json")


def test_strategy_workspace_review_and_plan_models_are_extended():
    assert hasattr(StudentStrategy, "plan_schema_version")
    assert hasattr(StudentStrategy, "source_goal_id")

    for field in [
        "source_strategy_id",
        "base_goal_id",
        "selected_variant",
        "version_no",
        "is_current",
        "weekly_total_hours",
        "weekday_hours",
        "weekend_hours",
        "override_payload_json",
        "constraint_payload_json",
        "approved_strategy_id",
    ]:
        assert hasattr(StudentStrategyWorkspace, field)

    for field in [
        "week_end",
        "generation_source",
        "planned_total_minutes",
        "completed_total_minutes",
        "completion_rate_cached",
        "carry_over_summary_json",
    ]:
        assert hasattr(WeeklyPlan, field)

    for field in [
        "day_of_week",
        "task_type",
        "title",
        "instruction",
        "status",
        "priority_order",
        "rollover_from_item_id",
        "generated_from_signal_code",
    ]:
        assert hasattr(WeeklyPlanItem, field)

    for field in [
        "student_profile_id",
        "reflection_type",
        "wins_text",
        "blocker_text",
        "adjustment_note",
        "submitted_at",
        "instructor_comment",
        "used_in_replan",
    ]:
        assert hasattr(WeeklyPlanReflection, field)
