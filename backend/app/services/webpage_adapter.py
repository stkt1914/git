from abc import ABC, abstractmethod
from dataclasses import dataclass


class WebpageAdapterNotApprovedError(RuntimeError):
    """Raised when a web page adapter has not completed policy review."""


@dataclass(frozen=True, slots=True)
class WebpageCollectionPolicy:
    terms_approved: bool = False
    robots_allowed: bool = False
    structure_reviewed: bool = False

    @property
    def collectable(self) -> bool:
        return self.terms_approved and self.robots_allowed and self.structure_reviewed


class WebpageAdapter(ABC):
    source_id: str
    policy: WebpageCollectionPolicy

    @abstractmethod
    async def collect(self) -> list[dict[str, object]]:
        """Collect normalized article metadata from an approved source."""


class WebpageAdapterRegistry:
    def __init__(self) -> None:
        self._adapters: dict[str, WebpageAdapter] = {}

    def register(self, adapter: WebpageAdapter) -> None:
        if not adapter.policy.collectable:
            raise WebpageAdapterNotApprovedError(
                f"web page adapter is not approved: {adapter.source_id}"
            )
        self._adapters[adapter.source_id] = adapter

    def get(self, source_id: str) -> WebpageAdapter | None:
        return self._adapters.get(source_id)

    @property
    def source_ids(self) -> tuple[str, ...]:
        return tuple(self._adapters)
