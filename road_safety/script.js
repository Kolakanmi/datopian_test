const axios = require('axios');
const { JSDOM } = require("jsdom")
const { convertArrayToCSV } = require('convert-array-to-csv');
const fs = require('fs');

async function webScrapping() {
  
  const wikipediaUrl = 'https://en.wikipedia.org/wiki/Road_safety_in_Europe'

  try {
    const {data} = await axios.get(wikipediaUrl);

    const tableBodyClasses = '.wikitable.sortable > tbody > tr';
  
    const dom = new JSDOM(data, {
      runScripts: "dangerously",
      resources: "usable"
    });
    const { document } = dom.window;

    let dataArray = []

    //Get table rows from document
    const tableBody = document.querySelectorAll(tableBodyClasses);
    
    //Convert document nodelist to array
    const tableBodyArray = Array.from(tableBody);

    //Extract text content from table rows
    tableBodyArray.forEach(row => {
      dataArray.push(Array.from(row.children).map(cell => cell.textContent.replace('\n', '').trim()));
    })

    //Drop unnecessary columns
    dataArray = dropColumns(dataArray,
      ["Road Network Length (in km) in 2013[29]", "Number of People Killed per Billion km[30]",
        "Number of Seriously Injured in 2017/2018[30]"
      ]
    )

    //Rename some of the headers
    dataArray = renameHeaders(dataArray, {1: 'Area', 2: 'Population', 3: 'GDP per capita', 4: 'Population density', 5: 'Vehicle ownership', 6: 'Total road deaths', 7: 'Road deaths per Million Inhabitants'})
    
    //Convert column numeric values from string to float
    convertColumnValueToFloat(dataArray,
      ['Area', 'Population', 'GDP per capita', 'Population density',
      'Vehicle ownership', 'Total road deaths',
      'Road deaths per million Inhabitants'
      ]
    )
    // Insert year to data
    insertYear(dataArray, 2018)

    //Sort data by column
    dataArray = sortByIndex(dataArray, 'Road deaths per million Inhabitants')

    //Convert array to csv string
    const csvString = convertArrayToCSV(dataArray.slice(1), {
      header: dataArray[0],
      separator: ','
    });

    const csvFile = process.cwd() + '/road_safety/data/output.csv';

    // Create csv file
    createCSVFile(csvFile, csvString);
    
  } catch (error) {
    console.log(error);
  }
}

// Drop columns
function dropColumns(array, headers) {
  const index = getIndicesFromHeaderValues(array[0], ...headers)
  return array.map(row => {
    return row.filter((_, i) => !index.includes(i));
  })
}

// Rename headers
function renameHeaders(array, newHeadersObj) {
  array[0].forEach((cell, i) => {
    if (newHeadersObj[i]) {
      array[0][i] = newHeadersObj[i];
    }
  })
  return array
}

// Convert column numeric values from string to float
function convertColumnValueToFloat(array, headers) {
  const rowIndex = getIndicesFromHeaderValues(array[0], ...headers)
  array.forEach((row, idx) => {
    if (idx > 0) {
      rowIndex.forEach(i => {
        row[i] = parseFloat(row[i].replace(/,/g, ''));
      })
    }
  })
}

// Insert year to data
function insertYear(array, year) {
  array.forEach((row, idx) => {
    if (idx == 0) {
      row.splice(1, 0, "Year");
    }
    if (idx > 0) {
      row.splice(1, 0, year);
    }
  })
}

// Sort data by column
function sortByIndex(array, column) {
  const index = getIndicesFromHeaderValues(array[0], column)[0]
  return array.sort((a, b) => {
    return a[index] - b[index];
  })
}

// Create csv file
function createCSVFile(path, csvString) {
  fs.writeFile(path, csvString, (err) => {
    if (err) throw err;
    console.log('The file has been saved in ' + path);
  });
}

//Get array of index from header values
function getIndicesFromHeaderValues(header, ...values) {
  const ans = header.reduce((acc, cell, i) => {
    if (values.map(item => {
        return item.split(' ').join('').toLowerCase()
      })
      .includes(cell.split(' ').join('').toLowerCase())) {
      acc.push(i);
    }
    return acc;
  }, [])

  return ans;
}

webScrapping();