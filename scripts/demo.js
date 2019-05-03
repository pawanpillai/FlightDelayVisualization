async function makeMonthsPlot() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data = (await d3.json('data/months.json'))
        .map((it) => ({ name: monthNames[it.month - 1], value: it.count }));

    const svg = d3.select('#monthsPlot');

    new BarChart(data, svg).draw();
}

async function makeDatesPlot() {
    const data = (await d3.json('data/dates.json'))
        .map((it) =>
            ({ date: new Date(Date.parse(it.date) + (60 * 60 * 24 * 1000)), value: it.count })
        );

    const svg = d3.select('#datesPlot');

    new DatesLineChart(data, svg)
        .tooltipLines([d => dateWithWeekday(d.date), d => `${d.value} flights`])
        .draw();
}

async function makeAirlinesDelaysPlot() {

    const data = (await d3.json('data/airlines_delays.json'))
        .map(it => ({ name: it.airline_name, value: it.delay_rate * 100, size: it.flights_count }));

    const svg = d3.select('#airlinesDelaysPlot');

    const width = Number(svg.attr('width'));
    const height = Number(svg.attr('height'));
    const margin = ({ top: 20, right: 0, bottom: 200, left: 40 });

    const x = d3.scaleBand()
        .domain(data.map(d => d.name))
        .range([margin.left, width - margin.right])
        .padding(0.1);

    const y = d3.scaleLinear()
        .domain([0, d3.max(data, d => d.value)]).nice()
        .range([height - margin.bottom, margin.top]);

    const sizeScaler = d3.scaleLinear()
        .domain([d3.min(data, it => it.size), d3.max(data, it => it.size)])
        .range([8, 20]);

    const xAxis = g => g
        //.attr('transform', `translate(0,${height - margin.bottom})`)
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(-height, 0, 0));

    const yAxis = g => g
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d => d.toFixed(1) + '%').tickSize(-width, 0, 0))
        .call(g => g.select(".domain").remove());


    // Define the div for the tooltip
    let tooltilDiv = d3.select("body").append("div")
        .attr("class", "tooltip")
        .style("opacity", 0);

    svg.append('g')
        .selectAll('circle')
        .data(data).enter().append('circle')
        //.style('fill', d => itemColor(d.name))
        .style('fill', d => blueColor)
        .attr('cx', d => x(d.name) + x.bandwidth() / 2)
        .attr('cy', d => y(d.value))
        .attr('r', d => sizeScaler(d.size))
        .on("mouseover", function (d) {
            tooltilDiv.transition()
                .duration(200)
                .style("opacity", .9);
            tooltilDiv.html("Total Flights: " + d.size)
                .style("left", (d3.event.pageX) + "px")
                .style("top", (d3.event.pageY - 28) + "px");
        })
        .on("mouseout", function (d) {
            tooltilDiv.transition()
                .duration(500)
                .style("opacity", 0);
        });


    svg.append('g').call(xAxis)
        .selectAll("text")
        .style("text-anchor", "end")
        .attr("dx", "-.8em")
        .attr("dy", ".15em")
        .attr("class", "axis-large-font")
        .attr("transform", function (d) { return "rotate(-90)" });

    svg.append('g').call(yAxis).attr("class", "axis");
}


async function makeCancellationPlots() {
    const names = {
        'A': 'Airline',
        'B': 'Weather',
        'C': 'NAS',
        'D': 'Security'
    };

    const data = (await d3.json('data/cancellations.json'));

    const states = data.states.map((it) => ({ name: it.name, value: it.count }));
    const reasons = data.cancellation_reasons.map((it) => ({ name: names[it.name], value: it.count }));

    new PieChart(states, d3.select('#cancellationsPlot')).colors(d3.schemeAccent).draw();
    new PieChart(reasons, d3.select('#cancellationReasonPlot')).colors(d3.schemeSpectral[6]).draw();
}


async function makeDelaysMap() {
    const request1 = d3.json('data/airports.json');
    const request2 = d3.json('data/airports_delays.json');
    const request3 = d3.json('data/airports_array.json');

    const airports = await request1;
    const delays = await request2;
    const airportsArray = await request3;

    const map = L.map('delaysMap').setView([37.8, -96.9], 4);   //([Latitude, Longitude], Zoom level)

    // populate airport dropdown
    d3.select("#ddlAirports")
        .selectAll("option")
        .data(airportsArray)
        .enter()
        .append("option")
        .attr("value", function (option) { return option.iata_code; })
        .text(function (option) { return option.airport; });


    L.tileLayer('https://api.tiles.mapbox.com/v4/{id}/{z}/{x}/{y}.png?access_token={accessToken}', {
        attribution: 'Map data &copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors, <a href="https://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="https://www.mapbox.com/">Mapbox</a>',
        maxZoom: 10,
        id: 'mapbox.streets',
        accessToken: 'sk.eyJ1IjoicGF3YW5waWxsYWkiLCJhIjoiY2p2Mmo0dXBnMjVkMjN5bzBwcHZvaWNrbCJ9.0iVMNLFuQTIpaNRWB2dvkg'
    }).addTo(map);

    const opacityScaler = d3.scaleLinear()
        .domain([d3.min(delays, it => it.delay_rate), d3.max(delays, it => it.delay_rate)])
        .range([0.05, 0.9]);

    // const sizeScaler = d3.scaleLinear()
    //     .domain([0, d3.max(delays, it => it.flights_count)])
    //     .range([20000, 90000]);

    const sizeScaler = d3.scaleLinear()
        .domain([0, d3.max(delays, it => it.delay_rate)])
        //.domain([d3.min(delays, it => it.delay_rate), d3.max(delays, it => it.delay_rate)])
        .range([0, 1]);

    delays.sort((a, b) => b.flights_count - a.flights_count); // smaller circles must be on top to be clickable

    // delays.forEach(it => {
    //     const airport = airports[it.origin_airport];

    //     const point = [Number(airport.latitude), Number(airport.longitude)];

    //     //console.log(it.delay_rate, sizeScaler(it.delay_rate) * 200000);

    //     const circle = L.circle(point, {
    //         fillColor: 'red',
    //         fillOpacity: opacityScaler(0.2),
    //         radius: sizeScaler(it.delay_rate) * 200000,
    //         stroke: false
    //     }).addTo(map);

    //     circle.bindPopup(`${airport.iata_code}
    //         <p>${airport.airport}, ${airport.city}, ${airport.state}</p>
    //         <p><b>${round(it.delay_rate * 100, 2)}%</b> delayed (<b>${Math.trunc(it.flights_count * it.delay_rate)}</b> of <b>${it.flights_count}</b> flights)`);
    // });

    let mapMarkers = [];

    const drawMarker = function (airport, selectedAirport) {

        airport.forEach(it => {
            if (selectedAirport == 'ALL') {
                const airport = airports[it.origin_airport];

                const point = [Number(airport.latitude), Number(airport.longitude)];

                //console.log(it.delay_rate, sizeScaler(it.delay_rate) * 200000);

                const circle = L.circle(point, {
                    fillColor: 'red',
                    fillOpacity: opacityScaler(0.2),
                    radius: sizeScaler(it.delay_rate) * 200000,
                    stroke: false
                }).addTo(map);

                mapMarkers.push(circle);

                circle.bindPopup(`${airport.iata_code}
                <p>${airport.airport}, ${airport.city}, ${airport.state}</p>
                <p><b>${round(it.delay_rate * 100, 2)}%</b> delayed (<b>${Math.trunc(it.flights_count * it.delay_rate)}</b> of <b>${it.flights_count}</b> flights)`);
            }
            else if (it.origin_airport == selectedAirport) {
                for (var i = 0; i < mapMarkers.length; i++) {
                    map.removeLayer(mapMarkers[i]);
                }

                const airport = airports[it.origin_airport];

                const point = [Number(airport.latitude), Number(airport.longitude)];

                const circle = L.circle(point, {
                    fillColor: 'red',
                    fillOpacity: opacityScaler(0.2),
                    radius: sizeScaler(it.delay_rate) * 200000,
                    stroke: false
                }).addTo(map);

                mapMarkers.push(circle);

                circle.bindPopup(`${airport.iata_code}
                    <p>${airport.airport}, ${airport.city}, ${airport.state}</p>
                    <p><b>${round(it.delay_rate * 100, 2)}%</b> delayed (<b>${Math.trunc(it.flights_count * it.delay_rate)}</b> of <b>${it.flights_count}</b> flights)`);

            }
        });


    }

    drawMarker(delays, "ALL");  //initial load - all airports

    $('#ddlAirports').on('changed.bs.select', function (e, clickedIndex, isSelected, previousValue) {
        let selectedAirport = $(this).find("option:selected").val();
        drawMarker(delays, selectedAirport);  //loading selected airport
    });

}

// function drawMarker(airport, airports){
//     airport.forEach(it => {
//         const airport = airports[it.origin_airport];

//         const point = [Number(airport.latitude), Number(airport.longitude)];

//         //console.log(it.delay_rate, sizeScaler(it.delay_rate) * 200000);

//         const circle = L.circle(point, {
//             fillColor: 'red',
//             fillOpacity: opacityScaler(0.2),
//             radius: sizeScaler(it.delay_rate) * 200000,
//             stroke: false
//         }).addTo(map);

//         circle.bindPopup(`${airport.iata_code}
//             <p>${airport.airport}, ${airport.city}, ${airport.state}</p>
//             <p><b>${round(it.delay_rate * 100, 2)}%</b> delayed (<b>${Math.trunc(it.flights_count * it.delay_rate)}</b> of <b>${it.flights_count}</b> flights)`);
//     });
// }

function init() {

    makeDatesPlot();

    makeMonthsPlot();

    makeAirlinesDelaysPlot();

    makeCancellationPlots();

    makeDelaysMap();
}

init(); //this starts the JS code.