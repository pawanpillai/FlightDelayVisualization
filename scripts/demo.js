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

async function makeMonthsPlot() {
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

    const data = (await d3.json('data/months.json'))
        .map((it) => ({ name: monthNames[it.month - 1], value: it.count }));

    const svg = d3.select('#monthsPlot');

    new BarChart(data, svg).draw();
}


async function makeDelaysMap() {
    const request1 = d3.json('data/airports.json');
    const request2 = d3.json('data/airports_delays.json');

    const airports = await request1;
    const delays = await request2;
    const map = L.map('delaysMap').setView([37.8, -96.9], 4);   //([Latitude, Longitude], Zoom level)

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

    delays.forEach(it => {
        const airport = airports[it.origin_airport];

        const point = [Number(airport.latitude), Number(airport.longitude)];

        console.log(it.delay_rate, sizeScaler(it.delay_rate) * 200000);

        const circle = L.circle(point, {
            fillColor: 'red',
            //fillOpacity: opacityScaler(it.delay_rate),
            //radius: sizeScaler(it.flights_count),
            fillOpacity: opacityScaler(0.2),
            radius: sizeScaler(it.delay_rate) * 200000,
            stroke: false
        }).addTo(map);

        circle.bindPopup(`${airport.iata_code}
            <p>${airport.airport}, ${airport.city}, ${airport.state}</p>
            <p><b>${round(it.delay_rate * 100, 2)}%</b> delayed (<b>${Math.trunc(it.flights_count * it.delay_rate)}</b> of <b>${it.flights_count}</b> flights)`);
    });
}

async function makeAirlinesDelaysPlot() {
    const data = (await d3.json('data/airlines_delays.json'))
        .map(it => ({ name: it.airline, value: it.delay_rate * 100, size: it.flights_count }));

    const svg = d3.select('#airlinesDelaysPlot');

    const width = Number(svg.attr('width'));
    const height = Number(svg.attr('height'));
    const margin = ({ top: 20, right: 0, bottom: 30, left: 40 });

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

    const itemColor = d3.scaleOrdinal(["#1f77b4", "#ff7f0e", "#2ca02c", "#d62728", "#9467bd", "#8c564b", "#e377c2", "#7f7f7f", "#bcbd22", "#17becf",
        "#d95f02", "#e7298a", "#7570b3", "#1b9e77"]);

    const xAxis = g => g
        .attr('transform', `translate(0,${height - margin.bottom})`)
        .call(d3.axisBottom(x).tickSize(-height, 0, 0));

    const yAxis = g => g
        .attr('transform', `translate(${margin.left},0)`)
        .call(d3.axisLeft(y).tickFormat(d => d.toFixed(1) + '%').tickSize(-width, 0, 0))
        .call(g => g.select(".domain").remove());

    svg.append('g')
        .selectAll('circle')
        .data(data).enter().append('circle')
        .style('fill', d => itemColor(d.name))
        .attr('cx', d => x(d.name) + x.bandwidth() / 2)
        .attr('cy', d => y(d.value))
        .attr('r', d => sizeScaler(d.size));

    svg.append('g').call(xAxis);
    svg.append('g').call(yAxis);
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
    new PieChart(reasons, d3.select('#cancellationReasonPlot')).colors(d3.schemeAccent).draw();
}


function init() {

    makeDatesPlot();

    makeMonthsPlot();

    makeDelaysMap();

    makeAirlinesDelaysPlot();

    makeCancellationPlots();
}

init(); //this starts the JS code.