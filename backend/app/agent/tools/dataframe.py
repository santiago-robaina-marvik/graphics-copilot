import pandas as pd
from langchain_core.tools import tool

from app.logging_config import get_logger

logger = get_logger("app.agent.tools.dataframe")

# Module-level storage for DataFrames
_current_df: pd.DataFrame | None = None
_original_df: pd.DataFrame | None = None  # Store original for reset
_data_source: dict | None = None


def set_data_source(source: dict | None) -> None:
    """Set the current data source metadata."""
    global _data_source
    _data_source = source


def get_data_source() -> dict | None:
    """Get the current data source metadata."""
    return _data_source


def set_dataframe(data: list[dict] | None):
    """Set the current DataFrame from list of dicts."""
    global _current_df, _original_df
    if data:
        _current_df = pd.DataFrame(data)
        _original_df = _current_df.copy()  # Keep original for reset
        logger.info(f"DataFrame set: {_current_df.shape[0]} rows, {_current_df.shape[1]} columns")
        logger.debug(f"Columns: {list(_current_df.columns)}")
    else:
        _current_df = None
        _original_df = None
        logger.info("DataFrame cleared")


def get_dataframe() -> pd.DataFrame | None:
    """Get the current DataFrame."""
    return _current_df


@tool
def inspect_data() -> str:
    """
    Inspect the current dataset. Returns column names, data types,
    shape, and sample rows. Use this first to understand the data structure.
    """
    logger.info("Tool: inspect_data()")
    df = get_dataframe()
    if df is None:
        logger.warning("No data loaded")
        return "No data loaded. Ask the user to provide data."

    info = []
    info.append(f"Shape: {df.shape[0]} rows, {df.shape[1]} columns")
    info.append("\nColumns and types:")
    for col in df.columns:
        info.append(f"  - {col}: {df[col].dtype}")
    info.append("\nFirst 5 rows:")
    info.append(df.head().to_string())

    logger.info(f"Inspected data: {df.shape}")
    return "\n".join(info)


@tool
def get_column_values(column: str) -> str:
    """
    Get unique values from a specific column. Useful for understanding
    categorical data before plotting.

    Args:
        column: The column name to inspect
    """
    logger.info(f"Tool: get_column_values(column='{column}')")
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        logger.warning(f"Column '{column}' not found")
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    unique = df[column].unique()
    logger.info(f"Found {len(unique)} unique values in '{column}'")
    if len(unique) > 20:
        return f"Column '{column}' has {len(unique)} unique values. First 20: {list(unique[:20])}"
    return f"Unique values in '{column}': {list(unique)}"


@tool
def get_numeric_summary(column: str) -> str:
    """
    Get statistical summary of a numeric column (min, max, mean, median).

    Args:
        column: The numeric column to summarize
    """
    logger.info(f"Tool: get_numeric_summary(column='{column}')")
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        logger.warning(f"Column '{column}' not found")
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    if not pd.api.types.is_numeric_dtype(df[column]):
        logger.warning(f"Column '{column}' is not numeric")
        return f"Column '{column}' is not numeric. Type: {df[column].dtype}"

    stats = df[column].describe()
    logger.info(f"Numeric summary for '{column}': mean={stats['mean']:.2f}")
    return f"Summary of '{column}':\n{stats.to_string()}"


@tool
def filter_data(column: str, value: str) -> str:
    """
    Filter the dataset by a column value. Updates the working dataset.

    Args:
        column: Column to filter on
        value: Value to filter for (as string, will be converted if needed)
    """
    logger.info(f"Tool: filter_data(column='{column}', value='{value}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        logger.warning(f"Column '{column}' not found")
        return f"Column '{column}' not found."

    # Try to convert value to match column type
    col_dtype = df[column].dtype
    filter_value = value
    try:
        if pd.api.types.is_numeric_dtype(col_dtype):
            filter_value = float(value) if "." in value else int(value)
    except (ValueError, TypeError):
        pass

    filtered = df[df[column] == filter_value]
    _current_df = filtered
    logger.info(f"Filtered: {len(df)} → {len(filtered)} rows")
    return f"Filtered to {len(filtered)} rows where {column} = {filter_value}"


@tool
def filter_date_range(date_column: str, start_date: str, end_date: str) -> str:
    """
    Filter the dataset by a date range (inclusive). Use this for date/time filtering.
    Automatically parses various date formats. Updates the working dataset.

    Args:
        date_column: Column containing dates (e.g., 'Date', 'date', 'timestamp')
        start_date: Start date (e.g., '2026-10-01', '10/1/2026', 'October 2026')
        end_date: End date (e.g., '2026-12-31', '12/31/2026', 'December 2026')
    """
    logger.info(f"Tool: filter_date_range(date_column='{date_column}', start='{start_date}', end='{end_date}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if date_column not in df.columns:
        logger.warning(f"Column '{date_column}' not found")
        return f"Column '{date_column}' not found. Available: {list(df.columns)}"

    try:
        # Convert column to datetime
        df_copy = df.copy()
        df_copy[date_column] = pd.to_datetime(df_copy[date_column])

        # Parse start and end dates
        start = pd.to_datetime(start_date)
        end = pd.to_datetime(end_date)

        # If end_date is just a month (no day specified), extend to end of month
        if (
            end.day == 1
            and "day" not in end_date.lower()
            and not any(c.isdigit() and end_date.count("/") >= 2 for c in end_date)
        ):
            end = end + pd.offsets.MonthEnd(0)

        # Filter
        mask = (df_copy[date_column] >= start) & (df_copy[date_column] <= end)
        filtered = df[mask]
        _current_df = filtered

        logger.info(f"Date filtered: {len(df)} → {len(filtered)} rows ({start.date()} to {end.date()})")
        return f"Filtered to {len(filtered)} rows where {date_column} is between {start.date()} and {end.date()}\n{filtered.to_string()}"
    except Exception as e:
        logger.error(f"Date parsing error: {e}")
        return f"Error parsing dates: {e}. Try formats like '2026-10-01' or '10/1/2026'"


@tool
def get_last_n_rows(n: int, date_column: str = "") -> str:
    """
    Get the last N rows of the dataset. Optionally sort by a date column first.
    Use this for queries like 'last 3 months' or 'most recent 5 entries'.

    Args:
        n: Number of rows to keep
        date_column: Optional date column to sort by before taking last N rows
    """
    logger.info(f"Tool: get_last_n_rows(n={n}, date_column='{date_column}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    if date_column and date_column in df.columns:
        try:
            df_sorted = df.copy()
            df_sorted[date_column] = pd.to_datetime(df_sorted[date_column])
            df_sorted = df_sorted.sort_values(date_column)
            result = df_sorted.tail(n)
            # Keep original df format but filtered rows
            _current_df = df.loc[result.index]
        except Exception as e:
            logger.warning(f"Could not sort by date: {e}, using row order")
            _current_df = df.tail(n)
    else:
        _current_df = df.tail(n)

    logger.info(f"Got last {n} rows: {len(df)} → {len(_current_df)} rows")
    return f"Got last {n} rows:\n{_current_df.to_string()}"


@tool
def group_and_aggregate(group_by: str, agg_column: str, agg_func: str = "sum") -> str:
    """
    Group data by a column and aggregate another column.

    Args:
        group_by: Column to group by
        agg_column: Column to aggregate
        agg_func: Aggregation function (sum, mean, count, min, max)
    """
    logger.info(f"Tool: group_and_aggregate(group_by='{group_by}', agg_column='{agg_column}', agg_func='{agg_func}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    if group_by not in df.columns or agg_column not in df.columns:
        logger.warning("Column not found")
        return f"Column not found. Available: {list(df.columns)}"

    valid_funcs = ["sum", "mean", "count", "min", "max"]
    if agg_func not in valid_funcs:
        logger.warning(f"Invalid agg_func: {agg_func}")
        return f"Invalid agg_func. Use one of: {valid_funcs}"

    result = df.groupby(group_by)[agg_column].agg(agg_func).reset_index()
    _current_df = result
    logger.info(f"Grouped: {len(df)} rows → {len(result)} groups")
    return f"Grouped by '{group_by}', {agg_func} of '{agg_column}':\n{result.to_string()}"


@tool
def sort_data(column: str, ascending: bool = True) -> str:
    """
    Sort the dataset by a column. (SQL: ORDER BY)

    Args:
        column: Column to sort by
        ascending: Sort ascending (True) or descending (False)
    """
    logger.info(f"Tool: sort_data(column='{column}', ascending={ascending})")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        logger.warning(f"Column '{column}' not found")
        return f"Column '{column}' not found."

    _current_df = df.sort_values(column, ascending=ascending)
    logger.info(f"Sorted by '{column}' {'ascending' if ascending else 'descending'}")
    return f"Sorted by '{column}' {'ascending' if ascending else 'descending'}"


# ============== Additional SQL-like Operations ==============


@tool
def reset_data() -> str:
    """
    Reset the dataset to its original state. Use this to undo all filters and transformations.
    Call this before starting a new analysis on the full dataset.
    """
    logger.info("Tool: reset_data()")
    global _current_df, _original_df
    if _original_df is None:
        return "No original data to reset to."

    _current_df = _original_df.copy()
    logger.info(f"Reset to original: {_current_df.shape[0]} rows, {_current_df.shape[1]} columns")
    return f"Reset to original dataset: {_current_df.shape[0]} rows, {_current_df.shape[1]} columns"


@tool
def select_columns(columns: str) -> str:
    """
    Select specific columns from the dataset. (SQL: SELECT col1, col2)
    Updates the working dataset to only include these columns.

    Args:
        columns: Comma-separated column names (e.g., 'Date,Revenue' or 'name, age, city')
    """
    logger.info(f"Tool: select_columns(columns='{columns}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    col_list = [c.strip() for c in columns.split(",")]
    missing = [c for c in col_list if c not in df.columns]
    if missing:
        return f"Columns not found: {missing}. Available: {list(df.columns)}"

    _current_df = df[col_list]
    logger.info(f"Selected {len(col_list)} columns")
    return f"Selected columns: {col_list}\n{_current_df.head().to_string()}"


@tool
def filter_comparison(column: str, operator: str, value: str) -> str:
    """
    Filter data using comparison operators. (SQL: WHERE col > value)

    Args:
        column: Column to filter on
        operator: Comparison operator: '>', '<', '>=', '<=', '!=', '=='
        value: Value to compare against (will be converted to number if possible)
    """
    logger.info(f"Tool: filter_comparison(column='{column}', operator='{operator}', value='{value}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    valid_ops = [">", "<", ">=", "<=", "!=", "=="]
    if operator not in valid_ops:
        return f"Invalid operator. Use one of: {valid_ops}"

    # Convert value to appropriate type
    compare_value = value
    try:
        if "." in value:
            compare_value = float(value)
        else:
            compare_value = int(value)
    except ValueError:
        pass

    # Apply filter
    if operator == ">":
        mask = df[column] > compare_value
    elif operator == "<":
        mask = df[column] < compare_value
    elif operator == ">=":
        mask = df[column] >= compare_value
    elif operator == "<=":
        mask = df[column] <= compare_value
    elif operator == "!=":
        mask = df[column] != compare_value
    else:  # ==
        mask = df[column] == compare_value

    _current_df = df[mask]
    logger.info(f"Comparison filter: {len(df)} → {len(_current_df)} rows")
    return f"Filtered to {len(_current_df)} rows where {column} {operator} {compare_value}"


@tool
def filter_numeric_range(column: str, min_value: float, max_value: float) -> str:
    """
    Filter numeric column to values between min and max (inclusive). (SQL: BETWEEN)

    Args:
        column: Numeric column to filter
        min_value: Minimum value (inclusive)
        max_value: Maximum value (inclusive)
    """
    logger.info(f"Tool: filter_numeric_range(column='{column}', min={min_value}, max={max_value})")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    mask = (df[column] >= min_value) & (df[column] <= max_value)
    _current_df = df[mask]
    logger.info(f"Range filter: {len(df)} → {len(_current_df)} rows")
    return f"Filtered to {len(_current_df)} rows where {column} BETWEEN {min_value} AND {max_value}"


@tool
def filter_in(column: str, values: str) -> str:
    """
    Filter where column value is in a list of values. (SQL: WHERE col IN (...))

    Args:
        column: Column to filter on
        values: Comma-separated values (e.g., 'Apple,Orange,Banana' or '100,200,300')
    """
    logger.info(f"Tool: filter_in(column='{column}', values='{values}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    value_list = [v.strip() for v in values.split(",")]

    # Try to convert to numbers if the column is numeric
    if pd.api.types.is_numeric_dtype(df[column]):
        try:
            value_list = [float(v) if "." in v else int(v) for v in value_list]
        except ValueError:
            pass

    mask = df[column].isin(value_list)
    _current_df = df[mask]
    logger.info(f"IN filter: {len(df)} → {len(_current_df)} rows")
    return f"Filtered to {len(_current_df)} rows where {column} IN {value_list}"


@tool
def filter_contains(column: str, pattern: str, case_sensitive: bool = False) -> str:
    """
    Filter string column by pattern matching. (SQL: LIKE '%pattern%')

    Args:
        column: String column to search in
        pattern: Text pattern to search for
        case_sensitive: Whether search is case-sensitive (default: False)
    """
    logger.info(f"Tool: filter_contains(column='{column}', pattern='{pattern}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    mask = df[column].astype(str).str.contains(pattern, case=case_sensitive, na=False)
    _current_df = df[mask]
    logger.info(f"Contains filter: {len(df)} → {len(_current_df)} rows")
    return f"Filtered to {len(_current_df)} rows where {column} contains '{pattern}'"


@tool
def drop_nulls(column: str = "") -> str:
    """
    Remove rows with null/missing values. (SQL: WHERE col IS NOT NULL)

    Args:
        column: Specific column to check for nulls. If empty, drops rows with any null.
    """
    logger.info(f"Tool: drop_nulls(column='{column}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    if column:
        if column not in df.columns:
            return f"Column '{column}' not found. Available: {list(df.columns)}"
        _current_df = df.dropna(subset=[column])
    else:
        _current_df = df.dropna()

    dropped = len(df) - len(_current_df)
    logger.info(f"Dropped {dropped} null rows: {len(df)} → {len(_current_df)}")
    return f"Dropped {dropped} rows with null values. {len(_current_df)} rows remaining."


@tool
def get_top_n(n: int, sort_column: str, ascending: bool = False) -> str:
    """
    Get top N rows by a column value. (SQL: ORDER BY col DESC LIMIT n)

    Args:
        n: Number of rows to return
        sort_column: Column to sort by
        ascending: False for top (highest), True for bottom (lowest)
    """
    logger.info(f"Tool: get_top_n(n={n}, sort_column='{sort_column}', ascending={ascending})")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if sort_column not in df.columns:
        return f"Column '{sort_column}' not found. Available: {list(df.columns)}"

    _current_df = df.nlargest(n, sort_column) if not ascending else df.nsmallest(n, sort_column)
    direction = "bottom" if ascending else "top"
    logger.info(f"Got {direction} {n} by '{sort_column}'")
    return f"{direction.capitalize()} {n} rows by {sort_column}:\n{_current_df.to_string()}"


@tool
def count_rows() -> str:
    """
    Count the number of rows in the current dataset. (SQL: SELECT COUNT(*))
    """
    logger.info("Tool: count_rows()")
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    count = len(df)
    logger.info(f"Row count: {count}")
    return f"Current dataset has {count} rows"


@tool
def limit_rows(n: int) -> str:
    """
    Limit the dataset to first N rows. (SQL: LIMIT n)

    Args:
        n: Maximum number of rows to keep
    """
    logger.info(f"Tool: limit_rows(n={n})")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."

    _current_df = df.head(n)
    logger.info(f"Limited to {n} rows: {len(df)} → {len(_current_df)}")
    return f"Limited to first {len(_current_df)} rows:\n{_current_df.to_string()}"


@tool
def get_distinct(column: str) -> str:
    """
    Get distinct/unique rows based on a column. (SQL: SELECT DISTINCT)

    Args:
        column: Column to get distinct values from
    """
    logger.info(f"Tool: get_distinct(column='{column}')")
    global _current_df
    df = get_dataframe()
    if df is None:
        return "No data loaded."
    if column not in df.columns:
        return f"Column '{column}' not found. Available: {list(df.columns)}"

    _current_df = df.drop_duplicates(subset=[column])
    logger.info(f"Distinct on '{column}': {len(df)} → {len(_current_df)} rows")
    return f"Got {len(_current_df)} distinct rows by '{column}':\n{_current_df.to_string()}"
