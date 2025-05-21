//Todays date
const date = new Date();
const [month, day, year] = [date.getMonth() + 1, date.getDate(), date.getFullYear()];

// Future dates for the next five forecast cards
const futureDates = [];
for (let i = 1; i <= 5; i++) {
    const d = new Date();
    d.setDate(d.getDate() + i);
    futureDates.push([d.getMonth() + 1, d.getDate(), d.getFullYear()]);
}

//Fetch weather data from the server
let weather = {
    fetchWeather: function (city) {
        fetch("/weather?city=" + city)
            .then((response) => {
                if (!response.ok) {
                    alert("No weather found.");
                    throw new Error("No weather found.");
                }
                return response.json();
            })
            .then((data) => {
                this.displayWeather(data);
                this.fetchForecast(city);
            });
    },

    fetchWeatherByCoords: function (lat, lon) {
        fetch(`/weather?lat=${lat}&lon=${lon}`)
            .then((response) => {
                if (!response.ok) {
                    alert("No weather found.");
                    throw new Error("No weather found.");
                }
                return response.json();
            })
            .then((data) => {
                this.displayWeather(data);
                this.fetchForecastByCoords(lat, lon);
            });
    },

    fetchForecast: function (city) {
        fetch("/forecast?city=" + city)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("No forecast found.");
                }
                return response.json();
            })
            .then((data) => this.displayForecast(data))
            .catch(() => {});
    },

    fetchForecastByCoords: function (lat, lon) {
        fetch(`/forecast?lat=${lat}&lon=${lon}`)
            .then((response) => {
                if (!response.ok) {
                    throw new Error("No forecast found.");
                }
                return response.json();
            })
            .then((data) => this.displayForecast(data))
            .catch(() => {});
    },

//Data retrieved and displayed from the API and the html for today
    displayWeather: async function (data) {
        const { name } = data;
        const { icon } = data.weather[0];
        const { description } = data.weather[0];
        const { temp, humidity } = data.main;
        const { speed } = data.wind;
        document.querySelector(".city").innerText = "Weather in " + name;
        document.querySelector(".date1").innerText = month + "/" + day + "/" + year;
        document.querySelector(".icon").src = "http://openweathermap.org/img/wn/"+ icon +".png";
        document.querySelector(".description").innerText = description;
        document.querySelector(".temp").innerText = temp + "°C";
        document.querySelector(".humidity").innerText = "Humidity: " + humidity + "%";
        document.querySelector(".wind").innerText = "Wind speed: " + speed + " km/h";
        document.querySelector(".weather").classList.remove("loading");
        try {
            const condition = data.weather[0].main.toLowerCase();
            const bgRes = await fetch(`/api/bg?condition=${encodeURIComponent(condition)}`);
            if (bgRes.ok) {
                const bgData = await bgRes.json();
                if (bgData.url) {
                    document.body.style.backgroundImage = `url('${bgData.url}')`;
                    const attr = document.getElementById("attribution");
                    if (attr) attr.innerHTML = bgData.attribution;
                }
            } else {
                document.body.style.backgroundImage =
                    "url('https://source.unsplash.com/1600x900/?" + encodeURIComponent(name) + "')";
            }
        } catch (e) {
            document.body.style.backgroundImage =
                "url('https://source.unsplash.com/1600x900/?" + encodeURIComponent(name) + "')";
        }
    },

    displayForecast: function (data) {
        if (!data || !data.list) return;
        const daily = {};
        const today = new Date().toISOString().split("T")[0];
        for (const entry of data.list) {
            const [dateStr, time] = entry.dt_txt.split(" ");
            if (dateStr === today) continue;
            if (!daily[dateStr] || time === "12:00:00") {
                daily[dateStr] = entry;
            }
        }
        const dates = Object.keys(daily).sort().slice(0, 5);
        dates.forEach((d, idx) => {
            const forecast = daily[d];
            const [mDisp, dayDisp, yDisp] = futureDates[idx];
            const icon = forecast.weather[0].icon;
            const desc = forecast.weather[0].description;
            const temp = forecast.main.temp;
            const humidity = forecast.main.humidity;
            const speed = forecast.wind.speed;
            const i = idx + 2;
            document.querySelector(`.date${i}`).innerText = `${mDisp}/${dayDisp}/${yDisp}`;
            document.querySelector(`.icon${i}`).src = `http://openweathermap.org/img/wn/${icon}.png`;
            document.querySelector(`.description${i}`).innerText = desc;
            document.querySelector(`.temp${i}`).innerText = `${temp}°C`;
            document.querySelector(`.wind${i}`).innerText = `Wind speed: ${speed} km/h`;
            document.querySelector(`.humidity${i}`).innerText = `Humidity: ${humidity}%`;
        });
    },
    
search: function () {
    this.fetchWeather(document.querySelector(".search-bar").value);
},
};
      
document.querySelector(".search button").addEventListener("click", function () {
    weather.search();
});

document
    .querySelector(".search-bar")
    .addEventListener("keyup", function (event) {
        if (event.key == "Enter") {
            weather.search();
            }
});

if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
        (position) => {
            weather.fetchWeatherByCoords(position.coords.latitude, position.coords.longitude);
        },
        () => {
            weather.fetchWeather("Toronto");
        }
    );
} else {
    weather.fetchWeather("Toronto");
}
