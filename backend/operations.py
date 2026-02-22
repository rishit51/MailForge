from sqlalchemy.ext.asyncio import AsyncSession 
from sqlalchemy import select
from passlib.context import CryptContext
from db.db_models import User
from sqlalchemy.exc import IntegrityError

pwd_context =CryptContext(
    schemes=['argon2'],deprecated='auto'
)

async def add_user(session:AsyncSession,email:str,password:str,name:str|None)->int | None:
    hashed_pwd = pwd_context.hash(password)
    user = User(email=email,hashed_password=hashed_pwd,name=name)
    try:
        session.add(user)
        await session.commit()
        session.refresh(user)
        return user.id
    except IntegrityError:
        return None
    
async def get_user(
    session: AsyncSession,
    user_id: int,
) -> User | None:
    result = await session.execute(
        select(User).where(User.id == user_id)
    )
    return result.scalars().first()

async def get_user_by_email(
    session: AsyncSession,
    email: str,
) -> User | None:
    result = await session.execute(
        select(User).where(User.email == email)
    )
    return result.scalars().first()
