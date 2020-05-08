import pandas as pd


def main():
    data = pd.read_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    data = data.fillna(0)

    month_data = data.loc[2018.0]

    countries = pd.read_csv('../data/models/rf_trees/meta/countries.csv')['country'].to_list()
    agencies = pd.read_csv('../data/models/rf_trees/meta/agencies.csv')['agency'].to_list()

    sample_month = pd.DataFrame(columns=agencies, index=countries)

    for country in countries:
        for agency in agencies:
            sample_month.at[country, agency] = month_data['total_{}'.format(agency)] * month_data['pct_{}_total_to_{}'.format(agency, country)]

    sample_month.to_csv('../data/models/rf_trees/meta/2018_january.csv')


if __name__ == "__main__":
    main()
