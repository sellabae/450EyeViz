// "use strict"

//global variables
var mergedData;
var xMin,xMax,yMin,yMax;
var durationMin,durationMax,pupilMin,pupilMax,timeMin,timeMax;
var vertices = [];  //to draw convex hull

//scales
var xScale, yScale, timeScale;
var rScale = d3.scaleLinear()
    .range([3,23]);
var colorScale = d3.scaleLinear()
    .range(['#0066ff', '#d0ff00', '#f00000'])
    .interpolate(d3.interpolateHcl);

//svg
var svgDiv;
var svg, svgWidth, svgHeight;
var svgRatio = 4/6;

//view option
var ViewOption = {
    XY: 1,
    TIMEDURATION: 2,
    TIMESACCADE: 3
};
var currentViewOption = ViewOption.XY;

//sliders
var timeSlider = d3.select('#timeRange');
function updateTimeLabel(val) {
    d3.select('#timeLabel').text(val);
}
var durationSlider = d3.select('#durationSlider');
var pupilSlider = d3.select('#pupilSlider');

var basicOpacity = 0.8;
var highlightOpacity = 0.8;
var mutedOpacity = 0.01;

const delayValue = 0.3;



// Initial document setup
document.addEventListener('DOMContentLoaded', function(){
    console.log('DOM content loaded. Initiating all setups.');
    
    //setting global vars and drawing csv
    svgDiv = document.getElementById("svgDiv");
    svgWidth = +svgDiv.offsetWidth;
    svgHeight = +svgDiv.offsetHeight;

    svg = d3.select("#svgDiv")
        .append("svg")
        .attr("width", '100%')
        .attr("height", '100%')
        .attr("id", "drawnSvg");
    svg.append('g').attr('id','plotG');
    svg.append('g').attr('id','guideG');

    drawLegends();
    fetchCsvCallOthers();
});

window.addEventListener('resize', resizeSVG);
function resizeSVG(){
    //update the svg size
    svgWidth = +svgDiv.offsetWidth;
    svgHeight = +svgDiv.offsetHeight;

    console.log('Resizing svg w:'+svgWidth+' h:'+svgHeight
        +'  currentViewOption:'+currentViewOption);
    
    //update the plot locations according to the resized svg
    switch(currentViewOption) {
        case ViewOption.XY:
            viewByXY();
            break;
        case ViewOption.TIMEDURATION:
            viewByTimeAndDuration();
            break;
        default:
    }
}

/**
 * Updates the time slider
 * Updates time label
 */
function resetTime() {
    maxTimeInMs = Math.round(timeMax/1000);
    timeSlider.attr('max', maxTimeInMs);
    timeSlider.attr('value', maxTimeInMs);
    $("#timeRange").val(maxTimeInMs)
    updateTimeLabel(formatToMinuteSecond(timeMax));
    //timeSlider.attr("visibility", "hidden");
}

// Fetches the csv, calls other functions
function fetchCsvCallOthers()
{
    showTimeSlider(false);
    clearAllFilters();    

    console.log('fetching csv data.');

    var drawnSvg = document.getElementById("drawnSvg");
    //removing previously drawn circles
    if(drawnSvg != undefined) {
        d3.select('#svgDiv').select('#plotG').selectAll('*').remove();
        d3.select('#svgDiv').select('#guideG').selectAll('*').remove();
    }
    var file = dataSetToLoad();
    d3.csv(file)
    .then(function(data){
        //converting all rows to int
        data.forEach(function(d,i) {
            d.number = +d.number;
            d.time = +d.time;
            d.duration = +d.duration;
            d.x = +d.x;
            d.y = +d.y;
            // d.avg_dilation = +d.avg_dilation;    //not convert to number in order to detect nan value!
        });
        mergedData = data;
        setScales(mergedData);
        render(mergedData);
        resetTime();
    });
}

// Returns file by checking which data set to load from radio buttons
function dataSetToLoad()
{
    d3.select('#dataOption').selectAll('label').classed('active', false);
    
    if(document.getElementById("treeRadio").checked) {
        console.log('tree data selected.');
        d3.select('#treeBtn').classed('active', true);
        return "./data_preprocessed/merged_dilation_fixation_tree.csv";
    } else {
        console.log('graph data selected.');
        d3.select('#graphBtn').classed('active', true);
        return "./data_preprocessed/merged_dilation_fixation_graph.csv";
    }
}

// Sets the scales for x, y coordinates, duration and avg_dilation
function setScales(data)
{
    console.log('setting scales.');

    const xValue = d => d.x;
    const yValue = d => d.y;
    const durationValue = d => d.duration;   // plot size
    const pupilValue = d => +d.avg_dilation;  // plot color
    const timeValue = d => d.time;
    xMax = d3.max(data, xValue);
    xMin = d3.min(data, xValue);
    console.log('x '+xMin+' : '+xMax);
    yMax = d3.max(data, yValue);
    yMin = d3.min(data, yValue);
    console.log('y '+yMin+' : '+yMax);
    durationMax = d3.max(data, durationValue);
    durationMin = d3.min(data, durationValue);
    console.log('duration '+durationMin+' : '+durationMax);
    pupilMax = d3.max(data, pupilValue);
    pupilMin = d3.min(data, pupilValue);
    console.log('pupil '+pupilMin+' : '+pupilMax);
    timeMax = d3.max(data, timeValue);
    timeMin = d3.min(data, timeValue);
    console.log('time '+timeMin+' : '+timeMax);

    xScale = d3.scaleLinear()
        .domain([0, xMax])
        .range([0+20, svgWidth-50])
        .nice();
    yScale = d3.scaleLinear()
        .domain([0, yMax])
        .range([0+20, svgHeight-50])
        .nice();
    rScale.domain([100, durationMax]).nice();
    colorScale.domain([0, 0.4, 1]);     //fixed with exagerated changes
        // .domain([0, (pupilMin+pupilMax)/2, pupilMax])   //show the distribution as it is
        // .domain([0, pupilMax*0.4, pupilMax])            //bit distorted
    timeScale = d3.scaleLinear()
        .domain([0, timeMax])
        .range([0, 10])
        .nice();
        
    timeSlider.attr('max',timeMax/1000);    //set time slider range
}

// Draws circle points
function render(dataset)
{
    console.log('drawing circles.');

    var tooltip = d3.select("body")
        .append("div")
        .attr("class", "tooltipDiv")
        .style("position", "absolute")
        .style("z-index", "10")
        .style("visibility", "hidden")
        .text("");
        
    var plotG = svg.select('#plotG');

    
    var convexhull = plotG.append("polygon")
        .attr('id','convexhull')
        .attr("class", "hull");
    //put scaled d.x and d.y into vertices
    vertices = [];
    mergedData.forEach(function(d,i){
        vertices[i] = [xScale(d.x), yScale(d.y)];   //for convex hull
    });
    convexhull.datum(d3.polygonHull(vertices))
        .attr("points", function(d) { return d.join(" "); });
        
    showConvexhull(false);
    showSaccades(true);

    // Bind dataset to lines (for saccades)
    var saccades = plotG.selectAll("line")
        .data(dataset, function(d) {return d;}); //semantic binding
    // Add lines(saccades)
    saccades.enter().append("line")
        .classed('saccade', true)
        .attr('x1', function(d,i){
            var prev = (i>0) ? dataset[i-1] : d;
            return xScale(prev.x);
        })
        .attr('y1', function(d,i){
            var prev = (i>0) ? dataset[i-1] : d;
            return yScale(prev.y);
        })
        .attr('x2', d => xScale(d.x))
        .attr('y2', d => yScale(d.y))
        .attr('visibility','hidden')
        .transition()
            .delay(function(d, i){
                return timeScale(i*d.time);
            })
        .attr("visibility", "visible");

    // Bind dataset to circles (for fixations)
    var fixations = plotG.selectAll("circle")
        .data(dataset, function(d) { return d; }); //semantic binding
    // Add circles(fixations)
    fixations.enter().append("circle")
        .classed('fixation', true)
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => rScale(d.duration))
        .attr("fill", function(d){
            return (d.avg_dilation=="") ? 'darkgray' : colorScale(+d.avg_dilation);
        })
        .on('mouseover', function(d) {
            const msg = "<b>#" + d.number + "</b><br>"
                      + "<b>time</b>     " + formatToMinuteSecond(d.time) + "<br>"
                      + "<b>x</b>:" + d.x+", <b>y</b>:"+d.y + "<br>"
                      + "<b>duration</b> " + d.duration + "ms <br>"
                      + "<b>dilation</b> "
                        + ((d.avg_dilation=="") ? "nan" : ((+d.avg_dilation).toFixed(2)+"mm"));
            tooltip.html(msg);
            tooltip.style("visibility", "visible");
        })
        .on("mousemove", function(d, i) {
            return tooltip.style("top",
                (d3.event.pageY-10)+"px")
                    .style("left",(d3.event.pageX+10)+"px");
        })
        .on('mouseout', function(d, i){
            tooltip.style("visibility", "hidden");
            d3.select('#details').html('');
        })
        .attr("visibility","hidden")
        .transition()
            .delay(function(d, i){
                return timeScale(i*d.time);
            })
        .attr("visibility", "visible")
        .end()
        .then(() =>{
            showTimeSlider(true);
        });
        
        
        //initial mode to xy
        drawXYMark();
        currentViewOption = ViewOption.XY;
        d3.select('#viewOptions').selectAll('button').classed('active', false);
        d3.select('#viewOption-xy').classed('active', true);
}

//update the location of each fixation and saccade
function updateXYLocations()
{
    var fixations = svg.select('#plotG').selectAll('circle');
    fixations
        .attr("cx", d => xScale(d.x))
        .attr("cy", d => yScale(d.y))
        .attr("r", d => rScale(d.duration));
    
    var saccades = svg.select('#plotG').selectAll('line');
    saccades
        .attr('x1', function(d,i){
            var prev = (i>0) ? mergedData[i-1] : d;
            return xScale(prev.x);
        })
        .attr('y1', function(d,i){
            var prev = (i>0) ? mergedData[i-1] : d;
            return yScale(prev.y);
        })
        .attr('x2', d => xScale(d.x))
        .attr('y2', d => yScale(d.y));

    var convexhull = svg.select('#convexhull');
    //put scaled d.x and d.y into vertices
    vertices = [];
    mergedData.forEach(function(d,i){
        vertices[i] = [xScale(d.x), yScale(d.y)];   //for convex hull
    });
    convexhull.datum(d3.polygonHull(vertices))
        .attr("points", function(d) { return d.join(" "); });
}

function showConvexhull(state)
{
    var convexhull = svg.select('#convexhull');
    var checkbox = document.getElementById('convexhullCheckbox');
    if(state == true) {
        console.log('show convexhull');
        convexhull.style('visibility', 'visible');
        checkbox.disabled = false;
        checkbox.checked = true;
    } else if(state == false) {
        console.log('hide convexhull');
        convexhull.style('visibility', 'hidden');
        checkbox.disabled = false;
        checkbox.checked = false;
    } else if(state == "disable") {
        convexhull.style('visibility', 'hidden');
        checkbox.disabled = true;
        checkbox.checked = false;
    }
}

function showSaccades(state)
{
    var saccades = svg.select('#plotG').selectAll('line');
    var checkbox = document.getElementById('saccadeCheckbox');

    if(state == true) {
        console.log('show saccades');
        saccades.style('visibility', 'visible');
        checkbox.disabled = false;
        checkbox.checked = true;
    } else if(state == false) {
        console.log('hide saccades');
        saccades.style('visibility', 'hidden');
        checkbox.disabled = false;
        checkbox.checked = false;
    } else if(state == "disable") {
        saccades.style('visibility', 'hidden');
        checkbox.disabled = true;
        checkbox.checked = false;
    }
}

// TODO: Filter with a range of values (double thumbs on the slider)
// Filters fixations by feature
function filterByFeature(feature, val, step)
{
    showSaccades("disable");
    showConvexhull("disable");

    if ( !(feature=='duration' || feature=='avg_dilation') ) {
        console.log('not existing feature '+feature);
        return;
    }

    //setting the value of the slider
    if(feature == "duration")
        d3.select("#durationSlider").attr("value", val);
    else if(feature = "avg_dilation")
        d3.select("#pupilSlider").attr("value", val);

    //actual filter changed
    var selected = +val;
    var inclusiveVal = step/2;
    var start = selected - inclusiveVal;
    var end = selected + inclusiveVal;
    console.log(`filtering by ${feature} ${start.toFixed(3)} ~ ${end.toFixed(3)}`);

    var otherSelected, otherInclusiveVal, otherStart, otherEnd, otherFeature, otherSlider;

    //the other filter
    if(feature == "duration"){
        //getting value of pupilSlider
        otherFeature = "avg_dilation";
        otherSlider = d3.select("#pupilSlider");
        otherSelected = +otherSlider.attr("value");
        otherInclusiveVal = otherSlider.attr("step")/2;
        otherStart = otherSelected - otherInclusiveVal;
        otherEnd = otherSelected + otherInclusiveVal;
        console.log(`filtering by ${otherFeature} ${otherStart.toFixed(3)} ~ ${otherEnd.toFixed(3)}`);
    }
    else if(feature  == "avg_dilation"){
        //getting value of durationSlider
        otherFeature = "duration";
        otherSlider = d3.select("#durationSlider");
        otherSelected = +otherSlider.attr("value");
        otherInclusiveVal = otherSlider.attr("step")/2;
        otherStart = otherSelected - otherInclusiveVal;
        otherEnd = otherSelected + otherInclusiveVal;
        console.log(`filtering by ${otherFeature} ${otherStart.toFixed(3)} ~ ${otherEnd.toFixed(3)}`);

    }

    // Make selected data stand out
    svg.select('#plotG').selectAll('circle')
        .style('opacity', mutedOpacity)
        .filter(function(d) {
            return (((d[feature] >= start) && (d[feature] <= end)) && ((d[otherFeature] >= otherStart) && (d[otherFeature] <= otherEnd)));
        })
        .style('opacity', highlightOpacity);

    //TODO: Mark the active filter on the slider.. give class to it.
    var legendSvg;
    if (feature =='duration') {
        legendSvg = d3.select('#svgDurationSlider');
    } else if (feature=='avg_dilation') {
        legendSvg = d3.select('#svgPupilSlider');
    }
    // legendSvg.select('.steps').selectAll('circle')...
    
}

//Convert milli seconds to M:SS form
function formatToMinuteSecond(milliSeconds) {
    var minutes = Math.floor(milliSeconds / 60000);
    var seconds = ((milliSeconds % 60000) / 1000).toFixed(0);
    return minutes + ":" + (seconds < 10 ? '0' : '') + seconds;
}

function filterByTime(val) {
    showConvexhull('disable');

    timeSlider.attr('value', val);
    var milliSeconds = val * 1000;
    updateTimeLabel(formatToMinuteSecond(milliSeconds));
    // svg.select('#plotG').selectAll('circle')
    //     .style('opacity', mutedOpacity)
    //     .filter(function(d) {
    //         return (d.time <= val);
    //     })
    //     .style('opacity', highlightOpacity);
    
    svg.select('#plotG').selectAll('circle')
        .style('visibility', 'hidden')
        .filter(function(d) {
            return (d.time <= milliSeconds);
        })
        .style('visibility', 'visible');

    if(document.getElementById('saccadeCheckbox').checked == true)
    {
        svg.select('#plotG').selectAll('line')
            .style('visibility', 'hidden')
            .filter(function(d) {
                return (d.time <= milliSeconds);
            })
            .style('visibility', 'visible');
    }

}

// Removes filter effect when double clicked on document
function clearAllFilters() { 
    console.log('clearing all filters.');
    
    //set show options to default
    showSaccades(false);
    showConvexhull(false);

    //changes actual value of sliders
    d3.select("#pupilSlider").attr("value", 0);
    d3.select("#durationSlider").attr("value", 0);
    //changes the view of sliders
    $("#pupilSlider").val(0);
    $("#durationSlider").val(0);

    //show all plots evenly
    svg.selectAll('circle')
        .style('opacity', basicOpacity);

    //TODO: Clear the marks on the legend sliders
}

// Draws legends with circles and scales under sliders
function drawLegends()
{
    console.log('drawing svg under legends.');
    const sliderLength = 120;
    const gOffset = { x:25, y:25 };
    const scaleX = d3.scaleLinear().range([0, sliderLength]);

    // 1. Fixation Duration Legend
    const durationG = d3.select('#svgDurationSlider').append('g')
        .attr('transform',`translate(${gOffset.x},${gOffset.y})`);
    const durCircles = [0, 0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
    const durStepDots = [0, 0.5, 1, 1.5, 2];
    const durStepTexts = [0, 1, 2];
    scaleX.domain([0, d3.max(durCircles)]);
    const scaleSize = rScale.domain([0, 2]);
    //back circles
    durationG.selectAll('circle')
        .data(durCircles).enter().append('circle')
        .attr('cx', d => scaleX(d))
        .attr('r', d => scaleSize(d))  //the size legend
        .style('fill', '#CCC');
    //lines for the slider
    durationG.append('line').attr('x2',sliderLength);
    durationG.insert('g').attr('class','steps')
        .selectAll('circle')
        .data(durStepDots).enter().append('circle')
        .attr('cx', d=> scaleX(d));
    durationG.select('.steps').selectAll('text')
        .data(durStepTexts).enter().append('text')
        .attr('x', d=> scaleX(d))
        .attr('y', 18)  //how far the numbers away from line
        .text(d => {return d;});
    durationG.select('.steps').append('text')
        .attr('x', sliderLength+9).attr('y', 18)
        .text('s');

    // 2. Pupil Dilation Legend
    const pupilG = d3.select('#svgPupilSlider').append('g')
        .attr('transform',`translate(${gOffset.x},${gOffset.y})`);
    const pupilCircles = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1];
    const pupilStepDots = [0, 0.25, 0.5, 0.75, 1];
    const pupilStepTexts = [0, 1];
    scaleX.domain([0, d3.max(pupilCircles)]);
    const scaleColor = colorScale.domain([0, 0.3, 1]);
    //back circles
    pupilG.selectAll('circle')
        .data(pupilCircles).enter().append('circle')
        .attr('cx', d => scaleX(d))
        .attr('r', 14)
        .style('fill', d => scaleColor(d));  //the color legend
    //lines for the slider
    pupilG.append('line').attr('x2',sliderLength);
    pupilG.insert('g').attr('class','steps')
        .selectAll('circle')
        .data(pupilStepDots).enter().append('circle')
        .attr('cx', d=> scaleX(d));
    pupilG.select('.steps').selectAll('text')
        .data(pupilStepTexts).enter().append('text')
        .attr('x', d=> scaleX(d))
        .attr('y', 25)  //how far the numbers away from line
        .text(d => {return d;});
    pupilG.select('.steps').append('text')
        .attr('x', sliderLength+15).attr('y', 25)
        .text('mm');

}


//TODO: Implement play
function play() {
    console.log('play through time');
    var i;
    for(i=0; i<Math.round(timeMax/1000); i++) {
        // timeSlider.value(i);
        setTimeout(function(){
            filterByTime(i);
            console.log(i);
        }, 1000);
        //NOTE: not working yet...
    }
}


// Locates fixations back to its x,y coordinates
function viewByXY()
{
    console.log('locating fixations by x-y.');

    //Update the view state and the button view
    var isViewChanged = (currentViewOption != ViewOption.XY);
    currentViewOption = ViewOption.XY;
    d3.select('#viewOptions').selectAll('button').classed('active', false);
    d3.select('#viewOption-xy').classed('active', true);

    
    //Update the x,y scale to fit the resized svg
    xScale.range([0+20, svgWidth-50]);
    yScale.range([0+20, svgHeight-50]);

    //Relocate the fixations
    var plotG = d3.select('#plotG');
    var fixations = plotG.selectAll('circle');
    var saccades = plotG.selectAll('line');
    var convexhull = plotG.select('#convexhull');

    showTimeSlider(true);
    showSaccades(true);
    showConvexhull(true);

    if(isViewChanged) {
        //transition effect for changing view
        drawXYMark();
        fixations.transition()
            .delay(function(d,i){ return i * delayValue; }) 
            .ease(d3.easeCubic).duration(1000)
            .style('visibility','visible')
            // .style('opacity', basicOpacity)
            .attr('cx', d => xScale(d.x))
            .attr('cy', d => yScale(d.y))
            .attr('r', d => rScale(d.duration));
        
        saccades
            .style('opacity',0)
            .transition().delay(1000) 
            .style('visibility','visible')
            .transition().duration(1000)
            .style('opacity',0.3);
        convexhull
            .style('opacity',0)
            .transition().delay(1000)
            .style('visibility','visible')
            .transition().duration(1000)
            .style('opacity',1);
        
    } else {
        //just resizing the svg. update the locations!
        updateXYLocations();
        fixations.style('visibility','visible')
        saccades.style('visibility','visible');
    }

}

// Draws xy arrow marks on the svg
function drawXYMark()
{
    const guideG = svg.select('#guideG');
    guideG.selectAll('*').remove();    //remove all previously drawn guides

    //NOTE: this can be imported from svg file
    guideG.attr('transform','translate(5,5)');
    var len = 50;

    var xAxis = guideG.append('g').attr('transform',`translate(5, 0)`);
    xAxis.append('line').attr('x2',len);
    xAxis.append('line').attr('x2',-5).attr('y2',-3)
        .attr('transform',`translate(${len}, 0)`);
    xAxis.append('text').text('x')
        .attr('transform',`translate(${len+8}, 4)`);

    var yAxis = guideG.append('g').attr('transform',`translate(0, 5)`);
    yAxis.append('line').attr('y2',len);
    yAxis.append('line').attr('x2',-3).attr('y2',-5)
        .attr('transform',`translate(0, ${len})`);
    yAxis.append('text').text('y')
        .attr('transform',`translate(0, ${len+12})`);

    guideG.selectAll('line').classed('axis-line',true);
    guideG.selectAll('text').classed('axis-stepText',true);

    //transition
    guideG.attr('opacity',0)
        .transition().duration(1000)
        .attr('opacity',1);
    
}



function viewByTimeAndDuration()
{
    console.log('View the line graph of time and duration.');
    //Update the view state and the button view
    var isViewChanged = (currentViewOption != ViewOption.TIMEDURATION);
    currentViewOption = ViewOption.TIMEDURATION;
    d3.select('#viewOptions').selectAll('button').classed('active', false);
    d3.select('#viewOption-timeduration').classed('active', true);


    const marginX = 50; //left&right margin of graph from the svg border
    // const marginY = 200; //top&bottom margin of graph from the svg border
    const width = svgWidth - marginX*2;
    const height = 200;
    const marginY = (svgHeight-height)/2;

    const plotG = d3.select('#plotG');
    const fixations = plotG.selectAll('circle');
    const saccades = plotG.selectAll('line');
    saccades.transition().duration(500)
        .style('opacity',0).style('visiblity','hidden');
    const saccadeCheckbox = document.getElementById('saccadeCheckbox');
    saccadeCheckbox.checked = false;
    saccadeCheckbox.disabled = true;

    var scaleX = d3.scaleLinear()
        .domain([0, timeMax/60000])
        .range([marginX, svgWidth-marginX]);
    var scaleY = d3.scaleLinear()
        .domain([0, durationMax/1000])
        .range([svgHeight-marginY, marginY]);

    var xAxis = d3.axisBottom().scale(scaleX);
    var yAxis = d3.axisLeft().scale(scaleY).ticks(5);

    var guideG = svg.select('#guideG');
    if(isViewChanged)
    {
        showSaccades("disable");
        showConvexhull("disable");

        //remove preciously drawn guide or axes
        guideG.selectAll('*').remove();

        //draw the x axis and y axis
        guideG.classed('axis',true)
            .classed('unselectable', true);
        var xAxis = guideG.append('g').attr('id','xAxis')
            .attr("transform", `translate(0, ${svgHeight-marginY})`)
            .call(xAxis);
        xAxis.append("text")
            .attr("text-anchor", "middle")  // this makes it easy to centre the text as the transform is applied to the anchor
            .attr("transform", `translate(${svgWidth/2},${10})`)  // centre below axis
            .text("Time (min)").style('color','black');
        guideG.append('g').attr('id','yAxis')
            .attr("transform", `translate(${marginX}, 0)`)
            .call(yAxis);
        //transition
        guideG.attr('opacity',0)
            .transition().duration(1000)
            .attr('opacity',1);

        //move the fixations
        scaleX.domain([0, timeMax]);
        scaleY.domain([0, durationMax]);
        fixations.style('visibility','visible')
            .transition()
            .delay(function(d,i){ return i * delayValue; }) 
            .ease(d3.easeCubic).duration(1000)
            .attr('cx', d => scaleX(d.time))
            .attr('cy', d => scaleY(d.duration))
            .attr('r', 3);

        //Calculate the mean duration
        const durationValue = d => d.duration;
        var durationMean = d3.mean(mergedData, durationValue);
        console.log('Duration Mean: '+durationMean.toFixed(0));
        //Show the mean duration
        var avgG = svg.select('#guideG')
            .append('g').attr('id','avgG')
                .attr('transform',`translate(${marginX},${scaleY(durationMean)})`)
                .classed('avgG', true);
        avgG.append('line').attr('x2',0)
            .transition().delay(1000).duration(1000)
            .attr('x2',width);
    }
    else
    {
        console.log('view by time/duratoin resizing...');
        //TODO: handle resizing
    }
}

//Show or hide timeSlider and lable visible
function showTimeSlider(show){
    if(show == true) {
        timeSlider.style("visibility", "visible");
        d3.select('#timeLabel').style("visibility", "visible");
    } else {
        timeSlider.style("visibility", "hidden");
        d3.select('#timeLabel').style("visibility", "hidden");    
    }
}