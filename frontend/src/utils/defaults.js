// Default data structures for new kneeboard forms

export const emptyMissionData = {
  mission_name: '',
  mission_date: '',
  mission_time: '',
  theater: 'Caucasus',
  weather: '',
  callsign: '',
  flight_size: 2,
  aircraft_type: '',
  package_name: '',
  mission_type: '',
  bullseye: '',
  laser_code: '1688',
  tacan_channel: '',
  ils_freq: '',
  departure_airfield: '',
  recovery_airfield: '',
  divert_airfield: '',
  roe: '',
  notes: '',
  squadron_name: '',
  squadron_motto: '',
  waypoints: [],
  frequencies: [],
  flight_members: [],
  threats: [],
};

export const emptyWaypoint = {
  number: 0,
  name: '',
  lat: '',
  lon: '',
  alt_ft: 0,
  speed_kts: 0,
  tos: '',
  action: '',
  notes: '',
};

export const emptyFrequency = {
  name: '',
  freq: '',
  modulation: 'AM',
  notes: '',
};

export const emptyFlightMember = {
  callsign: '',
  number: 1,
  aircraft: '',
  pilot: '',
  role: '',
  laser_code: '',
  tacan: '',
};

export const emptyThreat = {
  name: '',
  type: 'SAM',
  location: '',
  range_nm: '',
  notes: '',
};

export const THEATERS = [
  'Caucasus', 'NTTR', 'Persian Gulf', 'Syria',
  'Mariana Islands', 'South Atlantic', 'Sinai', 'Kola', 'Afghanistan',
];

export const MISSION_TYPES = [
  'CAP', 'BARCAP', 'TARCAP', 'Sweep', 'Escort',
  'CAS', 'BAI', 'SEAD', 'DEAD', 'Strike',
  'Recon', 'FAC', 'Tanker', 'Transport', 'Custom',
];

export const AIRCRAFT_TYPES = [
  'F-16C', 'F/A-18C', 'F-15E', 'F-14B', 'A-10C II',
  'AV-8B', 'JF-17', 'M-2000C', 'Mirage F1',
  'AH-64D', 'UH-1H', 'Mi-24P', 'Ka-50',
  'Su-27', 'Su-33', 'MiG-29', 'J-11A',
  'F-4E', 'F-15C',
];
