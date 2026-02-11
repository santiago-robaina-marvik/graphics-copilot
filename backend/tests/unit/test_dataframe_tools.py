"""Tests for app/agent/tools/dataframe.py"""

from app.agent.tools.dataframe import (
    set_dataframe,
    get_dataframe,
    set_data_source,
    get_data_source,
    inspect_data,
    get_column_values,
    get_numeric_summary,
    filter_data,
    filter_comparison,
    filter_date_range,
    filter_numeric_range,
    filter_in,
    filter_contains,
    drop_nulls,
    group_and_aggregate,
    sort_data,
    select_columns,
    get_last_n_rows,
    get_top_n,
    limit_rows,
    get_distinct,
    count_rows,
    reset_data,
)

SID = "test-session"
CFG = {"configurable": {"thread_id": SID}}


class TestDataframeState:
    """Tests for dataframe state management."""

    def test_set_dataframe_stores_data(self, sample_dataframe):
        """set_dataframe should store DataFrame correctly."""
        data = sample_dataframe.to_dict(orient="records")
        set_dataframe(SID, data)
        df = get_dataframe(SID)
        assert df is not None
        assert len(df) == 5

    def test_set_dataframe_none_clears_state(self):
        """set_dataframe(None) should clear state."""
        set_dataframe(SID, [{"a": 1}])
        set_dataframe(SID, None)
        assert get_dataframe(SID) is None

    def test_get_dataframe_returns_none_initially(self):
        """get_dataframe should return None when no data set."""
        assert get_dataframe(SID) is None


class TestInspectData:
    """Tests for inspect_data tool."""

    def test_inspect_data_shows_shape(self, sample_dataframe):
        """inspect_data should show row and column count."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = inspect_data.invoke({}, CFG)
        assert "5 rows" in result
        assert "5 columns" in result

    def test_inspect_data_shows_columns(self, sample_dataframe):
        """inspect_data should list all columns."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = inspect_data.invoke({}, CFG)
        assert "Product" in result
        assert "Revenue" in result
        assert "Date" in result

    def test_inspect_data_no_data(self):
        """inspect_data should return error when no data."""
        result = inspect_data.invoke({}, CFG)
        assert "No data loaded" in result


class TestGetColumnValues:
    """Tests for get_column_values tool."""

    def test_get_column_values_returns_unique(self, sample_dataframe):
        """get_column_values should return unique values."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = get_column_values.invoke({"column": "Category"}, CFG)
        assert "Electronics" in result
        assert "Clothing" in result
        assert "Food" in result

    def test_get_column_values_invalid_column(self, sample_dataframe):
        """get_column_values should handle invalid column."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = get_column_values.invoke({"column": "NonExistent"}, CFG)
        assert "not found" in result.lower()

    def test_get_column_values_many_unique(self, large_dataframe):
        """get_column_values should limit to 20 for many values."""
        set_dataframe(SID, large_dataframe.to_dict(orient="records"))
        result = get_column_values.invoke({"column": "ID"}, CFG)
        assert "100 unique values" in result
        assert "First 20" in result


class TestGetNumericSummary:
    """Tests for get_numeric_summary tool."""

    def test_numeric_summary_returns_stats(self, sample_dataframe):
        """get_numeric_summary should return descriptive stats."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = get_numeric_summary.invoke({"column": "Revenue"}, CFG)
        assert "mean" in result.lower() or "Mean" in result
        assert "1000" in result  # min value

    def test_numeric_summary_non_numeric(self, sample_dataframe):
        """get_numeric_summary should reject non-numeric columns."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = get_numeric_summary.invoke({"column": "Product"}, CFG)
        assert "not numeric" in result.lower()


class TestFilterData:
    """Tests for filter_data tool."""

    def test_filter_exact_match_string(self, sample_dataframe):
        """filter_data should filter by exact string match."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_data.invoke({"column": "Product", "value": "A"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 1
        assert df.iloc[0]["Product"] == "A"

    def test_filter_exact_match_numeric(self, sample_dataframe):
        """filter_data should filter by exact numeric match."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_data.invoke({"column": "Revenue", "value": "1000"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 1
        assert df.iloc[0]["Revenue"] == 1000

    def test_filter_no_matches(self, sample_dataframe):
        """filter_data should handle no matches gracefully."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = filter_data.invoke({"column": "Product", "value": "Z"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 0
        assert "0 rows" in result


class TestFilterComparison:
    """Tests for filter_comparison tool."""

    def test_filter_greater_than(self, sample_dataframe):
        """filter_comparison with > should filter correctly."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_comparison.invoke({"column": "Revenue", "operator": ">", "value": "2000"}, CFG)
        df = get_dataframe(SID)
        assert all(df["Revenue"] > 2000)

    def test_filter_less_than(self, sample_dataframe):
        """filter_comparison with < should filter correctly."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_comparison.invoke({"column": "Revenue", "operator": "<", "value": "2000"}, CFG)
        df = get_dataframe(SID)
        assert all(df["Revenue"] < 2000)

    def test_filter_greater_equal(self, sample_dataframe):
        """filter_comparison with >= should include boundary."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_comparison.invoke({"column": "Revenue", "operator": ">=", "value": "2000"}, CFG)
        df = get_dataframe(SID)
        assert 2000 in df["Revenue"].values

    def test_filter_invalid_operator(self, sample_dataframe):
        """filter_comparison should reject invalid operator."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = filter_comparison.invoke({"column": "Revenue", "operator": "~", "value": "2000"}, CFG)
        assert "invalid" in result.lower() or "valid" in result.lower()


class TestFilterDateRange:
    """Tests for filter_date_range tool."""

    def test_filter_date_range_basic(self, sample_dataframe):
        """filter_date_range should filter by date range."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_date_range.invoke(
            {
                "date_column": "Date",
                "start_date": "2024-01-02",
                "end_date": "2024-01-04",
            },
            CFG,
        )
        df = get_dataframe(SID)
        assert len(df) == 3

    def test_filter_date_range_month_end(self, sample_dataframe):
        """filter_date_range should handle month-only end dates."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_date_range.invoke({"date_column": "Date", "start_date": "2024-01-01", "end_date": "2024-01"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 5  # All January dates


class TestFilterNumericRange:
    """Tests for filter_numeric_range tool."""

    def test_filter_numeric_range_inclusive(self, sample_dataframe):
        """filter_numeric_range should be inclusive on both ends."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_numeric_range.invoke({"column": "Revenue", "min_value": 1500, "max_value": 2500}, CFG)
        df = get_dataframe(SID)
        assert 1500 in df["Revenue"].values
        assert 2500 in df["Revenue"].values


class TestFilterIn:
    """Tests for filter_in tool."""

    def test_filter_in_multiple_values(self, sample_dataframe):
        """filter_in should filter by list of values."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_in.invoke({"column": "Product", "values": "A, C, E"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 3
        assert set(df["Product"]) == {"A", "C", "E"}


class TestFilterContains:
    """Tests for filter_contains tool."""

    def test_filter_contains_case_insensitive(self, sample_dataframe):
        """filter_contains should be case insensitive by default."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_contains.invoke({"column": "Category", "pattern": "elect"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 2


class TestDropNulls:
    """Tests for drop_nulls tool."""

    def test_drop_nulls_all(self, sample_dataframe_with_nulls):
        """drop_nulls should remove all rows with nulls."""
        set_dataframe(SID, sample_dataframe_with_nulls.to_dict(orient="records"))
        drop_nulls.invoke({}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 1  # Only one row has no nulls

    def test_drop_nulls_specific_column(self, sample_dataframe_with_nulls):
        """drop_nulls should remove nulls in specific column only."""
        set_dataframe(SID, sample_dataframe_with_nulls.to_dict(orient="records"))
        drop_nulls.invoke({"column": "Name"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 4  # Only one null in Name


class TestGroupAndAggregate:
    """Tests for group_and_aggregate tool."""

    def test_group_sum(self, sample_dataframe):
        """group_and_aggregate with sum should aggregate correctly."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        group_and_aggregate.invoke({"group_by": "Category", "agg_column": "Revenue", "agg_func": "sum"}, CFG)
        df = get_dataframe(SID)
        electronics_row = df[df["Category"] == "Electronics"]
        assert electronics_row["Revenue"].values[0] == 2500  # 1000 + 1500

    def test_group_mean(self, sample_dataframe):
        """group_and_aggregate with mean should calculate average."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        group_and_aggregate.invoke({"group_by": "Category", "agg_column": "Revenue", "agg_func": "mean"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 3  # 3 categories

    def test_group_invalid_func(self, sample_dataframe):
        """group_and_aggregate should reject invalid function."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = group_and_aggregate.invoke(
            {"group_by": "Category", "agg_column": "Revenue", "agg_func": "invalid"}, CFG
        )
        assert "invalid" in result.lower() or "valid" in result.lower()


class TestSortData:
    """Tests for sort_data tool."""

    def test_sort_ascending(self, sample_dataframe):
        """sort_data ascending should order correctly."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        sort_data.invoke({"column": "Revenue", "ascending": True}, CFG)
        df = get_dataframe(SID)
        assert df.iloc[0]["Revenue"] == 1000
        assert df.iloc[-1]["Revenue"] == 3000

    def test_sort_descending(self, sample_dataframe):
        """sort_data descending should order correctly."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        sort_data.invoke({"column": "Revenue", "ascending": False}, CFG)
        df = get_dataframe(SID)
        assert df.iloc[0]["Revenue"] == 3000
        assert df.iloc[-1]["Revenue"] == 1000


class TestSelectColumns:
    """Tests for select_columns tool."""

    def test_select_multiple_columns(self, sample_dataframe):
        """select_columns should keep only specified columns."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        select_columns.invoke({"columns": "Product, Revenue"}, CFG)
        df = get_dataframe(SID)
        assert list(df.columns) == ["Product", "Revenue"]

    def test_select_invalid_column(self, sample_dataframe):
        """select_columns should report missing columns."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = select_columns.invoke({"columns": "Product, Invalid"}, CFG)
        assert "not found" in result.lower()


class TestGetLastNRows:
    """Tests for get_last_n_rows tool."""

    def test_get_last_n_rows(self, sample_dataframe):
        """get_last_n_rows should return last N rows."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        get_last_n_rows.invoke({"n": 2}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 2


class TestGetTopN:
    """Tests for get_top_n tool."""

    def test_get_top_n_descending(self, sample_dataframe):
        """get_top_n should return highest values."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        get_top_n.invoke({"n": 2, "sort_column": "Revenue"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 2
        assert df.iloc[0]["Revenue"] == 3000


class TestLimitRows:
    """Tests for limit_rows tool."""

    def test_limit_rows(self, sample_dataframe):
        """limit_rows should return first N rows."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        limit_rows.invoke({"n": 3}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 3


class TestGetDistinct:
    """Tests for get_distinct tool."""

    def test_get_distinct(self, sample_dataframe):
        """get_distinct should remove duplicates."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        get_distinct.invoke({"column": "Category"}, CFG)
        df = get_dataframe(SID)
        assert len(df) == 3  # 3 unique categories


class TestCountRows:
    """Tests for count_rows tool."""

    def test_count_rows(self, sample_dataframe):
        """count_rows should return correct count."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        result = count_rows.invoke({}, CFG)
        assert "5" in result


class TestResetData:
    """Tests for reset_data tool."""

    def test_reset_data_restores_original(self, sample_dataframe):
        """reset_data should restore original DataFrame."""
        set_dataframe(SID, sample_dataframe.to_dict(orient="records"))
        filter_data.invoke({"column": "Product", "value": "A"}, CFG)
        assert len(get_dataframe(SID)) == 1

        reset_data.invoke({}, CFG)
        assert len(get_dataframe(SID)) == 5


class TestDataSource:
    """Tests for data source tracking."""

    def test_set_and_get_data_source(self):
        """Should store and retrieve data source metadata."""
        source = {
            "type": "google_sheets",
            "sheet_id": "abc123",
            "sheet_gid": "0",
        }
        set_data_source(SID, source)
        assert get_data_source(SID) == source

        # Cleanup
        set_data_source(SID, None)

    def test_data_source_defaults_to_none(self):
        """Should return None when no data source is set."""
        set_data_source(SID, None)
        assert get_data_source(SID) is None
