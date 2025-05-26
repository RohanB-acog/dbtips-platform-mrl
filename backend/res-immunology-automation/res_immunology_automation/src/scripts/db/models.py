from sqlalchemy import Column, Sequence, String,Integer, DateTime, PrimaryKeyConstraint
from .database import Base


class Target(Base):
    __tablename__ = "target"

    id = Column(String, primary_key=True, index=True)
    file_path = Column(String, nullable=False)  # Required attribute


class Disease(Base):
    __tablename__ = "disease"

    id = Column(String, primary_key=True, index=True)
    file_path = Column(String, nullable=False)  # Required attribute


class TargetDisease(Base):
    __tablename__ = "target_disease"

    id = Column(String, primary_key=True, index=True)
    file_path = Column(String, nullable=False)  # Required attribute

class DiseaseDossierStatus(Base):
    __tablename__ = "disease_dossier_status"

    job_id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    disease = Column(String, nullable=False, unique=True)
    status = Column(String, nullable=False)
    error_count = Column(Integer, default=0, nullable=False)
    creation_time = Column(DateTime(timezone=True), nullable=True)  
    submission_time = Column(DateTime(timezone=True), nullable=True)  
    processed_time = Column(DateTime(timezone=True), nullable=True) 

class ErrorManagement(Base):
    __tablename__ = "error_management"

    index = Column(Integer, primary_key=True, autoincrement=True)
    job_details = Column(String, index=True)
    endpoint = Column(String, nullable=True)
    error_description = Column(String, nullable=True)
    error_encountered_time = Column(DateTime(timezone=True), nullable=True) 

class TargetDossierStatus(Base):
    __tablename__ = "target_dossier_status"

    job_id = Column(Integer, Sequence('job_id_seq'),  nullable=False, autoincrement=True, index=True)
    target = Column(String, nullable=False)
    disease = Column(String, nullable=True)
    status = Column(String, nullable=False)
    error_count = Column(Integer, default=0)
    creation_time = Column(DateTime(timezone=True), nullable=True)  
    submission_time = Column(DateTime(timezone=True), nullable=True)  
    processed_time = Column(DateTime(timezone=True), nullable=True) 
    __table_args__ = (
        PrimaryKeyConstraint('target', 'disease', name='target-disease-pk'),
    )

class Admin(Base):
    __tablename__ = "admin"

    id = Column(Integer, primary_key=True, autoincrement=True, index=True)
    username = Column(String, unique=True, nullable=False)  # Unique and required
    password = Column(String, nullable=False)  # Required