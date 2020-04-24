import csv
import datetime
from dataclasses import dataclass
import re
import string
import sys
import bs4
import requests
from typing import Generator, Iterable, Optional, Tuple

SENATE_URL = "https://www.senate.gov/reference/Trump_cabinet.htm"
PRESIDENT_NAME = "Donald Trump"
TD_DATE_FORMAT = "%b %d, %Y"
WITHDRAWN_DATE_FORMAT = "Withdrawn %b %d, %Y."


@dataclass
class Nomination:
    position: str
    president: str
    name: str
    announced_date: datetime.date
    received_date: datetime.date
    confirmed_date: datetime.date
    vote_type: str
    votes_for: int
    votes_against: int

    # Given a position, the information about the nomination on a single row, and the full page's html,
    # this will construct a Nomination that reflects that data
    # Returns None if this candidate was not sworn in
    @classmethod
    def make_from_nomination_page_row(
        cls,
        position: str,
        president: str,
        tds: Iterable[bs4.BeautifulSoup],
        full_page: bs4.BeautifulSoup,
    ) -> Optional["Nomination"]:
        nominee_name_element = tds[0]
        withdrawn_date = Nomination._get_withdrawn_date(nominee_name_element, full_page)
        # We don't care about a candidate if they weren't actually sworn in.
        if withdrawn_date is not None:
            return None

        vote_str = tds[5].text.strip()
        votes_for, votes_against = (None, None)
        vote_type = 'Voice Vote'
        try:
            votes_for, votes_against = Nomination._parse_vote_text(vote_str)
            vote_type = 'Roll Call Vote'
        except ValueError:
            pass

        return Nomination(
            position=position,
            president=president,
            name=nominee_name_element.text.rstrip(string.digits),
            announced_date=Nomination._parse_td_date(tds[1].text.strip()),
            received_date=Nomination._parse_td_date(tds[3].text.strip()),
            confirmed_date=Nomination._parse_td_date(tds[4].text.strip()),
            vote_type=vote_type,
            votes_for=votes_for,
            votes_against=votes_against,
        )

    # Define an iterator for this object that will give the correct position in the csv
    def __iter__(self):
        yield from (
            self.position,
            self.president,
            self.name,
            self.announced_date,
            self.received_date,
            # Withdrawn date will always be empty
            "",
            self.confirmed_date,
            # Rejected will always be empty
            "",
            self.vote_type,
            self.votes_for,
            self.votes_against,
        )

    # Given the element containing the nominee's name, check the full page to see if there's information
    # about their withdrawl
    @classmethod
    def _get_withdrawn_date(
        cls, nominee_name_element: bs4.BeautifulSoup, full_page: bs4.BeautifulSoup
    ) -> Optional[datetime.date]:
        if nominee_name_element.a is None:
            return None

        # Find the note on the page, stripping out the # reference marker.
        note_location = nominee_name_element.a.attrs["href"].lstrip("#")
        note_element = full_page.find("a", {"name": note_location})
        # The text for the note is stored directly AFTER the anchor
        note_text = note_element.next_sibling.strip()

        # Get the note text, stripping the number at the start
        note_text = re.sub(r"^\d+\.\s", "", note_text)
        try:
            withdrawn_datetime = datetime.datetime.strptime(
                note_text, WITHDRAWN_DATE_FORMAT
            )
        except ValueError:
            # If this doesn't match the withdrawn date format, skip it.
            return None

        return withdrawn_datetime.date()

    # Parse a date given in a td
    @classmethod
    def _parse_td_date(cls, date_str: str) -> datetime.date:
        # Sometimes, there is more than one date. We will always take the later of the two
        last_date = " ".join(date_str.split(" ")[-3:])
        td_datetime = datetime.datetime.strptime(last_date, TD_DATE_FORMAT)

        return td_datetime.date()

    # Parse the text of a given vote td, returning the votes for and against.
    @classmethod
    def _parse_vote_text(cls, vote_str: str) -> Tuple[int, int]:
        match = re.search(r"(\d+)-(\d+)", vote_str)
        if match is None:
            raise ValueError(f"Invalid vote string: '{vote_str}'")

        return int(match.group(1)), int(match.group(2))


# Gets the html of the given page as a string.
def get_page_html(url: str) -> str:
    res = requests.get(url)
    if res.status_code != 200:
        raise requests.HTTPError(f"Unexpected status code: {res.status_code}")

    return res.text


# Return a generator of the president's nominations, given the bs4 for the entire page
def extract_nomination_data(
    page: bs4.BeautifulSoup,
) -> Generator[Nomination, None, None]:
    nomination_table = page.table
    nomination_rows = nomination_table.find_all("tr")

    current_position = None
    for row in nomination_rows:
        row_tds = row.find_all("td")
        # If there are no td's, then there is no data to process.
        if len(row_tds) == 0:
            continue
        # If there is only one td (centered) we have found a row indicating the position that was voted on
        elif len(row_tds) == 1 and row_tds[0].get("align") == "center":
            current_position = row.text.strip()
        # Otherwise, if there's text in the row, we assume that it's senator data
        elif len(row_tds) > 1 and len(row.text.strip()) > 0:
            # print([td for td in row_tds])
            nominee = Nomination.make_from_nomination_page_row(
                current_position, PRESIDENT_NAME, row_tds, page
            )
            if nominee is None:
                continue

            yield nominee


if __name__ == "__main__":
    raw_cabinet_html = get_page_html(SENATE_URL)
    cabinet_html = bs4.BeautifulSoup(raw_cabinet_html, "html.parser")
    nominee_generator = extract_nomination_data(cabinet_html)

    stdout_csv_writer = csv.writer(sys.stdout)
    # Write the header row
    stdout_csv_writer.writerow(
        (
            "Position",
            "Nominee",
            "President",
            "Announced",
            "Received",
            "Withdrawn",
            "Confirmed",
            "Rejected",
            "Vote Type",
            "Votes For",
            "Votes Against",
        )
    )

    stdout_csv_writer.writerows(nominee_generator)
