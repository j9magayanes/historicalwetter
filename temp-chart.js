function tempChart({ element, data }) {
  let noScrollWidth,
    scrollWidth,
    delaunay,
    tooltipDatumIndex,
    groupedData,
    flattenedData,
    pointsData,
    totalDays;

  // Chart dimensions and style constants
  const height = 200;
  const focusDotSize = 4;
  const lineStrokeWidth = 2;
  const dayDotSize = 2;
  const dayDotsOffset = 8;
  const dayLabelsHeight = 20;
  const dayLabelsOffset = dayDotsOffset * 2 + dayLabelsHeight / 2;
  const monthLabelsHeight = 24;
  const monthLabelsOffset =
    dayLabelsOffset + dayLabelsHeight / 2 + monthLabelsHeight / 2;
  const marginTop = 20;
  const marginRight = 20;
  const marginBottom = monthLabelsOffset + monthLabelsHeight / 2;
  const marginLeft = focusDotSize;
  const thresholds = [400, 640];

  // Accessor functions for data
  const xAccessor = (d) => d.date;
  const y1Accessor = (d) =>
    Number.isFinite(d.maxMaxThisYear) ? d.maxMaxThisYear : undefined;
  const y2Accessor = (d) => (Number.isFinite(d.maxMax) ? d.maxMax : undefined);
  const y0Accessor = (d) => (Number.isFinite(d.minMin) ? d.minMin : undefined);
  const y3Accessor = (d) => (Number.isFinite(d.avgMax) ? d.avgMax : undefined);
  const y4Accessor = (d) => (Number.isFinite(d.avgMin) ? d.avgMin : undefined);



  // Formatting values for tooltip
  const valueFormat = new Intl.NumberFormat('de-DE', {
    maximumFractionDigits: 1,
  }).format;

  // Formatting year for tooltip
  const yearFormat = (dateString) => {
    const date = new Date(dateString);
    return date.getUTCFullYear();
  }

  // Month names for labels
  const monthNames = [
    "Januar",
    "Februar",
    "März",
    "April",
    "Mai",
    "Juni",
    "Juli",
    "August",
    "September",
    "Oktober",
    "November",
    "Dezember",
  ];

    // Scales for the chart
    const x = d3.scaleUtc();
    const y = d3.scaleLinear().range([height - marginBottom, marginTop]);

  // Area and line generators
  const areaGenerator = d3
    .area()
    .x((d) => x(d[0]))
    .y0(height - marginBottom)
    .y1((d) => y(d[1]))
    .curve(d3.curveMonotoneX)
    .defined((d) => d[1] !== undefined);
  const lineGenerator = areaGenerator.lineY1();

  // Clear any existing elements in the container


  // Create the main container
  const container = d3.select(element).attr("class", "temp-chart");
  const chartContainer = container
    .append("div")
    .attr("class", "chart-container");
  const scrollContainer = chartContainer
    .append("div")
    .attr("class", "scroll-container")
    .on("scroll", mouseleft, { passive: true });
  const svg = scrollContainer
    .append("svg")
    .attr("class", "main-svg")
    .on("mouseenter", mouseentered)
    .on("mousemove", mousemoved)
    .on("mouseleave", mouseleft);
  const yAxisSvg = chartContainer.append("svg").attr("class", "y-axis-svg");
  const swatchesContainer = container
    .append("div")
    .attr("class", "swatches-container");
  // renderSwatches();

  // Tooltip element
  const tooltip = container.append("div").attr("class", "tip");

  wrangle();

  new ResizeObserver(resized).observe(scrollContainer.node());

  // Process and organize data
  function wrangle() {
    ({ groupedData, flattenedData, pointsData, latestDay, displayData, currentYear } = processData(data));
    totalDays = flattenedData.length;

    x.domain(d3.extent(flattenedData, xAccessor));
    y.domain(getYExtent()).nice();

    // Calculate the extent for y-axis
    function getYExtent() {
      let yMin = d3.min(flattenedData, (d) =>
        d3.min([y0Accessor(d), y2Accessor(d)])
      );
      let yMax = d3.max(flattenedData, (d) =>
        d3.max([y1Accessor(d), y2Accessor(d)])
      );
      const padding = (yMax - yMin) * 0.1;
      // Ensure the minimum y value does not exceed -10
      yMin = Math.min(yMin - padding, -20
      );
      yMax += padding;
      console.log(`${yMin},${yMax} `)
      return [yMin, yMax];
    }
    if (!!noScrollWidth) resized();
  }

  // Resize handler
  function resized() {
    noScrollWidth = scrollContainer.node().clientWidth;
    const boundedWidth =
      scrollContainer.node().clientWidth -
      marginRight -
      dayLabelsHeight / 2 +
      marginLeft;
    const months = d3.bisect(thresholds, boundedWidth) + 1;
    const days = d3.sum(groupedData.slice(-months), (d) => d.days.length);
    scrollWidth =
      (boundedWidth / (days - 1)) * (totalDays - 1) + marginLeft + marginRight;

    x.range([marginLeft, scrollWidth - marginRight]);

    // Create Delaunay triangulation for interaction
    delaunay = d3.Delaunay.from(
      pointsData,
      (d) => x(d[0]),
      (d) => y(d[1])
    );

    // Set dimensions for y-axis and main SVG
    yAxisSvg.attr("width", noScrollWidth).attr("height", height);
    svg.attr("width", scrollWidth).attr("height", height);

    // Render the chart
    renderChart();

    scrollContainer.node().scrollLeft = scrollContainer.node().scrollWidth;
  }

  // Main render function
  function renderChart() {
    renderYAxis();
    renderSeries();
    renderXAxis();
    renderFocus();
    renderButtons();
    renderPoints();
    renderTooltip();
  }

  // Render y-axis grid
  function renderYAxis() {
    const g = yAxisSvg
      .selectAll('.y-axis-g')
      .data([0])
      .join((enter) => enter.append('g').attr('class', 'y-axis-g'))

      .attr('transform', `translate(${noScrollWidth - marginRight},0)`);

    g.selectAll('.bg-rect')
      .data([0])
      .join((enter) =>
        enter
          .append('rect')
          .attr('class', 'bg-rect')
          .attr('height', height)
          .attr('x', dayDotSize)
          .attr('width', marginRight )
      );

    const ticks = y.ticks((height - marginTop - marginBottom) / 30);

    g.selectAll('.tick')
      .data(ticks)
      .join((enter) =>
        enter
          .append('g')
          .attr('class', 'tick')
          .call((g) => g.append('line').attr('stroke', 'currentColor'))
          .call((g) =>
            g
              .append('text')
              .attr('x', marginRight)
              .attr('dy', '0.32em')
              .attr('text-anchor', 'end')
              .attr('fill', 'currentColor')
          )
      )
      .attr('transform', (d) => `translate(0,${y(d)})`)
      .call((g) =>
        g.select('line').attr('x1', -(noScrollWidth - marginLeft - marginRight))
      )
      .call((g) => g.select('text').text((d) => d.toLocaleString()));
  }

  // Render series data (area and lines)
  function renderSeries() {
    const areaGenerator = d3
      .area()
      .x((d) => x(d[0]))
      .y0((d) => y(d[1]))
      .y1((d) => y(d[2]));

    svg
      .selectAll('.area-path-2')
      .data([
        flattenedData.map((d) => [xAccessor(d), y3Accessor(d), y4Accessor(d)]),
      ])
      .join((enter) =>
        enter
          .append('path')
          .attr('class', 'area-path-2')
          .attr('fill', 'var(--clr-fill-series-2)')
      )
      .attr('d', areaGenerator);
    //avg max
    svg
      .selectAll('.line-path-6')
      .data([flattenedData.map((d) => [xAccessor(d), y3Accessor(d)])])
      .join((enter) =>
        enter
          .append('path')
          .attr('class', 'line-path-6')
          .attr('fill', 'none')
          .attr('stroke', 'var(--clr-series-2)')
          .attr('stroke-width', '2')
      )
      .attr('d', lineGenerator);

    //maxmax this year
    svg
      .selectAll('.line-path-1')
      .data([flattenedData.map((d) => [xAccessor(d), y1Accessor(d)])])
      .join((enter) =>
        enter
          .append('path')
          .attr('class', 'line-path-1')
          .attr('fill', 'none')
          .attr('stroke', 'var(--clr-series-1)')
          .attr('stroke-width', lineStrokeWidth)
      )
      .attr('d', lineGenerator);
    //maxmax
    svg
      .selectAll('.line-path-4')
      .data([flattenedData.map((d) => [xAccessor(d), y2Accessor(d)])])
      .join(
        (enter) =>
          enter
            .append('path')
            .attr('class', 'line-path-4')
            .attr('fill', 'none')
            .attr('stroke', '#174482')
            .attr('stroke-width', lineStrokeWidth)
            .attr('stroke-dasharray', '2  3')
      )
      .attr('d', lineGenerator);
    //minmin
    svg
      .selectAll('.line-path-5')
      .data([flattenedData.map((d) => [xAccessor(d), y0Accessor(d)])])
      .join(
        (enter) =>
          enter
            .append('path')
            .attr('class', 'line-path-4')
            .attr('fill', 'none')
            .attr('stroke', '#174482')
            .attr('stroke-width', lineStrokeWidth)
            .attr('stroke-dasharray', '2 3')
      )
      .attr('d', lineGenerator);

  }


  // Render Buttons with Responsive Positioning
function renderButtons() {
  const container = d3.select(element).attr('class', 'temp-chart');
  container.selectAll('.scroll-left, .scroll-right').remove();

  const containerWidth = container.node().offsetWidth;
  const containerHeight = container.node().offsetHeight;
  const buttonSize = 28;


  function updateButtonState() {
    const currentScrollLeft = scrollContainer.node().scrollLeft;
    const maxScrollLeft = scrollContainer.node().scrollWidth - scrollContainer.node().offsetWidth;

    if (currentScrollLeft <= 0) {
      container.select('.scroll-left image')
        .attr('href', './assets/left_arrow_inactive.svg');
    } else {
      container.select('.scroll-left image')
        .attr('href', './assets/left_arrow_active.svg');
    }

    if (currentScrollLeft >= maxScrollLeft) {
      container.select('.scroll-right image')
        .attr('href', './assets/right_arrow_inactive.svg');
    } else {
      container.select('.scroll-right image')
        .attr('href', './assets/right_arrow_active.svg');
    }
  }

  container.append('button')
    .attr('class', 'scroll-left')
    .style('position', 'absolute')
    .style('left', '-25px')
    .style('bottom', `${containerHeight * 0.16}px`)
    .on('click', () => {
      const currentScrollLeft = scrollContainer.node().scrollLeft;
      if (currentScrollLeft > 0) {
        scrollContainer.node().scrollBy({
          left: -Math.min(scrollContainer.node().offsetWidth / 2, currentScrollLeft),
          behavior: 'smooth',
        });
        updateButtonState();
      }
    })
    .append('svg')
    .attr('width', buttonSize)
    .attr('height', buttonSize)
    .attr('class', 'arrow-svg-left')
    .append('image')
    .attr('href', './assets/left_arrow_inactive.svg');

  container.append('button')
    .attr('class', 'scroll-right')
    .style('position', 'absolute')
    .style('right', '-7px')
    .style('bottom', '16%')
    .on('click', () => {
      const currentScrollLeft = scrollContainer.node().scrollLeft;
      const maxScrollLeft = scrollContainer.node().scrollWidth - scrollContainer.node().offsetWidth;
      if (currentScrollLeft < maxScrollLeft) {
        scrollContainer.node().scrollBy({
          left: Math.min(scrollContainer.node().offsetWidth / 2, maxScrollLeft - currentScrollLeft),
          behavior: 'smooth',
        });
        updateButtonState();
      }
    })
    .append('svg')
    .attr('width', buttonSize)
    .attr('height', buttonSize)
    .attr('class', 'arrow-svg-right')
    .append('image')
    .attr('href', './assets/right_arrow_active.svg');

  updateButtonState();

  scrollContainer.on('scroll', updateButtonState);
}

  // Render x-axis
  function renderXAxis() {
    const g = svg
      .selectAll(".x-axis-g")
      .data([0])
      .join((enter) => enter.append("g").attr("class", "x-axis-g"))
      .attr("transform", `translate(0,${height - marginBottom})`);

    g.selectAll(".day-dots-g")
      .data([0])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "day-dots-g")
          .attr("transform", `translate(0,${dayDotsOffset})`)
      )
      .selectAll(".day-dot-circle")
      .data(flattenedData)
      .join((enter) =>
        enter
          .append("circle")
          .attr("class", "day-dot-circle")
          .attr("r", dayDotSize)
      )
      .attr("cx", (d) => x(xAccessor(d)));

    const dayLabelsG = g
      .selectAll(".day-labels-g")
      .data([0])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "day-labels-g")
          .attr("transform", `translate(0,${dayLabelsOffset})`)
          .call((g) => g.append("g").attr("class", "day-labels-lines-g"))
          .call((g) => g.append("g").attr("class", "day-labels-texts-g"))
      );
    dayLabelsG
      .select(".day-labels-lines-g")
      .selectAll(".day-labels-line")
      .data(groupedData, (d) => d.month)
      .join((enter) =>
        enter
          .append("line")
          .attr("class", "day-labels-line")
          .attr("stroke-width", dayLabelsHeight)
      )
      .attr("x1", (d, i) => {
        const isFirstMonth = i === 0;
        return (
          x(d3.utcHour.offset(xAccessor(d.days[0]), isFirstMonth ? 0 : -12)) +
          dayLabelsHeight / 2 +
          1
        );
      })
      .attr("x2", (d, i, n) => {
        const isLastMonth = i === n.length - 1;
        return (
          x(
            d3.utcHour.offset(
              xAccessor(d.days[d.days.length - 1]),
              isLastMonth ? 0 : 12
            )
          ) -
          dayLabelsHeight / 2 -
          1
        );
      });
    dayLabelsG
      .select(".day-labels-texts-g")
      .selectAll(".day-label-month-g")
      .data(groupedData, (d) => d.month)
      .join((enter) => enter.append("g").attr("class", "day-label-month-g"))
      .selectAll(".day-label-text")
      .data(
        (d) => d.days.filter((d) => [5, 10, 15, 20, 25].includes(d.day)),
        (d) => d.day
      )
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "day-label-text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .attr("dy", "0.4em")
          .text((d) => d.day)
      )
      .attr("x", (d) => x(xAccessor(d)));

    g.selectAll(".month-labels-g")
      .data([0])
      .join((enter) =>
        enter
          .append("g")
          .attr("class", "month-labels-g")
          .attr("transform", `translate(0,${monthLabelsOffset})`)
      )
      .selectAll(".month-label-text")
      .data(groupedData, (d) => d.month)
      .join((enter) =>
        enter
          .append("text")
          .attr("class", "month-label-text")
          .attr("fill", "currentColor")
          .attr("text-anchor", "middle")
          .attr("dy", "0.32em")
          .text((d) => monthNames[d.month - 1])
      )
      .attr("x", (d) =>
        d3.mean([d.days[0], d.days[d.days.length - 1]], (d) => x(xAccessor(d)))
      );
  }

  // Render color swatches for legend
  function renderSwatches() {
    swatchesContainer
      .selectAll(".swatch")
      .data(["30 Tage 2023/24", "30 Tage 1973-2022"])
      .join((enter) =>
        enter
          .append("div")
          .attr("class", "swatch")
          .call((div) =>
            div
              .append("div")
              .attr("class", "swatch-swatch")
              .style("background-color", (_, i) => `var(--clr-series-${i + 1})`)
          )
          .call((div) =>
            div
              .append("div")
              .attr("class", "swatch-label")
              .text((d) => d)
          )
      );
  }

  function renderPoints() {
    let currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);

    let validData = null;

    function findValidData() {
      // Filter pointsData for the current date
      const currentData = pointsData.filter(d => {
        const dataDate = new Date(d.data.date);
        dataDate.setHours(0, 0, 0, 0);
        return dataDate.getTime() === currentDate.getTime();
      });

      // Check if any of the data points have a valid `maxMaxThisYear` value
      validData = currentData.find(
        d =>
          d.data.maxMaxThisYear !== undefined &&
          d.data.maxMaxThisYear !== null &&
          d.data.maxMaxThisYear !== ""
      );

      // If no valid data, step back one day and search again
      if (!validData) {
        currentDate.setDate(currentDate.getDate() - 1); 
        findValidData(); 
      }
    }

    // Start searching for valid data
    findValidData();

    // If no valid data is found, exit early (optional safeguard)
    if (!validData) {
      console.warn('No valid data found for rendering.');
      return;
    }

    // Set the x and y domain based on the data, which should remain consistent
    x.domain([d3.min(pointsData, d => d[0]), d3.max(pointsData, d => d[0])]);
    // y.domain([d3.min(pointsData, d => d.data.minMin), d3.max(pointsData, d => d.data.maxMax)]);

    // Find the lowest temperature point in pointsData
    const lowestTempPoint = pointsData.reduce((lowest, current) => {
      return current.data.minMin < lowest.data.minMin ? current : lowest;
    }, pointsData[0]);

    // Find the highest historical temperature point
    const highestTempPoint = pointsData.reduce((highest, current) => {
      return current.data.maxMax > highest.data.maxMax ? current : highest;
    }, pointsData[0]);

    // Find the highest temperature for the current year (`maxMaxThisYear`)
    const highestTempThisYearPoint = pointsData.reduce((highest, current) => {
      return current.data.maxMaxThisYear > highest.data.maxMaxThisYear ? current : highest;
    }, pointsData[0]);

    const overallHighestTempPoint = highestTempThisYearPoint.data.maxMaxThisYear > highestTempPoint.data.maxMax
      ? highestTempThisYearPoint
      : highestTempPoint;

    // If no valid data is found, exit early (optional safeguard)
    if (!lowestTempPoint) {
      console.warn('No valid data found for rendering.');
      return;
    }

    // Re-render the points using the updated scales
    svg
      .selectAll('.point-circle')
      .data([validData])
      .join(
        (enter) =>
          enter
            .append('circle')
            .attr('class', 'point-circle')
            .attr('r', focusDotSize)
            .style('z-index', 5)
            .attr('fill', 'white')
            .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.maxMaxThisYear)})`),
        (update) => update
          .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.maxMaxThisYear)})`),
        (exit) => exit.remove()
      );


    svg
      .selectAll('.lowest-temp-circle')
      .data([lowestTempPoint])
      .join(
        (enter) =>
          enter
            .append('circle')
            .attr('class', 'lowest-temp-circle')
            .attr('r', focusDotSize)
            .style('z-index', 5)
            .attr('fill', 'var(--clr-series-2)')
            .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.minMin)})`),
        (update) => update
          .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.minMin)})`),
        (exit) => exit.remove()
      );

    svg
      .selectAll('.highest-temp-circle')
      .data([overallHighestTempPoint])
      .join(
        (enter) =>
          enter
            .append('circle')
            .attr('class', 'highest-temp-circle')
            .attr('r', focusDotSize)
            .style('z-index', 5)
            .attr('fill', 'var(--clr-series-1)')
            .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.maxMax)})`),
        (update) => update
          .attr('transform', (d) => `translate(${x(d[0])}, ${y(d.data.maxMax)})`),
        (exit) => exit.remove()
      );

    // Append text after circles
    svg
      .selectAll('.temp-today')
      .data([validData]) 
      .join(
        (enter) =>
          enter
            .append('text')
            .attr('class', 'temp-today')
            .attr('dy', '.4em') 
            .style('fill', 'var(--clr-series-1)')
            .style('stroke', 'white')              
            .style('stroke-width', 1.5)            
            .style('paint-order', 'stroke') 
            .text(d => d.data.maxMaxThisYear), 
        (update) =>
          update
            .text(d => d.data.maxMaxThisYear) 
      )
      .attr('transform', (d) => `translate(${x(d[0]) + 10  }, ${y(d.data.maxMaxThisYear + 5)})`),
      (update) => update,
      (exit) => exit.remove()
    svg
    .selectAll('.text-today')
    .data([validData]) 
    .join(
      (enter) =>
        enter
          .append('text')
          .attr('class', 'text-today')
          .attr('dy', '.9em')
          .style('fill',  'var(--clr-series-1)')
          .style('stroke', 'white')              
          .style('stroke-width', 1.5)            
          .style('paint-order', 'stroke')
          .text("heute"),
      (update) =>
        update
      .text("heute"), 
    )
    .attr('transform', (d) => `translate(${x(d[0]) + 10  }, ${y(d.data.maxMaxThisYear)})`),
    (update) => update,
    (exit) => exit.remove();
        svg
        .selectAll('.temp-minMin')
        .data([lowestTempPoint]) 
        .join(
          (enter) =>
            enter
              .append('text')
              .attr('class', 'temp-minMin')
              .attr('dy', '.35em')
              .style('fill',  'var(--clr-series-2)')
              .text(d => d.data.minMin), 
          (update) =>
            update
              .text(d => d.data.minMin)
        )
        .attr('transform', (d) => {
          const xPos = x(d[0]) 
          const yPos = y(d.data.minMin);
      
          const textWidth = 30;  
          const svgWidth = scrollContainer.node().clientWidth; 
          const availableSpace = svgWidth - xPos;
      
        
          const adjustedX = availableSpace < textWidth ? x(d[0]) - textWidth - 6 : xPos;
      
          return `translate(${adjustedX }, ${yPos})`;
      }),
        (update) => update,
        (exit) => exit.remove();
        svg
        .selectAll('.temp-maxMax')
        .data([highestTempPoint]) 
        .join(
          (enter) =>
            enter
              .append('text')
              .attr('class', 'temp-maxMax')
              .attr('dy', '.35em') 
              .style('fill',  'var(--clr-series-1)')
              .text(d => d.data.maxMax),
          (update) =>
            update
              .text(d => d.data.maxMax) 
        )
        .attr('transform', (d) => {
          const xPos = x(d[0]);  
          const yPos = y(d.data.maxMax);
      
          // Calculate available space on the right
          const textWidth = 30;  
          const svgWidth = scrollContainer.node().clientWidth; 
          const availableSpace = svgWidth - xPos;
      
          // Move text to the left if not enough space on the right
          const adjustedX = availableSpace < textWidth ? x(d[0]) - textWidth - 6 : xPos + 10;
      
          return `translate(${adjustedX }, ${yPos})`;
      }),
        (update) => update,
        (exit) => exit.remove();
  
     
  }


  // Render points on Focus /Click
  function renderFocus() {
    const focusData =
      tooltipDatumIndex === undefined ? [] : [pointsData[tooltipDatumIndex]];
    // First circle for the main data point
    yAxisSvg
      .selectAll('.focus-circle')
      .data(focusData)
      .join((enter) =>
        enter
          .append('circle')
          .attr('class', 'focus-circle')
          .attr('r', focusDotSize)
      )
      .attr('fill', (d) => `var(--clr-series-${d.seriesId})`)
      .attr(
        'transform',
        (d) =>
          `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
            d[1]
          )})`
      );

    // Second circle for the avgMax data point
    yAxisSvg
      .selectAll('.focus-circle-maxmax')
      .data(focusData)
      .join((enter) =>
        enter
          .append('circle')
          .attr('class', 'focus-circle-maxmax')
          .attr('r', focusDotSize)
      )
      .attr('fill', (d) => 'var(--clr-series-2')
      .attr(
        'transform',
        (d) =>
          `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
            d.data.maxMax
          )})`
      );
    // Third circle for the avgMin data point
    yAxisSvg
      .selectAll('.focus-circle-minmin')
      .data(focusData)
      .join((enter) =>
        enter
          .append('circle')
          .attr('class', 'focus-circle-minmin')
          .attr('r', focusDotSize)
      )
      .attr('fill', (d) => 'var(--clr-series-2')
      .attr(
        'transform',
        (d) =>
          `translate(${x(d[0]) - scrollContainer.node().scrollLeft}, ${y(
            d.data.minMin
          )})`
      );
    yAxisSvg
      .selectAll('.focus-line')
      .data(focusData)
      .join((enter) =>
        enter
          .append('line')
          .attr('class', 'focus-line')
          .style('stroke', '#727272') 
          .style('stroke-width', 1)
          .style('z-index', 0)
      )
      .attr('x1', (d) => x(d[0]) - scrollContainer.node().scrollLeft)
      .attr('y1', (d) => y(Math.max(d.data.maxMax, d.data.maxMaxThisYear))) 
      .attr('x2', (d) => x(d[0]) - scrollContainer.node().scrollLeft)
      .attr('y2', (d) => y(-24)); 
  }


  // Render tooltip
  function renderTooltip() {
    if (tooltipDatumIndex === undefined) {
      tooltip.classed('is-visible', false);
    } else {
      const d = pointsData[tooltipDatumIndex]
      const src = `./assets/temp_${d.seriesId === 1 ? 'down' : 'up'}.svg`;
      tooltip
        .html(
          `<div class="tooltip-background">
            <div class=tooltip-row>
            <img src="./assets/temp_up_red.svg"/><span  class="tooltip-year">
           ${currentYear}</span>
          <span class="tooltip-value">${valueFormat(
            d.data.maxMaxThisYear
          )}°</span>
            </div>
            <div class=tooltip-row>
            <img src="./assets/temp_up_blue.svg"/><span class="tooltip-year">  ${yearFormat(d.data.maxMaxDate)
          }</span><span class="tooltip-value">${valueFormat(
            d.data.maxMax
          )}°</span>
            </div>
            <div class=tooltip-row>
            <img src="./assets/temp_down.svg"/><span class="tooltip-year">${yearFormat(d.data.minMinDate)
          }</span><span class="tooltip-value">${valueFormat(
            d.data.minMin
          )}°</span> 
            </div>
            </div>`
        )
        .classed('is-visible', true);
      const transX = x(d[0]) - scrollContainer.node().scrollLeft;
      const transXOffset = transX < noScrollWidth / 2 ? '20%' : '-120%';
      const transY = y(d[1]) - focusDotSize;
      tooltip.style(
        'transform',
        `translate(calc(${transX}px + ${transXOffset}),calc(${transY}px - 20%))`
      );
    }
  }


  function mousemoved(event) {
    const [px, py] = d3.pointer(event, svg.node());
    if (
      px < scrollContainer.node().scrollLeft ||
      px > scrollContainer.node().scrollLeft + noScrollWidth - marginRight
    )
      return mouseleft();
    const i = delaunay.find(px, py, tooltipDatumIndex);
    if (tooltipDatumIndex === i) return;
    tooltipDatumIndex = i;
    renderFocus();
    renderPoints()
    renderTooltip();
  }

  function mouseentered(event) {
    mousemoved(event);
  }

  function mouseleft() {
    tooltipDatumIndex = undefined;
    renderFocus();
    renderPoints()
    renderTooltip();
  }

  function handleScroll() {
    tooltipDatumIndex = undefined;
    renderFocus();
    renderPoints()
    renderTooltip();
  }

  scrollContainer.on('scroll', handleScroll);
  scrollContainer.node().addEventListener('scroll', handleScroll);

  function processData(data) {
    const currentDate = new Date();
    const currentMonth = currentDate.getUTCMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const startOfYear = new Date(currentDate.getFullYear(), 0, 1);
    const numberOfDays = Math.floor((currentDate - startOfYear) / (1000 * 60 * 60 * 24)) + 1;
    const currentDay = currentDate.getUTCDate() - 6;

    // Filter data for the last three months
    const filtered = data.months.filter(
      ({ month }) => month <= currentMonth && month >= currentMonth - 3
    );

    // Map the filtered data to include date objects
    const groupedData = filtered.map(({ month, days }) => ({
      month,
      days: days.map((d) => ({
        ...d,
        date: new Date(Date.UTC(currentYear, month - 1, d.day)),
      })),
    }));

    // Flatten the days data
    const flattenedData = groupedData.flatMap(({ days }) => days);

    // Find the day with the highest temperature
    const highestTemperatureDay = flattenedData.reduce((highest, current) => {
      return current.temperature > highest.temperature ? current : highest;
    }, { temperature: -Infinity });

    // Find the day with the highest temperature
    const lowestTemperatureDay = flattenedData.reduce((lowest, current) => {
      return current.temperature > lowest.temperature ? current : lowest;
    }, { temperature: Infinity });

    const todayData = flattenedData.filter(d => d.day === currentDay);

    // Create arrays of pointsData containing x, y coordinates and series information
    const displayData = [
      ...todayData.map((d) => {
        const p = [xAccessor(d), y1Accessor(d)];
        p.seriesId = 1;
        p.data = d;
        return p;
      }).filter((p) => p[1] !== undefined),
      ...todayData.map((d) => {
        const p = [xAccessor(d), y2Accessor(d)];
        p.seriesId = 2;
        p.data = d;
        return p;
      }).filter((p) => p[1] !== undefined),
    ];

    const pointsData = [
      ...flattenedData.map((d) => {
        const p = [xAccessor(d), y1Accessor(d)];
        p.seriesId = 1;
        p.data = d;
        return p;
      }).filter((p) => p[1] !== undefined),
      ...flattenedData.map((d) => {
        const p = [xAccessor(d), y2Accessor(d)];
        p.seriesId = 2;
        p.data = d;
        return p;
      }).filter((p) => p[1] !== undefined),
    ];

    return { groupedData, flattenedData, pointsData, displayData, highestTemperatureDay, lowestTemperatureDay, currentYear };
  }


  function update(_) {
    data = _;
    wrangle();
  }

  return {
    update,
  };
}
