import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import QuestionEditor from './QuestionEditor.jsx';

const UNITS = [
  { id: 1, name: '대수의 기본', subject_id: 10 },
  { id: 2, name: '미적분 I', subject_id: 10 },
  { id: 3, name: '세포 분열', subject_id: 20 },
];

describe('QuestionEditor', () => {
  it('신규 문항 기본 폼이 렌더된다', () => {
    render(<QuestionEditor question={null} units={UNITS} onSave={() => {}} />);
    expect(screen.getByText('문항 번호')).toBeDefined();
    expect(screen.getByText('단원 매핑')).toBeDefined();
    expect(screen.getByText('문항 추가')).toBeDefined();
  });

  it('subjectId 로 단원 select 가 필터링된다', () => {
    const { container } = render(
      <QuestionEditor question={null} units={UNITS} subjectId={10} onSave={() => {}} />
    );
    // select 에 subject_id=10 단원만 option 으로 렌더되어야 한다
    const selects = container.querySelectorAll('select');
    // 첫 번째 select 는 question_type, 두 번째 problem_style, 그 다음이 단원 매핑
    const unitSelect = Array.from(selects).find((select) =>
      Array.from(select.options).some((option) => option.text === '단원 선택')
    );
    expect(unitSelect).toBeDefined();
    const optionTexts = Array.from(unitSelect.options).map((option) => option.text);
    expect(optionTexts).toContain('대수의 기본');
    expect(optionTexts).toContain('미적분 I');
    expect(optionTexts).not.toContain('세포 분열');
  });

  it('단원 매핑이 비면 저장 시 에러 문구가 뜨고 onSave 는 호출되지 않는다', () => {
    const onSave = vi.fn();
    render(<QuestionEditor question={null} units={UNITS} onSave={onSave} />);
    // 문항 번호 채우기
    const numberInput = document.querySelector('input[type="number"]');
    fireEvent.change(numberInput, { target: { value: '1' } });
    // 단원 매핑을 안 건드린 상태로 저장 시도
    fireEvent.click(screen.getByText('문항 추가'));
    expect(screen.getByText(/단원 매핑을 최소 한 개/)).toBeDefined();
    expect(onSave).not.toHaveBeenCalled();
  });

  it('유효한 값으로 저장하면 onSave 에 정규화된 payload 가 전달된다', async () => {
    const onSave = vi.fn().mockResolvedValue();
    const { container } = render(
      <QuestionEditor question={null} units={UNITS} subjectId={10} onSave={onSave} />
    );
    // 문항 번호
    const inputs = container.querySelectorAll('input[type="number"]');
    // number, teacher_difficulty, points, estimated_seconds 순서
    fireEvent.change(inputs[0], { target: { value: '3' } });
    // 단원 select 선택
    const selects = container.querySelectorAll('select');
    const unitSelect = Array.from(selects).find((select) =>
      Array.from(select.options).some((option) => option.text === '대수의 기본')
    );
    fireEvent.change(unitSelect, { target: { value: '1' } });

    fireEvent.click(screen.getByText('문항 추가'));
    // onSave 는 micro-task 이후 호출될 수 있어 짧게 대기
    await Promise.resolve();
    expect(onSave).toHaveBeenCalled();
    const payload = onSave.mock.calls[0][0];
    expect(payload.number).toBe(3);
    expect(payload.unit_mappings).toEqual([{ unit_id: 1, weight: 1 }]);
    expect(payload.question_type).toBe('multiple_choice');
  });

  it('기존 문항을 수정 모드로 넘기면 값이 채워진다', () => {
    const question = {
      id: 99,
      number: 7,
      teacher_difficulty: 4,
      answer_key: 'C',
      points: 5,
      question_type: 'short_answer',
      problem_style: 'application',
      estimated_seconds: 120,
      unit_mappings: [{ unit_id: 2, weight: 0.6 }],
    };
    render(<QuestionEditor question={question} units={UNITS} subjectId={10} onSave={() => {}} />);
    expect(screen.getByText('문항 수정 저장')).toBeDefined();
    expect(screen.getByDisplayValue('C')).toBeDefined();
    expect(screen.getByDisplayValue(7)).toBeDefined();
  });
});
