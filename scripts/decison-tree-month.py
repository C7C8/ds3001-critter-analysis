import itertools
import json
import os
import re
from os import listdir
from os.path import isfile, join

import pandas as pd
from sklearn.metrics import accuracy_score
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.tree import DecisionTreeClassifier
from sklearn.ensemble import RandomForestClassifier
import sklearn_json as skljson
import numpy
from matplotlib import pyplot as plt

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


# https://gist.github.com/pprett/3813537
def export_json(decision_tree, out_file=None, feature_names=None):
    """Export a decision tree in JSON format.
    This function generates a JSON representation of the decision tree,
    which is then written into `out_file`. Once exported, graphical renderings
    can be generated using, for example::
        $ dot -Tps tree.dot -o tree.ps      (PostScript format)
        $ dot -Tpng tree.dot -o tree.png    (PNG format)
    Parameters
    ----------
    decision_tree : decision tree classifier
        The decision tree to be exported to JSON.
    out_file: file object or string, optional (default=None)
        Handle or name of the output file.
    feature_names : list of strings, optional (default=None)
        Names of each of the features.
    --------
    """
    import numpy as np

    from sklearn.tree import _tree

    def arr_to_py(arr):
        arr = arr.ravel()
        wrapper = float
        if np.issubdtype(arr.dtype, np.int):
            wrapper = int
        return list(map(wrapper, arr.tolist()))

    def node_to_str(tree, node_id):
        node_repr = '"samples": %d, "value": %s' \
                    % (tree.n_node_samples[node_id],
                       arr_to_py(tree.value[node_id]))
        if tree.children_left[node_id] != _tree.TREE_LEAF:
            if feature_names is not None:
                feature = feature_names[tree.feature[node_id]]
            else:
                feature = "X[%s]" % tree.feature[node_id]

            label = '"label": "%s <= %.2f"' % (feature,
                                               tree.threshold[node_id])
            node_type = '"type": "split"'
        else:
            node_type = '"type": "leaf"'
            label = '"label": "Leaf - %d"' % node_id
        node_repr = ", ".join((node_repr, label, node_type))
        return node_repr

    def recurse(tree, node_id, parent=None):
        if node_id == _tree.TREE_LEAF:
            raise ValueError("Invalid node_id %s" % _tree.TREE_LEAF)

        left_child = tree.children_left[node_id]
        right_child = tree.children_right[node_id]

        # Open node with description
        out_file.write('{%s' % node_to_str(tree, node_id))

        # write children
        if left_child != _tree.TREE_LEAF:  # and right_child != _tree.TREE_LEAF
            out_file.write(', "children": [')
            recurse(tree, left_child, node_id)
            out_file.write(', ')
            recurse(tree, right_child, node_id)
            out_file.write(']')

        # close node
        out_file.write('}')

    out_file = open(out_file, "w")

    if isinstance(decision_tree, _tree.Tree):
        recurse(decision_tree, 0)
    else:
        recurse(decision_tree.tree_, 0)
    out_file.close()


# A debug method to help with tuning
# Outputs to a tuning directory
def make_hyperparameter_plots(x_train, y_train, random_state):
    # Inspired by: https://www.kaggle.com/hadend/tuning-random-forest-parameters
    parameters = {
        "max_depth": numpy.arange(1, 28, 1),
        "min_samples_split": numpy.arange(1, 255, 1),
        "min_samples_leaf": numpy.arange(1, 64, 1),
        "max_leaf_nodes": numpy.arange(2, 64, 1),
        "min_weight_fraction_leaf": numpy.arange(0.1, 0.4, 0.1),
        "min_impurity_decrease": numpy.arange(0.001, 0.1, 0.001)
    }

    for parameter, parameter_range in dict.items(parameters):
        averages = []
        for parameter_value in parameter_range:
            tree = DecisionTreeClassifier(
                random_state=random_state,
                **{parameter: parameter_value}
            )

            results = cross_val_score(tree, x_train, y_train)
            averages.append(results.mean())

        fig = plt.figure()
        plot = fig.add_subplot(1, 1, 1)
        plot.plot(parameter_range, averages)
        plot.set_title(parameter)
        plot.set_ylabel('5-Fold Average Accuracy')
        plot.set_xlabel('Parameter Value')
        fig.savefig(f'tuning/{parameter}.png')


def main():
    RANDOM_SEED = 5

    if not os.path.isfile('../data/df/dt_dataset_by_month.pkl.gz'):
        generate_classification_dataset()

    data = pd.read_pickle('../data/df/dt_dataset_by_month.pkl.gz')

    data = data.fillna(0)

    target = data.index.to_frame().reset_index()
    del target['index']
    target['party'] = target.apply(lambda row: DEMOCRAT if (
                (2009 + 1.0 / 12) < row[0] <= (2017 + 1.0 / 12)) else REPUBLICAN, axis=1)
    del target[0]

    x_train, x_test, y_train, y_test = train_test_split(data, target, test_size=0.30, random_state=RANDOM_SEED)

    forest = RandomForestClassifier(random_state=RANDOM_SEED)
    forest.fit(x_train, y_train)

    predictions = forest.predict(x_test)
    accuracy = accuracy_score(y_test, predictions)
    print("Random forest accuracy: {}".format(accuracy))

    for model_number, tree in enumerate(forest.estimators_):
        fname = '../data/models/rf_trees/model_{}.json'.format(model_number)
        export_json(tree, fname, data.columns.tolist())


if __name__ == '__main__':
    main()
