import { describe, expect, it } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusBadge from './StatusBadge.jsx';

describe('StatusBadge', () => {
  it('한국어 라벨로 매핑된다', () => {
    render(<StatusBadge status="submitted" />);
    expect(screen.getByText('제출')).toBeDefined();
  });

  it('결시 / 무응답 / 미입력 모두 매핑된다', () => {
    render(
      <>
        <StatusBadge status="absent" />
        <StatusBadge status="unanswered" />
        <StatusBadge status="not_entered" />
      </>
    );
    expect(screen.getByText('결시')).toBeDefined();
    expect(screen.getByText('무응답')).toBeDefined();
    expect(screen.getByText('미입력')).toBeDefined();
  });

  it('전략 상태(승인/보류/초안) 라벨도 매핑된다', () => {
    render(
      <>
        <StatusBadge status="approved" />
        <StatusBadge status="held" />
        <StatusBadge status="pending_review" />
      </>
    );
    expect(screen.getByText('승인')).toBeDefined();
    expect(screen.getByText('보류')).toBeDefined();
    expect(screen.getByText('검토 대기')).toBeDefined();
  });

  it('매핑되지 않은 status 는 raw 값을 그대로 표시한다', () => {
    render(<StatusBadge status="unknown_state" />);
    expect(screen.getByText('unknown_state')).toBeDefined();
  });

  it('label prop 이 status mapping 을 덮어쓴다', () => {
    render(<StatusBadge status="approved" label="custom label" />);
    expect(screen.getByText('custom label')).toBeDefined();
  });

  it('status/label 이 모두 없으면 아무 것도 렌더하지 않는다', () => {
    const { container } = render(<StatusBadge />);
    expect(container.firstChild).toBeNull();
  });
});
