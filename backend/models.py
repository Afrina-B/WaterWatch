from datetime import datetime, timezone
import uuid
from backend.database import db


def utc_now():
    return datetime.now(timezone.utc)


class Node(db.Model):
    __tablename__ = "nodes"

    id = db.Column(db.String(32), primary_key=True)
    name = db.Column(db.String(128), nullable=False)
    source_type = db.Column(db.String(32), nullable=False, default="simulated")  # 'hardware' | 'simulated'
    role = db.Column(db.String(64), nullable=True)  # 'Upstream', 'Pollution Area', 'Downstream'
    location = db.Column(db.String(256), nullable=False)
    latitude = db.Column(db.Float, nullable=False)
    longitude = db.Column(db.Float, nullable=False)
    status = db.Column(db.String(32), nullable=False, default="offline")  # 'online' | 'stale' | 'offline'
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False)
    updated_at = db.Column(db.DateTime, default=utc_now, onupdate=utc_now, nullable=False)
    last_seen_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    readings = db.relationship("Reading", back_populates="node", cascade="all, delete-orphan", lazy="dynamic")
    alerts = db.relationship("Alert", back_populates="node", cascade="all, delete-orphan", lazy="dynamic")

    def to_dict(self):
        return {
            "id": self.id,
            "name": self.name,
            "sourceType": self.source_type,
            "isHardware": self.source_type == "hardware",
            "role": self.role or self.name,
            "location": self.location,
            "lat": self.latitude,
            "lng": self.longitude,
            "status": self.status,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "updatedAt": self.updated_at.isoformat() if self.updated_at else None,
            "lastSeenAt": self.last_seen_at.isoformat() if self.last_seen_at else None,
        }


class Reading(db.Model):
    __tablename__ = "readings"

    id = db.Column(db.Integer, primary_key=True, autoincrement=True)
    node_id = db.Column(db.String(32), db.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    device_timestamp = db.Column(db.DateTime, nullable=True)
    received_at = db.Column(db.DateTime, default=utc_now, nullable=False, index=True)
    
    # Sensor measurements
    ph = db.Column(db.Float, nullable=False)
    tds = db.Column(db.Float, nullable=False)  # in ppm
    turbidity = db.Column(db.Float, nullable=False)  # in NTU
    temperature = db.Column(db.Float, nullable=True, default=25.0)  # in °C
    
    # Metadata
    source = db.Column(db.String(32), nullable=False, default="simulated")  # 'hardware' | 'simulated'
    calibration_status = db.Column(db.String(64), nullable=False, default="calibrated")
    raw_adc_ph = db.Column(db.Integer, nullable=True)
    raw_adc_tds = db.Column(db.Integer, nullable=True)
    raw_adc_turbidity = db.Column(db.Integer, nullable=True)
    rssi = db.Column(db.Float, nullable=True)
    uptime = db.Column(db.Integer, nullable=True)

    # Relationship
    node = db.relationship("Node", back_populates="readings")

    def to_dict(self):
        effective_ts = self.device_timestamp or self.received_at
        return {
            "id": self.id,
            "nodeId": self.node_id,
            "timestamp": int(effective_ts.timestamp() * 1000) if effective_ts else None,
            "isoTimestamp": effective_ts.isoformat() if effective_ts else None,
            "receivedAt": self.received_at.isoformat() if self.received_at else None,
            "ph": round(float(self.ph), 2) if self.ph is not None else None,
            "tds": round(float(self.tds), 1) if self.tds is not None else None,
            "turbidity": round(float(self.turbidity), 2) if self.turbidity is not None else None,
            "temperature": round(float(self.temperature), 1) if self.temperature is not None else 25.0,
            "source": self.source,
            "isHardware": self.source == "hardware",
            "calibrationStatus": self.calibration_status,
            "units": {
                "ph": "pH",
                "tds": "ppm",
                "turbidity": "NTU",
                "temperature": "°C",
            },
            "rawAdc": {
                "ph": self.raw_adc_ph,
                "tds": self.raw_adc_tds,
                "turbidity": self.raw_adc_turbidity,
            } if any([self.raw_adc_ph, self.raw_adc_tds, self.raw_adc_turbidity]) else None,
            "rssi": self.rssi,
            "uptime": self.uptime,
        }


class Alert(db.Model):
    __tablename__ = "alerts"

    id = db.Column(db.String(64), primary_key=True, default=lambda: str(uuid.uuid4()))
    node_id = db.Column(db.String(32), db.ForeignKey("nodes.id", ondelete="CASCADE"), nullable=False, index=True)
    reading_id = db.Column(db.Integer, db.ForeignKey("readings.id", ondelete="SET NULL"), nullable=True)
    alert_type = db.Column(db.String(32), nullable=False, default="threshold")  # 'threshold' | 'sensor-fault' | 'anomaly' | 'device'
    parameter = db.Column(db.String(32), nullable=False)  # 'ph' | 'tds' | 'turbidity' | 'temperature' | 'device'
    severity = db.Column(db.String(16), nullable=False)  # 'warning' | 'critical'
    title = db.Column(db.String(128), nullable=False)
    description = db.Column(db.Text, nullable=False)
    observed_value = db.Column(db.Float, nullable=True)
    threshold_value = db.Column(db.String(64), nullable=True)
    status = db.Column(db.String(32), nullable=False, default="active", index=True)  # 'active' | 'acknowledged' | 'resolved'
    created_at = db.Column(db.DateTime, default=utc_now, nullable=False, index=True)
    acknowledged_at = db.Column(db.DateTime, nullable=True)
    resolved_at = db.Column(db.DateTime, nullable=True)

    # Relationships
    node = db.relationship("Node", back_populates="alerts")
    reading = db.relationship("Reading")

    def to_dict(self):
        return {
            "id": self.id,
            "nodeId": self.node_id,
            "readingId": self.reading_id,
            "type": self.alert_type,
            "alertType": self.alert_type,
            "parameter": self.parameter,
            "severity": self.severity,
            "title": self.title,
            "message": self.description,
            "description": self.description,
            "observedValue": self.observed_value,
            "thresholdValue": self.threshold_value,
            "status": self.status,
            "startedAt": int(self.created_at.timestamp() * 1000) if self.created_at else None,
            "createdAt": self.created_at.isoformat() if self.created_at else None,
            "acknowledgedAt": self.acknowledged_at.isoformat() if self.acknowledged_at else None,
            "resolvedAt": self.resolved_at.isoformat() if self.resolved_at else None,
        }
