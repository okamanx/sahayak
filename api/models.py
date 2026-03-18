from pydantic import BaseModel
from typing import Optional

class ClassifyResponse(BaseModel):
    category:    str
    severity:    int
    priority:    float
    department:  str
    isHighRisk:  bool
    description: str
    confidence:  float
