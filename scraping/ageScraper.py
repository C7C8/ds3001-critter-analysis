import requests
import time
import csv
from bs4 import BeautifulSoup
import datetime


			
#returns -1 if could not find age/date they took that position
def getWrapper(url, wikiTitle):
	requests.encoding = 'utf-8'

	monthDict = {"January" : 1,
				"February": 2,
				"March": 3,
				"April": 4,
				"May": 5,
				"June": 6,
				"July": 7,
				"August": 8,
				"September": 9,
				"October": 10,
				"November": 11,
				"December": 12}
	response = requests.get(url, timeout = 5)
	response.encoding = 'utf-8'
	soup = BeautifulSoup(response.text, "html.parser")
	age = soup.findAll("span", {"class": "bday"})
	if len(age) == 0:
		return -1
	age = age[0].contents[0]
	tr = soup.findAll("tr")
	trIndex = -1
	for x in range(len(tr)):
		if len(tr[x]) == 1:
#			if len(tr[x].contents[0].findChild().contents) != 0:
			try:
				for y in tr[x].contents[0].find("a").children:
					if wikiTitle.lower() == (str(y)).lower():#found the right tr tag
						trIndex = x + 1
						break
			except AttributeError:
				pass
	if trIndex == -1:
		return -1
	try : #test if this is current incumbent
		links = tr[trIndex].findAll("a")
		if str(links[0].contents[0]) == "Incumbent":
			trIndex += 1
	except:
		pass
	#print(tr[trIndex].contents[0].contents)
	try:
		brIndex = 0
		for content in range(len(tr[trIndex].contents[0].contents)):
			#print(tr[trIndex].contents[0].contents[content])
			if str(tr[trIndex].contents[0].contents[content]) == "<br/>":
				brIndex = content +1	
		yearRange = tr[trIndex].contents[0].contents[brIndex]
		#print(url,yearRange)
		startYear = str(yearRange).split(", ")[1][:4]
		startMonthStr = str(yearRange).split(", ")[0].split(" ")[0]
		startMonth = monthDict[startMonthStr]
		startDay = str(yearRange).split(", ")[0].split(" ")[1]
	except:
		return -1
	
	startDateTime = datetime.datetime(int(startYear), int(startMonth), int(startDay))
	bornDateTime = datetime.datetime(int(age.split("-")[0]), int(age.split("-")[1]), int(age.split("-")[2]))
	return startDateTime - bornDateTime

def main():
	print("main called")
	filename = 'cabinet_member_spending.csv'
	urlBase = 'https://en.wikipedia.org/wiki/'
	newCSV = [['Department', 'President', 'Nominee','Votes For','Votes Against','Days','domestic_spending','foreign_spending','ageEnteringOffice']]
	with open (filename, newline = '\n') as csvfile:
		reader = csv.reader(csvfile, delimiter = ',')
		next(reader)
		for row in reader:
			newRow = row
			#print('new row')
			dept = row[0]
			name = row[2]
			wikiTitle = ''
			if dept == 'DEPARTMENT OF JUSTICE (DOJ)':
				wikiTitle = 'United States Attorney General'
			else:
				wikiTitle = 'United States Secretary of ' + dept.split('DEPARTMENT OF ')[1].split(" (")[0]
			wikiTitle = wikiTitle.lower()
			name = name.replace(" ", "_")
			url = urlBase + name
			newRow.append(getWrapper(url, wikiTitle))
			newCSV.append(newRow)
			time.sleep(2)
	with open(filename, "w", newline = '\n') as csvfile:
		writer = csv.writer(csvfile, delimiter = ',')
		for row in newCSV:
			writer.writerow(row)


if __name__ == "__main__":
	main()