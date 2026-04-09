import React from 'react';
import { emptyWaypoint } from '../utils/defaults';

export default function WaypointTable({ waypoints, onChange }) {
  const addRow = () => {
    onChange([...waypoints, { ...emptyWaypoint, number: waypoints.length }]);
  };

  const removeRow = (idx) => {
    onChange(waypoints.filter((_, i) => i !== idx));
  };

  const updateRow = (idx, field, value) => {
    const updated = [...waypoints];
    updated[idx] = { ...updated[idx], [field]: value };
    onChange(updated);
  };

  return (
    <div className="card">
      <div className="card-header">
        <h2>Waypoints</h2>
        <button className="btn btn-sm btn-primary" onClick={addRow}>+ Add Waypoint</button>
      </div>
      <table className="data-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Name</th>
            <th>Alt (ft)</th>
            <th>Speed (kts)</th>
            <th>TOS</th>
            <th>Action</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {waypoints.map((wp, i) => (
            <tr key={i}>
              <td>
                <input value={wp.number} onChange={e => updateRow(i, 'number', parseInt(e.target.value) || 0)} style={{width: 40}} />
              </td>
              <td><input value={wp.name} onChange={e => updateRow(i, 'name', e.target.value)} placeholder="WP name" /></td>
              <td><input value={wp.alt_ft} onChange={e => updateRow(i, 'alt_ft', parseInt(e.target.value) || 0)} style={{width: 70}} /></td>
              <td><input value={wp.speed_kts} onChange={e => updateRow(i, 'speed_kts', parseInt(e.target.value) || 0)} style={{width: 70}} /></td>
              <td><input value={wp.tos} onChange={e => updateRow(i, 'tos', e.target.value)} placeholder="HH:MM" style={{width: 70}} /></td>
              <td><input value={wp.action} onChange={e => updateRow(i, 'action', e.target.value)} placeholder="Action" /></td>
              <td>
                <button className="btn btn-sm btn-danger" onClick={() => removeRow(i)}>X</button>
              </td>
            </tr>
          ))}
          {waypoints.length === 0 && (
            <tr><td colSpan={7} style={{textAlign: 'center', color: 'var(--text-muted)', padding: 20}}>No waypoints yet. Click "+ Add Waypoint" to start.</td></tr>
          )}
        </tbody>
      </table>
    </div>
  );
            }
