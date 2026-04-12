import tomllib
from pathlib import Path

from pydantic import BaseModel


class MemberConfig(BaseModel):
    firstname: str
    discord_id: str


class FamilyConfig(BaseModel):
    name: str
    members: list[MemberConfig]


class SamConfig(BaseModel):
    families: list[FamilyConfig]


def load_config(path: str | Path) -> SamConfig:
    with open(path, "rb") as f:
        data = tomllib.load(f)

    return SamConfig.model_validate(data)
