// Initial Zip and City
let zip = "10115";
let city = "Berlin";
// What is the valid lat long for berlin
let lat = 53.4661983935898;
let lon = 9.69158914791978;
const base_url = (zipcode) => {
  return `https://api.bild.de/historicalweatherdata/get_weatherdata_json_object?path=weatherdata/100y&file=plz_${zipcode}`;
 };

const modal = document.getElementById("search-page-container");
const searchButton = document.getElementById("search-button");
const searchInput = document.getElementsByClassName("search-input")[0];
const modalInput = document.getElementsByClassName("modal-input")[0];
const textSearch = document.getElementById("search-btn");
const textClose = document.getElementsByClassName("modal-text-close")[0];
const overlay = document.getElementById("overlay");
const info = document.getElementById("info-modal");
const infoButton = document.getElementById("info-btn");
const infoInput = document.getElementsByClassName("info-input")[0];
const temperature = document.getElementById("temperature");
const comparison = document.getElementById("comparison");
const tempImage = document.getElementById("tempImage");
const form = document.getElementById("city-search-form");
const closeBtn = document.querySelector(".close");
const cancelBtn = document.querySelector(".cancel-btn");
const inputField = document.getElementById("city-search-input");
const suggestionsDiv = document.getElementById("suggestions");
const searchContainer = document.querySelector(".search-page-container");
const searchText = document.querySelector(".search-text");



// Fill the chart from zip code
searchButton.onclick = function (event) {
  console.log("search")
  searchContainer.style.display = "flex";
};

infoButton.onclick = function () {
  info.style.display = "block";
  overlay.style.display = "block"; 
};

window.onclick = function (event) {
  if (event.target == overlay) {
    info.style.display = "none";
    overlay.style.display = "none"; 
  }
};


document.addEventListener("DOMContentLoaded", () => {
  const input = document.querySelector(".modal-input");
  const suggestionsContainer = document.querySelector(
    ".autocomplete-suggestions"
  );

  async function filterSuggestions(query) {
    const cityMap = (await getCityData()).cityMap;
    const suggestions = [];
    const queryLower = query.toLowerCase();
    const uniqueNames = new Set();
  
    for (const [zip, name] of cityMap.entries()) {
      if (
        name.toLowerCase().includes(queryLower) ||
        zip.toLowerCase().includes(queryLower)
      ) {
        if (!uniqueNames.has(name.toLowerCase())) {
          uniqueNames.add(name.toLowerCase());
          suggestions.push(`${name}`);
        }
      }
    }
    return suggestions;
  }
  
});

// Function to get zip code by city name
async function getZipByCityName(input) {
  try {
    const response = (await getCityData()).uniqueCityZipList;
    console.log(response)
    if (!response) {
      throw new Error(`An error occurred`);
    }
    console.log(input)
    const result = response.find(
      (i) => i.city === input
    );
    return result
      ? { zip: result.zip, name: result.city }
      : { name: input, zip: input };
  } catch (error) {
    console.error("Error fetching the city data:", error);
  }
}

async function getWeatherData(city) {
  try {
    const response = await fetch(base_url(city));
    console.log(city)
    //const response = await fetch('Berlin.json');
    if (!response.ok) {
      throw new Error(`An error occurred: ${response.statusText}`);
    }
    const data = await response.json();
    const element = document.querySelector("#tempChart");
    if (!element) {
      throw new Error("Chart element not found");
    }

    let myTempChart = tempChart({
      element: element,
      data,
    });

    if (!myTempChart || typeof myTempChart.remove !== "function") {
      throw new Error(
        "tempChart did not return a valid chart instance with a remove method"
      );
    }

    // Make a copy of the data and modify it
    const newData = JSON.parse(JSON.stringify(data));
    const lastDataPoint = newData[newData.length - 1];
    if (lastDataPoint) {
      lastDataPoint.value += 10;
    }

    // Remove old chart
    const oldChart = document.getElementsByClassName("main-svg")[0];
    if (oldChart) oldChart.remove();

    // Recreate chart element
    const newElement = document.createElement("div");
    newElement.id = "tempChart";
    element.parentNode.replaceChild(newElement, element);

    // Create new chart with modified data
    myTempChart = tempChart({
      element: newElement,
      data: newData,
    });

    if (!myTempChart || typeof myTempChart.remove !== "function") {
      throw new Error(
        "tempChart did not return a valid chart instance with a remove method"
      );
    }
  } catch (error) {
    console.error("Error fetching the weather data:", error);
  }
}

// Initial fetch for default city
(async () => {
  try {
    // Ensure zip and base_url are defined
    if (typeof zip === "undefined" || typeof base_url !== "function") {
      throw new Error("zip or base_url is not defined");
    }

    // Fetch the data using zip
    const response = await fetch(base_url(zip));
    //const response = await fetch('Berlin.json');
    if (!response.ok) {
      throw new Error(`An error occurred: ${response.statusText}`);
    }

    // Parse the response data
    const data = await response.json();

    console.log(data)
    // Ensure the tempChart function and the element exist
    const element = document.querySelector("#tempChart");
    if (!element) {
      throw new Error("Chart element not found");
    }

    // Create the chart with the fetched data
    let myTempChart = tempChart({
      element: element,
      data,
    });

    console.log("Chart created successfully");
  } catch (error) {
    console.error("Error fetching the initial weather data:", error);
  }
})();

textSearch.onclick = function() {

  
  document.getElementsByClassName("search-page-container")[0].style.display = "none"
}

