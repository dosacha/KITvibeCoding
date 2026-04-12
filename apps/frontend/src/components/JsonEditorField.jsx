import { useEffect, useState } from 'react';

// JSON 필드용 textarea.
// - 내부적으로는 문자열 상태를 갖는다. 사용자가 타이핑하는 중간 상태는 invalid 할 수 있다.
// - blur 시 또는 onChange 가 호출되는 순간 parse 를 시도해서
//   성공하면 onValueChange(parsed) 를 호출, 실패하면 에러 문구만 표시하고 upstream 값은 건드리지 않는다.
// - `required` 면 빈 값을 거부한다. helperText / exampleText 를 인라인으로 표시한다.
//
// props:
//   label: string
//   value: any (parent 가 관리하는 JS 값)
//   onValueChange(nextValue)
//   helperText, exampleText, required
//   rows (default 4)
//   validate(parsed) -> string | null  (optional 추가 검증, 에러 문구 반환)

function stringify(value) {
  if (value === undefined || value === null) return '';
  if (typeof value === 'string') return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch (err) {
    return '';
  }
}

export default function JsonEditorField({
  label,
  value,
  onValueChange,
  helperText,
  exampleText,
  required = false,
  rows = 4,
  validate,
}) {
  const [text, setText] = useState(() => stringify(value));
  const [error, setError] = useState('');

  // upstream value 가 바뀌면 내부 상태도 싱크한다 (예: 다른 row 선택 시).
  useEffect(() => {
    setText(stringify(value));
    setError('');
  }, [value]);

  const tryCommit = (nextText) => {
    setText(nextText);
    const trimmed = nextText.trim();
    if (trimmed === '') {
      if (required) {
        setError('필수 JSON 필드입니다.');
        return;
      }
      setError('');
      onValueChange(null);
      return;
    }
    let parsed;
    try {
      parsed = JSON.parse(trimmed);
    } catch (err) {
      setError('올바른 JSON 형식이 아닙니다.');
      return;
    }
    if (validate) {
      const customError = validate(parsed);
      if (customError) {
        setError(customError);
        return;
      }
    }
    setError('');
    onValueChange(parsed);
  };

  return (
    <label className="json-editor">
      <span>
        {label}
        {required ? <span className="required-mark"> *</span> : null}
      </span>
      <textarea
        rows={rows}
        value={text}
        onChange={(event) => tryCommit(event.target.value)}
        spellCheck={false}
        className={`mono${error ? ' invalid' : ''}`}
      />
      {helperText ? <span className="muted small">{helperText}</span> : null}
      {exampleText ? <span className="muted small mono">예: {exampleText}</span> : null}
      {error ? <span className="error-text small">{error}</span> : null}
    </label>
  );
}
