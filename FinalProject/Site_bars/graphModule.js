var AgIGraph = (function () {

    var myData, mySeries, myFrom, myUntil, brush, zoom, area, area2, focus,context;

    // A private counter variable
    var formatDate = d3.timeFormat("%Y-%m-%dT%H:%M:%SZ");
    var parseDate = d3.utcParse("%Y-%m-%dT%H:%M:%SZ");

    var svg = d3.select("#telemetryGraph svg"),
        margin = {top: 20, right: 20, bottom: 110, left: 40},
        margin2 = {top: 430, right: 20, bottom: 30, left: 40},
        width = +svg.attr("width") - margin.left - margin.right,
        height = +svg.attr("height") - margin.top - margin.bottom,
        height2 = +svg.attr("height") - margin2.top - margin2.bottom;


    var x = d3.scaleTime().range([0, width]),
        x2 = d3.scaleTime().range([0, width]),
        y = d3.scaleLinear().range([height, 0]),
        y2 = d3.scaleLinear().range([height2, 0]);

    var xAxis = d3.axisBottom(x),
        xAxis2 = d3.axisBottom(x2),
        yAxis = d3.axisLeft(y);

    function updateYaxis() {
        if (myData.length > 0) {
            fullRange = d3.extent(myData, function (d) {
                return +d[1] || 0;
            });
            if (fullRange[0] > 0)
                fullRange[0] = 0;
            y.domain(fullRange);

            focus.select("g.axis--y").data(['g.axis--y'])
                .enter().append('g').attr('class', 'axis axis--y');
            focus.select("g.axis--y").call(yAxis);
        }
    }

    function updateFocus(point, from, until) {
        AgIData.getData(point, from, until, function(error, json) {
            if (error) throw error;
            if (json.results[0].series) {
                myData = json.results[0].series[0].values;
                focus.select("path")
                    .datum(myData);
            }
        });
    }

    function brushed() {
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "zoom") return; // ignore brush-by-zoom
        var s = d3.event.selection || x2.range();
        x.domain(s.map(x2.invert, x2));
        updateFocus(mySeries, x.domain()[0], x.domain()[1]);
        focus.select(".zoomArea").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
            .scale(width / (s[1] - s[0]))
            .translate(-s[0], 0));
    }

    function zoomed(){
        if (d3.event.sourceEvent && d3.event.sourceEvent.type === "brush") return; // ignore zoom-by-brush
        var t = d3.event.transform;
        x.domain(t.rescaleX(x2).domain());
        updateFocus(mySeries, x.domain()[0], x.domain()[1]);
        focus.select(".zoomArea").attr("d", area);
        focus.select(".axis--x").call(xAxis);
        context.select(".brush").call(brush.move, x.range().map(t.invertX, t));
    }

    function startClean() {

        svg.remove();
        d3.select("#telemetryGraph").append("svg").attr("width","960").attr("height","500");
        svg = d3.select("#telemetryGraph svg");
        brush = d3.brushX()
            .extent([[0, 0], [width, height2]])
            .on("brush end", brushed);

        zoom = d3.zoom()
            .scaleExtent([1, Infinity])
            .translateExtent([[0, 0], [width, height]])
            .extent([[0, 0], [width, height]])
            .on("zoom", zoomed);

        area = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return x(parseDate(d[0]));
            })
            .y0(height)
            .y1(function (d) {
                return y(+d[1]);
            });

        area2 = d3.area()
            .curve(d3.curveMonotoneX)
            .x(function (d) {
                return x2(parseDate(d[0]));
            })
            .y0(height2)
            .y1(function (d) {
                return y2(+d[1]);
            });

        svg.append("defs").append("clipPath")
            .attr("id", "clip")
            .append("rect")
            .attr("width", width)
            .attr("height", height);

        focus = svg.append("g")
            .attr("class", "focus")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        context = svg.append("g")
            .attr("class", "context")
            .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

        svg.append("rect")
            .attr("class", "zoom")
            .attr("width", width)
            .attr("height", height)
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")")
            .call(zoom);
    }

    function updateOverview(error, json) {
        if (error) throw error;
        if (json.results[0].series) {
            myData = json.results[0].series[0].values;
            x.domain(d3.extent(myData, function (d) {
                return parseDate(d[0]);
            }));
            y.domain([0, d3.max(myData, function (d) {
                return +d[1] || 0;
            })]);
            x2.domain(x.domain());
            y2.domain(y.domain());

            context.append("path")
                .datum(myData)
                .attr("class", "zoomArea")
                .attr("d", area2);

            context.append("g")
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height2 + ")")
                .call(xAxis2);

            context.append("g")
                .attr("class", "brush")
                .call(brush)
                .call(brush.move, x.range());
        }
    }

    function updateDetails(error, json) {
        if (error) throw error;

        if (json.results[0].series) {

            myData = json.results[0].series[0].values;
//            focus.select(".focus").remove();
            focus.append("path")
                .datum(myData)
                .attr("class", "zoomArea")
                .attr("d", area);

            focus.append("g")
                .attr("class", "axis axis--x")
                .attr("transform", "translate(0," + height + ")")
                .call(xAxis);

            updateYaxis();
            focus.append("g")
                .attr("class", "axis axis--y")
                .call(yAxis);

        }
    }

    return {
        init: function(series, from, until) {
            mySeries = series;
            myFrom = from;
            myUntil = until;
            startClean();
            AgIData.getData(series,from,until,updateOverview);
            AgIData.getData(series,from,until,updateDetails);
        }, //init

        updateInterval: function(from, until) {
            x.domain(from, until);
            if (mySeries !== NaN)
                AgIData.getData(mySeries,from,until,function(){
                focus.select(".zoomArea").attr("d", area);
                focus.select(".axis--x").call(xAxis);
//                svg.select(".zoom").call(zoom.transform, d3.zoomIdentity
//                    .scale(width / (s[1] - s[0]))
//                    .translate(-s[0], 0));
                    }
                );
        }, //updateInterval

        updateSeries: function(series) {
            mySeries=series;
            startClean();
            AgIData.getData(series,AgIData.parseDate('2016-08-01T00:00:00Z'),AgIData.parseDate('2017-03-01T00:00:00Z'),updateOverview);
            AgIData.getData(series,myFrom,myUntil,updateDetails);
        } //updateSeries
    };

})();

AgIData.init("https://198.11.193.105:8086/query?db=w251&q=","roy","Kaftor");
//AgIData.init("http://test1.gvirtsman.com:8086/query?db=w251&q=","roy","Kaftor");
AgIGraph.init('2 LMP',AgIData.parseDate('2016-08-01T00:00:00Z'),AgIData.parseDate('2017-04-01T00:00:00Z'));