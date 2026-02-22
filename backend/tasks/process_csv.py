from db.db_connection import AsyncSessionLocal
import aiofiles, csv, io, os
from db.db_models import Dataset, DatasetRow, DatasetStatus
from sqlalchemy import select
from typing import Optional

async def process_csv_background(file_path: str, dataset_id: int):
    batch_size = 1000
    rows_buffer = []
    total_rows = 0

    async with AsyncSessionLocal() as db:
        dataset: Optional[Dataset] = None

        try:
            result = await db.execute(
                select(Dataset).where(Dataset.id == dataset_id)
            )
            dataset = result.scalar_one_or_none()

            if dataset is None:
                return

            # load file once (safe version)
            async with aiofiles.open(file_path, "r") as f:
                content = await f.read()

            reader = csv.DictReader(io.StringIO(content))

            if not reader.fieldnames:
                raise Exception("CSV missing header")

            for row in reader:
                cleaned = {
                    k.strip(): (v.strip() if v else "")
                    for k, v in row.items()
                }

                rows_buffer.append(
                    DatasetRow(dataset_id=dataset_id, row_data=cleaned)
                )

                if len(rows_buffer) >= batch_size:
                    db.add_all(rows_buffer)
                    await db.flush()
                    total_rows += len(rows_buffer)
                    rows_buffer = []

            if rows_buffer:
                db.add_all(rows_buffer)
                total_rows += len(rows_buffer)

            if total_rows == 0:
                raise Exception("CSV had no rows")
            dataset.processed_rows = total_rows
            dataset.dataset_status = DatasetStatus.COMPLETED
            await db.commit()

        except Exception as e:
            await db.rollback()

            if dataset is not None:
                dataset.dataset_status = DatasetStatus.FAILED
                await db.commit()

            print("CSV processing failed:", e)

        finally:
            if os.path.exists(file_path):
                os.remove(file_path)