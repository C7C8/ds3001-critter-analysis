import itertools
import os

import numpy
import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split
from sklearn.tree import DecisionTreeClassifier, DecisionTreeRegressor, plot_tree
import matplotlib.pyplot as plt

MIN_YEAR = 2000
MAX_YEAR = 2020

REPUBLICAN = 0
DEMOCRAT = 1

CABINET_TO_AGENCIES = {'Secretary of State': 'DEPARTMENT OF STATE (DOS)',
                       'Secretary of Agriculture': 'DEPARTMENT OF AGRICULTURE (USDA)',
                       'Secretary of Commerce': 'DEPARTMENT OF COMMERCE (DOC)',
                       'Secretary of Housing and Urban Development':
                           'DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT (HUD)',
                       'Secretary of the Treasury': 'DEPARTMENT OF THE TREASURY (TREAS)',
                       'Attorney General': 'DEPARTMENT OF JUSTICE (DOJ)',
                       'Secretary of Defense': 'DEPARTMENT OF DEFENSE (DOD)',
                       'Secretary of Education': 'DEPARTMENT OF EDUCATION (ED)',
                       'Secretary of Health and Human Services': 'DEPARTMENT OF HEALTH AND HUMAN SERVICES (HHS)',
                       'Secretary of the Interior': 'DEPARTMENT OF THE INTERIOR (DOI)',
                       'Secretary of Veterans Affairs': 'DEPARTMENT OF VETERANS AFFAIRS (VA)',
                       'Secretary of Energy': 'DEPARTMENT OF ENERGY (DOE)',
                       'Secretary of Transportation': 'DEPARTMENT OF TRANSPORTATION (DOT)',
                       'Secretary of Labor': 'DEPARTMENT OF LABOR (DOL)',
                       'Secretary of Homeland Security': 'DEPARTMENT OF HOMELAND SECURITY (DHS)'}

AGENCIES_TO_SHORT = {'DEPARTMENT OF STATE (DOS)': 'dos',
                     'DEPARTMENT OF AGRICULTURE (USDA)': 'usda',
                     'DEPARTMENT OF COMMERCE (DOC)': 'doc',
                     'DEPARTMENT OF HOUSING AND URBAN DEVELOPMENT (HUD)': 'hud',
                     'DEPARTMENT OF THE TREASURY (TREAS)': 'treas',
                     'DEPARTMENT OF JUSTICE (DOJ)': 'doj',
                     'DEPARTMENT OF DEFENSE (DOD)': 'dod',
                     'DEPARTMENT OF EDUCATION (ED)': 'ed',
                     'DEPARTMENT OF HEALTH AND HUMAN SERVICES (HHS)': 'hhs',
                     'DEPARTMENT OF THE INTERIOR (DOI)': 'doi',
                     'DEPARTMENT OF VETERANS AFFAIRS (VA)': 'va',
                     'DEPARTMENT OF ENERGY (DOE)': 'doe',
                     'DEPARTMENT OF TRANSPORTATION (DOT)': 'dot',
                     'DEPARTMENT OF LABOR (DOL)': 'dol',
                     'DEPARTMENT OF HOMELAND SECURITY (DHS)': 'dhs'}


def load_dataset() -> pd.DataFrame:
    return pd.read_csv('../data/csv/Aggregate_federal_spending_country_month_agency.csv')


def filter_years(df: pd.DataFrame) -> pd.DataFrame:
    return df[(df['year'] >= MIN_YEAR) & (df['year'] < MAX_YEAR)]


def add_absolute_date(df: pd.DataFrame) -> None:
    df['absolute_date'] = df['year'] + (df['month'] / 12.0)


def get_unique_months(dataset: pd.DataFrame) -> pd.DataFrame:
    return dataset['absolute_date'].unique()


def get_unique_countries(dataset: pd.DataFrame) -> pd.DataFrame:
    return dataset['country'].unique()


def generate_classification_dataset():
    raw_df = load_dataset()
    raw_df = filter_years(raw_df)
    raw_df.replace({"agency": AGENCIES_TO_SHORT})
    add_absolute_date(raw_df)

    # Each month is a sample
    months = get_unique_months(raw_df).tolist()
    countries = get_unique_countries(raw_df).tolist()
    agencies = CABINET_TO_AGENCIES.values()

    columns = ['total', 'pct_foreign'] + \
              ['total_{}'.format(AGENCIES_TO_SHORT[agency]) for agency in agencies] + \
              ['pct_foreign_' + AGENCIES_TO_SHORT[agency] for agency in agencies] + \
              ['pct_total_to_' + country for country in countries] + \
              ['pct_{}_total_to_{}'.format(AGENCIES_TO_SHORT[agency], country)
               for (agency, country) in itertools.product(agencies, countries)]

    data = pd.DataFrame(index=months, columns=columns)

    data['total'] = data.apply(lambda row: raw_df[raw_df['absolute_date'] == row.name]['sum'].sum(), axis=1)
    data['pct_foreign'] = data.apply(lambda row: raw_df[(raw_df['absolute_date'] == row.name) &
                                                        (raw_df['country'] != 'USA')]['sum'].sum() / row['total'],
                                     axis=1)

    for agency in agencies:
        data['total_{}'.format(AGENCIES_TO_SHORT[agency])] = data.apply(
            lambda row: raw_df[(raw_df['absolute_date'] == row.name) &
                               (raw_df['agency'] == agency)]['sum'].sum(), axis=1)

        data['pct_foreign_{}'.format(AGENCIES_TO_SHORT[agency])] = data.apply(
            lambda row: 0.0 if row['total_{}'.format(AGENCIES_TO_SHORT[agency])] == 0.0 else
            raw_df[(raw_df['absolute_date'] == row.name) &
                   (raw_df['country'] != 'USA') &
                   (raw_df['agency'] == agency)]['sum'].sum() / row['total_{}'.format(AGENCIES_TO_SHORT[agency])],
            axis=1)

    data.to_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    for country in countries:
        data['pct_total_to_{}'.format(country)] = data.apply(
            lambda row: raw_df[(raw_df['absolute_date'] == row.name) &
                               (raw_df['country'] == country)]['sum'].sum() / row['total'], axis=1)

    data.to_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    for agency in agencies:
        print("Agency: " + agency)
        for country in countries:
            print("\tCountry: " + country)
            data['pct_{}_total_to_{}'.format(AGENCIES_TO_SHORT[agency], country)] = data.apply(
                lambda row: 0.0 if row['total_{}'.format(AGENCIES_TO_SHORT[agency])] == 0.0 else
                raw_df[(raw_df['absolute_date'] == row.name) &
                       (raw_df['country'] == country) &
                       (raw_df['agency'] == agency)]['sum'].sum() / row[
                    'total_{}'.format(AGENCIES_TO_SHORT[agency])],
                axis=1)

    data.to_pickle('../data/df/dt_dataset_by_month.pkl.gz')


def main():
    if not os.path.isfile('../data/df/dt_dataset_by_month.pkl.gz'):
        generate_classification_dataset()

    data = pd.read_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    data = data.fillna(0)

    target = data.index.to_frame().reset_index()
    del target['index']
    target['party'] = target.apply(lambda row: DEMOCRAT if (
                (2009 + 1.0 / 12) < row[0] <= (2017 + 1.0 / 12)) else REPUBLICAN, axis=1)
    del target[0]

    x_train, x_test, y_train, y_test = train_test_split(data, target, test_size=0.30)

    tree = DecisionTreeClassifier()
    tree.fit(x_train, y_train)

    predictions = tree.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    print("Decision tree accuracy: {}".format(accuracy))
    print("Depth: {}".format(tree.get_depth()))

    fig = plt.figure(figsize=[6.4 * 5, 4.8 * 5])
    plot_tree(tree, filled=True, class_names=["Republican", "Democrat"], feature_names=data.columns.tolist())
    fig.show()

    # forest = RandomForestClassifier()
    # forest.fit(x_train, y_train)
    #
    # predictions = forest.predict(x_test)
    # accuracy = accuracy_score(y_test, predictions)
    # print("Random forest accuracy: {}".format(accuracy))


if __name__ == '__main__':
    main()
