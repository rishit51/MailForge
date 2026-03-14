import asyncio
import httpx
import csv
import io
import time
import os
from concurrent.futures import ThreadPoolExecutor
from typing import Generator
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Generate large CSV for stress (1M rows ~50MB)
def generate_large_csv(num_rows: int = 1000000, columns: list = ['email', 'name', 'phone']) -> bytes:
    output = io.BytesIO()
    writer = csv.writer(output)
    writer.writerow(columns)
    for i in range(num_rows):
        writer.writerow([f'user{i}@example.com', f'User {i}', f'123-456-{i%10000:04d}'])
    return output.getvalue()

CSV_CONTENT = generate_large_csv()

async def upload_csv(client: httpx.AsyncClient, id: int) -> dict:
    files = {'file': ('stress.csv', CSV_CONTENT, 'text/csv')}
    data = {'email_column': 'email', 'name': f'Stress Dataset {id}'}
    
    start = time.time()
    resp = await client.post('/datasets/', files=files, data=data)
    duration = time.time() - start
    
    return {
        'id': id,
        'status': resp.status_code,
        'duration': duration,
        'error': resp.text if resp.status_code != 200 else None
    }

async def stress_test(num_concurrent: int = 50, num_rounds: int = 5):
    async with httpx.AsyncClient(base_url='http://localhost:8000', timeout=300.0) as client:
        # Note: Start FastAPI server with uvicorn app:app --reload for testing
        results = []
        
        for round_num in range(num_rounds):
            logger.info(f'Starting round {round_num + 1}: {num_concurrent} concurrent uploads')
            
            tasks = [upload_csv(client, i) for i in range(num_concurrent)]
            round_results = await asyncio.gather(*tasks)
            results.extend(round_results)
            
            # Success rate
            successes = sum(1 for r in round_results if r['status'] == 200)
            logger.info(f'Round {round_num + 1}: {successes}/{num_concurrent} succeeded')
        
        # Stats
        durations = [r['duration'] for r in results if r['status'] == 200]
        avg_duration = sum(durations) / len(durations) if durations else 0
        throughput = len(durations) / sum(durations) if durations else 0
        
        print(f'\n=== STRESS TEST RESULTS ===')
        print(f'Total uploads attempted: {len(results)}')
        print(f'Successes: {len([r for r in results if r["status"] == 200])}')
        print(f'Avg duration per upload: {avg_duration:.2f}s')
        print(f'Throughput: {throughput:.1f} uploads/sec')
        print(f'Errors: {len([r for r in results if r["status"] != 200])}')
        
        return results

# Run: uvicorn app:app --reload & then python tests/stress/test_csv_stress.py
if __name__ == '__main__':
    asyncio.run(stress_test())
