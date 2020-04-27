"""Script for loading all the CSVs and converting them to dataframes with proper data types for each column."""

import pandas as pd

acronym_splitter_regex = "^(.*)(\\(\\w+\\))$"


# Aggregate_federal_country_year_agency.csv
df = pd.read_csv("data/csv/Aggregate_federal_country_year_agency_.csv", index_col=False)
# Split agency names from their acronyms, may make sorting easier
tmp = df["agency"].str.extract(acronym_splitter_regex)
df["agency"] = tmp[0].str.strip()
df["agency_acr"] = tmp[1].str[1:-1]

df.dropna(axis=0)\
	.sort_values(["year", "agency"])\
	.reset_index(drop=True)\
	.to_pickle("data/df/aggregate_federal_country_year_agency.pkl.gz")


# Aggregate_federal_spending_country_month_agency
df = pd.read_csv("data/csv/Aggregate_federal_spending_country_month_agency.csv")
tmp = df["agency"].str.extract(acronym_splitter_regex)
df["agency"] = tmp[0].str.strip()
df["agency_acr"] = tmp[1].str[1:-1]

df.dropna(axis=0)\
	.sort_values(["year", "month", "agency"])\
	.reset_index(drop=True)\
	.to_pickle("data/df/aggregate_federal_country_month_agency.pkl.gz")


# foreign_spending_by_agency_year_country_all
df = pd.read_csv("data/csv/foreign_spending_by_agency_year_country_all.csv")
tmp = df["agency"].str.extract(acronym_splitter_regex)
df["agency"] = tmp[0].str.strip()
df["agency_acr"] = tmp[1].str[1:-1]

df.dropna(axis=0) \
	.sort_values(["year", "agency"]) \
	.reset_index(drop=True) \
	.to_pickle("data/df/foreign_spending_by_agency_year_country_all.pkl.gz")

# cabinet_member_spending

df = pd.read_csv("data/csv/cabinet_member_spending.csv")
tmp = df["Department"].str.extract(acronym_splitter_regex)
df["Department"] = tmp[0].str.strip()
df["Department_acr"] = tmp[1].str[1:-1]

df.dropna(axis=0) \
	.sort_values(["Department"]) \
	.reset_index(drop=True) \
	.to_pickle("data/df/cabinet_member_spending.pkl.gz")
