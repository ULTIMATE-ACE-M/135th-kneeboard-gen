import React, { useState } from 'react';
import { generateReference } from '../utils/api';

export default function ReferenceBuilder({ squadronName }) {
  const [cardType, setCardType] = useState('checklist');
  const [title, setTitle] = useState('');
  const [items, setItems] = useState([]);
  const [columns, setColumns] = useState(['name', 'value']);
  const [notes, setNotes] = useState('');
  const [previewUrl, setPreviewUrl] = useState(null);
  const [loading, setLoading] = useState(false);

  const addItem = () => {
    if (cardType === 'checklist') {
      setItems([...items, { step: String(items.length + 1), action: '', expected: '' }]);
    } else {
      const row = {};
      columns.forEach(c => { row[c] = ''; });
      setItems([...items, row]);
    }
  };

  const removeItem = (idx) => setItems(items.filter((_, i) => i !== idx));

  const updateItem = (idx, field, value) => {
    const updated = [...items];
    updated[idx] = { ...updated[idx], [field]: value };
    setItems(updated);
  };

  const handlePreview = async () => {
    setLoading(true);
    try {
      const url = await generateReference({
        title: title || 'Reference Card',
        card_type: cardType,
        items,
        columns,
        notes,
        squadron_name: squadronName,
      });
      setPreviewUrl(url);
    } catch (err) {
      console.error(err);
    }
    setLoading(false);
  };

  return (
    <div>
      <div className="card">
        <div className="card-header">
          <h2>Reference Card Builder</h2>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Card Type</label>
            <select className="form-select" value={cardType} onChange={e => { setCardType(e.target.value); setItems([]); }}>
              <option value="checklist">Checklist</option>
              <option value="reference">Reference Table</option>
              <option value="comms">Comms Reference</option>
              <option value="custom">Custom</option>
            </select>
          </div>
          <div className="form-group">
            <label>Card Title</label>
            <input
              className="form-input"
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="e.g. Startup Checklist"
            />
          </div>
        </div>

        {cardType !== 'checklist' && (
          <div className="form-group">
            <label>Columns (comma-separated)</label>
            <input
              className="form-input"
              value={columns.join(', ')}
              onChange={e => setColumns(e.target.value.split(',').map(c => c.trim()).filter(Boolean))}
              placeholder="name, value, notes"
            />
          </div>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <h2>Items</h2>
          <button className="btn btn-sm btn-primary" onClick={addItem}>+ Add Item</button>
        </div>

        {cardType === 'checklist' ? (
          <table className="data-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Action</th>
                <th>Expected</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  <td><input value={item.step} onChange={e => updateItem(i, 'step', e.target.value)} style={{width: 40}} /></td>
                  <td><input value={item.action} onChange={e => updateItem(i, 'action', e.target.value)} placeholder="Action step" /></td>
                  <td><input value={item.expected} onChange={e => updateItem(i, 'expected', e.target.value)} placeholder="Expected result" /></td>
                  <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(i)}>X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                {columns.map(c => <th key={c}>{c.toUpperCase()}</th>)}
                <th></th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, i) => (
                <tr key={i}>
                  {columns.map(c => (
                    <td key={c}><input value={item[c] || ''} onChange={e => updateItem(i, c, e.target.value)} /></td>
                  ))}
                  <td><button className="btn btn-sm btn-danger" onClick={() => removeItem(i)}>X</button></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div className="form-group" style={{ marginTop: 16 }}>
          <label>Notes</label>
          <textarea className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} placeholder="Card notes..." />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
        <button className="btn btn-primary" onClick={handlePreview} disabled={loading}>
          {loading ? 'Generating...' : 'Generate Preview'}
        </button>
      </div>

      {previewUrl && (
        <div className="card">
          <div className="card-header"><h2>Preview</h2></div>
          <div className="preview-panel">
            <img src={previewUrl} alt="Reference card preview" />
            <a href={previewUrl} download={`${title || 'reference'}.png`} className="btn btn-success">Download PNG</a>
          </div>
        </div>
      )}
    </div>
  );
}
