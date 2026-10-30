"""
Data pipeline module using Pandas 1.x APIs.
Contains deprecated DataFrame.append() calls that need migration to pd.concat().
"""
import pandas as pd
import numpy as np


def load_sales_data():
    """Create sample sales DataFrame."""
    return pd.DataFrame({
        'date': pd.date_range('2024-01-01', periods=5, freq='D'),
        'product': ['Widget A', 'Widget B', 'Widget C', 'Widget A', 'Widget B'],
        'revenue': [100.0, 250.0, 175.0, 300.0, 125.0],
        'units': [10, 25, 15, 30, 12]
    })


def load_returns_data():
    """Create sample returns DataFrame."""
    return pd.DataFrame({
        'date': pd.to_datetime(['2024-01-02', '2024-01-04']),
        'product': ['Widget B', 'Widget A'],
        'revenue': [-50.0, -30.0],
        'units': [-5, -3]
    })


def merge_transactions(sales_df, returns_df):
    """
    Merge sales and returns using DataFrame.append().
    DEPRECATED in Pandas 1.4+, removed in Pandas 2.0.
    """
    # DataFrame.append() — deprecated API
    combined = sales_df.append(returns_df)
    return combined


def add_summary_row(df):
    """
    Add a totals summary row using DataFrame.append().
    DEPRECATED in Pandas 1.4+, removed in Pandas 2.0.
    """
    totals = pd.DataFrame({
        'date': [pd.NaT],
        'product': ['TOTAL'],
        'revenue': [df['revenue'].sum()],
        'units': [df['units'].sum()]
    })
    # DataFrame.append() — deprecated API
    result = df.append(totals, ignore_index=True)
    return result


def build_quarterly_report(monthly_frames):
    """
    Combine monthly DataFrames into a quarterly report using DataFrame.append().
    DEPRECATED in Pandas 1.4+, removed in Pandas 2.0.
    """
    quarterly = pd.DataFrame()
    for month_df in monthly_frames:
        # DataFrame.append() — deprecated API
        quarterly = quarterly.append(month_df)
    return quarterly


def categorize_products(df):
    """
    Add category column and append category summary using DataFrame.append().
    DEPRECATED in Pandas 1.4+, removed in Pandas 2.0.
    """
    df = df.copy()
    df['category'] = df['product'].apply(
        lambda x: 'Premium' if 'A' in x else 'Standard'
    )

    category_summary = df.groupby('category').agg({
        'revenue': 'sum',
        'units': 'sum'
    }).reset_index()
    category_summary['date'] = pd.NaT
    category_summary['product'] = category_summary['category'] + ' Subtotal'

    # DataFrame.append() — deprecated API
    result = df.append(category_summary, ignore_index=True)
    return result


if __name__ == '__main__':
    sales = load_sales_data()
    returns = load_returns_data()

    combined = merge_transactions(sales, returns)
    print("Combined Transactions:")
    print(combined)
    print()

    with_summary = add_summary_row(combined)
    print("With Summary Row:")
    print(with_summary)
    print()

    # Quarterly report from monthly data
    months = [
        pd.DataFrame({'date': ['2024-01-15'], 'product': ['Widget A'], 'revenue': [500.0], 'units': [50]}),
        pd.DataFrame({'date': ['2024-02-15'], 'product': ['Widget B'], 'revenue': [600.0], 'units': [60]}),
        pd.DataFrame({'date': ['2024-03-15'], 'product': ['Widget C'], 'revenue': [700.0], 'units': [70]})
    ]
    quarterly = build_quarterly_report(months)
    print("Quarterly Report:")
    print(quarterly)
