/**
 * @fileoverview This script provides functions to fetch weather data from Open-Meteo API based on the city name.
 */

// Constants
/** @const {string} Base URL for the geocoding API */
const GEOCODING_BASE_URL = "https://geocoding-api.open-meteo.com/v1/search";

/** @const {string} Base URL for the weather API */
const WEATHER_BASE_URL = "https://api.open-meteo.com/v1/gem";

/** @const {string} Parameters to fetch current weather details */
const CURRENT_PARAMETERS = "temperature_2m,relative_humidity_2m,is_day,weather_code,wind_speed_10m";

/** @const {string} Unit for wind speed */
const WIND_SPEED_UNIT = "ms";

/**
 * Fetches location data by city name.
 * @param {string} cityName - The name of the city to search for.
 */
async function fetchLocationByCity(cityName) {
    if (cityName.length > 1) {
        const fullUrl = `${GEOCODING_BASE_URL}?name=${encodeURIComponent(cityName)}&count=10`;
        let response = await fetch(fullUrl);
        if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

        return await response.json();
    }
}

/**
 * Fetches weather data for a specific location.
 * @param {string} city - The city name.
 * @param {string} state - The state or region name.
 * @param {number} latitude - The latitude of the location.
 * @param {number} longitude - The longitude of the location.
 */
async function fetchWeatherForLocation(city, state, latitude, longitude) {
    try {
        const fullUrl = `${WEATHER_BASE_URL}?latitude=${latitude}&longitude=${longitude}&current=${CURRENT_PARAMETERS}&wind_speed_unit=${WIND_SPEED_UNIT}&timezone=auto`;
        let response = await fetch(fullUrl);
        if (!response.ok) {
            console.error(`HTTP error! status: ${response.status}`);
            alert("Error fetching weather data!");
            return; // Exit the function or handle the error appropriately
        }
        let weatherData = await response.json();
        let current = weatherData.current;

        updateWeatherDisplay(
            city,
            state,
            current.temperature_2m,
            (current.temperature_2m * 9) / 5 + 32,
            !!parseInt(current.is_day), // boolean
            current.weather_code,
            current.relative_humidity_2m,
            current.wind_speed_10m
        );
    } catch (error) {
        console.error("Error fetching data:", error);
        alert("Error fetching weather data!");
    }
}

/**
 * Updates the weather information display on the webpage.
 * @param {string} city - The city name.
 * @param {string} state - The state or region name.
 * @param {number} tempInCelsius - The temperature in Celsius.
 * @param {number} tempInFahrenheit - The temperature in Fahrenheit.
 * @param {boolean} isDay - Indicates if it's currently day time.
 * @param {number} weather_code - The weather condition code.
 * @param {number} humidity - The humidity percentage.
 * @param {number} wind - The wind speed in meters per second.
 */
function updateWeatherDisplay(city, state, tempInCelsius, tempInFahrenheit, isDay, weather_code, humidity, wind) {
    let condition = getWmoCode(isDay, weather_code);
    document.getElementById("location").textContent = `${city}, ${state.toUpperCase()}`;
    document.getElementById("tempInCelsius").textContent = `${tempInCelsius.toFixed(1)}`;
    document.getElementById("tempInFahrenheit").textContent = `${tempInFahrenheit.toFixed(1)}`;
    document.getElementById("condition").textContent = `${condition.description}`;
    document.getElementById("conditionImg").src = `${condition.image}`;
    document.getElementById("conditionImg").removeAttribute("hidden");
    document.getElementById("humidity").textContent = `${humidity}`;
    document.getElementById("wind").textContent = `${wind}`;
}

// Event Listeners
document.addEventListener("DOMContentLoaded", function () {
    const searchInput = document.getElementById("dropdownSearch");
    const dropdownList = document.getElementById("dropdownList");
    searchInput.focus();
    const locations = new Map();

    searchInput.addEventListener("input", async function () {
        const cityName = this.value;
        try {
            let data = await fetchLocationByCity(cityName);
            dropdownList.innerHTML = ""; // Clears current list
            dropdownList.style.display = "block"; // Shows the list

            if (data && data.results && data.results.length > 0) {
                data.results.forEach((item) => {
                    const { id, name, admin1, latitude, longitude } = item;
                    const div = document.createElement("div");
                    div.id = id;
                    div.style.fontSize = "small";
                    div.textContent = `${name}, ${admin1}`;
                    dropdownList.appendChild(div);
                    locations.set(`${id}`, { city: name, state: admin1, latitude: latitude, longitude: longitude });
                });
            } else {
                dropdownList.style.display = "none";
            }

            let currentIndex = -1;
            searchInput.addEventListener("keydown", function (event) {
                let itemCount = dropdownList.children.length;

                if (event.key === "ArrowDown") {
                    if (currentIndex < itemCount - 1) {
                        currentIndex++;
                        highlightDropdownItem(currentIndex);
                    }
                } else if (event.key === "ArrowUp") {
                    if (currentIndex > 0) {
                        currentIndex--;
                        highlightDropdownItem(currentIndex);
                    }
                } else if (event.key === "Enter") {
                    if (currentIndex !== -1) {
                        dropdownList.children[currentIndex].click();
                    }
                }
            });

            function highlightDropdownItem(index) {
                Array.from(dropdownList.children).forEach((div, i) => {
                    if (i === index) {
                        div.classList.add("highlighted");
                        div.scrollIntoView({ block: "nearest" }); // Ensure the item is visible in the dropdown
                    } else {
                        div.classList.remove("highlighted");
                    }
                });
            }

            dropdownList.addEventListener("click", async function (event) {
                let location = locations.get(event.target.id);
                await fetchWeatherForLocation(location.city, location.state, location.latitude, location.longitude);
                searchInput.value = "";
                locations.clear();
                searchInput.focus();
            });
        } catch (error) {
            console.error("Error fetching location data:", error);
        }
    });

    document.addEventListener("click", function (event) {
        if (event.target !== searchInput) {
            dropdownList.style.display = "none";
        }
    });
});

/**
 * Returns the weather condition and image based on the provided code and day/night time.
 * @param {boolean} isDay - Indicates if it's currently day time.
 * @param {number} condition - The weather condition code.
 * @return {Object} An object containing the description and image URL of the weather condition.
 */
function getWmoCode(isDay, condition) {
    const data = {
        0: {
            day: {
                description: "Sunny",
                image: "https://openweathermap.org/img/wn/01d@2x.png",
            },
            night: {
                description: "Clear",
                image: "https://openweathermap.org/img/wn/01n@2x.png",
            },
        },
        1: {
            day: {
                description: "Mainly Sunny",
                image: "https://openweathermap.org/img/wn/01d@2x.png",
            },
            night: {
                description: "Mainly Clear",
                image: "https://openweathermap.org/img/wn/01n@2x.png",
            },
        },
        2: {
            day: {
                description: "Partly Cloudy",
                image: "https://openweathermap.org/img/wn/02d@2x.png",
            },
            night: {
                description: "Partly Cloudy",
                image: "https://openweathermap.org/img/wn/02n@2x.png",
            },
        },
        3: {
            day: {
                description: "Cloudy",
                image: "https://openweathermap.org/img/wn/03d@2x.png",
            },
            night: {
                description: "Cloudy",
                image: "https://openweathermap.org/img/wn/03n@2x.png",
            },
        },
        45: {
            day: {
                description: "Foggy",
                image: "https://openweathermap.org/img/wn/50d@2x.png",
            },
            night: {
                description: "Foggy",
                image: "https://openweathermap.org/img/wn/50n@2x.png",
            },
        },
        48: {
            day: {
                description: "Rime Fog",
                image: "https://openweathermap.org/img/wn/50d@2x.png",
            },
            night: {
                description: "Rime Fog",
                image: "https://openweathermap.org/img/wn/50n@2x.png",
            },
        },
        51: {
            day: {
                description: "Light Drizzle",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Light Drizzle",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        53: {
            day: {
                description: "Drizzle",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Drizzle",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        55: {
            day: {
                description: "Heavy Drizzle",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Heavy Drizzle",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        56: {
            day: {
                description: "Light Freezing Drizzle",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Light Freezing Drizzle",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        57: {
            day: {
                description: "Freezing Drizzle",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Freezing Drizzle",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        61: {
            day: {
                description: "Light Rain",
                image: "https://openweathermap.org/img/wn/10d@2x.png",
            },
            night: {
                description: "Light Rain",
                image: "https://openweathermap.org/img/wn/10n@2x.png",
            },
        },
        63: {
            day: {
                description: "Rain",
                image: "https://openweathermap.org/img/wn/10d@2x.png",
            },
            night: {
                description: "Rain",
                image: "https://openweathermap.org/img/wn/10n@2x.png",
            },
        },
        65: {
            day: {
                description: "Heavy Rain",
                image: "https://openweathermap.org/img/wn/10d@2x.png",
            },
            night: {
                description: "Heavy Rain",
                image: "https://openweathermap.org/img/wn/10n@2x.png",
            },
        },
        66: {
            day: {
                description: "Light Freezing Rain",
                image: "https://openweathermap.org/img/wn/10d@2x.png",
            },
            night: {
                description: "Light Freezing Rain",
                image: "https://openweathermap.org/img/wn/10n@2x.png",
            },
        },
        67: {
            day: {
                description: "Freezing Rain",
                image: "https://openweathermap.org/img/wn/10d@2x.png",
            },
            night: {
                description: "Freezing Rain",
                image: "https://openweathermap.org/img/wn/10n@2x.png",
            },
        },
        71: {
            day: {
                description: "Light Snow",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Light Snow",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        73: {
            day: {
                description: "Snow",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Snow",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        75: {
            day: {
                description: "Heavy Snow",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Heavy Snow",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        77: {
            day: {
                description: "Snow Grains",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Snow Grains",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        80: {
            day: {
                description: "Light Showers",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Light Showers",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        81: {
            day: {
                description: "Showers",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Showers",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        82: {
            day: {
                description: "Heavy Showers",
                image: "https://openweathermap.org/img/wn/09d@2x.png",
            },
            night: {
                description: "Heavy Showers",
                image: "https://openweathermap.org/img/wn/09n@2x.png",
            },
        },
        85: {
            day: {
                description: "Light Snow Showers",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Light Snow Showers",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        86: {
            day: {
                description: "Snow Showers",
                image: "https://openweathermap.org/img/wn/13d@2x.png",
            },
            night: {
                description: "Snow Showers",
                image: "https://openweathermap.org/img/wn/13n@2x.png",
            },
        },
        95: {
            day: {
                description: "Thunderstorm",
                image: "https://openweathermap.org/img/wn/11d@2x.png",
            },
            night: {
                description: "Thunderstorm",
                image: "https://openweathermap.org/img/wn/11n@2x.png",
            },
        },
        96: {
            day: {
                description: "Light Thunderstorms With Hail",
                image: "https://openweathermap.org/img/wn/11d@2x.png",
            },
            night: {
                description: "Light Thunderstorms With Hail",
                image: "https://openweathermap.org/img/wn/11n@2x.png",
            },
        },
        99: {
            day: {
                description: "Thunderstorm With Hail",
                image: "https://openweathermap.org/img/wn/11d@2x.png",
            },
            night: {
                description: "Thunderstorm With Hail",
                image: "https://openweathermap.org/img/wn/11n@2x.png",
            },
        },
    };

    return data.hasOwnProperty(condition) ? data[condition][isDay ? "day" : "night"] : { description: "Not available" };
}
