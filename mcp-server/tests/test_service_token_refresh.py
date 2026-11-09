"""The service token file may appear after this server started.

Poznote writes data/.mcp_token when its own container starts, and the MCP
container does not wait for it. A token read once at construction stayed empty
for the life of the process, so every call kept failing with a configuration
error long after the file was there.
"""

from poznote_mcp.client import PoznoteClient


def _client(monkeypatch, token_file):
    monkeypatch.setenv("POZNOTE_SERVICE_TOKEN_FILE", str(token_file))
    monkeypatch.delenv("POZNOTE_USER_ID", raising=False)
    return PoznoteClient(base_url="http://example.test/api/v1")


def test_token_written_after_startup_is_picked_up(monkeypatch, tmp_path):
    token_file = tmp_path / ".mcp_token"
    client = _client(monkeypatch, token_file)
    try:
        assert client.service_token == ""
        assert "Authorization" not in client._headers_for_user(None)

        token_file.write_text("late-token\n", encoding="utf-8")

        assert client.service_token == "late-token"
        assert client._headers_for_user(None)["Authorization"] == "Bearer late-token"
        assert client._current_base_headers()["Authorization"] == "Bearer late-token"
    finally:
        client.close()


def test_token_read_at_startup_is_not_read_again(monkeypatch, tmp_path):
    """Only an empty token is looked up again, so the normal path is unchanged."""
    token_file = tmp_path / ".mcp_token"
    token_file.write_text("first-token", encoding="utf-8")
    client = _client(monkeypatch, token_file)
    try:
        assert client.service_token == "first-token"

        token_file.write_text("rotated-token", encoding="utf-8")

        assert client.service_token == "first-token"
        assert client._headers_for_user(None)["Authorization"] == "Bearer first-token"
    finally:
        client.close()


def test_explicit_token_is_never_replaced_by_the_file(monkeypatch, tmp_path):
    token_file = tmp_path / ".mcp_token"
    monkeypatch.setenv("POZNOTE_SERVICE_TOKEN_FILE", str(token_file))
    client = PoznoteClient(base_url="http://example.test/api/v1", service_token="passed-in")
    try:
        token_file.write_text("file-token", encoding="utf-8")

        assert client.service_token == "passed-in"
        assert client._headers_for_user(None)["Authorization"] == "Bearer passed-in"
    finally:
        client.close()


def test_unreadable_file_leaves_the_token_empty(monkeypatch, tmp_path):
    client = _client(monkeypatch, tmp_path / "nowhere" / ".mcp_token")
    try:
        assert client.service_token == ""
        assert "Authorization" not in client._headers_for_user(None)
    finally:
        client.close()


def test_token_can_still_be_set_by_hand(monkeypatch, tmp_path):
    """The attribute stays writable, and a value set by hand pins like an explicit one."""
    token_file = tmp_path / ".mcp_token"
    client = _client(monkeypatch, token_file)
    try:
        client.service_token = "set-by-hand"
        token_file.write_text("file-token", encoding="utf-8")

        assert client.service_token == "set-by-hand"
        assert client._headers_for_user(None)["Authorization"] == "Bearer set-by-hand"
    finally:
        client.close()
