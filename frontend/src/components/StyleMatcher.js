import React, { useState, useRef } from 'react';
import axios from 'axios';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:5000';

function ColorSwatch({ color, label }) {
  const rgb = `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
      <div style={{
        width: 28, height: 28, borderRadius: 4,
        background: rgb, border: '1px solid var(--border)',
      }} />
      <span style={{ fontSize: 12, color: 'var(--text-secondary)', fontFamily: 'var(--font-mono)' }}>
        {label}: {color.join(', ')}
      </span>
    </div>
  );
}

export default function StyleMatcher({ missionData, onStyleExtracted }) {
  const [loading, setLoading] = useState(false);
  const [style, setStyle] = useState(null);
  const [refPreview, setRefPreview] = useState(null);
  const [styledPreview, setStyledPreview] = useState(null);
  const [error, setError] = useState('');
  const fileRef = useRef(null);

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setRefPreview(URL.createObjectURL(file));
    setLoading(true);
    setError('');
    setStyledPreview(null);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await axios.post(`${API_BASE}/api/analyze-style`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setStyle(res.data.style);
      if (onStyleExtracted) onStyleExtracted(res.data.style);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const handleGenerateStyled = async (pageType = 'mission') => {
    if (!style) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API_BASE}/api/generate-styled`, {
        ...missionData,
        style,
        page_type: pageType,
      }, { responseType: 'blob' });

      setStyledPreview(URL.createObjectURL(res.data));
    } catch (err) {
      setError(err.response?.data?.error || 'Generation failed');
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Style Matcher</h2>
          <span className="badge badge-amber">UPLOAD REFERENCE</span>
        </div>
        <p style={{ fontSize: 14, color: 'var(--text-secondary)', marginBottom: 16 }}>
          Upload an existing kneeboard image and we'll extract its color scheme, layout, and styling
          to generate new kneeboards that match.
        </p>

        <div className="upload-area" onClick={() => fileRef.current?.click()}>
          <div className="icon">&#127912;</div>
          <p>Click to upload a reference kneeboard image</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            PNG or JPG — ideally 768x1024 (standard DCS kneeboard size)
          </p>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: 'none' }}
            onChange={handleUpload}
          />
        </div>

        {loading && <p style={{ marginTop: 12, color: 'var(--accent-amber)' }}>Analyzing style...</p>}
        {error && <p style={{ marginTop: 12, color: 'var(--accent-red)' }}>{error}</p>}
      </div>

      {refPreview && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
          <div className="card">
            <div className="card-header">
              <h2>Reference Image</h2>
            </div>
            <img src={refPreview} alt="Reference kneeboard" style={{ maxWidth: '100%', borderRadius: 4, border: '1px solid var(--border)' }} />
          </div>

          {style && (
            <div className="card">
              <div className="card-header">
                <h2>Extracted Style</h2>
              </div>
              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Color Palette
                </h3>
                <ColorSwatch color={style.bg_dark} label="Background" />
                <ColorSwatch color={style.header_bg} label="Header" />
                <ColorSwatch color={style.text_primary} label="Primary Text" />
                <ColorSwatch color={style.text_accent} label="Accent" />
                <ColorSwatch color={style.text_highlight} label="Highlight" />
                <ColorSwatch color={style.text_warning} label="Warning" />
                <ColorSwatch color={style.line_color} label="Lines" />
                <ColorSwatch color={style.row_alt} label="Alt Row" />
              </div>

              <div style={{ marginBottom: 16 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 1, color: 'var(--text-muted)', marginBottom: 8 }}>
                  Layout
                </h3>
                <p style={{ fontSize: 12, fontFamily: 'var(--font-mono)', color: 'var(--text-secondary)' }}>
                  Source: {style.source_width}x{style.source_height}px<br />
                  Theme: {style.is_dark_theme ? 'Dark' : 'Light'}<br />
                  Row height: {style.row_height_px}px<br />
                  Header: {(style.header_height_pct * 100).toFixed(1)}%<br />
                  Font scale: {style.font_scale.toFixed(2)}x
                </p>
              </div>

              <div className="btn-group">
                <button className="btn btn-primary" onClick={() => handleGenerateStyled('mission')} disabled={loading}>
                  Generate Mission
                </button>
                <button className="btn btn-ghost" onClick={() => handleGenerateStyled('comms')} disabled={loading}>
                  Generate Comms
                </button>
                <button className="btn btn-ghost" onClick={() => handleGenerateStyled('threats')} disabled={loading}>
                  Generate Threats
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {styledPreview && (
        <div className="card" style={{ marginTop: 16 }}>
          <div className="card-header">
            <h2>Styled Output</h2>
            <span className="badge badge-green">STYLE MATCHED</span>
          </div>
          <div className="preview-panel">
            <img src={styledPreview} alt="Style-matched kneeboard" />
            <a href={styledPreview} download="styled_kneeboard.png" className="btn btn-success">
              Download PNG
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
