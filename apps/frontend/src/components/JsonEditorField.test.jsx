import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import JsonEditorField from './JsonEditorField.jsx';

describe('JsonEditorField', () => {
  it('초기 값이 JSON 문자열로 직렬화되어 textarea 에 표시된다', () => {
    render(
      <JsonEditorField
        label="weights"
        value={{ 수학: 1.2 }}
        onValueChange={() => {}}
      />
    );
    const textarea = screen.getByRole('textbox');
    expect(textarea.value).toContain('수학');
    expect(textarea.value).toContain('1.2');
  });

  it('올바른 JSON 을 입력하면 onValueChange 가 parsed 값으로 호출된다', () => {
    const onChange = vi.fn();
    render(<JsonEditorField label="required" value={[]} onValueChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '["국어","수학"]' } });
    expect(onChange).toHaveBeenCalledWith(['국어', '수학']);
  });

  it('잘못된 JSON 입력 시 에러 문구가 표시되고 onValueChange 는 호출되지 않는다', () => {
    const onChange = vi.fn();
    render(<JsonEditorField label="bad" value={{}} onValueChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{invalid' } });
    expect(screen.getByText(/올바른 JSON/)).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('custom validator 가 에러 문자열을 반환하면 그 문구가 표시된다', () => {
    const onChange = vi.fn();
    render(
      <JsonEditorField
        label="weights"
        value={{}}
        onValueChange={onChange}
        validate={(parsed) => (typeof parsed.수학 === 'number' ? null : '수학 값이 필요합니다.')}
      />
    );
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '{"수학": "abc"}' } });
    expect(screen.getByText('수학 값이 필요합니다.')).toBeDefined();
    expect(onChange).not.toHaveBeenCalled();
  });

  it('required=true 이고 빈 값이면 에러를 띄운다', () => {
    const onChange = vi.fn();
    render(<JsonEditorField label="req" value={{ x: 1 }} onValueChange={onChange} required />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });
    expect(screen.getByText(/필수 JSON 필드/)).toBeDefined();
  });

  it('required=false 이고 빈 값이면 onValueChange(null) 로 커밋된다', () => {
    const onChange = vi.fn();
    render(<JsonEditorField label="opt" value={{ x: 1 }} onValueChange={onChange} />);
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith(null);
  });
});
