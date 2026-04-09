"""Flask API for the DCS Kneeboard Generator."""
from __future__ import annotations
import io
import json
import zipfile
from pathlib import Path

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS

from backend.config import OUTPUT_DIR, UPLOAD_DIR
from backend.kneeboard.models import (
    MissionData, Waypoint, Frequency, FlightMember, ThreatInfo, ReferenceCard
)
from backend.kneeboard.renderer import KneeboardRenderer
from backend.kneeboard.style_matcher import StyleMatcher, StyleProfile
from backend.parsers.miz_parser import MizParser


def create_app() -> Flask:
    app = Flask(__name__)
    CORS(app)
    renderer = KneeboardRenderer()

    @app.route("/api/health")
    def health():
        return jsonify({"status": "ok", "version": "1.0.0"})

    @app.route("/api/generate", methods=["POST"])
    def generate_kneeboard():
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON body provided"}), 400
        data = _json_to_mission_data(payload)
        pages = renderer.render_all(data, prefix=payload.get("prefix", "kneeboard"))
        if request.args.get("format") == "zip":
            return _zip_response(pages, f"{data.callsign or 'kneeboard'}_pages.zip")
        return jsonify({"status": "ok", "pages": [str(p.name) for p in pages], "count": len(pages)})
    @app.route("/api/preview", methods=["POST"])
    def preview_page():
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON body"}), 400
        data = _json_to_mission_data(payload)
        page_type = payload.get("page_type", "mission")
        if page_type == "mission":
            img = renderer.render_mission_card(data)
        elif page_type == "comms":
            img = renderer.render_comms_card(data)
        elif page_type == "threats":
            img = renderer.render_threat_card(data)
        elif page_type == "reference":
            card = _json_to_reference_card(payload.get("reference_card", {}))
            img = renderer.render_reference_card(card)
        else:
            return jsonify({"error": f"Unknown page_type: {page_type}"}), 400
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png", download_name=f"{page_type}.png")

    @app.route("/api/parse-miz", methods=["POST"])
    def parse_miz():
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        f = request.files["file"]
        if not f.filename.endswith(".miz"):
            return jsonify({"error": "File must be a .miz file"}), 400
        miz_bytes = f.read()
        coalition = request.form.get("coalition", "blue")
        group_name = request.form.get("group", "")
        try:
            with MizParser(miz_bytes=miz_bytes) as parser:
                groups = parser.parse_all_groups(coalition)
                data = parser.parse(coalition=coalition, group_name=group_name)
        except Exception as e:
            return jsonify({"error": f"Failed to parse .miz: {str(e)}"}), 400
        return jsonify({"status": "ok", "groups": groups, "mission": _mission_data_to_json(data)})

    @app.route("/api/generate-reference", methods=["POST"])
    def generate_reference():
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON body"}), 400
        card = _json_to_reference_card(payload)
        img = renderer.render_reference_card(card)
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png",
                         download_name=f"{card.title.replace(' ', '_').lower()}.png")
    @app.route("/api/download/<filename>")
    def download_file(filename: str):
        filepath = OUTPUT_DIR / filename
        if not filepath.exists():
            return jsonify({"error": "File not found"}), 404
        return send_file(filepath, mimetype="image/png", as_attachment=True)

    @app.route("/api/templates")
    def list_templates():
        templates_dir = Path(__file__).parent.parent / "templates"
        templates = []
        if templates_dir.exists():
            for f in templates_dir.glob("*.json"):
                try:
                    t = json.loads(f.read_text())
                    templates.append({
                        "id": f.stem, "name": t.get("name", f.stem),
                        "description": t.get("description", ""), "type": t.get("type", "custom"),
                    })
                except json.JSONDecodeError:
                    pass
        return jsonify({"templates": templates})

    @app.route("/api/templates/<template_id>")
    def get_template(template_id: str):
        templates_dir = Path(__file__).parent.parent / "templates"
        filepath = templates_dir / f"{template_id}.json"
        if not filepath.exists():
            return jsonify({"error": "Template not found"}), 404
        return jsonify(json.loads(filepath.read_text()))

    style_matcher = StyleMatcher()

    @app.route("/api/analyze-style", methods=["POST"])
    def analyze_style():
        if "file" not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        f = request.files["file"]
        img_bytes = f.read()
        try:
            profile = style_matcher.analyze_bytes(img_bytes)
            return jsonify({"status": "ok", "style": profile.to_json()})
        except Exception as e:
            return jsonify({"error": f"Failed to analyze image: {str(e)}"}), 400

    @app.route("/api/generate-styled", methods=["POST"])
    def generate_styled():
        payload = request.get_json()
        if not payload:
            return jsonify({"error": "No JSON body"}), 400
        style_data = payload.get("style")
        if not style_data:
            return jsonify({"error": "No style profile provided"}), 400
        profile = StyleProfile.from_json(style_data)
        styled_renderer = KneeboardRenderer(style_profile=profile)
        data = _json_to_mission_data(payload)
        page_type = payload.get("page_type", "mission")
        if page_type == "mission":
            img = styled_renderer.render_mission_card(data)
        elif page_type == "comms":
            img = styled_renderer.render_comms_card(data)
        elif page_type == "threats":
            img = styled_renderer.render_threat_card(data)
        elif page_type == "reference":
            card = _json_to_reference_card(payload.get("reference_card", {}))
            img = styled_renderer.render_reference_card(card)
        else:
            return jsonify({"error": f"Unknown page_type: {page_type}"}), 400
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        buf.seek(0)
        return send_file(buf, mimetype="image/png", download_name=f"styled_{page_type}.png")

    return app

def _json_to_mission_data(j: dict) -> MissionData:
    data = MissionData(
        mission_name=j.get("mission_name", "UNTITLED"),
        mission_date=j.get("mission_date", ""),
        mission_time=j.get("mission_time", ""),
        theater=j.get("theater", "Caucasus"),
        weather=j.get("weather", ""),
        callsign=j.get("callsign", ""),
        flight_size=j.get("flight_size", 2),
        aircraft_type=j.get("aircraft_type", ""),
        package_name=j.get("package_name", ""),
        mission_type=j.get("mission_type", ""),
        bullseye=j.get("bullseye", ""),
        laser_code=j.get("laser_code", "1688"),
        tacan_channel=j.get("tacan_channel", ""),
        ils_freq=j.get("ils_freq", ""),
        departure_airfield=j.get("departure_airfield", ""),
        recovery_airfield=j.get("recovery_airfield", ""),
        divert_airfield=j.get("divert_airfield", ""),
        roe=j.get("roe", ""),
        notes=j.get("notes", ""),
        squadron_name=j.get("squadron_name", ""),
        squadron_motto=j.get("squadron_motto", ""),
    )
    for wp in j.get("waypoints", []):
        data.waypoints.append(Waypoint(
            number=wp.get("number", 0), name=wp.get("name", ""),
            lat=wp.get("lat", ""), lon=wp.get("lon", ""),
            alt_ft=wp.get("alt_ft", 0), speed_kts=wp.get("speed_kts", 0),
            tos=wp.get("tos", ""), action=wp.get("action", ""), notes=wp.get("notes", ""),
        ))
    for freq in j.get("frequencies", []):
        data.frequencies.append(Frequency(
            name=freq.get("name", ""), freq=freq.get("freq", ""),
            modulation=freq.get("modulation", "AM"), notes=freq.get("notes", ""),
        ))
    for m in j.get("flight_members", []):
        data.flight_members.append(FlightMember(
            callsign=m.get("callsign", ""), number=m.get("number", 0),
            aircraft=m.get("aircraft", ""), pilot=m.get("pilot", ""),
            role=m.get("role", ""), laser_code=m.get("laser_code", ""), tacan=m.get("tacan", ""),
        ))
    for t in j.get("threats", []):
        data.threats.append(ThreatInfo(
            name=t.get("name", ""), type=t.get("type", ""),
            location=t.get("location", ""), range_nm=t.get("range_nm", ""), notes=t.get("notes", ""),
        ))
    return data

def _mission_data_to_json(data: MissionData) -> dict:
    return {
        "mission_name": data.mission_name, "mission_date": data.mission_date,
        "mission_time": data.mission_time, "theater": data.theater,
        "weather": data.weather, "callsign": data.callsign,
        "flight_size": data.flight_size, "aircraft_type": data.aircraft_type,
        "package_name": data.package_name, "mission_type": data.mission_type,
        "bullseye": data.bullseye, "laser_code": data.laser_code,
        "tacan_channel": data.tacan_channel, "ils_freq": data.ils_freq,
        "departure_airfield": data.departure_airfield,
        "recovery_airfield": data.recovery_airfield,
        "divert_airfield": data.divert_airfield,
        "roe": data.roe, "notes": data.notes, "squadron_name": data.squadron_name,
        "waypoints": [
            {"number": w.number, "name": w.name, "lat": w.lat, "lon": w.lon,
             "alt_ft": w.alt_ft, "speed_kts": w.speed_kts, "tos": w.tos,
             "action": w.action, "notes": w.notes}
            for w in data.waypoints
        ],
        "frequencies": [
            {"name": f.name, "freq": f.freq, "modulation": f.modulation, "notes": f.notes}
            for f in data.frequencies
        ],
        "flight_members": [
            {"callsign": m.callsign, "number": m.number, "aircraft": m.aircraft,
             "pilot": m.pilot, "role": m.role, "laser_code": m.laser_code, "tacan": m.tacan}
            for m in data.flight_members
        ],
        "threats": [
            {"name": t.name, "type": t.type, "location": t.location,
             "range_nm": t.range_nm, "notes": t.notes}
            for t in data.threats
        ],
    }


def _json_to_reference_card(j: dict) -> ReferenceCard:
    return ReferenceCard(
        title=j.get("title", "Reference Card"),
        card_type=j.get("card_type", "reference"),
        items=j.get("items", []),
        columns=j.get("columns", []),
        notes=j.get("notes", ""),
        squadron_name=j.get("squadron_name", ""),
    )


def _zip_response(files: list[Path], zip_name: str):
    buf = io.BytesIO()
    with zipfile.ZipFile(buf, "w") as zf:
        for f in files:
            zf.write(f, f.name)
    buf.seek(0)
    return send_file(buf, mimetype="application/zip",
                     as_attachment=True, download_name=zip_name)
