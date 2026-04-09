import React from 'react';
import { emptyThreat } from '../utils/defaults';

export default function ThreatTable({ threats, onChange }) {
  const addRow = () => onChange([...threats, { ...emptyThreat }]);
  const removeRow = (idx) => onChange(threats.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    const updated = [...threats];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  const THREAT_TYPES = ['SAM', 'AAA', 'MANPAD', 'Fighter', 'EWR', 'Ship', 'Other'];

  return (
    <div className="card">
      <div className="card-header">
        <h2>Threats</h2>
        <button className="btn btn-sm btn-primary" onClick={addRow}>+ Add Threat</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Location</th>
            <th>Range (nm)</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {threats.map((t, i) => (
            <tr key={i}>
              <td><input value={t.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="SA-11 Buk" /></td>
              <td>
                <select value={t.type} onChange={e => updateRow(i, 'type', e.target.value)} style={{background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 13}}>
                  {THREAT_TYPES.map(tt => <option key={tt} value={tt}>{tt}</option>)}
                </select>
              </td>
              <td><input value={t.location} onChange={e => updateRow(i, 'location', e.target.value)} placeholder="N42 E044" /></td>
              <td><input value={t.range_nm} onChange={e => updateRow(i, 'range_nm', e.target.value)} placeholder="20" style={{width: 60}} /></td>
              <td><input value={t.notes} onChange={e => updateRow(i, 'notes', e.target.value)} placeholder="Notes" /></td>
              <td><button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>X</button></td>
            </tr>
          ))}
          {threats.length === 0 && (
            <tr><td colSpan={6} style={{textAlign: 'center', color: 'var(--text-muted)', padding: 20}}>No threats added.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
            }
