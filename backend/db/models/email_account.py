import uuid
from datetime import datetime
from sqlalchemy import Enum, LargeBinary, DateTime, ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column
from .base import Base
from .enums import EmailProvider
import os
from cryptography.fernet import Fernet
import pickle
from dotenv import load_dotenv
import json
load_dotenv()

key = os.getenv('ENCRYPTION_KEY')
if key is None:
    raise EnvironmentError('ENCRYPTION_KEY missing from .env')
fernet = Fernet(key.encode())


class EmailAccount(Base):
    __tablename__ = "email_accounts"

    id: Mapped[int] = mapped_column(primary_key=True)

    provider: Mapped[EmailProvider] = mapped_column(
        Enum(EmailProvider, name="email_provider_enum"),
        nullable=False,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    email_address: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    # OAuth tokens for Gmail OR API keys for SendGrid
    _config: Mapped[bytes] = mapped_column(
        LargeBinary,
        nullable=False,
    )

    is_active: Mapped[bool] = mapped_column(
        default=True,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    oauth_id:Mapped[str] = mapped_column(
        String,
        default=None,
        nullable=True
    ) 
    
    @property
    def config(self):
        """Getter method for accessing encrypted config attribute."""
        config = json.loads(fernet.decrypt(self._config))
        return config
    
    @config.setter
    def config(self,config):
        """Setter method for saving the encrypted config attriubutes"""
        self._config = fernet.encrypt(json.dumps(config).encode())