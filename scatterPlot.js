//global variables
var file, mergedData;
var xScale, yScale, rScale, colorScale, timeScale
var svg, svgDiv, svgHeight, svgWidth

document.addEventListener('DOMContentLoaded', function(){
    
    //setting global vars and drawing csv
    svgDiv = document.getElementById("svgDiv");
    svgWidth = +svgDiv.offsetWidth;
    svgHeight = +svgDiv.offsetHeight;

    svg = d3.select("#svgDiv")
        .append("svg")
        .attr("width", svgWidth)
        .attr("height", svgHeight)
        .attr("id", "drawnSvg");

    fetchCsvCallOthers();
});

// Fetches the csv, calls other functions
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
    const xValue = d => d.x;
    const yValue = d => d.y;
    const durationValue = d => d.duration;      // plot size
    const pupilValue = d => d.avg_dilation;  // plot color
    const timeValue = d => d.time;

    var xMax = d3.max(data, xValue);
    var xMin = d3.min(data, xValue);
    console.log('x '+xMin+' : '+xMax);
    var yMax = d3.max(data, yValue);
    var yMin = d3.min(data, yValue);
    console.log('y '+yMin+' : '+yMax);
    var durationMax = d3.max(data, durationValue);
    var durationMin = d3.min(data, durationValue);
    console.log('duration '+durationMin+' : '+durationMax);
    var pupilMax = d3.max(data, pupilValue);
    var pupilMin = d3.min(data, pupilValue);
    console.log('pupil '+pupilMin+' : '+pupilMax);
    var timeMax = d3.max(data, timeValue);
    var timeMin = d3.min(data, timeValue);
    console.log('time '+timeMin+' : '+timeMax);

    xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0 + 20,svgWidth-50])
        .nice();

    yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([0 + 20,svgHeight-50])
        .nice();

    rScale = d3.scaleLinear()
        .domain([100, durationMax])
        .range([3, 30])
        .nice();

    //var colorCodes = ["#5E4FA2", "#3288BD", "#66C2A5", "#ABDDA4", "#E6F598", "#FFFFBF", "#FEE08B", "#FDAE61", "#F46D43", "#D53E4F", "#9E0142"];
    /*colorScale = d3.scaleQuantile()
                    .domain([pupilMin,pupilMax])
                    .range(colorCodes);*/
    colorScale = d3.scaleLinear()
        .domain([pupilMin, (pupilMin+pupilMax)/2, pupilMax])
        .range(["#2c7bb6", "#ffff8c", "#d7191c"])
        .interpolate(d3.interpolateHcl);

    timeScale = d3.scaleLinear()
        .domain([timeMin, timeMax])
        .range([0, 10])
        .nice();
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
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => rScale(d.duration))
        .attr("fill", d => colorScale(d.avg_dilation))
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
            // console.log(timeScale(i*d.time));
            return timeScale(i*d.time);
        })
        .attr("visibility", "visible");

}
