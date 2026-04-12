import { useEffect, useRef, useState } from 'react';

// CSV 업로드 패널.
// props:
//   token, exam, onUploaded()
// 동작:
//   - 마운트 시 GET /frontend/exams/{id}/csv-template 로 안내/sample 을 받아온다.
//   - "샘플 CSV 다운로드" 버튼은 받아온 csv_text 를 그대로 Blob 으로 만들어 받는다.
//   - 업로드는 multipart/form-data 로 POST /student-results/upload-csv?exam_id=...
//   - 응답: { rows, imported, errors[] } — 부분 실패 row 를 그대로 보여준다.

export default function CsvUploadPanel({ token, exam, apiBaseUrl, onUploaded }) {
  const [template, setTemplate] = useState(null);
  const [templateError, setTemplateError] = useState('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    setTemplate(null);
    setTemplateError('');
    setUploadResult(null);
    setUploadError('');
    if (!exam?.id) return undefined;
    (async () => {
      try {
        const response = await fetch(`${apiBaseUrl}/frontend/exams/${exam.id}/csv-template`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!response.ok) throw new Error('CSV 템플릿을 불러오지 못했습니다.');
        const payload = await response.json();
        if (!cancelled) setTemplate(payload);
      } catch (err) {
        if (!cancelled) setTemplateError(err instanceof Error ? err.message : 'CSV 템플릿 조회 실패');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [apiBaseUrl, exam?.id, token]);

  const downloadTemplate = () => {
    if (!template) return;
    const blob = new Blob([template.csv_text], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.filename || `exam_${exam.id}_template.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileChange = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    setUploadError('');
    setUploadResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await fetch(`${apiBaseUrl}/student-results/upload-csv?exam_id=${exam.id}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.detail || '업로드에 실패했습니다.');
      }
      setUploadResult(payload);
      if (onUploaded) await onUploaded();
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : '업로드 중 오류가 발생했습니다.');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="csv-upload-panel stack-gap">
      <div className="stack-gap">
        <p className="muted small">
          시험 <strong>{exam.name}</strong> 의 결과를 CSV 로 일괄 업로드합니다. 첫 행은 헤더, 한 행이 학생 한 명입니다.
          학생은 <code>student_email</code> 또는 <code>student_profile_id</code> 로 식별합니다.
        </p>
        {templateError ? <div className="error-box">{templateError}</div> : null}
        {template ? (
          <>
            <div className="form-actions">
              <button type="button" onClick={downloadTemplate}>
                샘플 CSV 다운로드
              </button>
              <span className="muted small">{template.filename}</span>
            </div>
            <div className="csv-template-preview">
              <strong className="small">허용 컬럼</strong>
              <div className="chip-list">
                {template.headers.map((header) => (
                  <span key={header} className="chip-item small">
                    {header}
                  </span>
                ))}
              </div>
              <strong className="small">샘플 행</strong>
              <div className="table-wrapper">
                <table className="dense-table">
                  <thead>
                    <tr>
                      {template.headers.map((header) => (
                        <th key={header}>{header}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {template.sample_rows.map((row, index) => (
                      <tr key={index}>
                        {row.map((cell, cellIndex) => (
                          <td key={cellIndex} className="small">
                            {cell || <span className="muted">-</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <strong className="small">운영 안내</strong>
              <ul className="small muted">
                {template.notes.map((note, index) => (
                  <li key={index}>{note}</li>
                ))}
              </ul>
            </div>
          </>
        ) : !templateError ? (
          <div className="empty-state">CSV 템플릿을 불러오는 중입니다...</div>
        ) : null}
      </div>

      <div className="csv-upload-action subtle-card">
        <strong>CSV 업로드</strong>
        <input
          type="file"
          accept=".csv,text/csv"
          ref={fileInputRef}
          onChange={handleFileChange}
          disabled={isUploading}
        />
        {isUploading ? <div className="info-box">업로드 중입니다...</div> : null}
        {uploadError ? <div className="error-box">{uploadError}</div> : null}
        {uploadResult ? (
          <div className={`info-box${uploadResult.errors?.length ? ' warn' : ''}`}>
            <div>
              총 <strong>{uploadResult.rows}</strong> 행 중 <strong>{uploadResult.imported}</strong> 행 저장.
              {uploadResult.errors?.length ? ` 실패 ${uploadResult.errors.length} 행.` : ' 모든 행 저장 완료.'}
            </div>
            {uploadResult.errors?.length ? (
              <details>
                <summary className="small">실패 행 보기</summary>
                <ul className="small">
                  {uploadResult.errors.map((message, index) => (
                    <li key={index}>{message}</li>
                  ))}
                </ul>
              </details>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
