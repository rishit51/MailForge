from db.db_connection import AsyncSessionLocal,SyncSessionLocal
import aiofiles, csv, io, os
from db.db_models import Dataset, DatasetRow, DatasetStatus
from sqlalchemy import select
from typing import Optional
from celery_app import celery_app
import logging
logger = logging.getLogger(__name__)


@celery_app.task(name='tasks.process_csv')
def process_csv_background(file_path: str, dataset_id: int):
    batch_size = 1000
    rows_buffer = []
    total_rows = 0

    with SyncSessionLocal() as db:
        dataset: Optional[Dataset] = None

        try:
            result = db.execute(
                select(Dataset).where(Dataset.id == dataset_id)
            )
            dataset = result.scalar_one_or_none()

            if dataset is None:
                return

            # load file once (safe version)
            with open(file_path, "r", newline="",encoding='utf-8') as f:
                csvreader = csv.DictReader(f)
                fieldnames = csvreader.fieldnames
            

                if not fieldnames:
                    raise Exception("CSV missing header")

                for row in csvreader:
                    cleaned = {
                        k.strip(): (v.strip() if v else "")
                        for k, v in row.items()
                        if k is not None
                    }

                    rows_buffer.append(
                        DatasetRow(dataset_id=dataset_id, row_data=cleaned)
                    )

                    if len(rows_buffer) >= batch_size:
                        db.add_all(rows_buffer)
                        db.flush()
                        total_rows += len(rows_buffer)
                        rows_buffer.clear()

                if rows_buffer:
                    db.add_all(rows_buffer)
                    total_rows += len(rows_buffer)
                    db.flush()

                if total_rows == 0:
                    raise Exception("CSV had no rows")
                dataset.processed_rows = total_rows
                dataset.dataset_status = DatasetStatus.COMPLETED
                db.commit()

        except Exception as e:
            db.rollback()

            if dataset is not None:
                dataset.dataset_status = DatasetStatus.FAILED
                db.commit()
            
            logger.exception("CSV processing failed")

        finally:
            if os.path.exists(file_path):
                os.remove(file_path)