import React from 'react';

export default function PreviewPanel({ previewUrl, previewType, onPreview, loading }) {
  return (
    <div className="preview-panel">
      <div className="btn-group" style={{ marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={() => onPreview('mission')} disabled={loading}>
          Mission Card
        </button>
        <button className="btn btn-ghost" onClick={() => onPreview('comms')} disabled={loading}>
          Comms Card
        </button>
        <button className="btn btn-ghost" onClick={() => onPreview('threats')} disabled={loading}>
          Threat Card
        </button>
      </div>

      {loading && <p style={{ color: 'var(--accent-amber)' }}>Generating preview...</p>}

      {previewUrl ? (
        <div style={{ position: 'relative' }}>
          <div style={{ marginBottom: 8 }}>
            <span className="badge badge-green">{previewType.toUpperCase()}</span>
            <span style={{ marginLeft: 8, fontSize: 12, color: 'var(--text-muted)' }}>768 x 1024</span>
          </div>
          <img src={previewUrl} alt={`${previewType} kneeboard preview`} />
          <div style={{ marginTop: 12 }}>
            <a
              href={previewUrl}
              download={`kneeboard_${previewType}.png`}
              className="btn btn-success"
            >
              Download PNG
            </a>
          </div>
        </div>
      ) : (
        <div style={{ textAlign: 'center', padding: 60, color: 'var(--text-muted)' }}>
          <p style={{ fontSize: 48, marginBottom: 12 }}>&#128444;</p>
          <p>Click a button above to generate a kneeboard preview</p>
          <p style={{ fontSize: 13, marginTop: 8 }}>Fill in mission data first, then preview each page type</p>
        </div>
      )}
    </div>
  );
}
