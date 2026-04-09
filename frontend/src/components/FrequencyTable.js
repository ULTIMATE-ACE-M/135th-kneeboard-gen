import React from 'react';
import { emptyFrequency } from '../utils/defaults';

export default function FrequencyTable({ frequencies, onChange }) {
  const addRow = () => onChange([...frequencies, { ...emptyFrequency }]);
  const removeRow = (idx) => onChange(frequencies.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    const updated = [...frequencies];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Frequencies</h2>
        <button className="btn btn-sm btn-primary" onClick={addRow}>+ Add Frequency</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Frequency</th>
            <th>Mod</th>
            <th>Notes</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {frequencies.map((f, i) => (
            <tr key={i}>
              <td><input value={f.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="ATC / AWACS / etc." /></td>
              <td><input value={f.freq} onChange={e => updateRow(i, 'freq', e.target.value)} placeholder="251.000" style={{width: 100}} /></td>
              <td>
                <select value={f.modulation} onChange={e => updateRow(i, 'modulation', e.target.value)} style={{background: 'var(--bg-tertiary)', color: 'var(--text-primary)', border: '1px solid var(--border)', borderRadius: 3, padding: '4px 6px', fontFamily: 'var(--font-mono)', fontSize: 13}}>
                  <option value="AM">AM</option>
                  <option value="FM">FM</option>
                </select>
              </td>
              <td><input value={f.notes} onChange={e => updateRow(i, 'notes', e.target.value)} placeholder="Notes" /></td>
              <td><button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>X</button></td>
            </tr>
          ))}
          {frequencies.length === 0 && (
            <tr><td colSpan={5} style={{textAlign: 'center', color: 'var(--text-muted)', padding: 20}}>No frequencies added.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
