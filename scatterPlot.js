//global variables
var mergedData;
var linearScaleX, linearScaleY, linearScaleDuration, colorScale, timeScale
var svg, svgDiv, svgHeight, svgWidth
var file;

document.addEventListener('DOMContentLoaded', function(){
    
    //setting global vars and drawing csv
    svgDiv = document.getElementById("svgDiv");
    svgWidth = svgDiv.offsetWidth;
    svgHeight = svgDiv.offsetHeight;

    svg = d3.select("#svgDiv")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("id", "drawnSvg");


    fetchCsvCallOthers();

});

//this fetches the csv, calls other functions
function fetchCsvCallOthers(){

    var drawnSvg = document.getElementById("drawnSvg");
    //removing previously drawn circles
    if(drawnSvg != undefined)
    d3.selectAll("circle").remove();

    checkRadio();
    d3.csv(file)
    .then(function(data){
        //converting all rows to int
        data.forEach(function(d) {
        d.time = +d.time;
        d.duration = +d.duration;
        d.x = +d.x;
        d.y = +d.y;
        d.avg_dilation = +d.avg_dilation;
        });
        
        mergedData = data;
        setScales(mergedData);  
        drawCircles(mergedData);
    });
}

//checks which radio button is checked
function checkRadio(){

    if(document.getElementById("treeRadio").checked)
        file = "./data_preprocessed/merged_tree.csv";
    else
        file = "./data_preprocessed/merged_graph.csv";

}

//sets the scales for x, y coordinates, duration and avg_dilation
function setScales(data){

    //duration used for circle size, dilation used for color

    var xMax = d3.max(data, function(d) { return d.x; });
    var xMin = d3.min(data, function(d) { return d.x; });
    //console.log("xMax "+xMax + " xMin "+xMin);

    var yMax = d3.max(data, function(d) { return d.y; });
    var yMin = d3.min(data, function(d) { return d.y; });
    //console.log("yMax "+yMax + " yMin "+yMin);

    var maxDilation = d3.max(data, function(d) { return d.avg_dilation; });
    var minDilation = d3.min(data, function(d) { return d.avg_dilation; });
    //console.log("maxDilation "+maxDilation + " minDilation "+minDilation);

    var maxDuration = d3.max(data, function(d) { return d.duration; });
    var minDuration = d3.min(data, function(d) { return d.duration; });

    linearScaleX = d3.scaleLinear()
                    .domain([xMin, xMax])
                    .range([0 + 20,svgWidth-50]);

    linearScaleY = d3.scaleLinear()
                    .domain([yMin, yMax])
                    .range([0 + 20,svgHeight-50]);

    linearScaleDuration = d3.scaleLinear()
                    .domain([minDuration, maxDuration])
                    .range([0,20]);

    //var colorCodes = ["#5E4FA2", "#3288BD", "#66C2A5", "#ABDDA4", "#E6F598", "#FFFFBF", "#FEE08B", "#FDAE61", "#F46D43", "#D53E4F", "#9E0142"];

    /*colorScale = d3.scaleQuantile()
                    .domain([minDilation,maxDilation])
                    .range(colorCodes);*/

    colorScale = d3.scaleLinear()
                    .domain([minDilation, (minDilation+maxDilation)/2, maxDilation])
                    .range(["#2c7bb6", "#ffff8c", "#d7191c"])
                    .interpolate(d3.interpolateHcl);

    var maxTime = d3.max(data, function(d) { return d.time});
    var minTime = d3.min(data, function(d) { return d.time});
    //console.log("maxTime "+maxTime + " minTime "+minTime);

    timeScale = d3.scaleLinear()
                    .domain([minTime, maxTime])
                    .range([0, 10]);
}

//draws circle points
function drawCircles(data){

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltipDiv")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("");
        
    svg.selectAll("circle")
        .data(data)
        .enter().append("circle")
        .attr("cx", function(d){
                return linearScaleX(d.x);
            })
        .attr("cy", function(d){
                return linearScaleY(d.y);
            })
        .attr("r", function(d){
            
            return linearScaleDuration(d.duration);
        })
        .attr("fill", function(d){
            return colorScale(d.avg_dilation);
        })
        .attr("visibility","hidden")
        .on('mouseover', function(d, i) {
            tooltip.style("visibility", "visible");
            tooltip.text("Fixation Duration: " + d.duration + ",\n " + "Timestamp: " + d.time + ", Pupil Size: " + d.avg_dilation);
        })
        .on("mousemove", function(d, i) {
            return tooltip.style("top",
                (d3.event.pageY-10)+"px")
                    .style("left",(d3.event.pageX+10)+"px");
        })
        .on('mouseout', function(d, i){
            tooltip.style("visibility", "hidden");
        })
        .transition()
        .delay(function(d, i){
            console.log(timeScale(i*d.time))
            return timeScale(i*d.time);
        })
        .attr("visibility", "visible");

}
