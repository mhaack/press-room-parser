const axios = require('axios');
const cheerio = require('cheerio');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const { DateTime } = require('luxon');

function formatDateToUSFormat(dateString) {
  return DateTime.fromFormat(dateString, 'MMMM d, yyyy').toISODate();
}

async function fetchData(url) {
  console.log('Fetching data from:', url);
  const response = await axios.get(url);
  const $ = cheerio.load(response.data);
  const dataList = [];

  $('ul.press > li:not(.headline)').each((index, element) => {
    let title = $(element).find('a').text().trim();
    if (title?.indexOf('|') > 0) {
      title = title.split('|')[1].trim();
    }

    const link = $(element).find('a').attr('href').trim().replace('#new_tab', '');
    const date = formatDateToUSFormat($(element).find('span.date').text().trim());

    let source = $(element).find('a > strong').text().trim();
    if (source === '') {
      source = $(element).find('span.source').text().trim();
    }

    dataList.push({ title, link, date, source });
  });

  console.log('Fetched', dataList.length, 'items from:', url);
  return dataList;
}

async function writeToCSV(data) {
  const csvWriter = createCsvWriter({
    path: 'output.csv',
    fieldDelimiter: ';',
    header: [
      { id: 'title', title: 'Title' },
      { id: 'link', title: 'Link' },
      { id: 'date', title: 'Date' },
      { id: 'source', title: 'Source' },
    ],
  });

  try {
    await csvWriter.writeRecords(data);
    console.log('CSV file has been written successfully.');
  } catch (error) {
    console.error('Error writing to CSV:', error);
  }
}

async function main() {
  const allData = [];
  let downloadDone = false;
  let pageNumber = 1;

  //const baseUrl = 'https://news.sap.com/press-room/media-coverage-of-sap/';
  const baseUrl = 'https://news.sap.com/press-room/partner-news/';

  while (!downloadDone) {
    try {
      const url = pageNumber === 1 ? baseUrl : `${baseUrl}page/${pageNumber}/`;
      const data = await fetchData(url);
      if (data.length !== 0) {
        allData.push(...data);
        pageNumber += 1;
      } else {
        downloadDone = true;
      }
    } catch (error) {
      downloadDone = true;
      console.error('Error fetching data:', error);
    }
  }

  if (allData.length > 0) {
    await writeToCSV(allData);
  } else {
    console.log('No data fetched.');
  }
}

main();
