import React from 'react';
import { emptyFlightMember } from '../utils/defaults';

export default function FlightTable({ members, onChange }) {
  const addRow = () => onChange([...members, { ...emptyFlightMember, number: members.length + 1 }]);
  const removeRow = (idx) => onChange(members.filter((_, i) => i !== idx));
  const updateRow = (idx, field, value) => {
    const updated = [...members];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Flight Members</h2>
        <button className="btn btn-sm btn-primary" onClick={addRow}>+ Add Member</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Callsign</th>
            <th>Pilot</th>
            <th>Aircraft</th>
            <th>Role</th>
            <th>Laser</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {members.map((m, i) => (
            <tr key={i}>
              <td><input value={m.number} onChange={e => updateRow(i, 'number', parseInt(e.target.value) || 0)} style={{width: 40}} /></td>
              <td><input value={m.callsign} onChange={e => updateRow(i, 'callsign', e.target.value)} placeholder="Viper 1-1" /></td>
              <td><input value={m.pilot} onChange={e => updateRow(i, 'pilot', e.target.value)} placeholder="Pilot name" /></td>
              <td><input value={m.aircraft} onChange={e => updateRow(i, 'aircraft', e.target.value)} placeholder="F-16C" style={{width: 80}} /></td>
              <td><input value={m.role} onChange={e => updateRow(i, 'role', e.target.value)} placeholder="Lead / Wing" style={{width: 80}} /></td>
              <td><input value={m.laser_code} onChange={e => updateRow(i, 'laser_code', e.target.value)} placeholder="1688" style={{width: 60}} /></td>
              <td><button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>X</button></td>
            </tr>
          ))}
          {members.length === 0 && (
            <tr><td colSpan={7} style={{textAlign: 'center', color: 'var(--text-muted)', padding: 20}}>No flight members added.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
