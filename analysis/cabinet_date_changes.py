import datetime
from typing import Union, TypeVar
import math

from matplotlib import pyplot as plt
import numpy as np
import pandas as pd

# Conversion of the Cabinet-Date-Changes script, and modified to use seaborn

agency_spending_data = pd.read_pickle("data/df/aggregate_federal_country_month_agency.pkl.gz")
cabinet_data = pd.read_pickle("data/df/cabinet.pkl.gz")
agencies = pd.unique(agency_spending_data["agency"])
cabinet_positions = pd.unique(cabinet_data['Position'])

position_agency_mappings = {
    'Secretary of State': 'DEPARTMENT OF STATE'.title(),
    'Secretary of Agriculture': 'DEPARTMENT OF STATE'.title(),
    'Secretary of Commerce': 'DEPARTMENT OF COMMERCE'.title(),
    'Secretary of Housing and Urban Development': 'DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT'.title(),
    'Secretary of the Treasury': 'DEPARTMENT OF THE TREASURY'.title(),
    'Attorney General': 'DEPARTMENT OF JUSTICE'.title(),
    'Secretary of Defense': 'DEPARTMENT OF DEFENSE'.title(),
    'Secretary of Education': 'DEPARTMENT OF EDUCATION'.title(),
    'Secretary of Health and Human Services': 'DEPARTMENT OF HEALTH AND HUMAN SERVICES'.title(),
    'Secretary of the Interior': 'DEPARTMENT OF THE INTERIOR'.title(),
    'Secretary of Veterans Affairs': 'DEPARTMENT OF VETERANS AFFAIRS'.title(),
    'Secretary of Energy': 'DEPARTMENT OF ENERGY'.title(),
    'Secretary of Transportation': 'DEPARTMENT OF TRANSPORTATION'.title(),
    'Secretary of Labor': 'DEPARTMENT OF LABOR'.title(),
    'Secretary of Homeland Security': 'DEPARTMENT OF HOMELAND SECURITY'.title()
}

def convert_date_to_be_relative_year(date_str: str) -> float:
    date = datetime.datetime.strptime(date_str, '%Y-%m-%d')
    days_of_year = int(date.strftime('%j'))
    year = int(date.strftime('%Y'))

    return year + days_of_year / 366

def convert_month_to_be_relative_year(month: int, year: int) -> float:
    return year + month / 12

# Given a dataframe that contains year and month, add a new column called "relative_date" that
# represents the month/year combo as a decimal relative to the current year.
def add_relative_date_to_df(dataframe: pd.DataFrame) -> None:
    T = TypeVar('T')
    def convert_to_int_if_possible(value: T) -> Union[int, T]:
        try:
            return int(value)
        except ValueError:
            return value

    dataframe['relative_date'] = convert_month_to_be_relative_year(
        dataframe['month'].apply(convert_to_int_if_possible),
        dataframe['year'].apply(convert_to_int_if_possible)
    )

def add_missing_entries_for_agency(dataframe: pd.DataFrame) -> None:
    min_date = dataframe['relative_date'].min()
    max_date = dataframe['relative_date'].max()
    missing_items = pd.DataFrame(columns=['sum', 'relative_date'])
    for relative_date in np.arange(min_date, max_date + 1/12, 1/12):
        date_spending = agency_spending[np.isclose(agency_spending['relative_date'], relative_date)]
        if len(date_spending) == 0:
            missing_items = missing_items.append(
                pd.DataFrame({
                    'sum': [0],
                    'relative_date': [relative_date],
                }),
            )

    return pd.concat([dataframe, missing_items]).sort_values('relative_date')

spending_by_cabinet_figure = plt.figure(figsize=(14, 128))
add_relative_date_to_df(agency_spending_data)
for i, position in enumerate(position_agency_mappings.keys()):
    domestic_plot = spending_by_cabinet_figure.add_subplot(len(position_agency_mappings), 2, i * 2 + 1)
    foreign_plot = spending_by_cabinet_figure.add_subplot(len(position_agency_mappings), 2, i * 2 + 2)

    cabinet_position_dates = cabinet_data[cabinet_data['Position'] == position].sort_values('Confirmed')['Confirmed']
    for date in cabinet_position_dates:
        if isinstance(date, float) and math.isnan(date):
            continue

        relative_year = convert_date_to_be_relative_year(date)
        for plot in [domestic_plot, foreign_plot]:
            plot.axvline(relative_year, color='black')

    agency_spending = agency_spending_data[
        (agency_spending_data['agency'] == position_agency_mappings[position])
        # Filter out valid years
        & (agency_spending_data['year'] < 2020)
        & (agency_spending_data['year'] >= 2000)
    ]

    domestic_spending = agency_spending[agency_spending['country'] == 'USA']
    # Add missing dates before performing normalization - doing makes a moving average more accurate
    domestic_spending = add_missing_entries_for_agency(domestic_spending[['sum', 'relative_date']])

    foreign_spending = agency_spending[agency_spending['country'] != 'USA'].groupby(['relative_date'], as_index=False)['sum'].sum()
    foreign_spending.reset_index()
    # Add missing dates before performing normalization - doing makes a moving average more accurate
    foreign_spending = add_missing_entries_for_agency(foreign_spending)

    domestic_plot.plot(
        domestic_spending['relative_date'],
        domestic_spending['sum'].rolling(12).mean(),
    )
    domestic_plot.set_title(position + ' domestic spending by year')
    foreign_plot.plot(
        foreign_spending['relative_date'],
        foreign_spending['sum'].rolling(12).mean(),
        color='orange'
    )
    foreign_plot.set_title(position + ' foreign spending by year')

plt.show()