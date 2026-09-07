from pydantic import BaseModel


class ExtractRequest(BaseModel):
    file_id: str


class DocumentUploadResponse(BaseModel):
    file_id: str
    file_name: str
    status: str


class DocumentExtractResponse(BaseModel):
    file_id: str
    status: str
    extracted_data: dict
