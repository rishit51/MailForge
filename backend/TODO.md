# CSV Stress Test TODO - COMPLETE

All files created in tests/. No existing code changed.

## Final Instructions:
1. Activate venv: `source venv/bin/activate`
2. Install: `pip install -r requirements-test.txt`
3. Run unit tests: `pytest tests/test_dataset.py -v`
4. Start server: `uvicorn app:app --reload --port 8000` (new terminal)
5. Stress test (new terminal): `python tests/stress/test_csv_stress.py`
   - Tests 50 concurrent large CSV (1M rows) uploads x 5 rounds.
   - Monitor /uploads/, DB, Celery queues, RAM/CPU.
6. Auth note: Tests expect /datasets/ endpoint; add JWT token to headers for full auth if needed.

Clean up: `rm -rf tests.db uploads/*`

Task complete!
