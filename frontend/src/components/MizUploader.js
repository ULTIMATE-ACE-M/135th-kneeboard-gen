import React, { useState, useRef } from 'react';
import { parseMizFile } from '../utils/api';

export default function MizUploader({ onImport }) {
  const [loading, setLoading] = useState(false);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');
  const [coalition, setCoalition] = useState('blue');
  const [error, setError] = useState('');
  const [missionPreview, setMissionPreview] = useState(null);
  const fileRef = useRef(null);
  const fileObjRef = useRef(null);

  const handleFileSelect = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    fileObjRef.current = file;

    setLoading(true);
    setError('');
    try {
      const res = await parseMizFile(file, coalition);
      setGroups(res.data.groups || []);
      setMissionPreview(res.data.mission);
      setError('');
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  const handleImportGroup = async () => {
    if (!fileObjRef.current) return;
    setLoading(true);
    try {
      const res = await parseMizFile(fileObjRef.current, coalition, selectedGroup);
      onImport(res.data.mission);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Import DCS .miz File</h2>
        </div>

        <div className="form-row" style={{ marginBottom: 16 }}>
          <div className="form-group">
            <label>Coalition</label>
            <select className="form-select" value={coalition} onChange={e => setCoalition(e.target.value)}>
              <option value="blue">Blue (NATO)</option>
              <option value="red">Red (OPFOR)</option>
            </select>
          </div>
        </div>

        <div
          className="upload-area"
          onClick={() => fileRef.current?.click()}
        >
          <div className="icon">&#128194;</div>
          <p>Click to select a .miz file</p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
            DCS World mission files are ZIP archives containing Lua mission data
          </p>
          <input
            ref={fileRef}
            type="file"
            accept=".miz"
            style={{ display: 'none' }}
            onChange={handleFileSelect}
          />
        </div>

        {loading && <p style={{ marginTop: 12, color: 'var(--accent-amber)' }}>Parsing...</p>}
        {error && <p style={{ marginTop: 12, color: 'var(--accent-red)' }}>{error}</p>}
      </div>

      {groups.length > 0 && (
        <div className="card">
          <div className="card-header">
            <h2>Available Flight Groups</h2>
          </div>
          <div className="form-group">
            <label>Select Group</label>
            <select
              className="form-select"
              value={selectedGroup}
              onChange={e => setSelectedGroup(e.target.value)}
            >
              <option value="">All groups (first found)</option>
              {groups.map(g => <option key={g} value={g}>{g}</option>)}
            </select>
          </div>
          <button className="btn btn-success" onClick={handleImportGroup} disabled={loading}>
            Import to Mission Editor
          </button>
        </div>
      )}

      {missionPreview && (
        <div className="card">
          <div className="card-header">
            <h2>Preview</h2>
          </div>
          <pre style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', whiteSpace: 'pre-wrap', maxHeight: 300, overflow: 'auto' }}>
            {JSON.stringify(missionPreview, null, 2)}
          </pre>
        </div>
      )}
    </div>
  );
                }
