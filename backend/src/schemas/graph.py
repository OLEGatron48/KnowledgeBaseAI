from enum import Enum
from pydantic import BaseModel, Field
from typing import Literal, Optional

class LifecycleStatus(str, Enum):
    ACTIVE = "ACTIVE"
    DEPRECATED = "DEPRECATED"
    ARCHIVED = "ARCHIVED"

class RelationshipType(str, Enum):
    PART_OF = "PART_OF"
    PREREQ = "PREREQ"
    BASED_ON = "BASED_ON"
    USES_METHOD = "USES_METHOD"
    AFFECTS = "AFFECTS"
    TESTED_BY = "TESTED_BY"
    EVIDENCED_BY = "EVIDENCED_BY"
    REPLACED_BY = "REPLACED_BY"

class NodeBase(BaseModel):
    uid: str = Field(min_length=1)
    tenant_id: str = Field(min_length=1)
    lifecycle_status: LifecycleStatus = LifecycleStatus.ACTIVE
    created_at: Optional[str] = None
    updated_at: Optional[str] = None

class Concept(NodeBase):
    type: Literal["Concept"] = "Concept"
    name: str
    name_norm: Optional[str] = None

class Skill(NodeBase):
    type: Literal["Skill"] = "Skill"
    name: str
    name_norm: Optional[str] = None

class Method(NodeBase):
    type: Literal["Method"] = "Method"
    name: str

class Error(NodeBase):
    type: Literal["Error"] = "Error"
    name: str

class Assessment(NodeBase):
    type: Literal["Assessment"] = "Assessment"
    name: str

class SourceChunk(NodeBase):
    type: Literal["SourceChunk"] = "SourceChunk"
    quote: str
    source_id: Optional[str] = None

class Relationship(BaseModel):
    uid: str = Field(min_length=1)
    tenant_id: str = Field(min_length=1)
    type: RelationshipType
    from_uid: str = Field(min_length=1)
    to_uid: str = Field(min_length=1)
    lifecycle_status: LifecycleStatus = LifecycleStatus.ACTIVE
    created_at: Optional[str] = None
    updated_at: Optional[str] = None
