
let plzData;
let currentFocus = -1;
let isError = false;

window.addEventListener("DOMContentLoaded", async () => {
    try {
        const responsePlz = await fetch("./plz.json");
        plzData = await responsePlz.json();
        setupSearchForm();
    } catch (error) {
        console.error("Error loading postal code data:", error);
    }
});

const setupSearchForm = () => {
    const form = document.getElementById("city-search-form");
    const closeBtn = document.querySelector(".close");
    const cancelBtn = document.querySelector(".cancel-btn");
    const inputField = document.getElementById("city-search-input");
    const suggestionsDiv = document.getElementById("suggestions");

    form.addEventListener("submit", submitForm);
    closeBtn.addEventListener("click", clearInput);
    cancelBtn.addEventListener("click", handleCancel);
    inputField.addEventListener("input", handleInput);

    document.addEventListener("click", (event) => {
        if (!suggestionsDiv.contains(event.target)) {
            suggestionsDiv.innerHTML = "";
            const inputValue = inputField.value.trim().toLowerCase();
            const matchedItem = plzData.find(item => item.Name.toLowerCase() === inputValue);
            if (matchedItem) {
                inputField.value = matchedItem.Name;
            }
        }
    });
};

const submitForm = async (event) => {
    event.preventDefault();

    const city = document.querySelector("#city-search-input").value;
    const zipData = await getZipByCityName(city);
    const zip = zipData ? zipData.zip : city;

    try {
        const response = await fetch(createWeatherApiUrl(zip));
        if (!response.ok) throw new Error(`Failed to fetch weather data: ${response.status}`);

        const data = await response.json();
        await updateTempChart(data);
    } catch (error) {
        console.error("Error processing form submission:", error);
    }
};

const createWeatherApiUrl = (zipcode) => {
    return `https://api.bild.de/historicalweatherdata/get_weatherdata_json_object?path=weatherdata/100y&file=plz_${zipcode}`;
};

const getCityData = async () => {
    try {
        const response = await fetch("https://api.bild.de/historicalweatherdata/get_weatherdata_json_object?path=weatherdata&file=PLZ");
        const data = await response.json();

        const uniqueCityZipList = [...new Set(data.map(i => i.Name))].map(city => {
            return data.find(i => i.Name === city);
        }).map(i => ({ zip: i.Postleitzahl, city: i.Name }));

        return { uniqueCityZipList };
    } catch (error) {
        console.error("Error fetching city data:", error);
        return { uniqueCityZipList: [] };
    }
};

const getZipByCityName = async (input) => {
    const { uniqueCityZipList } = await getCityData();
    const result = uniqueCityZipList.find(i => i.city === input);
    return result ? { zip: result.zip, name: result.city } : { name: input, zip: input };
};

const updateTempChart = async (data) => {
    const element = document.querySelector("#tempChart");
    if (!element) throw new Error("Chart element not found");

    let myTempChart = tempChart({ element, data });

    if (!myTempChart || typeof myTempChart.remove !== "function") {
        throw new Error("Invalid chart instance");
    }

    // Modify the last data point
    const newData = JSON.parse(JSON.stringify(data));
    const lastDataPoint = newData[newData.length - 1];
    if (lastDataPoint) {
        lastDataPoint.value += 10; // Example modification
    }

    // Remove old chart and create a new one
    const oldChart = document.getElementsByClassName("main-svg")[0];
    if (oldChart) oldChart.remove();

    const newElement = document.createElement("div");
    newElement.id = "tempChart";
    element.parentNode.replaceChild(newElement, element);

    myTempChart = tempChart({ element: newElement, data: newData });
    if (!myTempChart || typeof myTempChart.remove !== "function") {
        throw new Error("Invalid chart instance");
    }
};

const handleInput = (event) => {
    const inputValue = event.target.value.trim();
    const suggestions = inputValue ? getSuggestions(inputValue) : [];
    displaySuggestions(suggestions);
};

const getSuggestions = (inputValue) => {
    return /^\d+$/.test(inputValue)
        ? plzData.filter(item => item.Postleitzahl.startsWith(inputValue))
        : plzData.filter(item => item.Name.toLowerCase().startsWith(inputValue.toLowerCase()));
};

const displaySuggestions = (suggestions) => {
    const suggestionsDiv = document.getElementById("suggestions");
    const warningText = document.querySelector(".input-warning");
    const searchBtn = document.querySelector(".search-btn");
    suggestionsDiv.innerHTML = "";

    if (suggestions.length > 0) {
        warningText.style.display = "none";
        searchBtn.disabled = false;

        const ul = document.createElement("ul");
        suggestions.forEach(suggestion => {
            const li = createSuggestionElement(suggestion);
            ul.appendChild(li);
        });
        suggestionsDiv.appendChild(ul);
        document.addEventListener("keydown", handleKeyDown);
    } else {
        warningText.style.display = inputValue.length === 0 ? "none" : "block";
        searchBtn.disabled = inputValue.length > 0;
    }
};

const createSuggestionElement = (suggestion) => {
    const li = document.createElement("li");
    const container = document.createElement("div");
    const img = document.createElement("img");
    const p = document.createElement("p");

    container.classList.add("suggestion-container");
    img.src = "./assets/icons/magnifying-gray.svg";
    img.classList.add("suggestion-icon");
    p.classList.add("suggestion-element");
    p.textContent = suggestion.Name;

    container.appendChild(img);
    container.appendChild(p);
    li.appendChild(container);
    container.setAttribute("tabindex", "-1");

    container.addEventListener("click", () => {
        document.getElementById("city-search-input").value = suggestion.Name;
        document.getElementById("suggestions").innerHTML = "";
    });

    return li;
};

const handleKeyDown = (event) => {
    const suggestionContainers = document.querySelectorAll(".suggestion-container");
    if (suggestionContainers.length === 0) return;

    switch (event.key) {
        case "ArrowDown":
            currentFocus = (currentFocus + 1) % suggestionContainers.length;
            break;
        case "ArrowUp":
            currentFocus = (currentFocus - 1 + suggestionContainers.length) % suggestionContainers.length;
            break;
        case "Enter":
            if (currentFocus > -1) {
                suggestionContainers[currentFocus].click();
                document.getElementById("suggestions").innerHTML = "";
            }
            break;
    }
    setActive(suggestionContainers);
};

const setActive = (suggestionContainers) => {
    suggestionContainers.forEach((container, index) => {
        container.classList.toggle("active", index === currentFocus);
        if (index === currentFocus) {
            container.focus();
        }
    });
};

const clearInput = (event) => {
    const inputField = event.target.previousElementSibling;
    inputField.value = "";
};

const handleCancel = () => {
    isError = false;
    document.querySelector(".search-page-container").style.display = "none";
};


