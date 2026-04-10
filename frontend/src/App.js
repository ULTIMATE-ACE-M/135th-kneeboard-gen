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
import MissionMap from './components/MissionMap';
import { emptyMissionData } from './utils/defaults';
import { previewPage, generateKneeboard } from './utils/api';

const NAV_PAGES = [
  { id: 'map',       label: 'Map View',    icon: '\u2295', disabled: false },
  { id: 'mission',   label: 'Kneeboard',   icon: '\u2708', disabled: false },
  { id: 'import',    label: 'Import .miz', icon: '\u229E', disabled: false },
  { id: 'reference', label: 'Ref Cards',   icon: '\u2261', disabled: false },
  { id: 'style',     label: 'Style Match', icon: '\u25C8', disabled: false },
];

const MISSION_TABS = [
  { id: 'info',        label: 'Mission'   },
  { id: 'waypoints',   label: 'Waypoints' },
  { id: 'frequencies', label: 'Comms'     },
  { id: 'flight',      label: 'Flight'    },
  { id: 'threats',     label: 'Threats'   },
  { id: 'preview',     label: 'Preview'   },
];

export default function App() {
  const [activePage,   setActivePage]   = useState('mission');
  const [activeTab,    setActiveTab]    = useState('info');
  const [missionData,  setMissionData]  = useState({ ...emptyMissionData });
  const [previewUrl,   setPreviewUrl]   = useState(null);
  const [previewType,  setPreviewType]  = useState('mission');
  const [loading,      setLoading]      = useState(false);
  const [logs,         setLogs]         = useState([
    { source: 'SYS', msg: 'Dashboard online. Systems nominal.', time: '--:--:--' },
    { source: 'KBD', msg: 'Kneeboard generator ready.',         time: '--:--:--' },
    { source: 'API', msg: 'Awaiting backend connection.',        time: '--:--:--' },
  ]);

  const addLog = useCallback((source, msg) => {
    const time = new Date().toLocaleTimeString('en-GB', { hour12: false });
    setLogs(prev => [...prev.slice(-19), { source, msg, time }]);
  }, []);

  const updateField = useCallback((field, value) => {
    setMissionData(prev => ({ ...prev, [field]: value }));
  }, []);

  const handlePreview = useCallback(async (pageType = 'mission') => {
    setLoading(true);
    addLog('KBD', `Generating ${pageType.toUpperCase()} preview...`);
    try {
      const url = await previewPage(missionData, pageType);
      setPreviewUrl(url);
      setPreviewType(pageType);
      setActiveTab('preview');
      setActivePage('mission');
      addLog('KBD', `${pageType.toUpperCase()} preview ready.`);
    } catch (err) {
      addLog('ERR', err.message);
    }
    setLoading(false);
  }, [missionData, addLog]);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    addLog('KBD', 'Generating all kneeboard pages...');
    try {
      const res = await generateKneeboard(missionData);
      addLog('KBD', `Generated ${res.data.count} pages: ${res.data.pages.join(', ')}`);
    } catch (err) {
      addLog('ERR', err.message);
    }
    setLoading(false);
  }, [missionData, addLog]);

  const handleMizImport = useCallback((data) => {
    setMissionData(prev => ({ ...prev, ...data }));
    setActivePage('mission');
    setActiveTab('info');
    addLog('MIZ', `Imported: ${data.mission_name || 'Unknown mission'}`);
  }, [addLog]);

  return (
    <div className="dashboard">
      <header className="dash-header">
        <div className="dash-header-brand">
          <span className="brand-dot" />
          SYS DASH v1.0
        </div>
        <div className="dash-header-sections">
          <div className={`dash-header-section ${activePage === 'map' ? 'active' : ''}`}>
            <span className="section-label">OPERATIONAL AREA</span>
            <span className="section-rule">RULE B</span>
          </div>
          <div className={`dash-header-section ${activePage !== 'map' ? 'active' : ''}`}>
            <span className="section-label">135TH KNEEBOARD GENERATOR</span>
            {loading && <span className="badge badge-amber">PROCESSING</span>}
          </div>
          <div className="status-bar">
            <span className={`status-dot ${loading ? 'warning' : ''}`}>
              {loading ? 'PROCESSING' : 'ONLINE'}
            </span>
          </div>
        </div>
      </header>

      <div className={`dash-body ${activePage === 'map' ? 'map-mode' : ''}`}>
        <nav className="dash-sidebar">
          <div className="sidebar-section-label">Navigation</div>
          {NAV_PAGES.map(p => (
            <button
              key={p.id}
              className={`sidebar-item ${activePage === p.id ? 'active' : ''} ${p.disabled ? 'disabled' : ''}`}
              onClick={() => !p.disabled && setActivePage(p.id)}
            >
              <span className="item-icon">{p.icon}</span>
              <span>{p.label}</span>
            </button>
          ))}
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Quick Gen</div>
          <button className="sidebar-item" onClick={() => { setActivePage('mission'); handlePreview('mission'); }}>
            <span className="item-icon">&#9655;</span>
            <span>Prev. Msn</span>
          </button>
          <button className="sidebar-item" onClick={() => { setActivePage('mission'); handlePreview('comms'); }}>
            <span className="item-icon">&#9655;</span>
            <span>Prev. Comms</span>
          </button>
          <button className="sidebar-item" onClick={handleGenerate} disabled={loading}>
            <span className="item-icon">&#8861;</span>
            <span>Generate All</span>
          </button>
          <div className="sidebar-divider" />
          <div className="sidebar-section-label">Squadron</div>
          <div style={{ padding: '4px 10px 8px' }}>
            <input
              className="form-input"
              style={{ fontSize: 10, padding: '5px 8px' }}
              value={missionData.squadron_name}
              onChange={e => updateField('squadron_name', e.target.value)}
              placeholder="Squadron name..."
            />
          </div>
        </nav>

        <main className={`dash-main ${activePage === 'map' ? 'map-mode' : ''}`}>
          <div className={`main-inner ${activePage === 'map' ? 'map-mode' : ''}`}>
            {activePage === 'map' && (
              <MissionMap missionData={missionData} onUpdateField={updateField} />
            )}

            {activePage === 'mission' && (
              <>
                <div className="section-header-bar">
                  <h2>Kneeboard Generator</h2>
                  <span className="breadcrumb">135TH SQN / MISSION PLANNER</span>
                </div>
                <div className="tabs">
                  {MISSION_TABS.map(t => (
                    <button
                      key={t.id}
                      className={`tab ${activeTab === t.id ? 'active' : ''}`}
                      onClick={() => setActiveTab(t.id)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
                {activeTab === 'info'        && <MissionForm data={missionData} onChange={updateField} />}
                {activeTab === 'waypoints'   && <WaypointTable waypoints={missionData.waypoints} onChange={wps => updateField('waypoints', wps)} />}
                {activeTab === 'frequencies' && <FrequencyTable frequencies={missionData.frequencies} onChange={f => updateField('frequencies', f)} />}
                {activeTab === 'flight'      && <FlightTable members={missionData.flight_members} onChange={m => updateField('flight_members', m)} />}
                {activeTab === 'threats'     && <ThreatTable threats={missionData.threats} onChange={t => updateField('threats', t)} />}
                {activeTab === 'preview'     && <PreviewPanel previewUrl={previewUrl} previewType={previewType} onPreview={handlePreview} loading={loading} />}
              </>
            )}

            {activePage === 'import' && (
              <>
                <div className="section-header-bar">
                  <h2>Import Mission File</h2>
                  <span className="breadcrumb">135TH SQN / MIZ PARSER</span>
                </div>
                <MizUploader onImport={handleMizImport} />
              </>
            )}

            {activePage === 'reference' && (
              <>
                <div className="section-header-bar">
                  <h2>Reference Card Builder</h2>
                  <span className="breadcrumb">135TH SQN / REFERENCE</span>
                </div>
                <ReferenceBuilder squadronName={missionData.squadron_name} />
              </>
            )}

            {activePage === 'style' && (
              <>
                <div className="section-header-bar">
                  <h2>Style Matcher</h2>
                  <span className="breadcrumb">135TH SQN / STYLE ANALYSIS</span>
                </div>
                <StyleMatcher
                  missionData={missionData}
                  onStyleExtracted={() => addLog('STY', 'Style profile extracted from reference image.')}
                />
              </>
            )}
          </div>
        </main>

        <aside className="dash-panel">
          <div className="panel-section">
            <div className="panel-section-header">Comms Log</div>
            <div className="comms-log">
              {logs.slice(-7).map((l, i) => (
                <div key={i} className="entry">
                  <span className="source">[{l.source}]</span>
                  <span className="time"> {l.time}</span>
                  <br />
                  <span style={{ paddingLeft: 4 }}>{l.msg}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="panel-section">
            <div className="panel-section-header">Mission Info</div>
            <div className="panel-row"><span>OPERATION</span><span className="val cyan">{missionData.mission_name  || '\u2014'}</span></div>
            <div className="panel-row"><span>THEATER</span>  <span className="val">{missionData.theater        || '\u2014'}</span></div>
            <div className="panel-row"><span>TYPE</span>     <span className="val">{missionData.mission_type   || '\u2014'}</span></div>
            <div className="panel-row"><span>AIRCRAFT</span> <span className="val">{missionData.aircraft_type  || '\u2014'}</span></div>
            <div className="panel-row"><span>CALLSIGN</span> <span className="val cyan">{missionData.callsign   || '\u2014'}</span></div>
            <div className="panel-row"><span>DEP</span>      <span className="val">{missionData.departure_airfield || '\u2014'}</span></div>
            <div className="panel-row"><span>RCV</span>      <span className="val">{missionData.recovery_airfield  || '\u2014'}</span></div>
            <div className="panel-row"><span>LASER</span>    <span className="val">{missionData.laser_code     || '\u2014'}</span></div>
          </div>

          <div className="panel-section">
            <div className="panel-section-header">Flights Info</div>
            {missionData.flight_members.length === 0 ? (
              <div style={{ fontSize: 9, color: 'var(--text-muted)', letterSpacing: 1 }}>NO FLIGHT DATA</div>
            ) : (
              missionData.flight_members.slice(0, 4).map((m, i) => (
                <div key={i} className="panel-row">
                  <span>{m.callsign || `Flt ${m.number}`}</span>
                  <span className="val">{m.aircraft || '\u2014'}</span>
                </div>
              ))
            )}
          </div>

          <div className="panel-section">
            <div className="panel-section-header">Squadron Info</div>
            <div className="panel-row"><span>UNIT</span>      <span className="val cyan">{missionData.squadron_name || '135TH'}</span></div>
            <div className="panel-row"><span>STATUS</span>    <span className="val green">ACTIVE</span></div>
            <div className="panel-row"><span>WAYPOINTS</span> <span className="val">{missionData.waypoints.length}</span></div>
            <div className="panel-row"><span>FREQS</span>     <span className="val">{missionData.frequencies.length}</span></div>
            <div className="panel-row"><span>THREATS</span>   <span className={`val ${missionData.threats.length > 0 ? 'red' : ''}`}>{missionData.threats.length}</span></div>
          </div>
      