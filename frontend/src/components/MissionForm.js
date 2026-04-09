import React from 'react';
import { THEATERS, MISSION_TYPES, AIRCRAFT_TYPES } from '../utils/defaults';

export default function MissionForm({ data, onChange }) {
  const field = (name, label, placeholder = '') => (
    <div className="form-group">
      <label>{label}</label>
      <input
        className="form-input"
        value={data[name] || ''}
        onChange={e => onChange(name, e.target.value)}
        placeholder={placeholder}
      />
    </div>
  );

  const select = (name, label, options) => (
    <div className="form-group">
      <label>{label}</label>
      <select
        className="form-select"
        value={data[name] || ''}
        onChange={e => onChange(name, e.target.value)}
      >
        <option value="">-- Select --</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Mission Info</h2>
        </div>
        {field('mission_name', 'Mission Name', 'Operation Punching Eagle')}
        <div className="form-row-3">
          {select('theater', 'Theater', THEATERS)}
          {select('mission_type', 'Mission Type', MISSION_TYPES)}
          {select('aircraft_type', 'Aircraft', AIRCRAFT_TYPES)}
        </div>
        <div className="form-row">
          {field('mission_date', 'Date', '2024-06-15')}
          {field('mission_time', 'Start Time', '06:00L')}
        </div>
        {field('weather', 'Weather', 'Wind 5m/s from 270, Clouds 3000m scattered')}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Flight Info</h2>
        </div>
        <div className="form-row">
          {field('callsign', 'Callsign', 'Viper 1-1')}
          {field('package_name', 'Package', 'Package Alpha')}
        </div>
        <div className="form-row-3">
          {field('departure_airfield', 'Departure', 'Kutaisi')}
          {field('recovery_airfield', 'Recovery', 'Kutaisi')}
          {field('divert_airfield', 'Divert', 'Senaki-Kolkhi')}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Codes & Navigation</h2>
        </div>
        <div className="form-row">
          {field('bullseye', 'Bullseye', "N42\u00B015.00 E044\u00B030.00")}
          {field('laser_code', 'Laser Code', '1688')}
        </div>
        <div className="form-row">
          {field('tacan_channel', 'TACAN', '31X')}
          {field('ils_freq', 'ILS Freq', '110.30')}
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h2>ROE & Notes</h2>
        </div>
        <div className="form-group">
          <label>Rules of Engagement</label>
          <textarea
            className="form-textarea"
            value={data.roe || ''}
            onChange={e => onChange('roe', e.target.value)}
            placeholder="Weapons free south of bullseye +30..."
          />
        </div>
        <div className="form-group">
          <label>Mission Notes</label>
          <textarea
            className="form-textarea"
            value={data.notes || ''}
            onChange={e => onChange('notes', e.target.value)}
            placeholder="Additional briefing notes..."
          />
        </div>
      </div>
    </div>
  );
              }
