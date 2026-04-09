import React, { useState, useCallback } from 'react';
import MissionForm from './components/MissionForm';
import WaypointTable from './components/WaypointTable';
import FrequencyTable from './components/FrequencyTable';
import FlightTable from './components/FlightTable';
import ThreatTable from './components/ThreatTable';
import MizUploader from './components/MizUploader';
import PreviewPanel from './components/PreviewPanel';
import ReferenceBuilder from './components/ReferenceBuilder';
import StyleMatcher from './components/StyleMatcher';
import { emptyMissionData } from './utils/defaults';
import { previewPage, generateKneeboard } from './utils/api';

const PAGES = [
  { id: 'mission', label: 'Mission Editor', icon: '\u2708' },
  { id: 'import', label: 'Import .miz', icon: '\uD83D\uDCC2' },
  { id: 'reference', label: 'Reference Cards', icon: '\uD83D\uDCCB' },
  { id: 'style', label: 'Style Matcher', icon: '\uD83C\uDFA8' },
];

export default function App() {
  const [activePage, setActivePage] = useState('mission');
  const [activeTab, setActiveTab] = useState('info');
  const [missionData, setMissionData] = useState({ ...emptyMissionData });
  const [previewUrl, setPreviewUrl] = useState(null);
  const [previewType, setPreviewType] = useState('mission');
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState('');

  const updateField = useCallback((field, value) => {
    setMissionData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePreview = useCallback(async (pageType = 'mission') => {
    setLoading(true);
    setStatus('Generating preview...');
    try {
      const url = await previewPage(missionData, pageType);
      setPreviewUrl(url);
      setPreviewType(pageType);
      setStatus('Preview ready');
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setLoading(false);
  }, [missionData]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setStatus('Generating all pages...');
    try {
      const res = await generateKneeboard(missionData);
      setStatus(`Generated ${res.data.count} pages: ${res.data.pages.join(', ')}`);
    } catch (err) {
      setStatus(`Error: ${err.message}`);
    }
    setLoading(false);
  }, [missionData]);

  const handleMizImport = useCallback((data) => {
    setMissionData(prev => ({ ...prev, ...data }));
    setActivePage('mission');
    setStatus('Mission data imported from .miz');
  }, []);

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <h1>135TH KNEEBOARD GEN</h1>
        <span className="subtitle">135th Squadron Kneeboard Generator</span>
        <div style={{ marginLeft: 'auto', display: 'flex', gap: 12, alignItems: 'center' }}>
          {status && (
            <span className={`badge ${loading ? 'badge-amber' : 'badge-green'}`}>
              {status}
            </span>
          )}
        </div>
      </header>

      {/* Sidebar */}
      <nav className="sidebar">
        <div className="nav-section">
          <h3>Pages</h3>
          {PAGES.map(p => (
            <button
              key={p.id}
              className={`nav-btn ${activePage === p.id ? 'active' : ''}`}
              onClick={() => setActivePage(p.id)}
            >
              <span className="icon">{p.icon}</span>
              {p.label}
            </button>
          ))}
        </div>

        <div className="nav-section">
          <h3>Quick Actions</h3>
          <button className="nav-btn" onClick={() => handlePreview('mission')}>
            <span className="icon">&#128065;</span> Preview Mission
          </button>
          <button className="nav-btn" onClick={() => handlePreview('comms')}>
            <span className="icon">&#128225;</span> Preview Comms
          </button>
          <button className="nav-btn" onClick={() => handlePreview('threats')}>
            <span className="icon">&#9888;</span> Preview Threats
          </button>
          <button className="nav-btn" onClick={handleGenerate} disabled={loading}>
            <span className="icon">&#128190;</span> Generate All
          </button>
        </div>

        <div className="nav-section">
          <h3>Squadron</h3>
          <div className="form-group">
            <label>Squadron Name</label>
            <input
              className="form-input"
              value={missionData.squadron_name}
              onChange={e => updateField('squadron_name', e.target.value)}
              placeholder="e.g. VF-84 Jolly Rogers"
            />
          </div>
        </div>
      </nav>

      {/* Main content */}
      <main className="main-content">
        {activePage === 'mission' && (
          <>
            <div className="tabs">
              {[
                { id: 'info', label: 'Mission Info' },
                { id: 'waypoints', label: 'Waypoints' },
                { id: 'frequencies', label: 'Frequencies' },
                { id: 'flight', label: 'Flight' },
                { id: 'threats', label: 'Threats' },
                { id: 'preview', label: 'Preview' },
              ].map(t => (
                <button
                  key={t.id}
                  className={`tab ${activeTab === t.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(t.id)}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {activeTab === 'info' && (
              <MissionForm data={missionData} onChange={updateField} />
            )}
            {activeTab === 'waypoints' && (
              <WaypointTable
                waypoints={missionData.waypoints}
                onChange={wps => updateField('waypoints', wps)}
              />
            )}
            {activeTab === 'frequencies' && (
              <FrequencyTable
                frequencies={missionData.frequencies}
                onChange={freqs => updateField('frequencies', freqs)}
              />
            )}
            {activeTab === 'flight' && (
              <FlightTable
                members={missionData.flight_members}
                onChange={m => updateField('flight_members', m)}
              />
            )}
            {activeTab === 'threats' && (
              <ThreatTable
                threats={missionData.threats}
                onChange={t => updateField('threats', t)}
              />
            )}
            {activeTab === 'preview' && (
              <PreviewPanel
                previewUrl={previewUrl}
                previewType={previewType}
                onPreview={handlePreview}
                loading={loading}
              />
            )}
          </>
        )}

        {activePage === 'import' && (
          <MizUploader onImport={handleMizImport} />
        )}

        {activePage === 'reference' && (
          <ReferenceBuilder squadronName={missionData.squadron_name} />
        )}

        {activePage === 'style' && (
          <StyleMatcher
            missionData={missionData}
            onStyleExtracted={(style) => setStatus('Style extracted — ready to generate matched kneeboards')}
          />
        )}
      </main>
    </div>
  );
          }
