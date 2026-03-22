from fastapi import APIRouter, File, Form, UploadFile, Depends, HTTPException, BackgroundTasks
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import csv, io, uuid, aiofiles, os
from db.models.enums import DatasetStatus
from tasks.process_csv import process_csv_background
from db.db_connection import get_db
from db.db_models import Dataset, SourceType, DatasetRow, User
from dependency import get_current_user
from pydantic_models.dataset import DatasetPreviewResponse, DatasetListResponse,DatasetPreviewResponse,DatasetListItem,DatasetRepr


dataset_router = APIRouter(prefix="/datasets",tags=["Datasets"])


@dataset_router.post( path = '/',response_model=DatasetRepr,  summary="Upload CSV dataset",  description="**Max 100MB**. Validates header/email_column. Saves to `/uploads/`, creates Dataset(PROCESSING), queues Celery task. Why background? Large CSVs don't block. Returns columns immediately.")
async def upload_csv(  file: UploadFile = File(...),   email_column: str = Form(...),    name: str = Form(...),    db: AsyncSession = Depends(get_db),  user: User = Depends(get_current_user)):  
    size = 0
    MAX_SIZE = 100_000_000

    file_id = str(uuid.uuid4())
    file_path = f"uploads/{file_id}.csv"
    os.makedirs("uploads", exist_ok=True)
    # save file to disk (streaming)
    async with aiofiles.open(file_path, "wb") as f:
        while chunk := await file.read(1024 * 1024):
            size+=len(chunk)
            if size > MAX_SIZE:
                raise HTTPException(413,"File too Large")
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
        dataset_status=DatasetStatus.PROCESSING
    )

    db.add(dataset)
    await db.flush()   # get dataset.id
    await db.commit()
    
    process_csv_background.delay(
        file_path,
        dataset.id)
    
    return DatasetRepr(
        id= dataset.id,
        source_type= dataset.source_type,
        json_schema=dataset.json_schema,
        created_at=dataset.created_at,
        name=dataset.name
    )
    
from fastapi import Query
from sqlalchemy import select, func
@dataset_router.get("/", response_model=DatasetListResponse)
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
            DatasetListItem(
                id=d.id,
                name=d.name,
                type=d.source_type.value,
                rows=getattr(d, 'processed_rows', 0),
                status=d.dataset_status.value,
                date=d.created_at.strftime("%d %b %Y"),
            )
            for d in datasets
        ],
        "pagination": {
            "page": page,
            "page_size": page_size,
            "total": total,
            "total_pages": (total + page_size - 1) // page_size,
        },
    }
    
@dataset_router.get("/{id}", summary="Get dataset details")
async def get_dataset( id: int,   session: AsyncSession = Depends(get_db),   user: User = Depends(get_current_user))->DatasetRepr:
    result = await session.execute(
        select(Dataset).where(
            Dataset.user_id == user.id,
            Dataset.id == id
        )
    )

    dataset = result.scalar_one_or_none()

    if dataset is None:
        raise HTTPException(
            status_code=404,
            detail="Dataset not found"
        )

    return dataset


@dataset_router.get('/preview/{dataset_id}', response_model=DatasetPreviewResponse)
async def get_preview(dataset_id: int,    user: User = Depends(get_current_user),   db: AsyncSession = Depends(get_db)):
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
    rows = rows_result.scalars().all()
        
    rows = [list(row.values()) for row in rows]

    from pydantic_models.dataset import DatasetPreviewResponse
    return DatasetPreviewResponse(
        json_schema=dataset.json_schema,
        rows=rows
    )
