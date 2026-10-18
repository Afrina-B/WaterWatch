import pytest
from backend.app import create_app
from backend.config import TestConfig
from backend.database import db
from backend.models import Node, Reading, Alert
from backend.seed import seed_database


@pytest.fixture
def app():
    app = create_app(TestConfig)
    with app.app_context():
        db.create_all()
        seed_database(app)
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def runner(app):
    return app.test_cli_runner()
