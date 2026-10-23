"""Pytest configuration.

- Makes the backend package importable.
- Points tests at a separate SQLite file (set BEFORE importing app modules)
  so tests never touch the developer's dev database.
"""

import os
import sys

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

os.environ["DATABASE_URL"] = "sqlite:///./test_jansahayak.db"
