"""Tests for app/agent/graph.py"""

from unittest.mock import patch, MagicMock


class TestCreateAgent:
    """Tests for create_agent function."""

    @patch("app.agent.graph.ChatGoogleGenerativeAI")
    @patch("app.agent.graph.create_react_agent")
    @patch("app.agent.graph.get_settings")
    def test_create_agent_initializes_llm(self, mock_settings, mock_create_agent, mock_llm):
        """create_agent should initialize LLM with correct settings."""
        mock_settings.return_value.gemini_api_key = "test-key"
        mock_settings.return_value.gemini_model = "test-model"

        from app.agent.graph import create_agent

        create_agent()

        mock_llm.assert_called_once()
        call_kwargs = mock_llm.call_args[1]
        assert call_kwargs["google_api_key"] == "test-key"
        assert call_kwargs["model"] == "test-model"
        assert call_kwargs["temperature"] == 0.1

    @patch("app.agent.graph.ChatGoogleGenerativeAI")
    @patch("app.agent.graph.create_react_agent")
    @patch("app.agent.graph.get_settings")
    def test_create_agent_registers_all_tools(self, mock_settings, mock_create_agent, mock_llm):
        """create_agent should register all 27 tools."""
        mock_settings.return_value.gemini_api_key = "test-key"
        mock_settings.return_value.gemini_model = "test-model"

        from app.agent.graph import create_agent

        create_agent()

        call_kwargs = mock_create_agent.call_args[1]
        tools = call_kwargs["tools"]
        assert len(tools) == 23  # 19 dataframe + 4 plotting


class TestGetAgent:
    """Tests for get_agent singleton."""

    def test_get_agent_returns_same_instance(self):
        """get_agent should return cached singleton."""
        import app.agent.graph as graph_module

        # Reset singleton
        graph_module._agent = None

        with patch.object(graph_module, "create_agent") as mock_create:
            mock_create.return_value = MagicMock()

            agent1 = graph_module.get_agent()
            agent2 = graph_module.get_agent()

            assert agent1 is agent2
            mock_create.assert_called_once()  # Only called once
