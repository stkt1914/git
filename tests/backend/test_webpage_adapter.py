import pytest
from app.services.webpage_adapter import (
    WebpageAdapter,
    WebpageAdapterNotApprovedError,
    WebpageAdapterRegistry,
    WebpageCollectionPolicy,
)


class ExampleAdapter(WebpageAdapter):
    def __init__(self, source_id: str, policy: WebpageCollectionPolicy) -> None:
        self.source_id = source_id
        self.policy = policy

    async def collect(self) -> list[dict[str, object]]:
        return []


def test_unapproved_webpage_adapter_cannot_be_registered() -> None:
    registry = WebpageAdapterRegistry()

    with pytest.raises(WebpageAdapterNotApprovedError):
        registry.register(ExampleAdapter("example", WebpageCollectionPolicy()))


def test_approved_webpage_adapter_can_be_registered() -> None:
    registry = WebpageAdapterRegistry()
    adapter = ExampleAdapter(
        "approved_example",
        WebpageCollectionPolicy(
            terms_approved=True,
            robots_allowed=True,
            structure_reviewed=True,
        ),
    )

    registry.register(adapter)

    assert registry.get("approved_example") is adapter
