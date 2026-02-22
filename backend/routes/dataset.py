from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv, io, uuid, aiofiles, os
from tasks.process_csv import process_csv_background
from db.db_connection import get_db
from db.db_models import Dataset, SourceType, DatasetRow, User
from dependency import get_current_user
from fastapi_pagination import Page,paginate
dataset_router = APIRouter(prefix="/datasets")


@dataset_router.post("/", response_model=dict)
async def upload_csv(
    background_tasks: BackgroundTasks,
    file: UploadFile = File(...),
    email_column: str = Form(...),
    name: str = Form(...),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # size guard (100MB)
    if file.size and file.size > 100_000_000:
        raise HTTPException(413, "File too large")

    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}.csv"

    # save file to disk (streaming)
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            await f.write(chunk)

    # read just header first
    async with aiofiles.open(file_path, "r") as f:
        header_line = await f.readline()

    reader = csv.DictReader(io.StringIO(header_line))
    if not reader.fieldnames:
        raise HTTPException(400, "CSV has no header")

    columns = [c.strip() for c in reader.fieldnames]
    s_columns = set(columns)
    if len(columns) != len(s_columns):
        raise HTTPException(400, "Duplicate column names")

    if email_column not in s_columns:
        raise HTTPException(400, "Invalid email column")

    # create dataset
    dataset = Dataset(
        source_type=SourceType.CSV,
        json_schema=columns,
        user_id=user.id,
        name=name,
        email_column=email_column,
    )

    db.add(dataset)
    await db.flush()   # get dataset.id
    await db.commit()
    background_tasks.add_task(
        process_csv_background,
        file_path,
        dataset.id
    )
    return {
        "columns": columns,
        "name": dataset.name,
        "email_column": dataset.email_column,
    }
    
from fastapi import Query
from sqlalchemy import select, func
@dataset_router.get("/")
async def list_datasets(
    session: AsyncSession = Depends(get_db),
    page: int = Query(1, ge=1),
    page_size: int = Query(10, ge=1, le=100),
    user: User = Depends(get_current_user)
):
    offset = (page - 1) * page_size

    total_result = await session.execute(
        select(func.count())
        .select_from(Dataset)
        .where(Dataset.user_id == user.id)
    )
    total = total_result.scalar_one()

    result = await session.execute(
        select(Dataset)
        .where(Dataset.user_id == user.id)
        .order_by(Dataset.created_at.desc())
        .offset(offset)
        .limit(page_size)
    )
    datasets = result.scalars().all()

    return {
        "data": [
            {
                "id": d.id,
                "name": d.name,
                "type": d.source_type,
                "rows": d.processed_rows,
                "status": d.dataset_status,
                "date": d.created_at.strftime("%d %b %Y"),
            }
            for d in datasets
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }
@dataset_router.get('/preview/{dataset_id}')
async def get_preview(
    dataset_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(Dataset).where(
            Dataset.user_id == user.id,
            Dataset.id == dataset_id
        )
    )
    dataset = result.scalar_one_or_none()

    if dataset is None:
        raise HTTPException(status_code=404, detail="Dataset not found")

    rows_result = await db.execute(
        select(DatasetRow.row_data)
        .where(DatasetRow.dataset_id == dataset.id)
        .limit(5)
    )

    response = {
        "json_schema": dataset.json_schema,
        "rows": rows_result.scalars().all()
    }

    return response