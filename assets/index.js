//Todays date
const date = new Date();
const [month, day, year] = [date.getMonth() + 1, date.getDate(), date.getFullYear()];

//Future dates
let d1 = new Date();
d1.setDate(d1.getDate()+1);
const [month1, day1, year1] = [d1.getMonth() + 1, d1.getDate(), d1.getFullYear()];

let d2 = new Date();
d2.setDate(d2.getDate()+2);
const [month2, day2, year2] = [d2.getMonth() + 1, d2.getDate(), d2.getFullYear()];

let d3 = new Date();
d3.setDate(d3.getDate()+3);
const [month3, day3, year3] = [d3.getMonth() + 1, d3.getDate(), d3.getFullYear()];

let d4 = new Date();
d4.setDate(d4.getDate()+4);
const [month4, day4, year4] = [d4.getMonth() + 1, d4.getDate(), d4.getFullYear()];

let d5 = new Date();
d5.setDate(d5.getDate()+5);
const [month5, day5, year5] = [d5.getMonth() + 1, d5.getDate(), d5.getFullYear()];

//Fetch weather data from the server
let weather = {
    fetchWeather: function (city) {
    fetch(
    "/weather?city=" + city
    )
    .then((response) => {
        if (!response.ok) {
            alert("No weather found.");
            throw new Error("No weather found.");
        }
            return response.json();
        })
        .then((data) => this.displayWeather(data));
    },

    fetchWeatherByCoords: function (lat, lon) {
    fetch(
    `/weather?lat=${lat}&lon=${lon}`
    )
    .then((response) => {
        if (!response.ok) {
            alert("No weather found.");
            throw new Error("No weather found.");
        }
            return response.json();
        })
        .then((data) => this.displayWeather(data));
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

// 5 days weather card 1
        document.querySelector(".date2").innerText = month1 + "/" + day1 + "/" + year1;  
        document.querySelector(".icon2").src = "http://openweathermap.org/img/wn/" + icon + ".png";
        document.querySelector(".description2").innerText = description;
        document.querySelector(".temp2").innerText = temp + "°C";
        document.querySelector(".wind2").innerText = "Wind speed: " + speed + " km/h";
        document.querySelector(".humidity2").innerText = "Humidity: " + humidity + "%";

// 5 days weather card 2
      document.querySelector(".date3").innerText = month2 + "/" + day2 + "/" + year2;  
      document.querySelector(".icon3").src = "http://openweathermap.org/img/wn/" + icon + ".png";
      document.querySelector(".description3").innerText = description;
      document.querySelector(".temp3").innerText = temp + "°C";
      document.querySelector(".wind3").innerText = "Wind speed: " + speed + " km/h";
      document.querySelector(".humidity3").innerText = "Humidity: " + humidity + "%";

// 5 days weather card 3
      document.querySelector(".date4").innerText = month3 + "/" + day3 + "/" + year3;  
      document.querySelector(".icon4").src = "http://openweathermap.org/img/wn/" + icon + ".png";
      document.querySelector(".description4").innerText = description;
      document.querySelector(".temp4").innerText = temp + "°C";
      document.querySelector(".wind4").innerText = "Wind speed: " + speed + " km/h";
      document.querySelector(".humidity4").innerText = "Humidity: " + humidity + "%";

// 5 days weather card 4
      document.querySelector(".date5").innerText = month4 + "/" + day4 + "/" + year4;  
      document.querySelector(".icon5").src = "http://openweathermap.org/img/wn/" + icon + ".png";
      document.querySelector(".description5").innerText = description;
      document.querySelector(".temp5").innerText = temp + "°C";
      document.querySelector(".wind5").innerText = "Wind speed: " + speed + " km/h";
      document.querySelector(".humidity5").innerText = "Humidity: " + humidity + "%";

// 5 days weather card 5
      document.querySelector(".date6").innerText = month5 + "/" + day5 + "/" + year5;  
      document.querySelector(".icon6").src = "http://openweathermap.org/img/wn/" + icon + ".png";
      document.querySelector(".description6").innerText = description;
      document.querySelector(".temp6").innerText = temp + "°C";
      document.querySelector(".wind6").innerText = "Wind speed: " + speed + " km/h";
      document.querySelector(".humidity6").innerText = "Humidity: " + humidity + "%";
      
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
