function TrackDisplay(config) {
    var margin = {
            top: config.marginTop || 10,
            right: config.marginRight || 10,
            bottom: config.marginBottom || 30,
            left: config.marginLeft || 30
        },
        width = (config.width || 600) - margin.left - margin.right,

        // number of ticks to show
        ticks = (config.ticks || 10),

        // Each track will have a height
        heightPerTrack = (config.heightPerTrack || 40),
        concepts = {},
        height = 100,// default placeholder - will be calculated when tracks are set
        timescale = config.timescale || 60,
        x = d3.scale.linear().range([0, width]).domain([0, timescale]),
        tracks = [],
        svg, graphSvg, labels;


    /*
     Draws the graph at a given ID.
     */
    my.drawGraph = function (selection) {
        // make the basic svg
        svg = d3.select(selection)
            .append("svg")
            .attr("width", width + margin.left + margin.right)
            .attr("height", height + margin.top + margin.bottom);

        // Main drawing location for the tracks
        graphSvg = svg.append("g")
            .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

        labels = svg.append("g").attr("transform", "translate(" + (margin.left - 20) + "," + margin.top + ")");
        drawTracksAndClips();
        drawXAxis();
    };

    /**
     * Creates and draws the XAxis timescale
     */
    function drawXAxis() {
        var xAxis = d3.svg.axis()
            .scale(x)
            .orient("bottom")
            .ticks(ticks)
            .innerTickSize(-height);

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

    /**
     * Draws the track boxes and clips onto the graph for each concept
     */
    function drawTracksAndClips() {
        var track, g, y = 0;
        // process each concept. Make a foreground and background
        concepts.forEach(function(track) {
            console.log(concept)
            // loop through tracks
            //for (var i = 0; i < concepts[concept].length; i++) {
                //track = concepts[concept][i];
                // draw foreground
                if (track.bftype==="fore") {
                    g = drawForeground(y);
                }
                // draw background. It should always come after the foreground.
                else if (track.bftype==="back") {
                    g = drawBackground(y + heightPerTrack);
                }
                // draw each clip
                for (var j = 0; j < track.clips.length; j++) {
                    
                    drawClip(track.clips[j], g);
                }
            //}

            // Draw the label for this concept.
            //if (i%2 == 0) drawTrackLabel(y, concept);
            drawTrackLabel(y, track.name);

            // make the y position at the initial position for the next concept's foreground.
            y += heightPerTrack * 2;
        }
    ) ;

    }

    /**
     * Draws a single clip on a given track
     *
     * @param clip: A clip object with an offset value and a segment object
     * @param track: An svg g object where this clip belongs
     */
    function drawClip(clip, track) {
        //console.log(track)
        //if(!track) return ;
        track.append("rect")
            .attr("class", "clip")
            .attr('y', 2)
            .attr("x", x(clip.offset))
            .attr("width", x(clip.segment.dur))
            .attr("height", heightPerTrack - 4)
            .attr("rx", "3")
            .attr("ry", "3")
            .attr("title",
                "File: " + clip.segment.filename +
                "<br/>Offset:" + clip.offset +
                "<br/>Duration:"  + clip.segment.dur
            );

    }

    // Create and return the foreground object
    function drawForeground(y) {
        return drawForegroundOrBackground(y, "foreground")
    }

    // Create and return the background object
    function drawBackground(y) {
        return drawForegroundOrBackground(y, "background")
    }

    function drawForegroundOrBackground(y, cls) {
        var g = graphSvg.append("g")
            .attr("width", width)
            .attr("height", heightPerTrack)
            .attr("y", y)
            .attr("transform", "translate(0," + y + ")");

        g.append("rect").attr("class", cls).attr("width", width).attr("height", heightPerTrack);
        return g;
    }

    function calculateHeight() {
        height = Object.keys(concepts).length * 2 * heightPerTrack;
    }

    function drawTrackLabel(y, text) {

        var g = labels.append("g").attr("transform", "translate(0," + y + ")");
        g.append("rect").attr("width", "20").attr("height", heightPerTrack * 2).attr("class", "border");
        g.append("text").text(text).attr("x", -heightPerTrack).attr("y", 10)
            .attr("transform", "rotate(-90)")
            .attr("dominant-baseline", "central")
            .attr("text-anchor", "middle")
            .attr("class", "track-label")
    }

    function my(selection) {
        drawGraph(selection)
    }

    // Setter/getter for the tracks
    my.tracks = function (value) {
        var i, concept, count;
        if (!arguments.length) return data;
        concepts = tracks = value;

        //console.log("here", tracks)

        //group the tracks by concept so that each concept contains the background and foreground tracks for that
        //concept
        // for (i = 0; i < value.length; i++) {
        //     // concept = value[i].name.replace(/-foreground|-background/, '');
        //     // if (!concepts.hasOwnProperty(concept)) {
        //     //     concepts[concept] = [];
        //     // }
        //     concepts[concept].push(value[i]);
        // }
        calculateHeight();
        console.log("set tracks", concepts)

        return my;
    };


    return my;
}