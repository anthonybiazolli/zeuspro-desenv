from sqlalchemy import Column, String, Integer, DateTime, ARRAY
from sqlalchemy.dialects.postgresql import UUID
from database import Base
import uuid
from datetime import datetime

class Contact(Base):
    __tablename__ = "contacts"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(as_uuid=True))
    name = Column(String, nullable=False)
    phone_number = Column(String, nullable=False)
    email = Column(String)
    tax_id = Column(String)
    tags = Column(ARRAY(String))
    ai_sentiment_score = Column(Integer, default=0) # Onde nossa IA salvará a qualificação
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)