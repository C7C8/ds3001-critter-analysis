import pandas as pd

# Conversion of the Cabinet-Date-Changes script, and modified to use seaborn

agency_spending_data = pd.read_pickle("data/df/aggregate_federal_country_month_agency.pkl.gz")
cabinet_data = pd.read_pickle("data/df/cabinet.pkl.gz")

agencies = pd.unique(agency_spending_data["agency"])
cabinet_positions = pd.unique(cabinet_data['Position'])
