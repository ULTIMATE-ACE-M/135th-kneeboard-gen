# 135th Kneeboard Generator

The 135th's private squadron kneeboard generator for DCS World. Build mission planning cards, comms cards, threat cards, and custom reference checklists — all rendered as 768x1024 PNG images ready to drop into your DCS kneeboard folder.

## Features

- **Mission Card Generator** — Waypoints, frequencies, flight members, codes, ROE, and notes on a single page
- **Comms Card** — Dedicated frequencies/TACAN/ILS reference page
- **Threat Card** — SAM/AAA/fighter threat reference with locations and ranges
- **Reference Card Builder** — Create custom checklists and reference tables
- **.miz File Import** — Upload a DCS mission file and auto-extract waypoints, frequencies, and flight data
- **Style Matcher** — Upload an existing kneeboard image and generate new ones that match its color scheme
- **Built-in Templates** — F-16C startup, F/A-18C startup, Caucasus airfields, NATO brevity codes

## Quick Start

### Backend (Python)
```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
python app.py
```

### Frontend (React)
```bash
cd frontend
npm install
npm start
```

### Docker
```bash
docker-compose up --build
```

## License

Private use by the 135th. Modify freely for squadron needs.
