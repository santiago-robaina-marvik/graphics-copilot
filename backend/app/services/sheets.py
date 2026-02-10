"""Utility functions for fetching data from public Google Sheets."""

import re

import pandas as pd

from app.logging_config import get_logger

logger = get_logger("app.services.sheets")


class SheetFetchError(Exception):
    """Raised when fetching a Google Sheet fails."""

    pass


def parse_sheet_url(url: str) -> tuple[str, str]:
    """
    Extract sheet_id and gid from a Google Sheets URL.

    Args:
        url: Google Sheets URL (e.g., https://docs.google.com/spreadsheets/d/{id}/edit#gid=0)

    Returns:
        Tuple of (sheet_id, gid). gid defaults to "0" if not found.

    Raises:
        ValueError: If URL is not a valid Google Sheets URL.
    """
    # Extract sheet ID
    match = re.search(r"/spreadsheets/d/([a-zA-Z0-9-_]+)", url)
    if not match:
        raise ValueError(f"Invalid Google Sheets URL: {url}")

    sheet_id = match.group(1)

    # Extract gid (defaults to "0" for first sheet)
    gid_match = re.search(r"[#&?]gid=([0-9]+)", url)
    gid = gid_match.group(1) if gid_match else "0"

    return sheet_id, gid


def fetch_public_sheet(sheet_id: str, gid: str = "0") -> list[dict]:
    """
    Fetch data from a public Google Sheet.

    The sheet must be shared as "Anyone with the link can view".
    No authentication required.

    Args:
        sheet_id: The Google Sheets document ID
        gid: The sheet tab ID (default "0" for first sheet)

    Returns:
        List of dictionaries (one per row), suitable for set_dataframe()

    Raises:
        SheetFetchError: If the sheet cannot be fetched or parsed
    """
    url = f"https://docs.google.com/spreadsheets/d/{sheet_id}/export?format=csv&gid={gid}"
    logger.info(f"Fetching sheet: {sheet_id}, gid: {gid}")

    try:
        df = pd.read_csv(url)
        data = df.to_dict("records")
        logger.info(f"Fetched {len(data)} rows from sheet")
        return data
    except Exception as e:
        logger.error(f"Failed to fetch sheet: {e}")
        raise SheetFetchError(f"Failed to fetch Google Sheet: {e}") from e
