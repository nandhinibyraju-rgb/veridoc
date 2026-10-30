"""
Tests for the data pipeline module.
These tests verify behavior with Pandas 1.x APIs and should continue
to pass after migration to Pandas 2.x compatible code.
"""
import pandas as pd
import numpy as np
import sys
import os

# Ensure UTF-8 output on Windows consoles
if hasattr(sys.stdout, 'reconfigure'):
    sys.stdout.reconfigure(encoding='utf-8', errors='replace')
if hasattr(sys.stderr, 'reconfigure'):
    sys.stderr.reconfigure(encoding='utf-8', errors='replace')

# Add parent to path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..', 'src'))
from data_pipeline import (
    load_sales_data,
    load_returns_data,
    merge_transactions,
    add_summary_row,
    build_quarterly_report,
    categorize_products,
)


def test_load_sales_data():
    """Sales data should have correct shape and columns."""
    df = load_sales_data()
    assert df.shape == (5, 4), f"Expected (5, 4), got {df.shape}"
    assert list(df.columns) == ['date', 'product', 'revenue', 'units']
    assert df['revenue'].sum() == 950.0
    print("  ✓ test_load_sales_data passed")


def test_load_returns_data():
    """Returns data should have correct shape and negative values."""
    df = load_returns_data()
    assert df.shape == (2, 4), f"Expected (2, 4), got {df.shape}"
    assert (df['revenue'] < 0).all(), "Returns should have negative revenue"
    print("  ✓ test_load_returns_data passed")


def test_merge_transactions():
    """Merged result should contain all rows from both DataFrames."""
    sales = load_sales_data()
    returns = load_returns_data()
    combined = merge_transactions(sales, returns)

    assert len(combined) == 7, f"Expected 7 rows, got {len(combined)}"
    assert list(combined.columns) == ['date', 'product', 'revenue', 'units']

    # Index should preserve original indices (not reset)
    expected_index = list(sales.index) + list(returns.index)
    assert list(combined.index) == expected_index, \
        f"Index mismatch: expected {expected_index}, got {list(combined.index)}"

    # Verify data integrity
    assert combined['revenue'].sum() == 870.0, \
        f"Expected total revenue 870.0, got {combined['revenue'].sum()}"
    print("  ✓ test_merge_transactions passed")


def test_merge_preserves_dtypes():
    """Merged result should preserve column data types."""
    sales = load_sales_data()
    returns = load_returns_data()
    combined = merge_transactions(sales, returns)

    assert combined['revenue'].dtype == np.float64
    assert combined['units'].dtype == np.int64
    assert pd.api.types.is_datetime64_any_dtype(combined['date'])
    print("  ✓ test_merge_preserves_dtypes passed")


def test_add_summary_row():
    """Summary row should be appended with correct totals and reset index."""
    sales = load_sales_data()
    result = add_summary_row(sales)

    assert len(result) == 6, f"Expected 6 rows, got {len(result)}"
    # ignore_index=True means 0-based sequential index
    assert list(result.index) == list(range(6)), \
        f"Expected sequential index, got {list(result.index)}"

    last_row = result.iloc[-1]
    assert last_row['product'] == 'TOTAL'
    assert last_row['revenue'] == 950.0
    assert last_row['units'] == 92
    print("  ✓ test_add_summary_row passed")


def test_build_quarterly_report():
    """Quarterly report should combine all monthly frames."""
    months = [
        pd.DataFrame({'product': ['A'], 'revenue': [100.0]}),
        pd.DataFrame({'product': ['B'], 'revenue': [200.0]}),
        pd.DataFrame({'product': ['C'], 'revenue': [300.0]})
    ]
    quarterly = build_quarterly_report(months)

    assert len(quarterly) == 3, f"Expected 3 rows, got {len(quarterly)}"
    assert quarterly['revenue'].sum() == 600.0
    # Original indices preserved (each month has index 0)
    assert list(quarterly.index) == [0, 0, 0]
    print("  ✓ test_build_quarterly_report passed")


def test_categorize_products():
    """Category assignment and summary rows should be correct."""
    sales = load_sales_data()
    result = categorize_products(sales)

    # 5 original rows + 2 category summary rows = 7
    assert len(result) == 7, f"Expected 7 rows, got {len(result)}"

    # Check category assignments
    premium_rows = result[result['category'] == 'Premium']
    standard_rows = result[result['category'] == 'Standard']

    # Widget A is Premium (2 data rows + 1 subtotal)
    assert len(premium_rows) == 3, f"Expected 3 Premium rows, got {len(premium_rows)}"
    # Widget B, C are Standard (3 data rows + 1 subtotal)
    assert len(standard_rows) == 4, f"Expected 4 Standard rows, got {len(standard_rows)}"
    print("  ✓ test_categorize_products passed")


def run_all_tests():
    """Run all tests and report results."""
    tests = [
        test_load_sales_data,
        test_load_returns_data,
        test_merge_transactions,
        test_merge_preserves_dtypes,
        test_add_summary_row,
        test_build_quarterly_report,
        test_categorize_products,
    ]

    passed = 0
    failed = 0
    errors = []

    print(f"\nRunning {len(tests)} tests...\n")

    for test_fn in tests:
        try:
            test_fn()
            passed += 1
        except Exception as e:
            failed += 1
            errors.append((test_fn.__name__, str(e)))
            print(f"  ✗ {test_fn.__name__} FAILED: {e}")

    print(f"\n{'='*50}")
    print(f"Results: {passed} passed, {failed} failed, {len(tests)} total")
    if errors:
        print(f"\nFailures:")
        for name, err in errors:
            print(f"  - {name}: {err}")
    print(f"{'='*50}")

    return failed == 0


if __name__ == '__main__':
    success = run_all_tests()
    sys.exit(0 if success else 1)
