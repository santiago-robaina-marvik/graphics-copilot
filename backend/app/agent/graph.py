from langgraph.prebuilt import create_react_agent
from langgraph.checkpoint.memory import MemorySaver
from langchain_google_genai import ChatGoogleGenerativeAI

from app.agent.tools.dataframe import (
    # Inspection
    inspect_data,
    get_column_values,
    get_numeric_summary,
    count_rows,
    # Filtering (WHERE)
    filter_data,
    filter_comparison,
    filter_numeric_range,
    filter_date_range,
    filter_in,
    filter_contains,
    drop_nulls,
    # Row selection (LIMIT, TOP)
    get_last_n_rows,
    get_top_n,
    limit_rows,
    get_distinct,
    # Transformation (GROUP BY, ORDER BY)
    group_and_aggregate,
    sort_data,
    select_columns,
    # Reset
    reset_data,
)
from app.agent.tools.plotting import plotting_tools
from app.config import get_settings
from app.logging_config import get_logger

logger = get_logger("app.agent.graph")

# Collect all tools - organized by category
all_tools = [
    # Data inspection
    inspect_data,
    get_column_values,
    get_numeric_summary,
    count_rows,
    # Filtering
    filter_data,
    filter_comparison,
    filter_numeric_range,
    filter_date_range,
    filter_in,
    filter_contains,
    drop_nulls,
    # Row selection
    get_last_n_rows,
    get_top_n,
    limit_rows,
    get_distinct,
    # Transformation
    group_and_aggregate,
    sort_data,
    select_columns,
    # Reset
    reset_data,
] + plotting_tools

SYSTEM_PROMPT = """You are a data visualization assistant with SQL-like data manipulation capabilities.

WORKFLOW:
1. Use inspect_data to understand the dataset (columns, types, sample rows)
2. Transform data as needed using the tools below
3. Create the chart

DATA TOOLS (SQL equivalents):
- filter_data: WHERE col = value
- filter_comparison: WHERE col > value (supports >, <, >=, <=, !=, ==)
- filter_numeric_range: WHERE col BETWEEN min AND max
- filter_date_range: Date range filtering (e.g., '2026-10-01' to '2026-12-31')
- filter_in: WHERE col IN (val1, val2, ...)
- filter_contains: WHERE col LIKE '%pattern%'
- drop_nulls: WHERE col IS NOT NULL
- group_and_aggregate: GROUP BY col with SUM/AVG/COUNT/MIN/MAX
- sort_data: ORDER BY col ASC/DESC
- get_top_n: ORDER BY col LIMIT n (for top/bottom N)
- limit_rows: LIMIT n
- get_last_n_rows: Last N rows (sorted by date if specified)
- get_distinct: SELECT DISTINCT
- select_columns: SELECT col1, col2
- count_rows: SELECT COUNT(*)
- reset_data: Undo all transformations, return to original data

EXAMPLES:
- "revenue > 1000" → filter_comparison('Revenue', '>', '1000')
- "last 3 months of 2026" → filter_date_range('Date', '2026-10-01', '2026-12-31')
- "top 5 by sales" → get_top_n(5, 'Sales')
- "products A, B, C" → filter_in('Product', 'A,B,C')

CHART TYPES:
- Bar: comparing categories
- Line: trends over time
- Pie: proportions/distribution
- Area: cumulative/volume data

Be efficient - use the most direct tool for the task. Minimize tool calls.
After filtering/transforming, create the visualization.
"""


def create_agent():
    """Create and return the compiled LangGraph agent."""
    settings = get_settings()
    logger.info(f"Creating agent with model: {settings.gemini_model}")
    logger.info(f"Available tools: {[t.name for t in all_tools]}")

    # Initialize Gemini model
    llm = ChatGoogleGenerativeAI(
        model=settings.gemini_model,
        google_api_key=settings.gemini_api_key,
        temperature=0.1,
    )

    # Create ReAct agent with prebuilt graph
    memory = MemorySaver()
    return create_react_agent(model=llm, tools=all_tools, prompt=SYSTEM_PROMPT, checkpointer=memory)


# Global agent instance
_agent = None


def get_agent():
    """Get or create the agent singleton."""
    global _agent
    if _agent is None:
        _agent = create_agent()
    return _agent
