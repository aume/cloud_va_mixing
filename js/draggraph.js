/**
 *  Creates a dragable, editable multiline graph with a legend and axis.
 *
 * @param config
 *
 */

function DragLineGraph(config) {

    // setup sizes. Change width and height values to change the size of the graph.
    var margin = {
            top: config.marginTop || 30,
            right: config.marginRight || 100,
            bottom: config.marginBottom || 30,
            left: config.marginLeft || 50
        },
        width = (config.width || 600) - margin.left - margin.right,
        height = (config.height || 500) - margin.top - margin.bottom,
        timescale = config.timescale || 60,

    // Scaling objects. Use x() to scale and x.invert() to get points from mouse data
        x = d3.scale.linear().range([0, width]).domain([0, timescale]),
        y = d3.scale.linear().range([height, 0]).domain([0, 1]),

    // For adding more elements on the fly
        graphSvg,
        mainSvg,
        rect,

    // Data lines.
        data = [[]],
        selectedDataIndex = 0,
        selectedLine = data[0],
        dragged = null,
        selected = null,

        legend = [],

    // The axies
        xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(5)
            .innerTickSize(-height),

        yAxis = d3.svg.axis()
            .scale(y)
            .orient("left")
            .ticks(5)
            .innerTickSize(-width),

    // The line for drawing data points
        valueline = d3.svg.line()
            .x(function (d) {
                return x(d[0]); //implements scaling
            })
            .y(function (d) {
                return y(d[1]);
            });

    function my(selection) {
        drawGraph(selection);
        drawLegend();
        redrawAllLines();
        redraw();
    }

    // Setters and getters.
    my.data = function (value) {
        var i;
        if (!arguments.length) return data;
        data = value;
        selectedDataIndex = (data.length > 0) ? 0 : null;
        for (i = 0; i < data.length; i++) {
            data[i] = data[i].sort(sortArray);
        }
        selectedLine = data[selectedDataIndex];

        return my;
    };

    // Changing timescale
    my.timescale = function (value) {
        if (!arguments.length) return;
        var oldtimeScale = timescale;
        timescale = value;

        // Change xScale and xAxis
        x.domain([0, timescale]);
        xAxis.scale(x);

        // Update all points
        for (var i = 0; i < data.length; i++) {
            for (var j = 1; j < data[i].length - 1; j++) {
                data[i][j][0] *= timescale / oldtimeScale;
            }
            // Set last to be exactly at the end
            data[i][data[i].length - 1][0] = timescale;
        }

        graphSvg.select("g.x.axis").remove();
        drawXAxis();
        redrawAllLines();
        redraw();
    };

    my.legend = function (value) {
        if (!arguments.length) return;
        legend = value;
        return my;
    };

    /**
     * Switches the line to either a specific index or the next one if no arguments are passed.
     * @param value
     */
    my.switchLine = function (value) {

        if (!arguments.length) { // Use the next line
            selectedDataIndex = (selectedDataIndex == data.length - 1) ? 0 : selectedDataIndex + 1;
        } else {
            if (value > data.length - 1 || value < 0) {
                console.error("Invalid index");
                return;
            }
            else {
                selectedDataIndex = value;
            }
        }
        // Switch selectedLine array
        selectedLine = data[selectedDataIndex];

        // Remove old circles
        graphSvg.selectAll("circle").transition()
            .duration(750)
            .ease("elastic")
            .attr("r", 1e-6)
            .remove();

        //change selected legend
        d3.selectAll(".legend .selected").classed("selected", false);
        d3.selectAll(".legend .line" + value).classed("selected", true);

        // Draw new circles
        redraw();

    };

    // Takes a string selection and draws the graph.
    function drawGraph(selection) {

        var i = 0;
        // Create the svg object
        mainSvg = d3.select(selection)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);


        graphSvg = mainSvg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        // Add the lines for each dataset.
        for (i = 0; i < data.length; i++) {
            graphSvg.append("path")
                .attr("id", "line" + i)
                .attr("class", "line");
        }

        // Add the Axies
        // Add the X axies.
        drawXAxis();

        // Add the Y Axis
        graphSvg.append("g")
            .attr("class", "y axis")
            .call(yAxis);

        graphSvg.append("text")
            .attr("transform", "rotate(-90)")
            .attr("y", 0 - margin.left)
            .attr("x", 0 - (height / 2))
            .attr("dy", "1em")
            .style("text-anchor", "middle")
            .text("Value");

        // Add the rectangle to capture mouse events
        graphSvg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("class", "border")
            .on("mousedown", mousedown);

        // add more mouse events
        d3.select(window)
            .on("mousemove", mousemove)
            .on("mouseup", mouseup)
            .on("keydown", keydown);

    }

    function drawLegend() {

        var legendSvg = mainSvg.append("g")
            .attr("class", "legend")
            .attr("transform", "translate(" + (margin.left + width + 10) + ", " + (margin.top + 10) + ")");

        legendSvg.selectAll("g")
            .data(legend)
            .enter()
            .append("g")
            .each(function (d, i) {
                var g = d3.select(this);
                g.classed("line" + i, true);
                g.append("rect")
                    .attr("y", i * 20)
                    .attr("width", 10)
                    .attr("height", 10)
                    .attr("class", "legend indicator line" + i)
                    .on("click", legendClick)
                    .attr('d', i);
                g.append("text")
                    .attr("x", 25)
                    .attr("y", i * 20 + 8)
                    .attr("width", 100)
                    .attr("height", 10)
                    .attr("class", "legend line" + i)
                    .attr('d', i)
                    .text(d)
                     .on("click", legendClick);
            });
        legendSvg.selectAll(".line0").classed("selected", true);
    }

    function legendClick(){
        console.log("legend click");
        var node = d3.select(this);

        // Already selected
        if(node.classed("selected")) return;

        // Get line index
        my.switchLine(parseInt(node.attr('d')));
    }

    function drawXAxis() {
        graphSvg.append("g")
            .attr("class", "x axis")
            .attr("transform", "translate(0," + height + ")") // translate to the bottom of the graph
            .call(xAxis);

        // Add label
        graphSvg.append("text")
            .attr("transform", "translate(" + (width / 2) + " ," + (height + margin.bottom) + ")")
            .text("Time (s)")
            .attr('text-anchor', 'middle')
        ;
    }

    // Click to add point functionality
    function mousedown() {
        
        var m = d3.mouse(graphSvg.node());
        var point = [x.invert(m[0]), y.invert(m[1])]; //Invert to get actual data point values.
        selectedLine.push(selected = dragged = point);
        redraw();
    }

    // Drag handler
    function mousemove() {
        if (!dragged) return;
        var m = d3.mouse(graphSvg.node());
        var index = data[selectedDataIndex].indexOf(dragged);
        // Switch from mouse coordinates to data points.

        // Only move first and last point vertically.
        if (index > 0 && index < selectedLine.length - 1)
            dragged[0] = x.invert(Math.max(0, Math.min(width, m[0])));
        dragged[1] = y.invert(Math.max(0, Math.min(height, m[1])));
        redraw();
    }

    function mouseup() {
        if (!dragged) return;
        mousemove();
        dragged = null;
    }

    function keydown() {
        if (!selected) return;
        switch (d3.event.keyCode) {
            case 8: // backspace
            case 46:
            { // delete
                var i = selectedLine.indexOf(selected);

                // Never delete first or last points
                if (i > 0 && i < selectedLine.length - 1) {
                    selectedLine.splice(i, 1);
                    selected = selectedLine.length ? selectedLine[i > 0 ? i - 1 : 0] : null;
                    redraw();
                    break;
                }
            }
        }
    }

    function redraw() {
        var currentClass = "line" + selectedDataIndex;

        // sort just the changed points.
        selectedLine = selectedLine.sort(sortArray);

        redrawCurrentLine();

        // Select all the circles on line 1
        var circle = graphSvg.selectAll("circle." + currentClass)
            .data(selectedLine, function (d) {
                return d;
            });

        circle.enter().append("circle")
            .attr("r", 1e-6)
            .attr("class", currentClass)
            .on("mousedown", function (d) {
                selected = dragged = d;
                redraw();
            })
            .transition()
            .duration(750)
            .ease("elastic")
            .attr("r", 6.5);

        circle
            .classed("selected", function (d) {
                return d === selected;
            })
            .attr("cx", function (d) {
                return x(d[0]);
            })
            .attr("cy", function (d) {
                return y(d[1]);
            });

        circle.exit().remove();

        if (d3.event) {
            d3.event.preventDefault();
            d3.event.stopPropagation();
        }
    }

    /**
     * Redraws all the lines based on their points
     */
    function redrawAllLines() {
        var i = 0;
        for (i = 0; i < data.length; i++) {
            // Updating the data on the line will redraw it.
            graphSvg.select("path#line" + i).attr("d", valueline(data[i]));
        }
    }

    function redrawCurrentLine() {
        if (selectedDataIndex !== null)
            graphSvg.select("path#line" + selectedDataIndex).attr("d", valueline(data[selectedDataIndex]));
    }

    my.redraw = function () {
        redraw();
    };

    function sortArray(a, b) {
        return a[0] - b[0];
    }

    return my;
}
